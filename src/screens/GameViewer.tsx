import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { DrawShape } from '@lichess-org/chessground/draw';
import type { RepertoireGraph } from '../chess/graph';
import { displaySquares, figurine, INITIAL_EPD, nodeId, type Side } from '../chess/position';
import { useGame, useGraphs, useSettings } from '../db/hooks';
import { ensureDue } from '../db/repo';
import { analyzeGame, type GameAnalysis } from '../games/analyze';
import { gameMoves, type GameMove } from '../games/gamePgn';
import { openingInsight } from '../games/insight';
import { useLibrary } from '../library/catalog';
import type { GameOutcome, GameRow } from '../types';
import { arrow, Board } from '../ui/Board';
import { EnginePanel } from '../ui/EnginePanel';
import { BackLink, Banner, Button, Icon, ICONS, MoveLine, NavButton, Screen, Toggle } from '../ui/kit';
import { useEco } from '../ui/opening';
import { navigate } from '../ui/router';
import { showToast } from '../ui/toast';
import { gamePath, gapRepertoirePath, resultLabel, reviewFromGamePath, sentence, timeClassLabel } from './games/format';
import { JudgementLine, OpeningSummary, PlyDetail } from './games/OpeningPanel';
import { useJudgements, type MoveJudgement } from './games/useJudgements';

type Exit = Extract<GameOutcome, { kind: 'myDeviation' | 'gap' }>;

const exitOf = (o: GameOutcome): Exit | undefined => (o.kind === 'myDeviation' || o.kind === 'gap' ? o : undefined);

/** Lo que se dice cuando la partida no salió del repertorio por un desvío ni por una novedad. */
function outcomeNote(o: Exclude<GameOutcome, Exit>): string {
  if (o.kind === 'inBook') return 'La partida no salió de tu repertorio.';
  // Sin ninguna jugada tuya desde la posición inicial, la "preparación" termina antes de empezar.
  if (o.kind === 'endOfBook' && o.ply > 0) return 'Seguiste tu repertorio hasta el final de tu preparación.';
  return 'Esta partida no pasó por tu repertorio.';
}

/**
 * Dónde abre el visor: antes de la salida del repertorio o al final de tu preparación; si la partida no tuvo nada de
 * eso, en la jugada con la que salió de la biblioteca (`libExit`); si tampoco, en la posición inicial.
 */
function openingPly(o: GameOutcome, libExit: number | undefined): number | undefined {
  if (o.kind === 'myDeviation' || o.kind === 'gap' || (o.kind === 'endOfBook' && o.ply > 0)) return o.ply;
  return libExit === undefined ? undefined : libExit + 1;
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
  return <Player game={game} graph={graph} moves={moves} analysis={analysis} />;
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
          <Icon d={ICONS.external} className="size-4" />
        </a>
      </div>
      <p className="text-sm text-muted">
        Con {game.myColor === 'white' ? 'blancas' : 'negras'} · {timeClassLabel(game.timeClass)} · {resultLabel(game.result)}{' '}
        · {date}
      </p>
    </header>
  );
}

/** Flechas en la posición de salida: la jugada de la partida y, si te desviaste, la de tu repertorio. */
function exitShapes(exit: Exit, move: GameMove, graph: RepertoireGraph): DrawShape[] {
  const [from, to] = displaySquares(move.fromEpd, move.uci);
  if (exit.kind === 'gap') return [arrow(from, to, 'yellow')];
  const expected = graph.edges.get(exit.cardId)?.uci;
  if (!expected) return [arrow(from, to, 'red')];
  const [eFrom, eTo] = displaySquares(move.fromEpd, expected);
  return [arrow(from, to, 'red'), arrow(eFrom, eTo, 'green')];
}

function Player({
  game,
  graph,
  moves,
  analysis,
}: {
  game: GameRow;
  graph: RepertoireGraph;
  moves: GameMove[];
  analysis: GameAnalysis;
}) {
  const o = analysis.outcome;
  const exit = exitOf(o);
  const fichas = useLibrary().fichas;
  const eco = useEco();
  const token = useSettings()?.lichessToken;
  // Mientras carga la biblioteca se cruza igual con el repertorio y los nombres ECO.
  const insight = useMemo(
    () => openingInsight(moves, game.myColor, graph, fichas ?? [], eco),
    [moves, game.myColor, graph, fichas, eco],
  );
  const startPly = openingPly(o, insight.exit?.ply);
  const [ply, setPly] = useState(() => Math.min(startPly ?? 0, moves.length));
  const [analyze, setAnalyze] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const reviewBusy = useRef(false);
  const strip = useRef<HTMLDivElement>(null);
  /** Si ya te moviste por la partida: entonces la biblioteca que termina de cargar no te cambia de jugada. */
  const moved = useRef(false);

  const go = (n: number) => {
    moved.current = true;
    setPly(Math.max(0, Math.min(moves.length, n)));
  };

  // Si la biblioteca cargó después de abrir, recién ahora se sabe dónde salió la partida de la teoría.
  useEffect(() => {
    if (startPly !== undefined && !moved.current) setPly(Math.min(startPly, moves.length));
  }, [startPly, moves.length]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
      moved.current = true;
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
  const libExit = insight.exit?.mine ? insight.exit : undefined;
  // Tus salidas (de la teoría y del repertorio) las califica el motor, salvo mientras "Analizar" lo usa.
  const judging = useMemo(
    () => [...new Set([libExit?.ply, o.kind === 'myDeviation' ? o.ply : undefined])].filter((n) => n !== undefined).sort((a, b) => a - b),
    [libExit?.ply, o],
  );
  const judgements = useJudgements(moves, judging, game.myColor, analyze);
  // Después de tu salida de la teoría, en verde lo que juega la ficha (tu jugada queda resaltada como la última).
  const shapes =
    exit && exitMove && ply === exit.ply
      ? exitShapes(exit, exitMove, graph)
      : libExit && ply === libExit.ply + 1
        ? libExit.known.map((m) => arrow(...displaySquares(m.fromEpd, m.uci), 'green'))
        : undefined;
  const agregar = (plies: number) => navigate(`${gamePath(game.id)}/agregar?hasta=${plies}`);

  /** Deja vencida la tarjeta y la repasa sola. Un segundo toque mientras tanto no hace nada. */
  const review = async (cardId: string) => {
    if (reviewBusy.current) return;
    reviewBusy.current = true;
    setReviewing(true);
    try {
      await ensureDue(cardId);
    } catch (e) {
      showToast(`No se pudo preparar el repaso: ${sentence(e instanceof Error ? e.message : 'error desconocido')}`);
      reviewBusy.current = false;
      setReviewing(false);
      return;
    }
    navigate(reviewFromGamePath(cardId, game.id));
  };

  return (
    <div className="game-viewer mx-auto h-full w-full">
      {/* El aviso va arriba del tablero: así se ve con su acción principal aunque "Analizar" ocupe lugar abajo. */}
      <div className="gv-info safe-top shrink-0 px-4 pb-2">
        <GameHeader game={game} aside={<Toggle label="Analizar" checked={analyze} onChange={setAnalyze} />} />
        <OpeningSummary insight={insight} moves={moves} judgements={judgements} onGo={go} />
        {o.kind === 'myDeviation' || o.kind === 'gap' ? (
          <ExitNotice
            exit={o}
            gap={analysis.gap}
            side={game.myColor}
            at={ply}
            canAddReply={o.kind === 'gap' && moves.length >= o.ply + 2}
            reviewing={reviewing}
            judgement={o.kind === 'myDeviation' ? judgements.get(o.ply) : null}
            onGo={() => go(o.ply)}
            onReview={(id) => void review(id)}
            onAddReply={() => agregar(o.ply + 2)}
          />
        ) : o.kind === 'noBook' && insight.theory > 0 ? null : (
          // Si la partida no tocó tu repertorio pero sí la biblioteca, el resumen ya dice lo importante.
          <p className="text-sm text-muted">{outcomeNote(o)}</p>
        )}
      </div>

      {/*
        El tablero ocupa lo que queda: mide como mucho el ancho, y si falta alto (aviso con dos filas de botones,
        "Analizar" prendido, pantalla baja) se achica antes que tapar el aviso o la navegación.
      */}
      <div className="gv-board min-h-0 shrink px-4">
        <div className="h-full" style={{ containerType: 'size' }}>
          <div className="mx-auto" style={{ width: 'min(100cqw, 100cqh)' }}>
            <Board
              epd={epd}
              orientation={game.myColor}
              lastMove={current ? displaySquares(current.fromEpd, current.uci) : undefined}
              shapes={shapes}
              animationMs={150}
            />
          </div>
        </div>
      </div>

      {/* Una sola línea que se desliza: la lista entera no entra junto al aviso a 390 px. */}
      <div ref={strip} className="gv-strip relative shrink-0 overflow-x-auto whitespace-nowrap px-4 pt-1 text-[17px] [scrollbar-width:none]">
        <MoveLine
          moves={moves.map((m, i) => ({ san: m.san, id: `${i}-${m.uci}` }))}
          active={ply - 1}
          onPick={(i) => go(i + 1)}
          mark={exit && { index: exit.ply, className: `font-semibold ${exit.kind === 'gap' ? 'text-brass' : 'text-bad'}` }}
        />
      </div>

      {/* Lo que sabe CavallChess de la jugada que se ve: ocupa el alto que sobra y se desliza si no entra. */}
      <div className="gv-panel min-h-24 flex-1 overflow-y-auto px-4 pb-2">
        <PlyDetail
          insight={insight}
          moves={moves}
          ply={ply}
          epd={epd}
          known={new Set(graph.children(nodeId(game.myColor, epd)).map((e) => e.uci))}
          token={token}
          judging={judging}
          judgements={judgements}
        />
      </div>

      <div className="gv-bottom safe-bottom shrink-0 border-t border-line bg-paper px-4 pt-2">
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
            <NavButton label="Siguiente" disabled={ply >= moves.length} onClick={() => go(ply + 1)} icon={ICONS.forward} />
          </div>
        </div>
      </div>
    </div>
  );
}

/** Aviso compacto de la salida del repertorio: qué pasó y, primero, la acción principal. */
function ExitNotice({
  exit,
  gap,
  side,
  at,
  canAddReply,
  reviewing,
  judgement,
  onGo,
  onReview,
  onAddReply,
}: {
  exit: Exit;
  gap: GameAnalysis['gap'];
  side: Side;
  at: number;
  canAddReply: boolean;
  reviewing: boolean;
  /** Tu desvío según el motor (undefined: calculando; null: no corresponde). */
  judgement: MoveJudgement | null | undefined;
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
      <Banner tone="bad" compact>
        <p>
          Acá jugaste {figurine(exit.playedSan)}; en tu repertorio va {figurine(exit.expectedSan)}.
        </p>
        <JudgementLine judgement={judgement} className="text-sm" />
        <div className="mt-2 flex flex-wrap gap-2">
          <Button
            variant="primary"
            className="flex-auto !px-3"
            disabled={reviewing}
            aria-busy={reviewing}
            onClick={() => onReview(exit.cardId)}
          >
            Repasar ahora
          </Button>
          {goButton}
        </div>
      </Banner>
    );
  }
  const prepare = gap && (
    <Button
      variant={canAddReply ? 'secondary' : 'primary'}
      className="flex-auto !px-3"
      onClick={() => navigate(gapRepertoirePath(side, gap.epd, gap.san))}
    >
      Preparar respuesta
    </Button>
  );
  return (
    <Banner compact>
      <p>El rival jugó {figurine(exit.playedSan)} y tu repertorio no lo cubría.</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {canAddReply && (
          <Button variant="primary" className="w-full !px-3" onClick={onAddReply}>
            Agregar la novedad y tu respuesta
          </Button>
        )}
        {prepare}
        {goButton}
      </div>
    </Banner>
  );
}
