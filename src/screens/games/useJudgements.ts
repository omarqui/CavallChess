import { useEffect, useState } from 'react';
import type { Side } from '../../chess/position';
import { engine, type EngineLine } from '../../engine/stockfish';
import type { GameMove } from '../../games/gamePgn';
import { judgeMove, type Judgement } from '../../games/judge';

/** Profundidad de las evaluaciones de las salidas: alcanza para separar una imprecisión de un error grave. */
const DEPTH = 16;

export interface MoveJudgement extends Judgement {
  /** La jugada que prefería el motor (SAN), si no es la de la partida. */
  best?: string;
}

/** Evaluaciones terminadas, por posición: sobreviven a salir y volver al visor. */
const cache = new Map<string, EngineLine | null>();

/** La evaluación final de `epd` (null si no hay jugadas: mate o ahogado). Cortar no resuelve la promesa. */
function evaluate(epd: string, onCancel: (cancel: () => void) => void): Promise<EngineLine | null> {
  if (cache.has(epd)) return Promise.resolve(cache.get(epd)!);
  return new Promise((resolve) => {
    let last: EngineLine | null = null;
    onCancel(
      engine.analyze(
        epd,
        (l) => (last = l),
        DEPTH,
        () => {
          cache.set(epd, last);
          resolve(last);
        },
      ),
    );
  });
}

/**
 * Califica con el motor tus jugadas en `plies` (las salidas de la teoría o del repertorio), de a una.
 * Mientras `paused` (el motor está ocupado con "Analizar") se corta y después sigue desde la caché.
 */
export function useJudgements(moves: GameMove[], plies: number[], side: Side, paused: boolean) {
  const [done, setDone] = useState<Map<number, MoveJudgement | null>>(new Map());
  const key = plies.join(',');
  useEffect(() => {
    if (paused || !plies.length) return;
    let cancel: (() => void) | undefined;
    let alive = true;
    void (async () => {
      for (const ply of plies) {
        const m = moves[ply];
        const before = await evaluate(m.fromEpd, (c) => (cancel = c));
        const after = await evaluate(m.epd, (c) => (cancel = c));
        if (!alive) return;
        const judged: MoveJudgement | null =
          before && after
            ? { ...judgeMove(before, after, side), best: before.pv[0] && before.pv[0] !== m.san ? before.pv[0] : undefined }
            : null;
        setDone((prev) => new Map(prev).set(ply, judged));
      }
    })();
    return () => {
      alive = false;
      cancel?.();
    };
    // `plies` llega como arreglo nuevo en cada render: `key` lo representa.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moves, key, side, paused]);
  return done;
}
