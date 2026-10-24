import { useEffect, useState } from 'react';
import type { RepertoireGraph } from '../chess/graph';
import { epdFromNodeId } from '../chess/position';

let ecoCache: Record<string, string> | null = null;
let ecoPromise: Promise<Record<string, string>> | null = null;

/** Nombres ECO (dataset lichess-org/chess-openings, CC0), cargados a demanda. */
export function useEco(): Record<string, string> | null {
  const [eco, setEco] = useState(ecoCache);
  useEffect(() => {
    if (ecoCache) return;
    ecoPromise ??= import('../data/eco.json').then((m) => (ecoCache = m.default as Record<string, string>));
    void ecoPromise.then(setEco);
  }, []);
  return eco;
}

/** Nombre a mostrar: tus raíces nombradas (anidadas); si no hay, el nombre ECO más profundo del camino. */
export function openingName(graph: RepertoireGraph, nodeId: string, eco: Record<string, string> | null): string | null {
  const labels = graph.labelsFor(nodeId);
  if (labels.length) return labels.map((n) => n.name).join(' › ');
  if (!eco) return null;
  const path = graph.anyPathFromRoot(nodeId) ?? [];
  for (let i = path.length - 1; i >= 0; i--) {
    const name = eco[epdFromNodeId(path[i].toId)];
    if (name) return name.replace(/^[A-E]\d\d /, '');
  }
  return null;
}
