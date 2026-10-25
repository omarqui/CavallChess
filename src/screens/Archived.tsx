import { useState } from 'react';
import type { RepertoireGraph } from '../chess/graph';
import { figurine, type Side } from '../chess/position';
import { purgeNodes } from '../db/repo';
import { useGraphs, useRepertoireState } from '../db/hooks';
import { repertoirePath } from './games/format';
import { Board } from '../ui/Board';
import { Banner, Button, Screen, sideLabel } from '../ui/kit';
import { navigate } from '../ui/router';

/** Agrupa los archivados en ramas: cada rama empieza en un nodo al que no llega ninguna jugada archivada. */
function branches(g: RepertoireGraph) {
  const archived = new Set(g.archivedNodeIds());
  const heads = [...archived].filter(
    (id) => !(g.incoming.get(id) ?? []).some((e) => archived.has(e.fromId) && e.fromId !== id),
  );
  const claimed = new Set<string>();
  return heads.map((head) => {
    const members = new Set<string>([head]);
    const queue = [head];
    while (queue.length) {
      const id = queue.shift()!;
      for (const e of g.children(id)) {
        if (archived.has(e.toId) && !members.has(e.toId) && !claimed.has(e.toId)) {
          members.add(e.toId);
          queue.push(e.toId);
        }
      }
    }
    members.forEach((m) => claimed.add(m));
    const cards = [...members].filter((id) => g.mineEdge(id)).length;
    return { head, members: [...members], cards };
  });
}

/** Lo archivado del repertorio activo de `side`, o de `repParam` si es de ese color. */
export function ArchivedScreen({ side, repParam }: { side: Side; repParam?: string }) {
  const graphs = useGraphs();
  const state = useRepertoireState();
  const [confirm, setConfirm] = useState<string[] | null>(null);
  if (!graphs || !state) return null;
  const asked = repParam ? state.graphs.get(repParam) : undefined;
  const g = asked?.side === side ? asked : graphs[side];
  const list = branches(g);

  const purge = async (ids: string[]) => {
    await purgeNodes(ids);

    setConfirm(null);
  };

  return (
    <Screen title="Archivadas">
      <p className="text-[15px] text-muted">
        Posiciones de {sideLabel(side).toLowerCase()} a las que ya no se llega desde el inicio. Conservan su historial: si
        volvés a jugar la jugada que lleva a ellas, reviven con su progreso.
      </p>
      {list.length === 0 && <p className="mt-6 text-[15px]">No hay nada archivado.</p>}
      {confirm && (
        <div className="mt-4">
          <Banner tone="bad">
            <p>
              Eliminar {confirm.length} {confirm.length === 1 ? 'posición' : 'posiciones'} para siempre. Su historial deja de
              contar.
            </p>
            <div className="mt-3 flex gap-2">
              <Button variant="primary" onClick={() => void purge(confirm)}>
                Eliminar
              </Button>
              <Button variant="ghost" onClick={() => setConfirm(null)}>
                Cancelar
              </Button>
            </div>
          </Banner>
        </div>
      )}
      <ul className="mt-5 space-y-3">
        {list.map((b) => {
          const node = g.node(b.head)!;
          const into = (g.incoming.get(b.head) ?? [])[0];
          return (
            <li key={b.head} className="flex gap-3 rounded-xl p-3 ring-1 ring-line">
              <div className="w-24 shrink-0">
                <Board epd={node.epd} orientation={side} coordinates={false} />
              </div>
              <div className="flex-1">
                <p className="text-[15px]">
                  {into ? <>Después de {figurine(into.san)}</> : 'Rama suelta'} · {b.members.length}{' '}
                  {b.members.length === 1 ? 'posición' : 'posiciones'}, {b.cards} {b.cards === 1 ? 'tarjeta' : 'tarjetas'}
                </p>
                <div className="mt-2 flex gap-2">
                  <Button className="!min-h-9" onClick={() => navigate(repertoirePath(side, g.rep, b.head))}>
                    Ver
                  </Button>
                  <Button variant="danger" className="!min-h-9" onClick={() => setConfirm(b.members)}>
                    Eliminar
                  </Button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      {list.length > 1 && (
        <Button variant="danger" className="mt-6 w-full" onClick={() => setConfirm(g.archivedNodeIds())}>
          Eliminar todas
        </Button>
      )}
    </Screen>
  );
}
