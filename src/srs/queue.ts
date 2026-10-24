import type { RepertoireGraph } from '../chess/graph';
import type { CardRow, ReviewEvent } from '../types';
import { studyDay } from './day';
import { isDue, State } from './scheduler';

export interface DailyQueue {
  due: string[];
  fresh: string[];
  /** Nuevas que quedan fuera por el límite diario. */
  freshWaiting: number;
}

/** Nuevas introducidas hoy = tarjetas cuya primera calificación cae en el día de estudio actual. */
export function introducedToday(events: ReviewEvent[], now: Date): number {
  const first = new Map<string, number>();
  for (const ev of events) {
    if (ev.kind !== 'rating') continue;
    const t = +new Date(ev.at);
    const prev = first.get(ev.cardId);
    if (prev === undefined || t < prev) first.set(ev.cardId, t);
  }
  const today = studyDay(now);
  let n = 0;
  for (const t of first.values()) if (studyDay(t) === today) n++;
  return n;
}

/** Cola diaria: vencidas primero, después nuevas hasta el límite; ambas en orden DFS del grafo. */
export function buildDailyQueue(
  graphs: RepertoireGraph[],
  cards: Map<string, CardRow>,
  events: ReviewEvent[],
  now: Date,
  newPerDay: number,
): DailyQueue {
  const due: string[] = [];
  const freshAll: string[] = [];
  for (const g of graphs) {
    for (const id of g.trainableCardIds()) {
      const row = cards.get(id);
      if (!row) continue;
      if (row.card.state === State.New) freshAll.push(id);
      else if (isDue(row.card, now)) due.push(id);
    }
  }
  const allowance = Math.max(0, newPerDay - introducedToday(events, now));
  return { due, fresh: freshAll.slice(0, allowance), freshWaiting: Math.max(0, freshAll.length - allowance) };
}
