import { describe, expect, it } from 'vitest';
import verificacion from '../../content/biblioteca/verificacion.json';
import type { Side } from '../chess/position';
import { INTRO_CHOICES } from '../screens/intro/choices';
import { emptyRepo, importInto, type Repo } from '../test/helpers';
import { sources } from './bundle';
import { parseLibrary } from './catalog';
import { fichaHash } from './hash';
import { fichaPgn } from './pgn';
import { validateFicha, validateLibrary } from './validate';

describe('contenido de la biblioteca', () => {
  it('todas las fichas parsean y validan sin errores', () => {
    const { fichas, errors } = parseLibrary(sources);
    const todos = [...errors, ...fichas.flatMap(validateFicha), ...validateLibrary(fichas)];
    expect(todos).toEqual([]);
  });

  it('cada ficha tiene una verificación vigente', () => {
    const { fichas } = parseLibrary(sources);
    const registro = verificacion as Record<string, { hash: string }>;
    const vencidas = fichas.filter((f) => registro[f.id]?.hash !== fichaHash(f)).map((f) => f.id);
    expect(
      vencidas,
      `Fichas sin verificación vigente: ${vencidas.join(', ')}. Corré MOTOR=1 npm run biblioteca:motor (PowerShell: $env:MOTOR=1)`,
    ).toEqual([]);
  });

  it('las fichas de la bienvenida existen, son del lado correcto y no chocan entre sí', () => {
    const { fichas } = parseLibrary(sources);
    const byId = new Map(fichas.map((f) => [f.id, f]));
    const SIDE: Record<(typeof INTRO_CHOICES)[number]['key'], Side> = { white: 'white', blackE4: 'black', blackD4: 'black' };

    for (const choice of INTRO_CHOICES) {
      expect(choice.options.length, choice.key).toBe(2);
      for (const o of choice.options) {
        expect(byId.has(o.fichaId), `falta la ficha ${o.fichaId}`).toBe(true);
        expect(byId.get(o.fichaId)!.side, o.fichaId).toBe(SIDE[choice.key]);
      }
    }

    // Cada combinación posible (una opción por grupo), importada en orden en repertorios vacíos por color.
    const combos = INTRO_CHOICES.reduce<string[][]>(
      (acc, c) => acc.flatMap((prev) => c.options.map((o) => [...prev, o.fichaId])),
      [[]],
    );
    expect(combos).toHaveLength(8);
    for (const combo of combos) {
      const repos: Record<Side, Repo> = { white: emptyRepo('white'), black: emptyRepo('black') };
      for (const id of combo) {
        const f = byId.get(id)!;
        const plan = importInto(repos[f.side], fichaPgn(f, f.lines.map((l) => l.id)), f.side);
        expect(plan.errors, `${combo.join(' + ')}: ${id}`).toEqual([]);
        expect(
          plan.conflicts.map((c) => `${c.line.join(' ')}: ${c.existingSan} / ${c.importedSan}`),
          `${combo.join(' + ')}: ${id}`,
        ).toEqual([]);
      }
    }
  });
});
