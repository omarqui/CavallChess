import { useEffect, useLayoutEffect, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { displaySquares, figurine } from '../chess/position';
import { saveNote, noteId } from '../db/repo';
import { useGraphs, useNotes } from '../db/hooks';
import { useFicha } from '../library/catalog';
import { fichaProgress, lineStatus, orphanNotes, type LineStatus } from '../library/status';
import type { Ficha, FichaLine } from '../library/types';
import type { Note } from '../types';
import { Board } from '../ui/Board';
import { MoveLine, Screen, Segmented } from '../ui/kit';
import { Tip } from '../ui/Tip';
import { RichInline, RichText } from '../ui/RichText';
import { href, navigate } from '../ui/router';

export type FichaTab = 'resumen' | 'variantes' | 'trampas' | 'apuntes';

const TABS: { value: FichaTab; label: string }[] = [
  { value: 'resumen', label: 'Resumen' },
  { value: 'variantes', label: 'Variantes' },
  { value: 'trampas', label: 'Trampas' },
  { value: 'apuntes', label: 'Mis apuntes' },
];

export const parseFichaTab = (s: string | null): FichaTab =>
  TABS.some((t) => t.value === s) ? (s as FichaTab) : 'resumen';

const FICHA_LEVEL: Record<string, string> = { principiante: 'Principiante', club: 'Club' };
const LINE_LEVEL: Record<string, string> = { basica: 'Básica', club: 'Club' };
const TRAP_KIND: Record<string, string> = { favor: 'A favor', contra: 'En contra' };

/** Las primeras jugadas propias de la línea, después de la posición característica. */
const PREVIEW_PLIES = 6;

// ─── Piezas chicas ───────────────────────────────────────────────────────────

export function Icon({ d, className = 'size-4' }: { d: ReactNode; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={`shrink-0 ${className}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {d}
    </svg>
  );
}

export const ICONS = {
  back: <path d="M14.5 6l-6 6 6 6" />,
  plus: <path d="M12 5.5v13M5.5 12h13" />,
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  play: <path d="M8 5.8v12.4a.6.6 0 0 0 .9.5l9.8-6.2a.6.6 0 0 0 0-1L8.9 5.3a.6.6 0 0 0-.9.5z" />,
  pencil: <path d="M4.5 19.5h3.8L18.6 9.2a2.2 2.2 0 0 0-3.1-3.1L5.2 16.4l-.7 3.1zM14 7.6l3.1 3.1" />,
  chevron: <path d="M6.5 9.5l5.5 5.5 5.5-5.5" />,
};

type Tone = 'plain' | 'good' | 'brass' | 'bad';

const TONES: Record<Tone, string> = {
  plain: 'bg-paper text-muted ring-line',
  good: 'bg-good-soft text-ink ring-good/30',
  brass: 'bg-brass-soft text-ink ring-brass/30',
  bad: 'bg-bad-soft text-ink ring-bad/35',
};

export function Chip({ children, tone = 'plain', icon }: { children: ReactNode; tone?: Tone; icon?: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${TONES[tone]}`}
    >
      {icon && <Icon d={icon} className="-ml-0.5 size-3.5" />}
      {children}
    </span>
  );
}

export function StatusChip({ status }: { status: LineStatus }) {
  switch (status.kind) {
    case 'added':
      return (
        <Chip tone="good" icon={ICONS.check}>
          En tu repertorio
        </Chip>
      );
    case 'partial':
      return <Chip tone="brass">Parcial</Chip>;
    case 'conflict':
      return <Chip tone="bad">Choca con tu {figurine(status.existingSan)}</Chip>;
    default:
      return <Chip>Nueva</Chip>;
  }
}

/** Nivel, tipo de trampa y gambito. */
export function LineChips({ line }: { line: FichaLine }) {
  return (
    <>
      {line.kind !== 'variante' && <Chip>{TRAP_KIND[line.kind]}</Chip>}
      <Chip>{LINE_LEVEL[line.level] ?? line.level}</Chip>
      {line.gambit && <Chip>Gambito</Chip>}
    </>
  );
}

/** Las primeras jugadas de la línea tras la posición característica, con "…" si sigue. */
export function LinePreview({ f, line }: { f: Ficha; line: FichaLine }) {
  const from = f.start.length;
  const moves = line.moves.slice(from, from + PREVIEW_PLIES).map((m, i) => ({ san: m.san, id: `${i}-${m.uci}` }));
  return (
    <span className="text-[16px]">
      <MoveLine moves={moves} startPly={from} />
      {line.moves.length > from + PREVIEW_PLIES && <span className="notation text-muted">…</span>}
    </span>
  );
}

/** Acción principal fija abajo, justo sobre la barra de pestañas. */
export function ActionBar({ children }: { children: ReactNode }) {
  return (
    <div
      className="pointer-events-none fixed inset-x-0 z-10 bg-linear-to-t from-paper from-55% to-transparent"
      style={{ bottom: 'var(--tabbar-h)' }}
    >
      <div className="pointer-events-auto mx-auto max-w-xl px-4 pb-3 pt-7">{children}</div>
    </div>
  );
}

export function ActionButton({
  done = false,
  icon,
  children,
  ...rest
}: { done?: boolean; icon?: ReactNode; children: ReactNode } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...rest}
      className={`inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl px-4 text-base font-semibold transition active:scale-[0.98] ${
        done
          ? 'bg-good-soft text-ink ring-1 ring-good/30'
          : 'bg-ink text-paper shadow-[0_8px_24px_-12px_rgb(0_0_0/0.5)] hover:opacity-90 disabled:opacity-40'
      }`}
    >
      {icon && <Icon d={icon} className="size-5" />}
      {children}
    </button>
  );
}

export function BackLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <a
      href={href(to)}
      className="-ml-2 inline-flex min-h-11 items-center gap-1 rounded-lg px-2 text-[15px] font-medium text-muted transition hover:text-ink"
    >
      <Icon d={ICONS.back} className="size-5" />
      {children}
    </a>
  );
}

// ─── Notas ───────────────────────────────────────────────────────────────────

const SAVE_DELAY = 600;

/**
 * Campo de nota con guardado automático: tras 600 ms sin teclear, al perder el foco, al desmontarse y cuando la
 * app pasa a segundo plano (iOS suspende la PWA antes de que venzan los 600 ms).
 *
 * `emptyDeletesOnBlur`: vaciar el campo borra la nota recién al soltarlo. Sirve para las notas que existen solo
 * mientras tengan texto (las de líneas que ya no están): borrarlas mientras escribís desmontaría el campo.
 */
function NoteField({
  id,
  note,
  label,
  labelledBy,
  placeholder,
  minRows = 3,
  autoFocus = false,
  emptyDeletesOnBlur = false,
}: {
  id: string;
  note: Note | undefined;
  label?: string;
  labelledBy?: string;
  placeholder: string;
  minRows?: number;
  autoFocus?: boolean;
  emptyDeletesOnBlur?: boolean;
}) {
  const [text, setText] = useState(note?.text ?? '');
  const [saved, setSaved] = useState(false);
  const area = useRef<HTMLTextAreaElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef(text);
  /** Hay texto escrito que todavía no se guardó. */
  const dirty = useRef(false);
  const props = useRef({ id, emptyDeletesOnBlur });
  props.current = { id, emptyDeletesOnBlur };

  /** `final`: se suelta el campo (foco perdido o desmontado), así que vaciarlo ya puede borrar la nota. */
  const saveRef = useRef((final: boolean) => {
    if (timer.current !== null) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    if (!dirty.current) return;
    if (!final && props.current.emptyDeletesOnBlur && !latest.current.trim()) return;
    dirty.current = false;
    void saveNote(props.current.id, latest.current).then(
      () => setSaved(true),
      () => {
        dirty.current = true;
        setSaved(false);
      },
    );
  });
  const save = saveRef.current;

  // Segundo plano y cierre: se guarda ya. Al desmontar (cambio de pestaña, nota plegada), lo pendiente también.
  useEffect(() => {
    const hide = () => save(false);
    const visibility = () => {
      if (document.visibilityState === 'hidden') hide();
    };
    window.addEventListener('pagehide', hide);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      window.removeEventListener('pagehide', hide);
      document.removeEventListener('visibilitychange', visibility);
      save(true);
    };
  }, [save]);

  // Si la nota cambió en otro lado y acá no hay nada sin guardar ni se está escribiendo, se muestra la guardada.
  useEffect(() => {
    if (!dirty.current && document.activeElement !== area.current) {
      setText(note?.text ?? '');
      latest.current = note?.text ?? '';
    }
  }, [note?.text]);

  useLayoutEffect(() => {
    const el = area.current;
    if (!el) return;
    el.style.height = 'auto';
    if (el.scrollHeight) el.style.height = `${el.scrollHeight + 2}px`;
  }, [text]);

  useEffect(() => {
    if (autoFocus) area.current?.focus({ preventScroll: true });
  }, [autoFocus]);

  const change = (v: string) => {
    setText(v);
    latest.current = v;
    setSaved(false);
    dirty.current = true;
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = setTimeout(() => save(false), SAVE_DELAY);
  };

  return (
    <div>
      <textarea
        ref={area}
        value={text}
        rows={minRows}
        aria-label={label}
        aria-labelledby={labelledBy}
        placeholder={placeholder}
        onChange={(e) => change(e.target.value)}
        onBlur={() => save(true)}
        className="block w-full resize-none rounded-xl bg-raised px-3.5 py-3 font-book text-base leading-relaxed text-ink ring-1 ring-line transition placeholder:text-muted/80 focus:outline-none focus:ring-2 focus:ring-brass/70"
      />
      <p aria-live="polite" className="mt-1 flex h-5 items-center gap-1 px-1 text-xs text-muted">
        {saved && (
          <>
            <Icon d={ICONS.check} className="size-3.5 text-good" />
            Guardado
          </>
        )}
      </p>
    </div>
  );
}

/** Nota plegable de una línea. Se despliega con el campo; plegada muestra el comienzo de la nota. */
function LineNote({
  f,
  line,
  note,
  title,
  defaultOpen = false,
}: {
  f: Ficha;
  line: Pick<FichaLine, 'id' | 'name'>;
  note: Note | undefined;
  title: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [focusOnOpen, setFocusOnOpen] = useState(false);
  return (
    <details
      open={open}
      onToggle={(e) => {
        const now = e.currentTarget.open;
        if (now && !open) setFocusOnOpen(!note);
        setOpen(now);
      }}
      className="group"
    >
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2.5 rounded-lg py-2 text-[15px] [&::-webkit-details-marker]:hidden">
        <Icon d={ICONS.pencil} className={`size-4 self-start mt-[3px] ${note ? 'text-brass' : 'text-muted'}`} />
        <span className="min-w-0 flex-1">
          <span className="font-medium leading-snug">{title}</span>
          {!open && note && <span className="mt-0.5 block truncate text-sm text-muted">{note.text}</span>}
        </span>
        <Icon d={ICONS.chevron} className="size-4 text-muted transition-transform group-open:rotate-180" />
      </summary>
      {open && (
        <div className="pb-1 pt-1">
          <NoteField
            id={noteId(f.id, line.id)}
            note={note}
            label={`Tu nota: ${line.name}`}
            placeholder="Qué querés recordar de esta línea: una idea, una partida, una duda."
            autoFocus={focusOnOpen}
          />
        </div>
      )}
    </details>
  );
}

// ─── Pestañas ────────────────────────────────────────────────────────────────

function H2({ children, id }: { children: ReactNode; id?: string }) {
  return (
    <h2 id={id} className="font-book text-[21px] font-semibold leading-tight tracking-tight">
      {children}
    </h2>
  );
}

function ResumenTab({ f }: { f: Ficha }) {
  return (
    <div className="font-book text-[17px] leading-[1.6]">
      <section>
        <H2>Para empezar</H2>
        <RichText text={f.basics} className="mt-3" />
      </section>
      <section className="mt-9">
        <H2>Ideas y planes</H2>
        <RichText text={f.ideas} className="mt-3" />
      </section>
      {f.tips.length > 0 && (
        <section className="mt-9 rounded-2xl bg-brass-soft/70 px-4 pb-4 pt-3.5 ring-1 ring-brass/25">
          <H2>Consejos</H2>
          <ul className="mt-2 divide-y divide-brass/20">
            {f.tips.map((t, i) => (
              <li key={i} className="flex gap-3 py-2.5 leading-normal">
                <span aria-hidden="true" className="mt-[0.55em] size-1.5 shrink-0 rotate-45 bg-brass" />
                <span>
                  <RichInline text={t} />
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function LineCard({
  f,
  line,
  status,
  note,
}: {
  f: Ficha;
  line: FichaLine;
  status: LineStatus | undefined;
  note: Note | undefined;
}) {
  return (
    <article className="rounded-2xl bg-surface px-4 pt-3.5 ring-1 ring-line">
      <h3 className="font-book text-[19px] font-semibold leading-snug">{line.name}</h3>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <LineChips line={line} />
        {status && (
          <span className="ml-auto">
            <StatusChip status={status} />
          </span>
        )}
      </div>
      <p className="mt-3">
        <LinePreview f={f} line={line} />
      </p>
      {line.intro && <RichText text={line.intro} className="mt-2 font-book text-[16px] leading-relaxed" />}
      <button
        onClick={() => navigate(`/biblioteca/${f.id}/linea/${line.id}`)}
        className="mt-3.5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-raised px-3.5 text-[15px] font-medium ring-1 ring-line transition hover:bg-paper active:scale-[0.98]"
      >
        <Icon d={ICONS.play} className="size-4 text-brass" />
        Ver en el tablero
      </button>
      <div className="-mx-4 mt-3.5 border-t border-line px-4">
        <LineNote f={f} line={line} note={note} title="Tu nota" />
      </div>
    </article>
  );
}

function LinesTab({
  f,
  kind,
  statuses,
  notes,
}: {
  f: Ficha;
  kind: 'variantes' | 'trampas';
  statuses: Map<string, LineStatus> | undefined;
  notes: Map<string, Note>;
}) {
  const lines = f.lines.filter((l) => (kind === 'variantes') === (l.kind === 'variante'));
  if (!lines.length) {
    return (
      <p className="py-10 text-center text-[15px] text-muted">
        {kind === 'variantes' ? 'Esta ficha todavía no tiene variantes.' : 'Esta ficha todavía no tiene trampas.'}
      </p>
    );
  }
  return (
    <div>
      {kind === 'trampas' && (
        <p className="mb-4 text-[15px] leading-snug text-muted">
          <span className="font-medium text-ink">A favor:</span> el rival se equivoca y vos lo castigás.{' '}
          <span className="font-medium text-ink">En contra:</span> la jugada natural pierde y aprendés la correcta.
        </p>
      )}
      <div className="flex flex-col gap-4">
        {lines.map((l) => (
          <LineCard key={l.id} f={f} line={l} status={statuses?.get(l.id)} note={notes.get(noteId(f.id, l.id))} />
        ))}
      </div>
    </div>
  );
}

const humanize = (id: string) => {
  const s = id.replace(/[-_]+/g, ' ').trim();
  return s.charAt(0).toUpperCase() + s.slice(1);
};

function NotesTab({ f, notes }: { f: Ficha; notes: Map<string, Note> }) {
  const orphans = orphanNotes(f, notes);
  const [initiallyWritten] = useState(() => new Set(notes.keys()));
  return (
    <div>
      <section>
        <H2 id="nota-ficha">Sobre la apertura</H2>
        <p className="mb-3 mt-1 text-[15px] text-muted">Tus ideas, partidas para repasar o dudas. Se guarda solo.</p>
        <NoteField
          id={noteId(f.id)}
          note={notes.get(noteId(f.id))}
          labelledBy="nota-ficha"
          placeholder="Lo que quieras recordar de esta apertura…"
          minRows={4}
        />
      </section>

      <section className="mt-7">
        <H2>Por línea</H2>
        <ul className="mt-2 divide-y divide-line rounded-2xl bg-surface px-4 ring-1 ring-line">
          {f.lines.map((l) => {
            const id = noteId(f.id, l.id);
            return (
              <li key={l.id} className="py-1">
                <LineNote
                  f={f}
                  line={l}
                  note={notes.get(id)}
                  defaultOpen={initiallyWritten.has(id)}
                  title={
                    <>
                      {l.name}
                      {l.kind !== 'variante' && (
                        <span className="ml-2 align-[1px]">
                          <Chip>Trampa</Chip>
                        </span>
                      )}
                    </>
                  }
                />
              </li>
            );
          })}
        </ul>
      </section>

      {orphans.length > 0 && (
        <section className="mt-7">
          <H2>Notas de líneas que ya no están</H2>
          <p className="mb-3 mt-1 text-[15px] text-muted">
            Estas líneas salieron de la ficha en una actualización. Tus notas siguen acá; si ya no te sirven, vacialas y se
            borran.
          </p>
          <div className="flex flex-col gap-4">
            {orphans.map((n) => {
              const name = humanize(n.id.slice(f.id.length + 1));
              return (
                <div key={n.id}>
                  <p className="mb-1.5 text-[15px] font-medium">{name}</p>
                  <NoteField
                    id={n.id}
                    note={n}
                    label={`Nota vieja: ${name}`}
                    placeholder="Vacía: se borra al salir del campo."
                    minRows={2}
                    emptyDeletesOnBlur
                  />
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

// ─── Pantalla ────────────────────────────────────────────────────────────────

export function FichaNotFound() {
  return (
    <Screen title="No encontramos esa apertura">
      <p className="text-[15px] text-muted">Puede que el enlace sea viejo o que la ficha haya cambiado de nombre.</p>
      <div className="mt-4">
        <BackLink to="/biblioteca">Ir a la biblioteca</BackLink>
      </div>
    </Screen>
  );
}

export function FichaScreen({ id, tab }: { id: string; tab: FichaTab }) {
  const f = useFicha(id);
  const graphs = useGraphs();
  const notes = useNotes();
  const anchor = useRef<HTMLDivElement>(null);
  const keepTabsOnTop = useRef(false);
  // Mientras escribís una nota, la acción fija se esconde: no tapa el campo ni compite con el teclado.
  const [writing, setWriting] = useState(false);

  // Si las pestañas estaban pegadas arriba, la pestaña nueva arranca desde su comienzo.
  useLayoutEffect(() => {
    const el = anchor.current;
    const main = el?.closest('main');
    if (!keepTabsOnTop.current || !el || !main) return;
    keepTabsOnTop.current = false;
    main.scrollTop = el.getBoundingClientRect().top - main.getBoundingClientRect().top + main.scrollTop;
  }, [tab]);

  if (f === null) return null;
  if (!f) return <FichaNotFound />;

  const graph = graphs?.[f.side];
  const statuses = graph && new Map(f.lines.map((l) => [l.id, lineStatus(l, f.side, graph)]));
  const progress = graph && fichaProgress(f, graph);
  const traps = f.lines.filter((l) => l.kind !== 'variante').length;
  const last = f.start.at(-1);
  const epd = last?.epd ?? 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -';

  const pick = (t: FichaTab) => {
    const el = anchor.current;
    const main = el?.closest('main');
    keepTabsOnTop.current = !!el && !!main && el.getBoundingClientRect().top <= main.getBoundingClientRect().top + 1;
    navigate(`/biblioteca/${f.id}?tab=${t}`, true);
  };

  return (
    <div
      className="mx-auto w-full max-w-xl px-4 safe-top"
      style={{ paddingBottom: 'calc(var(--tabbar-h) + 6.5rem)' }}
      onFocus={(e) => setWriting(e.target instanceof HTMLTextAreaElement)}
      onBlur={() => setWriting(false)}
    >
      <header>
        <BackLink to={`/biblioteca?lado=${f.side}`}>Biblioteca</BackLink>
        <Tip id="ficha" className="mb-1 mt-3">
          Las trampas se entrenan como cualquier línea: cuando el rival cae, te toca castigarlo. Tus apuntes son tuyos y no se pisan.
        </Tip>
        <h1 className="mt-0.5 font-book text-[30px] font-semibold leading-[1.1] tracking-tight">{f.name}</h1>
        <p className="mt-1.5 text-sm text-muted">ECO {f.eco.replace(/\s*-\s*/, '–')}</p>

        <div className="mt-4 flex items-start gap-4">
          <figure className="w-[44%] max-w-60 shrink-0">
            <Board
              epd={epd}
              orientation={f.side}
              coordinates={false}
              lastMove={last ? displaySquares(last.fromEpd, last.uci) : undefined}
            />
            <figcaption className="mt-1.5 text-center text-[15px]">
              <MoveLine moves={f.start.map((m, i) => ({ san: m.san, id: `${i}` }))} />
            </figcaption>
          </figure>
          <div className="min-w-0 flex-1">
            <p className="font-book text-[16.5px] leading-[1.45]">{f.summary}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {f.levels.map((l) => (
                <Chip key={l}>{FICHA_LEVEL[l] ?? l}</Chip>
              ))}
              {traps > 0 && <Chip>{`${traps} ${traps === 1 ? 'trampa' : 'trampas'}`}</Chip>}
              {progress &&
                progress.total > 0 &&
                (progress.added === progress.total ? (
                  <Chip tone="good" icon={ICONS.check}>
                    En tu repertorio
                  </Chip>
                ) : progress.added > 0 ? (
                  <Chip tone="good">{`${progress.added} de ${progress.total} líneas`}</Chip>
                ) : null)}
            </div>
          </div>
        </div>
      </header>

      <div ref={anchor} className="h-5" />
      <div className="sticky top-[env(safe-area-inset-top)] z-10 -mx-4 bg-paper/90 px-4 py-2 shadow-[0_1px_0_var(--line)] backdrop-blur-md [&_[role=radio]]:min-h-11 [&_[role=radio]]:flex-1 [&_[role=radio]]:px-1 [&_[role=radiogroup]]:flex [&_[role=radiogroup]]:w-full">
        <Segmented label="Secciones de la ficha" value={tab} options={TABS} onChange={pick} />
      </div>

      <div className="min-h-[65dvh] pt-6">
        {tab === 'resumen' && <ResumenTab f={f} />}
        {(tab === 'variantes' || tab === 'trampas') &&
          (notes ? <LinesTab f={f} kind={tab} statuses={statuses} notes={notes} /> : null)}
        {tab === 'apuntes' && (notes ? <NotesTab key={f.id} f={f} notes={notes} /> : null)}
      </div>

      <footer className="mt-12 border-t border-line pt-4 text-[13px] leading-relaxed text-muted">
        Contenido escrito para CavallChess. Las jugadas están verificadas con Stockfish; si algo no te cierra, anotalo en
        tus apuntes.
      </footer>

      {progress && !writing && (
        <ActionBar>
          {progress.added === 0 ? (
            <ActionButton icon={ICONS.plus} onClick={() => navigate(`/biblioteca/${f.id}/agregar`)}>
              Agregar al repertorio
            </ActionButton>
          ) : progress.added < progress.total ? (
            <ActionButton icon={ICONS.plus} onClick={() => navigate(`/biblioteca/${f.id}/agregar`)}>
              Completar en tu repertorio
            </ActionButton>
          ) : (
            <ActionButton done disabled icon={ICONS.check}>
              Ya está en tu repertorio
            </ActionButton>
          )}
        </ActionBar>
      )}
    </div>
  );
}
