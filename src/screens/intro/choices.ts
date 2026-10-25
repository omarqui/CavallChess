/** Aperturas para empezar que ofrece la bienvenida: una por grupo, compatibles entre sí. */
export interface IntroChoice {
  key: 'white' | 'blackE4' | 'blackD4';
  title: string;
  options: { fichaId: string; blurb: string }[];
}

export const INTRO_CHOICES: IntroChoice[] = [
  {
    key: 'white',
    title: 'Con blancas',
    options: [
      { fichaId: 'sistema-londres', blurb: 'Un mismo plan contra casi todo, ideal para empezar.' },
      { fichaId: 'italiana', blurb: '1.e4 clásica, partidas abiertas.' },
    ],
  },
  {
    key: 'blackE4',
    title: 'Con negras contra 1.e4',
    options: [
      { fichaId: 'caro-kann', blurb: 'Sólida y de estructura clara.' },
      { fichaId: 'dos-caballos', blurb: '1…e5, juego abierto y activo.' },
    ],
  },
  {
    key: 'blackD4',
    title: 'Con negras contra 1.d4',
    options: [
      { fichaId: 'eslava', blurb: 'Firme en el centro, sin encerrar el alfil.' },
      { fichaId: 'gambito-de-dama-rehusado', blurb: 'Clásica y sólida.' },
    ],
  },
];
