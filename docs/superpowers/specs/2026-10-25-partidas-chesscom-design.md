# Partidas de Chess.com: verlas en la app, historial completo y repertorio desde tus partidas — diseño

Fecha: 2026-10-25. Complementa `PLAN.md` (fuente de verdad de producto). Al implementar, `PLAN.md` se actualiza en el mismo cambio.

## Intención

El usuario quiere poder "cargar sus partidas de Chess.com en la app". La sincronización ya funciona: se probó con una cuenta real en la app publicada y entraron 1471 partidas en 54 s. El problema es lo que se puede hacer con ellas. Hoy la app guarda las partidas y muestra las últimas 60 con su resultado de apertura, pero tocar una abre chess.com, solo se traen los últimos 3 meses y no hay forma de usar esas partidas para armar el repertorio.

El usuario eligió las tres mejoras:
1. **Ver cada partida dentro de la app.**
2. **Cargar todo el historial**, no solo 3 meses, y ver más de 60.
3. **Armar repertorio desde sus partidas.**

El usuario delegó las decisiones de diseño. Todo lo marcado **[decisión]** es criterio de quien escribe esto.

## Objetivos

- Tocar una partida la abre en un visor propio: tablero, jugadas, el punto donde salió del repertorio y análisis con Stockfish. Desde ahí se puede actuar: repasar el desvío, preparar la respuesta a una novedad o agregar la partida al repertorio.
- Traer partidas anteriores a los 3 meses iniciales, hasta todo el historial, con progreso y cancelación.
- Recorrer todas las partidas guardadas, no solo 60, con filtros útiles.
- Construir líneas de repertorio a partir de las partidas, siempre pasando por la vista previa de importación. Nunca se pisa lo existente.

## No objetivos (v1)

- Validar con Stockfish las jugadas que se agregan desde partidas. El usuario puede revisarlas después con el motor del editor o del visor.
- Estadísticas avanzadas, como porcentaje de victorias por apertura o rendimiento por ritmo.
- Partidas de Lichess.
- Editar o anotar partidas.
- Sincronizar entre dispositivos.

## Anti-objetivos

- Que cargar el historial viejo haga vencer tarjetas: no se fuerza el repaso de nada por una partida de hace un año.
- Que agregar desde partidas pise jugadas, nombres o textos del repertorio.
- Que la app se trabe con miles de partidas: listas paginadas y cálculos fuera del render.
- Que se pierdan partidas al restaurar un respaldo (hoy las incluye, y se mantiene así).

## Restricciones (del proyecto)

Son las mismas del proyecto (`AGENTS.md`):
- Español rioplatense con voseo y figurines.
- Lógica nueva pura y con tests.
- Dexie: un esquema nuevo va en `version(3)` sin tocar las anteriores.
- Toques de 44 px y diseño a 390 px, en claro y oscuro.
- Stockfish nunca durante el entrenamiento.
- Push a `main` solo con confirmación del usuario.
- Pedidos a Chess.com secuenciales y sin encabezados que disparen el preflight de CORS. Su preflight solo permite `Origin`: está comprobado que `If-None-Match` hace fallar el pedido.

## Diseño

### 1. Visor de partida **[decisión]**

- **Ruta** `#/partidas/<id>`, con el id URL-encodeado (el id es la URL de la partida). Pantalla completa sin barra de pestañas, igual que el visor de líneas.
- **Contenido:**
  - **Cabecera:** rival, color, ritmo, resultado y fecha, más un enlace "Ver en Chess.com".
  - **Tablero:** orientado al color propio; se sube la última jugada.
  - **Lista de jugadas:** completa, con figurines; tocar una salta a esa posición.
  - **Navegación:** botones ◀ ▶ y "Analizar" con el `EnginePanel` existente.
- **Punto de salida del repertorio:**
  - Se recalcula al abrir con `analyzeGame` sobre el repertorio actual, no con el resultado guardado al importar, que puede estar viejo.
  - La jugada se marca en la lista: rojo si te desviaste, latón si fue una novedad del rival. Un aviso arriba explica qué pasó ("Acá jugaste ♘c3; en tu repertorio va ♗b5") y tiene un botón "Ir a esa jugada".
  - El visor abre directamente en esa posición.
- **Acciones según el resultado:**
  - **Desvío:** "Repasar ahora" lleva a entrenar. La tarjeta ya vence si la partida es reciente; si es vieja, la acción la fuerza con `forceDue(…, 'game')`.
  - **Novedad del rival:** "Preparar respuesta" lleva al editor en esa posición, como ya hace la lista de huecos.
  - **Siempre:** "Agregar al repertorio hasta acá" (ver punto 3).
- Lo que se vea en el visor se guarda del lado de quien lo mira: no hay estado nuevo en la base salvo el `forceDue` explícito.

### 2. Historial completo y lista de partidas **[decisión]**

- **Cargar más:** botón "Cargar partidas anteriores" en Partidas.
  - Pide los meses de archivo **anteriores al más viejo ya cargado**, de a 6 meses por toque, y ofrece "Cargar todo el historial".
  - Muestra el progreso ("Leyendo 2023-04 · 5 de 18") y un botón "Cancelar". Cancelar deja guardado lo ya leído y la próxima carga sigue desde ahí.
  - Los pedidos son secuenciales. Si Chess.com responde 429 ("pidió esperar"), la carga espera y reintenta una vez; si vuelve a fallar, se detiene con un mensaje.
- **Desvíos en partidas viejas:**
  - Las partidas del historial viejo se guardan y suman huecos (sirve saber qué te juegan), pero **no hacen vencer tarjetas**.
  - Regla general: `forceDue` solo para partidas terminadas en los últimos 30 días, tanto en la sincronización normal como en la histórica.
- **Saber qué meses ya se leyeron:**
  - Los meses leídos quedan registrados, como hoy en `chesscomMonths`.
  - El más viejo pedido se puede deducir del registro. Si hace falta, se agrega `chesscomOldestMonth` en ajustes.
  - Sin ETag: Chess.com no lo expone por CORS y la app nunca lo pudo usar. Se quita el envío de `If-None-Match` y se simplifica el registro.
- **Lista:**
  - Paginada de a 50, ordenada por fecha, con "Ver más".
  - Filtros: color (todas, blancas, negras) y resultado de apertura (todas, desvíos, novedades del rival, fuera del repertorio). El filtro se calcula sobre el resultado guardado; ver la nota de datos.
  - Contador total ("1471 partidas").
- **Rendimiento:** con miles de partidas, la lista consulta Dexie por página (índice `endTime`) y nunca carga todo en memoria para dibujar.

### 3. Repertorio desde tus partidas **[decisión]**

Dos entradas, y las dos terminan en la **vista previa de importación** existente (`ImportPreview`). Ahí se resuelven los choques; por defecto se conserva lo tuyo.

- **Desde una partida:** "Agregar al repertorio hasta acá", en el visor.
  - Arma un PGN con las jugadas de la partida desde el inicio hasta la posición mostrada y lo importa al color con el que jugaste.
  - Por defecto, el visor abre en el punto de salida. Si la salida fue una novedad del rival, "hasta acá" incluye tu respuesta en la partida: es la jugada siguiente, y si existe el botón propone llegar hasta ella.
- **Desde muchas partidas:** "Armar repertorio desde tus partidas", en Partidas.
  - **Opciones:** color, profundidad (por defecto 8 jugadas propias, de 4 a 15) y frecuencia mínima de una respuesta del rival para incluirla (por defecto 2 partidas). Hay un selector de período: últimos 3, 12 meses o todo lo cargado.
  - **Algoritmo** (puro y testeado): se recorren las partidas de ese color desde la posición inicial, contando las jugadas por posición, transposiciones incluidas (clave EPD).
    - **Tus posiciones:** entra tu jugada más jugada. En empate, la de mejor resultado.
    - **Posiciones del rival:** entran las respuestas jugadas al menos el mínimo de veces.
    - El árbol se corta a la profundidad pedida o donde ya no quedan partidas.
    - El resultado es un PGN con variantes, compatible con `buildImportPlan`.
  - **Antes de la vista previa** se muestra un resumen: "Se agregan N jugadas tuyas y M del rival, a partir de K partidas".
  - **Advertencia visible:** "Esto copia lo que jugaste, incluidos los errores; revisá las líneas con el motor en el editor".
- **Nombres:** no se proponen nombres de raíz. Las posiciones toman el nombre ECO como hoy, y el usuario puede nombrarlas en la vista previa.

### Datos

- No cambia el esquema salvo que el filtro por resultado necesite índice. **[decisión]** El filtro se aplica en memoria sobre la página consultada y se completan páginas hasta llenar 50: con algunos miles de partidas no hace falta un índice nuevo, así que no hay `version(3)`.
- `GameRow.outcome` sigue siendo el que se calculó al importar. El visor recalcula el actual. **[decisión]** Al cambiar el repertorio, la lista no se recalcula sola; hay un botón "Recalcular contra el repertorio actual" que recorre las partidas en tandas sin trabar la UI.
- El respaldo ya incluye las partidas y sigue igual.

## Lo que queda para el constructor

- El dibujo exacto del visor de partidas, reutilizando lo que se pueda del visor de líneas: `Board`, `MoveLine`, `EnginePanel`, navegación.
- Cómo deducir el mes más viejo leído y cómo se reanuda una carga cancelada.
- El detalle del algoritmo de agregación: desempates y manejo de partidas con posición inicial distinta (se ignoran).
- La forma del resumen previo a la vista previa en la carga masiva.

## Decisiones tras la revisión del constructor **[decisión]**

1. **Visor y "hasta acá":**
   - El visor abre en la posición **anterior** a la jugada de salida, con esa jugada resaltada como la siguiente.
   - "Agregar al repertorio hasta acá" incluye las jugadas desde el inicio hasta la posición mostrada.
   - Con una novedad del rival hay además un botón directo: "Agregar la novedad y tu respuesta", hasta tu respuesta inclusive, si la partida la tiene.
   - Con un desvío tuyo, agregar tu jugada genera un choque en la vista previa. Por defecto se conserva lo tuyo, y el usuario puede elegir reemplazar.
2. **"Repasar ahora"** abre una sesión con **esa sola tarjeta**: `#/train?card=<id>`, modo repaso con cola `[id]`. Si la tarjeta no está vencida, primero se fuerza con `forceDue(…, 'game')`; si ya está vencida, no se agrega ningún evento.
3. **"Recalcular contra el repertorio actual"** reescribe `GameRow.outcome` de todas las partidas y **reconstruye la tabla `gaps` desde cero** a partir de los resultados nuevos: cantidad, `lastSeen` y `lastGameUrl`. Nunca hace `forceDue`.
4. **Filtros de la lista:**
   - Todas.
   - Desvíos (`myDeviation`).
   - Novedades del rival (`gap`).
   - Dentro del repertorio (`inBook` y `endOfBook`).
   - Fuera del repertorio (`noBook`).
   - Más el filtro por color. Se consulta con Dexie: `orderBy('endTime').reverse().filter(…).offset(…).limit(50)`.
5. **Carga masiva:** el PGN generado lleva **solo la jugada elegida** en tus posiciones, y las del rival como variantes. El conteo de jugadas lo muestra la vista previa con su propio plan. Arriba se muestra "a partir de K partidas" y la advertencia.
6. **Regla de 30 días:** también rige para la sincronización normal y se mide por `end_time` de la partida. Es un cambio buscado: la primera carga de 3 meses ya no llena el repaso de vencidas.
