import { expect, test } from '@playwright/test';

// The Lists overview and the list editor: counts, New list, editing, and deleting a list.

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
 * Open the app and store a Home list with three tasks, two of them open, and a Work list without tasks.
 * @param {import('@playwright/test').Page} page the page
 * @returns {Promise<string>} the Home list identifier
 */
async function seed(page) {
  await page.setViewportSize(WIDE);
  await page.goto('/#/tasks');
  await expect(page.locator('html[data-shell="ready"]')).toHaveCount(1);
  return page.evaluate(async () => {
    const { openStore } = await import('/js/store/db.js');
    const store = await openStore({ broadcast: true });
    const home = await store.createList({ name: 'Home', description: 'Chores and repairs around the house' });
    await store.createList({ name: 'Work' });
    await store.createTask({ description: 'Buy paint' }, { lists: [home.id] });
    await store.createTask({ description: 'Fix the door', status: 'in-progress' }, { lists: [home.id] });
    await store.createTask({ description: 'Water the plants', status: 'completed' }, { lists: [home.id] });
    store.close();
    return home.id;
  });
}

/**
 * Run a store change in the page, through a second store that tells the app's store of it.
 * @param {import('@playwright/test').Page} page the page
 * @param {string} change the change: `complete` or `add`
 * @param {string} listId the list of the change
 * @returns {Promise<void>}
 */
function storeChange(page, change, listId) {
  return page.evaluate(async ([kind, id]) => {
    const { openStore } = await import('/js/store/db.js');
    const store = await openStore({ broadcast: true });
    if (kind === 'add') {
      await store.createTask({ description: 'Clean the gutters' }, { lists: [id] });
    }
    else {
      const task = (await store.listTasks()).find((candidate) => candidate.description === 'Buy paint');
      await store.updateTask(task.id, { status: 'completed' });
    }
    store.close();
  }, [change, listId]);
}

test('the overview shows each list with its description and counts, which follow task changes (LST-5)', async ({ page }) => {
  const problems = watch(page);
  const homeId = await seed(page);
  await page.goto('/#/lists');
  const rows = page.locator('.lists-view .list-row');
  await expect(rows.locator('.list-row__name')).toHaveText(['Home', 'Work']);
  await expect(rows.first().locator('.list-row__description')).toHaveText('Chores and repairs around the house');
  await expect(rows.locator('.list-row__counts')).toHaveText(['2 open · 3 total', '0 open · 0 total']);
  await storeChange(page, 'complete', homeId);
  await expect(rows.first().locator('.list-row__counts')).toHaveText('1 open · 3 total');
  await storeChange(page, 'add', homeId);
  await expect(rows.first().locator('.list-row__counts')).toHaveText('2 open · 4 total');
  await rows.first().click();
  await expect(page).toHaveURL(new RegExp(`#/lists/${homeId}$`));
  await expect(page.locator('#app-title')).toHaveText('Home');
  expect(problems).toEqual([]);
});

test('New list creates the list once a valid name is typed, and closing early creates nothing (LST-1, LST-3)', async ({ page }) => {
  const problems = watch(page);
  await seed(page);
  await page.goto('/#/lists');
  const rows = page.locator('.lists-view .list-row__name');
  await expect(rows).toHaveText(['Home', 'Work']);
  await page.locator('.lists-view').getByRole('link', { name: 'New list' }).click();
  await expect(page).toHaveURL(/#\/lists\/new$/);
  const panel = page.locator('[data-editor-slot] .editor-panel');
  await expect(panel.locator('.editor-panel__title')).toHaveText('New list');
  const name = panel.getByRole('textbox', { name: 'Name' });
  await expect(name).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(panel).toHaveCount(0);
  await expect(page).toHaveURL(/#\/lists$/);
  await expect(rows).toHaveText(['Home', 'Work']);

  await page.locator('.app__sidebar').getByRole('link', { name: 'New list' }).click();
  await expect(name).toBeFocused();
  await name.fill('home');
  await name.press('Tab');
  const error = panel.locator('[data-section="fields"] .field__error').first();
  await expect(error).toHaveText('A list named "Home" already exists.');
  await expect(rows).toHaveText(['Home', 'Work']);
  await name.fill('Garden');
  await name.press('Tab');
  await expect(rows).toHaveText(['Garden', 'Home', 'Work']);
  await expect(error).toBeHidden();
  await panel.getByRole('textbox', { name: 'Description' }).fill('Flowers and vegetables');
  await page.keyboard.press('Escape');
  await expect(page).toHaveURL(/#\/lists$/);
  await expect(page.locator('.list-row', { hasText: 'Garden' }).locator('.list-row__description')).toHaveText('Flowers and vegetables');
  await expect(page.locator('.app__sidebar .nav-item--list .nav-item__label')).toHaveText(['Garden', 'Home', 'Work']);
  expect(problems).toEqual([]);
});

test('Edit list renames the list, and deleting it keeps its tasks visible in All tasks (LST-4, LST-6, LST-7)', async ({ page }) => {
  const problems = watch(page);
  const homeId = await seed(page);
  await page.goto(`/#/lists/${homeId}`);
  await page.getByRole('button', { name: 'List actions' }).click();
  await page.getByRole('menuitem', { name: 'Edit list' }).click();
  await expect(page).toHaveURL(new RegExp(`#/lists/${homeId}/edit$`));
  const panel = page.locator('[data-editor-slot] .editor-panel');
  const name = panel.getByRole('textbox', { name: 'Name' });
  await expect(name).toHaveValue('Home');
  await expect(panel.getByRole('link', { name: 'Connect to share this list' })).toHaveAttribute('href', '#/connect');
  await expect(panel.locator('[data-section="details"]')).toContainText('Created');
  await name.fill('House');
  await name.press('Tab');
  await expect(page.locator('#app-title')).toHaveText('House');
  await panel.getByRole('button', { name: 'Delete list' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText('Its tasks stay in your other lists.');
  await dialog.getByRole('button', { name: 'Delete list' }).click();
  await expect(page).toHaveURL(/#\/tasks$/);
  await expect(page.locator('.toast')).toHaveText([/List moved to the recycle bin\./]);
  await expect(page.locator('.task-row__description')).toHaveText(['Buy paint', 'Fix the door']);
  await expect(page.locator('.app__sidebar .nav-item--list .nav-item__label')).toHaveText(['Work']);
  expect(problems).toEqual([]);
});
