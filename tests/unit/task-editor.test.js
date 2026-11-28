// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createEditorPanel } from '../../src/js/views/editor-panel.js';
import { resetBody } from './dom-reset.js';
import { mountTaskEditor } from '../../src/js/views/task-editor.js';
import { createTaskHistory } from '../../src/js/views/task-history.js';
import { shapeTask } from './task-shape.js';

const TASK = shapeTask({
  id: 't1', description: 'Buy paint', status: 'ready', 'due-time': null, 'overdue-handling': 'keep',
  'creation-time': '2026-11-04T09:00:00.000Z', 'last-update-time': '2026-11-04T09:00:00.000Z', 'deletion-time': null,
});


/**
 * Create a store stand-in that holds one task in no list and without notes.
 * @returns {object} the store
 */
function fakeStore() {
  const listeners = [];
  return {
    listeners,
    getTask: vi.fn(async () => ({ ...TASK })),
    listLists: vi.fn(async () => []),
    listsOfTask: vi.fn(async () => []),
    notesOfTask: vi.fn(async () => []),
    occurrencesOfTask: vi.fn(async () => []),
    editNote: vi.fn(async () => ({})),
    updateTask: vi.fn(async () => ({ ...TASK })),
    updateRules: vi.fn(async () => ({ ...TASK })),
    postEvent: vi.fn(async () => ({ task: { ...TASK } })),
    logEntry: vi.fn(async () => ({ task: { ...TASK } })),
    undoLog: vi.fn(async () => ({ task: { ...TASK } })),
    eventsOfTask: vi.fn(async () => []),
    addNote: vi.fn(async () => ({})),
    subscribe: (listener) => {
      listeners.push(listener);
      return () => {};
    },
  };
}

/**
 * Focus a control, change its value as typing would, and leave it.
 * @param {HTMLInputElement|HTMLTextAreaElement} control the control
 * @param {string} value the new value
 */
function typeAndLeave(control, value) {
  control.focus();
  change(control, value);
  control.blur();
}

/**
 * Change a control's value and fire its change event.
 * @param {HTMLInputElement|HTMLTextAreaElement} control the control
 * @param {string} value the new value
 */
function change(control, value) {
  control.value = value;
  control.dispatchEvent(new Event('change', { bubbles: true }));
}

/**
 * Tell the error text a control's `aria-describedby` points to, if it is marked invalid.
 * @param {HTMLElement} control the control
 * @returns {string|null} the error text, or null for a valid control
 */
function errorOf(control) {
  if (control.getAttribute('aria-invalid') !== 'true') {
    return null;
  }
  const ids = control.getAttribute('aria-describedby').split(' ');
  return ids.map((id) => document.getElementById(id)).find((element) => element?.matches('.field__error') && !element.hidden)
    ?.textContent ?? null;
}

describe('createEditorPanel', () => {
  let panel;
  let opener;
  const route = (editor) => ({ name: editor ? 'task' : 'tasks', view: 'tasks', editor, params: editor ? { taskId: 't1' } : {} });

  beforeEach(() => {
    resetBody('<main tabindex="-1"><a href="#/tasks/t1">Buy paint</a></main><div data-editor-slot hidden></div>');
    opener = document.querySelector('a');
  });

  afterEach(() => {
    panel?.destroy();
  });

  it('opens an editor route in the slot, closes on Escape, and returns focus to the opener', () => {
    const close = vi.fn();
    const destroy = vi.fn();
    const slot = document.querySelector('[data-editor-slot]');
    panel = createEditorPanel({
      slot, close, fallbackFocus: () => document.querySelector('main'),
      editors: { task: (view) => {
        view.setTitle('Task');
        view.body.append(Object.assign(document.createElement('textarea'), { id: 'field' }));
        return { destroy };
      } },
    });
    opener.focus();
    panel.update(route('task'));
    expect(slot.hidden).toBe(false);
    expect(slot.querySelector('.editor-panel__title').textContent).toBe('Task');
    expect(slot.querySelector('.editor-panel__header button').getAttribute('aria-label')).toBe('Close the task editor');
    document.getElementById('field').dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(close).toHaveBeenCalledTimes(1);
    panel.update(route(null));
    expect(destroy).toHaveBeenCalledTimes(1);
    expect(slot.hidden).toBe(true);
    expect(slot.childElementCount).toBe(0);
    expect(document.activeElement).toBe(opener);
  });

  it('leaves the slot hidden for an editor that is not built yet', () => {
    const slot = document.querySelector('[data-editor-slot]');
    panel = createEditorPanel({ slot, close: vi.fn(), editors: {} });
    panel.update({ name: 'list-new', view: 'lists', editor: 'list', params: {} });
    expect(slot.hidden).toBe(true);
  });
});

describe('mountTaskEditor', () => {
  let store;
  let editor;
  let panel;
  let close;
  let toaster;

  beforeEach(async () => {
    resetBody('<div data-editor-slot hidden></div>');
    store = fakeStore();
    close = vi.fn();
    toaster = { show: vi.fn() };
    panel = createEditorPanel({
      slot: document.querySelector('[data-editor-slot]'), close,
      editors: { task: (view, route) => {
        editor = mountTaskEditor(view, route, { store, toaster });
        return editor;
      } },
    });
    panel.update({ name: 'task', view: 'tasks', editor: 'task', params: { taskId: 't1' } });
    await editor.idle();
  });

  afterEach(() => {
    panel.destroy();
  });

  it('focuses the Status tab once the task loaded, and has no Save button', () => {
    const description = document.querySelector('textarea[name="description"]');
    expect(description.value).toBe('Buy paint');
    expect(document.activeElement).toBe(document.querySelector('[role="tab"][aria-selected="true"]'));
    expect(document.activeElement.textContent).toBe('Status');
    expect([...document.querySelectorAll('button')].some((button) => /save/i.test(button.textContent))).toBe(false);
  });

  it('builds its fields from the vendored field.js skeleton, with the error icon from the look sprite', () => {
    const fields = [...document.querySelectorAll('.task-editor__fields .field')];
    expect(fields.length).toBeGreaterThan(0);
    for (const field of fields.filter((element) => element.querySelector(':scope > .field__control'))) {
      expect(field.hasAttribute('data-field')).toBe(true);
      expect(field.querySelector(':scope > .field__status')).not.toBeNull();
    }
    const combo = document.querySelector('input[name="add-to-list"]');
    expect(document.querySelector(`label[for="${combo.id}"]`).classList.contains('field__label--hidden')).toBe(true);
    const description = document.querySelector('textarea[name="description"]');
    change(description, '');
    expect(description.closest('.field').querySelector('.field__error use').getAttribute('href')).toBe('vendor/design/looks/neutral/icons.svg#icon-alert');
  });

  it('marks every visible segmented legend with the package .segmented__legend class', () => {
    const legends = [...document.querySelectorAll('.task-editor__fields .segmented > legend')];
    expect(legends.length).toBeGreaterThan(0);
    expect(legends.filter((legend) => !legend.classList.contains('segmented__legend')).map((legend) => legend.textContent)).toEqual([]);
  });

  it('shows a field error for an empty or too long description and saves nothing (TSK-1)', () => {
    const description = document.querySelector('textarea[name="description"]');
    change(description, '   ');
    expect(errorOf(description)).toBe('Enter a description.');
    change(description, 'x'.repeat(501));
    expect(errorOf(description)).toBe('A description holds at most 500 characters.');
    expect(store.updateTask).not.toHaveBeenCalled();
  });

  it('saves a valid description, trimmed, and clears the error', async () => {
    const description = document.querySelector('textarea[name="description"]');
    change(description, '');
    change(description, '  Buy blue paint ');
    await vi.waitFor(() => expect(store.updateTask).toHaveBeenCalledWith('t1', { description: 'Buy blue paint' }));
    expect(errorOf(description)).toBeNull();
  });

  it('shows a field error for a due time without a date and saves nothing (TSK-5)', async () => {
    const date = document.querySelector('input[name="due-date"]');
    typeAndLeave(document.querySelector('input[name="due-clock"]'), '10:00');
    await vi.waitFor(() => expect(errorOf(date)).toBe('Enter a date to set a time.'));
    expect(store.updateRules).not.toHaveBeenCalled();
  });

  it('saves a date without a time as a date-only due time (TSK-6), and shows overdue behavior', async () => {
    const overdue = document.querySelector('[data-part="overdue"]');
    expect(overdue.hidden).toBe(true);
    typeAndLeave(document.querySelector('input[name="due-date"]'), '2026-11-08');
    await vi.waitFor(() => expect(store.updateRules).toHaveBeenCalledWith('t1', { 'due-time': '2026-11-08' }));
    expect(store.updateTask).not.toHaveBeenCalled();
  });

  it('saves the due date and time only when the field is left, not on each change while typing', async () => {
    const date = document.querySelector('input[name="due-date"]');
    const time = document.querySelector('input[name="due-clock"]');
    date.focus();
    change(date, '0202-05-11');
    change(date, '2026-05-11');
    time.focus();
    change(time, '18:00');
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(store.updateRules).not.toHaveBeenCalled();
    time.blur();
    await vi.waitFor(() => expect(store.updateRules).toHaveBeenCalledTimes(1));
    expect(store.updateRules.mock.calls[0][1]).toEqual({ 'due-time': new Date(2026, 4, 11, 18, 0).toISOString() });
  });

  describe('status actions and lifecycle rules', () => {
    /**
     * Fill the editor with another version of the task, as a store change does.
     * @param {object} fields the shortcut fields of `shapeTask`
     * @returns {Promise<void>} resolves once filled
     */
    async function refill(fields) {
      const next = shapeTask({ ...TASK, id: 't1', description: 'Buy paint', ...fields });
      store.getTask.mockImplementation(async () => next);
      const reads = store.listsOfTask.mock.calls.length;
      store.listeners.forEach((listener) => listener({ operation: 'postEvent' }));
      await vi.waitFor(() => expect(store.listsOfTask.mock.calls.length).toBeGreaterThan(reads));
      await new Promise((resolve) => setTimeout(resolve, 0));
    }

    /**
     * Click a control and wait until the posts it started settle.
     * @param {HTMLElement} control the control
     * @returns {Promise<Array<Array<unknown>>>} the postEvent calls of the click
     */
    async function clickAndCollect(control) {
      store.postEvent.mockClear();
      control.click();
      await new Promise((resolve) => setTimeout(resolve, 0));
      await new Promise((resolve) => setTimeout(resolve, 0));
      return store.postEvent.mock.calls;
    }

    /**
     * Fill the editor with a task whose rules and current occurrence differ from the defaults.
     * @param {object} [rules] the lifecycle rule fields to set
     * @param {object} [occurrence] the current occurrence fields to set
     * @returns {Promise<void>} resolves once filled
     */
    async function refillWith(rules = {}, occurrence = {}) {
      const next = shapeTask({ ...TASK, id: 't1', description: 'Buy paint' });
      next['lifecycle-rules'] = { ...next['lifecycle-rules'], ...rules };
      next['current-occurrence'] = { ...next['current-occurrence'], ...occurrence };
      store.getTask.mockImplementation(async () => next);
      const reads = store.listsOfTask.mock.calls.length;
      store.listeners.forEach((listener) => listener({ operation: 'updateRules' }));
      await vi.waitFor(() => expect(store.listsOfTask.mock.calls.length).toBeGreaterThan(reads));
      await new Promise((resolve) => setTimeout(resolve, 0));
    }

    const control = (name) => document.querySelector(`[name="${name}"]`);
    const part = (name) => document.querySelector(`[data-part="${name}"]`);
    /**
     * Choose a radio of a segmented control and fire its change event.
     * @param {string} group the radio name prefix
     * @param {string} value the radio value
     */
    function choose(group, value) {
      const radio = document.querySelector(`input[name^="${group}"][value="${value}"]`);
      radio.checked = true;
      radio.dispatchEvent(new Event('change', { bubbles: true }));
    }
    /**
     * Name the checked radio of a segmented control.
     * @param {string} group the radio name prefix
     * @returns {string|undefined} the value
     */
    const checked = (group) => document.querySelector(`input[name^="${group}"]:checked`)?.value;
    const goalError = () => part('goal-error');

    describe('goal', () => {
      it('offers Check, At least, and At most, opens on Check, and hides measure, target, and unit then', () => {
        const legend = document.querySelector('[data-section="goal"] .segmented > legend');
        expect(legend.textContent).toBe('Goal');
        expect([...document.querySelectorAll('input[name^="goal-mode"]')].map((radio) => radio.value)).toEqual(['check', 'at-least', 'at-most']);
        expect(checked('goal-mode')).toBe('check');
        expect(['goal-measure', 'goal-target', 'goal-unit'].map((name) => control(name).closest('[data-part]').hidden)).toEqual([true, true, true]);
        expect(part('goal-line').textContent).toBe('The task succeeds at 1 check or more.');
      });

      it('shows measure and target for At least without saving, and the goal fields of the rules', async () => {
        choose('goal-mode', 'at-least');
        expect(checked('goal-mode')).toBe('at-least');
        expect(control('goal-measure').closest('[data-part]').hidden).toBe(false);
        expect(store.updateRules).not.toHaveBeenCalled();
        await refillWith({ 'goal-direction': 'at-most', 'goal-measure': 'amount', 'goal-target': 1600.5, 'goal-unit': 'kcal', 'recurrence-unit': 'week',
          'recurrence-interval': 1, timezone: 'Europe/Brussels' });
        expect([checked('goal-mode'), control('goal-measure').value, control('goal-target').value, control('goal-unit').value]).toEqual(['at-most', 'amount', '1600.5', 'kcal']);
        expect(part('goal-line').textContent).toBe(`Each week succeeds at ${(1600.5).toLocaleString(undefined, { maximumFractionDigits: 3 })} kcal or less.`);
        expect(control('goal-unit').closest('[data-part]').hidden).toBe(false);
      });

      it('offers the four measures, and the unit only for Amount and Reading', async () => {
        choose('goal-mode', 'at-least');
        expect([...control('goal-measure').options].map((option) => [option.value, option.textContent])).toEqual([
          ['checks', 'Checks'], ['time', 'Time spent'], ['amount', 'Amount (sum)'], ['reading', 'Reading (latest)'],
        ]);
        await refillWith({ 'goal-measure': 'time', 'goal-target': 12000 });
        expect(control('goal-unit').closest('[data-part]').hidden).toBe(true);
        await refillWith({ 'goal-measure': 'reading', 'goal-target': 80 });
        expect(control('goal-unit').closest('[data-part]').hidden).toBe(false);
      });

      it('saves the goal fields through the lifecycle rules', async () => {
        await refillWith({ 'goal-direction': 'at-least', 'goal-measure': 'checks', 'goal-target': 3 });
        change(control('goal-measure'), 'time');
        await vi.waitFor(() => expect(store.updateRules).toHaveBeenLastCalledWith('t1', { 'goal-measure': 'time' }));
        change(control('goal-measure'), 'amount');
        await vi.waitFor(() => expect(store.updateRules).toHaveBeenLastCalledWith('t1', { 'goal-measure': 'amount' }));
        await refillWith({ 'goal-direction': 'at-least', 'goal-measure': 'amount', 'goal-target': 3 });
        change(control('goal-target'), '1600.5');
        await vi.waitFor(() => expect(store.updateRules).toHaveBeenLastCalledWith('t1', { 'goal-target': 1600.5 }));
        typeAndLeave(control('goal-unit'), ' kcal ');
        await vi.waitFor(() => expect(store.updateRules).toHaveBeenLastCalledWith('t1', { 'goal-unit': 'kcal' }));
        typeAndLeave(control('goal-unit'), '');
        await vi.waitFor(() => expect(store.updateRules).toHaveBeenLastCalledWith('t1', { 'goal-unit': null }));
        expect(store.updateTask).not.toHaveBeenCalled();
      });

      it('resets a target that the new measure cannot hold to 1', async () => {
        await refillWith({ 'goal-measure': 'amount', 'goal-target': 0.5 });
        change(control('goal-measure'), 'checks');
        await vi.waitFor(() => expect(store.updateRules).toHaveBeenCalledWith('t1', { 'goal-measure': 'checks', 'goal-target': 1 }));
      });

      it('takes a whole number for checks, and rejects 0, decimals, and numbers above 999,999,999,999', async () => {
        await refillWith({ 'goal-measure': 'checks', 'goal-target': 3 });
        for (const bad of ['0', '2.5', '1000000000000', '-1', 'abc']) {
          change(control('goal-target'), bad);
          expect(errorOf(control('goal-target'))).toBe('Enter a whole number from 1 to 999,999,999,999.');
        }
        expect(store.updateRules).not.toHaveBeenCalled();
        change(control('goal-target'), '999999999999');
        await vi.waitFor(() => expect(store.updateRules).toHaveBeenCalledWith('t1', { 'goal-target': 999999999999 }));
        expect(errorOf(control('goal-target'))).toBeNull();
      });

      it('takes up to 3 decimals from 0 for amounts and readings', async () => {
        await refillWith({ 'goal-measure': 'reading', 'goal-target': 80 });
        for (const bad of ['-0.5', '1.2345', '1000000000000']) {
          change(control('goal-target'), bad);
          expect(errorOf(control('goal-target'))).toBe('Enter a number from 0 to 999,999,999,999.999, with at most 3 decimals.');
        }
        expect(store.updateRules).not.toHaveBeenCalled();
        change(control('goal-target'), '0');
        await vi.waitFor(() => expect(store.updateRules).toHaveBeenCalledWith('t1', { 'goal-target': 0 }));
        change(control('goal-target'), '79.875');
        await vi.waitFor(() => expect(store.updateRules).toHaveBeenLastCalledWith('t1', { 'goal-target': 79.875 }));
      });

      it('takes hours and minutes for time, saved as seconds, and shows them split', async () => {
        await refillWith({ 'goal-measure': 'time', 'goal-target': 12000 });
        expect([control('goal-hours').value, control('goal-minutes').value]).toEqual(['3', '20']);
        expect(control('goal-target').closest('[data-part]').hidden).toBe(true);
        expect(part('goal-line').textContent).toBe('The task succeeds at 3 h 20 min or more.');
        change(control('goal-hours'), '1');
        await vi.waitFor(() => expect(store.updateRules).toHaveBeenLastCalledWith('t1', { 'goal-target': 4800 }));
        change(control('goal-minutes'), '60');
        expect(errorOf(control('goal-minutes'))).toBe('Enter whole hours and minutes from 0 to 59, at least 1 minute in all.');
        change(control('goal-hours'), '0');
        change(control('goal-minutes'), '0');
        expect(errorOf(control('goal-minutes'))).toBe('Enter whole hours and minutes from 0 to 59, at least 1 minute in all.');
        expect(store.updateRules).toHaveBeenCalledTimes(1);
      });

      it('rejects a unit of more than 20 characters', async () => {
        await refillWith({ 'goal-measure': 'amount', 'goal-target': 5 });
        typeAndLeave(control('goal-unit'), 'k'.repeat(21));
        expect(errorOf(control('goal-unit'))).toBe('A unit holds at most 20 characters.');
        expect(store.updateRules).not.toHaveBeenCalled();
      });

      it('turns back to a plain check with Check, clearing measure, target, and unit', async () => {
        await refillWith({ 'goal-direction': 'at-most', 'goal-measure': 'amount', 'goal-target': 5, 'goal-unit': 'kcal', 'recurrence-unit': 'day',
          'recurrence-interval': 1, timezone: 'UTC' });
        choose('goal-mode', 'check');
        await vi.waitFor(() => expect(store.updateRules).toHaveBeenCalledWith('t1', {
          'goal-direction': 'at-least', 'goal-measure': 'checks', 'goal-target': 1, 'goal-unit': null,
        }));
      });

      it('saves At most only with a due time or a recurrence, and says so otherwise', async () => {
        choose('goal-mode', 'at-most');
        expect(goalError().textContent).toBe('At most needs a due time or a recurrence.');
        expect(store.updateRules).not.toHaveBeenCalled();
        await refillWith({ 'due-time': '2026-11-08T22:59:00.000Z' });
        choose('goal-mode', 'at-most');
        await vi.waitFor(() => expect(store.updateRules).toHaveBeenCalledWith('t1', { 'goal-direction': 'at-most' }));
        expect(goalError().textContent).toBe('');
      });

      it('refuses to clear the due time or the recurrence of an At most goal', async () => {
        await refillWith({ 'goal-direction': 'at-most', 'due-time': '2026-11-08T22:59:00.000Z' });
        const date = control('due-date');
        typeAndLeave(date, '');
        await vi.waitFor(() => expect(errorOf(date)).toBe('At most needs a due time or a recurrence.'));
        await refillWith({ 'goal-direction': 'at-most', 'recurrence-unit': 'week', 'recurrence-interval': 1, timezone: 'UTC' });
        choose('recurrence-unit', '');
        expect(goalError().textContent).toBe('At most needs a due time or a recurrence.');
        expect(store.updateRules).not.toHaveBeenCalled();
      });
    });

    describe('time window', () => {
      const START = '2026-11-04T09:00:00.000Z';

      it('shows Starts, Due, and When overdue under one heading, hiding When overdue until a due time is set', async () => {
        expect(part('start')).not.toBeNull();
        expect(document.querySelector('[data-section="window"] .editor-panel__section-title').textContent).toBe('Time window');
        expect(control('start-time').type).toBe('datetime-local');
        expect(part('overdue').hidden).toBe(true);
        await refillWith({ 'due-time': '2026-11-08T22:59:00.000Z' });
        expect(part('overdue').hidden).toBe(false);
        expect([...part('overdue').querySelectorAll('input')].map((radio) => radio.value)).toEqual(['keep', 'fail']);
        expect([...part('overdue').querySelectorAll('label')].map((label) => label.textContent.trim())).toEqual(['Keep open', 'Fail']);
      });

      it('saves When overdue as keep or fail, and reads a stored cancel as Fail', async () => {
        await refillWith({ 'due-time': '2026-11-08T22:59:00.000Z' });
        choose('overdue', 'fail');
        await vi.waitFor(() => expect(store.updateRules).toHaveBeenCalledWith('t1', { 'overdue-handling': 'fail' }));
        await refillWith({ 'due-time': '2026-11-08T22:59:00.000Z', 'overdue-handling': 'cancel' });
        expect(checked('overdue')).toBe('fail');
        expect(store.updateTask).not.toHaveBeenCalled();
      });

      it('hides When overdue for an at most goal, which always gets a verdict at its due time', async () => {
        await refillWith({ 'due-time': '2026-11-08T22:59:00.000Z', 'goal-direction': 'at-most' });
        expect(part('due').hidden).toBe(false);
        expect(part('overdue').hidden).toBe(true);
      });

      it('hides Due and When overdue of a recurring task, naming the period as its window', async () => {
        await refillWith({ 'recurrence-unit': 'week', 'recurrence-interval': 1, timezone: 'Europe/Brussels', 'due-time': null });
        expect([part('due').hidden, part('overdue').hidden]).toEqual([true, true]);
        expect(part('window-note').hidden).toBe(false);
        expect(part('window-note').textContent).toBe('Each week ends the window, so Due hides.');
      });

      it('saves Starts as a time and clears it, and keeps it before the due time and the end date', async () => {
        const start = control('start-time');
        typeAndLeave(start, '2030-05-06T09:30');
        await vi.waitFor(() => expect(store.updateRules).toHaveBeenLastCalledWith('t1', { 'start-time': new Date(2030, 4, 6, 9, 30).toISOString() }));
        await refillWith({ 'start-time': new Date(2030, 4, 6, 9, 30).toISOString() });
        typeAndLeave(control('start-time'), '');
        await vi.waitFor(() => expect(store.updateRules).toHaveBeenLastCalledWith('t1', { 'start-time': null }));
        await refillWith({ 'due-time': '2030-05-05T09:00:00.000Z' });
        typeAndLeave(control('start-time'), '2030-05-06T10:00');
        expect(errorOf(control('start-time'))).toBe('Starts must be before the due time.');
        await refillWith({ 'recurrence-unit': 'day', 'recurrence-interval': 1, timezone: 'UTC', 'recurrence-end-date': '2030-05-01' });
        typeAndLeave(control('start-time'), '2030-05-06T11:00');
        expect(errorOf(control('start-time'))).toBe('Starts must be before the recurrence end date.');
        expect(store.updateRules).toHaveBeenCalledTimes(2);
      });

      it('fills Starts from the rules, shown as a local date and time', async () => {
        await refillWith({ 'start-time': START });
        const start = new Date(START);
        const pad = (number) => String(number).padStart(2, '0');
        expect(control('start-time').value).toBe(`${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}T${pad(start.getHours())}:${pad(start.getMinutes())}`);
      });

      it('shows Starts as text once period 1 ended, a later period runs, or a user event happened', async () => {
        expect(control('start-time').closest('[data-part]').hidden).toBe(false);
        await refillWith({ 'start-time': START }, { occurrence: 2 });
        expect([control('start-time').closest('[data-part]').hidden, part('start-text').hidden]).toEqual([true, false]);
        expect(part('start-text').textContent).toContain('Starts ');
        await refillWith({ 'start-time': START }, { status: 'completed', progress: 1, 'close-time': '2026-11-05T09:00:00.000Z' });
        expect(part('start-text').hidden).toBe(false);
        store.eventsOfTask = vi.fn(async () => [{ id: 'e1', 'task-id': 't1', occurrence: 1, type: 'log', 'creation-time': START }]);
        await refillWith({ 'start-time': START });
        expect(part('start-text').hidden).toBe(false);
        store.eventsOfTask = vi.fn(async () => [{ id: 'e0', 'task-id': 't1', occurrence: 1, type: 'create', 'creation-time': START }]);
        await refillWith({ 'start-time': START });
        expect(part('start-text').hidden).toBe(true);
      });
    });

    describe('recurrence', () => {
      const details = () => document.querySelector('[data-section="recurrence"] .task-editor__recurrence');

      /**
       * Fill the editor with a weekly task, every two weeks, ending after 10 occurrences.
       * @returns {Promise<void>} resolves once filled
       */
      const refillWeekly = () => refillWith({ 'recurrence-unit': 'week', 'recurrence-interval': 2, 'recurrence-end-count': 10,
        timezone: 'Europe/Brussels', 'due-time': null, 'overdue-handling': null });

      it('offers Never, Day, Week, Month, and Year, and hides the recurrence details until a unit is chosen', async () => {
        expect(document.querySelector('[data-section="recurrence"] .segmented > legend').textContent).toBe('Recurrence');
        expect([...document.querySelectorAll('input[name^="recurrence-unit"]')].map((radio) => [radio.value, radio.parentElement.textContent.trim()])).toEqual([
          ['', 'Never'], ['day', 'Day'], ['week', 'Week'], ['month', 'Month'], ['year', 'Year'],
        ]);
        expect(checked('recurrence-unit')).toBe('');
        expect(details().hidden).toBe(true);
      });

      it('makes a one-off task yearly in the browser timezone', async () => {
        choose('recurrence-unit', 'year');
        await vi.waitFor(() => expect(store.updateRules).toHaveBeenCalledWith('t1', {
          'recurrence-unit': 'year', 'recurrence-interval': 1, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }));
      });

      it('fills and saves the interval, end date, end count, and timezone of a recurring task', async () => {
        await refillWeekly();
        expect(details().hidden).toBe(false);
        expect([checked('recurrence-unit'), control('recurrence-interval').value, control('recurrence-end-date').value,
          control('recurrence-end-count').value, control('timezone').value]).toEqual(['week', '2', '', '10', 'Europe/Brussels']);
        typeAndLeave(control('recurrence-interval'), '3');
        typeAndLeave(control('recurrence-end-date'), '2026-12-31');
        typeAndLeave(control('recurrence-end-count'), '');
        typeAndLeave(control('timezone'), 'Asia/Tokyo');
        await vi.waitFor(() => expect(store.updateRules).toHaveBeenCalledTimes(4));
        expect(store.updateRules.mock.calls.map(([, edit]) => edit)).toEqual([
          { 'recurrence-interval': 3 }, { 'recurrence-end-date': '2026-12-31' }, { 'recurrence-end-count': null }, { timezone: 'Asia/Tokyo' },
        ]);
      });

      it('shows field errors for an interval outside 1 to 99, an end count below 1, and an unknown timezone', async () => {
        await refillWeekly();
        typeAndLeave(control('recurrence-interval'), '100');
        typeAndLeave(control('recurrence-end-count'), '0');
        typeAndLeave(control('timezone'), 'Mars/Olympus');
        expect(errorOf(control('recurrence-interval'))).toBe('Enter a whole number from 1 to 99.');
        expect(errorOf(control('recurrence-end-count'))).toBe('Enter a whole number of at least 1, or leave it empty.');
        expect(errorOf(control('timezone'))).toBe('Enter a timezone such as Europe/Brussels.');
        expect(store.updateRules).not.toHaveBeenCalled();
      });

      it('stops the recurrence with Never', async () => {
        await refillWeekly();
        choose('recurrence-unit', '');
        await vi.waitFor(() => expect(store.updateRules).toHaveBeenCalledWith('t1', { 'recurrence-unit': null }));
      });
    });

    describe('danger zone', () => {
      const cancel = () => document.querySelector('.editor-panel__danger button[data-action="cancel-task"]');

      it('holds Cancel task and Delete task, and Cancel task posts cancel', async () => {
        expect([...document.querySelectorAll('.editor-panel__danger button')].map((button) => button.textContent)).toEqual(['Cancel task', 'Delete task']);
        expect(document.querySelector('[data-section="danger"] .editor-panel__section-title').textContent).toBe('Danger zone');
        expect(await clickAndCollect(cancel())).toEqual([['t1', 'cancel']]);
      });

      it('reads Uncancel on a cancelled task, which posts reopen', async () => {
        await refill({ status: 'cancelled' });
        expect(cancel().textContent).toBe('Uncancel');
        expect(cancel().disabled).toBe(false);
        expect(await clickAndCollect(cancel())).toEqual([['t1', 'reopen']]);
      });

      it('disables Cancel task on a finished task, with its tooltip', async () => {
        await refill({ status: 'completed' });
        expect([cancel().disabled, cancel().title]).toEqual([true, 'A finished task cannot be cancelled.']);
      });
    });

    describe('history', () => {
      const EVENTS = [
        { id: 'e2', 'task-id': 't1', occurrence: 1, 'creation-time': '2026-11-04T10:00:00.000Z', 'owner-id': null, type: 'complete', details: null },
        { id: 'e1', 'task-id': 't1', occurrence: 1, 'creation-time': '2026-11-04T09:00:00.000Z', 'owner-id': null, type: 'create', details: null },
      ];
      const OCCURRENCES = [{ 'task-id': 't1', ...TASK['current-occurrence'], progress: 1, status: 'completed' }];
      const entries = (kind) => [...document.querySelectorAll(`[data-section="history"] [data-history="${kind}"] li`)].map((item) => item.textContent);

      it('lists the events and occurrences of the local stores in local mode, newest first', async () => {
        store.eventsOfTask = vi.fn(async () => [...EVENTS].reverse());
        store.occurrencesOfTask = vi.fn(async () => OCCURRENCES);
        document.querySelector('[data-section="history"] button[data-action="history"]').click();
        await vi.waitFor(() => expect(entries('events')).toHaveLength(2));
        expect(entries('events')[0]).toContain('Ticked');
        expect(entries('events')[1]).toContain('Created');
        expect(entries('occurrences')[0]).toContain('#1');
        expect(entries('occurrences')[0]).toContain('Completed');
      });
    });
  });

  it('shows a field error for a year with fewer than four digits and saves nothing', async () => {
    const date = document.querySelector('input[name="due-date"]');
    typeAndLeave(date, '0202-05-11');
    await vi.waitFor(() => expect(errorOf(date)).toBe('Enter a four-digit year.'));
    expect(store.updateRules).not.toHaveBeenCalled();
  });

  it('announces a field error through a live region', async () => {
    typeAndLeave(document.querySelector('textarea[name="description"]'), '');
    await vi.waitFor(() => expect(document.querySelector('[data-live-region="polite"]')?.textContent).toBe('Enter a description.'));
  });

  it('fills a focused field that was left unchanged with the newest stored value', async () => {
    const description = document.querySelector('textarea[name="description"]');
    description.focus();
    store.getTask.mockImplementation(async () => ({ ...TASK, description: 'Buy paint, changed in another tab' }));
    store.listeners.forEach((listener) => listener({ operation: 'updateTask', remote: true }));
    await vi.waitFor(() => expect(store.listsOfTask).toHaveBeenCalledTimes(2));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(description.value).toBe('Buy paint');
    description.blur();
    expect(description.value).toBe('Buy paint, changed in another tab');
  });

  it('cancels only the note edit on Escape in its field', async () => {
    store.notesOfTask.mockImplementation(async () => [{
      id: 'n1', 'task-id': 't1', text: 'Two coats', 'owner-id': null, 'creation-time': TASK['creation-time'], 'last-update-time': TASK['creation-time'],
    }]);
    store.listeners.forEach((listener) => listener({ operation: 'addNote', remote: true }));
    await vi.waitFor(() => expect(document.querySelector('.note')).not.toBeNull());
    document.querySelector('.note [data-role="more"]').click();
    document.querySelector('.note [data-role="menu-edit"]').click();
    const edit = document.querySelector('textarea[name="edit-note"]');
    expect(document.activeElement).toBe(edit);
    edit.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    expect(document.querySelector('textarea[name="edit-note"]')).toBeNull();
    expect(close).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(document.querySelector('.note [data-role="more"]'));
  });

  describe('note links', () => {
    const OCC1 = {
      occurrence: 1, 'start-time': '2026-11-04T00:00:00.000Z', 'due-time': '2026-11-05T00:00:00.000Z', 'goal-target': 1,
      progress: 1, status: 'completed', 'close-time': '2026-11-05T00:00:00.000Z',
    };
    const OCC2 = { ...OCC1, occurrence: 2, 'start-time': '2026-11-05T00:00:00.000Z', 'due-time': '2026-11-06T00:00:00.000Z', progress: 0, status: 'ready', 'close-time': null };
    const DAILY = {
      ...TASK, 'lifecycle-rules': { ...TASK['lifecycle-rules'], 'recurrence-unit': 'day', 'recurrence-interval': 1, timezone: 'UTC', 'due-time': null, 'overdue-handling': null },
      'current-occurrence': OCC2,
    };
    const note = (id, occurrence, time) => ({ id, 'task-id': 't1', text: `Note ${id}`, 'owner-id': null, occurrence, 'creation-time': time, 'last-update-time': time });
    const NOTES = [
      note('n4', null, '2026-11-05T12:00:00.000Z'), note('n3', 1, '2026-11-05T11:00:00.000Z'),
      note('n2', 2, '2026-11-05T10:00:00.000Z'), note('n1', null, '2026-11-04T10:00:00.000Z'), note('n0', 1, '2026-11-04T09:00:00.000Z'),
    ];

    /**
     * Show the daily task with its notes and occurrences in the editor.
     * @returns {Promise<void>} resolves once the notes show
     */
    async function showDaily() {
      store.getTask.mockImplementation(async () => ({ ...DAILY }));
      store.occurrencesOfTask.mockImplementation(async () => [{ 'task-id': 't1', ...OCC1 }, { 'task-id': 't1', ...OCC2 }]);
      store.notesOfTask.mockImplementation(async () => NOTES);
      store.listeners.forEach((listener) => listener({ operation: 'addNote', remote: true }));
      await vi.waitFor(() => expect(document.querySelectorAll('.note')).toHaveLength(5));
    }

    it('lists the global notes, then the current occurrence, then earlier ones, each linked note marked with its occurrence', async () => {
      await showDaily();
      const shown = [...document.querySelectorAll('.note')];
      expect(shown.map((item) => item.dataset.noteId)).toEqual(['n4', 'n1', 'n2', 'n3', 'n0']);
      expect(shown[0].querySelector('.note__occurrence')).toBeNull();
      expect(shown[2].querySelector('.note__occurrence').textContent).toContain('#2');
      expect(shown[3].querySelector('.note__occurrence').textContent).toContain('#1');
    });

    it('keeps own notes of earlier occurrences editable and deletable', async () => {
      await showDaily();
      document.querySelector('[data-note-id="n3"] [data-role="more"]').click();
      document.querySelector('[data-note-id="n3"] [data-role="menu-edit"]').click();
      change(document.querySelector('[data-note-id="n3"] select[name="note-link"]'), '');
      document.querySelector('[data-note-id="n3"] [data-role="save"]').click();
      await vi.waitFor(() => expect(store.editNote).toHaveBeenCalledWith('n3', { text: 'Note n3', occurrence: null }));
      expect(document.querySelector('[data-note-id="n0"] [data-role="more"]')).not.toBeNull();
    });

    it('offers every occurrence up to the current one, even when the store holds only the current one', async () => {
      const third = { ...OCC2, occurrence: 3 };
      store.getTask.mockImplementation(async () => ({ ...DAILY, 'current-occurrence': third }));
      store.occurrencesOfTask.mockImplementation(async () => [{ 'task-id': 't1', ...third }]);
      store.notesOfTask.mockImplementation(async () => NOTES);
      store.listeners.forEach((listener) => listener({ operation: 'rollOverTask', remote: true }));
      await vi.waitFor(() => expect(document.querySelectorAll('.note')).toHaveLength(5));
      document.querySelector('[data-note-id="n4"] [data-role="more"]').click();
      document.querySelector('[data-note-id="n4"] [data-role="menu-edit"]').click();
      const link = document.querySelector('[data-note-id="n4"] select[name="note-link"]');
      expect([...link.options].map((option) => option.textContent.split(' · ')[0])).toEqual(['Whole task', '#3', '#2', '#1']);
    });

    it('shows note changes in an open history without a refresh', async () => {
      await showDaily();
      store.eventsOfTask = vi.fn(async () => []);
      document.querySelector('[data-section="history"] button[data-action="history"]').click();
      const notesOf = (number) => [...document.querySelectorAll(`[data-history="occurrences"] [data-occurrence="${number}"] .task-history__note`)]
        .map((item) => item.textContent);
      await vi.waitFor(() => expect(notesOf(1)).toHaveLength(2));
      store.notesOfTask.mockImplementation(async () => [note('n5', 1, '2026-11-05T13:00:00.000Z'), ...NOTES]);
      store.listeners.forEach((listener) => listener({ operation: 'addNote', remote: true }));
      await vi.waitFor(() => expect(notesOf(1)).toHaveLength(3));
      expect(notesOf(1)[0]).toContain('Note n5');
      expect(store.eventsOfTask).toHaveBeenCalledTimes(1);
    });

    it('offers Whole task and each occurrence, newest first, in the note edit form, and saves the chosen link', async () => {
      await showDaily();
      document.querySelector('[data-note-id="n2"] [data-role="more"]').click();
      document.querySelector('[data-note-id="n2"] [data-role="menu-edit"]').click();
      const link = document.querySelector('[data-note-id="n2"] select[name="note-link"]');
      expect([...link.options].map((option) => option.textContent.split(' · ')[0])).toEqual(['Whole task', '#2', '#1']);
      expect(link.selectedOptions[0].textContent).toContain('#2');
      expect(link.labels[0].textContent).toBe('Belongs to');
      change(link, '');
      document.querySelector('[data-note-id="n2"] [data-role="save"]').click();
      await vi.waitFor(() => expect(store.editNote).toHaveBeenCalledWith('n2', { text: 'Note n2', occurrence: null }));
    });

    it('offers the link choice on a one-off task too', async () => {
      store.notesOfTask.mockImplementation(async () => [note('n1', null, TASK['creation-time'])]);
      store.listeners.forEach((listener) => listener({ operation: 'addNote', remote: true }));
      await vi.waitFor(() => expect(document.querySelector('.note')).not.toBeNull());
      document.querySelector('.note [data-role="more"]').click();
      document.querySelector('.note [data-role="menu-edit"]').click();
      const link = document.querySelector('.note select[name="note-link"]');
      expect([...link.options].map((option) => option.textContent.split(' · ')[0])).toEqual(['Whole task', '#1']);
      expect(link.value).toBe('');
      change(link, '1');
      document.querySelector('.note [data-role="save"]').click();
      await vi.waitFor(() => expect(store.editNote).toHaveBeenCalledWith('n1', { text: 'Note n1', occurrence: 1 }));
    });

    it('lists the notes of each occurrence under it in the history, newest first', async () => {
      await showDaily();
      store.eventsOfTask = vi.fn(async () => []);
      document.querySelector('[data-section="history"] button[data-action="history"]').click();
      const notesOf = (number) => [...document.querySelectorAll(`[data-history="occurrences"] [data-occurrence="${number}"] .task-history__note`)]
        .map((item) => item.textContent);
      await vi.waitFor(() => expect(notesOf(1)).toHaveLength(2));
      expect(notesOf(1)[0]).toContain('Note n3');
      expect(notesOf(1)[1]).toContain('Note n0');
      expect(notesOf(2)).toHaveLength(1);
      expect(notesOf(2)[0]).toContain('Note n2');
      expect(document.querySelector('[data-history="occurrences"]').textContent).not.toContain('Note n4');
    });
  });

  it('styles Delete task and the note Delete controls as danger', async () => {
    const remove = [...document.querySelectorAll('.editor-panel__danger button')].find((button) => button.textContent === 'Delete task');
    expect(remove.classList.contains('button--danger')).toBe(true);
    expect(remove.classList.contains('button--secondary')).toBe(false);
    store.notesOfTask.mockImplementation(async () => [{
      id: 'n1', 'task-id': 't1', text: 'Two coats', 'owner-id': null, 'creation-time': TASK['creation-time'], 'last-update-time': TASK['creation-time'],
    }]);
    store.listeners.forEach((listener) => listener({ operation: 'addNote', remote: true }));
    await vi.waitFor(() => expect(document.querySelector('.note')).not.toBeNull());
    document.querySelector('.note [data-role="more"]').click();
    expect(document.querySelector('.note [data-role="menu-delete"]').classList.contains('menu__item--danger')).toBe(true);
    expect(document.querySelector('.note [data-role="menu-edit"]').classList.contains('menu__item--danger')).toBe(false);
    document.querySelector('.note [data-role="menu-delete"]').click();
    expect(document.querySelector('.inline-confirm [data-role="delete"]').classList.contains('button--danger')).toBe(true);
    expect(document.querySelector('.inline-confirm [data-role="keep"]').classList.contains('button--danger')).toBe(false);
  });

  it('keeps a typed note draft when the editor closes, and shows it again on reopening', async () => {
    const note = document.querySelector('textarea[name="new-note"]');
    note.value = 'Ask about the primer';
    note.dispatchEvent(new Event('input', { bubbles: true }));
    note.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    expect(close).toHaveBeenCalledTimes(1);
    panel.update({ name: 'tasks', view: 'tasks', editor: null, params: {} });
    panel.update({ name: 'task', view: 'tasks', editor: 'task', params: { taskId: 't1' } });
    await editor.idle();
    const reopened = document.querySelector('textarea[name="new-note"]');
    expect(reopened.value).toBe('Ask about the primer');
    // The draft also searches the notes, so clear it for the later tests of this task.
    reopened.value = '';
    reopened.dispatchEvent(new Event('input', { bubbles: true }));
  });

  it('neither fills nor closes the panel when a read finishes after the editor was destroyed', async () => {
    let finish;
    store.getTask.mockImplementation(() => new Promise((resolve) => {
      finish = resolve;
    }));
    store.listeners.forEach((listener) => listener({ operation: 'deleteTask', remote: true }));
    await vi.waitFor(() => expect(finish).toBeTypeOf('function'));
    panel.update({ name: 'tasks', view: 'tasks', editor: null, params: {} });
    finish(undefined);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(close).not.toHaveBeenCalled();
    expect(toaster.show).not.toHaveBeenCalled();
  });

  it('saves a typed due date and description when the editor closes before focus leaves them', async () => {
    const date = document.querySelector('input[name="due-date"]');
    document.querySelector('textarea[name="description"]').value = 'Buy blue paint';
    date.focus();
    date.value = '2026-11-08';
    panel.update({ name: 'tasks', view: 'tasks', editor: null, params: {} });
    await vi.waitFor(() => expect(store.updateRules).toHaveBeenCalledWith('t1', { 'due-time': '2026-11-08' }));
    expect(store.updateTask).toHaveBeenCalledWith('t1', { description: 'Buy blue paint' });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(store.updateTask).toHaveBeenCalledTimes(1);
    expect(store.updateRules).toHaveBeenCalledTimes(1);
  });

  it('saves an edited description once when Escape closes the editor after its change saved it', async () => {
    const description = document.querySelector('textarea[name="description"]');
    // Escape blurs the field first, whose change event saves it, then the panel closes.
    change(description, 'Buy blue paint');
    panel.update({ name: 'tasks', view: 'tasks', editor: null, params: {} });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(store.updateTask).toHaveBeenCalledTimes(1);
  });

  it('saves a field fixed after an error when the editor closes without a change event', async () => {
    const description = document.querySelector('textarea[name="description"]');
    change(description, '');
    expect(errorOf(description)).toBe('Enter a description.');
    description.value = 'Buy blue paint';
    panel.update({ name: 'tasks', view: 'tasks', editor: null, params: {} });
    await vi.waitFor(() => expect(store.updateTask).toHaveBeenCalledWith('t1', { description: 'Buy blue paint' }));
  });

  it('shows a field error for an empty note and adds nothing (NOT-1)', () => {
    const note = document.querySelector('textarea[name="new-note"]');
    note.value = '  ';
    document.querySelector('.note-thread__actions button').click();
    expect(errorOf(note)).toBe('Enter a note.');
    expect(store.addNote).not.toHaveBeenCalled();
  });

  describe('tabs', () => {
    /** @returns {HTMLElement[]} the tabs, in order */
    const tabs = () => [...document.querySelectorAll('.task-editor__tabs [role="tablist"] > [role="tab"]')];
    /**
     * Find a tab by its name.
     * @param {string} name the tab name
     * @returns {HTMLElement} the tab
     */
    const tab = (name) => tabs().find((item) => item.textContent === name);
    /**
     * Find the panel of a tab.
     * @param {string} name the tab name
     * @returns {HTMLElement} the panel
     */
    const panelOf = (name) => document.getElementById(tab(name).getAttribute('aria-controls'));
    /** @returns {string} the name of the selected tab */
    const selected = () => tabs().find((item) => item.getAttribute('aria-selected') === 'true').textContent;
    /**
     * Name the parts of a panel in order: its sections and its rules.
     * @param {string} name the tab name
     * @returns {string[]} the parts
     */
    const parts = (name) => [...panelOf(name).querySelectorAll('[data-section], hr')]
      .map((part) => part.dataset.section ?? 'rule');
    /**
     * Press a key on a control.
     * @param {HTMLElement} control the control
     * @param {string} key the key
     */
    const press = (control, key) => control.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));

    it('shows Status, Notes, Configuration, and History tabs under the header, each linked to its panel, opening on Status (TSK-18)', () => {
      const list = document.querySelector('.task-editor__tabs [role="tablist"]');
      expect(list.getAttribute('aria-label')).toBe('Task sections');
      expect(tabs().map((item) => item.textContent)).toEqual(['Status', 'Notes', 'Configuration', 'History']);
      for (const item of tabs()) {
        const tabPanel = panelOf(item.textContent);
        expect([tabPanel.getAttribute('role'), tabPanel.getAttribute('aria-labelledby')]).toEqual(['tabpanel', item.id]);
      }
      expect(selected()).toBe('Status');
      expect(tabs().map((item) => item.tabIndex)).toEqual([0, -1, -1, -1]);
      expect(['Status', 'Notes', 'Configuration', 'History'].map((name) => panelOf(name).hidden)).toEqual([false, true, true, true]);
      expect(document.querySelector('.editor-panel__header').nextElementSibling.contains(list)).toBe(true);
      expect(document.querySelector('.editor-panel__header button[aria-label*="More"]')).toBeNull();
      expect(document.querySelector('.task-editor__tabs [role="tablist"] button:not([role="tab"])')).toBeNull();
    });

    it('holds the status on Status, the notes on Notes, and History then Details on History', () => {
      expect(parts('Status')).toEqual(['status', 'rule', 'rule']);
      expect(parts('Notes')).toEqual(['notes']);
      expect(parts('History')).toEqual(['history', 'details']);
    });

    it('holds Description, Lists, Goal, Recurrence, Time window, and the Danger zone on Configuration, with a rule between each', () => {
      expect(parts('Configuration')).toEqual(['description', 'rule', 'lists', 'rule', 'goal', 'rule', 'recurrence', 'rule', 'window', 'rule', 'danger']);
      for (const [name, title] of [['lists', 'Lists'], ['goal', 'Goal'], ['recurrence', 'Recurrence'], ['window', 'Time window'], ['danger', 'Danger zone']]) {
        const heading = panelOf('Configuration').querySelector(`[data-section="${name}"] .editor-panel__section-title`);
        expect([heading.tagName, heading.textContent]).toEqual(['H3', title]);
      }
      expect(panelOf('Configuration').lastElementChild.dataset.section).toBe('danger');
      expect(panelOf('Configuration').querySelector('[data-part="due"] label').textContent).toBe('Due date');
    });

    it('moves between the tabs with the arrow keys, Home, and End, following the WAI-ARIA tabs pattern', () => {
      tab('Status').focus();
      press(tab('Status'), 'ArrowRight');
      expect([selected(), document.activeElement]).toEqual(['Notes', tab('Notes')]);
      expect(panelOf('Notes').hidden).toBe(false);
      expect(panelOf('Status').hidden).toBe(true);
      press(tab('Notes'), 'End');
      expect([selected(), document.activeElement]).toEqual(['History', tab('History')]);
      press(tab('History'), 'ArrowRight');
      expect(selected()).toBe('Status');
      press(tab('Status'), 'ArrowLeft');
      expect(selected()).toBe('History');
      press(tab('History'), 'Home');
      expect([selected(), document.activeElement]).toEqual(['Status', tab('Status')]);
      expect(tabs().map((item) => item.tabIndex)).toEqual([0, -1, -1, -1]);
    });

    it('opens on Status again for each task, focusing the selected tab', async () => {
      tab('Configuration').click();
      expect(selected()).toBe('Configuration');
      panel.update({ name: 'task', view: 'tasks', editor: 'task', params: { taskId: 't2' } });
      await editor.idle();
      expect(selected()).toBe('Status');
      expect(document.activeElement).toBe(tab('Status'));
      tab('History').click();
      panel.update({ name: 'tasks', view: 'tasks', editor: null, params: {} });
      panel.update({ name: 'task', view: 'tasks', editor: 'task', params: { taskId: 't1' } });
      await editor.idle();
      expect(selected()).toBe('Status');
    });

    it('selects the hidden tab of a field error and focuses that field', async () => {
      let reject;
      store.updateRules.mockImplementation(() => new Promise((_, fail) => {
        reject = fail;
      }));
      tab('Configuration').click();
      const radio = document.querySelector('input[name^="goal-mode"][value="at-least"]');
      radio.checked = true;
      radio.dispatchEvent(new Event('change', { bubbles: true }));
      const target = document.querySelector('input[name="goal-target"]');
      change(target, '5');
      await vi.waitFor(() => expect(reject).toBeTypeOf('function'));
      tab('Status').click();
      reject(Object.assign(new Error('The target is too high.'), { name: 'ValidationError' }));
      await vi.waitFor(() => expect(selected()).toBe('Configuration'));
      expect(document.activeElement).toBe(target);
      expect(errorOf(target)).toBe('The target is too high.');
    });

    it('loads the history once its tab first shows', async () => {
      store.eventsOfTask = vi.fn(async () => []);
      expect(store.eventsOfTask).not.toHaveBeenCalled();
      tab('History').click();
      await vi.waitFor(() => expect(store.eventsOfTask).toHaveBeenCalledTimes(1));
      await vi.waitFor(() => expect(document.querySelector('[data-section="history"] button[data-action="history"]').textContent).toBe('Refresh history'));
      tab('Status').click();
      tab('History').click();
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(store.eventsOfTask).toHaveBeenCalledTimes(1);
    });

    it('closes on Escape from any tab', () => {
      for (const name of ['Status', 'History']) {
        tab(name).click();
        tab(name).focus();
        press(tab(name), 'Escape');
      }
      expect(close).toHaveBeenCalledTimes(2);
    });

    it('deletes from the Danger zone of Configuration, closing with the Undo toast, and hides the zone with its rule on a deleted task', async () => {
      const zone = panelOf('Configuration').querySelector('[data-section="danger"]');
      const rule = zone.previousElementSibling;
      const remove = () => [...zone.querySelectorAll('button')].find((button) => button.textContent === 'Delete task');
      expect([rule.tagName, zone.hidden, rule.hidden]).toEqual(['HR', false, false]);
      expect(panelOf('Configuration').lastElementChild).toBe(zone);
      store.getTask.mockImplementation(async () => ({ ...TASK, 'deletion-time': '2026-11-05T09:00:00.000Z' }));
      store.listeners.forEach((listener) => listener({ operation: 'deleteTask', remote: true }));
      await vi.waitFor(() => expect(zone.hidden).toBe(true));
      expect(rule.hidden).toBe(true);
      store.getTask.mockImplementation(async () => ({ ...TASK }));
      store.listeners.forEach((listener) => listener({ operation: 'restoreTask', remote: true }));
      await vi.waitFor(() => expect(zone.hidden).toBe(false));
      store.deleteTask = vi.fn(async () => {});
      tab('Configuration').click();
      remove().click();
      await vi.waitFor(() => expect(close).toHaveBeenCalledTimes(1));
      expect(toaster.show).toHaveBeenCalledWith('Task moved to the recycle bin.', expect.objectContaining({ undo: true }));
    });

    it('filters the note thread to the notes matching the add field', async () => {
      const note = (id, text) => ({ id, 'task-id': 't1', text, 'owner-id': null, occurrence: null, 'creation-time': TASK['creation-time'], 'last-update-time': TASK['creation-time'] });
      store.notesOfTask.mockImplementation(async () => [note('n2', 'Get the matte white'), note('n1', 'Two coats of PAINT')]);
      store.listeners.forEach((listener) => listener({ operation: 'addNote', remote: true }));
      await vi.waitFor(() => expect(document.querySelectorAll('.note')).toHaveLength(2));
      const field = document.querySelector('textarea[name="new-note"]');
      expect(field.placeholder).toBe('Add or search notes');
      const type = (value) => {
        field.value = value;
        field.dispatchEvent(new Event('input', { bubbles: true }));
      };
      const shown = () => [...document.querySelectorAll('.note')].map((item) => item.dataset.noteId);
      const empty = () => document.querySelector('.note-thread__empty');
      type('paint');
      expect(shown()).toEqual(['n1']);
      expect(empty().hidden).toBe(true);
      type('gloss');
      expect(shown()).toEqual([]);
      expect([empty().hidden, empty().textContent]).toEqual([false, 'No notes match.']);
      type('');
      expect(shown()).toEqual(['n2', 'n1']);
      expect(empty().hidden).toBe(true);
      // A store change keeps the filter of the typed text.
      type(' MATTE ');
      store.listeners.forEach((listener) => listener({ operation: 'addNote', remote: true }));
      await vi.waitFor(() => expect(store.notesOfTask.mock.calls.length).toBeGreaterThan(2));
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(shown()).toEqual(['n2']);
      type('');
    });
  });
});

describe('mountTaskEditor history while connected', () => {
  let panel;
  let editor;

  afterEach(() => {
    panel.destroy();
  });

  it('reads the events and occurrences from the server routes', async () => {
    resetBody('<div data-editor-slot hidden></div>');
    const store = fakeStore();
    store.eventsOfTask = vi.fn(async () => []);
    store.occurrencesOfTask = vi.fn(async () => []);
    const api = {
      send: vi.fn(async (method, path) => ({
        status: 200, ok: true, headers: { get: () => null },
        body: path.endsWith('/events')
          ? [{ id: 'e1', 'task-id': 't1', occurrence: 2, 'creation-time': '2026-11-09T00:00:00.000Z', 'owner-id': null, type: 'roll-over', details: null }]
          : [{ 'task-id': 't1', occurrence: 2, 'start-time': '2026-11-08T23:00:00.000Z', 'due-time': '2026-11-15T23:00:00.000Z', 'goal-target': 3,
            progress: 0, status: 'ready', 'close-time': null }],
      })),
    };
    const session = { state: () => 'connected' };
    panel = createEditorPanel({
      slot: document.querySelector('[data-editor-slot]'), close: vi.fn(),
      editors: { task: (view, route) => {
        editor = mountTaskEditor(view, route, { store, toaster: { show: vi.fn() }, api, session });
        return editor;
      } },
    });
    panel.update({ name: 'task', view: 'tasks', editor: 'task', params: { taskId: 't1' } });
    await editor.idle();
    document.querySelector('[data-section="history"] button[data-action="history"]').click();
    const entries = (kind) => [...document.querySelectorAll(`[data-history="${kind}"] li`)].map((item) => item.textContent);
    await vi.waitFor(() => expect(entries('events')).toHaveLength(1));
    const calls = api.send.mock.calls.map(([method, path]) => [method, path]);
    expect(calls).toContainEqual(['GET', '/api/tasks/t1/events']);
    expect(calls).toContainEqual(['GET', '/api/tasks/t1/occurrences']);
    expect(entries('events')[0]).toContain('Period ended');
    expect(entries('occurrences')[0]).toContain('#2');
    expect(entries('occurrences')[0]).toContain('0 of 3 done');
  });

  it('shows Starts as text once the server holds a user event of the first period, and as a field before', async () => {
    resetBody('<div data-editor-slot hidden></div>');
    const store = fakeStore();
    store.eventsOfTask = vi.fn(async () => []);
    let events = [{ id: 'e0', 'task-id': 't1', occurrence: 1, 'creation-time': '2026-11-04T09:00:00.000Z', type: 'create' }];
    const api = { send: vi.fn(async () => ({ status: 200, ok: true, headers: { get: () => null }, body: events })) };
    panel = createEditorPanel({
      slot: document.querySelector('[data-editor-slot]'), close: vi.fn(),
      editors: { task: (view, route) => {
        editor = mountTaskEditor(view, route, { store, toaster: { show: vi.fn() }, api, session: { state: () => 'connected' } });
        return editor;
      } },
    });
    panel.update({ name: 'task', view: 'tasks', editor: 'task', params: { taskId: 't1' } });
    await editor.idle();
    const text = () => document.querySelector('[data-part="start-text"]');
    expect(text().hidden).toBe(true);
    events = [...events, { id: 'e1', 'task-id': 't1', occurrence: 1, 'creation-time': '2026-11-05T09:00:00.000Z', type: 'start' }];
    const reads = api.send.mock.calls.length;
    store.listeners.forEach((listener) => listener({ operation: 'postEvent', remote: true }));
    await vi.waitFor(() => expect(api.send.mock.calls.length).toBeGreaterThan(reads));
    await vi.waitFor(() => expect(text().hidden).toBe(false));
    expect(document.querySelector('input[name="start-time"]').closest('[data-part]').hidden).toBe(true);
  });

  it('adds a locally queued user event to an empty server history, so Starts reads as text', async () => {
    resetBody('<div data-editor-slot hidden></div>');
    const store = fakeStore();
    store.eventsOfTask = vi.fn(async () => [{ id: 'q1', 'task-id': 't1', occurrence: 1, 'creation-time': '2026-11-05T09:00:00.000Z', type: 'start' }]);
    const api = { send: vi.fn(async () => ({ status: 200, ok: true, headers: { get: () => null }, body: [] })) };
    panel = createEditorPanel({
      slot: document.querySelector('[data-editor-slot]'), close: vi.fn(),
      editors: { task: (view, route) => {
        editor = mountTaskEditor(view, route, { store, toaster: { show: vi.fn() }, api, session: { state: () => 'connected' } });
        return editor;
      } },
    });
    panel.update({ name: 'task', view: 'tasks', editor: 'task', params: { taskId: 't1' } });
    await editor.idle();
    expect(api.send).toHaveBeenCalledWith('GET', '/api/tasks/t1/events');
    expect(document.querySelector('[data-part="start-text"]').hidden).toBe(false);
  });

  it('falls back to the local events when the server cannot answer', async () => {
    resetBody('<div data-editor-slot hidden></div>');
    const store = fakeStore();
    store.eventsOfTask = vi.fn(async () => [{ id: 'e1', 'task-id': 't1', occurrence: 1, 'creation-time': '2026-11-05T09:00:00.000Z', type: 'log' }]);
    const api = { send: vi.fn(async () => {
      throw new Error('offline');
    }) };
    panel = createEditorPanel({
      slot: document.querySelector('[data-editor-slot]'), close: vi.fn(),
      editors: { task: (view, route) => {
        editor = mountTaskEditor(view, route, { store, toaster: { show: vi.fn() }, api, session: { state: () => 'connected' } });
        return editor;
      } },
    });
    panel.update({ name: 'task', view: 'tasks', editor: 'task', params: { taskId: 't1' } });
    await editor.idle();
    expect(document.querySelector('[data-part="start-text"]').hidden).toBe(false);
  });
});

describe('mountTaskEditor note links while connected', () => {
  let panel;

  afterEach(() => {
    panel.destroy();
  });

  it('labels the earlier occurrences of the link choice from the server occurrences', async () => {
    resetBody('<div data-editor-slot hidden></div>');
    const store = fakeStore();
    const current = { occurrence: 2, 'start-time': '2026-11-05T00:00:00.000Z', 'due-time': '2026-11-06T00:00:00.000Z', 'goal-target': 1,
      progress: 0, status: 'ready', 'close-time': null };
    const first = { ...current, occurrence: 1, 'start-time': '2026-11-04T00:00:00.000Z', 'due-time': '2026-11-05T00:00:00.000Z', 'close-time': '2026-11-05T00:00:00.000Z' };
    store.getTask.mockImplementation(async () => ({
      ...TASK, 'lifecycle-rules': { ...TASK['lifecycle-rules'], 'recurrence-unit': 'day', 'recurrence-interval': 1, timezone: 'UTC' }, 'current-occurrence': current,
    }));
    store.occurrencesOfTask.mockImplementation(async () => [{ 'task-id': 't1', ...current }]);
    store.notesOfTask.mockImplementation(async () => [{
      id: 'n1', 'task-id': 't1', text: 'Hi', 'owner-id': null, occurrence: 2, 'creation-time': current['start-time'], 'last-update-time': current['start-time'],
    }]);
    const api = { send: vi.fn(async () => ({ status: 200, ok: true, headers: { get: () => null }, body: [{ 'task-id': 't1', ...first }, { 'task-id': 't1', ...current }] })) };
    let editor;
    panel = createEditorPanel({
      slot: document.querySelector('[data-editor-slot]'), close: vi.fn(),
      editors: { task: (view, route) => {
        editor = mountTaskEditor(view, route, { store, toaster: { show: vi.fn() }, api, session: { state: () => 'connected' } });
        return editor;
      } },
    });
    panel.update({ name: 'task', view: 'tasks', editor: 'task', params: { taskId: 't1' } });
    await editor.idle();
    await vi.waitFor(() => expect(document.querySelector('.note')).not.toBeNull());
    expect(api.send).not.toHaveBeenCalled();
    document.querySelector('.note [data-role="more"]').click();
    document.querySelector('.note [data-role="menu-edit"]').click();
    const option = () => [...document.querySelector('.note select[name="note-link"]').options].find((candidate) => candidate.value === '1');
    await vi.waitFor(() => expect(option().textContent).toMatch(/^#1 · /));
    expect(api.send.mock.calls.map(([method, path]) => [method, path])).toEqual([['GET', '/api/tasks/t1/occurrences']]);
  });
});

describe('mountTaskEditor first focus after an add', () => {
  let editor;
  let panel;
  let field;
  let link;

  /**
   * Open the task editor of t1 with the focus on an element, in a compact or wide layout.
   * @param {HTMLElement} focused the element that has focus when the editor opens
   * @param {boolean} compact whether the layout is below 64rem
   */
  async function open(focused, compact) {
    vi.spyOn(window, 'matchMedia').mockImplementation((query) => ({ matches: query === '(width < 64rem)' && compact, media: query }));
    focused.focus();
    panel = createEditorPanel({
      slot: document.querySelector('[data-editor-slot]'), close: vi.fn(),
      editors: { task: (view, route) => {
        editor = mountTaskEditor(view, route, { store: fakeStore(), toaster: { show: vi.fn() } });
        return editor;
      } },
    });
    panel.update({ name: 'task', view: 'tasks', editor: 'task', params: { taskId: 't1' } });
    await editor.idle();
  }

  beforeEach(() => {
    resetBody(`<main><a href="#/tasks/t1">Buy paint</a>
      <input data-shortcut="add search" aria-label="Search or add a task"></main><div data-editor-slot hidden></div>`);
    field = document.querySelector('input');
    link = document.querySelector('a');
  });

  afterEach(() => {
    panel.destroy();
    vi.restoreAllMocks();
  });

  it('leaves the focus in the add field in the wide layout, so the next task can be typed', async () => {
    await open(field, false);
    expect(document.querySelector('textarea[name="description"]').value).toBe('Buy paint');
    expect(document.activeElement).toBe(field);
  });

  it('takes the focus from the add field in the compact layout, where the editor covers it', async () => {
    await open(field, true);
    expect(document.activeElement).toBe(document.querySelector('[role="tab"][aria-selected="true"]'));
  });

  it('takes the focus in the wide layout when opened from anything but the add field, such as a row', async () => {
    await open(link, false);
    expect(document.activeElement).toBe(document.querySelector('[role="tab"][aria-selected="true"]'));
  });
});

describe('mountTaskEditor by role (SHR-4, SHR-5)', () => {
  let editor;
  let panel;

  /**
   * Open the editor of a task of someone else that sits in a list the user holds with a role.
   * @param {string} role the user's role on the list
   * @param {object} [extra] fields of the task
   * @returns {Promise<void>}
   */
  async function open(role, extra = {}) {
    resetBody('<div data-editor-slot hidden></div>');
    const store = fakeStore();
    store.getTask = vi.fn(async () => ({ ...TASK, 'owner-id': 9, ...extra }));
    store.listLists = vi.fn(async () => [
      { id: 'l1', name: 'Home', role, owner: { id: 9, name: 'Sam Roe' } },
      { id: 'l2', name: 'Mine', role: 'owner', owner: { id: 3, name: 'Jane Doe' } },
    ]);
    store.listsOfTask = vi.fn(async () => ['l1']);
    store.queue = { getState: vi.fn(async () => 3) };
    panel = createEditorPanel({
      slot: document.querySelector('[data-editor-slot]'), close: vi.fn(),
      editors: { task: (view, route) => {
        editor = mountTaskEditor(view, route, { store, toaster: { show: vi.fn() } });
        return editor;
      } },
    });
    panel.update({ name: 'task', view: 'tasks', editor: 'task', params: { taskId: 't1' } });
    await editor.idle();
  }

  const banner = () => document.querySelector('.banner[data-banner="read-only"]');
  const deleteButton = () => [...document.querySelectorAll('.editor-panel__danger button')].find((button) => button.textContent === 'Delete task');

  afterEach(() => {
    panel.destroy();
  });

  it('offers Edit and Delete on synced own notes only, and names the authors of other notes (NOT-2, NOT-4)', async () => {
    const note = (id, owner, revision) => ({
      id, 'task-id': 't1', text: id, 'owner-id': owner, occurrence: null, revision,
      'creation-time': TASK['creation-time'], 'last-update-time': TASK['creation-time'],
    });
    resetBody('<div data-editor-slot hidden></div>');
    const store = fakeStore();
    store.listLists = vi.fn(async () => [{ id: 'l1', name: 'Home', role: 'editor', owner: { id: 9, name: 'Sam Roe' } }]);
    store.listsOfTask = vi.fn(async () => ['l1']);
    store.notesOfTask = vi.fn(async () => [note('mine', 3, 5), note('theirs', 9, 6), note('orphan', null, 7), note('draft', null, undefined)]);
    store.queue = { getState: vi.fn(async () => 3) };
    panel = createEditorPanel({
      slot: document.querySelector('[data-editor-slot]'), close: vi.fn(),
      editors: { task: (view, route) => {
        editor = mountTaskEditor(view, route, { store, toaster: { show: vi.fn() } });
        return editor;
      } },
    });
    panel.update({ name: 'task', view: 'tasks', editor: 'task', params: { taskId: 't1' } });
    await editor.idle();
    await vi.waitFor(() => expect(document.querySelectorAll('.note')).toHaveLength(4));
    const shown = [...document.querySelectorAll('.note')].map((item) => [
      item.dataset.noteId, item.querySelector('.note__author').textContent, Boolean(item.querySelector('[data-role="more"]')),
    ]);
    expect(shown).toEqual([['mine', 'You', true], ['theirs', 'Collaborator', false], ['orphan', 'Former member', false], ['draft', 'You', true]]);
  });

  it('builds each list chip from the package skeleton, with a .chip__remove button', async () => {
    await open('editor');
    const button = document.querySelector('.chip--removable > button');
    expect(button.classList.contains('chip__remove')).toBe(true);
    expect(button.classList.contains('icon-button')).toBe(false);
    expect(button.getAttribute('aria-label')).toBe('Remove from Home');
  });

  it('shows a viewer every field read-only under a banner naming the list owner', async () => {
    await open('viewer');
    expect(banner().hidden).toBe(false);
    expect(banner().textContent).toContain('Sam Roe');
    expect(document.querySelector('.task-editor__fields').disabled).toBe(true);
    expect(document.querySelector('[data-section="danger"]').hidden).toBe(true);
    expect(document.querySelector('.note-thread__add').hidden).toBe(true);
  });

  it('shows a viewer the status and progress, without actions, the Log form, or Undo', async () => {
    const counted = shapeTask({ status: 'in-progress', 'goal-target': 3, progress: 1 });
    await open('viewer', { 'lifecycle-rules': counted['lifecycle-rules'], 'current-occurrence': counted['current-occurrence'] });
    const status = document.querySelector('[data-section="status"]');
    expect(status.querySelector('.task-editor__status').textContent).toContain('In progress');
    expect(status.querySelector('[data-part="progress"]').textContent).toContain('1');
    const hidden = (selector) => [...status.querySelectorAll(selector)].every((element) => element.closest('[hidden]') !== null);
    expect(hidden('[data-action], [data-step], form')).toBe(true);
  });

  it('lets a task editor change the task but not delete it', async () => {
    await open('task-editor');
    expect(banner().hidden).toBe(true);
    expect(document.querySelector('.task-editor__fields').disabled).toBe(false);
    expect(document.querySelector('[data-section="danger"]').hidden).toBe(true);
  });

  it('offers only the lists the user may add the task to', async () => {
    await open('task-editor');
    const input = document.querySelector('input[name="add-to-list"]');
    input.value = '';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    expect([...document.querySelectorAll('[role="option"]')].map((item) => item.textContent)).toEqual(['Mine']);
  });

  it('offers the owner of the list Delete task', async () => {
    await open('owner');
    expect(document.querySelector('[data-section="danger"]').hidden).toBe(false);
    expect(deleteButton().textContent).toBe('Delete task');
  });

  it('gives the task owner full control whatever the list role', async () => {
    await open('viewer', { 'owner-id': 3 });
    expect(banner().hidden).toBe(true);
    expect(document.querySelector('.task-editor__fields').disabled).toBe(false);
    expect(document.querySelector('[data-section="danger"]').hidden).toBe(false);
  });
});



describe('mountTaskEditor status tab (TSK-21, TSK-22)', () => {
  const NOW = '2026-11-26T12:00:00.000Z';
  const day = (iso) => new Intl.DateTimeFormat('en', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(iso));
  let panel;
  let store;

  /**
   * Build a task with a goal and a current occurrence of a week that ends at Mon 30 Nov.
   * @param {{direction?: string, measure?: string, target?: number, unit?: string}} goalFields the goal
   * @param {object} [occurrence] the occurrence fields to set
   * @param {object} [rules] the rule fields to set
   * @returns {object} the task
   */
  function goalTask({ direction = 'at-least', measure = 'checks', target = 1, unit = null } = {}, occurrence = {}, rules = {}) {
    const base = shapeTask({ ...TASK, id: 't1', description: 'Eat well' });
    const goal = { 'goal-direction': direction, 'goal-measure': measure, 'goal-target': target, 'goal-unit': unit };
    return {
      ...base,
      'lifecycle-rules': { ...base['lifecycle-rules'], ...goal, 'due-time': '2026-11-30T00:00:00.000Z', ...rules },
      'current-occurrence': {
        occurrence: 1, 'start-time': '2026-11-23T00:00:00.000Z', 'due-time': '2026-11-30T00:00:00.000Z', 'close-time': null, status: 'ready',
        ...goal, progress: 0, 'time-spent-seconds': 0, entries: [], ...occurrence,
      },
    };
  }

  /**
   * Build a `log` event of the task.
   * @param {string} id the event identifier
   * @param {object} fields the entry fields
   * @param {string} time the creation time
   * @param {number} [occurrence] the occurrence
   * @returns {object} the event
   */
  const logged = (id, fields, time, occurrence = 1) => ({ id, 'task-id': 't1', type: 'log', occurrence, 'creation-time': time, ...fields });

  /**
   * Open the editor of a task at a moment.
   * @param {object} task the task
   * @param {{now?: string, events?: object[]}} [options] the moment and the stored events
   * @returns {Promise<void>} resolves once loaded
   */
  async function open(task, { now = NOW, events = [] } = {}) {
    resetBody('<div data-editor-slot hidden></div>');
    store = fakeStore();
    store.getTask = vi.fn(async () => task);
    store.eventsOfTask = vi.fn(async () => events);
    let editor;
    panel = createEditorPanel({
      slot: document.querySelector('[data-editor-slot]'), close: vi.fn(),
      editors: { task: (view, route) => {
        editor = mountTaskEditor(view, route, { store, toaster: { show: vi.fn() }, locale: 'en', now: () => new Date(now) });
        return editor;
      } },
    });
    panel.update({ name: 'task', view: 'tasks', editor: 'task', params: { taskId: 't1' } });
    await editor.idle();
  }

  const q = (selector) => document.querySelector(`[data-section="status"] ${selector}`);
  const action = (name) => q(`button[data-action="${name}"]`);
  const visible = (element) => Boolean(element) && element.closest('[hidden]') === null;
  const field = (name) => q(`[name="${name}"]`);
  const tick = () => new Promise((resolve) => setTimeout(resolve, 0));
  /**
   * Click a control and let the store calls it starts settle.
   * @param {HTMLElement} control the control
   * @returns {Promise<void>} resolves once settled
   */
  async function click(control) {
    control.click();
    await tick();
    await tick();
  }
  /**
   * Type a value into a control of the Log form.
   * @param {string} name the control name
   * @param {string} value the value
   */
  function type(name, value) {
    const control = field(name);
    control.value = value;
    control.dispatchEvent(new Event('input', { bubbles: true }));
    control.dispatchEvent(new Event('change', { bubbles: true }));
  }

  afterEach(() => {
    panel.destroy();
  });

  it('shows the status line, naming a task that is behind pace as not on track', async () => {
    await open(goalTask({ target: 3 }, { status: 'in-progress', progress: 1 }));
    expect(q('.task-editor__status').textContent).toBe('In progress, not on track');
    expect(q('.task-editor__status').dataset.track).toBe('behind-pace');
    await panel.destroy();
    await open(goalTask({ target: 3 }, { status: 'in-progress', progress: 2 }));
    expect(q('.task-editor__status').textContent).toBe('In progress');
  });

  it('names the window under the status line', async () => {
    await open(goalTask({ target: 3 }, {}, { 'recurrence-unit': 'week', 'recurrence-interval': 1, timezone: 'UTC' }));
    expect(q('[data-part="window-line"]').textContent).toContain(day('2026-11-23T00:00:00.000Z'));
    expect(q('[data-part="window-line"]').textContent).toContain(day('2026-11-29T00:00:00.000Z'));
    await panel.destroy();
    await open(goalTask({}, {}));
    expect(q('[data-part="window-line"]').textContent).toBe(`Due ${new Intl.DateTimeFormat('en', { weekday: 'short', day: 'numeric', month: 'short' }).format(new Date('2026-11-30T00:00:00.000Z'))}`);
  });

  it('shows the progress and target in large text, with a meter colored by progress', async () => {
    await open(goalTask({ measure: 'time', target: 12_000 }, { status: 'in-progress', progress: 10_200, 'time-spent-seconds': 10_200 }));
    expect(q('[data-part="progress"]').textContent).toContain('2 h 50 min / 3 h 20 min');
    const meter = q('[data-part="meter"]');
    expect([meter.dataset.color, meter.getAttribute('role'), meter.getAttribute('aria-valuenow'), meter.getAttribute('aria-valuemax')]).toEqual(['yellow', 'meter', '10200', '12000']);
    expect(q('[data-part="progress-box"]').dataset.state).toBe('normal');
  });

  it('turns the progress box orange above an at-most limit, naming the overage and the failure', async () => {
    await open(goalTask({ direction: 'at-most', measure: 'amount', target: 1600, unit: 'kcal' }, { status: 'in-progress', progress: 1720 }));
    expect(q('[data-part="progress"]').textContent).toContain('1,720 / max 1,600 kcal');
    expect(q('[data-part="progress-box"]').dataset.state).toBe('over');
    expect(q('[data-part="next"]').textContent).toContain('120 kcal over the limit');
    expect(q('[data-part="next"]').textContent).toContain('fails if the progress stays above the limit at its end');
    expect(q('.task-editor__status').textContent).toBe('In progress, not on track');
    expect(q('[data-part="meter"]').dataset.color).toBe('orange');
    await panel.destroy();
    await open(goalTask({ direction: 'at-most', measure: 'amount', target: 1600, unit: 'kcal' }, { status: 'in-progress', progress: 1600 }));
    expect(q('[data-part="progress-box"]').dataset.state).toBe('normal');
    expect(q('[data-part="meter"]').dataset.color).toBe('orange');
  });

  it('marks the pace now of a checks goal on its meter, and says when it is behind pace', async () => {
    const weekly = { 'recurrence-unit': 'week', 'recurrence-interval': 1, timezone: 'UTC' };
    await open(goalTask({ target: 3 }, { status: 'in-progress', progress: 1 }, weekly));
    expect(q('[data-part="pace"]').textContent).toBe('pace now: 1.5');
    expect(q('[data-part="next"]').textContent).toContain('Behind pace: half the week is gone, 1 of 3 done.');
  });

  it('makes Check off the main action of a Check goal, logging a check', async () => {
    await open(goalTask({}));
    expect(visible(action('check-off'))).toBe(true);
    expect(visible(q('.task-editor__stepper'))).toBe(false);
    await click(action('check-off'));
    expect(store.logEntry).toHaveBeenCalledWith('t1', { checked: true });
    expect(store.postEvent).not.toHaveBeenCalled();
  });

  it('disables Check off once the task finished or was cancelled', async () => {
    await open(goalTask({}, { status: 'completed', progress: 1, 'close-time': '2026-11-24T00:00:00.000Z' }));
    expect(action('check-off').disabled).toBe(true);
    await panel.destroy();
    await open(goalTask({}, { status: 'cancelled', 'close-time': '2026-11-24T00:00:00.000Z' }));
    expect(action('check-off').disabled).toBe(true);
  });

  it('shows the stepper of a checks goal above 1, centered, logging a check with plus and undoing the latest with minus', async () => {
    const events = [logged('c1', { checked: true }, '2026-11-24T09:00:00.000Z'), logged('c2', { checked: true }, '2026-11-25T09:00:00.000Z')];
    await open(goalTask({ target: 3 }, { status: 'in-progress', progress: 2, entries: ['c1', 'c2'] }), { events });
    const stepper = q('.task-editor__stepper');
    expect(visible(stepper)).toBe(true);
    expect(visible(action('check-off'))).toBe(false);
    const count = stepper.querySelector('.task-editor__count');
    expect([count.textContent, count.getAttribute('aria-live')]).toEqual(['2 of 3', 'polite']);
    await click(stepper.querySelector('button[data-step="up"]'));
    expect(store.logEntry).toHaveBeenCalledWith('t1', { checked: true });
    await click(stepper.querySelector('button[data-step="down"]'));
    expect(store.undoLog).toHaveBeenCalledWith('t1', 'c2');
  });

  it('disables minus without a live check, and both steps on a cancelled task', async () => {
    await open(goalTask({ target: 3 }, { status: 'in-progress', progress: 0 }));
    const step = (direction) => q(`.task-editor__stepper button[data-step="${direction}"]`);
    expect([step('down').disabled, step('up').disabled]).toEqual([true, false]);
    await panel.destroy();
    await open(goalTask({ target: 3 }, { status: 'cancelled', progress: 1, 'close-time': '2026-11-24T00:00:00.000Z', entries: ['c1'] }),
      { events: [logged('c1', { checked: true }, '2026-11-24T09:00:00.000Z')] });
    expect([step('down').disabled, step('up').disabled]).toEqual([true, true]);
  });

  it('offers Mark started while To do, posting start, then Unmark started while nothing was logged', async () => {
    await open(goalTask({ target: 3 }));
    expect(action('mark-started').textContent).toBe('Mark started');
    await click(action('mark-started'));
    expect(store.postEvent).toHaveBeenCalledWith('t1', 'start');
    await panel.destroy();
    await open(goalTask({ target: 3 }, { status: 'in-progress', progress: 0 }));
    expect(action('mark-started').textContent).toBe('Unmark started');
    store.postEvent.mockClear();
    await click(action('mark-started'));
    expect(store.postEvent).toHaveBeenCalledWith('t1', 'unstart');
  });

  it('hides Unmark started once an entry or a carried reading counts as progress', async () => {
    await open(goalTask({ target: 3 }, { status: 'in-progress', progress: 1, entries: ['c1'] }), { events: [logged('c1', { checked: true }, '2026-11-24T09:00:00.000Z')] });
    expect(visible(action('mark-started'))).toBe(false);
    await panel.destroy();
    await open(goalTask({ direction: 'at-most', measure: 'reading', target: 80, unit: 'kg' }, { status: 'in-progress', progress: 79.8 }));
    expect(visible(action('mark-started'))).toBe(false);
  });

  it('offers Reopen on an at-least one-off task that failed, and never on a failed at-most task', async () => {
    const failed = { status: 'failed', 'close-time': '2026-11-30T00:00:00.000Z' };
    await open(goalTask({ target: 3 }, { ...failed, progress: 1 }), { now: '2026-12-01T12:00:00.000Z' });
    expect(q('.task-editor__status').textContent).toBe('Failed');
    await click(action('reopen'));
    expect(store.postEvent).toHaveBeenCalledWith('t1', 'reopen');
    await panel.destroy();
    await open(goalTask({ direction: 'at-most', measure: 'amount', target: 1600, unit: 'kcal' }, { ...failed, progress: 1910 }), { now: '2026-12-01T12:00:00.000Z' });
    expect(visible(action('reopen'))).toBe(false);
    await panel.destroy();
    await open(goalTask({}, { status: 'in-progress' }));
    expect(visible(action('reopen'))).toBe(false);
  });

  it('offers Reopen on a closed recurring series, which opens a fresh period', async () => {
    const rules = { 'recurrence-unit': 'day', 'recurrence-interval': 1, 'recurrence-end-count': 1, timezone: 'UTC' };
    await open(goalTask({}, { status: 'completed', progress: 1, 'close-time': '2026-11-24T00:00:00.000Z', 'start-time': '2026-11-23T00:00:00.000Z', 'due-time': '2026-11-24T00:00:00.000Z' }, rules));
    expect(action('check-off').disabled).toBe(true);
    await click(action('reopen'));
    expect(store.postEvent).toHaveBeenCalledWith('t1', 'reopen');
  });

  it('checks off the previous period within 24 hours after it ended, naming its last day', async () => {
    const daily = { 'recurrence-unit': 'day', 'recurrence-interval': 1, timezone: 'UTC', 'due-time': null, 'overdue-handling': null };
    const second = { occurrence: 2, 'start-time': '2026-11-05T00:00:00.000Z', 'due-time': '2026-11-06T00:00:00.000Z' };
    await open(goalTask({}, second, daily), { now: '2026-11-05T10:00:00.000Z' });
    expect(action('previous-period').textContent).toBe(`Check off previous period (${day('2026-11-04T12:00:00.000Z')})`);
    await click(action('previous-period'));
    expect(store.logEntry).toHaveBeenCalledWith('t1', { checked: true }, { occurrence: 1 });
    await panel.destroy();
    await open(goalTask({}, second, daily), { now: '2026-11-07T10:00:00.000Z' });
    expect(visible(action('previous-period'))).toBe(false);
  });

  it('disables the previous period button on a cancelled task, and posts nothing', async () => {
    const daily = { 'recurrence-unit': 'day', 'recurrence-interval': 1, timezone: 'UTC', 'due-time': null, 'overdue-handling': null };
    const cancelled = { occurrence: 2, 'start-time': '2026-11-05T00:00:00.000Z', 'due-time': '2026-11-06T00:00:00.000Z', status: 'cancelled', 'close-time': '2026-11-05T05:00:00.000Z' };
    await open(goalTask({}, cancelled, daily), { now: '2026-11-05T10:00:00.000Z' });
    expect(action('previous-period').disabled).toBe(true);
    await click(action('previous-period'));
    expect(store.logEntry).not.toHaveBeenCalled();
  });

  it('hides the previous period button on a one-off task', async () => {
    await open(goalTask({}));
    expect(visible(action('previous-period'))).toBe(false);
  });

  it('shows the status, with Uncancel in Configuration, on a cancelled task whose time and amounts still log', async () => {
    await open(goalTask({ measure: 'amount', target: 100, unit: 'g' }, { status: 'cancelled', 'close-time': '2026-11-24T00:00:00.000Z' }));
    expect(q('.task-editor__status').textContent).toBe('Cancelled');
    expect(q('[data-part="uncancel-hint"]').textContent).toBe('Uncancel in Configuration.');
    expect(field('log-amount').disabled).toBe(false);
    expect(action('log').disabled).toBe(false);
  });

  describe('Log form', () => {
    it('shows the goal\'s own field first, then Label, and Log, with the other fields behind buttons', async () => {
      await open(goalTask({ direction: 'at-most', measure: 'amount', target: 1600, unit: 'kcal' }));
      const form = q('form[data-part="log-form"]');
      expect(form.querySelector('label[for="' + field('log-amount').id + '"]').textContent).toContain('kcal');
      expect(field('log-label')).not.toBeNull();
      expect(visible(field('log-hours'))).toBe(false);
      expect(visible(field('log-checked'))).toBe(false);
      expect(['add-time', 'add-check'].every((name) => visible(action(name)))).toBe(true);
      expect(visible(action('add-amount'))).toBe(false);
      await click(action('add-time'));
      expect(visible(field('log-hours'))).toBe(true);
      expect(visible(action('add-time'))).toBe(false);
    });

    it('logs an amount with its label, then clears the form', async () => {
      await open(goalTask({ direction: 'at-most', measure: 'amount', target: 1600, unit: 'kcal' }));
      type('log-amount', '320');
      type('log-label', ' Croissant ');
      await click(action('log'));
      expect(store.logEntry).toHaveBeenCalledWith('t1', { amount: 320, label: 'Croissant' });
      expect([field('log-amount').value, field('log-label').value]).toEqual(['', '']);
    });

    it('logs hours and minutes as seconds for a time goal, and a mix with a check', async () => {
      await open(goalTask({ measure: 'time', target: 12_000 }));
      type('log-hours', '0');
      type('log-minutes', '45');
      await click(action('log'));
      expect(store.logEntry).toHaveBeenCalledWith('t1', { 'time-spent-seconds': 2700 });
      await click(action('add-check'));
      type('log-hours', '1');
      type('log-minutes', '0');
      field('log-checked').checked = true;
      await click(action('log'));
      expect(store.logEntry).toHaveBeenLastCalledWith('t1', { checked: true, 'time-spent-seconds': 3600 });
    });

    it('rejects an amount of more than 3 decimals, a long label, and an empty entry, without logging', async () => {
      await open(goalTask({ measure: 'amount', target: 100, unit: 'g' }));
      const errorText = (control) => {
        const ids = control.getAttribute('aria-describedby')?.split(' ') ?? [];
        return ids.map((id) => document.getElementById(id)).find((element) => element?.matches('.field__error') && !element.hidden)?.textContent ?? null;
      };
      await click(action('log'));
      expect(errorText(field('log-amount'))).toBe('Enter a value to log.');
      type('log-amount', '1.2345');
      await click(action('log'));
      expect(errorText(field('log-amount'))).toBe('Enter an amount from 0 to 999,999,999,999.999, with at most 3 decimals.');
      type('log-amount', '2');
      type('log-label', 'x'.repeat(101));
      await click(action('log'));
      expect(errorText(field('log-label'))).toBe('A label holds at most 100 characters.');
      expect(store.logEntry).not.toHaveBeenCalled();
    });

    it('asks in place before logging more than 12 hours, offering Change and Log anyway', async () => {
      await open(goalTask({ measure: 'time', target: 12_000 }));
      type('log-hours', '14');
      type('log-minutes', '0');
      await click(action('log'));
      const confirm = q('[data-part="log-confirm"]');
      expect(visible(confirm)).toBe(true);
      expect(confirm.textContent).toContain('Log 14 h 0 min? That is more than 12 hours.');
      expect(store.logEntry).not.toHaveBeenCalled();
      await click(action('log-change'));
      expect(visible(confirm)).toBe(false);
      expect(document.activeElement).toBe(field('log-hours'));
      await click(action('log'));
      await click(action('log-anyway'));
      expect(store.logEntry).toHaveBeenCalledWith('t1', { 'time-spent-seconds': 50_400 });
      expect(visible(confirm)).toBe(false);
    });

    it('does not ask for exactly 12 hours', async () => {
      await open(goalTask({ measure: 'time', target: 12_000 }));
      type('log-hours', '12');
      type('log-minutes', '0');
      await click(action('log'));
      expect(store.logEntry).toHaveBeenCalledWith('t1', { 'time-spent-seconds': 43_200 });
    });

    it('reports a rejected entry on the form instead of clearing it', async () => {
      await open(goalTask({ measure: 'amount', target: 100, unit: 'g' }));
      store.logEntry.mockRejectedValueOnce(Object.assign(new Error('Not a valid amount.'), { name: 'ValidationError' }));
      type('log-amount', '5');
      await click(action('log'));
      expect(field('log-amount').value).toBe('5');
    });
  });

  describe('entries', () => {
    const EVENTS = [
      logged('e1', { amount: 320, label: 'Croissant' }, '2026-11-26T08:00:00.000Z'),
      logged('e2', { amount: 300, label: 'Cake' }, '2026-11-26T10:00:00.000Z'),
      logged('e3', { amount: 50 }, '2026-11-25T10:00:00.000Z'),
      logged('e4', { amount: 999, label: 'Earlier period' }, '2026-11-20T10:00:00.000Z', 0),
      { id: 'u1', 'task-id': 't1', type: 'undo-log', occurrence: 1, 'creation-time': '2026-11-26T11:00:00.000Z', 'target-event-id': 'e3' },
    ];
    const cake = () => goalTask({ direction: 'at-most', measure: 'amount', target: 1600, unit: 'kcal' }, { status: 'in-progress', progress: 620, entries: ['e1', 'e2'] });
    const items = () => [...document.querySelectorAll('[data-section="status"] [data-part="entries"] > li')];

    it('lists the live entries of the current period, newest first, with their total', async () => {
      await open(cake(), { events: EVENTS });
      expect(items().map((item) => item.dataset.entry)).toEqual(['e2', 'e1']);
      expect(items()[0].textContent).toContain('Cake');
      expect(items()[0].textContent).toContain('300 kcal');
      expect(items()[1].textContent).toContain('Croissant');
      expect(q('[data-part="entries-total"]').textContent).toContain('620 kcal');
    });

    it('undoes an entry with an undo-log of it', async () => {
      await open(cake(), { events: EVENTS });
      await click(items()[0].querySelector('button[data-action="undo"]'));
      expect(store.undoLog).toHaveBeenCalledWith('t1', 'e2');
    });

    it('shows nothing before the first entry', async () => {
      await open(cake(), { events: [] });
      expect(items()).toHaveLength(0);
      expect(visible(q('[data-part="entries-empty"]'))).toBe(true);
    });

    it('lets any editor undo an entry of a collaborator, and shows its author while connected', async () => {
      await open(cake(), { events: [{ ...EVENTS[0], 'owner-id': 7 }, EVENTS[1]] });
      expect(items().every((item) => item.querySelector('button[data-action="undo"]') !== null)).toBe(true);
    });

    it('shows a viewer the entries without Undo', async () => {
      const task = { ...cake(), 'owner-id': 9 };
      resetBody('<div data-editor-slot hidden></div>');
      panel?.destroy();
      store = fakeStore();
      store.getTask = vi.fn(async () => task);
      store.eventsOfTask = vi.fn(async () => EVENTS);
      store.listLists = vi.fn(async () => [{ id: 'l1', name: 'Home', role: 'viewer', owner: { id: 9, name: 'Sam Roe' } }]);
      store.listsOfTask = vi.fn(async () => ['l1']);
      store.queue = { getState: vi.fn(async () => 3) };
      let editor;
      panel = createEditorPanel({
        slot: document.querySelector('[data-editor-slot]'), close: vi.fn(),
        editors: { task: (view, route) => {
          editor = mountTaskEditor(view, route, { store, toaster: { show: vi.fn() }, locale: 'en', now: () => new Date(NOW) });
          return editor;
        } },
      });
      panel.update({ name: 'task', view: 'tasks', editor: 'task', params: { taskId: 't1' } });
      await editor.idle();
      expect(items()).toHaveLength(2);
      expect(items().every((item) => !visible(item.querySelector('button[data-action="undo"]')))).toBe(true);
    });
  });

  describe('focus', () => {
    it('passes the focus of a control that disables to the status line', async () => {
      const task = goalTask({}, {});
      await open(task);
      action('check-off').focus();
      task['current-occurrence'] = { ...task['current-occurrence'], status: 'completed', progress: 1, 'close-time': '2026-11-26T00:00:00.000Z' };
      store.listeners.forEach((listener) => listener({ operation: 'logEntry' }));
      await vi.waitFor(() => expect(action('check-off').disabled).toBe(true));
      await tick();
      expect(document.activeElement).toBe(q('.task-editor__status'));
    });
  });
});

describe('task history of log entries (TSK-17)', () => {
  const CURRENT = {
    occurrence: 2, 'start-time': '2026-11-27T00:00:00.000Z', 'due-time': '2026-11-28T00:00:00.000Z', 'close-time': null, status: 'in-progress',
    'goal-direction': 'at-most', 'goal-measure': 'amount', 'goal-target': 1600, 'goal-unit': 'kcal', progress: 320,
  };
  const CLOSED = { ...CURRENT, occurrence: 1, 'start-time': '2026-11-26T00:00:00.000Z', 'due-time': '2026-11-27T00:00:00.000Z', 'close-time': '2026-11-27T00:00:00.000Z', status: 'failed', progress: 1910 };
  const EVENTS = [
    { id: 'e1', 'task-id': 't1', type: 'log', occurrence: 1, 'creation-time': '2026-11-26T08:00:00.000Z', amount: 1610, label: 'Lunch', 'owner-id': null },
    { id: 'e2', 'task-id': 't1', type: 'log', occurrence: 1, 'creation-time': '2026-11-26T10:00:00.000Z', amount: 300, label: 'Cake', 'owner-id': 4 },
    { id: 'u2', 'task-id': 't1', type: 'undo-log', occurrence: 1, 'creation-time': '2026-11-26T11:00:00.000Z', 'target-event-id': 'e2', 'owner-id': 4 },
    { id: 'e3', 'task-id': 't1', type: 'log', occurrence: 2, 'creation-time': '2026-11-27T08:00:00.000Z', amount: 320, label: 'Croissant', 'owner-id': null },
  ];
  let history;

  beforeEach(async () => {
    resetBody('<div></div>');
    const store = { eventsOfTask: async () => EVENTS, occurrencesOfTask: async () => [CLOSED, CURRENT], notesOfTask: async () => [] };
    history = createTaskHistory({ document, store, taskId: 't1', locale: 'en', userId: () => null });
    document.body.append(history.element);
    await history.load();
  });

  it('shows an occurrence with its status and progress against the goal', () => {
    const texts = [...document.querySelectorAll('[data-history="occurrences"] > li')].map((item) => item.textContent);
    expect(texts[1]).toContain('Failed, 1,910 / max 1,600 kcal');
    expect(texts[0]).toContain('In progress, 320 / max 1,600 kcal');
  });

  it('shows what each entry logged, and an undo naming the undone entry, which stays listed struck through', () => {
    const items = [...document.querySelectorAll('[data-history="events"] > li')];
    const text = (id) => items.find((item) => item.dataset.event === id)?.textContent;
    expect(text('e3')).toContain('You logged Croissant · 320 kcal');
    expect(text('e1')).toContain('You logged Lunch · 1,610 kcal');
    expect(text('u2')).toContain('Collaborator undid Cake · 300 kcal');
    expect(items.find((item) => item.dataset.event === 'e2').classList.contains('is-undone')).toBe(true);
    expect(items.find((item) => item.dataset.event === 'e1').classList.contains('is-undone')).toBe(false);
  });
});
