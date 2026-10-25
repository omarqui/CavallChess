import { db, type CavallDB } from '../db/db';
import { loadGraph } from '../db/repo';
import type { Gap, GameOutcome, GameRow, Side } from '../types';
import { analyzeGame } from './analyze';
import { runExclusive } from './lock';

export type OutcomeFilter = 'todas' | 'desvios' | 'novedades' | 'dentro' | 'fuera';

export interface GameFilter {
  color: 'todas' | Side;
  outcome: OutcomeFilter;
}

/**
 * Tipo de resultado a mostrar y filtrar. Un `endOfBook` en la jugada 0 (guardado antes de que `analyzeGame`
 * lo devolviera como `noBook`) es no tener repertorio de ese color: cuenta como fuera.
 */
export function outcomeKind(outcome: GameOutcome): GameOutcome['kind'] {
  return outcome.kind === 'endOfBook' && outcome.ply === 0 ? 'noBook' : outcome.kind;
}

export function matchesFilter(row: GameRow, f: GameFilter): boolean {
  if (f.color !== 'todas' && row.myColor !== f.color) return false;
  const k = outcomeKind(row.outcome);
  switch (f.outcome) {
    case 'todas':
      return true;
    case 'desvios':
      return k === 'myDeviation';
    case 'novedades':
      return k === 'gap';
    case 'dentro':
      return k === 'inBook' || k === 'endOfBook';
    case 'fuera':
      return k === 'noBook';
  }
}

/** Sin filtro no hace falta leer cada fila (cada una trae el PGN entero): cuenta y salta con el índice. */
const sinFiltro = (f: GameFilter) => f.color === 'todas' && f.outcome === 'todas';

function ordered(f: GameFilter, d: CavallDB) {
  const all = d.games.orderBy('endTime').reverse();
  return sinFiltro(f) ? all : all.filter((r) => matchesFilter(r, f));
}

/** Una página de partidas, de la más reciente a la más vieja. */
export function gamesPage(f: GameFilter, offset: number, limit: number, d: CavallDB = db): Promise<GameRow[]> {
  return ordered(f, d).offset(offset).limit(limit).toArray();
}

export function countGames(f: GameFilter, d: CavallDB = db): Promise<number> {
  return sinFiltro(f) ? d.games.count() : ordered(f, d).count();
}

const BATCH = 200;
const CEDER_CADA_MS = 40;
const cederHilo = () => new Promise<void>((r) => setTimeout(r, 0));

/**
 * Vuelve a cruzar todas las partidas con el repertorio actual y reconstruye los huecos.
 * No toca el log de repasos: nunca llama a `forceDue`.
 */
export function recalcGames(
  onProgress?: (done: number, total: number) => void,
  d: CavallDB = db,
): Promise<{ games: number; gaps: number }> {
  return runExclusive(() => recalc(onProgress, d));
}

async function recalc(
  onProgress: ((done: number, total: number) => void) | undefined,
  d: CavallDB,
): Promise<{ games: number; gaps: number }> {
  const graphs: Record<Side, Awaited<ReturnType<typeof loadGraph>>> = {
    white: await loadGraph('white', d),
    black: await loadGraph('black', d),
  };
  const ids = (await d.games.orderBy('endTime').primaryKeys()) as string[];
  const total = ids.length;
  const gaps = new Map<string, Gap>();
  let done = 0;

  /** Cruza una partida con su grafo y, si trae una novedad, la suma a los huecos. */
  const analizar = (row: GameRow): GameRow => {
    const { outcome, gap } = analyzeGame(row.pgn, graphs[row.myColor]);
    if (gap) {
      // Igual que recordGame: cuenta, última vez y partida más reciente.
      const prev = gaps.get(gap.id);
      const esReciente = !prev || row.endTime >= prev.lastSeen;
      gaps.set(gap.id, {
        ...gap,
        side: row.myColor,
        count: (prev?.count ?? 0) + 1,
        lastSeen: Math.max(prev?.lastSeen ?? 0, row.endTime),
        lastGameUrl: esReciente ? row.id : prev.lastGameUrl,
      });
    }
    return { ...row, outcome };
  };

  // Además de entre tandas, se suelta el hilo cada ~40 ms: una tanda de PGN largos no congela la interfaz.
  let ultimaCesion = performance.now();
  const ceder = async () => {
    await cederHilo();
    ultimaCesion = performance.now();
  };

  for (let i = 0; i < total; i += BATCH) {
    const rows = (await d.games.bulkGet(ids.slice(i, i + BATCH))).filter((r): r is GameRow => !!r);
    const updated: GameRow[] = [];
    for (const row of rows) {
      const nueva = analizar(row);
      // No se reescribe lo que no cambió.
      if (JSON.stringify(nueva.outcome) !== JSON.stringify(row.outcome)) updated.push(nueva);
      if (performance.now() - ultimaCesion >= CEDER_CADA_MS) await ceder();
    }
    await d.games.bulkPut(updated);
    done += rows.length;
    onProgress?.(done, total);
    await ceder();
  }

  // Los huecos se reconstruyen juntos. Dentro de la transacción se toman también las partidas que otra
  // pestaña haya agregado mientras tanto (en esta, el candado no deja), para que sus huecos no se pierdan.
  const conocidas = new Set(ids);
  let agregadas = 0;
  await d.transaction('rw', d.games, d.gaps, async () => {
    const actuales = (await d.games.toCollection().primaryKeys()) as string[];
    const nuevasIds = actuales.filter((id) => !conocidas.has(id));
    const nuevas = (await d.games.bulkGet(nuevasIds)).filter((r): r is GameRow => !!r);
    await d.games.bulkPut(nuevas.map(analizar));
    agregadas = nuevas.length;
    await d.gaps.clear();
    await d.gaps.bulkPut([...gaps.values()]);
  });
  return { games: total + agregadas, gaps: gaps.size };
}
