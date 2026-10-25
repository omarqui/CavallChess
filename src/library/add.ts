import { buildImportPlan, existingOf } from '../chess/pgnImport';
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
  const plan = buildImportPlan(fichaPgn(f, lineIds), f.side, existingOf(await loadGraph(f.side, d)));
  return commitImport(plan, new Map(), namesMap(plan, fichaNames(f, lineIds)), d);
}
