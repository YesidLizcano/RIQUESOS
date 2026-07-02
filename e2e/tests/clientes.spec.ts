import { test, expect } from '@playwright/test';

test.describe('Clientes page', () => {
  test('renders clientes heading', async ({ page }) => {
    await page.goto('/clientes');
    await expect(page.getByRole('heading', { name: 'Clientes' })).toBeVisible();
  });

  test('shows empty state when no clientes seeded', async ({ page }) => {
    await page.goto('/clientes');
    await expect(page.getByText('No hay clientes registrados')).toBeVisible();
  });

  test('renders navigation links', async ({ page }) => {
    await page.goto('/clientes');
    await expect(page.getByRole('link', { name: 'Dashboard' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Lotes' })).toBeVisible();
  });
});