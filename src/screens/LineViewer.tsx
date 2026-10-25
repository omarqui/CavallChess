import { useEffect, useMemo, useRef, useState } from 'react';
import { displaySquares } from '../chess/position';
import { useFicha } from '../library/catalog';
import type { Ficha, FichaLine, LibMove } from '../library/types';
import { toShapes, Board } from '../ui/Board';
import { EnginePanel } from '../ui/EnginePanel';
import { BackLink, ICONS, MoveLine, NavButton, Segmented, Toggle } from '../ui/kit';
import { figurineText, RichText } from '../ui/RichText';
import { Chip, LibraryLoadFailed } from './Ficha';

type Mode = 'correcta' | 'cae';

const MODES: { value: Mode; label: string }[] = [
  { value: 'correcta', label: 'Línea correcta' },
  { value: 'cae', label: 'Qué pasa si caés' },
];

const KIND_LABEL: Record<FichaLine['kind'], string> = { variante: 'Variante', favor: 'A favor', contra: 'En contra' };

export function LineViewerScreen({ fichaId, lineId }: { fichaId: string; lineId: string }) {
  const { ficha, error, retry } = useFicha(fichaId);
  if (error) return <LibraryLoadFailed onRetry={retry} />;
  if (ficha === null) return null;
  const line = ficha?.lines.find((l) => l.id === lineId);
  if (!ficha || !line) {
    return (
      <div className="mx-auto w-full max-w-xl px-4 safe-top">
        <BackLink to={ficha ? `/biblioteca/${ficha.id}` : '/biblioteca'}>{ficha ? ficha.name : 'Biblioteca'}</BackLink>
        <p className="mt-6 text-muted">No encontramos esa línea.</p>
      </div>
    );
  }
  return <Viewer key={line.id} ficha={ficha} line={line} />;
}

function Viewer({ ficha, line }: { ficha: Ficha; line: FichaLine }) {
  const canFall = line.kind === 'contra' && line.trapPly !== undefined && !!line.fall?.length;
  const trapPly = line.trapPly ?? 0;
  const [mode, setMode] = useState<Mode>('correcta');
  const [ply, setPly] = useState(ficha.start.length);
  const [analyze, setAnalyze] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);

  const falling = canFall && mode === 'cae';
  const seq: LibMove[] = useMemo(
    () => (falling ? [...line.moves.slice(0, trapPly), ...(line.fall ?? [])] : line.moves),
    [falling, line, trapPly],
  );
  const startPly = falling ? trapPly : ficha.start.length;
  const at = Math.min(ply, seq.length);
  const current = at > 0 ? seq[at - 1] : undefined;
  const epd = current ? current.epd : (seq[0]?.fromEpd ?? ficha.start[0]?.fromEpd ?? '');
  const lastMove = current ? displaySquares(current.fromEpd, current.uci) : undefined;

  const pickMode = (m: Mode) => {
    setMode(m);
    setPly(m === 'cae' ? trapPly : ficha.start.length);
  };
  const go = (n: number) => setPly(Math.max(0, Math.min(seq.length, n)));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
      if (e.key === 'ArrowLeft') setPly((p) => Math.max(0, p - 1));
      else if (e.key === 'ArrowRight') setPly((p) => Math.min(seq.length, p + 1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [seq.length]);

  // El comentario nuevo arranca desde arriba y la jugada activa se mantiene a la vista.
  useEffect(() => {
    const box = scroller.current;
    if (!box) return;
    box.scrollTop = 0;
    box.querySelector('[aria-current="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [at, mode]);

  const trapMove = line.kind === 'favor' && line.trapPly !== undefined && mode === 'correcta' && at - 1 === line.trapPly;
  const showIntro = !!line.intro && at === startPly && !falling;
  const showOutro = !!line.outro && at === seq.length && !falling;
  const fallStart = falling ? trapPly : seq.length;
  const mainMoves = seq.slice(0, fallStart).map((m, i) => ({ san: m.san, id: `${i}-${m.uci}` }));
  const fallMoves = seq.slice(fallStart).map((m, i) => ({ san: m.san, id: `f${i}-${m.uci}` }));
  const atEnd = at >= seq.length;

  return (
    <div className="mx-auto flex h-full w-full max-w-xl flex-col">
      <header className="safe-top shrink-0 px-4 pb-2">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 truncate">
            <BackLink to={`/biblioteca/${ficha.id}`}>{ficha.name}</BackLink>
          </div>
          <div className="shrink-0">
            <Toggle label="Analizar" checked={analyze} onChange={setAnalyze} />
          </div>
        </div>
        <div className="flex items-center justify-between gap-3">
          <h1 className="font-book min-w-0 truncate text-xl font-semibold leading-tight">{line.name}</h1>
          <div className="flex shrink-0 gap-1.5">
            {line.kind !== 'variante' && <Chip tone={line.kind === 'contra' ? 'bad' : 'good'}>{KIND_LABEL[line.kind]}</Chip>}
            {trapMove && <Chip tone="good">Error del rival</Chip>}
          </div>
        </div>
      </header>

      <div className="mx-auto w-full shrink-0 px-4" style={{ maxWidth: 'calc(min(100vw, 36rem, 38dvh) + 2rem)' }}>
        <Board
          epd={epd}
          orientation={ficha.side}
          lastMove={lastMove}
          shapes={toShapes(current?.shapes)}
          animationMs={150}
        />
      </div>

      <div ref={scroller} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 pb-3 pt-3">
        {canFall && (
          <Segmented label="Qué ver" value={mode} onChange={pickMode} options={MODES} />
        )}
        {showIntro && <RichText text={figurineText(line.intro ?? '')} className="text-[16px] leading-relaxed text-muted" />}
        {current?.comment && (
          <div
            className={`rounded-xl px-3.5 py-3 text-[16px] leading-relaxed ring-1 ${
              falling && at > trapPly ? 'bg-bad-soft ring-bad/30' : 'bg-surface ring-line'
            }`}
          >
            <RichText text={figurineText(current.comment)} />
          </div>
        )}
        {showOutro && atEnd && <RichText text={figurineText(line.outro ?? '')} className="text-[16px] leading-relaxed" />}

        <div className="text-[17px]">
          <MoveLine
            moves={mainMoves}
            startPly={0}
            active={at - 1 < fallStart ? at - 1 : undefined}
            onPick={(i) => go(i + 1)}
          />
          {fallMoves.length > 0 && (
            <span className="text-bad">
              <MoveLine
                moves={fallMoves}
                startPly={trapPly}
                active={at - 1 >= fallStart ? at - 1 - fallStart : undefined}
                onPick={(i) => go(fallStart + i + 1)}
              />
            </span>
          )}
        </div>

      </div>

      <div className="safe-bottom shrink-0 border-t border-line bg-paper px-4 pt-2">
        {analyze && <EnginePanel epd={epd} />}
        <div className="flex gap-3 pt-2">
          <NavButton label="Anterior" disabled={at <= 0} onClick={() => go(at - 1)} icon={ICONS.back} />
          <NavButton label="Siguiente" disabled={atEnd} onClick={() => go(at + 1)} icon={ICONS.forward} />
        </div>
      </div>
    </div>
  );
}
