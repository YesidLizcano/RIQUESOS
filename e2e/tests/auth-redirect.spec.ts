import { test, expect } from '@playwright/test';

test.describe('Protected route redirect', () => {
  test('redirects unauthenticated user to login page', async ({ page }) => {
    await page.goto('/');

    // Should redirect to /login
    await expect(page).toHaveURL(/\/login/);
  });

  test('redirects to login when accessing lotes without session', async ({ page }) => {
    await page.goto('/lotes');
    await expect(page).toHaveURL(/\/login/);
  });

  test('redirects to login when accessing ventas without session', async ({ page }) => {
    await page.goto('/ventas');
    await expect(page).toHaveURL(/\/login/);
  });
});