import { db, type CavallDB } from '../db/db';
import { forceDue, getSettings, loadAllGraphs, recordGame, setSettings, type AllGraphs } from '../db/repo';
import type { GameRow, Settings, Side } from '../types';
import { analyzeBest } from './best';
import {
  archiveMonth,
  archivesToFetch,
  fetchArchives,
  fetchMonth,
  isAbortError,
  olderArchives,
  type ChesscomGame,
} from './chesscom';
import { runExclusive } from './lock';

export interface SyncResult {
  imported: number;
  /** Solo los desvíos que hicieron vencer la tarjeta (partidas de hace 30 días o menos). */
  deviations: number;
  gaps: number;
}

/** Un desvío propio solo hace vencer la tarjeta si la partida terminó hace 30 días o menos. */
export const FORCE_DUE_WINDOW_MS = 30 * 86_400_000;
export const shouldForceDue = (endTimeMs: number, now: number) => now - endTimeMs <= FORCE_DUE_WINDOW_MS;

const SYNC_EVERY_MS = 12 * 3600_000;

export async function shouldAutoSync(): Promise<boolean> {
  const s = await getSettings();
  return !!s.chesscomUser && (!s.lastChesscomSync || Date.now() - s.lastChesscomSync > SYNC_EVERY_MS);
}

type Graphs = AllGraphs;
const loadGraphs = loadAllGraphs;

const normalizeUser = (u: string | undefined) => u?.trim().toLowerCase() || undefined;

async function userOf(d: CavallDB) {
  const settings = await getSettings(d);
  const user = normalizeUser(settings.chesscomUser);
  if (!user) throw new Error('Configurá tu usuario de Chess.com en Ajustes.');
  return { settings, user };
}

const isUser = async (user: string, d: CavallDB) => normalizeUser((await getSettings(d)).chesscomUser) === user;

/**
 * Escribe en los ajustes solo si el usuario de Chess.com sigue siendo `user` (lo lee y escribe en la misma
 * transacción). Si en Ajustes lo cambiaste mientras tanto, no toca nada y devuelve `false`.
 */
function writeIfUser(user: string, d: CavallDB, patch: (s: Settings) => Partial<Settings>): Promise<boolean> {
  return d.transaction('rw', d.kv, async () => {
    const s = await getSettings(d);
    if (normalizeUser(s.chesscomUser) !== user) return false;
    await setSettings(patch(s), d);
    return true;
  });
}

/**
 * Registra un mes de `user` como leído, mezclando con lo que haya guardado ahora. Devuelve `false` (y no
 * registra nada) si el usuario cambió: así no se mezclan los meses de la cuenta vieja con los de la nueva.
 */
export const markMonth = (url: string, user: string, d: CavallDB = db) =>
  writeIfUser(user, d, (s) => ({ chesscomMonths: { ...s.chesscomMonths, [url]: '' } }));

/**
 * Procesa las partidas de un mes: las analiza, registra desvíos (recientes) y huecos, y guarda cada una.
 * Las que ya están se buscan de una sola vez. Devuelve `false` si se canceló entre partidas: lo guardado
 * queda, pero el mes no está completo (se relee la próxima vez y las repetidas se saltean).
 */
async function processMonth(
  games: ChesscomGame[],
  user: string,
  graphs: Graphs,
  result: SyncResult,
  d: CavallDB,
  signal?: AbortSignal,
): Promise<boolean> {
  const now = Date.now();
  const chess = games.filter((g): g is ChesscomGame & { pgn: string } => g.rules === 'chess' && !!g.pgn);
  const known = new Set((await d.games.bulkGet(chess.map((g) => g.url))).flatMap((r) => (r ? [r.id] : [])));
  for (const g of chess) {
    if (signal?.aborted) return false;
    if (known.has(g.url)) continue;
    known.add(g.url); // por si el mes trae la misma partida dos veces
    const myColor: Side | null =
      g.white.username.toLowerCase() === user ? 'white' : g.black.username.toLowerCase() === user ? 'black' : null;
    if (!myColor) continue;
    const { outcome, gap, rep } = analyzeBest(g.pgn, graphs[myColor].graphs, graphs[myColor].active);
    const me = myColor === 'white' ? g.white : g.black;
    const opp = myColor === 'white' ? g.black : g.white;
    const row: GameRow = {
      id: g.url,
      endTime: g.end_time * 1000,
      myColor,
      opponent: opp.username,
      timeClass: g.time_class,
      result: me.result,
      outcome,
      pgn: g.pgn,
      rep,
    };
    if (outcome.kind === 'myDeviation' && shouldForceDue(row.endTime, now)) {
      await forceDue(outcome.cardId, 'game', d);
      result.deviations++;
    }
    if (gap) result.gaps++;
    await recordGame(row, gap && { ...gap, side: myColor }, d);
    result.imported++;
  }
  return true;
}

/**
 * Lee un mes, procesa sus partidas y lo registra. Devuelve `false` si hay que cortar sin registrarlo: el
 * usuario de Chess.com cambió mientras tanto (si fue durante la descarga, el mes ni se procesa) o se canceló
 * entre partidas. Una cancelación durante la descarga o la espera por un 429 rechaza con AbortError.
 */
async function readMonth(
  url: string,
  user: string,
  graphs: Graphs,
  result: SyncResult,
  d: CavallDB,
  signal?: AbortSignal,
): Promise<boolean> {
  const games = await fetchMonth(url, { signal });
  if (!(await isUser(user, d))) return false;
  if (!(await processMonth(games, user, graphs, result, d, signal))) return false;
  return markMonth(url, user, d); // si el mes siguiente falla, este ya quedó leído
}

/**
 * Baja partidas nuevas de Chess.com, las cruza con el repertorio y registra desvíos y huecos. Si cambiás de
 * usuario a mitad de camino, se corta y devuelve lo que llevaba, sin marcar la nueva cuenta como sincronizada.
 */
export function syncChesscom(onProgress?: (msg: string) => void, d: CavallDB = db): Promise<SyncResult> {
  return runExclusive(() => sync(onProgress, d));
}

async function sync(onProgress: ((msg: string) => void) | undefined, d: CavallDB): Promise<SyncResult> {
  const { settings, user } = await userOf(d);
  onProgress?.('Buscando archivos…');
  const archives = await fetchArchives(user);
  const toFetch = archivesToFetch(archives, settings.chesscomMonths, user);
  const graphs = await loadGraphs(d);
  const result: SyncResult = { imported: 0, deviations: 0, gaps: 0 };

  for (const url of toFetch) {
    onProgress?.(`Leyendo ${archiveMonth(url)}…`);
    if (!(await readMonth(url, user, graphs, result, d))) return result;
  }
  await writeIfUser(user, d, () => ({ lastChesscomSync: Date.now() }));
  return result;
}

/**
 * Carga hacia atrás: hasta `months` meses sin leer anteriores al más nuevo ya cargado (primero los huecos más
 * recientes). Cada mes queda registrado apenas se procesa entero, así una cancelación o un error conservan lo
 * leído y la próxima llamada sigue desde ahí. Cancelar (también a mitad de un mes) o cambiar de usuario corta
 * la carga y devuelve `cancelled: true` sin lanzar; un error de red o un 429 se lanza con su mensaje.
 */
export function loadOlderGames(opts: LoadOlderOptions, d: CavallDB = db): Promise<LoadOlderResult> {
  return runExclusive(() => loadOlder(opts, d));
}

export interface LoadOlderOptions {
  months: number | 'all';
  signal?: AbortSignal;
  onProgress?: (msg: string, done: number, total: number) => void;
  /** Se llama apenas la carga toma el candado (antes de eso, la UI puede soltarla sin esperar). */
  onStart?: () => void;
}

export type LoadOlderResult = SyncResult & { remaining: number; cancelled: boolean };

async function loadOlder(opts: LoadOlderOptions, d: CavallDB): Promise<LoadOlderResult> {
  const { signal } = opts;
  opts.onStart?.();
  const result: SyncResult = { imported: 0, deviations: 0, gaps: 0 };
  // Cancelada mientras esperaba el candado: no se pide nada (ni falla sin conexión). Sin archivos no se sabe
  // cuántos meses quedan; la UI no lo muestra al cancelar.
  if (signal?.aborted) {
    opts.onProgress?.('Cancelado.', 0, 0);
    return { ...result, remaining: 0, cancelled: true };
  }
  const { settings, user } = await userOf(d);
  opts.onProgress?.('Buscando archivos…', 0, 0);
  const archives = await fetchArchives(user);
  const toFetch = olderArchives(archives, settings.chesscomMonths, user, opts.months);
  const graphs = await loadGraphs(d);
  let cancelled = false;

  for (const [i, url] of toFetch.entries()) {
    if (signal?.aborted) {
      cancelled = true;
      break;
    }
    opts.onProgress?.(`Leyendo ${archiveMonth(url)}…`, i, toFetch.length);
    try {
      if (!(await readMonth(url, user, graphs, result, d, signal))) {
        cancelled = true;
        break;
      }
    } catch (e) {
      if (!isAbortError(e) && !signal?.aborted) throw e;
      cancelled = true;
      break;
    }
  }
  const after = await getSettings(d);
  opts.onProgress?.(cancelled ? 'Cancelado.' : 'Listo.', toFetch.length, toFetch.length);
  // Si cambiaste de usuario, los meses que le quedaban a la cuenta vieja no le dicen nada a la nueva.
  const remaining =
    normalizeUser(after.chesscomUser) === user ? olderArchives(archives, after.chesscomMonths, user, 'all').length : 0;
  return { ...result, remaining, cancelled };
}
