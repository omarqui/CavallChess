import { describe, expect, it } from 'vitest';
import { applyEvent, isDue, newCard, Rating, replay, State } from './scheduler';
import { endOfStudyDay, previousDay, studyDay } from './day';
import { buildDailyQueue, introducedToday } from './queue';
import { mastery, streak, weakSpots } from './stats';
import { repoFrom } from '../test/helpers';
import type { CardRow, ReviewEvent } from '../types';

const at = (s: string) => new Date(s);

describe('día de estudio', () => {
  it('corta a las 04:00', () => {
    expect(studyDay(new Date(2026, 9, 24, 1, 0))).toBe('2026-10-23');
    expect(studyDay(new Date(2026, 9, 24, 5, 0))).toBe('2026-10-24');
    expect(endOfStudyDay(new Date(2026, 9, 24, 5, 0))).toEqual(new Date(2026, 9, 25, 4, 0));
    expect(endOfStudyDay(new Date(2026, 9, 24, 2, 0))).toEqual(new Date(2026, 9, 24, 4, 0));
    expect(previousDay('2026-10-01')).toBe('2026-09-30');
  });
});

describe('scheduler', () => {
  it('reproducir el log da la misma tarjeta que aplicar los eventos uno a uno', () => {
    const created = +at('2026-10-01T10:00:00');
    const events: ReviewEvent[] = [
      { cardId: 'x', at: at('2026-10-01T10:05:00'), kind: 'rating', rating: Rating.Good, source: 'session' },
      { cardId: 'x', at: at('2026-10-01T10:20:00'), kind: 'rating', rating: Rating.Good, source: 'session' },
      { cardId: 'x', at: at('2026-10-03T09:00:00'), kind: 'rating', rating: Rating.Again, source: 'session' },
      { cardId: 'x', at: at('2026-10-03T09:15:00'), kind: 'rating', rating: Rating.Hard, source: 'session' },
      { cardId: 'x', at: at('2026-10-06T09:00:00'), kind: 'forceDue', source: 'game' },
    ];
    let card = newCard(created);
    for (const ev of events) card = applyEvent(card, ev);
    expect(replay(created, [...events].reverse())).toEqual(card);
    expect(card.due).toEqual(at('2026-10-06T09:00:00'));
    expect(card.lapses).toBe(1);
  });

  it('las nuevas no vencen; las de repaso vencen dentro del día de estudio', () => {
    const now = new Date(2026, 9, 24, 8, 0);
    expect(isDue(newCard(now), now)).toBe(false);
    // Sin pasos cortos: el "mostrar y pedir" de la sesión ya es la repetición inmediata.
    const card = applyEvent(newCard(now), { kind: 'rating', rating: Rating.Good, at: now });
    expect(card.state).toBe(State.Review);
    expect(card.scheduled_days).toBeGreaterThanOrEqual(1);
    expect(isDue(card, now)).toBe(false);
    expect(isDue({ ...card, state: State.Relearning, due: new Date(+now + 10 * 60_000) }, now)).toBe(true);
    expect(isDue({ ...card, due: new Date(2026, 9, 24, 23, 0) }, now)).toBe(true);
    expect(isDue({ ...card, due: new Date(2026, 9, 25, 5, 0) }, now)).toBe(false);
  });
});

describe('cola diaria', () => {
  it('vencidas primero, nuevas hasta el límite descontando las introducidas hoy', () => {
    const { graph } = repoFrom('1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 *', 'white');
    const ids = graph.trainableCardIds(); // e4, Nf3, Bb5, Ba4
    const now = new Date(2026, 9, 24, 9, 0);
    const reviewed = applyEvent(
      applyEvent(newCard(0), { kind: 'rating', rating: Rating.Good, at: new Date(2026, 9, 20) }),
      { kind: 'rating', rating: Rating.Good, at: new Date(2026, 9, 20, 0, 10) },
    );
    const cards = new Map<string, CardRow>(
      ids.map((id, i) => [id, { id, side: 'white', createdAt: 0, card: i === 2 ? { ...reviewed, due: now } : newCard(0) }]),
    );
    const events: ReviewEvent[] = [
      { cardId: 'other', at: new Date(2026, 9, 24, 7, 0), kind: 'rating', rating: Rating.Good, source: 'session' },
    ];
    expect(introducedToday(events, now)).toBe(1);
    const q = buildDailyQueue([graph], cards, events, now, 3);
    expect(q.due).toEqual([ids[2]]);
    expect(q.fresh).toEqual([ids[0], ids[1]]);
    expect(q.freshWaiting).toBe(1);
  });

  describe('nuevas alternando colores', () => {
    const armar = () => {
      const w = repoFrom('1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 *', 'white').graph;
      const b = repoFrom('1. e4 e5 2. Nf3 Nc6 *', 'black').graph;
      const cards = new Map<string, CardRow>();
      for (const [g, side] of [[w, 'white'], [b, 'black']] as const) {
        for (const id of g.trainableCardIds()) cards.set(id, { id, side, createdAt: 0, card: newCard(0) });
      }
      return { w, b, cards, wi: w.trainableCardIds(), bi: b.trainableCardIds() };
    };
    const now = new Date(2026, 9, 24, 9, 0);

    it('las nuevas alternan colores y respetan el orden DFS de cada uno', () => {
      const { w, b, cards, wi, bi } = armar();
      expect(wi).toHaveLength(4);
      expect(bi).toHaveLength(2);
      const q = buildDailyQueue([w, b], cards, [], now, 10);
      expect(q.fresh).toEqual([wi[0], bi[0], wi[1], bi[1], wi[2], wi[3]]);
      expect(q.freshWaiting).toBe(0);
    });

    it('el límite diario corta la alternancia', () => {
      const { w, b, cards, wi, bi } = armar();
      const q = buildDailyQueue([w, b], cards, [], now, 3);
      expect(q.fresh).toEqual([wi[0], bi[0], wi[1]]);
      expect(q.freshWaiting).toBe(3);
    });
  });
});

describe('estadísticas', () => {
  it('racha: días consecutivos; hoy incompleto no la corta', () => {
    const now = new Date(2026, 9, 24, 10, 0);
    expect(streak(new Set(['2026-10-22', '2026-10-23']), now)).toBe(2);
    expect(streak(new Set(['2026-10-22', '2026-10-23', '2026-10-24']), now)).toBe(3);
    expect(streak(new Set(['2026-10-21', '2026-10-23']), now)).toBe(1);
    expect(streak(new Set(['2026-10-21']), now)).toBe(0);
  });

  it('dominio = maduras / total', () => {
    const mature = { ...newCard(0), state: State.Review, stability: 30, reps: 5 };
    const young = { ...newCard(0), state: State.Review, stability: 3, reps: 2 };
    const cards = new Map<string, CardRow>([
      ['a', { id: 'a', side: 'white', createdAt: 0, card: mature }],
      ['b', { id: 'b', side: 'white', createdAt: 0, card: young }],
      ['c', { id: 'c', side: 'white', createdAt: 0, card: newCard(0) }],
    ]);
    expect(mastery(['a', 'b', 'c'], cards)).toEqual({ total: 3, mature: 1, learned: 2, pct: 33 });
  });

  it('débiles: más fallos en 30 días con su línea', () => {
    const { graph } = repoFrom('1. e4 e5 2. Nf3 Nc6 3. Bb5 *', 'white');
    const [, nf3, bb5] = graph.trainableCardIds();
    const now = new Date(2026, 9, 24);
    const ev = (cardId: string, daysAgo: number): ReviewEvent => ({
      cardId,
      at: new Date(+now - daysAgo * 86400_000),
      kind: 'rating',
      rating: Rating.Again,
      source: 'session',
    });
    const weak = weakSpots([graph], [ev(bb5, 1), ev(bb5, 2), ev(nf3, 3), ev(nf3, 40)], now);
    expect(weak.map((w) => [w.edge.san, w.fails])).toEqual([
      ['Bb5', 2],
      ['Nf3', 1],
    ]);
    expect(weak[0].line.map((e) => e.san)).toEqual(['e4', 'e5', 'Nf3', 'Nc6', 'Bb5']);
  });
});
