// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createEditorPanel } from '../../src/js/views/editor-panel.js';
import { mountTaskEditor } from '../../src/js/views/task-editor.js';

const TASK = {
  id: 't1', description: 'Buy paint', status: 'todo', 'due-time': null, 'overdue-handling': 'keep',
  'creation-time': '2026-11-04T09:00:00.000Z', 'last-update-time': '2026-11-04T09:00:00.000Z',
  'last-activity-time': '2026-11-04T09:00:00.000Z', 'deletion-time': null,
};

/**
 * Create a store stand-in that holds one task in no list.
 * @returns {object} the store
 */
function fakeStore() {
  const listeners = [];
  return {
    listeners,
    getTask: vi.fn(async () => ({ ...TASK })),
    listLists: vi.fn(async () => []),
    listsOfTask: vi.fn(async () => []),
    updateTask: vi.fn(async () => ({ ...TASK })),
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
    document.body.innerHTML = '<main tabindex="-1"><a href="#/tasks/t1">Buy paint</a></main><div data-editor-slot hidden></div>';
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
    document.body.innerHTML = '<div data-editor-slot hidden></div>';
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
    expect(store.updateTask).not.toHaveBeenCalled();
  });

  it('saves a date without a time as a date-only due time (TSK-6), and shows overdue behavior', async () => {
    const overdue = document.querySelector('[data-section="overdue"]');
    expect(overdue.hidden).toBe(true);
    typeAndLeave(document.querySelector('input[name="due-date"]'), '2026-11-08');
    await vi.waitFor(() => expect(store.updateTask).toHaveBeenCalledWith('t1', { 'due-time': '2026-11-08' }));
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
    expect(store.updateTask).not.toHaveBeenCalled();
    time.blur();
    await vi.waitFor(() => expect(store.updateTask).toHaveBeenCalledTimes(1));
    expect(store.updateTask.mock.calls[0][1]).toEqual({ 'due-time': new Date(2026, 4, 11, 18, 0).toISOString() });
  });

  it('shows a field error for a year with fewer than four digits and saves nothing', async () => {
    const date = document.querySelector('input[name="due-date"]');
    typeAndLeave(date, '0202-05-11');
    await vi.waitFor(() => expect(errorOf(date)).toBe('Enter a four-digit year.'));
    expect(store.updateTask).not.toHaveBeenCalled();
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
    await vi.waitFor(() => expect(store.updateTask).toHaveBeenCalledWith('t1', { 'due-time': '2026-11-08' }));
    expect(store.updateTask).toHaveBeenCalledWith('t1', { description: 'Buy blue paint' });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(store.updateTask).toHaveBeenCalledTimes(2);
  });
});
