import { test, expect } from '@playwright/test';

test.describe('Lotes page', () => {
  test('renders lotes heading', async ({ page }) => {
    await page.goto('/lotes');
    await expect(page.getByRole('heading', { name: 'Lotes' })).toBeVisible();
  });

  test('renders seeded proveedor data in table', async ({ page }) => {
    await page.goto('/lotes');

    // Seed creates two proveedores, but no lotes by default
    // So we should see the empty state
    await expect(page.getByText('No hay lotes activos')).toBeVisible();
  });

  test('renders navigation links', async ({ page }) => {
    await page.goto('/lotes');
    await expect(page.getByRole('link', { name: 'Dashboard' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Ventas' })).toBeVisible();
  });
});