import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS } from '../../types';
import { needsInstallStep, shouldMarkIntroSeen, shouldShowIntro } from './gate';

describe('puerta de la bienvenida', () => {
  it('la bienvenida se muestra solo sin tarjetas ni marca', () => {
    expect(shouldShowIntro(DEFAULT_SETTINGS, 0)).toBe(true);
    expect(shouldShowIntro(DEFAULT_SETTINGS, 12)).toBe(false);
    expect(shouldMarkIntroSeen(DEFAULT_SETTINGS, 12)).toBe(true);
    expect(shouldShowIntro({ ...DEFAULT_SETTINGS, introSeenAt: 1 }, 0)).toBe(false);
  });

  it('quien ya la vio no se vuelve a marcar, y sin tarjetas tampoco', () => {
    expect(shouldMarkIntroSeen({ ...DEFAULT_SETTINGS, introSeenAt: 1 }, 12)).toBe(false);
    expect(shouldMarkIntroSeen(DEFAULT_SETTINGS, 0)).toBe(false);
  });

  it('el paso de instalar es solo para iOS sin instalar', () => {
    expect(needsInstallStep('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)', false)).toBe(true);
    expect(needsInstallStep('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)', true)).toBe(false);
    expect(needsInstallStep('Mozilla/5.0 (Windows NT 10.0; Win64; x64)', false)).toBe(false);
  });
});
