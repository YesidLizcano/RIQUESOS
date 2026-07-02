import { test as setup, expect } from '@playwright/test';

const authFile = '.auth/admin.json';

setup('authenticate as admin', async ({ page }) => {
  await page.goto('/login');

  await page.getByLabel('Email').fill('admin@riquesos.com');
  await page.getByLabel('Contraseña').fill('admin123');

  await page.getByRole('button', { name: 'Iniciar Sesión' }).click();

  // Wait for redirect to dashboard
  await page.waitForURL('/');

  // Verify we're authenticated by checking dashboard heading
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();

  // Save storage state
  await page.context().storageState({ path: authFile });
});