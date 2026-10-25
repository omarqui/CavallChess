---
id: eslava
nombre: Defensa Eslava
alias: Slav Defense, Eslava
lado: negras
grupo: Contra 1.d4
orden: 10
eco: D10-D19
nivel: principiante, club
jugadas: 1. d4 d5 2. c4 c6
resumen: Sostenés d5 con el peón de c y dejás libre el alfil de c8 para sacarlo a f5 antes de jugar e6.
---
## Para empezar
Contra el Gambito de Dama sostenés d5 con `2...c6`. La ventaja frente a `2...e6` es que tu alfil de casillas claras no queda encerrado. Como en la Caro-Kann, la regla es **primero el alfil afuera, después e6**.

La regla tiene una excepción: contra `3.Nc3` y `4.e3`, si sacás el alfil enseguida, las blancas cambian en d5 y su dama en b3 ataca b7. Ahí el alfil espera y primero va `...a6`, como ves en la Variante Chebanenko.

- Sostené d5 con c6 y sacá el caballo a f6.
- Si tenés la oportunidad, sacá el alfil a f5 antes de jugar e6.
- Enrocá corto y recién después buscá rupturas como c5 o e5.
- Cuando tu alfil se va de c8, el peón de b7 queda más flojo: la dama blanca suele ir a b3 a atacarlo.

## Ideas y planes
- **Variante Checa (`4.Nc3 dxc4 5.a4 Bf5`):** tomás el peón de c4 por un rato para sacar el alfil con tiempo. Las blancas lo recuperan, pero vos ya desarrollaste. Después el plan es `...Bb4`, `...Nbd7` y, cuando las blancas empujen e4, retirar el alfil y plantar un caballo en d5. Da lo mismo si llegan por `3.Nf3 Nf6 4.Nc3` o por `3.Nc3 Nf6 4.Nf3`: después de `4...dxc4` la posición es la misma.
- **Contra `5.e3`** sí podés sostener el peón de c4 con `...b5`: ganás espacio en el flanco de dama y el caballo blanco termina en el borde.
- **Eslava lenta (`4.e3`):** el alfil sale a f5 sin entregar nada. Si las blancas lo cambian con Nh4, recapturás con el peón de h y te queda la columna h abierta para la torre: un arma concreta contra el enroque blanco.
- **Chebanenko (`3.Nc3 Nf6 4.e3 a6`):** con `...a6` esperás a que las blancas definan su juego y preparás `...b5`. Cuando el caballo sale a f3, `...b5` gana espacio y el alfil encuentra una buena casilla en g4. Si las blancas cierran el flanco de dama con `c5`, tu ruptura típica es `...e5`, preparada con `...Nbd7`.
- **Cambio (`3.cxd5`):** estructura simétrica. Desarrollo rápido, alfil a f5 y la columna c, la única abierta, para tus torres.

## Consejos
- Si tu alfil está en f5 y la dama blanca aparece en b3, pensá cómo defendés b7 antes de seguir desarrollando.
- Contra `3.Nc3` y `4.e3`, no saques el alfil todavía: primero `...a6`.
- En la Variante Checa no te aferres al peón de c4: lo importante es el desarrollo.
- Después de `Nxg6 hxg6`, la columna h es tuya: si las blancas se olvidan de cuidar h2, hay sacrificios.
- En el Cambio, llevá una torre a la columna c antes que tu rival.

## Variante: Variante Checa {#checa} [club]
La línea principal. Con `4.Nc3 dxc4 5.a4` las blancas impiden que sostengas el peón con b5; vos aprovechás el tiempo para sacar el alfil. Si empiezan con `3.Nc3` y siguen con `4.Nf3`, después de `4...dxc4` llegás a la misma posición.

```pgn
1. d4 d5 2. c4 c6 3. Nf3 Nf6 4. Nc3 dxc4 5. a4 Bf5 { [%hint Sacá el alfil de casillas claras antes de cerrar con e6.] }
6. e3 e6 7. Bxc4 Bb4 { [%hint Clavá al caballo que ayuda a empujar el peón de e.] Así e4 cuesta más. }
8. O-O O-O 9. Qe2 Nbd7 10. e4 Bg6 { [%hint Retirá el alfil atacado sin dejar de mirar e4.] }
11. Bd3 Bh5 { [%hint Clavá el caballo contra la dama.] }
12. e5 Nd5 { [%hint Ocupá la casilla que el peón dejó de controlar al avanzar.] }
13. Nxd5 cxd5
```

La estructura quedó cerrada: las blancas tienen espacio en el flanco de rey y vos una base firme en d5. Seguí con `...Be7`, `...Rc8` y juego por la columna c; tu alfil de h5 puede volver a g6 para cambiarse por el de d3.

## Variante: Variante Alekhine {#alekhine} [básica]
Esta vez las blancas empiezan con `3.Nc3` y sacan el caballo a f3 una jugada después: con `4...dxc4` llegás a la misma posición de la Variante Checa. Si ahora no juegan `5.a4` sino `5.e3`, quieren recuperar el peón con el alfil. Como todavía no jugaron a4, podés sostenerlo con b5.

```pgn
1. d4 d5 2. c4 c6 3. Nc3 Nf6 4. Nf3 dxc4 5. e3 b5 { [%hint Defendé el peón que ganaste, ahora que todavía se puede.] }
6. a4 b4 { [%hint Echá al caballo del centro.] }
7. Na2 e6 8. Bxc4 Be7 9. O-O O-O
```

Igualaste: el caballo de a2 tiene que dar una vuelta para volver al juego. Seguí con `...Nbd7`, `...Bb7` y la ruptura `...c5`.

## Variante: Eslava lenta {#lenta} [básica]
Con `4.e3` las blancas encierran su alfil de c1 y te dejan sacar el tuyo sin problemas.

```pgn
1. d4 d5 2. c4 c6 3. Nf3 Nf6 4. e3 Bf5 { [%hint Sacá el alfil de casillas claras antes de cerrar con e6.] }
5. Nc3 e6 6. Nh4 Bg6 { [%hint Retirá el alfil a una casilla donde, si te lo cambian, la recaptura te abra una columna.] }
7. Nxg6 hxg6 { Tu estructura sigue sana y la torre de h8 ya mira a h2. [%cal Gh8h2] }
8. Bd3 Nbd7 9. O-O Bd6 { [%hint Apuntá otra pieza al mismo punto que tu torre.] Ahora hay una amenaza concreta: Bxh2+. }
10. h3 { Una de las pocas defensas buenas: con el peón en h3, tu torre ya no protege a un alfil que entre en h2. g3 y f4 también sirven, porque tapan la diagonal. } O-O
```

Las blancas se cubrieron, así que ahora sí enrocás. El plan es preparar la ruptura `...e5` (con `...Qe7` o `...Re8`) para liberar el juego. Si en cambio las blancas no cuidan h2, mirá la trampa de esta ficha.

## Variante: Variante Chebanenko {#chebanenko} [club]
Contra `3.Nc3` y `4.e3` la regla del alfil tiene una excepción. Si lo sacás ya, las blancas cambian en d5 y la dama en b3 ataca b7: tenés que volver con el alfil a c8 o entregar un peón. Por eso primero jugás `4...a6`, una jugada de espera que prepara `...b5`.

```pgn
1. d4 d5 2. c4 c6 3. Nc3 Nf6 4. e3 a6 { [%hint Si sacás ya el alfil, b7 queda flojo: esperá con una jugada de peón que prepare ganar espacio en el flanco de dama.] }
5. Nf3 b5 { [%hint Aprovechá lo que preparaste en la jugada anterior: ganá espacio y presioná c4.] }
6. b3 Bg4 { [%hint Ahora sí: sacá la pieza que estaba esperando, con presión sobre un defensor del centro blanco.] El caballo de f3 queda clavado contra la dama. }
7. h3 Bxf3 { Antes de que te lo echen, cambiás el alfil por el caballo que vigilaba d4 y e5. }
8. Qxf3 e6 { Ahora sí cerrás con e6: el alfil ya no puede quedar encerrado, porque lo cambiaste. }
9. Bd3 Bb4 { El alfil clava al caballo de c3. }
10. Bd2 Nbd7 11. O-O O-O
```

Posición sólida y pareja. El plan es preparar una ruptura en el centro, `...e5` o `...c5`, según cómo se ubiquen las blancas. Si te preguntan al alfil con `a3`, retirarlo a e7 o d6 está bien.

## Variante: Variante del Cambio {#cambio} [básica]
Con `3.cxd5 cxd5` la posición queda simétrica. El que desarrolla mejor y ocupa primero la columna c, juega con más comodidad.

```pgn
1. d4 d5 2. c4 c6 3. cxd5 cxd5 4. Nc3 Nf6 5. Bf4 Nc6 6. e3 Bf5 { [%hint Sacá el alfil de casillas claras antes de cerrar con e6.] }
7. Nf3 e6 8. Bb5 Nd7 9. Qa4 Rc8 { [%hint Defendé el caballo clavado con una pieza que además ocupe la columna abierta.] }
10. O-O a6 { [%hint Preguntale al alfil qué piensa hacer.] }
11. Bxc6 Rxc6 { Recapturás con la torre, que queda activa en la columna c. }
```

Posición pareja. Seguí con `...Be7`, el enroque y `...Qb6`, que presiona b2.

## Trampa a favor: Sacrificio en h2 {#sacrificio-en-h2} [club]
En la Eslava lenta, después de `Nxg6 hxg6` tu torre ya apunta a h2. Si las blancas siguen desarrollándose como si nada, el alfil entra en h2 con jaque y el rey no lo puede tomar.

```pgn
1. d4 d5 2. c4 c6 3. Nf3 Nf6 4. e3 Bf5 5. Nc3 e6 6. Nh4 Bg6 7. Nxg6 hxg6 8. Bd3 Nbd7 9. O-O Bd6
10. Qc2?? { Parece desarrollo normal, pero no hace nada contra la amenaza Bxh2+. }
Bxh2+ { [%hint Entrá con jaque en la casilla que cubre tu torre.] }
11. Kh1 { El rey no puede comer: la torre de h8 defiende al alfil. }
Ne4 { [%hint Sumá otra pieza al ataque y prepará un jaque a la descubierta.] }
12. g3 Bxg3+ { Jaque a la descubierta: al moverse el alfil, la torre ve al rey por la columna h. }
13. Kg2 Rh2+ 14. Kg1 Qh4
```

Las amenazas de mate no tienen defensa. El patrón para recordar: columna h abierta, torre en h8 y alfil en d6 contra un enroque que no cubrió h2.
