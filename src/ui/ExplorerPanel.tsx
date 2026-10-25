import { useEffect, useState } from 'react';
import { figurine, playUci } from '../chess/position';
import { fetchExplorer, type ExplorerDb, type ExplorerMove, type ExplorerResult } from '../integrations/lichess';
import { Segmented } from './kit';

/**
 * Explorador de Lichess en una posición: las jugadas más jugadas, con ✓ en las de tu repertorio.
 * Con `played` (la jugada de una partida, UCI normalizado) esa fila se resalta y, si no está entre las primeras, se
 * agrega al final. Sin `onPlay` las filas no se tocan.
 */
export function ExplorerPanel({
  epd,
  token,
  known,
  onPlay,
  played,
}: {
  epd: string;
  token: string;
  known: Set<string>;
  onPlay?: (uci: string) => void;
  played?: { uci: string; san: string };
}) {
  const [source, setSource] = useState<ExplorerDb>('lichess');
  const [data, setData] = useState<ExplorerResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const ctrl = new AbortController();
    setData(null);
    setError(null);
    const t = setTimeout(() => {
      fetchExplorer(epd, token, source, ctrl.signal)
        .then(setData)
        .catch((e: Error) => e.name !== 'AbortError' && setError(e.message));
    }, 250);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [epd, token, source]);
  const total = data ? data.white + data.draws + data.black : 0;
  const norm = (mv: ExplorerMove) => playUci(epd, mv.uci)?.uci ?? mv.uci;
  const top = data?.moves.slice(0, 8) ?? [];
  const playedRow = played && data?.moves.find((mv) => norm(mv) === played.uci);
  const rows = playedRow && !top.includes(playedRow) ? [...top, playedRow] : top;
  return (
    <div className="mt-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm text-muted">Explorador de Lichess</span>
        <Segmented
          label="Base de partidas"
          value={source}
          onChange={setSource}
          options={[
            { value: 'lichess', label: 'Lichess' },
            { value: 'masters', label: 'Maestros' },
          ]}
        />
      </div>
      {error && <p className="text-sm text-bad">{error}</p>}
      {!data && !error && <p className="text-sm text-muted">Consultando…</p>}
      {data && data.moves.length === 0 && <p className="text-sm text-muted">Sin partidas en esta posición.</p>}
      {rows.length > 0 && (
        <ul className="text-[15px]">
          {rows.map((mv) => {
            const n = mv.white + mv.draws + mv.black;
            const pct = total ? Math.round((n / total) * 100) : 0;
            const uci = norm(mv);
            const inRep = known.has(uci);
            const isPlayed = played?.uci === uci;
            const content = (
              <>
                <span className={`notation w-14 ${isPlayed ? 'font-semibold' : ''}`}>
                  {figurine(mv.san)}
                  {isPlayed && <span className="sr-only">, la jugada de la partida</span>}
                </span>
                <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-line">
                  <span className="block h-full bg-brass" style={{ width: `${pct}%` }} />
                </span>
                <span className="w-20 text-right text-sm tabular-nums text-muted">
                  {pct}% · {n >= 1000 ? `${Math.round(n / 1000)}k` : n}
                </span>
                <span className={`w-4 text-center text-good ${inRep ? '' : 'invisible'}`} aria-label={inRep ? 'en tu repertorio' : undefined}>
                  ✓
                </span>
              </>
            );
            const row = `flex min-h-10 w-full items-center gap-3 rounded-lg px-1 text-left ${isPlayed ? 'bg-surface ring-1 ring-line' : ''}`;
            return (
              <li key={mv.uci}>
                {onPlay ? (
                  <button onClick={() => onPlay(mv.uci)} className={`${row} hover:bg-surface`}>
                    {content}
                  </button>
                ) : (
                  <div className={row}>{content}</div>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {data && data.moves.length > 0 && played && !playedRow && (
        <p className="mt-1 text-sm text-muted">{figurine(played.san)}, la jugada de la partida, casi no aparece en esta base.</p>
      )}
    </div>
  );
}
