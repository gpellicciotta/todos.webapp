import { expect, test } from '@playwright/test';

// The inbox against a mock of the ToDo's service on the app's own origin: bell, badge, panel, broadcast banner,
// and local mode. Nothing reaches a live service.

const SERVER = `http://127.0.0.1:${process.env.E2E_PORT ?? 8754}`;
const SESSION = { token: 'session-1', expiry: '2099-01-01T00:00:00Z', name: 'Jane Doe', email: 'jane@example.com', server: SERVER };

/**
 * Create a server notification.
 * @param {number} id the identifier
 * @param {object} [overrides] fields to override
 * @returns {object} the notification
 */
function notification(id, overrides = {}) {
  return {
    id, title: `Title ${id}`, message: `Message ${id}`, type: 'info', source: 'admin-broadcast', banner: false,
    'action-url': null, 'creation-time': '2026-11-07T08:00:00Z', 'read-time': null, read: false, ...overrides,
  };
}

/**
 * Mock the service's inbox endpoints over a notification list.
 * @param {import('@playwright/test').Page} page the page
 * @param {object[]} initial the notifications
 * @returns {Promise<{calls: {method: string, path: string, authorization: string}[]}>} the recorded calls
 */
async function mockInbox(page, initial) {
  let items = initial;
  const calls = [];
  await page.route(`${SERVER}/api/**`, (route) => {
    const request = route.request();
    const { pathname } = new URL(request.url());
    calls.push({ method: request.method(), path: pathname, authorization: request.headers().authorization ?? '' });
    const json = (body) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
    const id = Number(pathname.split('/')[3]);
    if (pathname === '/api/notifications') {
      return json(items);
    }
    if (pathname === '/api/notifications/clear-all') {
      items = [];
      return json({ success: true });
    }
    if (pathname.endsWith('/read')) {
      items = items.map((item) => (item.id === id ? { ...item, read: true, 'read-time': '2026-11-07T09:00:00Z' } : item));
      return json(items.find((item) => item.id === id));
    }
    if (request.method() === 'DELETE') {
      items = items.filter((item) => item.id !== id);
      return json({ success: true });
    }
    return route.fulfill({ status: 204 });
  });
  return { calls };
}

/**
 * Open the app and wait until the shell is ready.
 * @param {import('@playwright/test').Page} page the page
 */
async function open(page) {
  await page.goto('/#/tasks');
  await expect(page.locator('html[data-shell="ready"]')).toHaveCount(1);
}

/**
 * Store a connected session before the app starts.
 * @param {import('@playwright/test').Page} page the page
 */
async function connect(page) {
  await page.addInitScript((session) => localStorage.setItem('todos.session', JSON.stringify(session)), SESSION);
}

test('a connected app shows the bell with the unread count, and the panel lists the notifications', async ({ page }) => {
  await connect(page);
  const { calls } = await mockInbox(page, [notification(2), notification(1, { read: true })]);
  await open(page);
  const bell = page.getByRole('button', { name: 'Inbox, 1 unread' });
  await expect(bell).toBeVisible();
  await bell.click();
  const rows = page.locator('.inbox-item');
  await expect(rows).toHaveCount(2);
  await expect(rows.first()).toContainText('Title 2');
  await expect(rows.first()).toContainText('Message 2');
  expect(calls[0]).toEqual({ method: 'GET', path: '/api/notifications', authorization: 'Bearer session-1' });
});

test('mark read, discard, and clear all change the inbox and the badge', async ({ page }) => {
  await connect(page);
  await mockInbox(page, [notification(3), notification(2), notification(1)]);
  await open(page);
  await page.getByRole('button', { name: 'Inbox, 3 unread' }).click();
  await page.locator('.inbox-item[data-id="3"]').getByRole('button', { name: 'Mark read' }).click();
  await expect(page.locator('.inbox-item[data-id="3"]')).toHaveAttribute('data-read', 'true');
  await expect(page.getByRole('button', { name: 'Inbox, 2 unread' })).toBeVisible();
  await page.locator('.inbox-item[data-id="2"]').getByRole('button', { name: 'Discard' }).click();
  await expect(page.locator('.inbox-item')).toHaveCount(2);
  await page.getByRole('button', { name: 'Clear all' }).click();
  await expect(page.locator('.inbox-item')).toHaveCount(0);
  await expect(page.locator('.inbox-panel')).toContainText('No notifications');
  await expect(page.getByRole('button', { name: 'Inbox', exact: true })).toBeVisible();
});

test('a broadcast with a banner shows above the view until it is dismissed', async ({ page }) => {
  await connect(page);
  const { calls } = await mockInbox(page, [notification(5, { title: 'Scheduled Maintenance', message: 'Sunday at 02:00 UTC.', banner: true })]);
  await open(page);
  const banner = page.locator('.app__broadcasts .banner');
  await expect(banner).toContainText('Scheduled Maintenance');
  await expect(banner).toContainText('Sunday at 02:00 UTC.');
  await page.goto('/#/lists');
  await expect(banner).toBeVisible();
  await banner.getByRole('button', { name: 'Dismiss Scheduled Maintenance' }).click();
  await expect(banner).toHaveCount(0);
  expect(calls.some((call) => call.method === 'POST' && call.path === '/api/notifications/5/read')).toBe(true);
  await expect(page.getByRole('button', { name: 'Inbox', exact: true })).toBeVisible();
});

test('local mode shows no bell and sends no request to the service', async ({ page }) => {
  const { calls } = await mockInbox(page, [notification(1, { banner: true })]);
  await open(page);
  await expect(page.locator('.inbox-button')).toBeHidden();
  await expect(page.locator('.banner')).toHaveCount(0);
  expect(calls).toEqual([]);
});

test('an expired session shows no bell and sends no request', async ({ page }) => {
  await page.addInitScript((session) => localStorage.setItem('todos.session', JSON.stringify({ ...session, expiry: '2020-01-01T00:00:00Z' })), SESSION);
  const { calls } = await mockInbox(page, [notification(1)]);
  await open(page);
  await expect(page.locator('.inbox-button')).toBeHidden();
  expect(calls).toEqual([]);
});
