---
id: alekhine
nombre: Defensa Alekhine
alias: Alekhine Defense, Alekhine's Defence
lado: negras
grupo: Contra 1.e4
orden: 120
eco: B02-B05
nivel: principiante, club
jugadas: 1. e4 Nf6 2. e5 Nd5
resumen: Provocás a los peones blancos para que avancen y después atacás ese centro, que puede volverse una debilidad.
---
## Para empezar
Con `1...Nf6` atacás el peón de `e4` y lo invitás a avanzar. Si las blancas persiguen a tu caballo con sus peones, ganan espacio, pero esos peones avanzados también se pueden atacar.

- Después de `2.e5 Nd5`, la jugada clave es `...d6`: atacás el peón de `e5` antes de que se asiente.
- Si otro peón ataca al caballo (`c4`), lo normal es retirarlo a `b6`: desde ahí sigue mirando el centro.
- No pierdas más tiempo con el caballo del necesario: desarrollá las otras piezas.
- Tu objetivo es el centro blanco: los peones de `d4`, `e5` y `c4` son fuertes si están protegidos y débiles si no.

## Ideas y planes
- **Moderna (`4.Nf3`)**: las blancas no avanzan más peones y desarrollan. Clavás el caballo con `...Bg4`, armás `...e6` y `...Be7` y, cuando el peón blanco llega a `c5`, tu caballo encuentra una gran casilla en `c4`.
- **Cambio (`5.exd6`)**: las blancas cambian el peón de `e5`. Recapturás con el peón de `c`, ponés el alfil en `g7` y rompés con `...e5`; si se cambian las damas, el final es parejo y fácil de jugar.
- **Cuatro Peones (`5.f4`)**: el centro blanco más ambicioso. Lo atacás con todo: `...dxe5`, `...Nc6`, `...Bf5` y `...e6`. Cuando las blancas empujan `d5`, tu caballo salta a `b4` y después busca la casilla `d5`.
- En el Cambio, la casilla `d5` atrae a los caballos blancos. Si uno llega antes de tiempo, abrí el centro y mirá si la dama puede dar jaque en `a5`.

## Consejos
- En la Moderna, cambiar el alfil de `g4` por el caballo de `f3` en el momento justo le saca un defensor a `d4` y a `e5`.
- Cuando el peón blanco llegue a `c5`, llevá el caballo a `c4`; si un alfil blanco vigila esa casilla, sacale primero el apoyo con un cambio.
- En el Cambio, recapturar con el peón de `c` te deja los peones de `d6` y `e7` para romper con `...e5`.
- En los Cuatro Peones no te quedes mirando: si no atacás ese centro enseguida, los peones blancos te aplastan.
- Antes de comerte un peón con el caballo, contá cuántas piezas blancas lo defienden.

## Variante: Moderna {#moderna} [básica]
La respuesta más popular: las blancas desarrollan con `4.Nf3` y mantienen el peón en `e5`. Vos presionás con el alfil y preparás un centro firme.

```pgn
1. e4 Nf6 2. e5 Nd5 3. d4 d6 { [%hint Atacá el peón avanzado antes de que se asiente.] }
4. Nf3 Bg4 { [%hint Clavá a la pieza que defiende e5 y d4.] }
5. Be2 e6 6. O-O Be7 7. h3 Bh5 8. c4 Nb6 { [%hint Retirá el caballo a una casilla desde donde siga mirando el centro.] }
9. Nc3 O-O 10. Be3 d5 { [%hint Cerrá el centro y fijá los peones blancos.] }
11. c5 Bxf3 { [%hint Antes de mover el caballo atacado, sacale una pieza al centro blanco: si recapturan con el alfil, la casilla c4 queda libre.] Si recapturan con el peón (12.gxf3), el alfil de e2 sigue cuidando c4: el caballo vuelve con 12...Nc8 y sale por e7 hacia f5; las blancas quedan algo mejor, pero tu posición no tiene debilidades. }
12. Bxf3 Nc4 { [%hint Ocupá la casilla que dejó libre el avance del peón.] }
13. b3 Nxe3 14. fxe3 b6 { [%hint Atacá el peón de avanzada del flanco de dama.] }
```

La estructura es sana y tenés planes claros: `...c6`, `...a5` y abrir el flanco de dama. Si las blancas cambian en `b6`, tu torre de `a8` gana una columna.

## Variante: Variante del Cambio {#cambio} [club]
Con `4.c4 Nb6 5.exd6` las blancas cambian el peón de `e5` y se quedan con más espacio. Recapturás con el peón de `c`, fianchetto y ruptura con `...e5`.

```pgn
1. e4 Nf6 2. e5 Nd5 3. d4 d6 { [%hint Atacá el peón avanzado antes de que se asiente.] }
4. c4 Nb6 { [%hint Retirá el caballo a una casilla desde donde siga mirando el centro.] }
5. exd6 cxd6 { [%hint Recapturá hacia el centro y quedate con dos peones centrales.] }
6. Nc3 g6 7. Be3 Bg7 8. Rc1 O-O 9. b3 e5 { [%hint Golpeá el centro con tu peón de rey.] }
10. dxe5 dxe5 11. Qxd8 Rxd8 12. c5 N6d7 { [%hint El caballo atacado se retira, pero desde su nueva casilla ataca al peón que avanzó.] }
```

Final parejo. El peón de `c5` está adelantado y tu caballo lo ataca; el plan es `...Nc6`, el otro caballo a `f6` y las torres en la columna `d`.

## Variante: Cuatro Peones {#cuatro-peones} [club]
La línea más ambiciosa: con `5.f4` las blancas arman un centro de cuatro peones. Si no lo atacás enseguida te aplasta; si lo atacás bien, se vuelve un blanco.

```pgn
1. e4 Nf6 2. e5 Nd5 3. d4 d6 { [%hint Atacá el peón avanzado antes de que se asiente.] }
4. c4 Nb6 { [%hint Retirá el caballo a una casilla desde donde siga mirando el centro.] }
5. f4 dxe5 { Cambiás un par de peones para abrir líneas. }
6. fxe5 Nc6 { [%hint Sumá otra pieza contra d4.] }
7. Be3 Bf5 { [%hint Sacá el alfil antes de cerrarle el paso con tus peones.] }
8. Nc3 e6 9. Nf3 Be7 10. d5 { Las blancas empujan para echar a tu caballo de c6. } exd5
11. cxd5 Nb4 { [%hint El caballo atacado salta hacia las casillas que dejaron libres los peones blancos.] }
12. Nd4 Bd7 { El alfil se retira y vigila e6. }
```

Posición dinámica y equilibrada. Si las blancas empujan `e6`, cambiá con `...fxe6` y llevá el alfil a `c6`: tus caballos tienen casillas en `d5`. Tené en cuenta el jaque `...Bh4+`, que a veces desarma el enroque blanco.

## Trampa a favor: El jaque en a5 {#jaque-en-a5} [club]
En el Cambio, después de `...e5`, la casilla `d5` atrae a los caballos blancos. Si el caballo salta antes de tiempo, abrís el centro y un jaque de tu dama gana material.

```pgn
1. e4 Nf6 2. e5 Nd5 3. d4 d6 { [%hint Atacá el peón avanzado antes de que se asiente.] }
4. c4 Nb6 { [%hint Retirá el caballo a una casilla desde donde siga mirando el centro.] }
5. exd6 cxd6 { [%hint Recapturá hacia el centro y quedate con dos peones centrales.] }
6. Nc3 g6 7. Be3 Bg7 8. Rc1 O-O 9. b3 e5 { [%hint Golpeá el centro con tu peón de rey.] }
10. Nd5? { El caballo llega a una gran casilla, pero deja de vigilar el centro. }
Nxd5 11. cxd5 exd4 { [%hint Abrí el centro: tu alfil de g7 está esperando.] Recuperar con el alfil es lo mejor que tienen las blancas; con 12.Bf4 o 12.Bd2 llega 12...Re8+ y quedan todavía peor. }
12. Bxd4 Qa5+ { [%hint Dale jaque al rey sin enrocar y obligá a las blancas a descuidar a su alfil.] }
13. Qd2 { Tapar con la dama parece lo más simple. Con 13.Rc3 aguantaban más, aunque igual quedaban en problemas. }
Qxd2+ { [%hint Cambiá damas: así el alfil de d4 se queda sin defensa.] }
14. Kxd2 Bxd4
```

Ganaste una pieza. El patrón para recordar: rey blanco sin enrocar en `e1`, la diagonal `a5-e1` abierta y una pieza blanca en `d4` defendida solo por la dama.
