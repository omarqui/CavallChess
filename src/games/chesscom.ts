/** Cliente mínimo de la Published-Data API de Chess.com (permite CORS; pedidos secuenciales). */

export interface ChesscomGame {
  url: string;
  pgn?: string;
  time_class: string;
  rules: string;
  end_time: number;
  white: { username: string; result: string };
  black: { username: string; result: string };
}

const BASE = 'https://api.chess.com/pub/player';

export async function fetchArchives(username: string): Promise<string[]> {
  const res = await fetch(`${BASE}/${encodeURIComponent(username.toLowerCase())}/games/archives`);
  if (res.status === 404) throw new Error(`Chess.com no conoce al usuario “${username}”.`);
  if (!res.ok) throw new Error(`Chess.com respondió ${res.status}.`);
  const json = (await res.json()) as { archives: string[] };
  return json.archives; // ascendente
}

/** Mes de un archivo: ".../games/2026/10" → "2026-10". */
export const archiveMonth = (url: string) => url.split('/games/')[1]?.replace('/', '-') ?? '';

/** Archivos a pedir: los últimos `months` la primera vez; después, desde el último mes visto. */
export function archivesToFetch(archives: string[], seen: Record<string, string> | undefined, months = 3): string[] {
  if (!seen || !Object.keys(seen).length) return archives.slice(-months);
  const lastSeen = Object.keys(seen).map(archiveMonth).sort().at(-1)!;
  return archives.filter((u) => archiveMonth(u) >= lastSeen);
}

export async function fetchMonth(
  url: string,
  etag?: string,
): Promise<{ games: ChesscomGame[]; etag?: string; notModified: boolean }> {
  const res = await fetch(url, { headers: etag ? { 'If-None-Match': etag } : {} });
  if (res.status === 304) return { games: [], etag, notModified: true };
  if (res.status === 429) throw new Error('Chess.com pidió esperar un poco.');
  if (!res.ok) throw new Error(`Chess.com respondió ${res.status} para ${archiveMonth(url)}.`);
  const json = (await res.json()) as { games: ChesscomGame[] };
  return { games: json.games ?? [], etag: res.headers.get('ETag') ?? undefined, notModified: false };
}
