import { expect, test } from '@playwright/test';

// The page's own requests must reach page.route, so the service worker stays off.
test.use({ serviceWorkers: 'block' });

/**
 * Open the index page with js/app.js blocked, so only the classic head scripts can apply a theme.
 * @param {import('@playwright/test').Page} page the page
 * @param {string|null} stored the raw `todos.theme` value, or null for none
 */
async function openWithoutApp(page, stored) {
  await page.route('**/js/app.js', (route) => route.abort());
  await page.goto('/');
  await page.evaluate((value) => {
    if (value === null) {
      localStorage.removeItem('todos.theme');
    }
    else {
      localStorage.setItem('todos.theme', value);
    }
  }, stored);
  await page.reload();
}

for (const theme of ['dark', 'light']) {
  test(`a stored ${theme} theme applies before the app module runs`, async ({ page }) => {
    await openWithoutApp(page, theme);
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
    await expect(page.locator('meta[name="color-scheme"]')).toHaveAttribute('content', theme);
    // The app module never ran, so the shell is absent.
    await expect(page.locator('.app__top-bar')).toHaveCount(0);
  });
}

test('without a stored theme the page follows the system theme', async ({ page }) => {
  await openWithoutApp(page, null);
  expect(await page.evaluate(() => document.documentElement.dataset.theme ?? null)).toBeNull();
  await expect(page.locator('meta[name="color-scheme"]')).toHaveAttribute('content', 'light dark');
});

test('choosing a theme in Settings stores it plain and keeps the color-scheme meta in step', async ({ page }) => {
  await page.goto('/#/settings');
  const meta = page.locator('meta[name="color-scheme"]');
  await page.getByRole('radio', { name: 'Dark' }).check();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(meta).toHaveAttribute('content', 'dark');
  expect(await page.evaluate(() => localStorage.getItem('todos.theme'))).toBe('dark');
  await page.getByRole('radio', { name: 'System' }).check();
  expect(await page.evaluate(() => document.documentElement.dataset.theme ?? null)).toBeNull();
  await expect(meta).toHaveAttribute('content', 'light dark');
  expect(await page.evaluate(() => localStorage.getItem('todos.theme'))).toBeNull();
});
