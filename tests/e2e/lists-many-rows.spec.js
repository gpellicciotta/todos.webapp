import { expect, test } from '@playwright/test';

// Long Lists screens: windowed rows, lazy row menus, roving focus, drag, and the restored scroll (`LST-15`, `TEC-16`).

const TOTAL = 300;
/** More rendered rows than this means the screen stopped windowing; 900 px show about 17 rows plus the buffers. */
const WINDOW_MAX = 80;

/**
 * Name the list at a place: "List 001" to "List 300", zero-padded so the name order is the number order.
 * @param {number} index the place, from 1
 * @returns {string} the name
 */
const nameAt = (index) => `List ${String(index).padStart(3, '0')}`;

/**
 * Open the app, store 300 lists, and open the Lists screen.
 * @param {import('@playwright/test').Page} page the page
 */
async function seed(page) {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/#/tasks');
  await expect(page.locator('html[data-shell="ready"]')).toHaveCount(1);
  await page.evaluate(async (count) => {
    const { openStore } = await import('/js/store/db.js');
    const store = await openStore({ broadcast: true });
    for (let index = 1; index <= count; index += 1) {
      await store.createList({ name: `List ${String(index).padStart(3, '0')}` });
    }
    store.close();
  }, TOTAL);
  await page.goto('/#/lists');
  await expect(page.locator('.lists-view__rows .list-item').first()).toHaveAttribute('aria-setsize', String(TOTAL));
}

/**
 * Count the rendered rows.
 * @param {import('@playwright/test').Page} page the page
 * @returns {Promise<number>} the count
 */
const rendered = (page) => page.locator('.lists-view__rows .list-item').count();

/**
 * Scroll the main column so a row's place shows 300 px below its top, clear of a drag's edge scrolling, and wait for the row.
 * @param {import('@playwright/test').Page} page the page
 * @param {number} index the place of the row, from 1
 * @returns {Promise<import('@playwright/test').Locator>} the row
 */
async function scrollToRow(page, index) {
  await page.locator('.app__main').evaluate((main, at) => {
    const rows = main.querySelector('.lists-view__rows');
    main.scrollTop += rows.getBoundingClientRect().top - main.getBoundingClientRect().top + (at - 1) * 48 - 300;
  }, index);
  const row = page.locator('.lists-view__rows .list-item').filter({ hasText: nameAt(index) });
  await expect(row).toBeInViewport();
  return row;
}

test('renders a window of the 300 rows, and scrolling to the end renders the last lists and no more', async ({ page }) => {
  await seed(page);
  expect(await rendered(page)).toBeLessThan(WINDOW_MAX);
  const height = await page.locator('.lists-view__rows').evaluate((rows) => rows.getBoundingClientRect().height);
  expect(height).toBeGreaterThanOrEqual(TOTAL * 48);
  expect(height).toBeLessThan(TOTAL * 48 + 48);
  await page.locator('.app__main').evaluate((main) => {
    main.scrollTop = main.scrollHeight;
  });
  await expect(page.locator('.lists-view__rows .list-item').filter({ hasText: nameAt(TOTAL) })).toBeInViewport();
  expect(await rendered(page)).toBeLessThan(WINDOW_MAX);
  // The first row stays rendered as the tab stop; its neighbor leaves.
  await expect(page.locator('.lists-view__rows .list-item').filter({ hasText: nameAt(2) })).toHaveCount(0);
  await expect(page.locator('.lists-view__rows .list-row[tabindex="0"]')).toContainText(nameAt(1));
});

test('rows use content-visibility with a 48 px intrinsic size and hold no menus until opened', async ({ page }) => {
  await seed(page);
  const style = await page.locator('.lists-view__rows .list-item').first().evaluate((element) => {
    const computed = getComputedStyle(element);
    return { visibility: computed.contentVisibility, size: computed.containIntrinsicBlockSize };
  });
  expect(style.visibility).toBe('auto');
  expect(style.size).toContain('48px');
  const height = await page.locator('.lists-view__rows .list-item').first().evaluate((element) => element.getBoundingClientRect().height);
  expect(height).toBe(48);
  await expect(page.locator('.lists-view__rows .menu')).toHaveCount(0);
  await page.getByRole('button', { name: `List actions: ${nameAt(2)}`, exact: true }).click();
  await expect(page.locator('.lists-view__rows .menu')).toHaveCount(1);
  await expect(page.getByRole('menuitem', { name: 'Edit list' })).toBeVisible();
});

test('Up, Down, Right, and Left move focus between rows and More buttons, with one tab stop', async ({ page }) => {
  await seed(page);
  const rows = page.locator('.lists-view__rows .list-row');
  await rows.first().focus();
  await page.keyboard.press('ArrowDown');
  await expect(rows.nth(1)).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('.lists-view__rows .list-item').nth(1).locator('.list-item__more')).toBeFocused();
  await page.keyboard.press('ArrowLeft');
  await expect(rows.nth(1)).toBeFocused();
  await expect(page.locator('.lists-view__rows .list-row[tabindex="0"]')).toHaveCount(1);
  await page.keyboard.press('Tab');
  await expect(page.locator('.lists-view__rows :focus')).toHaveCount(0);
});

test('Home, End, PageDown, and PageUp reach every list, scroll it into view, and keep one tab stop', async ({ page }) => {
  await seed(page);
  const rows = page.locator('.lists-view__rows .list-row');
  const focused = page.locator('.lists-view__rows .list-row:focus');
  await rows.first().focus();
  await page.keyboard.press('End');
  await expect(focused).toContainText(nameAt(TOTAL));
  await expect(focused).toBeInViewport();
  expect(await rendered(page)).toBeLessThan(WINDOW_MAX);
  await page.keyboard.press('ArrowUp');
  await expect(focused).toContainText(nameAt(TOTAL - 1));
  await page.keyboard.press('Home');
  await expect(focused).toContainText(nameAt(1));
  await expect(focused).toBeInViewport();
  await page.keyboard.press('PageDown');
  await expect(focused).not.toContainText(nameAt(1));
  await expect(focused).toBeInViewport();
  await expect(page.locator('.lists-view__rows .list-row[tabindex="0"]')).toHaveCount(1);
  // Tabbing away and back lands on the tab stop, though the window moved.
  await page.keyboard.press('End');
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Tab');
  await expect(focused).toContainText(nameAt(TOTAL));
});

test('dragging a row far down the windowed rows reorders the lists', async ({ page }) => {
  await seed(page);
  const row = await scrollToRow(page, 250);
  const handle = await row.locator('.list-item__handle').boundingBox();
  const below = await page.locator('.lists-view__rows .list-item').filter({ hasText: nameAt(252) }).boundingBox();
  await page.mouse.move(handle.x + handle.width / 2, handle.y + handle.height / 2);
  await page.mouse.down();
  await page.mouse.move(handle.x + handle.width / 2, below.y + below.height - 4, { steps: 8 });
  await page.mouse.up();
  await expect(page.locator('.lists-view__rows .list-item[aria-posinset="252"] .list-row__name')).toHaveText(nameAt(250));
  await expect(page.locator('.lists-view__rows .list-item[aria-posinset="250"] .list-row__name')).toHaveText(nameAt(251));
});

test('a Back from a list restores the scroll position of the 300 rows', async ({ page }) => {
  await seed(page);
  const row = await scrollToRow(page, 201);
  const before = await page.locator('.app__main').evaluate((main) => main.scrollTop);
  expect(before).toBeGreaterThan(1000);
  await row.locator('.list-row').click();
  await expect(page).toHaveURL(/#\/lists\/[^/]+$/);
  await page.goBack();
  await expect(page.locator('.lists-view__rows .list-item').first()).toHaveAttribute('aria-setsize', String(TOTAL));
  await expect.poll(() => page.locator('.app__main').evaluate((main) => main.scrollTop)).toBeGreaterThan(before - 200);
  await expect(page.locator('.lists-view__rows .list-item').filter({ hasText: nameAt(201) })).toBeInViewport();
});
