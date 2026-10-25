import { useState } from 'react';
import { exportBackup, importBackup, setSettings, wipeAll, type Backup } from '../db/repo';
import { useSettings } from '../db/hooks';
import type { Settings } from '../types';
import { Banner, Button, Screen, Section, Segmented, Toggle } from '../ui/kit';
import { Board } from '../ui/Board';
import { INITIAL_EPD } from '../chess/position';
import { navigate } from '../ui/router';

export function SettingsScreen() {
  const s = useSettings();
  const [msg, setMsg] = useState<{ text: string; tone: 'good' | 'bad' } | null>(null);
  const [confirmWipe, setConfirmWipe] = useState(false);
  const [restore, setRestore] = useState<Backup | null>(null);
  if (!s) return null;
  const set = (patch: Partial<Settings>) => void setSettings(patch);

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
          <Row label="Piezas">
            <Segmented
              label="Piezas"
              value={s.pieceSet}
              onChange={(v) => set({ pieceSet: v })}
              options={[
                { value: 'cburnett', label: 'Clásicas' },
                { value: 'merida', label: 'Mérida' },
                { value: 'chessnut', label: 'Chessnut' },
              ]}
            />
          </Row>
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
          Incluye tu repertorio y todo el historial de repasos.
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
              await setSettings({ introSeenAt: undefined, tipsSeen: [] });
              navigate('/intro');
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
            <p>Se borran el repertorio, el historial y los ajustes de este dispositivo. No se puede deshacer.</p>
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
    </Screen>
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
