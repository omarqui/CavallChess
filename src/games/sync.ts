import { db } from '../db/db';
import { forceDue, getSettings, loadGraph, recordGame, setSettings } from '../db/repo';
import type { GameRow, Side } from '../types';
import { analyzeGame } from './analyze';
import { archivesToFetch, fetchArchives, fetchMonth, archiveMonth } from './chesscom';

export interface SyncResult {
  imported: number;
  deviations: number;
  gaps: number;
}

const SYNC_EVERY_MS = 12 * 3600_000;

export async function shouldAutoSync(): Promise<boolean> {
  const s = await getSettings();
  return !!s.chesscomUser && (!s.lastChesscomSync || Date.now() - s.lastChesscomSync > SYNC_EVERY_MS);
}

/** Baja partidas nuevas de Chess.com, las cruza con el repertorio y registra desvíos y huecos. */
export async function syncChesscom(onProgress?: (msg: string) => void): Promise<SyncResult> {
  const settings = await getSettings();
  const user = settings.chesscomUser?.trim().toLowerCase();
  if (!user) throw new Error('Configurá tu usuario de Chess.com en Ajustes.');
  onProgress?.('Buscando archivos…');
  const archives = await fetchArchives(user);
  const months = { ...(settings.chesscomMonths ?? {}) };
  const toFetch = archivesToFetch(archives, settings.chesscomMonths);
  const graphs: Record<Side, Awaited<ReturnType<typeof loadGraph>>> = {
    white: await loadGraph('white'),
    black: await loadGraph('black'),
  };
  const result: SyncResult = { imported: 0, deviations: 0, gaps: 0 };

  for (const url of toFetch) {
    onProgress?.(`Leyendo ${archiveMonth(url)}…`);
    const { games, etag, notModified } = await fetchMonth(url, months[url]);
    if (etag) months[url] = etag;
    else months[url] = months[url] ?? '';
    if (notModified) continue;
    for (const g of games) {
      if (g.rules !== 'chess' || !g.pgn) continue;
      if (await db.games.get(g.url)) continue;
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
      if (outcome.kind === 'myDeviation') {
        await forceDue(outcome.cardId, 'game');
        result.deviations++;
      }
      if (gap) result.gaps++;
      await recordGame(row, gap && { ...gap, side: myColor });
      result.imported++;
    }
  }
  await setSettings({ chesscomMonths: months, lastChesscomSync: Date.now() });
  return result;
}
