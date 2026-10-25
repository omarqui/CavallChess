import { useLiveQuery } from 'dexie-react-hooks';
import { useRef, useState } from 'react';
import { db } from '../db/db';
import { useGaps, useGraphs, useSettings } from '../db/hooks';
import { syncChesscom } from '../games/sync';
import { Banner, Button, Screen, Section } from '../ui/kit';
import { Tip } from '../ui/Tip';
import { navigate } from '../ui/router';
import { Feedback } from './games/Feedback';
import { plural, sentence } from './games/format';
import { GameList } from './games/GameList';
import { GapItem } from './games/GapItem';
import { HistorySection } from './games/HistorySection';
import type { Job, RunJob } from './games/jobs';
import { ToolsSection } from './games/ToolsSection';

/**
 * Partidas, de arriba abajo: actualizar, el historial, las herramientas contra el repertorio, los huecos y, al final,
 * la lista (que con el historial cargado no tiene fin).
 */
export function GamesScreen() {
  const settings = useSettings();
  const gaps = useGaps();
  const graphs = useGraphs();
  const total = useLiveQuery(() => db.games.count());
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [job, setJob] = useState<Job | null>(null);
  const running = useRef(false);
  if (!settings || !gaps || total === undefined || !graphs) return null;

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

      <Section title="Huecos del repertorio" aside={gaps.length > 0 && <span className="text-sm text-muted">{gaps.length}</span>}>
        {gaps.length === 0 ? (
          <p className="text-[15px] text-muted">
            Cuando un rival juegue algo que tu repertorio no cubre, aparece acá para que prepares tu respuesta.
          </p>
        ) : (
          <ul className="space-y-3">
            {gaps.slice(0, 30).map((g) => (
              <GapItem key={g.id} gap={g} graphs={graphs} />
            ))}
          </ul>
        )}
      </Section>

      <GameList hasGames={total > 0} />
    </Screen>
  );
}
