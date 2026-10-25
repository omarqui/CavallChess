import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS } from '../types';
import { PIECE_SETS, pieceUrl, type PieceCode } from './pieceSets';

const PIECES = ['wK', 'wQ', 'wR', 'wB', 'wN', 'wP', 'bK', 'bQ', 'bR', 'bB', 'bN', 'bP'] as const satisfies PieceCode[];
const ROLE: Record<string, string> = { K: 'king', Q: 'queen', R: 'rook', B: 'bishop', N: 'knight', P: 'pawn' };
const PIECES_DIR = new URL('../assets/pieces/', import.meta.url);
const themes = readFileSync(new URL('../themes.css', import.meta.url), 'utf8');
const svg = (set: string, piece: string) => readFileSync(new URL(`${set}/${piece}.svg`, PIECES_DIR), 'utf8');

describe('sets de piezas', () => {
  it('los ids no se repiten y el set por defecto está registrado', () => {
    const ids = PIECE_SETS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain(DEFAULT_SETTINGS.pieceSet);
  });

  it.each(PIECE_SETS.map((p) => [p.id]))('%s tiene sus 12 SVG y una URL para cada uno', (id) => {
    const files = readdirSync(new URL(`${id}/`, PIECES_DIR)).filter((f) => f.endsWith('.svg'));
    expect(files.sort()).toEqual(PIECES.map((p) => `${p}.svg`).sort());
    for (const p of PIECES) {
      expect(svg(id, p)).toMatch(/^<svg[\s>]/);
      expect(pieceUrl(id, p)).toEqual(expect.any(String));
    }
  });

  it.each(PIECE_SETS.filter((p) => !('fromChessground' in p)).map((p) => [p.id]))(
    '%s tiene sus 12 reglas en themes.css',
    (id) => {
      const rules = themes.split(/\r?\n/).filter((l) => l.startsWith(`.pieces-${id} `));
      expect(rules).toHaveLength(12);
      for (const p of PIECES) {
        const color = p[0] === 'w' ? 'white' : 'black';
        expect(rules).toContain(
          `.pieces-${id} .cg-wrap piece.${ROLE[p[1]]}.${color} { background-image: url("./assets/pieces/${id}/${p}.svg"); }`,
        );
      }
    },
  );

  it('themes.css no tiene reglas de sets sin registrar ni de los que pone chessground', () => {
    const conReglas = new Set([...themes.matchAll(/^\.pieces-([\w-]+) /gm)].map((m) => m[1]));
    const esperados = PIECE_SETS.filter((p) => !('fromChessground' in p)).map((p) => p.id);
    expect([...conReglas].sort()).toEqual([...esperados].sort());
  });

  it('papercut-gris solo recolorea el degradado de las negras de papercut', () => {
    for (const p of PIECES) {
      const original = svg('papercut', p);
      const gris = svg('papercut-gris', p);
      if (p[0] === 'w') expect(gris).toBe(original);
      else {
        expect(gris).not.toBe(original);
        expect(gris).not.toMatch(/#454f54|#110d26/);
        expect(gris.length).toBe(original.length);
      }
    }
  });
});
