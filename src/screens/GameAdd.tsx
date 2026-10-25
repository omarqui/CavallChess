import { useMemo } from 'react';
import { useGame, useGraphs } from '../db/hooks';
import { gamePgnUntil } from '../games/gamePgn';
import { ImportPreview } from '../ui/ImportPreview';
import { Screen } from '../ui/kit';
import { navigate } from '../ui/router';
import { showToast } from '../ui/toast';
import { BackLink } from './Ficha';
import { GameNotFound, gamePath } from './GameViewer';

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** Las primeras `plies` jugadas de una partida, al repertorio del color con el que la jugaste (con vista previa). */
export function GameAddScreen({ id, plies }: { id: string; plies: number }) {
  const game = useGame(id);
  const graphs = useGraphs();
  const pgn = useMemo(() => (game ? gamePgnUntil(game.pgn, plies) : null), [game, plies]);
  if (game === undefined || !graphs) return null;
  if (!game) return <GameNotFound />;
  const back = () => navigate(gamePath(game.id), true);
  if (!pgn) {
    return (
      <Screen title="Agregar desde la partida">
        <p className="text-[15px] text-muted">Esta partida no empieza desde la posición inicial.</p>
        <div className="mt-4">
          <BackLink to={gamePath(game.id)}>Volver a la partida</BackLink>
        </div>
      </Screen>
    );
  }
  return (
    <ImportPreview
      key={`${game.myColor}:${pgn}`}
      pgn={pgn}
      side={game.myColor}
      graph={graphs[game.myColor]}
      title="Agregar desde la partida"
      // Sin propuesta de nombre: la raíz de la partida no tiene por qué llamarse como el rival.
      proposeNames={() => []}
      onSaved={({ mine, rival }) => {
        const total = mine + rival;
        showToast(
          total ? `Sumaste ${plural(total, 'jugada', 'jugadas')}, ${mine} para aprender.` : 'Ya tenías todo eso en tu repertorio.',
        );
        back();
      }}
      onBack={back}
    />
  );
}
