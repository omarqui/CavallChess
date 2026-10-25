import { describe, expect, it } from 'vitest';
import { buildImportPlan, type ImportPlan } from '../chess/pgnImport';
import { INITIAL_EPD, playSan, type Side } from '../chess/position';
import { buildFromGames, resultScore, type GameForBuild } from './aggregate';
import { gameMoves, gameMovesUntil, gamePgnUntil } from './gamePgn';

const EMPTY = { mine: new Map<string, { uci: string; san: string }>(), nodeIds: new Set<string>() };

/** Una partida como las que devuelve Chess.com: encabezados y relojes en los comentarios. */
const CHESSCOM = `[Event "Live Chess"]
[Site "Chess.com"]
[Date "2026.10.01"]
[White "tester"]
[Black "rival"]
[Result "1-0"]
[ECO "C50"]
[TimeControl "180"]
[Termination "tester ganó por abandono"]

1. e4 {[%clk 0:02:59.9]} 1... e5 {[%clk 0:02:58.1]} 2. Nf3 {[%clk 0:02:57.0]} 2... Nc6 {[%clk 0:02:55.3]} 3. Bc4 {[%clk 0:02:54.2]} 3... Bc5 {[%clk 0:02:50.0]} 4. O-O {[%clk 0:02:49.1]} 4... Nf6 {[%clk 0:02:45.7]} 1-0`;

/** Otra posición inicial (después de 1. e4), como una partida desde posición o de Chess960. */
const FROM_FEN = `[Event "Live Chess"]
[White "tester"]
[Black "rival"]
[SetUp "1"]
[FEN "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1"]

1... e5 2. Nf3 *`;

/** El SAN de la línea, jugada por jugada, para comparar con lo que devuelve `gameMoves`. */
function sansToEpds(sans: string[]) {
  let epd = INITIAL_EPD;
  return sans.map((san) => {
    const played = playSan(epd, san)!;
    const out = { san: played.san, uci: played.uci, fromEpd: epd, epd: played.epd };
    epd = played.epd;
    return out;
  });
}

/** El texto de las jugadas. makePgn deja un espacio dentro de los paréntesis de cada variante. */
const movetext = (pgn: string) => pgn.split('\n\n')[1].trim();

let clock = 10_000;
function game(moves: string, result = 'win', extra: Partial<GameForBuild> = {}): GameForBuild {
  return { pgn: `${moves} *`, myColor: 'white', result, endTime: (clock += 1000), ...extra };
}
const times = (n: number, g: () => GameForBuild) => Array.from({ length: n }, g);

/** Cada posición propia del plan tiene a lo sumo una jugada. */
function ownMovesPerPosition(plan: ImportPlan) {
  const byFrom = new Map<string, string[]>();
  for (const e of plan.edges.values()) {
    if (!e.mine) continue;
    byFrom.set(e.fromEpd, [...(byFrom.get(e.fromEpd) ?? []), e.san]);
  }
  return [...byFrom.values()];
}

describe('jugadas de una partida', () => {
  it('gameMoves da EPD y UCI de cada jugada; null con FEN inicial distinto', () => {
    const moves = gameMoves(CHESSCOM);
    expect(moves).toEqual(sansToEpds(['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'O-O', 'Nf6']));
    expect(moves![0]).toMatchObject({ san: 'e4', uci: 'e2e4', fromEpd: INITIAL_EPD });
    // El enroque va normalizado como en chessops (rey→torre), igual que los ids de las jugadas.
    expect(moves![6]).toMatchObject({ san: 'O-O', uci: 'e1h1' });
    // Sin casilla al paso cuando la captura no es legal (la clave de posición de la app).
    expect(moves![0].epd).toBe('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq -');

    // Review Focus 4: una partida que no arranca en la posición inicial no se usa.
    expect(gameMoves(FROM_FEN)).toBeNull();
    // Un [FEN] que es la posición inicial sí vale.
    const initialFen = '[SetUp "1"]\n[FEN "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"]\n\n1. d4 d5 *';
    expect(gameMoves(initialFen)?.map((m) => m.san)).toEqual(['d4', 'd5']);
    // Una jugada ilegal en la línea principal o un texto que no es PGN: tampoco.
    expect(gameMoves('1. e4 e5 2. Ke3 Nc6 *')).toBeNull();
    expect(gameMoves('')).toBeNull();
    expect(gameMoves('[FEN "esto no es un FEN"]\n\n1. e4 *')).toBeNull();
  });

  it('gamePgnUntil corta en la jugada pedida y buildImportPlan lo lee', () => {
    const pgn = gamePgnUntil(CHESSCOM, 3)!;
    expect(pgn).toBe('[Event "tester vs rival"]\n\n1. e4 e5 2. Nf3 *\n');
    expect(pgn).not.toContain('[FEN');
    expect(pgn).not.toContain('%clk');

    const plan = buildImportPlan(pgn, 'white', EMPTY);
    expect(plan.errors).toEqual([]);
    expect(plan.chapters).toHaveLength(1);
    expect(plan.chapters[0].mainline.map((p) => p.san)).toEqual([undefined, 'e4', 'e5', 'Nf3']);
    expect([...plan.edges.values()].map((e) => [e.san, e.mine])).toEqual([
      ['e4', true],
      ['e5', false],
      ['Nf3', true],
    ]);

    // Con negras se lee igual: tus jugadas son las de negras.
    const black = buildImportPlan(gamePgnUntil(CHESSCOM, 4)!, 'black', EMPTY);
    expect(black.errors).toEqual([]);
    expect([...black.edges.values()].filter((e) => e.mine).map((e) => e.san)).toEqual(['e5', 'Nc6']);

    // Más jugadas que las de la partida: la partida entera, con el enroque en SAN.
    expect(movetext(gamePgnUntil(CHESSCOM, 99)!)).toBe('1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. O-O Nf6 *');
    expect(gamePgnUntil(FROM_FEN, 2)).toBeNull();
    // La partida se valida entera aunque se corte antes: una jugada ilegal después del corte también la descarta.
    expect(gamePgnUntil('[White "a"]\n[Black "b"]\n\n1. e4 e5 2. Ke3 *', 1)).toBeNull();
    expect(gameMovesUntil('1. e4 e5 2. Ke3 *', 1)).toBeNull();
    expect(gameMovesUntil(CHESSCOM, 2)).toEqual(gameMoves(CHESSCOM)!.slice(0, 2));
    expect(movetext(gamePgnUntil(CHESSCOM, Number('no es un número'))!)).toBe('*');
  });
});

describe('repertorio desde muchas partidas', () => {
  const opts = { maxOwnMoves: 8, minRival: 1 };
  const ownFirst = (games: GameForBuild[], side: Side = 'white') =>
    buildImportPlan(buildFromGames(games, side, opts).pgn, side, EMPTY);

  it('buildFromGames elige tu jugada más jugada y desempata por resultado', () => {
    // Más partidas gana, aunque los resultados sean peores.
    const byCount = buildFromGames(
      [...times(3, () => game('1. e4', 'resigned')), ...times(2, () => game('1. d4', 'win'))],
      'white',
      opts,
    );
    expect(movetext(byCount.pgn)).toBe('1. e4 *');
    expect(byCount.pgn.startsWith('[Event "Desde tus partidas"]\n\n')).toBe(true);
    expect(byCount.gamesUsed).toBe(3);

    // Empate en partidas: mejor puntaje medio. Tablas valen 0,5 y una derrota 0.
    const byScore = buildFromGames(
      [game('1. e4', 'win'), game('1. e4', 'resigned'), game('1. d4', 'stalemate'), game('1. d4', 'timeout')],
      'white',
      opts,
    );
    expect(movetext(byScore.pgn)).toBe('1. e4 *');
    const drawsCount = buildFromGames(
      [game('1. d4', 'checkmated'), game('1. d4', 'abandoned'), game('1. e4', 'agreed'), game('1. e4', 'repetition')],
      'white',
      opts,
    );
    expect(movetext(drawsCount.pgn)).toBe('1. e4 *');
    expect(['agreed', 'repetition', 'stalemate', 'insufficient', '50move', 'timevsinsufficient'].map(resultScore)).toEqual(
      Array(6).fill(0.5),
    );
    expect(['win', 'resigned', 'timeout', 'checkmated', 'abandoned', 'lose'].map(resultScore)).toEqual([1, 0, 0, 0, 0, 0]);

    // Cuenta partidas, no veces: la que repite 1. Nf3 tres veces pesa como una.
    const once = buildFromGames(
      [game('1. Nf3 Nf6 2. Ng1 Ng8 3. Nf3 Nf6 4. Ng1 Ng8 5. Nf3', 'win'), ...times(2, () => game('1. e4', 'resigned'))],
      'white',
      opts,
    );
    expect(movetext(once.pgn)).toBe('1. e4 *');

    // Empate también en puntaje: orden alfabético del SAN (d4 antes que Nf3).
    const alpha = buildFromGames(
      [game('1. Nf3', 'insufficient'), game('1. Nf3', '50move'), game('1. d4', 'win'), game('1. d4', 'resigned')],
      'white',
      opts,
    );
    expect(movetext(alpha.pgn)).toBe('1. d4 *');

    // Una sola jugada propia aunque haya varias, y con negras igual.
    const plan = ownFirst(
      [
        game('1. e4 c5', 'win', { myColor: 'black' }),
        game('1. e4 c5', 'timevsinsufficient', { myColor: 'black' }),
        game('1. e4 e5', 'win', { myColor: 'black' }),
      ],
      'black',
    );
    expect(plan.ignoredOwnVariations).toBe(0);
    expect([...plan.edges.values()].map((e) => [e.san, e.mine])).toEqual([
      ['e4', false],
      ['c5', true],
    ]);
  });

  it('buildFromGames incluye respuestas del rival desde minRival y respeta maxOwnMoves', () => {
    const games = [
      ...times(3, () => game('1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6')),
      ...times(2, () => game('1. e4 c5 2. Nf3 d6 3. d4 cxd4')),
      game('1. e4 e6 2. d4 d5'),
      game('1. d4 d5 2. c4'), // nunca entra: tu jugada en la inicial es 1. e4
    ];

    // minRival 2: 1... e6 se jugó una sola vez y queda afuera. Dos jugadas propias por rama.
    const two = buildFromGames(games, 'white', { maxOwnMoves: 2, minRival: 2 });
    expect(movetext(two.pgn)).toBe('1. e4 e5 ( 1... c5 2. Nf3 ) 2. Nf3 *');
    // La de 1... e6 aportó 1. e4; la de 1. d4, nada.
    expect(two.gamesUsed).toBe(6);
    const plan = buildImportPlan(two.pgn, 'white', EMPTY);
    expect(plan.errors).toEqual([]);
    expect(plan.ignoredOwnVariations).toBe(0);
    expect([...plan.edges.values()].filter((e) => e.mine)).toHaveLength(3);
    expect([...plan.edges.values()].filter((e) => !e.mine)).toHaveLength(2);

    // minRival 1 y tres jugadas propias: entra 1... e6 y cada rama corta en tu tercera jugada.
    const three = buildFromGames(games, 'white', { maxOwnMoves: 3, minRival: 1 });
    expect(movetext(three.pgn)).toBe('1. e4 e5 ( 1... c5 2. Nf3 d6 3. d4 ) ( 1... e6 2. d4 d5 ) 2. Nf3 Nc6 3. Bb5 *');
    expect(buildImportPlan(three.pgn, 'white', EMPTY).ignoredOwnVariations).toBe(0);

    // Con negras la inicial es del rival: sus variantes van con el número de jugada de blancas.
    const black = buildFromGames(
      [
        ...times(3, () => game('1. e4 c5 2. Nf3 d6 3. d4', 'win', { myColor: 'black' })),
        ...times(2, () => game('1. d4 Nf6 2. c4 e6 3. Nc3', 'win', { myColor: 'black' })),
      ],
      'black',
      { maxOwnMoves: 2, minRival: 2 },
    );
    expect(movetext(black.pgn)).toBe('1. e4 ( 1. d4 Nf6 2. c4 e6 ) 1... c5 2. Nf3 d6 *');
    const blackPlan = buildImportPlan(black.pgn, 'black', EMPTY);
    expect(blackPlan.errors).toEqual([]);
    expect(blackPlan.ignoredOwnVariations).toBe(0);
    expect([...blackPlan.edges.values()].filter((e) => e.mine).map((e) => e.san)).toEqual(['c5', 'd6', 'Nf6', 'e6']);
  });

  it('buildFromGames con transposiciones y repeticiones termina y deja una jugada propia por posición', () => {
    // Las dos órdenes llegan a la misma posición después de 2... e6 / 2... Nf6. Por la orden de 1... e6
    // solo se jugó 3. Nf3; contando por posición (EPD) gana 3. Nc3 en las dos ramas.
    const transpositions = [
      ...times(3, () => game('1. d4 Nf6 2. c4 e6 3. Nc3 Bb4 4. Qc2', 'win')),
      ...times(2, () => game('1. d4 e6 2. c4 Nf6 3. Nf3 d5 4. Nc3', 'win')),
    ];
    const t = buildFromGames(transpositions, 'white', { maxOwnMoves: 4, minRival: 1 });
    expect(movetext(t.pgn)).toBe('1. d4 Nf6 ( 1... e6 2. c4 Nf6 3. Nc3 Bb4 4. Qc2 ) 2. c4 e6 3. Nc3 Bb4 4. Qc2 *');
    expect(t.gamesUsed).toBe(5);
    const plan = buildImportPlan(t.pgn, 'white', EMPTY);
    expect(plan.errors).toEqual([]);
    expect(plan.ignoredOwnVariations).toBe(0);
    for (const sans of ownMovesPerPosition(plan)) expect(sans).toHaveLength(1);

    // Repeticiones: los caballos van y vuelven. La rama se corta antes de volver a una posición de la rama,
    // aunque la profundidad deje seguir.
    const repetitions = times(3, () => game('1. Nf3 Nf6 2. Ng1 Ng8 3. Nf3 Nf6 4. Ng1 Ng8 5. Nf3 Nf6', 'repetition'));
    const r = buildFromGames(repetitions, 'white', { maxOwnMoves: 15, minRival: 1 });
    expect(movetext(r.pgn)).toBe('1. Nf3 Nf6 2. Ng1 *');
    const rPlan = buildImportPlan(r.pgn, 'white', EMPTY);
    expect(rPlan.ignoredOwnVariations).toBe(0);
    for (const sans of ownMovesPerPosition(rPlan)) expect(sans).toHaveLength(1);

    // Las dos cosas juntas, con muchas partidas: termina y sigue habiendo una jugada propia por posición.
    const mixed = buildFromGames(
      [...transpositions, ...repetitions, ...times(4, () => game('1. d4 Nf6 2. Nf3 e6 3. c4 Bb4+ 4. Bd2'))],
      'white',
      { maxOwnMoves: 15, minRival: 1 },
    );
    const mixedPlan = buildImportPlan(mixed.pgn, 'white', EMPTY);
    expect(mixedPlan.errors).toEqual([]);
    expect(mixedPlan.ignoredOwnVariations).toBe(0);
    for (const sans of ownMovesPerPosition(mixedPlan)) expect(sans).toHaveLength(1);
  });

  it('buildFromGames ignora otro color y partidas viejas', () => {
    const since = 50_000;
    const games = [
      game('1. e4 e5', 'win', { endTime: 60_000 }),
      ...times(3, () => game('1. d4 d5', 'win', { myColor: 'black', endTime: 60_000 })),
      ...times(3, () => game('1. c4 e5', 'win', { endTime: 1_000 })),
      // Desde otra posición (Review Focus 4), con una jugada ilegal o ilegible: tampoco cuentan.
      ...times(3, () => ({ ...game('', 'win', { endTime: 60_000 }), pgn: FROM_FEN })),
      ...times(3, () => game('1. Nf3 d5 2. Ke3', 'win', { endTime: 60_000 })),
      game('no es un pgn', 'win', { endTime: 60_000 }),
    ];
    const recent = buildFromGames(games, 'white', { maxOwnMoves: 8, minRival: 1, since });
    expect(movetext(recent.pgn)).toBe('1. e4 e5 *');
    expect(recent.gamesUsed).toBe(1);

    // Sin `since` entran las viejas.
    const all = buildFromGames(games, 'white', { maxOwnMoves: 8, minRival: 1 });
    expect(movetext(all.pgn)).toBe('1. c4 e5 *');
    expect(all.gamesUsed).toBe(3);

    // Nada que armar: PGN vacío.
    expect(buildFromGames(games, 'white', { maxOwnMoves: 8, minRival: 1, since: 100_000 })).toEqual({
      pgn: '',
      gamesUsed: 0,
    });
    expect(buildFromGames([], 'black', opts)).toEqual({ pgn: '', gamesUsed: 0 });
    // Aunque la jugada ilegal quede más allá de la profundidad pedida.
    expect(buildFromGames([game('1. Nf3 d5 2. Ke3')], 'white', { maxOwnMoves: 1, minRival: 1 }).pgn).toBe('');
  });
});
