import { createRequire } from 'node:module';

/** Valor de un mate, en centipeones. */
export const MATE_CP = 100000;

export interface NodeEngine {
  /** Evalúa `epd` a `depth`. Centipeones desde las blancas; un mate vale ±100000. */
  evaluate(epd: string, depth: number): Promise<number>;
  /** Cierra el motor para que el proceso pueda terminar. */
  quit(): void;
}

type Sf = { processCommand(cmd: string): void; terminate(): void };

/** Stockfish 19 (single-thread, NNUE completa) dentro de Node. Las búsquedas se encolan de a una. */
export function createNodeEngine(): NodeEngine {
  const require = createRequire(import.meta.url);
  let waiter: ((line: string) => void) | undefined;
  const onMessage = (chunk: unknown) => {
    for (const line of String(chunk).split('\n')) if (line.trim()) waiter?.(line.trim());
  };
  const sf = require('stockfish')('single', onMessage) as Sf;

  /** Manda `cmd` y espera la línea que cumpla `done`; devuelve todo lo recibido hasta ahí. */
  const run = (cmd: string, done: (line: string) => boolean) =>
    new Promise<string[]>((resolve) => {
      const lines: string[] = [];
      waiter = (line) => {
        lines.push(line);
        if (done(line)) {
          waiter = undefined;
          resolve(lines);
        }
      };
      sf.processCommand(cmd);
    });

  let ready: Promise<unknown> | undefined;
  const boot = () =>
    (ready ??= run('uci', (l) => l === 'uciok').then(() =>
      run('isready', (l) => l === 'readyok'),
    ));

  // Búsquedas en cadena: cada una espera el bestmove de la anterior.
  let cola: Promise<unknown> = Promise.resolve();

  return {
    evaluate(epd, depth) {
      const tarea = cola.then(async () => {
        await boot();
        const whiteToMove = epd.split(' ')[1] === 'w';
        sf.processCommand('ucinewgame');
        sf.processCommand(`position fen ${epd} 0 1`);
        const lines = await run(`go depth ${depth}`, (l) => l.startsWith('bestmove'));
        const sinJugada = /^bestmove (\(none\)|0000)/.test(lines[lines.length - 1]);
        let moverCp: number | undefined;
        for (const l of lines) {
          if (!l.startsWith('info') || !l.includes(' score ')) continue;
          const cp = l.match(/ score cp (-?\d+)/)?.[1];
          const mate = l.match(/ score mate (-?\d+)/)?.[1];
          if (cp !== undefined) moverCp = Number(cp);
          else if (mate !== undefined) {
            const n = Number(mate);
            // mate 0: el que mueve ya está mateado.
            moverCp = n > 0 ? MATE_CP : -MATE_CP;
          }
        }
        // Sin jugada legal y sin puntaje útil: mate (o ahogado, que acá no corresponde).
        if (moverCp === undefined || (sinJugada && moverCp === 0)) {
          if (!sinJugada) throw new Error(`Stockfish no devolvió puntaje para ${epd}`);
          moverCp = -MATE_CP;
        }
        return whiteToMove ? moverCp : -moverCp;
      });
      cola = tarea.catch(() => undefined);
      return tarea;
    },
    quit() {
      sf.terminate();
    },
  };
}
