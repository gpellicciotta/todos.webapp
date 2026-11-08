import { expect, test } from '@playwright/test';
import { VERSION } from '../../src/js/version.js';

// The Recycle bin and Settings screens: restore, in-row permanent delete, the theme, and the local connection card.

/**
 * Collect console errors, page errors, failed requests, and HTTP errors of a page.
 * @param {import('@playwright/test').Page} page the page to watch
 * @returns {string[]} the problems, filled as they happen
 */
function watch(page) {
  const problems = [];
  page.on('console', (message) => {
    if (message.type() === 'error') {
      problems.push(`console: ${message.text()}`);
    }
  });
  page.on('pageerror', (error) => problems.push(`page: ${error.message}`));
  page.on('requestfailed', (request) => problems.push(`request: ${request.url()}`));
  page.on('response', (response) => {
    if (response.status() >= 400) {
      problems.push(`HTTP ${response.status()}: ${response.url()}`);
    }
  });
  return problems;
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
 * Store a list with one task and move both, or only the task, to the recycle bin.
 * @param {import('@playwright/test').Page} page a page of the app
 * @param {{deleteList?: boolean}} [options] whether the list goes to the bin too
 * @returns {Promise<{listId: string, taskId: string}>} the identifiers
 */
function seed(page, { deleteList = false } = {}) {
  return page.evaluate(async (alsoList) => {
    const { openStore } = await import('/js/store/db.js');
    const store = await openStore({ broadcast: true });
    const home = await store.createList({ name: 'Home' });
    const task = await store.createTask({ description: 'Buy paint' }, { lists: [home.id] });
    await store.deleteTask(task.id);
    if (alsoList) {
      await store.deleteList(home.id);
    }
    store.close();
    return { listId: home.id, taskId: task.id };
  }, deleteList);
}

test('restoring a task brings it back into its lists, with a toast linking to it', async ({ page }) => {
  const problems = watch(page);
  await open(page, '#/bin');
  await expect(page.locator('.empty-state')).toContainText('Deleted items stay here for 30 days.');
  const { listId, taskId } = await seed(page);
  const row = page.locator('.bin-row', { hasText: 'Buy paint' });
  await expect(row).toContainText('Deleted today · 30 days left');
  await row.getByRole('button', { name: 'Restore Buy paint' }).click();
  await expect(page.locator('.bin-row')).toHaveCount(0);
  const toast = page.locator('.toast', { hasText: 'Restored "Buy paint".' });
  await toast.getByRole('button', { name: 'Open' }).click();
  await expect(page).toHaveURL(new RegExp(`#/tasks/${taskId}$`));
  const lists = await page.evaluate(async (id) => {
    const { openStore } = await import('/js/store/db.js');
    const store = await openStore();
    const result = await store.listsOfTask(id);
    store.close();
    return result;
  }, taskId);
  expect(lists).toEqual([listId]);
  await expect(page.locator('.task-row', { hasText: 'Buy paint' })).toHaveCount(1);
  expect(problems).toEqual([]);
});

test('Delete permanently asks in the row, Keep leaves the entry, and Delete removes it', async ({ page }) => {
  const problems = watch(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await open(page, '#/bin');
  await seed(page, { deleteList: true });
  await expect(page.locator('.bin-row')).toHaveCount(2);
  const row = page.locator('.bin-row', { hasText: 'Home' });
  await row.getByRole('button', { name: 'Delete Home permanently' }).click();
  const confirm = row.getByRole('group', { name: 'Delete Home permanently' });
  await expect(confirm).toContainText('Delete forever?');
  await expect(confirm.getByRole('button', { name: 'Keep' })).toBeFocused();
  await confirm.getByRole('button', { name: 'Keep' }).click();
  await expect(confirm).toHaveCount(0);
  await expect(row.getByRole('button', { name: 'Delete Home permanently' })).toBeFocused();
  await row.getByRole('button', { name: 'Delete Home permanently' }).click();
  await row.getByRole('group').getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(page.locator('.bin-row')).toHaveCount(1);
  await expect(page.locator('.bin-row')).toContainText('Buy paint');
  expect(problems).toEqual([]);
});

test('Empty recycle bin asks with the count, then empties the bin for good, also after a reload', async ({ page }) => {
  const problems = watch(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await open(page, '#/bin');
  await expect(page.getByRole('button', { name: 'Empty recycle bin' })).toBeHidden();
  await seed(page, { deleteList: true });
  await expect(page.locator('.bin-row')).toHaveCount(2);
  await page.getByRole('button', { name: 'Empty recycle bin' }).click();
  const confirm = page.getByRole('group', { name: 'Empty recycle bin' });
  await expect(confirm).toContainText('Permanently delete 1 list and 1 task? This cannot be undone.');
  await expect(confirm.getByRole('button', { name: 'Keep' })).toBeFocused();
  await page.screenshot({ path: test.info().outputPath('empty-bin-question.png') });
  await confirm.getByRole('button', { name: 'Delete all' }).click();
  await expect(page.locator('.bin-row')).toHaveCount(0);
  await expect(page.locator('.empty-state')).toBeVisible();
  await expect(page.getByText('Recycle bin emptied.')).toBeVisible();
  await page.reload();
  await expect(page.locator('html[data-shell="ready"]')).toHaveCount(1);
  await expect(page.locator('.empty-state')).toBeVisible();
  expect(problems).toEqual([]);
});

test('choosing Dark sets data-theme at once and keeps it after a reload', async ({ page }) => {
  const problems = watch(page);
  await open(page, '#/settings');
  const appearance = page.getByRole('group', { name: 'Theme' });
  await expect(appearance.getByRole('radio', { name: 'System' })).toBeChecked();
  await appearance.getByText('Dark').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.reload();
  await expect(page.locator('html[data-shell="ready"]')).toHaveCount(1);
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.getByRole('group', { name: 'Theme' }).getByRole('radio', { name: 'Dark' })).toBeChecked();
  await page.getByRole('group', { name: 'Theme' }).getByText('System').click();
  expect(await page.evaluate(() => document.documentElement.dataset.theme ?? null)).toBeNull();
  expect(problems).toEqual([]);
});

test('a theme that cannot be saved still applies, and a toast says so', async ({ page }) => {
  const problems = watch(page);
  await open(page, '#/settings');
  await page.evaluate(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException('Full', 'QuotaExceededError');
    };
  });
  await page.getByRole('group', { name: 'Theme' }).getByText('Dark').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('.toast')).toContainText('The theme could not be saved on this device.');
  expect(problems).toEqual([]);
});

test('Settings shows the local connection card, the server URL, the enabled backup actions, and the version', async ({ page }) => {
  const problems = watch(page);
  await open(page, '#/settings');
  for (const name of ['Export backup', 'Import backup']) {
    await expect(page.getByRole('button', { name, exact: true })).toBeEnabled();
  }
  const connect = page.getByRole('button', { name: 'Connect', exact: true });
  await expect(connect).toBeEnabled();
  await expect(page.locator('.settings')).toContainText('Not connected. Your data stays on this device.');
  const url = page.getByRole('textbox', { name: 'Server URL' });
  await expect(url).toHaveValue('https://todos.pellicciotta.com');
  await url.fill('http://todos.example.com');
  await url.blur();
  await expect(url).toHaveAttribute('aria-invalid', 'true');
  await expect(page.locator('.field__error')).toContainText('Enter an https address, or http on this computer');
  await url.fill('https://todos.example.com/');
  await url.blur();
  await expect(url).not.toHaveAttribute('aria-invalid', 'true');
  await page.reload();
  await expect(page.getByRole('textbox', { name: 'Server URL' })).toHaveValue('https://todos.example.com');
  await expect(page.locator('.settings')).toContainText(`Version ${VERSION} · Built `);
  await expect(page.locator('.settings')).toContainText(/Built \d{1,2} \w{3} \d{4}/);
  expect(problems).toEqual([]);
});
