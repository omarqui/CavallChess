import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import type { DrawShape } from '@lichess-org/chessground/draw';
import type { Key } from '@lichess-org/chessground/types';
import { displaySquares, figurine, INITIAL_EPD, playSan, playUci } from '../chess/position';
import { setSettings } from '../db/repo';
import { useCards, useEvents, useGraphs, useSettings } from '../db/hooks';
import { addFicha } from '../library/add';
import { loadLibrary, useLibrary } from '../library/catalog';
import type { Ficha } from '../library/types';
import { buildDailyQueue } from '../srs/queue';
import { arrow, Board, type Flash } from '../ui/Board';
import { playCorrect, playWrong } from '../ui/feedback';
import { Banner, Button, MoveLine } from '../ui/kit';
import { MiniBoard } from '../ui/MiniBoard';
import { navigate } from '../ui/router';
import { showToast } from '../ui/toast';
import { Icon } from './Ficha';
import { INTRO_CHOICES, type IntroChoice } from './intro/choices';
import { needsInstallStep } from './intro/gate';

type StepId = 'hola' | 'instalar' | 'demo' | 'repertorio' | 'chesscom' | 'listo';

const isStandalone = () =>
  window.matchMedia?.('(display-mode: standalone)').matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;

/** Marca la bienvenida como vista y sale (sin dejarla en el historial). */
async function leave(to: string) {
  try {
    await setSettings({ introSeenAt: Date.now() });
  } catch (e) {
    // Se sale igual para no dejarte atrapado en la bienvenida; si no se guardó, va a volver a aparecer.
    showToast(`No se pudo guardar que ya viste la bienvenida: ${(e as Error).message}`);
  }
  navigate(to, true);
}

export function IntroScreen() {
  const [steps] = useState<StepId[]>(() => [
    'hola',
    ...(needsInstallStep(navigator.userAgent, isStandalone()) ? (['instalar'] as const) : []),
    'demo',
    'repertorio',
    'chesscom',
    'listo',
  ]);
  const [at, setAt] = useState(0);
  const [added, setAdded] = useState<Ficha[]>([]);
  const step = steps[at];
  const next = () => setAt((i) => Math.min(steps.length - 1, i + 1));

  // La biblioteca se carga desde ya, para que el paso de elegir aperturas no espere.
  useEffect(() => void loadLibrary(), []);

  let body: ReactNode;
  switch (step) {
    case 'hola':
      body = <Welcome onNext={next} />;
      break;
    case 'instalar':
      body = <Install onNext={next} />;
      break;
    case 'demo':
      body = <Demo onNext={next} />;
      break;
    case 'repertorio':
      body = (
        <Choose
          onDone={(fichas) => {
            setAdded(fichas);
            next();
          }}
        />
      );
      break;
    case 'chesscom':
      body = <Chesscom onNext={next} />;
      break;
    case 'listo':
      body = <Done added={added} />;
      break;
  }

  return (
    <div className="mx-auto flex h-full w-full max-w-xl flex-col">
      <header className="safe-top shrink-0 px-4">
        <div className="flex h-14 items-center justify-between gap-3">
          <Dots count={steps.length} at={at} />
          <button
            onClick={() => void leave('/')}
            className="-mr-3 min-h-11 rounded-lg px-3 text-[15px] font-medium text-muted transition hover:text-ink"
          >
            Saltar
          </button>
        </div>
      </header>
      {/* Cada paso se monta de nuevo: arranca desde arriba y con el foco en su título. */}
      <div key={step} className="flex min-h-0 flex-1 flex-col transition-opacity duration-300 ease-out starting:opacity-0 motion-reduce:transition-none">
        {body}
      </div>
    </div>
  );
}

function Dots({ count, at }: { count: number; at: number }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="sr-only">
        Paso {at + 1} de {count}
      </span>
      {Array.from({ length: count }, (_, i) => (
        <span
          key={i}
          aria-hidden="true"
          className={`h-1.5 rounded-full transition-all duration-300 motion-reduce:transition-none ${
            i === at ? 'w-6 bg-brass' : i < at ? 'w-1.5 bg-ink/45' : 'w-1.5 bg-line'
          }`}
        />
      ))}
    </div>
  );
}

/** Esqueleto de un paso: contenido con scroll propio y la acción principal fija abajo. */
function Step({
  title,
  lead,
  children,
  actions,
  hero,
  focusTitle = true,
}: {
  title: string;
  lead?: ReactNode;
  children?: ReactNode;
  actions: ReactNode;
  hero?: ReactNode;
  focusTitle?: boolean;
}) {
  const h1 = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (focusTitle) h1.current?.focus({ preventScroll: true });
  }, [focusTitle]);
  return (
    <>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-8 pt-2 [mask-image:linear-gradient(to_bottom,#000_calc(100%_-_1.25rem),transparent)]">
        {hero}
        <h1
          ref={h1}
          tabIndex={-1}
          className="font-book text-[32px] font-semibold leading-[1.1] tracking-tight text-balance outline-none"
        >
          {title}
        </h1>
        {lead && <div className="mt-3 text-[17px] leading-[1.55] text-muted">{lead}</div>}
        {children}
      </div>
      <div className="shrink-0 px-4 pt-2" style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 1rem)' }}>
        {actions}
      </div>
    </>
  );
}

function Primary({ children, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...rest}
      className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-ink px-4 text-base font-semibold text-paper shadow-[0_8px_24px_-12px_rgb(0_0_0/0.5)] transition hover:opacity-90 active:scale-[0.98] disabled:opacity-60"
    >
      {children}
    </button>
  );
}

function Spinner() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5 animate-spin motion-reduce:animate-none">
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeOpacity="0.3" strokeWidth="2.5" />
      <path d="M21 12a9 9 0 0 0-9-9" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

// ─── 1. Bienvenida ───────────────────────────────────────────────────────────

const IDEAS = [
  {
    title: 'Armás tu repertorio',
    text: 'Con aperturas de la biblioteca, un estudio de Lichess o tus propias jugadas.',
  },
  {
    title: 'Lo memorizás',
    text: 'Con repasos cortos que llegan justo antes de que lo olvides.',
  },
  {
    title: 'Lo comparás con tus partidas',
    text: 'Con las de Chess.com ves dónde te saliste y qué te jugaron que no tenías.',
  },
];

function Welcome({ onNext }: { onNext: () => void }) {
  return (
    <Step
      focusTitle={false}
      hero={
        <img
          src={appIcon}
          alt=""
          className="mb-6 mt-4 size-16 rounded-[18px] shadow-[0_10px_24px_-14px_rgb(0_0_0/0.6)] ring-1 ring-line transition duration-500 ease-out starting:scale-90 starting:opacity-0 motion-reduce:transition-none"
        />
      }
      title="Hola, esto es CavallChess"
      lead="Te ayuda a aprender tus aperturas de memoria, jugándolas en el tablero."
      actions={<Primary onClick={onNext}>Empezar</Primary>}
    >
      <ol className="mt-7 space-y-5">
        {IDEAS.map((idea, i) => (
          <li
            key={idea.title}
            className="grid grid-cols-[1.75rem_1fr] gap-x-1.5 transition duration-500 ease-out starting:translate-y-1.5 starting:opacity-0 motion-reduce:transition-none"
            style={{ transitionDelay: `${150 + i * 120}ms` }}
          >
            <span aria-hidden="true" className="notation text-[22px] leading-7 text-brass">
              {i + 1}.
            </span>
            <div>
              <h2 className="font-book text-[19px] font-semibold leading-7">{idea.title}</h2>
              <p className="mt-0.5 text-[16px] leading-snug text-muted">{idea.text}</p>
            </div>
          </li>
        ))}
      </ol>
    </Step>
  );
}

// ─── 2. Instalar ─────────────────────────────────────────────────────────────

const appIcon = `${import.meta.env.BASE_URL}favicon.svg`;

function Install({ onNext }: { onNext: () => void }) {
  const tile = 'grid size-11 shrink-0 place-items-center rounded-xl bg-surface text-ink ring-1 ring-line';
  return (
    <Step
      title="Instalala en tu iPhone"
      lead={
        <p>
          Instalada, CavallChess se abre como una app y guarda tu progreso en su propio espacio. En Safari, el iPhone
          puede borrar los datos de los sitios que no abrís seguido, y con ellos tu repertorio y tus repasos.
        </p>
      }
      actions={<Button className="w-full min-h-12 text-base" onClick={onNext}>Seguir sin instalar</Button>}
    >
      <h2 className="mt-7 font-book text-lg font-semibold">Cómo instalarla</h2>
      <ol className="mt-3 space-y-3">
        <li className="flex items-center gap-3.5">
          <span className={tile}>
            <Icon
              className="size-6"
              d={<path d="M12 3.5v11M8.5 7 12 3.5 15.5 7M8 10.5H6.5A1.5 1.5 0 0 0 5 12v6.5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5V12a1.5 1.5 0 0 0-1.5-1.5H16" />}
            />
          </span>
          <span className="text-[16px] leading-snug">
            Tocá <strong className="font-semibold">Compartir</strong> en la barra de Safari (si no lo ves, está en el menú
            ⋯).
          </span>
        </li>
        <li className="flex items-center gap-3.5">
          <span className={tile}>
            <Icon
              className="size-6"
              d={
                <>
                  <rect x="4" y="4" width="16" height="16" rx="3.5" />
                  <path d="M12 8.5v7M8.5 12h7" />
                </>
              }
            />
          </span>
          <span className="text-[16px] leading-snug">
            Elegí <strong className="font-semibold">Agregar a pantalla de inicio</strong>.
          </span>
        </li>
        <li className="flex items-center gap-3.5">
          <img src={appIcon} alt="" className="size-11 shrink-0 rounded-xl ring-1 ring-line" />
          <span className="text-[16px] leading-snug">Abrí CavallChess desde su ícono.</span>
        </li>
      </ol>
      <p className="mt-6 text-[15px] leading-snug text-muted">
        Instalada arranca vacía, porque guarda sus datos aparte: conviene instalarla antes de armar tu repertorio.
      </p>
    </Step>
  );
}

// ─── 3. Mini demo ────────────────────────────────────────────────────────────

const DEMO = (() => {
  const moves: { san: string; id: string }[] = [];
  let epd = INITIAL_EPD;
  let last: [string, string] | undefined;
  for (const san of ['e4', 'e5', 'Nf3']) {
    const m = playSan(epd, san)!;
    last = displaySquares(epd, m.uci);
    moves.push({ san: m.san, id: m.uci });
    epd = m.epd;
  }
  return { epd, last, moves };
})();

/** Las dos defensas naturales del peón de e5. */
const DEFENSES = new Set(['b8c6', 'd7d6']);

const TARGET: DrawShape = { orig: 'e5' as Key, brush: 'yellow' };

function Demo({ onNext }: { onNext: () => void }) {
  const [epd, setEpd] = useState(DEMO.epd);
  const [lastMove, setLastMove] = useState(DEMO.last);
  const [result, setResult] = useState<{ kind: 'good'; san: string } | { kind: 'retry' } | null>(null);
  const [locked, setLocked] = useState(false);
  const [flash, setFlash] = useState<Flash>();
  const [shake, setShake] = useState(0);
  const [syncKey, setSyncKey] = useState(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const feedback = useRef<HTMLDivElement>(null);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const later = (ms: number, fn: () => void) => timers.current.push(setTimeout(fn, ms));

  const solved = result?.kind === 'good';

  useEffect(() => {
    if (result) feedback.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [result]);

  const onMove = (uci: string) => {
    const played = playUci(DEMO.epd, uci);
    if (!played) return;
    const dest = uci.slice(2, 4);
    setEpd(played.epd);
    setLastMove([uci.slice(0, 2), dest]);
    if (DEFENSES.has(played.uci)) {
      setFlash({ square: dest, kind: 'good', key: Date.now() });
      playCorrect();
      setResult({ kind: 'good', san: played.san });
      return;
    }
    // Otra jugada: sacudida y el tablero vuelve a la pregunta; mientras tanto no acepta jugadas.
    setFlash({ square: dest, kind: 'bad', key: Date.now() });
    setShake((n) => n + 1);
    playWrong();
    setResult({ kind: 'retry' });
    setLocked(true);
    later(450, () => {
      setEpd(DEMO.epd);
      setLastMove(DEMO.last);
      setSyncKey((k) => k + 1);
      later(220, () => setLocked(false));
    });
  };

  const shapes = useMemo<DrawShape[]>(
    () => (solved ? [] : result?.kind === 'retry' ? [TARGET, arrow('f3', 'e5', 'red')] : [TARGET]),
    [solved, result],
  );

  return (
    <Step title="Así se estudia" actions={<Primary onClick={onNext}>Siguiente</Primary>}>
      <MoveLine moves={DEMO.moves} className="mt-1 block text-[15px] text-muted" />
      <div className="mx-auto mt-3 w-full" style={{ maxWidth: 'min(100%, 44dvh)' }}>
        <Board
          epd={epd}
          orientation="black"
          interactive={!solved && !locked}
          onMove={onMove}
          lastMove={lastMove}
          shapes={shapes}
          flash={flash}
          shake={shake}
          syncKey={syncKey}
        />
      </div>
      <div ref={feedback} className="mt-4 min-h-28 scroll-mb-4" aria-live="polite">
        {solved ? (
          <div className="border-l-2 border-good pl-3">
            <p className="font-book text-xl font-semibold">
              <span className="notation">{figurine(result.san)}</span> defiende el peón.
            </p>
            <p className="mt-1 font-book text-[17px] leading-relaxed">
              Así es cada repaso: la app te muestra la línea y vos jugás tu jugada. Si fallás, te muestra la correcta y
              la volvés a ver más tarde.
            </p>
          </div>
        ) : (
          <>
            <p className="font-book text-xl font-semibold">¿Cómo defendés el peón de e5?</p>
            {result?.kind === 'retry' ? (
              <p className="mt-1 text-[15px] text-bad">Probá de nuevo: buscá cómo proteger el peón.</p>
            ) : (
              <p className="mt-1 text-[15px] text-muted">Jugás con negras: tocá una pieza y después la casilla, o arrastrala.</p>
            )}
          </>
        )}
      </div>
    </Step>
  );
}

// ─── 4. Elegir aperturas ─────────────────────────────────────────────────────

type Picks = Partial<Record<IntroChoice['key'], string>>;

function Choose({ onDone }: { onDone: (added: Ficha[]) => void }) {
  const fichas = useLibrary();
  const settings = useSettings();
  const [picks, setPicks] = useState<Picks>({});
  const [working, setWorking] = useState<{ i: number; n: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const byId = useMemo(() => new Map((fichas ?? []).map((f) => [f.id, f])), [fichas]);
  const chosen = INTRO_CHOICES.map((c) => picks[c.key] && byId.get(picks[c.key]!)).filter((f): f is Ficha => !!f);

  const add = async () => {
    if (!chosen.length) return onDone([]);
    setError(null);
    const added: string[] = [];
    for (const [i, f] of chosen.entries()) {
      setWorking({ i: i + 1, n: chosen.length });
      try {
        await addFicha(f);
        added.push(f.name);
      } catch (e) {
        setWorking(null);
        setError(
          `No se pudo agregar ${f.name}: ${(e as Error).message}` +
            (added.length ? ` Ya quedaron agregadas: ${added.join(', ')}.` : ''),
        );
        return;
      }
    }
    onDone(chosen);
  };

  const importLink = async (e: React.MouseEvent) => {
    e.preventDefault();
    await leave('/import');
  };

  return (
    <Step
      title="Armá tu repertorio"
      lead={
        <>
          <p>
            Elegí una apertura para cada caso. Se suman con sus variantes y trampas, y las posiciones nuevas entran de a
            poco: hasta {settings?.newPerDay ?? 10} por día.
          </p>
          <a
            href="#/import"
            onClick={(e) => void importLink(e)}
            className="-ml-1 mt-1 inline-flex min-h-11 items-center gap-1.5 rounded-lg px-1 text-[16px] font-medium text-brass underline-offset-4 hover:underline"
          >
            Ya tengo mi repertorio (Lichess o PGN)
          </a>
        </>
      }
      actions={
        <Primary onClick={() => void add()} disabled={!fichas || !!working} aria-busy={!!working}>
          {working ? (
            <>
              <Spinner />
              Agregando {working.i} de {working.n}…
            </>
          ) : chosen.length ? (
            'Agregar y seguir'
          ) : (
            'Seguir'
          )}
        </Primary>
      }
    >
      {error && (
        <div className="mt-4">
          <Banner tone="bad">{error}</Banner>
        </div>
      )}
      {fichas &&
        INTRO_CHOICES.map((c) => (
          <ChoiceGroup
            key={c.key}
            choice={c}
            byId={byId}
            value={picks[c.key]}
            disabled={!!working}
            onChange={(id) => setPicks((p) => ({ ...p, [c.key]: id }))}
          />
        ))}
    </Step>
  );
}

function ChoiceGroup({
  choice,
  byId,
  value,
  disabled,
  onChange,
}: {
  choice: IntroChoice;
  byId: Map<string, Ficha>;
  value: string | undefined;
  disabled: boolean;
  onChange: (fichaId: string | undefined) => void;
}) {
  const id = useId();
  const name = `intro-${choice.key}`;
  const radio =
    'size-6 shrink-0 cursor-pointer appearance-none rounded-full border-2 border-line bg-raised transition-[border-width,border-color] duration-150 checked:border-[7px] checked:border-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass disabled:cursor-default';
  const row = 'flex cursor-pointer items-center gap-3.5 px-3.5 transition has-checked:bg-raised has-disabled:cursor-default';
  return (
    <section role="radiogroup" aria-labelledby={id} className="mt-7">
      <h2 id={id} className="mb-2 font-book text-lg font-semibold">
        {choice.title}
      </h2>
      <div className="divide-y divide-line overflow-hidden rounded-2xl bg-surface ring-1 ring-line">
        {choice.options.map((o) => {
          const f = byId.get(o.fichaId);
          if (!f) return null;
          const epd = f.start.at(-1)?.epd ?? INITIAL_EPD;
          return (
            <label key={o.fichaId} className={`${row} py-3`}>
              <span className="w-14 shrink-0">
                <MiniBoard epd={epd} orientation={f.side} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-book text-[17px] font-semibold leading-snug">{f.name}</span>
                <span className="mt-0.5 block text-[14px] leading-snug text-muted">{o.blurb}</span>
              </span>
              <input
                type="radio"
                name={name}
                checked={value === o.fichaId}
                disabled={disabled}
                onChange={() => onChange(o.fichaId)}
                className={radio}
              />
            </label>
          );
        })}
        <label className={`${row} min-h-12`}>
          <span className="flex-1 text-[15px] text-muted">Elegir después</span>
          <input
            type="radio"
            name={name}
            checked={!value}
            disabled={disabled}
            onChange={() => onChange(undefined)}
            className={radio}
          />
        </label>
      </div>
    </section>
  );
}

// ─── 5. Chess.com ────────────────────────────────────────────────────────────

function Chesscom({ onNext }: { onNext: () => void }) {
  const settings = useSettings();
  const [user, setUser] = useState<string | null>(null);
  const value = user ?? settings?.chesscomUser ?? '';

  const save = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const u = value.trim();
    // Otro usuario: se vuelve a empezar por los últimos meses (como en Ajustes).
    if (u && u !== settings?.chesscomUser) {
      await setSettings({ chesscomUser: u, chesscomMonths: undefined, lastChesscomSync: undefined });
    }
    onNext();
  };

  return (
    <Step
      title="¿Jugás en Chess.com?"
      lead={
        <p>
          Con tu usuario, la app revisa tus partidas: te avisa cuando te salís de tu repertorio y te muestra lo que te
          juegan y todavía no tenés.
        </p>
      }
      actions={
        <Primary type="submit" form="intro-chesscom">
          Seguir
        </Primary>
      }
    >
      <form id="intro-chesscom" onSubmit={(e) => void save(e)} className="mt-7">
        <label className="block">
          <span className="text-sm font-medium text-muted">Usuario de Chess.com</span>
          <input
            value={value}
            onChange={(e) => setUser(e.target.value)}
            autoCapitalize="none"
            autoCorrect="off"
            autoComplete="username"
            spellCheck={false}
            enterKeyHint="next"
            className="mt-1.5 w-full rounded-xl bg-surface px-3.5 py-3 text-[17px] ring-1 ring-line outline-none transition focus:ring-2 focus:ring-brass"
          />
        </label>
        <p className="mt-2 text-[15px] text-muted">Es opcional y lo podés cambiar en Ajustes.</p>
      </form>
    </Step>
  );
}

// ─── 6. Listo ────────────────────────────────────────────────────────────────

function Done({ added }: { added: Ficha[] }) {
  const graphs = useGraphs();
  const cards = useCards();
  const events = useEvents();
  const settings = useSettings();
  const queue = useMemo(
    () =>
      graphs && cards && events && settings
        ? buildDailyQueue([graphs.white, graphs.black], cards, events, new Date(), settings.newPerDay)
        : null,
    [graphs, cards, events, settings],
  );
  const n = queue?.fresh.length ?? 0;
  const hasCards = (cards?.size ?? 0) > 0;

  return (
    <Step
      title="Listo"
      actions={
        queue &&
        (n > 0 ? (
          <Primary onClick={() => void leave('/train')}>Estudiar</Primary>
        ) : (
          <Primary onClick={() => void leave('/')}>Ir al inicio</Primary>
        ))
      }
    >
      {added.length > 0 && (
        <ul className="mt-6 grid grid-cols-3 gap-3">
          {added.map((f) => (
            <li key={f.id}>
              <MiniBoard epd={f.start.at(-1)?.epd ?? INITIAL_EPD} orientation={f.side} />
              <p className="mt-2 font-book text-[15px] font-semibold leading-tight">{f.name}</p>
              <p className="mt-0.5 text-[13px] text-muted">{f.side === 'white' ? 'Con blancas' : 'Con negras'}</p>
            </li>
          ))}
        </ul>
      )}
      {queue && (
        <div className="mt-7">
          <p className="font-book text-[24px] leading-snug">
            {n > 0
              ? n === 1
                ? 'Hoy aprendés tu primera posición.'
                : `Hoy aprendés tus primeras ${n} posiciones.`
              : hasCards
                ? 'Hoy no te tocan posiciones nuevas.'
                : 'Cuando agregues aperturas, acá vas a ver qué estudiar.'}
          </p>
          <p className="mt-2 text-[16px] leading-snug text-muted">
            {n > 0
              ? 'Cada una vuelve en un repaso justo antes de que se te olvide.'
              : hasCards
                ? 'En Hoy ves lo que tenés para repasar.'
                : 'Las encontrás en la Biblioteca, o importá las tuyas desde Lichess o un PGN.'}
          </p>
        </div>
      )}
    </Step>
  );
}
