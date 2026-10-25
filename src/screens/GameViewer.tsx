import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { DrawShape } from '@lichess-org/chessground/draw';
import type { RepertoireGraph } from '../chess/graph';
import { displaySquares, figurine, INITIAL_EPD, nodeId, type Side } from '../chess/position';
import { useGame, useGraphs } from '../db/hooks';
import { ensureDue } from '../db/repo';
import { analyzeGame, type GameAnalysis } from '../games/analyze';
import { gameMoves, type GameMove } from '../games/gamePgn';
import type { GameOutcome, GameRow } from '../types';
import { arrow, Board } from '../ui/Board';
import { EnginePanel } from '../ui/EnginePanel';
import { Banner, Button, MoveLine, Screen, Toggle } from '../ui/kit';
import { navigate } from '../ui/router';
import { showToast } from '../ui/toast';
import { BackLink, Icon, ICONS } from './Ficha';
import { NavButton } from './LineViewer';

const LOSSES = ['checkmated', 'resigned', 'timeout', 'lose', 'abandoned'];

/** El resultado de Chess.com (`win`, `resigned`, `agreed`…) desde tu lado, como en la lista de Partidas. */
const resultLabel = (result: string) =>
  result === 'win' ? 'Ganaste' : LOSSES.includes(result) ? 'Perdiste' : 'Tablas';

/** Ruta del visor de una partida (el id es su URL de Chess.com, así que va codificado). */
export const gamePath = (id: string) => `/games/${encodeURIComponent(id)}`;

const EXTERNAL = <path d="M14 5h5v5M19 5l-8 8M17 13.5V18a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1h4.5" />;

type Exit = Extract<GameOutcome, { kind: 'myDeviation' | 'gap' }>;

const exitOf = (o: GameOutcome): Exit | undefined => (o.kind === 'myDeviation' || o.kind === 'gap' ? o : undefined);

/** Lo que se dice cuando la partida no salió del repertorio por un desvío ni por una novedad. */
function outcomeNote(o: Exclude<GameOutcome, Exit>): string {
  if (o.kind === 'inBook') return 'La partida no salió de tu repertorio.';
  // Sin ninguna jugada tuya desde la posición inicial, la "preparación" termina antes de empezar.
  if (o.kind === 'endOfBook' && o.ply > 0) return 'Seguiste tu repertorio hasta el final de tu preparación.';
  return 'Esta partida no pasó por tu repertorio.';
}

/** Dónde abre el visor: antes de la jugada de salida, al final de tu preparación o en la posición inicial. */
function openingPly(o: GameOutcome): number {
  if (o.kind === 'myDeviation' || o.kind === 'gap' || o.kind === 'endOfBook') return o.ply;
  return 0;
}

export function GameNotFound() {
  return (
    <Screen title="No encontramos esa partida">
      <p className="text-[15px] text-muted">Puede que el enlace sea viejo o que la partida ya no esté guardada en este dispositivo.</p>
      <div className="mt-4">
        <BackLink to="/games">Ir a Partidas</BackLink>
      </div>
    </Screen>
  );
}

export function GameViewerScreen({ id }: { id: string }) {
  const game = useGame(id);
  const graphs = useGraphs();
  if (game === undefined || !graphs) return null;
  if (!game) return <GameNotFound />;
  return <Viewer game={game} graph={graphs[game.myColor]} />;
}

function Viewer({ game, graph }: { game: GameRow; graph: RepertoireGraph }) {
  const moves = useMemo(() => gameMoves(game.pgn), [game.pgn]);
  // El resultado se recalcula contra el repertorio de ahora, no el que se guardó al importar.
  const analysis = useMemo(() => analyzeGame(game.pgn, graph), [game.pgn, graph]);
  if (!moves) {
    return (
      <div className="mx-auto w-full max-w-xl px-4 safe-top">
        <GameHeader game={game} />
        <p className="mt-4 text-[15px] text-muted">Esta partida no empieza desde la posición inicial.</p>
      </div>
    );
  }
  return <Player game={game} moves={moves} analysis={analysis} />;
}

function GameHeader({ game, aside }: { game: GameRow; aside?: ReactNode }) {
  const date = new Date(game.endTime).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' });
  return (
    <header className="shrink-0 pb-2">
      <div className="flex items-center justify-between gap-3">
        <BackLink to="/games">Partidas</BackLink>
        {aside && <div className="shrink-0">{aside}</div>}
      </div>
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-book min-w-0 truncate text-xl font-semibold leading-tight">vs {game.opponent}</h1>
        <a
          href={game.id}
          target="_blank"
          rel="noreferrer"
          className="-mr-2 inline-flex min-h-11 shrink-0 items-center gap-1 rounded-lg px-2 text-[15px] font-medium text-brass transition hover:bg-surface"
        >
          Ver en Chess.com
          <Icon d={EXTERNAL} className="size-4" />
        </a>
      </div>
      <p className="text-sm text-muted">
        Con {game.myColor === 'white' ? 'blancas' : 'negras'} · {game.timeClass} · {resultLabel(game.result)} · {date}
      </p>
    </header>
  );
}

/** Flechas en la posición de salida: la jugada de la partida y, si te desviaste, la de tu repertorio. */
function exitShapes(exit: Exit, move: GameMove): DrawShape[] {
  const [from, to] = displaySquares(move.fromEpd, move.uci);
  if (exit.kind === 'gap') return [arrow(from, to, 'yellow')];
  const expected = exit.cardId.slice(exit.cardId.lastIndexOf('|') + 1);
  const [eFrom, eTo] = displaySquares(move.fromEpd, expected);
  return [arrow(from, to, 'red'), arrow(eFrom, eTo, 'green')];
}

function Player({ game, moves, analysis }: { game: GameRow; moves: GameMove[]; analysis: GameAnalysis }) {
  const o = analysis.outcome;
  const exit = exitOf(o);
  const [ply, setPly] = useState(() => Math.min(openingPly(o), moves.length));
  const [analyze, setAnalyze] = useState(false);
  const strip = useRef<HTMLDivElement>(null);

  const go = (n: number) => setPly(Math.max(0, Math.min(moves.length, n)));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
      if (e.key === 'ArrowLeft') setPly((p) => Math.max(0, p - 1));
      else if (e.key === 'ArrowRight') setPly((p) => Math.min(moves.length, p + 1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [moves.length]);

  // La tira de jugadas mantiene la actual en el centro (con la siguiente, la de salida, a la vista).
  useEffect(() => {
    const box = strip.current;
    if (!box) return;
    const active = box.querySelector<HTMLElement>('[aria-current="true"]');
    box.scrollLeft = active ? active.offsetLeft - (box.clientWidth - active.offsetWidth) / 2 : 0;
  }, [ply]);

  const current = ply > 0 ? moves[ply - 1] : undefined;
  const epd = current?.epd ?? INITIAL_EPD;
  const exitMove = exit ? moves[exit.ply] : undefined;
  const shapes = exit && exitMove && ply === exit.ply ? exitShapes(exit, exitMove) : undefined;
  const agregar = (plies: number) => navigate(`${gamePath(game.id)}/agregar?hasta=${plies}`);

  const review = async (cardId: string) => {
    try {
      await ensureDue(cardId);
    } catch (e) {
      showToast(`No se pudo preparar el repaso: ${e instanceof Error ? e.message : 'error desconocido'}.`);
      return;
    }
    navigate(`/train?card=${encodeURIComponent(cardId)}`);
  };

  return (
    <div className="mx-auto flex h-full w-full max-w-xl flex-col">
      <div className="safe-top shrink-0 px-4">
        <GameHeader game={game} aside={<Toggle label="Analizar" checked={analyze} onChange={setAnalyze} />} />
      </div>

      <div className="mx-auto w-full shrink-0 px-4" style={{ maxWidth: 'calc(min(100vw, 36rem, 38dvh) + 2rem)' }}>
        <Board
          epd={epd}
          orientation={game.myColor}
          lastMove={current ? displaySquares(current.fromEpd, current.uci) : undefined}
          shapes={shapes}
          animationMs={150}
        />
      </div>

      {/* Una sola línea que se desliza: con la lista entera debajo, el aviso y las jugadas no entran a 390 px. */}
      <div ref={strip} className="relative shrink-0 overflow-x-auto whitespace-nowrap px-4 pt-1 text-[17px] [scrollbar-width:none]">
        <MoveLine
          moves={moves.map((m, i) => ({ san: m.san, id: `${i}-${m.uci}` }))}
          active={ply - 1}
          onPick={(i) => go(i + 1)}
          mark={exit && { index: exit.ply, className: `font-semibold ${exit.kind === 'gap' ? 'text-brass' : 'text-bad'}` }}
        />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-3 pt-2">
        {o.kind === 'myDeviation' || o.kind === 'gap' ? (
          <ExitNotice
            exit={o}
            gap={analysis.gap}
            side={game.myColor}
            at={ply}
            canAddReply={o.kind === 'gap' && moves.length >= o.ply + 2}
            onGo={() => go(o.ply)}
            onReview={(id) => void review(id)}
            onAddReply={() => agregar(o.ply + 2)}
          />
        ) : (
          <p className="text-[15px] text-muted">{outcomeNote(o)}</p>
        )}
      </div>

      <div className="safe-bottom shrink-0 border-t border-line bg-paper px-4 pt-2">
        {analyze && <EnginePanel epd={epd} />}
        <div className="flex gap-2 pt-2">
          <div className="flex w-16 shrink-0">
            <NavButton label="Anterior" disabled={ply <= 0} onClick={() => go(ply - 1)} icon={ICONS.back} />
          </div>
          <Button className="!min-h-14 flex-1 !px-3 text-center leading-tight" disabled={ply === 0} onClick={() => agregar(ply)}>
            <Icon d={ICONS.plus} className="size-5" />
            Agregar al repertorio hasta acá
          </Button>
          <div className="flex w-16 shrink-0">
            <NavButton
              label="Siguiente"
              disabled={ply >= moves.length}
              onClick={() => go(ply + 1)}
              icon={<path d="M9.5 6l6 6-6 6" />}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function ExitNotice({
  exit,
  gap,
  side,
  at,
  canAddReply,
  onGo,
  onReview,
  onAddReply,
}: {
  exit: Exit;
  gap: GameAnalysis['gap'];
  side: Side;
  at: number;
  canAddReply: boolean;
  onGo: () => void;
  onReview: (cardId: string) => void;
  onAddReply: () => void;
}) {
  const goButton = (
    <Button className="flex-auto !px-3" disabled={at === exit.ply} onClick={onGo}>
      Ir a esa jugada
    </Button>
  );
  if (exit.kind === 'myDeviation') {
    return (
      <Banner tone="bad">
        <p>
          Acá jugaste {figurine(exit.playedSan)}; en tu repertorio va {figurine(exit.expectedSan)}.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button className="flex-auto !px-3" onClick={() => onReview(exit.cardId)}>
            Repasar ahora
          </Button>
          {goButton}
        </div>
      </Banner>
    );
  }
  return (
    <Banner>
      <p>El rival jugó {figurine(exit.playedSan)} y tu repertorio no lo cubría.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {gap && (
          <Button
            className="flex-auto !px-3"
            onClick={() =>
              navigate(
                `/repertoire/${side}?node=${encodeURIComponent(nodeId(side, gap.epd))}&gap=${encodeURIComponent(gap.san)}`,
              )
            }
          >
            Preparar respuesta
          </Button>
        )}
        {goButton}
        {canAddReply && (
          <Button className="flex-auto !px-3" onClick={onAddReply}>
            Agregar la novedad y tu respuesta
          </Button>
        )}
      </div>
    </Banner>
  );
}
