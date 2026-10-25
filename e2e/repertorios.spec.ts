import { expect, test, type Page } from '@playwright/test';
import { shot, skipIntro } from './helpers';

const whites = (page: Page) => page.getByRole('region', { name: 'Con blancas' });
/** La fila de un repertorio por su nombre exacto (el botón que la despliega empieza con el nombre). */
const row = (page: Page, name: string) =>
  whites(page)
    .getByRole('listitem')
    .filter({ has: page.getByText(name, { exact: true }) });

async function expand(page: Page, name: string) {
  const toggle = row(page, name).getByRole('button', { expanded: false });
  await toggle.click();
  await expect(row(page, name).getByRole('button', { expanded: true })).toBeVisible();
}

test('repertorios: crear, activar, duplicar, renombrar y eliminar', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));

  await page.goto('/');
  await skipIntro(page);
  await page.goto('/#/repertorios');
  await expect(page.getByRole('heading', { name: 'Repertorios' })).toBeVisible();
  await expect(row(page, 'Principal').getByText('Activo')).toBeVisible();
  const tabs = page.getByRole('navigation', { name: 'Secciones' });
  await expect(tabs.getByRole('link', { name: 'Repertorio' })).toHaveAttribute('aria-current', 'page');

  // El único de negras no se puede eliminar.
  const blacks = page.getByRole('region', { name: 'Con negras' });
  await blacks.getByRole('button', { name: /^Principal/ }).click();
  await expect(blacks.getByRole('button', { name: 'Eliminar' })).toBeDisabled();
  await expect(blacks.getByText(/Es tu único repertorio con negras/)).toBeVisible();

  // Crear uno vacío de blancas: abre el editor de ese repertorio y queda activo.
  await whites(page).getByRole('button', { name: 'Nuevo repertorio' }).click();
  const nameInput = whites(page).getByRole('textbox', { name: 'Nombre' });
  await expect(nameInput).toBeFocused();
  await expect(whites(page).getByRole('radio', { name: 'Vacío' })).toBeChecked();
  await expect(whites(page).getByRole('switch', { name: 'Entrenar con este' })).toBeChecked();
  await expect(whites(page).getByRole('button', { name: 'Crear' })).toBeDisabled();
  await nameInput.fill('Londres');
  await expect(whites(page).getByRole('button', { name: 'Crear' })).toBeEnabled();
  await shot(page, 'repertorios-01-nuevo');
  await whites(page).getByRole('button', { name: 'Crear' }).click();
  await expect(page).toHaveURL(/#\/repertoire\/white\?rep=r[a-z0-9]+$/);
  // El editor abre el repertorio nuevo (ya activo) y lo nombra.
  await expect(page.getByText('Londres', { exact: true })).toBeVisible();
  await expect(page.getByText('No es tu repertorio activo')).toHaveCount(0);

  await page.goto('/#/repertorios');
  await expect(row(page, 'Londres').getByText('Activo')).toBeVisible();
  await expect(row(page, 'Principal').getByText('Activo')).toHaveCount(0);
  await expect(row(page, 'Londres').getByText('Todavía sin jugadas')).toBeVisible();

  // Duplicar
  await expand(page, 'Londres');
  await row(page, 'Londres').getByRole('button', { name: 'Duplicar' }).click();
  await expect(row(page, 'Londres (copia)')).toBeVisible();
  await expect(page.getByRole('status').getByText('Listo: creaste «Londres (copia)».')).toBeVisible();

  // Renombrar la copia
  await expand(page, 'Londres (copia)');
  await row(page, 'Londres (copia)').getByRole('button', { name: 'Renombrar' }).click();
  const rename = row(page, 'Londres (copia)').getByRole('textbox', { name: 'Nombre' });
  await expect(rename).toBeFocused();
  await rename.fill('Londres B');
  await row(page, 'Londres (copia)').getByRole('button', { name: 'Guardar' }).click();
  await expect(row(page, 'Londres B')).toBeVisible();
  await expect(row(page, 'Londres (copia)')).toHaveCount(0);

  // Volver a entrenar con Principal
  await expand(page, 'Principal');
  await row(page, 'Principal').getByRole('button', { name: 'Entrenar con este' }).click();
  await expect(row(page, 'Principal').getByText('Activo')).toBeVisible();
  await expect(row(page, 'Londres').getByText('Activo')).toHaveCount(0);
  await expect(row(page, 'Principal').getByRole('button', { name: 'Entrenar con este' })).toHaveCount(0);
  await shot(page, 'repertorios-02-lista');

  // Eliminar la copia, con confirmación
  await expand(page, 'Londres B');
  await row(page, 'Londres B').getByRole('button', { name: 'Eliminar' }).click();
  await expect(row(page, 'Londres B').getByText(/No se puede deshacer/)).toBeVisible();
  await row(page, 'Londres B').getByRole('button', { name: 'Eliminar' }).click();
  await expect(row(page, 'Londres B')).toHaveCount(0);
  await expect(page.getByRole('status').getByText('Eliminaste «Londres B».')).toBeVisible();
  await expect(whites(page).getByRole('listitem')).toHaveCount(2);

  expect(errors).toEqual([]);
});
