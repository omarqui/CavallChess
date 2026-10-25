import { applyPlan } from '../chess/applyPlan';
import { RepertoireGraph } from '../chess/graph';
import type { ImportPlan, Resolutions } from '../chess/pgnImport';
import { edgeId, epdFromNodeId, INITIAL_EPD, nodeId, playUci, turnOf, type Side } from '../chess/position';
import { studyDay } from '../srs/day';
import { applyEvent, isDue, newCard, replay, State, type Grade } from '../srs/scheduler';
import {
  DEFAULT_SETTINGS,
  type CardRow,
  type Gap,
  type GameRow,
  type MoveEdge,
  type Note,
  type PositionNode,
  type ReviewEvent,
  type ReviewSource,
  type Settings,
} from '../types';
import { db, type CavallDB } from './db';

const SIDES: Side[] = ['white', 'black'];

export async function ensureRoots(d: CavallDB = db) {
  for (const side of SIDES) {
    const id = nodeId(side, INITIAL_EPD);
    if (!(await d.nodes.get(id))) await d.nodes.put({ id, side, epd: INITIAL_EPD, myTurn: side === 'white' });
  }
}

export async function loadGraph(side: Side, d: CavallDB = db) {
  const [nodes, edges] = await Promise.all([
    d.nodes.where('side').equals(side).toArray(),
    d.edges.where('side').equals(side).toArray(),
  ]);
  return new RepertoireGraph(side, nodes, edges);
}

async function ensureCard(d: CavallDB, edge: MoveEdge, now: number) {
  if (!edge.mine) return;
  if (await d.cards.get(edge.id)) return;
  await d.cards.put({ id: edge.id, side: edge.side, createdAt: now, card: newCard(now) });
}

export async function commitImport(
  plan: ImportPlan,
  resolutions: Resolutions,
  names: Map<string, string>,
  d: CavallDB = db,
): Promise<{ mine: number; rival: number }> {
  const now = Date.now();
  const counts = { mine: 0, rival: 0 };
  await d.transaction('rw', d.nodes, d.edges, d.cards, async () => {
    const [nodes, edges] = await Promise.all([
      d.nodes.where('side').equals(plan.side).toArray(),
      d.edges.where('side').equals(plan.side).toArray(),
    ]);
    const ch = applyPlan(
      plan,
      new Map(nodes.map((n) => [n.id, n])),
      new Map(edges.map((e) => [e.id, e])),
      resolutions,
      names,
      now,
    );
    // Jugadas que no existían antes (las modificadas no cuentan).
    const previas = new Set(edges.map((e) => e.id));
    for (const e of ch.upsertEdges) {
      if (previas.has(e.id)) continue;
      if (e.mine) counts.mine++;
      else counts.rival++;
    }
    await d.edges.bulkDelete(ch.deleteEdgeIds);
    await d.nodes.bulkPut(ch.upsertNodes);
    await d.edges.bulkPut(ch.upsertEdges);
    for (const e of ch.upsertEdges) await ensureCard(d, e, now);
  });
  return counts;
}

/**
 * Agrega una jugada desde una posición. Si es tuya y ya tenías otra, la reemplaza
 * (lo que queda inalcanzable se archiva con su historial). Devuelve la jugada o null si es ilegal.
 */
export async function addMove(side: Side, fromId: string, uci: string, d: CavallDB = db): Promise<MoveEdge | null> {
  const fromEpd = epdFromNodeId(fromId);
  const played = playUci(fromEpd, uci);
  if (!played) return null;
  const now = Date.now();
  const mine = turnOf(fromEpd) === side;
  const id = edgeId(side, fromEpd, played.uci);
  let result: MoveEdge | null = null;
  await d.transaction('rw', d.nodes, d.edges, d.cards, async () => {
    const existing = await d.edges.get(id);
    if (existing) {
      result = existing;
      return;
    }
    if (mine) {
      const others = (await d.edges.where('fromId').equals(fromId).toArray()).filter((e) => e.mine);
      await d.edges.bulkDelete(others.map((e) => e.id));
    }
    const toId = nodeId(side, played.epd);
    if (!(await d.nodes.get(toId))) {
      await d.nodes.put({ id: toId, side, epd: played.epd, myTurn: turnOf(played.epd) === side });
    }
    const edge: MoveEdge = { id, side, fromId, toId, uci: played.uci, san: played.san, mine, createdAt: now };
    await d.edges.put(edge);
    await ensureCard(d, edge, now);
    result = edge;
  });
  return result;
}

export const deleteEdge = (id: string, d: CavallDB = db) => d.edges.delete(id);

export const updateEdge = (id: string, patch: Partial<Pick<MoveEdge, 'hint' | 'explanation'>>, d: CavallDB = db) =>
  d.edges.update(id, patch);

export const updateNode = (id: string, patch: Partial<Pick<PositionNode, 'name' | 'cutHere'>>, d: CavallDB = db) =>
  d.nodes.update(id, patch);

/** Elimina definitivamente posiciones archivadas (y sus jugadas y tarjetas). El log se conserva. */
export async function purgeNodes(nodeIds: string[], d: CavallDB = db) {
  const set = new Set(nodeIds);
  await d.transaction('rw', d.nodes, d.edges, d.cards, async () => {
    const [edges, cards] = await Promise.all([d.edges.toArray(), d.cards.toArray()]);
    const dead = edges.filter((e) => set.has(e.fromId) || set.has(e.toId)).map((e) => e.id);
    // Tarjetas de jugadas reemplazadas que llevaban a lo que se elimina.
    const live = new Set(edges.map((e) => e.id));
    const replaced = cards
      .filter((c) => !live.has(c.id))
      .filter((c) => {
        const [side, epd, uci] = splitEdgeId(c.id);
        const to = playUci(epd, uci);
        return !!to && set.has(nodeId(side, to.epd));
      })
      .map((c) => c.id);
    await d.edges.bulkDelete(dead);
    await d.cards.bulkDelete([...dead, ...replaced]);
    await d.nodes.bulkDelete(nodeIds);
  });
}

function splitEdgeId(id: string): [Side, string, string] {
  const first = id.indexOf('|');
  const last = id.lastIndexOf('|');
  return [id.slice(0, first) as Side, id.slice(first + 1, last), id.slice(last + 1)];
}

async function appendEvent(cardId: string, ev: Omit<ReviewEvent, 'cardId'>, d: CavallDB) {
  await d.transaction('rw', d.cards, d.events, async () => {
    const row = await d.cards.get(cardId);
    if (!row) return;
    await d.events.add({ cardId, ...ev });
    await d.cards.put({ ...row, card: applyEvent(row.card, ev) });
  });
}

export const rate = (cardId: string, rating: Grade, source: ReviewSource = 'session', d: CavallDB = db) =>
  appendEvent(cardId, { at: new Date(), kind: 'rating', rating, source }, d);

export const forceDue = (cardId: string, source: ReviewSource, d: CavallDB = db) =>
  appendEvent(cardId, { at: new Date(), kind: 'forceDue', source }, d);

/**
 * Deja la tarjeta vencida para repasarla ahora. Una tarjeta nueva no cambia con `forceDue` (se aprende,
 * no se repasa) y una ya vencida no necesita el evento: en ambos casos no escribe nada y devuelve `false`.
 */
export async function ensureDue(cardId: string, d: CavallDB = db): Promise<boolean> {
  const row = await d.cards.get(cardId);
  if (!row || row.card.state === State.New || isDue(row.card, new Date())) return false;
  await forceDue(cardId, 'game', d);
  return true;
}

export async function markDayComplete(now = new Date(), d: CavallDB = db) {
  const day = studyDay(now);
  if (!(await d.days.get(day))) await d.days.put({ day });
}

export async function getSettings(d: CavallDB = db): Promise<Settings> {
  const row = await d.kv.get('settings');
  return { ...DEFAULT_SETTINGS, ...((row?.value as Partial<Settings>) ?? {}) };
}

export async function setSettings(patch: Partial<Settings>, d: CavallDB = db) {
  const cur = await getSettings(d);
  await d.kv.put({ key: 'settings', value: { ...cur, ...patch } });
}

export async function recordGame(row: GameRow, gap: Omit<Gap, 'count' | 'lastSeen'> | undefined, d: CavallDB = db) {
  await d.transaction('rw', d.games, d.gaps, async () => {
    if (await d.games.get(row.id)) return;
    await d.games.put(row);
    if (gap) {
      const prev = await d.gaps.get(gap.id);
      await d.gaps.put({
        ...gap,
        count: (prev?.count ?? 0) + 1,
        lastSeen: Math.max(prev?.lastSeen ?? 0, row.endTime),
        lastGameUrl: row.id,
      });
    }
  });
}

// ─── Notas ───────────────────────────────────────────────────────────────────

/** Id de la nota de una ficha, o de una línea dentro de ella. */
export function noteId(fichaId: string, lineId?: string): string {
  return lineId ? `${fichaId}|${lineId}` : fichaId;
}

/** Guarda la nota; si el texto queda vacío, la borra. */
export async function saveNote(id: string, text: string, d: CavallDB = db) {
  const clean = text.trim();
  if (!clean) await d.notes.delete(id);
  else await d.notes.put({ id, text: clean, updatedAt: Date.now() });
}

// ─── Respaldo ────────────────────────────────────────────────────────────────

export interface Backup {
  app: 'cavallchess';
  version: 1 | 2;
  exportedAt: string;
  nodes: PositionNode[];
  edges: MoveEdge[];
  cards: Pick<CardRow, 'id' | 'side' | 'createdAt'>[];
  events: ReviewEvent[];
  gaps: Gap[];
  games: GameRow[];
  days: string[];
  notes?: Note[]; // desde la versión 2
  settings: Omit<Settings, 'lichessToken'>;
}

export async function exportBackup(d: CavallDB = db): Promise<Backup> {
  const [nodes, edges, cards, events, gaps, games, days, notes, settings] = await Promise.all([
    d.nodes.toArray(),
    d.edges.toArray(),
    d.cards.toArray(),
    d.events.toArray(),
    d.gaps.toArray(),
    d.games.toArray(),
    d.days.toArray(),
    d.notes.toArray(),
    getSettings(d),
  ]);
  const { lichessToken: _omit, ...safeSettings } = settings;
  return {
    app: 'cavallchess',
    version: 2,
    exportedAt: new Date().toISOString(),
    nodes,
    edges,
    cards: cards.map(({ id, side, createdAt }) => ({ id, side, createdAt })),
    events: events.map(({ seq: _seq, ...ev }) => ev),
    gaps,
    games,
    days: days.map((x) => x.day),
    notes,
    settings: safeSettings,
  };
}

/** Restaura un respaldo reemplazando todo. Las tarjetas se recalculan desde el log. */
export async function importBackup(b: Backup, d: CavallDB = db) {
  if (b.app !== 'cavallchess' || ![1, 2].includes(b.version)) throw new Error('El archivo no es un respaldo de CavallChess.');
  const events = b.events.map((e) => ({ ...e, at: new Date(e.at) }));
  const byCard = new Map<string, ReviewEvent[]>();
  for (const e of events) {
    const list = byCard.get(e.cardId);
    if (list) list.push(e);
    else byCard.set(e.cardId, [e]);
  }
  const cards: CardRow[] = b.cards.map((c) => ({ ...c, card: replay(c.createdAt, byCard.get(c.id) ?? []) }));
  const token = (await getSettings(d)).lichessToken;
  await d.transaction('rw', [d.nodes, d.edges, d.cards, d.events, d.gaps, d.games, d.days, d.notes, d.kv], async () => {
    await Promise.all([
      d.nodes.clear(),
      d.edges.clear(),
      d.cards.clear(),
      d.events.clear(),
      d.gaps.clear(),
      d.games.clear(),
      d.days.clear(),
      d.notes.clear(),
    ]);
    await d.nodes.bulkAdd(b.nodes);
    await d.edges.bulkAdd(b.edges);
    await d.cards.bulkAdd(cards);
    await d.events.bulkAdd(events);
    await d.gaps.bulkAdd(b.gaps);
    await d.games.bulkAdd(b.games);
    await d.days.bulkAdd(b.days.map((day) => ({ day })));
    await d.notes.bulkAdd(b.notes ?? []);
    await d.kv.put({ key: 'settings', value: { ...DEFAULT_SETTINGS, ...b.settings, lichessToken: token } });
  });
  await ensureRoots(d);
}

export async function wipeAll(d: CavallDB = db) {
  await d.delete();
  await d.open();
  await ensureRoots(d);
}
