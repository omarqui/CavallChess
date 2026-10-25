---
id: gambito-de-dama
nombre: Gambito de Dama
alias: Queen's Gambit, Gambito de Dama Rehusado, Defensa Eslava, Gambito de Dama Aceptado, Contragambito Albin
lado: blancas
grupo: Abrís con 1.d4 y otras
orden: 20
eco: D06-D69
nivel: principiante, club
jugadas: 1. d4 d5 2. c4
resumen: Ofrecés el peón de c para quitarle el centro al negro, con un plan claro contra el Rehusado, la Eslava y el Aceptado.
---
## Para empezar
Con `2.c4` atacás el peón de d5 desde el costado. No es un gambito de verdad: si el negro toma en c4, vas a recuperar el peón casi siempre. La idea es que el negro no pueda sostener su peón central sin hacer alguna concesión.

Hay tres respuestas principales:

- `2...e6`, el **Rehusado**: defiende d5 con un peón pero encierra el alfil de c8.
- `2...c6`, la **Eslava**: defiende d5 y deja salir ese alfil.
- `2...dxc4`, el **Aceptado**: toma el peón y cede el centro para recuperarlo con desarrollo.

## Ideas y planes
- **Rehusado:** cambiás en d5 y llegás a la estructura del cambio. Tu plan es el **ataque de minorías**: con los peones a y b (dos contra tres) avanzás b4-b5 para dejarle al negro un peón débil en c6 o en d5.
- **Eslava:** si el alfil negro sale a f5, lo perseguís con el caballo desde h4 y te quedás con la pareja de alfiles. Después, la ruptura e4 abre el juego a tu favor.
- **Aceptado:** recuperás el peón con el alfil y, si el negro ataca tu centro con ...c5, simplificás cambiando damas. Quedás con mejor desarrollo y, si el negro retoma con el rey, sin enroque para él.
- En las tres, el caballo de b1 va a c3 o d2 y el alfil de f1 sale cuando su diagonal se abre.

## Consejos
- Si el negro defiende el peón de c4 con ...b5, atacalo con a4: la cadena se rompe.
- No tomes en d5 con el caballo si el alfil negro puede dar jaque en b4: mirá la trampa del elefante.
- Contra el Albin (`2...e5`), desarrollá el caballo a f3 antes de atacar el peón de d4.
- En la estructura del cambio, la dama en c2 y el alfil en d3 miran a h7: el negro no puede descuidar su enroque.

## Variante: Rehusado, Variante del Cambio {#rehusado-cambio} [básica]
Cambiás en d5 para fijar la estructura y jugás un plan que sirve casi siempre: desarrollo completo y ataque de minorías.

```pgn
1. d4 d5 2. c4 e6 3. Nc3 Nf6 4. Bg5 { [%hint Clavá el caballo que defiende d5.] } Be7 5. cxd5 { [%hint Definí ya la estructura central.] Si 5...Nxd5, cambiá alfiles en e7 y seguí con e3: posición tranquila. } exd5 6. e3 { Si 6...h6, retirá el alfil a h4 y seguí igual. } O-O 7. Bd3 Nbd7 8. Qc2 { [%hint Mirá h7 y controlá e4 al mismo tiempo.] } Re8 9. Nf3 c6 10. O-O Nf8 11. Rab1 { [%hint Preparate para avanzar los peones del flanco donde tenés menos.] Prepara b4 y b5. }
```

Con b4-b5 cambiás en c6 y el negro se queda con un peón débil en c6 o en d5. Si el negro busca juego con ...Ne4 o ...Ng6, cambiá piezas sin apuro y seguí con el plan.

## Trampa en contra: La trampa del elefante {#trampa-del-elefante} [básica]
Con el caballo negro en d7 el peón de d5 parece colgado, porque la clavada en f6 se ve fuerte. No lo está.

```pgn
1. d4 d5 2. c4 e6 3. Nc3 Nf6 4. Bg5 Nbd7 5. cxd5 exd5 6. e3 { [%hint Seguí desarrollando: el peón de d5 está mejor defendido de lo que parece.] } (6. Nxd5?? { Gana un peón... por un ratito. } Nxd5! { El negro entrega la dama. } 7. Bxd8 Bb4+ { Jaque, y la única forma de taparlo es con la dama. } 8. Qd2 Bxd2+ 9. Kxd2 Kxd8 { El negro ganó una pieza. }) c6 7. Bd3
```

La clave es que el caballo de f6 no estaba clavado: si lo tomabas todo, el jaque en b4 te costaba la dama. Con e3 y Bd3 volvés al plan de la variante del cambio.

## Variante: Eslava {#eslava} [básica]
Contra la Eslava jugás sólido con e3 y, si el alfil negro sale a f5, lo vas a buscar con el caballo.

```pgn
1. d4 d5 2. c4 c6 { La Eslava: defiende d5 sin encerrar el alfil de c8. } 3. Nf3 Nf6 4. e3 { [%hint Sostené d4 y abrile la diagonal a tu alfil de f1.] } Bf5 { El alfil sale antes de ...e6. } 5. Nc3 e6 6. Nh4 { [%hint Andá a buscar el alfil que salió.] Si 6...Be4, f3 y el alfil igual tiene que ir a g6. } Bg6 7. Nxg6 hxg6 { Tenés la pareja de alfiles; el negro gana la columna h. } 8. Bd3 dxc4 9. Bxc4 Nbd7 10. O-O Bd6 11. h3
```

Con la pareja de alfiles, tu plan es la ruptura e4 para ganar el centro. Ojo con la columna h abierta: el negro puede apuntar a h2 con alfil, dama y torre, así que no la descuides.

## Variante: Aceptado {#aceptado} [básica]
El negro toma el peón, pero no puede quedárselo. Lo recuperás con el alfil y, si ataca tu centro, simplificás.

```pgn
1. d4 d5 2. c4 dxc4 { El Aceptado: toma el peón y cede el centro. } 3. e3 { [%hint Abrí la diagonal del alfil que va a recuperar el peón.] Si 3...e5, tomá en c4 con el alfil y, después de ...exd4, recapturá con el peón. } Nf6 4. Bxc4 e6 5. Nf3 c5 6. O-O a6 7. dxc5 { [%hint Simplificá: cambiá peones y damas, y jugá con mejor desarrollo.] } Bxc5 8. Qxd8+ Kxd8 { Su rey ya no puede enrocar. } 9. Be2 { Lo retirás antes de que ...b5 lo eche con tiempo. } Ke7 10. Nbd2 b6 11. b3 Bb7 12. Bb2
```

Es una posición sin damas, cómoda y simple: torres a c1 y d1, caballo a c4 o e5, y el rey negro tiene que cuidarse de las columnas abiertas.

## Trampa a favor: Defender el peón con b5 {#peon-c4-con-b5} [básica]
El intento más natural de quedarse con el peón de c4 es sostenerlo con ...b5. Con a4 lo atacás, y si el negro insiste, pierde una pieza.

```pgn
1. d4 d5 2. c4 dxc4 3. e3 b5?! { Intenta quedarse con el peón. } 4. a4 { [%hint Atacá desde abajo la cadena que sostiene c4.] } c6 5. axb5 cxb5?? { Natural, pero deja abierta la diagonal hacia a8. } 6. Qf3 { [%hint La diagonal larga quedó abierta y la torre no tiene salida.] } Nc6 7. Qxc6+
```

Ganaste una pieza. Después de `7...Bd7` no tomes la torre: la defiende la dama negra. Retirá la dama con calma y seguí desarrollando.

## Variante: Contragambito Albin {#albin} [club]
El Contragambito Albin (`2...e5`) es poco común, pero tramposo: el peón que llega a d4 molesta mucho. La respuesta sana es desarrollar el caballo.

```pgn
1. d4 d5 2. c4 e5 3. dxe5 d4 { El peón se instala en el centro y te quita e3 y c3. } 4. Nf3 { [%hint Desarrollá una pieza que vigile d4 antes de atacarlo con un peón.] } Nc6 5. g3 { [%hint Prepará el alfil en la gran diagonal para presionar el flanco de dama y al caballo que defiende d4.] }
```

Con `Bg2` y el enroque completás el desarrollo. El negro suele recuperar el peón de e5 con el otro caballo (`5...Nge7`, `...Ng6` y `...Ngxe5`). Después del cambio de caballos en e5, tu blanco es el peón de d4, que quedó adelantado y con poco apoyo: el caballo de b1 va por a3 a b5 y el alfil sale a f4. La ventaja es chica, pero es tuya.

Atacar el peón con `4.e3` parece lógico, pero después de `4...Bb4+ 5.Bd2 dxe3` el peón negro de e3 amenaza tomar en f2 con jaque: es la **trampa de Lasker**. La buena es `6.fxe3`, y el negro tiene la iniciativa. Si en cambio comés el alfil con `6.Bxb4??`, viene `6...exf2+ 7.Ke2 fxg1=N+!`: el peón corona en caballo y con jaque, y después de `8.Rxg1 Bg4+` cae tu dama.
