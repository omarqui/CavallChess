import { expect, test } from '@playwright/test';
import { shot } from './helpers';

test('biblioteca: catálogo por color y buscador', async ({ page }) => {
  await page.goto('/#/biblioteca');
  await expect(page.getByRole('heading', { name: 'Biblioteca' })).toBeVisible();
  await page.getByRole('radio', { name: 'Con negras' }).click();
  await expect(page.getByText('Defensa Caro-Kann')).toBeVisible();
  await page.getByLabel('Buscar aperturas').fill('eslava');
  await expect(page.getByText('Defensa Eslava')).toBeVisible();
  await expect(page.getByText('Defensa Caro-Kann')).toBeHidden();
  await page.getByLabel('Buscar aperturas').fill('B12');
  await expect(page.getByText('Defensa Caro-Kann')).toBeVisible();
  await shot(page, '20-biblioteca');
});
