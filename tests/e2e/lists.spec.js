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

for (const [name, viewport, compact] of [['compact', { width: 390, height: 844 }, true], ['wide', WIDE, false]]) {
  test(`New list floats at the bottom right of the screen on the ${name} layout`, async ({ page }) => {
    const problems = watch(page);
    await seed(page);
    await page.setViewportSize(viewport);
    await page.goto('/#/lists');
    const button = page.locator('.app__overlays .fab');
    await expect(button).toBeVisible();
    expect(await button.evaluate((element) => getComputedStyle(element).position)).toBe('fixed');
    const box = await button.boundingBox();
    await expect(page.locator('.app__overlays').getByRole('link', { name: 'New list' })).toHaveCount(1);
    await expect(button).toHaveText('');
    expect(Math.abs(box.width - box.height)).toBeLessThanOrEqual(0.5);
    expect(box.width).toBeGreaterThanOrEqual(44);
    expect(await button.evaluate((element) => {
      const radius = getComputedStyle(element).borderTopLeftRadius;
      return radius.endsWith('%') ? parseFloat(radius) >= 50 : parseFloat(radius) >= element.getBoundingClientRect().width / 2;
    })).toBe(true);
    expect(viewport.width - (box.x + box.width)).toBeLessThanOrEqual(32);
    expect(viewport.width - (box.x + box.width)).toBeGreaterThanOrEqual(8);
    if (compact) {
      const nav = await page.locator('.app__bottom-nav').boundingBox();
      expect(box.y + box.height).toBeLessThanOrEqual(nav.y);
      expect(nav.y - (box.y + box.height)).toBeLessThanOrEqual(32);
    }
    else {
      expect(viewport.height - (box.y + box.height)).toBeLessThanOrEqual(32);
    }
    expect(problems).toEqual([]);
  });
}

test('the floating New list button stays over the rows, and the last row scrolls clear of it', async ({ page }) => {
  const problems = watch(page);
  await seed(page);
  await page.setViewportSize({ width: 390, height: 600 });
  await page.evaluate(async () => {
    const { openStore } = await import('/js/store/db.js');
    const store = await openStore({ broadcast: true });
    for (let index = 0; index < 40; index += 1) {
      await store.createList({ name: `Extra list ${index}` });
    }
    store.close();
  });
  await page.goto('/#/lists');
  const button = page.locator('.app__overlays .fab');
  await expect(page.locator('.lists-view .list-row')).toHaveCount(42);
  const before = await button.boundingBox();
  await page.locator('#main').evaluate((main) => {
    main.scrollTop = main.scrollHeight;
  });
  const after = await button.boundingBox();
  expect(after.y).toBe(before.y);
  const last = await page.locator('.lists-view .list-row').last().boundingBox();
  expect(last.y + last.height).toBeLessThanOrEqual(after.y);
  const topmost = await button.evaluate((element) => {
    const box = element.getBoundingClientRect();
    return element.contains(document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2));
  });
  expect(topmost).toBe(true);
  expect(problems).toEqual([]);
});

test('the floating New list button hides while the New list editor is open', async ({ page }) => {
  await seed(page);
  await page.goto('/#/lists');
  await page.locator('.app__overlays .fab').click();
  await expect(page).toHaveURL(/#\/lists\/new$/);
  await expect(page.locator('.app__overlays .fab')).toBeHidden();
  await page.keyboard.press('Escape');
  await expect(page.locator('.app__overlays .fab')).toBeVisible();
});

test('New list creates only through Create and discards drafts on close (LST-1, LST-3)', async ({ page }) => {
  const problems = watch(page);
  await seed(page);
  await page.goto('/#/lists');
  const rows = page.locator('.lists-view .list-row__name');
  await expect(rows).toHaveText(['Home', 'Work']);
  await page.locator('.app__overlays').getByRole('link', { name: 'New list' }).click();
  await expect(page).toHaveURL(/#\/lists\/new$/);
  const panel = page.locator('[data-editor-slot] .editor-panel');
  await expect(panel.locator('.editor-panel__title')).toHaveText('New list');
  const name = panel.getByRole('textbox', { name: 'Name' });
  await expect(name).toBeFocused();
  const create = panel.getByRole('button', { name: 'Create', exact: true });
  await expect(create).toBeDisabled();
  await name.fill('Discarded with Escape');
  await name.press('Tab');
  await expect(create).toBeEnabled();
  await expect(rows).toHaveText(['Home', 'Work']);
  await page.keyboard.press('Escape');
  await expect(panel).toHaveCount(0);
  await expect(page).toHaveURL(/#\/lists$/);
  await expect(rows).toHaveText(['Home', 'Work']);

  await page.locator('.app__overlays').getByRole('link', { name: 'New list' }).click();
  await name.fill('Discarded with close');
  await panel.getByRole('textbox', { name: 'Description' }).fill('Never saved');
  await panel.getByRole('button', { name: 'Close the list editor' }).click();
  await expect(panel).toHaveCount(0);
  await expect(rows).toHaveText(['Home', 'Work']);

  await page.locator('.app__overlays').getByRole('link', { name: 'New list' }).click();
  await expect(name).toBeFocused();
  await name.fill('home');
  await name.press('Tab');
  const error = panel.locator('[data-section="fields"] .field__error').first();
  await expect(error).toHaveText('A list named "Home" already exists.');
  await expect(create).toBeDisabled();
  await expect(rows).toHaveText(['Home', 'Work']);
  await name.fill('Garden');
  await name.press('Tab');
  await expect(create).toBeEnabled();
  await expect(rows).toHaveText(['Home', 'Work']);
  await expect(error).toBeHidden();
  await panel.getByRole('textbox', { name: 'Description' }).fill('Flowers and vegetables');
  await create.click();
  await expect(rows).toHaveText(['Garden', 'Home', 'Work']);
  await expect(create).toBeHidden();
  await page.keyboard.press('Escape');
  await expect(page).toHaveURL(/#\/lists$/);
  await expect(page.locator('.list-row', { hasText: 'Garden' }).locator('.list-row__description')).toHaveText('Flowers and vegetables');
  await expect(page.locator('.app__sidebar .nav-item--list .nav-item__label')).toHaveText(['Garden', 'Home', 'Work']);
  expect(problems).toEqual([]);
});

test('dragging a list handle reorders the Lists screen, and the sidebar and a reload keep the order', async ({ page }) => {
  const problems = watch(page);
  await seed(page);
  await page.goto('/#/lists');
  const names = page.locator('.lists-view .list-row__name');
  const sidebar = page.locator('.app__sidebar .nav-item--list .nav-item__label');
  await expect(names).toHaveText(['Home', 'Work']);
  const handle = await page.locator('.lists-view .list-item__handle').first().boundingBox();
  const last = await page.locator('.lists-view .list-item').last().boundingBox();
  await page.mouse.move(handle.x + handle.width / 2, handle.y + handle.height / 2);
  await page.mouse.down();
  await page.mouse.move(handle.x + handle.width / 2, last.y + last.height - 4, { steps: 8 });
  await page.mouse.up();
  await expect(names).toHaveText(['Work', 'Home']);
  await expect(sidebar).toHaveText(['Work', 'Home']);
  await page.reload();
  await expect(names).toHaveText(['Work', 'Home']);
  await expect(sidebar).toHaveText(['Work', 'Home']);
  expect(problems).toEqual([]);
});

test('the More button of a list row opens the menu of the list view, and Edit list opens the list editor (LST-9, VO-4)', async ({ page }) => {
  const problems = watch(page);
  const homeId = await seed(page);
  await page.goto('/#/lists');
  await page.getByRole('button', { name: 'List actions: Home' }).click();
  await expect(page.getByRole('menuitem')).toHaveText(['Edit list', 'Edit view options', 'Share list', 'Move to bottom', 'Delete list']);
  await page.getByRole('menuitem', { name: 'Edit list' }).click();
  await expect(page).toHaveURL(new RegExp(`#/lists/${homeId}/edit$`));
  await expect(page.locator('[data-editor-slot] .editor-panel').getByRole('textbox', { name: 'Name' })).toHaveValue('Home');
  await page.goto('/#/lists');
  await page.getByRole('button', { name: 'List actions: Home' }).click();
  await page.getByRole('menuitem', { name: 'Edit view options' }).click();
  await expect(page).toHaveURL(new RegExp(`#/lists/${homeId}/view-options$`));
  await expect(page.locator('[data-editor-slot] .view-options')).toBeVisible();
  expect(problems).toEqual([]);
});

test('Alt+Up and Alt+Down reorder lists by keyboard, announce the move, and keep new lists last', async ({ page }) => {
  const problems = watch(page);
  await seed(page);
  await page.goto('/#/lists');
  const names = page.locator('.lists-view .list-row__name');
  const sidebar = page.locator('.app__sidebar .nav-item--list .nav-item__label');
  await expect(names).toHaveText(['Home', 'Work']);
  await expect(page.getByRole('button', { name: /^Move (up|down)/ })).toHaveCount(0);
  await page.locator('.lists-view .list-row', { hasText: 'Home' }).focus();
  await page.keyboard.press('Alt+ArrowDown');
  await expect(names).toHaveText(['Work', 'Home']);
  await expect(page.locator('.lists-view .list-row', { hasText: 'Home' })).toBeFocused();
  await expect(page.locator('[aria-live="polite"]').filter({ hasText: 'Home moved to position 2 of 2.' })).toHaveCount(1);
  await expect(sidebar).toHaveText(['Work', 'Home']);
  await page.keyboard.press('Alt+ArrowUp');
  await expect(names).toHaveText(['Home', 'Work']);
  await page.locator('.app__sidebar [data-nav^="list:"]').nth(1).focus();
  await page.keyboard.press('Alt+ArrowUp');
  await expect(sidebar).toHaveText(['Work', 'Home']);
  await expect(page.locator('.app__sidebar [data-nav^="list:"]').first()).toBeFocused();
  await expect(names).toHaveText(['Work', 'Home']);
  await page.evaluate(async () => {
    const { openStore } = await import('/js/store/db.js');
    const store = await openStore({ broadcast: true });
    await store.createList({ name: 'Archive' });
    store.close();
  });
  await expect(names).toHaveText(['Work', 'Home', 'Archive']);
  await expect(sidebar).toHaveText(['Work', 'Home', 'Archive']);
  expect(problems).toEqual([]);
});

test('with 124 lists, Move to bottom and Alt+Home move a list to an end, scroll it into view, and the sidebar keeps the order (LST-13)', async ({ page }) => {
  const problems = watch(page);
  const total = 124;
  const nameAt = (index) => `List ${String(index).padStart(3, '0')}`;
  await page.setViewportSize(WIDE);
  await page.goto('/#/tasks');
  await expect(page.locator('html[data-shell="ready"]')).toHaveCount(1);
  await page.evaluate(async (count) => {
    const { openStore } = await import('/js/store/db.js');
    const store = await openStore({ broadcast: true });
    for (let index = 1; index <= count; index += 1) {
      await store.createList({ name: `List ${String(index).padStart(3, '0')}` });
    }
    store.close();
  }, total);
  await page.goto('/#/lists');
  const names = page.locator('.lists-view .list-row__name');
  const sidebar = page.locator('.app__sidebar .nav-item--list .nav-item__label');
  const live = page.locator('[aria-live="polite"]');
  await expect(names).toHaveCount(total);
  await expect(names.first()).toHaveText(nameAt(1));
  const more = page.getByRole('button', { name: `List actions: ${nameAt(1)}` });
  await more.click();
  await expect(page.getByRole('menuitem', { name: 'Move to top' })).toHaveCount(0);
  await page.getByRole('menuitem', { name: 'Move to bottom' }).click();
  await expect(names.last()).toHaveText(nameAt(1));
  await expect(names.first()).toHaveText(nameAt(2));
  await expect(live.filter({ hasText: `${nameAt(1)} moved to position ${total} of ${total}.` })).toHaveCount(1);
  await expect(more).toBeFocused();
  await expect(more).toBeInViewport();
  await expect(sidebar.last()).toHaveText(nameAt(1));
  await page.reload();
  await expect(names.last()).toHaveText(nameAt(1));
  await expect(sidebar.last()).toHaveText(nameAt(1));
  await expect(sidebar.first()).toHaveText(nameAt(2));
  // Alt+Home brings the last row back to the top, from the keyboard alone.
  const row = page.locator('.lists-view .list-row', { hasText: nameAt(1) });
  await row.focus();
  await page.keyboard.press('Alt+Home');
  await expect(names.first()).toHaveText(nameAt(1));
  await expect(row).toBeFocused();
  await expect(row).toBeInViewport();
  await expect(live.filter({ hasText: `${nameAt(1)} moved to position 1 of ${total}.` })).toHaveCount(1);
  await expect(sidebar.first()).toHaveText(nameAt(1));
  // The sidebar takes Alt+End on a focused link too, and keeps focus on it.
  const link = page.locator('.app__sidebar [data-nav^="list:"]', { hasText: nameAt(1) });
  await link.focus();
  await page.keyboard.press('Alt+End');
  await expect(sidebar.last()).toHaveText(nameAt(1));
  await expect(link).toBeFocused();
  await expect(link).toBeInViewport();
  await expect(names.last()).toHaveText(nameAt(1));
  expect(problems).toEqual([]);
});

test('connected with two shared lists, Shared only shows just those lists and survives a reload (LST-16)', async ({ page }) => {
  const server = `http://127.0.0.1:${process.env.E2E_PORT ?? 8754}`;
  const time = '2026-11-04T09:00:00Z';
  const jane = { id: 3, email: 'jane@example.com', name: 'Jane Doe' };
  const sam = { id: 9, email: 'sam@example.com', name: 'Sam Roe' };
  const list = (id, name, fields) => ({
    id, name, description: '', 'creation-time': time, 'last-update-time': time, 'deletion-time': null, revision: 10, ...fields,
  });
  const feed = {
    lists: [
      list('0192f1a2-0000-7000-8000-0000000000a1', 'Family', { owner: jane, role: 'owner', sharing: [{ id: 1, 'shared-with-email': 'p@example.com', 'shared-role': 'viewer' }] }),
      list('0192f1a2-0000-7000-8000-0000000000a2', 'Garden', { owner: sam, role: 'editor', sharing: [] }),
      ...Array.from({ length: 10 }, (_, index) => list(`0192f1a2-0000-7000-8000-0000000001${String(index).padStart(2, '0')}`, `Solo ${index + 1}`, { owner: jane, role: 'owner', sharing: [] })),
    ],
    tasks: [],
    memberships: [],
  };
  await page.addInitScript((session) => {
    localStorage.setItem('todos.session', JSON.stringify(session));
    localStorage.setItem('todos.server-url', JSON.stringify(session.server));
  }, { token: 'session-1', expiry: '2099-01-01T00:00:00Z', name: 'Jane Doe', email: 'jane@example.com', server });
  await page.route(`${server}/api/**`, (route) => {
    const { pathname } = new URL(route.request().url());
    const json = (body) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
    if (pathname === '/api/users/me') {
      return json(jane);
    }
    if (pathname === '/api/changes') {
      return json({ cursor: 'c1', 'has-more': false, notes: [], tombstones: [], protocol: 1, ...feed });
    }
    return json(pathname === '/api/notifications' ? [] : {});
  });
  await page.setViewportSize(WIDE);
  await page.goto('/#/lists');
  await expect(page.locator('html[data-shell="ready"]')).toHaveCount(1);
  const names = page.locator('[data-view="lists"] .list-row__name');
  await expect(names).toHaveCount(12);
  await page.getByRole('button', { name: /^Sort:/ }).click();
  await page.getByRole('menuitemcheckbox', { name: 'Shared only' }).click();
  await expect(names).toHaveText(['Family', 'Garden']);
  await expect(page.locator('.lists-find .info-line__text')).toHaveText('2 of 12 lists · Shared only');
  await page.reload();
  await expect(names).toHaveText(['Family', 'Garden']);
  await page.locator('.lists-find .info-line__reset').click();
  await expect(names).toHaveCount(12);
});

test('Enter in the new list name creates the draft', async ({ page }) => {
  const problems = watch(page);
  await page.goto('/#/lists/new');
  const name = page.getByRole('textbox', { name: 'Name', exact: true });
  await name.fill('Created by Enter');
  await name.press('Enter');
  await expect(page.locator('.lists-view .list-row__name')).toHaveText(['Created by Enter']);
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-editor-slot]')).toBeHidden();
  expect(problems).toEqual([]);
});

test('Edit list renames the list, and deleting it keeps its tasks visible in All tasks (LST-4, LST-6, LST-7)', async ({ page }) => {
  const problems = watch(page);
  const homeId = await seed(page);
  await page.goto(`/#/lists/${homeId}`);
  await page.getByRole('button', { name: /^[^:]+ actions$/ }).click();
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
  await expect(page.locator('.task-row__description')).toHaveText(['Water the plants', 'Fix the door', 'Buy paint']);
  await expect(page.locator('.app__sidebar .nav-item--list .nav-item__label')).toHaveText(['Work']);
  expect(problems).toEqual([]);
});
