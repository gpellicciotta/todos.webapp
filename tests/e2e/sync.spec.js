import { expect, test } from '@playwright/test';

// The sync indicator and the Sync log screen against a mock of the ToDo's service on the app's own origin.
// The mock answers like an empty account; `mode` switches it to unreachable, to a refused version, or to a failing server.

const SERVER = `http://127.0.0.1:${process.env.E2E_PORT ?? 8754}`;
const SESSION = { token: 'session-1', expiry: '2099-01-01T00:00:00Z', name: 'Jane Doe', email: 'jane@example.com', server: SERVER };

/**
 * Connect the page to a mocked service.
 * @param {import('@playwright/test').Page} page the page
 * @returns {Promise<{mode: string}>} the control: set `mode` to `online`, `offline`, `upgrade`, or `down`
 */
async function connect(page) {
  const service = { mode: 'online' };
  await page.addInitScript(([server, record]) => {
    if (!sessionStorage.getItem('seeded')) {
      sessionStorage.setItem('seeded', '1');
      localStorage.setItem('todos.server-url', JSON.stringify(server));
      localStorage.setItem('todos.session', JSON.stringify(record));
    }
  }, [SERVER, SESSION]);
  await page.route(`${SERVER}/api/**`, (route) => {
    const { pathname } = new URL(route.request().url());
    const json = (body, status = 200, headers = {}) => route.fulfill({ status, headers, contentType: 'application/json', body: JSON.stringify(body) });
    if (service.mode === 'offline') {
      return route.abort('failed');
    }
    if (service.mode === 'upgrade') {
      return json({ error: 'upgrade required' }, 426, { upgrade: 'todos/0.3.0' });
    }
    if (service.mode === 'down') {
      return json({ error: 'unavailable' }, 503);
    }
    if (pathname === '/api/notifications') {
      return json([]);
    }
    if (pathname === '/api/changes') {
      return json({ cursor: 'c1', 'has-more': false, lists: [], tasks: [], memberships: [], notes: [], tombstones: [], protocol: 1 });
    }
    return json({});
  });
  return service;
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
 * Add a task through the add bar.
 * @param {import('@playwright/test').Page} page the page
 * @param {string} text the description
 */
async function addTask(page, text) {
  await page.getByLabel('Search or add a task').fill(text);
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await expect(page.locator('.task-row__description', { hasText: text })).toBeVisible();
}

/**
 * Put a record into the sync log of the open database.
 * @param {import('@playwright/test').Page} page the page
 * @param {object} record the record
 */
async function seedLog(page, record) {
  await page.evaluate((entry) => new Promise((resolve, reject) => {
    const opening = indexedDB.open('todos');
    opening.onerror = () => reject(opening.error);
    opening.onsuccess = () => {
      const db = opening.result;
      const tx = db.transaction('sync-log', 'readwrite');
      tx.objectStore('sync-log').add(entry);
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => reject(tx.error);
    };
  }), record);
}

const indicator = (page) => page.locator('.sync-indicator');

test('local mode shows Local only and a Connect link in the popover', async ({ page }) => {
  await open(page, '#/tasks');
  await expect(indicator(page)).toHaveAttribute('data-state', 'local');
  await expect(indicator(page)).toContainText('Local only');
  await indicator(page).click();
  await expect(page.locator('.sync-panel').getByRole('link', { name: 'Connect' })).toHaveAttribute('href', '#/connect');
  await expect(page.locator('[data-session-banner] .banner')).toHaveCount(0);
});

test('going offline with pending changes shows Offline · n pending, and going online syncs them', async ({ page }) => {
  const service = await connect(page);
  await open(page, '#/tasks');
  await expect(indicator(page)).toHaveAttribute('data-state', 'synced');
  service.mode = 'offline';
  await addTask(page, 'Buy paint');
  await expect(indicator(page)).toHaveAttribute('data-state', 'offline');
  await expect(indicator(page).locator('.sync-indicator__label')).toHaveText('Offline · 1 pending');
  service.mode = 'online';
  await indicator(page).click();
  await page.locator('.sync-panel').getByRole('button', { name: 'Sync now' }).click();
  await expect(indicator(page)).toHaveAttribute('data-state', 'synced');
});

test('a failing service shows Sync error with Retry in the popover', async ({ page }) => {
  const service = await connect(page);
  await open(page, '#/tasks');
  await expect(indicator(page)).toHaveAttribute('data-state', 'synced');
  service.mode = 'down';
  await addTask(page, 'Call the plumber');
  await expect(indicator(page)).toHaveAttribute('data-state', 'error');
  await indicator(page).click();
  await expect(page.locator('.sync-panel')).toContainText('The service is unavailable.');
  service.mode = 'online';
  await page.locator('.sync-panel').getByRole('button', { name: 'Retry' }).click();
  await expect(indicator(page)).toHaveAttribute('data-state', 'synced');
});

test('an overwritten value shows the dot; opening the Sync log clears it and lists the entry', async ({ page }) => {
  await connect(page);
  await open(page, '#/tasks');
  await expect(indicator(page)).toHaveAttribute('data-state', 'synced');
  await seedLog(page, {
    id: 'log-1', time: new Date().toISOString(), kind: 'overwritten', target: { type: 'task', id: 'gone' }, field: 'due-time',
    sent: 'Fri 10:00', kept: 'Today 18:00',
  });
  await page.reload();
  await expect(page.locator('html[data-shell="ready"]')).toHaveCount(1);
  await expect(indicator(page).locator('.sync-indicator__dot')).toHaveCount(1);
  await indicator(page).click();
  await page.locator('.sync-panel').getByRole('link', { name: 'Sync log' }).click();
  await expect(page).toHaveURL(/#\/settings\/sync-log$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Sync log');
  const entry = page.locator('.sync-log-entry');
  await expect(entry).toHaveCount(1);
  await expect(entry).toContainText('Overwritten value');
  await expect(entry).toContainText('Lost: Fri 10:00 · Kept: Today 18:00');
  await expect(indicator(page).locator('.sync-indicator__dot')).toHaveCount(0);
});

test('a 426 reply shows Update required; Check for update requests a worker update', async ({ page }) => {
  const service = await connect(page);
  await open(page, '#/tasks');
  await expect(indicator(page)).toHaveAttribute('data-state', 'synced');
  await page.evaluate(() => {
    window.updateChecks = 0;
    const update = async () => {
      window.updateChecks += 1;
    };
    navigator.serviceWorker.getRegistration = async () => ({ update });
  });
  service.mode = 'upgrade';
  await addTask(page, 'Water the plants');
  await expect(indicator(page)).toHaveAttribute('data-state', 'update-required');
  await indicator(page).click();
  await expect(page.locator('.sync-panel')).toContainText('0.3.0');
  await page.locator('.sync-panel').getByRole('button', { name: 'Check for update' }).click();
  await expect.poll(() => page.evaluate(() => window.updateChecks)).toBe(1);
});

test('an expired session shows Sign in needed and a banner with Sign in', async ({ page }) => {
  await connect(page);
  await page.addInitScript((record) => localStorage.setItem('todos.session', JSON.stringify({ ...record, expiry: '2000-01-01T00:00:00Z' })), SESSION);
  await open(page, '#/tasks');
  await expect(indicator(page)).toHaveAttribute('data-state', 'sign-in');
  await expect(page.locator('[data-session-banner]')).toContainText('Your session expired.');
  await page.locator('[data-session-banner]').getByRole('link', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/#\/connect$/);
});
