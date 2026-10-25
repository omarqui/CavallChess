import { useState } from 'react';
import { isBusy } from '../../games/lock';
import { recalcGames } from '../../games/store';
import { Section } from '../../ui/kit';
import { useSessionState } from '../../ui/sessionState';
import { navigate } from '../../ui/router';
import { ActionList, ActionRow } from './ActionList';
import { Feedback } from './Feedback';
import { plural, sentence, WAITING } from './format';
import type { Job, RunJob } from './jobs';
import { ProgressBox, type Progress } from './ProgressBox';

/** "Con tu repertorio": armar desde muchas partidas y recalcular contra el repertorio actual. */
export function ToolsSection({ job, run }: { job: Job | null; run: RunJob }) {
  const [progress, setProgress] = useState<Progress | null>(null);
  const [result, setResult] = useSessionState<string | null>('partidas.herramientas.resultado', null);
  const [error, setError] = useSessionState<string | null>('partidas.herramientas.error', null);

  const recalc = () =>
    run('recalc', async () => {
      setResult(null);
      setError(null);
      setProgress({ text: isBusy() ? WAITING : 'Recalculando…', value: null });
      try {
        const r = await recalcGames((done, total) =>
          setProgress({
            text: `Recalculando · ${done.toLocaleString('es')} de ${total.toLocaleString('es')}`,
            value: (done / total) * 100,
          }),
        );
        setResult(`Recalculaste ${plural(r.games, 'partida', 'partidas')}: ${plural(r.gaps, 'hueco', 'huecos')}.`);
      } catch (e) {
        setError(`No se pudo recalcular: ${sentence((e as Error).message)}`);
      } finally {
        setProgress(null);
      }
    });

  return (
    <Section title="Con tu repertorio">
      <ActionList>
        <ActionRow
          title="Armar repertorio desde tus partidas"
          hint="Tu jugada más repetida y las respuestas que más te hacen; lo revisás antes de guardar."
          chevron
          disabled={!!job}
          onClick={() => navigate('/games/armar')}
        />
        <ActionRow
          title="Recalcular contra el repertorio actual"
          hint="Si cambiaste el repertorio, pone al día la lista y los huecos."
          disabled={!!job}
          onClick={() => void recalc()}
        />
      </ActionList>
      {job === 'recalc' && progress && (
        <div className="mt-3">
          <ProgressBox label="Recálculo" progress={progress} />
        </div>
      )}
      <Feedback result={result} error={error} />
    </Section>
  );
}
