import Dexie, { type EntityTable } from 'dexie';
import type { CardRow, Gap, GameRow, MoveEdge, PositionNode, ReviewEvent, StudyDay } from '../types';

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
  }
}

export const db = new CavallDB();
