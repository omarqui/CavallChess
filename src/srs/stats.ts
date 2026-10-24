import type { RepertoireGraph } from '../chess/graph';
import type { CardRow, MoveEdge, ReviewEvent } from '../types';
import { previousDay, studyDay } from './day';
import { isMature, Rating } from './scheduler';

export interface Mastery {
  total: number;
  mature: number;
  learned: number;
  pct: number;
}

export function mastery(cardIds: string[], cards: Map<string, CardRow>): Mastery {
  let mature = 0;
  let learned = 0;
  for (const id of cardIds) {
    const c = cards.get(id)?.card;
    if (!c) continue;
    if (c.reps > 0) learned++;
    if (isMature(c)) mature++;
  }
  const total = cardIds.length;
  return { total, mature, learned, pct: total ? Math.round((mature / total) * 100) : 0 };
}

/**
 * Racha: días consecutivos con los vencidos en cero. Si hoy todavía no se completó,
 * la racha sigue viva contando hasta ayer.
 */
export function streak(completedDays: Set<string>, now: Date): number {
  let day = studyDay(now);
  if (!completedDays.has(day)) day = previousDay(day);
  let n = 0;
  while (completedDays.has(day)) {
    n++;
    day = previousDay(day);
  }
  return n;
}

export interface WeakSpot {
  edge: MoveEdge;
  fails: number;
  line: MoveEdge[];
}

/** Jugadas con más fallos (Again) en los últimos `days` días, entre las tarjetas activas. */
export function weakSpots(
  graphs: RepertoireGraph[],
  events: ReviewEvent[],
  now: Date,
  days = 30,
  limit = 10,
): WeakSpot[] {
  const since = +now - days * 86400_000;
  const fails = new Map<string, number>();
  for (const ev of events) {
    if (ev.kind === 'rating' && ev.rating === Rating.Again && +new Date(ev.at) >= since) {
      fails.set(ev.cardId, (fails.get(ev.cardId) ?? 0) + 1);
    }
  }
  const out: WeakSpot[] = [];
  for (const g of graphs) {
    const active = new Set(g.trainableCardIds());
    for (const [id, n] of fails) {
      if (!active.has(id)) continue;
      const edge = g.edges.get(id)!;
      out.push({ edge, fails: n, line: [...(g.pathFromRoot(edge.fromId) ?? []), edge] });
    }
  }
  return out.sort((a, b) => b.fails - a.fails).slice(0, limit);
}
