import { extend, makePgn, Node, parsePgn, startingPosition, type PgnNodeData } from 'chessops/pgn';
import { makeSan, parseSan } from 'chessops/san';
import { makeUci } from 'chessops/util';
import { epdOf, INITIAL_EPD } from '../chess/position';

/** Una jugada de la línea principal de una partida. */
export interface GameMove {
  san: string;
  /** Normalizado como chessops (enroque rey→torre), igual que los ids de las jugadas del repertorio. */
  uci: string;
  /** Posición desde la que se juega (clave EPD). */
  fromEpd: string;
  /** Posición resultante (clave EPD). */
  epd: string;
}

/** Un número de jugadas pedido desde afuera (p. ej. de la URL): nunca negativo, y `NaN` vale 0. */
const atLeastZero = (plies: number) => Math.max(0, plies) || 0;

interface ReadGame {
  headers: Map<string, string>;
  moves: GameMove[];
}

/**
 * La primera partida del PGN, si arranca en la posición inicial y toda su línea principal es legal.
 * Devuelve el detalle de las primeras `plies` jugadas; las demás solo se juegan para validarlas, porque
 * calcular el EPD es lo que más cuesta y con miles de partidas se nota.
 */
function readGame(pgn: string, plies: number): ReadGame | null {
  const game = parsePgn(pgn)[0];
  if (!game) return null;
  const start = startingPosition(game.headers);
  if (start.isErr) return null;
  const pos = start.value;
  let fromEpd = epdOf(pos);
  if (fromEpd !== INITIAL_EPD) return null;
  const moves: GameMove[] = [];
  for (const node of game.moves.mainlineNodes()) {
    const move = parseSan(pos, node.data.san);
    if (!move) return null;
    if (moves.length >= plies) {
      pos.play(move);
      continue;
    }
    const san = makeSan(pos, move);
    pos.play(move);
    const epd = epdOf(pos);
    moves.push({ san, uci: makeUci(move), fromEpd, epd });
    fromEpd = epd;
  }
  return { headers: game.headers, moves };
}

/**
 * La línea principal de una partida, desde la posición inicial.
 * Devuelve `null` si la partida arranca en otra posición (`[FEN]`), no se puede leer o tiene una jugada ilegal.
 */
export function gameMoves(pgn: string): GameMove[] | null {
  return readGame(pgn, Infinity)?.moves ?? null;
}

/** Como `gameMoves`, pero solo las primeras `plies` jugadas. La partida se valida entera igual. */
export function gameMovesUntil(pgn: string, plies: number): GameMove[] | null {
  return readGame(pgn, atLeastZero(plies))?.moves ?? null;
}

/** Una partida con un solo encabezado (`Event`) y las jugadas del árbol, lista para `buildImportPlan`. */
export function writePgn(event: string, moves: Node<PgnNodeData>): string {
  return makePgn({ headers: new Map([['Event', event]]), moves });
}

/**
 * Las primeras `plies` jugadas de la partida, como PGN de una sola partida sin `[FEN]` ni relojes.
 * El único encabezado es `[Event "<White> vs <Black>"]`, que la importación solo muestra en sus mensajes de error.
 * Devuelve `null` en los mismos casos que `gameMoves`.
 */
export function gamePgnUntil(pgn: string, plies: number): string | null {
  const game = readGame(pgn, atLeastZero(plies));
  if (!game) return null;
  const root = new Node<PgnNodeData>();
  extend(root, game.moves.map((m) => ({ san: m.san })));
  const white = game.headers.get('White') ?? '?';
  const black = game.headers.get('Black') ?? '?';
  return writePgn(`${white} vs ${black}`, root);
}
