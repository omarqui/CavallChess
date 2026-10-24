import { describe, expect, it } from 'vitest';
import { TrainingSession, type SessionCallbacks } from './session';
import { Rating } from '../srs/scheduler';
import { edgeAt, graphOf, repoFrom } from '../test/helpers';
import { displaySquares, epdFromNodeId } from '../chess/position';
import type { MoveEdge } from '../types';

const REP = `1. e4 e5 (1... c5 2. Nf3 d6 3. d4) 2. Nf3 Nc6 (2... d6 3. d4) 3. Bb5 a6 4. Ba4 *`;

function recorder() {
  const log: [string, string, number?][] = [];
  const cb: SessionCallbacks = {
    rate: (id, r) => log.push(['rate', id, r]),
    forceDue: (id) => log.push(['forceDue', id]),
  };
  return { log, cb };
}

/** UCI como lo mandaría el tablero (el enroque como rey a g1/c1). */
const boardUci = (e: MoveEdge) => displaySquares(epdFromNodeId(e.fromId), e.uci).join('');

describe('sesión de entrenamiento', () => {
  it('encadena: la app responde con la jugada del rival que lleva a lo pendiente', () => {
    const { graph } = repoFrom(REP, 'white');
    const nf3 = edgeAt(graph, ['e4', 'e5', 'Nf3']);
    const bb5 = edgeAt(graph, ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5']);
    const d4 = edgeAt(graph, ['e4', 'e5', 'Nf3', 'd6', 'd4']);
    const { log, cb } = recorder();
    const s = new TrainingSession({ white: graph }, [nf3.id, bb5.id, d4.id], [], 'review', cb);

    let step = s.start();
    expect(step.replay).toBe(true);
    expect(step.line.map((e) => e.san)).toEqual(['e4', 'e5']);
    expect(step.target?.san).toBe('Nf3');

    step = s.play(boardUci(nf3));
    expect(log).toEqual([['rate', nf3.id, Rating.Good]]);
    expect(step.feedback?.kind).toBe('correct');
    // Nc6 y d6 tienen una pendiente cada una: empate → la primera creada (Nc6)
    expect(step.replay).toBe(false);
    expect(step.line.slice(step.animateFrom).map((e) => e.san)).toEqual(['Nc6']);
    expect(step.target?.san).toBe('Bb5');

    step = s.play(boardUci(bb5));
    // Ba4 no está en la cola; tampoco hay pendientes debajo de a6 → salta a d4
    expect(step.replay).toBe(true);
    expect(step.line.map((e) => e.san)).toEqual(['e4', 'e5', 'Nf3', 'd6']);
    expect(step.target?.san).toBe('d4');

    step = s.play(boardUci(d4));
    expect(step.phase).toBe('done');
    expect(step.progress).toEqual({ done: 3, total: 3 });
  });

  it('juega sola las jugadas propias ya sabidas para llegar a una pendiente más profunda', () => {
    const { graph } = repoFrom(REP, 'white');
    const e4 = edgeAt(graph, ['e4']);
    const ba4 = edgeAt(graph, ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6', 'Ba4']);
    const s = new TrainingSession({ white: graph }, [e4.id, ba4.id], [], 'review', recorder().cb);
    s.start();
    const step = s.play(boardUci(e4));
    expect(step.line.slice(step.animateFrom).map((e) => e.san)).toEqual(['e5', 'Nf3', 'Nc6', 'Bb5', 'a6']);
    expect(step.target?.san).toBe('Ba4');
  });

  it('fallo: hay que jugar la correcta, se califica Again y la tarjeta vuelve al final', () => {
    const { graph } = repoFrom(REP, 'white');
    const e4 = edgeAt(graph, ['e4']);
    const { log, cb } = recorder();
    const s = new TrainingSession({ white: graph }, [e4.id], [], 'review', cb);
    s.start();
    let step = s.play('d2d4');
    expect(step.phase).toBe('fail');
    expect(step.wrongUci).toBe('d2d4');
    step = s.play('c2c4'); // otra incorrecta: sigue en fallo
    expect(step.phase).toBe('fail');
    step = s.play('e2e4');
    expect(log).toEqual([['rate', e4.id, Rating.Again]]);
    expect(step.feedback?.kind).toBe('wrong');
    expect(step.target?.id).toBe(e4.id); // vuelve
    expect(step.replay).toBe(true);
    step = s.play('e2e4');
    expect(log[1]).toEqual(['rate', e4.id, Rating.Good]);
    expect(step.phase).toBe('done');
  });

  it('"error de dedo" anula el fallo antes de jugar la correcta', () => {
    const { graph } = repoFrom(REP, 'white');
    const e4 = edgeAt(graph, ['e4']);
    const { log, cb } = recorder();
    const s = new TrainingSession({ white: graph }, [e4.id], [], 'review', cb);
    s.start();
    s.play('d2d4');
    expect(s.undoMisclick().phase).toBe('ask');
    s.play('e2e4');
    expect(log).toEqual([['rate', e4.id, Rating.Good]]);
  });

  it('usar la pista califica Hard (solo si la jugada tiene pista)', () => {
    const { repo, graph } = repoFrom(REP, 'white');
    const e4 = edgeAt(graph, ['e4']);
    repo.edges.set(e4.id, { ...e4, hint: 'Ocupá el centro' });
    const g2 = repoFrom(REP, 'white').graph; // sin pista
    const { log, cb } = recorder();
    const withHint = new TrainingSession({ white: graphOf(repo, 'white') }, [e4.id], [], 'review', cb);
    withHint.start();
    expect(withHint.useHint().hintUsed).toBe(true);
    withHint.play('e2e4');
    expect(log[0][2]).toBe(Rating.Hard);

    const noHint = new TrainingSession({ white: g2 }, [e4.id], [], 'review', recorder().cb);
    noHint.start();
    expect(noHint.useHint().hintUsed).toBe(false);
  });

  it('las nuevas se muestran primero y después se piden', () => {
    const { graph } = repoFrom(REP, 'white');
    const e4 = edgeAt(graph, ['e4']);
    const { log, cb } = recorder();
    const s = new TrainingSession({ white: graph }, [e4.id], [e4.id], 'review', cb);
    let step = s.start();
    expect(step.phase).toBe('show');
    step = s.play('d2d4'); // en "mostrar" una jugada distinta no cuenta
    expect(step.phase).toBe('show');
    step = s.play('e2e4');
    expect(step.phase).toBe('ask');
    expect(log).toEqual([]);
    s.play('e2e4');
    expect(log).toEqual([['rate', e4.id, Rating.Good]]);
  });

  it('práctica: no califica; un fallo solo hace vencer la tarjeta', () => {
    const { graph } = repoFrom(REP, 'white');
    const e4 = edgeAt(graph, ['e4']);
    const nf3 = edgeAt(graph, ['e4', 'e5', 'Nf3']);
    const { log, cb } = recorder();
    const s = new TrainingSession({ white: graph }, [e4.id, nf3.id], [], 'practice', cb);
    s.start();
    s.play('e2e4');
    s.play('d2d4');
    s.play('g1f3');
    expect(log).toEqual([['forceDue', nf3.id]]);
  });

  it('acepta el enroque arrastrando el rey a la torre o a g1', () => {
    const { graph } = repoFrom('1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. O-O *', 'white');
    const oo = edgeAt(graph, ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'O-O']);
    for (const uci of ['e1g1', 'e1h1']) {
      const s = new TrainingSession({ white: graph }, [oo.id], [], 'review', recorder().cb);
      s.start();
      expect(s.play(uci).phase).toBe('done');
    }
  });

  it('mezcla tarjetas de ambos colores y cambia de lado al saltar', () => {
    const w = repoFrom('1. e4 e5 *', 'white').graph;
    const b = repoFrom('1. e4 c5 *', 'black').graph;
    const s = new TrainingSession({ white: w, black: b }, [edgeAt(w, ['e4']).id, edgeAt(b, ['e4', 'c5']).id], [], 'review', recorder().cb);
    expect(s.start().side).toBe('white');
    const step = s.play('e2e4');
    expect(step.side).toBe('black');
    expect(step.line.map((e) => e.san)).toEqual(['e4']);
  });
});
