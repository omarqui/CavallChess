// recalcGames con un análisis lento: va aparte porque reemplaza analyzeGame en todo el archivo.
import 'fake-indexeddb/auto';
import { expect, it, vi } from 'vitest';
import { CavallDB } from '../db/db';
import { ensureRoots } from '../db/repo';
import type { GameRow } from '../types';
import { recalcGames } from './store';

const log = vi.hoisted(() => [] as string[]);

vi.mock('./analyze', () => ({
  // Cada partida tarda 45 ms de CPU, como un PGN largo en un iPhone viejo.
  analyzeGame: () => {
    const fin = performance.now() + 45;
    while (performance.now() < fin) {
      /* ocupado */
    }
    log.push('A');
    return { outcome: { kind: 'noBook' } };
  },
}));

const row = (i: number): GameRow => ({
  id: `g${i}`,
  endTime: i,
  myColor: 'white',
  opponent: 'x',
  timeClass: 'blitz',
  result: 'win',
  outcome: { kind: 'noBook' },
  pgn: '1. e4 e5 *',
});

it('recalcGames cede el hilo dentro de una tanda cuando pasaron unos 40 ms', async () => {
  const d = new CavallDB('ceder');
  await ensureRoots(d);
  await d.games.bulkPut([row(1), row(2), row(3)]);

  // Un "tic" de la interfaz: solo corre si el recálculo suelta el hilo.
  let timer: ReturnType<typeof setTimeout>;
  const tic = () => {
    log.push('T');
    timer = setTimeout(tic, 0);
  };
  timer = setTimeout(tic, 0);
  const progreso: Array<[number, number]> = [];
  try {
    await recalcGames((done, total) => progreso.push([done, total]), d);
  } finally {
    clearTimeout(timer!);
  }

  const analisis = log.join('').replace(/^T+/, '').replace(/T+/g, 'T');
  expect(analisis).toMatch(/^ATATA/);
  expect(progreso).toEqual([[3, 3]]); // el progreso sigue siendo por tanda
});
