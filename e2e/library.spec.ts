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

test('ficha: leer y agregar al repertorio', async ({ page }) => {
  await page.goto('/#/biblioteca/caro-kann');
  await expect(page.getByRole('heading', { name: 'Defensa Caro-Kann' })).toBeVisible();
  await page.getByRole('radio', { name: 'Variantes' }).click();
  await page.getByRole('button', { name: 'Agregar al repertorio' }).click();
  await page.getByRole('button', { name: 'Revisar' }).click();
  await page.getByRole('button', { name: 'Guardar en el repertorio' }).click();
  await expect(page.getByText(/Sumaste \d+ jugadas, \d+ para aprender/)).toBeVisible();
  await expect(page.getByText('En tu repertorio').first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Ya está en tu repertorio' })).toBeDisabled();
  await shot(page, '21-ficha');
});

test('ficha: las notas se guardan', async ({ page }) => {
  await page.goto('/#/biblioteca/caro-kann');
  await page.getByRole('radio', { name: 'Mis apuntes' }).click();
  const nota = page.getByLabel('Sobre la apertura');
  await nota.fill('Contra 3.e5, primero el alfil.');
  await expect(page.getByText('Guardado')).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('Sobre la apertura')).toHaveValue('Contra 3.e5, primero el alfil.');

  // La nota de una línea se escribe en su tarjeta y aparece en "Mis apuntes".
  await page.getByRole('radio', { name: 'Variantes' }).click();
  await page.getByText('Tu nota').first().click();
  await page.getByLabel('Tu nota: Variante del Avance').fill('Ojo con Nh4.');
  await page.getByLabel('Tu nota: Variante del Avance').blur();
  await page.getByRole('radio', { name: 'Mis apuntes' }).click();
  await expect(page.getByLabel('Tu nota: Variante del Avance')).toHaveValue('Ojo con Nh4.');
});

test('visor: recorrer una línea y analizar', async ({ page }) => {
  await page.goto('/#/biblioteca/caro-kann?tab=variantes');
  await page.getByRole('button', { name: 'Ver en el tablero' }).first().click();
  await page.getByRole('button', { name: 'Siguiente' }).click();
  await page.getByRole('button', { name: 'Siguiente' }).click();
  await page.getByRole('button', { name: 'Anterior' }).click();
  await page.getByLabel('Analizar').check();
  await expect(page.getByText(/Calculando|[+−-]\d/)).toBeVisible();
  await shot(page, '22-visor');
});
