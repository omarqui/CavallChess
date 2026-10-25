import { figurine, moveNumberLabel } from '../../chess/position';
import type { GameMove } from '../../games/gamePgn';
import { libName, type OpeningInsight, type TrapEvent } from '../../games/insight';
import { VERDICT_LABEL } from '../../games/judge';
import { ExplorerPanel } from '../../ui/ExplorerPanel';
import { Button, Toggle } from '../../ui/kit';
import { figurineText, RichInline, RichText } from '../../ui/RichText';
import { navigate } from '../../ui/router';
import { useSessionState } from '../../ui/sessionState';
import { Chip } from '../Ficha';
import type { MoveJudgement } from './useJudgements';

const moveLabel = (moves: GameMove[], ply: number) => `${moveNumberLabel(ply)}${figurine(moves[ply].san)}`;

const sans = (list: { san: string }[]) => list.map((m) => figurine(m.san)).join(' o ');

const pawns = (v: number) => v.toFixed(1).replace('.', ',');

function trapText(t: TrapEvent): string {
  const name = `«${t.line.name}»`;
  if (t.kind !== 'favor') return t.kind === 'esquivaste' ? `Esquivaste la trampa ${name}.` : `Caíste en la trampa ${name}.`;
  if (t.punished === true) return `El rival cayó en la trampa ${name} y lo castigaste.`;
  if (t.punished === false) return `El rival cayó en la trampa ${name}, pero no jugaste ${figurine(t.expectedSan!)}.`;
  return `El rival cayó en la trampa ${name}.`;
}

const trapTone = (t: TrapEvent) => (t.kind === 'caiste' || (t.kind === 'favor' && t.punished === false) ? 'bad' : 'good');

const verdictTone = (j: MoveJudgement) => (j.verdict === 'bien' ? 'good' : j.verdict === 'imprecision' ? 'brass' : 'bad');

/** "Imprecisión: perdés 0,6. El motor prefería ♗d3." o "Jugada sana según el motor (+0,3)." */
export function judgementText(j: MoveJudgement): string {
  const after = `${j.after > 0 ? '+' : ''}${pawns(j.after)}`;
  if (j.verdict === 'bien') return `Jugada sana según el motor (${after}).`;
  return `${VERDICT_LABEL[j.verdict]} según el motor: perdés ${pawns(j.loss)} (queda ${after}).${j.best ? ` Prefería ${figurine(j.best)}.` : ''}`;
}

/** El veredicto del motor sobre una jugada tuya: calculando, sin veredicto (mate o ahogado) o la calificación. */
export function JudgementLine({ judgement, className = '' }: { judgement: MoveJudgement | null | undefined; className?: string }) {
  if (judgement === null) return null;
  if (!judgement) return <p className={`text-muted ${className}`}>El motor está calificando esta jugada…</p>;
  const tone = verdictTone(judgement);
  return <p className={`font-medium ${tone === 'bad' ? 'text-bad' : tone === 'good' ? 'text-good' : ''} ${className}`}>{judgementText(judgement)}</p>;
}

/**
 * Debajo del encabezado: la apertura, hasta dónde fue teoría de la biblioteca y quién salió (si fuiste vos, con el
 * veredicto del motor) y las trampas, con saltos a cada una.
 */
export function OpeningSummary({
  insight,
  moves,
  judgements,
  onGo,
}: {
  insight: OpeningInsight;
  moves: GameMove[];
  judgements: Map<number, MoveJudgement | null>;
  onGo: (ply: number) => void;
}) {
  const { theory, traps, exit } = insight;
  const link = 'rounded font-medium underline-offset-2 hover:underline';
  const judged = exit?.mine ? judgements.get(exit.ply) : undefined;
  return (
    <div className="pb-2">
      <p className="truncate text-[15px] font-semibold">{insight.name ?? 'Apertura sin nombre conocido'}</p>
      <p className="text-sm text-muted">
        {!exit ? (
          theory === 0 ? (
            'La biblioteca no cubre esta apertura.'
          ) : (
            'Toda la partida sigue la biblioteca.'
          )
        ) : exit.mine ? (
          <>
            Teoría hasta {moveLabel(moves, theory - 1)};{' '}
            <button className={`${link} text-bad`} onClick={() => onGo(exit.ply + 1)}>
              te saliste en {moveLabel(moves, exit.ply)}
            </button>
            {exit.known.length > 0 && ` (la ficha juega ${sans(exit.known)})`}.
            {judged && (
              <>
                {' '}
                <Chip tone={verdictTone(judged)}>{VERDICT_LABEL[judged.verdict]}</Chip>
              </>
            )}
            {judged === undefined && ' Calificando con el motor…'}
          </>
        ) : (
          <>
            Teoría hasta {moveLabel(moves, theory - 1)};{' '}
            <button className={`${link} text-brass`} onClick={() => onGo(exit.ply + 1)}>
              el rival salió en {moveLabel(moves, exit.ply)}
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

/**
 * Lo que se sabe de la jugada que se acaba de ver en el tablero (biblioteca, repertorio, trampas, salida de la teoría y
 * el veredicto del motor si es una salida tuya), las ideas de la ficha y el explorador de la posición.
 */
export function PlyDetail({
  insight,
  moves,
  ply,
  epd,
  known,
  token,
  judging,
  judgements,
}: {
  insight: OpeningInsight;
  moves: GameMove[];
  ply: number;
  epd: string;
  /** Las jugadas de tu repertorio en la posición, para marcarlas en el explorador. */
  known: Set<string>;
  token?: string;
  /** Tus jugadas que califica el motor (índices en `moves`). */
  judging: number[];
  judgements: Map<number, MoveJudgement | null>;
}) {
  const [explorer, setExplorer] = useSessionState('games:explorador', false);
  const i = ply - 1;
  const info = i >= 0 ? insight.plies[i] : undefined;
  const traps = insight.traps.filter((t) => t.ply === i);
  const next = moves[ply];
  const lib = info?.lib;
  const exit = insight.exit?.ply === i ? insight.exit : undefined;
  const outOfBook = i >= insight.theory;
  // La introducción de una línea se muestra en la primera jugada en que la partida la sigue.
  const intro = lib && !lib.fall && lib.line.intro && insight.plies[i - 1]?.lib?.line !== lib.line ? lib.line.intro : undefined;
  const ficha = insight.last?.ficha;
  return (
    <div className="pt-2 text-[15px]">
      {info ? (
        <>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="notation font-semibold">{moveLabel(moves, i)}</span>
            {lib ? (
              <Chip tone={lib.fall ? 'bad' : 'brass'}>{lib.fall ? 'Caída de una trampa' : 'Biblioteca'}</Chip>
            ) : exit ? (
              <Chip tone={exit.mine ? 'bad' : 'plain'}>{exit.mine ? 'Te saliste de la teoría' : 'El rival salió de la teoría'}</Chip>
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
          {exit && exit.known.length > 0 && (
            <p className="mt-1">
              {exit.mine ? 'La ficha juega' : 'La ficha esperaba'} {sans(exit.known)}.
            </p>
          )}
          {judging.includes(i) && <JudgementLine judgement={judgements.get(i)} className="mt-1" />}
          {intro && <RichText text={intro} className="mt-1 text-muted" />}
          {info.edge?.explanation && <p className="mt-1">{figurineText(info.edge.explanation)}</p>}
          {!info.edge?.explanation && info.edge?.hint && <p className="mt-1 text-muted">Pista: {figurineText(info.edge.hint)}</p>}
          {info.comment && <p className="mt-1">{figurineText(info.comment)}</p>}
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
      {ficha && (
        <details
          className="mt-2 border-t border-line pt-2"
          // El panel es bajo: al abrirlas, las ideas suben a la vista.
          onToggle={(e) => e.currentTarget.open && e.currentTarget.scrollIntoView({ block: 'start', behavior: 'smooth' })}
        >
          <summary className="min-h-10 cursor-pointer py-2 font-medium">Ideas de la apertura: {ficha.name}</summary>
          <RichText text={ficha.ideas} className="mt-1 space-y-2" />
          {ficha.tips.length > 0 && (
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {ficha.tips.map((t, k) => (
                <li key={k}>
                  <RichInline text={t} />
                </li>
              ))}
            </ul>
          )}
        </details>
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
