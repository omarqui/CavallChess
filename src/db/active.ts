import type { Repertoire, Settings, Side } from '../types';

/** Nombre de los dos primeros repertorios (los que existían antes de poder tener varios). */
export const DEFAULT_REP_NAME = 'Principal';

/** El repertorio que se crea solo cuando un color no tiene ninguno: su id es el color. */
export const defaultRepertoire = (side: Side): Repertoire => ({ id: side, side, name: DEFAULT_REP_NAME, createdAt: 0 });

/** Los repertorios de un color, del más viejo al más nuevo. */
export function repertoiresOf(reps: Repertoire[], side: Side): Repertoire[] {
  return reps
    .filter((r) => r.side === side)
    .sort((a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id));
}

/**
 * Con qué repertorio entrenás en un color: el elegido en ajustes si todavía existe; si no, el más viejo del color.
 * Sin ninguno (antes de `ensureRoots`), el que se va a crear.
 */
export function activeRepertoire(reps: Repertoire[], active: Settings['activeRep'], side: Side): Repertoire {
  const mine = repertoiresOf(reps, side);
  return mine.find((r) => r.id === active?.[side]) ?? mine[0] ?? defaultRepertoire(side);
}

/** Id nuevo para un repertorio: no puede llevar `|` (separa el repertorio del resto del id) ni ser un color. */
export const newRepertoireId = (now = Date.now()) => `r${now.toString(36)}${Math.random().toString(36).slice(2, 6)}`;
