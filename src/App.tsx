import { useEffect, useState, type ReactNode } from 'react';
import { ensureRoots } from './db/repo';
import { useSettings } from './db/hooks';
import { shouldAutoSync, syncChesscom } from './games/sync';
import { ArchivedScreen } from './screens/Archived';
import { GamesScreen } from './screens/Games';
import { HomeScreen } from './screens/Home';
import { ImportScreen } from './screens/Import';
import { ProgressScreen } from './screens/Progress';
import { RepertoireScreen } from './screens/Repertoire';
import { SettingsScreen } from './screens/Settings';
import { TrainScreen } from './screens/Train';
import type { Side } from './types';
import { configureFeedback } from './ui/feedback';
import { href, useRoute } from './ui/router';

function useAppearance() {
  const s = useSettings();
  useEffect(() => {
    if (!s) return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const dark = s.colorScheme === 'dark' || (s.colorScheme === 'system' && mq.matches);
      document.documentElement.dataset.scheme = dark ? 'dark' : 'light';
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#141a17' : '#eef1ec');
    };
    apply();
    mq.addEventListener('change', apply);
    document.body.className = `board-${s.boardTheme} pieces-${s.pieceSet}`;
    configureFeedback({ sound: s.sound, haptics: s.haptics });
    return () => mq.removeEventListener('change', apply);
  }, [s]);
}

export default function App() {
  const route = useRoute();
  const [ready, setReady] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  useAppearance();

  useEffect(() => {
    void ensureRoots().then(() => setReady(true));
    void navigator.storage?.persist?.().catch(() => undefined);
    void shouldAutoSync().then(async (yes) => {
      if (!yes) return;
      try {
        const r = await syncChesscom();
        if (r.deviations || r.gaps) {
          setToast(
            `Chess.com: ${r.deviations} ${r.deviations === 1 ? 'desvío' : 'desvíos'} y ${r.gaps} ${r.gaps === 1 ? 'hueco nuevo' : 'huecos nuevos'}.`,
          );
        }
      } catch {
        /* sin conexión: se reintenta en la próxima apertura */
      }
    });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(t);
  }, [toast]);

  if (!ready) return null;
  const [first, second] = route.path;
  const side: Side = second === 'black' ? 'black' : 'white';

  let screen: ReactNode;
  let tab: string | null = first ?? 'home';
  switch (first) {
    case 'train':
      tab = null;
      screen = (
        <TrainScreen
          key={route.hash}
          mode={route.params.get('mode') === 'practice' ? 'practice' : 'review'}
          side={(route.params.get('side') as Side | null) ?? undefined}
          root={route.params.get('root') ?? undefined}
        />
      );
      break;
    case 'repertoire':
      screen = (
        <RepertoireScreen
          side={side}
          nodeParam={route.params.get('node') ?? undefined}
          gapSan={route.params.get('gap') ?? undefined}
        />
      );
      break;
    case 'archived':
      tab = 'repertoire';
      screen = <ArchivedScreen side={side} />;
      break;
    case 'import':
      tab = 'repertoire';
      screen = <ImportScreen />;
      break;
    case 'games':
      screen = <GamesScreen />;
      break;
    case 'progress':
      screen = <ProgressScreen />;
      break;
    case 'settings':
      screen = <SettingsScreen />;
      break;
    default:
      tab = 'home';
      screen = <HomeScreen />;
  }

  return (
    <div className="flex h-full flex-col">
      <main className="flex-1 overflow-y-auto">{screen}</main>
      {toast && (
        <div role="status" className="pointer-events-none fixed inset-x-0 bottom-24 z-30 flex justify-center px-4">
          <div className="rounded-xl bg-ink px-4 py-2.5 text-[15px] text-paper shadow-lg">{toast}</div>
        </div>
      )}
      {tab && <TabBar active={tab} />}
    </div>
  );
}

const TABS: { id: string; to: string; label: string; icon: ReactNode }[] = [
  {
    id: 'home',
    to: '/',
    label: 'Hoy',
    icon: <path d="M4 11l8-7 8 7v8a1 1 0 0 1-1 1h-4v-6h-6v6H5a1 1 0 0 1-1-1z" />,
  },
  {
    id: 'repertoire',
    to: '/repertoire/white',
    label: 'Repertorio',
    icon: (
      <>
        <circle cx="6" cy="6" r="2" />
        <circle cx="6" cy="18" r="2" />
        <circle cx="18" cy="12" r="2" />
        <path d="M6 8v8M8 6c6 0 4 6 8 6M8 18c6 0 4-6 8-6" />
      </>
    ),
  },
  {
    id: 'games',
    to: '/games',
    label: 'Partidas',
    icon: (
      <>
        <rect x="4" y="4" width="16" height="16" rx="2" />
        <path d="M4 12h16M12 4v16" />
      </>
    ),
  },
  {
    id: 'progress',
    to: '/progress',
    label: 'Progreso',
    icon: <path d="M5 19V11M12 19V5M19 19v-6" />,
  },
  {
    id: 'settings',
    to: '/settings',
    label: 'Ajustes',
    icon: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4" />
      </>
    ),
  },
];

function TabBar({ active }: { active: string }) {
  return (
    <nav
      aria-label="Secciones"
      className="safe-bottom fixed inset-x-0 bottom-0 z-20 border-t border-line bg-paper/90 backdrop-blur-md"
    >
      <ul className="mx-auto flex max-w-xl justify-around px-2 pt-1.5">
        {TABS.map((t) => (
          <li key={t.id}>
            <a
              href={href(t.to)}
              aria-current={active === t.id ? 'page' : undefined}
              className={`flex min-w-16 flex-col items-center gap-0.5 rounded-lg px-2 py-1 text-[11px] font-medium ${
                active === t.id ? 'text-ink' : 'text-muted'
              }`}
            >
              <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                {t.icon}
              </svg>
              {t.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
