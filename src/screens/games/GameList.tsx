import { useLiveQuery } from 'dexie-react-hooks';
import { useId, useState } from 'react';
import { figurine } from '../../chess/position';
import { countGames, gamesPage, outcomeKind, type GameFilter, type OutcomeFilter } from '../../games/store';
import type { GameRow } from '../../types';
import { Button, Section, Segmented } from '../../ui/kit';
import { href } from '../../ui/router';
import { useSessionState } from '../../ui/sessionState';
import { gamePath, moveNumber, OUTCOME_LABEL, plural, resultLabel, timeClassLabel } from './format';

const PAGE = 50;

const OUTCOME_FILTERS: { value: OutcomeFilter; label: string }[] = [
  { value: 'todas', label: 'Todas' },
  { value: 'desvios', label: 'Desvíos' },
  { value: 'novedades', label: 'Novedades del rival' },
  { value: 'dentro', label: 'Dentro del repertorio' },
  { value: 'fuera', label: 'Fuera del repertorio' },
];

/**
 * La lista paginada: consulta en vivo solo las páginas que se ven, así una carga del historial la va llenando.
 * El filtro y cuántas filas se ven quedan en el módulo: al volver de una partida la lista es la misma y el scroll
 * cae en la fila de antes.
 */
export function GameList({ hasGames }: { hasGames: boolean }) {
  const [filter, setFilter] = useSessionState<GameFilter>('partidas.filtro', { color: 'todas', outcome: 'todas' });
  const [limit, setLimit] = useSessionState('partidas.filas', PAGE);
  // Lo que se anuncia: solo al cambiar el filtro, no con cada partida que guarda una carga en curso.
  const [announce, setAnnounce] = useState('');
  const rows = useLiveQuery(() => gamesPage(filter, 0, limit), [filter, limit]);
  const count = useLiveQuery(() => countGames(filter), [filter]);
  const selectId = useId();
  const change = (patch: Partial<GameFilter>) => {
    const next = { ...filter, ...patch };
    setFilter(next);
    setLimit(PAGE);
    void countGames(next).then((n) => setAnnounce(`Con este filtro: ${plural(n, 'partida', 'partidas')}.`));
  };

  return (
    <Section
      title="Tus partidas"
      aside={
        <>
          <span className="text-sm text-muted">
            {hasGames && count !== undefined ? plural(count, 'partida', 'partidas') : ''}
          </span>
          {/* Montada siempre: la región viva solo cambia su texto. */}
          <span className="sr-only" aria-live="polite">
            {announce}
          </span>
        </>
      }
    >
      {!hasGames ? (
        <p className="text-[15px] text-muted">Todavía no importaste partidas.</p>
      ) : (
        <>
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <Segmented
              label="Color"
              value={filter.color}
              onChange={(color) => change({ color })}
              options={[
                { value: 'todas', label: 'Todas' },
                { value: 'white', label: 'Blancas' },
                { value: 'black', label: 'Negras' },
              ]}
            />
            <div className="flex min-w-56 flex-1 items-center gap-3">
              <label htmlFor={selectId} className="text-[15px] text-muted">
                Resultado
              </label>
              <select
                id={selectId}
                value={filter.outcome}
                onChange={(e) => change({ outcome: e.target.value as OutcomeFilter })}
                className="min-h-11 min-w-0 flex-1 rounded-xl bg-surface px-3 text-[16px] text-ink ring-1 ring-line outline-none focus:ring-brass"
              >
                {OUTCOME_FILTERS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {rows && rows.length === 0 ? (
            <p className="text-[15px] text-muted">Ninguna partida con ese filtro.</p>
          ) : (
            rows && (
              <ul className="divide-y divide-line overflow-hidden rounded-xl ring-1 ring-line">
                {rows.map((g) => (
                  <GameItem key={g.id} game={g} />
                ))}
              </ul>
            )
          )}
          {rows && count !== undefined && rows.length < count && (
            <Button className="mt-3 w-full" onClick={() => setLimit((l) => l + PAGE)}>
              Ver más
            </Button>
          )}
        </>
      )}
    </Section>
  );
}

function GameItem({ game }: { game: GameRow }) {
  const o = game.outcome;
  // Una fila vieja con endOfBook en la jugada 0 se muestra como fuera del repertorio, igual que la filtra la lista.
  const kind = outcomeKind(o);
  const detail =
    o.kind === 'myDeviation'
      ? `Jugaste ${figurine(o.playedSan)} en vez de ${figurine(o.expectedSan)} (jugada ${moveNumber(o.ply)})`
      : o.kind === 'gap'
        ? `${figurine(o.playedSan)} en la jugada ${moveNumber(o.ply)}`
        : o.kind === 'endOfBook' && kind === 'endOfBook'
          ? `Tras ${plural(Math.ceil(o.ply / 2), 'jugada', 'jugadas')}`
          : '';
  const tone = kind === 'myDeviation' ? 'text-bad' : kind === 'gap' ? 'text-brass' : 'text-muted';
  return (
    <li>
      <a href={href(gamePath(game.id))} className="block px-3 py-2.5 transition active:bg-raised">
        <div className="flex items-baseline justify-between gap-3 text-[15px]">
          <span className="truncate">
            vs {game.opponent}{' '}
            <span className="text-muted">
              · {timeClassLabel(game.timeClass)} · {resultLabel(game.result)}
            </span>
          </span>
          <span className="shrink-0 text-sm text-muted">
            {new Date(game.endTime).toLocaleDateString('es', { day: 'numeric', month: 'short' })}
          </span>
        </div>
        <p className={`text-sm ${tone}`}>
          {OUTCOME_LABEL[kind]}
          {detail && ` · ${detail}`}
        </p>
      </a>
    </li>
  );
}
