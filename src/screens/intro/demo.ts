import { opposite, parseSquare } from 'chessops/util';
import { playUci, posFromEpd, turnOf } from '../../chess/position';

/**
 * ¿Después de jugar `uci` desde `epd`, la pieza propia de `square` está atacada por el rival y defendida?
 * La demo de la bienvenida lo usa para reconocer las otras jugadas que también defienden el peón de e5.
 */
export function defendsSquare(epd: string, uci: string, square: string): boolean {
  const played = playUci(epd, uci);
  const sq = parseSquare(square);
  if (!played || sq === undefined) return false;
  const pos = posFromEpd(played.epd);
  const mover = turnOf(epd);
  if (pos.board.get(sq)?.color !== mover) return false;
  const occupied = pos.board.occupied;
  return pos.kingAttackers(sq, opposite(mover), occupied).nonEmpty() && pos.kingAttackers(sq, mover, occupied).nonEmpty();
}
