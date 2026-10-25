import { applyPlan } from '../chess/applyPlan';
import { RepertoireGraph } from '../chess/graph';
import { buildImportPlan, type Resolutions } from '../chess/pgnImport';
import { INITIAL_EPD, nodeId, type Side } from '../chess/position';
import type { MoveEdge, PositionNode } from '../types';

export interface Repo {
  nodes: Map<string, PositionNode>;
  edges: Map<string, MoveEdge>;
}

export function emptyRepo(side: Side, rep: string = side): Repo {
  const root: PositionNode = { id: nodeId(rep, INITIAL_EPD), side, epd: INITIAL_EPD, myTurn: side === 'white' };
  return { nodes: new Map([[root.id, root]]), edges: new Map() };
}

export function existingOf(repo: Repo, rep?: string) {
  const mine = new Map<string, { uci: string; san: string }>();
  for (const e of repo.edges.values()) if (e.mine) mine.set(e.fromId, { uci: e.uci, san: e.san });
  return { mine, nodeIds: new Set(repo.nodes.keys()), rep };
}

let clock = 1_000;

/** Importa un PGN sobre un repo en memoria (como lo haría la base de datos). */
export function importInto(repo: Repo, pgn: string, side: Side, resolutions: Resolutions = new Map(), rep?: string) {
  const plan = buildImportPlan(pgn, side, existingOf(repo, rep), resolutions);
  const ch = applyPlan(plan, repo.nodes, repo.edges, resolutions, new Map(), (clock += 1000));
  for (const id of ch.deleteEdgeIds) repo.edges.delete(id);
  for (const n of ch.upsertNodes) repo.nodes.set(n.id, n);
  for (const e of ch.upsertEdges) repo.edges.set(e.id, e);
  return plan;
}

export function graphOf(repo: Repo, side: Side, rep: string = side) {
  return new RepertoireGraph(side, [...repo.nodes.values()], [...repo.edges.values()], rep);
}

/** Repertorio en memoria armado desde un PGN; `rep` es su id (por defecto, el del color). */
export function repoFrom(pgn: string, side: Side, rep: string = side) {
  const repo = emptyRepo(side, rep);
  importInto(repo, pgn, side, new Map(), rep);
  return { repo, graph: graphOf(repo, side, rep) };
}

/** Busca la jugada (edge) a la que se llega jugando `sans` desde el inicio. */
export function edgeAt(graph: RepertoireGraph, sans: string[]): MoveEdge {
  let id = graph.rootId;
  let edge: MoveEdge | undefined;
  for (const san of sans) {
    edge = graph.children(id).find((e) => e.san === san);
    if (!edge) throw new Error(`no hay ${san} en ${sans.join(' ')}`);
    id = edge.toId;
  }
  return edge!;
}
