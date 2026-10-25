import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { CavallDB } from '../db/db';
import { commitImport, ensureRoots, loadGraph } from '../db/repo';
import { buildImportPlan } from '../chess/pgnImport';
import { epdOf, figurine, nodeId } from '../chess/position';
import { edgeAt, emptyRepo, graphOf, importInto, repoFrom } from '../test/helpers';
import type { Note } from '../types';
import { figurineText, parseRich } from '../ui/RichText';
import { addFicha } from './add';
import { checkLine, entradaVigente, MIN_PREVIA_FAVOR, VERSION_VERIFICACION } from './thresholds';
import { groupFichas, parseLibrary, searchFichas } from './catalog';
import { FICHA_PRUEBA } from './fixture';
import { parseFicha } from './parse';
import { fichaNames, fichaPgn } from './pgn';
import { fichaProgress, findFichasForMove, lineStatus, orphanNotes } from './status';
import { Chess } from 'chessops/chess';
import { parseSan } from 'chessops/san';

const parsed = parseFicha(FICHA_PRUEBA);
const f = parsed.ficha!;
const line = (id: string) => f.lines.find((l) => l.id === id)!;

/** EPD tras jugar `sans` desde la inicial. */
function epdAfter(sans: string[]): string {
  const pos = Chess.default();
  for (const s of sans) pos.play(parseSan(pos, s)!);
  return epdOf(pos);
}

let d: CavallDB;
let n = 0;
beforeEach(async () => {
  d = new CavallDB(`lib-${n++}`);
  await ensureRoots(d);
});

const note = (id: string): Note => ({ id, text: 'x', updatedAt: 1 });

describe('biblioteca: carga, estado y agregado', () => {
  it('la ficha de prueba parsea', () => {
    expect(parsed.errors).toEqual([]);
  });

  it('parseLibrary prefija los errores con el path', () => {
    const r = parseLibrary({ '/content/biblioteca/negras/mala.md': 'nada' });
    expect(r.fichas).toEqual([]);
    expect(r.errors.length).toBeGreaterThan(0);
    expect(r.errors.every((e) => e.startsWith('/content/biblioteca/negras/mala.md: '))).toBe(true);
  });

  it('agrupa por lado en el orden de GROUPS', () => {
    expect(groupFichas([f], 'black')).toEqual([{ group: 'Contra 1.e4', fichas: [f] }]);
    expect(groupFichas([f], 'white')).toEqual([]);
  });

  it('el PGN de la ficha marca trampas y pistas y no exporta la caída', () => {
    const repo = emptyRepo('black');
    const plan = importInto(repo, fichaPgn(f, ['avance', 'cambio', 'mate']), 'black');
    expect(plan.ignoredOwnVariations).toBe(0);
    const g = graphOf(repo, 'black');
    expect(edgeAt(g, ['e4', 'c6', 'd4', 'd5', 'e5', 'Bf5', 'Nf3', 'e6', 'Bd3']).trap).toEqual({
      kind: 'favor',
      name: 'Cambio',
      fichaId: 'prueba',
      trapId: 'cambio',
    });
    expect(edgeAt(g, ['e4', 'c6', 'd4', 'd5', 'Nc3', 'dxe4', 'Nxe4', 'Nd7', 'Qe2', 'Ndf6']).trap?.kind).toBe('contra');
    expect(edgeAt(g, ['e4', 'c6', 'd4', 'd5', 'e5', 'Bf5']).hint).toBe('Sacá el alfil antes de cerrar con e6.');
    expect([...g.edges.values()].some((e) => e.san === 'Ngf6')).toBe(false);
  });

  it('conserva flechas de los comentarios', () => {
    const repo = emptyRepo('black');
    importInto(repo, fichaPgn(f, ['karpov']), 'black');
    const g = graphOf(repo, 'black');
    expect(edgeAt(g, ['e4', 'c6', 'd4', 'd5', 'Nc3', 'dxe4']).shapes).toEqual([
      { orig: 'd5', dest: 'e4', brush: 'green' },
    ]);
  });

  it('lo básico se crea antes que lo de club y las trampas al final', () => {
    const repo = emptyRepo('black');
    importInto(repo, fichaPgn(f, ['mate', 'karpov', 'avance']), 'black');
    const g = graphOf(repo, 'black');
    const avance = edgeAt(g, ['e4', 'c6', 'd4', 'd5', 'e5']).createdAt;
    const karpov = edgeAt(g, ['e4', 'c6', 'd4', 'd5', 'Nc3']).createdAt;
    const mate = edgeAt(g, ['e4', 'c6', 'd4', 'd5', 'Nc3', 'dxe4', 'Nxe4', 'Nd7', 'Qe2']).createdAt;
    expect(avance).toBeLessThan(karpov);
    expect(karpov).toBeLessThan(mate);
  });

  it('estado de cada línea frente al repertorio', () => {
    const vacio = emptyRepo('black');
    expect(lineStatus(line('avance'), 'black', graphOf(vacio, 'black'))).toEqual({ kind: 'new' });

    const repo = emptyRepo('black');
    importInto(repo, fichaPgn(f, ['avance']), 'black');
    const g = graphOf(repo, 'black');
    expect(lineStatus(line('avance'), 'black', g)).toEqual({ kind: 'added' });
    expect(lineStatus(line('karpov'), 'black', g)).toEqual({ kind: 'new' });
    expect(fichaProgress(f, g)).toEqual({ added: 1, total: 4 });

    const { graph } = repoFrom('1. e4 c6 2. d4 d5 3. e5 c5', 'black');
    expect(lineStatus(line('avance'), 'black', graph)).toEqual({ kind: 'conflict', ply: 5, existingSan: 'c5' });
  });

  it('una línea con parte de su tramo propio es parcial', () => {
    const { graph } = repoFrom('1. e4 c6 2. d4 d5 3. e5 Bf5', 'black');
    expect(lineStatus(line('avance'), 'black', graph)).toEqual({ kind: 'partial' });
  });

  it('agregar una ficha que choca conserva tu jugada', async () => {
    const g0 = await loadGraph('black', d);
    const caro = nodeId('black', epdAfter(['e4', 'c6']));
    const avance = nodeId('black', epdAfter(['e4', 'c6', 'd4', 'd5', 'e5']));
    const plan = buildImportPlan('1. e4 c6 2. d4 d5 3. e5 c5', 'black', { mine: new Map(), nodeIds: new Set(g0.nodes.keys()) });
    // Nombres tuyos justo en las posiciones donde addFicha propone "Defensa de Prueba" y "Avance".
    await commitImport(plan, new Map(), new Map([[caro, 'Mi Caro'], [avance, 'Mi Avance']]), d);

    await addFicha(f, undefined, d);
    const g = await loadGraph('black', d);
    expect(g.mineEdge(avance)?.san).toBe('c5');
    expect(g.node(caro)?.name).toBe('Mi Caro');
    expect(g.node(avance)?.name).toBe('Mi Avance');
  });

  it('agregar dos veces la misma ficha no crea nada', async () => {
    const primera = await addFicha(f, undefined, d);
    expect(primera.mine).toBeGreaterThan(0);
    expect(await addFicha(f, undefined, d)).toEqual({ mine: 0, rival: 0 });
  });

  it('nombres: la ficha en su posición y cada variante en su raíz', async () => {
    await addFicha(f, undefined, d);
    const g = await loadGraph('black', d);
    const tras = nodeId('black', epdAfter(['e4', 'c6', 'd4', 'd5', 'e5']));
    expect(g.labelsFor(tras).map((x) => x.name)).toEqual(['Defensa de Prueba', 'Avance']);
  });

  it('fichaNames da una propuesta por variante en su partida', () => {
    const names = fichaNames(f, ['mate', 'karpov', 'avance']);
    expect(names[0]).toEqual({ chapter: 0, root: f.start.length, name: 'Defensa de Prueba', enabled: true });
    expect(names.slice(1).map((x) => [x.name, x.chapter])).toEqual([
      ['Avance', 0],
      ['Karpov', 1],
    ]);
  });

  describe('con nombrar-raiz: no', () => {
    const sinRaiz = parseFicha(
      FICHA_PRUEBA.replace('resumen: Ficha de prueba.', 'resumen: Ficha de prueba.\nnombrar-raiz: no'),
    ).ficha!;

    it('fichaNames no propone la ficha y prefija las variantes', () => {
      const names = fichaNames(sinRaiz, ['mate', 'karpov', 'avance']);
      expect(names.some((x) => x.name === 'Defensa de Prueba')).toBe(false);
      expect(names.map((x) => [x.name, x.chapter])).toEqual([
        ['Defensa de Prueba: Avance', 0],
        ['Defensa de Prueba: Karpov', 1],
      ]);
    });

    it('addFicha deja sin nombre la posición de la ficha', async () => {
      await addFicha(sinRaiz, undefined, d);
      const g = await loadGraph('black', d);
      expect(g.labelsFor(nodeId('black', epdAfter(['e4', 'c6'])))).toEqual([]);
      const tras = nodeId('black', epdAfter(['e4', 'c6', 'd4', 'd5', 'e5']));
      expect(g.labelsFor(tras).map((x) => x.name)).toEqual(['Defensa de Prueba: Avance']);
    });
  });

  it('notas de líneas que ya no están', () => {
    const notes = new Map([
      ['prueba', note('prueba')],
      ['prueba|avance', note('prueba|avance')],
      ['prueba|vieja', note('prueba|vieja')],
      ['otra|x', note('otra|x')],
    ]);
    expect(orphanNotes(f, notes).map((x) => x.id)).toEqual(['prueba|vieja']);
  });

  it('encuentra la ficha de una jugada del rival', () => {
    const epd = epdAfter(['e4', 'c6', 'd4', 'd5']);
    expect(findFichasForMove([f], 'black', epd, 'e4e5')).toEqual([f]);
    expect(findFichasForMove([f], 'white', epd, 'e4e5')).toEqual([]);
  });

  it('buscador sin tildes, por alias y por ECO', () => {
    expect(searchFichas([f], 'prueba')).toEqual([f]);
    expect(searchFichas([f], 'DÉFENSA')).toEqual([f]);
    expect(searchFichas([f], 'defensa')).toEqual([f]);
    expect(searchFichas([f], 'test defense')).toEqual([f]);
    expect(searchFichas([f], 'B12')).toEqual([f]);
    expect(searchFichas([f], 'B20')).toEqual([]);
  });
});

describe('texto de las fichas', () => {
  it('texto enriquecido: negrita, listas y jugadas', () => {
    expect(parseRich('Jugá **rápido** `Nf3`.\n\n- uno')).toEqual([
      { kind: 'p', parts: [{ kind: 'text', value: 'Jugá ' }, { kind: 'bold', value: 'rápido' }, { kind: 'text', value: ' ' }, { kind: 'move', value: 'Nf3' }, { kind: 'text', value: '.' }] },
      { kind: 'li', parts: [{ kind: 'text', value: 'uno' }] },
    ]);
  });

  it('las líneas de un párrafo se unen y una lista lo corta', () => {
    expect(parseRich('Primera\nsegunda\n- item\nsigue\n\nOtro')).toEqual([
      { kind: 'p', parts: [{ kind: 'text', value: 'Primera segunda' }] },
      { kind: 'li', parts: [{ kind: 'text', value: 'item sigue' }] },
      { kind: 'p', parts: [{ kind: 'text', value: 'Otro' }] },
    ]);
  });

  it('las marcas sin cerrar quedan como texto', () => {
    expect(parseRich('a **b `c')).toEqual([{ kind: 'p', parts: [{ kind: 'text', value: 'a **b `c' }] }]);
  });

  it('una negrita puede llevar jugadas adentro', () => {
    expect(parseRich('**Avance (`3.e5`):** espacio')).toEqual([
      { kind: 'p', parts: [{ kind: 'bold', value: 'Avance (`3.e5`):' }, { kind: 'text', value: ' espacio' }] },
    ]);
  });
});

describe('figurineText', () => {
  it('pasa a figurines las jugadas de pieza y deja peones y enroques', () => {
    expect(figurineText('Nc7+ gana la torre, tras O-O y e4; luego Nbd7, Qxd5 y Rxe1#.')).toBe(
      `${figurine('Nc7+')} gana la torre, tras O-O y e4; luego ${figurine('Nbd7')}, ${figurine('Qxd5')} y ${figurine('Rxe1#')}.`,
    );
    expect(figurineText('b8=Q es coronación; Bishop y Rey no cambian')).toBe('b8=Q es coronación; Bishop y Rey no cambian');
  });
  it('no toca palabras que empiezan con letra de pieza', () => {
    expect(figurineText('Bb5 pero Bad4x y Nada')).toBe(`${figurine('Bb5')} pero Bad4x y Nada`);
  });
});

describe('umbrales del motor (checkLine, sin motor)', () => {
  it('favor: la posición previa a −0,6 falla aunque el final sea bueno', () => {
    const fallas = checkLine('favor', false, { previa: -0.6, final: 2.1 });
    expect(fallas).toHaveLength(1);
    expect(fallas[0]).toContain('posición previa');
    expect(fallas[0]).toContain('-0.60');
    expect(fallas[0]).toContain(`>= ${MIN_PREVIA_FAVOR}`);
  });
  it('favor: previa −0,4 y final +2,1 pasa', () => {
    expect(checkLine('favor', false, { previa: -0.4, final: 2.1 })).toEqual([]);
  });
  it('favor: final por debajo de +2 falla', () => {
    expect(checkLine('favor', false, { previa: 0, final: 1.5 })).toHaveLength(1);
  });
  it('variante: -0,7 normal y -1,5 con gambito', () => {
    expect(checkLine('variante', false, { final: -0.7 })).toEqual([]);
    expect(checkLine('variante', false, { final: -0.8 })).toHaveLength(1);
    expect(checkLine('variante', true, { final: -1.4 })).toEqual([]);
    expect(checkLine('variante', true, { final: -1.6 })).toHaveLength(1);
  });
  it('contra: correcta >= −0,5 y caída <= −2', () => {
    expect(checkLine('contra', false, { correcta: -0.5, caida: -2 })).toEqual([]);
    expect(checkLine('contra', false, { correcta: -0.6, caida: -2.5 })).toHaveLength(1);
    expect(checkLine('contra', false, { correcta: 0, caida: -1.9 })).toHaveLength(1);
  });
  it('una entrada es vigente solo con la versión actual y el mismo hash', () => {
    expect(entradaVigente({ version: VERSION_VERIFICACION, hash: 'a' }, 'a')).toBe(true);
    expect(entradaVigente({ hash: 'a' }, 'a')).toBe(false);
    expect(entradaVigente({ version: 1, hash: 'a' }, 'a')).toBe(false);
    expect(entradaVigente({ version: VERSION_VERIFICACION, hash: 'a' }, 'b')).toBe(false);
    expect(entradaVigente(undefined, 'a')).toBe(false);
  });
});
