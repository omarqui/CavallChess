import type { ReactNode } from 'react';
import { useSettings } from '../db/hooks';
import { setSettings } from '../db/repo';
import { tipVisible, type TipId } from '../screens/intro/gate';
import { Banner } from './kit';

export type { TipId };

/** Aviso de primer uso de una pantalla: se muestra una vez, después de la bienvenida. */
export function Tip({ id, children, className = 'mb-3' }: { id: TipId; children: ReactNode; className?: string }) {
  const s = useSettings();
  if (!s || !tipVisible(id, s)) return null;
  return (
    <div className={className}>
      <Banner>
        <p>{children}</p>
        <button
          onClick={() => void setSettings({ tipsSeen: [...new Set([...(s.tipsSeen ?? []), id])] })}
          className="-mb-2 mt-1 min-h-11 font-semibold underline underline-offset-2"
        >
          Entendido
        </button>
      </Banner>
    </div>
  );
}
