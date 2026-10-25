import { describe, expect, it } from 'vitest';
import verificacion from '../../content/biblioteca/verificacion.json';
import { sources } from './bundle';
import { parseLibrary } from './catalog';
import { fichaHash } from './hash';
import { entradaVigente } from './thresholds';
import { validateFicha, validateLibrary } from './validate';

describe('contenido de la biblioteca', () => {
  it('todas las fichas parsean y validan sin errores', () => {
    const { fichas, errors } = parseLibrary(sources);
    const todos = [...errors, ...fichas.flatMap(validateFicha), ...validateLibrary(fichas)];
    expect(todos).toEqual([]);
  });

  it('cada ficha tiene una verificación vigente', () => {
    const { fichas } = parseLibrary(sources);
    const registro = verificacion as Record<string, { version?: number; hash: string }>;
    const vencidas = fichas.filter((f) => !entradaVigente(registro[f.id], fichaHash(f))).map((f) => f.id);
    expect(
      vencidas,
      `Fichas sin verificación vigente: ${vencidas.join(', ')}. Corré MOTOR=1 npm run biblioteca:motor (PowerShell: $env:MOTOR=1)`,
    ).toEqual([]);
  });
});
