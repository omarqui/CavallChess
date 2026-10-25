import { useState } from 'react';
import type { RepertoireGraph } from '../chess/graph';
import { buildImportPlan, existingOf, type ImportPlan, type Resolutions } from '../chess/pgnImport';
import { figurine, type Side } from '../chess/position';
import { commitImport } from '../db/repo';
import { namesMap, type NameProposal } from '../library/pgn';
import { Banner, Button, MoveLine, Screen, Section, Segmented } from './kit';

/** Una propuesta por capítulo; activa si hay varios capítulos o el nombre no es un "Capítulo N" genérico. */
export function chapterProposals(plan: ImportPlan): NameProposal[] {
  return plan.chapters.map((c, i) => ({
    chapter: i,
    root: c.proposedRoot,
    name: c.name,
    enabled: plan.chapters.length > 1 || !/^(Capítulo|Chapter) \d+$/.test(c.name),
  }));
}

export function ImportPreview({
  pgn,
  side,
  graph,
  title = 'Revisar importación',
  proposeNames = chapterProposals,
  onSaved,
  onBack,
}: {
  pgn: string;
  side: Side;
  graph: RepertoireGraph;
  title?: string;
  proposeNames?: (plan: ImportPlan) => NameProposal[];
  onSaved: (r: { mine: number; rival: number }) => void;
  onBack: () => void;
}) {
  const [resolutions, setResolutions] = useState<Resolutions>(new Map());
  const [plan, setPlan] = useState<ImportPlan>(() => buildImportPlan(pgn, side, existingOf(graph)));
  const [naming, setNaming] = useState<NameProposal[]>(() => proposeNames(plan));
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const resolve = (id: string, v: 'keep' | 'replace') => {
    const next = new Map(resolutions).set(id, v);
    setResolutions(next);
    setPlan(buildImportPlan(pgn, side, existingOf(graph), next));
  };

  const save = async () => {
    setBusy(true);
    setSaveError(null);
    let saved: Awaited<ReturnType<typeof commitImport>>;
    try {
      const named = naming.map((n) => ({ ...n, name: n.name.trim(), enabled: n.enabled && !!n.name.trim() }));
      saved = await commitImport(plan, resolutions, namesMap(plan, named));
    } catch (e) {
      // La transacción no dejó nada a medias: se puede volver a intentar.
      setSaveError(
        `No se pudo guardar (${e instanceof Error ? e.message : 'error desconocido'}). Tu repertorio quedó como estaba: probá de nuevo.`,
      );
      return;
    } finally {
      setBusy(false);
    }
    onSaved(saved);
  };

  const newEdges = [...plan.edges.values()].filter((e) => !graph.edges.has(e.id));
  const newMine = newEdges.filter((e) => e.mine).length;
  return (
    <Screen title={title}>
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
          {naming.map((n, i) => {
            const c = plan.chapters[n.chapter];
            if (!c) return null;
            const set = (patch: Partial<NameProposal>) =>
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
                                .map((x, k) => `${k % 2 === 0 ? `${k / 2 + 1}.` : ''}${figurine(x.san ?? '')}`)
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
        {saveError && (
          <div role="alert">
            <Banner tone="bad">{saveError}</Banner>
          </div>
        )}
        <Button variant="primary" disabled={busy} onClick={() => void save()}>
          Guardar en el repertorio
        </Button>
        <Button variant="ghost" disabled={busy} onClick={onBack}>
          Volver
        </Button>
      </div>
    </Screen>
  );
}
