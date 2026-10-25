import type { RepertoireGraph } from '../chess/graph';
import type { GameOutcome } from '../types';
import { analyzeGame, type GameAnalysis } from './analyze';

export interface RepAnalysis extends GameAnalysis {
  /** Repertorio contra el que se cruzó. */
  rep: string;
}

/** Hasta dónde llegó la partida dentro del repertorio: sin salir, más que cualquier salida; fuera, menos que todo. */
const reach = (o: GameOutcome) => (o.kind === 'inBook' ? Infinity : o.kind === 'noBook' ? -1 : o.ply);

/**
 * Cruza una partida con todos los repertorios de su color y se queda con el que más la cubre (la salida más tardía).
 * Si empatan, gana `preferred` (el activo) y, si no, el primero de `graphs`. `graphs` no puede estar vacío.
 */
export function analyzeBest(pgn: string, graphs: RepertoireGraph[], preferred?: string): RepAnalysis {
  let best: (RepAnalysis & { reach: number }) | undefined;
  for (const g of graphs) {
    const a = analyzeGame(pgn, g);
    const r = reach(a.outcome);
    if (!best || r > best.reach || (r === best.reach && g.rep === preferred && best.rep !== preferred)) {
      best = { ...a, rep: g.rep, reach: r };
    }
  }
  if (!best) throw new Error('analyzeBest necesita al menos un repertorio.');
  const { reach: _reach, ...out } = best;
  return out;
}
