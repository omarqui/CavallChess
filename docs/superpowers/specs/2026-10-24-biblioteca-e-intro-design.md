# Biblioteca de aperturas e intro de primer uso — diseño

Fecha: 2026-10-24. Complementa `PLAN.md` (fuente de verdad de producto): al implementar, `PLAN.md` se actualiza en el mismo cambio con lo que este documento decide.

## Intención

Hoy CavallChess es una herramienta vacía: sirve si ya traés un repertorio (estudio de Lichess o PGN) o lo armás a mano en el tablero. El usuario quiere dos cosas:

1. **Una biblioteca de aperturas y defensas** con contenido propio de la app (ideas, análisis, variantes, trampas y consejos) y **sus apuntes** encima, que además sea la puerta de entrada al repertorio: lo que leés lo podés agregar y entrenar, **trampas incluidas**.
2. **Un intro de primer uso** que explique la app y deje a alguien nuevo con un repertorio listo para estudiar en pocos minutos, apoyándose en la biblioteca.

El usuario delegó las decisiones de interfaz ("que se vea bien y funcional, con buena UI/UX"). Todo lo marcado **[decisión del diseño]** es criterio de quien escribe esto, no algo que el usuario pidió; puede cambiarse.

## Lo que decidió el usuario

- **Contenido:** base curada que trae la app (texto original) + apuntes propios que nunca se pisan.
- **Relación con el repertorio:** puerta de entrada (agregar líneas con un toque) **y** trampas entrenables.
- **Trampas en el entrenamiento:** son **líneas marcadas del repertorio**, no un mazo aparte. La jugada que castiga es una tarjeta FSRS normal.
- **Apuntes:** uno por ficha y uno por cada variante o trampa. Las notas por jugada siguen viviendo en el editor del repertorio.
- **Nivel:** principiante **y** club (≈1200–1800).
- **Alcance:** amplio, **≈40–50 fichas**.
- **Intro:** bienvenida en pasos que termina con un repertorio cargado **y** tips cortos la primera vez que entrás a cada pantalla.
- **Orden de las nuevas:** cuando hay nuevas de los dos colores, **se alternan blancas y negras**. Dentro de cada color se mantiene el orden DFS.

## Objetivos

- Que cualquiera, sin repertorio previo, termine el intro con líneas reales agregadas y una sesión de "aprender" lista.
- Que cada ficha se entienda con dos niveles de lectura: lo básico primero y la profundidad de club después.
- Que agregar una ficha (o parte) al repertorio use la misma vista previa y las mismas reglas que la importación: una jugada propia por posición, conflictos decididos por el usuario, sin pisar textos.
- Que las trampas se entrenen dentro de la sesión normal, con un aviso claro de qué trampa fue.
- Que todo funcione sin conexión, como el resto de la app.

## No objetivos (v1)

- Fichas creadas por el usuario (solo apuntes sobre las existentes).
- Actualizar solas las líneas ya agregadas cuando cambia el contenido de la base. Lo agregado se copia al repertorio y desde ahí es del usuario.
- Mazo de trampas separado del repertorio, o un tipo de tarjeta nuevo.
- Partidas modelo completas, videos o audio.
- Explorador de Lichess dentro de la ficha (sigue en el editor).
- Sincronización, cuentas, backend.

## Anti-objetivos (aunque funcione, sería un fracaso)

- Una jugada ilegal, una variante que termina perdida sin que se diga, o una "trampa" que no funciona.
- Texto copiado de libros o sitios web. Todo el texto es original; nombres de aperturas y jugadas son hechos y se pueden usar.
- Un intro que moleste a quien ya tiene repertorio, o que obligue a pasos. Siempre se puede saltar.
- Que agregar desde la biblioteca pise jugadas propias, nombres o explicaciones existentes sin pasar por la vista previa.
- Que la app se vuelva pesada: el catálogo es liviano y cada ficha se carga a demanda.
- Romper datos existentes: los respaldos viejos se siguen pudiendo importar.

## Restricciones (del proyecto)

- GPL-3.0; solo assets compatibles. Interfaz en español rioplatense con voseo; notación con figurines.
- Rutas con `import.meta.env.BASE_URL` (GitHub Pages bajo `/CavallChess/`). Router por hash.
- Dexie: el esquema nuevo va en `version(2)`, sin editar `version(1)`.
- `TrainingSession` sigue siendo pura; la lógica nueva va en la sesión con tests, no en `Train.tsx`.
- El log de eventos y la reproducción FSRS no cambian.
- Stockfish nunca se usa durante el entrenamiento.
- `.board-frame[data-interactive="true"]` sigue existiendo (lo usa el e2e).
- `npm test`, `npm run typecheck` y `npm run e2e` en verde; un push a `main` publica, así que se confirma con el usuario antes de cada push.

## Contenido de la biblioteca

### Qué trae una ficha

Cada ficha es una apertura vista desde **el lado que la elige** (la Caro-Kann es de negras; "Avance contra la Caro-Kann" es de blancas).

| Parte | Qué es | Nivel |
|---|---|---|
| Identidad | `id` estable (slug), nombre en español y nombre en inglés/alternativos, lado, grupo ("Contra 1.e4"…), códigos ECO, jugadas hasta la posición característica, una frase de resumen | — |
| Para empezar | El porqué de las primeras jugadas, qué buscás, 3–5 principios | principiante |
| Ideas y planes | Estructura de peones, planes típicos de cada lado, piezas buenas y malas, rupturas | club |
| Variantes | 2–5 líneas con nombre, de 8 a 15 jugadas por bando según la línea, comentadas jugada a jugada donde aporta. Cada una con un comentario final sobre qué hacer después | básicas + club |
| Trampas | Ver abajo. Entre 1 y 4 por ficha cuando existen de verdad; ninguna inventada para cumplir | ambos |
| Consejos y errores típicos | Lista corta y concreta ("no cambies el alfil de casillas blancas antes de…") | ambos |

**[decisión del diseño]** Las dos capas siempre se ven, en orden: lo básico arriba y lo de club después. No hay un ajuste de nivel. Cada variante lleva una etiqueta `básica` o `club` que se muestra como chip.

**Pistas [decisión del diseño]:** las jugadas propias **clave** traen `hint`, para que el modo "¿por qué?" funcione en lo que viene de la biblioteca. Son las que tienen un plan que se puede explicar sin nombrar la jugada ("atacá el centro antes de que se complete"). Las jugadas obvias o de desarrollo rutinario no llevan. El campo existe en el formato desde la tanda 1, para no reescribir contenido después. La pista no se pisa si la jugada ya tenía una tuya.

### Trampas

Hay dos tipos:

- **A favor** ("el rival cae"): la línea llega hasta el error natural del rival y sigue con tu castigo. Al agregarla al repertorio, la jugada del rival queda marcada como trampa y tus jugadas de castigo son tarjetas normales.
- **En contra** ("no caigas"): la línea llega a la posición donde la jugada natural tuya pierde. Trae la jugada correcta (que entra al repertorio como tu jugada propia, marcada) y, solo para mostrar, la continuación perdedora. La continuación perdedora **nunca** entra al repertorio: chocaría con la regla de una jugada propia.

Reglas de coherencia dentro de una ficha: todas sus variantes y trampas coinciden en la jugada propia de cada posición que comparten. Entre fichas distintas puede haber choques (la Italiana y la Española difieren en la tercera jugada de blancas); eso lo resuelve la vista previa.

### Catálogo objetivo (≈46 fichas) **[decisión del diseño]**

Lista de partida; el constructor puede ajustar nombres y agrupar o separar mientras mantenga el alcance.

**Con blancas (≈20)**
- *Abrís con 1.e4:* Italiana (Giuoco Piano y Pianissimo) · Gambito Evans · Española (Ruy López) · Escocesa · Vienesa · Gambito de Rey.
- *Contra las respuestas a 1.e4:* contra la Petrov y la Philidor · Alapin (contra la Siciliana) · Gambito Smith-Morra · Grand Prix · Avance contra la Francesa · Avance contra la Caro-Kann · contra la Escandinava · Ataque Austríaco (contra Pirc y Moderna) · contra la Alekhine.
- *Abrís con 1.d4 / otras:* Sistema Londres · Gambito de Dama (contra el Rehusado, la Eslava y el Aceptado) · contra la India de Rey · contra la Holandesa · Apertura Inglesa.

**Con negras (≈26)**
- *Contra 1.e4:* Siciliana Najdorf · Siciliana Dragón · Siciliana Taimanov · las anti-sicilianas (qué hacer contra 2.c3, Grand Prix y Morra) · Francesa · Caro-Kann · Escandinava · Dos Caballos (contra la Italiana) · 1…e5 contra la Española (Morphy y Berlinesa) · Petrov · Pirc · Alekhine · contra el Gambito de Rey · contra la Escocesa y la Vienesa.
- *Contra 1.d4:* Eslava · Gambito de Dama Rehusado · Gambito de Dama Aceptado · India de Rey · Nimzo-India · India de Dama · Grünfeld · Holandesa · Benoni y Benko · contra el Sistema Londres · Contragambito Albin.
- *Contra 1.c4 y 1.Nf3:* contra la Inglesa.

### Entrega por tandas **[decisión del diseño]**

Escribir y verificar ~46 fichas es el grueso del trabajo. Se entrega por tandas; cada tanda se publica cuando pasa la verificación completa:

1. **Tanda 1, junto con toda la infraestructura (~10 fichas):** las que recomienda el intro, más clásicos accesibles para principiantes: Sistema Londres, Italiana, contra la Petrov y la Philidor, Caro-Kann, 1…e5 con Dos Caballos, Escandinava, Eslava, Gambito de Dama Rehusado, Gambito de Dama (blancas) y Avance contra la Caro-Kann.
2. **Tanda 2:** el resto de 1.e4 con blancas y las sicilianas.
3. **Tanda 3:** el resto contra 1.d4 y 1.c4 con negras.
4. **Tanda 4:** lo que falte del catálogo.

### Formato y verificación

- **Fuente [decisión del diseño]:** un archivo Markdown por ficha en `content/biblioteca/<blancas|negras>/<id>.md`, con frontmatter para la identidad y bloques PGN para variantes y trampas. Es el formato más fácil de escribir y revisar a mano. Un script (`npm run biblioteca`, como `npm run eco`) lo compila a `src/data/biblioteca/`: un índice liviano del catálogo (nombre, lado, grupo, chips, posición de la miniatura, EPDs para búsquedas) y un JSON por ficha que se carga a demanda. Lo generado se versiona.
- **Texto:** un subconjunto chico de Markdown (párrafos, negrita, listas). Las jugadas citadas en el texto se muestran con figurines.
- **Verificación mecánica (tests de vitest, corren en CI):** toda jugada es legal; la ficha es coherente (una jugada propia por posición entre variantes y trampas); cada trampa tiene su estructura completa; los `id` son únicos y estables; no hay secciones obligatorias vacías.
- **Verificación con motor (script aparte, `npm run biblioteca:motor`, no corre en CI):** Stockfish en Node, a profundidad fija, comprueba que el final de cada variante no deja mal al lado de la ficha (evaluación ≥ −0,7 para ese lado, o la variante lo declara explícitamente como gambito u objetivo distinto), que cada trampa a favor gana claramente (≥ +2 tras el castigo) y que en cada trampa en contra la jugada natural pierde (≤ −2) y la correcta no (≥ −0,5). El resultado se guarda con un hash del contenido verificado, y un test de CI exige que cada ficha tenga una verificación vigente para su hash. Los umbrales los puede afinar el constructor.
- **Errores en el texto:** las ideas escritas no se verifican solas. Cada ficha dice al pie, con humildad, que el contenido es de la app y las jugadas están verificadas con motor, e invita a anotar en los apuntes lo que no cierre.

## Interfaz **[decisión del diseño, toda esta sección]**

### Navegación

La barra inferior pasa a **Hoy · Biblioteca · Repertorio · Partidas · Progreso**. **Ajustes** sale de la barra y pasa a un botón de engranaje en la cabecera de Hoy. Cinco pestañas es el máximo cómodo en un iPhone; con seis no entran los toques mínimos.

### Catálogo (`#/biblioteca`)

- Selector "Con blancas | Con negras" (el `Segmented` existente) y un buscador por nombre en español, nombre en inglés, nombres alternativos y código ECO.
- Lista agrupada por `grupo`. Cada fila: miniatura estática del tablero en la posición característica (dibujada sin chessground, para que la lista sea liviana), nombre, frase de resumen y chips: nivel, cantidad de trampas y estado en tu repertorio ("En tu repertorio" o "2 de 4 líneas"), calculado a partir de los grafos.

### Ficha (`#/biblioteca/<id>`)

- **Cabecera:** tablero en la posición característica, nombre, ECO, resumen y chips.
- **Pestañas internas** pegadas arriba al hacer scroll: *Resumen* (Para empezar, Ideas y planes, Consejos), *Variantes*, *Trampas* y *Mis apuntes*.
- **Variantes y trampas** como tarjetas: nombre, chip de nivel o tipo de trampa, las primeras jugadas con figurines, estado (ya en tu repertorio / nueva / choca con tu jugada ♘f3) y, plegada, tu nota de esa línea.
- **Acción principal fija abajo:** "Agregar al repertorio", o "Completar en tu repertorio" si ya tenés una parte. Abre una hoja con casillas por variante y trampa (todo lo que no tenés viene marcado), y "Revisar" lleva a la **vista previa de importación**. Esa vista se extrae de `Import.tsx` a un componente reutilizable, con la ficha como origen. Al guardar aparece un aviso ("Sumaste 23 jugadas, 9 para aprender") y volvés a la ficha con los estados actualizados.
- **Nombres al agregar:** la raíz nombrada de la ficha va en su posición característica ("Caro-Kann") y la de cada variante en su posición propia, anidada ("Caro-Kann › Avance"). Se pueden editar en la vista previa, como hoy.
- **Orden de aprendizaje al agregar [decisión del diseño]:** dentro del color, las nuevas siguen el orden DFS, y el orden entre hermanos depende de `createdAt`. Por eso, al guardar, las jugadas de las variantes `básica` se crean antes que las de `club` y las trampas al final. Así lo básico entra a aprender primero.

### Visor de línea

Pantalla completa con el tablero arriba y, debajo, la lista de jugadas con figurines (se toca una jugada y el tablero salta ahí) y el comentario de la jugada actual con sus flechas. Abajo, botones grandes ◀ ▶, al alcance del pulgar. Un interruptor "Analizar" usa el Stockfish existente (evaluación y mejor jugada como flecha). En las trampas en contra hay un segundo recorrido, "Qué pasa si caés", con la continuación perdedora en tono de error.

### Mis apuntes

Una nota libre por ficha y una por variante o trampa, con guardado automático. Las notas de variantes o trampas que una actualización de la base haya quitado no se pierden: aparecen al final de *Mis apuntes* como "Notas de líneas que ya no están".

### Entrenamiento

- Al responder una tarjeta que viene de una trampa a favor (la jugada anterior del rival está marcada), se muestra un aviso **después** de responder, para no regalar que hay una táctica: "Trampa: *nombre* — el rival cayó", con su explicación.
- Al responder una tarjeta marcada como trampa en contra: "Evitaste la trampa *nombre*", con su explicación.
- El rival sigue eligiendo la rama con más pendientes, así que las trampas aparecen solas cuando su castigo está pendiente.
- En el árbol del repertorio, las jugadas marcadas llevan una insignia de trampa.

### Cola diaria: alternar colores (decisión del usuario)

`buildDailyQueue` (`src/srs/queue.ts`) hoy junta las nuevas de blancas y después las de negras, y corta en el límite diario: con el intro, la primera semana serían solo de blancas. Cambia así:

- Las **nuevas** del día se toman alternando una de cada color (blancas, negras, blancas…) mientras haya de los dos. Si un color se agota, se completa con el otro. Dentro de cada color se mantiene el orden DFS.
- Los **vencidos** no cambian: siguen en orden DFS, como hoy.
- No toca el log ni la reproducción FSRS. Afecta a los repertorios existentes solo en el orden en que entran las nuevas.
- `PLAN.md` ("Cola: … ambas en orden DFS del grafo") se actualiza en el mismo cambio. Los tests de la cola se ajustan y se suma uno que cubra la alternancia.

La sesión de entrenamiento salta entre tarjetas reproduciendo la línea desde el inicio, así que alternar colores ya está soportado: cada tarjeta trae su `side` y el tablero se orienta solo.

### Huecos de Chess.com → biblioteca

En la lista de huecos, si la posición del hueco aparece en alguna ficha del lado correspondiente, se muestra "Mirá la ficha: *nombre*". El índice de EPDs del catálogo alcanza para encontrarla.

## Intro de primer uso

El usuario eligió **bienvenida en pasos + tips por pantalla**, y descartó el recorrido con globos sobre los elementos. El contenido de los pasos es **[decisión del diseño]**.

### Bienvenida en pasos

Se muestra la primera vez que se abre la app sin tarjetas y sin la marca `introSeenAt` en ajustes. Quien ya tiene tarjetas no la ve, y queda marcada como vista. Son pantallas completas con puntos de progreso, "Saltar" siempre visible y "Ver la introducción" en Ajustes para repetirla.

1. **Bienvenida.** Qué es CavallChess, en tres ideas: armás tu repertorio, lo memorizás con repasos que llegan justo antes de olvidarlo y lo comparás con tus partidas de Chess.com.
2. **Instalala** (solo en Safari de iPhone, si la app no está instalada). Explica por qué importa: instalada tiene su propio almacenamiento y Safari puede borrar los datos de sitios que no se abren seguido. Muestra cómo instalarla (Compartir → Agregar a pantalla de inicio). Se puede seguir sin instalar, con la advertencia. Al instalarla, la app arranca vacía y muestra el intro de nuevo; es esperable, porque el almacenamiento es otro.
3. **Así se estudia.** Una mini demo jugable con el tablero real: posición después de 1.e4 e5 2.♘f3, "¿cómo defendés el peón?". Jugás ♘c6 (o cualquier defensa razonable) y aparece la confirmación con una línea sobre cómo funciona un repaso: si fallás, te muestra la correcta y vuelve más tarde. No usa la base de datos ni toca el log.
4. **Armá tu repertorio.** Tres elecciones rápidas, cada una con "Elegir después":
   - *Con blancas:* Sistema Londres ("un mismo plan contra casi todo, ideal para empezar") o Italiana ("1.e4 clásica, partidas abiertas").
   - *Con negras contra 1.e4:* Caro-Kann o 1…e5 con Dos Caballos.
   - *Con negras contra 1.d4:* Eslava o Gambito de Dama Rehusado.

   Abajo hay un enlace: "Ya tengo mi repertorio (Lichess o PGN)", que lleva a importar. Con el repertorio vacío no puede haber conflictos, así que se agrega todo lo de las fichas elegidas (variantes y trampas) sin pasar por la vista previa. Las opciones son compatibles entre sí. El límite diario de nuevas (10) ya las dosifica.
5. **Chess.com (opcional).** Campo de usuario: "te aviso cuándo te salís de tu repertorio y qué te juegan que no tenés".
6. **Listo.** "Hoy aprendés tus primeras N posiciones", con el botón Estudiar.

El estado vacío de Hoy suma un botón principal, "Elegir de la biblioteca", además de los actuales.

### Tips por pantalla

La primera vez que entrás a cada pantalla aparece arriba un aviso corto (una o dos frases, con el `Banner` existente) que explica para qué sirve y se cierra con "Entendido". No tapa nada ni bloquea. Cada tip se muestra una sola vez y "Ver la introducción" en Ajustes los vuelve a activar. Textos **[decisión del diseño]**, uno por pantalla:

- **Biblioteca:** cómo leer una ficha y que "Agregar al repertorio" la vuelve entrenable.
- **Ficha:** las trampas se entrenan como líneas, y tus apuntes son tuyos.
- **Entrenar** (primera sesión): la línea se salta con un toque, "Pista" y "Fue un error de dedo".
- **Repertorio:** el árbol, "cortar aquí", las transposiciones y que borrar archiva sin perder historial.
- **Partidas:** desvíos (la tarjeta vence ya) y huecos (lo que te juegan y no tenés). Si falta el usuario de Chess.com, cómo cargarlo.
- **Progreso:** qué significan el dominio y la racha.

Los tips no se muestran mientras está abierta la bienvenida, ni en una pantalla que esté vacía por falta de datos: ahí manda el estado vacío.

## Datos

- **Notas:** tabla nueva `notes` en Dexie `version(2)`. Clave `"<fichaId>"` o `"<fichaId>|<lineaId>"`; guarda texto y fecha de cambio.
- **Marca de trampa en la jugada:** campo opcional en `MoveEdge`, del estilo `trap?: { kind: 'favor' | 'contra'; name: string; fichaId: string; trapId: string }`. Guarda el nombre para que el aviso funcione aunque la ficha cambie. No va indexado, así que no requiere cambio de índices. El cómo llega desde la ficha (un comando propio en el comentario PGN o marcas aplicadas al confirmar) queda para el constructor.
- **Estado "en tu repertorio":** se calcula, no se guarda. Una variante está agregada si cada jugada propia de su línea existe como jugada propia en el grafo de ese color.
- **Respaldo:** incluye las notas; los respaldos viejos sin notas se importan igual. La marca de trampa viaja con las jugadas.
- **Ajustes:** `introSeenAt?: number` y `tipsSeen?: string[]` (los tips ya cerrados).

## Lo que queda para el constructor

- La sintaxis exacta del Markdown de fichas y del bloque PGN, y la del índice compilado.
- Cómo se ejecuta Stockfish en Node para la verificación (paquete `stockfish` o alternativa compatible con GPL), la profundidad y el ajuste fino de los umbrales.
- Cómo viaja la marca de trampa desde la ficha hasta la jugada guardada.
- El dibujo de la miniatura estática y cómo toma el set de piezas y el tablero elegidos.
- La división de componentes y si el visor de línea comparte código con el editor del repertorio.
- La redacción final de cada ficha, dentro de las reglas de contenido de arriba.
