import { expect, test } from '@playwright/test';
import { move, shot, skipIntro } from './helpers';

test.describe('instalada', () => {
  // El viewport de iPhone 13 trae su user agent: se simula la app ya instalada para que no aparezca el paso de instalar.
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => Object.defineProperty(navigator, 'standalone', { value: true, configurable: true }));
  });

  test('bienvenida: elegir aperturas deja nuevas para aprender', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Hola, esto es CavallChess' })).toBeVisible();
    await page.getByRole('button', { name: 'Empezar' }).click();
    await move(page, 'b8c6', 'black');
    await expect(page.getByText(/Así es cada repaso/)).toBeVisible();
    await page.getByRole('button', { name: 'Siguiente' }).click();
    await page.getByRole('radio', { name: /Sistema Londres/ }).check();
    await page.getByRole('radio', { name: /Defensa Caro-Kann/ }).check();
    await page.getByRole('radio', { name: /Defensa Eslava/ }).check();
    await page.getByRole('button', { name: 'Agregar y seguir' }).click();
    await page.getByRole('button', { name: 'Seguir' }).click();
    await expect(page.getByText(/Hoy aprendés tus primeras 10 posiciones/)).toBeVisible();
    await shot(page, '30-bienvenida-lista');
    await page.getByRole('button', { name: 'Estudiar' }).click();
    await expect(page.locator('.board-frame[data-interactive="true"]')).toBeVisible();
  });

  test('bienvenida: saltar no la vuelve a mostrar', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Saltar' }).click();
    await expect(page.getByText('Tu repertorio está vacío.')).toBeVisible();
    await page.reload();
    await expect(page.getByText('Tu repertorio está vacío.')).toBeVisible();
  });
});

test('bienvenida: en Safari de iPhone explica cómo instalarla y la demo corrige', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Empezar' }).click();
  await expect(page.getByRole('heading', { name: 'Instalala en tu iPhone' })).toBeVisible();
  await shot(page, '31-bienvenida-instalar');
  await page.getByRole('button', { name: 'Seguir sin instalar' }).click();

  // Una jugada que no defiende: sacudida, vuelve atrás y se puede probar otra.
  await expect(page.getByRole('heading', { name: 'Así se estudia' })).toBeVisible();
  await move(page, 'a7a6', 'black');
  await expect(page.getByText('Probá de nuevo: buscá cómo proteger el peón.')).toBeVisible();
  await move(page, 'd7d6', 'black');
  await expect(page.getByText(/Así es cada repaso/)).toBeVisible();
  await page.getByRole('button', { name: 'Siguiente' }).click();

  // Sin elegir nada, el botón solo sigue; el usuario de Chess.com queda en Ajustes.
  await expect(page.getByRole('radio', { name: 'Elegir después' })).toHaveCount(3);
  await page.getByRole('button', { name: 'Seguir', exact: true }).click();
  await page.getByLabel('Usuario de Chess.com').fill('alguien');
  await page.getByRole('button', { name: 'Seguir', exact: true }).click();
  await expect(page.getByText('Cuando agregues aperturas, acá vas a ver qué estudiar.')).toBeVisible();
  await page.getByRole('button', { name: 'Ir al inicio' }).click();
  await expect(page.getByText('Tu repertorio está vacío.')).toBeVisible();
  await page.getByRole('link', { name: 'Ajustes' }).click();
  await expect(page.getByLabel('Usuario de Chess.com')).toHaveValue('alguien');

  // "Ver la introducción" la vuelve a abrir desde el principio.
  await page.getByRole('button', { name: 'Ver la introducción' }).click();
  await expect(page.getByRole('heading', { name: 'Hola, esto es CavallChess' })).toBeVisible();
});

test('los tips se cierran y no vuelven', async ({ page }) => {
  await page.goto('/');
  await skipIntro(page);
  await page.getByRole('link', { name: 'Biblioteca' }).click();
  await expect(page.getByText(/Cada ficha explica una apertura/)).toBeVisible();
  await shot(page, 'tip-biblioteca');
  await page.getByRole('button', { name: 'Entendido' }).click();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Biblioteca' })).toBeVisible();
  await expect(page.getByText(/Cada ficha explica una apertura/)).toBeHidden();
});
