import type { Settings } from '../types';

/** Versión de la apariencia guardada en ajustes: la 2 es el tema estilo Chess.com. */
export const APPEARANCE_VERSION = 2;

/**
 * Migración de una sola vez al tema estilo Chess.com: quien tenía los valores por defecto anteriores (Madera +
 * Clásicas) pasa a Verde + Papercut gris; cualquier otra elección se respeta. Devuelve el cambio a guardar
 * (siempre con la marca, para no volver a migrar a quien elija Madera + Clásicas después), o `null` si ya se hizo.
 */
export function appearanceMigration(s: Settings): Partial<Settings> | null {
  if ((s.appearanceVersion ?? 1) >= APPEARANCE_VERSION) return null;
  const oldDefaults = s.boardTheme === 'brown' && s.pieceSet === 'cburnett';
  return oldDefaults
    ? { appearanceVersion: APPEARANCE_VERSION, boardTheme: 'green', pieceSet: 'papercut-gris' }
    : { appearanceVersion: APPEARANCE_VERSION };
}
