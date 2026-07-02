import { test, expect } from '@playwright/test';

test.describe('Invalid credentials', () => {
  test('shows error message with wrong password', async ({ page }) => {
    await page.goto('/login');

    await page.getByLabel('Email').fill('admin@riquesos.com');
    await page.getByLabel('Contraseña').fill('wrongpassword');

    await page.getByRole('button', { name: 'Iniciar Sesión' }).click();

    // Should show error message
    await expect(page.getByRole('alert')).toBeVisible();
    await expect(page.getByText('Credenciales inválidas')).toBeVisible();

    // Should stay on login page
    await expect(page).toHaveURL('/login');
  });

  test('shows error message with non-existent email', async ({ page }) => {
    await page.goto('/login');

    await page.getByLabel('Email').fill('nonexistent@riquesos.com');
    await page.getByLabel('Contraseña').fill('anypassword');

    await page.getByRole('button', { name: 'Iniciar Sesión' }).click();

    await expect(page.getByRole('alert')).toBeVisible();
    await expect(page).toHaveURL('/login');
  });
});