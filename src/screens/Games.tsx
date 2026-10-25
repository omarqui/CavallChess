import { useLiveQuery } from 'dexie-react-hooks';
import { useRef, useState } from 'react';
import { db } from '../db/db';
import { repFromId } from '../chess/position';
import { useGaps, useRepertoireState, useSettings } from '../db/hooks';
import { isBusy } from '../games/lock';
import { syncChesscom } from '../games/sync';
import { Banner, Button, Screen, Section } from '../ui/kit';
import { Tip } from '../ui/Tip';
import { navigate } from '../ui/router';
import { useSessionState } from '../ui/sessionState';
import { Feedback } from './games/Feedback';
import { plural, sentence, WAITING } from './games/format';
import { GameList } from './games/GameList';
import { GapItem } from './games/GapItem';
import { HistorySection } from './games/HistorySection';
import type { Job, RunJob } from './games/jobs';
import { ToolsSection } from './games/ToolsSection';

/** Huecos visibles de entrada (los más frecuentes): cada uno lleva un tablero y empujarían la lista hacia abajo. */
const GAPS_SHOWN = 5;

/**
 * Partidas, de arriba abajo: actualizar, el historial, las herramientas contra el repertorio, los huecos y, al final,
 * la lista (que con el historial cargado no tiene fin).
 */
export function GamesScreen() {
  const settings = useSettings();
  const gaps = useGaps();
  const reps = useRepertoireState();
  const total = useLiveQuery(() => db.games.count());
  // Los mensajes también quedan al volver de una partida: si desaparecieran, la lista subiría y el scroll no
  // caería en la misma fila.
  const [status, setStatus] = useSessionState<string | null>('partidas.estado', null);
  const [error, setError] = useSessionState<string | null>('partidas.error', null);
  const [job, setJob] = useState<Job | null>(null);
  // Como el filtro de la lista: al volver de una partida siguen abiertos.
  const [allGaps, setAllGaps] = useSessionState('partidas.todosLosHuecos', false);
  const running = useRef(false);
  if (!settings || !gaps || total === undefined || !reps) return null;
  // Los huecos de un repertorio que ya no existe esperan al recálculo: no se muestran.
  const shownGaps = gaps.filter((g) => reps.graphs.has(repFromId(g.id)));
  const repName = (gapId: string) => {
    const rep = reps.repertoires.find((r) => r.id === repFromId(gapId));
    return rep && reps.repertoires.filter((r) => r.side === rep.side).length > 1 ? rep.name : undefined;
  };

  const run: RunJob = async (next, task) => {
    if (running.current) return;
    running.current = true;
    setJob(next);
    try {
      await task();
    } finally {
      running.current = false;
      setJob(null);
    }
  };

  const sync = () =>
    run('sync', async () => {
      setError(null);
      // La actualización automática del arranque puede estar corriendo: esta espera su turno ("Buscando archivos…"
      // llega recién cuando empieza).
      setStatus(isBusy() ? WAITING : null);
      try {
        const r = await syncChesscom(setStatus);
        setStatus(
          r.imported
            ? `${plural(r.imported, 'partida nueva', 'partidas nuevas')}: ${plural(r.deviations, 'desvío', 'desvíos')} para repasar y ${plural(r.gaps, 'hueco', 'huecos')}.`
            : 'No hay partidas nuevas.',
        );
      } catch (e) {
        setError(sentence((e as Error).message));
        setStatus(null);
      }
    });

  return (
    <Screen title="Partidas">
      {(total > 0 || gaps.length > 0) && (
        <Tip id="partidas">
          Un desvío en una partida de los últimos 30 días hace vencer esa tarjeta. Un hueco es algo que te jugaron y no
          tenés preparado.
        </Tip>
      )}
      {!settings.chesscomUser ? (
        <Banner>
          Para cruzar tus partidas con el repertorio, configurá tu usuario de Chess.com en{' '}
          <button className="font-semibold underline underline-offset-2" onClick={() => navigate('/settings')}>
            Ajustes
          </button>
          .
        </Banner>
      ) : (
        <div>
          <p className="text-[15px] text-muted">
            Chess.com · {settings.chesscomUser}
            {settings.lastChesscomSync &&
              ` · actualizado ${new Date(settings.lastChesscomSync).toLocaleString('es', { dateStyle: 'short', timeStyle: 'short' })}`}
          </p>
          <Button variant="primary" className="mt-3 w-full" disabled={!!job} onClick={() => void sync()}>
            {job === 'sync' ? 'Actualizando…' : 'Actualizar partidas'}
          </Button>
          <Feedback result={status} error={error} />
        </div>
      )}

      {settings.chesscomUser && <HistorySection settings={settings} job={job} run={run} />}
      {total > 0 && <ToolsSection job={job} run={run} />}

      <Section title="Huecos del repertorio" aside={shownGaps.length > 0 && <span className="text-sm text-muted">{shownGaps.length}</span>}>
        {shownGaps.length === 0 ? (
          <p className="text-[15px] text-muted">
            Cuando un rival juegue algo que tu repertorio no cubre, aparece acá para que prepares tu respuesta.
          </p>
        ) : (
          <>
            <ul className="space-y-3">
              {shownGaps.slice(0, allGaps ? 30 : GAPS_SHOWN).map((g) => (
                <GapItem key={g.id} gap={g} g={reps.graphs.get(repFromId(g.id))!} repName={repName(g.id)} />
              ))}
            </ul>
            {!allGaps && shownGaps.length > GAPS_SHOWN && (
              <Button className="mt-3 w-full" onClick={() => setAllGaps(true)}>
                Ver {shownGaps.length > 30 ? 'los 30 más frecuentes' : `los ${shownGaps.length} huecos`}
              </Button>
            )}
          </>
        )}
      </Section>

      <GameList hasGames={total > 0} />
    </Screen>
  );
}
