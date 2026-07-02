import { test, expect } from '@playwright/test';

test.describe('Dashboard page', () => {
  test('renders dashboard heading and metric labels', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();

    // Verify all five metric labels are present
    await expect(page.getByText('Ingresos')).toBeVisible();
    await expect(page.getByText('Costo Mercancía')).toBeVisible();
    await expect(page.getByText('Ganancia Bruta')).toBeVisible();
    await expect(page.getByText('Gastos Fijos')).toBeVisible();
    await expect(page.getByText('Ganancia Neta')).toBeVisible();
  });

  test('renders navigation links', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('link', { name: 'Lotes' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Ventas' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Clientes' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Proveedores' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Gastos Fijos' })).toBeVisible();
  });

  test('session persists across navigation', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();

    // Navigate to lotes and back
    await page.getByRole('link', { name: 'Lotes' }).click();
    await expect(page.getByRole('heading', { name: 'Lotes' })).toBeVisible();

    await page.getByRole('link', { name: 'Dashboard' }).click();
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  });
});