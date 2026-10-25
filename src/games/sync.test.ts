import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CavallDB } from '../db/db';
import { buildImportPlan } from '../chess/pgnImport';
import { commitImport, ensureRoots, getSettings, loadGraph, setSettings } from '../db/repo';
import { archivesToFetch, fetchMonth, olderArchives } from './chesscom';
import type { ChesscomGame } from './chesscom';
import { FORCE_DUE_WINDOW_MS, loadOlderGames, shouldForceDue, syncChesscom } from './sync';

const DAY = 86_400_000;
const MONTHS = ['2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10'];
const url = (m: string) => `https://api.chess.com/pub/player/yo/games/${m.replace('-', '/')}`;

let d: CavallDB;
let n = 0;

function game(id: string, endMs: number, pgn = '1. d4 d5 *'): ChesscomGame {
  return {
    url: `https://www.chess.com/game/live/${id}`,
    pgn,
    time_class: 'rapid',
    rules: 'chess',
    end_time: Math.floor(endMs / 1000),
    white: { username: 'Yo', result: 'win' },
    black: { username: 'rival', result: 'resigned' },
  };
}

type Handler = (u: string) => Response | Promise<Response>;
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

/** fetch simulado: lista de archivos fija + un mapa mes → partidas (o una respuesta a medida). */
function mockApi(byMonth: Record<string, ChesscomGame[] | Handler> = {}) {
  const calls: { url: string; init?: RequestInit }[] = [];
  const fn = vi.fn(async (u: string, init?: RequestInit) => {
    calls.push({ url: u, init });
    if (u.endsWith('/games/archives')) return json({ archives: MONTHS.map(url) });
    const month = MONTHS.find((m) => url(m) === u)!;
    const v = byMonth[month] ?? [];
    return typeof v === 'function' ? v(u) : json({ games: v });
  });
  vi.stubGlobal('fetch', fn);
  return { calls, fn };
}

async function repertorio() {
  const g = await loadGraph('white', d);
  const plan = buildImportPlan('1. e4 e5 *', 'white', { mine: new Map(), nodeIds: new Set(g.nodes.keys()) }, new Map());
  await commitImport(plan, new Map(), new Map(), d);
}

const forceDues = async () => (await d.events.toArray()).filter((e) => e.kind === 'forceDue').length;
const loadedKeys = async () => Object.keys((await getSettings(d)).chesscomMonths ?? {}).sort();

beforeEach(async () => {
  d = new CavallDB(`sync-${n++}`);
  await ensureRoots(d);
  await setSettings({ chesscomUser: 'yo' }, d);
});
afterEach(() => vi.unstubAllGlobals());

describe('regla de 30 días', () => {
  it('shouldForceDue respeta el borde', () => {
    const now = 1_000 * DAY;
    expect(FORCE_DUE_WINDOW_MS).toBe(30 * DAY);
    expect(shouldForceDue(now - 30 * DAY, now)).toBe(true);
    expect(shouldForceDue(now - 30 * DAY - 1, now)).toBe(false);
  });

  it('una partida de hace 40 días con desvío no hace vencer la tarjeta; una de hace 10 sí', async () => {
    await repertorio();
    const now = Date.now();
    mockApi({ '2026-10': [game('vieja', now - 40 * DAY), game('reciente', now - 10 * DAY)] });
    const r = await syncChesscom(undefined, d);
    expect(r.imported).toBe(2);
    expect(r.deviations).toBe(1);
    expect(await forceDues()).toBe(1);
  });
});

describe('fetchMonth', () => {
  it('fetchMonth no manda encabezados', async () => {
    const { calls } = mockApi({ '2026-10': [game('a', Date.now())] });
    const games = await fetchMonth(url('2026-10'));
    expect(games).toHaveLength(1);
    expect(calls[0].init).toBeUndefined();
  });

  it('429 reintenta una vez y después falla con mensaje', async () => {
    let hits = 0;
    const { fn } = mockApi({ '2026-10': () => (++hits === 1 ? json({}, 429) : json({ games: [game('a', Date.now())] })) });
    expect(await fetchMonth(url('2026-10'), { retryDelayMs: 0 })).toHaveLength(1);
    expect(fn).toHaveBeenCalledTimes(2);

    const second = mockApi({ '2026-10': () => json({}, 429) });
    await expect(fetchMonth(url('2026-10'), { retryDelayMs: 0 })).rejects.toThrow('Chess.com pidió esperar un poco.');
    expect(second.fn).toHaveBeenCalledTimes(2);
  });
});

describe('olderArchives', () => {
  const archives = MONTHS.map(url);

  it('olderArchives devuelve los meses anteriores al más viejo cargado, de a count', () => {
    expect(olderArchives(archives, ['2026-09', '2026-10'], 2)).toEqual([url('2026-08'), url('2026-07')]);
    expect(olderArchives(archives, ['2026-07'], 'all')).toEqual([url('2026-06'), url('2026-05')]);
    expect(olderArchives(archives, ['2026-05'], 3)).toEqual([]);
  });

  it('sin meses cargados devuelve los últimos count', () => {
    expect(olderArchives(archives, [], 2)).toEqual([url('2026-10'), url('2026-09')]);
  });

  it('archivesToFetch usa el mes más nuevo visto aunque haya meses más viejos', () => {
    const seen = { [url('2026-07')]: '', [url('2026-09')]: '', [url('2026-10')]: '' };
    expect(archivesToFetch(archives, seen)).toEqual([url('2026-10')]);
  });
});

describe('loadOlderGames', () => {
  it('sin usuario avisa que hay que configurarlo', async () => {
    await setSettings({ chesscomUser: undefined }, d);
    await expect(loadOlderGames({ months: 2 }, d)).rejects.toThrow('Configurá tu usuario de Chess.com en Ajustes.');
  });

  it('loadOlderGames cancelado a mitad conserva los meses leídos y la segunda llamada sigue desde ahí', async () => {
    const now = Date.now();
    mockApi({
      '2026-10': [game('o', now)],
      '2026-09': [game('s', now)],
      '2026-08': [game('a', now)],
      '2026-07': [game('j', now)],
    });
    // Primero octubre, así hay un "más viejo cargado".
    await loadOlderGames({ months: 1 }, d);
    expect(await loadedKeys()).toEqual([url('2026-10')]);

    const ctl = new AbortController();
    const r1 = await loadOlderGames(
      { months: 3, signal: ctl.signal, onProgress: (msg) => msg.includes('2026-09') && ctl.abort() },
      d,
    );
    expect(r1.cancelled).toBe(true);
    expect(r1.imported).toBe(1);
    expect(await loadedKeys()).toEqual([url('2026-09'), url('2026-10')]);
    expect(r1.remaining).toBe(4);

    const { calls } = mockApi({ '2026-08': [game('a', now)], '2026-07': [game('j', now)] });
    const r2 = await loadOlderGames({ months: 2 }, d);
    expect(r2.cancelled).toBe(false);
    expect(calls.map((c) => c.url).filter((u) => !u.endsWith('archives'))).toEqual([url('2026-08'), url('2026-07')]);
    expect(r2.imported).toBe(2);
    expect(r2.remaining).toBe(2);
  });

  it('un mes que escribe otra carga a mitad de camino no se pierde', async () => {
    const now = Date.now();
    mockApi({
      '2026-10': [game('o', now)],
      '2026-09': [game('s', now)],
      // "otra carga" registra un mes viejo mientras esta lee agosto
      '2026-08': async () => {
        await setSettings({ chesscomMonths: { ...(await getSettings(d)).chesscomMonths, [url('2026-05')]: '' } }, d);
        return json({ games: [game('a', now)] });
      },
    });
    await loadOlderGames({ months: 3 }, d);
    expect(await loadedKeys()).toEqual([url('2026-05'), url('2026-08'), url('2026-09'), url('2026-10')]);
  });

  it('informa el final con done === total, también al cancelar', async () => {
    mockApi({ '2026-10': [game('o', Date.now())], '2026-09': [game('s', Date.now())] });
    const calls: [string, number, number][] = [];
    await loadOlderGames({ months: 2, onProgress: (m, a, b) => calls.push([m, a, b]) }, d);
    expect(calls.at(-1)).toEqual(['Listo.', 2, 2]);

    const ctl = new AbortController();
    ctl.abort();
    const c2: [string, number, number][] = [];
    await loadOlderGames({ months: 2, signal: ctl.signal, onProgress: (m, a, b) => c2.push([m, a, b]) }, d);
    expect(c2.at(-1)![1]).toBe(c2.at(-1)![2]);
  });

  it('si un mes falla, los anteriores quedan guardados y se informa el error', async () => {
    const now = Date.now();
    mockApi({ '2026-10': [game('o', now)], '2026-09': [game('s', now)], '2026-08': () => json({}, 500) });
    await expect(loadOlderGames({ months: 3 }, d)).rejects.toThrow('Chess.com respondió 500 para 2026-08.');
    expect(await loadedKeys()).toEqual([url('2026-09'), url('2026-10')]);
    expect(await d.games.count()).toBe(2);
  });
});
