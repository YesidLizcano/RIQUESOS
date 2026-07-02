import { test, expect } from '@playwright/test';

test.describe('Pagination controls', () => {
  test('renders page size selector on Proveedores page', async ({ page }) => {
    // Proveedores has 2 seeded items, so the DataTable is rendered with pagination
    await page.goto('/proveedores');

    await expect(page.getByRole('heading', { name: 'Proveedores' })).toBeVisible();

    // The "Filas por página" label should be visible (DataTable renders it when data exists)
    await expect(page.getByText('Filas por página')).toBeVisible();
  });

  test('pagination navigation not shown for single page of data', async ({ page }) => {
    // With only 2 items and default page size of 20, only 1 page exists
    // The pagination nav (Anterior/Siguiente) only appears when totalPages > 1
    await page.goto('/proveedores');

    await expect(page.getByRole('heading', { name: 'Proveedores' })).toBeVisible();

    // "Página 1 de 1" text should NOT appear since showPagination requires totalPages > 1
    await expect(page.getByText(/Página \d+ de \d+/)).not.toBeVisible();
  });

  test('page size selector renders on Clientes page after adding data', async ({ page }) => {
    // Clientes page starts empty but we can add a client first
    await page.goto('/clientes');

    // Create a client so the table renders
    await page.getByRole('button', { name: /agregar cliente/i }).click();
    await page.getByLabel('Nombre').fill('Cliente Pagination Test');
    await page.getByRole('button', { name: 'Crear Cliente' }).click();
    await expect(page.getByText('Cliente Pagination Test')).toBeVisible();

    // Now the DataTable should be rendered with pagination
    await expect(page.getByText('Filas por página')).toBeVisible();
  });
});