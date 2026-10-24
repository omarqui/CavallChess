# Biblioteca de aperturas e intro de primer uso — plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sumar a CavallChess una biblioteca de ~46 fichas de aperturas con apuntes propios, que se agregan al repertorio y entrenan sus trampas, y una bienvenida en pasos con tips por pantalla. Esta primera entrega trae la infraestructura completa y la tanda 1 (10 fichas); las tandas 2 a 4 van en la Fase B.

**Architecture:** Cada ficha es un Markdown con bloques PGN en `content/biblioteca/`, que la app parsea en el navegador con chessops (un solo chunk cargado a demanda). Agregar una ficha genera un PGN con comandos propios (`[%hint]` y `[%trap]`) que pasa por la importación existente (`buildImportPlan` → `applyPlan` → `commitImport`), así que conflictos, nombres y tarjetas no cambian. La sesión de entrenamiento solo suma un dato al `Feedback`. Las notas son una tabla nueva en Dexie `version(2)`.

**Tech Stack:** Vite 8, React 19, TypeScript 7, Tailwind 4, chessops 0.15, chessground 10, Dexie 4, ts-fsrs 5, Stockfish 19 (npm `stockfish`, también en Node para verificar), vitest 5, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-24-biblioteca-e-intro-design.md`. Además, `AGENTS.md` (arquitectura y comandos) y `PLAN.md` (decisiones de producto).

**Desvío del spec, decidido al planificar:** el spec pedía compilar el Markdown a JSON versionado con un script. El plan, en cambio, parsea el Markdown en tiempo de ejecución, a través de `import.meta.glob`. No hay archivos generados que puedan quedar desfasados. Vitest valida las mismas fuentes en CI y el costo en el teléfono es mínimo (~46 archivos, ~7.000 jugadas, menos de 50 ms). La verificación con motor se mantiene como pidió el spec: en un comando aparte, con un registro de hash que CI exige.

## Global Constraints

- Interfaz, comentarios y mensajes en **español rioplatense con voseo** ("jugá", "tenés"); jugadas con figurines (`figurine()` de `src/chess/position.ts`).
- GPL-3.0: solo assets compatibles. **Todo el texto de las fichas es original**; no se copia de libros ni de sitios. Los nombres de aperturas y las jugadas sí se pueden usar.
- Rutas con `import.meta.env.BASE_URL`; router por hash (`src/ui/router.ts`).
- Dexie: el esquema nuevo va en `version(2)`; `version(1)` no se edita.
- `TrainingSession` sigue pura; la lógica nueva va en la sesión, con tests, y no en `Train.tsx`.
- El log de eventos y la reproducción FSRS no cambian (`src/srs/scheduler.ts` intacto).
- Stockfish nunca se usa durante el entrenamiento.
- `.board-frame[data-interactive="true"]` sigue existiendo en `Board`.
- Los toques miden 44 px como mínimo (`min-h-11`, como en `Button`). Todo se ve bien a 390 px de ancho, sin scroll horizontal.
- `npm test`, `npm run typecheck` y `npm run e2e` en verde al cerrar cada tarea que toque su área. El e2e sirve `dist/`: corré `npm run build` antes y matá cualquier `vite preview` viejo en :4173.
- Se trabaja en la rama `biblioteca`. **Un push a `main` publica la app: no pushees sin confirmación explícita del usuario.**
- Si un cambio contradice `PLAN.md`, `PLAN.md` se actualiza en el mismo commit.
- Los mensajes de commit van en español y terminan con:
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`
  `Claude-Session: https://claude.ai/code/session_01Xc6o3UAfMEscsygTpwCFMq`

## Review Focus

1. **Agregar una ficha que choca con tu repertorio** (ya tenés 3.♗b5 y agregás la Italiana): la vista previa muestra el choque, por defecto se conserva lo tuyo y no se pisan jugadas, nombres ni textos. → test en la Tarea 6.
2. **Una actualización de contenido quita o renombra una línea que tiene nota tuya:** la nota no se pierde y aparece en "Notas de líneas que ya no están". → test en la Tarea 6.
3. **Restaurar un respaldo viejo (`version: 1`, sin notas)** después de actualizar: se importa completo, con las notas vacías. → test en la Tarea 1.
4. **Cerrar la app a mitad de la bienvenida, después de agregar fichas:** al reabrir no vuelve a aparecer, porque ya hay tarjetas, y la marca se guarda sola. → test en la Tarea 16.
5. **Agregar dos veces la misma ficha:** la segunda vez no crea nada (0 nuevas), el estado queda "En tu repertorio" y no se duplican nombres. → test en la Tarea 6.

---

## Mapa de archivos

| Archivo | Responsabilidad |
|---|---|
| `src/types.ts` | `TrapMark`, `MoveEdge.trap`, `Note`, ajustes nuevos |
| `src/db/db.ts`, `src/db/repo.ts`, `src/db/hooks.ts` | tabla `notes`, respaldo v2, `useNotes` |
| `src/chess/pgnImport.ts`, `src/chess/applyPlan.ts` | comandos `[%hint]` y `[%trap]` |
| `src/srs/queue.ts` | nuevas alternando colores |
| `src/trainer/session.ts` | `Feedback.trap` |
| `src/library/types.ts` | tipos de ficha |
| `src/library/parse.ts` | Markdown + PGN → `Ficha` |
| `src/library/validate.ts` | reglas de contenido |
| `src/library/bundle.ts` | `import.meta.glob` de las fuentes (chunk aparte) |
| `src/library/catalog.ts` | carga, caché, grupos, búsqueda, hooks |
| `src/library/status.ts` | estado frente al repertorio, búsqueda por jugada, notas huérfanas |
| `src/library/pgn.ts` | ficha → PGN de importación + nombres propuestos |
| `src/library/add.ts` | agregar sin vista previa (bienvenida) |
| `src/library/hash.ts`, `src/library/engine-node.ts`, `src/library/motor.test.ts` | verificación con Stockfish en Node |
| `src/library/content.test.ts` | valida todas las fichas reales en CI |
| `content/biblioteca/README.md` | guía de formato para escribir fichas |
| `content/biblioteca/{blancas,negras}/<id>.md` | las fichas |
| `content/biblioteca/verificacion.json` | hash y evaluaciones de la última verificación |
| `src/ui/ImportPreview.tsx` | vista previa de importación reutilizable |
| `src/ui/MiniBoard.tsx` | tablero estático para listas |
| `src/ui/RichText.tsx` | Markdown chico con jugadas en figurines |
| `src/ui/EnginePanel.tsx` | movido desde `Repertoire.tsx` para reutilizarlo |
| `src/ui/toast.ts` | avisos globales |
| `src/ui/Tip.tsx` | tips por pantalla |
| `src/screens/Library.tsx`, `Ficha.tsx`, `FichaAdd.tsx`, `LineViewer.tsx`, `Intro.tsx` | pantallas nuevas |
| `src/screens/intro/choices.ts`, `src/screens/intro/gate.ts` | opciones de la bienvenida y reglas puras de cuándo se muestra |

---

## Fase A — Infraestructura y tanda 1

### Tarea 1: Datos (notas, ajustes, marca de trampa y respaldo v2)

**Files:**
- Modify: `src/types.ts`, `src/db/db.ts`, `src/db/repo.ts`, `src/db/hooks.ts`
- Test: `src/db/repo.test.ts`

**Interfaces:**
- Produces:
  - `interface TrapMark { kind: 'favor' | 'contra'; name: string; fichaId: string; trapId: string }`; `MoveEdge.trap?: TrapMark`.
  - `interface Note { id: string; text: string; updatedAt: number }`; `CavallDB.notes: EntityTable<Note, 'id'>`, en `version(2)` con `notes: 'id'` y las demás tablas repetidas igual que en `version(1)`.
  - `noteId(fichaId: string, lineId?: string): string` → `"caro-kann"` o `"caro-kann|avance"`.
  - `saveNote(id: string, text: string, d?: CavallDB): Promise<void>`: si `text.trim()` queda vacío, borra la nota.
  - `useNotes(): Map<string, Note> | undefined`.
  - `Settings.introSeenAt?: number`, `Settings.tipsSeen?: string[]`.
  - `Backup.version: 1 | 2` y `Backup.notes?: Note[]`. `exportBackup` escribe `version: 2` con `notes`; `importBackup` acepta 1 (sin notas) y 2, y reemplaza también `notes`. `wipeAll` sigue borrando todo.

- [ ] **Step 1: Escribir los tests que fallan**

```ts
it('guarda y borra notas', async () => {
  await saveNote(noteId('caro-kann', 'avance'), '  ojo con h4  ', d);
  expect((await d.notes.get('caro-kann|avance'))?.text).toBe('ojo con h4');
  await saveNote('caro-kann|avance', '   ', d);
  expect(await d.notes.get('caro-kann|avance')).toBeUndefined();
});
it('el respaldo incluye las notas y las restaura', async () => {
  await saveNote('caro-kann', 'mi idea', d);
  const b = await exportBackup(d);
  expect(b.version).toBe(2);
  await wipeAll(d);
  await importBackup(b, d);
  expect((await d.notes.get('caro-kann'))?.text).toBe('mi idea');
});
it('importa un respaldo versión 1 sin notas', async () => {
  const b = { ...(await exportBackup(d)), version: 1 as const, notes: undefined };
  await expect(importBackup(b, d)).resolves.toBeUndefined();
  expect(await d.notes.count()).toBe(0);
});
it('abrir la versión 2 conserva los datos de la versión 1', async () => {
  // Dexie('upgrade-test') con solo version(1) (mismo esquema que hoy) y un nodo guardado;
  // se cierra, se abre new CavallDB('upgrade-test') y el nodo sigue ahí, con db.notes usable.
});
```

- [ ] **Step 2: Correr los tests y ver que fallan**

Run: `npx vitest run src/db/repo.test.ts`
Expected: FAIL (`saveNote`/`noteId` no existen).

- [ ] **Step 3: Implementar tipos, `version(2)`, `noteId`, `saveNote`, `useNotes` y el respaldo v2**

`importBackup` rechaza cualquier `version` que no sea 1 o 2, con el mismo mensaje de hoy.

- [ ] **Step 4: Correr `npm test` y `npm run typecheck`**

Expected: todo PASS.

- [ ] **Step 5: Commit** — `Datos: notas, marca de trampa y respaldo versión 2`

---

### Tarea 2: Importación con `[%hint]` y `[%trap]`

**Files:**
- Modify: `src/chess/pgnImport.ts` (`commentOf`, `ImportedEdge`), `src/chess/applyPlan.ts`, `src/db/repo.ts` (`commitImport`)
- Test: `src/chess/chess.test.ts`, `src/db/repo.test.ts`

**Interfaces:**
- Consumes: `TrapMark` (Tarea 1).
- Produces:
  - Sintaxis dentro de un comentario PGN, sobre la jugada que lo precede:
    - `[%hint <texto sin ']'>]`
    - `[%trap <favor|contra> <fichaId>/<trapId> <nombre>]`

    Los dos se sacan del texto de `explanation`.
  - `ImportedEdge.hint?: string`, `ImportedEdge.trap?: TrapMark`.
  - `applyPlan`: una jugada nueva lleva `hint` y `trap`. Una existente queda con `hint: prev.hint || e.hint` y `trap: prev.trap ?? e.trap`; ese cambio cuenta como modificación y la jugada entra en `upsertEdges`.
  - `commitImport(...)` pasa a devolver `Promise<{ mine: number; rival: number }>`: las jugadas que no existían antes, propias y del rival.

- [ ] **Step 1: Escribir los tests que fallan**

```ts
it('lee [%hint] y [%trap] y los saca de la explicación', () => {
  const pgn = `1. e4 { Centro. [%hint Ocupá el centro.] } e5 2. Nf3 Nc6? { [%trap favor t/x Trampa X] } 3. Bc4 *`;
  const plan = buildImportPlan(pgn, 'white', existingOf(emptyRepo('white')));
  const e4 = [...plan.edges.values()].find((e) => e.san === 'e4')!;
  expect(e4.explanation).toBe('Centro.');
  expect(e4.hint).toBe('Ocupá el centro.');
  const nc6 = [...plan.edges.values()].find((e) => e.san === 'Nc6')!;
  expect(nc6.trap).toEqual({ kind: 'favor', fichaId: 't', trapId: 'x', name: 'Trampa X' });
  expect(nc6.explanation).toBeUndefined();
});
it('no pisa la pista ni la marca existentes', () => {
  // repoFrom con `1. e4 { [%hint Mía.] } *`; importar `1. e4 { [%hint Otra.] } *` → edge e4 conserva 'Mía.'
});
it('commitImport cuenta solo las jugadas nuevas', async () => {
  // primera importación de `1. e4 e5 2. Nf3 *` → { mine: 2, rival: 1 }; repetirla → { mine: 0, rival: 0 }
});
```

- [ ] **Step 2: Correr y ver que fallan** — `npx vitest run src/chess/chess.test.ts src/db/repo.test.ts`
- [ ] **Step 3: Implementar.** En `commentOf`, las dos regex corren antes de `STRIP_TAGS`. `commitImport` cuenta a partir de `ch.upsertEdges` contra el mapa de jugadas previo.
- [ ] **Step 4: `npm test` y `npm run typecheck` en verde.**
- [ ] **Step 5: Commit** — `Importación: pistas y marcas de trampa desde comentarios PGN`

---

### Tarea 3: Cola diaria con nuevas alternando colores

**Files:**
- Modify: `src/srs/queue.ts` (`buildDailyQueue`), `PLAN.md` (la línea "Cola: … ambas en orden DFS del grafo")
- Test: `src/srs/srs.test.ts`

**Interfaces:**
- Produces: misma firma de `buildDailyQueue`. Las `fresh` se arman tomando una de cada grafo por turno, en el orden de `graphs`, mientras queden de los dos; si un color se agota, se completa con el otro. Dentro de cada grafo se mantiene el orden de `trainableCardIds()`. `due` no cambia.

- [ ] **Step 1: Escribir los tests que fallan**

```ts
it('las nuevas alternan colores y respetan el orden DFS de cada uno', () => {
  // white: repoFrom con 4 jugadas propias (w0..w3 en DFS); black: 2 (b0, b1); límite 10, sin eventos
  expect(q.fresh).toEqual([w0, b0, w1, b1, w2, w3]);
});
it('el límite diario corta la alternancia', () => {
  // mismo armado, límite 3 → fresh [w0, b0, w1], freshWaiting 3
});
```

- [ ] **Step 2: Correr y ver que fallan** — `npx vitest run src/srs/srs.test.ts`
- [ ] **Step 3: Implementar la alternancia y actualizar `PLAN.md`:** "Cola: primero vencidas (orden DFS), después nuevas (límite diario, 10 por defecto) alternando blancas y negras, cada color en orden DFS."
- [ ] **Step 4: `npm test` en verde** (el test existente "vencidas primero…" tiene que seguir pasando sin cambios).
- [ ] **Step 5: Commit** — `Cola: las nuevas alternan blancas y negras`

---

### Tarea 4: La sesión informa la trampa

**Files:**
- Modify: `src/trainer/session.ts`
- Test: `src/trainer/session.test.ts`

**Interfaces:**
- Consumes: `MoveEdge.trap` (Tarea 1) y la sintaxis `[%trap]` (Tarea 2), para armar los repertorios de prueba.
- Produces: `Feedback.trap?: TrapMark`. Al responder la tarjeta `t`, incluso después de un fallo:
  - si `t.trap?.kind === 'contra'`, vale `t.trap`;
  - si no, si la última jugada de la línea antes de `t` (la del rival) tiene `trap?.kind === 'favor'`, vale esa marca;
  - si no, queda `undefined`.

- [ ] **Step 1: Escribir los tests que fallan**

```ts
const LEGAL = `1. e4 e5 2. Nf3 d6 3. Bc4 Bg4 4. Nc3 g6? { [%trap favor t/legal Mate de Legal] } 5. Nxe5 *`;
it('avisa la trampa a favor al responder el castigo', () => {
  // sesión sobre la tarjeta de Nxe5 (vencida); se juega Nxe5
  expect(step.feedback?.trap).toEqual({ kind: 'favor', fichaId: 't', trapId: 'legal', name: 'Mate de Legal' });
});
it('avisa la trampa en contra al responder la jugada correcta', () => {
  // `1. e4 c6 2. d4 d5 3. Nc3 dxe4 4. Nxe4 Nd7 5. Qe2 Ndf6 { [%trap contra t/mate Mate en d6] } *` con negras;
  // se responde Ndf6 → feedback.trap.kind === 'contra'
});
it('sin marca no hay aviso', () => { /* tarjeta común → feedback.trap undefined */ });
```

- [ ] **Step 2: Correr y ver que fallan** — `npx vitest run src/trainer/session.test.ts`
- [ ] **Step 3: Implementar.** La marca se calcula en `play()` antes de `advance()`, cuando `this.line.at(-1)` todavía es la jugada del rival.
- [ ] **Step 4: `npm test` en verde.**
- [ ] **Step 5: Commit** — `Sesión: la respuesta informa si venía de una trampa`

---

### Tarea 5: Formato de fichas, parser y validación

**Files:**
- Create: `src/library/types.ts`, `src/library/parse.ts`, `src/library/validate.ts`, `src/library/fixture.ts` (Markdown de la ficha de prueba, solo para tests), `content/biblioteca/README.md`
- Test: `src/library/parse.test.ts`

**Interfaces:**
- Produces (`src/library/types.ts`):

```ts
export type FichaLevel = 'principiante' | 'club';
export type LineLevel = 'basica' | 'club';
export type LineKind = 'variante' | 'favor' | 'contra';
export interface LibMove {
  san: string; uci: string; fromEpd: string; epd: string;
  comment?: string; hint?: string; shapes?: Shape[]; nags?: number[];
}
export interface FichaLine {
  id: string; kind: LineKind; name: string; level: LineLevel; gambit: boolean;
  intro: string; outro: string;
  moves: LibMove[];        // desde la posición inicial
  trapPly?: number;        // favor: error del rival; contra: tu jugada correcta (índice en moves)
  fall?: LibMove[];        // contra: lo que pasa si caés, desde moves[trapPly].fromEpd
  rootPly?: number;        // solo variantes: mainline[rootPly] de la importación lleva el nombre
}
export interface Ficha {
  id: string; side: Side; name: string; aliases: string[]; group: string; order: number;
  eco: string; levels: FichaLevel[]; summary: string;
  start: LibMove[];        // `jugadas` del frontmatter: hasta la posición característica
  basics: string; ideas: string; tips: string[];
  lines: FichaLine[];      // en el orden del archivo
}
```

- `parseFicha(md: string): { ficha?: Ficha; errors: string[] }` (`src/library/parse.ts`).
- `validateFicha(f: Ficha): string[]` y `validateLibrary(fichas: Ficha[]): string[]` (`src/library/validate.ts`).
- `GROUPS: Record<Side, string[]>` (en `validate.ts`, también lo usa el catálogo):
  - `white`: `['Abrís con 1.e4', 'Contra las respuestas a 1.e4', 'Abrís con 1.d4 y otras']`
  - `black`: `['Contra 1.e4', 'Contra 1.d4', 'Contra la Inglesa y otras']`

**Formato** (se documenta tal cual en `content/biblioteca/README.md`, con un ejemplo completo):

````markdown
---
id: caro-kann                 # kebab-case y estable: las notas del usuario cuelgan de él
nombre: Defensa Caro-Kann
alias: Caro-Kann Defense, Caro Kann
lado: negras                  # blancas | negras: quién elige la apertura
grupo: Contra 1.e4            # uno de GROUPS[lado]
orden: 10                     # orden dentro del grupo
eco: B10-B19
nivel: principiante, club
jugadas: 1. e4 c6             # posición característica; toda línea empieza así
resumen: Una frase.
---
## Para empezar
## Ideas y planes
## Consejos                   (solo ítems "- ")
## Variante: <nombre> {#<id>} [básica|club] [gambito]
## Trampa a favor: <nombre> {#<id>} [básica|club]
## Trampa en contra: <nombre> {#<id>} [básica|club]
````

- **Cuerpo de cada línea:** párrafos opcionales (`intro`), un único bloque de código `pgn` y párrafos opcionales (`outro`).
- **El PGN** empieza en `1.` desde la posición inicial y es **lineal**. Los comentarios `{ }` explican la jugada anterior. Pueden llevar texto, `[%hint …]` (solo en jugadas propias), `[%cal …]`/`[%csl …]` y NAGs.
- **Trampa a favor:** exactamente una jugada del rival en la principal lleva `?` o `??`; esa es `trapPly`.
- **Trampa en contra:** exactamente una variante `( … )`. Reemplaza una jugada propia y su primera jugada lleva `?` o `??`. La variante es `fall` y la jugada de la principal que reemplaza es `trapPly`.
- **Texto:** párrafos separados por línea en blanco, `**negrita**`, listas `- ` y jugadas entre comillas invertidas (`` `3...Bf5` ``), que se muestran con figurines.
- **`rootPly`:** para cada variante, es 1 + el prefijo común más largo con cualquier otra variante de la ficha. Tiene un mínimo de `start.length + 1` y un máximo de `moves.length`; si la variante no pasa de `start`, queda `undefined`.

**Reglas de `validateFicha`**, cada una con un mensaje que nombra la ficha y la línea:
- secciones obligatorias no vacías y al menos un consejo;
- al menos una `variante` y al menos una de nivel `basica`;
- `id` de líneas únicos y en kebab-case;
- toda línea empieza con `start`;
- `grupo` está en `GROUPS[lado]`;
- **coherencia:** en cada `fromEpd` donde le toca a `side`, todas las líneas (y `start`) usan la misma `uci`; las `fall` quedan excluidas;
- estructura de trampas según el formato;
- `[%hint]` solo en jugadas propias.

`validateLibrary` además revisa que no se repitan `id` de ficha y que cada `(side, group, order)` sea único.

- [ ] **Step 1: Escribir los tests que fallan.** Usan una ficha de prueba en el mismo archivo (la reutilizan las Tareas 6 y 7; exportala desde `src/library/fixture.ts`).
  - Frontmatter: `id: prueba`, `nombre: Defensa de Prueba`, `alias: Test Defense`, `lado: negras`, `grupo: Contra 1.e4`, `orden: 1`, `eco: B10-B19`, `nivel: principiante, club`, `jugadas: 1. e4 c6` y `resumen: Ficha de prueba.`
  - "Para empezar" e "Ideas y planes", con una frase cada una, y "Consejos" con 2 ítems.
  - Líneas:
    - `## Variante: Avance {#avance} [básica]`: `1. e4 c6 2. d4 d5 3. e5 Bf5 { [%hint Sacá el alfil antes de cerrar con e6.] } 4. Nf3 e6`
    - `## Variante: Karpov {#karpov} [club]`: `1. e4 c6 2. d4 d5 3. Nc3 dxe4 4. Nxe4 Nd7 5. Nf3 Ngf6`
    - `## Trampa a favor: Cambio {#cambio} [club]`: `1. e4 c6 2. d4 d5 3. e5 Bf5 4. Nf3 e6 5. Bd3?? Bxd3 6. Qxd3`
    - `## Trampa en contra: Mate en d6 {#mate} [básica]`: `1. e4 c6 2. d4 d5 3. Nc3 dxe4 4. Nxe4 Nd7 5. Qe2 Ndf6 (5... Ngf6?? 6. Nd6#) 6. Nxf6+ Nxf6`

```ts
it('lee identidad, secciones y líneas', () => {
  expect(f.side).toBe('black'); expect(f.aliases).toEqual(['Test Defense']);
  expect(f.start.map((m) => m.san)).toEqual(['e4', 'c6']);
  expect(f.tips).toHaveLength(2);
  expect(f.lines.map((l) => [l.id, l.kind, l.level])).toEqual([
    ['avance', 'variante', 'basica'], ['karpov', 'variante', 'club'], ['cambio', 'favor', 'club'], ['mate', 'contra', 'basica'],
  ]);
  expect(line('avance').moves[5].hint).toBe('Sacá el alfil antes de cerrar con e6.');
});
it('calcula la raíz de cada variante', () => {
  expect(line('avance').rootPly).toBe(5); expect(line('karpov').rootPly).toBe(5);
  expect(line('cambio').rootPly).toBeUndefined();
});
it('ubica las trampas', () => {
  expect(line('cambio').trapPly).toBe(8);
  expect(line('mate').trapPly).toBe(9);
  expect(line('mate').fall!.map((m) => m.san)).toEqual(['Ngf6', 'Nd6#']);
});
it('la ficha de prueba es válida', () => expect(validateFicha(f)).toEqual([]));
it.each([
  ['jugada ilegal', /ilegal/],
  ['dos jugadas propias distintas en la misma posición', /coherencia/i],
  ['trampa a favor sin ? en el rival', /trampa/i],
  ['trampa en contra con dos variantes', /trampa/i],
  ['línea que no empieza con las jugadas de la ficha', /empieza/i],
  ['sin Consejos', /Consejos/],
  ['id de línea repetido', /repetid/i],
])('rechaza: %s', (_caso, msg) => { /* variante mínima del fixture → errores de parse o validate contienen msg */ });
```

- [ ] **Step 2: Correr y ver que fallan** — `npx vitest run src/library/parse.test.ts`
- [ ] **Step 3: Implementar `parse.ts` y `validate.ts`; escribir `content/biblioteca/README.md`.** El parser de frontmatter es a mano (`clave: valor`, listas con coma), sin dependencias nuevas. El PGN se lee con `parsePgn` y `parseComment` de chessops. Los comandos `[%hint]` y las flechas se sacan del texto del comentario.
- [ ] **Step 4: `npm test` y `npm run typecheck` en verde.**
- [ ] **Step 5: Commit** — `Biblioteca: formato de fichas, parser y validación`

---

### Tarea 6: Carga, estado frente al repertorio y agregado

**Files:**
- Create: `src/library/bundle.ts`, `src/library/catalog.ts`, `src/library/status.ts`, `src/library/pgn.ts`, `src/library/add.ts`, `src/library/content.test.ts`
- Test: `src/library/library.test.ts`

**Interfaces:**
- Consumes: `parseFicha`, `validateFicha`, `validateLibrary`, `GROUPS` (Tarea 5); `buildImportPlan`, `commitImport` → `{ mine, rival }` (Tarea 2); `Note` y `noteId` (Tarea 1).
- Produces:
  - `bundle.ts`: `export const sources: Record<string, string>`, armado con `import.meta.glob('/content/biblioteca/**/*.md', { query: '?raw', import: 'default', eager: true })`.
  - `catalog.ts`:
    - `parseLibrary(sources): { fichas: Ficha[]; errors: string[] }`;
    - `loadLibrary(): Promise<Ficha[]>`: hace `import('./bundle')` una sola vez, cachea y, si hay errores, los manda a `console.error` y omite esa ficha;
    - `useLibrary(): Ficha[] | null` y `useFicha(id: string): Ficha | null | undefined` (`null` = cargando, `undefined` = no existe);
    - `groupFichas(fichas, side): { group: string; fichas: Ficha[] }[]` en el orden de `GROUPS`;
    - `searchFichas(fichas, query): Ficha[]` sin distinguir mayúsculas ni tildes, sobre `name`, `aliases` y ECO. Un código como `B12` también encuentra el rango `B10-B19`.
  - `status.ts`:
    - `type LineStatus = { kind: 'new' } | { kind: 'partial' } | { kind: 'added' } | { kind: 'conflict'; ply: number; existingSan: string }`;
    - `lineStatus(line: FichaLine, side: Side, graph: RepertoireGraph): LineStatus`. Mira las jugadas propias de `moves`: si todas existen como jugada propia en el grafo, `added`; si en alguna posición hay otra jugada propia, `conflict` (la primera que aparezca); si existen algunas, `partial`; si no, `new`;
    - `fichaProgress(f, graph): { added: number; total: number }`, contando todas las líneas;
    - `findFichasForMove(fichas, side, epd, uci): Ficha[]`: fichas de ese `side` con alguna línea que juega `uci` desde `epd`;
    - `orphanNotes(f: Ficha, notes: Map<string, Note>): Note[]`: notas `"<f.id>|<x>"` cuyo `x` no es una línea de `f`.
  - `pgn.ts`:
    - `fichaPgn(f: Ficha, lineIds: string[]): string`: una partida por línea, en este orden: variantes `basica`, variantes `club`, trampas `favor`, trampas `contra` (y dentro de cada grupo, el orden del archivo). Cada partida lleva `[ChapterName "<nombre de la línea>"]`, los comentarios con `[%hint]`, `[%cal]`/`[%csl]` y NAGs, `[%trap favor <f.id>/<line.id> <name>]` en `moves[trapPly]` de las favor y `[%trap contra …]` en `moves[trapPly]` de las contra. **Sin** variantes: `fall` nunca se exporta;
    - `interface NameProposal { chapter: number; root: number; name: string; enabled: boolean }` (lo usa también `ImportPreview`);
    - `fichaNames(f, lineIds): NameProposal[]`: `{ chapter: 0, root: f.start.length, name: f.name }` más una propuesta por variante con `rootPly`, en el índice de partida que le tocó en `fichaPgn`; `enabled: true`;
    - `namesMap(plan: ImportPlan, proposals: NameProposal[]): Map<string, string>`: nodeId → nombre, con `nodeId(plan.side, plan.chapters[p.chapter].mainline[p.root].epd)` y solo las propuestas habilitadas.
  - `add.ts`: `addFicha(f: Ficha, lineIds?: string[], d?: CavallDB): Promise<{ mine: number; rival: number }>`. Por defecto agrega todas las líneas, conserva lo existente en cualquier choque (sin resoluciones) y usa `fichaNames`.
  - `content.test.ts`: corre `parseLibrary(sources)`, `validateFicha` sobre cada ficha y `validateLibrary`, y espera cero errores. Con cero fichas, pasa. (La Tarea 7 le suma el chequeo de verificación.)

- [ ] **Step 1: Escribir los tests que fallan** (en `library.test.ts`, con la ficha de prueba de la Tarea 5 y los helpers en memoria de `src/test/helpers.ts`; `addFicha` corre sobre `CavallDB` con fake-indexeddb, como `repo.test.ts`)

```ts
it('el PGN de la ficha marca trampas y pistas y no exporta la caída', () => {
  const repo = emptyRepo('black');
  const plan = importInto(repo, fichaPgn(f, ['avance', 'cambio', 'mate']), 'black');
  expect(plan.ignoredOwnVariations).toBe(0);
  const g = graphOf(repo, 'black');
  expect(edgeAt(g, ['e4','c6','d4','d5','e5','Bf5','Nf3','e6','Bd3']).trap)
    .toEqual({ kind: 'favor', name: 'Cambio', fichaId: 'prueba', trapId: 'cambio' });
  expect(edgeAt(g, ['e4','c6','d4','d5','Nc3','dxe4','Nxe4','Nd7','Qe2','Ndf6']).trap?.kind).toBe('contra');
  expect(edgeAt(g, ['e4','c6','d4','d5','e5','Bf5']).hint).toBe('Sacá el alfil antes de cerrar con e6.');
  expect([...g.edges.values()].some((e) => e.san === 'Ngf6')).toBe(false); // la caída no entra (karpov no se importó)
});
it('lo básico se crea antes que lo de club y las trampas al final', () => {
  // fichaPgn(f, ['mate', 'karpov', 'avance']) → createdAt(3.e5 de avance) < createdAt(3.Nc3 de karpov) < createdAt(Qe2 de mate)
});
it('estado de cada línea frente al repertorio', () => {
  // grafo vacío → new; tras importar 'avance' → added; 'karpov' → new;
  // repo con `1. e4 c6 2. d4 d5 3. e5 c5` → lineStatus(avance) = { kind: 'conflict', ply: 5, existingSan: 'c5' }
});
it('agregar una ficha que choca conserva tu jugada', async () => {   // Review Focus 1
  // repo con 3...c5 y nombre "Mi Caro" en la raíz; addFicha(f) → la jugada propia tras 3.e5 sigue siendo c5 y el nombre no cambia
});
it('agregar dos veces la misma ficha no crea nada', async () => {     // Review Focus 5
  await addFicha(f, undefined, d);
  expect(await addFicha(f, undefined, d)).toEqual({ mine: 0, rival: 0 });
});
it('nombres: la ficha en su posición y cada variante en su raíz', () => {
  // tras addFicha: graph.labelsFor(nodo tras 3.e5).map((n) => n.name) → ['Defensa de Prueba', 'Avance']
});
it('notas de líneas que ya no están', () => {                         // Review Focus 2
  const notes = new Map([['prueba', n('prueba')], ['prueba|avance', n('prueba|avance')], ['prueba|vieja', n('prueba|vieja')], ['otra|x', n('otra|x')]]);
  expect(orphanNotes(f, notes).map((x) => x.id)).toEqual(['prueba|vieja']);
});
it('encuentra la ficha de una jugada del rival', () => {
  // findFichasForMove([f], 'black', epd tras 1.e4 c6 2.d4 d5, 'e4e5') → [f]; con 'white' → []
});
it('buscador sin tildes, por alias y por ECO', () => {
  // searchFichas([f], 'prueba') y ('test defense') → [f]; ('B12') con eco 'B10-B19' → [f]; ('B20') → []
});
```

- [ ] **Step 2: Correr y ver que fallan** — `npx vitest run src/library`
- [ ] **Step 3: Implementar los cinco módulos y `content.test.ts`.**
- [ ] **Step 4: `npm test` y `npm run typecheck` en verde.**
- [ ] **Step 5: Commit** — `Biblioteca: carga, estado frente al repertorio y agregado`

---

### Tarea 7: Verificación con Stockfish en Node

**Files:**
- Create: `src/library/hash.ts`, `src/library/engine-node.ts`, `src/library/motor.test.ts`, `content/biblioteca/verificacion.json` (`{}`)
- Modify: `src/library/content.test.ts`, `package.json` (script `"biblioteca:motor": "vitest run src/library/motor.test.ts"`), `AGENTS.md` (sección Comandos)

**Interfaces:**
- Consumes: `parseLibrary`, `sources` (Tarea 6).
- Produces:
  - `fichaHash(f: Ficha): string`: sha-256 (`node:crypto`) de `JSON.stringify(f.lines.map(l => [l.id, l.kind, l.gambit, l.moves.map(m => m.uci), l.fall?.map(m => m.uci) ?? null, l.trapPly ?? null]))`. Cambiar solo el texto no obliga a volver a verificar.
  - `createNodeEngine(): { evaluate(epd: string, depth: number): Promise<number>; quit(): void }`. Usa `createRequire(import.meta.url)('stockfish')('single', onMessage)` y `processCommand`. La FEN es `epd + ' 0 1'`. Devuelve centipeones **desde blancas**; un mate vale ±100000. Una posición ya en mate (`score mate 0`, o sin `bestmove` útil) vale −100000 para el bando que mueve.
  - `verificacion.json`: `{ "<fichaId>": { "hash": string, "profundidad": number, "fecha": "YYYY-MM-DD", "evals": { "<lineId>": number } } }`, con las evals en peones desde el lado de la ficha.
  - `motor.test.ts` usa `describe.skipIf(!process.env.MOTOR)` y profundidad 18. Para cada ficha cuyo hash no coincide con el registrado, verifica cada línea y, si todo pasa, reescribe su entrada. Umbrales, en peones desde el lado de la ficha:
    - final de cada `variante`: ≥ −0,7 (con `gambit`, ≥ −1,5);
    - final de cada `favor`: ≥ +2,0;
    - en cada `contra`: la posición tras `moves[trapPly]` (la jugada correcta) ≥ −0,5, y el final de `fall` ≤ −2,0.

    Si algo falla, el test falla con el nombre de la ficha, la línea, la eval y el umbral.
  - `content.test.ts` suma: `it('cada ficha tiene una verificación vigente')`. Para cada ficha, `verificacion[f.id]?.hash === fichaHash(f)`; si no, falla con `Corré MOTOR=1 npm run biblioteca:motor (PowerShell: $env:MOTOR=1)`.

- [ ] **Step 1: Escribir el test de vigencia en `content.test.ts`.** Con cero fichas pasa, así que se prueba con la ficha de la Tarea 5: copiala temporalmente a `content/biblioteca/negras/prueba.md`, corré `npx vitest run src/library/content.test.ts` y tiene que **fallar** con el mensaje de arriba.
- [ ] **Step 2: Implementar `hash.ts`, `engine-node.ts` y `motor.test.ts`.**
- [ ] **Step 3: Verificar el circuito completo con la ficha temporal.** Corré `MOTOR=1 npm run biblioteca:motor` (PowerShell: `$env:MOTOR=1; npm run biblioteca:motor`). La variante `cambio` tiene que **fallar** su umbral, porque 5.♗d3 no gana +2: eso confirma que el motor muerde. Cambiá temporalmente el umbral para ver escribirse la entrada en `verificacion.json`; después **volvé el umbral, borrá la ficha temporal y su entrada** y dejá `verificacion.json` en `{}`.
- [ ] **Step 4: `npm test` en verde (sin MOTOR, el test del motor se salta).** Documentá el comando en `AGENTS.md`.
- [ ] **Step 5: Commit** — `Biblioteca: verificación de fichas con Stockfish`

---

### Tareas 8 a 10: Contenido de la tanda 1

Las tres tareas de contenido siguen el mismo procedimiento. Los `id`, los `nombre` y los grupos de abajo son **fijos**: los usan la bienvenida y los e2e.

| Tarea | `id` | `nombre` | `lado` | `grupo` |
|---|---|---|---|---|
| 8 | `caro-kann` | Defensa Caro-Kann | negras | Contra 1.e4 |
| 8 | `dos-caballos` | Defensa de los Dos Caballos | negras | Contra 1.e4 |
| 8 | `eslava` | Defensa Eslava | negras | Contra 1.d4 |
| 8 | `gambito-de-dama-rehusado` | Gambito de Dama Rehusado | negras | Contra 1.d4 |
| 9 | `sistema-londres` | Sistema Londres | blancas | Abrís con 1.d4 y otras |
| 9 | `italiana` | Apertura Italiana | blancas | Abrís con 1.e4 |
| 10 | `contra-petrov-y-philidor` | Contra la Petrov y la Philidor | blancas | Contra las respuestas a 1.e4 |
| 10 | `avance-contra-caro-kann` | Avance contra la Caro-Kann | blancas | Contra las respuestas a 1.e4 |
| 10 | `gambito-de-dama` | Gambito de Dama | blancas | Abrís con 1.d4 y otras |
| 10 | `escandinava` | Defensa Escandinava | negras | Contra 1.e4 |

**Notas de alcance por ficha:**
- `dos-caballos` es 1…e5 con negras contra 2.♘f3 ♘c6 3.♗c4: los Dos Caballos, con el Fried Liver como trampa en contra, más qué hacer contra 3.♗b5 y 3.d4. Así la opción "1…e5" de la bienvenida no deja agujeros obvios.
- `sistema-londres` cubre 1…d5, 1…♘f6 y las respuestas comunes con …c5.
- `italiana` cubre 3…♗c5 (Giuoco Piano y Pianissimo) y 3…♘f6.

**Files (cada tarea):** Create `content/biblioteca/<blancas|negras>/<id>.md`; Modify `content/biblioteca/verificacion.json`.

- [ ] **Step 1: Escribir las fichas** según `content/biblioteca/README.md`:
  - cada una con 2 a 5 variantes de 8 a 15 jugadas por bando, al menos una `básica`;
  - trampas reales (de 1 a 4, ninguna inventada para cumplir);
  - `[%hint]` en las jugadas propias **clave**: las que tienen un plan que se puede explicar sin nombrar la jugada;
  - comentarios donde aporten y un `outro` que diga qué hacer después.

  Texto original, en voseo y para dos capas: "Para empezar" pensado para principiantes e "Ideas y planes" para jugadores de club.
- [ ] **Step 2: `npx vitest run src/library/content.test.ts`.** Expected: falla **solo** por la verificación vigente (sin errores de formato ni de coherencia).
- [ ] **Step 3: `MOTOR=1 npm run biblioteca:motor`.** Expected: PASS y `verificacion.json` actualizado. Si una línea no alcanza su umbral, se corrige la línea (no el umbral) y se vuelve a correr.
- [ ] **Step 4: Releer cada ficha con esta lista:**
  - ninguna pista nombra su jugada;
  - ningún comentario contradice la evaluación del motor;
  - los nombres de variantes y trampas son los usuales en español;
  - no hay frases calcadas de fuentes conocidas.
- [ ] **Step 5: `npm test` en verde.**
- [ ] **Step 6: Commit** — `Biblioteca: fichas <lista de nombres>`

---

### Tarea 11: Vista previa de importación reutilizable

**Files:**
- Create: `src/ui/ImportPreview.tsx`
- Modify: `src/screens/Import.tsx`

**Interfaces:**
- Consumes: `NameProposal`, `namesMap` (Tarea 6); `commitImport` → `{ mine, rival }` (Tarea 2).
- Produces:

```tsx
export function ImportPreview(props: {
  pgn: string; side: Side; graph: RepertoireGraph;
  title?: string;                                      // por defecto "Revisar importación"
  proposeNames?: (plan: ImportPlan) => NameProposal[]; // por defecto: una por capítulo, como hoy
  onSaved: (r: { mine: number; rival: number }) => void;
  onBack: () => void;
}): JSX.Element
```

Mueve sin cambios de comportamiento lo que hoy está en la rama `if (plan && graph)` de `Import.tsx`: resumen, variantes propias ignoradas, errores, choques con `Segmented`, nombres y botones. El estado de nombres pasa a ser `NameProposal[]`. Cada propuesta muestra su `<select>` de posición sobre la línea principal de **su** capítulo. `ImportScreen` queda con la elección de la fuente y, al guardar, sigue navegando a `/repertoire/<side>`.

- [ ] **Step 1: Refactor.**
- [ ] **Step 2: `npm run typecheck`, `npm test`, `npm run build` y `npm run e2e`.** Expected: el e2e "flujo completo" pasa sin tocarlo (usa "Se agregan 5 jugadas tuyas y 4 del rival" y "Guardar en el repertorio").
- [ ] **Step 3: Commit** — `Importación: la vista previa pasa a ser un componente reutilizable`

---

### Tarea 12: Navegación, catálogo y miniatura

**Files:**
- Create: `src/screens/Library.tsx`, `src/ui/MiniBoard.tsx`
- Modify: `src/App.tsx` (pestañas y rutas), `src/screens/Home.tsx` (engranaje y estado vacío), `e2e/app.spec.ts`
- Test: `e2e/library.spec.ts`

**Interfaces:**
- Consumes: `useLibrary`, `groupFichas`, `searchFichas` (Tarea 6); `fichaProgress` (Tarea 6); `useGraphs`.
- Produces:
  - **Pestañas:** `Hoy · Biblioteca · Repertorio · Partidas · Progreso`. El ícono de Biblioteca es un libro abierto, con el mismo estilo de trazo que los demás.
  - **Rutas:** `#/biblioteca` (pestaña `biblioteca`), `#/biblioteca/<id>`, `#/biblioteca/<id>/linea/<lineId>` y `#/biblioteca/<id>/agregar`. Las tres últimas usan componentes de las Tareas 13 y 14; hasta entonces muestran un "Próximamente" provisorio que la Tarea 13 reemplaza.
  - **Hoy:** en la cabecera, un `<a aria-label="Ajustes" href="#/settings">` con ícono de engranaje, de 44 px de toque. En el estado vacío, el botón primario pasa a ser "Elegir de la biblioteca" (`#/biblioteca`), y "Importar un repertorio" y "Armarlo en el tablero" quedan secundarios.
  - `MiniBoard({ epd, orientation }: { epd: string; orientation: Side })`: tablero estático. Usa las clases de chessground (`.cg-wrap`, `cg-board`, `piece.<color>.<role>`), así `src/themes.css` le aplica el tablero y el set de piezas elegidos. No crea una instancia de chessground y no es interactivo.
  - **`LibraryScreen`:**
    - título "Biblioteca";
    - `Segmented` "Con blancas | Con negras", recordado en `?lado=`;
    - un buscador con `aria-label="Buscar aperturas"`;
    - las fichas agrupadas por `groupFichas`, cada fila como enlace a la ficha, con: `MiniBoard` (posición tras `start`), nombre, resumen en una línea y chips (nivel, "N trampas" si hay, y "En tu repertorio" si `added === total` o "X de N líneas" si `added > 0`);
    - con búsqueda activa, la lista plana de `searchFichas` sobre las fichas de los dos colores.

- [ ] **Step 1: Escribir el e2e que falla** (`e2e/library.spec.ts`)

```ts
test('biblioteca: catálogo por color y buscador', async ({ page }) => {
  await page.goto('/#/biblioteca');
  await expect(page.getByRole('heading', { name: 'Biblioteca' })).toBeVisible();
  await page.getByRole('radio', { name: 'Con negras' }).click();
  await expect(page.getByText('Defensa Caro-Kann')).toBeVisible();
  await page.getByLabel('Buscar aperturas').fill('eslava');
  await expect(page.getByText('Defensa Eslava')).toBeVisible();
  await expect(page.getByText('Defensa Caro-Kann')).toBeHidden();
  await page.getByLabel('Buscar aperturas').fill('B12');
  await expect(page.getByText('Defensa Caro-Kann')).toBeVisible();
  await shot(page, '20-biblioteca');
});
```

- [ ] **Step 2: Implementar.** En `e2e/app.spec.ts`, antes del clic en el link "Ajustes" (hoy desde Repertorio), agregá un clic en el link "Hoy".
- [ ] **Step 3: `npm run typecheck`, `npm test`, `npm run build` y `npm run e2e`.** Expected: todos PASS. Mirá `e2e/screenshots/20-biblioteca.png`: miniaturas nítidas, sin desbordes a 390 px.
- [ ] **Step 4: Commit** — `Biblioteca: pestaña, catálogo y miniaturas`

---

### Tarea 13: Ficha, apuntes y agregar al repertorio

**Files:**
- Create: `src/screens/Ficha.tsx`, `src/screens/FichaAdd.tsx`, `src/ui/RichText.tsx`, `src/ui/toast.ts`
- Modify: `src/App.tsx` (rutas y aviso global)
- Test: `e2e/library.spec.ts`, `src/library/library.test.ts`

**Interfaces:**
- Consumes: `useFicha`, `lineStatus`, `fichaProgress`, `orphanNotes`, `fichaPgn`, `fichaNames` (Tarea 6); `useNotes`, `saveNote`, `noteId` (Tarea 1); `ImportPreview` (Tarea 11); `MiniBoard` (Tarea 12).
- Produces:
  - `toast.ts`: `showToast(text: string): void` y `useToast(): string | null`, que dura 5 s. `App` usa este mecanismo para su aviso de Chess.com y deja de tener un estado local.
  - `RichText({ text }: { text: string })`: párrafos, `**negrita**`, listas `- ` y jugadas entre comillas invertidas con `figurine()`. Sin HTML crudo.
  - `parseRich(text: string): RichBlock[]`, puro y exportado por `RichText.tsx` para el test. El tipo es `RichBlock = { kind: 'p' | 'li'; parts: { kind: 'text' | 'bold' | 'move'; value: string }[] }`.
  - **`FichaScreen({ id, tab })`** (`#/biblioteca/<id>?tab=resumen|variantes|trampas|apuntes`, por defecto `resumen`):
    - **Cabecera:** `Board` estático en la posición tras `start` (orientación = `side`, sin coordenadas), nombre, ECO, resumen y chips.
    - **`Segmented` de pestañas** pegado arriba (`sticky`).
    - **Resumen:** "Para empezar", "Ideas y planes" y "Consejos".
    - **Variantes / Trampas:** una tarjeta por línea con nombre, chip de nivel ("Básica" o "Club"; en las trampas, además, "A favor" o "En contra"), las primeras 6 jugadas tras `start` con `MoveLine`, el chip de estado ("En tu repertorio", "Nueva", "Parcial" o "Choca con tu ♘f3") y un botón "Ver en el tablero" (→ visor). Debajo, plegada, "Tu nota", con un campo que guarda al perder el foco y tras 600 ms sin teclear.
    - **Mis apuntes:** la nota de la ficha, las notas de cada línea (con su nombre) y, si `orphanNotes` no está vacío, "Notas de líneas que ya no están".
    - **Pie:** "Contenido escrito para CavallChess. Las jugadas están verificadas con Stockfish; si algo no te cierra, anotalo en tus apuntes."
    - **Acción fija abajo, sobre la barra:** "Agregar al repertorio" si `added === 0`, "Completar en tu repertorio" si `0 < added < total`, o deshabilitada como "Ya está en tu repertorio". Lleva a `#/biblioteca/<id>/agregar`.
  - **`FichaAddScreen({ id })`:** primero, una lista de casillas por línea (marcadas las que no están `added`) con su chip de estado y el botón "Revisar". Después, `ImportPreview` con `fichaPgn(f, elegidas)`, `proposeNames = () => fichaNames(f, elegidas)` y `title = "Agregar ${f.name}"`. Al guardar: `showToast(\`Sumaste ${mine + rival} jugadas, ${mine} para aprender.\`)` y `navigate(\`/biblioteca/${id}\`, true)`.

- [ ] **Step 1: Tests que fallan**

```ts
// src/library/library.test.ts
it('texto enriquecido: negrita, listas y jugadas', () => {
  expect(parseRich('Jugá **rápido** `Nf3`.\n\n- uno')).toEqual([
    { kind: 'p', parts: [{ kind: 'text', value: 'Jugá ' }, { kind: 'bold', value: 'rápido' }, { kind: 'text', value: ' ' }, { kind: 'move', value: 'Nf3' }, { kind: 'text', value: '.' }] },
    { kind: 'li', parts: [{ kind: 'text', value: 'uno' }] },
  ]);
});
```

```ts
// e2e/library.spec.ts
test('ficha: leer y agregar al repertorio', async ({ page }) => {
  await page.goto('/#/biblioteca/caro-kann');
  await expect(page.getByRole('heading', { name: 'Defensa Caro-Kann' })).toBeVisible();
  await page.getByRole('radio', { name: 'Variantes' }).click();
  await page.getByRole('button', { name: 'Agregar al repertorio' }).click();
  await page.getByRole('button', { name: 'Revisar' }).click();
  await page.getByRole('button', { name: 'Guardar en el repertorio' }).click();
  await expect(page.getByText(/Sumaste \d+ jugadas, \d+ para aprender/)).toBeVisible();
  await expect(page.getByText('En tu repertorio').first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Ya está en tu repertorio' })).toBeDisabled();
  await shot(page, '21-ficha');
});
test('ficha: las notas se guardan', async ({ page }) => {
  // pestaña "Mis apuntes", escribir en la nota de la ficha, recargar → el texto sigue
});
```

- [ ] **Step 2: Implementar.** Usá el skill `impeccable` o `frontend-design:frontend-design` para pulir la jerarquía visual con los tokens de `src/index.css`, sin inventar colores nuevos. La pantalla tiene que verse bien en claro y en oscuro.
- [ ] **Step 3: `npm run typecheck`, `npm test`, `npm run build` y `npm run e2e`** en verde. Revisá `21-ficha.png` en claro y oscuro.
- [ ] **Step 4: Commit** — `Biblioteca: ficha, apuntes y agregar al repertorio`

---

### Tarea 14: Visor de línea

**Files:**
- Create: `src/screens/LineViewer.tsx`, `src/ui/EnginePanel.tsx` (movido de `Repertoire.tsx`, que pasa a importarlo)
- Modify: `src/App.tsx` (ruta, sin barra de pestañas)
- Test: `e2e/library.spec.ts`

**Interfaces:**
- Consumes: `useFicha` (Tarea 6), `Board`, `toShapes`, `MoveLine`, `RichText` (Tarea 13), `EnginePanel`.
- Produces: **`LineViewerScreen({ fichaId, lineId })`**, a pantalla completa:
  - Cabecera con "‹ <nombre de la ficha>" para volver y el nombre de la línea.
  - `Board` no interactivo en la jugada actual, con la última jugada marcada y las flechas del comentario.
  - `MoveLine` con `onPick` (la jugada activa resaltada), y el comentario de la jugada actual con `RichText`. Cuando corresponde, aparecen también el `intro` (al empezar) y el `outro` (al final).
  - Abajo, `<button aria-label="Anterior">◀</button>` y `<button aria-label="Siguiente">▶</button>` de 56 px de alto, al alcance del pulgar.
  - Empieza en `ply = start.length`.
  - Un `Toggle` "Analizar" muestra `EnginePanel` para la posición actual.
  - En las `contra`, un `Segmented` "Línea correcta | Qué pasa si caés". La segunda opción muestra `moves.slice(0, trapPly)` seguido de `fall`, con las jugadas de `fall` en tono `bad`, y arranca en `trapPly`.
  - En las `favor`, la jugada `trapPly` lleva el chip "Error del rival".

- [ ] **Step 1: e2e que falla**

```ts
test('visor: recorrer una línea y analizar', async ({ page }) => {
  await page.goto('/#/biblioteca/caro-kann?tab=variantes');
  await page.getByRole('button', { name: 'Ver en el tablero' }).first().click();
  await page.getByRole('button', { name: 'Siguiente' }).click();
  await page.getByRole('button', { name: 'Siguiente' }).click();
  await page.getByRole('button', { name: 'Anterior' }).click();
  await page.getByLabel('Analizar').check();
  await expect(page.getByText(/Calculando|[+−-]\d/)).toBeVisible();
  await shot(page, '22-visor');
});
```

- [ ] **Step 2: Implementar** (mover `EnginePanel` sin cambiar su comportamiento: el e2e "el motor analiza en el editor" tiene que seguir pasando).
- [ ] **Step 3: `npm run typecheck`, `npm test`, `npm run build` y `npm run e2e`** en verde.
- [ ] **Step 4: Commit** — `Biblioteca: visor de líneas con motor y "qué pasa si caés"`

---

### Tarea 15: Trampas en el entrenamiento y el árbol; de los huecos a la ficha

**Files:**
- Modify: `src/screens/Train.tsx` (`Note`), `src/screens/Repertoire.tsx` (`Tree`), `src/screens/Games.tsx` (`GapItem`)

**Interfaces:**
- Consumes: `Feedback.trap` (Tarea 4), `MoveEdge.trap` (Tarea 1), `useLibrary`, `findFichasForMove` (Tarea 6).
- Produces:
  - En `Train.tsx`, la nota que se muestra tras responder lleva arriba un `Banner tone="good"` cuando `feedback.trap` existe. Para `favor`: "Trampa: <name>. El rival cayó." Para `contra`: "Evitaste la trampa: <name>." `Note` recibe el `Feedback` completo y deja de recibir solo la jugada.
  - En el `Tree` del repertorio, las jugadas con `trap` llevan un chip chico: "trampa" para `favor` y "ojo" para `contra`, con `title` = nombre.
  - En `GapItem`, si `findFichasForMove(lib, gap.side, gap.epd, gap.uci)[0]` existe, se suma un botón secundario "Mirá la ficha: <nombre>" → `#/biblioteca/<id>`.

- [ ] **Step 1: Implementar.** La lógica ya está testeada en la Tarea 4; acá solo se presenta.
- [ ] **Step 2: Verificación manual con Playwright.** Un script en el scratchpad usa `chromium.launch({ channel: 'chrome' })` y `devices['iPhone 13']`:
  1. importa por "Pegar PGN" el repertorio `LEGAL` de la Tarea 4 con blancas;
  2. entrena hasta 5.♘xe5;
  3. captura el aviso "Trampa: Mate de Legal. El rival cayó." en el scratchpad.
- [ ] **Step 3: `npm run typecheck`, `npm test`, `npm run build` y `npm run e2e`** en verde.
- [ ] **Step 4: Commit** — `Trampas: aviso al entrenar, insignia en el árbol y enlace desde huecos`

---

### Tarea 16: Bienvenida de primer uso

**Files:**
- Create: `src/screens/Intro.tsx`, `src/screens/intro/choices.ts`, `src/screens/intro/gate.ts`, `src/screens/intro/gate.test.ts`
- Modify: `src/App.tsx` (puerta y ruta `#/intro` sin pestañas), `src/screens/Settings.tsx` (sección "Ayuda"), `src/library/content.test.ts`, `e2e/helpers.ts`, `e2e/app.spec.ts`, `e2e/library.spec.ts`
- Test: `e2e/intro.spec.ts`

**Interfaces:**
- Consumes: `addFicha` (Tarea 6), `useLibrary`, `setSettings`, `Board`, `MiniBoard`.
- Produces:
  - `gate.ts`:
    - `shouldShowIntro(s: Settings, totalCards: number): boolean` = `!s.introSeenAt && totalCards === 0`;
    - `shouldMarkIntroSeen(s, totalCards)` = `!s.introSeenAt && totalCards > 0`;
    - `needsInstallStep(ua: string, standalone: boolean): boolean` = `/iPhone|iPad|iPod/.test(ua) && !standalone`.
  - `choices.ts`: `INTRO_CHOICES: { key: 'white' | 'blackE4' | 'blackD4'; title: string; options: { fichaId: string; blurb: string }[] }[]`:
    - `white` — "Con blancas": `sistema-londres` ("Un mismo plan contra casi todo, ideal para empezar.") y `italiana` ("1.e4 clásica, partidas abiertas.");
    - `blackE4` — "Con negras contra 1.e4": `caro-kann` ("Sólida y de estructura clara.") y `dos-caballos` ("1…e5, juego abierto y activo.");
    - `blackD4` — "Con negras contra 1.d4": `eslava` ("Firme en el centro, sin encerrar el alfil.") y `gambito-de-dama-rehusado` ("Clásica y sólida.").
  - **`App`:** cuando cargan ajustes y tarjetas (`totalCards` = `useCards()?.size`), si `shouldMarkIntroSeen` → `setSettings({ introSeenAt: Date.now() })`. Si `shouldShowIntro` y la ruta no es `intro`, navega a `/intro` con `replace`. `#/intro` se puede abrir siempre de forma explícita.
  - **`IntroScreen`:** pasos a pantalla completa, con puntos de progreso y `<button>Saltar</button>` arriba a la derecha en todos los pasos. "Saltar" hace `setSettings({ introSeenAt: Date.now() })` y navega a `/`. Pasos y textos fijos:
    1. **"Hola, esto es CavallChess"**: tres ideas (armás tu repertorio; lo memorizás con repasos que llegan justo antes de olvidarlo; lo comparás con tus partidas de Chess.com). Botón "Empezar".
    2. **"Instalala en tu iPhone"**, solo si `needsInstallStep(navigator.userAgent, matchMedia('(display-mode: standalone)').matches || navigator.standalone === true)`. Explica por qué (almacenamiento propio; Safari puede borrar datos de sitios que no abrís seguido) y cómo (Compartir → Agregar a pantalla de inicio). Botón "Seguir sin instalar".
    3. **"Así se estudia"**: un `Board` interactivo con orientación negras en la posición tras 1.e4 e5 2.♘f3, con "¿Cómo defendés el peón de e5?". Acepta `b8c6` y `d7d6`: flash bueno y el texto "Así es cada repaso: la app te muestra la línea y vos jugás tu jugada. Si fallás, te muestra la correcta y la volvés a ver más tarde." Otra jugada: sacudida, el tablero vuelve atrás y aparece "Probá de nuevo: buscá cómo proteger el peón." El botón "Siguiente" siempre está habilitado.
    4. **"Armá tu repertorio"**: por cada `INTRO_CHOICES`, un grupo de radios con las dos opciones (nombre de la ficha + blurb + `MiniBoard`) y "Elegir después" (marcado por defecto). Enlace "Ya tengo mi repertorio (Lichess o PGN)" → `setSettings({ introSeenAt })` y `#/import`. Botón "Agregar y seguir": `addFicha` para cada elección, en orden. Si no se eligió nada, el botón dice "Seguir".
    5. **"¿Jugás en Chess.com?"**: campo de usuario y "Seguir" (guarda `chesscomUser` si no está vacío).
    6. **"Listo"**: "Hoy aprendés tus primeras N posiciones", con N = las nuevas de hoy según `buildDailyQueue`; si N es 0, "Cuando agregues aperturas, acá vas a ver qué estudiar". Botón "Estudiar" (→ `#/train`) o "Ir al inicio" si N es 0. Los dos guardan `introSeenAt`.
  - **Ajustes:** sección "Ayuda" con el botón "Ver la introducción", que hace `setSettings({ introSeenAt: undefined, tipsSeen: [] })` y navega a `/intro`. Con repertorio no vacío, el paso 4 sigue usando `addFicha`, que conserva lo tuyo en los choques.
  - **`e2e/helpers.ts`:** `skipIntro(page: Page): Promise<void>`. Hace clic en "Saltar" si aparece en 3 s.

- [ ] **Step 1: Tests que fallan**

```ts
// src/screens/intro/gate.test.ts
it('la bienvenida se muestra solo sin tarjetas ni marca', () => {   // Review Focus 4
  expect(shouldShowIntro(DEFAULT_SETTINGS, 0)).toBe(true);
  expect(shouldShowIntro(DEFAULT_SETTINGS, 12)).toBe(false);
  expect(shouldMarkIntroSeen(DEFAULT_SETTINGS, 12)).toBe(true);
  expect(shouldShowIntro({ ...DEFAULT_SETTINGS, introSeenAt: 1 }, 0)).toBe(false);
});
it('el paso de instalar es solo para iOS sin instalar', () => {
  expect(needsInstallStep('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)', false)).toBe(true);
  expect(needsInstallStep('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)', true)).toBe(false);
  expect(needsInstallStep('Mozilla/5.0 (Windows NT 10.0; Win64; x64)', false)).toBe(false);
});
```

```ts
// src/library/content.test.ts
it('las fichas de la bienvenida existen, son del lado correcto y no chocan entre sí', () => {
  // cada fichaId de INTRO_CHOICES existe; white → side 'white', blackE4/blackD4 → 'black';
  // para cada combinación (una por grupo), importar sus fichaPgn en repos vacíos por color → plan.conflicts vacío
});
```

```ts
// e2e/intro.spec.ts
test('bienvenida: elegir aperturas deja nuevas para aprender', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Hola, esto es CavallChess' })).toBeVisible();
  await page.getByRole('button', { name: 'Empezar' }).click();
  await move(page, 'b8c6', 'black');
  await expect(page.getByText(/Así es cada repaso/)).toBeVisible();
  await page.getByRole('button', { name: 'Siguiente' }).click();
  await page.getByRole('radio', { name: /Sistema Londres/ }).check();
  await page.getByRole('radio', { name: /Defensa Caro-Kann/ }).check();
  await page.getByRole('radio', { name: /Defensa Eslava/ }).check();
  await page.getByRole('button', { name: 'Agregar y seguir' }).click();
  await page.getByRole('button', { name: 'Seguir' }).click();
  await expect(page.getByText(/Hoy aprendés tus primeras 10 posiciones/)).toBeVisible();
  await shot(page, '30-bienvenida-lista');
  await page.getByRole('button', { name: 'Estudiar' }).click();
  await expect(page.locator('.board-frame[data-interactive="true"]')).toBeVisible();
});
test('bienvenida: saltar no la vuelve a mostrar', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Saltar' }).click();
  await expect(page.getByText('Tu repertorio está vacío.')).toBeVisible();
  await page.reload();
  await expect(page.getByText('Tu repertorio está vacío.')).toBeVisible();
});
```

- [ ] **Step 2: Implementar.** En `e2e/app.spec.ts` y `e2e/library.spec.ts`, cada test arranca con `page.goto('/')` y `await skipIntro(page)`, y recién después navega a su ruta. Hace falta porque la puerta redirige a `#/intro` y "Saltar" deja en Hoy.
- [ ] **Step 3: `npm run typecheck`, `npm test`, `npm run build` y `npm run e2e`** en verde. Revisá las capturas de cada paso a 390 px, en claro y oscuro.
- [ ] **Step 4: Commit** — `Bienvenida de primer uso con elección de aperturas`

---

### Tarea 17: Tips por pantalla

**Files:**
- Create: `src/ui/Tip.tsx`
- Modify: `src/screens/Library.tsx`, `Ficha.tsx`, `Train.tsx`, `Repertoire.tsx`, `Games.tsx`, `Progress.tsx`
- Test: `src/screens/intro/gate.test.ts`, `e2e/intro.spec.ts`

**Interfaces:**
- Consumes: `useSettings`, `setSettings`, `Banner`.
- Produces:
  - `type TipId = 'biblioteca' | 'ficha' | 'entrenar' | 'repertorio' | 'partidas' | 'progreso'`;
  - `tipVisible(id: TipId, s: Settings): boolean` (en `gate.ts`) = `!!s.introSeenAt && !(s.tipsSeen ?? []).includes(id)`;
  - `Tip({ id, children }: { id: TipId; children: ReactNode })`: un `Banner` arriba de la pantalla con el texto y `<button>Entendido</button>`, que agrega `id` a `tipsSeen`.

  Cada pantalla lo renderiza **solo cuando tiene datos** (con el estado vacío no se muestra). Textos fijos:
  - `biblioteca`: "Cada ficha explica una apertura en dos capas: lo básico primero y lo de club después. Con «Agregar al repertorio» la volvés entrenable."
  - `ficha`: "Las trampas se entrenan como cualquier línea: cuando el rival cae, te toca castigarlo. Tus apuntes son tuyos y no se pisan."
  - `entrenar`: "Tocá el tablero para saltar la línea. «Pista» te da la idea sin decir la jugada, y «Fue un error de dedo» anula un fallo."
  - `repertorio`: "Tu repertorio es un árbol de posiciones: «Cortar aquí» marca el final de una línea, y borrar archiva sin perder el historial."
  - `partidas`: "Un desvío hace vencer esa tarjeta hoy. Un hueco es algo que te jugaron y no tenés preparado."
  - `progreso`: "El dominio cuenta las posiciones que ya sabés con firmeza (21 días o más). La racha suma los días en que dejaste los vencidos en cero."

- [ ] **Step 1: Tests que fallan**

```ts
it('un tip se ve una vez y no durante la bienvenida', () => {
  expect(tipVisible('biblioteca', DEFAULT_SETTINGS)).toBe(false);
  const s = { ...DEFAULT_SETTINGS, introSeenAt: 1 };
  expect(tipVisible('biblioteca', s)).toBe(true);
  expect(tipVisible('biblioteca', { ...s, tipsSeen: ['biblioteca'] })).toBe(false);
});
```

```ts
test('los tips se cierran y no vuelven', async ({ page }) => {
  await page.goto('/'); await skipIntro(page);
  await page.getByRole('link', { name: 'Biblioteca' }).click();
  await expect(page.getByText(/Cada ficha explica una apertura/)).toBeVisible();
  await page.getByRole('button', { name: 'Entendido' }).click();
  await page.reload();
  await expect(page.getByText(/Cada ficha explica una apertura/)).toBeHidden();
});
```

- [ ] **Step 2: Implementar.**
- [ ] **Step 3: `npm run typecheck`, `npm test`, `npm run build` y `npm run e2e`** en verde. Si un tip tapa o corre algo que un e2e toca por coordenadas, el helper `move` ya hace scroll al tablero: no hace falta cerrarlo.
- [ ] **Step 4: Commit** — `Tips de primer uso por pantalla`

---

### Tarea 18: Documentación y verificación final de la Fase A

**Files:**
- Modify: `PLAN.md` (Estado: biblioteca, bienvenida, tips, trampas, cola alternada, notas, respaldo v2; Pruebas), `AGENTS.md` (Arquitectura: sección "Biblioteca" con formato, parser en tiempo de ejecución, verificación, y cómo viajan `[%hint]` y `[%trap]`), `README.md` ("Qué hace")

- [ ] **Step 1: Actualizar los tres documentos.**
- [ ] **Step 2: Verificación completa.** `npm run typecheck`, `npm test`, `MOTOR=1 npm run biblioteca:motor` (sin fichas pendientes), `npm run build` y `npm run e2e`. Expected: todo PASS. Hay que pegar la salida de cada uno en el informe.
- [ ] **Step 3: Revisar capturas** de la biblioteca, la ficha, el visor, la bienvenida y una sesión con aviso de trampa, a 390 px y en claro y oscuro.
- [ ] **Step 4: Commit** — `Documentación: biblioteca e intro`
- [ ] **Step 5: Preguntarle al usuario** si se mergea a `main` y se pushea (publica). **No pushear sin un sí explícito.**

---

## Fase B — Tandas 2 a 4 de contenido

Mismo procedimiento que las Tareas 8 a 10: escribir, validar, motor, relectura y commit. Una tarea por tanda; cada una se publica, con confirmación, cuando pasa completa. Los `id` son sugeridos y se fijan al escribir cada ficha; una vez publicados no cambian.

### Tarea 19: Tanda 2 — resto de 1.e4 con blancas y sicilianas

- *Abrís con 1.e4:* `gambito-evans`, `espanola`, `escocesa`, `vienesa`, `gambito-de-rey`.
- *Contra las respuestas a 1.e4:* `alapin`, `smith-morra`, `grand-prix`, `avance-contra-francesa`, `contra-escandinava`, `ataque-austriaco`, `contra-alekhine`.
- *Con negras contra 1.e4:* `siciliana-najdorf`, `siciliana-dragon`, `siciliana-taimanov`, `anti-sicilianas`.

### Tarea 20: Tanda 3 — negras contra 1.d4 y 1.c4

- `nimzo-india`, `india-de-dama`, `india-de-rey`, `grunfeld`, `holandesa`, `benoni-y-benko`, `gambito-de-dama-aceptado`, `contra-londres`, `contragambito-albin`, `contra-inglesa`.

### Tarea 21: Tanda 4 — lo que falta del catálogo

- Blancas: `contra-india-de-rey`, `contra-holandesa`, `inglesa`.
- Negras contra 1.e4: `francesa`, `espanola-negras` (Morphy y Berlinesa), `petrov`, `pirc`, `alekhine`, `contra-gambito-de-rey`, `contra-escocesa-y-vienesa`.

Al cerrar la Tarea 21, `PLAN.md` registra el catálogo completo.
