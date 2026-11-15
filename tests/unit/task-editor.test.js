// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createEditorPanel } from '../../src/js/views/editor-panel.js';
import { resetBody } from './dom-reset.js';
import { mountTaskEditor } from '../../src/js/views/task-editor.js';
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

  it('focuses the description once the task loaded, and has no Save button', () => {
    const description = document.querySelector('textarea[name="description"]');
    expect(description.value).toBe('Buy paint');
    expect(document.activeElement).toBe(description);
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
    const overdue = document.querySelector('[data-section="overdue"]');
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
     * List the status actions the editor shows.
     * @returns {string[]} the events of the visible action buttons
     */
    const actions = () => [...document.querySelectorAll('[data-section="status"] button[data-event]')]
      .filter((button) => !button.hidden).map((button) => button.dataset.event);

    it('has no status radio buttons, and shows only the actions whose preconditions hold', async () => {
      expect(document.querySelector('input[name^="status-"]')).toBeNull();
      expect(actions()).toEqual(['complete', 'start', 'cancel']);
      await refill({ status: 'in-progress' });
      expect(actions()).toEqual(['complete', 'unstart', 'cancel']);
      await refill({ status: 'in-progress', 'target-count': 3, 'completion-count': 1 });
      expect(actions()).toEqual(['complete', 'cancel']);
      await refill({ status: 'completed' });
      expect(actions()).toEqual(['uncomplete', 'cancel']);
      await refill({ status: 'cancelled' });
      expect(actions()).toEqual(['reopen']);
    });

    it('names the status, the count above target 1, and the tick action', async () => {
      const line = document.querySelector('.task-editor__status');
      expect(line.textContent).toBe('To do');
      const tick = () => document.querySelector('[data-section="status"] button[data-event="complete"], [data-section="status"] button[data-event="uncomplete"]');
      expect(tick().textContent).toBe('Complete');
      const iconOf = () => [tick().dataset.status, tick().querySelector('use').getAttribute('href')];
      expect(iconOf()).toEqual(['completed', 'img/icons.svg#status-completed']);
      await refill({ status: 'in-progress', 'target-count': 3, 'completion-count': 2 });
      expect(line.textContent).toBe('In progress, 2 of 3 done');
      expect(tick().textContent).toBe('Tick, 2 of 3');
      await refill({ status: 'completed', 'target-count': 3, 'completion-count': 3 });
      expect(line.textContent).toBe('Completed, 3 of 3 done');
      expect(tick().textContent).toBe('Untick, 3 of 3');
      // Unticking 3 of 3 leads back to In progress, so the button shows that icon, not the completed one.
      expect(iconOf()).toEqual(['in-progress', 'img/icons.svg#status-in-progress']);
      await refill({ status: 'completed' });
      expect(tick().textContent).toBe('Undo completion');
      expect(iconOf()).toEqual(['ready', 'img/icons.svg#status-ready']);
    });

    it('posts the event of a clicked action, never a status through updateTask', async () => {
      document.querySelector('button[data-event="start"]').click();
      document.querySelector('button[data-event="complete"]').click();
      document.querySelector('button[data-event="cancel"]').click();
      await vi.waitFor(() => expect(store.postEvent).toHaveBeenCalledTimes(3));
      expect(store.postEvent.mock.calls).toEqual([['t1', 'start'], ['t1', 'complete'], ['t1', 'cancel']]);
      expect(store.updateTask).not.toHaveBeenCalled();
    });

    it('keeps the focus on the tick button while it stays shown, and moves it to the first action when it hides', async () => {
      const complete = document.querySelector('button[data-event="complete"]');
      complete.focus();
      await refill({ status: 'in-progress', 'target-count': 3, 'completion-count': 1 });
      expect(document.activeElement).toBe(complete);
      const cancel = document.querySelector('button[data-event="cancel"]');
      cancel.focus();
      await refill({ status: 'cancelled' });
      expect(document.activeElement).toBe(document.querySelector('button[data-event="reopen"]'));
    });

    it('saves the target count through the lifecycle rules, and rejects counts outside 1 to 999', async () => {
      const target = document.querySelector('input[name="target-count"]');
      expect(target.value).toBe('1');
      change(target, '0');
      expect(errorOf(target)).toBe('Enter a whole number from 1 to 999.');
      change(target, '2.5');
      expect(errorOf(target)).toBe('Enter a whole number from 1 to 999.');
      change(target, '1000');
      expect(store.updateRules).not.toHaveBeenCalled();
      change(target, '3');
      await vi.waitFor(() => expect(store.updateRules).toHaveBeenCalledWith('t1', { 'target-count': 3 }));
      expect(errorOf(target)).toBeNull();
      expect(store.updateTask).not.toHaveBeenCalled();
    });

    it('fills the target count from the rules', async () => {
      await refill({ status: 'in-progress', 'target-count': 3, 'completion-count': 2 });
      expect(document.querySelector('input[name="target-count"]').value).toBe('3');
    });

    it('saves the overdue behavior through the lifecycle rules (TSK-7)', async () => {
      await refill({ 'due-time': '2026-11-08T22:59:00.000Z' });
      const overdue = document.querySelector('[data-section="overdue"]');
      expect(overdue.hidden).toBe(false);
      const cancel = overdue.querySelector('input[value="cancel"]');
      cancel.checked = true;
      cancel.dispatchEvent(new Event('change', { bubbles: true }));
      await vi.waitFor(() => expect(store.updateRules).toHaveBeenCalledWith('t1', { 'overdue-handling': 'cancel' }));
      expect(store.updateTask).not.toHaveBeenCalled();
    });

    it('hides the deadline and overdue behavior of a recurring task, whose periods set its due times', async () => {
      const recurring = shapeTask({ ...TASK, id: 't1', description: 'Buy paint' });
      recurring['lifecycle-rules'] = { ...recurring['lifecycle-rules'], 'recurrence-unit': 'week', 'recurrence-interval': 1,
        timezone: 'Europe/Brussels', 'due-time': null, 'overdue-handling': null };
      recurring['current-occurrence']['due-time'] = '2026-11-15T23:00:00.000Z';
      store.getTask.mockImplementation(async () => recurring);
      const reads = store.listsOfTask.mock.calls.length;
      store.listeners.forEach((listener) => listener({ operation: 'updateRules' }));
      await vi.waitFor(() => expect(store.listsOfTask.mock.calls.length).toBeGreaterThan(reads));
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(document.querySelector('[data-section="due"]').hidden).toBe(true);
      expect(document.querySelector('[data-section="overdue"]').hidden).toBe(true);
      expect(document.querySelector('[data-section="target"]').hidden).toBe(false);
    });

    describe('recurrence', () => {
      const control = (name) => document.querySelector(`[name="${name}"]`);
      const details = () => document.querySelector('[data-section="repeat"] .task-editor__recurrence');

      /**
       * Fill the editor with a weekly task, every two weeks, ending after 10 occurrences.
       * @returns {Promise<void>} resolves once filled
       */
      async function refillWeekly() {
        const recurring = shapeTask({ ...TASK, id: 't1', description: 'Buy paint' });
        recurring['lifecycle-rules'] = { ...recurring['lifecycle-rules'], 'recurrence-unit': 'week', 'recurrence-interval': 2,
          'recurrence-end-count': 10, timezone: 'Europe/Brussels', 'due-time': null, 'overdue-handling': null };
        store.getTask.mockImplementation(async () => recurring);
        const reads = store.listsOfTask.mock.calls.length;
        store.listeners.forEach((listener) => listener({ operation: 'updateRules' }));
        await vi.waitFor(() => expect(store.listsOfTask.mock.calls.length).toBeGreaterThan(reads));
        await new Promise((resolve) => setTimeout(resolve, 0));
      }

      it('makes a one-off task weekly in the browser timezone, and hides the recurrence details until then', async () => {
        expect([...control('recurrence-unit').options].map((option) => [option.value, option.textContent])).toEqual([
          ['', 'Never'], ['day', 'Daily'], ['week', 'Weekly'], ['month', 'Monthly'],
        ]);
        expect(control('recurrence-unit').value).toBe('');
        expect(details().hidden).toBe(true);
        change(control('recurrence-unit'), 'week');
        await vi.waitFor(() => expect(store.updateRules).toHaveBeenCalledWith('t1', {
          'recurrence-unit': 'week', 'recurrence-interval': 1, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }));
      });

      it('fills and saves the interval, end date, end count, and timezone of a recurring task', async () => {
        await refillWeekly();
        expect(details().hidden).toBe(false);
        expect([control('recurrence-unit').value, control('recurrence-interval').value, control('recurrence-end-date').value,
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
        change(control('recurrence-unit'), '');
        await vi.waitFor(() => expect(store.updateRules).toHaveBeenCalledWith('t1', { 'recurrence-unit': null }));
      });
    });

    describe('history', () => {
      const EVENTS = [
        { id: 'e2', 'task-id': 't1', occurrence: 1, 'creation-time': '2026-11-04T10:00:00.000Z', 'owner-id': null, type: 'complete', details: null },
        { id: 'e1', 'task-id': 't1', occurrence: 1, 'creation-time': '2026-11-04T09:00:00.000Z', 'owner-id': null, type: 'create', details: null },
      ];
      const OCCURRENCES = [{ 'task-id': 't1', ...TASK['current-occurrence'], 'completion-count': 1, status: 'completed' }];
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
      occurrence: 1, 'start-time': '2026-11-04T00:00:00.000Z', 'due-time': '2026-11-05T00:00:00.000Z', 'target-count': 1,
      'completion-count': 1, status: 'completed', 'close-time': '2026-11-05T00:00:00.000Z',
    };
    const OCC2 = { ...OCC1, occurrence: 2, 'start-time': '2026-11-05T00:00:00.000Z', 'due-time': '2026-11-06T00:00:00.000Z', 'completion-count': 0, status: 'ready', 'close-time': null };
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
    expect(document.querySelector('textarea[name="new-note"]').value).toBe('Ask about the primer');
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
          : [{ 'task-id': 't1', occurrence: 2, 'start-time': '2026-11-08T23:00:00.000Z', 'due-time': '2026-11-15T23:00:00.000Z', 'target-count': 3,
            'completion-count': 0, status: 'ready', 'close-time': null }],
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
    expect(api.send.mock.calls.map(([method, path]) => [method, path])).toEqual([['GET', '/api/tasks/t1/events'], ['GET', '/api/tasks/t1/occurrences']]);
    expect(entries('events')[0]).toContain('Period ended');
    expect(entries('occurrences')[0]).toContain('#2');
    expect(entries('occurrences')[0]).toContain('0 of 3 done');
    expect(store.eventsOfTask).not.toHaveBeenCalled();
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
    const current = { occurrence: 2, 'start-time': '2026-11-05T00:00:00.000Z', 'due-time': '2026-11-06T00:00:00.000Z', 'target-count': 1,
      'completion-count': 0, status: 'ready', 'close-time': null };
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
    expect(document.activeElement).toBe(document.querySelector('textarea[name="description"]'));
  });

  it('takes the focus in the wide layout when opened from anything but the add field, such as a row', async () => {
    await open(link, false);
    expect(document.activeElement).toBe(document.querySelector('textarea[name="description"]'));
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
  const deleteButton = () => [...document.querySelectorAll('.editor-panel__danger button')][0];

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
    expect(document.querySelector('.editor-panel__danger').hidden).toBe(true);
    expect(document.querySelector('.note-thread__add').hidden).toBe(true);
  });

  it('lets a task editor change the task but not delete it', async () => {
    await open('task-editor');
    expect(banner().hidden).toBe(true);
    expect(document.querySelector('.task-editor__fields').disabled).toBe(false);
    expect(document.querySelector('.editor-panel__danger').hidden).toBe(true);
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
    expect(document.querySelector('.editor-panel__danger').hidden).toBe(false);
    expect(deleteButton().textContent).toBe('Delete task');
  });

  it('gives the task owner full control whatever the list role', async () => {
    await open('viewer', { 'owner-id': 3 });
    expect(banner().hidden).toBe(true);
    expect(document.querySelector('.task-editor__fields').disabled).toBe(false);
    expect(document.querySelector('.editor-panel__danger').hidden).toBe(false);
  });
});
