/** Fichas en crudo: se carga a demanda con `import('./bundle')` para no inflar el bundle inicial. */
export const sources: Record<string, string> = import.meta.glob(
  ['/content/biblioteca/blancas/**/*.md', '/content/biblioteca/negras/**/*.md'],
  { query: '?raw', import: 'default', eager: true },
) as Record<string, string>;
