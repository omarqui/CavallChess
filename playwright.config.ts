import { defineConfig, devices } from '@playwright/test';

const port = Number(process.env.E2E_PORT ?? 4173);

export default defineConfig({
  testDir: 'e2e',
  timeout: 90_000,
  fullyParallel: false,
  reporter: 'list',
  use: {
    ...devices['iPhone 13'],
    baseURL: `http://127.0.0.1:${port}`,
    // Chrome del sistema (sin descargar navegadores) con viewport y touch de iPhone.
    browserName: 'chromium',
    channel: 'chrome',
    defaultBrowserType: 'chromium',
    serviceWorkers: 'block',
  },
  webServer: {
    command: `npx vite preview --port ${port} --strictPort --host 127.0.0.1`,
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: true,
  },
});
