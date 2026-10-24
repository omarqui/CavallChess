import { describe, expect, it } from 'vitest';
import { Chess } from 'chessops/chess';
import { parseFen } from 'chessops/fen';
import { applyPlan } from './applyPlan';
import { buildImportPlan } from './pgnImport';
import { displaySquares, epdOf, figurine, INITIAL_EPD, playSan, playUci, posFromEpd } from './position';
import { edgeAt, emptyRepo, existingOf, graphOf, importInto, repoFrom } from '../test/helpers';

describe('position', () => {
  it('la clave omite contadores y la casilla al paso sin captura legal', () => {
    const after = playSan(INITIAL_EPD, 'e4')!;
    expect(after.epd).toBe('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq -');
  });

  it('mantiene la casilla al paso cuando la captura es legal', () => {
    let epd = INITIAL_EPD;
    for (const san of ['e4', 'a6', 'e5', 'd5']) epd = playSan(epd, san)!.epd;
    expect(epd.split(' ')[3]).toBe('d6');
  });

  it('las transposiciones llegan a la misma clave', () => {
    const a = ['Nf3', 'd5', 'd4'].reduce((e, s) => playSan(e, s)!.epd, INITIAL_EPD);
    const b = ['d4', 'd5', 'Nf3'].reduce((e, s) => playSan(e, s)!.epd, INITIAL_EPD);
    expect(a).toBe(b);
  });

  it('parsea EPD sin contadores', () => {
    expect(parseFen(INITIAL_EPD).isOk).toBe(true);
    expect(epdOf(posFromEpd(INITIAL_EPD))).toBe(epdOf(Chess.default()));
  });

  it('normaliza el enroque que llega del tablero (e1g1 → e1h1) y lo dibuja hacia g1', () => {
    const epd = ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5'].reduce((e, s) => playSan(e, s)!.epd, INITIAL_EPD);
    const castle = playUci(epd, 'e1g1')!;
    expect(castle.san).toBe('O-O');
    expect(castle.uci).toBe('e1h1');
    expect(playUci(epd, 'e1h1')!.uci).toBe('e1h1');
    expect(displaySquares(epd, 'e1h1')).toEqual(['e1', 'g1']);
  });

  it('rechaza jugadas ilegales', () => {
    expect(playUci(INITIAL_EPD, 'e2e5')).toBeNull();
  });

  it('usa figurines', () => {
    expect(figurine('Nxf3+')).toBe('♞︎xf3+');
    expect(figurine('O-O')).toBe('O-O');
  });
});

const NAJDORF = `[Event "Repertorio: Najdorf"]
[StudyName "Repertorio"]

1. e4 c5 2. Nf3 (2. Nc3 Nc6 3. f4 g6) 2... d6 { Flexible. [%cal Gd7d6] [%anno "IM Fulano", fulano] }
(2... Nc6 { Otra opción propia, se ignora } 3. d4)
3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 a6 { La jugada clave de la Najdorf. [%csl Gb5] } 6. Bg5 (6. Be3 e5) 6... e6 *`;

describe('importación de PGN', () => {
  it('toma solo la principal en posiciones propias y todas las del rival', () => {
    const { graph } = repoFrom(NAJDORF, 'black');
    const afterE4 = edgeAt(graph, ['e4']);
    expect(graph.children(afterE4.toId).map((e) => e.san)).toEqual(['c5']);
    const afterC5 = edgeAt(graph, ['e4', 'c5']);
    expect(graph.children(afterC5.toId).map((e) => e.san).sort()).toEqual(['Nc3', 'Nf3']);
    // Variante propia ignorada: 2...Nc6 no existe
    const afterNf3 = edgeAt(graph, ['e4', 'c5', 'Nf3']);
    expect(graph.children(afterNf3.toId).map((e) => e.san)).toEqual(['d6']);
    // Del rival entran las dos jugadas 6
    const afterA6 = edgeAt(graph, ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'a6']);
    expect(graph.children(afterA6.toId).map((e) => e.san).sort()).toEqual(['Be3', 'Bg5']);
  });

  it('cuenta las variantes propias ignoradas y lee comentarios, flechas y quita [%anno]', () => {
    const plan = buildImportPlan(NAJDORF, 'black', existingOf(emptyRepo('black')));
    expect(plan.ignoredOwnVariations).toBe(1);
    const d6 = [...plan.edges.values()].find((e) => e.san === 'd6')!;
    expect(d6.explanation).toBe('Flexible.');
    expect(d6.shapes).toEqual([{ orig: 'd7', dest: 'd6', brush: 'green' }]);
    const a6 = [...plan.edges.values()].find((e) => e.san === 'a6')!;
    expect(a6.shapes).toEqual([{ orig: 'b5', brush: 'green' }]);
    expect(plan.chapters[0].name).toBe('Najdorf');
    expect(plan.errors).toEqual([]);
  });

  it('propone como raíz el primer punto de ramificación de la línea principal', () => {
    const plan = buildImportPlan(NAJDORF, 'black', existingOf(emptyRepo('black')));
    const ch = plan.chapters[0];
    // 1.e4 c5 → acá se ramifica (2.Nf3 / 2.Nc3)
    expect(ch.mainline[ch.proposedRoot].san).toBe('c5');
  });

  it('marca como propias las jugadas del color del repertorio', () => {
    const { graph } = repoFrom(NAJDORF, 'black');
    expect(edgeAt(graph, ['e4']).mine).toBe(false);
    expect(edgeAt(graph, ['e4', 'c5']).mine).toBe(true);
  });

  it('detecta conflictos con lo existente: por defecto conserva, con "replace" reemplaza', () => {
    const repo = emptyRepo('white');
    importInto(repo, '1. e4 e5 2. Nf3 Nc6 3. Bc4 *', 'white');
    const other = '1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 *';
    const plan = buildImportPlan(other, 'white', existingOf(repo));
    expect(plan.conflicts).toHaveLength(1);
    expect(plan.conflicts[0]).toMatchObject({ existingSan: 'Bc4', importedSan: 'Bb5' });

    importInto(repo, other, 'white');
    let g = graphOf(repo, 'white');
    const nc6 = edgeAt(g, ['e4', 'e5', 'Nf3', 'Nc6']);
    expect(g.children(nc6.toId).map((e) => e.san)).toEqual(['Bc4']);

    importInto(repo, other, 'white', new Map([[plan.conflicts[0].nodeId, 'replace']]));
    g = graphOf(repo, 'white');
    expect(g.children(nc6.toId).map((e) => e.san)).toEqual(['Bb5']);
  });

  it('con "conservar", sigue la variante del PGN que coincide con la jugada existente', () => {
    const repo = emptyRepo('white');
    importInto(repo, '1. e4 e5 2. Nf3 Nc6 3. Bc4 *', 'white');
    importInto(repo, '1. e4 e5 2. Nf3 Nc6 3. Bb5 (3. Bc4 Bc5 4. c3) 3... a6 *', 'white');
    const g = graphOf(repo, 'white');
    const bc4 = edgeAt(g, ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4']);
    expect(g.children(bc4.toId).map((e) => e.san)).toEqual(['Bc5']);
  });

  it('una transposición dentro del PGN no crea dos jugadas propias para la misma posición', () => {
    const pgn = '1. d4 d5 (1... Nf6 2. Nf3 d5 3. Bf4) 2. Nf3 Nf6 3. c4 *';
    const repo = emptyRepo('white');
    const plan = importInto(repo, pgn, 'white');
    const g = graphOf(repo, 'white');
    const mineAtTransposed = g.mineEdge(edgeAt(g, ['d4', 'd5', 'Nf3', 'Nf6']).toId)!;
    expect(mineAtTransposed.san).toBe('c4');
    expect(plan.ignoredOwnVariations).toBe(1);
    // Las dos rutas desembocan en el mismo nodo
    expect(edgeAt(g, ['d4', 'Nf6', 'Nf3', 'd5']).toId).toBe(edgeAt(g, ['d4', 'd5', 'Nf3', 'Nf6']).toId);
  });

  it('omite capítulos que empiezan desde una posición desconocida', () => {
    const pgn = '[FEN "rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2"]\n\n2. Nf3 *';
    const plan = buildImportPlan(pgn, 'white', existingOf(emptyRepo('white')));
    expect(plan.errors[0]).toMatch(/omitió/);
    expect(plan.edges.size).toBe(0);
  });

  it('no pisa explicaciones existentes al reimportar', () => {
    const repo = emptyRepo('white');
    importInto(repo, '1. e4 { mía } *', 'white');
    importInto(repo, '1. e4 { del estudio } e5 *', 'white');
    expect(edgeAt(graphOf(repo, 'white'), ['e4']).explanation).toBe('mía');
  });

  it('applyPlan asigna nombres solo a nodos sin nombre', () => {
    const repo = emptyRepo('black');
    const plan = buildImportPlan(NAJDORF, 'black', existingOf(repo));
    const ch = plan.chapters[0];
    const rootEpd = ch.mainline[ch.proposedRoot].epd;
    const names = new Map([[`black|${rootEpd}`, 'Siciliana']]);
    const changes = applyPlan(plan, repo.nodes, repo.edges, new Map(), names, 0);
    expect(changes.upsertNodes.find((n) => n.epd === rootEpd)?.name).toBe('Siciliana');
    expect(changes.newMineEdgeIds.length).toBeGreaterThan(0);
  });
});

describe('grafo', () => {
  it('archiva lo inalcanzable al quitar una jugada, salvo que una transposición lo mantenga', () => {
    const repo = emptyRepo('white');
    importInto(repo, '1. d4 d5 (1... Nf6 2. Nf3 d5) 2. Nf3 Nf6 3. c4 e6 *', 'white');
    let g = graphOf(repo, 'white');
    const transposed = edgeAt(g, ['d4', 'd5', 'Nf3', 'Nf6']).toId;
    const viaNf6 = edgeAt(g, ['d4', 'Nf6']);
    // Quitar 1...Nf6 solo archiva lo que cuelga exclusivamente de ahí; la transposición sigue viva
    expect(g.wouldArchive(viaNf6.id).sort()).toEqual([viaNf6.toId, edgeAt(g, ['d4', 'Nf6', 'Nf3']).toId].sort());
    expect(g.wouldArchive(viaNf6.id)).not.toContain(transposed);

    // Quitar 3.c4 archiva lo que cuelga solo de ahí
    const c4 = edgeAt(g, ['d4', 'd5', 'Nf3', 'Nf6', 'c4']);
    repo.edges.delete(c4.id);
    g = graphOf(repo, 'white');
    expect(g.isArchived(c4.toId)).toBe(true);
    expect(g.archivedNodeIds()).toContain(c4.toId);
  });

  it('"cortar aquí" saca del entrenamiento lo que sigue', () => {
    const { repo, graph } = repoFrom('1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O *', 'white');
    const nc6 = edgeAt(graph, ['e4', 'e5', 'Nf3', 'Nc6']);
    expect(graph.trainableCardIds()).toHaveLength(5);
    repo.nodes.set(nc6.toId, { ...repo.nodes.get(nc6.toId)!, cutHere: true });
    const g = graphOf(repo, 'white');
    expect(g.trainableCardIds()).toHaveLength(2); // e4 y Nf3
    expect(g.isBeyondCut(edgeAt(g, ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5']).toId)).toBe(true);
    expect(g.isArchived(nc6.toId)).toBe(false);
  });

  it('ordena en DFS con padres antes que hijas y la propia primero', () => {
    const { graph } = repoFrom('1. e4 e5 (1... c5 2. Nf3) 2. Nf3 *', 'white');
    const order = graph.trainableCardIds().map((id) => graph.edges.get(id)!.san);
    expect(order).toEqual(['e4', 'Nf3', 'Nf3']);
  });

  it('camino más corto y etiquetas por raíces nombradas', () => {
    const { repo, graph } = repoFrom(NAJDORF, 'black');
    const c5 = edgeAt(graph, ['e4', 'c5']);
    const a6 = edgeAt(graph, ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'a6']);
    repo.nodes.set(c5.toId, { ...repo.nodes.get(c5.toId)!, name: 'Siciliana' });
    repo.nodes.set(a6.toId, { ...repo.nodes.get(a6.toId)!, name: 'Najdorf' });
    const g = graphOf(repo, 'black');
    const e6 = edgeAt(g, ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'a6', 'Bg5', 'e6']);
    expect(g.labelsFor(e6.toId).map((n) => n.name)).toEqual(['Siciliana', 'Najdorf']);
    expect(g.pathFromRoot(a6.toId)!.map((e) => e.san).join(' ')).toBe('e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6');
    expect(g.namedRoots().map((n) => n.name)).toEqual(['Siciliana', 'Najdorf']);
    // Najdorf tiene tarjetas propias: a6 (no, es la entrada), e6 tras Bg5 y e5 tras Be3
    expect(g.subtreeCardIds(a6.toId).map((id) => g.edges.get(id)!.san).sort()).toEqual(['e5', 'e6']);
  });
});
