import { useState } from 'react';
import { recalcGames } from '../../games/store';
import { Section } from '../../ui/kit';
import { navigate } from '../../ui/router';
import { ActionList, ActionRow } from './ActionList';
import { Feedback } from './Feedback';
import { plural, sentence } from './format';
import type { Job, RunJob } from './jobs';
import { ProgressBox, type Progress } from './ProgressBox';

/** "Con tu repertorio": armar desde muchas partidas y recalcular contra el repertorio actual. */
export function ToolsSection({ job, run }: { job: Job | null; run: RunJob }) {
  const [progress, setProgress] = useState<Progress | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const recalc = () =>
    run('recalc', async () => {
      setResult(null);
      setError(null);
      setProgress({ text: 'Recalculando…', value: null });
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
          hint="Tu jugada más repetida en cada posición y las respuestas que más te hacen. Lo revisás antes de guardar."
          chevron
          disabled={!!job}
          onClick={() => navigate('/games/armar')}
        />
        <ActionRow
          title="Recalcular contra el repertorio actual"
          hint="Cada partida se cruzó con el repertorio que tenías al bajarla. Si lo cambiaste, pone al día la lista y los huecos."
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
