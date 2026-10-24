import { Chess, castlingSide, normalizeMove, type Position } from 'chessops/chess';
import { makeFen, parseFen } from 'chessops/fen';
import { makeSan, parseSan } from 'chessops/san';
import { kingCastlesTo, makeSquare, makeUci, parseUci } from 'chessops/util';
import type { Move, NormalMove } from 'chessops/types';

export type Side = 'white' | 'black';

/** Clave de posición: FEN sin contadores; la casilla al paso solo aparece si la captura es legal. */
export const epdOf = (pos: Position): string => makeFen(pos.toSetup(), { epd: true });

export const INITIAL_EPD = epdOf(Chess.default());

export const posFromEpd = (epd: string): Chess => {
  const setup = parseFen(epd).unwrap();
  return Chess.fromSetup(setup).unwrap();
};

export const turnOf = (epd: string): Side => (epd.split(' ')[1] === 'w' ? 'white' : 'black');

export const nodeId = (side: Side, epd: string) => `${side}|${epd}`;
export const edgeId = (side: Side, epd: string, uci: string) => `${side}|${epd}|${uci}`;
export const epdFromNodeId = (id: string) => id.slice(id.indexOf('|') + 1);
export const sideFromId = (id: string): Side => (id.startsWith('white|') ? 'white' : 'black');

export interface PlayedMove {
  uci: string; // normalizado (enroque como rey→torre, igual que chessops)
  san: string;
  epd: string; // posición resultante
}

/** Normaliza un UCI (p. ej. e1g1 → e1h1) y lo juega. Devuelve null si es ilegal. */
export function playUci(epd: string, uci: string): PlayedMove | null {
  const pos = posFromEpd(epd);
  const raw = parseUci(uci);
  if (!raw) return null;
  const move = normalizeMove(pos, raw);
  if (!pos.isLegal(move)) return null;
  const san = makeSan(pos, move);
  pos.play(move);
  return { uci: makeUci(move), san, epd: epdOf(pos) };
}

export function playSan(epd: string, san: string): PlayedMove | null {
  const pos = posFromEpd(epd);
  const move = parseSan(pos, san);
  if (!move) return null;
  const normSan = makeSan(pos, move);
  pos.play(move);
  return { uci: makeUci(move), san: normSan, epd: epdOf(pos) };
}

/** Squares para mostrar en el tablero: el enroque se dibuja hacia la casilla final del rey. */
export function displaySquares(epd: string, uci: string): [string, string] {
  const pos = posFromEpd(epd);
  const move = parseUci(uci) as NormalMove | undefined;
  if (!move || !('from' in move)) return [uci.slice(0, 2), uci.slice(2, 4)];
  const cs = castlingSide(pos, move as Move);
  if (cs) return [makeSquare(move.from), makeSquare(kingCastlesTo(pos.turn, cs))];
  return [makeSquare(move.from), makeSquare(move.to)];
}

const FIGURINES: Record<string, string> = { K: '♚', Q: '♛', R: '♜', B: '♝', N: '♞' };

/** SAN con figurines (♘f3). El selector de variación U+FE0E fuerza glifo de texto en iOS. */
export const figurine = (san: string) => san.replace(/[KQRBN]/g, (c) => `${FIGURINES[c]}︎`);

/** "12." o "12…" según el turno de la posición desde la que se juega. */
export function moveNumberLabel(ply: number): string {
  const n = Math.floor(ply / 2) + 1;
  return ply % 2 === 0 ? `${n}.` : `${n}…`;
}
