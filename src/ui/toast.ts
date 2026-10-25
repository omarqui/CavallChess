import { useSyncExternalStore } from 'react';

/** Aviso global: uno a la vez, dura 5 s. Un aviso nuevo reemplaza al anterior y reinicia la cuenta. */
const DURATION = 5000;

let current: string | null = null;
let timer: ReturnType<typeof setTimeout> | undefined;
const listeners = new Set<() => void>();

const emit = () => listeners.forEach((l) => l());

export function showToast(text: string): void {
  current = text;
  clearTimeout(timer);
  timer = setTimeout(() => {
    current = null;
    emit();
  }, DURATION);
  emit();
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function useToast(): string | null {
  return useSyncExternalStore(subscribe, () => current);
}
