import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { db } from './db/db';
import { ensureRoots, getSettings, setSettings } from './db/repo';
import { useSettings } from './db/hooks';
import { shouldAutoSync, syncChesscom } from './games/sync';
import { ArchivedScreen } from './screens/Archived';
import { FichaScreen, parseFichaTab } from './screens/Ficha';
import { FichaAddScreen } from './screens/FichaAdd';
import { GamesScreen } from './screens/Games';
import { HomeScreen } from './screens/Home';
import { ImportScreen } from './screens/Import';
import { IntroScreen } from './screens/Intro';
import { shouldMarkIntroSeen, shouldShowIntro } from './screens/intro/gate';
import { LibraryScreen } from './screens/Library';
import { LineViewerScreen } from './screens/LineViewer';
import { ProgressScreen } from './screens/Progress';
import { RepertoireScreen } from './screens/Repertoire';
import { SettingsScreen } from './screens/Settings';
import { TrainScreen } from './screens/Train';
import type { Side } from './types';
import { configureFeedback } from './ui/feedback';
import { href, navigate, useRoute } from './ui/router';
import { showToast, useToast } from './ui/toast';

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

/**
 * Puerta de la bienvenida, al abrir la app (antes del primer render): con el repertorio vacío y sin la marca, lleva a
 * `#/intro`; con tarjetas, la marca como vista. Se decide una sola vez, así no persigue a quien la saltó o borró los
 * datos en esta misma sesión. `#/intro` se puede abrir siempre de forma explícita.
 */
async function introGate() {
  const [s, totalCards] = await Promise.all([getSettings(), db.cards.count()]);
  if (shouldMarkIntroSeen(s, totalCards)) await setSettings({ introSeenAt: Date.now() });
  const first = window.location.hash.slice(1).split('?')[0].split('/').filter(Boolean)[0];
  if (shouldShowIntro(s, totalCards) && first !== 'intro') navigate('/intro', true);
}

export default function App() {
  const route = useRoute();
  const [ready, setReady] = useState(false);
  const toast = useToast();
  const main = useRef<HTMLElement>(null);
  const pathKey = route.path.join('/');
  useAppearance();

  // Cada pantalla nueva arranca desde arriba (los cambios de parámetros, como una pestaña, no).
  // Al volver a la pantalla anterior (visor -> ficha -> catálogo) se restaura donde estabas.
  const trail = useRef<{ key: string; scroll: number }[]>([]);
  const lastScroll = useRef(0);
  useLayoutEffect(() => {
    const el = main.current;
    if (!el) return;
    const stack = trail.current;
    let target = 0;
    if (stack.length && stack[stack.length - 1].key === pathKey) {
      /* mismo camino: solo cambiaron los parámetros */
      return;
    }
    if (stack.length) stack[stack.length - 1].scroll = lastScroll.current;
    if (stack.length >= 2 && stack[stack.length - 2].key === pathKey) {
      stack.pop();
      target = stack[stack.length - 1].scroll;
    } else {
      stack.push({ key: pathKey, scroll: 0 });
      if (stack.length > 30) stack.shift();
    }
    lastScroll.current = target;
    el.scrollTop = target;
    // El contenido puede cargar después (catálogo, grafos): reintenta unos cuadros hasta alcanzar la posición.
    let tries = 0;
    let raf = 0;
    const settle = () => {
      if (target && Math.abs(el.scrollTop - target) > 1 && tries++ < 20) {
        el.scrollTop = target;
        raf = requestAnimationFrame(settle);
      }
    };
    if (target) raf = requestAnimationFrame(settle);
    return () => cancelAnimationFrame(raf);
  }, [pathKey, ready]);

  useEffect(() => {
    void ensureRoots()
      .then(() => introGate().catch(() => undefined))
      .then(() => setReady(true));
    void navigator.storage?.persist?.().catch(() => undefined);
    void shouldAutoSync().then(async (yes) => {
      if (!yes) return;
      try {
        const r = await syncChesscom();
        if (r.deviations || r.gaps) {
          showToast(
            `Chess.com: ${r.deviations} ${r.deviations === 1 ? 'desvío' : 'desvíos'} y ${r.gaps} ${r.gaps === 1 ? 'hueco nuevo' : 'huecos nuevos'}.`,
          );
        }
      } catch {
        /* sin conexión: se reintenta en la próxima apertura */
      }
    });
  }, []);

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
          card={route.params.get('card') ?? undefined}
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
    case 'intro':
      // Bienvenida a pantalla completa: sin barra de pestañas.
      tab = null;
      screen = <IntroScreen />;
      break;
    case 'archived':
      tab = 'repertoire';
      screen = <ArchivedScreen side={side} />;
      break;
    case 'import':
      tab = 'repertoire';
      screen = <ImportScreen />;
      break;
    case 'biblioteca': {
      tab = 'biblioteca';
      const [, id, sub] = route.path;
      if (!id) screen = <LibraryScreen />;
      else if (!sub) screen = <FichaScreen key={id} id={id} tab={parseFichaTab(route.params.get('tab'))} />;
      else if (sub === 'agregar' && route.path.length === 3) screen = <FichaAddScreen key={id} id={id} />;
      else if (sub === 'linea' && route.path[3] && route.path.length === 4) {
        // Visor a pantalla completa: sin barra de pestañas.
        tab = null;
        screen = <LineViewerScreen key={route.path[3]} fichaId={id} lineId={route.path[3]} />;
      } else screen = <FichaScreen key={id} id={id} tab={parseFichaTab(route.params.get('tab'))} />;
      break;
    }
    case 'games':
      screen = <GamesScreen />;
      break;
    case 'progress':
      screen = <ProgressScreen />;
      break;
    case 'settings':
      tab = 'home';
      screen = <SettingsScreen />;
      break;
    default:
      tab = 'home';
      screen = <HomeScreen />;
  }

  return (
    <div className="flex h-full flex-col" style={{ '--tabbar-h': TABBAR_H } as CSSProperties}>
      <main
        ref={main}
        className="flex-1 overflow-y-auto"
        onScroll={(e) => {
          lastScroll.current = e.currentTarget.scrollTop;
        }}
      >
        {screen}
      </main>
      {toast && (
        <div
          role="status"
          className="pointer-events-none fixed inset-x-0 z-30 flex justify-center px-4"
          style={{ bottom: 'calc(var(--tabbar-h) + 4.75rem)' }}
        >
          <div className="max-w-md rounded-xl bg-ink px-4 py-2.5 text-center text-[15px] leading-snug text-paper shadow-lg transition duration-200 ease-out starting:translate-y-2 starting:opacity-0 motion-reduce:transition-none">
            {toast}
          </div>
        </div>
      )}
      {tab && <TabBar active={tab} />}
    </div>
  );
}

/**
 * Alto de la barra de pestañas (con el área segura de abajo). Las acciones fijas de una pantalla se apoyan
 * encima con `bottom: var(--tabbar-h)`.
 */
const TABBAR_H = 'calc(57.5px + max(env(safe-area-inset-bottom), 0.5rem))';

const TABS: { id: string; to: string; label: string; icon: ReactNode }[] = [
  {
    id: 'home',
    to: '/',
    label: 'Hoy',
    icon: <path d="M4 11l8-7 8 7v8a1 1 0 0 1-1 1h-4v-6h-6v6H5a1 1 0 0 1-1-1z" />,
  },
  {
    id: 'biblioteca',
    to: '/biblioteca',
    label: 'Biblioteca',
    icon: (
      <path d="M12 6.5C10.3 5.3 7.8 4.8 4 5v13c3.8-.2 6.3.3 8 1.5M12 6.5C13.7 5.3 16.2 4.8 20 5v13c-3.8-.2-6.3.3-8 1.5M12 6.5v13" />
    ),
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
