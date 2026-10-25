import { useEffect, useRef, useState } from 'react';
import { Chessground } from '@lichess-org/chessground';
import type { Api } from '@lichess-org/chessground/api';
import type { DrawShape } from '@lichess-org/chessground/draw';
import type { Key } from '@lichess-org/chessground/types';
import { chessgroundDests } from 'chessops/compat';
import { posFromEpd, turnOf, type Side } from '../chess/position';
import type { Shape } from '../types';

export interface Flash {
  square: string;
  kind: 'good' | 'bad';
  key: number;
}

interface BoardProps {
  epd: string;
  orientation: Side;
  /** El usuario puede mover las piezas del bando al que le toca. */
  interactive?: boolean;
  onMove?: (uci: string) => void;
  lastMove?: [string, string];
  shapes?: DrawShape[];
  flash?: Flash;
  shake?: number;
  /** Cambia para forzar que el tablero vuelva a `epd` aunque `epd` no haya cambiado. */
  syncKey?: number;
  animationMs?: number;
  coordinates?: boolean;
  onTap?: () => void;
}

export const toShapes = (shapes: Shape[] | undefined): DrawShape[] =>
  (shapes ?? []).map((s) => ({ orig: s.orig as Key, dest: s.dest as Key | undefined, brush: s.brush }));

/** Flecha; la de la jugada a hacer va en naranja, como las flechas de Chess.com, que se ven sobre el tablero verde. */
export function arrow(from: string, to: string, brush = 'yellow'): DrawShape {
  return { orig: from as Key, dest: to as Key, brush };
}

export function Board({
  epd,
  orientation,
  interactive = false,
  onMove,
  lastMove,
  shapes,
  flash,
  shake,
  syncKey,
  animationMs = 200,
  coordinates = true,
  onTap,
}: BoardProps) {
  const el = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLDivElement>(null);
  const api = useRef<Api | null>(null);
  const onMoveRef = useRef(onMove);
  onMoveRef.current = onMove;
  const [promo, setPromo] = useState<{ orig: string; dest: string; color: Side } | null>(null);

  useEffect(() => {
    // Arranca ya en la posición pedida: sin animar desde la posición inicial al montar.
    api.current = Chessground(el.current!, {
      fen: epd.split(' ')[0],
      lastMove: lastMove as Key[] | undefined,
      orientation,
      coordinates,
      animation: { enabled: true, duration: animationMs },
      highlight: { lastMove: true, check: true },
      movable: { free: false, showDests: true },
      draggable: { showGhost: true },
      drawable: { enabled: true, visible: true },
      premovable: { enabled: false },
    });
    const ro = new ResizeObserver(() => api.current?.redrawAll());
    ro.observe(el.current!);
    return () => {
      ro.disconnect();
      api.current?.destroy();
      api.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Posición, turno y jugadas legales.
  useEffect(() => {
    const pos = posFromEpd(epd);
    const turn = turnOf(epd);
    setPromo(null);
    api.current?.set({
      fen: epd.split(' ')[0],
      orientation,
      turnColor: turn,
      lastMove: lastMove as Key[] | undefined,
      check: pos.isCheck() ? turn : false,
      animation: { duration: animationMs },
      coordinates,
      movable: {
        color: interactive ? turn : undefined,
        dests: interactive ? (chessgroundDests(pos) as Map<Key, Key[]>) : new Map(),
        events: {
          after: (orig, dest) => {
            const piece = api.current?.state.pieces.get(dest);
            const lastRank = dest[1] === '8' || dest[1] === '1';
            if (piece?.role === 'pawn' && lastRank) setPromo({ orig, dest, color: turn });
            else onMoveRef.current?.(orig + dest);
          },
        },
      },
    });
  }, [epd, orientation, interactive, lastMove?.[0], lastMove?.[1], syncKey, animationMs, coordinates]);

  useEffect(() => {
    api.current?.setAutoShapes(shapes ?? []);
  }, [shapes]);

  useEffect(() => {
    if (!flash) return;
    api.current?.set({ highlight: { custom: new Map([[flash.square as Key, `flash-${flash.kind}`]]) } });
    const t = setTimeout(() => api.current?.set({ highlight: { custom: new Map() } }), 950);
    return () => clearTimeout(t);
  }, [flash?.key]);

  useEffect(() => {
    if (!shake || !frame.current) return;
    const f = frame.current;
    f.classList.remove('shake');
    void f.offsetWidth;
    f.classList.add('shake');
  }, [shake]);

  const choose = (role: string | null) => {
    const p = promo;
    setPromo(null);
    if (!p) return;
    if (!role) {
      api.current?.set({ fen: epd.split(' ')[0] });
      return;
    }
    onMoveRef.current?.(p.orig + p.dest + role);
  };

  return (
    <div ref={frame} className="board-frame select-none" data-interactive={interactive} onClick={onTap}>
      <div ref={el} />
      {promo && (
        <div
          className="absolute inset-0 z-10 grid place-items-center bg-black/45 backdrop-blur-[2px]"
          onClick={() => choose(null)}
        >
          <div className="flex gap-2 rounded-xl bg-raised p-2 shadow-xl" onClick={(e) => e.stopPropagation()}>
            {(['q', 'r', 'b', 'n'] as const).map((r) => (
              <button
                key={r}
                aria-label={`Coronar ${r}`}
                className="cg-wrap size-16 rounded-lg hover:bg-brass-soft"
                onClick={() => choose(r)}
              >
                <piece
                  className={`${promo.color} ${{ q: 'queen', r: 'rook', b: 'bishop', n: 'knight' }[r]}`}
                  style={{ position: 'relative', display: 'block', width: '100%', height: '100%' }}
                />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

declare module 'react' {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      piece: React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    }
  }
}
