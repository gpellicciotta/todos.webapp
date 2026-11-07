import { test } from '@playwright/test';

const OUT = 'C:/Dev-Projects/todos.webapp/.plan/tasks/T0054-build-the-view-options-panel-the-more-menu';
const SIZES = { compact: { width: 390, height: 844 }, wide: { width: 1440, height: 900 } };

async function seed(page) {
  return page.evaluate(async () => {
    const { openStore } = await import('/js/store/db.js');
    const store = await openStore({ broadcast: true });
    const home = await store.createList({ name: 'Home', description: 'Chores and repairs around the house' });
    const work = await store.createList({ name: 'Work' });
    const hours = (count) => new Date(Date.now() + count * 3_600_000).toISOString();
    await store.createTask({ description: 'Call the plumber', status: 'in-progress', 'due-time': hours(-2) }, { lists: [home.id] });
    await store.createTask({ description: 'Buy paint', 'due-time': hours(30) }, { lists: [home.id] });
    await store.createTask({ description: 'Write the report', 'due-time': hours(5) }, { lists: [work.id] });
    await store.createTask({ description: 'Book flights' });
    await store.createTask({ description: 'Water the plants', status: 'completed' }, { lists: [home.id] });
    await store.createTask({ description: 'Renew the gym membership', status: 'cancelled' });
    store.close();
    return home.id;
  });
}

for (const [phase, port] of [['before', 8761], ['after', 8762]]) {
  for (const [layout, size] of Object.entries(SIZES)) {
    test(`${phase} ${layout}`, async ({ page }) => {
      const base = `http://127.0.0.1:${port}/`;
      await page.setViewportSize(size);
      await page.goto(`${base}#/tasks`);
      await page.locator('html[data-shell="ready"]').waitFor();
      const listId = await seed(page);
      await page.locator('.task-row').nth(3).waitFor();
      await page.screenshot({ path: `${OUT}/${phase}-all-tasks-${layout}.png` });
      if (phase === 'after') {
        await page.goto(`${base}#/tasks/view-options`);
        await page.locator('.view-options').waitFor();
        await page.locator('.view-options').getByRole('button', { name: /^Status/ }).click();
        await page.screenshot({ path: `${OUT}/after-all-tasks-view-options-${layout}.png` });
        await page.locator('.view-options__content').evaluate((element) => element.scrollTo(0, element.scrollHeight));
        await page.screenshot({ path: `${OUT}/after-all-tasks-view-options-scrolled-${layout}.png` });
        await page.getByLabel('Completed').check();
        await page.getByLabel('Sort by').selectOption({ label: 'Description' });
        await page.screenshot({ path: `${OUT}/after-all-tasks-narrowed-${layout}.png` });
        await page.goto(`${base}#/lists/${listId}/view-options`);
        await page.locator('.view-options').waitFor();
        await page.screenshot({ path: `${OUT}/after-list-view-options-${layout}.png` });
      }
      else {
        if (layout === 'wide') {
          await page.locator('.view-controls__chip[data-filter="statuses"]').click();
          await page.screenshot({ path: `${OUT}/before-all-tasks-status-popover-${layout}.png` });
          await page.keyboard.press('Escape');
        }
      }
      await page.goto(`${base}#/lists/${listId}`);
      await page.locator('.list-view .task-row').first().waitFor();
      await page.screenshot({ path: `${OUT}/${phase}-list-${layout}.png` });
    });
  }
}
