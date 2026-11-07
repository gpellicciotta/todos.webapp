import { expect, test } from '@playwright/test';

// The All tasks screen: first launch, the add bar, the status menu, the view options, search, and the info line.

const COMPACT = { width: 390, height: 844 };
const WIDE = { width: 1440, height: 900 };

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
 * Open All tasks and wait until the shell has rendered it.
 * @param {import('@playwright/test').Page} page the page
 */
async function openApp(page) {
  await page.goto('/#/tasks');
  await expect(page.locator('html[data-shell="ready"]')).toHaveCount(1);
}

/**
 * Store lists and tasks through a second store connection that broadcasts the changes to the app.
 * Due times are hours from now; a negative number is in the past.
 * @param {import('@playwright/test').Page} page a page of the app
 * @returns {Promise<void>}
 */
async function seed(page) {
  await page.evaluate(async () => {
    const { openStore } = await import('/js/store/db.js');
    const store = await openStore({ broadcast: true });
    const home = await store.createList({ name: 'Home' });
    const work = await store.createList({ name: 'Work' });
    const hours = (count) => new Date(Date.now() + count * 3_600_000).toISOString();
    await store.createTask({ description: 'Call the plumber', status: 'in-progress', 'due-time': hours(-2) }, { lists: [home.id] });
    await store.createTask({ description: 'Buy paint', 'due-time': hours(30) }, { lists: [home.id] });
    const report = await store.createTask({ description: 'Write the report', 'due-time': hours(5) }, { lists: [work.id] });
    await store.addNote(report.id, { text: 'Ask Dana for the numbers' });
    await store.createTask({ description: 'Book flights' });
    await store.createTask({ description: 'Water the plants', status: 'completed' }, { lists: [home.id] });
    await store.createTask({ description: 'Renew the gym membership', status: 'cancelled' });
    store.close();
  });
  await expect(page.locator('.task-row')).toHaveCount(4);
}

/**
 * Read the descriptions of the shown rows, top to bottom.
 * @param {import('@playwright/test').Page} page the page
 * @returns {Promise<string[]>} the descriptions
 */
function rows(page) {
  return page.locator('.task-row .task-row__description').allTextContents();
}

/**
 * Open the view options from the More menu of the page header.
 * @param {import('@playwright/test').Page} page the page
 * @returns {Promise<import('@playwright/test').Locator>} the view options
 */
async function openOptions(page) {
  await page.getByRole('button', { name: 'View actions' }).click();
  await page.getByRole('menuitem', { name: 'Edit view options' }).click();
  await expect(page).toHaveURL(/#\/tasks\/view-options$/);
  const options = page.locator('[data-editor-slot] .view-options');
  await expect(options).toBeVisible();
  return options;
}

/**
 * Open one filter row of the view options, which closes the row that was open.
 * @param {import('@playwright/test').Locator} options the view options
 * @param {string} name the row name, such as `Status`
 * @returns {Promise<import('@playwright/test').Locator>} the row's choices
 */
async function openRow(options, name) {
  const row = options.getByRole('button', { name: new RegExp(`^${name}`) });
  await row.click();
  const region = options.locator(`#${await row.getAttribute('aria-controls')}`);
  await expect(region).toBeVisible();
  return region;
}

/** The text of the info line under the add bar. */
const INFO = '.info-line__text';

for (const viewport of [COMPACT, WIDE]) {
  test(`a first visit shows the empty state without any sign-in at ${viewport.width} px (LOC-1)`, async ({ page }) => {
    const problems = watch(page);
    await page.setViewportSize(viewport);
    await openApp(page);
    const empty = page.locator('[data-view="tasks"] .empty-state');
    await expect(empty).toContainText('No tasks yet.');
    await expect(empty).toContainText('Your tasks stay on this device.');
    await expect(empty.getByRole('link', { name: 'Import a backup' })).toHaveAttribute('href', '#/settings');
    await expect(empty.getByRole('link', { name: 'Connect to sync across devices' })).toHaveAttribute('href', '#/connect');
    await expect(page.getByLabel('Add a task')).toBeVisible();
    await expect(page.locator('.info-line, [data-shortcut="search"], .view-header')).toHaveCount(0);
    await expect(page.locator('dialog[open]')).toHaveCount(0);
    await expect(page.getByText(/sign in/i)).toHaveCount(0);
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(scrollWidth).toBeLessThanOrEqual(viewport.width);
    expect(problems).toEqual([]);
  });
}

test('Enter adds a task, keeps focus in the add bar, and asks for persistent storage once (TSK-1, TEC-5)', async ({ page }) => {
  const problems = watch(page);
  await page.addInitScript(() => {
    window.persistCalls = 0;
    navigator.storage.persisted = async () => false;
    navigator.storage.persist = async () => {
      window.persistCalls += 1;
      return true;
    };
  });
  await openApp(page);
  expect(await page.evaluate(() => window.persistCalls)).toBe(0);
  const add = page.getByLabel('Add a task');
  await add.fill('Buy paint');
  await add.press('Enter');
  await expect(page.locator('.task-row')).toHaveCount(1);
  await expect(page.locator('.task-row__description')).toHaveText('Buy paint');
  await expect(page.locator('.empty-state')).toBeHidden();
  await expect(add).toBeFocused();
  await expect(add).toHaveValue('');
  await add.fill('Call the plumber');
  await add.press('Enter');
  await expect(page.locator('.task-row')).toHaveCount(2);
  await expect(add).toBeFocused();
  expect(await page.evaluate(() => window.persistCalls)).toBe(1);
  await page.reload();
  await expect(page.locator('.task-row')).toHaveCount(2);
  expect(problems).toEqual([]);
});

test('the status menu changes a status by mouse and by keyboard (TSK-4)', async ({ page }) => {
  const problems = watch(page);
  await page.setViewportSize(WIDE);
  await openApp(page);
  await seed(page);
  const row = page.locator('.task-row', { hasText: 'Book flights' });
  await row.locator('.status-button').click();
  const menu = page.getByRole('menu', { name: 'Status of Book flights' });
  await expect(menu).toBeVisible();
  await expect(menu.getByRole('menuitemradio', { name: 'To do' })).toHaveAttribute('aria-checked', 'true');
  await menu.getByRole('menuitemradio', { name: 'In progress' }).click();
  await expect(row).toHaveAttribute('data-status', 'in-progress');
  await expect(row.locator('.status-button')).toBeFocused();

  const paint = page.locator('.task-row', { hasText: 'Buy paint' });
  await paint.locator('.status-button').focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('menu', { name: 'Status of Buy paint' })).toBeVisible();
  await expect(page.getByRole('menuitemradio', { name: 'To do' })).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await expect(paint).toHaveCount(0);
  await expect(page.locator('.task-row', { hasText: 'Book flights' }).locator('.status-button')).toBeFocused();
  const statuses = await page.evaluate(async () => {
    const { openStore } = await import('/js/store/db.js');
    const store = await openStore();
    const tasks = await store.listTasks();
    store.close();
    return Object.fromEntries(tasks.map((task) => [task.description, task.status]));
  });
  expect(statuses['Buy paint']).toBe('completed');
  expect(statuses['Book flights']).toBe('in-progress');
  expect(problems).toEqual([]);
});

for (const viewport of [COMPACT, WIDE]) {
  test(`the view options, search, and the info line change the rows at ${viewport.width} px (TV-1 to TV-12, VO-1 to VO-8)`, async ({ page }) => {
    const problems = watch(page);
    await page.setViewportSize(viewport);
    await openApp(page);
    await seed(page);
    // Default: open tasks, due time ascending, tasks without a due time last.
    expect(await rows(page)).toEqual(['Call the plumber', 'Write the report', 'Buy paint', 'Book flights']);
    await expect(page.locator('.task-row', { hasText: 'Call the plumber' }).locator('.chip--overdue')).toHaveText('Overdue');
    await expect(page.locator(INFO)).toHaveText('4 of 6 tasks · Status: open');
    await expect(page.locator('.info-line__reset')).toBeHidden();
    await expect(page.locator('.filter-chip, .view-controls__sort, .view-controls__filters')).toHaveCount(0);

    const search = page.getByRole('searchbox', { name: 'Search tasks and notes' });
    await search.fill('dana');
    await expect(page.locator('.task-row')).toHaveCount(1);
    expect(await rows(page)).toEqual(['Write the report']);
    await expect(page.locator(INFO)).toHaveText('1 of 6 tasks · Search: dana · Status: open');
    await search.fill('');
    await expect(page.locator(INFO)).toHaveText('4 of 6 tasks · Status: open');

    const options = await openOptions(page);
    const statusRow = options.getByRole('button', { name: /^Status/ });
    let region = await openRow(options, 'Status');
    await region.getByLabel('Completed').check();
    await expect(page.locator('.task-row')).toHaveCount(5);
    await expect(page.locator(INFO)).toHaveText('5 of 6 tasks · Status: 3 statuses');
    await expect(page.locator('[data-live-region="polite"]').filter({ hasText: '5 tasks' })).toHaveCount(1);

    region = await openRow(options, 'Lists');
    await expect(statusRow).toHaveAttribute('aria-expanded', 'false');
    await region.getByLabel('Home').check();
    await expect(page.locator('.task-row')).toHaveCount(3);
    await region.getByLabel('In no list').check();
    await expect(page.locator('.task-row')).toHaveCount(4);
    await region.getByLabel('Home').uncheck();
    expect(await rows(page)).toEqual(['Book flights']);
    await region.getByLabel('In no list').uncheck();

    region = await openRow(options, 'Due');
    await region.getByLabel('Overdue').check();
    expect(await rows(page)).toEqual(['Call the plumber']);
    await region.getByLabel('Overdue').uncheck();
    await region.getByLabel('No due time').check();
    expect(await rows(page)).toEqual(['Book flights', 'Water the plants']);
    await region.getByLabel('No due time').uncheck();

    await options.getByLabel('Sort by').selectOption({ label: 'Description' });
    expect(await rows(page)).toEqual(['Book flights', 'Buy paint', 'Call the plumber', 'Water the plants', 'Write the report']);
    await options.getByLabel('Descending').check();
    expect(await rows(page)).toEqual(['Write the report', 'Water the plants', 'Call the plumber', 'Buy paint', 'Book flights']);
    await expect(page.locator(INFO)).toHaveText('5 of 6 tasks · Status: 3 statuses · Sorted by Description, descending');
    await expect(page.locator('.info-line__reset')).toBeAttached();

    // Escape closes the panel and keeps the view; the options stay after a reload (TV-12).
    await page.keyboard.press('Escape');
    await expect(page).toHaveURL(/#\/tasks$/);
    await expect(page.locator('[data-editor-slot]')).toBeHidden();
    await page.reload();
    await expect(page.locator('.task-row')).toHaveCount(5);
    expect(await rows(page)).toEqual(['Write the report', 'Water the plants', 'Call the plumber', 'Buy paint', 'Book flights']);

    // Reset on the info line restores every option.
    await page.locator('.info-line__reset').click();
    await expect(page.locator('.task-row')).toHaveCount(4);
    await expect(page.locator(INFO)).toHaveText('4 of 6 tasks · Status: open');
    await search.fill('nothing like this');
    await expect(page.locator('.empty-state')).toContainText('No tasks match Search: nothing like this and Status: open.');
    await page.locator('.empty-state').getByRole('button', { name: 'Reset' }).click();
    await expect(page.locator('.task-row')).toHaveCount(4);
    await expect(search).toHaveValue('');
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(scrollWidth).toBeLessThanOrEqual(viewport.width);
    expect(problems).toEqual([]);
  });
}

test('the All tasks More menu holds only Edit view options (VO-4)', async ({ page }) => {
  const problems = watch(page);
  await openApp(page);
  await seed(page);
  await page.getByRole('button', { name: 'View actions' }).click();
  await expect(page.getByRole('menuitem')).toHaveText(['Edit view options']);
  await page.keyboard.press('Escape');
  expect(problems).toEqual([]);
});

test('the view options open beside the rows on a wide layout, with Reset at the top and no Show button (VO-5, VO-6)', async ({ page }) => {
  const problems = watch(page);
  await page.setViewportSize(WIDE);
  await openApp(page);
  await seed(page);
  const options = await openOptions(page);
  await expect(page.locator('#app-title')).toHaveText('All tasks');
  await expect(page.locator('.task-row').first()).toBeVisible();
  await expect(options.getByRole('button', { name: 'Reset' })).toBeVisible();
  await expect(options.getByRole('button', { name: /^Show/ })).toBeHidden();
  expect(await page.locator('[data-editor-slot] .editor-panel').evaluate((element) => element.getBoundingClientRect().width))
    .toBeLessThan(WIDE.width / 2);
  await page.getByRole('button', { name: 'Close the view options' }).click();
  await expect(page).toHaveURL(/#\/tasks$/);
  await expect(page.getByRole('button', { name: 'View actions' })).toBeFocused();
  expect(problems).toEqual([]);
});

test('the view options fill the screen on a compact layout, end with Show N tasks, and work by keyboard (VO-5, VO-13)', async ({ page }) => {
  const problems = watch(page);
  await page.setViewportSize(COMPACT);
  await openApp(page);
  await seed(page);
  const options = await openOptions(page);
  expect(await page.locator('[data-editor-slot] .editor-panel').evaluate((element) => element.getBoundingClientRect().width))
    .toBeGreaterThanOrEqual(COMPACT.width - 2);
  await expect(options.getByRole('button', { name: 'Show 4 tasks' })).toBeVisible();
  // With a filter row open, the last control scrolls into view above the Show button and is never covered by it.
  await options.getByRole('button', { name: /^Status/ }).click();
  await options.getByLabel('Descending').scrollIntoViewIfNeeded();
  const direction = await options.locator('.view-options__direction').boundingBox();
  const show = await options.getByRole('button', { name: 'Show 4 tasks' }).boundingBox();
  expect(direction.y + direction.height).toBeLessThanOrEqual(show.y + 1);
  await options.getByRole('button', { name: /^Status/ }).click();
  const status = options.getByRole('button', { name: /^Status/ });
  await status.focus();
  await page.keyboard.press('Enter');
  await expect(status).toHaveAttribute('aria-expanded', 'true');
  await options.getByLabel('Completed').focus();
  await page.keyboard.press('Space');
  await expect(options.getByLabel('Completed')).toBeChecked();
  await expect(options.getByRole('button', { name: 'Show 5 tasks' })).toBeVisible();
  await expect(page.locator('[data-live-region="polite"]').filter({ hasText: '5 tasks' })).toHaveCount(1);
  await options.getByRole('button', { name: 'Show 5 tasks' }).click();
  await expect(page).toHaveURL(/#\/tasks$/);
  await expect(page.locator('[data-editor-slot]')).toBeHidden();
  expect(problems).toEqual([]);
});

test('the view options open from their route after a reload, and Reset in the panel restores the defaults (VO-8)', async ({ page }) => {
  const problems = watch(page);
  await page.setViewportSize(WIDE);
  await openApp(page);
  await seed(page);
  const options = await openOptions(page);
  await options.getByLabel('Sort by').selectOption({ label: 'Status' });
  await expect(page.locator(INFO)).toHaveText('4 of 6 tasks · Status: open · Sorted by Status');
  await page.reload();
  await expect(page).toHaveURL(/#\/tasks\/view-options$/);
  const reopened = page.locator('.view-options');
  await expect(reopened).toBeVisible();
  await expect(reopened.getByLabel('Sort by')).toHaveValue('status');
  await reopened.getByRole('button', { name: 'Reset' }).click();
  await expect(page.locator(INFO)).toHaveText('4 of 6 tasks · Status: open');
  await expect(reopened.getByLabel('Sort by')).toHaveValue('due-time');
  expect(problems).toEqual([]);
});

test('Delete moves a task to the recycle bin and Undo brings it back, also with Ctrl+Z (TSK-11)', async ({ page }) => {
  const problems = watch(page);
  await openApp(page);
  await seed(page);
  const row = page.locator('.task-row', { hasText: 'Book flights' });
  await row.getByRole('button', { name: 'More actions for Book flights' }).click();
  await page.getByRole('menuitem', { name: 'Delete' }).click();
  await expect(row).toHaveCount(0);
  const toast = page.locator('.toast', { hasText: 'Task moved to the recycle bin.' });
  await toast.getByRole('button', { name: 'Undo' }).click();
  await expect(row).toHaveCount(1);
  await row.getByRole('button', { name: 'More actions for Book flights' }).click();
  await page.getByRole('menuitem', { name: 'Delete' }).click();
  await expect(row).toHaveCount(0);
  await page.locator('main').focus();
  await page.keyboard.press('Control+z');
  await expect(row).toHaveCount(1);
  expect(problems).toEqual([]);
});

test('a row opens the task editor route, and the selected row is marked', async ({ page }) => {
  const problems = watch(page);
  await page.setViewportSize(WIDE);
  await openApp(page);
  await seed(page);
  await page.locator('.task-row__open', { hasText: 'Buy paint' }).click();
  await expect(page).toHaveURL(/#\/tasks\/[0-9a-f-]+$/);
  await expect(page.locator('.task-row__open[aria-current="page"]')).toHaveText(/Buy paint/);
  await expect(page.locator('[data-editor-slot]')).toHaveAttribute('data-editor', 'task');
  expect(problems).toEqual([]);
});

test('a store change while the status menu is open keeps the menu open and focused', async ({ page }) => {
  const problems = watch(page);
  await openApp(page);
  await seed(page);
  await page.locator('.task-row', { hasText: 'Book flights' }).locator('.status-button').focus();
  await page.keyboard.press('Enter');
  await page.keyboard.press('ArrowDown');
  const menu = page.getByRole('menu', { name: 'Status of Book flights' });
  await expect(menu.getByRole('menuitemradio', { name: 'In progress' })).toBeFocused();
  await page.evaluate(async () => {
    const { openStore } = await import('/js/store/db.js');
    const store = await openStore({ broadcast: true });
    await store.createTask({ description: 'Added in another tab' });
    store.close();
  });
  await expect(page.locator('.task-row')).toHaveCount(5);
  await expect(menu).toBeVisible();
  await expect(menu.getByRole('menuitemradio', { name: 'In progress' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('.task-row', { hasText: 'Book flights' })).toHaveAttribute('data-status', 'in-progress');
  await expect(page.locator('.task-row', { hasText: 'Book flights' }).locator('.status-button')).toBeFocused();
  expect(problems).toEqual([]);
});

test('Reset in an empty result focuses search, and deleting the last shown row focuses the add bar', async ({ page }) => {
  const problems = watch(page);
  await openApp(page);
  await seed(page);
  const search = page.getByRole('searchbox', { name: 'Search tasks and notes' });
  await search.fill('nothing like this');
  await page.locator('.empty-state').getByRole('button', { name: 'Reset' }).click();
  await expect(search).toBeFocused();
  await search.fill('Book flights');
  await expect(page.locator('.task-row')).toHaveCount(1);
  await page.getByRole('button', { name: 'More actions for Book flights' }).click();
  await page.getByRole('menuitem', { name: 'Delete' }).click();
  await expect(page.locator('.task-row')).toHaveCount(0);
  await expect(page.getByLabel('Add a task')).toBeFocused();
  expect(problems).toEqual([]);
});
