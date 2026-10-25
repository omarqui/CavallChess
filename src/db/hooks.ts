import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo } from 'react';
import { RepertoireGraph } from '../chess/graph';
import { repFromId } from '../chess/position';
import { DEFAULT_SETTINGS, type CardRow, type GameRow, type MoveEdge, type Note, type PositionNode, type Repertoire, type Settings, type Side } from '../types';
import { activeRepertoire, repertoiresOf } from './active';
import { db } from './db';

/** Los grafos de los repertorios activos, uno por color. */
export type Graphs = Record<Side, RepertoireGraph>;

export interface RepertoireState {
  /** Todos los repertorios, del más viejo al más nuevo. */
  repertoires: Repertoire[];
  /** El grafo de cada repertorio, por id. */
  graphs: Map<string, RepertoireGraph>;
}

/** Todos los repertorios con sus grafos. */
export function useRepertoireState(): RepertoireState | undefined {
  const data = useLiveQuery(async () => {
    const [repertoires, nodes, edges] = await Promise.all([db.repertoires.toArray(), db.nodes.toArray(), db.edges.toArray()]);
    return { repertoires, nodes, edges };
  });
  return useMemo(() => {
    if (!data) return undefined;
    const repertoires = [...repertoiresOf(data.repertoires, 'white'), ...repertoiresOf(data.repertoires, 'black')];
    const nodes = groupByRep(data.nodes);
    const edges = groupByRep(data.edges);
    const graphs = new Map(
      repertoires.map((r) => [r.id, new RepertoireGraph(r.side, nodes.get(r.id) ?? [], edges.get(r.id) ?? [], r.id)]),
    );
    return { repertoires, graphs };
  }, [data]);
}

function groupByRep<T extends PositionNode | MoveEdge>(rows: T[]): Map<string, T[]> {
  const out = new Map<string, T[]>();
  for (const row of rows) {
    const rep = repFromId(row.id);
    const list = out.get(rep);
    if (list) list.push(row);
    else out.set(rep, [row]);
  }
  return out;
}

export interface ActiveRepertoires {
  repertoires: Record<Side, Repertoire>;
  graphs: Graphs;
}

/** Los repertorios activos (con los que entrenás) y sus grafos, uno por color. */
export function useActive(): ActiveRepertoires | undefined {
  const state = useRepertoireState();
  const settings = useSettings();
  // Solo importa qué repertorio está elegido: los demás ajustes cambian sin rehacer esto.
  const white = settings?.activeRep?.white;
  const black = settings?.activeRep?.black;
  const loaded = !!settings;
  return useMemo(() => {
    if (!state || !loaded) return undefined;
    const pick = (side: Side) => activeRepertoire(state.repertoires, { white, black }, side);
    const of = (r: Repertoire) => state.graphs.get(r.id) ?? new RepertoireGraph(r.side, [], [], r.id);
    const repertoires = { white: pick('white'), black: pick('black') };
    return { repertoires, graphs: { white: of(repertoires.white), black: of(repertoires.black) } };
  }, [state, loaded, white, black]);
}

/** Los grafos de los repertorios activos, uno por color. */
export const useGraphs = (): Graphs | undefined => useActive()?.graphs;

export function useCards(): Map<string, CardRow> | undefined {
  const rows = useLiveQuery(() => db.cards.toArray());
  return useMemo(() => rows && new Map(rows.map((r) => [r.id, r])), [rows]);
}

export function useNotes(): Map<string, Note> | undefined {
  const rows = useLiveQuery(() => db.notes.toArray());
  return useMemo(() => rows && new Map(rows.map((r) => [r.id, r])), [rows]);
}

export const useEvents = () => useLiveQuery(() => db.events.toArray());

export function useDays(): Set<string> | undefined {
  const rows = useLiveQuery(() => db.days.toArray());
  return useMemo(() => rows && new Set(rows.map((r) => r.day)), [rows]);
}

export function useSettings(): Settings | undefined {
  // Envuelto para distinguir "cargando" (undefined) de "sin ajustes guardados".
  const res = useLiveQuery(async () => ({ row: await db.kv.get('settings') }));
  return useMemo(
    () => (res === undefined ? undefined : { ...DEFAULT_SETTINGS, ...((res.row?.value as Partial<Settings>) ?? {}) }),
    [res],
  );
}

export const useGaps = () => useLiveQuery(() => db.gaps.orderBy('count').reverse().toArray());
/** Una partida por id: `undefined` mientras carga, `null` si no existe. */
export function useGame(id: string): GameRow | null | undefined {
  const res = useLiveQuery(async () => ({ row: await db.games.get(id) }), [id]);
  return res === undefined ? undefined : (res.row ?? null);
}
