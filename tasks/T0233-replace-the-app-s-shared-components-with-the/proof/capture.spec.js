// Lossless switch proof harness (ADR-0007 of support.webapp): screenshots and computed-style snapshots.
// Run: PROOF_OUT=<folder> npx playwright test --config <this folder>/proof.config.js
// Each page renders the same seeded data under a fixed clock, at 390 and 1440 px, in light and dark.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';

const OUT = process.env.PROOF_OUT;
const VIEWPORTS = { 390: { width: 390, height: 844 }, 1440: { width: 1440, height: 900 } };
const THEMES = ['light', 'dark'];
const NOW = new Date('2026-11-12T10:00:00Z');

// Properties compared between the before and after snapshots.
const PROPS = [
  'display', 'position', 'inset-block-start', 'inset-block-end', 'inset-inline-start', 'inset-inline-end', 'z-index',
  'box-sizing', 'width', 'height', 'min-height', 'max-width',
  'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
  'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
  'border-top-width', 'border-right-width', 'border-bottom-width', 'border-left-width',
  'border-top-style', 'border-bottom-style', 'border-top-color', 'border-bottom-color', 'border-left-color', 'border-right-color',
  'border-top-left-radius', 'border-bottom-right-radius',
  'background-color', 'color', 'opacity', 'box-shadow', 'outline-style', 'outline-width', 'outline-color', 'outline-offset',
  'font-family', 'font-size', 'font-weight', 'line-height', 'letter-spacing', 'text-decoration-line', 'text-transform',
  'white-space', 'overflow-x', 'overflow-y', 'gap', 'row-gap', 'column-gap', 'align-items', 'justify-content',
  'flex-direction', 'flex-wrap', 'flex-grow', 'flex-shrink', 'flex-basis',
  'grid-template-columns', 'grid-template-rows', 'grid-area', 'visibility', 'fill', 'stroke', 'stroke-width', 'cursor',
];

/**
 * Seed lists, tasks, notes, and a recycle bin entry through a second store connection.
 * @param {import('@playwright/test').Page} page the app page
 * @returns {Promise<{listId: string, taskId: string}>} identifiers used by the routes
 */
function seed(page) {
  return page.evaluate(async () => {
    const { openStore } = await import('/js/store/db.js');
    const store = await openStore({ broadcast: true });
    const home = await store.createList({ name: 'Home', description: 'Chores and repairs around the house.' });
    const trip = await store.createList({ name: 'Trip to Lisbon' });
    await store.createList({ name: 'Groceries' });
    const paint = await store.createTask({ description: 'Buy blue paint', status: 'in-progress', 'due-time': '2026-11-10T09:00:00Z' }, { lists: [home.id] });
    await store.createTask({ description: 'Fix the kitchen tap', 'due-time': '2026-11-20T18:00:00Z' }, { lists: [home.id] });
    await store.createTask({ description: 'Clean the gutters', status: 'completed' }, { lists: [home.id] });
    await store.createTask({ description: 'Return the drill', status: 'cancelled' }, { lists: [home.id, trip.id] });
    await store.createTask({ description: 'Book flights' }, { lists: [trip.id] });
    await store.addNote(paint.id, { text: 'Matte finish, two liters.' });
    const gone = await store.createTask({ description: 'Old reminder' });
    await store.deleteTask(gone.id);
    store.close();
    return { listId: home.id, taskId: paint.id };
  });
}

/**
 * Snapshot the computed styles of every element of the page, keyed by a structural path.
 * @param {import('@playwright/test').Page} page the page
 * @returns {Promise<object>} path to property values
 */
function snapshot(page) {
  return page.evaluate((props) => {
    const result = {};
    const path = (element) => {
      const parts = [];
      for (let node = element; node && node.nodeType === 1; node = node.parentElement) {
        const siblings = node.parentElement ? [...node.parentElement.children].filter((child) => child.tagName === node.tagName) : [node];
        const classes = [...node.classList].sort().join('.');
        parts.unshift(`${node.tagName.toLowerCase()}${classes ? `.${classes}` : ''}:${siblings.indexOf(node) + 1}`);
      }
      return parts.join('>');
    };
    for (const element of [document.documentElement, ...document.querySelectorAll('body, body *')]) {
      if (element.closest('svg') && element.tagName.toLowerCase() !== 'svg') {
        continue;
      }
      const style = getComputedStyle(element);
      const box = element.getBoundingClientRect();
      const entry = { box: [box.x, box.y, box.width, box.height].map((value) => Math.round(value * 10) / 10).join(',') };
      for (const prop of props) {
        entry[prop] = style.getPropertyValue(prop);
      }
      result[path(element)] = entry;
    }
    return result;
  }, PROPS);
}

const PAGES = [
  { name: 'all-tasks', hash: () => '#/tasks' },
  { name: 'lists', hash: () => '#/lists' },
  { name: 'list', hash: ({ listId }) => `#/lists/${listId}` },
  { name: 'task-editor', hash: ({ listId, taskId }) => `#/lists/${listId}/tasks/${taskId}` },
  { name: 'list-editor', hash: ({ listId }) => `#/lists/${listId}/edit` },
  { name: 'settings', hash: () => '#/settings' },
  { name: 'bin', hash: () => '#/bin' },
  { name: 'user-menu', hash: () => '#/tasks', open: async (page) => {
    await page.locator('.app__top-bar [aria-haspopup], .app__top-bar .user-button, .app__top-bar .account-menu__button').first().click();
    await page.waitForTimeout(100);
  } },
  { name: 'account-menu', hash: () => '#/settings', open: async (page) => {
    await page.locator('.app__top-bar .user-button, .app__top-bar .account-menu__button').first().click();
    await page.waitForTimeout(100);
  } },
  // T0233 adds the shared components it replaces: a row menu, a confirm dialog, a field error, and an Undo toast.
  { name: 'row-menu', hash: ({ listId }) => `#/lists/${listId}`, open: async (page) => {
    await page.getByRole('button', { name: 'More actions for Fix the kitchen tap' }).click();
    await page.waitForTimeout(100);
  } },
  { name: 'dialog', hash: ({ listId }) => `#/lists/${listId}/edit`, open: async (page) => {
    await page.getByRole('button', { name: 'Delete list' }).click();
    await page.waitForTimeout(100);
  } },
  { name: 'field-error', hash: ({ listId, taskId }) => `#/lists/${listId}/tasks/${taskId}`, open: async (page) => {
    await page.getByRole('textbox', { name: 'Description' }).fill('');
    await page.getByRole('textbox', { name: 'Description' }).blur();
    await page.waitForTimeout(200);
  } },
  { name: 'toast', hash: ({ listId }) => `#/lists/${listId}`, open: async (page) => {
    await page.getByRole('button', { name: 'More actions for Buy blue paint' }).click();
    await page.getByRole('menuitem', { name: 'Delete' }).click();
    await page.locator('.toast').first().waitFor();
    await page.waitForTimeout(100);
  } },
];

for (const theme of THEMES) {
  for (const [width, viewport] of Object.entries(VIEWPORTS)) {
    test(`proof ${theme} ${width}`, async ({ page }) => {
      test.setTimeout(120_000);
      const problems = [];
      page.on('console', (message) => message.type() === 'error' && problems.push(`console: ${message.text()}`));
      page.on('pageerror', (error) => problems.push(`page: ${error.message}`));
      page.on('requestfailed', (request) => problems.push(`request: ${request.url()}`));
      page.on('response', (response) => response.status() >= 400 && problems.push(`HTTP ${response.status()}: ${response.url()}`));
      await page.clock.setFixedTime(NOW);
      await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' });
      await page.setViewportSize(viewport);
      await page.goto('/');
      await expect(page.locator('html[data-shell="ready"]')).toHaveCount(1);
      const ids = await seed(page);
      const folder = join(OUT, `${theme}-${width}`);
      mkdirSync(folder, { recursive: true });
      for (const entry of PAGES) {
        await page.goto(`/${entry.hash(ids)}`);
        await page.reload();
        await expect(page.locator('html[data-shell="ready"]')).toHaveCount(1);
        await page.evaluate(() => document.fonts.ready);
        await page.waitForTimeout(300);
        if (entry.open) {
          await entry.open(page);
        }
        await page.mouse.move(0, viewport.height - 1);
        await page.screenshot({ path: join(folder, `${entry.name}.png`) });
        writeFileSync(join(folder, `${entry.name}.json`), JSON.stringify(await snapshot(page), null, 1));
      }
      writeFileSync(join(folder, 'problems.json'), JSON.stringify(problems, null, 2));
      expect(problems).toEqual([]);
    });
  }
}
