// Pruebas contra las APIs reales (solo con LIVE=1): estudio público de Lichess y partidas de Chess.com.
import { describe, expect, it } from 'vitest';
import { buildImportPlan } from '../chess/pgnImport';
import { analyzeGame } from '../games/analyze';
import { archivesToFetch } from '../games/chesscom';
import { emptyRepo, existingOf, graphOf, importInto } from '../test/helpers';

const live = process.env.LIVE === '1' ? describe : describe.skip;
const UA = { 'User-Agent': 'CavallChess-test/0.1' };

live('APIs reales', () => {
  it('importa un estudio público de Lichess', async () => {
    const list = await fetch('https://lichess.org/api/study/by/lichess', { headers: UA }).then((r) => r.text());
    // Los "Puzzle Pack" empiezan desde posiciones sueltas (se omiten); las anotaciones son partidas enteras.
    const studies = list
      .trim()
      .split('\n')
      .map((l) => JSON.parse(l) as { id: string; name: string });
    const first = studies.find((s) => /Annotations/.test(s.name)) ?? studies[0];
    const res = await fetch(`https://lichess.org/api/study/${first.id}.pgn?comments=true&variations=true&clocks=false`, {
      headers: UA,
    });
    expect(res.ok).toBe(true);
    const pgn = await res.text();
    const plan = buildImportPlan(pgn, 'white', existingOf(emptyRepo('white')));
    console.log(`estudio ${first.name}: ${plan.chapters.length} capítulos, ${plan.edges.size} jugadas, ${plan.ignoredOwnVariations} variantes propias ignoradas, errores: ${plan.errors.length}`, plan.errors.slice(0, 3));
    expect(plan.chapters.length).toBeGreaterThan(0);
  }, 30_000);

  it('cruza partidas reales de Chess.com con un repertorio', async () => {
    const user = 'hikaru';
    const { archives } = await fetch(`https://api.chess.com/pub/player/${user}/games/archives`, { headers: UA }).then((r) =>
      r.json(),
    );
    const [month] = archivesToFetch(archives, undefined, user, 1);
    const { games } = await fetch(month, { headers: UA }).then((r) => r.json());
    const repo = emptyRepo('white');
    importInto(repo, '1. e4 e5 2. Nf3 Nc6 3. Bb5 (2... Nf6 3. Nxe5) (1... c5 2. Nf3) *', 'white');
    const g = graphOf(repo, 'white');
    const counts: Record<string, number> = {};
    for (const game of games.filter((x: { rules: string }) => x.rules === 'chess').slice(0, 200)) {
      if (game.white.username.toLowerCase() !== user) continue;
      const { outcome } = analyzeGame(game.pgn, g);
      counts[outcome.kind] = (counts[outcome.kind] ?? 0) + 1;
    }
    console.log(`chess.com ${month.split('/games/')[1]}:`, counts);
    expect(Object.values(counts).reduce((a, b) => a + b, 0)).toBeGreaterThan(0);
  }, 60_000);
});
