import { useCallback, useState } from 'react';

const store = new Map<string, unknown>();

/**
 * Como `useState`, pero el valor vive en el módulo: sobrevive a que la pantalla se desmonte (abrir una partida y
 * volver) y se pierde al recargar la app. Para estado de vista (filtros, cuántas filas se ven, el último mensaje),
 * no para datos. Se escribe aunque la pantalla ya no esté montada: una tarea que termina después deja su mensaje.
 */
export function useSessionState<T>(key: string, initial: T): [T, (next: T | ((prev: T) => T)) => void] {
  const [value, setValue] = useState<T>(() => (store.has(key) ? (store.get(key) as T) : initial));
  const set = useCallback(
    (next: T | ((prev: T) => T)) => {
      const prev = store.has(key) ? (store.get(key) as T) : initial;
      const v = typeof next === 'function' ? (next as (p: T) => T)(prev) : next;
      store.set(key, v);
      setValue(v);
    },
    // `initial` solo cuenta la primera vez, como en useState.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key],
  );
  return [value, set];
}

/** Olvida el estado de vista cuyas claves empiezan con `prefix` (p. ej. los mensajes de otra cuenta de Chess.com). */
export function clearSessionState(prefix: string) {
  for (const key of [...store.keys()]) if (key.startsWith(prefix)) store.delete(key);
}
