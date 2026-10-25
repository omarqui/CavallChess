---
id: contra-petrov-y-philidor
nombre: Contra la Petrov y la Philidor
alias: Defensa Petrov, Petroff, Defensa Rusa, Defensa Philidor, Petrov Defense, Philidor Defense, Gambito Stafford
lado: blancas
grupo: Contra las respuestas a 1.e4
orden: 10
eco: C41-C43
nivel: principiante, club
jugadas: 1. e4 e5 2. Nf3
resumen: Qué hacer cuando el negro no defiende e5 con 2...Nc6: la Petrov, el Gambito Stafford y la Philidor.
nombrar-raiz: no
---
## Para empezar
Después de `2.Nf3` atacás el peón de e5. Lo más común es que el negro lo defienda con `2...Nc6`, pero a veces elige otro camino:

- Con `2...Nf6` (la **Petrov**) contraataca tu peón de e4 en lugar de defender el suyo.
- Con `2...d6` (la **Philidor**) lo defiende con un peón: sólido, pero le encierra el alfil de f8.

En las dos tu objetivo es el mismo: desarrollar rápido, enrocar y aprovechar que el negro juega un poco pasivo. Y hay que conocer un par de trucos, porque en partidas rápidas aparecen todo el tiempo.

## Ideas y planes
- **Petrov:** tomás en e5 y, cuando el negro recupera el peón, ofrecés el cambio de caballos con `5.Nc3`. Después de `6.dxc3` tenés la columna d abierta y el desarrollo más fácil. El plan es Be3, Qd2 y enroque largo, y avanzar los peones del flanco de rey contra el enroque negro.
- **Gambito Stafford:** el negro entrega un peón para atacar f2 con el alfil y el caballo. No hace falta refutarlo con brillo: cambiás el caballo, defendés e4 con un peón y desarrollás sin dar blancos.
- **Philidor:** el alfil va a c4 apuntando a f7 y el peón a d4 para abrir el centro. Con más espacio y piezas más activas, tus torres van a la columna e.
- El alfil de c4 y el caballo de f3 son la base de los trucos tácticos: f7 es el punto débil del negro mientras no enroque.

## Consejos
- En la Petrov, si el negro copia y toma en e4 antes de echar a tu caballo, `Qe2` lo pone en problemas.
- Contra el Stafford, no claves el caballo de f6 con el alfil: no está clavado y el negro te da mate.
- Si el negro clava tu caballo con ...Bg4, preguntale al alfil con `h3` antes de seguir.
- Antes de tomar un peón que parece regalado, mirá si tu rey queda en una diagonal abierta.

## Variante: Petrov, Ataque Nimzowitsch {#petrov-nimzowitsch} [básica]
La Petrov es simétrica y sólida. Con `5.Nc3` la sacás de la teoría tranquila: cambiás caballos, enrocás largo y jugás con los reyes en flancos opuestos.

```pgn
1. e4 e5 2. Nf3 Nf6 3. Nxe5 { [%hint El peón de e5 quedó sin defensa.] } d6 { Lo correcto: primero echa a tu caballo. } 4. Nf3 { [%hint Tu caballo está atacado: volvé a una casilla segura y central.] } Nxe4 { Ahora sí recupera el peón. } 5. Nc3 { [%hint Ofrecé el cambio de caballos: tu desarrollo va a quedar más rápido que el suyo.] Si 5...Nf6, jugá d4 y desarrollo normal. } Nxc3 6. dxc3 { [%hint Tomá de modo que se abra una columna para tu dama y tus torres.] } Be7 7. Be3 O-O 8. Qd2 { [%hint Prepará el enroque del lado de la dama.] } Nd7 9. O-O-O c6 10. Bd3 d5 11. h4 { [%hint Con los reyes en flancos opuestos, avanzá peones contra su enroque.] }
```

Con el enroque largo y la columna d abierta, tu plan es claro: h4-h5, Ng5 si se puede, y traer las torres al flanco de rey. El negro no tiene debilidades, así que la ventaja es chica, pero vos tenés el juego más fácil.

## Trampa a favor: La copia en la Petrov {#copia-en-la-petrov} [básica]
Si el negro copia tu jugada y toma en e4 antes de echar a tu caballo, hay un jaque descubierto que gana la dama.

```pgn
1. e4 e5 2. Nf3 Nf6 3. Nxe5 Nxe4?! { Copia tu jugada, pero se olvida de que su peón no volvió. } 4. Qe2 { [%hint Atacá su caballo y ocupá con la dama la columna de su rey.] } Nf6?? { Retirarse parece natural, pero ahora tu caballo puede moverse con jaque. } 5. Nc6+ { [%hint Mové el caballo con jaque de la dama y atacá la pieza más grande.] Jaque de la dama en e2 y, además, el caballo ataca la dama negra. } Be7 6. Nxd8 Kxd8
```

Cambiaste un caballo por la dama. Lo mejor para el negro era `4...Qe7`: ahí tomás en e4 y quedás un poco mejor, sin regalos.

## Trampa en contra: Gambito Stafford {#gambito-stafford} [básica]
Con `3...Nc6` el negro entrega un peón para atacar f2. Es muy popular en partidas online porque esconde varias trampas; la más famosa castiga una clavada que parece lógica.

```pgn
1. e4 e5 2. Nf3 Nf6 3. Nxe5 Nc6 { El Gambito Stafford. } 4. Nxc6 { [%hint Cambiá el caballo atacado en lugar de retirarlo.] } dxc6 { Abre líneas para sus dos alfiles. } 5. d3 { [%hint Sostené tu peón central con otro peón, no con piezas.] Defiende e4 y abre la diagonal del alfil de c1. } Bc5 { Apunta a f2. } 6. Be2 { [%hint Desarrollá vigilando la casilla g4, que es la que busca su caballo.] } (6. Bg5?? { Parece una clavada molesta, pero el caballo de f6 no está clavado. } Nxe4! { Si tomás la dama, mate; y si no la tomás, igual perdés material. } 7. Bxd8 Bxf2+ 8. Ke2 Bg4#) h5 { Prepara ...Ng4 o ...h4. } 7. c3 { [%hint Preparate para echar al alfil de c5 con un peón central.] Prepara d4, que corta la diagonal del alfil. }
```

Con d4 en camino, el alfil de c5 pierde su diagonal y el peón de más se empieza a notar. Antes de enrocar, revisá que ...Ng4 no deje a f2 o h2 sin defensa.

## Variante: Philidor con 3.Bc4 {#philidor} [básica]
Contra la Philidor sacás el alfil a c4 y abrís el centro con d4. En esta línea el negro usa un truco conocido para cambiar piezas: hay que saber responderlo.

```pgn
1. e4 e5 2. Nf3 d6 { La Philidor: defiende el peón con otro peón. } 3. Bc4 { [%hint Desarrollá apuntando al punto débil del negro, f7.] Si 3...Nc6, jugá 4.Nc3; y si 4...Bg4 5.h3 Bh5?!, llegás a la posición del mate de Legal. Si 3...Nf6, 4.d4 exd4 5.Nxd4 y con 5...Be7 6.Nc3 llegás a esta misma línea (si 5...Nxe4, 6.Qe2 recupera el material). 4.Ng5 parece fuerte, pero 4...d5 alcanza para igualar. } Be7 4. d4 { [%hint Ahora que tu alfil mira a f7, discutí el centro con un peón.] } exd4 { Si 4...Nf6?, tomá en e5: ganás material (y si 5...Nxe4?, 6.Qd5). } 5. Nxd4 Nf6 6. Nc3 O-O 7. O-O Nxe4 { El truco de la horquilla: toma y recupera la pieza con ...d5. } 8. Nxe4 d5 { El peón ataca a la vez tu alfil y tu caballo. } 9. Bd3 { [%hint Salvá el alfil sin dejar solo al caballo.] } dxe4 10. Bxe4 Nd7 11. Re1
```

El material está igualado, pero tenés más espacio y las piezas más activas. Ubicá el alfil de c1 (Bf4 o Be3), poné la dama en f3 o e2 y presioná por la columna e.

## Trampa a favor: Mate de Legal {#mate-de-legal} [básica]
Si el negro clava tu caballo con el alfil y lo mantiene clavado a toda costa, la clavada resulta falsa.

```pgn
1. e4 e5 2. Nf3 d6 3. Bc4 Bg4 { Clava tu caballo contra la dama. } 4. Nc3 Nc6 5. h3 { [%hint Preguntale al alfil qué quiere hacer.] } Bh5?! { Mantiene la clavada; lo sano era cambiar en f3. } 6. Nxe5! { [%hint La clavada es falsa: si te toma la dama, tenés mate con tus piezas menores.] Entregás la dama a propósito. } Bxd1?? { Toma la dama y cae en mate. Con 6...Nxe5 7.Qxh5 también quedabas con un peón de más. } 7. Bxf7+ Ke7 8. Nd5#
```

Ese patrón (un caballo que se entrega, el alfil que da jaque en f7 y el otro caballo que da mate) se llama mate de Legal. Funciona porque nada negro cubre d5: si el negro tiene un caballo en f6, Nd5 ya no es mate y Nxe5 pierde una pieza.
