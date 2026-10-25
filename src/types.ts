import type { Card, Rating } from 'ts-fsrs';
import type { Side } from './chess/position';
import type { PieceSetId } from './ui/pieceSets';

export type { Side };

export interface Shape {
  orig: string;
  dest?: string;
  brush: 'green' | 'red' | 'blue' | 'yellow';
}

/**
 * Un repertorio de un color. Sus posiciones, jugadas, tarjetas y huecos llevan su `id` como prefijo del id
 * (ver `nodeId`); los dos primeros se llaman `white` y `black`.
 */
export interface Repertoire {
  id: string;
  side: Side;
  name: string;
  createdAt: number;
}

export interface PositionNode {
  id: string; // `${rep}|${epd}` (rep = id del repertorio)
  side: Side;
  epd: string;
  myTurn: boolean;
  name?: string; // raíz nombrada
  cutHere?: boolean; // fin de repertorio: desde acá no se entrena
}

/** Marca de trampa en una jugada: la ficha y la trampa de la biblioteca a la que pertenece. */
export interface TrapMark {
  kind: 'favor' | 'contra';
  name: string;
  fichaId: string;
  trapId: string;
}

/** Nota propia sobre una ficha (id = fichaId) o una línea (id = `fichaId|lineId`). */
export interface Note {
  id: string;
  text: string;
  updatedAt: number;
}

export interface MoveEdge {
  id: string; // `${rep}|${epd}|${uci}`
  side: Side;
  fromId: string;
  toId: string;
  uci: string;
  san: string;
  mine: boolean;
  hint?: string;
  explanation?: string;
  shapes?: Shape[];
  nags?: number[];
  trap?: TrapMark;
  createdAt: number;
}

export type ReviewSource = 'session' | 'practice' | 'game';

export interface ReviewEvent {
  seq?: number;
  cardId: string;
  at: Date;
  kind: 'rating' | 'forceDue';
  rating?: Rating;
  source: ReviewSource;
}

export interface CardRow {
  id: string; // = id de la jugada propia
  side: Side;
  createdAt: number;
  card: Card;
}

export interface Gap {
  id: string; // `${rep}|${epd}|${uci}`
  side: Side;
  epd: string;
  uci: string;
  san: string;
  count: number;
  lastSeen: number;
  lastGameUrl?: string;
}

export type GameOutcome =
  | { kind: 'inBook' } // la partida nunca salió del repertorio (terminó antes)
  | { kind: 'endOfBook'; ply: number } // se acabó tu preparación sin salirte
  | { kind: 'myDeviation'; ply: number; playedSan: string; expectedSan: string; cardId: string }
  | { kind: 'gap'; ply: number; playedSan: string; gapId: string }
  | { kind: 'noBook' }; // ni la primera posición está en tu repertorio

export interface GameRow {
  id: string; // url de la partida
  endTime: number;
  myColor: Side;
  opponent: string;
  timeClass: string;
  result: string; // 'win' | 'loss' | 'draw' | ...
  outcome: GameOutcome;
  pgn: string;
  /** Repertorio contra el que se cruzó (el que más la cubre); sin él, el primero del color (`myColor`). */
  rep?: string;
}

export interface StudyDay {
  day: string; // YYYY-MM-DD (corte 04:00)
}

export interface Settings {
  newPerDay: number;
  /** Repertorio con el que entrenás en cada color; si falta o ya no existe, el más viejo de ese color. */
  activeRep?: Partial<Record<Side, string>>;
  boardTheme: 'brown' | 'blue' | 'green' | 'slate';
  pieceSet: PieceSetId; // registrados en src/ui/pieceSets.ts
  colorScheme: 'system' | 'light' | 'dark';
  sound: boolean;
  haptics: boolean;
  appearanceVersion?: number; // migraciones de apariencia ya hechas (src/ui/appearance.ts)
  lichessToken?: string;
  chesscomUser?: string;
  lastBackupAt?: number;
  introSeenAt?: number; // cuándo se vio la intro de primer uso
  tipsSeen?: string[]; // ids de consejos ya mostrados
  lastChesscomSync?: number;
  chesscomMonths?: Record<string, string>; // url de archivo mensual -> "" (la clave indica que el mes ya se leyó; ya no se guarda ETag)
}

export const DEFAULT_SETTINGS: Settings = {
  newPerDay: 10,
  boardTheme: 'green',
  pieceSet: 'papercut-gris',
  colorScheme: 'system',
  sound: true,
  haptics: true,
};
