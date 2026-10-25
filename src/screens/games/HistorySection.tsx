import { useEffect, useRef, useState } from 'react';
import { archiveMonth } from '../../games/chesscom';
import { isBusy } from '../../games/lock';
import { loadOlderGames } from '../../games/sync';
import type { Settings } from '../../types';
import { Section } from '../../ui/kit';
import { ActionList, ActionRow } from './ActionList';
import { Feedback } from './Feedback';
import { monthName, plural, sentence, WAITING } from './format';
import type { Job, RunJob } from './jobs';
import { ProgressBox, type Progress } from './ProgressBox';

/** El mes más viejo leído (las claves son urls de archivo; se aceptan también "AAAA-MM", como `olderArchives`). */
const oldestMonth = (s: Settings) =>
  Object.keys(s.chesscomMonths ?? {})
    .map((k) => (k.includes('/') ? archiveMonth(k) : k))
    .sort()[0];

/** Carga hacia atrás: 6 meses o todo, con avance, "Cancelar" y lo que sumó. */
export function HistorySection({ settings, job, run }: { settings: Settings; job: Job | null; run: RunJob }) {
  const [progress, setProgress] = useState<Progress | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const abort = useRef<AbortController | null>(null);
  // Salir de la pantalla corta la carga. Lo leído queda guardado y la próxima sigue desde ahí; así nunca corren dos
  // cargas a la vez pidiendo los mismos meses.
  useEffect(() => () => abort.current?.abort(), []);
  const oldest = oldestMonth(settings);

  const load = (months: number | 'all') =>
    run('history', async () => {
      const controller = new AbortController();
      abort.current = controller;
      setResult(null);
      setError(null);
      setCancelling(false);
      // Si la actualización automática (u otra carga) está corriendo, esta espera su turno: se dice así.
      setProgress({ text: isBusy() ? WAITING : 'Buscando archivos…', value: null });
      let monthsToRead = 0;
      try {
        const r = await loadOlderGames({
          months,
          signal: controller.signal,
          onProgress: (msg, done, total) => {
            monthsToRead = total;
            if (total === 0) setProgress({ text: msg, value: null });
            else if (done < total) {
              setProgress({ text: `${msg.replace(/…$/, '')} · ${done + 1} de ${total}`, value: (done / total) * 100 });
            }
          },
        });
        const imported = `Sumaste ${plural(r.imported, 'partida', 'partidas')}.`;
        const left = r.remaining ? ` Quedan ${plural(r.remaining, 'mes más viejo', 'meses más viejos')}.` : '';
        setResult(
          // Cortada sin que tocaras "Cancelar": cambiaste de usuario (los meses que quedan eran de la otra cuenta).
          r.cancelled && !controller.signal.aborted
            ? `Cambiaste de usuario de Chess.com: la carga se cortó. ${imported}`
            : r.cancelled
              ? `Cancelaste la carga. ${imported}${left}`
              : monthsToRead === 0
                ? 'Ya tenías todo el historial cargado.'
                : `${imported}${left}`,
        );
      } catch (e) {
        setError(sentence((e as Error).message));
      } finally {
        abort.current = null;
        setProgress(null);
      }
    });

  return (
    <Section
      title="Historial"
      aside={oldest && <span className="text-sm text-muted">desde {monthName(oldest)}</span>}
    >
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
        <>
          <ActionList>
            <ActionRow title="Cargar partidas anteriores (6 meses)" disabled={!!job} onClick={() => void load(6)} />
            <ActionRow title="Cargar todo el historial" disabled={!!job} onClick={() => void load('all')} />
          </ActionList>
          <p className="mt-1.5 text-sm text-muted">Actualizar trae solo lo nuevo; esto suma lo anterior.</p>
        </>
      )}
      <Feedback
        result={result}
        error={error}
        note="Lo que ya se leyó quedó guardado: la próxima carga sigue desde ahí."
      />
    </Section>
  );
}
