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

test.describe('pushed reminders', () => {
  // The service has no route that sends a push on demand (todos.server T0261 tests the sending), so the service's example payload
  // reaches the real worker as a push event. Headless Chromium denies notifications inside the worker, so the worker's own
  // `showNotification` is recorded; a real notification on a device is checked by todos.server T0308 and T0317.
  const EXAMPLE = {
    type: 'task-due',
    tag: 'task-due:0192f1a2-7c3e-7b4a-9d10-5f2e8a1b2c3d:2026-11-17T09:00:00.000Z',
    'task-id': '0192f1a2-7c3e-7b4a-9d10-5f2e8a1b2c3d',
    occurrence: 3,
    description: 'Renew the gym pass',
    'due-time': '2026-11-17T09:00:00Z',
    'action-url': '/#/tasks/0192f1a2-7c3e-7b4a-9d10-5f2e8a1b2c3d',
  };

  /**
   * Deliver push messages to the service worker, as the push service does, and return what the worker showed.
   * @param {import('@playwright/test').Page} page the page of the app
   * @param {object[]} payloads the JSON payloads
   * @returns {Promise<{title: string, tag: string, body: string, data: object}[]>} the notifications, in order
   */
  async function deliver(page, payloads) {
    const worker = page.context().serviceWorkers().find((candidate) => candidate.url().endsWith('/service-worker.js'));
    return worker.evaluate(async (messages) => {
      const shown = [];
      self.registration.showNotification = async (title, { tag, body, data }) => {
        shown.push({ title, tag, body, data });
      };
      for (const message of messages) {
        await new Promise((done) => {
          const event = new globalThis.PushEvent('push', { data: JSON.stringify(message) });
          event.waitUntil = (promise) => promise.then(done, done);
          self.dispatchEvent(event);
        });
      }
      return shown;
    }, payloads);
  }

  test('shows a pushed reminder with the tag of the local one, and a summary for several', async ({ page }) => {
    await open(page, '#/tasks');
    await page.evaluate(() => navigator.serviceWorker.ready);
    const shown = await deliver(page, [EXAMPLE, EXAMPLE, { type: 'tasks-due', tag: 'tasks-due', count: 4, 'action-url': '/#/tasks' }]);
    expect(shown).toHaveLength(3);
    expect(shown[0]).toMatchObject({ title: 'Renew the gym pass', tag: EXAMPLE.tag, data: { taskId: EXAMPLE['task-id'] } });
    expect(shown[0].body).toContain('Due');
    expect(shown[1].tag).toBe(shown[0].tag);
    expect(shown[2]).toMatchObject({ title: '4 tasks came due', tag: 'tasks-due', data: {} });
  });
});

test('a denied permission leaves the switch off and says why', async ({ page }) => {
  await mockNotifications(page, 'denied');
  await open(page, '#/settings');
  const toggle = page.getByRole('switch', { name: 'Remind me when tasks come due' });
  await toggle.click();
  await expect(toggle).not.toBeChecked();
  await expect(page.locator('[data-reminders="problem"]')).toContainText('blocked');
});
