import { useState } from 'react';
import type { RepertoireGraph } from '../chess/graph';
import { buildImportPlan, existingOf } from '../chess/pgnImport';
import type { Side } from '../chess/position';
import { getSettings, loadGraph } from '../db/repo';
import { fetchStudyPgn, parseStudyUrl } from '../integrations/lichess';
import { ImportPreview } from '../ui/ImportPreview';
import { Banner, Button, Screen, Segmented } from '../ui/kit';
import { navigate } from '../ui/router';

type Source = 'lichess' | 'paste' | 'file';

export function ImportScreen() {
  const [source, setSource] = useState<Source>('lichess');
  const [side, setSide] = useState<Side>('white');
  const [text, setText] = useState('');
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pgn, setPgn] = useState<string | null>(null);
  const [graph, setGraph] = useState<RepertoireGraph | null>(null);

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
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (pgn && graph) {
    return (
      <ImportPreview
        pgn={pgn}
        side={side}
        graph={graph}
        onSaved={() => navigate(`/repertoire/${side}`)}
        onBack={() => setPgn(null)}
      />
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
