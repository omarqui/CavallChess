/** Integración con Lichess: exportación de estudios y explorador de aperturas (requiere token). */

export interface StudyRef {
  studyId: string;
  chapterId?: string;
}

export function parseStudyUrl(input: string): StudyRef | null {
  const m = input.trim().match(/lichess\.org\/study\/([A-Za-z0-9]{8})(?:\/([A-Za-z0-9]{8}))?/);
  if (m) return { studyId: m[1], chapterId: m[2] };
  if (/^[A-Za-z0-9]{8}$/.test(input.trim())) return { studyId: input.trim() };
  return null;
}

const auth = (token?: string): HeadersInit => (token ? { Authorization: `Bearer ${token}` } : {});

export async function fetchStudyPgn(ref: StudyRef, token?: string): Promise<string> {
  const path = ref.chapterId ? `${ref.studyId}/${ref.chapterId}` : ref.studyId;
  const url = `https://lichess.org/api/study/${path}.pgn?comments=true&variations=true&clocks=false&orientation=true`;
  const res = await fetch(url, { headers: auth(token) });
  if (res.status === 401 || res.status === 403 || res.status === 404) {
    throw new Error(
      token
        ? 'Lichess no devolvió el estudio: revisá la URL y que el token tenga el permiso study:read.'
        : 'No se pudo leer el estudio. Si es privado o no listado, cargá un token de Lichess en Ajustes.',
    );
  }
  if (!res.ok) throw new Error(`Lichess respondió ${res.status}.`);
  return res.text();
}

export interface ExplorerMove {
  uci: string;
  san: string;
  white: number;
  draws: number;
  black: number;
}

export interface ExplorerResult {
  white: number;
  draws: number;
  black: number;
  moves: ExplorerMove[];
}

export type ExplorerDb = 'lichess' | 'masters';

export async function fetchExplorer(fen: string, token: string, source: ExplorerDb, signal?: AbortSignal): Promise<ExplorerResult> {
  const params = new URLSearchParams({ fen, moves: '12', topGames: '0', recentGames: '0' });
  if (source === 'lichess') {
    params.set('speeds', 'blitz,rapid,classical');
    params.set('ratings', '1600,1800,2000,2200,2500');
  }
  const res = await fetch(`https://explorer.lichess.org/${source}?${params}`, { headers: auth(token), signal });
  if (res.status === 401) throw new Error('El explorador necesita un token de Lichess válido (Ajustes).');
  if (res.status === 429) throw new Error('Lichess pidió esperar un poco (demasiadas consultas).');
  if (!res.ok) throw new Error(`El explorador respondió ${res.status}.`);
  return res.json();
}
