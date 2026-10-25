import { describe, expect, it } from 'vitest';
import { isBusy, runExclusive } from './lock';

const tick = () => new Promise<void>((r) => setTimeout(r, 0));

describe('runExclusive', () => {
  it('dos llamadas concurrentes no se intercalan y corren en orden', async () => {
    const log: string[] = [];
    const tarea = (id: string) => async () => {
      log.push(`${id}:empieza`);
      await tick();
      await tick();
      log.push(`${id}:termina`);
      return id;
    };
    const [a, b] = await Promise.all([runExclusive(tarea('a')), runExclusive(tarea('b'))]);
    expect([a, b]).toEqual(['a', 'b']);
    expect(log).toEqual(['a:empieza', 'a:termina', 'b:empieza', 'b:termina']);
  });

  it('un rechazo llega a quien llamó y no corta la cadena', async () => {
    const falla = runExclusive(async () => {
      throw new Error('falló');
    });
    const sigue = runExclusive(async () => 'sigue');
    await expect(falla).rejects.toThrow('falló');
    expect(await sigue).toBe('sigue');
  });

  it('isBusy está prendido mientras hay algo corriendo o esperando', async () => {
    expect(isBusy()).toBe(false);
    let soltar!: () => void;
    const primera = runExclusive(() => new Promise<void>((r) => (soltar = r)));
    const segunda = runExclusive(async () => undefined);
    await tick();
    expect(isBusy()).toBe(true);
    soltar();
    await primera;
    expect(isBusy()).toBe(true); // la segunda todavía no terminó
    await segunda;
    expect(isBusy()).toBe(false);
  });
});
