import { useEffect, useSyncExternalStore } from 'react';
import type { Side } from '../chess/position';
import { parseFicha } from './parse';
import type { Ficha } from './types';
import { GROUPS, validateLibrary } from './validate';

/** Parsea cada fuente; los errores llevan el path para poder ubicarlos. */
export function parseLibrary(sources: Record<string, string>): { fichas: Ficha[]; errors: string[] } {
  const fichas: Ficha[] = [];
  const errors: string[] = [];
  for (const path of Object.keys(sources).sort()) {
    const r = parseFicha(sources[path]);
    errors.push(...r.errors.map((e) => `${path}: ${e}`));
    if (r.ficha && !r.errors.length) fichas.push(r.ficha);
  }
  return { fichas, errors };
}

/**
 * Catálogo a partir de las fuentes. En producción alcanza con parsear: `content.test.ts` (CI) ya garantiza que todas
 * las fichas validan. En desarrollo se valida una vez, solo para avisar en la consola mientras escribís una ficha.
 * Las fichas que no parsean se omiten.
 */
function catalogOf(sources: Record<string, string>): Ficha[] {
  const { fichas, errors } = parseLibrary(sources);
  if (import.meta.env.DEV) errors.push(...validateLibrary(fichas));
  if (errors.length) console.error(`Biblioteca: ${errors.length} problema(s)\n${errors.join('\n')}`);
  return fichas;
}

/** `fichas` y `error` en `null` = cargando. */
export interface LibrarySnapshot {
  fichas: Ficha[] | null;
  error: Error | null;
}

/**
 * Carga única de la biblioteca con su estado (cargando, lista o error). Si la carga falla, la promesa no queda
 * guardada: la próxima `load()` vuelve a intentar (y el estado pasa otra vez por "cargando").
 */
export function createLibraryStore(loadSources: () => Promise<Record<string, string>>) {
  let snapshot: LibrarySnapshot = { fichas: null, error: null };
  let promise: Promise<Ficha[]> | null = null;
  const listeners = new Set<() => void>();
  const set = (s: LibrarySnapshot) => {
    snapshot = s;
    listeners.forEach((l) => l());
  };
  return {
    load(): Promise<Ficha[]> {
      if (promise) return promise;
      if (snapshot.error) set({ fichas: null, error: null });
      promise = loadSources()
        .then(catalogOf)
        .then(
          (fichas) => {
            set({ fichas, error: null });
            return fichas;
          },
          (e: unknown) => {
            promise = null;
            const error = e instanceof Error ? e : new Error(String(e));
            set({ fichas: null, error });
            throw error;
          },
        );
      return promise;
    },
    get: (): LibrarySnapshot => snapshot,
    subscribe(l: () => void): () => void {
      listeners.add(l);
      return () => listeners.delete(l);
    },
  };
}

const store = createLibraryStore(() => import('./bundle').then((m) => m.sources));

/** Empieza a cargar la biblioteca si hace falta; el resultado (o el error) llega por `useLibrary`. */
export function preloadLibrary(): void {
  store.load().catch(() => {});
}

export interface LibraryState extends LibrarySnapshot {
  /** Vuelve a intentar la carga después de un error. */
  retry: () => void;
}

/** `fichas` en `null` mientras carga o si falló; `error` distingue el fallo. */
export function useLibrary(): LibraryState {
  const snap = useSyncExternalStore(store.subscribe, store.get);
  useEffect(() => {
    if (!snap.fichas && !snap.error) preloadLibrary();
  }, [snap.fichas, snap.error]);
  return { ...snap, retry: preloadLibrary };
}

/** `ficha`: `null` mientras carga o si falló (mirá `error`), `undefined` si no existe. */
export function useFicha(id: string): { ficha: Ficha | null | undefined; error: Error | null; retry: () => void } {
  const { fichas, error, retry } = useLibrary();
  return { ficha: fichas ? fichas.find((f) => f.id === id) : null, error, retry };
}

/** Fichas del lado, agrupadas en el orden de `GROUPS` y ordenadas por `order`. */
export function groupFichas(fichas: Ficha[], side: Side): { group: string; fichas: Ficha[] }[] {
  return GROUPS[side]
    .map((group) => ({
      group,
      fichas: fichas.filter((f) => f.side === side && f.group === group).sort((a, b) => a.order - b.order),
    }))
    .filter((g) => g.fichas.length);
}

const plain = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();

/** ¿`code` (p. ej. B12) cae en algún código o rango de `eco` (p. ej. "B10-B19" o "A45-A48, D00-D02")? */
function ecoCovers(eco: string, code: string): boolean {
  const c = code.toUpperCase();
  return eco.split(',').some((part) => {
    const [a, b = a] = part.trim().toUpperCase().split(/\s*-\s*/);
    return !!a && a <= c && c <= b;
  });
}

/** Busca sin distinguir mayúsculas ni tildes, por nombre, alias y ECO. */
export function searchFichas(fichas: Ficha[], query: string): Ficha[] {
  const q = plain(query);
  if (!q) return fichas;
  const isCode = /^[a-e]\d\d$/.test(q);
  return fichas.filter(
    (f) =>
      plain(f.name).includes(q) ||
      f.aliases.some((a) => plain(a).includes(q)) ||
      plain(f.eco).includes(q) ||
      (isCode && ecoCovers(f.eco, q)),
  );
}
