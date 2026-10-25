import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { db } from '../db/db';
import { useGraphs } from '../db/hooks';
import { buildFromGames } from '../games/aggregate';
import type { Side } from '../types';
import { ImportPreview } from '../ui/ImportPreview';
import { BackLink, Banner, Segmented } from '../ui/kit';
import { navigate } from '../ui/router';
import { showToast } from '../ui/toast';
import { ActionBar, ActionButton } from './Ficha';
import { plural, savedMessage, sentence } from './games/format';

const DAY = 86_400_000;
type Period = '3' | '12' | 'all';
const SINCE_DAYS: Record<Exclude<Period, 'all'>, number> = { '3': 90, '12': 365 };

/** Un número chico con botones de 44 px: en el teléfono es más cómodo que tipearlo. */
function Stepper({
  label,
  hint,
  value,
  min,
  max,
  less,
  more,
  onChange,
}: {
  label: string;
  hint: string;
  value: number;
  min: number;
  max: number;
  /** Nombre accesible de los botones ("Menos profundidad", "Más profundidad"). */
  less: string;
  more: string;
  onChange: (v: number) => void;
}) {
  const id = useId();
  const step = (d: number) => onChange(Math.min(max, Math.max(min, value + d)));
  const button = 'grid size-11 place-items-center text-xl font-medium text-ink transition disabled:opacity-30 active:bg-raised';
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3">
      <div className="min-w-0">
        <p id={id} className="leading-snug">
          {label}
        </p>
        <p className="mt-0.5 text-sm text-balance text-muted">{hint}</p>
      </div>
      <div role="group" aria-labelledby={id} className="flex shrink-0 items-center overflow-hidden rounded-xl bg-paper ring-1 ring-line">
        <button aria-label={less} className={button} disabled={value <= min} onClick={() => step(-1)}>
          −
        </button>
        <output aria-live="polite" className="w-8 text-center text-[17px] font-semibold tabular-nums">
          {value}
        </output>
        <button aria-label={more} className={button} disabled={value >= max} onClick={() => step(1)}>
          +
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="px-4 py-3">
      <p className="mb-2 leading-snug">{label}</p>
      {children}
    </div>
  );
}

/** Armar repertorio desde muchas partidas (`#/games/armar`): opciones, y después la vista previa de importación. */
export function BuildFromGamesScreen() {
  const graphs = useGraphs();
  const [side, setSide] = useState<Side>('white');
  const [depth, setDepth] = useState(8);
  const [minRival, setMinRival] = useState(2);
  const [period, setPeriod] = useState<Period>('12');
  const [busy, setBusy] = useState(false);
  const [empty, setEmpty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ pgn: string; side: Side; gamesUsed: number } | null>(null);
  const top = useRef<HTMLDivElement>(null);
  const notice = useRef<HTMLDivElement>(null);

  // Al pasar de las opciones a la vista previa (o volver), se arranca desde arriba.
  useLayoutEffect(() => {
    const main = top.current?.closest('main');
    if (main) main.scrollTop = 0;
  }, [preview]);

  // El aviso va debajo de las opciones: se lleva a la vista por si quedó tapado por el botón fijo.
  useEffect(() => {
    if (empty || error) notice.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [empty, error]);

  if (!graphs) return <div ref={top} />;

  /** Cambiar una opción borra los avisos ("no hay suficientes partidas" o un error): eran de las opciones anteriores. */
  const option =
    <T,>(set: (v: T) => void) =>
    (v: T) => {
      set(v);
      setEmpty(false);
      setError(null);
    };

  const build = async () => {
    setBusy(true);
    setEmpty(false);
    setError(null);
    try {
      // Con miles de partidas armar tarda unos segundos: primero se deja dibujar el "Armando…".
      await new Promise((r) => setTimeout(r, 0));
      const games = await db.games.toArray();
      const since = period === 'all' ? undefined : Date.now() - SINCE_DAYS[period] * DAY;
      const r = buildFromGames(games, side, { maxOwnMoves: depth, minRival, since });
      if (r.pgn) setPreview({ pgn: r.pgn, side, gamesUsed: r.gamesUsed });
      else setEmpty(true);
    } catch (e) {
      setError(`No se pudo armar la vista previa: ${sentence(e instanceof Error ? e.message : 'error desconocido')}`);
    } finally {
      setBusy(false);
    }
  };

  if (preview) {
    return (
      <div ref={top}>
        <ImportPreview
          key={`${preview.side}:${preview.pgn}`}
          pgn={preview.pgn}
          side={preview.side}
          graph={graphs[preview.side]}
          title="Repertorio desde tus partidas"
          proposeNames={() => []}
          onSaved={(saved) => {
            showToast(savedMessage(saved));
            navigate(`/repertoire/${preview.side}`, true);
          }}
          onBack={() => setPreview(null)}
        >
          <p className="mt-2 text-[15px] text-muted">A partir de {plural(preview.gamesUsed, 'partida', 'partidas')}.</p>
          <div className="mt-3">
            <Banner>Esto copia lo que jugaste, incluidos los errores: revisá las líneas con el motor en el editor.</Banner>
          </div>
        </ImportPreview>
      </div>
    );
  }

  return (
    <div
      ref={top}
      className="mx-auto w-full max-w-xl px-4 safe-top"
      style={{ paddingBottom: 'calc(var(--tabbar-h) + 6.5rem)' }}
    >
      <BackLink to="/games">Partidas</BackLink>
      <h1 className="mt-0.5 font-book text-[28px] font-semibold leading-tight tracking-tight">Repertorio desde tus partidas</h1>
      <p className="mt-2 text-[15px] leading-snug text-muted">
        En cada posición tuya entra la jugada que más elegiste y, del rival, las respuestas que más se repiten. Lo que ya
        tenés no se pisa: si algo choca, decidís vos.
      </p>

      <div className="mt-5 divide-y divide-line rounded-2xl bg-surface ring-1 ring-line">
        <Field label="Color">
          <Segmented
            label="Color"
            value={side}
            onChange={option(setSide)}
            options={[
              { value: 'white', label: 'Blancas' },
              { value: 'black', label: 'Negras' },
            ]}
          />
        </Field>
        <Stepper
          label="Profundidad"
          hint="De 4 a 15 jugadas tuyas por línea"
          value={depth}
          min={4}
          max={15}
          less="Menos profundidad"
          more="Más profundidad"
          onChange={option(setDepth)}
        />
        <Stepper
          label="Mínimo de partidas para una respuesta del rival"
          hint="De 1 a 10"
          value={minRival}
          min={1}
          max={10}
          less="Menos partidas mínimas"
          more="Más partidas mínimas"
          onChange={option(setMinRival)}
        />
        <Field label="Período">
          <Segmented
            label="Período"
            value={period}
            onChange={option(setPeriod)}
            options={[
              { value: '3', label: '3 meses' },
              { value: '12', label: '12 meses' },
              { value: 'all', label: 'Todo lo cargado' },
            ]}
          />
        </Field>
      </div>

      {/* Las regiones vivas quedan montadas; solo aparece o se va el aviso de adentro. */}
      <div ref={notice} style={{ scrollMarginBottom: 'calc(var(--tabbar-h) + 6.5rem)' }}>
        <div role="status">
          {empty && (
            <div className="mt-4">
              <Banner>No hay suficientes partidas con ese filtro. Probá con un período más largo o un mínimo más bajo.</Banner>
            </div>
          )}
        </div>
        <div role="alert">
          {error && (
            <div className="mt-4">
              <Banner tone="bad">{error}</Banner>
            </div>
          )}
        </div>
      </div>

      <ActionBar>
        <ActionButton disabled={busy} onClick={() => void build()}>
          {busy ? 'Armando…' : 'Ver vista previa'}
        </ActionButton>
      </ActionBar>
    </div>
  );
}
