import { test, expect } from '@playwright/test';

test.describe('Dark mode toggle', () => {
  test('can toggle dark mode from sidebar', async ({ page }) => {
    await page.goto('/');

    // Verify we start without dark mode (default is system/light)
    // The html element gets class "dark" when dark mode is active
    const htmlElement = page.locator('html');

    // Find the theme toggle button in the sidebar
    const themeButton = page.getByRole('button', { name: /tema actual/i });
    await expect(themeButton).toBeVisible();

    // Click to switch to dark mode
    await themeButton.click();

    // Verify dark mode class is applied
    await expect(htmlElement).toHaveClass(/dark/);

    // Click again to switch away from dark mode
    await themeButton.click();

    // Verify dark mode class is removed (cycles to system)
    await expect(htmlElement).not.toHaveClass(/dark/);
  });

  test('theme toggle cycles through light, dark, system', async ({ page }) => {
    await page.goto('/');

    const themeButton = page.getByRole('button', { name: /tema actual/i });
    await expect(themeButton).toBeVisible();

    // The cycle is: light → dark → system → light
    // We just verify that clicking cycles the aria-label
    const initialLabel = await themeButton.getAttribute('aria-label');

    // Click to cycle
    await themeButton.click();
    const secondLabel = await themeButton.getAttribute('aria-label');
    expect(secondLabel).not.toBe(initialLabel);

    // Click again
    await themeButton.click();
    const thirdLabel = await themeButton.getAttribute('aria-label');
    expect(thirdLabel).not.toBe(secondLabel);
  });
});