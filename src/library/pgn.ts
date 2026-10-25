import type { ImportPlan } from '../chess/pgnImport';
import { nodeId } from '../chess/position';
import type { Shape } from '../types';
import type { Ficha, FichaLine, LibMove } from './types';

export interface NameProposal {
  chapter: number;
  root: number;
  name: string;
  enabled: boolean;
}

const BRUSH: Record<Shape['brush'], string> = { green: 'G', red: 'R', blue: 'B', yellow: 'Y' };
const NAG: Record<number, string> = { 1: '!', 2: '?', 3: '!!', 4: '??', 5: '!?', 6: '?!' };

/** Variantes básicas, variantes de club, trampas a favor y trampas en contra; en cada grupo, el orden del archivo. */
function ordered(f: Ficha, lineIds: string[]): FichaLine[] {
  const pick = new Set(lineIds);
  const rank = (l: FichaLine) => (l.kind === 'variante' ? (l.level === 'basica' ? 0 : 1) : l.kind === 'favor' ? 2 : 3);
  return f.lines
    .filter((l) => pick.has(l.id))
    .map((l, i) => ({ l, i }))
    .sort((a, b) => rank(a.l) - rank(b.l) || a.i - b.i)
    .map((x) => x.l);
}

/** Comentario de una jugada: marca de trampa, pista, texto y flechas, sin llaves ni corchetes que lo rompan. */
function comment(f: Ficha, line: FichaLine, m: LibMove, ply: number): string {
  const parts: string[] = [];
  if (line.kind !== 'variante' && line.trapPly === ply) {
    parts.push(`[%trap ${line.kind} ${f.id}/${line.id} ${line.name.replace(/[\]{}]/g, ' ')}]`);
  }
  if (m.hint) parts.push(`[%hint ${m.hint.replace(/[\]{}]/g, ' ')}]`);
  if (m.comment) parts.push(m.comment.replace(/[{}]/g, ' '));
  const cal = (m.shapes ?? []).filter((s) => s.dest).map((s) => `${BRUSH[s.brush]}${s.orig}${s.dest}`);
  const csl = (m.shapes ?? []).filter((s) => !s.dest).map((s) => `${BRUSH[s.brush]}${s.orig}`);
  if (cal.length) parts.push(`[%cal ${cal.join(',')}]`);
  if (csl.length) parts.push(`[%csl ${csl.join(',')}]`);
  return parts.join(' ');
}

function movetext(f: Ficha, line: FichaLine): string {
  const out: string[] = [];
  let needNumber = true;
  line.moves.forEach((m, ply) => {
    const num = Math.floor(ply / 2) + 1;
    if (ply % 2 === 0) out.push(`${num}.`);
    else if (needNumber) out.push(`${num}...`);
    out.push(m.san + (m.nags ?? []).map((n) => NAG[n] ?? '').join(''));
    const c = comment(f, line, m, ply);
    if (c) out.push(`{ ${c} }`);
    needNumber = !!c;
  });
  return out.join(' ');
}

/** Una partida por línea, lista para `buildImportPlan`. La caída de las trampas en contra no se exporta. */
export function fichaPgn(f: Ficha, lineIds: string[]): string {
  return ordered(f, lineIds)
    .map((l) => `[ChapterName "${l.name.replace(/"/g, "'")}"]\n\n${movetext(f, l)} *`)
    .join('\n\n');
}

/**
 * Nombre de la ficha en su posición característica y de cada variante en su raíz.
 * Con `nameAtStart` en falso (posición genérica) no se nombra la posición y cada variante lleva el nombre de la ficha de prefijo.
 */
export function fichaNames(f: Ficha, lineIds: string[]): NameProposal[] {
  const out: NameProposal[] = f.nameAtStart ? [{ chapter: 0, root: f.start.length, name: f.name, enabled: true }] : [];
  ordered(f, lineIds).forEach((l, chapter) => {
    if (l.kind === 'variante' && l.rootPly !== undefined) {
      out.push({ chapter, root: l.rootPly, name: f.nameAtStart ? l.name : `${f.name}: ${l.name}`, enabled: true });
    }
  });
  return out;
}

/** nodeId → nombre, solo con las propuestas habilitadas. */
export function namesMap(plan: ImportPlan, proposals: NameProposal[]): Map<string, string> {
  const names = new Map<string, string>();
  for (const p of proposals) {
    const epd = plan.chapters[p.chapter]?.mainline[p.root]?.epd;
    if (p.enabled && epd) names.set(nodeId(plan.side, epd), p.name);
  }
  return names;
}
