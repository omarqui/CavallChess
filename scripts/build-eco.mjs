// Genera src/data/eco.json (EPD -> nombre) a partir del dataset lichess-org/chess-openings (CC0).
import { readFileSync, writeFileSync } from 'node:fs';
import { Chess } from 'chessops/chess';
import { makeFen } from 'chessops/fen';
import { parseSan } from 'chessops/san';

const out = {};
for (const f of ['a', 'b', 'c', 'd', 'e']) {
  const lines = readFileSync(new URL(`./eco-src/${f}.tsv`, import.meta.url), 'utf8').trim().split('\n').slice(1);
  for (const line of lines) {
    const [eco, name, pgn] = line.split('\t');
    const pos = Chess.default();
    for (const tok of pgn.split(/\s+/)) {
      if (/^\d+\.$/.test(tok)) continue;
      const move = parseSan(pos, tok);
      if (!move) throw new Error(`SAN inválida ${tok} en ${name}`);
      pos.play(move);
    }
    out[makeFen(pos.toSetup(), { epd: true })] = `${eco} ${name}`;
  }
}
writeFileSync(new URL('../src/data/eco.json', import.meta.url), JSON.stringify(out));
console.log(`eco.json: ${Object.keys(out).length} posiciones`);
