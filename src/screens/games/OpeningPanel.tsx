import { figurine, moveNumberLabel } from '../../chess/position';
import type { GameMove } from '../../games/gamePgn';
import { libName, type OpeningInsight, type TrapEvent } from '../../games/insight';
import { ExplorerPanel } from '../../ui/ExplorerPanel';
import { Button, Toggle } from '../../ui/kit';
import { figurineText } from '../../ui/RichText';
import { navigate } from '../../ui/router';
import { useSessionState } from '../../ui/sessionState';
import { Chip } from '../Ficha';

const moveLabel = (moves: GameMove[], ply: number) => `${moveNumberLabel(ply)}${figurine(moves[ply].san)}`;

function trapText(t: TrapEvent): string {
  const name = `«${t.line.name}»`;
  if (t.kind !== 'favor') return t.kind === 'esquivaste' ? `Esquivaste la trampa ${name}.` : `Caíste en la trampa ${name}.`;
  if (t.punished === true) return `El rival cayó en la trampa ${name} y lo castigaste.`;
  if (t.punished === false) return `El rival cayó en la trampa ${name}, pero no jugaste ${figurine(t.expectedSan!)}.`;
  return `El rival cayó en la trampa ${name}.`;
}

const trapTone = (t: TrapEvent) => (t.kind === 'caiste' || (t.kind === 'favor' && t.punished === false) ? 'bad' : 'good');

/** Debajo del encabezado: la apertura, hasta dónde fue teoría de la biblioteca y las trampas, con saltos a cada una. */
export function OpeningSummary({
  insight,
  moves,
  onGo,
}: {
  insight: OpeningInsight;
  moves: GameMove[];
  onGo: (ply: number) => void;
}) {
  const { theory, traps } = insight;
  const link = 'rounded font-medium text-brass underline-offset-2 hover:underline';
  return (
    <div className="pb-2">
      <p className="truncate text-[15px] font-semibold">{insight.name ?? 'Apertura sin nombre conocido'}</p>
      <p className="text-sm text-muted">
        {theory === 0 ? (
          'La biblioteca no cubre esta apertura.'
        ) : theory >= moves.length ? (
          'Toda la partida sigue la biblioteca.'
        ) : (
          <>
            Teoría de la biblioteca hasta {moveLabel(moves, theory - 1)};{' '}
            <button className={link} onClick={() => onGo(theory + 1)}>
              salió en {moveLabel(moves, theory)}
            </button>
            .
          </>
        )}
      </p>
      {traps.length > 0 && (
        <div className="mt-1 flex flex-wrap gap-1.5">
          {traps.map((t) => (
            <button key={`${t.ficha.id}/${t.line.id}`} onClick={() => onGo(t.ply + 1)} className="rounded-full">
              <Chip tone={trapTone(t)}>
                {t.kind === 'favor' ? 'Trampa a favor' : 'Trampa en contra'}: {t.line.name}
              </Chip>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Lo que se sabe de la jugada que se acaba de ver en el tablero, y el explorador de la posición. */
export function PlyDetail({
  insight,
  moves,
  ply,
  epd,
  known,
  token,
}: {
  insight: OpeningInsight;
  moves: GameMove[];
  ply: number;
  epd: string;
  /** Las jugadas de tu repertorio en la posición, para marcarlas en el explorador. */
  known: Set<string>;
  token?: string;
}) {
  const [explorer, setExplorer] = useSessionState('games:explorador', false);
  const i = ply - 1;
  const info = i >= 0 ? insight.plies[i] : undefined;
  const traps = insight.traps.filter((t) => t.ply === i);
  const next = moves[ply];
  const lib = info?.lib;
  const outOfBook = i >= insight.theory;
  return (
    <div className="pt-2 text-[15px]">
      {info ? (
        <>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="notation font-semibold">{moveLabel(moves, i)}</span>
            {lib ? (
              <Chip tone={lib.fall ? 'bad' : 'brass'}>{lib.fall ? 'Caída de una trampa' : 'Biblioteca'}</Chip>
            ) : (
              outOfBook && <Chip>Fuera de la biblioteca</Chip>
            )}
            {info.edge && <Chip tone="good">En tu repertorio</Chip>}
          </div>
          {info.name && <p className="mt-0.5 text-sm text-muted">{info.name}</p>}
          {traps.map((t) => (
            <p key={`${t.ficha.id}/${t.line.id}`} className={`mt-1 font-medium ${trapTone(t) === 'bad' ? 'text-bad' : 'text-good'}`}>
              {trapText(t)}
            </p>
          ))}
          {info.edge?.explanation && <p className="mt-1">{figurineText(info.edge.explanation)}</p>}
          {!info.edge?.explanation && info.edge?.hint && <p className="mt-1 text-muted">Pista: {figurineText(info.edge.hint)}</p>}
          {info.comment && <p className="mt-1">{figurineText(info.comment)}</p>}
          {i === insight.theory && insight.known.length > 0 && (
            <p className="mt-1 text-muted">
              La biblioteca sigue con {insight.known.map((m) => figurine(m.san)).join(' o ')}.
            </p>
          )}
          {lib && (
            <Button
              variant="ghost"
              className="-ml-3 mt-1 !min-h-10 !px-3 text-brass"
              onClick={() => navigate(`/biblioteca/${lib.ficha.id}/linea/${lib.line.id}`)}
            >
              Ver en la biblioteca: {libName(lib)}
              {lib.line.kind !== 'variante' && ` · ${lib.line.name}`}
            </Button>
          )}
        </>
      ) : (
        <p className="text-muted">Avanzá por la partida para ver qué dicen la biblioteca y tu repertorio de cada jugada.</p>
      )}
      {token && (
        <div className="mt-2 border-t border-line pt-2">
          <Toggle label="Explorador de Lichess" checked={explorer} onChange={setExplorer} />
          {explorer && (
            <ExplorerPanel
              epd={epd}
              token={token}
              known={known}
              played={next && { uci: next.uci, san: next.san }}
            />
          )}
        </div>
      )}
    </div>
  );
}
