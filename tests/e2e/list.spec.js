import { expect, test } from '@playwright/test';

// The List screen: manual order, drag and keyboard moves, the view options, and the info line.

const WIDE = { width: 1440, height: 900 };

/**
 * Collect console errors and page errors of a page.
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
  return problems;
}

/**
 * Open the app, store a list with tasks of every status, and open that list.
 * @param {import('@playwright/test').Page} page the page
 * @returns {Promise<string>} the list identifier
 */
async function openList(page) {
  await page.setViewportSize(WIDE);
  await page.goto('/#/tasks');
  await expect(page.locator('html[data-shell="ready"]')).toHaveCount(1);
  const listId = await page.evaluate(async () => {
    const { openStore } = await import('/js/store/db.js');
    const store = await openStore({ broadcast: true });
    const home = await store.createList({ name: 'Home', description: 'Chores and repairs around the house' });
    const hours = (count) => new Date(Date.now() + count * 3_600_000).toISOString();
    await store.createTask({ description: 'Clean the gutters', 'due-time': hours(50) }, { lists: [home.id] });
    await store.createTask({ description: 'Buy paint', 'due-time': hours(5) }, { lists: [home.id] });
    await store.createTask({ description: 'Water the plants', status: 'completed' }, { lists: [home.id] });
    await store.createTask({ description: 'Fix the door', status: 'in-progress', 'due-time': hours(20) }, { lists: [home.id] });
    store.close();
    return home.id;
  });
  await page.goto(`/#/lists/${listId}`);
  await expect(page.locator('.list-view .task-row')).toHaveCount(3);
  return listId;
}

/**
 * Open the view options from the More menu of the list header.
 * @param {import('@playwright/test').Page} page the page
 * @returns {Promise<import('@playwright/test').Locator>} the view options
 */
async function openOptions(page) {
  await page.getByRole('button', { name: 'List actions' }).click();
  await page.getByRole('menuitem', { name: 'Edit view options' }).click();
  await expect(page).toHaveURL(/#\/lists\/[^/]+\/view-options$/);
  const options = page.locator('[data-editor-slot] .view-options');
  await expect(options).toBeVisible();
  return options;
}

/** The text of the info line under the add bar. */
const INFO = '.list-view .info-line__text';

/**
 * Read the descriptions of the shown rows, top to bottom.
 * @param {import('@playwright/test').Page} page the page
 * @returns {Promise<string[]>} the descriptions
 */
function rows(page) {
  return page.locator('.list-view .task-row__description').allTextContents();
}

test.describe('List screen', () => {
  test('the add field filters the list rows, and Add puts the new task at the end of the list (VO-3, LV-5)', async ({ page }) => {
    const problems = watch(page);
    await openList(page);
    const field = page.getByLabel('Search or add a task');
    await field.fill('paint');
    await expect(page.locator('.list-view .task-row')).toHaveCount(1);
    await field.press('Enter');
    await expect(page.locator('.list-view .task-row')).toHaveCount(1);
    await field.fill('Paint the door');
    await expect(page.locator('.add-hint')).toHaveText('No task matches. Add creates it.');
    await page.getByRole('button', { name: 'Add', exact: true }).click();
    await expect(field).toHaveValue('');
    await expect(page).toHaveURL(new RegExp('#/lists/[0-9a-f-]+/tasks/[0-9a-f-]+$'));
    await expect(page.getByRole('textbox', { name: 'Description' })).toBeFocused();
    await expect(page.locator('.list-view .task-row')).toHaveCount(4);
    expect((await rows(page)).at(-1)).toBe('Paint the door');
    expect(problems).toEqual([]);
  });

  test('Group by offers Due date and Status but not List, keeps the manual order inside groups, and hides the grips (LV-8, LV-11)', async ({ page }) => {
    const problems = watch(page);
    await openList(page);
    await expect(page.locator('.list-view .task-row__handle')).toHaveCount(3);
    const options = await openOptions(page);
    await expect(options.getByRole('radio')).toHaveCount(5);
    await expect(options.getByRole('radio', { name: 'List', exact: true })).toHaveCount(0);
    await options.getByRole('radio', { name: 'Status', exact: true }).check();
    await expect(page.locator(INFO)).toHaveText('3 of 4 tasks · Status: open · Grouped by Status');
    expect(await page.locator('.list-view .task-list > li').evaluateAll((items) => items.map((item) => (item.classList.contains('group-header')
      ? `# ${item.querySelector('.group-header__name').textContent} ${item.querySelector('.group-header__count').textContent}`
      : item.querySelector('.task-row__description').textContent)))).toEqual([
      '# To do 2', 'Clean the gutters', 'Buy paint', '# In progress 1', 'Fix the door',
    ]);
    await expect(page.locator('.list-view .task-row__handle')).toHaveCount(0);
    await page.reload();
    await expect(page.locator('.list-view .group-header')).toHaveCount(2);
    await page.locator('.list-view .info-line__reset').click();
    await expect(page.locator('.list-view .group-header')).toHaveCount(0);
    await expect(page.locator('.list-view .task-row__handle')).toHaveCount(3);
    expect(problems).toEqual([]);
  });

  test('shows the header, the open tasks in manual order, and the info line (LV-1, LV-2, LV-10, VO-2)', async ({ page }) => {
    const problems = watch(page);
    await openList(page);
    await expect(page.locator('#app-title')).toHaveText('Home');
    await expect(page.locator('.list-view__description')).toHaveText('Chores and repairs around the house');
    expect(await rows(page)).toEqual(['Clean the gutters', 'Buy paint', 'Fix the door']);
    await expect(page.locator(INFO)).toHaveText('3 of 4 tasks · Status: open');
    await expect(page.locator('.info-line__reset')).toBeHidden();
    await expect(page.locator('.list-view .filter-chip, .list-view__orders, .list-view__note')).toHaveCount(0);
    await expect(page.locator('.list-view .task-row__handle')).toHaveCount(3);
    expect(problems).toEqual([]);
  });

  test('dragging a row by its handle stores the new order, which survives a reload (LV-3)', async ({ page }) => {
    const problems = watch(page);
    await openList(page);
    const handle = page.locator('.list-view .task-row').first().locator('.task-row__handle');
    const target = await page.locator('.list-view .task-row').nth(2).boundingBox();
    await handle.hover();
    await page.mouse.down();
    await page.mouse.move(target.x + 20, target.y + target.height * 0.5, { steps: 8 });
    await expect(page.locator('.list-view .task-row[data-dragging="true"]')).toHaveCount(1);
    await page.mouse.move(target.x + 20, target.y + target.height * 0.9, { steps: 4 });
    await expect(page.locator('.list-view .task-row').nth(2)).toHaveAttribute('data-drop', 'after');
    await page.mouse.up();
    await expect.poll(() => rows(page)).toEqual(['Buy paint', 'Fix the door', 'Clean the gutters']);
    await expect(page.locator('.list-view .task-row[data-dragging], .list-view .task-row[data-drop]')).toHaveCount(0);
    await page.reload();
    await expect(page.locator('.list-view .task-row')).toHaveCount(3);
    expect(await rows(page)).toEqual(['Buy paint', 'Fix the door', 'Clean the gutters']);
    expect(problems).toEqual([]);
  });

  test('Alt+Down moves the focused row, keeps focus on it, and announces the move (LV-3)', async ({ page }) => {
    const problems = watch(page);
    await openList(page);
    await page.locator('.list-view .task-row__open').first().focus();
    await page.keyboard.press('Alt+ArrowDown');
    await expect.poll(() => rows(page)).toEqual(['Buy paint', 'Clean the gutters', 'Fix the door']);
    await expect(page.locator('.list-view .task-row').nth(1).locator('.task-row__open')).toBeFocused();
    await expect(page.locator('[data-live-region="polite"]').filter({ hasText: 'Clean the gutters moved to position 2 of 3.' }))
      .toHaveCount(1);
    await page.keyboard.press('Alt+ArrowUp');
    await expect.poll(() => rows(page)).toEqual(['Clean the gutters', 'Buy paint', 'Fix the door']);
    await expect(page.locator('.list-view .task-row').first().locator('.task-row__open')).toBeFocused();

    await page.locator('.list-view .task-row').nth(1).locator('.task-row__more').click();
    await expect(page.getByRole('menuitem', { name: 'Move up' })).toBeVisible();
    await page.getByRole('menuitem', { name: 'Move down' }).click();
    await expect.poll(() => rows(page)).toEqual(['Clean the gutters', 'Fix the door', 'Buy paint']);

    // On a status button, Alt+Down moves the row instead of opening the status menu.
    await page.locator('.list-view .status-button').first().focus();
    await page.keyboard.press('Alt+ArrowDown');
    await expect.poll(() => rows(page)).toEqual(['Fix the door', 'Clean the gutters', 'Buy paint']);
    await expect(page.locator('.list-view .task-row').nth(1).locator('.status-button')).toBeFocused();
    await expect(page.locator('.list-view .status-menu')).toBeHidden();
    expect(problems).toEqual([]);
  });

  test('the More menu holds Edit list, Edit view options, Share list, and Delete list (VO-4)', async ({ page }) => {
    const problems = watch(page);
    await openList(page);
    await page.getByRole('button', { name: 'List actions' }).click();
    await expect(page.getByRole('menuitem')).toHaveText(['Edit list', 'Edit view options', 'Share list', 'Delete list']);
    await page.keyboard.press('Escape');
    expect(problems).toEqual([]);
  });

  test('the list view options offer no Lists filter and put Manual order first, and Show N tasks is hidden when wide (VO-6, LV-6)', async ({ page }) => {
    const problems = watch(page);
    await openList(page);
    const options = await openOptions(page);
    await expect(options.getByRole('button', { name: /^(Status|Due|Created)/ })).toHaveCount(3);
    await expect(options.getByRole('button', { name: /^Lists/ })).toHaveCount(0);
    await expect(options.getByLabel('Sort by')).toHaveValue('manual');
    await expect(options.getByLabel('Sort by').locator('option').first()).toHaveText('Manual order');
    await expect(options.getByRole('button', { name: /^Show/ })).toBeHidden();
    await expect(page.locator('.list-view .task-row')).toHaveCount(3);
    expect(problems).toEqual([]);
  });

  test('a sorted view hides the move controls and leaves the stored order unchanged (LV-7, LV-8)', async ({ page }) => {
    const problems = watch(page);
    await openList(page);
    const options = await openOptions(page);
    await options.getByLabel('Sort by').selectOption({ label: 'Due time' });
    expect(await rows(page)).toEqual(['Buy paint', 'Fix the door', 'Clean the gutters']);
    await expect(page.locator(INFO)).toHaveText('3 of 4 tasks · Status: open · Sorted by Due time');
    await expect(page.locator('.info-line__reset')).toBeVisible();
    await expect(page.locator('.list-view .task-row__handle')).toHaveCount(0);
    await page.locator('.list-view .task-row__open').first().focus();
    await page.keyboard.press('Alt+ArrowDown');
    expect(await rows(page)).toEqual(['Buy paint', 'Fix the door', 'Clean the gutters']);
    await page.locator('.list-view .task-row__more').first().click();
    await expect(page.getByRole('menuitem', { name: 'Delete' })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: /Move/ })).toHaveCount(0);
    await page.keyboard.press('Escape');

    await options.getByLabel('Sort by').selectOption({ label: 'Manual order' });
    await expect(page.locator(INFO)).toHaveText('3 of 4 tasks · Status: open');
    expect(await rows(page)).toEqual(['Clean the gutters', 'Buy paint', 'Fix the door']);
    await expect(page.locator('.list-view .task-row__handle')).toHaveCount(3);
    expect(problems).toEqual([]);
  });

  test('the status, due, and created filters apply, persist, and Reset restores manual order and open tasks (TV-12, VO-8)', async ({ page }) => {
    const problems = watch(page);
    await openList(page);
    const options = await openOptions(page);
    await options.getByRole('button', { name: /^Status/ }).click();
    await options.getByLabel('Completed').check();
    await expect(page.locator('.list-view .task-row')).toHaveCount(4);
    await options.getByRole('button', { name: /^Due/ }).click();
    await options.getByLabel('No due time').check();
    expect(await rows(page)).toEqual(['Water the plants']);
    await expect(page.locator(INFO)).toHaveText('1 of 4 tasks · Status: 3 statuses · Due: no due time');
    await page.reload();
    await expect(page.locator('.list-view .task-row')).toHaveCount(1);
    await page.locator('.info-line__reset').click();
    await expect(page.locator(INFO)).toHaveText('3 of 4 tasks · Status: open');
    expect(await rows(page)).toEqual(['Clean the gutters', 'Buy paint', 'Fix the door']);
    expect(problems).toEqual([]);
  });

  test('a list of 300 tasks renders the rows in view, and moves and drags reach rows past them (TEC-16)', async ({ page }) => {
    test.setTimeout(60_000);
    const problems = watch(page);
    const listId = await openList(page);
    await page.evaluate(async (id) => {
      const { openStore } = await import('/js/store/db.js');
      const store = await openStore({ broadcast: true });
      for (let index = 0; index < 296; index += 1) {
        await store.createTask({ description: `Step ${String(index).padStart(3, '0')}` }, { lists: [id] });
      }
      store.close();
    }, listId);
    const shown = page.locator('.list-view .task-row');
    await expect(shown.first()).toHaveAttribute('aria-setsize', '299');
    expect(await shown.count()).toBeLessThan(80);
    expect(await page.locator('.list-view .task-list').evaluate((list) => list.scrollHeight)).toBeGreaterThan(299 * 47);

    // Alt+Down past the rendered rows keeps focus on the moved row, in view.
    await shown.first().locator('.task-row__open').focus();
    for (let position = 2; position <= 40; position += 1) {
      await page.keyboard.press('Alt+ArrowDown');
      await expect(page.locator('.list-view .task-row:focus-within')).toHaveAttribute('aria-posinset', String(position));
    }
    await expect(page.locator('.list-view .task-row:focus-within .task-row__description')).toHaveText('Clean the gutters');
    await expect(page.locator('.list-view .task-row:focus-within')).toBeInViewport();

    // A drag held at the bottom edge scrolls, renders the rows it reaches, and drops past the first rendered rows.
    const scroller = page.locator('.app__main');
    const main = await scroller.boundingBox();
    const top = await scroller.evaluate((element) => element.scrollTop);
    const rendered = Math.max(...(await shown.evaluateAll((rows) => rows.map((row) => Number(row.getAttribute('aria-posinset'))))));
    await page.locator('.list-view .task-row:focus-within .task-row__handle').hover();
    await page.mouse.down();
    await page.mouse.move(main.x + 200, main.y + main.height - 10, { steps: 8 });
    await expect(page.locator('.list-view .task-row[data-dragging="true"]')).toHaveCount(1);
    await expect.poll(() => scroller.evaluate((element) => element.scrollTop), { timeout: 15_000 }).toBeGreaterThan(top + 40 * 48);
    await page.mouse.up();
    const moved = page.locator('.list-view .task-row').filter({ hasText: 'Clean the gutters' });
    await expect.poll(async () => Number(await moved.getAttribute('aria-posinset'))).toBeGreaterThan(rendered);
    await expect(page.locator('.list-view .task-row[data-dragging], .list-view .task-row[data-drop]')).toHaveCount(0);
    expect(problems).toEqual([]);
  });
});
