import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CavallDB } from '../db/db';
import { buildImportPlan, existingOf } from '../chess/pgnImport';
import { commitImport, createRepertoire, deleteRepertoire, ensureRoots, getSettings, loadGraph, setSettings } from '../db/repo';
import { archivesToFetch, fetchArchives, fetchMonth, olderArchives } from './chesscom';
import type { ChesscomGame } from './chesscom';
import { recalcGames } from './store';
import { FORCE_DUE_WINDOW_MS, loadOlderGames, markMonth, shouldForceDue, syncChesscom } from './sync';

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

type Handler = (u: string, init?: RequestInit) => Response | Promise<Response>;
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
const abortError = () => new DOMException('This operation was aborted', 'AbortError');

/**
 * fetch simulado: lista de archivos fija + un mapa mes → partidas (o una respuesta a medida). Como el real,
 * rechaza con AbortError si la señal está cancelada al pedir o al terminar la respuesta a medida.
 */
function mockApi(byMonth: Record<string, ChesscomGame[] | Handler> = {}) {
  const calls: { url: string; init?: RequestInit }[] = [];
  const fn = vi.fn(async (u: string, init?: RequestInit) => {
    calls.push({ url: u, init });
    if (init?.signal?.aborted) throw abortError();
    if (u.endsWith('/games/archives')) return json({ archives: MONTHS.map(url) });
    const month = MONTHS.find((m) => url(m) === u)!;
    const v = byMonth[month] ?? [];
    const res = typeof v === 'function' ? await v(u, init) : json({ games: v });
    if (init?.signal?.aborted) throw abortError();
    return res;
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
/** Lo mismo que hace Ajustes al cambiar el usuario. */
const cambiarUsuario = (u: string) => setSettings({ chesscomUser: u, chesscomMonths: undefined, lastChesscomSync: undefined }, d);
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

describe('cambio de usuario', () => {
  it('si cambiás de usuario a mitad de la sincronización, se corta y no marca la nueva cuenta como sincronizada', async () => {
    const now = Date.now();
    const { calls } = mockApi({
      '2026-08': [game('a', now)],
      '2026-09': async () => {
        await cambiarUsuario('otro');
        return json({ games: [game('s', now)] });
      },
      '2026-10': [game('o', now)],
    });
    const r = await syncChesscom(undefined, d);
    expect(r.imported).toBe(1);
    expect(calls.map((c) => c.url)).not.toContain(url('2026-10'));
    const s = await getSettings(d);
    expect(s.chesscomMonths ?? {}).toEqual({});
    expect(s.lastChesscomSync).toBeUndefined();
  });

  it('markMonth registra el mes solo si el usuario sigue siendo el mismo', async () => {
    await setSettings({ chesscomUser: ' Yo ' }, d);
    expect(await markMonth(url('2026-10'), 'yo', d)).toBe(true);
    expect(await loadedKeys()).toEqual([url('2026-10')]);
    await cambiarUsuario('otro');
    expect(await markMonth(url('2026-09'), 'yo', d)).toBe(false);
    expect((await getSettings(d)).chesscomMonths).toBeUndefined();
  });
});

describe('fetchMonth', () => {
  it('fetchMonth no manda encabezados (solo la señal, que no agrega ninguno)', async () => {
    const { calls } = mockApi({ '2026-10': [game('a', Date.now())] });
    const ctl = new AbortController();
    const games = await fetchMonth(url('2026-10'), { signal: ctl.signal });
    expect(games).toHaveLength(1);
    expect(calls[0].init?.headers).toBeUndefined();
    expect(calls[0].init?.signal).toBe(ctl.signal);
    await fetchMonth(url('2026-10'));
    expect(calls[1].init?.headers).toBeUndefined();
  });

  it('la espera por un 429 se puede cancelar', async () => {
    const { fn } = mockApi({ '2026-10': () => json({}, 429) });
    const ctl = new AbortController();
    const pedido = fetchMonth(url('2026-10'), { retryDelayMs: 60_000, signal: ctl.signal });
    await new Promise((r) => setTimeout(r, 10));
    ctl.abort();
    await expect(pedido).rejects.toMatchObject({ name: 'AbortError' });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('sin conexión avisa con un mensaje claro', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new TypeError('Failed to fetch'))));
    const msg = 'No se pudo conectar con Chess.com. Revisá tu conexión.';
    await expect(fetchArchives('yo')).rejects.toThrow(msg);
    await expect(fetchMonth(url('2026-10'))).rejects.toThrow(msg);
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
  const record = (...months: string[]) => Object.fromEntries(months.map((m) => [url(m), '']));
  const otro = (m: string) => url(m).replace('/yo/', '/otro/');

  it('olderArchives devuelve los meses anteriores al más viejo cargado, de a count', () => {
    expect(olderArchives(archives, record('2026-09', '2026-10'), 'yo', 2)).toEqual([url('2026-08'), url('2026-07')]);
    expect(olderArchives(archives, record('2026-07'), 'yo', 'all')).toEqual([url('2026-06'), url('2026-05')]);
    expect(olderArchives(archives, record('2026-05'), 'yo', 3)).toEqual([]);
  });

  it('sin meses cargados devuelve los últimos count', () => {
    expect(olderArchives(archives, {}, 'yo', 2)).toEqual([url('2026-10'), url('2026-09')]);
    expect(olderArchives(archives, undefined, 'yo', 2)).toEqual([url('2026-10'), url('2026-09')]);
  });

  it('olderArchives completa los huecos: los meses sin leer anteriores al más nuevo cargado', () => {
    const seen = record('2026-05', '2026-08', '2026-10');
    expect(olderArchives(archives, seen, 'yo', 'all')).toEqual([url('2026-09'), url('2026-07'), url('2026-06')]);
    expect(olderArchives(archives, seen, 'yo', 2)).toEqual([url('2026-09'), url('2026-07')]);
  });

  it('olderArchives y archivesToFetch ignoran los meses de otra cuenta y no distinguen mayúsculas', () => {
    const ajenos = { [otro('2026-09')]: '', [otro('2026-10')]: '' };
    expect(olderArchives(archives, ajenos, 'yo', 2)).toEqual([url('2026-10'), url('2026-09')]);
    expect(archivesToFetch(archives, ajenos, 'yo')).toEqual(archives.slice(-3));
    const mayusculas = { [url('2026-09').replace('/yo/', '/Yo/')]: '' };
    expect(olderArchives(archives, mayusculas, 'yo', 1)).toEqual([url('2026-08')]);
    expect(archivesToFetch(archives, mayusculas, 'yo')).toEqual([url('2026-09'), url('2026-10')]);
  });

  it('archivesToFetch usa el mes más nuevo visto aunque haya meses más viejos', () => {
    expect(archivesToFetch(archives, record('2026-07', '2026-09', '2026-10'), 'yo')).toEqual([url('2026-10')]);
  });
});

describe('de a una', () => {
  const lento = (games: ChesscomGame[]) => async () => {
    for (let i = 0; i < 3; i++) await new Promise((r) => setTimeout(r, 0));
    return json({ games });
  };

  it('la sincronización y la carga hacia atrás pedidas a la vez no se intercalan', async () => {
    const now = Date.now();
    const { calls } = mockApi({
      '2026-07': lento([game('j', now)]),
      '2026-08': lento([game('a', now)]),
      '2026-09': lento([game('s', now)]),
      '2026-10': lento([game('o', now)]),
    });
    await Promise.all([syncChesscom(undefined, d), loadOlderGames({ months: 1 }, d)]);
    // La carga empieza recién cuando la sincronización registró sus tres meses: sigue con julio.
    expect(calls.map((c) => c.url.split('/games/')[1])).toEqual(['archives', '2026/08', '2026/09', '2026/10', 'archives', '2026/07']);
  });

  it('onStart avisa recién cuando la carga encolada toma el candado', async () => {
    const now = Date.now();
    const log: string[] = [];
    mockApi({
      '2026-08': async () => (log.push('lee 08'), lento([game('a', now)])()),
      '2026-09': async () => (log.push('lee 09'), lento([game('s', now)])()),
      '2026-10': async () => (log.push('lee 10'), lento([game('o', now)])()),
    });
    const ctl = new AbortController();
    const sync = syncChesscom(undefined, d);
    const carga = loadOlderGames({ months: 1, signal: ctl.signal, onStart: () => log.push('empieza') }, d);
    ctl.abort(); // cancelada mientras espera: la UI ya la soltó; al tomar el candado vuelve sin pedir nada
    await sync;
    expect(await carga).toMatchObject({ cancelled: true, imported: 0 });
    expect(log).toEqual(['lee 08', 'lee 09', 'lee 10', 'empieza']);
  });

  it('el recálculo espera a que termine la sincronización', async () => {
    const now = Date.now();
    const log: string[] = [];
    mockApi({
      '2026-08': async () => (log.push('lee 08'), lento([game('a', now)])()),
      '2026-09': async () => (log.push('lee 09'), lento([game('s', now)])()),
      '2026-10': async () => (log.push('lee 10'), lento([game('o', now)])()),
    });
    await d.games.put({
      id: 'previa',
      endTime: 1,
      myColor: 'white',
      opponent: 'x',
      timeClass: 'blitz',
      result: 'win',
      outcome: { kind: 'noBook' },
      pgn: '1. d4 d5 *',
    });
    await Promise.all([syncChesscom(undefined, d), recalcGames(() => log.push('recalcula'), d)]);
    expect(log).toEqual(['lee 08', 'lee 09', 'lee 10', 'recalcula']);
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

    // Se cancela al empezar agosto: septiembre ya quedó leído, agosto no.
    const ctl = new AbortController();
    const r1 = await loadOlderGames(
      { months: 3, signal: ctl.signal, onProgress: (msg) => msg.includes('2026-08') && ctl.abort() },
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

  it('un mes que escribe otra pestaña a mitad de camino no se pierde, y los huecos se completan después', async () => {
    const now = Date.now();
    mockApi({
      '2026-10': [game('o', now)],
      '2026-09': [game('s', now)],
      // otra pestaña registra un mes viejo mientras esta lee agosto
      '2026-08': async () => {
        await setSettings({ chesscomMonths: { ...(await getSettings(d)).chesscomMonths, [url('2026-05')]: '' } }, d);
        return json({ games: [game('a', now)] });
      },
    });
    const r1 = await loadOlderGames({ months: 3 }, d);
    expect(await loadedKeys()).toEqual([url('2026-05'), url('2026-08'), url('2026-09'), url('2026-10')]);
    // Junio y julio quedaron en el medio: siguen pendientes y la próxima carga los lee.
    expect(r1.remaining).toBe(2);
    const { calls } = mockApi({ '2026-07': [game('j', now)], '2026-06': [game('u', now)] });
    const r2 = await loadOlderGames({ months: 'all' }, d);
    expect(calls.map((c) => c.url).filter((u) => !u.endsWith('archives'))).toEqual([url('2026-07'), url('2026-06')]);
    expect(r2).toMatchObject({ imported: 2, remaining: 0, cancelled: false });
    expect(await loadedKeys()).toEqual(MONTHS.map(url));
  });

  it('si cambiás de usuario mientras se lee un mes, nada de la cuenta vieja queda en la nueva y la carga se corta', async () => {
    const now = Date.now();
    const { calls } = mockApi({
      '2026-10': [game('o', now)],
      '2026-09': async () => {
        await cambiarUsuario('otro');
        return json({ games: [game('s', now)] });
      },
      '2026-08': [game('a', now)],
    });
    const r = await loadOlderGames({ months: 3 }, d);
    expect(r.cancelled).toBe(true);
    expect(r.imported).toBe(1);
    // Los meses que le quedaban a la cuenta vieja no le dicen nada a la nueva.
    expect(r.remaining).toBe(0);
    expect(calls.map((c) => c.url)).not.toContain(url('2026-08'));
    const s = await getSettings(d);
    expect(s.chesscomUser).toBe('otro');
    expect(s.chesscomMonths ?? {}).toEqual({});
    expect(await d.games.get(game('s', now).url)).toBeUndefined();
  });

  it('una carga cancelada mientras espera el candado no pide nada a la red ni falla sin conexión', async () => {
    const now = Date.now();
    const { calls } = mockApi({
      '2026-08': [game('a', now)],
      '2026-09': [game('s', now)],
      '2026-10': [game('o', now)],
    });
    const ctl = new AbortController();
    const progreso: [string, number, number][] = [];
    const sync = syncChesscom(undefined, d);
    const carga = loadOlderGames({ months: 2, signal: ctl.signal, onProgress: (m, a, b) => progreso.push([m, a, b]) }, d);
    ctl.abort(); // la carga todavía espera a que termine la sincronización
    await sync;
    // Ya sin conexión: no tiene que llegar a pedir nada.
    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new TypeError('Failed to fetch'))));
    expect(await carga).toMatchObject({ cancelled: true, imported: 0, remaining: 0 });
    expect(calls.filter((c) => c.url.endsWith('archives'))).toHaveLength(1);
    expect(progreso).toEqual([['Cancelado.', 0, 0]]);
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

  it('si se corta la conexión a mitad, avisa con un mensaje claro y los meses anteriores quedan guardados', async () => {
    const now = Date.now();
    mockApi({
      '2026-10': [game('o', now)],
      '2026-09': [game('s', now)],
      '2026-08': () => Promise.reject(new TypeError('Load failed')),
    });
    await expect(loadOlderGames({ months: 3 }, d)).rejects.toThrow('No se pudo conectar con Chess.com. Revisá tu conexión.');
    expect(await loadedKeys()).toEqual([url('2026-09'), url('2026-10')]);
    expect(await d.games.count()).toBe(2);
  });

  it('cancelar mientras se descarga un mes no lanza: devuelve cancelado y el mes no queda registrado', async () => {
    const now = Date.now();
    const ctl = new AbortController();
    mockApi({
      '2026-10': [game('o', now)],
      // La cancelación llega con el pedido en vuelo: el fetch real rechaza con AbortError.
      '2026-09': () => (ctl.abort(), json({ games: [game('s', now)] })),
    });
    await loadOlderGames({ months: 1 }, d);
    const r = await loadOlderGames({ months: 2, signal: ctl.signal }, d);
    expect(r).toMatchObject({ cancelled: true, imported: 0 });
    expect(await loadedKeys()).toEqual([url('2026-10')]);
    expect(r.remaining).toBe(5);
  });

  it('cancelar entre partidas de un mes corta ahí, no registra el mes y la próxima carga lo relee sin duplicar', async () => {
    const now = Date.now();
    const sept = [game('s1', now), game('s2', now), game('s3', now)];
    mockApi({ '2026-10': [game('o', now)], '2026-09': sept });
    await loadOlderGames({ months: 1 }, d);

    const ctl = new AbortController();
    const corta = () => ctl.abort(); // al guardar la primera partida de septiembre
    d.games.hook('creating', corta);
    const r1 = await loadOlderGames({ months: 1, signal: ctl.signal }, d);
    d.games.hook('creating').unsubscribe(corta);
    expect(r1).toMatchObject({ cancelled: true, imported: 1 });
    expect(await loadedKeys()).toEqual([url('2026-10')]);

    const r2 = await loadOlderGames({ months: 1 }, d);
    expect(r2).toMatchObject({ cancelled: false, imported: 2 });
    expect(await loadedKeys()).toEqual([url('2026-09'), url('2026-10')]);
    expect(await d.games.count()).toBe(4);
  });

  it('una partida vieja (más de 30 días) con desvío no hace vencer la tarjeta', async () => {
    await repertorio();
    const now = Date.now();
    mockApi({ '2026-10': [game('vieja', now - 40 * DAY)], '2026-09': [game('reciente', now - 10 * DAY)] });
    const r = await loadOlderGames({ months: 'all' }, d);
    expect(r.imported).toBe(2);
    expect(r.deviations).toBe(1);
    const eventos = (await d.events.toArray()).filter((e) => e.kind === 'forceDue');
    expect(eventos).toHaveLength(1);
    const vieja = await d.games.get(game('vieja', 0).url);
    expect(vieja?.outcome.kind).toBe('myDeviation');
  });

  it('cada mes se busca en la base de una sola vez, no partida por partida', async () => {
    const d2 = new CavallDB(`sync-${n++}`);
    const gets = { uno: 0, varios: 0 };
    d2.use({
      stack: 'dbcore',
      name: 'contador',
      create: (down) => ({
        ...down,
        table: (name) => {
          const t = down.table(name);
          if (name !== 'games') return t;
          return {
            ...t,
            get: (req) => (gets.uno++, t.get(req)),
            getMany: (req) => (gets.varios++, t.getMany(req)),
          };
        },
      }),
    });
    await ensureRoots(d2);
    await setSettings({ chesscomUser: 'yo' }, d2);
    const now = Date.now();
    mockApi({ '2026-10': Array.from({ length: 20 }, (_, i) => game(`o${i}`, now)) });
    expect((await syncChesscom(undefined, d2)).imported).toBe(20);
    gets.uno = 0;
    gets.varios = 0;
    // Octubre es el mes más nuevo: se relee y todas sus partidas ya están.
    expect((await syncChesscom(undefined, d2)).imported).toBe(0);
    expect(gets).toEqual({ uno: 0, varios: 1 });
  });
});

describe('varios repertorios del mismo color', () => {
  async function importarEn(rep: string, pgn: string) {
    const g = await loadGraph(rep, d);
    const plan = buildImportPlan(pgn, 'white', existingOf(g), new Map());
    await commitImport(plan, new Map(), new Map(), d);
  }

  it('cada partida se cruza con el repertorio que la cubre: el desvío y el hueco son de ese', async () => {
    await repertorio(); // Principal: 1. e4 e5
    const londres = await createRepertoire('white', 'Londres', d);
    await importarEn(londres.id, '1. d4 d5 2. Bf4 *');
    const now = Date.now();
    mockApi({
      '2026-10': [
        game('desvio', now - DAY, '1. d4 d5 2. Nf3 *'),
        game('hueco', now - DAY, '1. d4 Nf6 *'),
        game('italiana', now - DAY, '1. e4 e5 *'),
      ],
    });
    const r = await syncChesscom(undefined, d);
    expect(r).toMatchObject({ imported: 3, deviations: 1, gaps: 1 });
    const byId = new Map((await d.games.toArray()).map((g) => [g.id.split('/').pop(), g]));
    expect(byId.get('desvio')?.rep).toBe(londres.id);
    expect(byId.get('hueco')?.rep).toBe(londres.id);
    expect(byId.get('italiana')?.rep).toBe('white');
    const [ev] = (await d.events.toArray()).filter((e) => e.kind === 'forceDue');
    expect(ev.cardId.startsWith(`${londres.id}|`)).toBe(true);
    expect((await d.gaps.toArray()).map((g) => g.id.startsWith(`${londres.id}|`))).toEqual([true]);
  });

  it('al borrar un repertorio, recalcular vuelve a cruzar sus partidas con los que quedan', async () => {
    await repertorio();
    const londres = await createRepertoire('white', 'Londres', d);
    await importarEn(londres.id, '1. d4 d5 2. Bf4 *');
    mockApi({ '2026-10': [game('hueco', Date.now() - DAY, '1. d4 Nf6 *')] });
    await syncChesscom(undefined, d);
    await deleteRepertoire(londres.id, d);
    await recalcGames(undefined, d);
    const [row] = await d.games.toArray();
    expect(row.rep).toBe('white');
    expect(row.outcome).toMatchObject({ kind: 'myDeviation', ply: 0 });
    expect(await d.gaps.count()).toBe(0);
  });
});
