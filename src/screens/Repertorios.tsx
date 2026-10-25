import { useId, useState } from 'react';
import type { RepertoireGraph } from '../chess/graph';
import { repertoiresOf } from '../db/active';
import { useActive, useCards, useRepertoireState } from '../db/hooks';
import { createRepertoire, deleteRepertoire, duplicateRepertoire, renameRepertoire, setActiveRepertoire } from '../db/repo';
import { recalcGames } from '../games/store';
import { isDue } from '../srs/scheduler';
import type { CardRow, Repertoire, Side } from '../types';
import { BackLink, Banner, Button, Icon, ICONS, Segmented, Toggle } from '../ui/kit';
import { navigate } from '../ui/router';
import { Feedback } from './games/Feedback';
import { plural } from './games/format';

const SIDES: { side: Side; title: string; label: string }[] = [
  { side: 'white', title: 'Con blancas', label: 'blancas' },
  { side: 'black', title: 'Con negras', label: 'negras' },
];

/** Ruta del editor para un repertorio (aunque no sea el activo). */
const editorPath = (rep: Repertoire) => `/repertoire/${rep.side}?rep=${encodeURIComponent(rep.id)}`;

/** Jugadas propias guardadas (también las archivadas): lo que se pierde al borrar el repertorio. */
const ownMoves = (g: RepertoireGraph | undefined) => (g ? [...g.edges.values()].filter((e) => e.mine).length : 0);

function summary(g: RepertoireGraph | undefined, cards: Map<string, CardRow>, now: Date): string {
  const ids = g?.trainableCardIds() ?? [];
  if (!ids.length) return 'Todavía sin jugadas';
  const due = ids.filter((id) => {
    const c = cards.get(id);
    return c && isDue(c.card, now);
  }).length;
  return `${plural(ids.length, 'jugada tuya', 'jugadas tuyas')} · ${due ? `${due} para hoy` : 'al día'}`;
}

/** Una tarea a la vez: deshabilita las acciones mientras corre y deja el error a la vista. */
type Run = (task: () => Promise<void>) => Promise<void>;

/** Lista de repertorios por color: crear, elegir con cuál entrenás, renombrar, duplicar y eliminar. */
export function RepertoriosScreen() {
  const state = useRepertoireState();
  const active = useActive();
  const cards = useCards();
  const [open, setOpen] = useState<string | null>(null);
  const [creating, setCreating] = useState<Side | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  if (!state || !active || !cards) return null;
  const now = new Date();

  const run: Run = async (task) => {
    if (busy) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      await task();
    } catch (e) {
      setError((e as Error).message || 'No se pudo completar la acción.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-xl px-4 pb-28 safe-top">
      <BackLink to="/repertoire/white">Repertorio</BackLink>
      <h1 className="mt-0.5 font-book text-[28px] font-semibold leading-tight tracking-tight">Repertorios</h1>
      <p className="mt-2 text-[15px] leading-snug text-muted">
        Cada repertorio tiene su propio progreso. Entrenás con el activo de cada color, y tus partidas de Chess.com se
        comparan con todos.
      </p>
      <Feedback result={result} error={error} />

      {SIDES.map(({ side, title, label }) => {
        const reps = repertoiresOf(state.repertoires, side);
        const current = active.repertoires[side];
        const headingId = `reps-${side}`;
        return (
          <section key={side} aria-labelledby={headingId} className="mt-7">
            <h2 id={headingId} className="mb-2 font-book text-lg font-semibold">
              {title}
            </h2>
            <ul className="divide-y divide-line overflow-hidden rounded-2xl bg-surface ring-1 ring-line">
              {reps.map((rep) => (
                <RepRow
                  key={rep.id}
                  rep={rep}
                  isActive={rep.id === current.id}
                  only={reps.length === 1}
                  sideLabel={label}
                  summary={summary(state.graphs.get(rep.id), cards, now)}
                  moves={ownMoves(state.graphs.get(rep.id))}
                  expanded={open === rep.id}
                  onToggle={() => setOpen(open === rep.id ? null : rep.id)}
                  busy={busy}
                  run={run}
                  onDone={(msg, keepOpen) => {
                    setResult(msg);
                    if (!keepOpen) setOpen(null);
                  }}
                />
              ))}
            </ul>
            {creating === side ? (
              <NewRepForm
                side={side}
                current={current}
                busy={busy}
                run={run}
                onCancel={() => setCreating(null)}
                onCreated={(rep, copy) => {
                  setCreating(null);
                  if (copy) {
                    setOpen(rep.id);
                    setResult(`Listo: creaste «${rep.name}».`);
                  } else navigate(editorPath(rep));
                }}
              />
            ) : (
              <Button className="mt-3 w-full" disabled={busy} onClick={() => setCreating(side)}>
                <Icon d={ICONS.plus} className="size-5" />
                Nuevo repertorio
              </Button>
            )}
          </section>
        );
      })}
    </div>
  );
}

type Mode = 'menu' | 'rename' | 'delete';

function RepRow({
  rep,
  isActive,
  only,
  sideLabel,
  summary,
  moves,
  expanded,
  onToggle,
  busy,
  run,
  onDone,
}: {
  rep: Repertoire;
  isActive: boolean;
  /** Único del color: no se puede eliminar. */
  only: boolean;
  sideLabel: string;
  summary: string;
  moves: number;
  expanded: boolean;
  onToggle: () => void;
  busy: boolean;
  run: Run;
  /** Terminó una acción: el mensaje para la región viva y si la fila sigue abierta. */
  onDone: (msg: string, keepOpen?: boolean) => void;
}) {
  const id = useId();
  const [mode, setMode] = useState<Mode>('menu');
  const [name, setName] = useState(rep.name);
  const shownMode = expanded ? mode : 'menu';

  const toggle = () => {
    setMode('menu');
    onToggle();
  };

  const rename = () =>
    run(async () => {
      if (!name.trim()) throw new Error('Poné un nombre.');
      await renameRepertoire(rep.id, name);
      setMode('menu');
      onDone(`Listo: ahora se llama «${name.trim().replace(/\s+/g, ' ')}».`, true);
    });

  const remove = () =>
    run(async () => {
      await deleteRepertoire(rep.id);
      // Las partidas cruzadas con este repertorio quedan viejas: se vuelven a cruzar con los que quedan.
      void recalcGames().catch(() => undefined);
      onDone(`Eliminaste «${rep.name}».`);
    });

  return (
    <li>
      <button
        aria-expanded={expanded}
        aria-controls={`${id}-panel`}
        onClick={toggle}
        className="flex min-h-14 w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-raised active:bg-raised"
      >
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="text-[15px] font-medium leading-snug">{rep.name}</span>
            {isActive && (
              <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-good-soft px-2 py-0.5 text-xs font-medium text-ink ring-1 ring-good/30">
                <Icon d={ICONS.check} className="-ml-0.5 size-3.5" />
                Activo
              </span>
            )}
          </span>
          <span className="mt-0.5 block text-sm leading-snug text-muted">{summary}</span>
        </span>
        <Icon d={ICONS.chevron} className={`size-5 text-muted transition ${expanded ? 'rotate-180' : ''}`} />
      </button>

      {expanded && (
        <div id={`${id}-panel`} className="px-4 pb-4">
          {shownMode === 'menu' && (
            <>
              <div className="flex flex-wrap gap-2">
                {!isActive && (
                  <Button
                    variant="primary"
                    disabled={busy}
                    onClick={() =>
                      run(async () => {
                        await setActiveRepertoire(rep.id);
                        // Si dos repertorios cubren igual una partida, gana el activo: se vuelven a cruzar.
                        void recalcGames().catch(() => undefined);
                        onDone(`Ahora entrenás con «${rep.name}» en ${sideLabel}.`, true);
                      })
                    }
                  >
                    <Icon d={ICONS.play} />
                    Entrenar con este
                  </Button>
                )}
                <Button disabled={busy} onClick={() => navigate(editorPath(rep))}>
                  Abrir
                </Button>
                <Button
                  disabled={busy}
                  onClick={() => {
                    setName(rep.name);
                    setMode('rename');
                  }}
                >
                  <Icon d={ICONS.pencil} />
                  Renombrar
                </Button>
                <Button
                  disabled={busy}
                  onClick={() =>
                    run(async () => {
                      const copy = await duplicateRepertoire(rep.id, `${rep.name} (copia)`);
                      void recalcGames().catch(() => undefined);
                      onDone(`Listo: creaste «${copy.name}».`);
                    })
                  }
                >
                  Duplicar
                </Button>
                <Button
                  variant="danger"
                  disabled={busy || only}
                  aria-describedby={only ? `${id}-only` : undefined}
                  onClick={() => setMode('delete')}
                >
                  Eliminar
                </Button>
              </div>
              {only && (
                <p id={`${id}-only`} className="mt-2 text-sm leading-snug text-muted">
                  Es tu único repertorio con {sideLabel}: para eliminarlo, primero creá otro.
                </p>
              )}
            </>
          )}

          {shownMode === 'rename' && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void rename();
              }}
            >
              <label className="block">
                <span className="text-sm text-muted">Nombre</span>
                <input
                  value={name}
                  autoFocus
                  required
                  maxLength={60}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 w-full rounded-xl bg-paper px-3 py-2.5 text-[16px] ring-1 ring-line outline-none focus:ring-brass"
                />
              </label>
              <div className="mt-3 flex gap-2">
                <Button type="submit" variant="primary" disabled={busy || !name.trim()}>
                  Guardar
                </Button>
                <Button type="button" variant="ghost" onClick={() => setMode('menu')}>
                  Cancelar
                </Button>
              </div>
            </form>
          )}

          {shownMode === 'delete' && (
            <Banner tone="bad">
              <p>
                {moves
                  ? `Se borran sus ${plural(moves, 'jugada', 'jugadas')} y su progreso. No se puede deshacer.`
                  : 'Se borra este repertorio, que todavía no tiene jugadas. No se puede deshacer.'}
              </p>
              <div className="mt-3 flex gap-2">
                <Button variant="primary" disabled={busy} onClick={() => void remove()}>
                  Eliminar
                </Button>
                <Button variant="ghost" onClick={() => setMode('menu')}>
                  Cancelar
                </Button>
              </div>
            </Banner>
          )}
        </div>
      )}
    </li>
  );
}

type Start = 'empty' | 'copy';

function NewRepForm({
  side,
  current,
  busy,
  run,
  onCancel,
  onCreated,
}: {
  side: Side;
  /** El activo del color: el que se copia si elegís partir de una copia. */
  current: Repertoire;
  busy: boolean;
  run: Run;
  onCancel: () => void;
  onCreated: (rep: Repertoire, copy: boolean) => void;
}) {
  const [name, setName] = useState('');
  const [start, setStart] = useState<Start>('empty');
  const [train, setTrain] = useState(true);

  const create = () =>
    run(async () => {
      if (!name.trim()) throw new Error('Poné un nombre.');
      const rep = start === 'copy' ? await duplicateRepertoire(current.id, name) : await createRepertoire(side, name);
      if (train) await setActiveRepertoire(rep.id);
      if (start === 'copy' || train) void recalcGames().catch(() => undefined);
      onCreated(rep, start === 'copy');
    });

  return (
    // Sin <form>: los botones de `Segmented` y `Toggle` no llevan `type` y lo enviarían.
    <div className="mt-3 rounded-2xl bg-surface p-4 ring-1 ring-line">
      <label className="block">
        <span className="text-sm text-muted">Nombre</span>
        <input
          value={name}
          autoFocus
          required
          maxLength={60}
          placeholder={side === 'white' ? 'Por ejemplo: Londres' : 'Por ejemplo: Siciliana'}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && name.trim()) void create();
          }}
          enterKeyHint="done"
          className="mt-1 w-full rounded-xl bg-paper px-3 py-2.5 text-[16px] ring-1 ring-line outline-none focus:ring-brass"
        />
      </label>
      <div className="mt-4">
        <span className="mb-1.5 block text-sm text-muted">Punto de partida</span>
        <Segmented
          label="Punto de partida"
          value={start}
          onChange={setStart}
          options={[
            { value: 'empty', label: 'Vacío' },
            { value: 'copy', label: `Copia de ${current.name}` },
          ]}
        />
        {start === 'copy' && (
          <p className="mt-2 text-sm leading-snug text-muted">Copia las jugadas y el progreso; desde ahí avanzan por separado.</p>
        )}
      </div>
      <div className="mt-3">
        <Toggle label="Entrenar con este" checked={train} onChange={setTrain} />
      </div>
      <div className="mt-3 flex gap-2">
        <Button variant="primary" disabled={busy || !name.trim()} onClick={() => void create()}>
          Crear
        </Button>
        <Button variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}
