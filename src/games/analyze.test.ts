import { describe, expect, it } from 'vitest';
import { analyzeGame } from './analyze';
import { edgeAt, repoFrom } from '../test/helpers';

const REP = '1. e4 e5 2. Nf3 Nc6 (2... d6 3. d4) 3. Bb5 a6 4. Ba4 *';

describe('análisis de partidas', () => {
  const { graph } = repoFrom(REP, 'white');

  it('detecta tu desvío y apunta a la tarjeta', () => {
    const r = analyzeGame('1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 *', graph);
    expect(r.outcome).toMatchObject({ kind: 'myDeviation', ply: 4, playedSan: 'Bc4', expectedSan: 'Bb5' });
    if (r.outcome.kind === 'myDeviation') {
      expect(r.outcome.cardId).toBe(edgeAt(graph, ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5']).id);
    }
  });

  it('detecta la novedad del rival como hueco', () => {
    const r = analyzeGame('1. e4 e5 2. Nf3 f5 3. exf5 *', graph);
    expect(r.outcome).toMatchObject({ kind: 'gap', ply: 3, playedSan: 'f5' });
    expect(r.gap?.san).toBe('f5');
  });

  it('fin de la preparación sin salirse', () => {
    const r = analyzeGame('1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O *', graph);
    expect(r.outcome).toEqual({ kind: 'endOfBook', ply: 7 });
  });

  it('partida que termina dentro del repertorio', () => {
    expect(analyzeGame('1. e4 e5 2. Nf3 *', graph).outcome).toEqual({ kind: 'inBook' });
  });

  it('desvío en la primera jugada', () => {
    expect(analyzeGame('1. d4 d5 *', graph).outcome).toMatchObject({ kind: 'myDeviation', ply: 0 });
  });

  it('con negras: el grafo negro y las jugadas del rival blanco', () => {
    const black = repoFrom('1. e4 c5 2. Nf3 d6 *', 'black').graph;
    expect(analyzeGame('1. d4 Nf6 *', black).outcome).toMatchObject({ kind: 'gap', ply: 0, playedSan: 'd4' });
    expect(analyzeGame('1. e4 e5 *', black).outcome).toMatchObject({ kind: 'myDeviation', ply: 1 });
  });

  it('las transposiciones se reconocen por posición', () => {
    const g = repoFrom('1. d4 d5 2. Nf3 Nf6 3. c4 *', 'white').graph;
    // Otro orden de jugadas que llega a la misma posición, pero 1.Nf3 no es mi jugada:
    expect(analyzeGame('1. Nf3 d5 2. d4 Nf6 3. c4 *', g).outcome).toMatchObject({ kind: 'myDeviation', ply: 0 });
  });
});
