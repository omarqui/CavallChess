import { useMemo } from 'react';
import { useCards, useDays, useEvents, useGraphs } from '../db/hooks';
import { mastery, streak, weakSpots } from '../srs/stats';
import type { Side } from '../types';
import { Button, Meter, MoveLine, Screen, Section, sideLabel } from '../ui/kit';
import { navigate } from '../ui/router';

export function ProgressScreen() {
  const graphs = useGraphs();
  const cards = useCards();
  const events = useEvents();
  const days = useDays();
  const now = useMemo(() => new Date(), []);
  if (!graphs || !cards || !events || !days) return null;

  const weak = weakSpots([graphs.white, graphs.black], events, now);
  const s = streak(days, now);
  const last30 = events.filter((e) => e.kind === 'rating' && +new Date(e.at) > +now - 30 * 86400_000).length;

  return (
    <Screen title="Progreso">
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl p-4 ring-1 ring-line">
          <p className="font-book text-3xl font-semibold tabular-nums">{s}</p>
          <p className="text-sm text-muted">{s === 1 ? 'día de racha' : 'días de racha'}</p>
        </div>
        <div className="rounded-xl p-4 ring-1 ring-line">
          <p className="font-book text-3xl font-semibold tabular-nums">{last30}</p>
          <p className="text-sm text-muted">repasos en 30 días</p>
        </div>
      </div>

      {(['white', 'black'] as Side[]).map((side) => {
        const g = graphs[side];
        const all = g.trainableCardIds();
        if (!all.length) return null;
        const total = mastery(all, cards);
        const roots = g.namedRoots();
        return (
          <Section key={side} title={sideLabel(side)} aside={<span className="text-sm text-muted">{total.pct}% dominado</span>}>
            <Meter value={total.pct} label={`Dominio con ${sideLabel(side).toLowerCase()}`} />
            <p className="mt-2 text-sm text-muted">
              {total.mature} maduras de {total.total} · {total.total - total.learned} sin aprender
            </p>
            {roots.length > 0 && (
              <ul className="mt-4 space-y-3">
                {roots.map((r) => {
                  const m = mastery(g.subtreeCardIds(r.id), cards);
                  const depth = g.labelsFor(r.id).length - 1;
                  return (
                    <li key={r.id} style={{ paddingLeft: depth * 14 }}>
                      <button
                        className="w-full text-left"
                        onClick={() => navigate(`/repertoire/${side}?node=${encodeURIComponent(r.id)}`)}
                      >
                        <div className="mb-1 flex items-baseline justify-between gap-3 text-[15px]">
                          <span className="truncate">{r.name}</span>
                          <span className="shrink-0 text-sm tabular-nums text-muted">
                            {m.pct}% · {m.total}
                          </span>
                        </div>
                        <Meter value={m.pct} label={`Dominio de ${r.name}`} />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </Section>
        );
      })}

      <Section title="Líneas débiles" aside={<span className="text-sm text-muted">últimos 30 días</span>}>
        {weak.length === 0 ? (
          <p className="text-[15px] text-muted">Sin fallos en los últimos 30 días.</p>
        ) : (
          <>
            <ul className="divide-y divide-line rounded-xl ring-1 ring-line">
              {weak.map((w) => (
                <li key={w.edge.id}>
                  <button
                    className="flex w-full items-start gap-3 px-3 py-2.5 text-left"
                    onClick={() => navigate(`/repertoire/${w.edge.side}?node=${encodeURIComponent(w.edge.fromId)}`)}
                  >
                    <span className="mt-0.5 min-w-14 text-sm tabular-nums text-bad">
                      {w.fails} {w.fails === 1 ? 'fallo' : 'fallos'}
                    </span>
                    <span className="text-[15px]">
                      <MoveLine moves={w.line} active={w.line.length - 1} />
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            <Button className="mt-3 w-full" onClick={() => navigate('/train?mode=practice')}>
              Practicar las débiles
            </Button>
          </>
        )}
      </Section>
    </Screen>
  );
}
