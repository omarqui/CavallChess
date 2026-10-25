import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { figurine, moveNumberLabel } from '../chess/position';
import type { MoveEdge } from '../types';
import { href } from './router';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

export function Button({
  variant = 'secondary',
  className = '',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  const styles: Record<Variant, string> = {
    primary: 'btn-cta disabled:opacity-40',
    secondary: 'btn-soft disabled:opacity-40',
    ghost: 'text-ink hover:bg-surface disabled:opacity-40',
    danger: 'text-bad ring-1 ring-bad/40 hover:bg-bad-soft disabled:opacity-40',
  };
  return (
    <button
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-[15px] font-medium transition active:scale-[0.98] ${styles[variant]} ${className}`}
      {...rest}
    />
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-xl bg-paper p-1 ring-1 ring-line">
      {options.map((o) => (
        <button
          key={o.value}
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={`min-h-11 rounded-lg px-3 text-sm font-medium transition ${
            value === o.value ? 'bg-raised text-ink shadow-sm ring-1 ring-line' : 'text-muted'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Screen({ title, actions, children }: { title?: string; actions?: ReactNode; children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-xl px-4 pb-28 safe-top">
      {(title || actions) && (
        <header className="flex flex-wrap items-center justify-between gap-3 pb-3 pt-3">
          {title && <h1 className="font-book text-[28px] font-semibold leading-tight tracking-tight">{title}</h1>}
          {actions}
        </header>
      )}
      {children}
    </div>
  );
}

export function Section({ title, children, aside }: { title: string; children: ReactNode; aside?: ReactNode }) {
  return (
    <section className="mt-7">
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <h2 className="font-book text-lg font-semibold">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

/**
 * Línea de jugadas tipeada como en un libro: 1.e4 c5 2.♘f3 …
 * `mark` resalta una jugada con su propio color (p. ej. donde una partida salió del repertorio).
 */
export function MoveLine({
  moves,
  startPly = 0,
  active,
  onPick,
  mark,
  className = '',
}: {
  moves: Pick<MoveEdge, 'san' | 'id'>[];
  startPly?: number;
  active?: number;
  onPick?: (index: number) => void;
  mark?: { index: number; className: string };
  className?: string;
}) {
  if (!moves.length) return <span className={`notation text-muted ${className}`}>Posición inicial</span>;
  return (
    <span className={`notation leading-relaxed ${className}`}>
      {moves.map((m, i) => {
        const ply = startPly + i;
        const showNumber = ply % 2 === 0 || i === 0;
        const marked = mark?.index === i ? mark.className : '';
        const label = (
          <>
            {showNumber && <span className="text-muted">{moveNumberLabel(ply)}</span>}
            {marked ? <span className={marked}>{figurine(m.san)}</span> : figurine(m.san)}
          </>
        );
        return (
          <span key={`${m.id}-${i}`}>
            {onPick ? (
              <button
                onClick={() => onPick(i)}
                aria-current={active === i ? 'true' : undefined}
                // Toque de 44 px de alto; sigue siendo inline-block, así que la lista fluye en líneas.
                className={`min-h-11 rounded px-0.5 align-middle hover:bg-surface ${active === i ? 'bg-brass-soft text-ink' : ''}`}
              >
                {label}
              </button>
            ) : (
              <span className={active === i ? 'rounded bg-brass-soft px-0.5' : ''}>{label}</span>
            )}{' '}
          </span>
        );
      })}
    </span>
  );
}

export function Banner({
  children,
  tone = 'brass',
  compact = false,
}: {
  children: ReactNode;
  tone?: 'brass' | 'bad' | 'good';
  /** Menos relleno, para avisos que comparten la pantalla con un tablero. */
  compact?: boolean;
}) {
  const tones = {
    brass: 'bg-brass-soft text-ink ring-brass/30',
    bad: 'bg-bad-soft text-ink ring-bad/30',
    good: 'bg-good-soft text-ink ring-good/30',
  };
  return (
    <div className={`rounded-xl text-[15px] ring-1 ${compact ? 'px-3 py-2.5' : 'px-4 py-3'} ${tones[tone]}`}>{children}</div>
  );
}

export function Meter({ value, label }: { value: number; label: string }) {
  return (
    <div
      role="meter"
      aria-label={label}
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
      className="h-1.5 w-full overflow-hidden rounded-full bg-line"
    >
      <div className="h-full rounded-full bg-good transition-[width] duration-500" style={{ width: `${value}%` }} />
    </div>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex min-h-11 cursor-pointer items-center justify-between gap-4">
      <span>{label}</span>
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-7 w-12 shrink-0 rounded-full transition ${checked ? 'bg-good' : 'bg-line'}`}
      >
        <span
          className={`absolute top-0.5 size-6 rounded-full bg-white shadow transition-all ${checked ? 'left-[22px]' : 'left-0.5'}`}
        />
      </button>
    </label>
  );
}

export const sideLabel = (s: 'white' | 'black') => (s === 'white' ? 'Blancas' : 'Negras');

// ─── Iconos y navegación ─────────────────────────────────────────────────────

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
  forward: <path d="M9.5 6l6 6-6 6" />,
  plus: <path d="M12 5.5v13M5.5 12h13" />,
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  play: <path d="M8 5.8v12.4a.6.6 0 0 0 .9.5l9.8-6.2a.6.6 0 0 0 0-1L8.9 5.3a.6.6 0 0 0-.9.5z" />,
  pencil: <path d="M4.5 19.5h3.8L18.6 9.2a2.2 2.2 0 0 0-3.1-3.1L5.2 16.4l-.7 3.1zM14 7.6l3.1 3.1" />,
  chevron: <path d="M6.5 9.5l5.5 5.5 5.5-5.5" />,
  external: <path d="M14 5h5v5M19 5l-8 8M17 13.5V18a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1h4.5" />,
};

/** "‹ Volver a…" de la cabecera: un enlace con toque de 44 px. */
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

/** ◀ ▶ de los visores (líneas y partidas): 56 px de alto. */
export function NavButton({
  label,
  icon,
  disabled,
  onClick,
}: {
  label: string;
  icon: ReactNode;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="flex h-14 flex-1 items-center justify-center rounded-2xl btn-soft transition active:scale-[0.97] disabled:bg-surface disabled:text-muted disabled:shadow-none disabled:ring-1 disabled:ring-line"
    >
      <Icon d={icon} className="size-7" />
    </button>
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
          : 'btn-cta disabled:opacity-40'
      }`}
    >
      {icon && <Icon d={icon} className="size-5" />}
      {children}
    </button>
  );
}
