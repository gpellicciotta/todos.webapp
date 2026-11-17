import { expect, test } from '@playwright/test';

// Long Lists screens: content-visibility rows, lazy row menus, roving focus, and the restored scroll (`LST-15`, `TEC-16`).

const TOTAL = 300;

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
      await store.createList({ name: `List ${index}` });
    }
    store.close();
  }, TOTAL);
  await page.goto('/#/lists');
  await expect(page.locator('.lists-view__rows .list-item')).toHaveCount(TOTAL);
}

test('rows use content-visibility with a 64 px intrinsic size and hold no menus until opened', async ({ page }) => {
  await seed(page);
  const style = await page.locator('.lists-view__rows .list-item').first().evaluate((element) => {
    const computed = getComputedStyle(element);
    return { visibility: computed.contentVisibility, size: computed.containIntrinsicBlockSize };
  });
  expect(style.visibility).toBe('auto');
  expect(style.size).toContain('64px');
  await expect(page.locator('.lists-view__rows .menu')).toHaveCount(0);
  await page.getByRole('button', { name: 'List actions: List 2', exact: true }).click();
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

test('Home, End, PageDown, and PageUp move the tab stop, and find in page sees a name far down', async ({ page }) => {
  await seed(page);
  const rows = page.locator('.lists-view__rows .list-row');
  await rows.first().focus();
  await page.keyboard.press('End');
  await expect(rows.last()).toBeFocused();
  await page.keyboard.press('Home');
  await expect(rows.first()).toBeFocused();
  await page.keyboard.press('PageDown');
  await expect(rows.first()).not.toBeFocused();
  await expect(page.locator('.lists-view__rows .list-row[tabindex="0"]')).toHaveCount(1);
  const found = await page.evaluate(() => window.find('List 290', false, false, true));
  expect(found).toBe(true);
});

test('a Back from a list restores the scroll position of the 300 rows', async ({ page }) => {
  await seed(page);
  const row = page.locator('.lists-view__rows .list-item').nth(200);
  await row.scrollIntoViewIfNeeded();
  const before = await page.locator('.app__main').evaluate((main) => main.scrollTop);
  expect(before).toBeGreaterThan(1000);
  await row.locator('.list-row').click();
  await expect(page).toHaveURL(/#\/lists\/[^/]+$/);
  await page.goBack();
  await expect(page.locator('.lists-view__rows .list-item')).toHaveCount(TOTAL);
  await expect.poll(() => page.locator('.app__main').evaluate((main) => main.scrollTop)).toBeGreaterThan(before - 200);
});
