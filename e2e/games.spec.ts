import { expect, test, type Page } from '@playwright/test';
import { mockChesscom } from './chesscomMock';
import { skipIntro } from './helpers';

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
