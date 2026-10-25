import { expect, test } from '@playwright/test';
import { move, shot, skipIntro } from './helpers';

const PGN = `[Event "Repertorio: Española"]
[StudyName "Repertorio"]

1. e4 { Centro y desarrollo rápido. } e5 2. Nf3 Nc6 (2... d6 3. d4) 3. Bb5 { Presión sobre el caballo que defiende e5. [%cal Gb5c6] } a6 4. Ba4 *`;

const FIG = '︎';
const UCI: Record<string, string> = { [`♝${FIG}b5`]: 'f1b5', [`♝${FIG}a4`]: 'b5a4', d4: 'd2d4' };

test('flujo completo: importar, aprender, repasar, fallar, progreso, editor y ajustes', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  // Chrome de escritorio abriría la hoja de compartir del sistema; acá se prueba la descarga.
  await page.addInitScript(() => Object.defineProperty(navigator, 'canShare', { value: undefined }));

  await page.goto('/');
  await skipIntro(page);
  await expect(page.getByText('Tu repertorio está vacío.')).toBeVisible();
  await shot(page, '01-inicio-vacio');

  // Importar
  await page.getByRole('button', { name: 'Importar un repertorio' }).click();
  await page.getByRole('radio', { name: 'Pegar PGN' }).click();
  await page.getByRole('radio', { name: 'Blancas' }).click();
  await page.locator('textarea').fill(PGN);
  await page.getByRole('button', { name: 'Leer y revisar' }).click();
  await expect(page.getByText(/Se agregan 5 jugadas tuyas y 4 del rival/)).toBeVisible();
  await shot(page, '02-revision-importacion');
  await page.getByRole('button', { name: 'Guardar en el repertorio' }).click();
  await expect(page.getByRole('heading', { name: 'Repertorio' })).toBeVisible();
  await shot(page, '03-repertorio');

  // Inicio: hay nuevas para aprender
  await page.getByRole('link', { name: 'Hoy' }).click();
  await expect(page.getByText(/Hoy toca aprender 5 nuevas/)).toBeVisible();
  await shot(page, '04-inicio');
  await page.getByRole('button', { name: 'Estudiar' }).click();

  // Primera tarjeta nueva: 1.e4 — se muestra, se juega, se pide sin ayuda
  await expect(page.getByText('Posición nueva: jugá e4')).toBeVisible();
  await expect(page.getByText('Centro y desarrollo rápido.')).toBeVisible();
  await shot(page, '05-aprender');
  await move(page, 'e2e4');
  await expect(page.getByText('¿Qué jugás acá?')).toBeVisible();
  await move(page, 'e2e4');

  // Encadenada: el rival responde 1...e5 y toca ♘f3 (nueva)
  await expect(page.getByText(`Posición nueva: jugá ♞${FIG}f3`)).toBeVisible({ timeout: 5000 });
  await move(page, 'g1f3');
  await expect(page.getByText('¿Qué jugás acá?')).toBeVisible();
  // Error a propósito, después "error de dedo", después la correcta
  await move(page, 'b1c3');
  await expect(page.getByText(/No es esa/)).toBeVisible();
  await shot(page, '06-fallo');
  await page.getByRole('button', { name: 'Fue un error de dedo' }).click();
  await expect(page.getByText('¿Qué jugás acá?')).toBeVisible();
  await move(page, 'g1f3');

  // Sigue la línea hasta el final de la sesión
  const done = page.getByText('Sesión terminada.');
  const show = page.getByText(/Posición nueva: jugá/);
  for (let i = 0; i < 6; i++) {
    await expect(show.or(done)).toBeVisible({ timeout: 6000 });
    if (await done.isVisible()) break;
    const san = (await show.textContent())!.replace('Posición nueva: jugá ', '');
    const uci = UCI[san];
    expect(uci, `jugada inesperada ${san}`).toBeTruthy();
    await move(page, uci);
    await expect(page.getByText('¿Qué jugás acá?')).toBeVisible();
    await move(page, uci);
  }
  await expect(done).toBeVisible();
  await expect(page.getByText(/5 aciertos y 0 fallos/)).toBeVisible();
  await shot(page, '07-fin-sesion');
  await page.getByRole('button', { name: 'Volver al inicio' }).click();
  await expect(page.getByText(/Estás al día|vencen hoy|vence hoy/)).toBeVisible();

  // Progreso
  await page.getByRole('link', { name: 'Progreso' }).click();
  await expect(page.getByRole('heading', { name: 'Blancas' })).toBeVisible();
  await shot(page, '08-progreso');

  // Editor: navegar, agregar una respuesta del rival y reemplazar una propia
  await page.getByRole('link', { name: 'Repertorio' }).click();
  await page.locator('main').getByRole('button', { name: /^1\.e4 / }).first().click();
  await expect(page.getByRole('heading', { name: 'Respuestas del rival' })).toBeVisible();
  await move(page, 'c7c5'); // agrega 1...c5
  await expect(page.getByRole('heading', { name: 'Tu jugada desde acá' })).toBeVisible();
  await move(page, 'g1f3'); // 2.♘f3 tras 1...c5
  await expect(page.getByRole('heading', { name: 'Respuestas del rival' })).toBeVisible();
  await page.getByRole('button', { name: 'Una jugada atrás' }).click();
  await expect(page.getByRole('heading', { name: 'Tu jugada desde acá' })).toBeVisible();
  await move(page, 'b1c3'); // reemplazar 2.♘f3 por 2.♘c3
  await expect(page.getByText(/¿Reemplazarla por/)).toBeVisible();
  await page.getByRole('button', { name: 'Reemplazar' }).click();
  await expect(page.getByRole('heading', { name: 'Respuestas del rival' })).toBeVisible();
  await page.getByRole('button', { name: 'Ir al inicio' }).click();
  await shot(page, '09-editor');

  // Ajustes: modo oscuro, tablero, piezas y respaldo
  await page.getByRole('link', { name: 'Hoy' }).click();
  await page.getByRole('link', { name: 'Ajustes' }).click();
  await page.getByRole('radio', { name: 'Oscuro' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-scheme', 'dark');
  await page.getByRole('radio', { name: 'Salvia' }).click();
  await page.getByRole('radio', { name: 'Mérida' }).click();
  await expect(page.locator('body')).toHaveClass(/board-slate/);
  await shot(page, '10-ajustes-oscuro');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Hacer un respaldo' }).click();
  expect((await download).suggestedFilename()).toMatch(/^cavallchess-\d{4}-\d{2}-\d{2}\.json$/);
  await page.getByRole('link', { name: 'Hoy' }).click();
  await shot(page, '11-inicio-oscuro');

  expect(errors).toEqual([]);
});

test('el motor analiza en el editor', async ({ page }) => {
  await page.goto('/');
  await skipIntro(page);
  await page.goto('/#/repertoire/white');
  await page.getByRole('switch', { name: '' }).last().click();
  await expect(page.getByText(/prof\. \d+/)).toBeVisible({ timeout: 20000 });
  await shot(page, '12-motor');
});

test('repertorio con negras: el tablero se invierte y la línea se reproduce', async ({ page }) => {
  await page.goto('/');
  await skipIntro(page);
  await page.goto('/#/import');
  await page.getByRole('radio', { name: 'Pegar PGN' }).click();
  await page.getByRole('radio', { name: 'Negras' }).click();
  await page.locator('textarea').fill('1. e4 c5 2. Nf3 d6 *');
  await page.getByRole('button', { name: 'Leer y revisar' }).click();
  await expect(page.getByText(/Se agregan 2 jugadas tuyas y 2 del rival a tu repertorio con negras/)).toBeVisible();
  await page.getByRole('button', { name: 'Guardar en el repertorio' }).click();
  await page.getByRole('link', { name: 'Hoy' }).click();
  await page.getByRole('button', { name: 'Estudiar' }).click();
  await expect(page.locator('.cg-wrap.orientation-black')).toBeVisible();
  await expect(page.getByText('Posición nueva: jugá c5')).toBeVisible();
  await move(page, 'c7c5', 'black');
  await expect(page.getByText('¿Qué jugás acá?')).toBeVisible();
  await move(page, 'c7c5', 'black');
  await expect(page.getByText('Posición nueva: jugá d6')).toBeVisible();
  await move(page, 'd7d6', 'black');
  await move(page, 'd7d6', 'black');
  await expect(page.getByText('Sesión terminada.')).toBeVisible();
  await shot(page, '13-negras');
});

test('entrenamiento: el aviso de una trampa a favor, con un fallo y a la primera', async ({ page }) => {
  await page.goto('/');
  await skipIntro(page);
  await page.goto('/#/import');
  await page.getByRole('radio', { name: 'Pegar PGN' }).click();
  await page.getByRole('radio', { name: 'Blancas' }).click();
  await page
    .locator('textarea')
    .fill('1. e4 e5 2. Nf3 d6 3. Bc4 Bg4 4. Nc3 g6 { [%trap favor t/legal Mate de Legal] } 5. Nxe5 *');
  await page.getByRole('button', { name: 'Leer y revisar' }).click();
  await expect(page.getByText(/Se agregan 5 jugadas tuyas y 4 del rival/)).toBeVisible();
  await page.getByRole('button', { name: 'Guardar en el repertorio' }).click();
  await expect(page.getByRole('heading', { name: 'Repertorio' })).toBeVisible();
  await page.getByRole('link', { name: 'Hoy' }).click();
  await page.getByRole('button', { name: 'Estudiar' }).click();

  // Cada jugada nueva se muestra y después se pide; hasta 4.♘c3 sin errores.
  for (const uci of ['e2e4', 'g1f3', 'f1c4', 'b1c3', 'f3e5']) {
    await expect(page.getByText(/Posición nueva: jugá/)).toBeVisible({ timeout: 6000 });
    await move(page, uci);
    await expect(page.getByText('¿Qué jugás acá?')).toBeVisible();
    if (uci === 'f3e5') break;
    await move(page, uci);
  }

  // Tras 4...g6, el castigo es 5.♘xe5: primero un fallo a propósito.
  await move(page, 'h2h3');
  await expect(page.getByText(/No es esa/)).toBeVisible();
  await move(page, 'f3e5');
  await expect(
    page.getByText('Trampa: Mate de Legal. El rival cayó, pero no encontraste el castigo a la primera.'),
  ).toBeVisible({ timeout: 6000 });
  await page.waitForTimeout(400);
  await shot(page, '15-trampa-fallo');

  // La fallada vuelve al final de la sesión: ahora sale a la primera.
  await expect(page.getByText('¿Qué jugás acá?')).toBeVisible({ timeout: 6000 });
  await move(page, 'f3e5');
  await expect(page.getByText('Sesión terminada.')).toBeVisible({ timeout: 6000 });
  await expect(page.getByText('Trampa: Mate de Legal. El rival cayó.', { exact: true })).toBeVisible();
  await expect(page.getByText(/no encontraste el castigo/)).toBeHidden();
  await page.waitForTimeout(600);
  await shot(page, '16-trampa-fin');
});

test('los sets de piezas cambian las imágenes', async ({ page }) => {
  await page.goto('/');
  await skipIntro(page);
  await page.goto('/#/settings');
  const knight = page.locator('piece.knight.white').first();
  const image = () => knight.evaluate((el) => getComputedStyle(el).backgroundImage);
  // Por defecto, Papercut gris; la miniatura del selector carga (respeta el base path).
  await expect(page.locator('body')).toHaveClass(/pieces-papercut-gris/);
  const gris = page.getByRole('radio', { name: 'Papercut gris' });
  await expect(gris).toHaveAttribute('aria-checked', 'true');
  await expect
    .poll(() => gris.locator('img').first().evaluate((el) => (el as HTMLImageElement).naturalWidth))
    .toBeGreaterThan(0);
  const papercutGris = await image();
  await page.getByRole('radio', { name: 'Clásicas' }).click();
  await expect(page.locator('body')).toHaveClass(/pieces-cburnett/);
  const classic = await image();
  expect(classic).not.toBe(papercutGris);
  await page.getByRole('radio', { name: 'Mérida' }).click();
  await expect(page.locator('body')).toHaveClass(/pieces-merida/);
  const merida = await image();
  expect(merida).not.toBe(classic);
  // Con el teclado: la flecha elige el set siguiente (Chessnut) y vuelve.
  await page.getByRole('radio', { name: 'Mérida' }).press('ArrowRight');
  await expect(page.locator('body')).toHaveClass(/pieces-chessnut/);
  await expect(page.getByRole('radio', { name: 'Chessnut' })).toBeFocused();
  expect(await image()).not.toBe(merida);
  await page.getByRole('radio', { name: 'Chessnut' }).press('ArrowLeft');
  await expect(page.locator('body')).toHaveClass(/pieces-merida/);
  await page.getByRole('radio', { name: 'Azul' }).click();
  await expect(page.locator('body')).toHaveClass(/board-blue/);
  await page.locator('piece.knight.white').first().scrollIntoViewIfNeeded();
  await shot(page, '14-merida-azul');
});
