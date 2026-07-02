import { test, expect } from '@playwright/test';

test.describe('Proveedores page', () => {
  test('renders Proveedores heading', async ({ page }) => {
    await page.goto('/proveedores');
    await expect(page.getByRole('heading', { name: 'Proveedores' })).toBeVisible();
  });

  test('renders table with seeded proveedores', async ({ page }) => {
    await page.goto('/proveedores');

    // Seed creates 2 proveedores
    await expect(page.getByText('Proveedor Queso Doble Crema')).toBeVisible();
    await expect(page.getByText('Proveedor Queso Semisalado')).toBeVisible();
  });

  test('renders Agregar Proveedor button', async ({ page }) => {
    await page.goto('/proveedores');

    await expect(page.getByRole('button', { name: /agregar proveedor/i })).toBeVisible();
  });

  test('renders navigation links', async ({ page }) => {
    await page.goto('/proveedores');

    await expect(page.getByRole('link', { name: 'Dashboard' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Lotes' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Proveedores' })).toBeVisible();
  });
});