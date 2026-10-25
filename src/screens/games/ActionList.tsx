import { useId, type ReactNode } from 'react';
import { Icon, ICONS } from '../../ui/kit';

/** Acciones secundarias agrupadas en una sola tarjeta, una por fila (como en Ajustes de iOS). */
export function ActionList({ children }: { children: ReactNode }) {
  return <div className="divide-y divide-line overflow-hidden rounded-2xl bg-surface ring-1 ring-line">{children}</div>;
}

/** Una fila de `ActionList`: toda la fila es el botón; la explicación va como descripción, no como nombre. */
export function ActionRow({
  title,
  hint,
  chevron = false,
  disabled,
  onClick,
}: {
  title: string;
  hint?: string;
  /** Lleva a otra pantalla. */
  chevron?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  const id = useId();
  return (
    <button
      aria-labelledby={`${id}-t`}
      aria-describedby={hint ? `${id}-h` : undefined}
      disabled={disabled}
      onClick={onClick}
      className="flex min-h-12 w-full items-center gap-3 px-4 py-2.5 text-left transition hover:bg-raised active:bg-raised disabled:opacity-40 disabled:hover:bg-transparent"
    >
      <span className="min-w-0 flex-1">
        <span id={`${id}-t`} className="block text-[15px] font-medium leading-snug">
          {title}
        </span>
        {hint && (
          <span id={`${id}-h`} className="mt-0.5 block text-sm leading-snug text-muted">
            {hint}
          </span>
        )}
      </span>
      {chevron && <Icon d={ICONS.forward} className="size-5 text-muted" />}
    </button>
  );
}
