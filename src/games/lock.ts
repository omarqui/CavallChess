/**
 * Candado del módulo de partidas: la sincronización automática al abrir, la carga hacia atrás y el recálculo
 * corren de a una, en el orden en que se pidieron. Es una cadena de promesas; un rechazo le llega a quien
 * llamó y no corta la cadena. No es reentrante: una función envuelta no puede llamar a otra envuelta.
 */
let cola: Promise<void> = Promise.resolve();
let pendientes = 0;

export function runExclusive<T>(fn: () => Promise<T>): Promise<T> {
  pendientes++;
  const res = cola.then(fn).finally(() => {
    pendientes--;
  });
  cola = res.then(
    () => undefined,
    () => undefined,
  );
  return res;
}

/** Si hay algo corriendo o esperando el candado. */
export const isBusy = () => pendientes > 0;
