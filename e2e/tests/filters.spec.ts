import { test, expect } from '@playwright/test';

test.describe('Filter and search controls', () => {
  test('search input renders on Clientes page', async ({ page }) => {
    // Create a client so the table renders
    await page.goto('/clientes');

    await page.getByRole('button', { name: /agregar cliente/i }).click();
    await page.getByLabel('Nombre').fill('Cliente Search Test');
    await page.getByRole('button', { name: 'Crear Cliente' }).click();
    await expect(page.getByText('Cliente Search Test')).toBeVisible();

    // Search input should be visible
    const searchInput = page.getByPlaceholder('Buscar clientes...');
    await expect(searchInput).toBeVisible();

    // Type a search term that matches the client
    await searchInput.fill('Search Test');
    await expect(page.getByText('Cliente Search Test')).toBeVisible();

    // Type a search term that matches nothing
    await searchInput.clear();
    await searchInput.fill('ZZZ_NONEXISTENT');
    await expect(page.getByText('No hay resultados')).toBeVisible();
  });

  test('column filter dropdown renders on Clientes page', async ({ page }) => {
    // Create a client so the table renders
    await page.goto('/clientes');

    await page.getByRole('button', { name: /agregar cliente/i }).click();
    await page.getByLabel('Nombre').fill('Cliente Filter Test');
    await page.getByRole('button', { name: 'Crear Cliente' }).click();
    await expect(page.getByText('Cliente Filter Test')).toBeVisible();

    // The Tipo filter label should be visible in the toolbar area
    // The filter select shows "Tipo" as its placeholder/label
    await expect(page.getByText('Tipo', { exact: true })).toBeVisible();
  });
});