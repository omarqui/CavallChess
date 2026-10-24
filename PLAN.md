# CavallChess — Entrenador de aperturas

PWA personal para construir, memorizar (repetición espaciada) y auditar contra partidas reales un repertorio de aperturas. Este documento es la fuente de verdad de las decisiones tomadas en la sesión de diseño del 2026-10-24.

## Stack (versiones verificadas 2026-10-24)

| Área | Paquete | Notas |
|---|---|---|
| Base | Vite 8 + React 19 + TypeScript | |
| Estilos | `tailwindcss` 4 + `@tailwindcss/vite` | Tema en CSS con `@theme`, sin `tailwind.config.js` |
| PWA | `vite-plugin-pwa` 2 | Precache incluye `wasm`; límite por archivo ≥ 3 MB |
| Ajedrez | `chessops` 0.15 | `chessops/compat` → `chessgroundDests`; `parsePgn`, `parseComment` |
| Tablero | `@lichess-org/chessground` 10 | El paquete `chessground` está deprecado. Wrapper React propio |
| SRS | `ts-fsrs` 5 | Retención 0,9, parámetros por defecto, learning steps por defecto |
| Datos | `dexie` 4 + `dexie-react-hooks` | IndexedDB, todo local |
| Motor | `stockfish` 19 — build *lite single-thread* | ~1,9 MB, sin COOP/COEP, iOS 16+ |

Licencia: chessground, chessops y Stockfish son GPL-3 ⇒ la app es **GPL-3.0** y se publica en repo público.

## Decisiones

### Datos y dispositivos
- **Local-first, listo para sync.** Sin backend. El progreso es un **log de eventos append-only** (fuente de verdad); la tarjeta FSRS de cada jugada se deriva del log y se cachea. IDs deterministas, así un sync futuro (Dexie Cloud, Supabase) es una capa, no una reescritura.
- **Respaldo:** exportar JSON (repertorio + log) por la hoja de compartir de iOS (Archivos / iCloud Drive), aviso si pasaron > 7 días, importar restaura. `navigator.storage.persist()` al iniciar. El token de Lichess no viaja en el respaldo.

### Modelo
- **Un grafo de posiciones por color** (`white` / `black`). Las "aperturas" son **raíces nombradas anidadas** sobre ese grafo (Siciliana › Najdorf › 6.Bg5). Donde no hay nombre propio se muestra el nombre ECO (dataset `lichess-org/chess-openings`, CC0).
- **Clave de posición:** EPD = `makeFen(setup, {epd: true})` (sin contadores; casilla al paso solo si la captura es legal).
- **Exactamente una jugada propia por posición.** Del rival, todas las que quieras.
- **Tarjeta = jugada propia** (`cardId` = id de la jugada propia). Como hay una por posición, en la práctica es "una tarjeta por posición"; reemplazar la jugada crea una tarjeta nueva y la vieja queda archivada con su historial (si volvés a esa jugada, revive).

```ts
type Side = 'white' | 'black';

interface PositionNode {   // id = `${side}|${epd}`
  side: Side; epd: string; myTurn: boolean;
  name?: string;           // raíz nombrada
  cutHere?: boolean;       // "fin de repertorio": desde acá no se entrena
}
interface MoveEdge {       // id = `${side}|${epd}|${uci}`
  side: Side; fromId: string; toId: string; uci: string; san: string;
  mine: boolean;           // ≤ 1 jugada propia por posición
  hint?: string;           // plan sin nombrar la jugada (manual)
  explanation?: string;    // comentarios del PGN (sin [%cal]/[%csl]/[%anno]/[%clk]/[%eval])
  shapes?: Shape[];        // flechas y círculos del PGN
  nags?: number[];
  createdAt: number;
}
interface ReviewEvent {    // append-only
  seq?: number; cardId: string; at: Date;
  kind: 'rating' | 'forceDue';   // forceDue: desvío en partida o fallo en práctica
  rating?: Rating;               // Again | Hard | Good
  source: 'session' | 'practice' | 'game';
}
interface Gap { id: string; side: Side; epd: string; uci: string; san: string; count: number; lastSeen: number }
```

- **Derivado (no se guarda):** alcanzabilidad desde la posición inicial (lo inalcanzable = **archivado**, con historial intacto), "más allá del corte", orden DFS, conteos de pendientes por subárbol, etiquetas.
- **Edición:** reemplazar o borrar una jugada archiva lo que queda inalcanzable (una transposición que sigue llegando lo mantiene vivo). Vista de archivadas para eliminarlas definitivamente.
- **Profundidad:** se importa todo; "cortar aquí" en una posición la marca como final de línea.

### Entrenador
- **Sesión por tarjetas, con línea animada y encadenada:** la app reproduce rápido (≈150 ms/jugada, un toque salta) el camino más corto desde el inicio hasta la posición; jugás; el rival responde (≈300 ms) eligiendo **la respuesta cuyo subárbol tiene más tarjetas pendientes**; si tu siguiente posición está pendiente, seguís; si hay pendientes más abajo, la app juega tu jugada ya sabida y sigue; si no, salta a la próxima tarjeta.
- **Cola:** primero vencidas, después nuevas (límite diario, 10 por defecto), ambas en orden DFS del grafo.
- **Calificación automática:** acierto al primer intento = Good; acierto tras ver la pista = Hard; error = Again. Al fallar se muestra la correcta con flecha y hay que jugarla; la tarjeta vuelve al final de la sesión. "Fue un error de dedo" anula el fallo mientras no jugaste la correcta.
- **Modo aprender:** una tarjeta nueva primero se **muestra** (jugada con flecha + explicación), y enseguida se **pide**.
- **Modo "¿por qué?":** botón de pista solo si la jugada tiene `hint`; tras responder se muestra la explicación completa y las flechas del PGN.
- **Práctica:** a demanda por raíz nombrada (o todo el color), débiles primero. No registra notas; un fallo genera `forceDue`.

### Importación
- PGN pegado, archivo `.pgn`, o estudio/capítulo de Lichess por URL (token personal opcional con `study:read` para privados/no listados).
- En **posiciones propias** gana la línea principal; tus variantes laterales se ignoran (y se informan). Del **rival** entran todas.
- **Vista previa** antes de guardar: nuevas posiciones/jugadas, conflictos con lo existente (mantener / reemplazar), variantes propias ignoradas, nombre propuesto por capítulo (raíz = primer punto de ramificación de su línea principal, editable).
- Comentarios del PGN → `explanation` (no se pisan textos existentes); `[%cal]`/`[%csl]` → `shapes`.

### Partidas (Chess.com)
- Usuario en ajustes. Primera importación: últimos 3 meses. Luego, al abrir la app (si pasaron > 12 h) y con botón: solo lo nuevo, pedidos secuenciales. Cuentan **todos los ritmos**; se excluyen variantes (`rules !== 'chess'`).
- Se recorre cada partida por el grafo del color con el que jugaste hasta la primera salida:
  - **Desvío tuyo** (otra jugada donde tenías una propia) → `forceDue` de esa tarjeta.
  - **Novedad del rival** (jugada no cubierta) → lista de **huecos**, ordenada por frecuencia.

### Progreso
- **Dominio** por raíz nombrada = % de tarjetas entrenables del subárbol con estabilidad FSRS ≥ 21 días (las nuevas cuentan en el total).
- **Racha:** un día cuenta si los vencidos quedaron en cero; el día corta a las 04:00 locales.
- **Débiles:** jugadas con más fallos (Again) en los últimos 30 días, con su línea.

### Plataforma y acabado
- PWA instalable en iPhone, hosting en **GitHub Pages** (repo público GPL-3.0, deploy con GitHub Action en push a `main`).
- **Motor:** Stockfish lite single-thread en Web Worker, solo en editor y revisión (nunca en el entrenamiento). **Explorador de Lichess** (requiere token) en el editor.
- **Feedback:** la animación lo carga sola (flash de casilla, sacudida al fallar); sonido sintetizado (Web Audio); háptica best-effort (`navigator.vibrate` o truco `<input switch>` en iOS 18+), con ajuste.
- **Notación:** figurines (♘f3). Interfaz en español.
- **Temas:** varios tableros y sets de piezas, modo oscuro (sistema / claro / oscuro).
- **Editor:** el grafo se muestra como árbol desplegado desde el inicio; las transposiciones aparecen como enlace "↪ transpone a…".

## Hitos

1. **Estudiar ya:** tablero; importación con vista previa; "cortar aquí"; Dexie con log; modo aprender; cola FSRS con línea animada; respaldo JSON.
2. **Profundizar:** modo "¿por qué?"; editor completo (reemplazar/archivar, raíces nombradas); práctica; panel de progreso.
3. **Extras:** Chess.com y huecos; Stockfish; explorador de Lichess; sonidos, háptica, temas; PWA completa.

## Estado (2026-10-24)

Los tres hitos están implementados. Ajustes respecto de lo decidido, surgidos al implementar y probar:

- **Sin pasos cortos de FSRS** (`enable_short_term: false`). La repetición inmediata ya la hacen el "mostrar y pedir" del modo aprender y el reencolado de los fallos dentro de la sesión. Con los pasos cortos, todo lo recién aprendido volvía a aparecer como vencido a los 10 minutos.
- **Sin fuzz**: la tarjeta se recalcula reproduciendo el log, así que la reproducción tiene que ser determinista.
- **Nombres ECO en inglés** (así vienen en el dataset); los nombres propios de raíces son los tuyos.
- **Sonidos sintetizados** con Web Audio (sin archivos ni licencias de audio).
- **Piezas y tableros:** cburnett, Mérida (GPLv2+) y Chessnut (Apache-2.0); tableros Madera, Azul, Verde y Salvia.
- **Raíz propuesta al importar:** el primer punto de ramificación de la línea principal del capítulo (la posición desde la que cuelga todo el capítulo); se puede cambiar en la vista previa.

### Pruebas

- `npm test`: 51 tests unitarios (posiciones y transposiciones, importación PGN, grafo y archivado, FSRS y reproducción del log, cola diaria, sesión de entrenamiento, análisis de partidas, repositorio Dexie y respaldo).
- `npm run e2e`: 4 flujos en viewport de iPhone (importar → aprender → repasar → fallar → progreso → editor → ajustes → respaldo; repertorio con negras; motor; sets de piezas).
- `LIVE=1 npm run test:live`: estudio público real de Lichess y partidas reales de Chess.com.

## Instalación

```bash
npm install
npm run dev        # desarrollo
npm test           # tests unitarios (vitest)
npm run build      # build de producción (dist/)
npm run e2e        # end-to-end (Playwright con el Chrome instalado)
```
