import { describe, expect, it } from 'vitest';
import { gamePath, returnPath, sentence } from './format';

describe('returnPath', () => {
  it('acepta la ruta del visor de una partida', () => {
    const p = gamePath('https://www.chess.com/game/live/123');
    expect(returnPath(p)).toBe(p);
  });

  it('rechaza cualquier otra cosa: sin valor, otra pantalla, url externa o subrutas', () => {
    for (const v of [null, undefined, '', '/', '/settings', 'https://evil.example', '//evil.example', '/games', '/games/', '/games/x/agregar', '/games/x?y=1', '/games/x\\y']) {
      expect(returnPath(v)).toBeUndefined();
    }
  });
});

describe('sentence', () => {
  it('no duplica el punto final', () => {
    expect(sentence('Falló.')).toBe('Falló.');
    expect(sentence('Falló')).toBe('Falló.');
  });
});
