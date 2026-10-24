import type { Page } from '@playwright/test';

/** Toque en una casilla del tablero (orientación blancas o negras). */
export async function clickSquare(page: Page, square: string, orientation: 'white' | 'black' = 'white', nth = 0) {
  const board = page.locator('cg-board').nth(nth);
  await board.evaluate((el) => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
  const box = (await board.boundingBox())!;
  const size = box.width / 8;
  const file = square.charCodeAt(0) - 97;
  const rank = Number(square[1]) - 1;
  const x = orientation === 'white' ? file : 7 - file;
  const y = orientation === 'white' ? 7 - rank : rank;
  await page.mouse.click(box.x + size * (x + 0.5), box.y + size * (y + 0.5));
}

export async function move(page: Page, uci: string, orientation: 'white' | 'black' = 'white') {
  // Deja terminar la animación de la jugada anterior (como haría una persona) y espera a que
  // el tablero vuelva a aceptar jugadas.
  await page.waitForTimeout(300);
  await page.locator('.board-frame[data-interactive="true"]').first().waitFor();
  await clickSquare(page, uci.slice(0, 2), orientation);
  await clickSquare(page, uci.slice(2, 4), orientation);
}

export const shot = (page: Page, name: string) => page.screenshot({ path: `e2e/screenshots/${name}.png` });
