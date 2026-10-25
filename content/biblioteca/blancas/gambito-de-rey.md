---
id: gambito-de-rey
nombre: Gambito de Rey
alias: King's Gambit, Gambito del Rey
lado: blancas
grupo: Abrís con 1.e4
orden: 60
eco: C30-C39
nivel: principiante, club
jugadas: 1. e4 e5 2. f4
resumen: Entregás el peón de f para sacar el peón de e5 del centro y abrir la columna f: la apertura romántica por excelencia.
---
## Para empezar
Con `2.f4` ofrecés un peón para desviar el peón de e5. Si las negras lo toman, jugás d4 y armás un centro de peones en e4 y d4 que ya no tiene enfrente al peón de e5, además de la columna f para tu torre después del enroque.

El precio es real: tu rey queda más expuesto, sobre todo en la diagonal de h4 a e1. Por eso, después de `2...exf4`, `3.Nf3` es casi obligatorio: desarrolla y le quita a la dama negra la casilla del jaque, h4.

- Contra `2...exf4`, jugá `3.Nf3`.
- Recuperá el peón de f4 cuando lo puedas hacer con desarrollo, no a cualquier precio.
- Enrocá corto rápido: la torre de f1 va a apuntar a la columna abierta.

## Ideas y planes
- **El centro ideal.** Con peones en e4 y d4 dominás el centro. El plan típico es d4, el alfil de c1 a f4 y el enroque.
- **El peón de f4.** Si las negras lo sostienen, tapa tu alfil de c1 y tu columna f. Muchas líneas giran alrededor de recuperarlo o de romper la cadena que lo defiende.
- **El punto f7.** Con el alfil en c4, el caballo en e5 o g5 y la torre en la columna f, f7 es el punto débil negro.
- **Contra `2...Bc5`.** El alfil controla g1 y no te deja enrocar corto por un rato. Con c3 y d4 lo echás y armás el centro.
- **Contra el Falkbeer (`2...d5 3.exd5 e4`).** Las negras ofrecen su propio peón para ganar tiempo; con d3 atacás el peón de e4, y el peón de d5 te queda como una cuña, aunque el material suele igualarse.
- **Es un gambito de verdad.** El motor considera que las negras están bien en casi todas las líneas: tu compensación es la iniciativa, no una ventaja objetiva. Jugalo con energía.

## Consejos
- Contra `2...Bc5` no tomes en e5: el jaque en h4 te cuesta la torre de h1 (ver la trampa en contra).
- Después de `2...exf4 3.Nf3 g5`, jugá `4.h4` para romper la cadena de peones negros antes de que se afirme.
- Si las negras juegan `3...d6`, con `4.d4` armás el centro.
- Contra `2...Qh4+`, `3.g3` alcanza: la dama tiene que volver y vos ganás tiempo.
- Si las negras juegan `2...d5 3.exd5 exf4`, seguí con `4.Nf3` y llegás a la Defensa Moderna.
- No te apures por recuperar f4 si eso te retrasa el enroque.

## Variante: Aceptado, Defensa Moderna (3...d5) {#moderna} [básica] [gambito]
La respuesta más sana: las negras devuelven un peón para desarrollarse rápido y abrir el juego.

```pgn
1. e4 e5 2. f4 { [%hint Ofrecé el peón de f para desviar el peón de e5.] El Gambito de Rey. }
exf4 3. Nf3 { [%hint Desarrollá y quitale a la dama negra la casilla del jaque.] Controla h4, así que ya no hay ...Qh4+, y prepara d4. }
d5 { Las negras devuelven un peón para desarrollarse. }
4. exd5 Nf6 5. Bb5+ { [%hint Desarrollá el alfil con jaque para estorbar el desarrollo negro.] }
c6 6. dxc6 Nxc6 { El material está parejo y las negras tienen buen desarrollo. }
7. Nc3 { [%hint Desarrollá el caballo de dama antes de decidir el plan central.] }
Bd6 8. Qe2+ { [%hint Molestá al rey negro antes de que enroque.] Con el jaque obligás a una decisión: tapar con el alfil, mover el rey o cambiar damas. }
Be6 9. Nd4 { [%hint Atacá a la pieza que acaba de tapar el jaque.] El caballo va por el alfil de e6 y presiona c6. }
```

Si las negras enrocan, cambiá en e6 y te quedás con la pareja de alfiles. Para el motor la posición está pareja: jugá con desarrollo rápido y presión sobre el peón de f4, que está adelantado.

Si en la sexta jugada las negras retoman con el peón (`6...bxc6`), el alfil vuelve a la diagonal de f7 con `7.Bc4`.

## Variante: Aceptado, Gambito Kieseritzky (3...g5) {#kieseritzky} [club] [gambito]
Las negras sostienen el peón de f4 con ...g5. Con h4 rompés la cadena y el caballo salta a e5.

```pgn
1. e4 e5 2. f4 { [%hint Ofrecé el peón de f para desviar el peón de e5.] }
exf4 3. Nf3 { [%hint Desarrollá y quitale a la dama negra la casilla del jaque.] }
g5 { Las negras defienden el peón de f4 con otro peón. }
4. h4 { [%hint Atacá la cadena de peones negros antes de que se afirme.] }
g4 5. Ne5 { [%hint El caballo atacado salta al centro.] El Gambito Kieseritzky: el caballo apunta a f7 y a g4. }
Nf6 6. d4 { [%hint Sostené el caballo de e5 y abrí el camino al alfil de c1.] }
d6 7. Nd3 { El caballo vuelve y ataca el peón de f4. }
Nxe4 8. Bxf4 { [%hint Recuperá el peón del gambito con desarrollo.] }
Qe7 { Amenaza mover el caballo con jaque descubierto. }
9. Qe2 { [%hint Tapá la columna del rey antes de que el caballo se mueva con jaque.] }
Bg7 10. c3 { [%hint Defendé el peón de d4, que ahora mira el alfil de g7.] }
h5 11. Nd2 { [%hint Desafiá al caballo de e4.] }
Nxd2 12. Kxd2 { La dama está clavada y no puede retomar; con el rey conservás el alfil activo en f4, y sin damas el rey está cómodo en d2. }
Qxe2+ 13. Bxe2 { Un final sin damas. }
```

Las negras tienen un peón de más, pero tu desarrollo y el peón negro de g4, adelantado y difícil de sostener, te dan compensación. Llevá las torres a las columnas abiertas y el rey, sin damas, juega como una pieza más.

## Variante: Aceptado, Defensa Schallopp (3...Nf6) {#schallopp} [club] [gambito]
Las negras atacan e4 con el caballo. Lo echás con e5 y, con algo de paciencia, recuperás el peón de f4.

```pgn
1. e4 e5 2. f4 { [%hint Ofrecé el peón de f para desviar el peón de e5.] }
exf4 3. Nf3 { [%hint Desarrollá y quitale a la dama negra la casilla del jaque.] }
Nf6 { Ataca el peón de e4. }
4. e5 { [%hint Echá al caballo con un peón.] }
Nh5 { Desde h5 el caballo defiende el peón de f4. }
5. Be2 { [%hint Desarrollá el alfil apuntando al caballo de h5.] }
d6 6. O-O { [%hint Poné el rey a salvo y sumá la torre a la columna f.] }
dxe5 7. Nxe5 { El caballo se instala en el centro. }
Bc5+ 8. Kh1 { El rey se aparta de la diagonal. }
Nf6 { El caballo de h5 estaba atacado por tu alfil. }
9. Nd3 { [%hint Atacá a la vez el alfil de c5 y el peón de f4.] }
Bb6 10. Nxf4 { Recuperaste el peón del gambito. }
```

Material parejo, desarrollo cómodo y la columna f abierta para tu torre. Seguí con d3, c3 y el alfil de c1 al juego.

Cuidado con `8...Ng3+`: después de `9.hxg3 fxg3` las negras amenazan ...Qh4 con mate. Contra eso, `10.Nf3` cubre h4 y h2, y quedás con una pieza por dos peones y la mejor posición.

## Variante: Rehusado clásico (2...Bc5) {#rehusado-bc5} [básica]
Las negras no toman el peón y ponen el alfil en c5, donde te impide enrocar corto. Lo echás con c3 y d4.

```pgn
1. e4 e5 2. f4 { [%hint Ofrecé el peón de f para desviar el peón de e5.] }
Bc5 { El alfil controla g1: por ahora no podés enrocar corto. }
3. Nf3 { [%hint Desarrollá y quitale a la dama negra la casilla del jaque.] }
d6 4. c3 { [%hint Prepará el avance central que echa al alfil.] }
Nf6 5. d4 { [%hint Ocupá el centro y atacá al alfil.] }
exd4 6. cxd4 Bb4+ 7. Bd2 Bxd2+ 8. Nbxd2 { Tu pareja de peones e4-d4 queda firme. }
O-O 9. Bd3 { [%hint Desarrollá el alfil defendiendo el peón de e4.] }
```

Tenés el centro y más espacio. Enrocá y prepará e5 para echar al caballo de f6. Si en la sexta jugada el alfil se retira a b6 en vez de dar jaque, `7.Nc3` y el mismo plan.

## Variante: Contragambito Falkbeer (2...d5) {#falkbeer} [club]
Las negras contraatacan en el centro y ofrecen su propio peón para estorbar tu desarrollo.

```pgn
1. e4 e5 2. f4 { [%hint Ofrecé el peón de f para desviar el peón de e5.] }
d5 { El Contragambito Falkbeer: las negras atacan tu centro en vez de tomar. }
3. exd5 { [%hint Capturá el peón que ataca tu centro.] }
e4 { Las negras dejan un peón en e4 para estorbar tu desarrollo. }
4. d3 { [%hint Atacá el peón de e4 y abrí el camino a tu alfil de c1.] }
Nf6 5. dxe4 Nxe4 6. Nf3 { [%hint Desarrollá y controlá e5.] }
Bc5 7. Qe2 { [%hint Clavá el caballo de e4 contra el rey.] La dama ataca el caballo, que no se puede mover sin dejar al rey en jaque. }
Bf5 8. Nc3 { [%hint Sumá otro atacante sobre el caballo de e4.] }
Qe7 9. Be3 { [%hint Tapá la diagonal del alfil de c5 y ofrecé el cambio.] }
Bxe3 10. Qxe3 Nxc3 11. Qxe7+ Kxe7 12. bxc3 { Un final sin damas. }
```

Las negras suelen recuperar el peón de c2 con el alfil, pero tu peón de d5 y tus piezas activas te dejan algo mejor. Llevá una torre a la columna e y el rey hacia el centro.

## Trampa en contra: El jaque de la dama en h4 {#jaque-en-h4} [básica]
Contra `2...Bc5`, tomar en e5 parece ganar un peón. Pero abre la diagonal de tu rey y la dama negra entra con jaque.

```pgn
1. e4 e5 2. f4 { [%hint Ofrecé el peón de f para desviar el peón de e5.] }
Bc5 3. Nf3 { [%hint Desarrollá y quitale a la dama negra la casilla del jaque.] }
(3. fxe5?? Qh4+ { Jaque por la diagonal que abriste. Si el rey va a e2, ...Qxe4 es mate. } 4. g3 Qxe4+ { Jaque y ataque a la torre de h1 a la vez. } 5. Qe2 Qxh1 { Las negras ganaron la torre. })
d6 4. c3 { [%hint Prepará el avance central que echa al alfil.] }
```

El peón de e5 no se va a ningún lado: primero desarrollá el caballo a f3, que controla h4, y después pensá en tomar.

## Trampa a favor: El jaque en f2 del Falkbeer {#falkbeer-f2} [club]
En el Falkbeer, con tu dama en e2 clavando el caballo de e4, el jaque ...Bf2+ parece molesto. En realidad deja al caballo sin apoyo.

```pgn
1. e4 e5 2. f4 { [%hint Ofrecé el peón de f para desviar el peón de e5.] }
d5 3. exd5 { [%hint Capturá el peón que ataca tu centro.] }
e4 4. d3 { [%hint Atacá el peón de e4 y abrí el camino a tu alfil de c1.] }
Nf6 5. dxe4 Nxe4 6. Nf3 { [%hint Desarrollá y controlá e5.] }
Bc5 7. Qe2 { [%hint Clavá el caballo de e4 contra el rey.] }
Bf2+? { Parece ganar tiempo con jaque, pero el caballo de e4 se queda sin apoyo. }
8. Kd1 { El rey no puede tomar en f2: el caballo de e4 cuida esa casilla. }
Qxd5+ 9. Nfd2 { [%hint Tapá el jaque sin sacar a tu dama de la columna e.] El caballo de d2 queda clavado por la dama negra, pero la amenaza es 10.Qxe4+ Qxe4 11.Nxe4, y ganás el caballo. Si las negras lo defienden con 9...Bf5, 10.Nc3 ataca a la dama y suma un tercer atacante sobre e4: las negras no pueden sostener el caballo y lo pierden. }
```

Las negras pierden material: el caballo de e4 tiene demasiados atacantes y el alfil de f2 quedó lejos de casa. Seguí con Nc3 para sumar presión, y con material de más el rey irá a un lugar seguro.

## Trampa a favor: La clavada que no alcanza {#clavada-e4} [club]
En el rehúse con `2...Bc5`, después del cambio de alfiles en d2 las negras pueden tomar en e4 pensando en clavar tu caballo en la columna e. La clavada tiene solución.

```pgn
1. e4 e5 2. f4 { [%hint Ofrecé el peón de f para desviar el peón de e5.] }
Bc5 3. Nf3 { [%hint Desarrollá y quitale a la dama negra la casilla del jaque.] }
d6 4. c3 { [%hint Prepará el avance central que echa al alfil.] }
Nf6 5. d4 { [%hint Ocupá el centro y atacá al alfil.] }
exd4 6. cxd4 Bb4+ 7. Bd2 Bxd2+ 8. Nbxd2
Nxe4?? { Parece ganar un peón con la idea de clavar tu caballo en la columna e. }
9. Nxe4 { [%hint No le tengas miedo a la clavada que preparan las negras: tiene solución.] }
Qe7 { Clava tu caballo de e4 contra el rey. }
10. Qe2 { [%hint Defendé el caballo y sacá a tu rey de la clavada con la misma jugada.] El caballo queda defendido y tu rey, fuera de la clavada. }
```

Ganaste una pieza. Si las negras atacan al caballo con un peón, movelo: aunque cambien damas, seguís con una pieza de más.
