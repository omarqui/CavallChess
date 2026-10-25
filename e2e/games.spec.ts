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

/** Clave 'YYYY/MM' del archivo de hace `ago` meses (relativa a hoy, así el período "12 meses" las incluye). */
function monthKey(ago: number) {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - ago);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}`;
}
const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000);

test('partidas: historial, filtros y armar repertorio desde muchas', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  // Cinco meses de archivo: la primera actualización trae los 3 últimos y el historial, los 2 más viejos.
  const requested = await mockChesscom(page, {
    user: 'tester',
    months: {
      [monthKey(0)]: [
        { id: '1', white: 'tester', black: 'rival1', moves: '1. e4 c5 2. Nf3 d6', winner: 'white', end: daysAgo(1) },
        { id: '2', white: 'rival2', black: 'tester', moves: '1. d4 Nf6 2. c4 e6', winner: 'black', end: daysAgo(2) },
      ],
      [monthKey(1)]: [
        { id: '3', white: 'tester', black: 'rival3', moves: '1. e4 c5 2. Nf3 Nc6', winner: 'draw', end: daysAgo(31) },
      ],
      [monthKey(2)]: [
        { id: '4', white: 'rival4', black: 'tester', moves: '1. e4 e5 2. Nf3 Nc6', winner: 'white', end: daysAgo(61) },
      ],
      [monthKey(3)]: [
        { id: '5', white: 'tester', black: 'rival5', moves: '1. e4 e5 2. Nf3 Nc6', winner: 'white', end: daysAgo(91) },
      ],
      [monthKey(4)]: [
        { id: '6', white: 'rival6', black: 'tester', moves: '1. d4 d5 2. c4 e6', winner: 'black', end: daysAgo(121) },
      ],
    },
  });
  await page.goto('/');
  await skipIntro(page);
  await setChesscomUser(page, 'tester');
  await page.goto('/#/games');
  const counter = (text: string) => page.getByText(text, { exact: true });
  const scrollMain = (to: 'top' | 'bottom') =>
    page.locator('main').evaluate((el, t) => (el.scrollTop = t === 'top' ? 0 : el.scrollHeight), to);
  /** Cambia el tema del sistema (la app sigue "Sistema") y espera que terminen las transiciones de color. */
  const scheme = async (s: 'light' | 'dark') => {
    await page.emulateMedia({ colorScheme: s });
    await expect(page.locator('html')).toHaveAttribute('data-scheme', s);
    await page.waitForTimeout(400);
  };

  // 1. La primera actualización trae los últimos 3 meses.
  await page.getByRole('button', { name: 'Actualizar partidas' }).click();
  await expect(page.getByText('4 partidas nuevas')).toBeVisible();
  await expect(counter('4 partidas')).toBeVisible();

  // 2. "Cargar todo el historial" suma los 2 meses más viejos, una sola vez cada uno.
  await page.getByRole('button', { name: 'Cargar todo el historial' }).click();
  await expect(page.getByText('Sumaste 2 partidas.')).toBeVisible();
  await expect(counter('6 partidas')).toBeVisible();
  for (const ago of [3, 4]) expect(requested.filter((u) => u.endsWith(`/${monthKey(ago)}`))).toHaveLength(1);
  await expect(page.getByRole('button', { name: 'Actualizar partidas' })).toBeEnabled();

  // Cada fila lleva al visor de la partida.
  await expect(page.getByRole('link', { name: /vs rival6/ })).toHaveAttribute(
    'href',
    `#/games/${encodeURIComponent('https://www.chess.com/game/live/6')}`,
  );

  // 3. Filtros de color y de resultado, con su contador.
  await page.getByRole('radio', { name: 'Negras' }).click();
  await expect(counter('3 partidas')).toBeVisible();
  await expect(page.getByText('vs rival6')).toBeVisible();
  await expect(page.getByText('vs rival1')).toHaveCount(0);
  await page.getByLabel('Resultado').selectOption('desvios');
  await expect(counter('0 partidas')).toBeVisible();
  await expect(page.getByText('Ninguna partida con ese filtro.')).toBeVisible();
  await page.getByLabel('Resultado').selectOption('todas');
  await expect(counter('3 partidas')).toBeVisible();
  await page.getByRole('radio', { name: 'Todas' }).click();
  await expect(counter('6 partidas')).toBeVisible();
  await scrollMain('top');
  await shot(page, 'games-list-light');
  await page.getByRole('heading', { name: 'Tus partidas' }).evaluate((el) => el.scrollIntoView({ block: 'start' }));
  await shot(page, 'games-list-rows-light');
  await scrollMain('bottom');
  await shot(page, 'games-list-tools-light');
  await scheme('dark');
  await shot(page, 'games-list-tools-dark');
  await scrollMain('top');
  await shot(page, 'games-list-dark');
  await scheme('light');

  // 4. Armar desde muchas partidas. Con blancas: 1. e4 (3 partidas) c5 (2) 2. ♘f3; 1… e5 (1) no llega al mínimo.
  await page.getByRole('button', { name: 'Armar repertorio desde tus partidas' }).click();
  await expect(page).toHaveURL(/#\/games\/armar$/);
  await shot(page, 'games-build-light');
  await page.getByRole('button', { name: 'Ver vista previa' }).click();
  await expect(page.getByText('Se agregan 2 jugadas tuyas y 1 del rival')).toBeVisible();
  await expect(page.getByText('A partir de 3 partidas.')).toBeVisible();
  await expect(page.getByText('Esto copia lo que jugaste, incluidos los errores')).toBeVisible();
  await shot(page, 'games-build-preview-light');
  await scheme('dark');
  await shot(page, 'games-build-preview-dark');
  await page.getByRole('button', { name: 'Volver' }).click();
  await shot(page, 'games-build-dark');
  await scheme('light');

  // Con un mínimo de 3 partidas para el rival no entra c5: queda solo 1. e4.
  await page.getByRole('button', { name: 'Más partidas mínimas' }).click();
  await page.getByRole('button', { name: 'Ver vista previa' }).click();
  await expect(page.getByText('Se agregan 1 jugada tuya y 0 del rival')).toBeVisible();
  await page.getByRole('button', { name: 'Volver' }).click();
  await page.getByRole('button', { name: 'Menos partidas mínimas' }).click();

  // Negras de los últimos 3 meses: 2 partidas con primeras jugadas distintas del rival, ninguna llega al mínimo.
  await page.getByRole('radio', { name: 'Negras' }).click();
  await page.getByRole('radio', { name: '3 meses' }).click();
  await page.getByRole('button', { name: 'Ver vista previa' }).click();
  await expect(page.getByText('No hay suficientes partidas con ese filtro.')).toBeVisible();
  await page.getByRole('radio', { name: 'Blancas' }).click();
  await page.getByRole('radio', { name: 'Todo lo cargado' }).click();
  await expect(page.getByText('No hay suficientes partidas con ese filtro.')).toHaveCount(0);

  await page.getByRole('button', { name: 'Ver vista previa' }).click();
  await page.getByRole('button', { name: 'Guardar en el repertorio' }).click();
  await expect(page.getByText('Sumaste 3 jugadas, 2 para aprender.')).toBeVisible();
  await expect(page).toHaveURL(/#\/repertoire\/white$/);

  // Recalcular: con el repertorio nuevo, la partida de 1. e4 e5 pasa a ser una novedad del rival.
  await page.goto('/#/games');
  await page.getByRole('button', { name: 'Recalcular contra el repertorio actual' }).click();
  await expect(page.getByText('Recalculaste 6 partidas: 1 hueco.')).toBeVisible();
  await page.getByRole('radio', { name: 'Blancas' }).click();
  await page.getByLabel('Resultado').selectOption('novedades');
  await expect(counter('1 partida')).toBeVisible();
  await expect(page.getByText('vs rival5')).toBeVisible();

  expect(errors).toEqual([]);
});
