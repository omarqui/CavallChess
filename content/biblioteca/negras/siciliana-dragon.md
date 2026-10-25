---
id: siciliana-dragon
nombre: Siciliana Dragón
alias: Dragon Sicilian, Dragón, Dragon
lado: negras
grupo: Contra 1.e4
orden: 50
eco: B70-B79
nivel: club
jugadas: 1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 g6
resumen: Llevás el alfil a g7, enrocás corto y contraatacás por la columna c: una Siciliana de ataques mutuos donde el alfil del fianchetto es la pieza estrella.
---
## Para empezar
Con `5...g6` preparás el fianchetto: el alfil va a g7 y desde ahí mira toda la diagonal larga, hasta d4, c3 y b2. Ese alfil es "el dragón" que le da nombre a la variante, y casi todo tu juego depende de él.

El esquema es siempre parecido: alfil a g7, enroque corto, `...Nc6`, una torre a la columna c y el contraataque contra el enroque blanco. Las blancas suelen enrocar largo y lanzar los peones del flanco de rey, así que la partida se vuelve una carrera.

- Enrocá corto rápido: con el alfil en g7, tu rey está bien protegido.
- Tu alfil de g7 es la pieza más valiosa que tenés: no lo cambies sin un buen motivo.
- La columna c es tuya: llevá una torre ahí y sumá piezas contra c3.
- Si el centro se abre, la ruptura `...d5` suele liberar todo tu juego.

## Ideas y planes
- **Ataque Yugoslavo (`Be3`, `f3`, `Qd2` y enroque largo):** las blancas quieren cambiar tu alfil con `Bh6` y abrir la columna h con h4-h5. Vos atacás con `...Rc8`, `...Ne5-c4` contra la dama y el alfil de e3, y el avance `...b5`. Contra `9.Bc4`, la jugada `...h5` (Variante Soltis) frena el peón de h; contra `9.O-O-O` inmediato, la ruptura `...d5` es la respuesta más directa.
- **Sacrificio de calidad:** `...Rxc3` es un recurso típico del Dragón. Después de bxc3, los peones blancos delante del rey quedan rotos y tu alfil de g7 se vuelve monstruoso.
- **Variante Clásica (`Be2` y enroque corto):** es más lenta. Tus planes son `...Be6`, `...Na5` hacia c4 y la presión en la columna c; los cambios de piezas menores te favorecen.
- **Ataque Levenfish (`6.f4`):** las blancas quieren empujar e5 enseguida. Por eso sacás primero el caballo de b8 y recién después decidís dónde va el alfil.
- **Alfil en c4 sin f3:** si las blancas ponen el alfil en e3 sin haber jugado f3, el salto `...Ng4` lo ataca. La dama no puede tomar en g4 porque el alfil de c8 cubre esa casilla.

## Consejos
- Contra `6.Be3`, primero `6...Bg7`: si saltás antes con `6...Ng4`, `7.Bb5+` deja tu caballo colgando.
- Contra `6.f4`, sacá el caballo de b8 antes que el alfil de f8: si no, el avance e5 te complica.
- Si las blancas juegan `Bh6` para cambiar tu alfil, que no te tome desprevenido: tené pensado cómo cuidar las casillas oscuras alrededor de tu rey.
- En el Yugoslavo, cada tiempo cuenta: una jugada de defensa de más puede perder la carrera.
- Antes de jugar `...Rxc3`, contá qué te queda: el sacrificio funciona cuando tu alfil y tus caballos llegan al rey blanco.

## Variante: Ataque Yugoslavo, Variante Soltis {#yugoslavo-soltis} [club]
Con `9.Bc4` el alfil apunta a f7 y frena tu `...d5`. Vos llevás la torre a c8, el caballo a e5 y frenás el peón de h con `...h5`.

```pgn
1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 g6 6. Be3 Bg7 { [%hint Ubicá el alfil en la diagonal larga, apuntando al flanco de dama blanco.] }
7. f3 O-O 8. Qd2 Nc6 9. Bc4 { El alfil apunta a f7 y frena tu ruptura central. } Bd7 { [%hint Desarrollá el alfil de casillas claras para conectar la dama con las torres.] }
10. O-O-O Rc8 { [%hint Ocupá la columna semiabierta que apunta al rey blanco.] }
11. Bb3 Ne5 { [%hint Llevá el caballo hacia una casilla desde donde ataque a la dama y al alfil de e3.] }
12. h4 h5 { [%hint Frená el peón que quiere abrir la columna h contra tu rey.] }
13. Bg5 Rc5 { [%hint Sin sacarla de la columna c, subí la torre para que respalde el avance de tu peón de b.] }
14. Kb1 b5
```

Tu contraataque ya está en marcha: seguí con `...a5-a4` para echar al alfil de b3 o con `...Nc4`. Si las blancas juegan g4 para abrir el flanco de rey, no te distraigas: lo que decide es qué ataque llega primero, y el tuyo ya está en camino.

## Variante: Ataque Yugoslavo con 9.O-O-O {#yugoslavo-d5} [club]
Si las blancas enrocan largo antes de jugar `Bc4`, el centro queda flojo. Rompés enseguida con `...d5`.

```pgn
1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 g6 6. Be3 Bg7 { [%hint Ubicá el alfil en la diagonal larga, apuntando al flanco de dama blanco.] }
7. f3 O-O 8. Qd2 Nc6 9. O-O-O d5 { [%hint Rompé en el centro ahora que el rey blanco se fue al flanco de dama.] }
10. exd5 Nxd5 11. Nxc6 bxc6 { Recapturás hacia el centro y se abre la columna b contra el rey blanco. }
12. Bd4 { Ofrece cambiar tu alfil de g7. } Bxd4 13. Qxd4 Qb6 { [%hint Sacá la dama con la oferta de cambiarla por la blanca.] }
14. Na4 { Esquiva el cambio y ataca a tu dama. } Qc7 { [%hint Retirá la dama a una casilla desde donde apunte al flanco de rey blanco.] Desde c7 mira la diagonal hasta h2. }
```

Tu caballo de d5 está muy bien ubicado y la columna b está abierta contra el rey blanco. Seguí con `...Rd8` o `...Rb8` y sacá el alfil a f5 o a e6. Si las blancas atacan tu caballo con `Bc4`, `...Nb6` lo reubica con tempo.

## Variante: Variante Clásica {#clasica} [básica]
Con `6.Be2` y el enroque corto, las blancas eligen un juego más tranquilo. Vos cambiás piezas menores y presionás por la columna c.

```pgn
1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 g6 6. Be2 Bg7 { [%hint Ubicá el alfil en la diagonal larga, apuntando al flanco de dama blanco.] }
7. O-O O-O 8. Be3 Nc6 9. Nb3 { Esquiva cambios y prepara f4. } Be6 { [%hint Desarrollá el alfil a una casilla desde donde vigile c4 y d5.] }
10. f4 Na5 { [%hint Llevá el caballo hacia c4, donde molesta a las piezas blancas.] }
11. f5 Bc4 { [%hint Ofrecé cambiar tu alfil por el alfil blanco que defiende el enroque.] }
12. Nxa5 Bxe2 13. Qxe2 Qxa5 { Cambiaste dos piezas menores y tu dama quedó activa. }
14. g4 Rac8 { [%hint Llevá una torre a la columna semiabierta para presionar al caballo de c3.] }
15. g5 Nd7
```

Las blancas avanzan los peones del flanco de rey; vos tenés la columna c y la casilla e5 para el caballo. Tu torre de c8 presiona al caballo de c3, que es el único defensor del peón de e4: por eso el sacrificio `...Rxc3` siempre está en el aire.

## Variante: Variante con 6.Bc4 {#bc4} [básica]
`6.Bc4` es muy común en partidas rápidas. Desarrollás normal y, cuando el alfil blanco llega a e3 sin el apoyo de f3, aprovechás la casilla g4.

```pgn
1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 g6 6. Bc4 Bg7 { [%hint Ubicá el alfil en la diagonal larga, apuntando al flanco de dama blanco.] }
7. O-O O-O 8. Bb3 Nc6 9. Be3 Ng4 { [%hint Atacá al alfil de e3 con una pieza que la dama blanca no puede capturar.] La dama no puede tomar en g4: el alfil de c8 defiende esa casilla. [%cal Gc8g4] }
10. Nxc6 bxc6 { Recapturás hacia el centro y abrís la columna b. }
11. Bf4 { El alfil esquiva el cambio. } Ne5 { [%hint Volvé con el caballo al centro, desde donde apunta a c4 y f3.] }
```

Igualaste con comodidad: la columna b abierta presiona al alfil de b3 y a b2, y el alfil de g7 apunta a c3. Seguí con `...Rb8` y `...a5-a4` para echar al alfil de b3.

## Variante: Ataque Levenfish {#levenfish} [club]
Con `6.f4` las blancas amenazan avanzar e5 enseguida. Por eso tu primera jugada no es el alfil sino el caballo de b8.

```pgn
1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 g6 6. f4 Nc6 { [%hint Antes de terminar el fianchetto, sacá la pieza que vigila e5 y d4.] }
7. Nxc6 bxc6 8. e5 Nd7 { [%hint Retirá el caballo atacado a una casilla desde donde siga mirando e5.] }
9. exd6 exd6 { Tenés un centro de peones sólido y el alfil de f8 puede salir. }
10. Be3 Be7 { El alfil sale por e7: desde ahí puede ir a f6 y mirar el centro. }
11. Bd3 d5 { [%hint Avanzá el peón central para ganar espacio y controlar e4.] }
12. O-O Nc5 { [%hint Atacá al alfil blanco de casillas claras.] }
```

Tu estructura es sana y el caballo de c5 puede cambiarse por el alfil de d3. Enrocá corto y seguí con `...Bf6` o `...Re8`. Como a las blancas ya no les quedan peones que puedan cubrir e4, esa casilla, apoyada por tu peón de d5, puede ser un gran puesto para tu caballo.

## Trampa en contra: El avance e5 en el Levenfish {#levenfish-e5} [club]
Contra `6.f4`, la jugada que pide el Dragón es `6...Bg7`. Justo ahí el avance e5 llega con mucha fuerza.

```pgn
1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 g6 6. f4 Nc6 { [%hint Antes de terminar el fianchetto, sacá la pieza que vigila e5 y d4.] }
(6... Bg7? { Lo natural, pero deja que el peón central avance con tempo. No pierde por sí sola, pero te obliga a defenderte con precisión. } 7. e5! { El caballo de f6 se queda sin buenas casillas. La defensa precisa es 7...dxe5 8.fxe5 Nfd7, y aun así las blancas quedan algo mejor. } dxe5 8. fxe5 Ng4?? { Parece la casilla más activa, pero pierde material. } 9. Bb5+! { Jaque, y el caballo de g4 queda sin defensa. Tapar con el caballo de b8 tampoco alcanza: también pierde material. } Bd7 10. Qxg4 { Las blancas ganaron una pieza: si tomás en b5, recapturan con el caballo. })
```

`6...Bg7` es dudosa, no perdedora: si ya la jugaste, después de `7.e5 dxe5 8.fxe5` el caballo tiene que volver a d7, nunca a g4. Más simple es `6...Nc6`: el avance e5 pierde fuerza, porque si las blancas cambian en c6 y empujan, tu caballo vuelve a d7 con todo bajo control. Lo que sigue lo tenés en el Ataque Levenfish.

## Trampa a favor: El sacrificio en f7 que no funciona {#sacrificio-en-f7} [básica]
Contra `6.Bc4 Bg7 7.Be3`, sin f3, tu caballo salta a g4 y ataca al alfil de e3. Algunos rivales responden con un golpe en f7 que parece ganar.

```pgn
1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 g6 6. Bc4 Bg7 { [%hint Ubicá el alfil en la diagonal larga, apuntando al flanco de dama blanco.] }
7. Be3 Ng4 { [%hint Atacá al alfil de e3 con una pieza que la dama blanca no puede capturar.] }
8. Bxf7+?? { La idea blanca es 8...Kxf7 9.Qxg4, pero falla. } Kxf7 { [%hint Tomá el alfil sin miedo: la casilla de tu caballo está defendida.] }
```

Si ahora `9.Qxg4`, `9...Bxg4` se lleva la dama: tu alfil de c8 defiende g4. Las blancas quedaron con una pieza menos y tu rey, aunque perdió el enroque, está a salvo. Contra `8.Bb5+`, en cambio, la respuesta es `8...Kf8`: el caballo sigue atacando al alfil de e3 y la posición queda pareja.
