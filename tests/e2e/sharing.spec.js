import { expect, test } from '@playwright/test';

// The Sharing section, the role-aware controls, and the Shared filter, against a mock of the ToDo's service.
// The mock sits on the app's own origin, so nothing reaches a live service (see connect.spec.js).

const SERVER = `http://127.0.0.1:${process.env.E2E_PORT ?? 8754}`;
const SESSION = { token: 'session-1', expiry: '2099-01-01T00:00:00Z', name: 'Jane Doe', email: 'jane@example.com', server: SERVER };
const JANE = { id: 3, email: 'jane@example.com', name: 'Jane Doe' };
const SAM = { id: 9, email: 'sam@example.com', name: 'Sam Roe' };
const WIDE = { width: 1440, height: 900 };
const FAMILY = '0192f1a2-0000-7000-8000-000000000001';
const SOLO = '0192f1a2-0000-7000-8000-000000000002';
const TIME = '2026-11-04T09:00:00Z';

const list = (id, name, fields) => ({
  id, name, description: '', 'creation-time': TIME, 'last-update-time': TIME, 'deletion-time': null, revision: 10, ...fields,
});
const task = (id, description, fields = {}) => ({
  id, description, status: 'todo', 'due-time': null, 'overdue-handling': 'keep', 'owner-id': 3, 'creation-time': TIME,
  'last-update-time': TIME, 'last-activity-time': TIME, 'deletion-time': null, revision: 10, ...fields,
});
const member = (listId, taskId) => ({ 'list-id': listId, 'task-id': taskId, position: 'a0', 'added-time': TIME, revision: 10 });

/**
 * Connect the page to a mock service that serves a feed and the sharing calls.
 * @param {import('@playwright/test').Page} page the page
 * @param {object} feed the feed rows: `lists`, `tasks`, and `memberships`
 * @param {object[]} [rules] the sharing rules of the family list
 * @returns {Promise<{calls: {method: string, path: string, body: any}[], rules: object[]}>} the recorded calls and the live rules
 */
async function connect(page, feed, rules = []) {
  const state = { calls: [], rules: [...rules], next: 60 };
  await page.addInitScript((session) => {
    localStorage.setItem('todos.session', JSON.stringify(session));
    localStorage.setItem('todos.server-url', JSON.stringify(session.server));
  }, SESSION);
  await page.route(`${SERVER}/api/**`, (route) => {
    const request = route.request();
    const { pathname } = new URL(request.url());
    const json = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
    if (pathname === '/api/notifications') {
      return json([]);
    }
    if (pathname === '/api/users/me') {
      return json(JANE);
    }
    if (pathname === '/api/changes') {
      return json({ cursor: 'c1', 'has-more': false, notes: [], tombstones: [], protocol: 1, ...feed });
    }
    const body = request.postDataJSON?.() ?? undefined;
    state.calls.push({ method: request.method(), path: pathname, body });
    if (pathname === `/api/lists/${FAMILY}/sharing` && request.method() === 'GET') {
      return json(state.rules);
    }
    if (pathname === `/api/lists/${FAMILY}/sharing` && request.method() === 'POST') {
      state.next += 1;
      state.rules.push({ id: state.next, 'shared-list-id': FAMILY, 'shared-with-email': body['target-user-email'], 'shared-role': body['target-user-role'] });
      return json(state.rules.at(-1));
    }
    if (pathname.startsWith(`/api/lists/${FAMILY}/sharing/`) && request.method() === 'DELETE') {
      state.rules = state.rules.filter((rule) => String(rule.id) !== pathname.split('/').pop());
      return json({ result: 'ok' });
    }
    if (pathname === '/api/sharing-requests') {
      return json({ id: 5 });
    }
    return json({});
  });
  return new Proxy(state, { get: (target, key) => target[key] });
}

/**
 * Open a route and wait until the shell has rendered it.
 * @param {import('@playwright/test').Page} page the page
 * @param {string} hash the route
 */
async function open(page, hash) {
  await page.setViewportSize(WIDE);
  await page.goto('/#/tasks');
  await expect(page.locator('html[data-shell="ready"]')).toHaveCount(1);
  // A connected app pulls its lists first; a route to a list that is not stored yet would fall back to All tasks.
  await expect(page.locator('.task-row').first()).toBeVisible();
  await page.evaluate((target) => {
    location.hash = target;
  }, hash);
}

const OWNED = {
  lists: [list(FAMILY, 'Family', { owner: JANE, role: 'owner', sharing: [] })],
  tasks: [task('t1', 'Plan the trip')],
  memberships: [member(FAMILY, 't1')],
};

const RULES = [{ id: 51, 'shared-list-id': FAMILY, 'shared-with-email': 'partner@example.com', 'shared-role': 'viewer' }];

test('an owner invites an email with a role, changes a role, and removes a person (SHR-1, SHR-2)', async ({ page }) => {
  const service = await connect(page, { ...OWNED, lists: [{ ...OWNED.lists[0], sharing: RULES }] }, RULES);
  await open(page, `#/lists/${FAMILY}/edit`);
  const section = page.locator('[data-section="sharing"]');
  await expect(section.getByText('partner@example.com')).toBeVisible();
  await expect(section.getByRole('combobox', { name: 'Role of partner@example.com' })).toHaveValue('viewer');
  await expect(section.getByLabel('Role', { exact: true })).toHaveValue('task-editor');
  await section.getByLabel('Email address').fill('friend@example.com');
  await section.getByLabel('Role', { exact: true }).selectOption('viewer');
  await section.getByRole('button', { name: 'Invite' }).click();
  await expect(section.getByRole('status').filter({ hasText: 'friend@example.com' })).toBeVisible();
  expect(service.calls.find((call) => call.path === '/api/sharing-requests').body)
    .toEqual({ 'list-id': FAMILY, 'target-user-email': 'friend@example.com', 'target-user-role': 'viewer' });
  await section.getByRole('combobox', { name: 'Role of partner@example.com' }).selectOption('editor');
  await expect(section.getByRole('status').filter({ hasText: 'partner@example.com is now editor.' })).toBeVisible();
  await expect(section.getByRole('combobox', { name: 'Role of partner@example.com' })).toHaveValue('editor');
  expect(service.rules.map((rule) => [rule['shared-with-email'], rule['shared-role']])).toEqual([['partner@example.com', 'editor']]);
  await section.getByRole('button', { name: 'Remove partner@example.com' }).click();
  await expect(section.getByRole('status').filter({ hasText: 'partner@example.com no longer has access.' })).toBeVisible();
  await expect(section.getByText('partner@example.com', { exact: true })).toHaveCount(0);
  expect(service.rules).toEqual([]);
});

test('Share list opens the list editor at its Sharing section (SHR-1)', async ({ page }) => {
  await connect(page, OWNED);
  await open(page, `#/lists/${FAMILY}`);
  await page.getByRole('button', { name: 'List actions' }).click();
  await page.getByRole('menuitem', { name: 'Share list' }).click();
  await expect(page).toHaveURL(new RegExp(`#/lists/${FAMILY}/share$`));
  await expect(page.locator('[data-section="sharing"]').getByRole('button', { name: 'Invite' })).toBeVisible();
});

test('a viewer sees the list read-only, without edit, move, or delete controls (SHR-3, SHR-4)', async ({ page }) => {
  await connect(page, {
    lists: [list(FAMILY, 'Family', { owner: SAM, role: 'viewer', sharing: [] })],
    tasks: [task('t1', 'Plan the trip', { 'owner-id': 9 })],
    memberships: [member(FAMILY, 't1')],
  });
  await open(page, `#/lists/${FAMILY}`);
  await expect(page.locator('.list-view__owner')).toHaveText('Shared by Sam Roe · Viewer');
  await expect(page.getByRole('button', { name: 'Add', exact: true })).toBeHidden();
  const row = page.locator('.task-row', { hasText: 'Plan the trip' });
  await expect(row.locator('.status-button')).toBeDisabled();
  await expect(row.locator('[data-role="more"]')).toBeHidden();
  await expect(row.locator('.task-row__handle')).toHaveCount(0);
  await page.getByRole('button', { name: 'List actions' }).click();
  await expect(page.getByRole('menuitem')).toHaveText(['List details', 'Edit view options']);
  await page.keyboard.press('Escape');
  await row.locator('.task-row__open').click();
  const editor = page.locator('[data-editor-slot]');
  await expect(editor.locator('[data-banner="read-only"]')).toContainText('Sam Roe');
  await expect(editor.getByRole('textbox', { name: 'Description' })).toBeDisabled();
  await expect(editor.getByRole('button', { name: 'Delete task' })).toBeHidden();
  await page.evaluate((target) => {
    location.hash = target;
  }, `#/lists/${FAMILY}/edit`);
  await expect(editor.getByRole('textbox', { name: 'Name' })).toBeDisabled();
  await expect(editor.getByRole('button', { name: 'Delete list' })).toBeHidden();
  await expect(editor.locator('[data-sharing="own-role"]')).toContainText('Viewer');
  await expect(editor.locator('[data-section="sharing"] input, [data-section="sharing"] select, [data-section="sharing"] button')).toHaveCount(0);
});

test('offline, the sharing controls are disabled and a banner says sharing needs a connection (SHR-6)', async ({ page, context }) => {
  await connect(page, { ...OWNED, lists: [{ ...OWNED.lists[0], sharing: RULES }] }, RULES);
  await open(page, `#/lists/${FAMILY}/edit`);
  const section = page.locator('[data-section="sharing"]');
  await expect(section.getByRole('button', { name: 'Invite' })).toBeEnabled();
  await context.setOffline(true);
  await expect(section.getByText('Sharing needs a connection.')).toBeVisible();
  for (const control of await section.locator('button, select, input').all()) {
    await expect(control).toBeDisabled();
  }
  await context.setOffline(false);
  await expect(section.getByText('Sharing needs a connection.')).toBeHidden();
  await expect(section.getByRole('button', { name: 'Invite' })).toBeEnabled();
});

test('the Shared filter of All tasks shows only the tasks of shared lists while connected (TV-7)', async ({ page }) => {
  await connect(page, {
    lists: [
      list(FAMILY, 'Family', { owner: JANE, role: 'owner', sharing: RULES }),
      list(SOLO, 'Solo', { owner: JANE, role: 'owner', sharing: [] }),
    ],
    tasks: [task('t1', 'Plan the trip'), task('t2', 'Buy paint')],
    memberships: [member(FAMILY, 't1'), member(SOLO, 't2')],
  });
  await open(page, '#/tasks/view-options');
  const options = page.locator('[data-editor-slot] .view-options');
  await options.getByRole('button', { name: /^Shared/ }).click();
  await options.getByRole('radio', { name: 'Shared', exact: true }).check();
  await expect(page.locator('.task-row__description')).toHaveText(['Plan the trip']);
  await expect(page.locator('.info-line__text')).toContainText('Shared: yes');
  await options.getByRole('radio', { name: 'Not shared' }).check();
  await expect(page.locator('.task-row__description')).toHaveText(['Buy paint']);
});

test('All tasks offers no Shared filter in local mode (TV-7)', async ({ page }) => {
  await page.setViewportSize(WIDE);
  await page.goto('/#/tasks/view-options');
  await expect(page.locator('html[data-shell="ready"]')).toHaveCount(1);
  await expect(page.locator('[data-editor-slot] .view-options').getByRole('button', { name: /^Shared/ })).toBeHidden();
});
