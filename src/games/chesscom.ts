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

/** Una cancelación (de `fetch` o de la espera por un 429). No es un error: la carga devuelve `cancelled`. */
export const isAbortError = (e: unknown) => (e as { name?: unknown } | null)?.name === 'AbortError';

const abortError = () => new DOMException('Cancelado.', 'AbortError');

const SIN_CONEXION = 'No se pudo conectar con Chess.com. Revisá tu conexión.';

/**
 * Corre un pedido (o la lectura de su cuerpo) y, si falla la red (`TypeError`: "Failed to fetch" en Chrome,
 * "Load failed" en Safari), lanza un mensaje claro. Una cancelación pasa tal cual.
 */
async function conectando<T>(op: () => Promise<T>, signal?: AbortSignal): Promise<T> {
  try {
    return await op();
  } catch (e) {
    if (e instanceof TypeError && !signal?.aborted) throw new Error(SIN_CONEXION);
    throw e;
  }
}

export async function fetchArchives(username: string): Promise<string[]> {
  const res = await conectando(() => fetch(`${BASE}/${encodeURIComponent(username.toLowerCase())}/games/archives`));
  if (res.status === 404) throw new Error(`Chess.com no conoce al usuario “${username}”.`);
  if (!res.ok) throw new Error(`Chess.com respondió ${res.status}.`);
  const json = await conectando(() => res.json() as Promise<{ archives: string[] }>);
  return json.archives; // ascendente
}

/** Mes de un archivo: ".../games/2026/10" → "2026-10". */
export const archiveMonth = (url: string) => url.split('/games/')[1]?.replace('/', '-') ?? '';

/**
 * Meses ya leídos de `user` (ordenados), según el registro de archivos. Las claves de otra cuenta no cuentan:
 * si cambiaste de usuario a mitad de una carga, lo que quedó de la anterior no se confunde con la nueva.
 */
export function loadedMonths(seen: Record<string, string> | undefined, user: string): string[] {
  const path = `/${user.toLowerCase()}/games/`;
  return Object.keys(seen ?? {})
    .filter((k) => k.toLowerCase().includes(path))
    .map(archiveMonth)
    .sort();
}

/** Archivos a pedir: los últimos `months` la primera vez; después, desde el último mes visto. */
export function archivesToFetch(
  archives: string[],
  seen: Record<string, string> | undefined,
  user: string,
  months = 3,
): string[] {
  const lastSeen = loadedMonths(seen, user).at(-1);
  if (!lastSeen) return archives.slice(-months);
  return archives.filter((u) => archiveMonth(u) >= lastSeen);
}

/**
 * Meses de archivo sin leer anteriores al más nuevo ya cargado (completa los huecos), del más nuevo al más
 * viejo, hasta `count`. Sin meses cargados devuelve los últimos `count`. `archives` viene ascendente.
 */
export function olderArchives(
  archives: string[],
  seen: Record<string, string> | undefined,
  user: string,
  count: number | 'all',
): string[] {
  const loaded = loadedMonths(seen, user);
  const newest = loaded.at(-1);
  const leidos = new Set(loaded);
  const older = archives
    .filter((u) => {
      const m = archiveMonth(u);
      return !leidos.has(m) && (!newest || m < newest);
    })
    .reverse();
  return count === 'all' ? older : older.slice(0, count);
}

/** Espera `ms`; si se cancela antes, rechaza con AbortError. */
function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(abortError());
    const onAbort = () => {
      clearTimeout(timer);
      reject(abortError());
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

/**
 * Un mes de partidas. Es un `fetch(url, { signal })` sin encabezados: el preflight de CORS de Chess.com solo
 * admite `Origin`, así que no se puede mandar ninguno (nada de `If-None-Match`); la señal no agrega ninguno.
 * Ante un 429 espera (se puede cancelar) y reintenta una vez. Cancelado, rechaza con AbortError.
 */
export async function fetchMonth(
  url: string,
  opts: { retryDelayMs?: number; signal?: AbortSignal } = {},
): Promise<ChesscomGame[]> {
  const { signal } = opts;
  const pedir = () => conectando(() => fetch(url, { signal }), signal);
  let res = await pedir();
  if (res.status === 429) {
    await sleep(opts.retryDelayMs ?? 5000, signal);
    res = await pedir();
    if (res.status === 429) throw new Error('Chess.com pidió esperar un poco.');
  }
  if (!res.ok) throw new Error(`Chess.com respondió ${res.status} para ${archiveMonth(url)}.`);
  const json = await conectando(() => res.json() as Promise<{ games?: ChesscomGame[] }>, signal);
  return json.games ?? [];
}
