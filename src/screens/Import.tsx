import { useState } from 'react';
import type { RepertoireGraph } from '../chess/graph';
import { buildImportPlan, type ImportPlan, type Resolutions } from '../chess/pgnImport';
import { figurine, nodeId, type Side } from '../chess/position';
import { commitImport, getSettings, loadGraph } from '../db/repo';
import { fetchStudyPgn, parseStudyUrl } from '../integrations/lichess';
import { Banner, Button, MoveLine, Screen, Section, Segmented } from '../ui/kit';
import { navigate } from '../ui/router';

type Source = 'lichess' | 'paste' | 'file';

interface ChapterNaming {
  enabled: boolean;
  name: string;
  root: number;
}

function existingOf(g: RepertoireGraph) {
  const mine = new Map<string, { uci: string; san: string }>();
  for (const e of g.edges.values()) if (e.mine) mine.set(e.fromId, { uci: e.uci, san: e.san });
  return { mine, nodeIds: new Set(g.nodes.keys()) };
}

export function ImportScreen() {
  const [source, setSource] = useState<Source>('lichess');
  const [side, setSide] = useState<Side>('white');
  const [text, setText] = useState('');
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pgn, setPgn] = useState<string | null>(null);
  const [graph, setGraph] = useState<RepertoireGraph | null>(null);
  const [plan, setPlan] = useState<ImportPlan | null>(null);
  const [resolutions, setResolutions] = useState<Resolutions>(new Map());
  const [naming, setNaming] = useState<ChapterNaming[]>([]);

  const read = async () => {
    setError(null);
    setBusy(true);
    try {
      let content = text;
      if (source === 'lichess') {
        const ref = parseStudyUrl(url);
        if (!ref) throw new Error('Pegá la URL de un estudio de Lichess (lichess.org/study/…).');
        content = await fetchStudyPgn(ref, (await getSettings()).lichessToken);
      }
      if (!content.trim()) throw new Error('No hay PGN para leer.');
      const g = await loadGraph(side);
      const p = buildImportPlan(content, side, existingOf(g));
      if (!p.edges.size && p.errors.length) throw new Error(p.errors.join(' '));
      setPgn(content);
      setGraph(g);
      setPlan(p);
      setResolutions(new Map());
      setNaming(
        p.chapters.map((c) => ({
          enabled: p.chapters.length > 1 || !/^(Capítulo|Chapter) \d+$/.test(c.name),
          name: c.name,
          root: c.proposedRoot,
        })),
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const resolve = (id: string, v: 'keep' | 'replace') => {
    if (!pgn || !graph) return;
    const next = new Map(resolutions).set(id, v);
    setResolutions(next);
    setPlan(buildImportPlan(pgn, side, existingOf(graph), next));
  };

  const save = async () => {
    if (!plan) return;
    setBusy(true);
    const names = new Map<string, string>();
    plan.chapters.forEach((c, i) => {
      const n = naming[i];
      if (n?.enabled && n.name.trim()) names.set(nodeId(side, c.mainline[n.root].epd), n.name.trim());
    });
    await commitImport(plan, resolutions, names);
    navigate(`/repertoire/${side}`);
  };

  if (plan && graph) {
    const newEdges = [...plan.edges.values()].filter((e) => !graph.edges.has(e.id));
    const newMine = newEdges.filter((e) => e.mine).length;
    return (
      <Screen title="Revisar importación">
        <p className="font-book text-[19px] leading-snug">
          {newEdges.length
            ? `Se agregan ${newMine} ${newMine === 1 ? 'jugada tuya' : 'jugadas tuyas'} y ${newEdges.length - newMine} del rival a tu repertorio con ${side === 'white' ? 'blancas' : 'negras'}.`
            : 'Todo lo de este PGN ya está en tu repertorio.'}
        </p>
        {plan.ignoredOwnVariations > 0 && (
          <p className="mt-2 text-[15px] text-muted">
            Se ignoran {plan.ignoredOwnVariations} {plan.ignoredOwnVariations === 1 ? 'variante propia' : 'variantes propias'}: en
            tus posiciones solo entra la línea principal.
          </p>
        )}
        {plan.errors.map((e) => (
          <p key={e} className="mt-2 text-[15px] text-bad">
            {e}
          </p>
        ))}

        {plan.conflicts.length > 0 && (
          <Section title="Choques con tu repertorio">
            <ul className="space-y-3">
              {plan.conflicts.map((c) => {
                const v = resolutions.get(c.nodeId) ?? 'keep';
                return (
                  <li key={c.nodeId} className="rounded-xl p-3 ring-1 ring-line">
                    <div className="text-[15px]">
                      <MoveLine moves={c.line.map((san, i) => ({ san, id: String(i) }))} />
                    </div>
                    <p className="mt-1 text-[15px]">
                      Tenés {figurine(c.existingSan)}; el PGN propone {figurine(c.importedSan)}.
                    </p>
                    <div className="mt-2">
                      <Segmented
                        label="Resolución"
                        value={v}
                        onChange={(x) => resolve(c.nodeId, x)}
                        options={[
                          { value: 'keep', label: `Mantener ${figurine(c.existingSan)}` },
                          { value: 'replace', label: `Usar ${figurine(c.importedSan)}` },
                        ]}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          </Section>
        )}

        <Section title="Nombres de apertura">
          <p className="mb-3 text-[15px] text-muted">
            Cada capítulo puede nombrar una posición de su línea principal; todo lo que cuelga de ahí lleva ese nombre.
          </p>
          <ul className="space-y-3">
            {plan.chapters.map((c, i) => {
              const n = naming[i];
              if (!n) return null;
              const set = (patch: Partial<ChapterNaming>) =>
                setNaming((all) => all.map((x, j) => (j === i ? { ...x, ...patch } : x)));
              return (
                <li key={i} className="rounded-xl p-3 ring-1 ring-line">
                  <label className="flex items-center gap-3">
                    <input type="checkbox" checked={n.enabled} onChange={(e) => set({ enabled: e.target.checked })} className="size-5 accent-[var(--good)]" />
                    <input
                      value={n.name}
                      onChange={(e) => set({ name: e.target.value })}
                      className="flex-1 rounded-lg bg-surface px-3 py-2 text-[16px] ring-1 ring-line outline-none focus:ring-brass"
                    />
                  </label>
                  {n.enabled && c.mainline.length > 1 && (
                    <label className="mt-2 block text-sm text-muted">
                      Después de
                      <select
                        value={n.root}
                        onChange={(e) => set({ root: Number(e.target.value) })}
                        className="mt-1 block w-full rounded-lg bg-surface px-2 py-2 text-[15px] text-ink ring-1 ring-line"
                      >
                        {c.mainline.map((_m, j) => (
                          <option key={j} value={j}>
                            {j === 0
                              ? 'Posición inicial'
                              : c.mainline
                                  .slice(1, j + 1)
                                  .map((x, k) => `${k % 2 === 0 ? `${k / 2 + 1}.` : ''}${figurine(x.san ?? "")}`)
                                  .join(' ')}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                </li>
              );
            })}
          </ul>
        </Section>

        <div className="mt-8 flex flex-col gap-3">
          <Button variant="primary" disabled={busy} onClick={() => void save()}>
            Guardar en el repertorio
          </Button>
          <Button variant="ghost" onClick={() => setPlan(null)}>
            Volver
          </Button>
        </div>
      </Screen>
    );
  }

  return (
    <Screen title="Importar">
      <div className="flex flex-wrap items-center gap-3">
        <Segmented
          label="Fuente"
          value={source}
          onChange={setSource}
          options={[
            { value: 'lichess', label: 'Lichess' },
            { value: 'paste', label: 'Pegar PGN' },
            { value: 'file', label: 'Archivo' },
          ]}
        />
      </div>
      <div className="mt-5">
        <p className="mb-2 text-[15px] text-muted">¿Con qué color jugás estas líneas?</p>
        <Segmented
          label="Color del repertorio"
          value={side}
          onChange={setSide}
          options={[
            { value: 'white', label: 'Blancas' },
            { value: 'black', label: 'Negras' },
          ]}
        />
      </div>

      <div className="mt-5">
        {source === 'lichess' && (
          <label className="block">
            <span className="text-[15px] text-muted">URL del estudio o de un capítulo</span>
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              inputMode="url"
              placeholder="https://lichess.org/study/…"
              className="mt-1 w-full rounded-xl bg-surface px-3 py-3 text-[16px] ring-1 ring-line outline-none focus:ring-brass"
            />
            <span className="mt-2 block text-sm text-muted">
              Los estudios privados o no listados necesitan un token de Lichess (Ajustes).
            </span>
          </label>
        )}
        {source === 'paste' && (
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={10}
            placeholder={'1. e4 c5 2. Nf3 d6 (2... Nc6) 3. d4 …'}
            className="notation w-full rounded-xl bg-surface px-3 py-3 text-[16px] ring-1 ring-line outline-none focus:ring-brass"
          />
        )}
        {source === 'file' && (
          <label className="flex min-h-24 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-line px-4 text-center text-[15px] text-muted hover:bg-surface">
            <input
              type="file"
              accept=".pgn,application/x-chess-pgn,text/plain"
              className="sr-only"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (f) setText(await f.text());
              }}
            />
            {text ? `Archivo cargado (${text.length.toLocaleString('es')} caracteres)` : 'Elegí un archivo .pgn'}
          </label>
        )}
      </div>

      {error && (
        <div className="mt-4">
          <Banner tone="bad">{error}</Banner>
        </div>
      )}

      <Button variant="primary" className="mt-6 w-full" disabled={busy} onClick={() => void read()}>
        {busy ? 'Leyendo…' : 'Leer y revisar'}
      </Button>
    </Screen>
  );
}
