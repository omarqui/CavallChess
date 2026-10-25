import type { GameOutcome } from '../../types';

/** "1 partida", "1.234 partidas". */
export const plural = (n: number, one: string, many: string) => `${n.toLocaleString('es')} ${n === 1 ? one : many}`;

/** Ruta del visor de una partida (el id es su URL de Chess.com, así que va codificado). */
export const gamePath = (id: string) => `/games/${encodeURIComponent(id)}`;

const LOSSES = ['checkmated', 'resigned', 'timeout', 'lose', 'abandoned'];

/** El resultado de Chess.com (`win`, `resigned`, `agreed`…) contado desde tu lado. */
export const resultLabel = (result: string) =>
  result === 'win' ? 'Ganaste' : LOSSES.includes(result) ? 'Perdiste' : 'Tablas';

const TIME_CLASS: Record<string, string> = { bullet: 'bullet', blitz: 'blitz', rapid: 'rápida', daily: 'diaria' };

/** El ritmo en castellano; uno que no conocemos queda como viene. */
export const timeClassLabel = (timeClass: string) => TIME_CLASS[timeClass] ?? timeClass;

/** "Jugada 3" de la jugada número `ply` (desde 0). */
export const moveNumber = (ply: number) => Math.floor(ply / 2) + 1;

/** "2026-08" → "agosto de 2026". */
export const monthName = (month: string) => {
  const [y, m] = month.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('es', { month: 'long', year: 'numeric' });
};

/** Mientras otra carga tiene el candado de partidas (`isBusy`), la nueva espera su turno. */
export const WAITING = 'Esperando que termine otra carga…';

/** Un mensaje de error como oración: con punto final si no lo trae. */
export const sentence = (msg: string) => {
  const t = msg.trim();
  return /[.!?…]$/.test(t) ? t : `${t}.`;
};

/** Lo que dice el aviso al guardar jugadas de partidas en el repertorio. */
export const savedMessage = ({ mine, rival }: { mine: number; rival: number }) =>
  mine + rival
    ? `Sumaste ${plural(mine + rival, 'jugada', 'jugadas')}, ${mine} para aprender.`
    : 'Ya tenías todo eso en tu repertorio.';

/** Etiqueta de cada tipo de resultado contra el repertorio. */
export const OUTCOME_LABEL: Record<GameOutcome['kind'], string> = {
  inBook: 'Dentro del repertorio',
  endOfBook: 'Terminó tu preparación',
  myDeviation: 'Te desviaste',
  gap: 'Novedad del rival',
  noBook: 'Fuera del repertorio',
};
