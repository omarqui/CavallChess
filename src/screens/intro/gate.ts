import type { Settings } from '../../types';

/** La bienvenida se muestra sola la primera vez: sin tarjetas y sin la marca de vista. */
export const shouldShowIntro = (s: Settings, totalCards: number): boolean => !s.introSeenAt && totalCards === 0;

/** Quien ya tiene repertorio no la necesita: queda marcada como vista. */
export const shouldMarkIntroSeen = (s: Settings, totalCards: number): boolean => !s.introSeenAt && totalCards > 0;

/** El paso de instalar es para iPhone o iPad que todavía no abren la app desde la pantalla de inicio. */
export const needsInstallStep = (ua: string, standalone: boolean): boolean => /iPhone|iPad|iPod/.test(ua) && !standalone;

export type TipId = 'biblioteca' | 'ficha' | 'entrenar' | 'repertorio' | 'partidas' | 'progreso';

/** Un tip se ve una sola vez, y recién después de la bienvenida. */
export const tipVisible = (id: TipId, s: Settings): boolean => !!s.introSeenAt && !(s.tipsSeen ?? []).includes(id);
