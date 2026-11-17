import { expect, test } from '@playwright/test';

// Reminders: opt in from Settings, get a notification when a task comes due, and open its editor from the click.

test.use({ timezoneId: 'UTC' });

/**
 * Replace the Notification permission and the worker's `showNotification` with recorders.
 * @param {import('@playwright/test').Page} page the page
 * @param {string} answer what `Notification.requestPermission()` resolves to
 */
async function mockNotifications(page, answer) {
  await page.addInitScript((reply) => {
    let permission = 'default';
    Object.defineProperty(Notification, 'permission', { get: () => permission });
    Notification.requestPermission = async () => {
      permission = reply;
      return reply;
    };
    window.__notifications = [];
    ServiceWorkerRegistration.prototype.showNotification = async function showNotification(title, options) {
      window.__notifications.push({ title, ...options });
    };
  }, answer);
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

test('a task due in one minute notifies once, and the click opens its editor', async ({ page }) => {
  const problems = [];
  page.on('pageerror', (error) => problems.push(error.message));
  await mockNotifications(page, 'granted');
  await page.clock.install({ time: new Date('2026-11-04T10:00:00Z') });
  await open(page, '#/settings');
  await page.getByRole('switch', { name: 'Remind me when tasks come due' }).click();
  await expect(page.getByRole('switch', { name: 'Remind me when tasks come due' })).toBeChecked();
  const taskId = await page.evaluate(async () => {
    const { openStore } = await import('/js/store/db.js');
    const store = await openStore({ broadcast: true });
    const task = await store.createTask({ description: 'Buy paint', 'due-time': '2026-11-04T10:01:00.000Z' });
    store.close();
    return task.id;
  });
  await page.clock.runFor(30_000);
  expect(await page.evaluate(() => window.__notifications.length)).toBe(0);
  await page.clock.runFor(60_000);
  await expect.poll(() => page.evaluate(() => window.__notifications.length)).toBe(1);
  const [notification] = await page.evaluate(() => window.__notifications);
  expect(notification).toMatchObject({ title: 'Buy paint', tag: `task-due:${taskId}:2026-11-04T10:01:00.000Z`, data: { taskId } });
  await page.clock.runFor(120_000);
  expect(await page.evaluate(() => window.__notifications.length)).toBe(1);
  // The worker tells the page which task a click chose.
  await page.evaluate((id) => {
    navigator.serviceWorker.dispatchEvent(new MessageEvent('message', { data: { type: 'open-task', taskId: id } }));
  }, taskId);
  await expect(page).toHaveURL(new RegExp(`#/tasks/${taskId}$`));
  await expect(page.locator('[data-editor="task"], .task-editor').first()).toBeVisible();
  expect(problems).toEqual([]);
});

test('a denied permission leaves the switch off and says why', async ({ page }) => {
  await mockNotifications(page, 'denied');
  await open(page, '#/settings');
  const toggle = page.getByRole('switch', { name: 'Remind me when tasks come due' });
  await toggle.click();
  await expect(toggle).not.toBeChecked();
  await expect(page.locator('[data-reminders="problem"]')).toContainText('blocked');
});
