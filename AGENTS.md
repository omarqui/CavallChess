# AGENTS.md

Guía para agentes de código que trabajan en CavallChess: PWA personal (iPhone) para construir, memorizar con FSRS y auditar contra partidas de Chess.com un repertorio de aperturas. Las decisiones de producto están en `PLAN.md` (fuente de verdad); si un cambio las contradice, actualizá `PLAN.md` en el mismo cambio.

Interfaz, comentarios y mensajes en **español rioplatense** (voseo: "jugá", "tenés").

## Comandos

```bash
npm install
npm run dev                 # Vite en :5173 (copia antes el motor a public/engine)
npm run typecheck           # tsc --noEmit (TypeScript 7 nativo, sin project references)
MOTOR=1 npm run biblioteca:motor   # verifica con Stockfish las fichas con hash desactualizado y reescribe content/biblioteca/verificacion.json (PowerShell: $env:MOTOR=1); no corre en CI
npm test                    # vitest: todos los unitarios (entorno node)
npx vitest run src/trainer/session.test.ts            # un archivo
npx vitest run -t "fallo: hay que jugar la correcta"  # un test por nombre
npm run build               # motor + typecheck + build en dist/ (+ service worker)
npm run e2e                 # Playwright (viewport iPhone 13, Chrome del sistema)
npx playwright test -g "negras"                       # un e2e por nombre
LIVE=1 npm run test:live    # contra las APIs reales de Lichess y Chess.com (en PowerShell: $env:LIVE=1)
npm run eco                 # regenera src/data/eco.json desde scripts/eco-src/*.tsv
npm run icons               # regenera iconos PWA desde public/favicon.svg
```

- **El e2e sirve `dist/` con `vite preview` y reutiliza un servidor ya levantado en :4173** (`E2E_PORT=4180 npm run e2e` usa otro puerto, útil si hay un preview viejo que no querés matar). Corré `npm run build` antes; si quedó un preview viejo corriendo, el e2e prueba el build anterior.
- El e2e usa `channel: 'chrome'` (no descarga navegadores) y bloquea service workers. Los toques al tablero se hacen por coordenadas (`e2e/helpers.ts`); el helper espera `.board-frame[data-interactive="true"]`, así que ese atributo no se puede quitar de `Board`.
- Con el repertorio vacío la app abre la bienvenida (`#/intro`). Cada e2e arranca con `page.goto('/')` y `await skipIntro(page)`, y recién después navega a su ruta. El viewport de iPhone trae su user agent, así que la bienvenida muestra el paso de instalar salvo que el test simule `navigator.standalone`.
- Los e2e de partidas usan la API de Chess.com simulada de `e2e/chesscomMock.ts` (`page.route` sobre `https://api.chess.com/**`): no tocan la red.
- En Git Bash, `BASE_PATH=/CavallChess/` se convierte en ruta de Windows: usá `MSYS_NO_PATHCONV=1`.

## Arquitectura

### Modelo: un grafo de posiciones por color

- Clave de posición = EPD de chessops (`epdOf` en `src/chess/position.ts`): FEN sin contadores y con casilla al paso **solo si la captura es legal**. Nunca uses `pos.epSquare` como clave.
- IDs deterministas: nodo `${side}|${epd}`, jugada `${side}|${epd}|${uci}`. El UCI está **normalizado como chessops** (enroque = rey→torre, `e1h1`). Lo que llega del tablero (`e1g1`) se normaliza con `playUci`; para dibujar flechas o la última jugada usá `displaySquares`.
- Regla: **a lo sumo una jugada propia (`mine`) por posición**; del rival, todas.
- Todo lo derivado vive en `RepertoireGraph` (`src/chess/graph.ts`) y **no se guarda**: alcanzable/archivado (BFS desde la inicial), "más allá del corte" (`cutHere`), orden DFS, caminos más cortos, subárboles, etiquetas por raíces nombradas. Borrar o reemplazar una jugada no borra el subárbol: queda inalcanzable (archivado) y revive si se vuelve a jugar.

### Tarjetas y log (FSRS)

- Tarjeta = jugada propia (`cardId` = id de la jugada). Al reemplazar la jugada propia, la arista vieja se borra pero **su tarjeta se conserva**; al volver a jugarla, el mismo id la revive con su historial.
- La fuente de verdad es la tabla `events` (append-only: `rating` o `forceDue`); `cards` es una caché. `rate`/`forceDue` (`src/db/repo.ts`) escriben ambos en una transacción, y `importBackup` reconstruye las tarjetas con `replay`.
- `src/srs/scheduler.ts` usa `enable_fuzz: false` (la reproducción del log tiene que ser determinista) y `enable_short_term: false` (la repetición inmediata la hace la sesión). Cambiar parámetros de FSRS cambia el resultado de reproducir el log.
- El día de estudio corta a las 04:00 (`src/srs/day.ts`); "vence hoy" se define en `isDue`, y la racha cuenta días con los vencidos en cero (`markDayComplete`, disparado desde Inicio).

### Importación (pura → diff → transacción)

`buildImportPlan` (`src/chess/pgnImport.ts`) recorre el PGN: en posiciones propias toma solo la principal (o la existente si hay conflicto y se resuelve "conservar"); del rival, todas las variantes. Es pura y se vuelve a ejecutar cada vez que cambia una resolución en la vista previa. `applyPlan` traduce el plan a altas, bajas y nombres, sin pisar textos existentes, y `commitImport` lo aplica en una transacción de Dexie creando las tarjetas. En los tests, una variante `( … )` va justo después de la jugada que reemplaza.

### Entrenamiento

`TrainingSession` (`src/trainer/session.ts`) es una máquina de estados **pura**: recibe jugadas UCI y devuelve `Step` con `line` (camino desde la inicial), `animateFrom` y `replay`. Decide la respuesta del rival (la rama con más pendientes), encadena, reencola los fallos y emite `rate`/`forceDue` por callbacks. El feedback de cada respuesta lleva la trampa de la jugada (`trap`, vía `trapOf`: trampa en contra en la jugada misma, trampa a favor en la jugada anterior del rival). `src/screens/Train.tsx` solo anima los `Step`, muestra ese aviso y bloquea el tablero mientras anima o vuelve atrás (`animating`/`locked`). La lógica nueva va en la sesión, con tests, no en el componente.

La cola diaria (`buildDailyQueue`, `src/srs/queue.ts`) pone primero las vencidas en orden DFS y completa con las nuevas alternando blancas y negras (cada color en DFS). Solo cambia el orden en que entran las nuevas, no el log.

### Biblioteca (fichas de aperturas)

- **Contenido:** 46 fichas en `content/biblioteca/{blancas,negras}/<id>.md`, una por apertura: frontmatter, secciones de texto y líneas (variantes y trampas) en bloques ` ```pgn `. El contrato del formato, las reglas de validación y un ejemplo completo están en `content/biblioteca/README.md`: leelo antes de escribir o tocar una ficha. Todo el texto es original (nada copiado de libros ni de sitios).
- **Parser en tiempo de ejecución:** no hay paso de compilación ni archivos generados. `src/library/bundle.ts` toma los `.md` con `import.meta.glob` (texto crudo), `parse.ts` los convierte en `Ficha` (jugadas con EPD, raíz de cada variante, `trapPly`, caída de las trampas en contra) y `validate.ts` aplica las reglas; `catalog.ts` arma el catálogo (`useLibrary`, `useFicha`, agrupar, buscar). En la app solo se parsea (en desarrollo, además, se valida una vez para avisar en la consola): la validación la garantiza `content.test.ts` en CI, que exige que las 46 pasen. Una ficha que no parsea no entra al catálogo. La carga (`createLibraryStore`) tiene tres estados: `useLibrary` devuelve `{ fichas, error, retry }` y las pantallas muestran "No se pudo cargar la biblioteca" con "Reintentar"; si falla, la promesa no queda guardada, y como el navegador no vuelve a pedir un `import()` fallido, el reintento recarga la página si hace falta.
- **`nombrar-raiz: no`:** para fichas con posición característica genérica (`1. e4`, `1. d4`, `1. e4 c5`). La ficha no nombra esa posición y cada variante se llama `<ficha>: <variante>` (`fichaNames` en `src/library/pgn.ts`). Sin esto, el nombre se antepondría a todo el repertorio que pase por ahí.
- **Cómo viajan `[%hint]` y `[%trap]`:** al agregar una ficha, `fichaPgn` (`src/library/pgn.ts`) la convierte en un PGN con un capítulo por línea (básicas, club, trampas a favor y trampas en contra; sin la caída de estas últimas). Las pistas salen como `[%hint …]` y la jugada marcada de cada trampa como `[%trap <favor|contra> <fichaId>/<trapId> <nombre>]` (a favor: el error del rival; en contra: tu jugada correcta). `commentOf` (`src/chess/pgnImport.ts`) los saca del comentario antes de armar la explicación y los deja en `hint` y `trap` de la jugada del plan; `applyPlan` los guarda en `MoveEdge.hint` y `MoveEdge.trap` (`TrapMark`, sin índice, no pisa lo existente). Por eso el mismo camino sirve para un PGN de Lichess con esas marcas.
- **Estado en tu repertorio:** se calcula (`src/library/status.ts`), no se guarda: una línea está agregada si cada jugada propia existe como propia en una posición alcanzable (`mineEdge` también devuelve las archivadas) y, en las trampas, si además la jugada `moves[trapPly]` lleva la marca `trap`; sin la marca queda parcial, y agregar la ficha la completa. `findFichasForMove` enlaza los huecos de Chess.com con las fichas ("Mirá la ficha" en `Games.tsx`).
- **Notas:** tabla `notes` (id = `fichaId` o `fichaId|lineaId`, ver `noteId` y `saveNote` en `repo.ts`); una nota vacía se borra, y las de líneas que ya no existen se muestran aparte (`orphanNotes`). El respaldo es de versión 2 e incluye las notas; los de versión 1 se importan igual.
- **Verificación mecánica (CI):** `npm test` comprueba estructura, legalidad, coherencia (una jugada propia por posición entre líneas), estructura de trampas e `id`.
- **Verificación con motor, versión 2 (fuera de CI):** `src/library/motor.test.ts` corre Stockfish en Node (`engine-node.ts`, profundidad 18) solo con `MOTOR=1`, y solo para las fichas sin una entrada vigente en `verificacion.json`; una ficha que falla no se registra. Mide desde el lado de la ficha: el final de cada variante ≥ −0,7 peones (≥ −1,5 si es gambito), el de cada trampa a favor ≥ +2, y en las trampas en contra la jugada correcta ≥ −0,5 y el final de la caída ≤ −2. La versión 2 suma tres chequeos: la posición previa a la trampa, la posición tras el error marcado y la primera jugada de la caída (los detalles van en `content/biblioteca/README.md`). El hash (`fichaHash`, `src/library/hash.ts`) cubre solo las jugadas y la estructura de las líneas (id, tipo, gambito, caída y `trapPly`), no el texto: corregir un texto no obliga a verificar de nuevo, cambiar una jugada sí. Una verificación vale si coinciden el hash **y** la versión 2 (`entradaVigente`). Los umbrales y `VERSION_VERIFICACION` viven en `src/library/thresholds.ts`.
- **Visor y texto:** `src/screens/LineViewer.tsx` muestra una línea con tablero, lista de jugadas, comentario y flechas, más el análisis (`EnginePanel`). `RichText` renderiza el subconjunto de Markdown de las fichas y muestra con figurines las jugadas entre comillas invertidas. `figurineText` convierte a figurines las jugadas SAN sueltas con letra de pieza en texto plano (comentarios del visor, explicaciones y pistas del entrenamiento). Por eso en los comentarios PGN **no** van comillas invertidas: quedarían a la vista, y `validateFicha` las rechaza. `MiniBoard` dibuja las miniaturas sin chessground.
- **Agregar una ficha:** `FichaAdd.tsx` arma el plan con `fichaPgn` + `buildImportPlan` y lo muestra con `ImportPreview` (extraído de `Import.tsx`); `addFicha` (`src/library/add.ts`) lo confirma. Con el repertorio vacío, la bienvenida lo hace sin vista previa.

### Bienvenida y tips

- `src/screens/Intro.tsx` (`#/intro`) es la bienvenida. Las aperturas que ofrece están en `src/screens/intro/choices.ts` y tienen que ser compatibles entre sí. `intro/gate.ts` concentra las reglas: cuándo aparece (`shouldShowIntro`: sin tarjetas y sin `introSeenAt`), cuándo se marca vista sola (`shouldMarkIntroSeen`: ya hay tarjetas), si muestra el paso de instalar (`needsInstallStep`: iPhone o iPad sin `standalone`) y cuándo se ve un tip (`tipVisible`: después de la bienvenida y una sola vez). `src/ui/Tip.tsx` es el aviso (`Banner` + "Entendido"); `introSeenAt` y `tipsSeen` viven en ajustes y "Ver la introducción" en Ajustes los reinicia.

### Datos y UI

- Dexie (`src/db/db.ts`, versión 2: la 2 suma la tabla `notes`). Si cambiás el esquema, agregá una `version(n)` nueva; no edites la existente.
- `src/db/hooks.ts`: consultas en vivo **separadas** (grafos, tarjetas, eventos, ajustes) para que calificar no reconstruya los grafos.
- Router por hash (`src/ui/router.ts`) porque GitHub Pages no reescribe rutas.
- `Board` (`src/ui/Board.tsx`) envuelve chessground de forma imperativa. Para devolver el tablero a `epd` cuando la prop no cambió (después de una jugada incorrecta), incrementá `syncKey`.
- Estilos: tokens en `src/index.css` (`@theme` de Tailwind 4 sobre variables CSS; el modo oscuro va con `html[data-scheme]`). `src/themes.css` (tableros y sets de piezas) se generó una vez y se edita a mano.

### Integraciones

- **Chess.com** (`src/games/`): archivos mensuales, pedidos secuenciales, todos los ritmos, variantes excluidas. **Sin ETag ni encabezados propios:** el preflight de CORS de Chess.com solo admite `Origin` (y no expone `ETag`), así que cada pedido es un `fetch(url)` a secas (`fetchMonth`; un 429 espera y reintenta una vez). `analyzeGame` recorre el grafo entrenable hasta la primera salida: un desvío propio genera `forceDue` y una novedad del rival va a la tabla `gaps`.
  - **Sincronización** (`sync.ts`): `syncChesscom` baja lo nuevo y `loadOlderGames({ months | 'all', signal, onProgress })` carga hacia atrás los meses sin leer anteriores al más nuevo ya cargado, completando los huecos (`olderArchives`). Cada mes se registra en `chesscomMonths` apenas se procesa entero (mezclando con lo guardado), así que cancelar (la señal llega a `fetch`, a la espera del 429 y se mira entre partidas; un mes cortado no se registra y se relee sin duplicar) o un error de red o un 429 conservan lo leído y la próxima llamada sigue desde ahí. Cancelar devuelve `cancelled: true` sin lanzar; sin red, `fetchArchives`/`fetchMonth` lanzan "No se pudo conectar con Chess.com. Revisá tu conexión.". **Cambio de usuario:** `archivesToFetch`/`olderArchives` solo miran las claves de `/<usuario>/games/`, y `markMonth` (y `lastChesscomSync`) escriben en una transacción solo si `chesscomUser` sigue siendo el mismo; si cambió, la carga se corta. `shouldForceDue(endTime, now)`: el desvío solo hace `forceDue` si la partida terminó hace 30 días o menos (`FORCE_DUE_WINDOW_MS`), también en la sincronización normal.
  - **De a una** (`lock.ts`): `syncChesscom`, `loadOlderGames` y `recalcGames` pasan por `runExclusive` (cadena de promesas del módulo; no es reentrante: una función envuelta no puede llamar a otra), así la sincronización automática al abrir no se pisa con una carga o un recálculo. `isBusy()` dice si hay algo corriendo o esperando.
  - **Consultas** (`store.ts`): `gamesPage`/`countGames` con `GameFilter` (color y resultado), con `orderBy('endTime').reverse().filter().offset().limit()` de Dexie; sin filtro (`todas`/`todas`) cuentan y saltan sobre el índice `endTime` sin `filter()` (el total sale del mismo índice que las páginas), para no leer cada fila con su PGN. La UI nunca carga todas las partidas. Un `endOfBook` en la jugada 0 guardado antes cuenta como `noBook` (`outcomeKind`; `analyzeGame` ya no lo devuelve). `recalcGames` vuelve a cruzar todas con el repertorio actual, cede el hilo entre tandas y cada ~40 ms, **reconstruye `gaps` desde cero** (incluye las partidas que otra pestaña agregue mientras corre) y **nunca llama a `forceDue`**.
  - **Funciones puras** (`gamePgn.ts`, `aggregate.ts`): `gameMoves` (línea principal con EPD y UCI; `null` si trae `[FEN]` distinto del inicial o no se lee), `gamePgnUntil` (PGN de una sola partida cortado en N jugadas) y `buildFromGames` (PGN para armar repertorio desde muchas partidas: una sola jugada propia por posición, la más jugada con desempate por resultado y hasta `maxOwnMoves`; del rival, las respuestas con al menos `minRival` partidas; cada posición se expande una sola vez, así que transposiciones y repeticiones no entran en bucle).
  - **Repasar una partida:** `ensureDue(cardId)` (`db/repo.ts`) deja vencida la tarjeta con `forceDue(…, 'game')` solo si hace falta (no toca las nuevas ni las ya vencidas) y `#/train?card=<id>` arma una sesión con esa sola tarjeta (`Train`, prop `card`; si no es entrenable, la cola queda vacía).
  - **Rutas** (la pestaña sigue siendo `games`): `#/games/<encodeURIComponent(id)>` (visor, `GameViewer`), `#/games/<id>/agregar?hasta=<n>` (`GameAdd`) y `#/games/armar` (`BuildFromGames`); el id es una URL codificada, así que no choca con `armar`. Agregar desde partidas siempre pasa por `ImportPreview` con `proposeNames={() => []}` (no se nombra la raíz con el rival), así que no pisa jugadas ni textos.
- **Lichess** (`src/integrations/lichess.ts`): exportación de estudios (los privados necesitan token `study:read`) y explorador en `explorer.lichess.org`, que **siempre exige token**.
- **Stockfish 19 lite single-thread** (`src/engine/stockfish.ts`): `npm run engine` lo copia a `public/engine/` (no versionado) y se carga por URL con `import.meta.env.BASE_URL`. Hay un solo worker, y una búsqueda nueva espera el `bestmove` de la anterior. Nunca se usa durante el entrenamiento.
- **Nombres ECO**: `src/data/eco.json` se carga a demanda (`useEco`).

## Publicación y licencias

- **Cada push a `main` publica**: `.github/workflows/deploy.yml` corre `npm test`, compila con `BASE_PATH=/<repo>/` y despliega en https://omarqui.github.io/CavallChess/. Las rutas tienen que respetar el base path (`import.meta.env.BASE_URL`, rutas relativas en el manifest).
- La app es **GPL-3.0** (chessground, chessops y Stockfish). Solo se agregan assets compatibles: piezas cburnett y Mérida (GPLv2+) y Chessnut (Apache-2.0). Muchos sets de Lichess son CC BY-NC-SA: no se agregan.
- El token de Lichess nunca entra en los respaldos (`exportBackup` lo excluye).
