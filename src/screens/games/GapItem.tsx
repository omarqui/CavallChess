import type { RepertoireGraph } from '../../chess/graph';
import { figurine, nodeId, playUci } from '../../chess/position';
import { useLibrary } from '../../library/catalog';
import { findFichasForMove } from '../../library/status';
import type { Gap } from '../../types';
import { arrow, Board } from '../../ui/Board';
import { Button, MoveLine, sideLabel } from '../../ui/kit';
import { navigate } from '../../ui/router';
import { gapRepertoirePath } from './format';

/**
 * Un hueco: la posición con la jugada del rival, cuántas veces salió y cómo prepararle una respuesta. `g` es el
 * repertorio del hueco; `repName` se muestra si tenés más de uno de ese color.
 */
export function GapItem({ gap, g, repName }: { gap: Gap; g: RepertoireGraph; repName?: string }) {
  const id = nodeId(g.rep, gap.epd);
  const path = g.pathFromRoot(id) ?? g.anyPathFromRoot(id) ?? [];
  const covered = g.edges.has(`${id}|${gap.uci}`);
  const [from, to] = [gap.uci.slice(0, 2), gap.uci.slice(2, 4)];
  const played = playUci(gap.epd, gap.uci);
  const lib = useLibrary().fichas;
  const ficha = lib ? findFichasForMove(lib, gap.side, gap.epd, gap.uci)[0] : undefined;
  return (
    <li className="flex gap-3 rounded-xl p-3 ring-1 ring-line">
      <div className="w-24 shrink-0">
        <Board epd={gap.epd} orientation={gap.side} coordinates={false} shapes={[arrow(from, to, 'red')]} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-muted">
          {sideLabel(gap.side)}
          {repName && ` · ${repName}`} · {gap.count} {gap.count === 1 ? 'vez' : 'veces'}
        </p>
        <div className="mt-1 text-[15px]">
          <MoveLine moves={[...path, { san: played?.san ?? gap.san, id: 'gap' }]} active={path.length} />
        </div>
        {covered ? (
          <p className="mt-2 text-sm text-good">Ya está en tu repertorio.</p>
        ) : (
          <Button
            className="mt-2"
            onClick={() => navigate(gapRepertoirePath(gap.side, gap.id, gap.epd, gap.san))}
          >
            Preparar respuesta a {figurine(gap.san)}
          </Button>
        )}
        {ficha && (
          <Button className="mt-2" onClick={() => navigate(`/biblioteca/${ficha.id}`)}>
            Mirá la ficha: {ficha.name}
          </Button>
        )}
      </div>
    </li>
  );
}
