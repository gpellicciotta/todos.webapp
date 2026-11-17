import { expect, test } from '@playwright/test';

// Scratch spec for T0241 evidence: the connect after a local Delete all data on the code before T0241.
const AUTH = 'https://auth.pellicciotta.com';
const SERVER = `http://127.0.0.1:${process.env.E2E_PORT ?? 8754}`;

test('before T0241: connecting after a local Delete all data asks nothing', async ({ page }) => {
  const tasks = new Map([['old-1', { id: 'old-1', description: 'Old account task' }]]);
  const erases = [];
  await page.addInitScript((server) => localStorage.setItem('todos.server-url', JSON.stringify(server)), SERVER);
  await page.route(`${AUTH}/**`, (route) => {
    const params = new URL(route.request().url()).searchParams;
    const state = encodeURIComponent(params.get('app-state') ?? '');
    return route.fulfill({ status: 302, headers: { location: `${params.get('app-redirect-url')}?state=${state}&authorization-code=auth-code-1` } });
  });
  await page.route(`${SERVER}/api/**`, (route) => {
    const request = route.request();
    const { pathname } = new URL(request.url());
    const json = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
    if (pathname === '/api/notifications') {
      return json([]);
    }
    if (pathname === '/api/changes') {
      return json({ cursor: 'c1', 'has-more': false, lists: [], tasks: [], memberships: [], notes: [], tombstones: [], protocol: 1 });
    }
    if (pathname === '/api/auth-token/callback') {
      return route.fulfill({ status: 302, headers: { location: '/sign-in?opc=123456&email=jane%40example.com' } });
    }
    if (pathname === '/api/auth-token' && request.method() === 'POST') {
      return json({ id: 7, 'bearer-token': 'session-1', 'expiration-time': '2099-01-01T00:00:00Z', 'user-id': 3, email: 'jane@example.com' });
    }
    if (pathname === '/api/users/me') {
      return json({ id: 3, name: 'Jane Doe', email: 'jane@example.com' });
    }
    if (pathname === '/api/tasks' && request.method() === 'POST') {
      const task = request.postDataJSON();
      tasks.set(task.id, task);
      return json(task, 201);
    }
    if (pathname.endsWith('/data') && request.method() === 'DELETE') {
      erases.push(pathname);
      return json({ lists: 0, tasks: 0, notes: 0 });
    }
    return route.fulfill({ status: 204 });
  });
  const card = page.locator('section[aria-labelledby="settings-connection"]');
  await page.goto('/#/settings');
  await page.getByRole('button', { name: 'Delete all data' }).click();
  const dialog = page.getByRole('dialog', { name: 'Delete all data?' });
  await dialog.getByLabel('Type DELETE to confirm').fill('DELETE');
  await dialog.getByRole('button', { name: 'Delete everything' }).click();
  await expect(page.locator('.toast', { hasText: 'All data deleted.' })).toBeVisible();
  await page.goto('/#/tasks');
  await page.getByRole('textbox', { name: 'Search or add a task' }).fill('Created after the erase');
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Created after the erase' })).toBeVisible();
  await page.goto('/#/settings');
  await card.getByRole('button', { name: 'Sign in' }).click();
  await expect(card).toContainText('Signed in as Jane Doe (jane@example.com)');
  await expect(card.locator('.settings__sync-state')).toHaveText('Sync state: Synced');
  await expect.poll(() => [...tasks.values()].map((task) => task.description).sort()).toEqual(['Created after the erase', 'Old account task']);
  expect(erases).toEqual([]);
  await card.screenshot({ path: test.info().outputPath('erase-question-before.png') });
});
