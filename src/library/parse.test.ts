import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { FICHA_PRUEBA } from './fixture';
import { parseFicha } from './parse';
import { GROUPS, validateFicha, validateLibrary } from './validate';
import type { Ficha } from './types';

const ok = (md: string): Ficha => {
  const r = parseFicha(md);
  expect(r.errors).toEqual([]);
  return r.ficha!;
};
const f = ok(FICHA_PRUEBA);
const line = (id: string) => f.lines.find((l) => l.id === id)!;

describe('parseFicha', () => {
  it('lee identidad, secciones y líneas', () => {
    expect(f.side).toBe('black');
    expect(f.aliases).toEqual(['Test Defense']);
    expect(f.start.map((m) => m.san)).toEqual(['e4', 'c6']);
    expect(f.tips).toHaveLength(2);
    expect(f.lines.map((l) => [l.id, l.kind, l.level])).toEqual([
      ['avance', 'variante', 'basica'],
      ['karpov', 'variante', 'club'],
      ['cambio', 'favor', 'club'],
      ['mate', 'contra', 'basica'],
    ]);
    expect(line('avance').moves[5].hint).toBe('Sacá el alfil antes de cerrar con e6.');
  });

  it('lee textos, comentarios y flechas', () => {
    expect(line('avance').intro).toMatch(/empujan/);
    expect(line('avance').outro).toMatch(/alfil/);
    expect(line('karpov').moves[5].comment).toBe('Cambiás el peón central.');
    expect(line('karpov').moves[5].shapes).toEqual([{ orig: 'd5', dest: 'e4', brush: 'green' }]);
    expect(line('cambio').moves[8].nags).toEqual([4]);
  });

  it('calcula la raíz de cada variante', () => {
    expect(line('avance').rootPly).toBe(5);
    expect(line('karpov').rootPly).toBe(5);
    expect(line('cambio').rootPly).toBeUndefined();
  });

  it('ubica las trampas', () => {
    expect(line('cambio').trapPly).toBe(8);
    expect(line('mate').trapPly).toBe(9);
    expect(line('mate').fall!.map((m) => m.san)).toEqual(['Ngf6', 'Nd6#']);
    expect(line('mate').fall![0].fromEpd).toBe(line('mate').moves[9].fromEpd);
  });

  it('acepta [basica] sin tilde y [gambito]', () => {
    const g = ok(FICHA_PRUEBA.replace('{#avance} [básica]', '{#avance} [basica] [gambito]'));
    expect(g.lines[0].level).toBe('basica');
    expect(g.lines[0].gambit).toBe(true);
  });
});

describe('validateFicha', () => {
  it('la ficha de prueba es válida', () => expect(validateFicha(f)).toEqual([]));

  it('la guía de contenido trae un ejemplo que pasa el validador', () => {
    const md = readFileSync('content/biblioteca/README.md', 'utf8');
    const m = /````markdown\r?\n([\s\S]*?)\r?\n````/.exec(md);
    expect(m).not.toBeNull();
    const g = ok(m![1]);
    expect(validateFicha(g)).toEqual([]);
    expect(GROUPS[g.side]).toContain(g.group);
  });

  const quitarConsejos = (s: string) => s.replace(/## Consejos\n(?:- .*\n)+/, '');
  it.each([
    ['jugada ilegal', (s: string) => s.replace('4. Nf3 e6', '4. Nf3 e5'), /ilegal/],
    [
      'dos jugadas propias distintas en la misma posición',
      (s: string) => s.replace('3. e5 Bf5 {', '3. e5 Bg4 {'),
      /coherencia/i,
    ],
    ['trampa a favor sin ? en el rival', (s: string) => s.replace('5. Bd3??', '5. Bd3'), /trampa/i],
    [
      'trampa en contra con dos variantes',
      (s: string) => s.replace('(5... Ngf6?? 6. Nd6#)', '(5... Ngf6?? 6. Nd6#) (5... Nb6)'),
      /trampa/i,
    ],
    [
      'línea que no empieza con las jugadas de la ficha',
      (s: string) =>
        s.replace('1. e4 c6 2. d4 d5 3. e5 Bf5 { [%hint Sacá el alfil antes de cerrar con e6.] } 4. Nf3 e6', '1. d4 d5 2. c4 e6'),
      /empieza/i,
    ],
    ['sin Consejos', quitarConsejos, /Consejos/],
    ['id de línea repetido', (s: string) => s.replace('{#karpov}', '{#avance}'), /repetid/i],
    ['hint en jugada del rival', (s: string) => s.replace('3. e5 Bf5 {', '3. e5 { [%hint no] } Bf5 {'), /hint/i],
  ])('rechaza: %s', (_caso, cambiar, msg) => {
    const md = cambiar(FICHA_PRUEBA);
    expect(md).not.toBe(FICHA_PRUEBA);
    const r = parseFicha(md);
    const errores = [...r.errors, ...(r.ficha ? validateFicha(r.ficha) : [])];
    expect(errores.join('\n')).toMatch(msg);
    expect(errores.join('\n')).toMatch(/prueba/);
  });

  it('un bloque pgn con líneas en blanco es una sola partida', () => {
    const g = ok(FICHA_PRUEBA.replace('3. Nc3 dxe4 { Cambiás', '3. Nc3\n\n  \ndxe4 { Cambiás'));
    expect(g.lines[1].moves.map((m) => m.uci)).toEqual(line('karpov').moves.map((m) => m.uci));
  });

  it('rechaza un comentario antes de la primera jugada', () => {
    const md = FICHA_PRUEBA.replace('1. e4 c6 2. d4 d5 3. e5 Bf5 {', '{ Intro perdida } 1. e4 c6 2. d4 d5 3. e5 Bf5 {');
    const r = parseFicha(md);
    expect(r.ficha).toBeUndefined();
    expect(r.errors.join('\n')).toMatch(/prueba, línea avance.*antes de la primera jugada/);
  });

  it('acepta el cierre del frontmatter con espacios al final', () => {
    ok(FICHA_PRUEBA.replace('Ficha de prueba.\n---\n', 'Ficha de prueba.\n--- \n'));
  });

  it('nombrar-raiz: no apaga el nombre en la posición de la ficha; por defecto está prendido', () => {
    const con = (v: string) => FICHA_PRUEBA.replace('resumen: Ficha de prueba.', `resumen: Ficha de prueba.\nnombrar-raiz: ${v}`);
    expect(f.nameAtStart).toBe(true);
    expect(ok(con('no')).nameAtStart).toBe(false);
    expect(ok(con('sí')).nameAtStart).toBe(true);
    expect(ok(con('si')).nameAtStart).toBe(true);
  });

  it('nombrar-raiz con otro valor es un error', () => {
    const r = parseFicha(FICHA_PRUEBA.replace('resumen: Ficha de prueba.', 'resumen: Ficha de prueba.\nnombrar-raiz: quizás'));
    expect(r.ficha).toBeUndefined();
    expect(r.errors.join('\n')).toMatch(/nombrar-raiz/);
  });

  it('rechaza un grupo que no es del lado', () => {
    const r = parseFicha(FICHA_PRUEBA.replace('grupo: Contra 1.e4', 'grupo: Abrís con 1.e4'));
    expect(validateFicha(r.ficha!).join('\n')).toMatch(/grupo/);
  });
});

describe('validateLibrary', () => {
  it('detecta ids y posiciones repetidos', () => {
    expect(validateLibrary([f])).toEqual([]);
    const errores = validateLibrary([f, f]).join('\n');
    expect(errores).toMatch(/id de ficha repetido/);
    expect(errores).toMatch(/orden 1/);
  });
});
