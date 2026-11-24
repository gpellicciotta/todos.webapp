// Before and after capture for T0283: screenshots plus computed-style snapshots of key elements (ADR-0007).
// Run: $env:CAPTURE_OUT='<dir>'; npx playwright test --config work/t0283/capture.config.js
// Writes <out>/<theme>-<width>/<screen>.png and .json, and fails on console errors, page errors, or failed requests.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';

const OUT = process.env.CAPTURE_OUT;
const VIEWPORTS = { 390: { width: 390, height: 844 }, 1440: { width: 1440, height: 900 } };
const PROPS = [
  'display', 'color', 'background-color', 'border-top-color', 'border-bottom-color', 'border-inline-end-color',
  'border-top-width', 'border-bottom-width', 'border-radius', 'padding', 'margin', 'gap', 'font-family', 'font-size',
  'font-weight', 'line-height', 'box-shadow', 'outline-style', 'outline-color', 'outline-width', 'grid-template-columns',
];
const SELECTORS = [
  '.app', '.app__top-bar', '.app__title', '.app__top-actions', '.account-menu__button', '.app__sidebar', '.sidebar__brand',
  '.app__sidebar .nav-item[aria-current="page"]', '.app__sidebar .nav-item:not([aria-current])', '.app__main', '.app__view',
  '.view-header', '.app__action-bar', '.add-block', '.add-block .field__control', '.app__bottom-nav',
  '.app__bottom-nav .bottom-nav__item[aria-current="page"]', '.task-row', '.task-row__meta', '.list-row', '.bin-row',
  '.app__side-panel', '.editor-panel', '.tabs', '.tabs__tab[aria-selected="true"]', '.tabs__tab[aria-selected="false"]',
  '.field__control', '.switch', '.segmented', '.button--primary', '.button:not(.button--primary)', '.icon-button',
  '.checkbox', '.badge', '.chip', '.menu', '.menu__item', '.account-menu__panel', '.card', '.banner', '.fab', ':focus-visible',
];

/**
 * Seed two lists, open, overdue, done, and deleted tasks through a broadcasting store connection.
 * @param {import('@playwright/test').Page} page a page of the app
 * @returns {Promise<{ home: string, task: string }>} the Home list and its first task
 */
function seed(page) {
  return page.evaluate(async () => {
    const { openStore } = await import('/js/store/db.js');
    const store = await openStore({ broadcast: true });
    const hours = (count) => new Date(Date.now() + count * 3_600_000).toISOString();
    const home = await store.createList({ name: 'Home' });
    const work = await store.createList({ name: 'Work' });
    const first = await store.createTask({ description: 'Buy paint for the hallway', 'due-time': hours(50) }, { lists: [home.id] });
    await store.createTask({ description: 'Call the plumber', status: 'in-progress', 'due-time': hours(-26) }, { lists: [home.id] });
    await store.createTask({ description: 'Water the plants' }, { lists: [home.id] });
    await store.createTask({ description: 'Send the quarterly report', 'due-time': hours(5) }, { lists: [work.id] });
    const gone = await store.createTask({ description: 'Return the old brushes' }, { lists: [home.id] });
    await store.deleteTask(gone.id);
    store.close();
    return { home: home.id, task: first.id };
  });
}

/**
 * Write the screenshot and the computed styles of the key elements present on the page.
 * @param {import('@playwright/test').Page} page the page
 * @param {string} dir the output folder
 * @param {string} name the screen name
 * @param {boolean} [fullPage] whether to capture the whole page
 */
async function capture(page, dir, name, fullPage = false) {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(300); // let color transitions settle
  await page.screenshot({ path: join(dir, `${name}.png`), fullPage, animations: 'disabled' });
  const styles = await page.evaluate(([selectors, props]) => {
    const result = {};
    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (!element) {
        continue;
      }
      const style = getComputedStyle(element);
      const box = element.getBoundingClientRect();
      const entry = { box: `${Math.round(box.x)},${Math.round(box.y)} ${Math.round(box.width)}x${Math.round(box.height)}` };
      for (const prop of props) {
        entry[prop] = style.getPropertyValue(prop);
      }
      result[selector] = entry;
    }
    return result;
  }, [SELECTORS, PROPS]);
  writeFileSync(join(dir, `${name}.json`), `${JSON.stringify(styles, null, 2)}\n`);
}

for (const theme of ['light', 'dark']) {
  for (const width of [390, 1440]) {
    test(`${theme} ${width}`, async ({ page }) => {
      test.setTimeout(120_000);
      const dir = join(OUT, `${theme}-${width}`);
      mkdirSync(dir, { recursive: true });
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
      await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' });
      await page.setViewportSize(VIEWPORTS[width]);
      const response = await page.goto('/#/tasks');
      expect(response.status()).toBe(200);
      await expect(page.locator('html[data-shell="ready"]')).toHaveCount(1);
      const { home, task } = await seed(page);
      const shots = [
        ['all-tasks', '/#/tasks', '.task-row'],
        ['list', `/#/lists/${home}`, '.task-row'],
        ['lists', '/#/lists', '.list-row'],
        ['list-editor', `/#/lists/${home}/edit`, '.editor-panel'],
        ['task-editor', `/#/lists/${home}/tasks/${task}`, '.editor-panel'],
        ['bin', '/#/bin', '.bin-row'],
        ['settings', '/#/settings', '.app__view[data-view="settings"]'],
      ];
      for (const [name, route, selector] of shots) {
        await page.goto(route);
        await expect(page.locator(selector).first()).toBeVisible();
        await page.mouse.move(0, 0);
        await capture(page, dir, name);
      }
      // The account menu, opened by mouse.
      await page.goto('/#/tasks');
      await expect(page.locator('.task-row').first()).toBeVisible();
      await page.locator('.app__top-bar .account-menu__button').click();
      await expect(page.locator('.account-menu__panel')).toBeVisible();
      await page.mouse.move(0, 0);
      await capture(page, dir, 'user-menu');
      await page.keyboard.press('Escape');
      // Keyboard focus on the first task row's link shows the focus indicator.
      await page.goto(`/#/lists/${home}`);
      await expect(page.locator('.task-row').first()).toBeVisible();
      await page.keyboard.press('Shift');
      await page.locator('.task-row a').first().focus();
      await capture(page, dir, 'focus');
      // The app's style gallery, whole page.
      expect((await page.goto('/demo/visual-style-gallery.html')).status()).toBe(200);
      await page.evaluate(() => document.fonts.ready);
      await capture(page, dir, 'gallery', true);
      writeFileSync(join(dir, 'problems.json'), `${JSON.stringify(problems, null, 2)}\n`);
      expect(problems).toEqual([]);
    });
  }
}
