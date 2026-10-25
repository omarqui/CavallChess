import { parsePgn, startingPosition, type ChildNode, type Node, type PgnNodeData } from 'chessops/pgn';
import { makeSan, parseSan } from 'chessops/san';
import { makeUci } from 'chessops/util';
import type { Chess } from 'chessops/chess';
import { commentOf } from '../chess/pgnImport';
import { epdOf, INITIAL_EPD, turnOf, type Side } from '../chess/position';
import type { Ficha, FichaLevel, FichaLine, LibMove, LineKind, LineLevel } from './types';

const KIND_BY_HEAD: Record<string, LineKind> = {
  Variante: 'variante',
  'Trampa a favor': 'favor',
  'Trampa en contra': 'contra',
};
const HEADING = /^(Variante|Trampa a favor|Trampa en contra):\s*(.+?)\s*\{#([^}\s]+)\}\s*(.*)$/;
const FRONT_KEYS = ['id', 'nombre', 'alias', 'lado', 'grupo', 'orden', 'eco', 'nivel', 'jugadas', 'resumen', 'nombrar-raiz'];

interface Branch {
  /** Índice en la principal de la jugada que reemplaza. */
  ply: number;
  child: ChildNode<PgnNodeData>;
  pos: Chess;
}

/** Recorre la principal de `parent` (children[0]) y junta las variantes que cuelgan de ella. */
function readChain(
  parent: Node<PgnNodeData>,
  pos0: Chess,
  errors: string[],
  where: string,
): { moves: LibMove[]; branches: Branch[] } {
  const moves: LibMove[] = [];
  const branches: Branch[] = [];
  const pos = pos0.clone();
  let node = parent;
  while (node.children.length) {
    const child = node.children[0];
    for (const extra of node.children.slice(1)) branches.push({ ply: moves.length, child: extra, pos: pos.clone() });
    const move = parseSan(pos, child.data.san);
    if (!move) {
      const prev = moves.map((m) => m.san).join(' ') || 'el inicio';
      errors.push(`${where}: jugada ilegal “${child.data.san}” después de ${prev}.`);
      break;
    }
    const fromEpd = epdOf(pos);
    const san = makeSan(pos, move);
    const uci = makeUci(move);
    pos.play(move);
    const { text, shapes, hint } = commentOf(child.data);
    const m: LibMove = { san, uci, fromEpd, epd: epdOf(pos) };
    if (text) m.comment = text;
    if (hint) m.hint = hint;
    if (shapes.length) m.shapes = shapes;
    if (child.data.nags?.length) m.nags = child.data.nags;
    moves.push(m);
    node = child;
  }
  return { moves, branches };
}

/** Lee un PGN con una sola partida desde la posición inicial. */
function readGame(pgn: string, errors: string[], where: string) {
  // Las líneas en blanco parten el PGN en varias partidas: se sacan.
  const games = parsePgn(pgn.split(/\r?\n/).filter((l) => l.trim() !== '').join('\n'));
  if (games.length !== 1) {
    errors.push(`${where}: el PGN tiene que ser una sola partida (hay ${games.length}).`);
    return null;
  }
  if (games[0].comments?.some((c) => c.trim())) {
    errors.push(`${where}: el comentario antes de la primera jugada se pierde: pasalo al texto de la línea.`);
    return null;
  }
  const start = startingPosition(games[0].headers);
  if (start.isErr || epdOf(start.value) !== INITIAL_EPD) {
    errors.push(`${where}: el PGN tiene que empezar desde la posición inicial.`);
    return null;
  }
  return readChain(games[0].moves, start.value as Chess, errors, where);
}

function parseFrontmatter(md: string, errors: string[]) {
  const lines = md.replace(/\r\n?/g, '\n').split('\n');
  if (lines[0]?.trim() !== '---') {
    errors.push('Falta el frontmatter (el archivo tiene que empezar con ---).');
    return null;
  }
  const end = lines.findIndex((l, i) => i > 0 && l.trim() === '---');
  if (end < 0) {
    errors.push('El frontmatter no se cierra con ---.');
    return null;
  }
  const front = new Map<string, string>();
  for (const raw of lines.slice(1, end)) {
    if (!raw.trim()) continue;
    const m = /^([a-z-]+):\s*(.*)$/.exec(raw);
    if (!m || !FRONT_KEYS.includes(m[1])) {
      errors.push(`Frontmatter: línea no reconocida “${raw.trim()}”.`);
      continue;
    }
    front.set(m[1], m[2].trim());
  }
  return { front, body: lines.slice(end + 1) };
}

const list = (s: string) =>
  s
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);
const levelOf = (tag: string): LineLevel | null =>
  /^b[áa]sica$/i.test(tag) ? 'basica' : tag.toLowerCase() === 'club' ? 'club' : null;
const isError = (m: LibMove) => !!m.nags?.some((n) => n === 2 || n === 4);

/** Convierte una ficha en Markdown a datos tipados. Si hay errores no devuelve `ficha`. */
export function parseFicha(md: string): { ficha?: Ficha; errors: string[] } {
  const errors: string[] = [];
  const fm = parseFrontmatter(md, errors);
  if (!fm) return { errors };
  const { front, body } = fm;
  const get = (k: string) => front.get(k) ?? '';
  const id = get('id') || 'sin-id';
  for (const k of ['id', 'nombre', 'lado', 'grupo', 'orden', 'eco', 'nivel', 'jugadas', 'resumen']) {
    if (!get(k)) errors.push(`Ficha ${id}: falta “${k}” en el frontmatter.`);
  }
  const side: Side | null = get('lado') === 'blancas' ? 'white' : get('lado') === 'negras' ? 'black' : null;
  if (get('lado') && !side) errors.push(`Ficha ${id}: “lado” tiene que ser blancas o negras.`);
  const rootRaw = get('nombrar-raiz').toLowerCase();
  if (front.has('nombrar-raiz') && !['no', 'si', 'sí'].includes(rootRaw)) {
    errors.push(`Ficha ${id}: “nombrar-raiz” tiene que ser si o no.`);
  }
  const order = Number(get('orden'));
  if (get('orden') && !Number.isInteger(order)) errors.push(`Ficha ${id}: “orden” tiene que ser un entero.`);
  const levels: FichaLevel[] = [];
  for (const l of list(get('nivel'))) {
    if (l === 'principiante' || l === 'club') levels.push(l);
    else errors.push(`Ficha ${id}: nivel desconocido “${l}” (principiante o club).`);
  }

  const startRead = get('jugadas') ? readGame(get('jugadas'), errors, `Ficha ${id}, jugadas`) : null;

  // Secciones "## ..." del cuerpo.
  const sections: { head: string; text: string }[] = [];
  for (const line of body) {
    if (line.startsWith('## ')) sections.push({ head: line.slice(3).trim(), text: '' });
    else if (sections.length) sections[sections.length - 1].text += `${line}\n`;
    else if (line.trim()) errors.push(`Ficha ${id}: hay texto antes de la primera sección “## ”.`);
  }

  let basics = '';
  let ideas = '';
  const tips: string[] = [];
  const seen = new Set<string>();
  const lines: FichaLine[] = [];
  for (const sec of sections) {
    const text = sec.text.trim();
    if (['Para empezar', 'Ideas y planes', 'Consejos'].includes(sec.head)) {
      if (seen.has(sec.head)) errors.push(`Ficha ${id}: la sección “${sec.head}” está repetida.`);
      seen.add(sec.head);
      if (sec.head === 'Para empezar') basics = text;
      else if (sec.head === 'Ideas y planes') ideas = text;
      else {
        for (const l of text.split('\n')) {
          if (!l.trim()) continue;
          if (l.startsWith('- ')) tips.push(l.slice(2).trim());
          else errors.push(`Ficha ${id}: en Consejos solo van ítems “- ” (“${l.trim()}”).`);
        }
      }
      continue;
    }
    const h = HEADING.exec(sec.head);
    if (!h) {
      errors.push(`Ficha ${id}: encabezado desconocido “## ${sec.head}”.`);
      continue;
    }
    const kind = KIND_BY_HEAD[h[1]];
    const lineId = h[3];
    const where = `Ficha ${id}, línea ${lineId}`;
    let level: LineLevel | null = null;
    let gambit = false;
    for (const tag of [...h[4].matchAll(/\[([^\]]+)\]/g)].map((t) => t[1].trim())) {
      if (tag.toLowerCase() === 'gambito') gambit = true;
      else {
        const lv = levelOf(tag);
        if (lv) level = lv;
        else errors.push(`${where}: etiqueta desconocida [${tag}].`);
      }
    }
    if (!level) {
      errors.push(`${where}: falta el nivel [básica] o [club].`);
      level = 'basica';
    }
    if (gambit && kind !== 'variante') errors.push(`${where}: [gambito] solo va en las variantes.`);

    const blocks = [...text.matchAll(/```pgn[^\n]*\n([\s\S]*?)```/g)];
    if (blocks.length !== 1) {
      errors.push(`${where}: tiene que haber exactamente un bloque pgn (hay ${blocks.length}).`);
      continue;
    }
    const intro = text.slice(0, blocks[0].index).trim();
    const outro = text.slice(blocks[0].index + blocks[0][0].length).trim();
    const read = readGame(blocks[0][1], errors, where);
    if (!read) continue;
    const line: FichaLine = { id: lineId, kind, name: h[2], level, gambit, intro, outro, moves: read.moves };

    if (kind === 'contra') {
      if (read.branches.length !== 1) {
        errors.push(
          `${where}: trampa en contra: tiene que haber exactamente una variante ( … ) (hay ${read.branches.length}).`,
        );
      } else {
        const b = read.branches[0];
        const fall = readChain({ children: [b.child] } as Node<PgnNodeData>, b.pos, errors, where);
        if (fall.branches.length) errors.push(`${where}: trampa en contra: la variante no puede tener variantes anidadas.`);
        line.trapPly = b.ply;
        line.fall = fall.moves;
      }
    } else if (read.branches.length) {
      errors.push(`${where}: la línea tiene que ser lineal, sin variantes ( … ).`);
    }
    if (kind === 'favor' && side) {
      // Error del rival: la única jugada suya con ? o ??.
      const bad = read.moves.map((m, i) => [m, i] as const).filter(([m]) => isError(m));
      const rival = bad.filter(([m]) => turnOf(m.fromEpd) !== side);
      if (bad.length === 1 && rival.length === 1) line.trapPly = rival[0][1];
    }
    lines.push(line);
  }

  if (errors.length || !side || !startRead) return { errors };
  const start = startRead.moves;

  // rootPly: 1 + prefijo común más largo con otra variante, entre start.length + 1 y moves.length.
  const common = (a: LibMove[], b: LibMove[]) => {
    let n = 0;
    while (n < a.length && n < b.length && a[n].uci === b[n].uci) n++;
    return n;
  };
  for (const l of lines) {
    if (l.kind !== 'variante' || l.moves.length <= start.length) continue;
    const prefix = Math.max(
      0,
      ...lines.filter((o) => o !== l && o.kind === 'variante').map((o) => common(l.moves, o.moves)),
    );
    l.rootPly = Math.min(l.moves.length, Math.max(start.length + 1, prefix + 1));
  }

  const ficha: Ficha = {
    id,
    side,
    name: get('nombre'),
    aliases: list(get('alias')),
    group: get('grupo'),
    order,
    eco: get('eco'),
    levels,
    summary: get('resumen'),
    nameAtStart: rootRaw !== 'no',
    start,
    basics,
    ideas,
    tips,
    lines,
  };
  return { ficha, errors };
}
