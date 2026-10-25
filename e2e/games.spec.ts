import { expect, test, type Page } from '@playwright/test';
import { mockChesscom } from './chesscomMock';
import { shot, skipIntro } from './helpers';

/** Configura el usuario de Chess.com desde Ajustes (se guarda al salir del campo). */
async function setChesscomUser(page: Page, user: string) {
  await page.goto('/#/settings');
  const input = page.getByLabel('Usuario de Chess.com');
  await input.fill(user);
  await input.blur();
  await page.waitForTimeout(200);
}

test('partidas: la API simulada de Chess.com entra a la lista', async ({ page }) => {
  await mockChesscom(page, {
    user: 'tester',
    months: {
      '2026/10': [{ id: '1', white: 'tester', black: 'rival1', moves: '1. e4 c5 2. Nf3 d6', winner: 'white' }],
    },
  });
  await page.goto('/');
  await skipIntro(page);
  await setChesscomUser(page, 'tester');
  await page.goto('/#/games');
  await page.getByRole('button', { name: 'Actualizar partidas' }).click();
  await expect(page.getByText('vs rival1')).toBeVisible();
});

const REPERTORIO = `[Event "Repertorio: Española"]

1. e4 e5 2. Nf3 Nc6 3. Bb5 *`;

/** Carga un repertorio de blancas con "Pegar PGN". */
async function pasteRepertoire(page: Page, pgn: string) {
  await page.goto('/#/import');
  await page.getByRole('radio', { name: 'Pegar PGN' }).click();
  await page.getByRole('radio', { name: 'Blancas' }).click();
  await page.locator('textarea').fill(pgn);
  await page.getByRole('button', { name: 'Leer y revisar' }).click();
  await page.getByRole('button', { name: 'Guardar en el repertorio' }).click();
  await expect(page.getByRole('heading', { name: 'Repertorio' })).toBeVisible();
}

test('partidas: abrir una partida, ver la salida del repertorio y agregarla', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  await mockChesscom(page, {
    user: 'tester',
    months: {
      '2026/10': [
        // La más reciente: el rival sale del repertorio con 1…c5.
        { id: '1', white: 'tester', black: 'rival1', moves: '1. e4 c5 2. Nf3 d6 3. d4 cxd4', winner: 'white' },
        // Dos días antes: te desviás con 2.♘c3 (tu repertorio va 2.♘f3).
        {
          id: '2',
          white: 'tester',
          black: 'rival2',
          moves: '1. e4 e5 2. Nc3 Nf6 3. f4',
          winner: 'black',
          end: new Date(Date.now() - 2 * 86_400_000),
        },
      ],
    },
  });
  await page.goto('/');
  await skipIntro(page);
  await pasteRepertoire(page, REPERTORIO);
  await setChesscomUser(page, 'tester');

  await page.goto('/#/games');
  await page.getByRole('button', { name: 'Actualizar partidas' }).click();
  await page.getByRole('link', { name: /vs rival1/ }).click();

  // Novedad del rival: el visor abre antes de 1…c5, con 1.e4 como la jugada actual.
  await expect(page.getByRole('heading', { name: 'vs rival1' })).toBeVisible();
  await expect(page.getByText('El rival jugó c5 y tu repertorio no lo cubría.')).toBeVisible();
  await expect(page.locator('[aria-current="true"]')).toHaveText('1.e4');
  await expect(page.getByRole('link', { name: 'Ver en Chess.com' })).toHaveAttribute(
    'href',
    'https://www.chess.com/game/live/1',
  );
  await page.waitForTimeout(300);
  await shot(page, 'games-viewer-novedad');

  await page.getByRole('button', { name: 'Agregar la novedad y tu respuesta' }).click();
  await expect(page.getByRole('heading', { name: 'Agregar desde la partida' })).toBeVisible();
  await expect(page.getByText(/Se agregan 1 jugada tuya y 1 del rival/)).toBeVisible();
  await shot(page, 'games-viewer-agregar');
  await page.getByRole('button', { name: 'Guardar en el repertorio' }).click();
  await expect(page.getByText(/^Sumaste 2 jugadas/)).toBeVisible();

  // De vuelta en el visor, la novedad ya está cubierta: termina tu preparación tras 2.♘f3.
  await expect(page.getByRole('heading', { name: 'vs rival1' })).toBeVisible();
  await expect(page.getByText(/El rival jugó c5/)).toHaveCount(0);
  await expect(page.locator('[aria-current="true"]')).toHaveText(/^2\.♞.f3$/);
  await expect(page.getByText(/^Sumaste/)).toBeHidden({ timeout: 7000 });
  await shot(page, 'games-viewer-fin-preparacion');

  // Desvío propio, en oscuro.
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/#/games');
  await page.getByRole('link', { name: /vs rival2/ }).click();
  await expect(page.getByText(/^Acá jugaste ♞.c3; en tu repertorio va ♞.f3\.$/)).toBeVisible();
  await expect(page.locator('[aria-current="true"]')).toHaveText('e5');
  await page.waitForTimeout(300);
  await shot(page, 'games-viewer-desvio-oscuro');
  await page.getByRole('button', { name: 'Siguiente' }).click();
  await expect(page.getByRole('button', { name: 'Ir a esa jugada' })).toBeEnabled();
  await page.getByRole('button', { name: 'Ir a esa jugada' }).click();
  await expect(page.locator('[aria-current="true"]')).toHaveText('e5');
  await page.getByRole('button', { name: 'Repasar ahora' }).click();
  await expect(page).toHaveURL(/#\/train\?card=/);
  await expect(page.getByText(/Posición nueva: jugá ♞.f3/)).toBeVisible();

  // Un enlace viejo.
  await page.goto(`/#/games/${encodeURIComponent('https://www.chess.com/game/live/999')}`);
  await expect(page.getByText('No encontramos esa partida')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Partidas' })).toBeVisible();

  expect(errors).toEqual([]);
});
