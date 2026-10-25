---
id: sistema-londres
nombre: Sistema Londres
alias: London System, Londres
lado: blancas
grupo: Abrís con 1.d4 y otras
orden: 10
eco: A45-A48, D00-D02
nivel: principiante, club
jugadas: 1. d4
resumen: Un esquema que armás casi igual contra todo: el alfil a f4, los peones en c3, d4 y e3, y un desarrollo tranquilo y sólido.
---
## Para empezar
Abrís con `1.d4` y, contra casi cualquier respuesta, sacás el alfil de casillas oscuras a f4 en la segunda jugada. Lo hacés antes de mover el peón de e, porque después de `e3` ese alfil quedaría encerrado detrás de tus propios peones.

Con el alfil afuera, completás una estructura que se repite partida tras partida: peones en c3, d4 y e3, caballos en f3 y d2, el otro alfil en d3 o e2 y enroque corto. Es una apertura de planes más que de memoria.

- Primero el alfil a f4, después `e3`.
- El triángulo c3, d4, e3 sostiene tu centro y casi no tiene puntos débiles.
- Desarrollá todas las piezas antes de buscar pelea.
- Mirá siempre qué ataca la dama negra cuando sale a b6.

## Ideas y planes
**La casilla e5.** Tu peón de d4 controla e5, y un caballo plantado ahí presiona el flanco de rey negro y la casilla c6. Si las negras lo desafían, podés sostenerlo con el otro caballo desde f3.

**El alfil de f4.** Es tu mejor pieza, y las negras van a intentar cambiarlo con `...Bd6` o perseguirlo con `...Nh5`. Contra `...Bd6` podés retroceder a g3: si cambian ahí, recapturás con el peón de h y tu torre gana la columna. Cuando el peón de e ya se fue (porque recapturaste en d4), también está bien aceptar el cambio. Contra los esquemas con `...g6` conviene jugar `h3` temprano, para que el alfil tenga la casilla h2.

**La presión sobre b2.** Contra `...c5` y `...Qb6` la respuesta depende de dónde está tu peón de c:

- **Si todavía está en c2**, no defendés b2: desarrollás el caballo a c3. Con un peón negro en d5, el caballo ya lo ataca y comer en b2 pierde material enseguida; sin ese peón, comer es arriesgado para las negras, aunque la mejor defensa alcanza para igualar.
- **Si ya jugaste `c3`**, el caballo no tiene esa casilla. Lo normal es `Qb3`: cuida b2 y ofrece el cambio de damas. Si las negras cambian en b3, recapturás con el peón de a y la columna queda para tu torre; si cambiás vos en b6, los peones doblados son de ellas. Según la posición, también sirven `Qc2` o `b3`.

**Las rupturas.** Cuando terminás el desarrollo, el juego se abre con `e4` (si tenés la torre en e1 y el centro preparado) o con `c4`, para ganar espacio en el flanco de dama.

## Consejos
- No juegues `e3` antes de sacar el alfil a f4: después queda encerrado.
- Cada vez que la dama negra llegue a b6, preguntate qué pasa si come en b2: con el peón en c2, `Nc3`; con el peón ya en c3, `Qb3`.
- Contra el fianchetto (`...g6` y `...Bg7`), jugá `h3` antes de que el caballo negro llegue a h5.
- Si te desafían el caballo de e5, sostenelo con el otro caballo desde f3.
- La estructura es sólida, pero no automática: si el rival hace algo raro, mirá qué amenaza antes de seguir con el esquema.

## Variante: Clásica contra 1...d5 {#clasica} [básica]
Las negras arman lo más natural: `...d5`, `...Nf6`, `...e6` y `...c5`. Vos completás el triángulo, conservás el alfil de f4 y plantás un caballo en e5.

```pgn
1. d4 d5 2. Bf4 { [%hint Sacá primero la pieza que, si esperás, va a quedar encerrada detrás de tus peones.] El alfil sale antes de jugar e3. } Nf6 3. e3 { [%hint Sostené el peón de d4 y abrile paso al otro alfil.] } e6 4. Nf3 c5 5. c3 { Con c3 el peón de d4 queda firme: es el triángulo típico del Londres. [%csl Gc3,Gd4,Ge3] } Nc6 { Si en vez de esto juegan 5...Qb6, la respuesta típica es 6.Qb3. } 6. Nbd2 Bd6 { Si juegan 6...Qb6, cuidá b2 con 7.Qb3 o con 7.Rb1. } 7. Bg3 { [%hint Si te ofrecen el cambio de alfiles, retrocedé a una casilla donde el cambio te abra una columna.] Si las negras cambian en g3, recapturás con el peón de h y la columna h queda para tu torre. } O-O 8. Bd3 Qe7 9. Ne5 { [%hint Llevá un caballo a un puesto avanzado desde donde presione el flanco de rey negro.] Desde e5 el caballo mira c6 y el flanco de rey negro. [%csl Ge5] } Nd7 { Las negras desafían al caballo. } 10. Ndf3 { El otro caballo lo sostiene desde f3. }
```

Seguí con el enroque y la dama a c2 o e2. Fijate siempre si las negras pueden echar tu caballo con `...f6`, y si cambian en e5, recapturá de forma que la casilla siga bajo tu control.

## Variante: Contra 2...c5 y 3...Nc6 {#c5-nc6} [básica]
Las negras atacan tu centro enseguida. Si cambian en d4, recapturás con el peón de e y la estructura se simplifica. Después, cuando la dama negra va a b6 con tu peón ya en c3, la respuesta es la dama a b3.

```pgn
1. d4 d5 2. Bf4 c5 3. e3 Nc6 4. Nf3 cxd4 5. exd4 { [%hint Recapturá hacia el centro y dejá abierta una columna para tus piezas.] } Bg4 6. c3 { El peón de d4 queda bien sostenido y el alfil de f4 tiene su diagonal libre. } Qb6 { Ataca b2. } 7. Qb3 { [%hint Con el peón en c3 el caballo ya no tiene casilla: cuidá b2 con una pieza que además ofrezca un cambio.] Si cambian damas en b3, recapturás con el peón de a y la columna a se abre para tu torre. Si cambian en f3, tomá con el peón de g: la posición sigue pareja. } e6 8. Nbd2 Nf6 9. Qxb6 { Ahora cambiás vos: las negras quedan con peones doblados en b. } axb6 10. Bb5 { [%hint Molestá al caballo de c6, que vigila e5 y d4.] } Nd7 11. h3 { Le preguntás al alfil de g4 qué quiere hacer. } Bf5 12. O-O
```

Final cómodo para vos: los peones doblados en b son una debilidad negra a largo plazo. Seguí con `Rfe1` y, si te dejan, con un caballo en e5. Si en vez de `6...Qb6` juegan `6...e6`, seguí con `7.Nbd2`, y si el alfil sale a d6, cambialo: con los peones negros en d5 y e6, es una buena pieza negra. Si en la cuarta jugada juegan `4...Nf6`, seguí con `5.c3` y tu esquema de siempre.

## Variante: Contra 2...c5 y 3...Qb6 {#c5-qb6} [club]
La dama negra ataca b2 en la tercera jugada. No lo defendés: tu peón de c sigue en c2, así que desarrollás el caballo a c3, que ataca d5. Ese peón no tiene defensa, y comer en b2 sería ignorar esa amenaza (mirá la trampa que sigue). Lo normal es que las negras defiendan d5 y sigan desarrollándose.

```pgn
1. d4 d5 2. Bf4 c5 3. e3 Qb6 4. Nc3 { [%hint No defiendas el peón atacado: desarrollá una pieza que presione el centro negro.] Ahora atacás d5. } Nf6 5. Nb5 { [%hint Buscá con el caballo las casillas flojas del flanco de dama negro.] El caballo mira c7, d6 y a7. } Na6 { Cubre c7. } 6. c3 { Sostenés d4 y le quitás al caballo de a6 la casilla b4. } cxd4 7. exd4 g6 8. Nf3 Bg7 9. a4 { [%hint Usá un peón del flanco para molestar a la dama.] } O-O 10. a5 { La dama tiene que retroceder. } Qd8 11. h3 { [%hint Antes de seguir, dale al alfil una retirada por si lo persiguen.] Le das al alfil la casilla h2 y le quitás g4 al alfil negro. }
```

Tenés más espacio en el flanco de dama y el caballo de a6 está lejos del centro. Completá el desarrollo y enrocá corto; la ventaja es chica pero duradera.

## Trampa a favor: Peón envenenado en b2 {#peon-envenenado} [básica]
Contra `3...Qb6` jugás `4.Nc3` y dejás b2 sin defensa a propósito. El caballo ya amenaza `5.Nxd5`: el peón de d5 no tiene quién lo cuide, y desde d5 el caballo atacaría además a la dama en b6. Si la dama se va a comer b2, ignora esa amenaza y la paga cara.

```pgn
1. d4 d5 2. Bf4 c5 3. e3 Qb6 4. Nc3 Qxb2?? { Ignora la amenaza: d5 sigue sin defensa y ahora la dama está lejos, sin poder ayudar. } 5. Nxd5 { [%hint Capturá algo que quedó suelto, y que además te deje amenazar un jaque doble.] Amenazás Nc7+, que ataca al rey y a la torre de a8 a la vez. [%cal Gd5c7] } Nf6 6. Rb1 { [%hint Sacá la torre del ataque de la dama atacándola a ella.] } Qxa2 7. Nc7+ Kd8 8. Nxa8
```

Ganaste una torre a cambio de un peón: la ventaja es decisiva. Si después de `5.Nxd5` las negras juegan otra cosa, tu ventaja sigue siendo enorme: la dama negra quedó lejos de la defensa y tus piezas llegan primero.

## Variante: Contra la India de Rey {#india-de-rey} [básica]
Con `1...Nf6`, `...g6` y `...Bg7` las negras arman un fianchetto. Vos seguís con tu esquema, le das al alfil una retirada y frenás el avance de los peones negros del flanco de dama.

```pgn
1. d4 Nf6 2. Bf4 { [%hint La misma idea que contra 1...d5: sacá la pieza que tus peones van a encerrar.] } g6 3. e3 Bg7 4. Nf3 O-O 5. Be2 { Desarrollo tranquilo: contra el fianchetto, el alfil en e2 está seguro. } d6 6. h3 { [%hint Prevení que te cambien el alfil con un caballo que salte al borde del tablero.] Si el caballo negro va a h5, tu alfil se refugia en h2. } c5 7. c3 b6 { Si juegan 7...Qb6, respondé 8.Qb3: con el peón en c3, la dama es la que cuida b2. } 8. O-O Bb7 9. Nbd2 Nbd7 10. a4 { [%hint Frená el avance de los peones negros del flanco de dama.] Ahora ...b5 ya no les sale gratis. } a6 11. Re1
```

Con todo desarrollado, la posición es equilibrada y de maniobras. Retirá el alfil a h2 o g3 antes de que lo molesten con `...Nh5` o con la ruptura `...e5`, y pensá en llevar la dama a b3 para presionar el flanco de dama.

## Variante: Contra 1...Nf6 y 2...c5 {#nf6-c5} [club]
La misma idea de `...c5` y `...Qb6`, pero sin el peón en d5. Igual dejás b2 y desarrollás, y esta vez las negras sí pueden comer: hay que saber qué hacer.

```pgn
1. d4 Nf6 2. Bf4 c5 3. e3 Qb6 4. Nc3 { [%hint Igual que contra 1...d5: desarrollá antes que defender el peón atacado.] } Qxb2 { Las negras aceptan el peón. } 5. Nb5 { [%hint La dama negra se fue lejos: amenazá un jaque doble con el caballo.] Amenazás Nc7+, que ataca al rey y a la torre de a8 a la vez. [%cal Gb5c7] } Nd5 { La única defensa buena: el caballo cubre c7 y ataca tu alfil. Ojo, la natural 5...Na6? pierde: 6.a3! prepara encerrar a la dama, por ejemplo con Bc4 y Ra2. } 6. Rb1 { [%hint Echá a la dama con una torre.] } Qxa2 7. Ra1 { Otra vez a la dama. } Qb2 8. Nf3 { [%hint En vez de repetir, sumá una pieza más al juego.] Si preferís el empate, podés repetir con 8.Rb1. }
```

Las negras ganaron dos peones, pero su dama está lejos y a vos te queda todo el desarrollo por delante. Según el motor la posición está pareja, y es muy filosa. Si en la cuarta jugada no comen y cambian con `4...cxd4`, recapturá con `5.exd4` y seguí con `Nf3`, `Be2`, el enroque y `Na4` para echar a la dama. Si más adelante comen en b2, el salto `Nb5` vuelve a ser la respuesta.
