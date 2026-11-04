import { expect, test } from '@playwright/test';

// The installable, offline app: the manifest, the icons, and the service worker precache (TEC-1).

/**
 * Collect console errors, page errors, failed requests, and HTTP errors of a page.
 * @param {import('@playwright/test').Page} page the page to watch
 * @returns {string[]} the problems, filled as they happen
 */
function watch(page) {
  const problems = [];
  page.on('console', (message) => {
    if (message.type() === 'error') {
      problems.push(`console: ${message.text()}`);
    }
  });
  page.on('pageerror', (error) => problems.push(`page: ${error.message}`));
  page.on('requestfailed', (request) => problems.push(`request: ${request.url()}`));
  page.on('response', (response) => {
    if (response.status() >= 400) {
      problems.push(`HTTP ${response.status()}: ${response.url()}`);
    }
  });
  return problems;
}

/**
 * Wait until the shell has rendered its first route.
 * @param {import('@playwright/test').Page} page the page
 */
async function ready(page) {
  await expect(page.locator('html[data-shell="ready"]')).toHaveCount(1);
}

test('after one online visit the app reloads and navigates offline', async ({ page, context }) => {
  const problems = watch(page);
  await page.goto('/');
  await ready(page);
  await page.evaluate(() => navigator.serviceWorker.ready);
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);

  await context.setOffline(true);
  await page.reload();
  await ready(page);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('All tasks');
  await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Lists' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Lists');
  await expect(page.locator('[data-view="lists"]')).toHaveCount(1);
  await context.setOffline(false);
  expect(problems).toEqual([]);
});

test('the manifest is served with its type and makes the app installable', async ({ page }) => {
  const problems = watch(page);
  await page.goto('/');
  await ready(page);
  const href = await page.locator('link[rel="manifest"]').getAttribute('href');
  const response = await page.request.get(href);
  expect(response.headers()['content-type']).toBe('application/manifest+json');
  const manifest = await response.json();
  expect(manifest).toMatchObject({ name: "ToDo's", short_name: "ToDo's", start_url: './', scope: './', display: 'standalone' });
  expect(manifest.theme_color).toMatch(/^#[0-9a-f]{6}$/);
  expect(manifest.background_color).toMatch(/^#[0-9a-f]{6}$/);
  for (const size of ['192x192', '512x512']) {
    const icon = manifest.icons.find((entry) => entry.sizes === size && entry.type === 'image/png');
    const image = await page.request.get(icon.src);
    expect(image.headers()['content-type']).toBe('image/png');
  }
  await page.evaluate(() => navigator.serviceWorker.ready);
  const cdp = await page.context().newCDPSession(page);
  const { installabilityErrors } = await cdp.send('Page.getInstallabilityErrors');
  expect(installabilityErrors).toEqual([]);
  expect(problems).toEqual([]);
});
