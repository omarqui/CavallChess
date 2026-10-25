# Partidas de Chess.com — plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ver cada partida de Chess.com dentro de la app, cargar todo el historial con una lista paginada y filtrable, y armar repertorio desde una partida o desde muchas.

**Architecture:** Lógica pura en `src/games/` con tests: jugadas de una partida, recorte de PGN, agregación de muchas partidas, filtros y paginación. La sincronización gana una carga hacia atrás, cancelable. La UI suma un visor de partida (`#/games/<id>`), una pantalla para agregar al repertorio y otra para armar desde muchas partidas (`#/games/armar`). Las tres pasan por `ImportPreview`, que ya respeta lo existente. Entrenar admite una sola tarjeta (`#/train?card=<id>`).

**Tech Stack:** React 19, TypeScript, Dexie 4, chessops, vitest (+ fake-indexeddb), Playwright con la API de Chess.com simulada (`page.route`).

**Spec:** `docs/superpowers/specs/2026-10-25-partidas-chesscom-design.md` (leer también "Decisiones tras la revisión del constructor").

**Rutas [decisión]:** el diseño dice `#/partidas/…`, pero la pestaña existente es `games` (`case 'games'` en `src/App.tsx`, `TabBar`). Se usa `#/games/<id>`, `#/games/<id>/agregar` y `#/games/armar` para no tocar la pestaña ni los enlaces existentes. Un id es una URL codificada, así que no choca con `armar`.

## Global Constraints

- Español rioplatense con voseo; jugadas con figurines (`figurine()`/`MoveLine`).
- Lógica nueva pura, con tests. `TrainingSession` sigue pura. Stockfish nunca en el entrenamiento.
- Sin `version(3)` de Dexie.
- Pedidos a Chess.com secuenciales y **sin encabezados extra** (el preflight de CORS de Chess.com solo admite `Origin`). Se quita `If-None-Match`.
- `forceDue` por un desvío solo si la partida terminó hace **30 días o menos** (`end_time`). Rige también para la sincronización normal.
- Agregar al repertorio siempre pasa por `ImportPreview`: no pisa jugadas, nombres ni textos.
- Toques de 44 px, 390 px de ancho, claro y oscuro con tokens.
- `npm test`, `npm run typecheck`, `npm run build` y `E2E_PORT=<asignado> npm run e2e` en verde.
- Se trabaja en la rama `partidas`. **Push a `main` solo con confirmación del usuario.**
- Commits en español con trailer de atribución propio.
- Si cambia `PLAN.md` (fuente de verdad), se actualiza en el mismo cambio. Esto aplica a la Tarea 7.

## Review Focus

1. **Miles de partidas:** la lista nunca dibuja todas. La paginación con filtro devuelve las páginas correctas y el contador coincide. → Tarea 2.
2. **Cancelar a mitad de la carga del historial y reanudar:** sigue desde el mes donde se cortó, sin repetir ni saltear meses. → Tarea 1.
3. **Chess.com responde 429 o se corta la red a mitad de la carga:** se detiene con un mensaje y guarda los meses ya leídos. → Tarea 1.
4. **Partida que no arranca en la posición inicial (`[FEN]`):** el visor lo explica, y la agregación y el recorte la ignoran. → Tarea 3.
5. **Transposiciones y repeticiones en la agregación:** el árbol no entra en bucle y cada posición propia tiene una sola jugada. → Tarea 3.

---

### Tarea 1: Sincronización (sin ETag, regla de 30 días, carga hacia atrás)

**Files:** Modify `src/games/chesscom.ts`, `src/games/sync.ts`; Test `src/games/sync.test.ts` (nuevo; `fetch` simulado con `vi.stubGlobal`, `fake-indexeddb/auto`).

**Interfaces — Produces:**
- `fetchMonth(url: string, opts?: { retryDelayMs?: number }): Promise<ChesscomGame[]>`: sin ETag y sin encabezados (`fetch(url)` a secas). Si recibe 429, espera `retryDelayMs` (5000 por defecto; los tests pasan 0) y reintenta **una** vez; si falla de nuevo, `Error('Chess.com pidió esperar un poco.')`. `chesscomMonths` sigue siendo `Record<string, string>` (el tipo no cambia; el valor deja de usarse y se actualiza el comentario en `src/types.ts`).
- `olderArchives(archives: string[], loadedMonths: string[], count: number | 'all'): string[]`: los meses de archivo **anteriores al más viejo cargado**, de más nuevo a más viejo, hasta `count`. Con `loadedMonths` vacío, devuelve los últimos `count`.
- `FORCE_DUE_WINDOW_MS = 30 * 86_400_000`, y `shouldForceDue(endTimeMs: number, now: number): boolean`.
- `loadOlderGames(opts: { months: number | 'all'; signal?: AbortSignal; onProgress?: (msg: string, done: number, total: number) => void }): Promise<SyncResult & { remaining: number; cancelled: boolean }>`:
  - registra cada mes en `settings.chesscomMonths` **apenas termina de procesarlo**, así una cancelación o un error conserva lo leído;
  - `remaining` dice cuántos meses más viejos quedan;
  - los desvíos usan `shouldForceDue`.
- `syncChesscom` mantiene su firma y aplica `shouldForceDue`. `chesscomMonths` guarda `''` como valor y la clave es lo que importa.

- [ ] **Step 1: Tests que fallan:**
  - `'una partida de hace 40 días con desvío no hace vencer la tarjeta; una de hace 10 sí'`
  - `'fetchMonth no manda encabezados'`: el mock verifica que no haya `headers`.
  - `'429 reintenta una vez y después falla con mensaje'`
  - `'olderArchives devuelve los meses anteriores al más viejo cargado, de a count'`
  - `'loadOlderGames cancelado a mitad conserva los meses leídos y la segunda llamada sigue desde ahí'`: Review Focus 2.
  - `'si un mes falla, los anteriores quedan guardados y se informa el error'`: Review Focus 3.
- [ ] **Step 2:** `npx vitest run src/games/sync.test.ts` → FAIL.
- [ ] **Step 3: Implementar.** La lógica de "procesar un mes" que hoy está dentro de `syncChesscom` se extrae a una función interna compartida.
- [ ] **Step 4:** `npm test` y `npm run typecheck` en verde.
- [ ] **Step 5:** commit `Partidas: carga del historial, sin ETag y desvíos solo de los últimos 30 días`.

### Tarea 2: Consultas de partidas y recálculo

**Files:** Create `src/games/store.ts`; Test `src/games/store.test.ts`.

**Interfaces — Produces:**
- `type OutcomeFilter = 'todas' | 'desvios' | 'novedades' | 'dentro' | 'fuera'`. `desvios` es `myDeviation`, `novedades` es `gap`, `dentro` es `inBook` o `endOfBook`, y `fuera` es `noBook`.
- `interface GameFilter { color: 'todas' | Side; outcome: OutcomeFilter }`.
- `matchesFilter(row: GameRow, f: GameFilter): boolean`.
- `gamesPage(f: GameFilter, offset: number, limit: number, d?: CavallDB): Promise<GameRow[]>`, con `orderBy('endTime').reverse().filter().offset().limit()`.
- `countGames(f: GameFilter, d?: CavallDB): Promise<number>`.
- `recalcGames(onProgress?: (done: number, total: number) => void, d?: CavallDB): Promise<{ games: number; gaps: number }>`:
  - recalcula `outcome` con `analyzeGame` contra `loadGraph` del color de cada partida;
  - vacía `gaps` y la reconstruye: `count`, `lastSeen` = máximo `endTime`, `lastGameUrl` = partida más reciente;
  - trabaja en tandas de 200 y cede el hilo entre tandas;
  - **nunca** llama a `forceDue`.

- [ ] **Step 1: Tests que fallan:**
  - `'gamesPage pagina en orden de fecha y aplica color y resultado'`: 120 filas, página 2 con filtro.
  - `'countGames coincide con la suma de las páginas'`: Review Focus 1.
  - `'recalcGames actualiza resultados y reconstruye huecos sin eventos nuevos'`: verifica que `events` no cambia.
- [ ] **Step 2–4:** FAIL → implementar → `npm test` en verde.
- [ ] **Step 5:** commit `Partidas: consultas paginadas, filtros y recálculo`.

### Tarea 3: Jugadas, recorte y agregación (puro)

**Files:** Create `src/games/gamePgn.ts`, `src/games/aggregate.ts`; Test `src/games/aggregate.test.ts`.

**Interfaces — Produces:**
- `interface GameMove { san: string; uci: string; fromEpd: string; epd: string }`.
- `gameMoves(pgn: string): GameMove[] | null`: la línea principal desde la posición inicial. Devuelve `null` si la partida tiene `[FEN]` distinto del inicial o si no se puede leer.
- `gamePgnUntil(pgn: string, plies: number): string | null`: un PGN de una sola partida con las primeras `plies` jugadas. Encabezados mínimos: `[Event "…"]` con "vs <rival>" si está.
- `interface GameForBuild { pgn: string; myColor: Side; result: string; endTime: number }`.
- `buildFromGames(games: GameForBuild[], side: Side, opts: { maxOwnMoves: number; minRival: number; since?: number }): { pgn: string; gamesUsed: number }`. Algoritmo:
  - Usa solo las partidas de `side` con `endTime >= since` y con `gameMoves` no nulo.
  - Cuenta las jugadas por posición, con clave EPD (transposiciones incluidas). En las jugadas propias suma un puntaje: 1 si ganó, 0,5 si fue tablas, 0 si perdió.
  - Recorre desde la posición inicial.
  - **Posición propia:** la jugada con más partidas. En empate gana el mejor puntaje medio y después el orden alfabético del SAN. Es **una sola jugada**.
  - **Posición del rival:** las jugadas con `count >= minRival`, de mayor a menor. La primera va como línea principal y las demás como variantes `( … )`.
  - Corta al llegar a `maxOwnMoves` jugadas propias en la rama, cuando no hay jugadas o cuando la posición ya se visitó en esa rama (evita repeticiones).
  - `gamesUsed` cuenta las partidas que aportaron al menos una jugada al árbol.
  - Devuelve `pgn: ''` si no hay nada.

- [ ] **Step 1: Tests que fallan:**
  - `'gameMoves da EPD y UCI de cada jugada; null con FEN inicial distinto'`: Review Focus 4.
  - `'gamePgnUntil corta en la jugada pedida y buildImportPlan lo lee'`
  - `'buildFromGames elige tu jugada más jugada y desempata por resultado'`
  - `'buildFromGames incluye respuestas del rival desde minRival y respeta maxOwnMoves'`
  - `'buildFromGames con transposiciones y repeticiones termina y deja una jugada propia por posición'`: arma un plan con `buildImportPlan` y verifica `ignoredOwnVariations === 0`. Es el Review Focus 5.
  - `'buildFromGames ignora otro color y partidas viejas'`
- [ ] **Step 2–4:** FAIL → implementar → `npm test` en verde.
- [ ] **Step 5:** commit `Partidas: jugadas, recorte y repertorio desde muchas partidas`.

### Tarea 4: Entrenar una sola tarjeta

**Files:** Modify `src/screens/Train.tsx` (Props `card?: string`), `src/App.tsx` (pasa `route.params.get('card')`), `src/db/repo.ts`; Test `src/db/repo.test.ts`.

**Interfaces — Produces:**
- `ensureDue(cardId: string, d?: CavallDB): Promise<boolean>`: si la tarjeta existe (`d.cards.get`), **no es nueva** (`State.New`: un `forceDue` no la haría vencer, se aprende) y no está vencida (`isDue` con la hora actual), llama a `forceDue(cardId, 'game')` y devuelve `true`. En cualquier otro caso no agrega eventos y devuelve `false`.
- Con `card`, `TrainScreen` arma `new TrainingSession(graphs, [card], fresh, 'review', cb)`. Si la tarjeta es nueva, va en `fresh` para el modo aprender. Si no existe en el grafo, muestra "No hay nada para repasar ahora.".
- Ruta: `#/train?card=<encodeURIComponent(id)>`.

- [ ] **Step 1: Tests que fallan:**
  - `'ensureDue fuerza solo si no estaba vencida'`
  - `'ensureDue con una tarjeta nueva o inexistente devuelve false sin eventos'`
- [ ] **Step 2–4:** FAIL → implementar (repo y Train) → `npm test` y `npm run typecheck` en verde.
- [ ] **Step 5:** commit `Entrenar: sesión de una sola tarjeta`.

### Tarea 5: Visor de partida y agregar hasta acá

**Files:** Create `src/screens/GameViewer.tsx`, `src/screens/GameAdd.tsx`; Modify `src/App.tsx` (rutas `#/games/<id>` y `#/games/<id>/agregar?hasta=<n>`, sin barra de pestañas) y `src/screens/Games.tsx` (`GameItem` navega al visor en vez de abrir chess.com); Test `e2e/games.spec.ts` con la API simulada.

**Interfaces — Consumes:** `gameMoves` y `gamePgnUntil` (Tarea 3), `ensureDue` y `#/train?card=` (Tarea 4), `analyzeGame` (existente), `ImportPreview` (existente; con `key` según el PGN), `Board`, `MoveLine`, `EnginePanel` y `figurineText`.

**Comportamiento:**
- **Carga:** el visor lee la partida de `db.games` por id. Si no existe, muestra "No encontramos esa partida" con un enlace a Partidas.
- **Cabecera:** "vs <rival>", color, ritmo, resultado, fecha y "Ver en Chess.com" (enlace externo).
- **Partida que no arranca en la posición inicial:** si `gameMoves` es `null`, muestra "Esta partida no empieza desde la posición inicial" y solo el enlace.
- **Resultado actual:** se calcula con `analyzeGame` sobre el grafo del color propio (`useGraphs`).
- **Posición inicial del visor:**
  - con `myDeviation` o `gap`, abre en `ply = outcome.ply`, la posición **antes** de la jugada de salida;
  - con `endOfBook`, en `ply`;
  - en otro caso, en 0.

  La jugada de salida se resalta en la lista: `text-bad` si es un desvío, `text-brass` si es una novedad.
- **Aviso arriba:**
  - con desvío: "Acá jugaste ♘c3; en tu repertorio va ♗b5", con "Repasar ahora";
  - con novedad: "El rival jugó ♘c3 y tu repertorio no lo cubría", con "Preparar respuesta" (→ `#/repertoire/<side>?node=…&gap=…`, como `GapItem`) y "Agregar la novedad y tu respuesta" (→ `agregar?hasta=ply+2`, si la partida tiene esas jugadas);
  - en los dos casos, "Ir a esa jugada".
- **Repasar ahora:** `await ensureDue(cardId)` y después `navigate('/train?card=…')`.
- **Navegación y análisis:** ◀ ▶ de 56 px y "Analizar" (`EnginePanel`), como en el visor de líneas. El botón fijo "Agregar al repertorio hasta acá" lleva a `agregar?hasta=<ply actual>` y queda deshabilitado con `ply === 0`.
- **`GameAdd`:** `ImportPreview` con `pgn = gamePgnUntil(pgn, hasta)`, `side = myColor` y `title = "Agregar desde la partida"`. Al guardar muestra `showToast("Sumaste …")` y vuelve al visor.

- [ ] **Step 1: e2e que falla.** El test `'partidas: abrir una partida, ver la salida del repertorio y agregarla'` arma la API simulada con `page.route('https://api.chess.com/**')`: archivos de un mes y un JSON con 2 partidas PGN del usuario `tester`. Después:
  1. carga un repertorio corto por "Pegar PGN" y configura el usuario;
  2. aprieta "Actualizar partidas" y abre la primera partida;
  3. verifica el aviso de novedad y aprieta "Agregar la novedad y tu respuesta";
  4. guarda en la vista previa y espera el aviso "Sumaste".
- [ ] **Step 2:** implementar. Revisar en capturas a 390 px, en claro y oscuro.
- [ ] **Step 3:** `npm run typecheck`, `npm test`, `npm run build` y `E2E_PORT=<asignado> npm run e2e` en verde.
- [ ] **Step 4:** commit `Partidas: visor de partida y agregar al repertorio desde una partida`.

### Tarea 6: Lista paginada, historial, recálculo y armar desde muchas

**Files:** Modify `src/screens/Games.tsx` y `src/App.tsx` (ruta `#/games/armar`); Create `src/screens/BuildFromGames.tsx`; Test `e2e/games.spec.ts` (otro `test` en el mismo archivo; ojo con choques de merge con la Tarea 5: cada tarea agrega su propio `test`).

**Interfaces — Consumes:** `gamesPage`, `countGames`, `recalcGames` y `GameFilter` (Tarea 2); `loadOlderGames` (Tarea 1); `buildFromGames` (Tarea 3); `ImportPreview`.

**Comportamiento:**
- **Lista:**
  - `Segmented` de color (Todas, Blancas, Negras) y selector de resultado (Todas, Desvíos, Novedades del rival, Dentro del repertorio, Fuera del repertorio);
  - contador "N partidas", páginas de 50 con "Ver más";
  - cada fila lleva al visor (Tarea 5) y mantiene la información de hoy.
- **Historial:** "Cargar partidas anteriores (6 meses)" y "Cargar todo el historial".
  - Mientras carga se ve la barra de progreso "Leyendo 2023-04 · 5 de 18" y el botón "Cancelar" (`AbortController`).
  - Al terminar: "Sumaste N partidas" y, si quedan meses, "Quedan M meses más viejos".
- **Recálculo:** el botón "Recalcular contra el repertorio actual" muestra progreso y no traba la pantalla.
- **Armar desde muchas partidas:** el botón "Armar repertorio desde tus partidas" lleva a `#/games/armar`. `BuildFromGames` ofrece:
  - color;
  - profundidad, con un control numérico de 4 a 15 y 8 por defecto;
  - "mínimo de partidas para una respuesta del rival", de 1 a 10 y 2 por defecto;
  - período: últimos 3 meses, 12 meses o todo lo cargado.

  "Ver vista previa" usa `buildFromGames` sobre `db.games` y muestra `ImportPreview` (con `key`). Arriba va "A partir de K partidas." y un `Banner`: "Esto copia lo que jugaste, incluidos los errores: revisá las líneas con el motor en el editor." Si el PGN queda vacío: "No hay suficientes partidas con ese filtro."

- [ ] **Step 1: e2e que falla.** El test `'partidas: historial, filtros y armar repertorio desde muchas'` usa la API simulada con 3 meses de archivos y 4 partidas. Después:
  1. sincroniza;
  2. aprieta "Cargar todo el historial";
  3. filtra por Negras y verifica el contador;
  4. aprieta "Armar repertorio desde tus partidas", luego "Ver vista previa", y espera "Se agregan" y "A partir de".
- [ ] **Step 2:** implementar. Revisar en capturas a 390 px, en claro y oscuro.
- [ ] **Step 3:** `npm run typecheck`, `npm test`, `npm run build` y `E2E_PORT=<asignado> npm run e2e` en verde.
- [ ] **Step 4:** commit `Partidas: lista paginada con filtros, historial completo y repertorio desde tus partidas`.

### Tarea 7: Documentación y verificación

**Files:** Modify `PLAN.md` (sección Partidas: visor, historial, regla de 30 días, armar desde partidas; números de pruebas), `AGENTS.md` (Integraciones: Chess.com sin ETag por CORS, `loadOlderGames`, `store.ts`, `aggregate.ts`, rutas nuevas) y `README.md` ("Qué hace").

- [ ] **Step 1:** actualizar los documentos.
- [ ] **Step 2:** verificación completa: `npm run typecheck`, `npm test`, `npm run build` y `npm run e2e`. Pegá la salida en el informe.
- [ ] **Step 3:** commit `Documentación: partidas de Chess.com`.
- [ ] **Step 4:** preguntarle al usuario si se mergea a `main` y se publica.

## Paralelismo **[decisión]**

- Las Tareas 1 a 4 corren en paralelo, porque tocan archivos distintos. La 4 toca `App.tsx` y `Train.tsx`.
- Las Tareas 5 y 6 corren en paralelo después. Las dos tocan `App.tsx` (rutas distintas) y agregan un `test` a `e2e/games.spec.ts`: el choque se resuelve al mergear, conservando las dos.
- La Tarea 7 va al final.
- La simulación de la API es la misma para las Tareas 5 y 6: cada una la escribe en `e2e/chesscomMock.ts` con la misma firma, `mockChesscom(page, { user, months: Record<'YYYY/MM', pgn[]> })`. **[decisión]** Se crea en la Tarea 5. La Tarea 6 la crea igual si todavía no existe en su base, y al mergear se queda una sola versión.
