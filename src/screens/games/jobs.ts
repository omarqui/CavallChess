/**
 * Lo que trabaja contra la base desde Partidas: actualizar, cargar el historial y recalcular. La pantalla corre
 * una sola a la vez y, mientras tanto, deshabilita los botones de las otras. Por debajo, `runExclusive`
 * (`src/games/lock.ts`) las encola también con la actualización automática del arranque.
 */
export type Job = 'sync' | 'history' | 'recalc';
export type RunJob = (job: Job, task: () => Promise<void>) => Promise<void>;
