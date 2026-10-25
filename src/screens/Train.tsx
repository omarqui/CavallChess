import { useEffect, useMemo, useRef, useState } from 'react';
import type { DrawShape } from '@lichess-org/chessground/draw';
import { displaySquares, epdFromNodeId, figurine, INITIAL_EPD, playUci, type Side } from '../chess/position';
import { forceDue, rate } from '../db/repo';
import { useCards, useEvents, useGraphs, useSettings, type Graphs } from '../db/hooks';
import { buildDailyQueue } from '../srs/queue';
import { State } from '../srs/scheduler';
import { weakSpots } from '../srs/stats';
import { TrainingSession, type Feedback, type Step } from '../trainer/session';
import type { CardRow, MoveEdge, ReviewEvent } from '../types';
import { arrow, Board, toShapes, type Flash } from '../ui/Board';
import { playCorrect, playMoveSound, playWrong } from '../ui/feedback';
import { Banner, Button, MoveLine } from '../ui/kit';
import { Tip } from '../ui/Tip';
import { openingName, useEco } from '../ui/opening';
import { navigate } from '../ui/router';

interface Props {
  mode: 'review' | 'practice';
  side?: Side;
  root?: string;
}

const REPLAY_MS = 150;
const RIVAL_DELAY_MS = 320;

function buildSession(
  props: Props,
  graphs: Graphs,
  cards: Map<string, CardRow>,
  events: ReviewEvent[],
  newPerDay: number,
): TrainingSession {
  const cb = {
    rate: (id: string, r: Parameters<typeof rate>[1]) => void rate(id, r, 'session'),
    forceDue: (id: string) => void forceDue(id, 'practice'),
  };
  if (props.mode === 'review') {
    const q = buildDailyQueue([graphs.white, graphs.black], cards, events, new Date(), newPerDay);
    return new TrainingSession(graphs, [...q.due, ...q.fresh], q.fresh, 'review', cb);
  }
  const sides: Side[] = props.side ? [props.side] : ['white', 'black'];
  let ids: string[] = [];
  for (const s of sides) {
    const g = graphs[s];
    ids.push(...(props.root && props.root.startsWith(`${s}|`) ? g.subtreeCardIds(props.root) : g.trainableCardIds()));
  }
  // Débiles primero; el resto en orden de línea.
  const weak = weakSpots([graphs.white, graphs.black], events, new Date(), 30, 1000).map((w) => w.edge.id);
  const rank = new Map(weak.map((id, i) => [id, i]));
  ids = [...ids.filter((id) => rank.has(id)).sort((a, b) => rank.get(a)! - rank.get(b)!), ...ids.filter((id) => !rank.has(id))];
  const fresh = ids.filter((id) => cards.get(id)?.card.state === State.New);
  return new TrainingSession(graphs, ids, fresh, 'practice', cb);
}

export function TrainScreen(props: Props) {
  const graphs = useGraphs();
  const cards = useCards();
  const events = useEvents();
  const settings = useSettings();
  const ready = graphs && cards && events && settings;
  const session = useRef<TrainingSession | null>(null);
  const [step, setStep] = useState<Step | null>(null);

  useEffect(() => {
    if (!ready || session.current) return;
    session.current = buildSession(props, graphs, cards, events, settings.newPerDay);
    setStep(session.current.start());
    // La sesión se arma una sola vez con la foto de la cola al entrar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  if (!ready || !step || !session.current) return <div className="grid h-full place-items-center text-muted">Preparando…</div>;
  return <TrainView session={session.current} initial={step} graphs={graphs} mode={props.mode} />;
}

function TrainView({
  session,
  initial,
  graphs,
  mode,
}: {
  session: TrainingSession;
  initial: Step;
  graphs: Graphs;
  mode: Props['mode'];
}) {
  const eco = useEco();
  const [step, setStep] = useState(initial);
  const [boardEpd, setBoardEpd] = useState(INITIAL_EPD);
  const [lastMove, setLastMove] = useState<[string, string] | undefined>();
  const [animating, setAnimating] = useState(true);
  const [locked, setLocked] = useState(false);
  const [syncKey, setSyncKey] = useState(0);
  const [flash, setFlash] = useState<Flash>();
  const [shake, setShake] = useState(0);
  const [note, setNote] = useState<Feedback | undefined>();
  const timers = useRef<number[]>([]);
  const skipRef = useRef<(() => void) | null>(null);

  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };
  const later = (ms: number, fn: () => void) => timers.current.push(window.setTimeout(fn, ms));

  const placeMove = (e: MoveEdge, sound: boolean) => {
    setBoardEpd(epdFromNodeId(e.toId));
    setLastMove(displaySquares(epdFromNodeId(e.fromId), e.uci));
    if (sound) playMoveSound(e.san.includes('x'));
  };

  /** Lleva el tablero hasta `s`: reproduce la línea (salto) o anima las jugadas nuevas (encadenado). */
  const present = (s: Step, delayBefore = 0) => {
    clearTimers();
    setStep(s);
    setAnimating(true);
    const finish = () => {
      skipRef.current = null;
      const last = s.line.at(-1);
      setBoardEpd(s.epd);
      setLastMove(last ? displaySquares(epdFromNodeId(last.fromId), last.uci) : undefined);
      setSyncKey((k) => k + 1);
      setAnimating(false);
    };
    if (s.phase === 'done') {
      later(delayBefore, finish);
      return;
    }
    if (s.replay) {
      later(delayBefore, () => {
        setBoardEpd(INITIAL_EPD);
        setLastMove(undefined);
        setSyncKey((k) => k + 1);
        skipRef.current = () => {
          clearTimers();
          finish();
        };
        s.line.forEach((e, i) => later(REPLAY_MS * (i + 1), () => placeMove(e, false)));
        later(REPLAY_MS * (s.line.length + 1), finish);
      });
    } else {
      const fresh = s.line.slice(s.animateFrom);
      fresh.forEach((e, i) => later(delayBefore + RIVAL_DELAY_MS + i * 260, () => placeMove(e, true)));
      later(delayBefore + RIVAL_DELAY_MS + fresh.length * 260, finish);
    }
  };

  useEffect(() => {
    present(initial);
    return clearTimers;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onMove = (uci: string) => {
    const before = step;
    const next = session.play(uci);
    const dest = uci.slice(2, 4);
    const played = before.target ? playUci(epdFromNodeId(before.target.fromId), uci) : null;
    if (played) {
      setBoardEpd(played.epd);
      setLastMove([uci.slice(0, 2), dest]);
    }
    // Vuelve el tablero a la posición de la pregunta; mientras tanto no acepta jugadas.
    const snapBack = (ms: number) => {
      setLocked(true);
      later(ms, () => {
        setBoardEpd(before.epd);
        const last = before.line.at(-1);
        setLastMove(last ? displaySquares(epdFromNodeId(last.fromId), last.uci) : undefined);
        setSyncKey((k) => k + 1);
        later(220, () => setLocked(false));
      });
    };

    if (next.feedback && next !== before && (before.phase === 'ask' || before.phase === 'fail')) {
      // Respuesta registrada: avanzar.
      const good = next.feedback.kind !== 'wrong';
      setFlash({ square: dest, kind: 'good', key: Date.now() });
      if (good) playCorrect();
      else playMoveSound(false);
      setNote(next.feedback);
      present(next, next.replay ? 900 : 0);
      return;
    }
    if (before.phase === 'ask' && next.phase === 'fail') {
      setFlash({ square: dest, kind: 'bad', key: Date.now() });
      setShake((n) => n + 1);
      playWrong();
      setStep(next);
      snapBack(450);
      return;
    }
    if (before.phase === 'show' && next.phase === 'ask') {
      playMoveSound(false);
      setStep(next);
      snapBack(650);
      return;
    }
    // Jugada que no cuenta (en "mostrar" o repitiendo el fallo): volver atrás.
    if (before.phase === 'fail') setShake((n) => n + 1);
    setStep(next);
    snapBack(250);
  };

  const g = graphs[step.side];
  const target = step.target;
  const name = target ? openingName(g, target.fromId, eco) : null;
  const shapes = useMemo<DrawShape[]>(() => {
    if (!target || animating) return [];
    const [from, to] = displaySquares(epdFromNodeId(target.fromId), target.uci);
    if (step.phase === 'show') return [arrow(from, to, 'green'), ...toShapes(target.shapes)];
    if (step.phase === 'fail') return [arrow(from, to, 'green')];
    return [];
  }, [target?.id, step.phase, animating]);
  const pct = step.progress.total ? Math.round((step.progress.done / step.progress.total) * 100) : 100;
  const interactive = !animating && !locked && step.phase !== 'done';

  return (
    <div className="mx-auto flex h-full w-full max-w-xl flex-col safe-top">
      <header className="flex items-center gap-3 px-4 pb-3 pt-2">
        <button
          aria-label="Terminar sesión"
          onClick={() => navigate('/')}
          className="grid size-10 place-items-center rounded-full text-muted hover:bg-surface"
        >
          <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-line" aria-hidden>
          <div className="h-full rounded-full bg-brass transition-[width] duration-500" style={{ width: `${pct}%` }} />
        </div>
        <span className="min-w-12 text-right text-sm tabular-nums text-muted">
          {step.progress.done}/{step.progress.total}
        </span>
      </header>

      <div className="px-4">
        <Tip id="entrenar">
          Tocá el tablero para saltar la línea. «Pista» te da la idea sin decir la jugada, y «Fue un error de dedo» anula un fallo.
        </Tip>
      </div>
      <div className="px-2 sm:px-4">
        <Board
          epd={boardEpd}
          orientation={step.side}
          interactive={interactive}
          onMove={onMove}
          lastMove={lastMove}
          shapes={shapes}
          flash={flash}
          shake={shake}
          syncKey={syncKey}
          animationMs={animating && step.replay ? 120 : 200}
          onTap={() => skipRef.current?.()}
        />
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-6 pt-4 safe-bottom">
        {step.phase === 'done' ? (
          <>
            {/* La última tarjeta suele ser la trampa: el aviso no se puede perder al cerrar la sesión. */}
            {note?.trap && <Note feedback={note} />}
            <Summary step={step} mode={mode} />
          </>
        ) : (
          <>
            <div className="min-h-6 text-sm text-muted">
              {name ?? (step.side === 'white' ? 'Con blancas' : 'Con negras')}
            </div>
            <Prompt
              step={step}
              animating={animating}
              onHint={() => setStep(session.useHint())}
              onUndo={() => setStep(session.undoMisclick())}
            />
            {note && step.phase !== 'fail' && <Note feedback={note} />}
            <div className="mt-4 text-[15px]">
              <MoveLine moves={step.line} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Prompt({
  step,
  animating,
  onHint,
  onUndo,
}: {
  step: Step;
  animating: boolean;
  onHint: () => void;
  onUndo: () => void;
}) {
  const t = step.target!;
  if (animating) return <p className="mt-1 font-book text-xl text-muted">Reproduciendo la línea… (tocá el tablero para saltar)</p>;
  if (step.phase === 'show') {
    return (
      <div className="mt-1">
        <p className="font-book text-xl font-semibold">Posición nueva: jugá {figurine(t.san)}</p>
        {t.explanation && <p className="mt-2 font-book text-[17px] leading-relaxed">{t.explanation}</p>}
        {t.hint && <p className="mt-2 text-[15px] text-muted">Idea: {t.hint}</p>}
      </div>
    );
  }
  if (step.phase === 'fail') {
    return (
      <div className="mt-1">
        <p className="font-book text-xl font-semibold text-bad">No es esa. Tu jugada es {figurine(t.san)}.</p>
        <p className="mt-1 text-[15px] text-muted">Jugala para seguir.</p>
        {t.explanation && <p className="mt-3 font-book text-[17px] leading-relaxed">{t.explanation}</p>}
        <Button variant="ghost" className="mt-3 -ml-3 text-muted" onClick={onUndo}>
          Fue un error de dedo
        </Button>
      </div>
    );
  }
  return (
    <div className="mt-1">
      <p className="font-book text-xl font-semibold">¿Qué jugás acá?</p>
      {t.hint &&
        (step.hintUsed ? (
          <p className="mt-2 rounded-xl bg-brass-soft px-3 py-2 font-book text-[17px]">{t.hint}</p>
        ) : (
          <Button variant="ghost" className="mt-2 -ml-3 text-brass" onClick={onHint}>
            ¿Por qué? Ver la idea
          </Button>
        ))}
    </div>
  );
}

function Note({ feedback }: { feedback: Feedback }) {
  const { edge, trap } = feedback;
  const hasText = !!(edge.explanation || edge.hint);
  if (!hasText && !trap) return null;
  return (
    <div className="mt-4">
      {trap && (
        <Banner tone="good">
          {trap.kind === 'favor' ? `Trampa: ${trap.name}. El rival cayó.` : `Evitaste la trampa: ${trap.name}.`}
        </Banner>
      )}
      {hasText && (
        <div className={`${trap ? 'mt-3 ' : ''}border-l-2 border-good pl-3`}>
          <p className="text-sm text-muted">{figurine(edge.san)}</p>
          <p className="font-book text-[17px] leading-relaxed">{edge.explanation ?? edge.hint}</p>
        </div>
      )}
    </div>
  );
}

function Summary({ step, mode }: { step: Step; mode: Props['mode'] }) {
  const total = step.tally.correct + step.tally.wrong;
  return (
    <div className="mt-2">
      <p className="font-book text-2xl font-semibold">
        {total === 0 ? 'No hay nada para repasar ahora.' : mode === 'review' ? 'Sesión terminada.' : 'Práctica terminada.'}
      </p>
      {total > 0 && (
        <p className="mt-2 text-muted">
          {step.tally.correct} {step.tally.correct === 1 ? 'acierto' : 'aciertos'} y {step.tally.wrong}{' '}
          {step.tally.wrong === 1 ? 'fallo' : 'fallos'}.
          {mode === 'review' && step.tally.wrong > 0 && ' Las que fallaste vuelven pronto.'}
        </p>
      )}
      <Button variant="primary" className="mt-6 w-full" onClick={() => navigate('/')}>
        Volver al inicio
      </Button>
    </div>
  );
}
