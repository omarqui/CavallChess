import { expect, test } from '@playwright/test';
import { shot, skipIntro } from './helpers';

test('biblioteca: catálogo por color y buscador', async ({ page }) => {
  await page.goto('/');
  await skipIntro(page);
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

  // La búsqueda mezcla colores: cada fila dice el suyo.
  await page.getByLabel('Buscar aperturas').fill('gambito de');
  await expect(page.getByRole('link', { name: /^Gambito de Rey[\s\S]*Con blancas/ })).toBeVisible();
  await expect(page.getByRole('link', { name: /^Gambito de Dama Aceptado[\s\S]*Con negras/ })).toBeVisible();
  await page.evaluate(() => document.querySelector('main')?.scrollTo(0, 0));
  await shot(page, '20b-biblioteca-busqueda');
});

test('biblioteca: si no carga, avisa y se puede reintentar', async ({ page }) => {
  // El trozo con las fichas (bundle-*.js) falla la primera vez (la bienvenida ya lo pide al abrir).
  let pedidos = 0;
  await page.route(/\/assets\/bundle-[^/]*\.js$/, (route) =>
    pedidos++ === 0 ? route.abort('internetdisconnected') : route.continue(),
  );
  await page.goto('/');
  await skipIntro(page);
  await page.getByRole('link', { name: 'Biblioteca' }).click();
  await expect(page.getByText('No se pudo cargar la biblioteca.')).toBeVisible();
  await shot(page, '23-biblioteca-error');
  // Chrome no vuelve a pedir un import() fallido: "Reintentar" termina recargando la página, que sí lo pide.
  await page.getByRole('button', { name: 'Reintentar' }).click();
  await expect(page.getByText('Sistema Londres')).toBeVisible();
  await expect(page.getByText('No se pudo cargar la biblioteca.')).toBeHidden();
  expect(pedidos).toBe(2);
});

test('ficha: leer y agregar al repertorio', async ({ page }) => {
  await page.goto('/');
  await skipIntro(page);
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
  await page.goto('/');
  await skipIntro(page);
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

test('ficha: una nota se guarda al pasar la app a segundo plano', async ({ page }) => {
  await page.clock.install();
  await page.goto('/');
  await skipIntro(page);
  await page.goto('/#/biblioteca/caro-kann?tab=apuntes');
  const nota = page.getByLabel('Sobre la apertura');
  await nota.waitFor();
  // Con el reloj quieto, los 600 ms sin teclear nunca se cumplen: solo el paso a segundo plano puede guardar.
  await page.clock.pauseAt(Date.now() + 2000);
  await nota.fill('Escrita justo antes de salir.');
  await page.waitForTimeout(300);
  await expect(page.getByText('Guardado')).toBeHidden();
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect(page.getByText('Guardado')).toBeVisible();
});

test('ficha: vaciar una nota de una línea que ya no está la borra recién al soltar el campo', async ({ page }) => {
  await page.goto('/');
  await skipIntro(page);
  await page.goto('/#/biblioteca/caro-kann?tab=apuntes');
  await page.getByLabel('Sobre la apertura').waitFor();
  // Una nota de una línea que la ficha ya no trae, escrita directo en la base.
  await page.evaluate(
    () =>
      new Promise<void>((resolve, reject) => {
        const req = indexedDB.open('cavallchess');
        req.onerror = () => reject(req.error);
        req.onsuccess = () => {
          const tx = req.result.transaction('notes', 'readwrite');
          tx.objectStore('notes').put({ id: 'caro-kann|vieja', text: 'Algo que anoté.', updatedAt: 1 });
          tx.oncomplete = () => {
            req.result.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
      }),
  );
  await page.reload();
  await expect(page.getByText('Notas de líneas que ya no están')).toBeVisible();
  const vieja = page.getByLabel('Nota vieja: Vieja');
  await expect(vieja).toHaveValue('Algo que anoté.');

  await vieja.fill('');
  await page.waitForTimeout(1200);
  await expect(vieja).toBeVisible();
  await expect(vieja).toBeFocused();

  await vieja.blur();
  await expect(page.getByText('Notas de líneas que ya no están')).toBeHidden();
  await page.reload();
  await page.getByLabel('Sobre la apertura').waitFor();
  await expect(page.getByText('Notas de líneas que ya no están')).toBeHidden();
});

test('visor: recorrer una línea y analizar', async ({ page }) => {
  await page.goto('/');
  await skipIntro(page);
  await page.goto('/#/biblioteca/caro-kann?tab=variantes');
  await page.getByRole('button', { name: 'Ver en el tablero' }).first().click();
  await page.getByRole('button', { name: 'Siguiente' }).click();
  await page.getByRole('button', { name: 'Siguiente' }).click();
  await page.getByRole('button', { name: 'Anterior' }).click();
  await page.getByLabel('Analizar').check();
  await expect(page.getByText(/Calculando|[+−-]\d/)).toBeVisible();
  await shot(page, '22-visor');
});
