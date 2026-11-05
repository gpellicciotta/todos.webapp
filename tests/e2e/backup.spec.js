import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { VERSION } from '../../src/js/version.js';

// Export backup and the Import backup dialog in Settings (BAK-1, BAK-4, BAK-5, BAK-9, BAK-11 to BAK-13).

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
 * Open Settings with a list Home holding two tasks.
 * @param {import('@playwright/test').Page} page the page
 * @returns {Promise<{listId: string, waterId: string, billId: string}>} the identifiers
 */
async function openSeeded(page) {
  await page.goto('/#/settings');
  await expect(page.locator('html[data-shell="ready"]')).toHaveCount(1);
  return page.evaluate(async () => {
    const { openStore } = await import('/js/store/db.js');
    const store = await openStore({ broadcast: true });
    const home = await store.createList({ name: 'Home' });
    const water = await store.createTask({ description: 'Water the plants' }, { lists: [home.id] });
    const bill = await store.createTask({ description: 'Pay the electricity bill' }, { lists: [home.id] });
    store.close();
    return { listId: home.id, waterId: water.id, billId: bill.id };
  });
}

/**
 * Read every record of the store, through its own connection.
 * @param {import('@playwright/test').Page} page the page
 * @returns {Promise<object>} the snapshot
 */
function snapshot(page) {
  return page.evaluate(async () => {
    const { openStore } = await import('/js/store/db.js');
    const store = await openStore();
    const data = await store.snapshot();
    store.close();
    return data;
  });
}

/**
 * Delete a task for good, and optionally add a new one to a list.
 * @param {import('@playwright/test').Page} page the page
 * @param {string} purgeId the task to delete for good
 * @param {string} [listId] the list of a new task Call the plumber
 * @returns {Promise<string|null>} the new task's identifier
 */
function changeTasks(page, purgeId, listId = null) {
  return page.evaluate(async ([id, list]) => {
    const { openStore } = await import('/js/store/db.js');
    const store = await openStore({ broadcast: true });
    await store.deleteTask(id);
    await store.purgeForever('task', id);
    const extra = list ? await store.createTask({ description: 'Call the plumber' }, { lists: [list] }) : null;
    store.close();
    return extra?.id ?? null;
  }, [purgeId, listId]);
}

/**
 * Click Export backup and return the download's file name and text.
 * @param {import('@playwright/test').Page} page the page
 * @returns {Promise<{name: string, text: string}>} the download
 */
async function exportFile(page) {
  const downloading = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export backup' }).click();
  const download = await downloading;
  return { name: download.suggestedFilename(), text: await readFile(await download.path(), 'utf8') };
}

/**
 * Open the Import backup dialog and pick a file in it.
 * @param {import('@playwright/test').Page} page the page
 * @param {{name: string, text: string}} file the file to pick
 * @returns {Promise<import('@playwright/test').Locator>} the dialog
 */
async function pickFile(page, file) {
  const dialog = page.getByRole('dialog', { name: 'Import backup' });
  if (!(await dialog.isVisible())) {
    await page.getByRole('button', { name: 'Import backup' }).click();
  }
  await expect(dialog).toBeVisible();
  await dialog.getByLabel('Backup file').setInputFiles({ name: file.name, mimeType: 'application/json', buffer: Buffer.from(file.text) });
  return dialog;
}

test('Export backup downloads todos-backup-{{date}}.json holding the stored data, and a toast names it', async ({ page }) => {
  const problems = watch(page);
  const ids = await openSeeded(page);
  const today = await page.evaluate(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  });
  const file = await exportFile(page);
  expect(file.name).toBe(`todos-backup-${today}.json`);
  const backup = JSON.parse(file.text);
  expect(backup).toMatchObject({ format: 'todos-backup', 'format-version': 1, 'app-version': VERSION });
  expect(backup.lists.map((list) => [list.id, list.name])).toEqual([[ids.listId, 'Home']]);
  expect(backup.tasks.map((task) => task.id).sort()).toEqual([ids.waterId, ids.billId].sort());
  expect(backup.memberships.map((m) => m['task-id'])).toEqual([ids.waterId, ids.billId]);
  const stored = await snapshot(page);
  expect(backup.tasks.map((task) => task.description).sort()).toEqual(stored.tasks.map((task) => task.description).sort());
  await expect(page.locator('.toast')).toContainText(`Saved todos-backup-${today}.json with 1 list and 2 tasks.`);
  expect(problems).toEqual([]);
});

test('importing an export in Merge mode shows its counts, and Cancel changes nothing', async ({ page }) => {
  const problems = watch(page);
  const ids = await openSeeded(page);
  const file = await exportFile(page);
  await changeTasks(page, ids.billId);
  const before = await snapshot(page);
  const dialog = await pickFile(page, file);
  await expect(dialog).toContainText(file.name);
  await expect(dialog).toContainText(/Exported \d{1,2} \w{3} \d{4} · 1 list · 2 tasks/);
  await expect(dialog.getByRole('radio', { name: 'Merge' })).toBeChecked();
  await expect(dialog.getByRole('radio', { name: 'Overwrite' })).toHaveAccessibleDescription(/missing items go to the recycle bin/);
  await expect(dialog.getByRole('status')).toHaveText('2 added · 0 updated · 0 to recycle bin');
  await expect(dialog.getByRole('button', { name: 'Import', exact: true })).toBeEnabled();
  await dialog.getByRole('button', { name: 'Cancel' }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Import backup' })).toBeFocused();
  expect(await snapshot(page)).toEqual(before);
  expect(problems).toEqual([]);
});

test('Overwrite updates the counts, and Import restores the missing task and bins the extra one', async ({ page }) => {
  const problems = watch(page);
  const ids = await openSeeded(page);
  const file = await exportFile(page);
  const extraId = await changeTasks(page, ids.billId, ids.listId);
  const dialog = await pickFile(page, file);
  await expect(dialog.getByRole('status')).toHaveText('2 added · 0 updated · 0 to recycle bin');
  await dialog.getByRole('radio', { name: 'Overwrite' }).check();
  await expect(dialog.getByRole('status')).toHaveText('2 added · 0 updated · 1 to recycle bin');
  await dialog.getByRole('button', { name: 'Import', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.locator('.toast', { hasText: 'Imported' })).toHaveText(`Imported ${file.name}: 2 added · 0 updated · 1 to recycle bin.`);
  await expect(page.getByRole('button', { name: 'Import backup' })).toBeFocused();
  const { tasks } = await snapshot(page);
  const byId = Object.fromEntries(tasks.map((task) => [task.id, task]));
  expect(byId[ids.billId]?.['deletion-time']).toBeNull();
  expect(byId[extraId]['deletion-time']).not.toBeNull();
  expect(problems).toEqual([]);
});

test('an invalid file shows its reason, keeps Import disabled, and changes nothing', async ({ page }) => {
  const problems = watch(page);
  await openSeeded(page);
  const before = await snapshot(page);
  let dialog = await pickFile(page, { name: 'notes.json', text: 'not json' });
  const error = dialog.getByRole('alert');
  await expect(error).toContainText('The file is not valid JSON');
  await expect(dialog.getByLabel('Backup file')).toHaveAttribute('aria-invalid', 'true');
  await expect(dialog.getByRole('button', { name: 'Import', exact: true })).toBeDisabled();
  dialog = await pickFile(page, { name: 'other.json', text: '{"format": "other"}' });
  await expect(error).toHaveText('Invalid backup: format must be todos-backup.');
  await expect(dialog.getByRole('radio', { name: 'Merge' })).toBeHidden();
  await expect(dialog.getByRole('button', { name: 'Import', exact: true })).toBeDisabled();
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  expect(await snapshot(page)).toEqual(before);
  expect(problems).toEqual([]);
});
