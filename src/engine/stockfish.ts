import { normalizeMove } from 'chessops/chess';
import { makeSan } from 'chessops/san';
import { parseUci } from 'chessops/util';
import { posFromEpd } from '../chess/position';

export interface EngineLine {
  depth: number;
  /** Evaluación desde el punto de vista de las blancas, en centipeones; o mate en N. */
  cp?: number;
  mate?: number;
  pv: string[]; // SAN
  pvUci: string[];
}

/** Stockfish 19 lite single-thread en un Web Worker (UCI por postMessage). Uno por app. */
class Engine {
  private worker?: Worker;
  private ready?: Promise<void>;
  private listener?: (line: string) => void;
  private current = 0;
  private searching = false;
  /** Búsqueda que espera a que termine la anterior (hasta su "bestmove") para no mezclar líneas. */
  private queued?: () => void;

  private boot() {
    if (this.ready) return this.ready;
    this.worker = new Worker(`${import.meta.env.BASE_URL}engine/stockfish-19-lite-single.js`);
    this.ready = new Promise<void>((resolve) => {
      this.worker!.onmessage = (e: MessageEvent) => {
        const line = String(e.data);
        if (line === 'readyok') resolve();
        if (line.startsWith('bestmove')) {
          this.searching = false;
          const next = this.queued;
          this.queued = undefined;
          next?.();
          return;
        }
        this.listener?.(line);
      };
      this.worker!.postMessage('uci');
      this.worker!.postMessage('setoption name MultiPV value 1');
      this.worker!.postMessage('isready');
    });
    return this.ready;
  }

  /** Analiza `epd` hasta `depth`, llamando a `onLine` con cada mejora. Devuelve una función para cortar. */
  analyze(epd: string, onLine: (l: EngineLine) => void, depth = 20): () => void {
    const id = ++this.current;
    const whiteToMove = epd.split(' ')[1] === 'w';
    const start = () => {
      if (id !== this.current) return;
      this.listener = (line) => {
        if (id !== this.current || !line.startsWith('info') || !line.includes(' pv ')) return;
        const d = Number(line.match(/ depth (\d+)/)?.[1] ?? 0);
        const cp = line.match(/ score cp (-?\d+)/)?.[1];
        const mate = line.match(/ score mate (-?\d+)/)?.[1];
        const pvUci = line.split(' pv ')[1].trim().split(/\s+/);
        const sign = whiteToMove ? 1 : -1;
        onLine({
          depth: d,
          cp: cp !== undefined ? Number(cp) * sign : undefined,
          mate: mate !== undefined ? Number(mate) * sign : undefined,
          pv: toSan(epd, pvUci),
          pvUci,
        });
      };
      this.worker!.postMessage('ucinewgame');
      this.worker!.postMessage(`position fen ${epd} 0 1`);
      this.worker!.postMessage(`go depth ${depth}`);
      this.searching = true;
    };
    void this.boot().then(() => {
      if (id !== this.current) return;
      if (this.searching) {
        this.queued = start;
        this.worker!.postMessage('stop');
      } else start();
    });
    return () => {
      if (id === this.current) {
        this.current++;
        this.queued = undefined;
        if (this.searching) this.worker?.postMessage('stop');
      }
    };
  }
}

function toSan(epd: string, ucis: string[]): string[] {
  const pos = posFromEpd(epd);
  const out: string[] = [];
  for (const u of ucis.slice(0, 10)) {
    const raw = parseUci(u);
    const m = raw && normalizeMove(pos, raw);
    if (!m || !pos.isLegal(m)) break;
    out.push(makeSan(pos, m));
    pos.play(m);
  }
  return out;
}

export const engine = new Engine();

export function formatEval(l: EngineLine | undefined): string {
  if (!l) return '…';
  if (l.mate !== undefined) return `#${l.mate}`;
  const v = (l.cp ?? 0) / 100;
  return `${v > 0 ? '+' : ''}${v.toFixed(1)}`;
}
