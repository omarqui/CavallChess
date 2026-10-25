# CavallChess

Entrenador personal de aperturas: armás tu repertorio, lo memorizás con repetición espaciada (FSRS) y lo contrastás con tus partidas de Chess.com. PWA pensada para iPhone, funciona sin conexión y guarda todo en el dispositivo.

Las decisiones de diseño están en [PLAN.md](PLAN.md).

## Qué hace

- **Biblioteca de aperturas:** 46 fichas en español (con blancas y con negras) con ideas, consejos, variantes y trampas, un visor de líneas con análisis de Stockfish, apuntes propios y un botón para agregar la apertura a tu repertorio.
- **Bienvenida y tips:** la primera vez te guía para instalar la app, probar un repaso y elegir tus primeras aperturas; después, un aviso corto por pantalla.
- **Trampas:** las jugadas de las trampas de la biblioteca quedan marcadas y el entrenamiento te avisa cuando el rival cayó o cuando evitaste una.
- **Repertorio por posición.** Un grafo por color; las transposiciones se resuelven solas. Una jugada propia por posición, todas las del rival que quieras.
- **Importación** de PGN (pegado o archivo) y de estudios de Lichess por URL, con vista previa: choques con lo que ya tenés, variantes propias ignoradas y nombre de apertura por capítulo.
- **Entrenamiento** guiado por tarjetas: la app reproduce la línea, vos jugás tu jugada y el rival responde con la que lleva a lo pendiente. Modo aprender para las nuevas, pista "¿por qué?", "fue un error de dedo", práctica a demanda por apertura.
- **Partidas de Chess.com:** marca dónde te desviaste (la tarjeta vence ya) y qué jugó el rival que no cubrías (lista de huecos).
- **Progreso:** dominio por apertura, racha diaria y líneas débiles.
- **Editor:** árbol con transposiciones, notas, "cortar aquí", archivado con historial, Stockfish 19 y explorador de Lichess.

## Desarrollo

```bash
npm install
npm run dev          # http://localhost:5173
npm test             # tests unitarios (vitest)
npm run build        # build de producción en dist/
npm run e2e          # tests end-to-end (Playwright con el Chrome instalado; sirve dist/)
LIVE=1 npm run test:live   # contra las APIs reales de Lichess y Chess.com
```

Requiere Node 20.19 o superior.

## Publicar en GitHub Pages

1. Creá un repositorio **público** (la app es GPL-3.0) y subí el código a `main`.
2. En *Settings → Pages*, elegí *Source: GitHub Actions*.
3. Cada push a `main` corre los tests, compila con `BASE_PATH=/<repo>/` y publica.

## Instalar en el iPhone

Abrí la URL en Safari → *Compartir* → *Agregar a pantalla de inicio*. Instalada, la app tiene su propio almacenamiento y funciona sin conexión.

Tu progreso vive solo en el dispositivo: usá **Ajustes → Hacer un respaldo** (se guarda en Archivos o iCloud Drive). Si quitás la app de la pantalla de inicio, sus datos se borran.

## Cuentas

- **Lichess:** para estudios privados o no listados y para el explorador de aperturas, creá un token con permiso `study:read` y pegalo en Ajustes. No sale del dispositivo ni viaja en los respaldos.
- **Chess.com:** solo el nombre de usuario; las partidas se leen de la API pública.

## Licencia y créditos

GPL-3.0-or-later (ver [LICENSE](LICENSE)).

- [chessground](https://github.com/lichess-org/chessground) y [chessops](https://github.com/niklasf/chessops) (GPL-3.0), de Lichess.
- [Stockfish](https://stockfishchess.org/) vía [stockfish.js](https://github.com/nmrugg/stockfish.js) (GPL-3.0).
- [ts-fsrs](https://github.com/open-spaced-repetition/ts-fsrs) (MIT), [Dexie](https://dexie.org/) (Apache-2.0).
- Piezas: cburnett (GPLv2+), Mérida (GPLv2+), Chessnut (Apache-2.0). Nombres de aperturas: [lichess-org/chess-openings](https://github.com/lichess-org/chess-openings) (CC0).
- Tipografía Spectral (OFL).
