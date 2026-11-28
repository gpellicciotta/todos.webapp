import { expect, test } from '@playwright/test';
import { VERSION } from '../../src/js/version.js';

// The Help screen: opened from the user menu, searchable, filterable by topic, and readable offline after a first visit.

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
 * Open the app at a route and wait until the shell has rendered it.
 * @param {import('@playwright/test').Page} page the page
 * @param {string} hash the route
 */
async function open(page, hash) {
  await page.goto(`/${hash}`);
  await expect(page.locator('html[data-shell="ready"]')).toHaveCount(1);
}

for (const [size, viewport] of [['wide', { width: 1440, height: 900 }], ['compact', { width: 390, height: 844 }]]) {
  test.describe(`at ${size} width`, () => {
    test.use({ viewport });

    test('the user menu opens Help, which shows the five panels and no horizontal scroll', async ({ page }) => {
      const problems = watch(page);
      await open(page, '#/tasks');
      await page.getByRole('button', { name: 'Local User' }).click();
      await page.getByRole('menuitem', { name: 'Help' }).click();
      await expect(page).toHaveURL(/#\/help$/);
      await expect(page.locator('#app-title')).toHaveText('Help');
      await expect(page.locator('[data-help-page-section] > h2')).toHaveText([
        'Application Info & Support', "Welcome to ToDo's", 'Getting Started Tutorial', 'Frequently Asked Questions', 'Release notes',
      ]);
      await expect(page.locator('[data-help-page-topics="info"]')).toContainText(`Version ${VERSION} · Built `);
      await expect(page.locator('.loading')).toHaveCount(0);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
      expect(problems).toEqual([]);
    });

    test('searching "shortcut" finds the keyboard FAQ, and the Release notes chip shows the current version', async ({ page }) => {
      const problems = watch(page);
      await open(page, '#/help');
      await page.getByRole('searchbox', { name: 'Search help' }).fill('shortcut');
      await expect(page.getByRole('button', { name: 'Which keyboard shortcuts can I use?' })).toBeVisible();
      await page.getByRole('button', { name: 'Reset Search' }).or(page.getByRole('button', { name: 'Clear search' })).first().click();
      await page.getByRole('button', { name: 'Release notes', exact: true }).click();
      await expect(page.locator('[data-help-page-release-notes]')).toContainText(VERSION.replace(/-pre$/, ''));
      expect(problems).toEqual([]);
    });

    test('a direct link filters by search and topic, and a later link changes the filter', async ({ page }) => {
      const problems = watch(page);
      await open(page, '#/help?topic=faq&q=shortcut');
      await expect(page).toHaveURL(/#\/help\?topic=faq&q=shortcut$/);
      await expect(page.locator('#app-title')).toHaveText('Help');
      await expect(page.getByRole('searchbox', { name: 'Search help' })).toHaveValue('shortcut');
      await expect(page.locator('[data-help-page-section]:not([hidden])')).toHaveCount(1);
      await expect(page.getByRole('button', { name: 'Which keyboard shortcuts can I use?' })).toBeVisible();
      await page.evaluate(() => {
        location.hash = '#/help?topic=welcome';
      });
      await expect(page.getByRole('searchbox', { name: 'Search help' })).toHaveValue('');
      await expect(page.locator('[data-help-page-section]:not([hidden]) > h2')).toHaveText(["Welcome to ToDo's"]);
      expect(problems).toEqual([]);
    });

    test('Help reloads offline after a first visit', async ({ page, context }) => {
      await open(page, '#/help');
      await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
      await expect(page.locator('.loading')).toHaveCount(0);
      await page.reload();
      await expect(page.locator('html[data-shell="ready"]')).toHaveCount(1);
      await expect(page.locator('[data-help-page-section] > h2')).toHaveCount(5);
      await context.setOffline(true);
      try {
        await page.reload();
        await expect(page.locator('html[data-shell="ready"]')).toHaveCount(1);
        await expect(page.locator('[data-help-page-section] > h2')).toHaveText([
          'Application Info & Support', "Welcome to ToDo's", 'Getting Started Tutorial', 'Frequently Asked Questions', 'Release notes',
        ]);
        await expect(page.getByRole('button', { name: 'Retry' })).toHaveCount(0);
      }
      finally {
        await context.setOffline(false);
      }
    });

    test('Settings no longer lists the keyboard shortcuts or an About section', async ({ page }) => {
      await open(page, '#/settings');
      await expect(page.getByRole('heading', { name: 'Keyboard shortcuts' })).toHaveCount(0);
      await expect(page.getByRole('heading', { name: 'About' })).toHaveCount(0);
      await expect(page.locator('.settings kbd')).toHaveCount(0);
    });
  });
}
