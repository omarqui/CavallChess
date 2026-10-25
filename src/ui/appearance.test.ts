import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, type Settings } from '../types';
import { APPEARANCE_VERSION, appearanceMigration } from './appearance';

const before = (patch: Partial<Settings>): Settings => ({ ...DEFAULT_SETTINGS, ...patch });

describe('migración al tema estilo Chess.com', () => {
  it('Madera + Clásicas (los valores por defecto anteriores) pasan a Verde + Papercut gris', () => {
    expect(appearanceMigration(before({ boardTheme: 'brown', pieceSet: 'cburnett' }))).toEqual({
      appearanceVersion: APPEARANCE_VERSION,
      boardTheme: 'green',
      pieceSet: 'papercut-gris',
    });
  });

  it('otra elección se respeta: solo queda la marca', () => {
    expect(appearanceMigration(before({ boardTheme: 'blue', pieceSet: 'merida' }))).toEqual({ appearanceVersion: APPEARANCE_VERSION });
    expect(appearanceMigration(before({ boardTheme: 'brown', pieceSet: 'chessnut' }))).toEqual({ appearanceVersion: APPEARANCE_VERSION });
    expect(appearanceMigration(before({ boardTheme: 'slate', pieceSet: 'cburnett' }))).toEqual({ appearanceVersion: APPEARANCE_VERSION });
  });

  it('una instalación nueva solo guarda la marca', () => {
    expect(appearanceMigration(DEFAULT_SETTINGS)).toEqual({ appearanceVersion: APPEARANCE_VERSION });
  });

  it('se hace una sola vez: después, Madera + Clásicas elegidas a mano se quedan', () => {
    expect(appearanceMigration(before({ appearanceVersion: APPEARANCE_VERSION, boardTheme: 'brown', pieceSet: 'cburnett' }))).toBeNull();
  });
});
