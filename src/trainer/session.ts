import type { RepertoireGraph } from '../chess/graph';
import { INITIAL_EPD, epdFromNodeId, playUci, type Side } from '../chess/position';
import type { MoveEdge, TrapMark } from '../types';
import { Rating, type Grade } from '../srs/scheduler';

export type SessionMode = 'review' | 'practice';
export type Phase = 'show' | 'ask' | 'fail' | 'done';

export interface SessionCallbacks {
  /** Modo repaso: registrar una calificación. */
  rate(cardId: string, rating: Grade): void;
  /** Modo práctica: un fallo hace vencer la tarjeta, sin nota. */
  forceDue(cardId: string): void;
}

export interface Feedback {
  kind: 'correct' | 'hard' | 'wrong';
  edge: MoveEdge;
  /** La tarjeta venía de una trampa: la propia (en contra) o la que el rival acaba de jugar (a favor). */
  trap?: TrapMark;
}

export interface Step {
  phase: Phase;
  side: Side;
  /** Jugadas desde la posición inicial hasta la posición actual del tablero. */
  line: MoveEdge[];
  /** Las jugadas `line[animateFrom..]` son nuevas y se animan; las anteriores ya están en el tablero. */
  animateFrom: number;
  /** Se saltó a otra tarjeta: el tablero se reinicia y la línea se reproduce desde el inicio. */
  replay: boolean;
  epd: string;
  target?: MoveEdge;
  hintUsed: boolean;
  wrongUci?: string;
  /** Resultado de la respuesta anterior (para mostrar la explicación). */
  feedback?: Feedback;
  progress: { done: number; total: number };
  tally: { correct: number; wrong: number };
}

const MAX_RETRIES = 2;
const MAX_CHAIN_PLIES = 60;

/**
 * Máquina de estados de una sesión de entrenamiento. Pura: no toca la base de datos ni el tablero;
 * la UI le pasa jugadas y anima lo que devuelve.
 */
export class TrainingSession {
  private pending: string[];
  private pendingSet: Set<string>;
  private fresh: Set<string>;
  private shown = new Set<string>();
  private retries = new Map<string, number>();
  private line: MoveEdge[] = [];
  private side: Side = 'white';
  private target?: MoveEdge;
  private phase: Phase = 'ask';
  private hintUsed = false;
  private wrongUci?: string;
  private readonly total: number;
  private done = 0;
  private tally = { correct: 0, wrong: 0 };

  constructor(
    private readonly graphs: Partial<Record<Side, RepertoireGraph>>,
    queue: string[],
    fresh: Iterable<string>,
    private readonly mode: SessionMode,
    private readonly cb: SessionCallbacks,
  ) {
    this.pending = [...new Set(queue)].filter((id) => this.edgeOf(id));
    this.pendingSet = new Set(this.pending);
    this.fresh = new Set(fresh);
    this.total = this.pending.length;
  }

  private graph(side: Side) {
    return this.graphs[side]!;
  }

  private edgeOf(cardId: string): MoveEdge | undefined {
    // Un grafo por color; cada id lleva su repertorio, así que alcanza con buscarlo en los dos.
    return this.graphs.white?.edges.get(cardId) ?? this.graphs.black?.edges.get(cardId);
  }

  start(): Step {
    return this.jump(undefined);
  }

  /** Jugada del usuario en UCI (tal como sale del tablero; se normaliza acá). */
  play(uci: string): Step {
    const t = this.target;
    if (!t || this.phase === 'done') return this.step(false, this.line.length);
    const played = playUci(epdFromNodeId(t.fromId), uci);
    const ok = played?.uci === t.uci;

    if (this.phase === 'show') {
      // Aprender: la jugó siguiendo la flecha; ahora se la pide sin ayuda.
      if (ok) {
        this.shown.add(t.id);
        this.phase = 'ask';
      }
      return this.step(false, this.line.length);
    }

    if (this.phase === 'ask') {
      if (!ok) {
        this.phase = 'fail';
        this.wrongUci = played?.uci ?? uci;
        return this.step(false, this.line.length);
      }
      const rating = this.hintUsed ? Rating.Hard : Rating.Good;
      if (this.mode === 'review') this.cb.rate(t.id, rating);
      this.tally.correct++;
      this.finish(t.id, false);
      return this.advance(t, { kind: this.hintUsed ? 'hard' : 'correct', edge: t, trap: this.trapOf(t) });
    }

    // fail: tiene que jugar la correcta para seguir
    if (!ok) return this.step(false, this.line.length);
    if (this.mode === 'review') this.cb.rate(t.id, Rating.Again);
    else this.cb.forceDue(t.id);
    this.tally.wrong++;
    this.finish(t.id, true);
    return this.advance(t, { kind: 'wrong', edge: t, trap: this.trapOf(t) });
  }

  /** Marca de trampa de la tarjeta `t`; se llama antes de `advance`, cuando la línea termina en la jugada del rival. */
  private trapOf(t: MoveEdge): TrapMark | undefined {
    if (t.trap?.kind === 'contra') return t.trap;
    const prev = this.line[this.line.length - 1];
    return prev?.trap?.kind === 'favor' ? prev.trap : undefined;
  }

  useHint(): Step {
    if (this.phase === 'ask' && this.target?.hint) this.hintUsed = true;
    return this.step(false, this.line.length);
  }

  /** "Fue un error de dedo": anula el fallo mientras no se jugó la correcta. */
  undoMisclick(): Step {
    if (this.phase === 'fail') {
      this.phase = 'ask';
      this.wrongUci = undefined;
    }
    return this.step(false, this.line.length);
  }

  current(): Step {
    return this.step(false, this.line.length);
  }

  private finish(cardId: string, failed: boolean) {
    const tries = this.retries.get(cardId) ?? 0;
    this.pending = this.pending.filter((id) => id !== cardId);
    if (failed && tries < MAX_RETRIES) {
      // vuelve al final de la sesión
      this.retries.set(cardId, tries + 1);
      this.pending.push(cardId);
      this.shown.add(cardId);
    } else {
      this.pendingSet.delete(cardId);
      this.done++;
    }
  }

  private pendingIn(g: RepertoireGraph, nodeId: string): number {
    const sub = g.subtree(nodeId);
    let n = 0;
    for (const id of this.pendingSet) {
      const e = g.edges.get(id);
      if (e && sub.has(e.fromId)) n++;
    }
    return n;
  }

  /** Después de una respuesta: seguir la línea mientras haya pendientes adelante; si no, saltar. */
  private advance(answered: MoveEdge, feedback: Feedback): Step {
    const g = this.graph(this.side);
    this.line = [...this.line, answered];
    const base = this.line.length;
    let cursor = answered.toId;
    for (let i = 0; i < MAX_CHAIN_PLIES; i++) {
      if (!g.trainable.has(cursor) || g.node(cursor)?.cutHere) break;
      // Rival: la respuesta cuyo subárbol tiene más tarjetas pendientes.
      let best: MoveEdge | undefined;
      let bestCount = 0;
      for (const e of g.children(cursor)) {
        const c = this.pendingIn(g, e.toId);
        if (c > bestCount) {
          best = e;
          bestCount = c;
        }
      }
      if (!best) break;
      this.line.push(best);
      cursor = best.toId;
      const mine = g.mineEdge(cursor);
      if (!mine || !g.isTrainableFrom(cursor)) break;
      if (this.pendingSet.has(mine.id)) {
        this.setTarget(mine);
        return this.step(false, base, feedback);
      }
      // Ya sabida en esta sesión: la juega la app y sigue hacia lo pendiente.
      this.line.push(mine);
      cursor = mine.toId;
    }
    return this.jump(feedback);
  }

  private jump(feedback: Feedback | undefined): Step {
    const next = this.pending.map((id) => this.edgeOf(id)).find((e): e is MoveEdge => !!e);
    if (!next) {
      this.phase = 'done';
      this.target = undefined;
      return this.step(false, this.line.length, feedback);
    }
    this.side = next.side;
    const path = this.graph(next.side).pathFromRoot(next.fromId) ?? [];
    this.line = path;
    this.setTarget(next);
    return this.step(true, 0, feedback);
  }

  private setTarget(edge: MoveEdge) {
    this.target = edge;
    this.hintUsed = false;
    this.wrongUci = undefined;
    this.phase = this.fresh.has(edge.id) && !this.shown.has(edge.id) ? 'show' : 'ask';
  }

  private step(replay: boolean, animateFrom: number, feedback?: Feedback): Step {
    const last = this.line[this.line.length - 1];
    return {
      phase: this.phase,
      side: this.side,
      line: this.line,
      animateFrom,
      replay,
      epd: last ? epdFromNodeId(last.toId) : INITIAL_EPD,
      target: this.target,
      hintUsed: this.hintUsed,
      wrongUci: this.wrongUci,
      feedback,
      progress: { done: this.done, total: this.total },
      tally: { ...this.tally },
    };
  }
}
