import { describe, expect, it } from 'vitest';
import { INITIAL_EPD, playSan } from '../../chess/position';
import { defendsSquare } from './demo';

/** 1.e4 e5 2.Nf3: la posición de la demo, con el peón de e5 atacado. */
const DEMO_EPD = ['e4', 'e5', 'Nf3'].reduce((epd, san) => playSan(epd, san)!.epd, INITIAL_EPD);
const uci = (san: string) => playSan(DEMO_EPD, san)!.uci;

describe('demo de la bienvenida: ¿la jugada defiende e5?', () => {
  it.each(['Nc6', 'd6', 'Qe7', 'Qf6', 'Qg5', 'Bd6', 'f6'])('%s lo defiende', (san) => {
    expect(defendsSquare(DEMO_EPD, uci(san), 'e5')).toBe(true);
  });

  it.each(['Nf6', 'd5', 'Bc5', 'Qh4', 'Ne7', 'a6'])('%s no lo defiende', (san) => {
    expect(defendsSquare(DEMO_EPD, uci(san), 'e5')).toBe(false);
  });

  it('una jugada ilegal no defiende nada', () => {
    expect(defendsSquare(DEMO_EPD, 'e5e4', 'e5')).toBe(false);
  });

  it('sin atacante no hay nada que defender', () => {
    // 1.e4 e5: nadie ataca e5 todavía, aunque 2...Nc6 lo cubriría.
    const epd = playSan(playSan(INITIAL_EPD, 'e4')!.epd, 'e5')!.epd;
    const tras = playSan(epd, 'd3')!.epd;
    expect(defendsSquare(tras, playSan(tras, 'Nc6')!.uci, 'e5')).toBe(false);
  });
});
