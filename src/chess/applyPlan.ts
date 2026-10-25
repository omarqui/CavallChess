import { edgeId, nodeId } from './position';
import type { ImportPlan, Resolutions } from './pgnImport';
import type { MoveEdge, PositionNode } from '../types';

export interface PlanChanges {
  upsertNodes: PositionNode[];
  upsertEdges: MoveEdge[];
  deleteEdgeIds: string[];
  newMineEdgeIds: string[];
}

/**
 * Traduce un plan de importación a cambios concretos sobre el grafo existente. Pura.
 * No pisa textos existentes; los conflictos resueltos como 'replace' borran la jugada propia vieja
 * (lo que quede inalcanzable pasa a archivado, con su historial).
 */
export function applyPlan(
  plan: ImportPlan,
  existingNodes: Map<string, PositionNode>,
  existingEdges: Map<string, MoveEdge>,
  resolutions: Resolutions,
  names: Map<string, string>,
  now: number,
): PlanChanges {
  const side = plan.side;
  const upsertNodes: PositionNode[] = [];
  const upsertEdges: MoveEdge[] = [];
  const deleteEdgeIds: string[] = [];
  const newMineEdgeIds: string[] = [];

  for (const [id, n] of plan.nodes) {
    const prev = existingNodes.get(id);
    const name = names.get(id)?.trim();
    if (!prev) upsertNodes.push({ id, side, epd: n.epd, myTurn: n.myTurn, ...(name ? { name } : {}) });
    else if (name && !prev.name) upsertNodes.push({ ...prev, name });
  }
  // Nombres sobre nodos que ya existían y no están en el plan (raíz elegida antes del recorrido).
  for (const [id, name] of names) {
    if (plan.nodes.has(id) || !name.trim()) continue;
    const prev = existingNodes.get(id);
    if (prev && !prev.name) upsertNodes.push({ ...prev, name: name.trim() });
  }

  for (const c of plan.conflicts) {
    if (resolutions.get(c.nodeId) === 'replace') deleteEdgeIds.push(edgeId(side, c.epd, c.existingUci));
  }

  let i = 0;
  for (const e of plan.edges.values()) {
    const prev = existingEdges.get(e.id);
    if (prev) {
      const merged: MoveEdge = {
        ...prev,
        explanation: prev.explanation || e.explanation,
        shapes: prev.shapes?.length ? prev.shapes : e.shapes,
        nags: prev.nags?.length ? prev.nags : e.nags,
        hint: prev.hint || e.hint,
        trap: prev.trap ?? e.trap,
      };
      if (
        merged.explanation !== prev.explanation ||
        merged.shapes !== prev.shapes ||
        merged.nags !== prev.nags ||
        merged.hint !== prev.hint ||
        merged.trap !== prev.trap
      ) {
        upsertEdges.push(merged);
      }
      continue;
    }
    const edge: MoveEdge = {
      id: e.id,
      side,
      fromId: nodeId(side, e.fromEpd),
      toId: nodeId(side, e.toEpd),
      uci: e.uci,
      san: e.san,
      mine: e.mine,
      createdAt: now + i++,
      ...(e.explanation ? { explanation: e.explanation } : {}),
      ...(e.shapes ? { shapes: e.shapes } : {}),
      ...(e.nags ? { nags: e.nags } : {}),
      ...(e.hint ? { hint: e.hint } : {}),
      ...(e.trap ? { trap: e.trap } : {}),
    };
    upsertEdges.push(edge);
    if (edge.mine) newMineEdgeIds.push(edge.id);
  }
  return { upsertNodes, upsertEdges, deleteEdgeIds, newMineEdgeIds };
}
