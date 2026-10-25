---
id: pirc
nombre: Defensa Pirc
alias: Pirc Defense, Pirc-Ufimtsev
lado: negras
grupo: Contra 1.e4
orden: 110
eco: B07-B09
nivel: principiante, club
jugadas: 1. e4 d6 2. d4 Nf6 3. Nc3 g6
resumen: Dejás que las blancas armen un gran centro y lo atacás después desde los costados, con el alfil de g7 como pieza estrella.
---
## Para empezar
En la Pirc no ocupás el centro con peones de entrada: primero desarrollás, ponés el alfil en `g7` y enrocás. Después golpeás el centro blanco con `...e5` o `...c5`.

- El alfil de `g7` es tu mejor pieza: no lo cambies sin motivo.
- Casi siempre enrocás corto pronto: detrás de los peones de `f7`, `g6` y `h7` el rey está cómodo. La excepción es el Ataque 150, donde conviene esperar.
- Esperá el momento justo para `...e5` o `...c5`: cuando tus piezas estén listas, no antes.
- Si un peón te echa un caballo, retiralo hacia el centro o hacia el flanco donde vas a jugar, no al borde.

## Ideas y planes
- **Clásica (`4.Nf3` y `5.Be2`)**: el sistema más tranquilo. Presionás `d4` con `...Bg4` y `...Nc6` y rompés con `...e5`. Si las blancas cierran con `d5`, el caballo va a `e7` y tu plan es atacar la punta de la cadena con `...c6`.
- **Ataque Austríaco (`4.f4`)**: las blancas arman un centro de tres peones y amenazan `e5`. Enrocás primero, sacás el caballo de `b8` a `a6` (sin tapar a tu peón de `c`) y golpeás con `...c5`. Si las blancas cierran con `d5`, cambiás las piezas que más apoyan su ataque: el caballo de `f3` y el alfil de `d3`.
- **Ataque 150 (`4.Be3` y `5.Qd2`)**: las blancas quieren cambiar tu alfil de casillas negras con `Bh6`, enrocar largo y avanzar los peones del flanco de rey. Vos no te apurás a enrocar: expandís el flanco de dama con `...c6`, `...b5` y `...b4`, y llevás la dama contra su rey.

## Consejos
- Antes de jugar `...e5`, asegurate de que tu rey ya enrocó.
- Si las blancas empujan `d5` contra tu caballo de `c6`, la casilla buena es `e7`; en `a5` el caballo queda encerrado después de `b4`.
- Contra el Ataque 150, cuando la dama blanca llega a `h6`, tu rey puede quedarse en el centro un buen rato: no enroques hacia donde apunta todo el ataque.
- En el Austríaco, si las blancas empujan `e5` antes de enrocar, cambiá en `e5`: el cambio de damas te deja cómodo.
- Tu ruptura con `...c5` funciona mejor cuando el alfil de `g7` ya mira hacia `d4`.

## Variante: Clásica {#clasica} [básica]
Contra el desarrollo tranquilo de las blancas, presionás `d4` con tus piezas y rompés con `...e5`.

```pgn
1. e4 d6 2. d4 Nf6 3. Nc3 g6 4. Nf3 Bg7 { [%hint Poné el alfil en la diagonal larga, apuntando al centro.] }
5. Be2 O-O 6. O-O Bg4 { [%hint Atacá a la pieza que defiende d4.] }
7. Be3 Nc6 { [%hint Sumá otra pieza contra d4.] }
8. Qd2 e5 { [%hint Con tus piezas listas y el rey a salvo, golpeá el centro.] }
9. d5 Ne7 { [%hint Retirá el caballo hacia el flanco de rey, no al borde.] }
10. Rad1 Bd7 { El alfil vuelve a d7, desde donde ayuda en los dos flancos. }
11. Ne1 c6 { [%hint Atacá la punta de la cadena de peones blanca.] }
```

Si las blancas cambian en `c6`, recapturá con el alfil (`12...Bxc6`): si después se comen tu peón de `d6`, no te asustes, porque atacás la torre con `...Nc8` y recuperás el peón en `e4`. Si no cambian, seguí con `...cxd5` y buscá presión en la columna `c`.

## Variante: Ataque Austríaco {#austriaco} [club]
El intento más agresivo: con `4.f4` las blancas construyen un centro de tres peones. Vos enrocás primero y lo atacás desde el costado.

```pgn
1. e4 d6 2. d4 Nf6 3. Nc3 g6 4. f4 Bg7 { [%hint Poné el alfil en la diagonal larga, apuntando al centro.] }
5. Nf3 O-O { [%hint Poné el rey a salvo antes de discutir el centro.] }
6. Bd3 Na6 { [%hint Desarrollá el caballo sin tapar al peón que va a romper el centro.] }
7. O-O c5 { [%hint Golpeá el centro por el costado.] }
8. d5 Bg4 { [%hint Atacá a la pieza que sostiene el avance del peón de e.] }
9. Qe1 Bxf3 10. Rxf3 Nb4 { [%hint Buscá el cambio del alfil blanco de casillas claras.] }
11. a3 Nxd3 12. cxd3 e6 { [%hint Atacá la punta de la cadena.] }
```

Los dos bandos se quedaron sin el alfil de casillas blancas, y las piezas que apoyaban el ataque blanco desaparecieron. Con `...exd5` abrís la columna `e` para tus torres, mientras el alfil de `g7` sigue firme en la diagonal larga. Si en la jugada 9 las blancas le quitan la casilla `b4` a tu caballo con `9.a3`, seguí con `...Nc7` y `...a6`.

## Variante: Ataque 150 {#ataque-150} [club]
Las blancas juegan `Be3`, `Qd2` y `f3` para cambiar tu alfil con `Bh6` y lanzarse contra tu rey. Si no enrocás, ese ataque no tiene blanco: vos jugás en el flanco de dama.

```pgn
1. e4 d6 2. d4 Nf6 3. Nc3 g6 4. Be3 c6 { [%hint Prepará la expansión en el flanco de dama antes de comprometer a tu rey.] }
5. Qd2 b5 { [%hint Ganá espacio en el flanco de dama.] }
6. f3 Nbd7 7. Bh6 Bxh6 8. Qxh6 Bb7 9. Nh3 Qb6 { [%hint Sumá la dama a la presión sobre d4.] }
10. O-O-O b4 { [%hint Echá al caballo que cuida al rey blanco.] }
11. Na4 Qa5 { [%hint Atacá al caballo que se fue al borde.] }
```

El caballo de `a4` está en el borde y tu dama lo ataca. Tu rey puede quedarse en el centro, porque las blancas ya no tienen alfil de casillas negras para molestarlo. Seguí con `...Nb6` para cambiar ese caballo y abrir líneas hacia el rey blanco.

## Trampa en contra: Caballo atrapado en a5 {#caballo-en-a5} [básica]
En la Clásica, cuando las blancas cierran con `9.d5`, tu caballo de `c6` tiene que irse. La casilla `a5` parece activa (desde ahí apunta a `c4`), pero es una jaula.

```pgn
1. e4 d6 2. d4 Nf6 3. Nc3 g6 4. Nf3 Bg7 { [%hint Poné el alfil en la diagonal larga, apuntando al centro.] }
5. Be2 O-O 6. O-O Bg4 { [%hint Atacá a la pieza que defiende d4.] }
7. Be3 Nc6 { [%hint Sumá otra pieza contra d4.] }
8. Qd2 e5 { [%hint Con tus piezas listas y el rey a salvo, golpeá el centro.] }
9. d5 Ne7 { [%hint Retirá el caballo hacia el flanco de rey, no al borde.] }
(9... Na5? { Parece activo: desde a5 el caballo quiere saltar a c4. }
10. b4 { El caballo no tiene salida: b3 la controlan dos peones, c4 el alfil de e2, c6 el peón de d5, y en b7 está tu propio peón. }
Nc4 11. Bxc4 { Perdiste el caballo por nada. })
```

Regla práctica: cuando un peón te echa un caballo, buscá primero las casillas que miran al centro o al flanco donde vas a jugar. En el borde, un caballo atacado por un peón muchas veces no tiene adónde ir.
