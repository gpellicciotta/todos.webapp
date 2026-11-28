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

    const STATES = ['ready', 'in-progress', 'completed'];
    const ICONS = STATES.map((status) => `img/icons.svg#status-${status}`);
    /** @returns {HTMLButtonElement[]} the state buttons, in order */
    const states = () => [...document.querySelectorAll('[data-section="status"] .task-editor__states > button')];
    /**
     * Find the state button of a status.
     * @param {string} status the status
     * @returns {HTMLButtonElement} the button
     */
    const state = (status) => states().find((button) => button.dataset.status === status);
    /** @returns {string[]} the statuses of the enabled state buttons */
    const enabled = () => states().filter((button) => !button.disabled).map((button) => button.dataset.status);
    /** @returns {HTMLElement} the count stepper */
    const stepper = () => document.querySelector('[data-section="status"] .task-editor__stepper');
    /**
     * Find a stepper button.
     * @param {'down'|'up'} direction the direction
     * @returns {HTMLButtonElement} the button
     */
    const step = (direction) => stepper().querySelector(`button[data-step="${direction}"]`);

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

    it('shows three state buttons, the current one pressed and each named by its status, and no event actions (TSK-4)', async () => {
      expect(document.querySelector('input[name^="status-"]')).toBeNull();
      expect(document.querySelector('[data-section="status"] button[data-event]')).toBeNull();
      const group = document.querySelector('[data-section="status"] .task-editor__states');
      expect([group.getAttribute('role'), group.getAttribute('aria-label')]).toEqual(['group', 'Status']);
      expect(states().map((button) => [button.dataset.status, button.getAttribute('aria-label'), button.title, button.getAttribute('aria-pressed')])).toEqual([
        ['ready', 'To do', 'To do', 'true'], ['in-progress', 'In progress', 'In progress', 'false'],
        ['completed', 'Completed', 'Completed', 'false'],
      ]);
      expect(states().every((button) => button.type === 'button' && button.classList.contains('icon-button'))).toBe(true);
      expect(states().map((button) => button.querySelector('use').getAttribute('href'))).toEqual(ICONS);
      expect(enabled()).toEqual(STATES);
      expect(document.querySelector('.task-editor__status').textContent).toBe('To do');
      await refill({ status: 'in-progress', 'target-count': 3, 'completion-count': 2 });
      expect(document.querySelector('.task-editor__status').textContent).toBe('In progress, 2 of 3 done');
      expect(states().map((button) => button.getAttribute('aria-pressed'))).toEqual(['false', 'true', 'false']);
      // No control previews the status it leads to: each icon names its own status, and the stepper shows none.
      expect(states().map((button) => button.querySelector('use').getAttribute('href'))).toEqual(ICONS);
      expect(stepper().querySelectorAll('use[href*="#status-"]')).toHaveLength(0);
    });

    it('posts the events of eventsTowardsStatus in order, and never a status through updateTask', async () => {
      expect(await clickAndCollect(state('completed'))).toEqual([['t1', 'complete']]);
      expect(await clickAndCollect(state('in-progress'))).toEqual([['t1', 'start']]);
      expect(await clickAndCollect(state('ready'))).toEqual([]);
      // Ready resets the count to 0, one uncomplete per completion.
      await refill({ status: 'in-progress', 'target-count': 3, 'completion-count': 2 });
      expect(await clickAndCollect(state('ready'))).toEqual([['t1', 'uncomplete'], ['t1', 'uncomplete']]);
      await refill({ status: 'in-progress' });
      expect(await clickAndCollect(state('ready'))).toEqual([['t1', 'unstart']]);
      // At target 1, Completed to In progress unticks, then starts.
      await refill({ status: 'completed' });
      expect(await clickAndCollect(state('in-progress'))).toEqual([['t1', 'uncomplete'], ['t1', 'start']]);
      // Cancelled keeps the count; leaving it reopens first.
      await refill({ status: 'cancelled', 'target-count': 3, 'completion-count': 2 });
      expect(await clickAndCollect(state('in-progress'))).toEqual([['t1', 'reopen']]);
      expect(await clickAndCollect(state('ready'))).toEqual([['t1', 'reopen'], ['t1', 'uncomplete'], ['t1', 'uncomplete']]);
      expect(store.updateTask).not.toHaveBeenCalled();
    });

    it('disables Completed below target and In progress at or above it, above target 1, with their tooltips', async () => {
      await refill({ status: 'ready', 'target-count': 3 });
      expect(enabled()).toEqual(['ready', 'in-progress']);
      expect(state('completed').title).toBe('Reach 3 of 3 to complete');
      expect(state('completed').getAttribute('aria-label')).toBe('Completed');
      await refill({ status: 'in-progress', 'target-count': 3, 'completion-count': 2 });
      expect(enabled()).toEqual(['ready', 'in-progress']);
      await refill({ status: 'completed', 'target-count': 3, 'completion-count': 3 });
      expect(enabled()).toEqual(['ready', 'completed']);
      expect(state('in-progress').title).toBe('Step below 3 of 3 to be in progress');
      expect(state('completed').title).toBe('Completed');
      await refill({ status: 'completed', 'target-count': 3, 'completion-count': 4 });
      expect(enabled()).toEqual(['ready', 'completed']);
      await refill({ status: 'cancelled', 'target-count': 3, 'completion-count': 3 });
      expect(enabled()).toEqual(['ready', 'completed']);
      expect(await clickAndCollect(state('completed'))).toEqual([['t1', 'reopen']]);
      await refill({ status: 'cancelled', 'target-count': 3, 'completion-count': 1 });
      expect(enabled()).toEqual(['ready', 'in-progress']);
    });

    it('shows the stepper above target 1 outside Ready, posting complete and uncomplete', async () => {
      expect(stepper().hidden).toBe(true);
      await refill({ status: 'in-progress' });
      expect(stepper().hidden).toBe(true);
      await refill({ status: 'ready', 'target-count': 3 });
      expect(stepper().hidden).toBe(true);
      await refill({ status: 'in-progress', 'target-count': 3, 'completion-count': 2 });
      expect(stepper().hidden).toBe(false);
      expect([stepper().getAttribute('role'), stepper().getAttribute('aria-label')]).toEqual(['group', 'Completions']);
      const count = stepper().querySelector('.task-editor__count');
      expect([count.textContent, count.getAttribute('aria-live')]).toEqual(['2 of 3', 'polite']);
      expect([step('down').getAttribute('aria-label'), step('up').getAttribute('aria-label')]).toEqual(['Undo a completion', 'Add a completion']);
      expect([step('down').disabled, step('up').disabled]).toEqual([false, false]);
      expect(await clickAndCollect(step('up'))).toEqual([['t1', 'complete']]);
      expect(await clickAndCollect(step('down'))).toEqual([['t1', 'uncomplete']]);
      // Minus from 1 starts again, so the task stays In progress at 0.
      await refill({ status: 'in-progress', 'target-count': 3, 'completion-count': 1 });
      expect(await clickAndCollect(step('down'))).toEqual([['t1', 'uncomplete'], ['t1', 'start']]);
      await refill({ status: 'in-progress', 'target-count': 3, 'completion-count': 0 });
      expect([stepper().hidden, step('down').disabled, step('up').disabled]).toEqual([false, true, false]);
      // Plus applies past the target too.
      await refill({ status: 'completed', 'target-count': 3, 'completion-count': 3 });
      expect(await clickAndCollect(step('up'))).toEqual([['t1', 'complete']]);
      await refill({ status: 'cancelled', 'target-count': 3, 'completion-count': 2 });
      expect([stepper().hidden, count.textContent, step('down').disabled, step('up').disabled]).toEqual([false, '2 of 3', true, true]);
      expect(store.updateTask).not.toHaveBeenCalled();
    });

    it('enables only Ready on a closed recurring series, which posts reopen', async () => {
      const closed = shapeTask({ ...TASK, id: 't1', description: 'Buy paint', status: 'completed', 'target-count': 3, 'completion-count': 3 });
      closed['lifecycle-rules'] = { ...closed['lifecycle-rules'], 'recurrence-unit': 'day', 'recurrence-interval': 1, 'recurrence-end-count': 1, timezone: 'UTC' };
      closed['current-occurrence'] = { ...closed['current-occurrence'], 'start-time': '2026-11-04T00:00:00.000Z', 'due-time': '2026-11-05T00:00:00.000Z',
        'close-time': '2026-11-05T00:00:00.000Z' };
      store.getTask.mockImplementation(async () => closed);
      const reads = store.listsOfTask.mock.calls.length;
      store.listeners.forEach((listener) => listener({ operation: 'rollOverTask' }));
      await vi.waitFor(() => expect(store.listsOfTask.mock.calls.length).toBeGreaterThan(reads));
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(enabled()).toEqual(['ready']);
      expect([step('down').disabled, step('up').disabled]).toEqual([true, true]);
      expect(await clickAndCollect(state('ready'))).toEqual([['t1', 'reopen']]);
    });

    it('passes the focus of a control that disables or hides to the pressed state button', async () => {
      await refill({ status: 'in-progress', 'target-count': 3, 'completion-count': 1 });
      step('up').focus();
      await refill({ status: 'in-progress', 'target-count': 3, 'completion-count': 2 });
      expect(document.activeElement).toBe(step('up'));
      await refill({ status: 'in-progress', 'target-count': 3, 'completion-count': 1 });
      step('down').focus();
      await refill({ status: 'in-progress', 'target-count': 3, 'completion-count': 0 });
      expect(document.activeElement).toBe(state('in-progress'));
      step('up').focus();
      await refill({ status: 'ready', 'target-count': 3 });
      expect(document.activeElement).toBe(state('ready'));
      state('in-progress').focus();
      await refill({ status: 'completed', 'target-count': 3, 'completion-count': 3 });
      expect(document.activeElement).toBe(state('completed'));
    });

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
        await refillWith({ 'goal-direction': 'at-most', 'goal-measure': 'amount', 'target-count': 1600.5, 'goal-unit': 'kcal', 'recurrence-unit': 'week',
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
        await refillWith({ 'goal-measure': 'time', 'target-count': 12000 });
        expect(control('goal-unit').closest('[data-part]').hidden).toBe(true);
        await refillWith({ 'goal-measure': 'reading', 'target-count': 80 });
        expect(control('goal-unit').closest('[data-part]').hidden).toBe(false);
      });

      it('saves the goal fields through the lifecycle rules', async () => {
        await refillWith({ 'goal-direction': 'at-least', 'goal-measure': 'checks', 'target-count': 3 });
        change(control('goal-measure'), 'time');
        await vi.waitFor(() => expect(store.updateRules).toHaveBeenLastCalledWith('t1', { 'goal-measure': 'time' }));
        change(control('goal-measure'), 'amount');
        await vi.waitFor(() => expect(store.updateRules).toHaveBeenLastCalledWith('t1', { 'goal-measure': 'amount' }));
        await refillWith({ 'goal-direction': 'at-least', 'goal-measure': 'amount', 'target-count': 3 });
        change(control('goal-target'), '1600.5');
        await vi.waitFor(() => expect(store.updateRules).toHaveBeenLastCalledWith('t1', { 'target-count': 1600.5 }));
        typeAndLeave(control('goal-unit'), ' kcal ');
        await vi.waitFor(() => expect(store.updateRules).toHaveBeenLastCalledWith('t1', { 'goal-unit': 'kcal' }));
        typeAndLeave(control('goal-unit'), '');
        await vi.waitFor(() => expect(store.updateRules).toHaveBeenLastCalledWith('t1', { 'goal-unit': null }));
        expect(store.updateTask).not.toHaveBeenCalled();
      });

      it('resets a target that the new measure cannot hold to 1', async () => {
        await refillWith({ 'goal-measure': 'amount', 'target-count': 0.5 });
        change(control('goal-measure'), 'checks');
        await vi.waitFor(() => expect(store.updateRules).toHaveBeenCalledWith('t1', { 'goal-measure': 'checks', 'target-count': 1 }));
      });

      it('takes a whole number for checks, and rejects 0, decimals, and numbers above 999,999,999,999', async () => {
        await refillWith({ 'goal-measure': 'checks', 'target-count': 3 });
        for (const bad of ['0', '2.5', '1000000000000', '-1', 'abc']) {
          change(control('goal-target'), bad);
          expect(errorOf(control('goal-target'))).toBe('Enter a whole number from 1 to 999,999,999,999.');
        }
        expect(store.updateRules).not.toHaveBeenCalled();
        change(control('goal-target'), '999999999999');
        await vi.waitFor(() => expect(store.updateRules).toHaveBeenCalledWith('t1', { 'target-count': 999999999999 }));
        expect(errorOf(control('goal-target'))).toBeNull();
      });

      it('takes up to 3 decimals from 0 for amounts and readings', async () => {
        await refillWith({ 'goal-measure': 'reading', 'target-count': 80 });
        for (const bad of ['-0.5', '1.2345', '1000000000000']) {
          change(control('goal-target'), bad);
          expect(errorOf(control('goal-target'))).toBe('Enter a number from 0 to 999,999,999,999.999, with at most 3 decimals.');
        }
        expect(store.updateRules).not.toHaveBeenCalled();
        change(control('goal-target'), '0');
        await vi.waitFor(() => expect(store.updateRules).toHaveBeenCalledWith('t1', { 'target-count': 0 }));
        change(control('goal-target'), '79.875');
        await vi.waitFor(() => expect(store.updateRules).toHaveBeenLastCalledWith('t1', { 'target-count': 79.875 }));
      });

      it('takes hours and minutes for time, saved as seconds, and shows them split', async () => {
        await refillWith({ 'goal-measure': 'time', 'target-count': 12000 });
        expect([control('goal-hours').value, control('goal-minutes').value]).toEqual(['3', '20']);
        expect(control('goal-target').closest('[data-part]').hidden).toBe(true);
        expect(part('goal-line').textContent).toBe('The task succeeds at 3 h 20 min or more.');
        change(control('goal-hours'), '1');
        await vi.waitFor(() => expect(store.updateRules).toHaveBeenLastCalledWith('t1', { 'target-count': 4800 }));
        change(control('goal-minutes'), '60');
        expect(errorOf(control('goal-minutes'))).toBe('Enter whole hours and minutes from 0 to 59, at least 1 minute in all.');
        change(control('goal-hours'), '0');
        change(control('goal-minutes'), '0');
        expect(errorOf(control('goal-minutes'))).toBe('Enter whole hours and minutes from 0 to 59, at least 1 minute in all.');
        expect(store.updateRules).toHaveBeenCalledTimes(1);
      });

      it('rejects a unit of more than 20 characters', async () => {
        await refillWith({ 'goal-measure': 'amount', 'target-count': 5 });
        typeAndLeave(control('goal-unit'), 'k'.repeat(21));
        expect(errorOf(control('goal-unit'))).toBe('A unit holds at most 20 characters.');
        expect(store.updateRules).not.toHaveBeenCalled();
      });

      it('turns back to a plain check with Check, clearing measure, target, and unit', async () => {
        await refillWith({ 'goal-direction': 'at-most', 'goal-measure': 'amount', 'target-count': 5, 'goal-unit': 'kcal', 'recurrence-unit': 'day',
          'recurrence-interval': 1, timezone: 'UTC' });
        choose('goal-mode', 'check');
        await vi.waitFor(() => expect(store.updateRules).toHaveBeenCalledWith('t1', {
          'goal-direction': 'at-least', 'goal-measure': 'checks', 'target-count': 1, 'goal-unit': null,
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
        await refillWith({ 'start-time': START }, { status: 'completed', 'completion-count': 1, 'close-time': '2026-11-05T09:00:00.000Z' });
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

    it('names the cancelled status with a pointer to Configuration', async () => {
      await refill({ status: 'cancelled' });
      expect(document.querySelector('.task-editor__status').textContent).toBe('Cancelled');
      expect(document.querySelector('[data-part="uncancel-hint"]').hidden).toBe(false);
      expect(document.querySelector('[data-part="uncancel-hint"]').textContent).toBe('Uncancel in Configuration.');
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
      expect(parts('Status')).toEqual(['status']);
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

  it('shows a viewer the state buttons and the stepper, every one disabled', async () => {
    const counted = shapeTask({ status: 'in-progress', 'target-count': 3, 'completion-count': 1 });
    await open('viewer', { 'lifecycle-rules': counted['lifecycle-rules'], 'current-occurrence': counted['current-occurrence'] });
    const controls = [...document.querySelectorAll('[data-section="status"] :is(.task-editor__states, .task-editor__stepper) button')];
    expect(controls).toHaveLength(5);
    expect(document.querySelector('[data-section="status"] .task-editor__stepper').hidden).toBe(false);
    expect(controls.filter((button) => !button.matches(':disabled'))).toEqual([]);
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

describe('mountTaskEditor previous period (TSK-16)', () => {
  let panel;
  let store;
  const DAILY_RULES = { ...TASK['lifecycle-rules'], 'recurrence-unit': 'day', 'recurrence-interval': 1, timezone: 'UTC', 'due-time': null, 'overdue-handling': null };
  const OCC2 = {
    occurrence: 2, 'start-time': '2026-11-05T00:00:00.000Z', 'due-time': '2026-11-06T00:00:00.000Z', 'target-count': 1,
    'completion-count': 0, status: 'ready', 'close-time': null,
  };
  const day = (iso) => new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(iso));

  /**
   * Open the editor of a task at a moment.
   * @param {object} task the task
   * @param {string} now the moment
   * @returns {Promise<void>}
   */
  async function open(task, now) {
    resetBody('<div data-editor-slot hidden></div>');
    store = fakeStore();
    store.getTask = vi.fn(async () => task);
    let editor;
    panel = createEditorPanel({
      slot: document.querySelector('[data-editor-slot]'), close: vi.fn(),
      editors: { task: (view, route) => {
        editor = mountTaskEditor(view, route, { store, toaster: { show: vi.fn() }, now: () => new Date(now) });
        return editor;
      } },
    });
    panel.update({ name: 'task', view: 'tasks', editor: 'task', params: { taskId: 't1' } });
    await editor.idle();
  }

  const previous = () => document.querySelector('[data-section="status"] button[data-action="previous-period"]');

  afterEach(() => {
    panel.destroy();
  });

  it('hides Complete for previous period on a one-off task', async () => {
    await open({ ...TASK }, '2026-11-05T10:00:00.000Z');
    expect(previous().hidden).toBe(true);
  });

  it('completes the previous occurrence within 24 hours after its period ended, naming its day', async () => {
    await open({ ...TASK, 'lifecycle-rules': DAILY_RULES, 'current-occurrence': OCC2 }, '2026-11-05T10:00:00.000Z');
    expect(previous().hidden).toBe(false);
    expect(previous().textContent).toBe(`Complete for previous period (${day('2026-11-04T12:00:00.000Z')})`);
    previous().click();
    await vi.waitFor(() => expect(store.postEvent).toHaveBeenCalledWith('t1', 'complete', { occurrence: 1 }));
    expect(store.postEvent).toHaveBeenCalledTimes(1);
  });

  it('names the cached occurrence past its period end before the roll-over, and hides once the grace period ends', async () => {
    const task = { ...TASK, 'lifecycle-rules': DAILY_RULES, 'current-occurrence': OCC2 };
    await open(task, '2026-11-06T10:00:00.000Z');
    expect(previous().textContent).toBe(`Complete for previous period (${day('2026-11-05T12:00:00.000Z')})`);
    previous().click();
    await vi.waitFor(() => expect(store.postEvent).toHaveBeenCalledWith('t1', 'complete', { occurrence: 2 }));
    panel.destroy();
    await open(task, '2026-11-07T10:00:00.000Z');
    expect(previous().hidden).toBe(true);
  });
});
