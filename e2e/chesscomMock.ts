import type { Page } from '@playwright/test';

/** Una partida simulada de la Published-Data API de Chess.com. */
export interface MockGame {
  /** Id corto: la url queda `https://www.chess.com/game/live/<id>`. */
  id: string;
  white: string;
  black: string;
  /** Movimientos en SAN, como en un PGN sin encabezados ("1. e4 c5 2. Nf3"). */
  moves: string;
  winner: 'white' | 'black' | 'draw';
  /** Fin de la partida (por defecto, hace un día). */
  end?: Date;
  timeClass?: 'bullet' | 'blitz' | 'rapid' | 'daily';
}

const API = 'https://api.chess.com/pub/player';

function toApi(g: MockGame) {
  const end = g.end ?? new Date(Date.now() - 86_400_000);
  const result = g.winner === 'white' ? '1-0' : g.winner === 'black' ? '0-1' : '1/2-1/2';
  const pgn = [
    `[Event "Live Chess"]`,
    `[Site "Chess.com"]`,
    `[White "${g.white}"]`,
    `[Black "${g.black}"]`,
    `[Result "${result}"]`,
    '',
    `${g.moves} ${result}`,
  ].join('\n');
  const side = (color: 'white' | 'black') =>
    g.winner === 'draw' ? 'agreed' : g.winner === color ? 'win' : 'resigned';
  return {
    url: `https://www.chess.com/game/live/${g.id}`,
    pgn,
    time_class: g.timeClass ?? 'blitz',
    rules: 'chess',
    end_time: Math.floor(+end / 1000),
    white: { username: g.white, result: side('white') },
    black: { username: g.black, result: side('black') },
  };
}

/**
 * Simula la API de Chess.com para `user`. `months` va de 'YYYY/MM' a sus partidas; los archivos
 * se devuelven en orden ascendente, como la API real. Devuelve la lista de urls pedidas, para
 * verificar qué meses se leyeron.
 */
export async function mockChesscom(page: Page, opts: { user: string; months: Record<string, MockGame[]> }) {
  const requested: string[] = [];
  const base = `${API}/${opts.user.toLowerCase()}/games`;
  const keys = Object.keys(opts.months).sort();
  const cors = { 'access-control-allow-origin': '*' };
  await page.route(`${API}/**`, async (route) => {
    const url = route.request().url();
    requested.push(url);
    if (url === `${base}/archives`) {
      return route.fulfill({ json: { archives: keys.map((k) => `${base}/${k}`) }, headers: cors });
    }
    const key = url.startsWith(`${base}/`) ? url.slice(base.length + 1) : '';
    const games = opts.months[key];
    if (!games) return route.fulfill({ status: 404, json: { message: 'not found' }, headers: cors });
    return route.fulfill({ json: { games: games.map(toApi) }, headers: cors });
  });
  return requested;
}
