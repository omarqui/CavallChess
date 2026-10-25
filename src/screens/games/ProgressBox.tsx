import type { ReactNode } from 'react';
import { Button } from '../../ui/kit';

export interface Progress {
  text: string;
  /** De 0 a 100, o `null` mientras todavía no se sabe cuánto falta. */
  value: number | null;
}

/** Texto de avance, "Cancelar" (si se puede) y la barra. */
export function ProgressBox({
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
    <div className="rounded-2xl bg-surface px-4 py-2 ring-1 ring-line">
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
