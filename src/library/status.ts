import type { RepertoireGraph } from '../chess/graph';
import { nodeId, turnOf, type Side } from '../chess/position';
import type { Note } from '../types';
import type { Ficha, FichaLine } from './types';

export type LineStatus =
  | { kind: 'new' }
  | { kind: 'partial' }
  | { kind: 'added' }
  | { kind: 'conflict'; ply: number; existingSan: string };

/**
 * Estado de una línea frente al repertorio: solo cuentan las jugadas propias.
 * `added` y `conflict` miran todas; `partial` solo cuenta las de la parte propia de la línea
 * (variante: desde la primera jugada tras el tronco compartido, `rootPly - 1`; trampas: desde la jugada de la trampa),
 * para que compartir el tronco con otra línea ya agregada no la vuelva parcial.
 *
 * Una jugada propia cuenta como presente solo si sale de una posición alcanzable: `mineEdge` también devuelve las
 * archivadas. El choque sí mira las archivadas, porque la importación también choca con ellas. En las trampas,
 * `added` exige además la marca en `moves[trapPly]`; sin ella la línea es parcial (agregarla completa la marca).
 */
export function lineStatus(line: FichaLine, side: Side, graph: RepertoireGraph): LineStatus {
  const from = line.kind === 'variante' ? (line.rootPly ?? line.moves.length) - 1 : (line.trapPly ?? 0);
  let present = 0;
  let missing = 0;
  for (let ply = 0; ply < line.moves.length; ply++) {
    const m = line.moves[ply];
    if (turnOf(m.fromEpd) !== side) continue;
    const id = nodeId(side, m.fromEpd);
    const have = graph.mineEdge(id);
    if (have && have.uci !== m.uci) return { kind: 'conflict', ply, existingSan: have.san };
    if (!have || graph.isArchived(id)) missing++;
    else if (ply >= from) present++;
  }
  if (!missing) return line.kind === 'variante' || hasTrapMark(line, side, graph) ? { kind: 'added' } : { kind: 'partial' };
  return present ? { kind: 'partial' } : { kind: 'new' };
}

/** ¿La jugada de la trampa (`moves[trapPly]`: el error del rival o tu jugada correcta) ya lleva su marca? */
function hasTrapMark(line: FichaLine, side: Side, graph: RepertoireGraph): boolean {
  const m = line.trapPly === undefined ? undefined : line.moves[line.trapPly];
  if (!m) return true;
  return !!graph.children(nodeId(side, m.fromEpd)).find((e) => e.uci === m.uci)?.trap;
}

/** Cuántas líneas de la ficha ya están completas en el repertorio. */
export function fichaProgress(f: Ficha, graph: RepertoireGraph): { added: number; total: number } {
  const added = f.lines.filter((l) => lineStatus(l, f.side, graph).kind === 'added').length;
  return { added, total: f.lines.length };
}

/** Fichas del lado con alguna línea que juega `uci` desde `epd`. */
export function findFichasForMove(fichas: Ficha[], side: Side, epd: string, uci: string): Ficha[] {
  return fichas.filter(
    (f) => f.side === side && f.lines.some((l) => l.moves.some((m) => m.fromEpd === epd && m.uci === uci)),
  );
}

/** Notas `"<ficha>|<x>"` cuyo `x` ya no es una línea de la ficha. */
export function orphanNotes(f: Ficha, notes: Map<string, Note>): Note[] {
  const prefix = `${f.id}|`;
  const lines = new Set(f.lines.map((l) => l.id));
  return [...notes.values()].filter((n) => n.id.startsWith(prefix) && !lines.has(n.id.slice(prefix.length)));
}
