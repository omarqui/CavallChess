import { turnOf, type Side } from '../chess/position';
import type { Ficha, LibMove } from './types';

/** Grupos del catálogo por lado (también los usa la pantalla de la biblioteca). */
export const GROUPS: Record<Side, string[]> = {
  white: ['Abrís con 1.e4', 'Contra las respuestas a 1.e4', 'Abrís con 1.d4 y otras'],
  black: ['Contra 1.e4', 'Contra 1.d4', 'Contra la Inglesa y otras'],
};

const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const isError = (m: LibMove) => !!m.nags?.some((n) => n === 2 || n === 4);

/** Reglas de una ficha; devuelve mensajes que nombran la ficha y la línea. */
export function validateFicha(f: Ficha): string[] {
  const out: string[] = [];
  const e = (msg: string, line?: string) =>
    out.push(line ? `Ficha ${f.id}, línea ${line}: ${msg}` : `Ficha ${f.id}: ${msg}`);
  const mine = (m: LibMove) => turnOf(m.fromEpd) === f.side;

  if (!KEBAB.test(f.id)) e('el id tiene que estar en kebab-case.');
  if (!f.name.trim()) e('falta el nombre.');
  if (!f.eco.trim()) e('falta el código ECO.');
  if (!f.summary.trim()) e('falta el resumen.');
  if (!f.levels.length) e('falta el nivel.');
  if (!f.start.length) e('faltan las jugadas de la posición característica.');
  if (!f.basics.trim()) e('la sección “Para empezar” está vacía o falta.');
  if (!f.ideas.trim()) e('la sección “Ideas y planes” está vacía o falta.');
  if (!f.tips.length) e('la sección “Consejos” está vacía o falta (al menos un ítem).');
  if (!GROUPS[f.side].includes(f.group)) {
    e(`el grupo “${f.group}” no está entre los de ${f.side === 'white' ? 'blancas' : 'negras'}.`);
  }
  if (!f.lines.some((l) => l.kind === 'variante')) e('tiene que haber al menos una variante.');
  if (!f.lines.some((l) => l.kind === 'variante' && l.level === 'basica')) {
    e('tiene que haber al menos una variante básica.');
  }

  const ids = new Set<string>();
  for (const l of f.lines) {
    if (ids.has(l.id)) e(`id de línea repetido “${l.id}”.`, l.id);
    ids.add(l.id);
    if (!KEBAB.test(l.id)) e('el id de la línea tiene que estar en kebab-case.', l.id);
    if (!l.name.trim()) e('falta el nombre.', l.id);
    if (!l.moves.length) e('no tiene jugadas.', l.id);

    const okStart = l.moves.length >= f.start.length && f.start.every((m, i) => l.moves[i].uci === m.uci);
    if (!okStart) e('no empieza con las jugadas de la ficha.', l.id);

    for (const m of [...l.moves, ...(l.fall ?? [])]) {
      if (m.hint && !mine(m)) e(`[%hint] solo va en jugadas propias (“${m.san}” es del rival).`, l.id);
      // Los comentarios se muestran como texto plano con `figurineText`: las comillas invertidas quedarían a la vista.
      if (m.comment?.includes('`') || m.hint?.includes('`')) {
        e(`el comentario de “${m.san}” lleva comillas invertidas: en los comentarios PGN las jugadas van sin ellas.`, l.id);
      }
    }

    if (l.kind === 'favor') {
      const bad = l.moves.map((m, i) => [m, i] as const).filter(([m]) => isError(m));
      const rival = bad.filter(([m]) => !mine(m));
      if (bad.length !== 1 || rival.length !== 1 || l.trapPly === undefined) {
        e('trampa a favor: exactamente una jugada del rival tiene que llevar ? o ??.', l.id);
      }
      if (l.fall) e('trampa a favor: no lleva variantes.', l.id);
    } else if (l.kind === 'contra') {
      const t = l.trapPly === undefined ? undefined : l.moves[l.trapPly];
      if (!t || !l.fall?.length) e('trampa en contra: falta la variante con el error.', l.id);
      else {
        if (!mine(t)) e('trampa en contra: la variante tiene que reemplazar una jugada propia.', l.id);
        if (!isError(l.fall[0])) e('trampa en contra: la primera jugada de la variante tiene que llevar ? o ??.', l.id);
        if (l.fall[0].fromEpd !== t.fromEpd || l.fall[0].uci === t.uci) {
          e('trampa en contra: la variante tiene que ser otra jugada en la misma posición.', l.id);
        }
        if (l.moves.some((m, i) => i !== l.trapPly && isError(m) && mine(m))) {
          e('trampa en contra: la línea principal no puede tener jugadas propias con ? o ??.', l.id);
        }
      }
    } else if (l.fall || l.trapPly !== undefined) {
      e('una variante no lleva trampa.', l.id);
    }
  }

  // Coherencia: en cada posición donde mueve `side`, toda la ficha usa la misma jugada (las `fall` quedan afuera).
  const chosen = new Map<string, { uci: string; san: string; where: string }>();
  const check = (m: LibMove, where: string, line?: string) => {
    if (!mine(m)) return;
    const prev = chosen.get(m.fromEpd);
    if (!prev) chosen.set(m.fromEpd, { uci: m.uci, san: m.san, where });
    else if (prev.uci !== m.uci) {
      e(`coherencia: en la misma posición jugás ${m.san}, pero en ${prev.where} jugás ${prev.san}.`, line);
    }
  };
  f.start.forEach((m) => check(m, 'las jugadas de la ficha'));
  for (const l of f.lines) l.moves.forEach((m) => check(m, `la línea ${l.id}`, l.id));
  return out;
}

/** Reglas entre fichas: ids únicos y un solo `(lado, grupo, orden)`. */
export function validateLibrary(fichas: Ficha[]): string[] {
  const out: string[] = [];
  const ids = new Set<string>();
  const slots = new Map<string, string>();
  for (const f of fichas) {
    if (ids.has(f.id)) out.push(`Ficha ${f.id}: id de ficha repetido.`);
    ids.add(f.id);
    const key = `${f.side}|${f.group}|${f.order}`;
    const other = slots.get(key);
    if (other) out.push(`Ficha ${f.id}: el orden ${f.order} del grupo “${f.group}” ya lo usa ${other}.`);
    else slots.set(key, f.id);
    out.push(...validateFicha(f));
  }
  return out;
}
