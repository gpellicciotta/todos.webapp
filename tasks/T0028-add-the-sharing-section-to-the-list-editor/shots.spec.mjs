import { expect, test } from '@playwright/test';

// Captures the before (port 8801, main checkout) and after (port 8802, task worktree) screens.
const FAMILY = '0192f1a2-0000-7000-8000-000000000001';
const SOLO = '0192f1a2-0000-7000-8000-000000000002';
const TIME = '2026-11-04T09:00:00Z';
const JANE = { id: 3, email: 'jane@example.com', name: 'Jane Doe' };
const RULES = [
  { id: 51, 'shared-list-id': FAMILY, 'shared-with-email': 'partner@example.com', 'shared-role': 'task-editor' },
  { id: 52, 'shared-list-id': FAMILY, 'shared-with-email': 'kid@example.com', 'shared-role': 'viewer' },
];
const list = (id, name, f) => ({ id, name, description: '', 'creation-time': TIME, 'last-update-time': TIME, 'deletion-time': null, revision: 10, ...f });
const task = (id, description) => ({ id, description, status: 'todo', 'due-time': null, 'overdue-handling': 'keep', 'owner-id': 3, 'creation-time': TIME, 'last-update-time': TIME, 'last-activity-time': TIME, 'deletion-time': null, revision: 10 });
const member = (l, t) => ({ 'list-id': l, 'task-id': t, position: 'a0', 'added-time': TIME, revision: 10 });
const FEED = {
  lists: [list(FAMILY, 'Family', { description: 'Trips and chores', owner: JANE, role: 'owner', sharing: RULES }), list(SOLO, 'Solo', { owner: JANE, role: 'owner', sharing: [] })],
  tasks: [task('t1', 'Plan the trip'), task('t2', 'Buy paint')],
  memberships: [member(FAMILY, 't1'), member(SOLO, 't2')],
};

for (const [phase, port] of [['before', 8801], ['after', 8802]]) {
  for (const [vname, viewport] of [['390', { width: 390, height: 844 }], ['1440', { width: 1440, height: 900 }]]) {
    for (const theme of ['light', 'dark']) {
      for (const [screen, hash] of [['list-editor', `#/lists/${FAMILY}/${phase === 'after' ? 'share' : 'edit'}`], ['view-options', '#/tasks/view-options']]) {
        test(`${phase} ${screen} ${vname} ${theme}`, async ({ page }) => {
          const server = `http://127.0.0.1:${port}`;
          const problems = [];
          page.on('console', (m) => m.type() === 'error' && problems.push(`console: ${m.text()}`));
          page.on('pageerror', (e) => problems.push(`page: ${e.message}`));
          page.on('requestfailed', (r) => problems.push(`failed: ${r.url()}`));
          page.on('response', (r) => r.status() >= 400 && problems.push(`${r.status()} ${r.url()}`));
          await page.emulateMedia({ reducedMotion: 'reduce' });
          await page.setViewportSize(viewport);
          await page.addInitScript(([s, t]) => {
            localStorage.setItem('todos.session', JSON.stringify({ token: 'session-1', expiry: '2099-01-01T00:00:00Z', name: 'Jane Doe', email: 'jane@example.com', server: s }));
            localStorage.setItem('todos.server-url', JSON.stringify(s));
            localStorage.setItem('todos.theme', JSON.stringify(t));
          }, [server, theme]);
          await page.route(`${server}/api/**`, (route) => {
            const { pathname } = new URL(route.request().url());
            const json = (body) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
            if (pathname === '/api/changes') {
              return json({ cursor: 'c1', 'has-more': false, notes: [], tombstones: [], protocol: 1, ...FEED });
            }
            if (pathname === '/api/users/me') {
              return json(JANE);
            }
            if (pathname.endsWith('/sharing')) {
              return json(RULES);
            }
            return json(pathname === '/api/notifications' ? [] : {});
          });
          await page.goto('/'.replace('/', `${server}/`) + '#/tasks');
          await expect(page.locator('html[data-shell="ready"]')).toHaveCount(1);
          await expect(page.locator('.task-row').first()).toBeVisible();
          await page.evaluate((h) => {
            location.hash = h;
          }, hash);
          const target = screen === 'list-editor' ? page.locator('[data-editor-slot] .list-editor') : page.locator('[data-editor-slot] .view-options');
          await expect(target).toBeVisible();
          if (screen === 'view-options' && phase === 'after') {
            await page.getByRole('button', { name: /^Shared/ }).click().catch(() => {});
          }
          await page.evaluate(() => document.fonts.ready);
          await page.screenshot({ path: `screenshots/${phase}-${screen}-${vname}-${theme}.png` });
          expect(problems).toEqual([]);
        });
      }
    }
  }
}
