import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import Dexie from 'dexie';
import { CavallDB } from './db';
import {
  activeRepId,
  addMove,
  commitImport,
  createRepertoire,
  deleteRepertoire,
  duplicateRepertoire,
  loadActiveGraph,
  setActiveRepertoire,
  deleteEdge,
  ensureDue,
  ensureRoots,
  exportBackup,
  forceDue,
  getSettings,
  importBackup,
  loadGraph,
  noteId,
  purgeNodes,
  rate,
  recordGame,
  saveNote,
  setSettings,
  wipeAll,
} from './repo';
import { buildImportPlan, existingOf } from '../chess/pgnImport';
import { INITIAL_EPD, nodeId } from '../chess/position';
import { isDue, Rating, State } from '../srs/scheduler';
import { edgeAt } from '../test/helpers';

let d: CavallDB;
let n = 0;

beforeEach(async () => {
  d = new CavallDB(`test-${n++}`);
  await ensureRoots(d);
});

async function importPgn(pgn: string, side: 'white' | 'black' = 'white', resolutions = new Map<string, 'keep' | 'replace'>()) {
  const g = await loadGraph(side, d);
  const mine = new Map<string, { uci: string; san: string }>();
  for (const e of g.edges.values()) if (e.mine) mine.set(e.fromId, { uci: e.uci, san: e.san });
  const plan = buildImportPlan(pgn, side, { mine, nodeIds: new Set(g.nodes.keys()) }, resolutions);
  const counts = await commitImport(plan, resolutions, new Map(), d);
  return Object.assign(plan, { counts });
}

describe('repositorio', () => {
  it('commitImport cuenta solo las jugadas nuevas', async () => {
    expect((await importPgn('1. e4 e5 2. Nf3 *')).counts).toEqual({ mine: 2, rival: 1 });
    expect((await importPgn('1. e4 e5 2. Nf3 *')).counts).toEqual({ mine: 0, rival: 0 });
  });

  it('importa y crea una tarjeta por jugada propia', async () => {
    await importPgn('1. e4 e5 (1... c5 2. Nf3) 2. Nf3 Nc6 3. Bb5 *');
    const g = await loadGraph('white', d);
    expect(g.trainableCardIds()).toHaveLength(4);
    expect(await d.cards.count()).toBe(4);
  });

  it('calificar escribe el log y actualiza la tarjeta igual que reproducir el log', async () => {
    await importPgn('1. e4 *');
    const g = await loadGraph('white', d);
    const id = g.trainableCardIds()[0];
    await rate(id, Rating.Good, 'session', d);
    await rate(id, Rating.Again, 'session', d);
    await forceDue(id, 'game', d);
    const events = await d.events.where('cardId').equals(id).toArray();
    expect(events.map((e) => e.kind)).toEqual(['rating', 'rating', 'forceDue']);
    const row = (await d.cards.get(id))!;
    expect(row.card.reps).toBe(2);
  });

  it('ensureDue fuerza solo si no estaba vencida', async () => {
    await importPgn('1. e4 *');
    const g = await loadGraph('white', d);
    const id = g.trainableCardIds()[0];
    await rate(id, Rating.Good, 'session', d);
    expect(isDue((await d.cards.get(id))!.card, new Date())).toBe(false);
    expect(await ensureDue(id, d)).toBe(true);
    expect(isDue((await d.cards.get(id))!.card, new Date())).toBe(true);
    const antes = await d.events.count();
    expect(await ensureDue(id, d)).toBe(false);
    expect(await d.events.count()).toBe(antes);
  });

  it('ensureDue con una tarjeta nueva o inexistente devuelve false sin eventos', async () => {
    await importPgn('1. e4 *');
    const id = (await loadGraph('white', d)).trainableCardIds()[0];
    expect(await ensureDue(id, d)).toBe(false);
    expect(await ensureDue('white|nada|e2e4', d)).toBe(false);
    expect(await d.events.count()).toBe(0);
  });

  it('reemplazar una jugada propia archiva su subárbol y conserva la tarjeta; volver la revive', async () => {
    await importPgn('1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. c3 *');
    let g = await loadGraph('white', d);
    const bc4 = edgeAt(g, ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4']);
    const c3 = edgeAt(g, ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'c3']);
    await rate(c3.id, Rating.Good, 'session', d);

    await addMove('white', bc4.fromId, 'f1b5', d);
    g = await loadGraph('white', d);
    expect(g.mineEdge(bc4.fromId)?.san).toBe('Bb5');
    expect(g.isArchived(c3.fromId)).toBe(true);
    expect(g.trainableCardIds()).not.toContain(c3.id);
    expect(await d.cards.get(c3.id)).toBeDefined();

    await addMove('white', bc4.fromId, 'f1c4', d);
    g = await loadGraph('white', d);
    expect(g.trainableCardIds()).toContain(c3.id);
    expect((await d.cards.get(c3.id))!.card.reps).toBe(1);
  });

  it('borrar una jugada del rival archiva; purgar elimina definitivamente', async () => {
    await importPgn('1. e4 e5 (1... c5 2. Nf3) 2. Nf3 *');
    let g = await loadGraph('white', d);
    const c5 = edgeAt(g, ['e4', 'c5']);
    await deleteEdge(c5.id, d);
    g = await loadGraph('white', d);
    const archived = g.archivedNodeIds();
    expect(archived).toHaveLength(2);
    await purgeNodes(archived, d);
    g = await loadGraph('white', d);
    expect(g.archivedNodeIds()).toHaveLength(0);
    expect(await d.cards.count()).toBe(2);
  });

  it('el conflicto resuelto como reemplazo cambia la jugada propia', async () => {
    await importPgn('1. e4 e5 2. Nf3 Nc6 3. Bc4 *');
    const plan = await importPgn('1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 *');
    expect(plan.conflicts).toHaveLength(1);
    await importPgn('1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 *', 'white', new Map([[plan.conflicts[0].nodeId, 'replace']]));
    const g = await loadGraph('white', d);
    expect(g.mineEdge(plan.conflicts[0].nodeId)?.san).toBe('Bb5');
  });

  it('cuenta huecos repetidos y no duplica partidas', async () => {
    const gap = { id: 'g1', side: 'white' as const, epd: INITIAL_EPD, uci: 'e7e5', san: 'e5' };
    const game = (id: string) => ({
      id,
      endTime: 1,
      myColor: 'white' as const,
      opponent: 'x',
      timeClass: 'blitz',
      result: 'win',
      outcome: { kind: 'gap' as const, ply: 1, playedSan: 'e5', gapId: 'g1' },
      pgn: '',
    });
    await recordGame(game('a'), gap, d);
    await recordGame(game('a'), gap, d);
    await recordGame(game('b'), gap, d);
    expect((await d.gaps.get('g1'))!.count).toBe(2);
  });

  it('el hueco apunta a la partida más reciente aunque llegue antes que una más vieja', async () => {
    const gap = { id: 'g1', side: 'white' as const, epd: INITIAL_EPD, uci: 'e7e5', san: 'e5' };
    const game = (id: string, endTime: number) => ({
      id,
      endTime,
      myColor: 'white' as const,
      opponent: 'x',
      timeClass: 'blitz',
      result: 'win',
      outcome: { kind: 'gap' as const, ply: 1, playedSan: 'e5', gapId: 'g1' },
      pgn: '',
    });
    // La carga hacia atrás inserta partidas más viejas después de las nuevas.
    await recordGame(game('nueva', 2000), gap, d);
    await recordGame(game('vieja', 1000), gap, d);
    expect(await d.gaps.get('g1')).toMatchObject({ count: 2, lastSeen: 2000, lastGameUrl: 'nueva' });
    await recordGame(game('empate', 2000), gap, d);
    expect((await d.gaps.get('g1'))!.lastGameUrl).toBe('empate');
  });

  it('respaldo: exportar e importar reconstruye las tarjetas desde el log y no exporta el token', async () => {
    await importPgn('1. e4 e5 2. Nf3 *');
    await setSettings({ lichessToken: 'secreto', newPerDay: 7 }, d);
    const g = await loadGraph('white', d);
    const [e4] = g.trainableCardIds();
    await rate(e4, Rating.Good, 'session', d);
    await rate(e4, Rating.Good, 'session', d);
    const before = (await d.cards.get(e4))!.card;

    const backup = JSON.parse(JSON.stringify(await exportBackup(d)));
    expect(JSON.stringify(backup)).not.toContain('secreto');

    const other = new CavallDB(`test-${n++}`);
    await ensureRoots(other);
    await setSettings({ lichessToken: 'otro' }, other);
    await importBackup(backup, other);
    const after = (await other.cards.get(e4))!.card;
    expect(after.state).toBe(State.Review);
    expect(+new Date(after.due)).toBe(+new Date(before.due));
    expect(after.stability).toBeCloseTo(before.stability);
    expect((await getSettings(other)).newPerDay).toBe(7);
    expect((await getSettings(other)).lichessToken).toBe('otro');
    expect(await other.nodes.get(nodeId('black', INITIAL_EPD))).toBeDefined();
  });
});

describe('notas y respaldo v2', () => {
  it('guarda y borra notas', async () => {
    await saveNote(noteId('caro-kann', 'avance'), '  ojo con h4  ', d);
    expect((await d.notes.get('caro-kann|avance'))?.text).toBe('ojo con h4');
    await saveNote('caro-kann|avance', '   ', d);
    expect(await d.notes.get('caro-kann|avance')).toBeUndefined();
  });

  it('noteId arma el id de ficha y de línea', () => {
    expect(noteId('caro-kann')).toBe('caro-kann');
    expect(noteId('caro-kann', 'avance')).toBe('caro-kann|avance');
  });

  it('el respaldo incluye las notas y las restaura', async () => {
    await saveNote('caro-kann', 'mi idea', d);
    const b = await exportBackup(d);
    expect(b.version).toBe(3);
    await wipeAll(d);
    await importBackup(b, d);
    expect((await d.notes.get('caro-kann'))?.text).toBe('mi idea');
  });

  it('importa un respaldo versión 1 sin notas', async () => {
    await saveNote('caro-kann', 'se pierde', d);
    const b = { ...(await exportBackup(d)), version: 1 as const, notes: undefined };
    await expect(importBackup(b, d)).resolves.toBeUndefined();
    expect(await d.notes.count()).toBe(0);
  });

  it('rechaza versiones desconocidas', async () => {
    const b = { ...(await exportBackup(d)), version: 4 as unknown as 3 };
    await expect(importBackup(b, d)).rejects.toThrow('no es un respaldo');
  });

  it('abrir la versión 2 conserva los datos de la versión 1', async () => {
    const name = `upgrade-test-${n++}`;
    const old = new Dexie(name);
    old.version(1).stores({
      nodes: 'id, side',
      edges: 'id, side, fromId, toId',
      cards: 'id, side',
      events: '++seq, cardId, at',
      gaps: 'id, side, count',
      games: 'id, endTime',
      days: 'day',
      kv: 'key',
    });
    await old.table('nodes').put({ id: 'white|x', side: 'white', epd: 'x', myTurn: true });
    old.close();
    const up = new CavallDB(name);
    expect((await up.nodes.get('white|x'))?.epd).toBe('x');
    await saveNote('a', 'hola', up);
    expect(await up.notes.count()).toBe(1);
  });
});

describe('repertorios', () => {
  async function importInto(rep: string, pgn: string, side: 'white' | 'black' = 'white') {
    const g = await loadGraph(rep, d);
    const plan = buildImportPlan(pgn, side, existingOf(g));
    await commitImport(plan, new Map(), new Map(), d);
    return loadGraph(rep, d);
  }

  it('ensureRoots crea un repertorio por color con el id del color, una sola vez', async () => {
    await ensureRoots(d);
    const reps = await d.repertoires.toArray();
    expect(reps.map((r) => [r.id, r.side, r.name]).sort()).toEqual([
      ['black', 'black', 'Principal'],
      ['white', 'white', 'Principal'],
    ]);
  });

  it('un repertorio nuevo es independiente: sus ids llevan su prefijo', async () => {
    await importPgn('1. e4 e5 2. Nf3 *');
    const rep = await createRepertoire('white', '  Londres  ', d);
    expect(rep.name).toBe('Londres');
    expect(rep.id).not.toContain('|');
    const g = await importInto(rep.id, '1. d4 d5 2. Bf4 *');
    expect(g.rootId).toBe(nodeId(rep.id, INITIAL_EPD));
    expect(g.trainableCardIds()).toHaveLength(2);
    expect(g.trainableCardIds().every((id) => id.startsWith(`${rep.id}|`))).toBe(true);
    expect(await d.cards.get(g.trainableCardIds()[0])).toBeDefined();
    // El de siempre no cambió.
    expect((await loadGraph('white', d)).trainableCardIds()).toHaveLength(2);
    expect((await loadGraph('white', d)).children(nodeId('white', INITIAL_EPD)).map((e) => e.san)).toEqual(['e4']);
  });

  it('addMove agrega en el repertorio de la posición', async () => {
    const rep = await createRepertoire('white', 'Otro', d);
    const e = await addMove('white', nodeId(rep.id, INITIAL_EPD), 'd2d4', d);
    expect(e?.id.startsWith(`${rep.id}|`)).toBe(true);
    expect(e?.toId.startsWith(`${rep.id}|`)).toBe(true);
    expect(await d.cards.get(e!.id)).toBeDefined();
    expect((await loadGraph('white', d)).edges.size).toBe(0);
  });

  it('el activo es el elegido; si no hay o se borró, el más viejo del color', async () => {
    expect(await activeRepId('white', d)).toBe('white');
    const rep = await createRepertoire('white', 'Londres', d);
    expect(await activeRepId('white', d)).toBe('white');
    await setActiveRepertoire(rep.id, d);
    expect(await activeRepId('white', d)).toBe(rep.id);
    expect(await activeRepId('black', d)).toBe('black');
    expect((await loadActiveGraph('white', d)).rep).toBe(rep.id);
    await deleteRepertoire(rep.id, d);
    expect(await activeRepId('white', d)).toBe('white');
    expect((await getSettings(d)).activeRep?.white).toBeUndefined();
  });

  it('duplicar copia jugadas, tarjetas y el log; después avanzan por separado', async () => {
    await importPgn('1. e4 e5 2. Nf3 *');
    const [e4] = (await loadGraph('white', d)).trainableCardIds();
    await rate(e4, Rating.Good, 'session', d);
    const copy = await duplicateRepertoire('white', 'Copia', d);
    const g = await loadGraph(copy.id, d);
    const copyE4 = `${copy.id}${e4.slice('white'.length)}`;
    expect(g.trainableCardIds()).toEqual((await loadGraph('white', d)).trainableCardIds().map((id) => `${copy.id}${id.slice(5)}`));
    expect((await d.cards.get(copyE4))!.card).toEqual((await d.cards.get(e4))!.card);
    expect(await d.events.where('cardId').equals(copyE4).count()).toBe(1);

    await rate(copyE4, Rating.Again, 'session', d);
    expect((await d.cards.get(e4))!.card.state).toBe(State.Review);
    expect(await d.events.where('cardId').equals(e4).count()).toBe(1);
  });

  it('borrar quita posiciones, jugadas, tarjetas y huecos, y no deja borrar el único del color', async () => {
    const rep = await createRepertoire('white', 'Londres', d);
    const g = await importInto(rep.id, '1. d4 d5 2. Bf4 *');
    await d.gaps.put({ id: `${rep.id}|x|y`, side: 'white', epd: 'x', uci: 'y', san: 'y', count: 1, lastSeen: 0 });
    await deleteRepertoire(rep.id, d);
    expect(await d.repertoires.get(rep.id)).toBeUndefined();
    expect(await d.nodes.where('id').startsWith(`${rep.id}|`).count()).toBe(0);
    expect(await d.edges.where('id').startsWith(`${rep.id}|`).count()).toBe(0);
    expect(await d.cards.get(g.trainableCardIds()[0])).toBeUndefined();
    expect(await d.gaps.count()).toBe(0);
    await expect(deleteRepertoire('white', d)).rejects.toThrow('único');
    expect(await d.repertoires.get('white')).toBeDefined();
  });

  it('el respaldo v3 lleva los repertorios; uno v2 vuelve con los dos de siempre', async () => {
    const rep = await createRepertoire('black', 'Caro-Kann', d);
    await setActiveRepertoire(rep.id, d);
    const b = await exportBackup(d);
    expect(b.repertoires?.map((r) => r.id)).toContain(rep.id);
    await wipeAll(d);
    await importBackup(b, d);
    expect((await d.repertoires.get(rep.id))?.name).toBe('Caro-Kann');
    expect(await activeRepId('black', d)).toBe(rep.id);

    await importBackup({ ...b, version: 2, repertoires: undefined }, d);
    expect((await d.repertoires.toArray()).map((r) => r.id).sort()).toEqual(['black', 'white']);
  });
});
