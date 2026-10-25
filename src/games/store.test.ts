import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { CavallDB } from '../db/db';
import { addMove, ensureRoots } from '../db/repo';
import { INITIAL_EPD, nodeId } from '../chess/position';
import type { GameOutcome, GameRow, Side } from '../types';
import { countGames, gamesPage, matchesFilter, recalcGames, type GameFilter } from './store';

let d: CavallDB;
let n = 0;

beforeEach(async () => {
  d = new CavallDB(`store-${n++}`);
  await ensureRoots(d);
});

const OUTCOMES: GameOutcome[] = [
  { kind: 'inBook' },
  { kind: 'endOfBook', ply: 6 },
  { kind: 'myDeviation', ply: 4, playedSan: 'Nc3', expectedSan: 'Nf3', cardId: 'white|x|g1f3' },
  { kind: 'gap', ply: 3, playedSan: 'd5', gapId: 'white|x|d7d5' },
  { kind: 'noBook' },
];

function row(i: number): GameRow {
  const myColor: Side = i % 2 ? 'black' : 'white';
  return {
    id: `https://chess.com/game/${i}`,
    endTime: 1_000_000 + i * 1000,
    myColor,
    opponent: `rival${i}`,
    timeClass: 'rapid',
    result: 'win',
    outcome: OUTCOMES[i % OUTCOMES.length],
    pgn: '1. e4 e5 *',
  };
}

async function seed(total = 120) {
  await d.games.bulkPut(Array.from({ length: total }, (_, i) => row(i)));
}

describe('consultas de partidas', () => {
  it('matchesFilter agrupa los resultados', () => {
    const f = (outcome: GameFilter['outcome']): GameFilter => ({ color: 'todas', outcome });
    expect(matchesFilter(row(0), f('dentro'))).toBe(true); // inBook
    expect(matchesFilter(row(1), f('dentro'))).toBe(true); // endOfBook
    expect(matchesFilter(row(2), f('desvios'))).toBe(true);
    expect(matchesFilter(row(3), f('novedades'))).toBe(true);
    expect(matchesFilter(row(4), f('fuera'))).toBe(true);
    expect(matchesFilter(row(4), f('dentro'))).toBe(false);
    expect(matchesFilter(row(0), { color: 'black', outcome: 'todas' })).toBe(false);
  });

  it('gamesPage pagina en orden de fecha y aplica color y resultado', async () => {
    await seed();
    const todas = await gamesPage({ color: 'todas', outcome: 'todas' }, 0, 50, d);
    expect(todas).toHaveLength(50);
    expect(todas[0].endTime).toBeGreaterThan(todas[1].endTime);
    expect(todas[0].id).toBe(row(119).id);

    const f: GameFilter = { color: 'white', outcome: 'dentro' };
    const esperadas = Array.from({ length: 120 }, (_, i) => i)
      .filter((i) => matchesFilter(row(i), f))
      .reverse();
    expect(esperadas.length).toBeGreaterThan(20);
    const p1 = await gamesPage(f, 0, 10, d);
    const p2 = await gamesPage(f, 10, 10, d);
    expect(p1.map((r) => r.id)).toEqual(esperadas.slice(0, 10).map((i) => row(i).id));
    expect(p2.map((r) => r.id)).toEqual(esperadas.slice(10, 20).map((i) => row(i).id));
    expect(p2.every((r) => r.myColor === 'white')).toBe(true);
  });

  it('countGames coincide con la suma de las páginas', async () => {
    await seed();
    for (const color of ['todas', 'white', 'black'] as const) {
      for (const outcome of ['todas', 'desvios', 'novedades', 'dentro', 'fuera'] as const) {
        const f = { color, outcome };
        const total = await countGames(f, d);
        let suma = 0;
        for (let off = 0; ; off += 7) {
          const page = await gamesPage(f, off, 7, d);
          suma += page.length;
          if (page.length < 7) break;
        }
        expect(suma).toBe(total);
      }
    }
    expect(await countGames({ color: 'todas', outcome: 'todas' }, d)).toBe(120);
  });
});

describe('recalcGames', () => {
  it('actualiza resultados y reconstruye huecos sin eventos nuevos', async () => {
    // Repertorio de blancas: 1. e4 propia y 1... c5 como única respuesta conocida del rival.
    const e4 = await addMove('white', nodeId('white', INITIAL_EPD), 'e2e4', d);
    await addMove('white', e4!.toId, 'c7c5', d);
    const mk = (id: string, endTime: number, pgn: string): GameRow => ({
      id,
      endTime,
      myColor: 'white',
      opponent: 'x',
      timeClass: 'blitz',
      result: 'win',
      outcome: { kind: 'noBook' }, // desactualizado a propósito
      pgn,
    });
    // Dos partidas con la misma novedad del rival (1. e4 e5) y una con desvío (1. d4).
    await d.games.bulkPut([mk('g1', 1000, '1. e4 e5 *'), mk('g2', 3000, '1. e4 e5 *'), mk('g3', 2000, '1. d4 d5 *')]);
    // Hueco viejo que ya no corresponde: tiene que desaparecer.
    await d.gaps.put({ id: 'white|viejo|a2a3', side: 'white', epd: 'viejo', uci: 'a2a3', san: 'a3', count: 9, lastSeen: 1 });
    const eventosAntes = await d.events.toArray();

    const progreso: Array<[number, number]> = [];
    const res = await recalcGames((done, total) => progreso.push([done, total]), d);

    expect(res.games).toBe(3);
    expect(res.gaps).toBe(1);
    expect(progreso.at(-1)).toEqual([3, 3]);
    expect((await d.games.get('g1'))!.outcome.kind).toBe('gap');
    expect((await d.games.get('g3'))!.outcome.kind).toBe('myDeviation');
    const gaps = await d.gaps.toArray();
    expect(gaps).toHaveLength(1);
    expect(gaps[0]).toMatchObject({ side: 'white', san: 'e5', count: 2, lastSeen: 3000, lastGameUrl: 'g2' });
    expect(await d.events.toArray()).toEqual(eventosAntes);
  });

  it('procesa más de una tanda', async () => {
    await d.games.bulkPut(Array.from({ length: 450 }, (_, i) => row(i)));
    const progreso: number[] = [];
    const res = await recalcGames((done) => progreso.push(done), d);
    expect(res.games).toBe(450);
    expect(progreso).toEqual([200, 400, 450]);
  });
});
