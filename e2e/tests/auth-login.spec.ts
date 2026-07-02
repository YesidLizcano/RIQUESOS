import { test, expect } from '@playwright/test';

test.describe('Valid login', () => {
  test('redirects to dashboard after valid credentials', async ({ page }) => {
    await page.goto('/login');

    await page.getByLabel('Email').fill('admin@riquesos.com');
    await page.getByLabel('Contraseña').fill('admin123');

    await page.getByRole('button', { name: 'Iniciar Sesión' }).click();

    // Should redirect to dashboard
    await expect(page).toHaveURL('/');
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  });
});