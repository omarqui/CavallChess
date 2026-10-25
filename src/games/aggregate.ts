import { ChildNode, Node, type PgnNodeData } from 'chessops/pgn';
import { INITIAL_EPD, turnOf, type Side } from '../chess/position';
import { gameMovesUntil, writePgn } from './gamePgn';

/** Lo que hace falta de una partida para armar repertorio desde muchas. */
export interface GameForBuild {
  pgn: string;
  myColor: Side;
  /** Tu resultado, con el código de Chess.com ('win', 'agreed', 'resigned', …). */
  result: string;
  endTime: number;
}

export interface BuildOptions {
  /** Jugadas propias por rama: la rama termina en la que hace este número. */
  maxOwnMoves: number;
  /** Partidas mínimas para que entre una respuesta del rival. */
  minRival: number;
  /** Solo las partidas terminadas desde este momento (misma unidad que `endTime`). */
  since?: number;
}

const DRAWS = new Set(['agreed', 'repetition', 'stalemate', 'insufficient', '50move', 'timevsinsufficient']);

/** Puntaje de tu resultado: 1 si ganaste, 0,5 si fueron tablas, 0 si perdiste. */
export const resultScore = (result: string) => (result === 'win' ? 1 : DRAWS.has(result) ? 0.5 : 0);

interface MoveStat {
  san: string;
  /** Posición a la que lleva la jugada. */
  epd: string;
  /** Índices de las partidas que la jugaron, sin repetir. */
  games: number[];
  /** Suma de los puntajes de esas partidas. */
  score: number;
}

/** Más partidas, después mejor puntaje medio y después orden alfabético del SAN. */
function byOwnPreference(a: MoveStat, b: MoveStat) {
  return (
    b.games.length - a.games.length ||
    b.score / b.games.length - a.score / a.games.length ||
    a.san.localeCompare(b.san, 'en')
  );
}

/** Más partidas primero; en empate, orden alfabético del SAN para que el resultado no dependa del orden de entrada. */
function byRivalPreference(a: MoveStat, b: MoveStat) {
  return b.games.length - a.games.length || a.san.localeCompare(b.san, 'en');
}

/**
 * Arma un PGN de repertorio (una partida con variantes) desde tus partidas de `side`.
 * Cuenta las jugadas por posición (clave EPD, así que las transposiciones suman juntas); en tus posiciones
 * entra una sola jugada, la más jugada, y del rival entran las que se jugaron al menos `minRival` veces.
 * `gamesUsed` cuenta las partidas que aportaron al menos una jugada al árbol. Sin nada que armar, `pgn` es `''`.
 */
export function buildFromGames(
  games: GameForBuild[],
  side: Side,
  opts: BuildOptions,
): { pgn: string; gamesUsed: number } {
  const { maxOwnMoves, minRival, since } = opts;

  // Conteo por posición. Solo se cuenta hasta tu jugada número `maxOwnMoves` de cada partida (a lo sumo
  // 2 × maxOwnMoves medias jugadas): más allá el árbol no llega, y así ni el tiempo ni la memoria crecen
  // con el largo de las partidas. El resto de la partida se valida igual (`gameMovesUntil`).
  const stats = new Map<string, Map<string, MoveStat>>();
  games.forEach((g, gi) => {
    if (g.myColor !== side || (since !== undefined && g.endTime < since)) return;
    const moves = gameMovesUntil(g.pgn, 2 * maxOwnMoves);
    if (!moves) return;
    const score = resultScore(g.result);
    let own = 0;
    for (const m of moves) {
      if (own >= maxOwnMoves) break;
      let byUci = stats.get(m.fromEpd);
      if (!byUci) stats.set(m.fromEpd, (byUci = new Map()));
      let s = byUci.get(m.uci);
      if (!s) byUci.set(m.uci, (s = { san: m.san, epd: m.epd, games: [], score: 0 }));
      // Una partida con repeticiones puede jugar lo mismo dos veces: cuenta una sola.
      if (s.games[s.games.length - 1] !== gi) {
        s.games.push(gi);
        s.score += score;
      }
      if (turnOf(m.fromEpd) === side) own++;
    }
  });

  const used = new Set<number>();
  // Posiciones de la rama actual (no de todo el árbol): una transposición desde otra rama se vuelve a
  // escribir, y `buildImportPlan` la junta por posición. Como tu jugada se elige solo por la posición,
  // es la misma en las dos ramas y no queda más de una por posición.
  const path = new Set<string>([INITIAL_EPD]);
  const grow = (parent: Node<PgnNodeData>, epd: string, own: number) => {
    if (own >= maxOwnMoves) return;
    const byUci = stats.get(epd);
    if (!byUci) return;
    const mine = turnOf(epd) === side;
    const candidates = [...byUci.values()];
    const picks = mine
      ? [candidates.sort(byOwnPreference)[0]]
      : candidates.filter((s) => s.games.length >= minRival).sort(byRivalPreference);
    for (const s of picks) {
      // Volver a una posición de la rama es una repetición: la rama se corta antes. En tu posición no se
      // busca otra jugada, para que la elección siga dependiendo solo de la posición.
      if (path.has(s.epd)) continue;
      const child = new ChildNode<PgnNodeData>({ san: s.san });
      parent.children.push(child);
      for (const gi of s.games) used.add(gi);
      path.add(s.epd);
      grow(child, s.epd, mine ? own + 1 : own);
      path.delete(s.epd);
    }
  };
  const root = new Node<PgnNodeData>();
  grow(root, INITIAL_EPD, 0);

  if (!root.children.length) return { pgn: '', gamesUsed: 0 };
  return { pgn: writePgn('Desde tus partidas', root), gamesUsed: used.size };
}
