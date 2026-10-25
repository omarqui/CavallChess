import { useEffect, useState } from 'react';
import type { Side } from '../chess/position';
import { parseFicha } from './parse';
import type { Ficha } from './types';
import { GROUPS, validateFicha, validateLibrary } from './validate';

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

let cache: Ficha[] | null = null;
let promise: Promise<Ficha[]> | null = null;

/** Carga la biblioteca una sola vez. Las fichas con errores se omiten y se informan en la consola. */
export function loadLibrary(): Promise<Ficha[]> {
  promise ??= import('./bundle').then(({ sources }) => {
    const { fichas, errors } = parseLibrary(sources);
    const buenas = fichas.filter((f) => {
      const e = validateFicha(f);
      errors.push(...e);
      return !e.length;
    });
    errors.push(...validateLibrary(buenas));
    if (errors.length) console.error(`Biblioteca: ${errors.length} problema(s)\n${errors.join('\n')}`);
    return (cache = buenas);
  });
  return promise;
}

/** `null` mientras carga. */
export function useLibrary(): Ficha[] | null {
  const [fichas, setFichas] = useState(cache);
  useEffect(() => {
    if (cache) return;
    void loadLibrary().then(setFichas);
  }, []);
  return fichas;
}

/** `null` = cargando, `undefined` = no existe. */
export function useFicha(id: string): Ficha | null | undefined {
  const fichas = useLibrary();
  if (!fichas) return null;
  return fichas.find((f) => f.id === id);
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
