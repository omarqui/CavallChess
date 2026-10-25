import { useMemo } from 'react';
import { useGame, useGraphs, useRepertoireState } from '../db/hooks';
import { gamePgnUntil } from '../games/gamePgn';
import { ImportPreview } from '../ui/ImportPreview';
import { BackLink, Screen } from '../ui/kit';
import { navigate } from '../ui/router';
import { showToast } from '../ui/toast';
import { gamePath, savedMessage } from './games/format';
import { GameNotFound } from './GameViewer';

/**
 * Las primeras `plies` jugadas de una partida, al repertorio con el que se cruzó (el que más la cubre; si no, el
 * activo del color con el que la jugaste), con vista previa.
 */
export function GameAddScreen({ id, plies }: { id: string; plies: number }) {
  const game = useGame(id);
  const graphs = useGraphs();
  const state = useRepertoireState();
  const pgn = useMemo(() => (game ? gamePgnUntil(game.pgn, plies) : null), [game, plies]);
  if (game === undefined || !graphs || !state) return null;
  if (!game) return <GameNotFound />;
  const matched = game.rep ? state.graphs.get(game.rep) : undefined;
  const graph = matched?.side === game.myColor ? matched : graphs[game.myColor];
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
      key={`${graph.rep}:${pgn}`}
      pgn={pgn}
      side={game.myColor}
      graph={graph}
      title="Agregar desde la partida"
      // Sin propuesta de nombre: la raíz de la partida no tiene por qué llamarse como el rival.
      proposeNames={() => []}
      onSaved={(saved) => {
        showToast(savedMessage(saved));
        back();
      }}
      onBack={back}
    />
  );
}
