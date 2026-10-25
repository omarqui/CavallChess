import { createHash } from 'node:crypto';
import type { Ficha } from './types';

/** Huella del contenido jugable de la ficha: cambiar solo el texto no obliga a volver a verificar. */
export function fichaHash(f: Ficha): string {
  const datos = f.lines.map((l) => [
    l.id,
    l.kind,
    l.gambit,
    l.moves.map((m) => m.uci),
    l.fall?.map((m) => m.uci) ?? null,
    l.trapPly ?? null,
  ]);
  return createHash('sha256').update(JSON.stringify(datos)).digest('hex');
}
