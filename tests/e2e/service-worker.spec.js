import { expect, test } from '@playwright/test';

// The service worker leaves the server paths /admin and /api alone (TEC-1, LOC-3).

test('offline, a navigation to /admin is not answered with the app shell', async ({ page, context }) => {
  await page.goto('/');
  await expect(page.locator('html[data-shell="ready"]')).toHaveCount(1);
  await page.evaluate(() => navigator.serviceWorker.ready);
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);

  await context.setOffline(true);
  const outcome = await page.goto('/admin').then(() => 'loaded', () => 'failed');
  await context.setOffline(false);
  expect(outcome).toBe('failed');
  await expect(page.locator('html[data-shell="ready"]')).toHaveCount(0);
});
