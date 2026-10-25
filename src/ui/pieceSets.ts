/**
 * Sets de piezas que se pueden elegir en Ajustes: fuente única de los ids (`Settings['pieceSet']`), las
 * etiquetas y los créditos. Cada set tiene sus 12 SVG en `src/assets/pieces/<id>/` y, salvo los que pone
 * chessground (`fromChessground`), sus 12 reglas en `src/themes.css`; `pieceSets.test.ts` lo comprueba.
 * Los créditos completos están en `src/assets/pieces/CREDITOS.md`. Las Neo de Chess.com son propietarias:
 * no se agregan.
 */
export interface PieceSetInfo {
  id: string;
  label: string;
  author: string;
  license: string;
  /** Las reglas del tablero las trae chessground (`chessground.cburnett.css`), no `themes.css`. */
  fromChessground?: true;
}

export const PIECE_SETS = [
  { id: 'papercut-gris', label: 'Papercut gris', author: 'Nikolay Anzarov, negras recoloreadas', license: 'CC BY 4.0' },
  { id: 'papercut', label: 'Papercut', author: 'Nikolay Anzarov', license: 'CC BY 4.0' },
  { id: 'mpchess', label: 'MPChess', author: 'Maxime Chupin', license: 'GPLv3+' },
  { id: 'cburnett', label: 'Clásicas', author: 'Colin M.L. Burnett', license: 'GPLv2+', fromChessground: true },
  { id: 'merida', label: 'Mérida', author: 'Armando Hernandez Marroquin', license: 'GPLv2+' },
  { id: 'chessnut', label: 'Chessnut', author: 'Alexis Luengas', license: 'Apache-2.0' },
  { id: 'pirouetti', label: 'Pirouetti', author: 'pirouetti', license: 'AGPLv3+' },
  { id: 'rhosgfx', label: 'RhosGFX', author: 'RhosGFX', license: 'CC0 1.0' },
  { id: 'firi', label: 'Firi', author: 'James Faure', license: 'CC BY 4.0' },
  { id: 'fantasy', label: 'Fantasy', author: 'Maurizio Monge', license: 'MIT' },
] as const satisfies readonly PieceSetInfo[];

export type PieceSetId = (typeof PIECE_SETS)[number]['id'];

/** Pieza con la convención de nombre de los archivos: color (`w`/`b`) y letra en mayúscula. */
export type PieceCode = `${'w' | 'b'}${'K' | 'Q' | 'R' | 'B' | 'N' | 'P'}`;

const urls = import.meta.glob<string>('../assets/pieces/*/*.svg', { eager: true, query: '?url', import: 'default' });

/** URL del SVG de una pieza de un set (para las miniaturas del selector, fuera de chessground). */
export function pieceUrl(set: PieceSetId, piece: PieceCode): string | undefined {
  return urls[`../assets/pieces/${set}/${piece}.svg`];
}
