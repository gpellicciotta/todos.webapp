import { expect, test } from '@playwright/test';

// Reminders with the browser's own Notification API: no recorders, so a real notification must reach the service worker registration.
// Run in Chrome and Firefox with `npx playwright test --config playwright.browsers.config.js`.

test.use({ timezoneId: 'UTC', permissions: ['notifications'] });

test('a due task raises a real notification that the registration lists', async ({ page }) => {
  const problems = [];
  page.on('pageerror', (error) => problems.push(error.message));
  await page.clock.install({ time: new Date('2026-11-04T10:00:00Z') });
  await page.goto('/#/settings');
  await expect(page.locator('html[data-shell="ready"]')).toHaveCount(1);
  expect(await page.evaluate(() => Notification.permission)).toBe('granted');
  await page.getByRole('switch', { name: 'Remind me when tasks come due' }).click();
  await expect(page.getByRole('switch', { name: 'Remind me when tasks come due' })).toBeChecked();
  await page.evaluate(async () => {
    const { openStore } = await import('/js/store/db.js');
    const store = await openStore({ broadcast: true });
    await store.createTask({ description: 'Buy paint', 'due-time': '2026-11-04T10:01:00.000Z' });
    store.close();
  });
  await page.clock.runFor(90_000);
  await expect
    .poll(() =>
      page.evaluate(async () => {
        const registration = await navigator.serviceWorker.ready;
        return (await registration.getNotifications()).map((notification) => notification.title);
      }),
    )
    .toEqual(['Buy paint']);
  expect(problems).toEqual([]);
});
