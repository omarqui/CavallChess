import Dexie, { type EntityTable } from 'dexie';
import type { CardRow, Gap, GameRow, MoveEdge, Note, PositionNode, Repertoire, ReviewEvent, StudyDay } from '../types';

export interface KV {
  key: string;
  value: unknown;
}

export class CavallDB extends Dexie {
  nodes!: EntityTable<PositionNode, 'id'>;
  edges!: EntityTable<MoveEdge, 'id'>;
  cards!: EntityTable<CardRow, 'id'>;
  events!: EntityTable<ReviewEvent, 'seq'>;
  gaps!: EntityTable<Gap, 'id'>;
  games!: EntityTable<GameRow, 'id'>;
  days!: EntityTable<StudyDay, 'day'>;
  kv!: EntityTable<KV, 'key'>;
  notes!: EntityTable<Note, 'id'>;
  repertoires!: EntityTable<Repertoire, 'id'>;

  constructor(name = 'cavallchess') {
    super(name);
    this.version(1).stores({
      nodes: 'id, side',
      edges: 'id, side, fromId, toId',
      cards: 'id, side',
      events: '++seq, cardId, at',
      gaps: 'id, side, count',
      games: 'id, endTime',
      days: 'day',
      kv: 'key',
    });
    this.version(2).stores({
      nodes: 'id, side',
      edges: 'id, side, fromId, toId',
      cards: 'id, side',
      events: '++seq, cardId, at',
      gaps: 'id, side, count',
      games: 'id, endTime',
      days: 'day',
      kv: 'key',
      notes: 'id',
    });
    // Repertorios múltiples. Las filas no cambian: el repertorio es el prefijo de cada id, y los dos de antes
    // (`white`, `black`) los crea `ensureRoots`.
    this.version(3).stores({
      nodes: 'id, side',
      edges: 'id, side, fromId, toId',
      cards: 'id, side',
      events: '++seq, cardId, at',
      gaps: 'id, side, count',
      games: 'id, endTime',
      days: 'day',
      kv: 'key',
      notes: 'id',
      repertoires: 'id, side',
    });
  }
}

export const db = new CavallDB();
