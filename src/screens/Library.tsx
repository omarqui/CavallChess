import { useMemo, useState } from 'react';
import type { Side } from '../chess/position';
import { useGraphs } from '../db/hooks';
import { groupFichas, searchFichas, useLibrary } from '../library/catalog';
import { fichaProgress } from '../library/status';
import type { Ficha } from '../library/types';
import { LibraryError } from '../ui/LibraryError';
import { MiniBoard } from '../ui/MiniBoard';
import { href, navigate, useRoute } from '../ui/router';
import { Screen, Segmented } from '../ui/kit';
import { Tip } from '../ui/Tip';

const LEVEL: Record<string, string> = { principiante: 'Principiante', club: 'Club' };

function Chip({ children, tone = 'plain' }: { children: string; tone?: 'plain' | 'good' }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
        tone === 'good' ? 'bg-good-soft text-ink ring-1 ring-good/30' : 'bg-surface text-muted ring-1 ring-line'
      }`}
    >
      {children}
    </span>
  );
}

function FichaRow({ ficha, progress }: { ficha: Ficha; progress?: { added: number; total: number } }) {
  const traps = ficha.lines.filter((l) => l.kind !== 'variante').length;
  const epd = ficha.start.at(-1)?.epd ?? ficha.start[0]?.fromEpd ?? 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -';
  return (
    <a
      href={href(`/biblioteca/${ficha.id}`)}
      className="flex min-h-11 items-center gap-3.5 rounded-2xl bg-surface p-3 ring-1 ring-line transition hover:bg-raised active:scale-[0.99]"
    >
      <div className="w-[88px] shrink-0">
        <MiniBoard epd={epd} orientation={ficha.side} />
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="font-book text-[17px] font-semibold leading-snug">{ficha.name}</h3>
        <p className="mt-0.5 truncate text-sm text-muted">{ficha.summary}</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {ficha.levels.map((l) => (
            <Chip key={l}>{LEVEL[l] ?? l}</Chip>
          ))}
          {traps > 0 && <Chip>{`${traps} ${traps === 1 ? 'trampa' : 'trampas'}`}</Chip>}
          {progress &&
            progress.total > 0 &&
            (progress.added === progress.total ? (
              <Chip tone="good">En tu repertorio</Chip>
            ) : progress.added > 0 ? (
              <Chip tone="good">{`${progress.added} de ${progress.total} líneas`}</Chip>
            ) : null)}
        </div>
      </div>
    </a>
  );
}

export function LibraryScreen() {
  const route = useRoute();
  const { fichas, error, retry } = useLibrary();
  const graphs = useGraphs();
  const [query, setQuery] = useState('');
  const side: Side = route.params.get('lado') === 'black' ? 'black' : 'white';

  const searching = query.trim().length > 0;
  const groups = useMemo(() => (fichas ? groupFichas(fichas, side) : []), [fichas, side]);
  const found = useMemo(() => (fichas && searching ? searchFichas(fichas, query) : []), [fichas, query, searching]);

  const row = (f: Ficha) => <FichaRow key={f.id} ficha={f} progress={graphs ? fichaProgress(f, graphs[f.side]) : undefined} />;

  return (
    <Screen title="Biblioteca">
      <p className="-mt-1 mb-4 text-[15px] text-muted">Aperturas listas para sumar a tu repertorio, con ideas y trampas.</p>
      {groups.length > 0 && (
        <Tip id="biblioteca">
          Cada ficha explica una apertura en dos capas: lo básico primero y lo de club después. Con «Agregar al repertorio» la volvés entrenable.
        </Tip>
      )}
      <Segmented
        label="Color"
        value={side}
        options={[
          { value: 'white', label: 'Con blancas' },
          { value: 'black', label: 'Con negras' },
        ]}
        onChange={(v) => navigate(`/biblioteca?lado=${v}`, true)}
      />
      <input
        type="search"
        aria-label="Buscar aperturas"
        placeholder="Buscar por nombre o código ECO"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="mt-3 min-h-11 w-full rounded-xl bg-surface px-4 text-base text-ink ring-1 ring-line placeholder:text-muted focus:outline-2 focus:outline-brass"
      />

      {error ? (
        <LibraryError className="mt-6" onRetry={retry} />
      ) : !fichas ? null : searching ? (
        found.length ? (
          <div className="mt-5 flex flex-col gap-3">{found.map(row)}</div>
        ) : (
          <p className="mt-10 text-center text-muted">No hay aperturas que coincidan con “{query.trim()}”.</p>
        )
      ) : groups.length ? (
        groups.map((g) => (
          <section key={g.group} className="mt-6">
            <h2 className="mb-2 font-book text-lg font-semibold">{g.group}</h2>
            <div className="flex flex-col gap-3">{g.fichas.map(row)}</div>
          </section>
        ))
      ) : (
        <p className="mt-10 text-center text-muted">Todavía no hay aperturas para este color.</p>
      )}
    </Screen>
  );
}

/** Provisorio hasta las Tareas 13 y 14. */
export function LibraryComingSoon() {
  return (
    <Screen title="Próximamente">
      <p className="text-muted">Esta parte de la biblioteca todavía está en camino.</p>
      <a href={href('/biblioteca')} className="mt-4 inline-flex min-h-11 items-center font-medium underline underline-offset-2">
        Volver a la biblioteca
      </a>
    </Screen>
  );
}
