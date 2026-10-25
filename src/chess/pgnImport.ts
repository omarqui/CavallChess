import { parseComment, parsePgn, startingPosition, type ChildNode, type Node, type PgnNodeData } from 'chessops/pgn';
import { makeSan, parseSan } from 'chessops/san';
import { makeSquare, makeUci } from 'chessops/util';
import type { Chess } from 'chessops/chess';
import type { Move } from 'chessops/types';
import { edgeId, epdOf, INITIAL_EPD, nodeId, turnOf, type Side } from './position';
import type { Shape, TrapMark } from '../types';
import type { RepertoireGraph } from './graph';

export interface ImportedEdge {
  id: string;
  fromEpd: string;
  toEpd: string;
  uci: string;
  san: string;
  mine: boolean;
  explanation?: string;
  shapes?: Shape[];
  nags?: number[];
  hint?: string;
  trap?: TrapMark;
}

export interface ImportConflict {
  nodeId: string;
  epd: string;
  existingUci: string;
  existingSan: string;
  importedUci: string;
  importedSan: string;
  /** Camino SAN (desde el PGN) para ubicar el conflicto. */
  line: string[];
}

export interface ImportedChapter {
  name: string;
  /** Posiciones de la línea principal, desde la inicial. */
  mainline: { epd: string; san?: string }[];
  /** Índice en `mainline` propuesto como raíz nombrada. */
  proposedRoot: number;
}

export interface ImportPlan {
  side: Side;
  /** Repertorio destino: prefijo de los ids del plan. */
  rep: string;
  chapters: ImportedChapter[];
  nodes: Map<string, { epd: string; myTurn: boolean }>;
  edges: Map<string, ImportedEdge>;
  conflicts: ImportConflict[];
  ignoredOwnVariations: number;
  errors: string[];
}

export interface ExistingRepertoire {
  /** nodeId -> jugada propia existente */
  mine: Map<string, { uci: string; san: string }>;
  /** nodos existentes (para aceptar capítulos que empiezan desde una posición ya conocida) */
  nodeIds: Set<string>;
  /** Repertorio destino; sin él, el del color. */
  rep?: string;
}

/** Lo que ya tiene el repertorio (también lo archivado), en la forma que espera `buildImportPlan`. */
export function existingOf(g: RepertoireGraph): ExistingRepertoire {
  const mine = new Map<string, { uci: string; san: string }>();
  for (const e of g.edges.values()) if (e.mine) mine.set(e.fromId, { uci: e.uci, san: e.san });
  return { mine, nodeIds: new Set(g.nodes.keys()), rep: g.rep };
}

/** Resolución por conflicto: 'keep' conserva lo existente, 'replace' adopta lo del PGN. */
export type Resolutions = Map<string, 'keep' | 'replace'>;

const STRIP_TAGS = /\[%(anno|clk|emt|eval)[^\]]*\]/g;

/** `[%hint <texto>]`: pista para la jugada. */
const HINT_TAG = /\[%hint\s+([^\]]*)\]/g;
/** `[%trap <favor|contra> <fichaId>/<trapId> <nombre>]`: marca de trampa. */
const TRAP_TAG = /\[%trap\s+(favor|contra)\s+([^/\s\]]+)\/([^\s\]]+)\s+([^\]]+)\]/g;
/** Restos de marcas propias mal formadas (sin nombre, `kind` inválido o en mayúsculas): no deben quedar crudos. */
const LEFTOVER_TAG = /\[%(?:hint|trap)[^\]]*(?:\]|$)/g;

export function commentOf(data: PgnNodeData): { text?: string; shapes: Shape[]; hint?: string; trap?: TrapMark } {
  const parts: string[] = [];
  const shapes: Shape[] = [];
  let hint: string | undefined;
  let trap: TrapMark | undefined;
  for (const raw of [...(data.startingComments ?? []), ...(data.comments ?? [])]) {
    // Las marcas propias se leen y se sacan antes de que parseComment y STRIP_TAGS vean el texto.
    const sinMarcas = raw
      .replace(HINT_TAG, (_, t: string) => {
        hint ??= t.replace(/\s+/g, ' ').trim() || undefined;
        return '';
      })
      .replace(TRAP_TAG, (_, kind: string, fichaId: string, trapId: string, name: string) => {
        const clean = name.replace(/\s+/g, ' ').trim();
        if (clean) trap ??= { kind: kind as TrapMark['kind'], fichaId, trapId, name: clean };
        return '';
      })
      .replace(LEFTOVER_TAG, '');
    const c = parseComment(sinMarcas);
    const text = c.text.replace(STRIP_TAGS, '').replace(/\s+/g, ' ').trim();
    if (text) parts.push(text);
    for (const s of c.shapes) {
      const orig = makeSquare(s.from);
      shapes.push(s.from === s.to ? { orig, brush: s.color } : { orig, dest: makeSquare(s.to), brush: s.color });
    }
  }
  return { text: parts.length ? parts.join('\n') : undefined, shapes, hint, trap };
}

function chapterName(headers: Map<string, string>, index: number): string {
  const chapter = headers.get('ChapterName');
  if (chapter) return chapter;
  const event = headers.get('Event');
  const study = headers.get('StudyName');
  if (event && study && event.startsWith(`${study}: `)) return event.slice(study.length + 2);
  if (event && event !== '?') return event;
  return `Capítulo ${index + 1}`;
}

/**
 * Convierte un PGN (con variantes y comentarios) en un plan de importación sobre el grafo de `side`.
 * Regla: en posiciones propias solo entra la línea principal; del rival entran todas las variantes.
 */
export function buildImportPlan(
  pgn: string,
  side: Side,
  existing: ExistingRepertoire,
  resolutions: Resolutions = new Map(),
): ImportPlan {
  const rep = existing.rep ?? side;
  const plan: ImportPlan = {
    side,
    rep,
    chapters: [],
    nodes: new Map(),
    edges: new Map(),
    conflicts: [],
    ignoredOwnVariations: 0,
    errors: [],
  };
  const conflictIds = new Set<string>();
  /** jugada propia elegida por nodo dentro de este plan (para transposiciones dentro del PGN) */
  const chosen = new Map<string, string>();

  const addNode = (epd: string) => {
    const id = nodeId(rep, epd);
    if (!plan.nodes.has(id)) plan.nodes.set(id, { epd, myTurn: turnOf(epd) === side });
    return id;
  };

  const games = parsePgn(pgn);
  games.forEach((game, gi) => {
    const start = startingPosition(game.headers);
    if (start.isErr) {
      plan.errors.push(`Capítulo ${gi + 1}: posición inicial inválida.`);
      return;
    }
    const pos = start.value as Chess;
    const startEpd = epdOf(pos);
    const startId = nodeId(rep, startEpd);
    if (startEpd !== INITIAL_EPD && !existing.nodeIds.has(startId) && !plan.nodes.has(startId)) {
      plan.errors.push(
        `“${chapterName(game.headers, gi)}” empieza desde una posición que no está en tu repertorio; se omitió.`,
      );
      return;
    }
    addNode(startEpd);

    const walk = (node: Node<PgnNodeData>, pos: Chess, line: string[]) => {
      const epd = epdOf(pos);
      const fromId = addNode(epd);
      const myTurn = pos.turn === side;
      const parsed: { child: ChildNode<PgnNodeData>; move: Move; uci: string; san: string }[] = [];
      for (const child of node.children) {
        const move = parseSan(pos, child.data.san);
        if (!move) {
          plan.errors.push(`Jugada ilegal “${child.data.san}” después de ${line.join(' ') || 'el inicio'}.`);
          continue;
        }
        parsed.push({ child, move, uci: makeUci(move), san: makeSan(pos, move) });
      }
      let follow = parsed;
      if (myTurn && parsed.length) {
        // Una sola jugada propia: la principal, salvo que ya haya una elegida (transposición
        // dentro del PGN) o que choque con la existente y se decida conservarla.
        const main = parsed[0];
        const ex = existing.mine.get(fromId);
        const prior = chosen.get(fromId);
        let pick: (typeof parsed)[number] | undefined = main;
        let keptConflict = false;
        if (prior) {
          pick = parsed.find((c) => c.uci === prior);
        } else if (ex && ex.uci !== main.uci) {
          if (!conflictIds.has(fromId)) {
            conflictIds.add(fromId);
            plan.conflicts.push({
              nodeId: fromId,
              epd,
              existingUci: ex.uci,
              existingSan: ex.san,
              importedUci: main.uci,
              importedSan: main.san,
              line: [...line],
            });
          }
          if ((resolutions.get(fromId) ?? 'keep') === 'keep') {
            pick = parsed.find((c) => c.uci === ex.uci);
            // La principal que pierde el choque ya se ve como conflicto: no cuenta como variante ignorada.
            keptConflict = true;
          }
        }
        plan.ignoredOwnVariations += parsed.length - (pick ? 1 : 0) - (keptConflict ? 1 : 0);
        follow = pick ? [pick] : [];
        if (pick) chosen.set(fromId, pick.uci);
      }
      for (const { child, move, uci, san } of follow) {
        const next = pos.clone();
        next.play(move);
        const toEpd = epdOf(next);
        addNode(toEpd);
        const id = edgeId(rep, epd, uci);
        const { text, shapes, hint, trap } = commentOf(child.data);
        const prev = plan.edges.get(id);
        if (!prev) {
          plan.edges.set(id, {
            id,
            fromEpd: epd,
            toEpd,
            uci,
            san,
            mine: myTurn,
            explanation: text,
            shapes: shapes.length ? shapes : undefined,
            nags: child.data.nags?.length ? child.data.nags : undefined,
            hint,
            trap,
          });
        } else {
          if (!prev.explanation && text) prev.explanation = text;
          if (!prev.shapes && shapes.length) prev.shapes = shapes;
          if (!prev.hint && hint) prev.hint = hint;
          if (!prev.trap && trap) prev.trap = trap;
        }
        walk(child, next, [...line, san]);
      }
    };
    walk(game.moves, pos.clone(), []);

    // Línea principal y raíz propuesta (primer punto de ramificación del capítulo).
    const mainline: ImportedChapter['mainline'] = [{ epd: startEpd }];
    let proposedRoot = -1;
    let cur: Node<PgnNodeData> = game.moves;
    const p = pos.clone();
    while (cur.children.length) {
      if (proposedRoot < 0 && cur.children.length > 1) proposedRoot = mainline.length - 1;
      const child: ChildNode<PgnNodeData> = cur.children[0];
      const move = parseSan(p, child.data.san);
      if (!move) break;
      const san = makeSan(p, move);
      p.play(move);
      mainline.push({ epd: epdOf(p), san });
      cur = child;
    }
    if (proposedRoot < 0) proposedRoot = mainline.length - 1;
    plan.chapters.push({ name: chapterName(game.headers, gi), mainline, proposedRoot });
  });

  if (!games.length) plan.errors.push('No se encontró ninguna partida en el PGN.');
  return plan;
}
