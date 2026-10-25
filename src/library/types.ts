import type { Side } from '../chess/position';
import type { Shape } from '../types';

export type FichaLevel = 'principiante' | 'club';
export type LineLevel = 'basica' | 'club';
export type LineKind = 'variante' | 'favor' | 'contra';

export interface LibMove {
  san: string;
  uci: string;
  fromEpd: string;
  epd: string;
  comment?: string;
  hint?: string;
  shapes?: Shape[];
  nags?: number[];
}

export interface FichaLine {
  id: string;
  kind: LineKind;
  name: string;
  level: LineLevel;
  gambit: boolean;
  intro: string;
  outro: string;
  /** Desde la posición inicial. */
  moves: LibMove[];
  /** favor: error del rival; contra: tu jugada correcta (índice en `moves`). */
  trapPly?: number;
  /** contra: lo que pasa si caés, desde `moves[trapPly].fromEpd`. */
  fall?: LibMove[];
  /** Solo variantes: `mainline[rootPly]` de la importación lleva el nombre. */
  rootPly?: number;
}

export interface Ficha {
  id: string;
  side: Side;
  name: string;
  aliases: string[];
  group: string;
  order: number;
  eco: string;
  levels: FichaLevel[];
  summary: string;
  /** `jugadas` del frontmatter: hasta la posición característica. */
  start: LibMove[];
  basics: string;
  ideas: string;
  tips: string[];
  /** En el orden del archivo. */
  lines: FichaLine[];
}
