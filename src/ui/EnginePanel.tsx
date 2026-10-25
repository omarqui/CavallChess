import { useEffect, useState } from 'react';
import { engine, formatEval, type EngineLine } from '../engine/stockfish';
import { MoveLine } from './kit';

export function EnginePanel({ epd }: { epd: string }) {
  const [line, setLine] = useState<EngineLine>();
  useEffect(() => {
    setLine(undefined);
    return engine.analyze(epd, setLine, 22);
  }, [epd]);
  return (
    <div className="mt-2 flex items-baseline gap-3 rounded-xl bg-surface px-3 py-2.5 ring-1 ring-line">
      <span className="min-w-14 font-semibold tabular-nums">{formatEval(line)}</span>
      <span className="truncate text-sm text-muted">
        {line ? <MoveLine moves={line.pv.slice(0, 8).map((san, i) => ({ san, id: String(i) }))} startPly={epd.includes(' w ') ? 0 : 1} /> : 'Calculando…'}
      </span>
      {line && <span className="ml-auto shrink-0 text-xs text-muted">prof. {line.depth}</span>}
    </div>
  );
}
