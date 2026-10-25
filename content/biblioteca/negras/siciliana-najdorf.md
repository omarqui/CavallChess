---
id: siciliana-najdorf
nombre: Siciliana Najdorf
alias: Najdorf Sicilian, Najdorf
lado: negras
grupo: Contra 1.e4
orden: 40
eco: B90-B99
nivel: club
jugadas: 1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 a6
resumen: Con 5...a6 le quitás b5 a las piezas blancas y dejás para después la decisión sobre tu peón de e: la Siciliana más flexible y combativa.
---
## Para empezar
Con `1...c5` peleás por la casilla d4 desde el costado. Después de `3.d4 cxd4` cambiaste un peón del flanco por uno central: te quedan dos peones en el centro (d y e) contra uno solo de las blancas, y la columna c semiabierta para tus torres.

La jugada que le da nombre a la variante, `5...a6`, parece tranquila pero tiene mucho adentro: ningún caballo ni alfil blanco puede instalarse en b5, preparás `...b5` para ganar espacio y, sobre todo, podés empujar `...e5` sin que el caballo de d4 salte a b5.

- No te apures con el flanco de rey: la Najdorf espera a ver qué hacen las blancas antes de decidir.
- Si las blancas enrocan largo y avanzan los peones contra tu rey, tu respuesta es el contraataque en el flanco de dama, no la defensa pasiva.
- Cuando juegues `...e5`, la casilla d5 queda débil: vigilala con el alfil y los caballos.
- Enrocá corto cuando tu rey vaya a estar seguro ahí, no por costumbre.

## Ideas y planes
- **Estructura con `...e5`** (contra `6.Be3` y `6.Be2`): tu peón de d6 queda retrasado pero bien defendido, y la casilla d5 es el centro de la pelea. Tus piezas van a e6, d7, e7 y c8; la ruptura `...d5`, cuando la podés jugar sin perder nada, iguala todo. Si un caballo blanco se planta en d5, muchas veces lo cambiás y, después de exd5, el centro queda cerrado y tu juego pasa por la columna c.
- **Estructura con `...e6`** (contra `6.Bg5` y `6.Bc4`): un centro pequeño (d6 y e6) que no se puede atacar fácil. Tu plan es `...Qc7`, `...Nbd7`, `...b5` y `...Bb7` para presionar e4. El peón de e6 es el blanco de los sacrificios blancos: revisá siempre si está bien defendido.
- **Enroques opuestos:** en el Ataque Inglés y en las líneas de `6.Bg5` con enroque largo, la partida es una carrera. Cada tiempo cuenta: `...b5` y `...b4` echan al caballo de c3, que es el principal defensor del rey blanco.
- **El sacrificio de calidad `...Rxc3`** es un recurso típico de todas las Sicilianas: rompe los peones delante del rey blanco y deja al peón de e4 sin su defensor.

## Consejos
- Si el caballo de d4 se retira a b5 cuando ya jugaste `...a6`, tomalo: para eso está el peón.
- Contra el Ataque Inglés no gastes jugadas en tapar el flanco de rey: la mejor defensa es que tu ataque llegue primero.
- Con la dama blanca en f3 y tus piezas sin desarrollar, no juegues `...b5` antes de `...Nbd7`: el avance e5 abre la diagonal hasta tu torre de a8.
- En el Ataque Sozin, el alfil de b3 apunta a e6 y a f7: antes de cada jugada, mirá si un sacrificio en e6 funciona.
- Si un caballo blanco llega a d5, preguntate qué estructura te queda después de cambiarlo antes de hacerlo.

## Variante: Ataque Inglés {#ataque-ingles} [club]
Con `6.Be3`, `f3`, `Qd2` y el enroque largo, las blancas preparan el avance g4-g5 contra tu rey. Vos ganás espacio con `...e5`, controlás d5 con el alfil y respondés con `...b5`.

```pgn
1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 a6 6. Be3 e5 { [%hint Ganá espacio en el centro y echá al caballo que está en d4.] }
7. Nb3 Be6 { [%hint Desarrollá una pieza que vigile la casilla débil que dejó tu último avance.] El alfil controla d5, la casilla clave de esta estructura. }
8. f3 Be7 9. Qd2 O-O 10. O-O-O Nbd7 { Desde d7 el caballo puede ir a b6 para sumar control sobre d5. }
11. g4 b5 { [%hint Empezá tu propio ataque en el flanco donde enrocó el rival.] Empezó la carrera: las blancas van contra tu rey y vos contra el suyo. }
12. g5 Nh5 { [%hint El caballo atacado no tiene por qué retroceder: buscale una casilla en el borde desde donde siga molestando.] }
13. Nd5 Bxd5 { Cambiás el caballo que se instaló en la casilla fuerte. }
14. exd5 f6 { [%hint Atacá el peón de punta que avanzó contra tu enroque.] Abrís líneas para tus piezas y le das aire al alfil de e7. }
```

El peón blanco de d5 cerró el centro y la pelea pasa a los flancos. Si las blancas cambian en f6, recapturá con el alfil, que queda muy activo. Tu dama puede ir a e8 para sumarse al flanco de rey y el caballo de h5 vuelve al juego por f4. Si las blancas empujan `h4`, fijate en el salto `...Ng3`: ataca a la torre de h1 y al alfil de f1 a la vez.

## Variante: Variante Opocensky {#opocensky} [básica]
`6.Be2` es la elección posicional: enroque corto, maniobras y pocas aventuras. Vos usás la misma estructura que contra el Ataque Inglés, sin la carrera de peones.

```pgn
1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 a6 6. Be2 e5 { [%hint Ganá espacio en el centro y echá al caballo que está en d4.] }
7. Nb3 Be7 8. O-O O-O 9. Be3 Be6 { [%hint Desarrollá una pieza que vigile la casilla débil que dejó tu avance central.] }
10. Qd2 Nbd7 11. a4 { Frena tu ...b5. } Rc8 { [%hint Llevá una torre a la columna semiabierta.] }
12. a5 Qc7 { La dama sale de la columna d y suma presión en la columna c. }
```

El peón de a5 te quita la casilla b6. Seguí con `...Rfd8` y `...h6`, y prepará la ruptura `...d5`: si la jugás bien apoyada, tu juego se libera por completo. No te apures a llevar el caballo a c5: si las blancas lo cambian y retomás con el peón, la casilla d5 queda todavía más débil.

## Variante: Variante principal con 6.Bg5 {#bg5} [club]
`6.Bg5` clava el caballo y `7.f4` prepara el avance e5. Respondés con `...e6`, rompés la clavada con el alfil y completás el desarrollo antes de expandirte.

```pgn
1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 a6 6. Bg5 e6 { [%hint Reforzá el centro y abrí la salida de tu alfil de casillas oscuras.] }
7. f4 Be7 { [%hint Rompé la clavada sobre tu caballo.] }
8. Qf3 Qc7 { [%hint Vigilá la casilla a la que quiere avanzar el peón de e4.] }
9. O-O-O Nbd7 { [%hint Antes de expandirte en el flanco de dama, completá el desarrollo y cubrí e5 una vez más.] }
10. g4 b5 { [%hint Contraatacá con tus peones en el flanco donde está el rey blanco.] }
11. Bxf6 Nxf6 12. g5 Nd7 { El caballo retrocede, pero desde d7 puede saltar a c5 o a b6. }
```

Las blancas siguen con `13.f5` para abrir líneas contra tu rey. Ahí una opción sólida es enrocar corto y empujar `...b4` para echar al caballo de c3; la alternativa teórica, `13...Bxg5+ 14.Kb1 Ne5`, lleva a posiciones muy filosas. En cualquier caso, el ataque blanco es peligroso y no hay tiempo que perder. Si en vez de `10.g4` juegan `10.Bd3`, el plan es el mismo: `...b5` y `...Bb7`.

## Variante: Ataque Sozin {#sozin} [club]
Con `6.Bc4` el alfil apunta a f7 y a e6. Le cerrás la diagonal con `...e6`, lo echás con `...b5` y defendés tu enroque con cuidado.

```pgn
1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 a6 6. Bc4 e6 { [%hint Cerrale la diagonal al alfil que apunta a tu punto débil.] }
7. Bb3 b5 { [%hint Ganá espacio en el flanco de dama con la amenaza de echar al caballo de c3.] }
8. O-O Be7 9. Qf3 { Si el peón de e4 avanza, la diagonal de la dama se abre hasta tu torre de a8. } Qc7 { [%hint Controlá la casilla de avance del peón central blanco.] }
10. Qg3 O-O 11. Bh6 Ne8 { Defendés g7 una vez más. }
12. Rad1 Bd7 { [%hint Completá el desarrollo del flanco de dama.] }
```

Tu flanco de rey ya está cubierto. Ahora `...Nc6` para cambiar el caballo de d4 y `...a5-a4` para empujar al alfil de b3. Ojo con los sacrificios blancos en e6 y en f5: antes de mover, revisá que tu peón de e6 y tu rey estén bien defendidos.

## Trampa a favor: El salto a b5 {#salto-a-b5} [básica]
Cuando jugás `...e5`, el caballo de d4 tiene que irse. En otras Sicilianas, b5 es una gran casilla para él; en la Najdorf, tu peón de a6 la controla.

```pgn
1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 a6 6. Be3 e5 { [%hint Ganá espacio en el centro y echá al caballo que está en d4.] }
7. Ndb5?? { El caballo busca la casilla d6, pero b5 está cubierta. } axb5 { [%hint Cobrá la pieza que se metió en una casilla que tu peón controla.] }
8. Nxb5
```

Ganaste una pieza por un peón. No te asustes por `Nxd6+`: el peón de d6 está defendido por el alfil de f8 y por la dama. Desarrollá con `...Be7`, enrocá y la ventaja material decide.

## Trampa en contra: La diagonal larga {#diagonal-larga} [club]
Con la dama blanca en f3, el peón de e4 es lo único que tapa la diagonal hacia tu torre de a8. Si empujás `...b5` antes de desarrollar el caballo de b8, el avance e5 la destapa con ataque.

```pgn
1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 a6 6. Bg5 e6 7. f4 Be7 8. Qf3 Qc7
9. O-O-O Nbd7 { [%hint Antes de expandirte en el flanco de dama, completá el desarrollo y cubrí e5 una vez más.] }
(9... b5? { Natural, pero deja tu torre de a8 sola en la diagonal larga. } 10. e5! { Ataca al caballo de f6 y abre la diagonal de la dama hacia a8. } Bb7 { Tapás la diagonal y atacás a la dama, pero tu caballo de f6 sigue atacado. } 11. Qg3 { La dama se salva y la amenaza exf6 sigue en pie. Con tu rey en el centro no hay forma cómoda de cubrir todo: perdés material. })
```

Primero `...Nbd7`, que vigila e5, y recién después `...b5`. Lo que sigue lo tenés en la variante principal con `6.Bg5`.
