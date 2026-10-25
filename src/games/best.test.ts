import { describe, expect, it } from 'vitest';
import { repoFrom } from '../test/helpers';
import { analyzeBest } from './best';

describe('analyzeBest: la partida contra todos los repertorios del color', () => {
  const italiana = repoFrom('1. e4 e5 2. Nf3 Nc6 3. Bc4 *', 'white').graph;
  const londres = repoFrom('1. d4 d5 2. Bf4 Nf6 3. e3 *', 'white', 'rlondres').graph;

  it('se queda con el repertorio que la cubre', () => {
    const r = analyzeBest('1. d4 d5 2. Bf4 c5 *', [italiana, londres]);
    expect(r.rep).toBe('rlondres');
    expect(r.outcome).toMatchObject({ kind: 'gap', ply: 3, playedSan: 'c5' });
    expect(r.gap?.id.startsWith('rlondres|')).toBe(true);
  });

  it('un desvío lo es del repertorio que más lejos llegó', () => {
    const r = analyzeBest('1. e4 e5 2. Nf3 Nc6 3. Bb5 *', [londres, italiana]);
    expect(r.rep).toBe('white');
    expect(r.outcome).toMatchObject({ kind: 'myDeviation', ply: 4, expectedSan: 'Bc4' });
    if (r.outcome.kind === 'myDeviation') expect(r.outcome.cardId.startsWith('white|')).toBe(true);
  });

  it('dentro del libro le gana a cualquier salida', () => {
    expect(analyzeBest('1. d4 d5 *', [italiana, londres]).rep).toBe('rlondres');
  });

  it('si empatan, gana el preferido (el activo); sin preferido, el primero', () => {
    const copia = repoFrom('1. e4 e5 2. Nf3 Nc6 3. Bc4 *', 'white', 'rcopia').graph;
    expect(analyzeBest('1. e4 c5 *', [italiana, copia]).rep).toBe('white');
    expect(analyzeBest('1. e4 c5 *', [italiana, copia], 'rcopia').rep).toBe('rcopia');
  });

  it('fuera de todos queda fuera', () => {
    expect(analyzeBest('1. c4 e5 *', [italiana, londres]).outcome).toMatchObject({ kind: 'myDeviation', ply: 0 });
    expect(analyzeBest('1. c4 e5 *', [italiana, londres]).rep).toBe('white');
  });
});
