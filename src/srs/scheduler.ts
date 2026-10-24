import { createEmptyCard, fsrs, generatorParameters, Rating, State, type Card, type Grade } from 'ts-fsrs';
import type { ReviewEvent } from '../types';
import { endOfStudyDay } from './day';

export { Rating, State };
export type { Card, Grade };

// Sin fuzz: la tarjeta se recalcula reproduciendo el log, y la reproducción tiene que ser determinista.
const scheduler = fsrs(generatorParameters({ request_retention: 0.9, enable_fuzz: false, enable_short_term: false }));

export const newCard = (at: Date | number): Card => createEmptyCard(new Date(at));

export function applyEvent(card: Card, ev: Pick<ReviewEvent, 'kind' | 'rating' | 'at'>): Card {
  if (ev.kind === 'forceDue') return { ...card, due: new Date(ev.at) };
  return scheduler.next(card, new Date(ev.at), ev.rating as Grade).card;
}

/** Fuente de verdad: la tarjeta es la reproducción ordenada de su log. */
export function replay(createdAt: number, events: Pick<ReviewEvent, 'kind' | 'rating' | 'at'>[]): Card {
  return [...events]
    .sort((a, b) => +new Date(a.at) - +new Date(b.at))
    .reduce(applyEvent, newCard(createdAt));
}

/** Margen para traer adelante tarjetas en aprendizaje (como el "learn ahead" de Anki). */
const LEARN_AHEAD_MS = 20 * 60 * 1000;

/** ¿Vence en el día de estudio actual? Las tarjetas nuevas no "vencen": se aprenden. */
export function isDue(card: Card, now: Date): boolean {
  if (card.state === State.New) return false;
  const due = +new Date(card.due);
  if (card.state === State.Review) return due < +endOfStudyDay(now);
  return due <= +now + LEARN_AHEAD_MS;
}

export const isMature = (card: Card) => card.state === State.Review && card.stability >= 21;
