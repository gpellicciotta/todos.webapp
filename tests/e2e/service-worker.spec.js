import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';
import { startServer } from '../../scripts/serve.mjs';

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

// A new worker waits until the user clicks Update on the toast (TEC-19).

const SOURCE = fileURLToPath(new URL('../../src/', import.meta.url));

/**
 * Serve a copy of the app that a test can turn into a newer version.
 * @returns {Promise<{url: string, publishB: () => void, close: () => Promise<void>}>} the origin, the update step, and the cleanup
 */
async function serveVersions() {
  const root = mkdtempSync(join(tmpdir(), 'todos-sw-'));
  cpSync(SOURCE, root, { recursive: true });
  const server = await startServer({ root, port: 0 });
  const { port } = server.address();
  return {
    url: `http://127.0.0.1:${port}/`,
    publishB: () => {
      const worker = join(root, 'service-worker.js');
      writeFileSync(worker, readFileSync(worker, 'utf8').replace(/const VERSION = '[^']+';/, "const VERSION = 'version-b';"));
      const version = join(root, 'js', 'version.js');
      writeFileSync(version, readFileSync(version, 'utf8').replace(/BUILD_DATE = '[^']+'/, "BUILD_DATE = 'build-b'"));
    },
    close: () => new Promise((resolve) => {
      server.close(() => {
        rmSync(root, { recursive: true, force: true });
        resolve();
      });
    }),
  };
}

/**
 * Open the app and wait until the worker controls the page.
 * @param {import('@playwright/test').Page} page the page
 * @param {string} url the app URL
 */
async function openControlled(page, url) {
  await page.goto(url);
  await expect(page.locator('html[data-shell="ready"]')).toHaveCount(1);
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
}

/**
 * Read the build date the page's modules carry, which names the loaded version.
 * @param {import('@playwright/test').Page} page the page
 * @returns {Promise<string>} the build date, or `reloading` while a navigation destroys the page context
 */
const build = (page) => page.evaluate(async () => (await import('./js/version.js')).BUILD_DATE).catch(() => 'reloading');

test('a new version waits for Update, keeps the page on version A, then runs version B', async ({ page }) => {
  const versions = await serveVersions();
  try {
    await openControlled(page, versions.url);
    const buildA = await build(page);
    expect(buildA).not.toBe('build-b');
    await expect(page.locator('.toast__text', { hasText: 'A new version is ready' })).toHaveCount(0);

    versions.publishB();
    await page.reload();
    await expect(page.locator('html[data-shell="ready"]')).toHaveCount(1);
    await expect(page.locator('.toast__text', { hasText: 'A new version is ready' })).toBeVisible();
    expect(await build(page)).toBe(buildA);

    await page.getByRole('button', { name: 'Update' }).click();
    await expect.poll(() => build(page)).toBe('build-b');
    await expect(page.locator('html[data-shell="ready"]')).toHaveCount(1);
    await expect(page.locator('.toast__text', { hasText: 'A new version is ready' })).toHaveCount(0);
  }
  finally {
    await versions.close();
  }
});

test('a second tab open during the update shows the reload banner', async ({ page, context }) => {
  const versions = await serveVersions();
  try {
    await openControlled(page, versions.url);
    const other = await context.newPage();
    await openControlled(other, versions.url);

    versions.publishB();
    await page.reload();
    await page.getByRole('button', { name: 'Update' }).click();
    await expect.poll(() => build(page)).toBe('build-b');

    await expect(other.locator('.banner__text', { hasText: "ToDo's was updated in another tab. Reload to continue." })).toBeVisible();
    await expect(other.getByRole('button', { name: 'Reload' })).toBeVisible();
  }
  finally {
    await versions.close();
  }
});
