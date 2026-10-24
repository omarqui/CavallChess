import { useState } from 'react';
import { figurine, nodeId, playUci } from '../chess/position';
import { useGames, useGaps, useGraphs, useSettings } from '../db/hooks';
import { syncChesscom } from '../games/sync';
import type { GameRow, Gap } from '../types';
import { arrow, Board } from '../ui/Board';
import { Banner, Button, MoveLine, Screen, Section, sideLabel } from '../ui/kit';
import { navigate } from '../ui/router';

export function GamesScreen() {
  const settings = useSettings();
  const gaps = useGaps();
  const games = useGames();
  const graphs = useGraphs();
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  if (!settings || !gaps || !games || !graphs) return null;

  const sync = async () => {
    setBusy(true);
    setError(null);
    try {
      const r = await syncChesscom(setStatus);
      setStatus(
        r.imported
          ? `${r.imported} ${r.imported === 1 ? 'partida nueva' : 'partidas nuevas'}: ${r.deviations} ${r.deviations === 1 ? 'desvío tuyo' : 'desvíos tuyos'} y ${r.gaps} ${r.gaps === 1 ? 'hueco' : 'huecos'}.`
          : 'No hay partidas nuevas.',
      );
    } catch (e) {
      setError((e as Error).message);
      setStatus(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen title="Partidas">
      {!settings.chesscomUser ? (
        <Banner>
          Para cruzar tus partidas con el repertorio, configurá tu usuario de Chess.com en{' '}
          <button className="font-semibold underline underline-offset-2" onClick={() => navigate('/settings')}>
            Ajustes
          </button>
          .
        </Banner>
      ) : (
        <div>
          <p className="text-[15px] text-muted">
            Chess.com · {settings.chesscomUser}
            {settings.lastChesscomSync &&
              ` · actualizado ${new Date(settings.lastChesscomSync).toLocaleString('es', { dateStyle: 'short', timeStyle: 'short' })}`}
          </p>
          <Button variant="primary" className="mt-3 w-full" disabled={busy} onClick={() => void sync()}>
            {busy ? 'Actualizando…' : 'Actualizar partidas'}
          </Button>
          {status && <p className="mt-2 text-[15px] text-muted">{status}</p>}
          {error && (
            <div className="mt-3">
              <Banner tone="bad">{error}</Banner>
            </div>
          )}
        </div>
      )}

      <Section title="Huecos del repertorio" aside={gaps.length > 0 && <span className="text-sm text-muted">{gaps.length}</span>}>
        {gaps.length === 0 ? (
          <p className="text-[15px] text-muted">
            Cuando un rival juegue algo que tu repertorio no cubre, aparece acá para que prepares tu respuesta.
          </p>
        ) : (
          <ul className="space-y-3">
            {gaps.slice(0, 30).map((g) => (
              <GapItem key={g.id} gap={g} graphs={graphs} />
            ))}
          </ul>
        )}
      </Section>

      <Section title="Últimas partidas">
        {games.length === 0 ? (
          <p className="text-[15px] text-muted">Todavía no importaste partidas.</p>
        ) : (
          <ul className="divide-y divide-line rounded-xl ring-1 ring-line">
            {games.map((g) => (
              <GameItem key={g.id} game={g} />
            ))}
          </ul>
        )}
      </Section>
    </Screen>
  );
}

function GapItem({ gap, graphs }: { gap: Gap; graphs: NonNullable<ReturnType<typeof useGraphs>> }) {
  const g = graphs[gap.side];
  const id = nodeId(gap.side, gap.epd);
  const path = g.pathFromRoot(id) ?? g.anyPathFromRoot(id) ?? [];
  const covered = g.edges.has(`${id}|${gap.uci}`);
  const [from, to] = [gap.uci.slice(0, 2), gap.uci.slice(2, 4)];
  const played = playUci(gap.epd, gap.uci);
  return (
    <li className="flex gap-3 rounded-xl p-3 ring-1 ring-line">
      <div className="w-24 shrink-0">
        <Board epd={gap.epd} orientation={gap.side} coordinates={false} shapes={[arrow(from, to, 'red')]} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-muted">
          {sideLabel(gap.side)} · {gap.count} {gap.count === 1 ? 'vez' : 'veces'}
        </p>
        <div className="mt-1 text-[15px]">
          <MoveLine moves={[...path, { san: played?.san ?? gap.san, id: 'gap' }]} active={path.length} />
        </div>
        {covered ? (
          <p className="mt-2 text-sm text-good">Ya está en tu repertorio.</p>
        ) : (
          <Button
            className="mt-2 !min-h-9"
            onClick={() =>
              navigate(`/repertoire/${gap.side}?node=${encodeURIComponent(id)}&gap=${encodeURIComponent(gap.san)}`)
            }
          >
            Preparar respuesta a {figurine(gap.san)}
          </Button>
        )}
      </div>
    </li>
  );
}

const OUTCOME: Record<GameRow['outcome']['kind'], string> = {
  inBook: 'Dentro del repertorio',
  endOfBook: 'Terminó tu preparación',
  myDeviation: 'Te desviaste',
  gap: 'Novedad del rival',
  noBook: 'Fuera del repertorio',
};

function GameItem({ game }: { game: GameRow }) {
  const o = game.outcome;
  const detail =
    o.kind === 'myDeviation'
      ? `Jugaste ${figurine(o.playedSan)} en vez de ${figurine(o.expectedSan)} (jugada ${Math.floor(o.ply / 2) + 1})`
      : o.kind === 'gap'
        ? `${figurine(o.playedSan)} en la jugada ${Math.floor(o.ply / 2) + 1}`
        : o.kind === 'endOfBook'
          ? `Tras ${Math.ceil(o.ply / 2)} jugadas`
          : '';
  const tone = o.kind === 'myDeviation' ? 'text-bad' : o.kind === 'gap' ? 'text-brass' : 'text-muted';
  const result = game.result === 'win' ? 'Ganaste' : ['checkmated', 'resigned', 'timeout', 'lose', 'abandoned'].includes(game.result) ? 'Perdiste' : 'Tablas';
  return (
    <li className="px-3 py-2.5">
      <a href={game.id} target="_blank" rel="noreferrer" className="block">
        <div className="flex items-baseline justify-between gap-3 text-[15px]">
          <span className="truncate">
            vs {game.opponent} <span className="text-muted">· {game.timeClass} · {result}</span>
          </span>
          <span className="shrink-0 text-sm text-muted">
            {new Date(game.endTime).toLocaleDateString('es', { day: 'numeric', month: 'short' })}
          </span>
        </div>
        <p className={`text-sm ${tone}`}>
          {OUTCOME[o.kind]}
          {detail && ` · ${detail}`}
        </p>
      </a>
    </li>
  );
}

