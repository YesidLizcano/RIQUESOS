import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: 'list',
  globalSetup: require.resolve('./e2e/global-setup'),
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 120_000,
  },
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
    },
    {
      name: 'unauthenticated',
      testMatch: /auth-(login|invalid|redirect)\.spec\.ts/,
    },
    {
      name: 'authenticated',
      testMatch: /(dashboard|lotes|ventas|clientes|gastos|proveedores|crud-forms|pagination|filters|dark-mode)\.spec\.ts/,
      dependencies: ['setup'],
      use: {
        storageState: '.auth/admin.json',
      },
    },
  ],
});