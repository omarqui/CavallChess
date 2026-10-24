import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo } from 'react';
import { RepertoireGraph } from '../chess/graph';
import { DEFAULT_SETTINGS, type CardRow, type Settings, type Side } from '../types';
import { db } from './db';

export type Graphs = Record<Side, RepertoireGraph>;

export function useGraphs(): Graphs | undefined {
  const data = useLiveQuery(async () => {
    const [nodes, edges] = await Promise.all([db.nodes.toArray(), db.edges.toArray()]);
    return { nodes, edges };
  });
  return useMemo(() => {
    if (!data) return undefined;
    const by = (side: Side) =>
      new RepertoireGraph(
        side,
        data.nodes.filter((n) => n.side === side),
        data.edges.filter((e) => e.side === side),
      );
    return { white: by('white'), black: by('black') };
  }, [data]);
}

export function useCards(): Map<string, CardRow> | undefined {
  const rows = useLiveQuery(() => db.cards.toArray());
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
export const useGames = () => useLiveQuery(() => db.games.orderBy('endTime').reverse().limit(60).toArray());
