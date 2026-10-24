import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  timeout: 90_000,
  fullyParallel: false,
  reporter: 'list',
  use: {
    ...devices['iPhone 13'],
    baseURL: 'http://127.0.0.1:4173',
    // Chrome del sistema (sin descargar navegadores) con viewport y touch de iPhone.
    browserName: 'chromium',
    channel: 'chrome',
    defaultBrowserType: 'chromium',
    serviceWorkers: 'block',
  },
  webServer: {
    command: 'npx vite preview --port 4173 --strictPort --host 127.0.0.1',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: true,
  },
});
