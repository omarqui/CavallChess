import { buildImportPlan } from '../chess/pgnImport';
import { db, type CavallDB } from '../db/db';
import { commitImport, loadGraph } from '../db/repo';
import { fichaNames, fichaPgn, namesMap } from './pgn';
import type { Ficha } from './types';

/** Agrega líneas de la ficha al repertorio sin vista previa: ante cualquier choque se conserva lo tuyo. */
export async function addFicha(
  f: Ficha,
  lineIds: string[] = f.lines.map((l) => l.id),
  d: CavallDB = db,
): Promise<{ mine: number; rival: number }> {
  const g = await loadGraph(f.side, d);
  const mine = new Map<string, { uci: string; san: string }>();
  for (const e of g.edges.values()) if (e.mine) mine.set(e.fromId, { uci: e.uci, san: e.san });
  const plan = buildImportPlan(fichaPgn(f, lineIds), f.side, { mine, nodeIds: new Set(g.nodes.keys()) });
  return commitImport(plan, new Map(), namesMap(plan, fichaNames(f, lineIds)), d);
}
