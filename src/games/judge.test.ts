import { describe, expect, it } from 'vitest';
import { judgeMove } from './judge';

describe('judgeMove: tu jugada según el motor', () => {
  it('perder poco en una posición pareja es una jugada sana', () => {
    expect(judgeMove({ cp: 30 }, { cp: 10 }, 'white')).toMatchObject({ verdict: 'bien', loss: 0.2 });
  });

  it('en una posición pareja, perder más es imprecisión, error o error grave', () => {
    expect(judgeMove({ cp: 20 }, { cp: -60 }, 'white').verdict).toBe('imprecision');
    expect(judgeMove({ cp: 20 }, { cp: -120 }, 'white').verdict).toBe('error');
    expect(judgeMove({ cp: 20 }, { cp: -300 }, 'white').verdict).toBe('grave');
  });

  it('mide desde tu lado: con negras, que las blancas mejoren es tu pérdida', () => {
    expect(judgeMove({ cp: -20 }, { cp: 280 }, 'black')).toMatchObject({ verdict: 'grave', loss: 3, after: -2.8 });
    expect(judgeMove({ cp: 50 }, { cp: -40 }, 'black')).toMatchObject({ verdict: 'bien', loss: 0 });
  });

  it('con mucha ventaja, perder un peón no es un error', () => {
    expect(judgeMove({ cp: 900 }, { cp: 800 }, 'white').verdict).toBe('bien');
  });

  it('dejarse dar mate es error grave, y el mate cuenta como ±100 en `after`', () => {
    expect(judgeMove({ cp: 0 }, { mate: -2 }, 'white')).toMatchObject({ verdict: 'grave', after: -99.8 });
    expect(judgeMove({ mate: 3 }, { mate: 2 }, 'white').verdict).toBe('bien');
  });
});
