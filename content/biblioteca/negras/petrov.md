---
id: petrov
nombre: Defensa Petrov
alias: Defensa Rusa, Petroff, Petrov Defense, Russian Defense
lado: negras
grupo: Contra 1.e4
orden: 100
eco: C42-C43
nivel: principiante, club
jugadas: 1. e4 e5 2. Nf3 Nf6
resumen: En vez de defender e5, contraatacás e4: una defensa simétrica y muy sólida, con dos trampas que conviene conocer desde el principio.
---
## Para empezar
Contestás `2.Nf3` atacando el peón de `e4` con `2...Nf6`. La idea es sencilla: si las blancas se comen tu peón, vos te comés el suyo. Pero hay un orden que respetar.

- Si las blancas toman en `e5`, **primero** echá al caballo con `3...d6` y recién después recuperá el peón con `...Nxe4`.
- Recuperar enseguida con `3...Nxe4?` es un error conocido (la Variante Damiano): después de `4.Qe2`, si el caballo se mueve (`4...Nf6??`), `5.Nc6+` es un jaque descubierto que gana tu dama, y con `4...Qe7 5.Qxe4` igual perdés un peón.
- Si la dama blanca se pone en `e2` cuando tu caballo está en `e4` y no hay ninguna pieza entre el caballo y tu rey, el caballo está clavado: defendelo con la dama desde `e7`.
- Después, desarrollo normal: un peón en `d5` que sostenga al caballo, el alfil a `e7` o `d6` y enroque corto.

## Ideas y planes
- **Clásica (`5.d4`)**: tu caballo de `e4` se apoya en el peón de `d5`. Las blancas atacan esa base con `c4`; vos llevás las piezas a casillas activas (`...Nb4`, `...Bf5`) y cambiás el caballo de `e4` en el momento justo. La posición queda simétrica y pareja.
- **Ataque Nimzowitsch (`5.Nc3`)**: las blancas cambian caballos, aceptan los peones doblados en `c` y enrocan largo para atacar en el flanco de rey. Vos enrocás corto, jugás `...Nd7`, `...c6` y una torre a `e8`, y preparás `...d5` para tener tu parte del centro.
- **Ataque Steinitz (`3.d4`)**: las blancas abren el centro de entrada. Tomás en `e4`, sostenés el caballo con `...d5` y desafiás al caballo de `e5` con `...Nd7`. Tu desarrollo rápido compensa el espacio blanco.
- **La clavada en la columna `e`**: cuando la dama blanca queda frente a tu rey con tu caballo en el medio, el caballo no puede moverse. Defendelo con la dama (`...Qe7`) antes de hacer cualquier otra cosa.

## Consejos
- Contra `3.Nxe5`, no te apures: `3...d6` primero, `4...Nxe4` después.
- Si la dama blanca va a `e2` con tu caballo en `e4`, respondé `...Qe7`: el caballo está clavado y un peón no alcanza para salvarlo.
- Contra `5.Nc3`, cambiá caballos: defender el de `e4` con la dama permite `6.Nd5` y la clavada con `Qe2`.
- En la Clásica, `...Nb4` echa (o cambia) el alfil de `d3`, el que más apunta a tu enroque.
- Contra el enroque largo de la Nimzowitsch, contestá con `...d5` en el centro antes de preocuparte por los peones blancos del flanco de rey.
- La Petrov es simétrica: si copiás las jugadas blancas sin mirar, tarde o temprano una de esas copias es un error.

## Variante: Clásica {#clasica} [básica]
La línea principal. Echás al caballo, recuperás el peón y armás un centro firme con `...d5`.

```pgn
1. e4 e5 2. Nf3 Nf6 3. Nxe5 d6 { [%hint No recuperes todavía el peón: primero echá al caballo.] }
4. Nf3 Nxe4 { [%hint El caballo blanco se fue: ¿qué peón quedó sin defensa?] }
5. d4 d5 { [%hint Sostené a tu caballo con un peón.] }
6. Bd3 Nc6 7. O-O Be7 8. c4 Nb4 { [%hint Echá o cambiá el alfil que apunta a tu enroque.] El caballo ataca al alfil de d3. }
9. Be2 O-O 10. Nc3 Bf5 { [%hint Desarrollá tu último alfil y sumá presión sobre c2.] }
11. a3 Nxc3 { [%hint Antes de retirar el caballo atacado, cambiá el otro.] }
12. bxc3 Nc6 13. Re1 Re8 { [%hint Ocupá la columna abierta.] }
14. cxd5 Qxd5 15. Bf4 Rac8
```

Posición pareja y sin debilidades. El peón blanco de `c3` es el más flojo del tablero y tu torre de `c8` lo presiona cuando se mueva el caballo de `c6`; tu dama está activa en `d5`, pero vigilá que no la echen con `c4`.

## Variante: Ataque Nimzowitsch {#nimzowitsch} [club]
Con `5.Nc3` las blancas ofrecen cambiar caballos. Después de `6.dxc3` quedan con los peones doblados, pero con líneas abiertas para sus piezas y la idea de enrocar largo.

```pgn
1. e4 e5 2. Nf3 Nf6 3. Nxe5 d6 { [%hint No recuperes todavía el peón: primero echá al caballo.] }
4. Nf3 Nxe4 { [%hint El caballo blanco se fue: ¿qué peón quedó sin defensa?] }
5. Nc3 Nxc3 { [%hint Tu caballo está atacado: resolvelo con un cambio, no defendiéndolo.] }
6. dxc3 Be7 7. Be3 O-O 8. Qd2 Nd7 { Desde d7 el caballo puede ir a f6, a b6 o a e5, según lo que hagan las blancas. }
9. O-O-O c6 { [%hint Prepará el avance central que te da espacio.] }
10. Bd3 Re8 { [%hint Ocupá la columna e y dejale a tu alfil la casilla f8.] }
```

Seguí con `...d5` para plantar un peón en el centro. Si las blancas tiran sus peones del flanco de rey (`h4`, `g4`), respondé en el centro antes que en el flanco: en esta estructura, un centro firme es tu mejor defensa.

## Variante: Ataque Steinitz {#steinitz} [club]
Con `3.d4` las blancas abren el centro de inmediato. Tomás en `e4`, sostenés el caballo con un peón y cambiás el caballo blanco del centro.

```pgn
1. e4 e5 2. Nf3 Nf6 3. d4 Nxe4 { [%hint Tomá el peón central que quedó sin defensa.] }
4. Bd3 d5 { [%hint Sostené a tu caballo con un peón.] }
5. Nxe5 Nd7 { [%hint Desafiá al caballo central con una pieza que lo cambie.] }
6. Nxd7 Bxd7 7. O-O Bd6 { El alfil se desarrolla y apunta al flanco de rey blanco. }
8. c4 O-O { [%hint Poné el rey a salvo antes de ocuparte del centro.] }
9. c5 Be7 { El alfil se retira, pero tu caballo de e4 sigue firme. }
10. Qc2 Re8 11. Nc3 Nxc3 12. Qxc3 Bf6 { [%hint Llevá el alfil a una diagonal que presione d4.] }
```

Tu alfil de `f6` presiona `d4` y las blancas tienen que cuidarlo. Con `...g6`, `...c6` y la torre de `e8` en la única columna abierta, tu posición es muy sólida.

## Trampa en contra: La clavada en la columna e {#clavada-en-e} [club]
Con `5.Qe2` las blancas clavan tu caballo de `e4` contra el rey. Defenderlo con un peón parece suficiente, pero el peón de `d3` lo ataca y el caballo no puede escapar.

```pgn
1. e4 e5 2. Nf3 Nf6 3. Nxe5 d6 { [%hint No recuperes todavía el peón: primero echá al caballo.] }
4. Nf3 Nxe4 { [%hint El caballo blanco se fue: ¿qué peón quedó sin defensa?] }
5. Qe2 Qe7 { [%hint Tu caballo está clavado: poné entre él y tu rey una pieza que además lo defienda.] }
(5... d5?? { Defiende al caballo, pero no lo desclava. } 6. d3 { El peón ataca al caballo clavado. }
Qe7 7. dxe4 dxe4 8. Nfd2 { Las blancas ganaron una pieza por un peón. })
6. d3 Nf6 7. Bg5 Qxe2+ 8. Bxe2 Be7
```

Con las damas cambiadas la posición es simétrica y pareja. Desarrollá con `...Nc6` o `...c6`, enrocá y llevá las torres a la columna `e`: es un final tranquilo y equilibrado.

## Trampa en contra: Defender con la dama {#defender-con-la-dama} [club]
Contra `5.Qe2` la dama va a `e7`, pero contra `5.Nc3` el mismo reflejo pierde: la dama queda expuesta y el caballo de `e4` se queda sin apoyo.

```pgn
1. e4 e5 2. Nf3 Nf6 3. Nxe5 d6 { [%hint No recuperes todavía el peón: primero echá al caballo.] }
4. Nf3 Nxe4 { [%hint El caballo blanco se fue: ¿qué peón quedó sin defensa?] }
5. Nc3 Nxc3 { [%hint Tu caballo está atacado: resolvelo con un cambio, no defendiéndolo.] }
(5... Qe7? { Defiende al caballo, como contra 5.Qe2. } 6. Nd5 { El caballo blanco echa a tu dama de la columna e. }
Qd7 7. Qe2 { Ahora sí tu caballo de e4 está clavado contra el rey. }
f5 8. d3 { El peón ataca al caballo clavado y lo gana. })
6. dxc3 Be7
```

Contra `5.Nc3`, cambiá los caballos y seguí como en el Ataque Nimzowitsch. La dama a `e7` es la respuesta contra la dama blanca en `e2`, no contra el caballo en `c3`.
