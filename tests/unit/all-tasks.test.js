// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mountAllTasks } from '../../src/js/views/all-tasks.js';

/**
 * Create a store stand-in that holds one open task.
 * @returns {object} the store
 */
function fakeStore() {
  const task = {
    id: 't1', description: 'Buy paint', status: 'todo', 'due-time': null,
    'creation-time': '2026-11-04T09:00:00.000Z', 'last-activity-time': '2026-11-04T09:00:00.000Z',
  };
  return {
    snapshot: async () => ({ lists: [], tasks: [task], memberships: [], notes: [] }),
    subscribe: () => () => {},
  };
}

describe('mountAllTasks', () => {
  let screen;

  afterEach(() => {
    screen?.destroy();
  });

  it('moves focus to search when Clear all in an empty result hides itself', async () => {
    document.body.innerHTML = '<div data-view="tasks"></div>';
    const storage = { getItem: () => null, setItem: vi.fn() };
    screen = mountAllTasks(document.querySelector('[data-view]'), {
      store: fakeStore(), toaster: { show: vi.fn() }, memory: { text: 'nothing like this' }, getStorage: () => storage,
    });
    await screen.idle();
    const clear = document.querySelector('.empty-state button');
    expect(clear.textContent).toBe('Clear all');
    clear.focus();
    clear.click();
    expect(document.querySelector('.empty-state').hidden).toBe(true);
    expect(document.activeElement).toBe(document.querySelector('[data-shortcut="search"]'));
  });
});
