# CavallChess — Entrenador de aperturas

PWA personal para construir, memorizar (repetición espaciada) y auditar contra partidas reales un repertorio de aperturas. Este documento es la fuente de verdad de las decisiones tomadas en la sesión de diseño del 2026-10-24; la biblioteca y la bienvenida se sumaron el 2026-10-25.

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
- **Respaldo:** exportar JSON (repertorio + log) por la hoja de compartir de iOS (Archivos / iCloud Drive), aviso si pasaron > 7 días, importar restaura. `navigator.storage.persist()` al iniciar. El respaldo es de versión 2 (suma las notas de la biblioteca; los de versión 1 se importan igual). El token de Lichess no viaja en el respaldo.

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
  trap?: TrapMark;         // la jugada pertenece a una trampa de la biblioteca
  createdAt: number;
}
interface TrapMark { kind: 'favor' | 'contra'; name: string; fichaId: string; trapId: string }
interface Note { id: string; text: string; updatedAt: number }  // id = fichaId o `${fichaId}|${lineaId}`
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
- **Cola:** primero vencidas (orden DFS), después nuevas (límite diario, 10 por defecto) alternando blancas y negras, cada color en orden DFS.
- **Calificación automática:** acierto al primer intento = Good; acierto tras ver la pista = Hard; error = Again. Al fallar se muestra la correcta con flecha y hay que jugarla; la tarjeta vuelve al final de la sesión. "Fue un error de dedo" anula el fallo mientras no jugaste la correcta.
- **Modo aprender:** una tarjeta nueva primero se **muestra** (jugada con flecha + explicación), y enseguida se **pide**.
- **Trampas:** al responder una tarjeta marcada con `trap` aparece un aviso **después** de responder (para no regalar la táctica): "Trampa: *nombre*. El rival cayó." si venía de una trampa a favor, "Evitaste la trampa: *nombre*." si era en contra. Si la respuesta fue un fallo, el aviso no felicita: "Caíste en la trampa: *nombre*. Ya viste la correcta." (en contra) o "Trampa: *nombre*. El rival cayó, pero no encontraste el castigo a la primera." (a favor). En el árbol del repertorio las jugadas marcadas llevan una insignia.
- **Modo "¿por qué?":** botón de pista solo si la jugada tiene `hint`; tras responder se muestra la explicación completa y las flechas del PGN.
- **Práctica:** a demanda por raíz nombrada (o todo el color), débiles primero. No registra notas; un fallo genera `forceDue`.

### Importación
- PGN pegado, archivo `.pgn`, o estudio/capítulo de Lichess por URL (token personal opcional con `study:read` para privados/no listados).
- En **posiciones propias** gana la línea principal; tus variantes laterales se ignoran (y se informan). Si la principal choca con tu jugada, es un choque para resolver, no una variante ignorada; si no hay nada nuevo salvo choques, el título dice "Tu repertorio ya tiene otra jugada en esa posición: elegí abajo." Del **rival** entran todas.
- **Vista previa** antes de guardar: nuevas posiciones/jugadas, conflictos con lo existente (mantener / reemplazar), variantes propias ignoradas, nombre propuesto por capítulo (raíz = primer punto de ramificación de su línea principal, editable).
- Comentarios del PGN → `explanation` (no se pisan textos existentes); `[%cal]`/`[%csl]` → `shapes`.

### Biblioteca
- **46 fichas** de aperturas (20 con blancas, 26 con negras), escritas a mano en Markdown en `content/biblioteca/{blancas,negras}/<id>.md`. Cada una trae: para empezar, ideas y planes, consejos, variantes (`básica` o `club`, algunas gambito) y trampas a favor y en contra. Todo el texto es original. El formato está en `content/biblioteca/README.md`.
- **Catálogo** (`#/biblioteca`): selector blancas/negras, buscador (español, inglés, alias y ECO), lista agrupada con miniatura, chips de nivel, trampas y estado en tu repertorio (se calcula de los grafos, no se guarda). Los resultados de búsqueda mezclan colores, así que cada uno dice si es "Con blancas" o "Con negras". Si la biblioteca no carga, se avisa con "Reintentar".
- **Ficha** (`#/biblioteca/<id>`): pestañas Resumen, Variantes, Trampas y Mis apuntes; acción fija "Agregar al repertorio" / "Completar en tu repertorio" con casillas por línea y la misma vista previa de importación. Al agregar, la ficha pone su nombre en la posición característica y cada variante el suyo, anidado (salvo `nombrar-raiz: no`, para posiciones genéricas como 1.e4). Las variantes básicas entran antes que las de club y las trampas al final, así que lo básico se aprende primero.
- **Visor de línea:** tablero, jugadas y comentarios con figurines, flechas del PGN, "Analizar" con Stockfish y, en las trampas en contra, el recorrido "Qué pasa si caés".
- **Mis apuntes:** una nota por ficha y una por línea, con guardado automático; las de líneas que una actualización quitó se conservan al final.
- **Huecos → ficha:** si la posición de un hueco de Chess.com está en una ficha del color, se ofrece "Mirá la ficha".
- **Verificación:** la estructura se comprueba en CI; las evaluaciones con Stockfish (`npm run biblioteca:motor`, fuera de CI) se guardan por hash en `verificacion.json`, y un test exige una verificación vigente por ficha.

### Primer uso
- **Bienvenida** (`#/intro`): se abre sola la primera vez, sin tarjetas y sin la marca `introSeenAt`; quien ya tiene repertorio no la ve. Pasos: qué es la app, instalarla (solo en Safari de iPhone sin instalar), mini demo jugable, elegir aperturas (Londres o Italiana; Caro-Kann o Dos Caballos; Eslava o Gambito de Dama Rehusado, todas con "Elegir después"), Chess.com opcional y resumen. Lo elegido se agrega entero, sin vista previa. "Saltar" siempre visible; "Ver la introducción" en Ajustes la repite.
- **Tips:** uno por pantalla (biblioteca, ficha, entrenar, repertorio, partidas, progreso), se ven una sola vez, con "Entendido", y recién después de la bienvenida.

### Partidas (Chess.com)
- Usuario en ajustes. Primera importación: últimos 3 meses. Luego, al abrir la app (si pasaron > 12 h) y con botón: solo lo nuevo, pedidos secuenciales. Cuentan **todos los ritmos**; se excluyen variantes (`rules !== 'chess'`).
- Se recorre cada partida por el grafo del color con el que jugaste hasta la primera salida:
  - **Desvío tuyo** (otra jugada donde tenías una propia) → `forceDue` de esa tarjeta, **solo si la partida terminó hace 30 días o menos** (vale también para la sincronización normal: cargar meses viejos no llena el repaso de vencidas).
  - **Novedad del rival** (jugada no cubierta) → lista de **huecos**, ordenada por frecuencia.
- **Pantalla de Partidas**, de arriba abajo: usuario y "Actualizar partidas" (con el resultado: "N partidas nuevas: D desvíos para repasar y H huecos.", donde solo cuentan los desvíos que hicieron vencer una tarjeta), **Historial**, **Con tu repertorio**, **Huecos del repertorio** (los 5 más frecuentes, con "Ver los N huecos" hasta 30) y, al final, **Tus partidas** (con el historial cargado la lista no tiene fin, así que las acciones van antes). Las acciones secundarias van agrupadas en tarjetas de filas. El tip de la pantalla dice que un desvío en una partida de los últimos 30 días hace vencer esa tarjeta.
- **Historial completo:** "Cargar partidas anteriores (6 meses)" o "Cargar todo el historial" (al lado del título, desde qué mes tenés partidas), hacia atrás: primero los meses sin leer que hayan quedado en el medio y después los más viejos. Mientras carga, en el lugar de los botones: "Leyendo 2023-04 · 5 de 18", la barra y "Cancelar". Al terminar: "Sumaste N partidas." y, si quedan, "Quedan M meses más viejos."; al cancelar, "Cancelaste la carga. …" (si todavía esperaba su turno detrás de otra carga, se suelta en el acto: "Cancelaste la carga antes de que empezara."). Se puede cancelar (también a mitad de un mes) y retomar sin repetir ni saltear meses; salir de Partidas también corta la carga. Si Chess.com pide esperar o se corta la red, se detiene con el mensaje y, aparte, "Lo que ya se leyó quedó guardado: la próxima carga sigue desde ahí." Si cambiás de usuario mientras carga, la carga se corta ("Cambiaste de usuario de Chess.com: la carga se cortó.") y nada de la cuenta anterior queda registrado en la nueva. La sincronización, la carga del historial y el recálculo corren de a una: si otra está corriendo (por ejemplo, la automática al abrir), la nueva dice "Esperando que termine otra carga…" hasta que le toca.
- **Lista de partidas:** paginada (50 por vez, "Ver más") con contador "N partidas" y filtros por color (Todas, Blancas, Negras) y por resultado (Todas, Desvíos, Novedades del rival, Dentro del repertorio, Fuera del repertorio). Cada fila muestra rival, ritmo en castellano (bullet, blitz, rápida, diaria), resultado, fecha y cómo le fue contra el repertorio (desvío en rojo, novedad en dorado), y abre el visor. Al volver del visor ("‹ Partidas"), la pantalla queda como la dejaste: el mismo filtro, las mismas filas cargadas, los huecos desplegados, los últimos mensajes y el scroll en la misma fila (dura la sesión; recargar la app lo reinicia). El lector de pantalla anuncia el contador solo al cambiar el filtro. Una partida guardada como "terminó tu preparación" sin ninguna jugada tuya se muestra y se filtra como fuera del repertorio.
- **Visor de partida** a pantalla completa: cabecera (vs rival, color, ritmo, resultado, fecha, "Ver en Chess.com" y el interruptor "Analizar"), el aviso, el tablero, la tira de jugadas y abajo ◀, "Agregar al repertorio hasta acá" y ▶. Abre en la posición anterior a la salida del repertorio, con la jugada resaltada y flechas (la jugada de la partida y, en un desvío, la de tu repertorio en verde). El aviso va **arriba del tablero**, compacto y con la acción principal primero; el tablero se achica si hace falta para que el aviso, esa acción y la navegación se vean sin desplazar (también con "Analizar" prendido en 390 × 664):
  - **Desvío:** "Acá jugaste X; en tu repertorio va Y.", "Repasar ahora" (repasa solo esa tarjeta; si no estaba vencida, la deja vencida; ✕ y "Volver a la partida" al final vuelven al visor) e "Ir a esa jugada".
  - **Novedad:** "El rival jugó X y tu repertorio no lo cubría.", "Agregar la novedad y tu respuesta" (si la partida tiene tu respuesta), "Preparar respuesta" (al editor) e "Ir a esa jugada".
  - Sin salida, una línea: "La partida no salió de tu repertorio.", "Seguiste tu repertorio hasta el final de tu preparación." o "Esta partida no pasó por tu repertorio."
  - **Análisis de la apertura** (todo lo que ya sabe CavallChess, sin motor): bajo la cabecera, el nombre de la apertura (tu repertorio, si no la ficha de la biblioteca, si no el ECO), hasta dónde fue teoría de la biblioteca y **quién salió**: "Teoría hasta 5.♗xg5; el rival salió en 5…d6." o, en rojo, "Teoría hasta 2…♘f6; te saliste en 3.♗c4 (la ficha juega e5)." con el veredicto del motor al lado (con salto a la salida; después de tu salida, flechas verdes con lo que juega la ficha) y una ficha por cada trampa de la biblioteca que apareció (a favor: el rival cayó y lo castigaste o no; en contra: la esquivaste o caíste), con salto a la jugada. Debajo de la tira, un panel de la jugada mostrada: si es de la biblioteca (o de la caída de una trampa) y si está en tu repertorio, el nombre en esa posición, el aviso de la trampa, tu explicación (o la pista), el comentario de la ficha, en la salida quién salió ("Te saliste de la teoría" / "El rival salió de la teoría") y qué juega o esperaba la ficha, la introducción de cada línea la primera vez que la partida la sigue, "Ver en la biblioteca" a la línea y, al final, el desplegable "Ideas de la apertura" con "Ideas y planes" y "Consejos" de la ficha. **El motor califica tus salidas** (de la teoría y del repertorio; nunca las del rival) al abrir la partida, de a una, a profundidad 16: compara la posición antes (con la mejor jugada) y después de tu jugada en chances de ganar, con los umbrales de Lichess (imprecisión 0,1, error 0,2, error grave 0,3): "Error según el motor: perdés 1,6 (queda −1,3). Prefería e5." o "Jugada sana según el motor (+0,2).". El veredicto va en el panel, en el resumen y en el aviso de desvío; mientras "Analizar" usa el motor se pausa y después sigue (las evaluaciones quedan en caché durante la sesión). Una salida "sana" es una alternativa, no un error. Con token de Lichess, el interruptor "Explorador de Lichess" (recordado en la sesión) muestra la posición con la jugada de la partida resaltada, o avisa si casi no aparece. El panel tiene un alto mínimo y se desliza; el tablero se achica para dejarle lugar. Si la partida no pasó por tu repertorio, el visor abre después de la jugada con la que salió de la biblioteca (y no repite "Esta partida no pasó por tu repertorio." cuando el resumen de la biblioteca ya está). **En una pantalla ancha y apaisada** (desde 700 px), el visor va en dos columnas: a la izquierda el tablero con todo el alto, la tira y la navegación; a la derecha la cabecera, el resumen, el aviso y el panel con todo el alto.
  - "Agregar al repertorio hasta acá" suma las jugadas hasta la posición mostrada (deshabilitado en la inicial). Las partidas que no arrancan de la posición inicial solo se pueden ver en Chess.com.
- **Recalcular contra el repertorio actual** (en "Con tu repertorio"): vuelve a cruzar todas las partidas y reconstruye los huecos, con progreso, y termina con "Recalculaste N partidas: H huecos." Nunca hace vencer tarjetas.
- **Armar repertorio desde tus partidas** (`#/games/armar`, desde "Con tu repertorio"): a partir de muchas partidas de un color (Blancas por defecto), con profundidad (4 a 15 jugadas propias, 8 por defecto), mínimo de partidas para una respuesta del rival (1 a 10, 2 por defecto) y período (3 meses, **12 meses por defecto** o todo lo cargado). Se elige tu jugada más jugada en cada posición (desempata por resultado) y las respuestas del rival que se repiten. "Ver vista previa" muestra la importación con "A partir de K partidas." y el aviso "Esto copia lo que jugaste, incluidos los errores: revisá las líneas con el motor en el editor."; si no alcanza, "No hay suficientes partidas con ese filtro." (cambiar una opción borra ese aviso o un error). Al guardar, va al repertorio de ese color.
- Todo lo que se agrega desde partidas pasa por la vista previa de la importación: no pisa jugadas, nombres ni textos, y no propone nombrar la raíz con el rival. Si ya tenías todo: "Todo esto ya está en tu repertorio."

### Progreso
- **Dominio** por raíz nombrada = % de tarjetas entrenables del subárbol con estabilidad FSRS ≥ 21 días (las nuevas cuentan en el total).
- **Racha:** un día cuenta si los vencidos quedaron en cero; el día corta a las 04:00 locales.
- **Débiles:** jugadas con más fallos (Again) en los últimos 30 días, con su línea.

### Plataforma y acabado
- PWA instalable en iPhone, hosting en **GitHub Pages** (repo público GPL-3.0, deploy con GitHub Action en push a `main`).
- **Motor:** Stockfish lite single-thread en Web Worker, solo en editor y revisión (nunca en el entrenamiento). **Explorador de Lichess** (requiere token) en el editor.
- **Feedback:** la animación lo carga sola (flash de casilla, sacudida al fallar); sonido sintetizado (Web Audio); háptica best-effort (`navigator.vibrate` o truco `<input switch>` en iOS 18+), con ajuste.
- **Navegación:** barra inferior Hoy · Biblioteca · Repertorio · Partidas · Progreso; Ajustes pasa a un engranaje en la cabecera de Hoy.
- **Notación:** figurines (♘f3). Interfaz en español.
- **Temas:** varios tableros y sets de piezas, modo oscuro (sistema / claro / oscuro).
- **Editor:** el grafo se muestra como árbol desplegado desde el inicio; las transposiciones aparecen como enlace "↪ transpone a…".

## Hitos

1. **Estudiar ya:** tablero; importación con vista previa; "cortar aquí"; Dexie con log; modo aprender; cola FSRS con línea animada; respaldo JSON.
2. **Profundizar:** modo "¿por qué?"; editor completo (reemplazar/archivar, raíces nombradas); práctica; panel de progreso.
3. **Extras:** Chess.com y huecos; Stockfish; explorador de Lichess; sonidos, háptica, temas; PWA completa.

## Estado (2026-10-25)

Los tres hitos están implementados, más la biblioteca de aperturas, la bienvenida y los tips. Ajustes respecto de lo decidido, surgidos al implementar y probar:

- **Sin pasos cortos de FSRS** (`enable_short_term: false`). La repetición inmediata ya la hacen el "mostrar y pedir" del modo aprender y el reencolado de los fallos dentro de la sesión. Con los pasos cortos, todo lo recién aprendido volvía a aparecer como vencido a los 10 minutos.
- **Sin fuzz**: la tarjeta se recalcula reproduciendo el log, así que la reproducción tiene que ser determinista.
- **Nombres ECO en inglés** (así vienen en el dataset); los nombres propios de raíces son los tuyos.
- **Sonidos sintetizados** con Web Audio (sin archivos ni licencias de audio).
- **Piezas y tableros:** diez sets libres que se eligen en Ajustes con una miniatura de cada uno: Papercut gris (por defecto; Papercut con las negras en gris cálido, lo más parecido a las Neo de Chess.com, que son propietarias), Papercut y Firi (CC BY 4.0), MPChess (GPLv3+), cburnett y Mérida (GPLv2+), Chessnut (Apache-2.0), Pirouetti (AGPLv3+), RhosGFX (CC0) y Fantasy (MIT); créditos en `src/assets/pieces/CREDITOS.md`. Tableros Madera, Azul, Verde (los colores de Chess.com, por defecto) y Salvia.
- **Raíz propuesta al importar:** el primer punto de ramificación de la línea principal del capítulo (la posición desde la que cuelga todo el capítulo); se puede cambiar en la vista previa.

### Pruebas

- `npm test`: 234 tests unitarios (más 3 que se saltan: motor y APIs reales) en 18 archivos: posiciones y transposiciones, importación PGN, grafo y archivado, FSRS y reproducción del log, cola diaria con alternancia de colores, sesión de entrenamiento y trampas, análisis de partidas, sincronización con historial (cancelación dentro del mes, cambio de usuario, sin conexión), candado de a una, consultas paginadas de partidas (con recálculo que cede el hilo), repositorio Dexie y respaldo v2, la biblioteca (parser, validación y contenido de las 46 fichas, estado en el repertorio con alcanzabilidad y marcas de trampa, carga con error y reintento, notas) la bienvenida (puerta y demo) y los sets de piezas (SVG y reglas de `themes.css` de cada set, Papercut gris).
- `MOTOR=1 npm run biblioteca:motor`: verificación de las fichas con Stockfish, fuera de CI.
- `npm run e2e`: 24 flujos en viewport de iPhone, los de partidas con la API de Chess.com simulada (`page.route`): 5 del entrenamiento y la app (importar → aprender → repasar → fallar → progreso → editor → ajustes → respaldo; repertorio con negras; motor; sets de piezas; aviso de una trampa a favor, con un fallo y a la primera), 4 de la bienvenida y los tips, 7 de la biblioteca (catálogo y buscador, error de carga y reintento, ficha y agregar, notas, visor) y 8 de partidas (lista, abrir una partida y agregarla con el repaso que vuelve a la partida, historial con filtros y armar desde muchas, "Ver más" de a 50, volver a la lista con el filtro y el scroll, cancelar la carga del historial y retomarla, el visor con la biblioteca, la trampa y el explorador, tu salida de la teoría con el motor y las ideas). `E2E_PORT` cambia el puerto del `vite preview` (4173 por defecto).
- `LIVE=1 npm run test:live`: estudio público real de Lichess y partidas reales de Chess.com.

## Instalación

```bash
npm install
npm run dev        # desarrollo
npm test           # tests unitarios (vitest)
npm run build      # build de producción (dist/)
npm run e2e        # end-to-end (Playwright con el Chrome instalado)
```
