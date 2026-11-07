import { expect, test } from '@playwright/test';

// Long lists (TEC-16): rows taller than 48 px, and the first rows before the start-up maintenance.

const COUNT = 1200;
const TALL_PX = 96;
const BASE_PX = 48;
const VIEWPORT = { width: 1440, height: 900 };

/**
 * Store open tasks with a due time in the past that keep their status, in one bulk write.
 * @param {import('@playwright/test').Page} page a page of the app
 * @param {number} count the number of tasks
 * @returns {Promise<void>}
 */
function seed(page, count) {
  return page.evaluate(async (total) => {
    const { openStore } = await import('/js/store/db.js');
    const { uuid7 } = await import('/js/lib/uuid7.js');
    const store = await openStore({ broadcast: true });
    const time = new Date().toISOString();
    const tasks = Array.from({ length: total }, (_, index) => ({
      id: uuid7(), description: `Task ${String(index).padStart(4, '0')}`, status: 'todo', 'due-time': null,
      'overdue-handling': 'keep', 'owner-id': null, 'creation-time': time, 'last-update-time': time,
      'last-activity-time': time, 'deletion-time': null,
    }));
    await store.applyChanges(() => ({ changes: { put: { tasks } }, result: null }));
    store.close();
  }, count);
}

/**
 * Describe the rendered rows against the main column: the rows with their position, top, and height.
 * @param {import('@playwright/test').Page} page the page, showing All tasks
 * @returns {Promise<{rows: {pos: number, top: number, height: number}[], view: {top: number, bottom: number}}>} the rows
 */
function look(page) {
  return page.evaluate(() => {
    const view = document.querySelector('.app__main').getBoundingClientRect();
    const rows = [...document.querySelectorAll('.task-row')].map((row) => {
      const box = row.getBoundingClientRect();
      return { pos: Number(row.getAttribute('aria-posinset')), top: box.top, height: box.height };
    });
    return { rows, view: { top: view.top, bottom: view.bottom } };
  });
}

/**
 * Scroll the main column, to a position or by a distance, and wait until the rows rendered.
 * @param {import('@playwright/test').Page} page the page, showing All tasks
 * @param {number} top the scroll position in pixels
 * @param {boolean} [relative] whether `top` is a distance from the current position
 * @returns {Promise<void>}
 */
function scrollTo(page, top, relative = false) {
  return page.evaluate(async ({ value, by }) => {
    const main = document.querySelector('.app__main');
    main.scrollTop = by ? main.scrollTop + value : value;
    for (let frame = 0; frame < 3; frame += 1) {
      await new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve)));
    }
  }, { value: top, by: relative });
}

test.describe('rows taller than 48 px in a long list (TEC-16)', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(VIEWPORT);
    await page.goto('/#/tasks');
    await expect(page.locator('html[data-shell="ready"]')).toHaveCount(1);
    await seed(page, COUNT);
    // Every tenth position is two rows high, as a row with more content would be.
    await page.addInitScript((height) => {
      document.addEventListener('DOMContentLoaded', () => {
        const style = document.createElement('style');
        style.textContent = `.task-row[aria-posinset$='0'] { min-block-size: ${height}px; }`;
        document.head.append(style);
      });
    }, TALL_PX);
    await page.reload();
    await expect(page.locator('.task-row').first()).toBeVisible();
  });

  test('renders rows without gaps or overlaps that cover the view wherever the list is scrolled', async ({ page }) => {
    for (const top of [0, 7000, 31_000, 15_500, 120]) {
      await scrollTo(page, top);
      const { rows, view } = await look(page);
      expect(rows.length).toBeGreaterThan(10);
      expect(rows.length).toBeLessThan(80);
      for (const [index, row] of rows.entries()) {
        expect(row.height).toBe(row.pos % 10 === 0 ? TALL_PX : BASE_PX);
        if (index > 0) {
          expect(row.pos).toBe(rows[index - 1].pos + 1);
          expect(Math.abs(row.top - (rows[index - 1].top + rows[index - 1].height))).toBeLessThan(1);
        }
      }
      expect(rows[0].pos === 1 || rows[0].top <= view.top).toBe(true);
      expect(rows.at(-1).top + rows.at(-1).height).toBeGreaterThanOrEqual(view.bottom);
    }
  });

  test('reaches the end of the list with its last row at the bottom', async ({ page }) => {
    for (let pass = 0; pass < 4; pass += 1) {
      await scrollTo(page, 1e7);
    }
    const { rows, view } = await look(page);
    const last = rows.at(-1);
    expect(last.pos).toBe(COUNT);
    // The main column keeps some padding below the list.
    expect(view.bottom - (last.top + last.height)).toBeGreaterThanOrEqual(-1);
    expect(view.bottom - (last.top + last.height)).toBeLessThan(40);
  });

  test('keeps the rows in view where they are while rows above them are measured', async ({ page }) => {
    await scrollTo(page, 20_000);
    const { rows } = await look(page);
    const anchor = rows.find((row) => row.pos % 10 === 5 && row.top > 100);
    expect(anchor).toBeDefined();
    // Scrolling up renders the rows above, which are taller than the base height every tenth row.
    let shifted = 0;
    for (let step = 0; step < 40; step += 1) {
      await scrollTo(page, -25, true);
      shifted += 25;
      const now = (await look(page)).rows.find((row) => row.pos === anchor.pos);
      expect(Math.abs(now.top - (anchor.top + shifted))).toBeLessThan(2);
    }
  });
});

test('the first rows paint before the start-up maintenance ends (TEC-16)', async ({ page }) => {
  await page.goto('/#/tasks');
  await expect(page.locator('html[data-shell="ready"]')).toHaveCount(1);
  await seed(page, COUNT);
  await page.addInitScript(() => {
    new MutationObserver((changes, observer) => {
      if (document.querySelector('.task-row')) {
        window.shellAtFirstRows = document.documentElement.dataset.shell ?? 'starting';
        observer.disconnect();
      }
    }).observe(document, { childList: true, subtree: true });
  });
  await page.goto('about:blank');
  await page.goto('/#/tasks');
  await expect(page.locator('html[data-shell="ready"]')).toHaveCount(1);
  expect(await page.evaluate(() => window.shellAtFirstRows)).toBe('starting');
});
