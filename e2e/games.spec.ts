import { expect, test, type Page } from '@playwright/test';
import { mockChesscom, type MockGame } from './chesscomMock';
import { move, shot, skipIntro } from './helpers';

/** Configura el usuario de Chess.com desde Ajustes (se guarda al salir del campo) y espera a verlo en Partidas. */
async function setChesscomUser(page: Page, user: string) {
  await page.goto('/#/settings');
  const input = page.getByLabel('Usuario de Chess.com');
  await input.fill(user);
  await input.blur();
  // Sin recargar (la escritura sigue en curso): Partidas lee los ajustes en vivo y muestra el usuario al guardarse.
  await page.evaluate(() => (location.hash = '#/games'));
  await expect(page.getByText(`Chess.com · ${user}`)).toBeVisible();
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
  await expect(page).toHaveURL(/#\/train\?card=.*&volver=/);
  const trainUrl = page.url();
  await expect(page.getByText(/Posición nueva: jugá ♞.f3/)).toBeVisible();

  // Al terminar el repaso suelto, el botón vuelve a la partida (no al inicio).
  // La nueva se muestra, se juega y después se pregunta.
  await move(page, 'g1f3');
  await expect(page.getByText('¿Qué jugás acá?')).toBeVisible();
  await move(page, 'g1f3');
  const back = page.getByRole('button', { name: 'Volver a la partida' });
  await expect(back).toBeVisible();
  await page.waitForTimeout(300);
  await shot(page, 'games-review-end-oscuro');
  await back.click();
  await expect(page.getByRole('heading', { name: 'vs rival2' })).toBeVisible();

  // ✕ también vuelve a la partida; un `volver` que no es una partida se ignora y ✕ va al inicio.
  await page.goto(trainUrl);
  await page.getByRole('button', { name: 'Terminar sesión' }).click();
  await expect(page.getByRole('heading', { name: 'vs rival2' })).toBeVisible();
  await page.goto(trainUrl.replace(/volver=[^&]*/, `volver=${encodeURIComponent('/settings')}`));
  await page.getByRole('button', { name: 'Terminar sesión' }).click();
  await expect(page).toHaveURL(/#\/$/);
  await page.emulateMedia({ colorScheme: 'light' });

  // Un enlace viejo.
  await page.goto(`/#/games/${encodeURIComponent('https://www.chess.com/game/live/999')}`);
  await expect(page.getByText('No encontramos esa partida')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Partidas' })).toBeVisible();

  expect(errors).toEqual([]);
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
  // Arriba: actualizar, el historial y las herramientas; la lista va al final.
  const showSection = (name: string) =>
    page.getByRole('heading', { name }).evaluate((el) => el.scrollIntoView({ block: 'start' }));
  await scrollMain('top');
  await shot(page, 'games-list-light');
  await showSection('Con tu repertorio');
  await shot(page, 'games-list-tools-light');
  await showSection('Tus partidas');
  await shot(page, 'games-list-rows-light');
  await scheme('dark');
  await shot(page, 'games-list-rows-dark');
  await showSection('Con tu repertorio');
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

/** Partidas de un mes, de la más reciente a la más vieja, una cada `stepH` horas desde hace `fromH`. */
function gamesOf(prefix: string, n: number, fromH: number, stepH = 1): MockGame[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `${prefix}${i + 1}`,
    white: 'tester',
    black: `${prefix}rival${i + 1}`,
    moves: '1. e4 e5 2. Nf3 Nc6',
    winner: i % 3 === 0 ? 'black' : 'white',
    end: new Date(Date.now() - (fromH + i * stepH) * 3_600_000),
    timeClass: (['blitz', 'rapid', 'bullet', 'daily'] as const)[i % 4],
  }));
}

test('partidas: "Ver más" pagina de a 50', async ({ page }) => {
  await mockChesscom(page, { user: 'tester', months: { [monthKey(0)]: gamesOf('p', 60, 2) } });
  await page.goto('/');
  await skipIntro(page);
  await setChesscomUser(page, 'tester');
  await page.getByRole('button', { name: 'Actualizar partidas' }).click();
  await expect(page.getByText('60 partidas nuevas')).toBeVisible();

  const list = page
    .locator('section')
    .filter({ has: page.getByRole('heading', { name: 'Tus partidas' }) })
    .getByRole('listitem');
  await expect(page.getByText('60 partidas', { exact: true })).toBeVisible();
  await expect(list).toHaveCount(50);
  // Ritmos en castellano.
  await expect(page.getByRole('link', { name: /vs prival2 · rápida · Ganaste/ })).toBeVisible();
  await expect(page.getByRole('link', { name: /vs prival4 · diaria/ })).toBeVisible();

  await page.getByRole('button', { name: 'Ver más' }).click();
  await expect(list).toHaveCount(60);
  await expect(page.getByRole('button', { name: 'Ver más' })).toHaveCount(0);
  await expect(page.getByText('vs prival60')).toBeVisible();
});

test('partidas: al volver de una partida, la lista conserva el filtro, las filas y el scroll', async ({ page }) => {
  // 130 partidas sin repertorio (todas fuera de él), mitad con negras: Negras muestra 65, de a 50.
  const games = gamesOf('q', 130, 2).map((g, i) => (i % 2 ? { ...g, white: g.black, black: 'tester' } : g));
  await mockChesscom(page, { user: 'tester', months: { [monthKey(0)]: games } });
  await page.goto('/');
  await skipIntro(page);
  await setChesscomUser(page, 'tester');
  await page.getByRole('button', { name: 'Actualizar partidas' }).click();
  await expect(page.getByText('130 partidas nuevas')).toBeVisible();

  const list = page
    .locator('section')
    .filter({ has: page.getByRole('heading', { name: 'Tus partidas' }) })
    .getByRole('listitem');
  // El contador no se anuncia con cada partida que guarda la actualización; sí al cambiar el filtro.
  const live = page.locator('section [aria-live="polite"]');
  await expect(live).toHaveText('');
  await page.getByRole('radio', { name: 'Negras' }).click();
  await page.getByLabel('Resultado').selectOption('fuera');
  await expect(page.getByText('65 partidas', { exact: true })).toBeVisible();
  await expect(live).toHaveText('Con este filtro: 65 partidas.');
  await expect(list).toHaveCount(50);
  await page.getByRole('button', { name: 'Ver más' }).click();
  await expect(list).toHaveCount(65);

  const row = page.getByRole('link', { name: /vs qrival120 / });
  await row.scrollIntoViewIfNeeded();
  const before = await row.boundingBox();
  await row.click();
  await expect(page.getByRole('heading', { name: 'vs qrival120' })).toBeVisible();
  await page.getByRole('link', { name: 'Partidas' }).click();

  await expect(page.getByRole('radio', { name: 'Negras' })).toBeChecked();
  await expect(page.getByLabel('Resultado')).toHaveValue('fuera');
  await expect(list).toHaveCount(65);
  await expect(row).toBeInViewport();
  const after = await row.boundingBox();
  expect(Math.abs(after!.y - before!.y)).toBeLessThan(4);
  await shot(page, 'games-list-volver');
});

test('partidas: cancelar la carga del historial y retomarla', async ({ page }) => {
  // La actualización trae los 3 meses más nuevos; el historial, los 4 anteriores (uno por mes, cada uno demorado).
  const months: Record<string, MockGame[]> = {};
  for (let ago = 0; ago < 7; ago++) months[monthKey(ago)] = gamesOf(`m${ago}-`, 1, 24 * 31 * ago + 30);
  await mockChesscom(page, { user: 'tester', months, delayMs: 700 });
  await page.goto('/');
  await skipIntro(page);
  await setChesscomUser(page, 'tester');
  await page.getByRole('button', { name: 'Actualizar partidas' }).click();
  await expect(page.getByText('3 partidas nuevas')).toBeVisible();

  await page.getByRole('button', { name: 'Cargar todo el historial' }).click();
  await expect(page.getByText(/^Leyendo \d{4}-\d{2} · 1 de 4$/)).toBeVisible();
  await expect(page.getByRole('progressbar', { name: 'Carga del historial' })).toBeVisible();
  await shot(page, 'games-list-history-progress-light');
  await page.getByRole('button', { name: 'Cancelar' }).click();
  const cancelled = page.getByRole('status').filter({ hasText: /^Cancelaste la carga\./ });
  await expect(cancelled).toHaveText(/^Cancelaste la carga\. Sumaste \d+ partidas?\. Quedan \d+ meses más viejos\.$/);
  await expect(page.getByRole('button', { name: 'Actualizar partidas' })).toBeEnabled();

  // Retomar sigue desde donde se cortó: al final están las 7, sin repetir ni saltear meses.
  await page.getByRole('button', { name: 'Cargar todo el historial' }).click();
  await expect(page.getByRole('status').filter({ hasText: /^Sumaste \d+ partidas?\.$/ })).toBeVisible();
  await expect(page.getByText('7 partidas', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Cargar todo el historial' }).click();
  await expect(page.getByText('Ya tenías todo el historial cargado.')).toBeVisible();
});
