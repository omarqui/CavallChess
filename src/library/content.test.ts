import { describe, expect, it } from 'vitest';
import { sources } from './bundle';
import { parseLibrary } from './catalog';
import { validateFicha, validateLibrary } from './validate';

describe('contenido de la biblioteca', () => {
  it('todas las fichas parsean y validan sin errores', () => {
    const { fichas, errors } = parseLibrary(sources);
    const todos = [...errors, ...fichas.flatMap(validateFicha), ...validateLibrary(fichas)];
    expect(todos).toEqual([]);
  });
});
