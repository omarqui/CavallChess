import type { Side } from '../chess/position';

/** Lo que hace falta de una evaluación del motor: desde las blancas, en centipeones o mate en N. */
export interface Eval {
  cp?: number;
  mate?: number;
}

export type Verdict = 'bien' | 'imprecision' | 'error' | 'grave';

export interface Judgement {
  verdict: Verdict;
  /** Cuánto empeoró la evaluación, en peones y desde tu lado (0 si no empeoró). */
  loss: number;
  /** La evaluación después de tu jugada, en peones y desde tu lado (mate cuenta como ±100). */
  after: number;
}

export const VERDICT_LABEL: Record<Verdict, string> = {
  bien: 'Jugada sana',
  imprecision: 'Imprecisión',
  error: 'Error',
  grave: 'Error grave',
};

/** Centipeones desde las blancas; un mate vale ±10 000 (menos cuanto más lejos esté). */
function centipawns(e: Eval): number {
  if (e.mate !== undefined) return Math.sign(e.mate || 1) * (10_000 - Math.abs(e.mate) * 10);
  return e.cp ?? 0;
}

/** Probabilidad de ganar menos la de perder (−1 a 1), con la curva que usa Lichess para marcar errores. */
export const winningChances = (cp: number) => 2 / (1 + Math.exp(-0.00368208 * cp)) - 1;

/**
 * Califica tu jugada comparando la posición de antes (con la mejor jugada) con la de después, desde tu lado.
 * Se mide en chances de ganar y no en peones, así perder un peón con +8 no cuenta como error y con 0 sí:
 * imprecisión desde 0,1, error desde 0,2 y error grave desde 0,3 (los umbrales de Lichess).
 */
export function judgeMove(before: Eval, after: Eval, side: Side): Judgement {
  const sign = side === 'white' ? 1 : -1;
  const b = centipawns(before) * sign;
  const a = centipawns(after) * sign;
  const drop = winningChances(b) - winningChances(a);
  const verdict: Verdict = drop >= 0.3 ? 'grave' : drop >= 0.2 ? 'error' : drop >= 0.1 ? 'imprecision' : 'bien';
  return { verdict, loss: Math.max(0, b - a) / 100, after: Math.max(-100, Math.min(100, a / 100)) };
}
