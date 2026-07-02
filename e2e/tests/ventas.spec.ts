import { test, expect } from '@playwright/test';

test.describe('Ventas page', () => {
  test('renders ventas heading', async ({ page }) => {
    await page.goto('/ventas');
    await expect(page.getByRole('heading', { name: 'Ventas' })).toBeVisible();
  });

  test('shows empty state when no ventas seeded', async ({ page }) => {
    await page.goto('/ventas');
    await expect(page.getByText('No hay ventas en el período actual')).toBeVisible();
  });

  test('renders navigation links', async ({ page }) => {
    await page.goto('/ventas');
    await expect(page.getByRole('link', { name: 'Dashboard' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Lotes' })).toBeVisible();
  });
});