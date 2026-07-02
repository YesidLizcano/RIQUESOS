import { test, expect } from '@playwright/test';

test.describe('Gastos page', () => {
  test('renders gastos heading', async ({ page }) => {
    await page.goto('/gastos');
    await expect(page.getByRole('heading', { name: 'Gastos Fijos' })).toBeVisible();
  });

  test('shows empty state when no gastos seeded', async ({ page }) => {
    await page.goto('/gastos');
    await expect(page.getByText('No hay gastos en el período seleccionado')).toBeVisible();
  });

  test('renders navigation links', async ({ page }) => {
    await page.goto('/gastos');
    await expect(page.getByRole('link', { name: 'Dashboard' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Lotes' })).toBeVisible();
  });
});