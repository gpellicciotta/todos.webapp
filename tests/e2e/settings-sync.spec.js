import { expect, test } from '@playwright/test';

// Settings that follow the account (SYN-13): two devices, each a browser context, connect to one mocked account.
// The mock keeps the user settings like the service: it merges by edit time, keeps tombstones, and answers 304 to an unchanged ETag.

const SERVER = `http://127.0.0.1:${process.env.E2E_PORT ?? 8754}`;
const SESSION = { token: 'session-1', expiry: '2099-01-01T00:00:00Z', name: 'Jane Doe', email: 'jane@example.com', server: SERVER };
const JANE = { id: 3, email: 'jane@example.com', name: 'Jane Doe' };
const WIDE = { width: 1440, height: 900 };
const TIME = '2026-11-04T09:00:00Z';
const HOME = '0192f1a2-0000-7000-8000-0000000000a1';
const WORK = '0192f1a2-0000-7000-8000-0000000000a2';
const list = (id, name) => ({
  id, name, description: '', 'creation-time': TIME, 'last-update-time': TIME, 'deletion-time': null, revision: 10,
  owner: JANE, role: 'owner', sharing: [],
});

/**
 * Create the mocked account that both devices share.
 * @returns {{settings: Map<string, {value: unknown, 'edit-time': string}>, version: number, calls: object[]}} the account
 */
function account() {
  return { settings: new Map(), version: 1, calls: [] };
}

/**
 * Answer the service routes of one device from the shared account.
 * @param {ReturnType<typeof account>} shared the account
 * @returns {(route: import('@playwright/test').Route) => Promise<void>} the route handler
 */
function serve(shared) {
  return (route) => {
    const request = route.request();
    const { pathname, searchParams } = new URL(request.url());
    const json = (body, status = 200, headers = {}) => route.fulfill({ status, headers, contentType: 'application/json', body: JSON.stringify(body) });
    const tag = () => `"v${shared.version}"`;
    const view = () => ({ settings: Object.fromEntries([...shared.settings].sort(([a], [b]) => a.localeCompare(b))) });
    if (pathname === '/api/notifications') {
      return json([]);
    }
    if (pathname === '/api/users/me') {
      return json(JANE);
    }
    if (pathname === '/api/changes') {
      // The snapshot holds both lists; a later page after the cursor holds no change.
      const lists = searchParams.has('cursor') ? [] : [list(HOME, 'Home'), list(WORK, 'Work')];
      return json({ cursor: 'c1', 'has-more': false, lists, tasks: [], memberships: [], notes: [], tombstones: [], protocol: 1 });
    }
    if (pathname === '/api/users/me/settings') {
      const headers = request.headers();
      const call = { method: request.method(), ifNoneMatch: headers['if-none-match'] ?? null, body: request.postDataJSON(), status: 200 };
      shared.calls.push(call);
      if (request.method() === 'GET') {
        if (headers['if-none-match'] === tag()) {
          call.status = 304;
          return route.fulfill({ status: 304, headers: { etag: tag() } });
        }
        return json(view(), 200, { etag: tag() });
      }
      const body = request.postDataJSON();
      for (const [name, value] of Object.entries(body.settings)) {
        const time = body['edit-times']?.[name] ?? new Date().toISOString();
        const stored = shared.settings.get(name);
        if (!stored || Date.parse(time) >= Date.parse(stored['edit-time'])) {
          shared.settings.set(name, { value, 'edit-time': time });
          shared.version += 1;
        }
      }
      return json(view(), 200, { etag: tag() });
    }
    return json({});
  };
}

/**
 * Open a device: a browser context connected to the account, with one page.
 * @param {import('@playwright/test').Browser} browser the browser
 * @param {string} baseURL the app address
 * @param {ReturnType<typeof account>} shared the account
 * @returns {Promise<{context: import('@playwright/test').BrowserContext, page: import('@playwright/test').Page}>} the device
 */
async function device(browser, baseURL, shared) {
  const context = await browser.newContext({ baseURL, viewport: WIDE });
  await context.addInitScript(([server, record]) => {
    if (!localStorage.getItem('todos.session')) {
      localStorage.setItem('todos.server-url', JSON.stringify(server));
      localStorage.setItem('todos.session', JSON.stringify(record));
    }
  }, [SERVER, SESSION]);
  await context.route(`${SERVER}/api/**`, serve(shared));
  return { context, page: await context.newPage() };
}

/**
 * Open a route and wait until the shell has rendered it.
 * @param {import('@playwright/test').Page} page the page
 * @param {string} hash the route
 */
async function open(page, hash) {
  await page.goto(`/${hash}`);
  await expect(page.locator('html[data-shell="ready"]')).toHaveCount(1);
}

/**
 * Open the view options of All tasks by their route; an empty account shows no actions menu.
 * @param {import('@playwright/test').Page} page the page
 * @returns {Promise<import('@playwright/test').Locator>} the view options
 */
async function openOptions(page) {
  await open(page, '#/tasks/view-options');
  const options = page.locator('[data-editor-slot] .view-options');
  await expect(options).toBeVisible();
  return options;
}

test('view options, the list order, and Make Enter add set on one device appear on the other (SYN-13)', async ({ browser, baseURL }) => {
  const shared = account();
  const phone = await device(browser, baseURL, shared);
  const laptop = await device(browser, baseURL, shared);
  const names = (page) => page.locator('.lists-view .list-row__name');

  await open(phone.page, '#/lists');
  await expect(phone.page.locator('.sync-indicator')).toHaveAttribute('data-state', 'synced');
  await expect(names(phone.page)).toHaveText(['Home', 'Work']);
  await phone.page.locator('.lists-view .list-row', { hasText: 'Home' }).focus();
  await phone.page.keyboard.press('Alt+ArrowDown');
  await expect(names(phone.page)).toHaveText(['Work', 'Home']);
  await open(phone.page, '#/settings');
  await phone.page.getByRole('switch', { name: 'Make Enter add' }).click();
  await expect(phone.page.getByRole('switch', { name: 'Make Enter add' })).not.toBeChecked();
  const options = await openOptions(phone.page);
  await options.getByLabel('Sort by').selectOption({ label: 'Status' });
  await expect.poll(() => [...shared.settings.keys()].sort()).toEqual(['todos.enter-adds', 'todos.lists.order', 'todos.view.tasks']);
  expect(shared.settings.get('todos.lists.order').value).toEqual([WORK, HOME]);
  const uploaded = shared.calls.filter((call) => call.method === 'PATCH').flatMap((call) => Object.keys(call.body.settings));
  expect(uploaded.every((name) => name.startsWith('todos.'))).toBe(true);

  await open(laptop.page, '#/lists');
  await expect(names(laptop.page)).toHaveText(['Work', 'Home']);
  await expect(laptop.page.locator('.app__sidebar .nav-item--list .nav-item__label')).toHaveText(['Work', 'Home']);
  await open(laptop.page, '#/settings');
  await expect(laptop.page.getByRole('switch', { name: 'Make Enter add' })).not.toBeChecked();
  const mirrored = await openOptions(laptop.page);
  await expect(mirrored.getByLabel('Sort by')).toHaveValue('status');
  // An unchanged account answers 304, so a later run of the laptop downloads nothing.
  await expect.poll(() => shared.calls.some((call) => call.method === 'GET' && call.ifNoneMatch !== null && call.status === 304)).toBe(true);
  expect(await laptop.page.evaluate(() => localStorage.getItem('todos.theme'))).toBeNull();

  await phone.context.close();
  await laptop.context.close();
});
