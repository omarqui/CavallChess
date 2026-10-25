import { createElement, memo } from 'react';
import type { Side } from '../chess/position';

const ROLES: Record<string, string> = { k: 'king', q: 'queen', r: 'rook', b: 'bishop', n: 'knight', p: 'pawn' };

interface Pc {
  key: string;
  color: 'white' | 'black';
  role: string;
  file: number;
  rank: number;
}

/** Lee solo el campo de piezas de un FEN/EPD. */
function readPieces(epd: string): Pc[] {
  const out: Pc[] = [];
  epd
    .split(' ')[0]
    .split('/')
    .forEach((row, i) => {
      let file = 0;
      for (const ch of row) {
        if (/\d/.test(ch)) file += Number(ch);
        else {
          const role = ROLES[ch.toLowerCase()];
          if (role) {
            out.push({ key: `${i}-${file}`, color: ch === ch.toUpperCase() ? 'white' : 'black', role, file, rank: 7 - i });
          }
          file++;
        }
      }
    });
  return out;
}

/**
 * Tablero estático y barato (sin instancia de chessground): usa sus mismas clases para que
 * `themes.css` le aplique el tablero y las piezas elegidos en Ajustes.
 */
export const MiniBoard = memo(function MiniBoard({ epd, orientation }: { epd: string; orientation: Side }) {
  const flip = orientation === 'black';
  const pieces = readPieces(epd).map((p) =>
    createElement('piece', {
      key: p.key,
      className: `${p.color} ${p.role}`,
      style: {
        transform: 'none',
        left: `${(flip ? 7 - p.file : p.file) * 12.5}%`,
        top: `${(flip ? p.rank : 7 - p.rank) * 12.5}%`,
      },
    }),
  );
  return (
    <div
      aria-hidden="true"
      className="relative aspect-square w-full overflow-hidden rounded-[5px] shadow-[0_0_0_1px_var(--line)]"
    >
      <div className="cg-wrap" style={{ width: '100%', height: '100%' }}>
        {createElement('cg-container', null, createElement('cg-board', null, pieces))}
      </div>
    </div>
  );
});
