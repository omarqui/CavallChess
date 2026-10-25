// Umbrales de la verificación con motor. Puro: lo usan motor.test.ts y content.test.ts, y se prueba sin motor.
import type { LineKind } from './types';

/** Versión del criterio de verificación. Subirla deja vencidas todas las entradas de verificacion.json. */
export const VERSION_VERIFICACION = 2;

// Umbrales en peones, desde el lado de la ficha.
export const MIN_VARIANTE = -0.7;
export const MIN_GAMBITO = -1.5;
export const MIN_FAVOR = 2.0;
/** Posición justo antes del error del rival en una trampa a favor: tu camino hasta ahí tiene que ser sano. */
export const MIN_PREVIA_FAVOR = -0.5;
export const MIN_CONTRA_CORRECTA = -0.5;
export const MAX_CONTRA_CAIDA = -2.0;

export interface Evals {
  /** variante y favor: final de la línea. */
  final?: number;
  /** favor: posición antes del error del rival (`moves[trapPly].fromEpd`). */
  previa?: number;
  /** contra: la jugada correcta. */
  correcta?: number;
  /** contra: el final de la caída. */
  caida?: number;
}

/** Devuelve los incumplimientos de la línea (sin el prefijo de ficha / línea). Vacío si cumple. */
export function checkLine(kind: LineKind, gambit: boolean, evals: Evals): string[] {
  const fallas: string[] = [];
  const chequear = (valor: number | undefined, ok: (v: number) => boolean, que: string, umbral: string) => {
    if (valor === undefined) fallas.push(`${que}: falta la evaluación`);
    else if (!ok(valor)) fallas.push(`${que} = ${valor.toFixed(2)}, tiene que ser ${umbral}`);
  };
  if (kind === 'variante') {
    const min = gambit ? MIN_GAMBITO : MIN_VARIANTE;
    chequear(evals.final, (v) => v >= min, 'final de la variante', `>= ${min}`);
  } else if (kind === 'favor') {
    chequear(evals.previa, (v) => v >= MIN_PREVIA_FAVOR, 'posición previa al error del rival', `>= ${MIN_PREVIA_FAVOR}`);
    chequear(evals.final, (v) => v >= MIN_FAVOR, 'final de la trampa a favor', `>= ${MIN_FAVOR}`);
  } else {
    chequear(evals.correcta, (v) => v >= MIN_CONTRA_CORRECTA, 'jugada correcta', `>= ${MIN_CONTRA_CORRECTA}`);
    chequear(evals.caida, (v) => v <= MAX_CONTRA_CAIDA, 'final de la caída', `<= ${MAX_CONTRA_CAIDA}`);
  }
  return fallas;
}

/** Una entrada de verificacion.json vale solo con la versión actual y el hash de la ficha. */
export function entradaVigente(entrada: { version?: number; hash: string } | undefined, hash: string): boolean {
  return entrada?.version === VERSION_VERIFICACION && entrada.hash === hash;
}
