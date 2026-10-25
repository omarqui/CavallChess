import { useMemo, useState } from 'react';
import type { RepertoireGraph } from '../chess/graph';
import {
  displaySquares,
  edgeId,
  epdFromNodeId,
  figurine,
  moveNumberLabel,
  playUci,
  turnOf,
  type Side,
} from '../chess/position';
import { addMove, deleteEdge, setActiveRepertoire, updateEdge, updateNode } from '../db/repo';
import { useActive, useCards, useRepertoireState, useSettings } from '../db/hooks';
import { mastery } from '../srs/stats';
import type { MoveEdge } from '../types';
import { arrow, Board } from '../ui/Board';
import { EnginePanel } from '../ui/EnginePanel';
import { ExplorerPanel } from '../ui/ExplorerPanel';
import { Banner, Button, MoveLine, Screen, Section, Segmented, sideLabel, Toggle } from '../ui/kit';
import { Tip } from '../ui/Tip';
import { openingName, useEco } from '../ui/opening';
import { navigate } from '../ui/router';
import { repertoirePath } from './games/format';

/**
 * El editor del repertorio activo de `side`, o de `repParam` (aunque no sea el activo) si es de ese color.
 */
export function RepertoireScreen({
  side,
  repParam,
  nodeParam,
  gapSan,
}: {
  side: Side;
  repParam?: string;
  nodeParam?: string;
  gapSan?: string;
}) {
  const state = useRepertoireState();
  const active = useActive();
  const cards = useCards();
  const settings = useSettings();
  const eco = useEco();
  const [syncKey, setSyncKey] = useState(0);
  const [pendingReplace, setPendingReplace] = useState<{ uci: string; san: string; mine: MoveEdge; archive: number } | null>(
    null,
  );
  const [pendingDelete, setPendingDelete] = useState<{ edge: MoveEdge; archive: number } | null>(null);
  const [showEngine, setShowEngine] = useState(false);

  if (!state || !active || !cards || !settings) return null;
  const asked = repParam ? state.graphs.get(repParam) : undefined;
  const g = asked?.side === side ? asked : active.graphs[side];
  const rep = state.repertoires.find((r) => r.id === g.rep) ?? active.repertoires[side];
  const isActive = rep.id === active.repertoires[side].id;
  const several = state.repertoires.filter((r) => r.side === side).length > 1;
  const nodeId = nodeParam && g.nodes.has(nodeParam) ? nodeParam : g.rootId;
  const node = g.node(nodeId)!;
  const epd = node.epd;
  const path = g.anyPathFromRoot(nodeId);
  const archived = g.isArchived(nodeId);
  const beyondCut = g.isBeyondCut(nodeId);
  const myTurn = turnOf(epd) === side;
  const children = g.children(nodeId);
  const mine = g.mineEdge(nodeId);
  const lastEdge = path?.at(-1);
  const name = openingName(g, nodeId, eco);
  const go = (id: string) => navigate(repertoirePath(side, g.rep, id));

  const onMove = async (uci: string) => {
    setPendingReplace(null);
    const played = playUci(epd, uci);
    if (!played) return setSyncKey((k) => k + 1);
    const existing = g.edges.get(edgeId(g.rep, epd, played.uci));
    if (existing) return go(existing.toId);
    if (myTurn && mine) {
      setPendingReplace({ uci: played.uci, san: played.san, mine, archive: g.wouldArchive(mine.id).length });
      return setSyncKey((k) => k + 1);
    }
    const edge = await addMove(side, nodeId, played.uci);
    if (edge) go(edge.toId);
  };

  const confirmReplace = async () => {
    if (!pendingReplace) return;
    const edge = await addMove(side, nodeId, pendingReplace.uci);
    setPendingReplace(null);
    if (edge) go(edge.toId);
  };

  const subtreeCards = archived ? [] : g.subtreeCardIds(nodeId);
  const m = mastery(subtreeCards, cards);

  return (
    <Screen
      title="Repertorio"
      actions={
        <div className="flex items-center gap-2">
          <Segmented
            label="Color"
            value={side}
            onChange={(s) => navigate(`/repertoire/${s}`)}
            options={[
              { value: 'white', label: 'Blancas' },
              { value: 'black', label: 'Negras' },
            ]}
          />
          <Button variant="secondary" aria-label="Importar PGN o estudio" onClick={() => navigate('/import')} className="!px-3">
            Importar
          </Button>
        </div>
      }
    >
      <div className="mb-3 flex min-h-11 items-center justify-between gap-3">
        <p className="min-w-0 truncate text-[15px]">
          <span className="font-semibold">{rep.name}</span>
          {several && isActive && <span className="text-muted"> · activo</span>}
        </p>
        <Button variant="ghost" className="shrink-0 !px-3" onClick={() => navigate('/repertorios')}>
          {several ? 'Cambiar' : 'Tus repertorios'}
        </Button>
      </div>
      {!isActive && (
        <div className="mb-3">
          <Banner compact>
            <p>No es tu repertorio activo: con {sideLabel(side).toLowerCase()} entrenás con {active.repertoires[side].name}.</p>
            <Button className="mt-2" onClick={() => void setActiveRepertoire(rep.id)}>
              Entrenar con este
            </Button>
          </Banner>
        </div>
      )}
      {cards.size > 0 && (
        <Tip id="repertorio">
          Tu repertorio es un árbol de posiciones: «Cortar aquí» marca el final de una línea, y borrar archiva sin perder el historial.
        </Tip>
      )}
      {gapSan && (
        <div className="mb-3">
          <Banner>
            Acá el rival jugó {figurine(gapSan)}. Jugala en el tablero y después agregá tu respuesta.
          </Banner>
        </div>
      )}
      <div className="mb-2 flex min-h-6 items-baseline justify-between gap-3 text-sm">
        <span className="truncate text-muted">{name ?? (nodeId === g.rootId ? `Repertorio con ${sideLabel(side).toLowerCase()}` : '')}</span>
        {archived && <span className="shrink-0 text-bad">Archivada</span>}
        {beyondCut && <span className="shrink-0 text-muted">Después del corte</span>}
        {node.cutHere && <span className="shrink-0 text-brass">Fin de repertorio</span>}
      </div>
      <Board
        epd={epd}
        orientation={side}
        interactive
        onMove={(u) => void onMove(u)}
        syncKey={syncKey}
        lastMove={lastEdge ? displaySquares(epdFromNodeId(lastEdge.fromId), lastEdge.uci) : undefined}
        shapes={mine ? [arrow(...displaySquares(epd, mine.uci))] : []}
      />

      <div className="mt-3 flex items-start gap-2">
        <div className="flex-1 text-[15px]">
          <MoveLine
            moves={path ?? []}
            active={(path?.length ?? 0) - 1}
            onPick={(i) => path && go(path[i].toId)}
          />
        </div>
        <Button
          variant="ghost"
          aria-label="Una jugada atrás"
          disabled={!lastEdge}
          onClick={() => lastEdge && go(lastEdge.fromId)}
          className="!min-h-9 !px-3"
        >
          ‹
        </Button>
        <Button
          variant="ghost"
          aria-label="Ir al inicio"
          disabled={nodeId === g.rootId}
          onClick={() => go(g.rootId)}
          className="!min-h-9 !px-3"
        >
          «
        </Button>
      </div>

      {pendingReplace && (
        <div className="mt-4">
          <Banner tone="bad">
            <p>
              Ya jugás {figurine(pendingReplace.mine.san)} acá. ¿Reemplazarla por {figurine(pendingReplace.san)}?
              {pendingReplace.archive > 0 &&
                ` ${pendingReplace.archive} ${pendingReplace.archive === 1 ? 'posición se archiva' : 'posiciones se archivan'} con su historial.`}
            </p>
            <div className="mt-3 flex gap-2">
              <Button variant="primary" onClick={() => void confirmReplace()}>
                Reemplazar
              </Button>
              <Button variant="ghost" onClick={() => setPendingReplace(null)}>
                Cancelar
              </Button>
            </div>
          </Banner>
        </div>
      )}

      <Section title={myTurn ? 'Tu jugada desde acá' : 'Respuestas del rival'}>
        {children.length === 0 ? (
          <p className="text-[15px] text-muted">
            {myTurn ? 'Todavía no elegiste qué jugar. Hacé tu jugada en el tablero.' : 'Jugá en el tablero las respuestas del rival que querés preparar.'}
          </p>
        ) : (
          <ul className="divide-y divide-line rounded-xl ring-1 ring-line">
            {children.map((e) => (
              <li key={e.id} className="flex items-center gap-3 px-3">
                <button className="flex min-h-12 flex-1 items-center gap-3 text-left" onClick={() => go(e.toId)}>
                  <span className={`size-2 rounded-full ${e.mine ? 'bg-good' : 'bg-muted/50'}`} aria-hidden />
                  <span className="notation text-[17px]">
                    <span className="text-muted">{moveNumberLabel(path?.length ?? 0)}</span>
                    {figurine(e.san)}
                  </span>
                  {e.explanation && <span className="truncate text-sm text-muted">{e.explanation}</span>}
                </button>
                <button
                  aria-label={`Quitar ${e.san}`}
                  className="grid size-9 place-items-center rounded-full text-muted hover:bg-bad-soft hover:text-bad"
                  onClick={() => setPendingDelete({ edge: e, archive: g.wouldArchive(e.id).length })}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
        {pendingDelete && (
          <div className="mt-3">
            <Banner tone="bad">
              <p>
                ¿Quitar {figurine(pendingDelete.edge.san)}?
                {pendingDelete.archive > 0
                  ? ` ${pendingDelete.archive} ${pendingDelete.archive === 1 ? 'posición se archiva' : 'posiciones se archivan'} (con su historial; podés recuperarlas volviendo a jugarla).`
                  : ' No se archiva nada: a esas posiciones se sigue llegando por otro orden de jugadas.'}
              </p>
              <div className="mt-3 flex gap-2">
                <Button
                  variant="primary"
                  onClick={() => {
                    void deleteEdge(pendingDelete.edge.id);
                    setPendingDelete(null);
                  }}
                >
                  Quitar
                </Button>
                <Button variant="ghost" onClick={() => setPendingDelete(null)}>
                  Cancelar
                </Button>
              </div>
            </Banner>
          </div>
        )}
        {settings.lichessToken && (
          <ExplorerPanel epd={epd} token={settings.lichessToken} known={new Set(children.map((c) => c.uci))} onPlay={(u) => void onMove(u)} />
        )}
      </Section>

      {lastEdge && <MoveNotes key={lastEdge.id} edge={lastEdge} />}

      <Section title="Esta posición">
        <NodeNameField key={nodeId} id={nodeId} name={node.name} />
        <Toggle
          label="Cortar aquí (fin de repertorio)"
          checked={!!node.cutHere}
          onChange={(v) => void updateNode(nodeId, { cutHere: v || undefined })}
        />
        {subtreeCards.length > 0 && (
          <div className="mt-2 flex items-center justify-between gap-3">
            <p className="text-sm text-muted">
              {subtreeCards.length} {subtreeCards.length === 1 ? 'tarjeta' : 'tarjetas'} desde acá · {m.pct}% dominado
            </p>
            <Button
              onClick={() =>
                navigate(`/train?mode=practice&side=${side}&root=${encodeURIComponent(nodeId)}`)
              }
            >
              Practicar
            </Button>
          </div>
        )}
        <div className="mt-2">
          <Toggle label="Analizar con Stockfish" checked={showEngine} onChange={setShowEngine} />
          {showEngine && <EnginePanel epd={epd} />}
        </div>
      </Section>

      <Section title="Árbol">
        <Tree graph={g} current={nodeId} onPick={go} />
      </Section>

      <ArchivedLink graph={g} side={side} />
    </Screen>
  );
}

function NodeNameField({ id, name }: { id: string; name?: string }) {
  const [value, setValue] = useState(name ?? '');
  return (
    <label className="block">
      <span className="text-sm text-muted">Nombre de apertura (raíz)</span>
      <input
        value={value}
        placeholder="p. ej. Najdorf"
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => void updateNode(id, { name: value.trim() || undefined })}
        className="mt-1 w-full rounded-xl bg-surface px-3 py-2.5 text-[16px] ring-1 ring-line outline-none focus:ring-brass"
      />
    </label>
  );
}

function MoveNotes({ edge }: { edge: MoveEdge }) {
  const [hint, setHint] = useState(edge.hint ?? '');
  const [explanation, setExplanation] = useState(edge.explanation ?? '');
  const area =
    'mt-1 w-full rounded-xl bg-surface px-3 py-2.5 font-book text-[16px] leading-relaxed ring-1 ring-line outline-none focus:ring-brass';
  return (
    <Section title={`Notas de ${figurine(edge.san)}`}>
      {edge.mine && (
        <label className="block">
          <span className="text-sm text-muted">Pista (el plan, sin nombrar la jugada)</span>
          <textarea
            rows={2}
            value={hint}
            onChange={(e) => setHint(e.target.value)}
            onBlur={() => void updateEdge(edge.id, { hint: hint.trim() || undefined })}
            className={area}
            placeholder="p. ej. Presioná e5 antes de que negras completen el desarrollo"
          />
        </label>
      )}
      <label className="mt-3 block">
        <span className="text-sm text-muted">Explicación completa</span>
        <textarea
          rows={3}
          value={explanation}
          onChange={(e) => setExplanation(e.target.value)}
          onBlur={() => void updateEdge(edge.id, { explanation: explanation.trim() || undefined })}
          className={area}
        />
      </label>
    </Section>
  );
}

/** Árbol desplegado desde el inicio; las transposiciones se muestran como enlace en vez de duplicar. */
function Tree({ graph, current, onPick }: { graph: RepertoireGraph; current: string; onPick: (id: string) => void }) {
  const onPath = useMemo(() => {
    const p = graph.anyPathFromRoot(current) ?? [];
    return new Set([graph.rootId, ...p.map((e) => e.toId)]);
  }, [graph, current]);
  const [open, setOpen] = useState<Set<string>>(new Set());
  const isOpen = (id: string) => onPath.has(id) || open.has(id);
  const toggle = (id: string) =>
    setOpen((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const rows: React.ReactNode[] = [];
  const seen = new Set<string>([graph.rootId]);
  const walk = (id: string, ply: number, depth: number) => {
    for (const e of graph.children(id)) {
      const transposes = seen.has(e.toId);
      const kids = graph.children(e.toId).length;
      rows.push(
        <div
          key={`${e.id}@${depth}`}
          className={`flex min-h-9 items-center gap-1 text-[15px] ${e.toId === current ? 'rounded-lg bg-brass-soft' : ''}`}
          style={{ paddingLeft: depth * 14 }}
        >
          {kids > 0 && !transposes ? (
            <button
              aria-label={isOpen(e.toId) ? 'Contraer' : 'Expandir'}
              onClick={() => toggle(e.toId)}
              className="grid size-7 place-items-center text-muted"
            >
              {isOpen(e.toId) ? '▾' : '▸'}
            </button>
          ) : (
            <span className="size-7" />
          )}
          <button className="notation flex items-center gap-1.5 text-left" onClick={() => onPick(e.toId)}>
            <span className={`size-1.5 rounded-full ${e.mine ? 'bg-good' : 'bg-transparent'}`} aria-hidden />
            <span className="text-muted">{moveNumberLabel(ply)}</span>
            {figurine(e.san)}
          </button>
          {e.trap && (
            <span
              title={e.trap.name}
              className={`shrink-0 whitespace-nowrap rounded-full px-1.5 text-xs ${e.trap.kind === 'favor' ? 'bg-good-soft text-good' : 'bg-bad-soft text-bad'}`}
            >
              {e.trap.kind === 'favor' ? 'trampa' : 'ojo'}
              <span className="sr-only">{`: ${e.trap.name}`}</span>
            </span>
          )}
          {transposes && <span className="text-sm text-muted">↪ transpone</span>}
          {graph.node(e.toId)?.name && !transposes && (
            <span className="ml-1 truncate text-sm text-brass">{graph.node(e.toId)!.name}</span>
          )}
        </div>,
      );
      if (transposes) continue;
      seen.add(e.toId);
      if (isOpen(e.toId) && !graph.node(e.toId)?.cutHere) walk(e.toId, ply + 1, depth + 1);
    }
  };
  walk(graph.rootId, 0, 0);
  if (!rows.length) return <p className="text-[15px] text-muted">Vacío. Jugá la primera jugada en el tablero.</p>;
  return <div className="rounded-xl py-1 ring-1 ring-line">{rows}</div>;
}

function ArchivedLink({ graph, side }: { graph: RepertoireGraph; side: Side }) {
  const n = graph.archivedNodeIds().length;
  if (!n) return null;
  const to = `/archived/${side}${graph.rep === side ? '' : `?rep=${encodeURIComponent(graph.rep)}`}`;
  return (
    <div className="mt-6">
      <Button variant="ghost" className="-ml-3 text-muted" onClick={() => navigate(to)}>
        {n} {n === 1 ? 'posición archivada' : 'posiciones archivadas'}
      </Button>
    </div>
  );
}
