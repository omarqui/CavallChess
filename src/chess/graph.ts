import { INITIAL_EPD, nodeId, type Side } from './position';
import type { MoveEdge, PositionNode } from '../types';

/**
 * Vista en memoria del grafo de un repertorio (de un color). Todo lo derivado (archivado, corte, orden DFS,
 * caminos, etiquetas) se calcula acá a partir de nodos y jugadas; nada de eso se guarda.
 */
export class RepertoireGraph {
  readonly side: Side;
  /** Id del repertorio: prefijo de los ids de sus posiciones y jugadas. */
  readonly rep: string;
  readonly rootId: string;
  readonly nodes = new Map<string, PositionNode>();
  readonly edges = new Map<string, MoveEdge>();
  /** Jugadas salientes por nodo: la propia primero, después por fecha de creación. */
  readonly out = new Map<string, MoveEdge[]>();
  readonly incoming = new Map<string, MoveEdge[]>();
  /** Alcanzables desde la posición inicial (lo demás está archivado). */
  readonly reachable: Set<string>;
  /** Alcanzables sin atravesar posiciones marcadas como "cortar aquí". */
  readonly trainable: Set<string>;
  private dfsCache?: string[];

  constructor(side: Side, nodes: PositionNode[], edges: MoveEdge[], rep: string = side) {
    this.side = side;
    this.rep = rep;
    this.rootId = nodeId(rep, INITIAL_EPD);
    for (const n of nodes) this.nodes.set(n.id, n);
    for (const e of edges) {
      this.edges.set(e.id, e);
      push(this.out, e.fromId, e);
      push(this.incoming, e.toId, e);
    }
    for (const list of this.out.values()) list.sort(edgeOrder);
    this.reachable = this.bfs(this.rootId, false);
    this.trainable = this.bfs(this.rootId, true);
  }

  private bfs(start: string, stopAtCuts: boolean): Set<string> {
    const seen = new Set<string>([start]);
    const queue = [start];
    while (queue.length) {
      const id = queue.shift()!;
      if (stopAtCuts && this.nodes.get(id)?.cutHere) continue;
      for (const e of this.out.get(id) ?? []) {
        if (!seen.has(e.toId)) {
          seen.add(e.toId);
          queue.push(e.toId);
        }
      }
    }
    return seen;
  }

  node(id: string) {
    return this.nodes.get(id);
  }

  children(id: string): MoveEdge[] {
    return this.out.get(id) ?? [];
  }

  mineEdge(id: string): MoveEdge | undefined {
    return this.out.get(id)?.find((e) => e.mine);
  }

  isArchived(id: string) {
    return !this.reachable.has(id);
  }

  isBeyondCut(id: string) {
    return this.reachable.has(id) && !this.trainable.has(id);
  }

  /** ¿Se entrena la jugada propia que sale de este nodo? */
  isTrainableFrom(id: string) {
    return this.trainable.has(id) && !this.nodes.get(id)?.cutHere;
  }

  /** Jugadas propias que hoy son tarjetas activas. */
  trainableCardIds(): string[] {
    return this.dfsOrder()
      .map((id) => this.mineEdge(id))
      .filter((e): e is MoveEdge => !!e && this.isTrainableFrom(e.fromId))
      .map((e) => e.id);
  }

  /** Orden DFS (preorden) de los nodos entrenables: los padres siempre antes que sus hijas. */
  dfsOrder(): string[] {
    if (this.dfsCache) return this.dfsCache;
    const order: string[] = [];
    const seen = new Set<string>();
    const stack = [this.rootId];
    while (stack.length) {
      const id = stack.pop()!;
      if (seen.has(id)) continue;
      seen.add(id);
      order.push(id);
      if (this.nodes.get(id)?.cutHere) continue;
      const kids = this.children(id);
      for (let i = kids.length - 1; i >= 0; i--) if (!seen.has(kids[i].toId)) stack.push(kids[i].toId);
    }
    this.dfsCache = order;
    return order;
  }

  /** Camino más corto (en jugadas) entre dos nodos, sin atravesar cortes. Empates: orden de creación. */
  path(fromId: string, toId: string): MoveEdge[] | null {
    if (fromId === toId) return [];
    const prev = new Map<string, MoveEdge>();
    const seen = new Set([fromId]);
    const queue = [fromId];
    while (queue.length) {
      const id = queue.shift()!;
      if (id !== fromId && this.nodes.get(id)?.cutHere) continue;
      for (const e of this.children(id)) {
        if (seen.has(e.toId)) continue;
        seen.add(e.toId);
        prev.set(e.toId, e);
        if (e.toId === toId) {
          const out: MoveEdge[] = [];
          let cur = toId;
          while (cur !== fromId) {
            const step = prev.get(cur)!;
            out.unshift(step);
            cur = step.fromId;
          }
          return out;
        }
        queue.push(e.toId);
      }
    }
    return null;
  }

  pathFromRoot(id: string): MoveEdge[] | null {
    return this.path(this.rootId, id);
  }

  /** Camino desde el inicio también para nodos archivados o más allá del corte (para mostrarlos). */
  anyPathFromRoot(id: string): MoveEdge[] | null {
    if (id === this.rootId) return [];
    const prev = new Map<string, MoveEdge>();
    const seen = new Set([this.rootId]);
    const queue = [this.rootId];
    while (queue.length) {
      const cur = queue.shift()!;
      for (const e of this.children(cur)) {
        if (seen.has(e.toId)) continue;
        seen.add(e.toId);
        prev.set(e.toId, e);
        if (e.toId === id) {
          const out: MoveEdge[] = [];
          let c = id;
          while (c !== this.rootId) {
            const step = prev.get(c)!;
            out.unshift(step);
            c = step.fromId;
          }
          return out;
        }
        queue.push(e.toId);
      }
    }
    return null;
  }

  /** Nodos entrenables alcanzables desde `id` (incluido), sin atravesar cortes. */
  subtree(id: string): Set<string> {
    const seen = new Set<string>([id]);
    const queue = [id];
    while (queue.length) {
      const cur = queue.shift()!;
      if (this.nodes.get(cur)?.cutHere) continue;
      for (const e of this.children(cur)) {
        if (!seen.has(e.toId) && this.trainable.has(e.toId)) {
          seen.add(e.toId);
          queue.push(e.toId);
        }
      }
    }
    return seen;
  }

  /** Tarjetas activas del subárbol de `id`. */
  subtreeCardIds(id: string): string[] {
    const sub = this.subtree(id);
    return this.trainableCardIds().filter((cid) => sub.has(this.edges.get(cid)!.fromId));
  }

  /** Raíces nombradas por las que pasa el camino más corto a `id` (de la más general a la más específica). */
  labelsFor(id: string): PositionNode[] {
    const path = this.anyPathFromRoot(id) ?? [];
    const ids = [this.rootId, ...path.map((e) => e.toId)];
    return ids.map((n) => this.nodes.get(n)).filter((n): n is PositionNode => !!n?.name);
  }

  /** Raíces nombradas activas, en orden DFS. */
  namedRoots(): PositionNode[] {
    return this.dfsOrder()
      .map((id) => this.nodes.get(id))
      .filter((n): n is PositionNode => !!n?.name);
  }

  /** Nodos archivados (inalcanzables), excluyendo la raíz. */
  archivedNodeIds(): string[] {
    return [...this.nodes.keys()].filter((id) => !this.reachable.has(id));
  }

  /** Nodos que quedarían inalcanzables si se quitara la jugada `edgeId`. */
  wouldArchive(edgeIdToRemove: string): string[] {
    const without = [...this.edges.values()].filter((e) => e.id !== edgeIdToRemove);
    const g = new RepertoireGraph(this.side, [...this.nodes.values()], without, this.rep);
    return [...this.reachable].filter((id) => !g.reachable.has(id));
  }
}

function push<K, V>(map: Map<K, V[]>, key: K, v: V) {
  const list = map.get(key);
  if (list) list.push(v);
  else map.set(key, [v]);
}

function edgeOrder(a: MoveEdge, b: MoveEdge) {
  if (a.mine !== b.mine) return a.mine ? -1 : 1;
  return a.createdAt - b.createdAt || a.id.localeCompare(b.id);
}
