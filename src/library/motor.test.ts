// Verificación de las fichas con Stockfish (solo con MOTOR=1). Reescribe content/biblioteca/verificacion.json.
import { readFileSync, writeFileSync } from 'node:fs';
import { afterAll, describe, expect, it } from 'vitest';
import { sources } from './bundle';
import { parseLibrary } from './catalog';
import { createNodeEngine } from './engine-node';
import { fichaHash } from './hash';
import { checkLine, entradaVigente, VERSION_VERIFICACION, type Evals } from './thresholds';
import type { Ficha, FichaLine } from './types';

const RUTA = new URL('../../content/biblioteca/verificacion.json', import.meta.url);
const PROFUNDIDAD = 18;

type Entrada = {
  version?: number;
  hash: string;
  profundidad: number;
  fecha: string;
  evals: Record<string, number>;
};

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
        const e: Evals = {};
        if (l.kind === 'variante') {
          e.final = await peones(f, l.moves[l.moves.length - 1].epd);
          evals[l.id] = e.final;
        } else if (l.kind === 'favor') {
          e.final = await peones(f, l.moves[l.moves.length - 1].epd);
          // La posición que deja tu última jugada propia, justo antes del error del rival.
          e.previa = await peones(f, l.moves[l.trapPly!].fromEpd);
          evals[l.id] = e.final;
          evals[`${l.id}:previa`] = e.previa;
        } else {
          e.correcta = await peones(f, l.moves[l.trapPly!].epd);
          e.caida = await peones(f, l.fall![l.fall!.length - 1].epd);
          // En la entrada queda la caída: es lo que la trampa promete.
          evals[l.id] = e.caida;
        }
        for (const falla of checkLine(l.kind, l.gambit, e)) fallas.push(`${f.id} / ${l.id}: ${falla}`);
      };

      let cambio = false;
      for (const f of fichas) {
        if (entradaVigente(registro[f.id], fichaHash(f))) continue;
        const evals: Record<string, number> = {};
        const antes = fallas.length;
        for (const l of f.lines) await verificar(f, l, evals);
        for (const [id, v] of Object.entries(evals)) console.log(`${f.id} / ${id}: ${v.toFixed(2)}`);
        if (fallas.length === antes) {
          registro[f.id] = {
            version: VERSION_VERIFICACION,
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
