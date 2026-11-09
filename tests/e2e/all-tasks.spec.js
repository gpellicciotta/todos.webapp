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
    await expect(page.getByLabel('Search or add a task')).toBeVisible();
    await expect(page.locator('.info-line, .view-header')).toHaveCount(0);
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
  const add = page.getByLabel('Search or add a task');
  await add.fill('Buy paint');
  await add.press('Enter');
  await expect(add).toHaveValue('Buy paint');
  await expect(page.locator('.task-row')).toHaveCount(0);
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await expect(page.locator('.task-row')).toHaveCount(1);
  await expect(page.locator('.task-row__description')).toHaveText('Buy paint');
  await expect(page.locator('.empty-state')).toBeHidden();
  await expect(page).toHaveURL(/#\/tasks\/[0-9a-f-]+$/);
  await expect(page.getByRole('textbox', { name: 'Description' })).toBeFocused();
  await expect(add).toHaveValue('');
  await add.fill('Call the plumber');
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await expect(page.locator('.task-row')).toHaveCount(2);
  await expect(page.getByRole('textbox', { name: 'Description' })).toBeFocused();
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
  await expect(page.locator('.task-row', { hasText: 'Call the plumber' }).locator('.status-button')).toBeFocused();
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
    // Default: open tasks, created newest first.
    expect(await rows(page)).toEqual(['Book flights', 'Write the report', 'Buy paint', 'Call the plumber']);
    await expect(page.locator('.task-row', { hasText: 'Call the plumber' }).locator('.chip--overdue')).toHaveText('Overdue');
    await expect(page.locator(INFO)).toHaveText('4 of 6 tasks · Status: open');
    await expect(page.locator('.info-line__reset')).toBeHidden();
    await expect(page.locator('.filter-chip, .view-controls__sort, .view-controls__filters')).toHaveCount(0);

    const search = page.getByLabel('Search or add a task');
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
    expect(await rows(page)).toEqual(['Water the plants', 'Book flights']);
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
    await expect(page.locator('.add-hint')).toHaveText('No task matches. Add creates it.');
    await expect(page.locator('.task-row')).toHaveCount(0);
    await page.locator('.info-line__reset').click();
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
  await expect(reopened.getByLabel('Sort by')).toHaveValue('creation-time');
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
  const search = page.getByLabel('Search or add a task');
  await search.fill('nothing like this');
  await expect(page.locator('.add-hint')).toHaveText('No task matches. Add creates it.');
  await page.locator('.info-line__reset').click();
  await expect(search).toHaveValue('');
  await search.fill('Book flights');
  await expect(page.locator('.task-row')).toHaveCount(1);
  await page.getByRole('button', { name: 'More actions for Book flights' }).click();
  await page.getByRole('menuitem', { name: 'Delete' }).click();
  await expect(page.locator('.task-row')).toHaveCount(0);
  await expect(page.getByLabel('Search or add a task')).toBeFocused();
  expect(problems).toEqual([]);
});

test('typing in the add field searches, Enter never adds, and Add creates the task and clears the filter (VO-3, TSK-1)', async ({ page }) => {
  const problems = watch(page);
  await openApp(page);
  await seed(page);
  const field = page.getByLabel('Search or add a task');
  await field.fill('paint');
  await expect(page.locator('.task-row')).toHaveCount(1);
  await expect(page.locator(INFO)).toHaveText('1 of 6 tasks · Search: paint · Status: open');
  await expect(page.locator('.add-hint')).toHaveText('Add creates a new task “paint”.');
  await field.press('Enter');
  expect(await page.evaluate(async () => {
    const { openStore } = await import('/js/store/db.js');
    const store = await openStore();
    const count = (await store.snapshot()).tasks.length;
    store.close();
    return count;
  })).toBe(6);
  await expect(page.getByRole('button', { name: 'Add', exact: true })).toBeVisible();
  await field.fill('  BUY paint ');
  await expect(page.getByRole('button', { name: 'Add anyway' })).toBeVisible();
  await field.fill('paint');
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await expect(field).toHaveValue('');
  await expect(page).toHaveURL(/#\/tasks\/[0-9a-f-]+$/);
  await expect(page.getByRole('textbox', { name: 'Description' })).toBeFocused();
  await expect(page.locator('.task-row')).toHaveCount(5);
  await expect(page.locator(INFO)).toHaveText('5 of 7 tasks · Status: open');
  expect(problems).toEqual([]);
});

for (const shortcut of ['Shift+Enter', 'Alt+Enter']) {
  test(`${shortcut} in the add field adds the task like the Add button (TSK-1)`, async ({ page }) => {
    const problems = watch(page);
    await openApp(page);
    await seed(page);
    const field = page.getByLabel('Search or add a task');
    await field.fill('Paint the fence');
    await field.press(shortcut);
    await expect(field).toHaveValue('');
    await expect(page).toHaveURL(/#\/tasks\/[0-9a-f-]+$/);
    await expect(page.getByRole('textbox', { name: 'Description' })).toHaveValue('Paint the fence');
    await expect(page.getByRole('textbox', { name: 'Description' })).toBeFocused();
    await expect(page.locator('.task-row', { hasText: 'Paint the fence' })).toHaveCount(1);
    expect(problems).toEqual([]);
  });
}

test('adding a task that the view options hide shows a toast whose Show resets those options (VO-3)', async ({ page }) => {
  const problems = watch(page);
  await page.setViewportSize(WIDE);
  await openApp(page);
  await seed(page);
  const options = await openOptions(page);
  const region = await openRow(options, 'Status');
  await region.getByLabel('Completed').check();
  await region.getByLabel('To do').uncheck();
  await region.getByLabel('In progress').uncheck();
  await expect(page.locator(INFO)).toContainText('Status: completed');
  const field = page.getByLabel('Search or add a task');
  await field.fill('Paint the door');
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  const toast = page.locator('.toast', { hasText: 'Task added.' });
  await expect(toast).toContainText('hides it.');
  await toast.getByRole('button', { name: 'Show' }).click();
  await expect(page.locator('.task-row', { hasText: 'Paint the door' })).toBeVisible();
  expect(problems).toEqual([]);
});

/**
 * Read the list as text: each group header as `# name count`, each row as its description.
 * @param {import('@playwright/test').Page} page the page
 * @returns {Promise<string[]>} the entries, top to bottom
 */
function listEntries(page) {
  return page.locator('.task-list > li').evaluateAll((items) => items.map((item) => (item.classList.contains('group-header')
    ? `# ${item.querySelector('.group-header__name').textContent} ${item.querySelector('.group-header__count').textContent}`
    : item.querySelector('.task-row__description').textContent)));
}

/**
 * Choose a Group by option in the view options.
 * @param {import('@playwright/test').Locator} options the view options
 * @param {string} name the option name, such as `Status`
 */
async function groupBy(options, name) {
  await options.getByRole('radio', { name, exact: true }).check();
}

test('Group by shows headers with counts for each option, and the choice survives a reload (VO-9 to VO-12, TV-12)', async ({ page }) => {
  const problems = watch(page);
  await openApp(page);
  await seed(page);
  const options = await openOptions(page);
  await expect(options.getByRole('radio', { name: 'None', exact: true })).toBeChecked();
  await expect(page.locator('.group-header')).toHaveCount(0);

  await groupBy(options, 'List');
  await expect(page.locator('.info-line__text')).toContainText('Grouped by List');
  expect(await listEntries(page)).toEqual([
    '# Home 2', 'Buy paint', 'Call the plumber', '# Work 1', 'Write the report', '# No list 1', 'Book flights',
  ]);

  await groupBy(options, 'Status');
  expect(await listEntries(page)).toEqual([
    '# To do 3', 'Book flights', 'Write the report', 'Buy paint', '# In progress 1', 'Call the plumber',
  ]);

  // The clock decides whether the later tasks fall under Today, Tomorrow, or This week; the ends are fixed.
  await groupBy(options, 'Due date');
  const byDue = await listEntries(page);
  expect(byDue.slice(0, 2)).toEqual(['# Overdue 1', 'Call the plumber']);
  expect(byDue.slice(-2)).toEqual(['# No due date 1', 'Book flights']);
  await expect(page.locator('.task-row')).toHaveCount(4);
  await expect(page.locator('.group-header').first().getByRole('heading', { name: 'Overdue' })).toBeVisible();
  const headers = await page.locator('.group-header').count();
  expect(headers).toBeGreaterThanOrEqual(3);

  await page.reload();
  await expect(page.locator('html[data-shell="ready"]')).toHaveCount(1);
  await expect(page.locator('.group-header')).toHaveCount(headers);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('todos.view.tasks')).group)).toBe('due');

  await page.locator('.info-line__reset').click();
  await expect(page.locator('.group-header')).toHaveCount(0);
  expect(problems).toEqual([]);
});

test('search and sort apply inside each group, and a task of two lists shows in both (VO-10, VO-11)', async ({ page }) => {
  await openApp(page);
  await seed(page);
  await page.evaluate(async () => {
    const { openStore } = await import('/js/store/db.js');
    const store = await openStore({ broadcast: true });
    const [work] = (await store.listLists()).filter((list) => list.name === 'Work');
    const [paint] = (await store.listTasks()).filter((task) => task.description === 'Buy paint');
    await store.addToList(paint.id, work.id);
    store.close();
  });
  const options = await openOptions(page);
  await groupBy(options, 'List');
  await expect(page.locator('.task-row')).toHaveCount(5);
  expect(await listEntries(page)).toEqual([
    '# Home 2', 'Buy paint', 'Call the plumber', '# Work 2', 'Write the report', 'Buy paint', '# No list 1', 'Book flights',
  ]);
  await options.locator('select').selectOption('description');
  expect((await listEntries(page)).slice(0, 3)).toEqual(['# Home 2', 'Buy paint', 'Call the plumber']);
  await page.getByLabel('Search or add a task').fill('paint');
  await expect.poll(() => listEntries(page)).toEqual(['# Home 1', 'Buy paint', '# Work 1', 'Buy paint']);
  await expect(page.locator('.info-line__text')).toContainText('1 of 6 tasks');
});
