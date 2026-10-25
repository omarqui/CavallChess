# Biblioteca de aperturas: guía para escribir fichas

Cada apertura es una **ficha**: un archivo Markdown en `content/biblioteca/`, un archivo por ficha, con el nombre `<id>.md`. Esta guía es el contrato del formato: el parser (`src/library/parse.ts`) y el validador (`src/library/validate.ts`) rechazan lo que no la cumpla. El ejemplo completo está al final y pasa el validador (hay un test que lo comprueba).

Estilo: español rioplatense con voseo ("jugá", "tenés", "sacá"). **Todo el texto es original**: no copies de libros ni de sitios. Los nombres de aperturas y las jugadas sí se pueden usar.

## Estructura del archivo

1. Frontmatter entre dos líneas `---`.
2. Secciones `## …`, en este orden: `Para empezar`, `Ideas y planes`, `Consejos` y después las líneas (variantes y trampas), en el orden en que se estudian.

### Frontmatter

Formato `clave: valor`, una por línea, sin comentarios ni comillas. Las listas van separadas por comas.

| Clave | Obligatoria | Significado |
|------|------|------|
| `id` | sí | kebab-case (`a-z`, `0-9`, guiones), estable: las notas del usuario cuelgan de él. Único en toda la biblioteca. |
| `nombre` | sí | Nombre de la apertura, por ejemplo `Defensa Caro-Kann`. |
| `alias` | no | Otros nombres, separados por coma. |
| `lado` | sí | `blancas` o `negras`: quién elige la apertura. |
| `grupo` | sí | Uno de los grupos de abajo, según `lado`. |
| `orden` | sí | Entero. Orden dentro del grupo; no puede repetirse en el mismo (lado, grupo). |
| `eco` | sí | Código o rango ECO, por ejemplo `B10-B19`. |
| `nivel` | sí | `principiante`, `club` o ambos separados por coma. |
| `jugadas` | sí | Posición característica en PGN desde la inicial (`1. e4 c6`). **Toda línea de la ficha empieza con estas jugadas.** |
| `resumen` | sí | Una frase. |
| `nombrar-raiz` | no | `si` (por defecto) o `no`. Con `no`, la ficha no le pone su nombre a la posición de `jugadas` y cada variante se nombra `<nombre de la ficha>: <variante>`. Usalo cuando `jugadas` es una posición por la que pasan muchas otras fichas, como `1. d4`, `1. e4` o `1. e4 c5`: si no, el nombre de la ficha se antepone a todo tu repertorio que pase por ahí. |

Grupos válidos:

- `blancas`: `Abrís con 1.e4`, `Contra las respuestas a 1.e4`, `Abrís con 1.d4 y otras`.
- `negras`: `Contra 1.e4`, `Contra 1.d4`, `Contra la Inglesa y otras`.

### Secciones de texto

- `## Para empezar`: qué buscás y cómo se juega, en pocas líneas.
- `## Ideas y planes`: los planes típicos.
- `## Consejos`: **solo ítems** que empiezan con `- `. Al menos uno.

Formato de texto permitido: párrafos separados por una línea en blanco, `**negrita**`, listas con `- ` y jugadas entre comillas invertidas (`` `3...Bf5` ``), que la app muestra con figurines. Esto vale para las secciones y los párrafos de las líneas, no para los comentarios del PGN (ver abajo).

### Líneas

```
## Variante: <nombre> {#<id>} [básica|club] [gambito]
## Trampa a favor: <nombre> {#<id>} [básica|club]
## Trampa en contra: <nombre> {#<id>} [básica|club]
```

- `{#id}`: kebab-case, único dentro de la ficha.
- Nivel obligatorio: `[básica]` o `[club]` (también se acepta `[basica]`).
- `[gambito]` es opcional y solo va en las variantes.

El cuerpo de cada línea es: párrafos opcionales (la `intro`), **un único** bloque de código ` ```pgn ` y párrafos opcionales (el `outro`).

### El PGN

- Empieza en `1.` desde la posición inicial, sin encabezados `[Tag "…"]`, y es **lineal**: sin variantes `( … )`, salvo en la trampa en contra.
- No pongas ningún comentario antes de la primera jugada (`{ … } 1. e4`): se perdería y el parser lo rechaza. Ese texto va en los párrafos de la línea.
- Podés dejar líneas en blanco dentro del bloque para espaciar: se ignoran.
- Cada comentario `{ … }` va **después** de la jugada y la explica.
- Un comentario puede llevar texto, `[%hint …]`, flechas `[%cal Gd2d4]` y casillas `[%csl Rd4]`, y la jugada puede llevar NAGs (`?`, `??`, `!`, `!?`…).
- **En los comentarios no van comillas invertidas**, ni en el texto ni en `[%hint …]`: el comentario se muestra como texto plano y las comillas quedarían a la vista. Escribí las jugadas sueltas (`{ La amenaza es 10.Qxe4+ Qxe4 11.Nxe4. }`): la app pasa a figurines las que llevan letra de pieza.
- `[%hint …]` es la pista que ve quien estudia antes de jugar: **solo en jugadas propias** (las del lado de la ficha).
- Jugá siempre la misma jugada propia en cada posición, en todas las líneas (ver coherencia).

### Trampa a favor

El rival se equivoca y vos lo aprovechás. **Exactamente una** jugada del rival en la línea principal lleva `?` o `??`. No lleva variantes.

### Trampa en contra

Hay una jugada natural pero mala (la tentación) y la correcta. En el PGN, la principal sigue con **tu jugada correcta** y **exactamente una** variante `( … )` muestra lo que pasa si caés:

- La variante reemplaza una jugada propia y su primera jugada lleva `?` o `??`.
- La variante es lineal (sin variantes anidadas).
- Las jugadas de la variante no cuentan para la coherencia.
- Después de la variante la principal puede seguir.

### Raíz de las variantes

No se escribe: el parser la calcula. Para cada variante es 1 más el prefijo común más largo con cualquier otra variante de la ficha, con mínimo `jugadas + 1` y máximo el largo de la línea. Sirve para nombrar el capítulo en la importación. Por eso conviene que las variantes de una misma ficha se separen en una posición donde el nombre ya tenga sentido.

## Reglas de validación

Cada mensaje nombra la ficha y la línea.

1. El frontmatter tiene todas las claves obligatorias; `lado`, `nivel` y `orden` tienen valores válidos.
2. `id` de ficha y de líneas en kebab-case; los `id` de líneas no se repiten dentro de la ficha; los `id` de ficha no se repiten en la biblioteca; cada (lado, grupo, orden) es único.
3. `grupo` está en la lista de ese `lado`.
4. Las secciones `Para empezar`, `Ideas y planes` y `Consejos` existen, no están vacías y hay al menos un consejo.
5. Hay al menos una `Variante` y al menos una variante `[básica]`.
6. Cada línea tiene exactamente un bloque `pgn`, empieza desde la posición inicial y todas sus jugadas son legales.
7. Toda línea empieza con las `jugadas` de la ficha.
8. **Coherencia:** en cada posición donde le toca jugar al lado de la ficha, todas las líneas (y `jugadas`) usan la misma jugada. Las variantes de caída de las trampas en contra quedan excluidas.
9. Estructura de trampas: a favor, exactamente un `?`/`??` del rival; en contra, exactamente una variante que reemplaza una jugada propia con `?`/`??` en su primera jugada. Las variantes `( … )` no se permiten en otras líneas.
10. `[%hint]` solo en jugadas propias.
11. Los comentarios del PGN (texto y `[%hint]`) no llevan comillas invertidas.

## Verificación con el motor

`MOTOR=1 npm run biblioteca:motor` evalúa cada ficha con Stockfish (desde el lado de la ficha, en peones) y guarda el resultado en `verificacion.json`. Umbrales (`src/library/thresholds.ts`):

- Variante: final `>= -0,7` (`>= -1,5` si es gambito).
- Trampa a favor: final `>= +2,0`; la posición previa al error del rival (la que deja tu última jugada propia, `trapPly`) `>= -0,5`, así también se verifican las jugadas propias que llevan a la trampa; y la posición justo después de la jugada marcada del rival `>= +1,0`, para que el error marcado sea de verdad el error y no haga falta un segundo desliz sin marcar.
- Trampa en contra: la jugada correcta `>= -0,5`; la posición tras la primera jugada de la caída `<= -1,0`; y el final de la caída `<= -2,0`.

Cada entrada lleva `"version": 2`; una entrada es vigente solo con esa versión y el hash de la ficha. Al cambiar los criterios se sube `VERSION_VERIFICACION` y se re-verifica todo el catálogo.

## Ejemplo completo

````markdown
---
id: caro-kann
nombre: Defensa Caro-Kann
alias: Caro-Kann Defense, Caro Kann
lado: negras
grupo: Contra 1.e4
orden: 10
eco: B10-B19
nivel: principiante, club
jugadas: 1. e4 c6
resumen: Una defensa sólida que prepara d5 sin dejar el alfil de casillas claras encerrado.
---
## Para empezar
Con **1...c6** preparás **2...d5** apoyando el peón. A diferencia de la Francesa, el alfil de casillas claras puede salir antes de cerrar la estructura.

## Ideas y planes
- Plantar un peón en d5 y cambiarlo o sostenerlo según lo que haga el rival.
- Sacar el alfil de c8 a f5 o g4 antes de jugar e6.
- Buscar un final sólido con una estructura de peones sana.

## Consejos
- Antes de jugar e6, preguntate dónde queda tu alfil de casillas claras.
- Ante el avance 3.e5, atacá la cadena de peones con c5.
- No te apures a capturar peones si dejás atrás una pieza sin desarrollar.

## Variante: Avance {#avance} [básica]
Las blancas ganan espacio con e5. Vos respondés con el alfil afuera.

```pgn
1. e4 c6 2. d4 d5 3. e5 Bf5 { [%hint Sacá el alfil antes de cerrar con e6.] El alfil sale antes de cerrar la cadena. } 4. Nf3 e6 5. Be2 c5 { Ataca la base de la cadena. [%cal Gc5d4] } 6. Be3 cxd4 7. Nxd4 Ne7
```

Con la cadena firme y el alfil activo, tu juego está cómodo.

## Variante: Clásica {#clasica} [club]
```pgn
1. e4 c6 2. d4 d5 3. Nc3 dxe4 { Cambiás el peón central para abrir líneas. } 4. Nxe4 Nd7 { [%hint Prepara Ngf6 sin permitir la doble del peón.] } 5. Nf3 Ngf6 6. Nxf6+ Nxf6
```

Después del cambio de caballos, la estructura queda sana.

## Trampa a favor: El salto a d6 sin mate {#salto-a-d6} [básica]
Es la otra cara de la trampa en contra de abajo: con `5...Ndf6` el caballo de d7 ya no tapa a tu dama. Si el rival salta igual a d6 buscando el mate, ganás una pieza.

```pgn
1. e4 c6 2. d4 d5 3. Nc3 dxe4 4. Nxe4 Nd7 5. Qe2 Ndf6 6. Nd6+?? { Ya no es mate: con d7 libre, la dama de d8 cubre d6. } Qxd6
```

Con una pieza de más, desarrollá el resto y no te apures a cambiar tu dama.

## Trampa en contra: Mate en d6 {#mate-en-d6} [básica]
Cuidado con elegir el caballo equivocado.

```pgn
1. e4 c6 2. d4 d5 3. Nc3 dxe4 4. Nxe4 Nd7 5. Qe2 Ndf6 (5... Ngf6?? { Deja la casilla d6 sin cubrir. } 6. Nd6#) 6. Nxf6+ Nxf6
```
````
