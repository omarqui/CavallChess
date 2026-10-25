import { parsePgn, startingPosition } from 'chessops/pgn';
import { makeSan, parseSan } from 'chessops/san';
import { makeUci } from 'chessops/util';
import type { RepertoireGraph } from '../chess/graph';
import { edgeId, epdOf, INITIAL_EPD, nodeId } from '../chess/position';
import type { GameOutcome } from '../types';

export interface GapHit {
  id: string;
  epd: string;
  uci: string;
  san: string;
}

export interface GameAnalysis {
  outcome: GameOutcome;
  gap?: GapHit;
}

/**
 * Recorre una partida por el grafo del color con el que jugaste hasta la primera salida.
 * Distingue tu desvío (otra jugada donde tenías una propia) de la novedad del rival (jugada no cubierta).
 */
export function analyzeGame(pgn: string, graph: RepertoireGraph): GameAnalysis {
  const game = parsePgn(pgn)[0];
  if (!game) return { outcome: { kind: 'noBook' } };
  const start = startingPosition(game.headers);
  if (start.isErr) return { outcome: { kind: 'noBook' } };
  const pos = start.value;
  if (epdOf(pos) !== INITIAL_EPD) return { outcome: { kind: 'noBook' } };

  /** Salirse en la posición inicial es no tener repertorio de ese color: queda fuera, no "terminó tu preparación". */
  const fin = (ply: number): GameAnalysis => ({ outcome: ply === 0 ? { kind: 'noBook' } : { kind: 'endOfBook', ply } });

  const { side, rep } = graph;
  let ply = 0;
  let node = game.moves;
  while (node.children.length) {
    const child = node.children[0];
    const epd = epdOf(pos);
    const id = nodeId(rep, epd);
    if (!graph.trainable.has(id) || graph.node(id)?.cutHere) return fin(ply);
    const move = parseSan(pos, child.data.san);
    if (!move) break;
    const uci = makeUci(move);
    const san = makeSan(pos, move);
    const myTurn = pos.turn === side;
    if (myTurn) {
      const mine = graph.mineEdge(id);
      if (!mine) return fin(ply);
      if (mine.uci !== uci) {
        return {
          outcome: { kind: 'myDeviation', ply, playedSan: san, expectedSan: mine.san, cardId: mine.id },
        };
      }
    } else {
      const options = graph.children(id);
      if (!options.length) return fin(ply);
      if (!options.some((e) => e.uci === uci)) {
        const gid = edgeId(rep, epd, uci);
        return { outcome: { kind: 'gap', ply, playedSan: san, gapId: gid }, gap: { id: gid, epd, uci, san } };
      }
    }
    pos.play(move);
    ply++;
    node = child;
  }
  return { outcome: { kind: 'inBook' } };
}
