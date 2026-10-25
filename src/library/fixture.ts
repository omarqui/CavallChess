/** Ficha de prueba (Caro-Kann reducida). La usan los tests de la biblioteca; no es contenido real. */
export const FICHA_PRUEBA = `---
id: prueba
nombre: Defensa de Prueba
alias: Test Defense
lado: negras
grupo: Contra 1.e4
orden: 1
eco: B10-B19
nivel: principiante, club
jugadas: 1. e4 c6
resumen: Ficha de prueba.
---
## Para empezar
Jugás **c6** para preparar d5 con una estructura sólida.

## Ideas y planes
Sacá el alfil de las casillas claras antes de cerrar la estructura con e6.

## Consejos
- No muevas el alfil de casillas claras después de e6.
- Cambiá los caballos solo si te dejan sin problemas.

## Variante: Avance {#avance} [básica]
Las blancas empujan el peón y ganan espacio.

\`\`\`pgn
1. e4 c6 2. d4 d5 3. e5 Bf5 { [%hint Sacá el alfil antes de cerrar con e6.] } 4. Nf3 e6
\`\`\`

Ahora el alfil queda afuera de la cadena de peones.

## Variante: Karpov {#karpov} [club]
\`\`\`pgn
1. e4 c6 2. d4 d5 3. Nc3 dxe4 { Cambiás el peón central. [%cal Gd5e4] } 4. Nxe4 Nd7 5. Nf3 Ngf6
\`\`\`

## Trampa a favor: Cambio {#cambio} [club]
\`\`\`pgn
1. e4 c6 2. d4 d5 3. e5 Bf5 4. Nf3 e6 5. Bd3?? { Regala el alfil. } Bxd3 6. Qxd3
\`\`\`

## Trampa en contra: Mate en d6 {#mate} [básica]
Cuidado con la jugada natural.

\`\`\`pgn
1. e4 c6 2. d4 d5 3. Nc3 dxe4 4. Nxe4 Nd7 5. Qe2 Ndf6 (5... Ngf6?? 6. Nd6#) 6. Nxf6+ Nxf6
\`\`\`
`;
