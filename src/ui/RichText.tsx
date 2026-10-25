import type { ReactNode } from 'react';
import { figurine } from '../chess/position';

export type RichPart = { kind: 'text' | 'bold' | 'move'; value: string };
export type RichBlock = { kind: 'p' | 'li'; parts: RichPart[] };

const INLINE = /\*\*(.+?)\*\*|`([^`]+)`/g;

/** Negritas y jugadas de una línea. Una negrita guarda su texto crudo: puede llevar jugadas adentro. */
function parseInline(text: string): RichPart[] {
  const parts: RichPart[] = [];
  const push = (kind: RichPart['kind'], value: string) => {
    if (value) parts.push({ kind, value });
  };
  let at = 0;
  for (const m of text.matchAll(INLINE)) {
    push('text', text.slice(at, m.index));
    if (m[1] !== undefined) push('bold', m[1]);
    else push('move', m[2]);
    at = m.index + m[0].length;
  }
  push('text', text.slice(at));
  return parts;
}

/**
 * Markdown chico de las fichas: párrafos separados por una línea en blanco, ítems que empiezan con `- `,
 * `**negrita**` y jugadas entre comillas invertidas. Las líneas seguidas de un párrafo o un ítem se unen.
 */
export function parseRich(text: string): RichBlock[] {
  const blocks: { kind: RichBlock['kind']; lines: string[] }[] = [];
  let open: (typeof blocks)[number] | null = null;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) {
      open = null;
    } else if (/^[-*] /.test(line)) {
      open = { kind: 'li', lines: [line.slice(2).trim()] };
      blocks.push(open);
    } else if (open) {
      open.lines.push(line);
    } else {
      open = { kind: 'p', lines: [line] };
      blocks.push(open);
    }
  }
  return blocks.map((b) => ({ kind: b.kind, parts: parseInline(b.lines.join(' ')) }));
}

const SAN_TOKEN = /(?<![\p{L}\p{N}])[KQRBN][a-h]?[1-8]?x?[a-h][1-8](?:=[QRBN])?[+#]?(?![\p{L}\p{N}])/gu;

/**
 * Pasa a figurines las jugadas de pieza que aparecen sueltas en un texto plano ("tras Nc7+"). Las de peón y
 * los enroques se dejan como están.
 */
export function figurineText(text: string): string {
  return text.replace(SAN_TOKEN, (m) => figurine(m));
}

function Move({ san }: { san: string }) {
  return <span className="notation whitespace-nowrap">{figurine(san)}</span>;
}

function Parts({ parts }: { parts: RichPart[] }) {
  return parts.map((p, i) =>
    p.kind === 'move' ? (
      <Move key={i} san={p.value} />
    ) : p.kind === 'bold' ? (
      <strong key={i} className="font-semibold">
        {p.value.split(/`([^`]+)`/).map((s, j) => (j % 2 ? <Move key={j} san={s} /> : s))}
      </strong>
    ) : (
      p.value
    ),
  );
}

/** Una línea de texto enriquecido, sin párrafo alrededor (para ítems sueltos como los consejos). */
export function RichInline({ text }: { text: string }) {
  const space: RichPart = { kind: 'text', value: ' ' };
  return <Parts parts={parseRich(text).flatMap((b, i) => (i ? [space, ...b.parts] : b.parts))} />;
}

/** Texto de las fichas con figurines. Nunca interpreta HTML: todo pasa como texto de React. */
export function RichText({ text, className = '' }: { text: string; className?: string }) {
  const blocks = parseRich(text);
  const out: ReactNode[] = [];
  for (let i = 0; i < blocks.length; i++) {
    if (blocks[i].kind === 'p') {
      out.push(
        <p key={i}>
          <Parts parts={blocks[i].parts} />
        </p>,
      );
      continue;
    }
    const items: RichBlock[] = [];
    const first = i;
    while (i < blocks.length && blocks[i].kind === 'li') items.push(blocks[i++]);
    i--;
    out.push(
      <ul key={first} className="space-y-2">
        {items.map((b, j) => (
          <li key={j} className="relative pl-5">
            <span aria-hidden="true" className="absolute left-1 top-[0.7em] size-1.5 rounded-full bg-brass" />
            <Parts parts={b.parts} />
          </li>
        ))}
      </ul>,
    );
  }
  return <div className={`space-y-3.5 ${className}`}>{out}</div>;
}
