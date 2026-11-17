import { expect, test } from '@playwright/test';

// The sidebar find field, roving focus, and the l shortcut with many lists (`LST-10`, `LST-15`).

const WIDE = { width: 1440, height: 900 };

/**
 * Open the app and store lists named "List 1" to "List n".
 * @param {import('@playwright/test').Page} page the page
 * @param {number} total how many lists
 * @returns {Promise<string[]>} the list identifiers, in creation order
 */
async function seed(page, total) {
  await page.setViewportSize(WIDE);
  await page.goto('/#/tasks');
  await expect(page.locator('html[data-shell="ready"]')).toHaveCount(1);
  return page.evaluate(async (count) => {
    const { openStore } = await import('/js/store/db.js');
    const store = await openStore({ broadcast: true });
    const made = [];
    for (let index = 1; index <= count; index += 1) {
      made.push((await store.createList({ name: `List ${index}` })).id);
    }
    store.close();
    return made;
  }, total);
}

test('the find field filters the sidebar lists, counts matches, and opens the first one on Enter', async ({ page }) => {
  const ids = await seed(page, 124);
  const sidebar = page.locator('.app__sidebar');
  const field = sidebar.getByRole('searchbox', { name: 'Find a list' });
  await expect(field).toBeVisible();
  await field.fill('list 12');
  await expect(sidebar.locator('.sidebar__find-count')).toHaveText('6 of 124');
  await expect(sidebar.locator('[data-nav-lists] li:not([hidden])')).toHaveCount(6);
  await field.press('Enter');
  await expect(page).toHaveURL(new RegExp(`#/lists/${ids[11]}$`));
  await expect(field).toHaveValue('');
  await expect(sidebar.locator('[data-nav-lists] li:not([hidden])')).toHaveCount(124);
});

test('Down moves into the rows, which are one tab stop, and Escape clears the field', async ({ page }) => {
  await seed(page, 20);
  const sidebar = page.locator('.app__sidebar');
  const field = sidebar.getByRole('searchbox', { name: 'Find a list' });
  await field.fill('list 1');
  await field.press('ArrowDown');
  await expect(sidebar.locator('[data-nav-lists] li:not([hidden]) a').first()).toBeFocused();
  await page.keyboard.press('End');
  await expect(sidebar.locator('[data-nav-lists] li:not([hidden]) a').last()).toBeFocused();
  await expect(sidebar.locator('[data-nav-lists] a[tabindex="0"]')).toHaveCount(1);
  await field.focus();
  await field.press('Escape');
  await expect(field).toHaveValue('');
});

test('l focuses the find field, and a message names the matches', async ({ page }) => {
  await seed(page, 20);
  await page.locator('main, body').first().click({ position: { x: 700, y: 400 } });
  await page.keyboard.press('l');
  const field = page.locator('.app__sidebar [data-find-lists]');
  await expect(field).toBeFocused();
  await page.keyboard.type('list 1');
  await expect(page.locator('[data-live-region="polite"]')).toHaveText('11 of 20 lists match.');
});

test('no find field shows below 12 lists, and l opens Lists', async ({ page }) => {
  await seed(page, 5);
  await expect(page.locator('.app__sidebar [data-find-lists]')).toBeHidden();
  await page.locator('main, body').first().click({ position: { x: 700, y: 400 } });
  await page.keyboard.press('l');
  await expect(page).toHaveURL(/#\/lists$/);
  await expect(page.locator('.app__sidebar [data-find-lists]')).not.toBeFocused();
});

test('on a compact layout l opens Lists even with 20 lists', async ({ page }) => {
  await seed(page, 20);
  await page.setViewportSize({ width: 390, height: 800 });
  await page.keyboard.press('l');
  await expect(page).toHaveURL(/#\/lists$/);
});
