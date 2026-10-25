import { db, type CavallDB } from '../db/db';
import { forceDue, getSettings, loadGraph, recordGame, setSettings } from '../db/repo';
import type { GameRow, Side } from '../types';
import { analyzeGame } from './analyze';
import { archiveMonth, archivesToFetch, fetchArchives, fetchMonth, olderArchives, type ChesscomGame } from './chesscom';

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

type Graphs = Record<Side, Awaited<ReturnType<typeof loadGraph>>>;

async function loadGraphs(d: CavallDB): Promise<Graphs> {
  return { white: await loadGraph('white', d), black: await loadGraph('black', d) };
}

async function userOf(d: CavallDB) {
  const settings = await getSettings(d);
  const user = settings.chesscomUser?.trim().toLowerCase();
  if (!user) throw new Error('Configurá tu usuario de Chess.com en Ajustes.');
  return { settings, user };
}

/** Registra un mes como leído, mezclando con lo que haya guardado ahora (otra carga puede estar corriendo). */
async function markMonth(url: string, d: CavallDB) {
  const current = (await getSettings(d)).chesscomMonths ?? {};
  await setSettings({ chesscomMonths: { ...current, [url]: '' } }, d);
}

/** Procesa las partidas de un mes: las analiza, registra desvíos (recientes) y huecos, y guarda cada una. */
async function processMonth(games: ChesscomGame[], user: string, graphs: Graphs, result: SyncResult, d: CavallDB) {
  const now = Date.now();
  for (const g of games) {
    if (g.rules !== 'chess' || !g.pgn) continue;
    if (await d.games.get(g.url)) continue;
    const myColor: Side | null =
      g.white.username.toLowerCase() === user ? 'white' : g.black.username.toLowerCase() === user ? 'black' : null;
    if (!myColor) continue;
    const { outcome, gap } = analyzeGame(g.pgn, graphs[myColor]);
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
    };
    if (outcome.kind === 'myDeviation' && shouldForceDue(row.endTime, now)) {
      await forceDue(outcome.cardId, 'game', d);
      result.deviations++;
    }
    if (gap) result.gaps++;
    await recordGame(row, gap && { ...gap, side: myColor }, d);
    result.imported++;
  }
}

/** Baja partidas nuevas de Chess.com, las cruza con el repertorio y registra desvíos y huecos. */
export async function syncChesscom(onProgress?: (msg: string) => void, d: CavallDB = db): Promise<SyncResult> {
  const { settings, user } = await userOf(d);
  onProgress?.('Buscando archivos…');
  const archives = await fetchArchives(user);
  const toFetch = archivesToFetch(archives, settings.chesscomMonths);
  const graphs = await loadGraphs(d);
  const result: SyncResult = { imported: 0, deviations: 0, gaps: 0 };

  for (const url of toFetch) {
    onProgress?.(`Leyendo ${archiveMonth(url)}…`);
    await processMonth(await fetchMonth(url), user, graphs, result, d);
    await markMonth(url, d); // si el mes siguiente falla, este ya quedó leído
  }
  await setSettings({ lastChesscomSync: Date.now() }, d);
  return result;
}

/**
 * Carga hacia atrás: los `months` meses anteriores al más viejo ya cargado. Cada mes queda registrado apenas
 * se procesa, así una cancelación (se mira entre mes y mes) o un error conservan lo leído y la próxima
 * llamada sigue desde ahí. Un error de red o un 429 se lanza con su mensaje.
 */
export async function loadOlderGames(
  opts: { months: number | 'all'; signal?: AbortSignal; onProgress?: (msg: string, done: number, total: number) => void },
  d: CavallDB = db,
): Promise<SyncResult & { remaining: number; cancelled: boolean }> {
  const { settings, user } = await userOf(d);
  opts.onProgress?.('Buscando archivos…', 0, 0);
  const archives = await fetchArchives(user);
  const toFetch = olderArchives(archives, Object.keys(settings.chesscomMonths ?? {}), opts.months);
  const graphs = await loadGraphs(d);
  const result: SyncResult = { imported: 0, deviations: 0, gaps: 0 };
  let cancelled = false;

  for (const [i, url] of toFetch.entries()) {
    if (opts.signal?.aborted) {
      cancelled = true;
      break;
    }
    opts.onProgress?.(`Leyendo ${archiveMonth(url)}…`, i, toFetch.length);
    await processMonth(await fetchMonth(url), user, graphs, result, d);
    await markMonth(url, d);
  }
  const loaded = Object.keys((await getSettings(d)).chesscomMonths ?? {});
  opts.onProgress?.(cancelled ? 'Cancelado.' : 'Listo.', toFetch.length, toFetch.length);
  const remaining = olderArchives(archives, loaded, 'all').length;
  return { ...result, remaining, cancelled };
}
