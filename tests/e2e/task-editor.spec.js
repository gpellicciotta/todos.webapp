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

/**
 * Select a tab of the open editor by a click.
 * @param {import('@playwright/test').Locator} panel the editor panel
 * @param {'Status'|'Notes'|'Configuration'|'History'} name the tab
 */
async function showTab(panel, name) {
  const tab = panel.getByRole('tablist', { name: 'Task sections' }).getByRole('tab', { name });
  await tab.click();
  await expect(tab).toHaveAttribute('aria-selected', 'true');
}

/**
 * Choose an option of a segmented control by a click on its label, since the radios themselves are visually hidden.
 * @param {import('@playwright/test').Locator} panel the editor panel
 * @param {string} name the option label
 */
async function pick(panel, name) {
  await panel.locator('label.segmented__option', { hasText: new RegExp(`^\\s*${name}\\s*$`) }).click();
}
/**
 * Set the goal to at least a number of checks on Configuration, which also shows the Target field.
 * @param {import('@playwright/test').Locator} panel the editor panel
 * @param {string} count the number of checks
 * @returns {Promise<import('@playwright/test').Locator>} the Target field
 */
async function setTarget(panel, count) {
  await showTab(panel, 'Configuration');
  await pick(panel, 'At least');
  const target = panel.getByLabel('Target', { exact: true });
  await target.fill(count);
  await target.press('Tab');
  return target;
}

for (const viewport of [COMPACT, WIDE]) {
  test(`the editor splits into Status, Notes, Configuration, and History tabs, edits a field on each, and deletes from Configuration at ${viewport.width} px`, async ({ page }) => {
    const problems = watch(page);
    await page.setViewportSize(viewport);
    await seed(page);
    const panel = await openEditor(page);
    const tabs = panel.getByRole('tablist', { name: 'Task sections' });
    const tab = (name) => tabs.getByRole('tab', { name });
    await expect(tabs.getByRole('tab')).toHaveText(['Status', 'Notes', 'Configuration', 'History']);
    await expect(tab('Status')).toHaveAttribute('aria-selected', 'true');
    await expect(tab('Status')).toBeFocused();
    expect(await tabs.evaluate((list) => list.scrollWidth <= list.clientWidth)).toBe(true);

    // Status: the status, progress, and the actions that no log derives, with no status buttons and no Cancel.
    await expect(panel.locator('.task-editor__status')).toHaveText('To do');
    await expect(panel.locator('[data-part="progress-box"]')).toBeVisible();
    await expect(panel.getByLabel('Description')).toBeHidden();
    await expect(panel.getByRole('button', { name: 'Cancelled', exact: true })).toHaveCount(0);
    await expect(panel.getByRole('button', { name: 'Check off', exact: true })).toBeVisible();
    await panel.getByRole('button', { name: 'Mark started', exact: true }).click();
    await expect(panel.locator('.task-editor__status')).toHaveText('In progress');

    // Notes by keyboard: the arrow keys move between the tabs; the add field also searches the notes.
    await tab('Status').focus();
    await page.keyboard.press('ArrowRight');
    await expect(tab('Notes')).toBeFocused();
    await expect(tab('Notes')).toHaveAttribute('aria-selected', 'true');
    const field = panel.getByRole('textbox', { name: 'Add note' });
    await expect(field).toHaveAttribute('placeholder', 'Add or search notes');
    for (const text of ['Two coats.', 'Matte white.']) {
      await field.fill(text);
      await panel.getByRole('button', { name: 'Add note' }).click();
      await expect(field).toHaveValue('');
    }
    await field.fill('matte');
    await expect(panel.locator('.note .note__text')).toHaveText(['Matte white.']);
    await field.fill('');
    await expect(panel.locator('.note')).toHaveCount(2);

    // Configuration: Description, Lists, Goal, Recurrence, Time window, then the Danger zone, with rules between.
    await tab('Notes').focus();
    await page.keyboard.press('ArrowRight');
    await expect(tab('Configuration')).toBeFocused();
    await expect(panel.locator('.task-editor__status')).toBeHidden();
    const tops = await Promise.all([
      panel.getByLabel('Description'), panel.getByRole('combobox', { name: 'Add to list' }), panel.getByRole('group', { name: 'Goal', exact: true }),
      panel.getByRole('group', { name: 'Recurrence', exact: true }), panel.getByLabel('Due date', { exact: true }), panel.getByRole('button', { name: 'Cancel task' }),
      panel.getByRole('button', { name: 'Delete task' }),
    ].map(async (control) => (await control.boundingBox()).y));
    expect(tops).toEqual([...tops].sort((a, b) => a - b));
    await expect(panel.locator('[role="tabpanel"]:not([hidden]) hr')).toHaveCount(5);
    await panel.getByLabel('Description').fill('Buy blue paint');
    await panel.getByLabel('Description').blur();
    const row = page.locator('.task-row', { hasText: 'Buy blue paint' });
    await expect(row).toHaveCount(1);
    await expect(row).toHaveAttribute('data-status', 'in-progress');
    await pick(panel, 'At least');
    const target = panel.getByLabel('Target', { exact: true });
    await target.fill('3');
    await target.press('Tab');
    await expect(row.locator('.task-row__count')).toHaveText('0/3');

    // History: History, then Details; the history loads when its tab first shows.
    await page.keyboard.press('Escape');
    await expect(panel).toHaveCount(0);
    await row.locator('.task-row__open').click();
    const reopened = page.locator('[data-editor-slot] .editor-panel');
    await expect(reopened.getByLabel('Description')).toHaveValue('Buy blue paint');
    await expect(reopened.getByRole('tab', { name: 'Status' })).toHaveAttribute('aria-selected', 'true');
    await showTab(reopened, 'History');
    await expect(reopened.locator('[data-history="events"] li').first()).toContainText('Changed the rules');
    await reopened.getByRole('button', { name: 'Refresh history' }).click();
    await expect(reopened.locator('[data-history="occurrences"] li').first()).toContainText('0 of 3');
    await expect(reopened.locator('[data-section="details"] .editor-panel__details')).toContainText('Created');

    // Delete task sits in the Danger zone at the bottom of Configuration, closes the editor, and offers Undo.
    await showTab(reopened, 'Configuration');
    await reopened.getByRole('button', { name: 'Delete task' }).click();
    await expect(reopened).toHaveCount(0);
    await expect(page.locator('.toast', { hasText: 'Task moved to the recycle bin.' })).toBeVisible();
    await expect(row).toHaveCount(0);
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(scrollWidth).toBeLessThanOrEqual(viewport.width);
    expect(problems).toEqual([]);
  });
}

for (const viewport of [COMPACT, WIDE]) {
  test(`the editor opens from a row on Status with focus on its tab, and Escape returns to the row at ${viewport.width} px`, async ({ page }) => {
    const problems = watch(page);
    await page.setViewportSize(viewport);
    await seed(page);
    const panel = await openEditor(page);
    await expect(panel.getByRole('tab', { name: 'Status' })).toBeFocused();
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

test('a click on the row of the open task closes the editor, and another row switches it', async ({ page }) => {
  const problems = watch(page);
  await page.setViewportSize(WIDE);
  await seed(page);
  const panel = await openEditor(page);
  await page.locator('.task-row__open', { hasText: 'Book flights' }).click();
  await expect(panel.getByLabel('Description')).toHaveValue('Book flights');
  await page.locator('.task-row__open', { hasText: 'Book flights' }).click();
  await expect(page).toHaveURL(/#\/tasks$/);
  await expect(page.locator('[data-editor-slot] .editor-panel')).toHaveCount(0);
  expect(problems).toEqual([]);
});

test('every field saves on change without a Save button, and the changes survive a reload (TSK-1 to TSK-7)', async ({ page }) => {
  const problems = watch(page);
  await page.setViewportSize(WIDE);
  const id = await seed(page);
  const panel = await openEditor(page);
  await expect(panel.getByRole('button', { name: /save/i })).toHaveCount(0);
  await showTab(panel, 'Configuration');
  const description = panel.getByLabel('Description');
  await description.fill('');
  await description.blur();
  await expect(description).toHaveAttribute('aria-invalid', 'true');
  await expect(panel.getByText('Enter a description.')).toBeVisible();
  await description.fill('Buy blue paint');
  await description.blur();
  await expect(description).not.toHaveAttribute('aria-invalid', 'true');
  await expect(page.locator('.task-row__description', { hasText: 'Buy blue paint' })).toHaveCount(1);
  await showTab(panel, 'Status');
  await panel.getByRole('button', { name: 'Mark started', exact: true }).click();
  await showTab(panel, 'Configuration');
  await expect(panel.getByRole('group', { name: 'When overdue' })).toBeHidden();
  await panel.getByLabel('Due date', { exact: true }).fill('2030-05-06');
  await panel.getByLabel('Due time', { exact: true }).fill('18:00');
  await panel.getByLabel('Due time', { exact: true }).blur();
  await expect(panel.getByRole('group', { name: 'When overdue' })).toBeVisible();
  await panel.getByText('Fail', { exact: true }).click();
  await expect(page.locator('.task-row', { hasText: 'Buy blue paint' })).toHaveAttribute('data-status', 'in-progress');
  // The save is asynchronous, so wait until it is stored; reloading earlier can drop it.
  await expect.poll(() => page.evaluate(async (taskId) => {
    const { openStore } = await import('/js/store/db.js');
    const store = await openStore();
    const task = await store.getTask(taskId);
    store.close();
    return task['lifecycle-rules']['overdue-handling'];
  }, id)).toBe('fail');
  await page.reload();
  await expect(panel.getByLabel('Description')).toHaveValue('Buy blue paint');
  await showTab(panel, 'Status');
  await expect(panel.locator('.task-editor__status')).toHaveText('In progress');
  await expect(panel.getByRole('button', { name: 'Unmark started', exact: true })).toBeVisible();
  await showTab(panel, 'Configuration');
  await expect(panel.getByLabel('Due date', { exact: true })).toHaveValue('2030-05-06');
  await expect(panel.getByLabel('Due time', { exact: true })).toHaveValue('18:00');
  await expect(panel.getByLabel('Fail', { exact: true })).toBeChecked();
  await panel.getByRole('button', { name: 'Clear the due date' }).click();
  await expect(panel.getByLabel('Due date', { exact: true })).toHaveValue('');
  await expect(panel.getByRole('group', { name: 'When overdue' })).toBeHidden();
  expect(problems).toEqual([]);
});

test('ticks a target-3 task to 3/3 and edits its deadline through the lifecycle rules in local mode', async ({ page }) => {
  const problems = watch(page);
  await page.setViewportSize(WIDE);
  const id = await seed(page);
  const panel = await openEditor(page);
  await setTarget(panel, '3');
  await showTab(panel, 'Status');
  const row = page.locator('.task-row', { hasText: 'Buy paint' });
  await expect(row.locator('.task-row__count')).toHaveText('0/3');
  for (const done of [1, 2]) {
    await row.getByRole('button', { name: `Tick Buy paint, ${done - 1} of 3 done` }).click();
    await expect(row.locator('.task-row__count')).toHaveText(`${done}/3`);
  }
  await expect(row).toHaveAttribute('data-status', 'in-progress');
  await expect(panel.locator('.task-editor__status')).toHaveText('In progress');
  await expect(panel.locator('[data-part="progress"]')).toContainText('2 / 3');
  // The third tick reaches the target; the default filter of every status keeps the row, now completed.
  await row.getByRole('button', { name: 'Tick Buy paint, 2 of 3 done' }).click();
  await expect(row).toHaveAttribute('data-status', 'completed');
  await expect(panel.locator('.task-editor__status')).toHaveText('Completed');
  await expect(panel.locator('[data-part="progress"]')).toContainText('3 / 3');
  await expect(panel.locator('[data-part="meter"]')).toHaveAttribute('data-color', 'green');

  await showTab(panel, 'Configuration');
  await panel.getByLabel('Due date', { exact: true }).fill('2030-05-06');
  await panel.getByLabel('Due time', { exact: true }).fill('18:00');
  await panel.getByLabel('Due time', { exact: true }).blur();
  const due = new Date(2030, 4, 6, 18, 0).toISOString();
  const read = () => page.evaluate(async (taskId) => {
    const { openStore } = await import('/js/store/db.js');
    const store = await openStore();
    const task = await store.getTask(taskId);
    const events = await store.eventsOfTask(taskId);
    store.close();
    return {
      rules: task['lifecycle-rules'], occurrence: task['current-occurrence'], events: events.map((event) => event.type),
    };
  }, id);
  await expect.poll(async () => (await read()).rules['due-time']).toBe(due);
  const stored = await read();
  expect(stored.rules['target-count']).toBe(3);
  expect(stored.occurrence).toMatchObject({ 'target-count': 3, 'completion-count': 3, status: 'completed', 'due-time': due });
  // The local history keeps each rule edit as the service does: the target, then the deadline.
  expect(stored.events).toEqual(['create', 'edit-lifecycle-rules', 'log', 'log', 'log', 'edit-lifecycle-rules']);
  await page.reload();
  await showTab(panel, 'Status');
  await expect(panel.locator('.task-editor__status')).toHaveText('Completed');
  await showTab(panel, 'Configuration');
  await expect(panel.getByLabel('Target')).toHaveValue('3');
  await expect(panel.getByLabel('Due date', { exact: true })).toHaveValue('2030-05-06');
  expect(problems).toEqual([]);
});

test('the stepper steps a target-3 task up to 2 and back to 0 with undos, and Mark started toggles the start', async ({ page }) => {
  const problems = watch(page);
  await page.setViewportSize(WIDE);
  const id = await seed(page);
  const panel = await openEditor(page);
  await setTarget(panel, '3');
  await showTab(panel, 'Status');
  const stepper = panel.getByRole('group', { name: 'Completions' });
  const line = panel.locator('.task-editor__status');
  await expect(panel.getByRole('button', { name: 'Check off', exact: true })).toBeHidden();
  await expect(line).toHaveText('To do');
  await expect(stepper.getByRole('button', { name: 'Undo a completion' })).toBeDisabled();
  for (const done of [1, 2]) {
    await stepper.getByRole('button', { name: 'Add a completion' }).click();
    await expect(stepper.locator('.task-editor__count')).toHaveText(`${done} of 3`);
  }
  await expect(line).toHaveText('In progress');
  await expect(panel.locator('[data-part="entries"] > li')).toHaveCount(2);
  await expect(panel.getByRole('button', { name: 'Unmark started' })).toBeHidden();
  for (const left of [1, 0]) {
    await stepper.getByRole('button', { name: 'Undo a completion' }).click();
    await expect(stepper.locator('.task-editor__count')).toHaveText(`${left} of 3`);
  }
  await expect(line).toHaveText('To do');
  await panel.getByRole('button', { name: 'Mark started' }).click();
  await expect(line).toHaveText('In progress');
  await panel.getByRole('button', { name: 'Unmark started' }).click();
  await expect(line).toHaveText('To do');
  const stored = await page.evaluate(async (taskId) => {
    const { openStore } = await import('/js/store/db.js');
    const store = await openStore();
    const task = await store.getTask(taskId);
    const events = await store.eventsOfTask(taskId);
    store.close();
    return { occurrence: task['current-occurrence'], events: events.map((event) => event.type) };
  }, id);
  expect(stored.occurrence).toMatchObject({ 'completion-count': 0, status: 'ready' });
  expect(stored.events).toEqual(['create', 'edit-lifecycle-rules', 'log', 'log', 'undo-log', 'undo-log', 'start', 'unstart']);
  expect(problems).toEqual([]);
});

test('logs kcal past an at-most limit, sees the orange box, undoes the entry, and sees it clear (TSK-21, TSK-22)', async ({ page }) => {
  const problems = watch(page);
  await page.setViewportSize(WIDE);
  await seed(page);
  const panel = await openEditor(page);
  await showTab(panel, 'Configuration');
  const dueDate = panel.getByLabel('Due date', { exact: true });
  await dueDate.fill('2030-05-06');
  await panel.getByLabel('Due time', { exact: true }).fill('18:00');
  await panel.getByLabel('Due time', { exact: true }).blur();
  await pick(panel, 'At most');
  await panel.getByLabel('Measure').selectOption('amount');
  const target = panel.getByLabel('Target', { exact: true });
  await target.fill('1600');
  await target.press('Tab');
  const unit = panel.getByLabel('Unit', { exact: true });
  await unit.fill('kcal');
  await unit.press('Tab');
  await expect(panel.locator('[data-part="goal-line"]')).toContainText('kcal or less.');

  await showTab(panel, 'Status');
  const box = panel.locator('[data-part="progress-box"]');
  const log = async (amount, label) => {
    await panel.getByLabel(/^Amount/).fill(amount);
    await panel.getByLabel('Label (optional)').fill(label);
    await panel.getByRole('button', { name: 'Log', exact: true }).click();
  };
  await log('1500', 'Lunch');
  await expect(box).toHaveAttribute('data-state', 'normal');
  await expect(panel.locator('[data-part="meter"]')).toHaveAttribute('data-color', 'orange');
  await log('220', 'Pizza');
  await expect(box).toHaveAttribute('data-state', 'over');
  await expect(box).toContainText('120 kcal over the limit');
  await expect(panel.locator('.task-editor__status')).toHaveText('In progress, not on track');
  await expect(panel.locator('[data-part="entries"] > li')).toHaveText([/Pizza.*220 kcal/, /Lunch.*1,500 kcal/]);
  await expect(panel.locator('[data-part="entries-total"]')).toContainText('1,720 kcal');

  await panel.locator('[data-part="entries"] > li', { hasText: 'Pizza' }).getByRole('button', { name: /^Undo/ }).click();
  await expect(box).toHaveAttribute('data-state', 'normal');
  await expect(panel.locator('[data-part="progress"]')).toContainText('1,500 / max 1,600 kcal');
  await expect(panel.locator('.task-editor__status')).toHaveText('In progress');
  await expect(panel.locator('[data-part="entries"] > li')).toHaveCount(1);

  await showTab(panel, 'History');
  await panel.getByRole('button', { name: /history$/i }).click();
  await expect(panel.locator('[data-history="events"] li', { hasText: 'You logged Pizza · 220 kcal' })).toHaveClass(/is-undone/);
  await expect(panel.locator('[data-history="events"] li', { hasText: 'You undid Pizza · 220 kcal' })).toBeVisible();
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
    return task['lifecycle-rules']['due-time'];
  }, id);
  await showTab(panel, 'Configuration');
  const date = panel.getByLabel('Due date', { exact: true });
  await date.focus();
  await page.keyboard.type('11052026');
  // The time field's segments depend on the browser locale (an AM/PM segment in en-US), so fill it directly.
  await panel.getByLabel('Due time', { exact: true }).fill('09:30');
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
  await showTab(panel, 'Configuration');
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
  await showTab(panel, 'Configuration');
  await expect(panel.locator('.chip-list .chip')).toHaveText(['Garden']);
  expect(problems).toEqual([]);
});

test('a new note appears at the top, editing marks it edited, and deleting asks in place (NOT-1 to NOT-5)', async ({ page }) => {
  const problems = watch(page);
  await page.setViewportSize(WIDE);
  await seed(page);
  const panel = await openEditor(page);
  await showTab(panel, 'Notes');
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
  await showTab(panel, 'Notes');
  await expect(panel.locator('.note .note__text')).toHaveText(['Get the matte white, not the gloss.']);
  expect(problems).toEqual([]);
});

test('Delete task moves it to the recycle bin with an Undo toast, and a deleted task opens read-only (TSK-11, BIN-6)', async ({ page }) => {
  const problems = watch(page);
  await page.setViewportSize(WIDE);
  const id = await seed(page);
  const panel = await openEditor(page);
  await showTab(panel, 'Configuration');
  await panel.getByRole('button', { name: 'Delete task' }).click();
  await expect(panel).toHaveCount(0);
  await expect(page.locator('.task-row', { hasText: 'Buy paint' })).toHaveCount(0);
  await page.locator('.toast', { hasText: 'Task moved to the recycle bin.' }).getByRole('button', { name: 'Undo' }).click();
  const again = await openEditor(page);
  await showTab(again, 'Configuration');
  await again.getByRole('button', { name: 'Delete task' }).click();
  await expect(page.locator('.task-row', { hasText: 'Buy paint' })).toHaveCount(0);
  await page.goto(`/#/tasks/${id}`);
  await expect(panel.getByText('This task is in the recycle bin.')).toBeVisible();
  await expect(panel.getByLabel('Description')).toBeDisabled();
  await showTab(panel, 'Configuration');
  await expect(panel.getByLabel('Due date', { exact: true })).toBeDisabled();
  await expect(panel.getByRole('button', { name: 'Delete task' })).toHaveCount(0);
  await panel.getByRole('button', { name: 'Restore' }).click();
  // Restoring returns to Status and focuses its tab.
  await expect(panel.getByRole('tab', { name: 'Status' })).toBeFocused();
  await expect(panel.getByLabel('Description')).toBeEnabled();
  await expect(page.locator('.task-row', { hasText: 'Buy paint' })).toHaveCount(1);
  await page.goto('/#/tasks/no-such-task');
  await expect(page.locator('.toast', { hasText: 'That task was not found.' })).toBeVisible();
  await expect(page).toHaveURL(/#\/tasks$/);
  expect(problems).toEqual([]);
});

test('a weekly at-most kcal goal with a start time saves as lifecycle rules and survives a reload (TSK-15, TSK-16, TSK-20)', async ({ page }) => {
  const problems = watch(page);
  await page.setViewportSize(WIDE);
  const id = await seed(page);
  const panel = await openEditor(page);
  await showTab(panel, 'Configuration');
  await pick(panel, 'At most');
  await expect(panel.getByText('At most needs a due time or a recurrence.')).toBeVisible();
  await pick(panel, 'Year');
  await pick(panel, 'Week');
  await pick(panel, 'At most');
  await panel.getByLabel('Measure').selectOption('amount');
  const target = panel.getByLabel('Target', { exact: true });
  await target.fill('1600.5');
  await target.press('Tab');
  const unit = panel.getByLabel('Unit', { exact: true });
  await unit.fill('kcal');
  await unit.press('Tab');
  const start = panel.getByLabel('Starts', { exact: true });
  await start.fill('2030-05-06T09:30');
  await start.blur();
  await expect(panel.locator('[data-part="goal-line"]')).toContainText('Each week succeeds at');
  await expect(panel.locator('[data-part="goal-line"]')).toContainText('kcal or less.');
  await expect(panel.getByLabel('Due date', { exact: true })).toBeHidden();
  const read = () => page.evaluate(async (taskId) => {
    const { openStore } = await import('/js/store/db.js');
    const store = await openStore();
    const task = await store.getTask(taskId);
    store.close();
    return task['lifecycle-rules'];
  }, id);
  await expect.poll(async () => (await read())['start-time']).toBe(new Date(2030, 4, 6, 9, 30).toISOString());
  expect(await read()).toMatchObject({
    'goal-direction': 'at-most', 'goal-measure': 'amount', 'target-count': 1600.5, 'goal-unit': 'kcal', 'recurrence-unit': 'week',
  });
  await page.reload();
  const reopened = page.locator('[data-editor-slot] .editor-panel');
  await showTab(reopened, 'Configuration');
  await expect(reopened.getByLabel('At most', { exact: true })).toBeChecked();
  await expect(reopened.getByLabel('Measure')).toHaveValue('amount');
  await expect(reopened.getByLabel('Target', { exact: true })).toHaveValue('1600.5');
  await expect(reopened.getByLabel('Unit', { exact: true })).toHaveValue('kcal');
  await expect(reopened.getByLabel('Week', { exact: true })).toBeChecked();
  await expect(reopened.getByLabel('Starts', { exact: true })).toHaveValue('2030-05-06T09:30');
  expect(problems).toEqual([]);
});

test('Cancel task cancels the task and Uncancel reopens it, from the Danger zone of Configuration', async ({ page }) => {
  const problems = watch(page);
  await page.setViewportSize(WIDE);
  await seed(page);
  const panel = await openEditor(page);
  const row = page.locator('.task-row', { hasText: 'Buy paint' });
  await showTab(panel, 'Configuration');
  await panel.getByRole('button', { name: 'Cancel task' }).click();
  await expect(row).toHaveAttribute('data-status', 'cancelled');
  await expect(panel.getByRole('button', { name: 'Uncancel' })).toBeEnabled();
  await showTab(panel, 'Status');
  await expect(panel.getByText('Uncancel in Configuration.')).toBeVisible();
  await showTab(panel, 'Configuration');
  await panel.getByRole('button', { name: 'Uncancel' }).click();
  await expect(row).toHaveAttribute('data-status', 'ready');
  expect(problems).toEqual([]);
});

test.describe('recurring tasks in local mode', () => {
  test.use({ timezoneId: 'Europe/Brussels' });

  test('a weekly task ticked this week comes back as ready next week, and its history shows the roll-over', async ({ page }) => {
    const problems = watch(page);
    await page.setViewportSize(WIDE);
    // Wednesday 4 November 2026; the week ends on Monday 9 November, 00:00 in Brussels.
    await page.clock.install({ time: new Date('2026-11-04T10:00:00Z') });
    await seed(page);
    const panel = await openEditor(page);
    await showTab(panel, 'Configuration');
    await pick(panel, 'Week');
    await expect(panel.getByLabel('Timezone')).toHaveValue('Europe/Brussels');
    await expect(page.locator('.task-row', { hasText: 'Buy paint' }).locator('.task-row__repeat')).toHaveText('Weekly');
    await showTab(panel, 'Status');
    await panel.getByRole('button', { name: 'Check off', exact: true }).click();
    await expect(panel.locator('.task-editor__status')).toHaveText('Completed');
    // Completed this week, the task stays completed until its next period.
    const row = page.locator('.task-row', { hasText: 'Buy paint' });
    await expect(row).toHaveAttribute('data-status', 'completed');
    await page.keyboard.press('Escape');
    await expect(panel).toHaveCount(0);
    // Into Monday 9 November, 09:00 in Brussels: the minute timer rolls the task over.
    await page.clock.fastForward(119 * 3_600_000);
    await expect(row).toHaveAttribute('data-status', 'ready');
    await page.reload();
    await expect(row).toHaveAttribute('data-status', 'ready');
    const reopened = await openEditor(page);
    await showTab(reopened, 'History');
    await expect(reopened.locator('[data-history="events"] li').first()).toContainText('Period ended');
    await expect(reopened.locator('[data-history="occurrences"] li')).toHaveCount(2);
    await expect(reopened.locator('[data-history="occurrences"] li').nth(1)).toContainText('Completed');
    expect(problems).toEqual([]);
  });
});

test.describe('note links in local mode', () => {
  test.use({ timezoneId: 'UTC' });

  test('a note on a daily task shows on its occurrence in the history, and can be made global', async ({ page }) => {
    const problems = watch(page);
    await page.setViewportSize(WIDE);
    await page.clock.install({ time: new Date('2026-11-04T10:00:00Z') });
    await seed(page);
    const panel = await openEditor(page);
    await showTab(panel, 'Configuration');
    await pick(panel, 'Day');
    await expect(page.locator('.task-row', { hasText: 'Buy paint' }).locator('.task-row__repeat')).toHaveText('Daily');
    await showTab(panel, 'Notes');
    for (const text of ['Watered the roses.', 'Pruned the hedge.']) {
      await panel.getByRole('textbox', { name: 'Add note' }).fill(text);
      await panel.getByRole('button', { name: 'Add note' }).click();
      await expect(panel.locator('.note', { hasText: text }).locator('.note__occurrence')).toContainText('#1');
    }
    await showTab(panel, 'History');
    const firstOccurrence = panel.locator('[data-history="occurrences"] [data-occurrence="1"]');
    await expect(firstOccurrence.locator('.task-history__note')).toHaveText([/Pruned the hedge\./, /Watered the roses\./]);
    await showTab(panel, 'Notes');

    // While the note is edited its text sits in a field, so find it by its identifier.
    const rosesId = await panel.locator('.note', { hasText: 'Watered the roses.' }).getAttribute('data-note-id');
    const roses = panel.locator(`.note[data-note-id="${rosesId}"]`);
    await roses.getByRole('button', { name: /More actions for your note/ }).click();
    await roses.getByRole('menuitem', { name: 'Edit' }).click();
    const link = roses.getByLabel('Belongs to');
    await expect(link.locator('option:checked')).toContainText('#1');
    await link.focus();
    await page.keyboard.press('ArrowUp');
    await expect(link).toHaveValue('');
    await roses.getByRole('button', { name: 'Save note' }).click();
    await expect(roses.locator('.note__occurrence')).toHaveCount(0);
    await expect(panel.locator('.note').first()).toContainText('Watered the roses.');
    await showTab(panel, 'History');
    await panel.getByRole('button', { name: 'Refresh history' }).click();
    await expect(firstOccurrence.locator('.task-history__note')).toHaveText([/Pruned the hedge\./]);

    // The next day the task rolls over: the global note leads, and the note of the past day follows, marked with it.
    await page.keyboard.press('Escape');
    await page.clock.fastForward(24 * 3_600_000);
    await page.reload();
    const reopened = await openEditor(page);
    await showTab(reopened, 'Notes');
    await expect(reopened.locator('.note .note__text')).toHaveText(['Watered the roses.', 'Pruned the hedge.']);
    const hedge = reopened.locator('.note', { hasText: 'Pruned the hedge.' });
    await expect(hedge.locator('.note__occurrence')).toContainText('#1');
    await expect(hedge.getByRole('button', { name: /More actions for your note/ })).toBeVisible();
    await showTab(reopened, 'History');
    await expect(reopened.locator('[data-history="occurrences"] [data-occurrence="1"] .task-history__note')).toHaveText([/Pruned the hedge\./]);
    await expect(reopened.locator('[data-history="occurrences"] [data-occurrence="2"] .task-history__note')).toHaveCount(0);
    expect(problems).toEqual([]);
  });
});
