import { expect, test } from '@playwright/test';

// The version 6 upgrade, end to end: the app opens a seeded version 5 database and shows each task with its count kept.

const T0 = '2026-10-01T08:00:00.000Z';

/**
 * Create a version 5 database of the app's origin, holding a target-3 task with 2 ticks and a plain task.
 * It runs on a static file of the app, so the app has not opened (and upgraded) the database yet.
 * @param {import('@playwright/test').Page} page a page on the app origin that does not open the store
 * @returns {Promise<void>}
 */
async function seedVersion5(page) {
  await page.evaluate(async (time) => {
    await new Promise((resolve, reject) => {
      const req = indexedDB.open('todos', 5);
      req.onupgradeneeded = () => {
        const db = req.result;
        db.createObjectStore('lists', { keyPath: 'id' });
        const tasks = db.createObjectStore('tasks', { keyPath: 'id' });
        db.createObjectStore('memberships');
        db.createObjectStore('notes');
        db.createObjectStore('sync-queue', { keyPath: 'seq', autoIncrement: true });
        db.createObjectStore('sync-state', { keyPath: 'key' });
        db.createObjectStore('sync-log', { keyPath: 'id' }).createIndex('time', 'time');
        const occurrences = db.createObjectStore('occurrences');
        const events = db.createObjectStore('events');
        const rules = {
          'target-count': 3, 'due-time': null, 'overdue-handling': 'keep', 'recurrence-unit': null,
          'recurrence-interval': null, 'recurrence-end-date': null, 'recurrence-end-count': null, timezone: null,
        };
        const seed = (id, description, target, count, status) => {
          const occurrence = { occurrence: 1, 'start-time': time, 'due-time': null, 'target-count': target, 'completion-count': count, status, 'close-time': null };
          tasks.put({
            id, description, 'owner-id': null, 'lifecycle-rules': { ...rules, 'target-count': target }, 'current-occurrence': occurrence,
            'creation-time': time, 'last-update-time': time, 'deletion-time': null,
          });
          occurrences.put({ 'task-id': id, ...occurrence }, [id, 1]);
          // A version 5 database holds one complete event per counted tick; the version 6 fold rebuilds the count from them.
          for (let tick = 1; tick <= count; tick += 1) {
            events.put({
              'task-id': id, occurrence: 1, 'owner-id': null, details: null, id: `${id}-tick-${tick}`, type: 'complete', 'creation-time': time,
            }, [id, `${id}-tick-${tick}`]);
          }
        };
        seed('gym', 'Gym sessions', 3, 2, 'in-progress');
        seed('paint', 'Buy paint', 1, 0, 'ready');
      };
      req.onsuccess = () => {
        req.result.close();
        resolve();
      };
      req.onerror = () => reject(req.error);
    });
  }, T0);
}

test('upgrades a version 5 database and shows each task with its count kept', async ({ page }) => {
  const problems = [];
  page.on('pageerror', (error) => problems.push(`page: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') {
      problems.push(`console: ${message.text()}`);
    }
  });
  await page.goto('/js/version.js');
  await seedVersion5(page);
  await page.goto('/#/tasks');
  await expect(page.locator('html[data-shell="ready"]')).toHaveCount(1);
  const gym = page.locator('.task-row', { hasText: 'Gym sessions' });
  await expect(gym).toHaveCount(1);
  await expect(gym.locator('.task-row__count')).toHaveText('2/3');
  await expect(page.locator('.task-row', { hasText: 'Buy paint' })).toHaveCount(1);
  const stored = await page.evaluate(async () => {
    const { openStore } = await import('/js/store/db.js');
    const store = await openStore();
    const task = await store.getTask('gym');
    store.close();
    return task;
  });
  expect(stored['lifecycle-rules']).toMatchObject({ 'goal-direction': 'at-least', 'goal-measure': 'checks', 'goal-target': 3, 'start-time': null });
  expect(stored['current-occurrence']).toMatchObject({ 'target-count': 3, 'goal-target': 3, 'completion-count': 2, progress: 2, 'time-spent-seconds': 0 });
  await gym.getByRole('button', { name: 'Tick Gym sessions, 2 of 3 done', exact: true }).click();
  await expect(gym.locator('.task-row__count')).toHaveText('3/3');
  expect(problems).toEqual([]);
});
