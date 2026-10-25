import { useId, useRef, useState, type KeyboardEvent } from 'react';
import { exportBackup, importBackup, setSettings, wipeAll, type Backup } from '../db/repo';
import { useSettings } from '../db/hooks';
import type { Settings } from '../types';
import { Banner, Button, Screen, Section, Segmented, Toggle } from '../ui/kit';
import { Board } from '../ui/Board';
import { INITIAL_EPD } from '../chess/position';
import { navigate } from '../ui/router';
import { PIECE_SETS, pieceUrl, type PieceSetId } from '../ui/pieceSets';

const CREDITS_URL = 'https://github.com/omarqui/CavallChess/blob/main/src/assets/pieces/CREDITOS.md';

export function SettingsScreen() {
  const s = useSettings();
  const [msg, setMsg] = useState<{ text: string; tone: 'good' | 'bad' } | null>(null);
  const [confirmWipe, setConfirmWipe] = useState(false);
  const [restore, setRestore] = useState<Backup | null>(null);
  if (!s) return null;
  const fail = (e: unknown) => setMsg({ text: `No se pudo guardar el ajuste: ${(e as Error).message}`, tone: 'bad' });
  const set = (patch: Partial<Settings>) => void setSettings(patch).catch(fail);

  const backup = async () => {
    const data = await exportBackup();
    const name = `cavallchess-${new Date().toISOString().slice(0, 10)}.json`;
    const file = new File([JSON.stringify(data)], name, { type: 'application/json' });
    try {
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Respaldo de CavallChess' });
      } else {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(file);
        a.download = name;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 2000);
      }
      await setSettings({ lastBackupAt: Date.now() });
      setMsg({ text: 'Respaldo listo. Guardalo en Archivos o iCloud Drive.', tone: 'good' });
    } catch (e) {
      if ((e as Error).name !== 'AbortError') setMsg({ text: (e as Error).message, tone: 'bad' });
    }
  };

  const pickRestore = async (f: File) => {
    try {
      const data = JSON.parse(await f.text()) as Backup;
      if (data.app !== 'cavallchess') throw new Error('El archivo no es un respaldo de CavallChess.');
      setRestore(data);
    } catch (e) {
      setMsg({ text: (e as Error).message, tone: 'bad' });
    }
  };

  return (
    <Screen title="Ajustes">
      {msg && (
        <div className="mb-4">
          <Banner tone={msg.tone}>{msg.text}</Banner>
        </div>
      )}

      <Section title="Estudio">
        <label className="flex min-h-11 items-center justify-between gap-4">
          <span>Posiciones nuevas por día</span>
          <input
            type="number"
            min={0}
            max={100}
            value={s.newPerDay}
            onChange={(e) => set({ newPerDay: Math.max(0, Math.min(100, Number(e.target.value) || 0)) })}
            className="w-20 rounded-lg bg-surface px-3 py-2 text-right text-[16px] tabular-nums ring-1 ring-line"
          />
        </label>
        <Toggle label="Sonidos" checked={s.sound} onChange={(v) => set({ sound: v })} />
        <Toggle label="Vibración (si el teléfono lo permite)" checked={s.haptics} onChange={(v) => set({ haptics: v })} />
      </Section>

      <Section title="Apariencia">
        <div className="space-y-3">
          <Row label="Tema">
            <Segmented
              label="Tema"
              value={s.colorScheme}
              onChange={(v) => set({ colorScheme: v })}
              options={[
                { value: 'system', label: 'Sistema' },
                { value: 'light', label: 'Claro' },
                { value: 'dark', label: 'Oscuro' },
              ]}
            />
          </Row>
          <Row label="Tablero">
            <Segmented
              label="Tablero"
              value={s.boardTheme}
              onChange={(v) => set({ boardTheme: v })}
              options={[
                { value: 'brown', label: 'Madera' },
                { value: 'blue', label: 'Azul' },
                { value: 'green', label: 'Verde' },
                { value: 'slate', label: 'Salvia' },
              ]}
            />
          </Row>
          <PieceSetPicker value={s.pieceSet} onChange={(v) => set({ pieceSet: v })} />
          <div className="mx-auto w-40 pt-1">
            <Board epd={INITIAL_EPD} orientation="white" coordinates={false} />
          </div>
        </div>
      </Section>

      <Section title="Cuentas">
        <label className="block">
          <span className="text-sm text-muted">Usuario de Chess.com</span>
          <input
            defaultValue={s.chesscomUser ?? ''}
            autoCapitalize="none"
            autoCorrect="off"
            onBlur={(e) => {
              const user = e.target.value.trim() || undefined;
              // Otro usuario: se vuelve a empezar por los últimos 3 meses.
              if (user !== s.chesscomUser) set({ chesscomUser: user, chesscomMonths: undefined, lastChesscomSync: undefined });
            }}
            className="mt-1 w-full rounded-xl bg-surface px-3 py-2.5 text-[16px] ring-1 ring-line outline-none focus:ring-brass"
          />
        </label>
        <label className="mt-4 block">
          <span className="text-sm text-muted">Token de Lichess (study:read)</span>
          <input
            type="password"
            defaultValue={s.lichessToken ?? ''}
            autoCapitalize="none"
            autoCorrect="off"
            onBlur={(e) => set({ lichessToken: e.target.value.trim() || undefined })}
            className="mt-1 w-full rounded-xl bg-surface px-3 py-2.5 text-[16px] ring-1 ring-line outline-none focus:ring-brass"
          />
          <span className="mt-1 block text-sm text-muted">
            Crealo en{' '}
            <a
              className="underline underline-offset-2"
              href="https://lichess.org/account/oauth/token/create?scopes[]=study:read&description=CavallChess"
              target="_blank"
              rel="noreferrer"
            >
              lichess.org
            </a>
            . Habilita estudios privados y el explorador de aperturas. Queda solo en este dispositivo y no viaja en los
            respaldos.
          </span>
        </label>
      </Section>

      <Section title="Respaldo">
        <p className="text-[15px] text-muted">
          {s.lastBackupAt
            ? `Último respaldo: ${new Date(s.lastBackupAt).toLocaleDateString('es', { dateStyle: 'medium' })}.`
            : 'Todavía no hiciste ningún respaldo.'}{' '}
          Incluye tu repertorio, todo el historial de repasos y tus apuntes.
        </p>
        <div className="mt-3 flex flex-col gap-3">
          <Button variant="primary" onClick={() => void backup()}>
            Hacer un respaldo
          </Button>
          <label className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-xl bg-surface px-4 text-[15px] font-medium ring-1 ring-line hover:bg-raised">
            Restaurar un respaldo
            <input
              type="file"
              accept="application/json,.json"
              className="sr-only"
              onChange={(e) => e.target.files?.[0] && void pickRestore(e.target.files[0])}
            />
          </label>
        </div>
        {restore && (
          <div className="mt-3">
            <Banner tone="bad">
              <p>
                Restaurar reemplaza todo lo de este dispositivo por el respaldo del{' '}
                {new Date(restore.exportedAt).toLocaleDateString('es', { dateStyle: 'medium' })} ({restore.edges.length}{' '}
                jugadas, {restore.events.length} repasos).
              </p>
              {restore.version === 1 && (
                <p className="mt-2">
                  Es un respaldo de una versión anterior y no trae apuntes: se borran los que tenés en este dispositivo.
                </p>
              )}
              <div className="mt-3 flex gap-2">
                <Button
                  variant="primary"
                  onClick={async () => {
                    try {
                      await importBackup(restore);
                      setMsg({ text: 'Respaldo restaurado.', tone: 'good' });
                    } catch (e) {
                      setMsg({ text: (e as Error).message, tone: 'bad' });
                    }
                    setRestore(null);
                  }}
                >
                  Restaurar
                </Button>
                <Button variant="ghost" onClick={() => setRestore(null)}>
                  Cancelar
                </Button>
              </div>
            </Banner>
          </div>
        )}
      </Section>

      <Section title="Ayuda">
        <p className="text-[15px] text-muted">
          Volvé a ver la bienvenida: cómo se estudia y aperturas para empezar. Lo que elijas se suma a tu repertorio sin
          pisar lo que ya jugás.
        </p>
        <div className="mt-3 flex flex-col">
          <Button
            onClick={async () => {
              try {
                await setSettings({ introSeenAt: undefined, tipsSeen: [] });
                navigate('/intro');
              } catch (e) {
                fail(e);
              }
            }}
          >
            Ver la introducción
          </Button>
        </div>
      </Section>

      <Section title="Borrar datos">
        {!confirmWipe ? (
          <Button variant="danger" onClick={() => setConfirmWipe(true)}>
            Borrar todo
          </Button>
        ) : (
          <Banner tone="bad">
            <p>Se borran el repertorio, el historial, tus apuntes y los ajustes de este dispositivo. No se puede deshacer.</p>
            <div className="mt-3 flex gap-2">
              <Button
                variant="primary"
                onClick={async () => {
                  await wipeAll();
                  setConfirmWipe(false);
                  setMsg({ text: 'Datos borrados.', tone: 'good' });
                }}
              >
                Borrar todo
              </Button>
              <Button variant="ghost" onClick={() => setConfirmWipe(false)}>
                Cancelar
              </Button>
            </div>
          </Banner>
        )}
      </Section>

      <p className="mt-10 text-center text-xs text-muted">
        CavallChess es software libre (GPL-3.0). Usa chessground, chessops y Stockfish.
      </p>
      <p className="mt-2 text-center text-xs text-muted">
        Piezas: {PIECE_SETS.map((p) => `${p.label} (${p.author})`).join(', ')}.{' '}
        <a className="underline underline-offset-2" href={CREDITS_URL} target="_blank" rel="noreferrer">
          Créditos y licencias
        </a>
        .
      </p>
    </Screen>
  );
}

const ARROW_STEP: Record<string, number> = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };

/**
 * Selector de sets de piezas en grilla: un radiogroup con foco itinerante (las flechas, Inicio y Fin cambian
 * la elección, como en un grupo de radios nativo). Cada opción muestra los dos caballos sobre las casillas del
 * tablero elegido.
 */
function PieceSetPicker({ value, onChange }: { value: PieceSetId; onChange: (v: PieceSetId) => void }) {
  const labelId = useId();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const current = PIECE_SETS.findIndex((p) => p.id === value);
  const onKeyDown = (e: KeyboardEvent) => {
    const last = PIECE_SETS.length - 1;
    const step = ARROW_STEP[e.key];
    const next =
      step !== undefined
        ? (Math.max(current, 0) + step + PIECE_SETS.length) % PIECE_SETS.length
        : e.key === 'Home'
          ? 0
          : e.key === 'End'
            ? last
            : undefined;
    if (next === undefined) return;
    e.preventDefault();
    onChange(PIECE_SETS[next].id);
    refs.current[next]?.focus();
  };
  return (
    <div className="space-y-2">
      <span id={labelId}>Piezas</span>
      <div role="radiogroup" aria-labelledby={labelId} onKeyDown={onKeyDown} className="grid grid-cols-4 gap-2">
        {PIECE_SETS.map((p, i) => {
          const checked = p.id === value;
          return (
            <button
              key={p.id}
              ref={(el) => {
                refs.current[i] = el;
              }}
              type="button"
              role="radio"
              aria-checked={checked}
              tabIndex={checked || (current === -1 && i === 0) ? 0 : -1}
              onClick={() => onChange(p.id)}
              className={`flex min-h-11 flex-col items-center gap-1.5 rounded-xl bg-surface p-1.5 text-xs leading-tight transition ${
                checked ? 'font-medium text-ink ring-2 ring-brass' : 'text-muted ring-1 ring-line hover:bg-raised'
              }`}
            >
              <span aria-hidden className="flex w-full overflow-hidden rounded-md">
                <span className="aspect-square flex-1 bg-(--sq-light)">
                  <img src={pieceUrl(p.id, 'wN')} alt="" draggable={false} className="size-full" />
                </span>
                <span className="aspect-square flex-1 bg-(--sq-dark)">
                  <img src={pieceUrl(p.id, 'bN')} alt="" draggable={false} className="size-full" />
                </span>
              </span>
              <span>{p.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <span>{label}</span>
      {children}
    </div>
  );
}
