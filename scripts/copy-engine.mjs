// Copia Stockfish lite single-thread a public/engine (se sirve tal cual, sin hash, junto a su .wasm).
import { mkdirSync, copyFileSync } from 'node:fs';

const src = new URL('../node_modules/stockfish/bin/', import.meta.url);
const dst = new URL('../public/engine/', import.meta.url);
mkdirSync(dst, { recursive: true });
for (const f of ['stockfish-19-lite-single.js', 'stockfish-19-lite-single.wasm']) {
  copyFileSync(new URL(f, src), new URL(f, dst));
}
