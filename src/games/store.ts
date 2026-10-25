import { db, type CavallDB } from '../db/db';
import { loadGraph } from '../db/repo';
import type { Gap, GameRow, Side } from '../types';
import { analyzeGame } from './analyze';

export type OutcomeFilter = 'todas' | 'desvios' | 'novedades' | 'dentro' | 'fuera';

export interface GameFilter {
  color: 'todas' | Side;
  outcome: OutcomeFilter;
}

export function matchesFilter(row: GameRow, f: GameFilter): boolean {
  if (f.color !== 'todas' && row.myColor !== f.color) return false;
  const k = row.outcome.kind;
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

const filtered = (f: GameFilter, d: CavallDB) =>
  d.games
    .orderBy('endTime')
    .reverse()
    .filter((r) => matchesFilter(r, f));

/** Una página de partidas, de la más reciente a la más vieja. */
export function gamesPage(f: GameFilter, offset: number, limit: number, d: CavallDB = db): Promise<GameRow[]> {
  return filtered(f, d).offset(offset).limit(limit).toArray();
}

export function countGames(f: GameFilter, d: CavallDB = db): Promise<number> {
  return filtered(f, d).count();
}

const BATCH = 200;
const cederHilo = () => new Promise<void>((r) => setTimeout(r, 0));

/**
 * Vuelve a cruzar todas las partidas con el repertorio actual y reconstruye los huecos.
 * No toca el log de repasos: nunca llama a `forceDue`.
 */
export async function recalcGames(
  onProgress?: (done: number, total: number) => void,
  d: CavallDB = db,
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

  for (let i = 0; i < total; i += BATCH) {
    const rows = (await d.games.bulkGet(ids.slice(i, i + BATCH))).filter((r): r is GameRow => !!r);
    const updated: GameRow[] = [];
    for (const row of rows) {
      const nueva = analizar(row);
      // No se reescribe lo que no cambió.
      if (JSON.stringify(nueva.outcome) !== JSON.stringify(row.outcome)) updated.push(nueva);
    }
    await d.games.bulkPut(updated);
    done += rows.length;
    onProgress?.(done, total);
    await cederHilo();
  }

  // Los huecos se reconstruyen juntos. Dentro de la transacción se toman también las partidas que
  // una sincronización haya agregado mientras tanto, para que sus huecos no se pierdan.
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
