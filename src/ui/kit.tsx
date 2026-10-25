import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { figurine, moveNumberLabel } from '../chess/position';
import type { MoveEdge } from '../types';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

export function Button({
  variant = 'secondary',
  className = '',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  const styles: Record<Variant, string> = {
    primary: 'bg-ink text-paper hover:opacity-90 disabled:opacity-40 shadow-sm',
    secondary: 'bg-surface text-ink ring-1 ring-line hover:bg-raised disabled:opacity-40',
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
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-xl bg-surface p-1 ring-1 ring-line">
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

/** Línea de jugadas tipeada como en un libro: 1.e4 c5 2.♘f3 … */
export function MoveLine({
  moves,
  startPly = 0,
  active,
  onPick,
  className = '',
}: {
  moves: Pick<MoveEdge, 'san' | 'id'>[];
  startPly?: number;
  active?: number;
  onPick?: (index: number) => void;
  className?: string;
}) {
  if (!moves.length) return <span className={`notation text-muted ${className}`}>Posición inicial</span>;
  return (
    <span className={`notation leading-relaxed ${className}`}>
      {moves.map((m, i) => {
        const ply = startPly + i;
        const showNumber = ply % 2 === 0 || i === 0;
        const label = (
          <>
            {showNumber && <span className="text-muted">{moveNumberLabel(ply)}</span>}
            {figurine(m.san)}
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

export function Banner({ children, tone = 'brass' }: { children: ReactNode; tone?: 'brass' | 'bad' | 'good' }) {
  const tones = {
    brass: 'bg-brass-soft text-ink ring-brass/30',
    bad: 'bg-bad-soft text-ink ring-bad/30',
    good: 'bg-good-soft text-ink ring-good/30',
  };
  return <div className={`rounded-xl px-4 py-3 text-[15px] ring-1 ${tones[tone]}`}>{children}</div>;
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
