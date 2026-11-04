import { expect, test } from '@playwright/test';

// The task editor: fields that save on change, lists, notes, delete, and the read-only deleted task.

const COMPACT = { width: 390, height: 844 };
const WIDE = { width: 1440, height: 900 };

/**
 * Collect console errors, page errors, and HTTP errors of a page.
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
  page.on('response', (response) => {
    if (response.status() >= 400) {
      problems.push(`HTTP ${response.status()}: ${response.url()}`);
    }
  });
  return problems;
}

/**
 * Open All tasks, store the Home list and two tasks through a broadcasting store, and wait for the rows.
 * @param {import('@playwright/test').Page} page the page
 * @returns {Promise<string>} the identifier of the task "Buy paint"
 */
async function seed(page) {
  await page.goto('/#/tasks');
  await expect(page.locator('html[data-shell="ready"]')).toHaveCount(1);
  const id = await page.evaluate(async () => {
    const { openStore } = await import('/js/store/db.js');
    const store = await openStore({ broadcast: true });
    await store.createList({ name: 'Home' });
    const task = await store.createTask({ description: 'Buy paint' });
    await store.createTask({ description: 'Book flights' });
    store.close();
    return task.id;
  });
  await expect(page.locator('.task-row')).toHaveCount(2);
  return id;
}

/**
 * Open the editor of "Buy paint" from its row.
 * @param {import('@playwright/test').Page} page the page
 * @returns {Promise<import('@playwright/test').Locator>} the editor panel
 */
async function openEditor(page) {
  await page.locator('.task-row__open', { hasText: 'Buy paint' }).click();
  const panel = page.locator('[data-editor-slot] .editor-panel');
  await expect(panel).toBeVisible();
  await expect(panel.getByLabel('Description')).toHaveValue('Buy paint');
  return panel;
}

for (const viewport of [COMPACT, WIDE]) {
  test(`the editor opens from a row with focus on the description, and Escape returns to the row at ${viewport.width} px`, async ({ page }) => {
    const problems = watch(page);
    await page.setViewportSize(viewport);
    await seed(page);
    const panel = await openEditor(page);
    await expect(panel.getByLabel('Description')).toBeFocused();
    const box = await panel.boundingBox();
    if (viewport === WIDE) {
      expect(box.x).toBeGreaterThan(viewport.width / 2);
    }
    else {
      expect(box.width).toBeGreaterThan(viewport.width - 2);
    }
    await page.keyboard.press('Escape');
    await expect(page).toHaveURL(/#\/tasks$/);
    await expect(panel).toHaveCount(0);
    await expect(page.locator('.task-row__open', { hasText: 'Buy paint' })).toBeFocused();
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(scrollWidth).toBeLessThanOrEqual(viewport.width);
    expect(problems).toEqual([]);
  });
}

test('every field saves on change without a Save button, and the changes survive a reload (TSK-1 to TSK-7)', async ({ page }) => {
  const problems = watch(page);
  await page.setViewportSize(WIDE);
  await seed(page);
  const panel = await openEditor(page);
  await expect(panel.getByRole('button', { name: /save/i })).toHaveCount(0);
  const description = panel.getByLabel('Description');
  await description.fill('');
  await description.blur();
  await expect(description).toHaveAttribute('aria-invalid', 'true');
  await expect(panel.getByText('Enter a description.')).toBeVisible();
  await description.fill('Buy blue paint');
  await description.blur();
  await expect(description).not.toHaveAttribute('aria-invalid', 'true');
  await expect(page.locator('.task-row__description', { hasText: 'Buy blue paint' })).toHaveCount(1);
  await panel.getByText('In progress').click();
  await expect(panel.getByRole('group', { name: 'Overdue behavior' })).toBeHidden();
  await panel.getByLabel('Due date', { exact: true }).fill('2030-05-06');
  await panel.getByLabel('Due time', { exact: true }).fill('18:00');
  await panel.getByLabel('Due time', { exact: true }).blur();
  await expect(panel.getByRole('group', { name: 'Overdue behavior' })).toBeVisible();
  await panel.getByText('Cancel when overdue').click();
  await expect(page.locator('.task-row', { hasText: 'Buy blue paint' })).toHaveAttribute('data-status', 'in-progress');
  await page.reload();
  await expect(panel.getByLabel('Description')).toHaveValue('Buy blue paint');
  await expect(panel.getByLabel('In progress')).toBeChecked();
  await expect(panel.getByLabel('Due date', { exact: true })).toHaveValue('2030-05-06');
  await expect(panel.getByLabel('Due time', { exact: true })).toHaveValue('18:00');
  await expect(panel.getByLabel('Cancel when overdue')).toBeChecked();
  await panel.getByRole('button', { name: 'Clear the due date' }).click();
  await expect(panel.getByLabel('Due date', { exact: true })).toHaveValue('');
  await expect(panel.getByRole('group', { name: 'Overdue behavior' })).toBeHidden();
  expect(problems).toEqual([]);
});

test('typing a due date by keyboard saves nothing until focus leaves the due fields', async ({ page }) => {
  const problems = watch(page);
  await page.setViewportSize(WIDE);
  const id = await seed(page);
  const panel = await openEditor(page);
  const stored = () => page.evaluate(async (taskId) => {
    const { openStore } = await import('/js/store/db.js');
    const store = await openStore();
    const task = await store.getTask(taskId);
    store.close();
    return task['due-time'];
  }, id);
  const date = panel.getByLabel('Due date', { exact: true });
  await date.focus();
  await page.keyboard.type('11052026');
  await panel.getByLabel('Due time', { exact: true }).focus();
  await page.keyboard.type('0930');
  await page.waitForTimeout(300);
  expect(await stored()).toBeNull();
  const [year, month, day] = (await date.inputValue()).split('-').map(Number);
  expect(year).toBe(2026);
  await panel.getByLabel('Description').focus();
  const expected = await page.evaluate(([y, m, d]) => new Date(y, m - 1, d, 9, 30).toISOString(), [year, month, day]);
  await expect.poll(stored).toBe(expected);
  expect(problems).toEqual([]);
});

test('the Add to list box adds the task to an existing list or a new one, and chips remove it (TSK-8)', async ({ page }) => {
  const problems = watch(page);
  await page.setViewportSize(WIDE);
  await seed(page);
  const panel = await openEditor(page);
  const box = panel.getByRole('combobox', { name: 'Add to list' });
  await box.fill('ho');
  await expect(panel.getByRole('option', { name: 'Home' })).toBeVisible();
  await box.press('ArrowDown');
  await box.press('Enter');
  const chips = panel.locator('.chip-list .chip');
  await expect(chips).toHaveText(['Home']);
  await expect(box).toBeFocused();
  await box.fill('Garden');
  await panel.getByRole('option', { name: 'Create list "Garden"' }).click();
  await expect(chips).toHaveText(['Garden', 'Home']);
  await expect(page.locator('.app__sidebar .nav-item--list', { hasText: 'Garden' })).toHaveCount(1);
  await panel.getByRole('button', { name: 'Remove from Home' }).click();
  await expect(chips).toHaveText(['Garden']);
  await page.reload();
  await expect(panel.locator('.chip-list .chip')).toHaveText(['Garden']);
  expect(problems).toEqual([]);
});

test('a new note appears at the top, editing marks it edited, and deleting asks in place (NOT-1 to NOT-5)', async ({ page }) => {
  const problems = watch(page);
  await page.setViewportSize(WIDE);
  await seed(page);
  const panel = await openEditor(page);
  const field = panel.getByRole('textbox', { name: 'Add note' });
  await field.fill('Two coats should be enough.');
  await panel.getByRole('button', { name: 'Add note' }).click();
  await expect(field).toHaveValue('');
  await field.fill('Get the matte white.');
  await panel.getByRole('button', { name: 'Add note' }).click();
  const notes = panel.locator('.note');
  await expect(notes.locator('.note__text')).toHaveText(['Get the matte white.', 'Two coats should be enough.']);
  await notes.first().getByRole('button', { name: /More actions for your note/ }).click();
  await page.getByRole('menuitem', { name: 'Edit' }).click();
  const edit = notes.first().getByRole('textbox', { name: 'Edit note' });
  await expect(edit).toBeFocused();
  await edit.fill('Get the matte white, not the gloss.');
  await notes.first().getByRole('button', { name: 'Save note' }).click();
  await expect(notes.first().locator('.note__text')).toHaveText('Get the matte white, not the gloss.');
  await expect(notes.first().locator('.note__meta')).toContainText('edited');
  await expect(notes.nth(1).locator('.note__meta')).not.toContainText('edited');
  await notes.nth(1).getByRole('button', { name: /More actions for your note/ }).click();
  await page.getByRole('menuitem', { name: 'Delete' }).click();
  await expect(notes.nth(1).getByText('Delete this note?')).toBeVisible();
  await notes.nth(1).getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(notes).toHaveCount(1);
  await page.reload();
  await expect(panel.locator('.note .note__text')).toHaveText(['Get the matte white, not the gloss.']);
  expect(problems).toEqual([]);
});

test('Delete task moves it to the recycle bin with an Undo toast, and a deleted task opens read-only (TSK-11, BIN-6)', async ({ page }) => {
  const problems = watch(page);
  await page.setViewportSize(WIDE);
  const id = await seed(page);
  const panel = await openEditor(page);
  await panel.getByRole('button', { name: 'Delete task' }).click();
  await expect(panel).toHaveCount(0);
  await expect(page.locator('.task-row', { hasText: 'Buy paint' })).toHaveCount(0);
  await page.locator('.toast', { hasText: 'Task moved to the recycle bin.' }).getByRole('button', { name: 'Undo' }).click();
  await (await openEditor(page)).getByRole('button', { name: 'Delete task' }).click();
  await expect(page.locator('.task-row', { hasText: 'Buy paint' })).toHaveCount(0);
  await page.goto(`/#/tasks/${id}`);
  await expect(panel.getByText('This task is in the recycle bin.')).toBeVisible();
  await expect(panel.getByLabel('Description')).toBeDisabled();
  await expect(panel.getByRole('button', { name: 'Delete task' })).toHaveCount(0);
  await panel.getByRole('button', { name: 'Restore' }).click();
  await expect(panel.getByLabel('Description')).toBeEnabled();
  await expect(page.locator('.task-row', { hasText: 'Buy paint' })).toHaveCount(1);
  await page.goto('/#/tasks/no-such-task');
  await expect(page.locator('.toast', { hasText: 'That task was not found.' })).toBeVisible();
  await expect(page).toHaveURL(/#\/tasks$/);
  expect(problems).toEqual([]);
});
