// Verificación de las fichas con Stockfish (solo con MOTOR=1). Reescribe content/biblioteca/verificacion.json.
import { readFileSync, writeFileSync } from 'node:fs';
import { afterAll, describe, expect, it } from 'vitest';
import { sources } from './bundle';
import { parseLibrary } from './catalog';
import { createNodeEngine } from './engine-node';
import { fichaHash } from './hash';
import type { Ficha, FichaLine } from './types';

const RUTA = new URL('../../content/biblioteca/verificacion.json', import.meta.url);
const PROFUNDIDAD = 18;

// Umbrales en peones, desde el lado de la ficha.
const MIN_VARIANTE = -0.7;
const MIN_GAMBITO = -1.5;
const MIN_FAVOR = 2.0;
const MIN_CONTRA_CORRECTA = -0.5;
const MAX_CONTRA_CAIDA = -2.0;

type Entrada = { hash: string; profundidad: number; fecha: string; evals: Record<string, number> };

describe.skipIf(!process.env.MOTOR)('verificación con Stockfish', () => {
  const engine = createNodeEngine();
  afterAll(() => engine.quit());

  it(
    'las fichas con hash desactualizado cumplen los umbrales',
    async () => {
      const { fichas } = parseLibrary(sources);
      const registro = JSON.parse(readFileSync(RUTA, 'utf8')) as Record<string, Entrada>;

      /** Eval en peones desde el lado de la ficha. */
      const peones = async (f: Ficha, epd: string) => {
        const cp = await engine.evaluate(epd, PROFUNDIDAD);
        return (f.side === 'white' ? cp : -cp) / 100;
      };

      const fallas: string[] = [];
      const verificar = async (f: Ficha, l: FichaLine, evals: Record<string, number>) => {
        const donde = `${f.id} / ${l.id}`;
        const chequear = (eval_: number, ok: boolean, que: string, umbral: string) => {
          if (!ok) fallas.push(`${donde}: ${que} = ${eval_.toFixed(2)}, tiene que ser ${umbral}`);
        };
        if (l.kind === 'variante') {
          const e = await peones(f, l.moves[l.moves.length - 1].epd);
          evals[l.id] = e;
          const min = l.gambit ? MIN_GAMBITO : MIN_VARIANTE;
          chequear(e, e >= min, 'final de la variante', `>= ${min}`);
        } else if (l.kind === 'favor') {
          const e = await peones(f, l.moves[l.moves.length - 1].epd);
          evals[l.id] = e;
          chequear(e, e >= MIN_FAVOR, 'final de la trampa a favor', `>= ${MIN_FAVOR}`);
        } else {
          const correcta = await peones(f, l.moves[l.trapPly!].epd);
          const caida = await peones(f, l.fall![l.fall!.length - 1].epd);
          // En la entrada queda la caída: es lo que la trampa promete.
          evals[l.id] = caida;
          chequear(correcta, correcta >= MIN_CONTRA_CORRECTA, 'jugada correcta', `>= ${MIN_CONTRA_CORRECTA}`);
          chequear(caida, caida <= MAX_CONTRA_CAIDA, 'final de la caída', `<= ${MAX_CONTRA_CAIDA}`);
        }
      };

      let cambio = false;
      for (const f of fichas) {
        if (registro[f.id]?.hash === fichaHash(f)) continue;
        const evals: Record<string, number> = {};
        const antes = fallas.length;
        for (const l of f.lines) await verificar(f, l, evals);
        for (const [id, v] of Object.entries(evals)) console.log(`${f.id} / ${id}: ${v.toFixed(2)}`);
        if (fallas.length === antes) {
          registro[f.id] = {
            hash: fichaHash(f),
            profundidad: PROFUNDIDAD,
            fecha: new Date().toLocaleDateString('sv-SE'),
            evals,
          };
          cambio = true;
        }
      }
      if (cambio) writeFileSync(RUTA, JSON.stringify(registro, null, 2) + '\n');
      expect(fallas, fallas.join('\n')).toEqual([]);
    },
    30 * 60 * 1000,
  );
});
