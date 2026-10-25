import type { RepertoireGraph } from '../chess/graph';
import { edgeId, nodeId, turnOf, type Side } from '../chess/position';
import type { Ficha, FichaLine, LibMove } from '../library/types';
import type { MoveEdge } from '../types';
import type { GameMove } from './gamePgn';

/** Una jugada de la biblioteca: en qué ficha y línea está y en qué índice (o en la caída de una trampa en contra). */
export interface LibHit {
  ficha: Ficha;
  line: FichaLine;
  index: number;
  fall: boolean;
  move: LibMove;
}

/** Lo que sale de cruzar una trampa de la biblioteca con la partida. */
export type TrapEvent =
  /** El rival cometió el error de una trampa a favor; `punished` dice si seguiste con la jugada de la ficha. */
  | { kind: 'favor'; ply: number; ficha: Ficha; line: FichaLine; punished?: boolean; expectedSan?: string }
  /** Llegaste a la posición de una trampa en contra: la esquivaste o caíste. */
  | { kind: 'esquivaste' | 'caiste'; ply: number; ficha: Ficha; line: FichaLine };

/** Lo que se sabe de la jugada `moves[ply]`. */
export interface PlyInsight {
  /** La línea de la biblioteca que sigue la partida en esta jugada (la misma que en la anterior, si se puede). */
  lib?: LibHit;
  /** El comentario de la biblioteca para esta jugada: el de `lib` o, si no tiene, el de otra línea que la juegue. */
  comment?: string;
  /** La jugada en tu repertorio, si sale de una posición entrenable. */
  edge?: MoveEdge;
  /** Nombre de la apertura en la posición resultante. */
  name?: string;
}

export interface OpeningInsight {
  plies: PlyInsight[];
  /** Cuántas jugadas seguidas desde el inicio están en la biblioteca (sin contar caídas). */
  theory: number;
  /** La línea de la última jugada de teoría. */
  last?: LibHit;
  /**
   * Dónde salió la partida de la biblioteca (`moves[ply]`, la primera jugada que no está), si había entrado: quién
   * salió y qué juega la biblioteca en esa posición.
   */
  exit?: { ply: number; mine: boolean; known: LibMove[] };
  traps: TrapEvent[];
  /** Nombre de la apertura de la partida: el más profundo de tu repertorio, si no el de la última jugada de teoría, si no el ECO. */
  name?: string;
}

const key = (epd: string, uci: string) => `${epd}|${uci}`;

interface LibIndex {
  moves: Map<string, LibHit[]>;
  /** Jugadas de la biblioteca por posición (sin caídas), para decir qué sigue cuando la partida sale. */
  byPos: Map<string, LibMove[]>;
}

const indexCache = new WeakMap<Ficha[], Map<Side, LibIndex>>();

function libIndex(fichas: Ficha[], side: Side): LibIndex {
  let bySide = indexCache.get(fichas);
  if (!bySide) indexCache.set(fichas, (bySide = new Map()));
  const cached = bySide.get(side);
  if (cached) return cached;
  const index: LibIndex = { moves: new Map(), byPos: new Map() };
  const add = (hit: LibHit) => {
    const k = key(hit.move.fromEpd, hit.move.uci);
    const list = index.moves.get(k);
    if (list) list.push(hit);
    else index.moves.set(k, [hit]);
    if (hit.fall) return;
    const at = index.byPos.get(hit.move.fromEpd) ?? [];
    if (!at.some((m) => m.uci === hit.move.uci)) at.push(hit.move);
    index.byPos.set(hit.move.fromEpd, at);
  };
  for (const ficha of fichas) {
    if (ficha.side !== side) continue;
    for (const line of ficha.lines) {
      line.moves.forEach((move, i) => add({ ficha, line, index: i, fall: false, move }));
      line.fall?.forEach((move, i) => add({ ficha, line, index: i, fall: true, move }));
    }
  }
  bySide.set(side, index);
  return index;
}

const KIND_ORDER: Record<FichaLine['kind'], number> = { variante: 0, favor: 1, contra: 2 };

/** El nombre de la ficha y, si es una variante, el de la variante. */
export const libName = (hit: LibHit) => (hit.line.kind === 'variante' ? `${hit.ficha.name} › ${hit.line.name}` : hit.ficha.name);

/**
 * Cruza la línea principal de una partida con lo que sabe CavallChess: la biblioteca (qué ficha y línea sigue,
 * hasta dónde llega la teoría, qué trampas aparecieron), tu repertorio (las jugadas con su explicación) y los nombres
 * ECO. Es pura: el repertorio del color con el que jugaste, las fichas y los nombres ECO llegan de afuera.
 */
export function openingInsight(
  moves: GameMove[],
  side: Side,
  graph: RepertoireGraph,
  fichas: Ficha[],
  eco: Record<string, string> | null,
): OpeningInsight {
  const index = libIndex(fichas, side);
  // Cuántas jugadas de la partida tiene cada línea: entre las candidatas, gana la que más acompaña a la partida.
  const support = new Map<FichaLine, number>();
  for (const m of moves) {
    for (const hit of index.moves.get(key(m.fromEpd, m.uci)) ?? []) support.set(hit.line, (support.get(hit.line) ?? 0) + 1);
  }

  const plies: PlyInsight[] = [];
  let prev: LibHit | undefined;
  let theory = 0;
  let inTheory = true;
  let ecoName: string | undefined;
  let repName: string | undefined;
  for (const [ply, m] of moves.entries()) {
    const hits = index.moves.get(key(m.fromEpd, m.uci)) ?? [];
    const lib =
      (prev && hits.find((h) => h.line === prev!.line && h.fall === prev!.fall)) ??
      [...hits].sort(
        (a, b) =>
          Number(a.fall) - Number(b.fall) ||
          (support.get(b.line) ?? 0) - (support.get(a.line) ?? 0) ||
          KIND_ORDER[a.line.kind] - KIND_ORDER[b.line.kind],
      )[0];
    if (lib) prev = lib;
    if (inTheory && hits.some((h) => !h.fall)) theory = ply + 1;
    else inTheory = false;

    const fromId = nodeId(side, m.fromEpd);
    const edge = graph.trainable.has(fromId) && !graph.node(fromId)?.cutHere ? graph.edges.get(edgeId(side, m.fromEpd, m.uci)) : undefined;
    const ecoHere = eco?.[m.epd];
    if (ecoHere) ecoName = ecoHere.replace(/^[A-E]\d\d /, '');
    const toId = nodeId(side, m.epd);
    const labels = edge && graph.trainable.has(toId) ? graph.labelsFor(toId) : [];
    if (labels.length) repName = labels.map((n) => n.name).join(' › ');
    const name = labels.length ? repName : lib ? libName(lib) : ecoName;
    plies.push({ lib, comment: lib?.move.comment ?? hits.find((h) => h.move.comment)?.move.comment, edge, name });
  }

  const last = theory > 0 ? plies[theory - 1].lib : undefined;
  const exit =
    theory > 0 && theory < moves.length
      ? { ply: theory, mine: turnOf(moves[theory].fromEpd) === side, known: index.byPos.get(moves[theory].fromEpd) ?? [] }
      : undefined;
  return {
    plies,
    theory,
    last,
    exit,
    traps: trapEvents(moves, fichas, side),
    // Tus nombres primero, después la biblioteca (en castellano y con la variante) y por último el ECO.
    name: repName ?? (last && libName(last)) ?? ecoName,
  };
}

/** Las trampas de la biblioteca que aparecieron en la partida, en el orden de la partida. */
function trapEvents(moves: GameMove[], fichas: Ficha[], side: Side): TrapEvent[] {
  const events: TrapEvent[] = [];
  for (const ficha of fichas) {
    if (ficha.side !== side) continue;
    for (const line of ficha.lines) {
      const trap = line.trapPly === undefined ? undefined : line.moves[line.trapPly];
      if (!trap) continue;
      const ply = moves.findIndex((m) => m.fromEpd === trap.fromEpd);
      if (ply < 0) continue;
      const played = moves[ply];
      if (line.kind === 'favor' && played.uci === trap.uci) {
        const next = line.moves[line.trapPly! + 1];
        const reply = moves[ply + 1];
        events.push({
          kind: 'favor',
          ply,
          ficha,
          line,
          punished: next && reply ? reply.uci === next.uci : undefined,
          expectedSan: next?.san,
        });
      } else if (line.kind === 'contra') {
        if (played.uci === trap.uci) events.push({ kind: 'esquivaste', ply, ficha, line });
        else if (played.uci === line.fall?.[0]?.uci) events.push({ kind: 'caiste', ply, ficha, line });
      }
    }
  }
  return events.sort((a, b) => a.ply - b.ply);
}
