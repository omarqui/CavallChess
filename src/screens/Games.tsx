import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { figurine, nodeId, playUci } from '../chess/position';
import { db } from '../db/db';
import { useGaps, useGraphs, useSettings } from '../db/hooks';
import { useLibrary } from '../library/catalog';
import { findFichasForMove } from '../library/status';
import { archiveMonth } from '../games/chesscom';
import { countGames, gamesPage, recalcGames, type GameFilter, type OutcomeFilter } from '../games/store';
import { loadOlderGames, syncChesscom } from '../games/sync';
import type { GameRow, Gap, Settings } from '../types';
import { arrow, Board } from '../ui/Board';
import { Banner, Button, MoveLine, Screen, Section, Segmented, sideLabel } from '../ui/kit';
import { Tip } from '../ui/Tip';
import { navigate } from '../ui/router';

const PAGE = 50;

const plural = (n: number, one: string, many: string) => `${n.toLocaleString('es')} ${n === 1 ? one : many}`;

/**
 * Lo que trabaja contra la base: actualizar, cargar el historial y recalcular. Corre una sola a la vez y, mientras
 * tanto, los botones de las otras quedan deshabilitados.
 */
type Job = 'sync' | 'history' | 'recalc';
type RunJob = (job: Job, task: () => Promise<void>) => Promise<void>;

export function GamesScreen() {
  const settings = useSettings();
  const gaps = useGaps();
  const graphs = useGraphs();
  const total = useLiveQuery(() => db.games.count());
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [job, setJob] = useState<Job | null>(null);
  const running = useRef(false);
  if (!settings || !gaps || total === undefined || !graphs) return null;

  const run: RunJob = async (next, task) => {
    if (running.current) return;
    running.current = true;
    setJob(next);
    try {
      await task();
    } finally {
      running.current = false;
      setJob(null);
    }
  };

  const sync = () =>
    run('sync', async () => {
      setError(null);
      try {
        const r = await syncChesscom(setStatus);
        setStatus(
          r.imported
            ? `${r.imported} ${r.imported === 1 ? 'partida nueva' : 'partidas nuevas'}: ${r.deviations} ${r.deviations === 1 ? 'desvío tuyo' : 'desvíos tuyos'} y ${r.gaps} ${r.gaps === 1 ? 'hueco' : 'huecos'}.`
            : 'No hay partidas nuevas.',
        );
      } catch (e) {
        setError((e as Error).message);
        setStatus(null);
      }
    });

  return (
    <Screen title="Partidas">
      {(total > 0 || gaps.length > 0) && (
        <Tip id="partidas">Un desvío hace vencer esa tarjeta hoy. Un hueco es algo que te jugaron y no tenés preparado.</Tip>
      )}
      {!settings.chesscomUser ? (
        <Banner>
          Para cruzar tus partidas con el repertorio, configurá tu usuario de Chess.com en{' '}
          <button className="font-semibold underline underline-offset-2" onClick={() => navigate('/settings')}>
            Ajustes
          </button>
          .
        </Banner>
      ) : (
        <div>
          <p className="text-[15px] text-muted">
            Chess.com · {settings.chesscomUser}
            {settings.lastChesscomSync &&
              ` · actualizado ${new Date(settings.lastChesscomSync).toLocaleString('es', { dateStyle: 'short', timeStyle: 'short' })}`}
          </p>
          <Button variant="primary" className="mt-3 w-full" disabled={!!job} onClick={() => void sync()}>
            {job === 'sync' ? 'Actualizando…' : 'Actualizar partidas'}
          </Button>
          {status && <p className="mt-2 text-[15px] text-muted">{status}</p>}
          {error && (
            <div className="mt-3">
              <Banner tone="bad">{error}</Banner>
            </div>
          )}
        </div>
      )}

      <Section title="Huecos del repertorio" aside={gaps.length > 0 && <span className="text-sm text-muted">{gaps.length}</span>}>
        {gaps.length === 0 ? (
          <p className="text-[15px] text-muted">
            Cuando un rival juegue algo que tu repertorio no cubre, aparece acá para que prepares tu respuesta.
          </p>
        ) : (
          <ul className="space-y-3">
            {gaps.slice(0, 30).map((g) => (
              <GapItem key={g.id} gap={g} graphs={graphs} />
            ))}
          </ul>
        )}
      </Section>

      <GameList hasGames={total > 0} />
      {settings.chesscomUser && <HistorySection settings={settings} job={job} run={run} />}
      {total > 0 && <ToolsSection job={job} run={run} />}
    </Screen>
  );
}

const OUTCOME_FILTERS: { value: OutcomeFilter; label: string }[] = [
  { value: 'todas', label: 'Todas' },
  { value: 'desvios', label: 'Desvíos' },
  { value: 'novedades', label: 'Novedades del rival' },
  { value: 'dentro', label: 'Dentro del repertorio' },
  { value: 'fuera', label: 'Fuera del repertorio' },
];

/** La lista paginada: consulta en vivo solo las páginas que se ven, así una carga del historial la va llenando. */
function GameList({ hasGames }: { hasGames: boolean }) {
  const [filter, setFilter] = useState<GameFilter>({ color: 'todas', outcome: 'todas' });
  const [limit, setLimit] = useState(PAGE);
  const rows = useLiveQuery(() => gamesPage(filter, 0, limit), [filter, limit]);
  const count = useLiveQuery(() => countGames(filter), [filter]);
  const selectId = useId();
  const change = (patch: Partial<GameFilter>) => {
    setFilter((f) => ({ ...f, ...patch }));
    setLimit(PAGE);
  };

  return (
    <Section
      title="Tus partidas"
      aside={
        hasGames &&
        count !== undefined && (
          <span className="text-sm text-muted" aria-live="polite">
            {plural(count, 'partida', 'partidas')}
          </span>
        )
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

/** "2026-08" → "agosto de 2026". */
const monthName = (month: string) => {
  const [y, m] = month.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('es', { month: 'long', year: 'numeric' });
};

/** El mes más viejo leído (las claves son urls de archivo; se aceptan también "AAAA-MM", como `olderArchives`). */
const oldestMonth = (s: Settings) =>
  Object.keys(s.chesscomMonths ?? {})
    .map((k) => (k.includes('/') ? archiveMonth(k) : k))
    .sort()[0];

interface Progress {
  text: string;
  /** De 0 a 100, o `null` mientras todavía no se sabe cuánto falta. */
  value: number | null;
}

function ProgressBox({
  label,
  progress,
  onCancel,
  cancelling,
  children,
}: {
  label: string;
  progress: Progress;
  onCancel?: () => void;
  cancelling?: boolean;
  children?: ReactNode;
}) {
  return (
    <div className="mt-3 rounded-xl bg-surface px-3 py-2 ring-1 ring-line">
      <div className="flex min-h-11 items-center justify-between gap-3">
        <p className="text-[15px] tabular-nums" aria-live="polite">
          {progress.text}
        </p>
        {onCancel && (
          <Button variant="ghost" className="-mr-2 shrink-0" disabled={cancelling} onClick={onCancel}>
            {cancelling ? 'Cancelando…' : 'Cancelar'}
          </Button>
        )}
      </div>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progress.value ?? undefined}
        className="mb-2 h-1.5 overflow-hidden rounded-full bg-line"
      >
        <div
          className="h-full rounded-full bg-brass transition-[width] duration-300"
          style={{ width: `${progress.value ?? 0}%` }}
        />
      </div>
      {children}
    </div>
  );
}

function HistorySection({ settings, job, run }: { settings: Settings; job: Job | null; run: RunJob }) {
  const [progress, setProgress] = useState<Progress | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const abort = useRef<AbortController | null>(null);
  // Salir de la pantalla corta la carga (se mira entre mes y mes). Lo leído queda guardado y la próxima sigue desde ahí;
  // así nunca corren dos cargas a la vez pidiendo los mismos meses.
  useEffect(() => () => abort.current?.abort(), []);
  const oldest = oldestMonth(settings);

  const load = (months: number | 'all') =>
    run('history', async () => {
      const controller = new AbortController();
      abort.current = controller;
      setResult(null);
      setError(null);
      setCancelling(false);
      setProgress({ text: 'Buscando archivos…', value: null });
      let monthsToRead = 0;
      try {
        const r = await loadOlderGames({
          months,
          signal: controller.signal,
          onProgress: (msg, done, total) => {
            monthsToRead = total;
            if (done < total) {
              setProgress({ text: `${msg.replace(/…$/, '')} · ${done + 1} de ${total}`, value: (done / total) * 100 });
            }
          },
        });
        const left = r.remaining
          ? ` Quedan ${plural(r.remaining, 'mes más viejo', 'meses más viejos')}.`
          : '';
        setResult(
          r.cancelled
            ? `Cancelaste la carga. Sumaste ${plural(r.imported, 'partida', 'partidas')}.${left}`
            : monthsToRead === 0
              ? 'Ya tenías todo el historial cargado.'
              : `Sumaste ${plural(r.imported, 'partida', 'partidas')}.${left}`,
        );
      } catch (e) {
        setError(`${(e as Error).message} Lo que ya se leyó quedó guardado: la próxima carga sigue desde ahí.`);
      } finally {
        abort.current = null;
        setProgress(null);
      }
    });

  return (
    <Section title="Historial">
      <p className="text-[15px] text-muted">
        {oldest ? `Tenés tus partidas desde ${monthName(oldest)}. ` : ''}Actualizar trae solo lo nuevo; para sumar meses más
        viejos, cargalos acá.
      </p>
      {job === 'history' && progress ? (
        <ProgressBox
          label="Carga del historial"
          progress={progress}
          cancelling={cancelling}
          onCancel={() => {
            setCancelling(true);
            abort.current?.abort();
          }}
        >
          <p className="pb-1 text-sm text-muted">Si salís de Partidas, la carga se corta; lo leído queda guardado.</p>
        </ProgressBox>
      ) : (
        <div className="mt-3 flex flex-col gap-3">
          <Button disabled={!!job} onClick={() => void load(6)}>
            Cargar partidas anteriores (6 meses)
          </Button>
          <Button disabled={!!job} onClick={() => void load('all')}>
            Cargar todo el historial
          </Button>
        </div>
      )}
      {result && (
        <p role="status" className="mt-2 text-[15px] text-muted">
          {result}
        </p>
      )}
      {error && (
        <div className="mt-3">
          <Banner tone="bad">{error}</Banner>
        </div>
      )}
    </Section>
  );
}

function ToolsSection({ job, run }: { job: Job | null; run: RunJob }) {
  const [progress, setProgress] = useState<Progress | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const recalc = () =>
    run('recalc', async () => {
      setResult(null);
      setError(null);
      setProgress({ text: 'Recalculando…', value: null });
      try {
        const r = await recalcGames((done, total) =>
          setProgress({ text: `Recalculando · ${done.toLocaleString('es')} de ${total.toLocaleString('es')}`, value: (done / total) * 100 }),
        );
        setResult(`Recalculaste ${plural(r.games, 'partida', 'partidas')}: ${plural(r.gaps, 'hueco', 'huecos')}.`);
      } catch (e) {
        setError(`No se pudo recalcular: ${(e as Error).message}`);
      } finally {
        setProgress(null);
      }
    });

  return (
    <Section title="Con tu repertorio">
      <Button className="w-full" disabled={!!job} onClick={() => navigate('/games/armar')}>
        Armar repertorio desde tus partidas
      </Button>
      <p className="mt-1.5 text-sm text-muted">
        Tu jugada más repetida en cada posición y las respuestas que más te hacen. Lo revisás antes de guardar.
      </p>

      <Button className="mt-5 w-full" disabled={!!job} onClick={() => void recalc()}>
        Recalcular contra el repertorio actual
      </Button>
      <p className="mt-1.5 text-sm text-muted">
        Cada partida guarda cómo le fue contra el repertorio que tenías al bajarla. Si lo cambiaste, recalculá para poner al
        día la lista y los huecos.
      </p>
      {job === 'recalc' && progress && <ProgressBox label="Recálculo" progress={progress} />}
      {result && (
        <p role="status" className="mt-2 text-[15px] text-muted">
          {result}
        </p>
      )}
      {error && (
        <div className="mt-3">
          <Banner tone="bad">{error}</Banner>
        </div>
      )}
    </Section>
  );
}

function GapItem({ gap, graphs }: { gap: Gap; graphs: NonNullable<ReturnType<typeof useGraphs>> }) {
  const g = graphs[gap.side];
  const id = nodeId(gap.side, gap.epd);
  const path = g.pathFromRoot(id) ?? g.anyPathFromRoot(id) ?? [];
  const covered = g.edges.has(`${id}|${gap.uci}`);
  const [from, to] = [gap.uci.slice(0, 2), gap.uci.slice(2, 4)];
  const played = playUci(gap.epd, gap.uci);
  const lib = useLibrary().fichas;
  const ficha = lib ? findFichasForMove(lib, gap.side, gap.epd, gap.uci)[0] : undefined;
  return (
    <li className="flex gap-3 rounded-xl p-3 ring-1 ring-line">
      <div className="w-24 shrink-0">
        <Board epd={gap.epd} orientation={gap.side} coordinates={false} shapes={[arrow(from, to, 'red')]} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-muted">
          {sideLabel(gap.side)} · {gap.count} {gap.count === 1 ? 'vez' : 'veces'}
        </p>
        <div className="mt-1 text-[15px]">
          <MoveLine moves={[...path, { san: played?.san ?? gap.san, id: 'gap' }]} active={path.length} />
        </div>
        {covered ? (
          <p className="mt-2 text-sm text-good">Ya está en tu repertorio.</p>
        ) : (
          <Button
            className="mt-2 !min-h-9"
            onClick={() =>
              navigate(`/repertoire/${gap.side}?node=${encodeURIComponent(id)}&gap=${encodeURIComponent(gap.san)}`)
            }
          >
            Preparar respuesta a {figurine(gap.san)}
          </Button>
        )}
        {ficha && (
          <Button className="mt-2" onClick={() => navigate(`/biblioteca/${ficha.id}`)}>
            Mirá la ficha: {ficha.name}
          </Button>
        )}
      </div>
    </li>
  );
}

const OUTCOME: Record<GameRow['outcome']['kind'], string> = {
  inBook: 'Dentro del repertorio',
  endOfBook: 'Terminó tu preparación',
  myDeviation: 'Te desviaste',
  gap: 'Novedad del rival',
  noBook: 'Fuera del repertorio',
};

function GameItem({ game }: { game: GameRow }) {
  const o = game.outcome;
  const detail =
    o.kind === 'myDeviation'
      ? `Jugaste ${figurine(o.playedSan)} en vez de ${figurine(o.expectedSan)} (jugada ${Math.floor(o.ply / 2) + 1})`
      : o.kind === 'gap'
        ? `${figurine(o.playedSan)} en la jugada ${Math.floor(o.ply / 2) + 1}`
        : o.kind === 'endOfBook'
          ? `Tras ${Math.ceil(o.ply / 2)} jugadas`
          : '';
  const tone = o.kind === 'myDeviation' ? 'text-bad' : o.kind === 'gap' ? 'text-brass' : 'text-muted';
  const result = game.result === 'win' ? 'Ganaste' : ['checkmated', 'resigned', 'timeout', 'lose', 'abandoned'].includes(game.result) ? 'Perdiste' : 'Tablas';
  return (
    <li>
      <a href={'#/games/' + encodeURIComponent(game.id)} className="block px-3 py-2.5 transition active:bg-raised">
        <div className="flex items-baseline justify-between gap-3 text-[15px]">
          <span className="truncate">
            vs {game.opponent} <span className="text-muted">· {game.timeClass} · {result}</span>
          </span>
          <span className="shrink-0 text-sm text-muted">
            {new Date(game.endTime).toLocaleDateString('es', { day: 'numeric', month: 'short' })}
          </span>
        </div>
        <p className={`text-sm ${tone}`}>
          {OUTCOME[o.kind]}
          {detail && ` · ${detail}`}
        </p>
      </a>
    </li>
  );
}
