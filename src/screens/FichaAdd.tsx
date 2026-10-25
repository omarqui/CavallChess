import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import type { RepertoireGraph } from '../chess/graph';
import { loadGraph } from '../db/repo';
import { useGraphs, type Graphs } from '../db/hooks';
import { useFicha } from '../library/catalog';
import { fichaNames, fichaPgn } from '../library/pgn';
import { lineStatus } from '../library/status';
import type { Ficha, FichaLine } from '../library/types';
import { ImportPreview } from '../ui/ImportPreview';
import { BackLink, Icon, ICONS } from '../ui/kit';
import { navigate } from '../ui/router';
import { showToast } from '../ui/toast';
import {
  ActionBar,
  ActionButton,
  FichaNotFound,
  LibraryLoadFailed,
  LineChips,
  LinePreview,
  StatusChip,
} from './Ficha';

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

function LineRow({
  f,
  line,
  graph,
  checked,
  onChange,
}: {
  f: Ficha;
  line: FichaLine;
  graph: RepertoireGraph;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <li>
      <label className="relative flex min-h-11 cursor-pointer gap-3.5 px-4 py-3.5 transition active:bg-raised">
        {/* Invisible y del tamaño de la fila: todo el renglón se toca como la casilla. */}
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="peer absolute inset-0 size-full cursor-pointer appearance-none opacity-0"
        />
        <span
          aria-hidden="true"
          className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-md bg-raised text-paper ring-1 ring-line transition peer-checked:bg-good peer-checked:ring-good peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brass [&>svg]:opacity-0 peer-checked:[&>svg]:opacity-100"
        >
          <Icon d={ICONS.check} className="size-4 transition-opacity [stroke-width:2.6]" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-book text-[17px] font-semibold leading-snug">{line.name}</span>
          <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <LineChips line={line} />
            <span className="ml-auto">
              <StatusChip status={lineStatus(line, f.side, graph)} />
            </span>
          </span>
          <span className="mt-2 block">
            <LinePreview f={f} line={line} />
          </span>
        </span>
      </label>
    </li>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-6">
      <h2 className="mb-2 font-book text-lg font-semibold">{title}</h2>
      <ul className="divide-y divide-line overflow-hidden rounded-2xl bg-surface ring-1 ring-line">{children}</ul>
    </section>
  );
}

function Picker({
  f,
  graphs,
  chosen,
  setChosen,
  onReview,
  busy,
}: {
  f: Ficha;
  graphs: Graphs;
  chosen: Set<string>;
  setChosen: (s: Set<string>) => void;
  onReview: () => void;
  busy: boolean;
}) {
  const graph = graphs[f.side];
  const all = chosen.size === f.lines.length;
  const toggle = (id: string, v: boolean) => {
    const next = new Set(chosen);
    if (v) next.add(id);
    else next.delete(id);
    setChosen(next);
  };
  const row = (l: FichaLine) => (
    <LineRow key={l.id} f={f} line={l} graph={graph} checked={chosen.has(l.id)} onChange={(v) => toggle(l.id, v)} />
  );
  const variants = f.lines.filter((l) => l.kind === 'variante');
  const traps = f.lines.filter((l) => l.kind !== 'variante');

  return (
    <div className="mx-auto w-full max-w-xl px-4 safe-top" style={{ paddingBottom: 'calc(var(--tabbar-h) + 6.5rem)' }}>
      <BackLink to={`/biblioteca/${f.id}`}>{f.name}</BackLink>
      <h1 className="mt-0.5 font-book text-[28px] font-semibold leading-tight tracking-tight">Elegí qué agregar</h1>
      <p className="mt-2 text-[15px] leading-snug text-muted">
        Van a tu repertorio con {f.side === 'white' ? 'blancas' : 'negras'}. Lo que ya tenés viene sin marcar.
      </p>

      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="text-sm text-muted" aria-live="polite">
          {chosen.size === 0 ? 'No elegiste ninguna línea' : `Elegiste ${chosen.size} de ${f.lines.length}`}
        </p>
        <button
          onClick={() => setChosen(all ? new Set() : new Set(f.lines.map((l) => l.id)))}
          className="-mr-2 min-h-11 rounded-lg px-2 text-[15px] font-medium text-brass transition hover:bg-surface"
        >
          {all ? 'Desmarcar todas' : 'Marcar todas'}
        </button>
      </div>

      {variants.length > 0 && <Group title="Variantes">{variants.map(row)}</Group>}
      {traps.length > 0 && <Group title="Trampas">{traps.map(row)}</Group>}

      <p className="mt-6 text-[15px] leading-snug text-muted">
        Antes de guardar ves cada jugada que se suma. Si algo choca con lo que ya jugás, decidís vos; por defecto se queda lo
        tuyo.
      </p>

      <ActionBar>
        <ActionButton disabled={chosen.size === 0 || busy} onClick={onReview}>
          Revisar
        </ActionButton>
      </ActionBar>
    </div>
  );
}

export function FichaAddScreen({ id }: { id: string }) {
  const { ficha: f, error, retry } = useFicha(id);
  const graphs = useGraphs();
  const [picked, setPicked] = useState<Set<string> | null>(null);
  const [review, setReview] = useState<{ pgn: string; ids: string[]; graph: RepertoireGraph } | null>(null);
  const [busy, setBusy] = useState(false);
  const top = useRef<HTMLDivElement>(null);

  // Al pasar de la lista a la vista previa (o volver), se arranca desde arriba.
  useLayoutEffect(() => {
    const main = top.current?.closest('main');
    if (main) main.scrollTop = 0;
  }, [review]);

  if (error) return <LibraryLoadFailed onRetry={retry} />;
  if (f === null || !graphs) return <div ref={top} />;
  if (!f) return <FichaNotFound />;

  // Hasta que se toque algo, vienen marcadas las líneas que todavía no están completas.
  const chosen =
    picked ?? new Set(f.lines.filter((l) => lineStatus(l, f.side, graphs[f.side]).kind !== 'added').map((l) => l.id));

  const startReview = async () => {
    setBusy(true);
    try {
      const ids = f.lines.filter((l) => chosen.has(l.id)).map((l) => l.id);
      setPicked(chosen);
      setReview({ pgn: fichaPgn(f, ids), ids, graph: await loadGraph(f.side) });
    } catch (e) {
      showToast(`No se pudo preparar la vista previa: ${e instanceof Error ? e.message : 'error desconocido'}.`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div ref={top}>
      {review ? (
        <ImportPreview
          key={`${f.side}:${review.pgn}`}
          pgn={review.pgn}
          side={f.side}
          graph={review.graph}
          title={`Agregar ${f.name}`}
          proposeNames={() => fichaNames(f, review.ids)}
          onSaved={({ mine, rival }) => {
            const total = mine + rival;
            showToast(
              total
                ? `Sumaste ${plural(total, 'jugada', 'jugadas')}, ${mine} para aprender.`
                : 'Ya tenías todo eso en tu repertorio.',
            );
            navigate(`/biblioteca/${f.id}`, true);
          }}
          onBack={() => setReview(null)}
        />
      ) : (
        <Picker f={f} graphs={graphs} chosen={chosen} setChosen={setPicked} onReview={() => void startReview()} busy={busy} />
      )}
    </div>
  );
}
