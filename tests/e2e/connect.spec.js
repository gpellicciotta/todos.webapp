import { expect, test } from '@playwright/test';

// The connect flow against mocks of Auth and the ToDo's service: sign-in, invitation only, disconnect, and local mode.
// The mocked service sits on the app's own origin: Playwright does not intercept the request a mocked redirect
// leads to, so the callback's redirect lands on the local server, and nothing reaches a live service.

const AUTH = 'https://auth.pellicciotta.com';
const SERVER = `http://127.0.0.1:${process.env.E2E_PORT ?? 8754}`;
const SESSION = { token: 'session-1', expiry: '2099-01-01T00:00:00Z', name: 'Jane Doe', email: 'jane@example.com', server: SERVER };

/**
 * Answer Auth with a redirect back to the connect route, and the service like the ToDo's server.
 * @param {import('@playwright/test').Page} page the page
 * @param {{callbackStatus?: number}} [options] the status of the code exchange
 * @returns {Promise<{url: string, method: string, authorization: string}[]>} the service requests, filled as they happen
 */
async function mockServices(page, { callbackStatus = 302 } = {}) {
  const calls = [];
  await page.addInitScript((server) => localStorage.setItem('todos.server-url', JSON.stringify(server)), SERVER);
  await page.route(`${AUTH}/**`, (route) => {
    const returnUrl = new URL(route.request().url()).searchParams.get('app-redirect-url');
    return route.fulfill({ status: 302, headers: { location: `${returnUrl}?authorization-code=auth-code-1` } });
  });
  await page.route(`${SERVER}/api/**`, (route) => {
    const request = route.request();
    const { pathname } = new URL(request.url());
    calls.push({ url: request.url(), method: request.method(), authorization: request.headers().authorization ?? '' });
    const json = (body) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
    if (pathname === '/api/auth-token/callback') {
      return callbackStatus === 302
        ? route.fulfill({ status: 302, headers: { location: '/sign-in?opc=123456&email=jane%40example.com' } })
        : route.fulfill({ status: callbackStatus, contentType: 'application/json', body: '{"error":"no access grant"}' });
    }
    if (pathname === '/api/auth-token' && request.method() === 'POST') {
      return json({ id: 7, 'bearer-token': 'session-1', 'expiration-time': '2099-01-01T00:00:00Z', 'user-id': 3, email: 'jane@example.com' });
    }
    if (pathname === '/api/users/me') {
      return json({ id: 3, name: 'Jane Doe', email: 'jane@example.com' });
    }
    return route.fulfill({ status: 204 });
  });
  return calls;
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
 * Read the stored session record.
 * @param {import('@playwright/test').Page} page the page
 * @returns {Promise<object|null>} the record
 */
function storedSession(page) {
  return page.evaluate(() => JSON.parse(localStorage.getItem('todos.session')));
}

test('local mode makes no network request outside the app origin', async ({ page, baseURL }) => {
  const foreign = [];
  page.on('request', (request) => {
    if (new URL(request.url()).origin !== new URL(baseURL).origin) {
      foreign.push(request.url());
    }
  });
  await open(page, '#/tasks');
  await page.getByRole('button', { name: 'Local User' }).click();
  await page.locator('.user-panel').getByRole('link', { name: 'Settings' }).click();
  await page.getByRole('button', { name: 'Connect', exact: true }).click();
  await expect(page).toHaveURL(/#\/connect$/);
  await expect(page.locator('[data-view="connect"]')).toContainText('no longer anonymous');
  expect(foreign).toEqual([]);
});

test('a mocked Auth redirect returns to #/connect signed in', async ({ page }) => {
  const calls = await mockServices(page);
  await open(page, '#/connect');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByText('Signed in as Jane Doe (jane@example.com)')).toBeVisible();
  await expect(page).toHaveURL(/#\/connect$/);
  expect(calls.map((call) => `${call.method} ${new URL(call.url).pathname}`)).toEqual([
    'GET /api/auth-token/callback', 'POST /api/auth-token', 'GET /api/users/me',
  ]);
  expect(new URL(calls[0].url).searchParams.get('authorization-code')).toBe('auth-code-1');
  expect(calls[1].authorization).toBe(`Basic ${Buffer.from('jane@example.com:123456').toString('base64')}`);
  expect(await storedSession(page)).toMatchObject({ token: 'session-1', email: 'jane@example.com', server: SERVER });
  await page.getByRole('button', { name: 'Done' }).click();
  await expect(page).toHaveURL(/#\/tasks$/);
});

test('an uninvited user sees that access is by invitation only, and stays local', async ({ page }) => {
  await mockServices(page, { callbackStatus: 403 });
  await open(page, '#/connect');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.locator('[data-view="connect"]')).toContainText('Access to ToDo\'s is by invitation only.');
  await expect(page).toHaveURL(/#\/connect$/);
  expect(await storedSession(page)).toBeNull();
  await open(page, '#/settings');
  await expect(page.locator('.settings')).toContainText('Not connected. Your data stays on this device.');
});

test('a code that no sign-in on this device started is ignored', async ({ page }) => {
  const calls = await mockServices(page);
  await open(page, '#/connect?authorization-code=crafted');
  await expect(page).toHaveURL(/#\/connect$/);
  await expect(page.locator('[data-view="connect"]')).toContainText('Sign-in did not finish.');
  expect(calls).toEqual([]);
});

test('disconnecting deletes the token and shows Local only', async ({ page }) => {
  const calls = await mockServices(page);
  await page.addInitScript((record) => {
    if (!sessionStorage.getItem('seeded')) {
      sessionStorage.setItem('seeded', '1');
      localStorage.setItem('todos.session', JSON.stringify(record));
    }
  }, SESSION);
  await open(page, '#/settings');
  const card = page.locator('section[aria-labelledby="settings-connection"]');
  await expect(card).toContainText('Signed in as Jane Doe (jane@example.com)');
  await expect(card).toContainText(SERVER);
  await expect(card.getByRole('textbox', { name: 'Server URL' })).toHaveCount(0);
  await card.getByRole('button', { name: 'Disconnect' }).click();
  const dialog = page.getByRole('dialog', { name: 'Disconnect from your account?' });
  await expect(dialog).toContainText('Your own lists and tasks stay on this device.');
  await dialog.getByRole('button', { name: 'Disconnect' }).click();
  await expect(card).toContainText('Not connected. Your data stays on this device.');
  await expect(card.getByRole('textbox', { name: 'Server URL' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Local User' })).toHaveAttribute('title', 'Local User');
  expect(await storedSession(page)).toBeNull();
  expect(calls.at(-1)).toMatchObject({ method: 'DELETE', url: `${SERVER}/api/auth-token`, authorization: 'Bearer session-1' });
});

test('an expired session asks to sign in again and keeps local work going', async ({ page }) => {
  await page.addInitScript((record) => localStorage.setItem('todos.session', JSON.stringify(record)), { ...SESSION, expiry: '2000-01-01T00:00:00Z' });
  await open(page, '#/settings');
  const card = page.locator('section[aria-labelledby="settings-connection"]');
  await expect(card).toContainText('Your session expired.');
  await expect(card.getByRole('link', { name: 'Sign in again' })).toHaveAttribute('href', '#/connect');
  await open(page, '#/tasks');
  await page.getByRole('textbox', { name: 'Search or add a task' }).fill('Water the plants');
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await expect(page.getByText('Water the plants')).toBeVisible();
});
