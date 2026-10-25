import { describe, expect, it } from 'vitest';
import { makePgn, parsePgn } from 'chessops/pgn';
import { FICHA_PRUEBA } from '../library/fixture';
import { parseFicha } from '../library/parse';
import { emptyRepo, graphOf, repoFrom } from '../test/helpers';
import { gameMoves } from './gamePgn';
import { libName, openingInsight } from './insight';

const ficha = parseFicha(FICHA_PRUEBA).ficha!;
const fichas = [ficha];
const empty = graphOf(emptyRepo('black'), 'black');

const movesOf = (pgn: string) => gameMoves(makePgn(parsePgn(pgn)[0]))!;

describe('openingInsight: la partida frente a la biblioteca', () => {
  it('sigue la variante de la ficha y dice hasta dónde llega la teoría', () => {
    const moves = movesOf('1. e4 c6 2. d4 d5 3. e5 Bf5 4. Nf3 e6 5. c3 Nd7');
    const r = openingInsight(moves, 'black', empty, fichas, null);
    expect(r.theory).toBe(8);
    expect(r.last?.line.id).toBe('avance');
    expect(r.name).toBe('Defensa de Prueba › Avance');
    expect(r.plies[5].comment).toBeUndefined();
    expect(r.plies[5].lib?.move.hint).toBe('Sacá el alfil antes de cerrar con e6.');
    expect(r.plies[8].lib).toBeUndefined();
    // La biblioteca conoce la posición de la salida: sigue con 5.Bd3 (la trampa a favor).
    expect(r.known.map((m) => m.san)).toEqual(['Bd3']);
  });

  it('elige la línea que más acompaña a la partida y trae su comentario', () => {
    const moves = movesOf('1. e4 c6 2. d4 d5 3. Nc3 dxe4 4. Nxe4 Nd7 5. Nf3 Ngf6');
    const r = openingInsight(moves, 'black', empty, fichas, null);
    expect(r.theory).toBe(10);
    expect(r.last && libName(r.last)).toBe('Defensa de Prueba › Karpov');
    expect(r.plies[5].comment).toBe('Cambiás el peón central.');
    expect(r.known).toEqual([]);
  });

  it('una partida que no pasa por la biblioteca no tiene teoría', () => {
    const r = openingInsight(movesOf('1. d4 d5'), 'black', empty, fichas, null);
    expect(r.theory).toBe(0);
    expect(r.last).toBeUndefined();
    expect(r.plies.every((p) => !p.lib)).toBe(true);
    // Solo mira las fichas del color con el que jugaste.
    expect(openingInsight(movesOf('1. e4 c6'), 'white', graphOf(emptyRepo('white'), 'white'), fichas, null).theory).toBe(0);
  });

  it('trampa a favor: el rival cae y la castigás, o no', () => {
    const fell = openingInsight(movesOf('1. e4 c6 2. d4 d5 3. e5 Bf5 4. Nf3 e6 5. Bd3 Bxd3'), 'black', empty, fichas, null);
    expect(fell.traps).toMatchObject([{ kind: 'favor', ply: 8, punished: true, line: { id: 'cambio' } }]);
    const missed = openingInsight(movesOf('1. e4 c6 2. d4 d5 3. e5 Bf5 4. Nf3 e6 5. Bd3 Nd7'), 'black', empty, fichas, null);
    expect(missed.traps).toMatchObject([{ kind: 'favor', punished: false, expectedSan: 'Bxd3' }]);
    const ended = openingInsight(movesOf('1. e4 c6 2. d4 d5 3. e5 Bf5 4. Nf3 e6 5. Bd3'), 'black', empty, fichas, null);
    expect(ended.traps[0]).toMatchObject({ kind: 'favor' });
    expect(ended.traps[0]).not.toHaveProperty('punished', expect.anything());
  });

  it('trampa en contra: la esquivás o caés (la caída no cuenta como teoría)', () => {
    const base = '1. e4 c6 2. d4 d5 3. Nc3 dxe4 4. Nxe4 Nd7 5. Qe2';
    const ok = openingInsight(movesOf(`${base} Ndf6`), 'black', empty, fichas, null);
    expect(ok.traps).toMatchObject([{ kind: 'esquivaste', ply: 9, line: { id: 'mate' } }]);
    const bad = openingInsight(movesOf(`${base} Ngf6 6. Nd6#`), 'black', empty, fichas, null);
    expect(bad.traps).toMatchObject([{ kind: 'caiste', ply: 9 }]);
    expect(bad.theory).toBe(9);
    expect(bad.plies[9].lib?.fall).toBe(true);
    expect(bad.plies[10].lib?.fall).toBe(true);
  });

  it('trae tus jugadas y nombra con tu repertorio, después con la biblioteca y por último con el ECO', () => {
    const { repo, graph } = repoFrom('1. e4 c6 { Mi explicación } 2. d4 d5', 'black');
    const moves = movesOf('1. e4 c6 2. d4 d5 3. f3');
    const eco = { [moves[4].epd]: 'B12 Caro-Kann: Fantasía' };
    const r = openingInsight(moves, 'black', graph, fichas, eco);
    expect(r.plies[1].edge).toMatchObject({ mine: true, explanation: 'Mi explicación' });
    expect(r.plies[4].edge).toBeUndefined();
    expect(r.plies[4].name).toBe('Caro-Kann: Fantasía');
    // La partida salió de la biblioteca en 3.f3: el resumen se queda con la ficha, en castellano, antes que el ECO.
    expect(r.name).toBe('Defensa de Prueba › Avance');
    expect(openingInsight(moves, 'black', graph, [], eco).name).toBe('Caro-Kann: Fantasía');

    const node = repo.nodes.get(graph.edges.get(r.plies[3].edge!.id)!.toId)!;
    repo.nodes.set(node.id, { ...node, name: 'Mi Caro-Kann' });
    expect(openingInsight(moves, 'black', graphOf(repo, 'black'), fichas, eco).name).toBe('Mi Caro-Kann');
  });
});
