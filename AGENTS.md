# AGENTS.md

Guía para agentes de código que trabajan en CavallChess: PWA personal (iPhone) para construir, memorizar con FSRS y auditar contra partidas de Chess.com un repertorio de aperturas. Las decisiones de producto están en `PLAN.md` (fuente de verdad); si un cambio las contradice, actualizá `PLAN.md` en el mismo cambio.

Interfaz, comentarios y mensajes en **español rioplatense** (voseo: "jugá", "tenés").

## Comandos

```bash
npm install
npm run dev                 # Vite en :5173 (copia antes el motor a public/engine)
npm run typecheck           # tsc --noEmit (TypeScript 7 nativo, sin project references)
MOTOR=1 npm run biblioteca:motor   # verifica las fichas de la biblioteca con Stockfish y escribe content/biblioteca/verificacion.json (PowerShell: $env:MOTOR=1)
#   verifica también la posición previa al error del rival en las trampas a favor; las entradas llevan `version` (ver content/biblioteca/README.md)
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

- **El e2e sirve `dist/` con `vite preview` y reutiliza un servidor ya levantado en :4173.** Corré `npm run build` antes; si quedó un preview viejo corriendo, el e2e prueba el build anterior.
- El e2e usa `channel: 'chrome'` (no descarga navegadores) y bloquea service workers. Los toques al tablero se hacen por coordenadas (`e2e/helpers.ts`); el helper espera `.board-frame[data-interactive="true"]`, así que ese atributo no se puede quitar de `Board`.
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

`TrainingSession` (`src/trainer/session.ts`) es una máquina de estados **pura**: recibe jugadas UCI y devuelve `Step` con `line` (camino desde la inicial), `animateFrom` y `replay`. Decide la respuesta del rival (la rama con más pendientes), encadena, reencola los fallos y emite `rate`/`forceDue` por callbacks. `src/screens/Train.tsx` solo anima los `Step` y bloquea el tablero mientras anima o vuelve atrás (`animating`/`locked`). La lógica nueva va en la sesión, con tests, no en el componente.

### Datos y UI

- Dexie (`src/db/db.ts`, versión 1). Si cambiás el esquema, agregá una `version(n)` nueva; no edites la existente.
- `src/db/hooks.ts`: consultas en vivo **separadas** (grafos, tarjetas, eventos, ajustes) para que calificar no reconstruya los grafos.
- Router por hash (`src/ui/router.ts`) porque GitHub Pages no reescribe rutas.
- `Board` (`src/ui/Board.tsx`) envuelve chessground de forma imperativa. Para devolver el tablero a `epd` cuando la prop no cambió (después de una jugada incorrecta), incrementá `syncKey`.
- Estilos: tokens en `src/index.css` (`@theme` de Tailwind 4 sobre variables CSS; el modo oscuro va con `html[data-scheme]`). `src/themes.css` (tableros y sets de piezas) se generó una vez y se edita a mano.

### Integraciones

- **Chess.com** (`src/games/chesscom.ts`, `sync.ts`): archivos mensuales con ETag, pedidos secuenciales, todos los ritmos, variantes excluidas. `analyzeGame` recorre el grafo entrenable hasta la primera salida: un desvío propio genera `forceDue` y una novedad del rival va a la tabla `gaps`.
- **Lichess** (`src/integrations/lichess.ts`): exportación de estudios (los privados necesitan token `study:read`) y explorador en `explorer.lichess.org`, que **siempre exige token**.
- **Stockfish 19 lite single-thread** (`src/engine/stockfish.ts`): `npm run engine` lo copia a `public/engine/` (no versionado) y se carga por URL con `import.meta.env.BASE_URL`. Hay un solo worker, y una búsqueda nueva espera el `bestmove` de la anterior. Nunca se usa durante el entrenamiento.
- **Nombres ECO**: `src/data/eco.json` se carga a demanda (`useEco`).

## Publicación y licencias

- **Cada push a `main` publica**: `.github/workflows/deploy.yml` corre `npm test`, compila con `BASE_PATH=/<repo>/` y despliega en https://omarqui.github.io/CavallChess/. Las rutas tienen que respetar el base path (`import.meta.env.BASE_URL`, rutas relativas en el manifest).
- La app es **GPL-3.0** (chessground, chessops y Stockfish). Solo se agregan assets compatibles: piezas cburnett y Mérida (GPLv2+) y Chessnut (Apache-2.0). Muchos sets de Lichess son CC BY-NC-SA: no se agregan.
- El token de Lichess nunca entra en los respaldos (`exportBackup` lo excluye).
