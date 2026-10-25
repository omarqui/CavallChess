# Créditos de las piezas

Los sets de piezas que se eligen en Ajustes. Todos tienen licencias libres compatibles con la GPL-3.0 de CavallChess. La lista de ids, nombres, autores y licencias que usa la app está en `src/ui/pieceSets.ts`; las reglas que los aplican al tablero, en `src/themes.css`.

Las piezas Neo de Chess.com son propietarias: no se copian ni se cargan desde sus servidores. Papercut gris es lo más parecido que se puede ofrecer.

| Set (carpeta) | Nombre en la app | Autor | Licencia | Origen |
|---|---|---|---|---|
| `papercut-gris` | Papercut gris | Nikolay Anzarov (modificado, ver abajo) | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) | derivado de `papercut` |
| `papercut` | Papercut | Nikolay Anzarov | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) | [lichess-org/lila](https://github.com/lichess-org/lila/tree/master/public/piece/papercut) |
| `mpchess` | MPChess | Maxime Chupin | [GPLv3 o posterior](https://www.gnu.org/licenses/gpl-3.0.html) | [lichess-org/lila](https://github.com/lichess-org/lila/tree/master/public/piece/mpchess) |
| `cburnett` | Clásicas | Colin M.L. Burnett | [GPLv2 o posterior](https://www.gnu.org/licenses/old-licenses/gpl-2.0.html) | [lichess-org/lila](https://github.com/lichess-org/lila/tree/master/public/piece/cburnett) (en el tablero las pone chessground; esta copia es para la miniatura del selector) |
| `merida` | Mérida | Armando Hernandez Marroquin | [GPLv2 o posterior](https://www.gnu.org/licenses/old-licenses/gpl-2.0.html) | [lichess-org/lila](https://github.com/lichess-org/lila/tree/master/public/piece/merida) |
| `chessnut` | Chessnut | Alexis Luengas | [Apache-2.0](https://www.apache.org/licenses/LICENSE-2.0) | [lichess-org/lila](https://github.com/lichess-org/lila/tree/master/public/piece/chessnut) |
| `pirouetti` | Pirouetti | pirouetti | [AGPLv3 o posterior](https://www.gnu.org/licenses/agpl-3.0.html) | [lichess-org/lila](https://github.com/lichess-org/lila/tree/master/public/piece/pirouetti) |
| `rhosgfx` | RhosGFX | RhosGFX | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) | [lichess-org/lila](https://github.com/lichess-org/lila/tree/master/public/piece/rhosgfx) |
| `firi` | Firi | James Faure | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) | [lichess-org/lila](https://github.com/lichess-org/lila/tree/master/public/piece/firi) |
| `fantasy` | Fantasy | Maurizio Monge | MIT (texto completo abajo) | [lichess-org/lila](https://github.com/lichess-org/lila/tree/master/public/piece/fantasy) |

## Modificación de Papercut gris

`papercut-gris` es una copia de `papercut` (Nikolay Anzarov, CC BY 4.0) con un único cambio: en las seis piezas negras (`b*.svg`) el degradado del cuerpo pasa de `#454f54 → #110d26` (negro azulado) a `#7a7774 → #45423f` (gris cálido), para que se parezcan a las piezas de Chess.com. Las blancas, las formas, los trazos y los filtros quedan iguales. La versión modificada se distribuye con la misma licencia, CC BY 4.0.

## Licencia de Fantasy (MIT)

```
MIT License

Copyright (c) Maurizio Monge

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
