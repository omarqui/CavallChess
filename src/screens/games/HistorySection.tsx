import { useEffect, useRef, useState } from 'react';
import { loadedMonths } from '../../games/chesscom';
import { isBusy } from '../../games/lock';
import { loadOlderGames } from '../../games/sync';
import type { Settings } from '../../types';
import { Section } from '../../ui/kit';
import { useSessionState } from '../../ui/sessionState';
import { ActionList, ActionRow } from './ActionList';
import { Feedback } from './Feedback';
import { monthName, plural, sentence, WAITING } from './format';
import type { Job, RunJob } from './jobs';
import { ProgressBox, type Progress } from './ProgressBox';

/** El mes más viejo leído de la cuenta actual (los de otra cuenta no cuentan). */
const oldestMonth = (s: Settings) => (s.chesscomUser ? loadedMonths(s.chesscomMonths, s.chesscomUser)[0] : undefined);

/** Carga hacia atrás: 6 meses o todo, con avance, "Cancelar" y lo que sumó. */
export function HistorySection({ settings, job, run }: { settings: Settings; job: Job | null; run: RunJob }) {
  const [progress, setProgress] = useState<Progress | null>(null);
  const [result, setResult] = useSessionState<string | null>('partidas.historial.resultado', null);
  const [error, setError] = useSessionState<string | null>('partidas.historial.error', null);
  const [cancelling, setCancelling] = useState(false);
  const abort = useRef<AbortController | null>(null);
  // Suelta una carga que todavía espera el candado; devuelve false si ya empezó (ver `load`).
  const abandon = useRef<(() => boolean) | null>(null);
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
      let started = false;
      let abandoned = false;
      try {
        // En cola detrás de otra tarea, "Cancelar" no espera a que termine: la llamada encolada vuelve cancelada
        // cuando le toca el candado (sin pedir nada) y su resultado se ignora.
        const queued = loadOlderGames({
          months,
          signal: controller.signal,
          onStart: () => {
            started = true;
          },
          onProgress: (msg, done, total) => {
            if (abandoned) return;
            monthsToRead = total;
            if (total === 0) setProgress({ text: msg, value: null });
            else if (done < total) {
              setProgress({ text: `${msg.replace(/…$/, '')} · ${done + 1} de ${total}`, value: (done / total) * 100 });
            }
          },
        });
        const r = await new Promise<Awaited<typeof queued> | null>((resolve, reject) => {
          queued.then(resolve, reject);
          abandon.current = () => {
            if (started) return false;
            abandoned = true;
            queued.catch(() => undefined);
            resolve(null);
            return true;
          };
        });
        if (!r) {
          setResult('Cancelaste la carga antes de que empezara.');
          return;
        }
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
        abandon.current = null;
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
            abort.current?.abort();
            // Si todavía no empezó, se suelta ya; si empezó, corta en el próximo paso ("Cancelando…").
            if (!abandon.current?.()) setCancelling(true);
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
