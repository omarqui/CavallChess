import { useSyncExternalStore } from 'react';

/** Router mínimo por hash (funciona en GitHub Pages sin configuración de servidor). */
function subscribe(cb: () => void) {
  window.addEventListener('hashchange', cb);
  return () => window.removeEventListener('hashchange', cb);
}

const snapshot = () => window.location.hash || '#/';

export function useRoute() {
  const hash = useSyncExternalStore(subscribe, snapshot);
  const [path, query = ''] = hash.slice(1).split('?');
  return { path: path.split('/').filter(Boolean), params: new URLSearchParams(query), hash };
}

export function navigate(to: string, replace = false) {
  const target = to.startsWith('#') ? to : `#${to}`;
  if (replace) window.history.replaceState(null, '', target);
  if (replace) window.dispatchEvent(new HashChangeEvent('hashchange'));
  else window.location.hash = target;
}

export const href = (to: string) => `#${to}`;
