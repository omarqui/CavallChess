---
id: francesa
nombre: Defensa Francesa
alias: French Defense, Francesa
lado: negras
grupo: Contra 1.e4
orden: 80
eco: C00-C19
nivel: principiante, club
jugadas: 1. e4 e6
resumen: Preparás ...d5 con el apoyo del peón de e6 y aceptás un centro cerrado: después atacás la cadena de peones blanca con ...c5 y ...f6.
---
## Para empezar
Con `1...e6` preparás `2...d5`: el peón de e6 sostiene al de d5 y las blancas tienen que decidir qué hacer con su peón de e4. Pueden avanzarlo (`3.e5`), cambiarlo (`3.exd5`) o defenderlo con un caballo (`3.Nc3` o `3.Nd2`).

Cuando el peón blanco llega a e5, se forma una cadena de peones d4-e5 que te quita espacio en el flanco de rey. La regla de oro de la Francesa es atacar esa cadena: primero la base, con `...c5`, y más adelante la punta, con `...f6`.

- Contra la cadena d4-e5, empujá `...c5` cuanto antes.
- Tu alfil de casillas claras es la pieza problemática, porque queda detrás de e6: buscale salida o un buen cambio.
- Si el peón blanco llegó a e5, tu caballo de g8 no tiene f6: va a e7 y de ahí a f5 o c6.
- No abras el centro si tus piezas no están listas: la Francesa premia la paciencia.

## Ideas y planes
- **Avance (`3.e5`):** `...c5`, `...Nc6` y `...Qb6` juntan tres piezas contra d4. Si las blancas preparan b4 para ganar espacio, `...c4` cierra el flanco de dama y deja la casilla b3 para tu caballo. Tu rey suele estar cómodo en cualquiera de los dos flancos.
- **Cambio (`3.exd5 exd5`):** la estructura es simétrica y tu alfil de c8 tiene la diagonal libre. Desarrollo sano, `...Bg4` para clavar al caballo de f3 y la columna e para las torres.
- **Clásica (`3.Nc3 Nf6`):** contra `4.e5` (Steinitz), el caballo vuelve a d7, `...c5` y `...Nc6` presionan d4 y, cuando estás enrocado, `...f6` abre la columna f. Contra `4.Bg5`, la Variante Burn (`4...dxe4`) cambia el peón central: entregás el centro, pero te quedás con la pareja de alfiles y un desarrollo sin problemas.
- **Tarrasch (`3.Nd2`):** el mismo plan que en la Steinitz. Después de `...c5`, `...Nc6`, el cambio en d4 y `...f6`, tu peón de e6 queda retrasado, pero tus piezas se vuelven muy activas y la casilla e4 es un gran puesto para tu caballo.

## Consejos
- En el Avance, no tomes en d4 con el caballo si el alfil blanco de d3 puede dar jaque en b5: al irse, destapa la dama de d1 contra la tuya.
- Contra la cadena d4-e5, golpeá primero la base (`...c5`) y después la punta (`...f6`).
- Si las blancas tienen el alfil en d3 apuntando a h7 y tu caballo ya no está en f6, antes de enrocar corto fijate si el sacrificio en h7 funciona.
- En el Cambio tu alfil de c8 está libre: sacalo antes de que la posición se cierre.
- Si las blancas ponen la dama en g4 y todavía no enrocaste, cuidá el peón de g7.

## Variante: Variante del Avance {#avance} [básica]
Con `3.e5` las blancas ganan espacio. Vos atacás la base de la cadena y, si preparan b4, cerrás el flanco de dama con `...c4`.

```pgn
1. e4 e6 2. d4 d5 3. e5 c5 { [%hint Atacá la base de la cadena de peones blanca.] }
4. c3 Nc6 5. Nf3 Qb6 { [%hint Sumá otra pieza contra d4 y, de paso, mirá el peón de b2.] }
6. a3 { Prepara b4 para ganar espacio en el flanco de dama. } c4 { [%hint Cerrá el flanco de dama antes de que las blancas lo expandan.] }
7. Nbd2 Na5 { [%hint Llevá el caballo hacia la casilla que dejó débil tu último avance.] Desde a5 apunta a b3. }
8. Rb1 Bd7 9. Be2 Ne7 { [%hint El caballo de g8 no tiene f6: buscale otro camino hacia f5.] }
10. O-O Nf5
```

El flanco de dama está bloqueado a tu favor y tu caballo de f5 presiona d4. Seguí con `...h6` y `...Be7`; muchas veces tu rey está más seguro con el enroque largo, lejos del espacio blanco en el flanco de rey.

## Variante: Variante del Cambio {#cambio} [básica]
Con `3.exd5 exd5` la estructura queda simétrica y tranquila. Tu alfil de c8 ya no está encerrado.

```pgn
1. e4 e6 2. d4 d5 3. exd5 exd5 { La estructura es simétrica y tu alfil de c8 tiene la diagonal libre. }
4. Nf3 Nf6 5. Bd3 Bd6 6. O-O O-O 7. Bg5 Bg4 { [%hint Respondé a la clavada con la misma idea.] }
8. Nbd2 Nbd7 9. c3 c6 10. Qc2 Qc7 11. Rfe1 Rfe8 { [%hint Ocupá la columna abierta.] }
```

Posición pareja y sin debilidades: cambiá piezas en la columna e y no te apures. Si las blancas juegan `h3`, decidí si cambiás en f3 o mantenés la clavada con `...Bh5`.

## Variante: Variante Steinitz {#steinitz} [club]
Con `3.Nc3 Nf6 4.e5` el caballo vuelve a d7, pero desde ahí apoya `...c5`. Después de enrocar, golpeás la punta de la cadena con `...f6`.

```pgn
1. e4 e6 2. d4 d5 3. Nc3 Nf6 { [%hint Desarrollá una pieza que presione el peón de e4.] }
4. e5 Nfd7 { El caballo retrocede, pero desde d7 apoya el avance del peón de c. }
5. f4 c5 { [%hint Atacá la base de la cadena.] }
6. Nf3 Nc6 7. Be3 Be7 { [%hint Desarrollá el alfil y prepará el enroque corto.] }
8. Qd2 O-O 9. Be2 b6 { [%hint Prepará la salida de tu alfil de casillas claras por la otra diagonal.] }
10. O-O f6 { [%hint Ahora golpeá la punta de la cadena.] }
```

Abrís la columna f para tu torre. Si las blancas cambian en c5, recapturá con el caballo; si cambian en f6, con el alfil. Tu alfil de c8 sale a b7 o a a6.

## Variante: Variante Burn {#burn} [club]
Contra `4.Bg5` cambiás el peón central. Entregás el centro, pero esquivás la clavada y te quedás con la pareja de alfiles.

```pgn
1. e4 e6 2. d4 d5 3. Nc3 Nf6 { [%hint Desarrollá una pieza que presione el peón de e4.] }
4. Bg5 dxe4 { [%hint Cambiá el peón central y simplificá el juego.] }
5. Nxe4 Be7 6. Bxf6 Bxf6 { Te quedás con la pareja de alfiles. }
7. Nf3 O-O 8. Qd2 Nd7 9. O-O-O Be7 { [%hint Dejale libre la casilla f6 a tu caballo, que quiere cambiar al de e4.] }
10. Bd3 b6 { [%hint Prepará la salida de tu alfil de casillas claras por la diagonal larga.] }
```

Las blancas enrocaron largo; tu rey va a estar seguro en cuanto vuelvas con el caballo a f6, y tenés la pareja de alfiles. Seguí con `...Bb7` y `...Nf6`, y prepará `...c5` para abrir líneas contra el rey blanco.

## Variante: Variante Tarrasch {#tarrasch} [club]
Con `3.Nd2` las blancas evitan la clavada de `...Bb4`. El plan es el mismo de la Steinitz: `...c5`, `...Nc6` y `...f6`.

```pgn
1. e4 e6 2. d4 d5 3. Nd2 Nf6 { [%hint Desarrollá una pieza que presione el peón de e4.] }
4. e5 Nfd7 5. Bd3 c5 { [%hint Atacá la base de la cadena.] }
6. c3 Nc6 7. Ne2 cxd4 8. cxd4 f6 { [%hint Ahora golpeá la punta de la cadena para abrir la columna f.] }
9. exf6 Nxf6 { El caballo vuelve a f6 y tus piezas quedan activas. }
10. Nf3 Bd6 11. O-O O-O 12. Bf4 Bxf4 13. Nxf4 Ne4 { [%hint Instalá el caballo en la casilla central que tu peón de d5 sostiene.] }
```

Tu peón de e6 está retrasado, pero tus piezas lo compensan: el caballo de e4 es muy fuerte y la columna f está semiabierta. Seguí con `...Bd7` y `...Qf6`.

## Trampa en contra: El jaque en b5 que gana la dama {#jaque-en-b5} [básica]
En el Avance, después de `6.Bd3 cxd4 7.cxd4`, el peón de d4 parece colgado. Si lo tomás con el caballo, el alfil de d3 da jaque y destapa la dama blanca.

```pgn
1. e4 e6 2. d4 d5 3. e5 c5 4. c3 Nc6 5. Nf3 Qb6 6. Bd3 cxd4 7. cxd4
Bd7 { [%hint Antes de pensar en d4, cubrí la casilla desde donde el alfil blanco te puede dar jaque.] Ahora ya no hay jaque en b5. }
(7... Nxd4?? { El peón parece gratis. } 8. Nxd4 Qxd4 9. Bb5+ { Jaque, y la dama de d1 ataca a la tuya: el alfil ya no tapa la columna d. } Kd8 10. Qxd4 { Los caballos se cambiaron y perdiste la dama por un peón. })
```

Recordá la regla: con el alfil blanco en d3 y tu dama en la columna d, el jaque en b5 es un descubierto. Con `7...Bd7`, la casilla b5 queda cubierta y podés seguir con `...Nge7` y `...Nf5` contra d4.
