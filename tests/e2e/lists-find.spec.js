import { expect, test } from '@playwright/test';

// The Lists screen find bar, sort menu, info line, Create list offer, and reorder lock (`LST-10`, `LST-11`, `LST-12`).

/**
 * Open the app and store lists named "List 1" to "List n"; then open the Lists screen.
 * @param {import('@playwright/test').Page} page the page
 * @param {number} total how many lists
 * @param {{width: number, height: number}} size the viewport
 */
async function seed(page, total, size = { width: 1440, height: 900 }) {
  await page.setViewportSize(size);
  await page.goto('/#/tasks');
  await expect(page.locator('html[data-shell="ready"]')).toHaveCount(1);
  await page.evaluate(async (count) => {
    const { openStore } = await import('/js/store/db.js');
    const store = await openStore({ broadcast: true });
    for (let index = 1; index <= count; index += 1) {
      await store.createList({ name: `List ${index}` });
    }
    store.close();
  }, total);
  await page.goto('/#/lists');
  await expect(page.locator('.lists-view__rows .list-item')).toHaveCount(total);
}

test('find filters the rows, names the count, and Reset clears it', async ({ page }) => {
  await seed(page, 30);
  const field = page.getByRole('searchbox', { name: 'Find a list' }).last();
  await field.fill('list 2');
  await expect(page.locator('.lists-view__rows .list-item')).toHaveCount(11);
  await expect(page.locator('.info-line__text')).toHaveText('11 of 30 lists');
  await page.locator('.info-line__reset').click();
  await expect(field).toHaveValue('');
  await expect(page.locator('.lists-view__rows .list-item')).toHaveCount(30);
});

test('/ focuses the find field of the Lists screen', async ({ page }) => {
  await seed(page, 20);
  await page.locator('.app__main').click({ position: { x: 5, y: 5 } });
  await page.keyboard.press('/');
  await expect(page.getByRole('searchbox', { name: 'Find a list' }).last()).toBeFocused();
});

test('the sort choice persists after a reload, and a sort hides the drag handles', async ({ page }) => {
  await seed(page, 20);
  await expect(page.locator('.list-item__handle').first()).toBeVisible();
  await page.getByRole('button', { name: /Sort: Manual order/ }).click();
  await page.getByRole('menuitemradio', { name: 'Name (A to Z)' }).click();
  await expect(page.locator('.info-line__text')).toHaveText('20 lists · Sorted by Name');
  await expect(page.locator('.lists-view__rows .list-row__name').nth(1)).toHaveText('List 10');
  await expect(page.locator('.list-item__handle').first()).toBeHidden();
  await page.reload();
  await expect(page.getByRole('button', { name: /Sort: Name/ })).toBeVisible();
  await expect(page.locator('.lists-view__rows .list-row__name').nth(1)).toHaveText('List 10');
});

test('a no-match text offers Create list, which opens the list editor', async ({ page }) => {
  await seed(page, 14);
  await page.getByRole('searchbox', { name: 'Find a list' }).last().fill('Garden');
  await expect(page.locator('.empty-state__text')).toHaveText('No list matches "Garden".');
  await page.getByRole('button', { name: 'Create list "Garden"' }).click();
  await expect(page).toHaveURL(/#\/lists\/[^/]+\/edit$/);
});

test('compact layouts pin the bar and show the sort button as an icon', async ({ page }) => {
  await seed(page, 14, { width: 390, height: 800 });
  const sort = page.locator('.lists-find__sort');
  await expect(sort).toBeVisible();
  await expect(sort.locator('.lists-find__sort-label')).toBeHidden();
  await expect(sort).toHaveAccessibleName('Sort: Manual order');
});
