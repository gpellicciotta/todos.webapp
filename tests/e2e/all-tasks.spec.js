import { expect, test } from '@playwright/test';

// The All tasks screen: first launch, the add bar, the status button, the view options, search, and the info line.

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
  await expect(page.locator('.task-row')).toHaveCount(6);
}

/**
 * Store a view option of All tasks that shows only the open statuses, and reload to apply it.
 * @param {import('@playwright/test').Page} page a page of the app
 * @returns {Promise<void>}
 */
async function showOpenOnly(page) {
  await page.evaluate(() => localStorage.setItem('todos.view.tasks', JSON.stringify({
    filter: { statuses: ['ready', 'in-progress'] }, order: { field: 'creation-time', direction: 'desc' }, group: 'none',
  })));
  await page.reload();
  await expect(page.locator('html[data-shell="ready"]')).toHaveCount(1);
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
 * Delete a task from its editor: open the row, show the Configuration tab, and press Delete task in its Danger zone.
 * @param {import('@playwright/test').Page} page the page
 * @param {import('@playwright/test').Locator} row the task row
 */
async function deleteFromEditor(page, row) {
  await row.locator('.task-row__open').click();
  const panel = page.locator('[data-editor-slot] .editor-panel');
  await panel.getByRole('tab', { name: 'Configuration' }).click();
  await panel.getByRole('button', { name: 'Delete task' }).click();
  await expect(panel).toHaveCount(0);
}

/**
 * Open the view options from the More menu of the page header.
 * @param {import('@playwright/test').Page} page the page
 * @returns {Promise<import('@playwright/test').Locator>} the view options
 */
async function openOptions(page) {
  await page.getByRole('button', { name: /^(All tasks|View) actions$/ }).click();
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

test('connected, deleting every task shows an empty state without the Connect link', async ({ page }) => {
  const problems = watch(page);
  const server = `http://127.0.0.1:${process.env.E2E_PORT ?? 8754}`;
  const session = { token: 'session-1', expiry: '2099-01-01T00:00:00Z', name: 'Jane Doe', email: 'jane@example.com', server };
  await page.addInitScript((value) => localStorage.setItem('todos.session', JSON.stringify(value)), session);
  await page.route(`${server}/api/**`, (route) => {
    const { pathname } = new URL(route.request().url());
    const body = {
      '/api/notifications': [],
      '/api/changes': { cursor: 'c1', 'has-more': false, lists: [], tasks: [], memberships: [], notes: [], tombstones: [], protocol: 1 },
      '/api/users/me': { id: 3, name: 'Jane Doe', email: 'jane@example.com' },
    }[pathname] ?? {};
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  });
  await openApp(page);
  await page.getByLabel('Search or add a task').fill('Buy paint');
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await expect(page.locator('.task-row', { hasText: 'Buy paint' })).toHaveCount(1);
  // Add opens the editor of the new task.
  const panel = page.locator('[data-editor-slot] .editor-panel');
  await panel.getByRole('tab', { name: 'Configuration' }).click();
  await panel.getByRole('button', { name: 'Delete task' }).click();
  await expect(panel).toHaveCount(0);
  const empty = page.locator('[data-view="tasks"] .empty-state');
  await expect(empty).toContainText('No tasks yet.');
  await expect(empty).toContainText('Your tasks sync across your devices.');
  await expect(empty.getByRole('link', { name: 'Import a backup' })).toHaveAttribute('href', '#/settings');
  await expect(empty.getByRole('link', { name: 'Connect to sync across devices' })).toHaveCount(0);
  expect(problems).toEqual([]);
});

test('Enter or Add adds a task, opens it beside the add bar, keeps the focus there, and asks for persistent storage once (TSK-1, TSK-13, TEC-5)', async ({ page }) => {
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
  await expect(page.locator('.task-row')).toHaveCount(1);
  await expect(page.locator('.task-row__description')).toHaveText('Buy paint');
  await expect(page.locator('.empty-state')).toBeHidden();
  await expect(page).toHaveURL(/#\/tasks\/[0-9a-f-]+$/);
  await expect(page.getByLabel('Description')).toHaveValue('Buy paint');
  await expect(add).toBeFocused();
  await expect(add).toHaveValue('');
  await add.fill('Call the plumber');
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await expect(page.locator('.task-row')).toHaveCount(2);
  await expect(page.getByLabel('Description')).toHaveValue('Call the plumber');
  await expect(add).toBeFocused();
  expect(await page.evaluate(() => window.persistCalls)).toBe(1);
  await page.reload();
  await expect(page.locator('.task-row')).toHaveCount(2);
  expect(problems).toEqual([]);
});

test('one click completes a task, x ticks the focused row, and Undo or Ctrl+Z sets it back (TSK-4)', async ({ page }) => {
  const problems = watch(page);
  await page.setViewportSize(WIDE);
  await openApp(page);
  await seed(page);
  await showOpenOnly(page);
  const flights = page.locator('.task-row', { hasText: 'Book flights' });
  await flights.getByRole('button', { name: 'Mark Book flights completed' }).click();
  await expect(flights).toHaveCount(0);
  const toast = page.locator('.toast', { hasText: 'Task marked completed.' });
  await toast.getByRole('button', { name: 'Undo' }).click();
  await expect(flights).toHaveAttribute('data-status', 'ready');

  const paint = page.locator('.task-row', { hasText: 'Buy paint' });
  await paint.locator('.task-row__open').focus();
  await page.keyboard.press('x');
  await expect(paint).toHaveCount(0);
  await page.locator('main').focus();
  await page.keyboard.press('Control+z');
  await expect(paint).toHaveAttribute('data-status', 'ready');

  const statuses = async () => page.evaluate(async () => {
    const { openStore } = await import('/js/store/db.js');
    const store = await openStore();
    const tasks = await store.listTasks();
    store.close();
    return Object.fromEntries(tasks.map((task) => [task.description, task['current-occurrence'].status]));
  });
  expect((await statuses())['Book flights']).toBe('ready');
  expect((await statuses())['Buy paint']).toBe('ready');
  expect(problems).toEqual([]);
});

test('a click ticks a completed target-3 task to 4 of 3, and one Undo sets it back to 3 of 3 (TSK-4)', async ({ page }) => {
  const problems = watch(page);
  await page.setViewportSize(WIDE);
  await openApp(page);
  const id = await page.evaluate(async () => {
    const { openStore } = await import('/js/store/db.js');
    const store = await openStore({ broadcast: true });
    const gym = await store.createTask({ description: 'Gym' });
    await store.updateRules(gym.id, { 'target-count': 3 });
    for (let step = 0; step < 3; step += 1) {
      await store.postEvent(gym.id, 'complete');
    }
    store.close();
    return gym.id;
  });
  const gym = page.locator('.task-row', { hasText: 'Gym' });
  await expect(gym.locator('.task-row__count')).toHaveText('3/3');
  await gym.getByRole('button', { name: 'Tick Gym, 3 of 3 done', exact: true }).click();
  await expect(gym.locator('.task-row__count')).toHaveText('4/3');
  await expect(gym).toHaveAttribute('data-status', 'completed');
  const toast = page.locator('.toast', { hasText: 'Ticked, 4 of 3 done.' });
  await toast.getByRole('button', { name: 'Undo' }).click();
  await expect(gym.locator('.task-row__count')).toHaveText('3/3');
  await expect(gym).toHaveAttribute('data-status', 'completed');
  const occurrence = await page.evaluate(async (taskId) => {
    const { openStore } = await import('/js/store/db.js');
    const store = await openStore();
    const task = (await store.listTasks()).find((each) => each.id === taskId);
    store.close();
    return task['current-occurrence'];
  }, id);
  expect(occurrence).toMatchObject({ 'completion-count': 3, status: 'completed' });
  expect(problems).toEqual([]);
});

for (const width of [360, 1440]) {
  test(`a row shows a description of at most 2 lines and a meta line with orange overdue text at ${width} px (OVD-2)`, async ({ page }) => {
    const problems = watch(page);
    await page.setViewportSize({ width, height: 900 });
    await openApp(page);
    await page.evaluate(async () => {
      const { openStore } = await import('/js/store/db.js');
      const store = await openStore({ broadcast: true });
      const home = await store.createList({ name: 'Home' });
      const errands = await store.createList({ name: 'Errands' });
      const hours = (count) => new Date(Date.now() + count * 3_600_000).toISOString();
      const long = 'Prepare the slides for the quarterly team review and send them to everyone before the Friday meeting starts, '
        + 'with the budget figures, the hiring plan, and the open questions from last time, '
        + 'then book the large meeting room, order lunch for the whole team, and print the handouts for the guests';
      const longer = `${long}, and finally write up the minutes and share them with the board on Monday morning`;
      await store.createTask({ description: longer, 'due-time': hours(-2) }, { lists: [home.id, errands.id] });
      await store.createTask({ description: 'Buy paint', 'due-time': hours(30) });
      const gym = await store.createTask({ description: 'Gym' });
      await store.updateRules(gym.id, { 'target-count': 3 });
      await store.postEvent(gym.id, 'complete');
      await store.createTask({ description: 'Book flights' });
      store.close();
    });
    await expect(page.locator('.task-row')).toHaveCount(4);
    const danger = await page.evaluate(() => {
      const probe = document.createElement('span');
      probe.style.color = 'var(--color-danger)';
      document.body.append(probe);
      const color = getComputedStyle(probe).color;
      probe.remove();
      return color;
    });
    const shape = (row) => row.evaluate((element) => {
      const box = (selector) => element.querySelector(selector)?.getBoundingClientRect() ?? null;
      const description = element.querySelector('.task-row__description');
      const due = element.querySelector('.task-row__due');
      const list = element.querySelector('.task-row__list');
      return {
        height: element.getBoundingClientRect().height,
        lines: Math.round(description.getBoundingClientRect().height / parseFloat(getComputedStyle(description).lineHeight)),
        clamped: description.scrollHeight > description.clientHeight + 1,
        open: box('.task-row__open'),
        text: box('.task-row__description'),
        meta: box('.task-row__meta'),
        due: box('.task-row__due'),
        lists: box('.task-row__lists'),
        dueColor: due && getComputedStyle(due).color,
        dueIconColor: due && getComputedStyle(due.querySelector('.icon')).color,
        dueWeight: due && getComputedStyle(due).fontWeight,
        listGround: list && getComputedStyle(list).backgroundColor,
        separator: list?.nextElementSibling ? getComputedStyle(list.nextElementSibling, '::before').content : null,
      };
    });

    const long = await shape(page.locator('.task-row', { hasText: 'Prepare the slides' }));
    expect(long.lines).toBe(2);
    expect(long.clamped).toBe(true);
    expect(long.meta.top).toBeGreaterThanOrEqual(long.text.bottom - 1);
    expect(Math.abs(long.due.left - long.text.left)).toBeLessThanOrEqual(1);
    expect(long.dueColor).toBe(danger);
    expect(long.dueIconColor).toBe(danger);
    expect(long.dueWeight).toBe('400');
    expect(Math.abs(long.lists.right - long.meta.right)).toBeLessThanOrEqual(1);
    expect(long.lists.left).toBeGreaterThan(long.due.right);
    if (width < 768) {
      expect(long.listGround).toBe('rgba(0, 0, 0, 0)');
    }
    else {
      expect(long.listGround).not.toBe('rgba(0, 0, 0, 0)');
    }
    expect(long.separator).toBe(width < 768 ? '" · "' : 'none');

    const paint = await shape(page.locator('.task-row', { hasText: 'Buy paint' }));
    expect(paint.lines).toBe(1);
    expect(paint.dueColor).not.toBe(danger);
    expect(paint.lists).toBeNull();

    const flights = await shape(page.locator('.task-row', { hasText: 'Book flights' }));
    expect(flights.meta).toBeNull();
    expect(flights.height).toBeGreaterThanOrEqual(48);
    expect(long.height).toBeGreaterThan(flights.height);

    const gym = page.locator('.task-row', { hasText: 'Gym' });
    await expect(gym.locator('.status-button .task-row__count')).toHaveText('1/3');
    await expect(gym.locator('.task-row__meta')).toHaveCount(0);
    await expect(page.locator('.task-row__notes, .task-row__shared, .chip--overdue')).toHaveCount(0);
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(scrollWidth).toBeLessThanOrEqual(width);
    expect(problems).toEqual([]);
  });
}

test('the status button opens no menu, and the task editor posts start and cancel (TSK-4)', async ({ page }) => {
  const problems = watch(page);
  await page.setViewportSize(WIDE);
  await openApp(page);
  await seed(page);
  await showOpenOnly(page);
  const row = page.locator('.task-row', { hasText: 'Book flights' });
  await row.locator('.status-button').click({ button: 'right' });
  await expect(page.getByRole('menu')).toHaveCount(0);
  await row.locator('.status-button').focus();
  await page.keyboard.press('ArrowDown');
  await expect(page.getByRole('menu')).toHaveCount(0);
  await expect(row.locator('.status-button')).toBeFocused();
  await expect(row).toHaveAttribute('data-status', 'ready');

  const panel = page.locator('[data-editor-slot] .editor-panel');
  await row.locator('.task-row__open').click();
  await expect(panel.getByLabel('Description')).toHaveValue('Book flights');
  await panel.getByRole('tab', { name: 'Status' }).click();
  await panel.getByRole('button', { name: 'In progress', exact: true }).click();
  await expect(row).toHaveAttribute('data-status', 'in-progress');

  const paint = page.locator('.task-row', { hasText: 'Buy paint' });
  await paint.locator('.task-row__open').click();
  await expect(panel.getByLabel('Description')).toHaveValue('Buy paint');
  // Another task opens on Status again; Cancel task sits in the Danger zone of Configuration.
  await panel.getByRole('tab', { name: 'Configuration' }).click();
  await panel.getByRole('button', { name: 'Cancel task' }).click();
  await expect(paint).toHaveCount(0);
  const statuses = await page.evaluate(async () => {
    const { openStore } = await import('/js/store/db.js');
    const store = await openStore();
    const tasks = await store.listTasks();
    store.close();
    return Object.fromEntries(tasks.map((task) => [task.description, task['current-occurrence'].status]));
  });
  expect(statuses['Buy paint']).toBe('cancelled');
  expect(statuses['Book flights']).toBe('in-progress');
  expect(problems).toEqual([]);
});

for (const viewport of [COMPACT, WIDE]) {
  test(`the view options, search, and the info line change the rows at ${viewport.width} px (TV-1 to TV-12, VO-1 to VO-8)`, async ({ page }) => {
    const problems = watch(page);
    await page.setViewportSize(viewport);
    await openApp(page);
    await seed(page);
    // Default: every status, created newest first.
    expect(await rows(page)).toEqual(['Renew the gym membership', 'Water the plants', 'Book flights', 'Write the report', 'Buy paint', 'Call the plumber']);
    await expect(page.locator('.task-row', { hasText: 'Call the plumber' }).locator('.task-row__due--overdue')).toHaveText(/^(Today|Yesterday) \d\d:\d\d( [AP]M)?$/);
    await expect(page.locator(INFO)).toHaveText('6 tasks');
    await expect(page.locator('.info-line__reset')).toBeHidden();
    await expect(page.locator('.filter-chip, .view-controls__sort, .view-controls__filters')).toHaveCount(0);

    const search = page.getByLabel('Search or add a task');
    await search.fill('dana');
    await expect(page.locator('.task-row')).toHaveCount(1);
    expect(await rows(page)).toEqual(['Write the report']);
    await expect(page.locator(INFO)).toHaveText('1 of 6 tasks · Search: dana');
    await search.fill('');
    await expect(page.locator(INFO)).toHaveText('6 tasks');

    const options = await openOptions(page);
    const statusRow = options.getByRole('button', { name: /^Status/ });
    let region = await openRow(options, 'Status');
    await expect(statusRow.locator('.view-options__value')).toHaveText('All');
    for (const status of ['To do', 'In progress', 'Completed', 'Failed', 'Cancelled']) {
      await expect(region.getByLabel(status)).toBeChecked();
    }
    await expect(region.getByLabel('Finished today only')).not.toBeChecked();
    await region.getByLabel('Cancelled').uncheck();
    await expect(page.locator('.task-row')).toHaveCount(5);
    await expect(page.locator(INFO)).toHaveText('5 of 6 tasks · Status: 4 statuses');
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
    await expect(page.locator(INFO)).toHaveText('5 of 6 tasks · Status: 4 statuses · Sorted by Description, descending');
    await expect(page.locator('.info-line__reset')).toBeAttached();

    // Escape closes the panel and keeps the view; the options stay after a reload (TV-12).
    await page.keyboard.press('Escape');
    await expect(page).toHaveURL(/#\/tasks$/);
    await expect(page.locator('[data-editor-slot]')).toBeHidden();
    await page.reload();
    await expect(page.locator('.task-row')).toHaveCount(5);
    expect(await rows(page)).toEqual(['Write the report', 'Water the plants', 'Call the plumber', 'Buy paint', 'Book flights']);

    // Reset restores every option: on the info line when wide, in the view options when compact.
    if (viewport === WIDE) {
      await page.locator('.info-line__reset').click();
    }
    else {
      const panel = await openOptions(page);
      await panel.getByRole('button', { name: 'Reset' }).click();
      await panel.getByRole('button', { name: 'Show 6 tasks' }).click();
    }
    await expect(page.locator('.task-row')).toHaveCount(6);
    await expect(page.locator(INFO)).toHaveText('6 tasks');
    await search.fill('nothing like this');
    await expect(page.locator('.add-hint')).toHaveText('No task matches. Add creates it.');
    await expect(page.locator('.task-row')).toHaveCount(0);
    if (viewport === WIDE) {
      await page.locator('.info-line__reset').click();
    }
    else {
      await search.press('Escape');
    }
    await expect(page.locator('.task-row')).toHaveCount(6);
    await expect(search).toHaveValue('');
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(scrollWidth).toBeLessThanOrEqual(viewport.width);
    expect(problems).toEqual([]);
  });
}

for (const width of [320, COMPACT.width]) {
  test(`at ${width} px the add bar is one row ending in a + button, with no info line (VO-2, VO-7)`, async ({ page }) => {
    const problems = watch(page);
    await page.setViewportSize({ width, height: COMPACT.height });
    await openApp(page);
    await seed(page);
    const field = page.getByLabel('Search or add a task');
    const button = page.locator('.add-bar button[type="submit"]');
    const homeId = await page.evaluate(async () => {
      const { openStore } = await import('/js/store/db.js');
      const store = await openStore({ broadcast: true });
      const home = (await store.listLists()).find((list) => list.name === 'Home');
      store.close();
      return home.id;
    });
    for (const hash of ['#/tasks', `#/lists/${homeId}`]) {
      await page.goto(`/${hash}`);
      await expect(page.locator('.task-row').first()).toBeVisible();
      await expect(page.locator('.info-line')).toBeHidden();
      for (const [text, name] of [['', 'Add'], ['Buy paint', 'Add anyway'], ['Something new', 'Add']]) {
        await field.fill(text);
        await expect(button).toHaveAccessibleName(name);
        const input = await field.boundingBox();
        const box = await button.boundingBox();
        expect([box.width, box.height]).toEqual([44, 44]);
        expect(box.y).toBe(input.y);
        expect(box.x).toBeGreaterThanOrEqual(input.x + input.width);
        expect((await button.locator('.add-bar__label').boundingBox()).width).toBeLessThanOrEqual(1);
      }
      await field.fill('');
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    expect(problems).toEqual([]);
  });
}

test('from 64rem the Add button keeps its text, and the info line shows', async ({ page }) => {
  const problems = watch(page);
  await page.setViewportSize({ width: 1024, height: 800 });
  await openApp(page);
  await seed(page);
  const label = page.locator('.add-bar__label');
  await expect(label).toHaveText('Add');
  expect((await label.boundingBox()).width).toBeGreaterThan(20);
  await expect(page.locator(INFO)).toBeVisible();
  expect(problems).toEqual([]);
});

test('the All tasks More menu holds only Edit view options (VO-4)', async ({ page }) => {
  const problems = watch(page);
  await openApp(page);
  await seed(page);
  await page.getByRole('button', { name: /^(All tasks|View) actions$/ }).click();
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
  await expect(page.getByRole('button', { name: /^(All tasks|View) actions$/ })).toBeFocused();
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
  await expect(options.getByRole('button', { name: 'Show 6 tasks' })).toBeVisible();
  // With a filter row open, the last control scrolls into view above the Show button and is never covered by it.
  await options.getByRole('button', { name: /^Status/ }).click();
  await options.getByLabel('Descending').scrollIntoViewIfNeeded();
  const direction = await options.locator('.view-options__direction').boundingBox();
  const show = await options.getByRole('button', { name: 'Show 6 tasks' }).boundingBox();
  expect(direction.y + direction.height).toBeLessThanOrEqual(show.y + 1);
  await options.getByRole('button', { name: /^Status/ }).click();
  const status = options.getByRole('button', { name: /^Status/ });
  await status.focus();
  await page.keyboard.press('Enter');
  await expect(status).toHaveAttribute('aria-expanded', 'true');
  await options.getByLabel('Completed').focus();
  await page.keyboard.press('Space');
  await expect(options.getByLabel('Completed')).not.toBeChecked();
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
  await expect(page.locator(INFO)).toHaveText('6 tasks · Sorted by Status');
  await page.reload();
  await expect(page).toHaveURL(/#\/tasks\/view-options$/);
  const reopened = page.locator('.view-options');
  await expect(reopened).toBeVisible();
  await expect(reopened.getByLabel('Sort by')).toHaveValue('status');
  await reopened.getByRole('button', { name: 'Reset' }).click();
  await expect(page.locator(INFO)).toHaveText('6 tasks');
  await expect(reopened.getByLabel('Sort by')).toHaveValue('creation-time');
  expect(problems).toEqual([]);
});

test('rows have no More button, and the editor deletes a task that Undo brings back, also with Ctrl+Z (TSK-11)', async ({ page }) => {
  const problems = watch(page);
  await page.setViewportSize(WIDE);
  await openApp(page);
  await seed(page);
  await expect(page.locator('.task-row').first()).toBeVisible();
  await expect(page.locator('.task-row__more, .task-row [aria-haspopup]')).toHaveCount(0);
  await expect(page.getByRole('button', { name: /^More actions for / })).toHaveCount(0);
  const row = page.locator('.task-row', { hasText: 'Book flights' });
  await deleteFromEditor(page, row);
  await expect(row).toHaveCount(0);
  const toast = page.locator('.toast', { hasText: 'Task moved to the recycle bin.' });
  await toast.getByRole('button', { name: 'Undo' }).click();
  await expect(row).toHaveCount(1);
  await deleteFromEditor(page, row);
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

test('a store change keeps focus on the same row control', async ({ page }) => {
  const problems = watch(page);
  await openApp(page);
  await seed(page);
  const status = page.locator('.task-row', { hasText: 'Book flights' }).locator('.status-button');
  await status.focus();
  await page.evaluate(async () => {
    const { openStore } = await import('/js/store/db.js');
    const store = await openStore({ broadcast: true });
    await store.createTask({ description: 'Added in another tab' });
    store.close();
  });
  await expect(page.locator('.task-row')).toHaveCount(7);
  await expect(status).toBeFocused();
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
  await deleteFromEditor(page, page.locator('.task-row', { hasText: 'Book flights' }));
  await expect(page.locator('.task-row')).toHaveCount(0);
  await expect(page.getByLabel('Search or add a task')).toBeFocused();
  expect(problems).toEqual([]);
});

test('typing in the add field searches, Enter never adds once Make Enter add is off in Settings, and Add creates the task (VO-3, TSK-1)', async ({ page }) => {
  const problems = watch(page);
  await openApp(page);
  await page.goto('/#/settings');
  const enterAdds = page.getByRole('switch', { name: 'Make Enter add' });
  await expect(enterAdds).toBeChecked();
  await enterAdds.click();
  await expect(enterAdds).not.toBeChecked();
  await page.goto('/#/tasks');
  await seed(page);
  const field = page.getByLabel('Search or add a task');
  await field.fill('paint');
  await expect(page.locator('.task-row')).toHaveCount(1);
  await expect(page.locator(INFO)).toHaveText('1 of 6 tasks · Search: paint');
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
  await expect(page.getByLabel('Description')).toHaveValue('paint');
  await expect(field).toBeFocused();
  await expect(page.locator('.task-row')).toHaveCount(7);
  await expect(page.locator(INFO)).toHaveText('7 tasks');
  expect(problems).toEqual([]);
});

test('a due day, a time, and a list tag typed in the add field set the new task, with a preview first', async ({ page }) => {
  const problems = watch(page);
  await openApp(page);
  await seed(page);
  const field = page.getByLabel('Search or add a task');
  const preview = page.locator('.add-bar__preview');
  await expect(preview).toBeHidden();
  await field.fill('Buy paint tomorrow 18:00 #home');
  await expect(preview).toHaveText('Due tomorrow 18:00 · List: Home');
  await expect(field).toHaveAccessibleDescription(/Due tomorrow 18:00 · List: Home/);
  // The seeded Buy paint task makes the parsed description a known one.
  await page.getByRole('button', { name: 'Add anyway' }).click();
  await expect(field).toHaveValue('');
  await expect(preview).toBeHidden();
  await expect(page.getByLabel('Description')).toHaveValue('Buy paint');
  const added = await page.evaluate(async () => {
    const { openStore } = await import('/js/store/db.js');
    const store = await openStore();
    const snapshot = await store.snapshot();
    store.close();
    const id = location.hash.split('/').pop();
    const task = snapshot.tasks.find((candidate) => candidate.id === id);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(18, 0, 0, 0);
    const lists = snapshot.memberships.filter((membership) => membership['task-id'] === id)
      .map((membership) => snapshot.lists.find((list) => list.id === membership['list-id']).name);
    return { description: task.description, due: task['lifecycle-rules']['due-time'], expected: tomorrow.toISOString(), lists };
  });
  expect(added).toEqual({ description: 'Buy paint', due: added.expected, expected: added.expected, lists: ['Home'] });
  expect(problems).toEqual([]);
});

for (const shortcut of ['Shift+Enter', 'Alt+Enter']) {
  test(`${shortcut} in the add field adds tasks in a row, each opening in the editor (TSK-1, TSK-13)`, async ({ page }) => {
    const problems = watch(page);
    await page.setViewportSize(WIDE);
    await openApp(page);
    await seed(page);
    const field = page.getByLabel('Search or add a task');
    const description = page.getByLabel('Description');
    await field.fill('Paint the fence');
    await field.press(shortcut);
    await expect(field).toHaveValue('');
    await expect(page).toHaveURL(/#\/tasks\/[0-9a-f-]+$/);
    await expect(description).toHaveValue('Paint the fence');
    await expect(field).toBeFocused();
    await page.keyboard.type('Paint the gate');
    await page.keyboard.press(shortcut);
    await expect(description).toHaveValue('Paint the gate');
    await expect(field).toBeFocused();
    await expect(field).toHaveValue('');
    await expect(page.locator('.task-row', { hasText: /Paint the (fence|gate)/ })).toHaveCount(2);
    expect(problems).toEqual([]);
  });
}

test('on a compact screen, Enter adds task after task, keeps the focus in the add field, and opens no editor (TSK-13)', async ({ page }) => {
  const problems = watch(page);
  await page.setViewportSize(COMPACT);
  await openApp(page);
  const field = page.getByLabel('Search or add a task');
  const groceries = ['Milk', 'Eggs', 'Bread', 'Apples', 'Coffee'];
  for (const item of groceries) {
    await field.fill(item);
    await field.press('Enter');
    await expect(field).toHaveValue('');
    await expect(field).toBeFocused();
  }
  await field.fill('Butter');
  await field.press('Shift+Enter');
  await expect(field).toHaveValue('');
  await expect(page.locator('.task-row__description')).toHaveText(['Butter', ...[...groceries].reverse()]);
  await expect(page).toHaveURL(/#\/tasks$/);
  await expect(page.locator('[data-editor-slot] .task-editor')).toHaveCount(0);
  await expect(field).toBeFocused();
  await expect(page.locator('[data-live-region="polite"]', { hasText: 'Added “Butter”.' })).toHaveCount(1);
  expect(problems).toEqual([]);
});

test('a just added row keeps the hover feedback of other rows while it is highlighted', async ({ page }) => {
  const problems = watch(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize(COMPACT);
  // The highlight lasts two seconds; a paused clock keeps it on however slowly a loaded machine runs the steps.
  await page.clock.install({ time: new Date('2026-11-04T10:00:00Z') });
  await openApp(page);
  await page.clock.pauseAt(new Date('2026-11-04T10:01:00Z'));
  const field = page.getByLabel('Search or add a task');
  for (const item of ['Milk', 'Eggs']) {
    await field.fill(item);
    await field.press('Enter');
    // The add clears the field when it ends; typing the next item earlier would lose it.
    await expect(field).toHaveValue('');
  }
  const background = (locator) => locator.evaluate((row) => getComputedStyle(row).backgroundColor);
  const milk = page.locator('.task-row', { hasText: 'Milk' });
  const eggs = page.locator('.task-row', { hasText: 'Eggs' });
  await expect(eggs).toHaveClass(/task-row--added/);
  await milk.hover();
  const hovered = await background(milk);
  const highlighted = await background(eggs);
  expect(highlighted).not.toBe(hovered);
  await eggs.hover();
  await expect(eggs).toHaveClass(/task-row--added/);
  expect(await background(eggs)).toBe(hovered);
  await page.clock.runFor(2_000);
  await expect(eggs).not.toHaveClass(/task-row--added/);
  expect(problems).toEqual([]);
});

test('adding a task that the view options hide shows a toast whose Show resets those options (VO-3)', async ({ page }) => {
  const problems = watch(page);
  await page.setViewportSize(WIDE);
  await openApp(page);
  await seed(page);
  const options = await openOptions(page);
  const region = await openRow(options, 'Status');
  await region.getByLabel('To do').uncheck();
  await region.getByLabel('In progress').uncheck();
  await region.getByLabel('Failed').uncheck();
  await region.getByLabel('Cancelled').uncheck();
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

test('a task added while the Lists filter selects lists joins no list, and Show reveals it', async ({ page }) => {
  const problems = watch(page);
  await page.setViewportSize(WIDE);
  await openApp(page);
  await seed(page);
  const options = await openOptions(page);
  const region = await openRow(options, 'Lists');
  await region.getByLabel('Home').check();
  await region.getByLabel('Work').check();
  await expect(page.locator(INFO)).toContainText('Lists: 2 lists');
  await page.getByLabel('Search or add a task').fill('Paint the door');
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  const toast = page.locator('.toast', { hasText: 'Task added.' });
  await expect(toast).toContainText('Lists: 2 lists hides it.');
  await toast.getByRole('button', { name: 'Show' }).click();
  await expect(page.locator('.task-row', { hasText: 'Paint the door' })).toBeVisible();
  const memberships = await page.evaluate(async () => {
    const { openStore } = await import('/js/store/db.js');
    const store = await openStore();
    const data = await store.snapshot();
    const task = data.tasks.find((item) => item.description === 'Paint the door');
    return data.memberships.filter((membership) => membership['task-id'] === task.id).length;
  });
  expect(memberships).toBe(0);
  expect(problems).toEqual([]);
});

test('a Lists filter of a deleted list hides nothing, so adding a task shows no toast', async ({ page }) => {
  const problems = watch(page);
  await page.setViewportSize(WIDE);
  await openApp(page);
  await seed(page);
  const options = await openOptions(page);
  const region = await openRow(options, 'Lists');
  await region.getByLabel('Home').check();
  await expect(page.locator(INFO)).toContainText('Lists:');
  await page.evaluate(async () => {
    const { openStore } = await import('/js/store/db.js');
    // Broadcasting tells the app, as a write from another tab does, so its shared read of the records drops.
    const store = await openStore({ broadcast: true });
    const data = await store.snapshot();
    await store.deleteList(data.lists.find((list) => list.name === 'Home').id);
  });
  // The delete reaches the view when it mounts again; the view options keep the Lists filter.
  await page.evaluate(() => {
    location.hash = '#/settings'; 
  });
  await expect(page.getByLabel('Search or add a task')).toHaveCount(0);
  await page.evaluate(() => {
    location.hash = '#/'; 
  });
  await expect(page.locator(INFO)).not.toContainText('Lists:');
  await page.getByLabel('Search or add a task').fill('Paint the door');
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await expect(page.locator('.task-row', { hasText: 'Paint the door' })).toBeVisible();
  await expect(page.locator('.toast', { hasText: 'hides it' })).toHaveCount(0);
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
  await options.getByRole('combobox', { name: 'Group by' }).selectOption({ label: name });
}

test('Group by shows headers with counts for each option, and the choice survives a reload (VO-9 to VO-12, TV-12)', async ({ page }) => {
  const problems = watch(page);
  await openApp(page);
  await seed(page);
  await showOpenOnly(page);
  const options = await openOptions(page);
  await expect(options.getByRole('combobox', { name: 'Group by' })).toHaveValue('none');
  await expect(page.locator('.group-header')).toHaveCount(0);

  await groupBy(options, 'List');
  await expect(page.locator('.info-line__text')).toContainText('Grouped by List');
  expect(await listEntries(page)).toEqual([
    '# Home 2 of 3', 'Buy paint', 'Call the plumber', '# Work 1', 'Write the report', '# No list 1 of 2', 'Book flights',
  ]);

  await groupBy(options, 'Status');
  expect(await listEntries(page)).toEqual([
    '# To do 3', 'Book flights', 'Write the report', 'Buy paint', '# In progress 1', 'Call the plumber',
  ]);

  // The clock decides whether the later tasks fall under Today, Tomorrow, or This week; the ends are fixed.
  await groupBy(options, 'Due date');
  const byDue = await listEntries(page);
  expect(byDue.slice(0, 2)).toEqual(['# Overdue 1', 'Call the plumber']);
  expect(byDue.slice(-2)).toEqual(['# No due date 1 of 3', 'Book flights']);
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
  await showOpenOnly(page);
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
    '# Home 2 of 3', 'Buy paint', 'Call the plumber', '# Work 2', 'Write the report', 'Buy paint', '# No list 1 of 2', 'Book flights',
  ]);
  await options.getByRole('combobox', { name: 'Sort by' }).selectOption('description');
  expect((await listEntries(page)).slice(0, 3)).toEqual(['# Home 2 of 3', 'Buy paint', 'Call the plumber']);
  await page.getByLabel('Search or add a task').fill('paint');
  await expect.poll(() => listEntries(page)).toEqual(['# Home 1 of 3', 'Buy paint', '# Work 1 of 2', 'Buy paint']);
  await expect(page.locator('.info-line__text')).toContainText('1 of 6 tasks');
});

test('grouped by List, Manual order shows each list in its own order, survives a reload, and leaves with the grouping', async ({ page }) => {
  const problems = watch(page);
  await page.setViewportSize(WIDE);
  await openApp(page);
  await seed(page);
  await showOpenOnly(page);
  const options = await openOptions(page);
  const sort = options.getByRole('combobox', { name: 'Sort by' });
  await expect(sort.locator('option')).toHaveText(['Due time', 'Created', 'Last update', 'Status', 'Description']);
  await groupBy(options, 'List');
  await expect(sort.locator('option')).toHaveText(['Manual order', 'Due time', 'Created', 'Last update', 'Status', 'Description']);
  await sort.selectOption({ label: 'Manual order' });
  await expect(page.locator(INFO)).toHaveText('4 of 6 tasks · Status: open · Grouped by List · Sorted by Manual order');
  // The seed added Call the plumber to Home before Buy paint, so Home's manual order puts it first.
  const manual = ['# Home 2 of 3', 'Call the plumber', 'Buy paint', '# Work 1', 'Write the report', '# No list 1 of 2', 'Book flights'];
  await expect.poll(() => listEntries(page)).toEqual(manual);
  await page.reload();
  await expect(page.locator('html[data-shell="ready"]')).toHaveCount(1);
  await expect.poll(() => listEntries(page)).toEqual(manual);
  const reopened = await openOptions(page);
  await expect(reopened.getByRole('combobox', { name: 'Sort by' })).toHaveValue('manual');
  await groupBy(reopened, 'Status');
  await expect(reopened.getByRole('combobox', { name: 'Sort by' })).toHaveValue('creation-time');
  await expect(page.locator(INFO)).toHaveText('4 of 6 tasks · Status: open · Grouped by Status');
  expect(problems).toEqual([]);
});

for (const viewport of [COMPACT, WIDE]) {
  test(`the view options pad their controls, so focus rings stay inside the scroll box at ${viewport.width} px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await openApp(page);
    await seed(page);
    const options = await openOptions(page);
    const content = options.locator('.view-options__content');
    await expect(content).toHaveCSS('padding-inline-start', '8px');
    await expect(content).toHaveCSS('padding-inline-end', '8px');
    const box = await content.boundingBox();
    for (const control of [options.getByRole('button', { name: /^Status/ }), options.getByRole('combobox', { name: 'Group by' }), options.getByRole('combobox', { name: 'Sort by' })]) {
      await control.focus();
      const ring = await control.evaluate((element) => {
        const style = getComputedStyle(element);
        return Number.parseFloat(style.outlineWidth) + Number.parseFloat(style.outlineOffset);
      });
      const edges = await control.boundingBox();
      expect(edges.x - ring).toBeGreaterThanOrEqual(box.x);
      expect(edges.x + edges.width + ring).toBeLessThanOrEqual(box.x + box.width);
    }
  });
}

test('Finished today only shows open tasks and the tasks finished today, survives a reload, and Reset clears it (TV-14)', async ({ page }) => {
  const problems = watch(page);
  await page.setViewportSize(WIDE);
  await openApp(page);
  await seed(page);
  // The seed finished two tasks just now; these two finished on earlier days, so their last update is in the past.
  await page.evaluate(async () => {
    const { openStore } = await import('/js/store/db.js');
    const earlier = await openStore({ broadcast: true, now: () => new Date(Date.now() - 2 * 86_400_000) });
    await earlier.createTask({ description: 'Mow the lawn', status: 'completed' });
    await earlier.createTask({ description: 'Return the drill', status: 'cancelled' });
    earlier.close();
  });
  await expect(page.locator(INFO)).toHaveText('8 tasks');
  await expect(page.locator('.task-row')).toHaveCount(8);
  const options = await openOptions(page);
  const status = await openRow(options, 'Status');
  await status.getByLabel('Finished today only').check();
  await expect(page.locator(INFO)).toHaveText('6 of 8 tasks · Status: all, finished today');
  await expect(options.getByRole('button', { name: /^Status/ })).toContainText('All, finished today');
  expect((await rows(page)).sort()).toEqual([
    'Book flights', 'Buy paint', 'Call the plumber', 'Renew the gym membership', 'Water the plants', 'Write the report',
  ]);

  await page.reload();
  await expect(page.locator('html[data-shell="ready"]')).toHaveCount(1);
  await expect(page.locator(INFO)).toHaveText('6 of 8 tasks · Status: all, finished today');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('todos.view.tasks')).filter.finishedToday)).toBe(true);

  await page.locator('.info-line__reset').click();
  await expect(page.locator(INFO)).toHaveText('8 tasks');
  const reopened = await openRow(page.locator('.view-options'), 'Status');
  await expect(reopened.getByLabel('Finished today only')).not.toBeChecked();
  expect(problems).toEqual([]);
});
