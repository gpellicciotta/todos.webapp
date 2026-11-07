// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mountAllTasks } from '../../src/js/views/all-tasks.js';
import { createViewModel, defaultViewState } from '../../src/js/views/view-controls.js';

/**
 * Create a store stand-in that holds one open task.
 * @param {string|null} [dueTime] the due time of the task
 * @returns {object} the store
 */
function fakeStore(dueTime = null) {
  const task = {
    id: 't1', description: 'Buy paint', status: 'todo', 'due-time': dueTime,
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

  it('moves focus to search when Reset in an empty result hides itself', async () => {
    document.body.innerHTML = '<div data-view="tasks"></div>';
    const storage = { getItem: () => null, setItem: vi.fn() };
    screen = mountAllTasks(document.querySelector('[data-view]'), {
      store: fakeStore(), toaster: { show: vi.fn() }, memory: { text: 'nothing like this' }, getStorage: () => storage,
    });
    await screen.idle();
    const clear = document.querySelector('.empty-state button');
    expect(clear.textContent).toBe('Reset');
    clear.focus();
    clear.click();
    expect(document.querySelector('.empty-state').hidden).toBe(true);
    expect(document.activeElement).toBe(document.querySelector('[data-shortcut="search"]'));
  });

  it('keeps search text still waiting for the debounce in the session memory when the screen closes', async () => {
    document.body.innerHTML = '<div data-view="tasks"></div>';
    const memory = {};
    screen = mountAllTasks(document.querySelector('[data-view]'), {
      store: fakeStore(), toaster: { show: vi.fn() }, memory, getStorage: () => ({ getItem: () => null, setItem: vi.fn() }),
    });
    await screen.idle();
    const search = document.querySelector('[data-shortcut="search"]');
    search.value = 'paint';
    search.dispatchEvent(new Event('input', { bubbles: true }));
    screen.destroy();
    screen = null;
    expect(memory.text).toBe('paint');
  });

  it('updates the due chip on the minute tick and keeps the row and an open status menu (OVD-2)', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    try {
      let time = new Date(2026, 10, 4, 9, 59);
      document.body.innerHTML = '<div data-view="tasks"></div>';
      screen = mountAllTasks(document.querySelector('[data-view]'), {
        store: fakeStore(new Date(2026, 10, 4, 10, 0).toISOString()), toaster: { show: vi.fn() },
        getStorage: () => ({ getItem: () => null, setItem: vi.fn() }), now: () => time,
      });
      await screen.idle();
      const row = document.querySelector('.task-row');
      row.querySelector('.status-button').click();
      const focused = document.activeElement;
      time = new Date(2026, 10, 4, 10, 1);
      vi.advanceTimersByTime(60_000);
      expect(document.querySelector('.task-row')).toBe(row);
      expect(row.querySelector('.chip--overdue').textContent).toBe('Overdue');
      expect(document.querySelector('.status-menu').hidden).toBe(false);
      expect(document.activeElement).toBe(focused);
    }
    finally {
      vi.useRealTimers();
    }
  });

  it('shows the info line under the add bar, and a More menu with only Edit view options (VO-2, VO-4, VO-7)', async () => {
    document.body.innerHTML = '<div data-view="tasks"></div>';
    const navigate = vi.fn();
    screen = mountAllTasks(document.querySelector('[data-view]'), {
      store: fakeStore(), toaster: { show: vi.fn() }, navigate, getStorage: () => ({ getItem: () => null, setItem: vi.fn() }),
    });
    await screen.idle();
    const line = document.querySelector('.info-line');
    expect(line.previousElementSibling).toBe(document.querySelector('.add-bar'));
    expect(line.querySelector('.info-line__text').textContent).toBe('1 task · Status: open');
    expect(line.querySelector('.info-line__reset').hidden).toBe(true);
    const items = [...document.querySelectorAll('.view-header .menu__item')];
    expect(items.map((item) => item.textContent)).toEqual(['Edit view options']);
    document.querySelector('.view-header__more').click();
    items[0].click();
    expect(navigate).toHaveBeenCalledWith('#/tasks/view-options');
    for (const gone of ['.filter-chip', '.view-controls__sort', '.view-controls__filters']) {
      expect(document.querySelector(gone)).toBeNull();
    }
  });

  it('narrows the count and offers Reset when the view options change, and Reset restores them (VO-8)', async () => {
    document.body.innerHTML = '<div data-view="tasks"></div>';
    const viewModels = { tasks: createViewModel('tasks', () => ({ getItem: () => null, setItem: vi.fn() })) };
    screen = mountAllTasks(document.querySelector('[data-view]'), {
      store: fakeStore(), toaster: { show: vi.fn() }, viewModels, getStorage: () => ({ getItem: () => null, setItem: vi.fn() }),
    });
    await screen.idle();
    viewModels.tasks.set({ filter: { statuses: ['completed'] }, order: defaultViewState().order });
    expect(document.querySelector('.info-line__text').textContent).toBe('0 of 1 task · Status: completed');
    expect(viewModels.tasks.counts()).toEqual({ shown: 0, total: 1 });
    document.querySelector('.info-line__reset').click();
    expect(viewModels.tasks.get()).toEqual(defaultViewState());
    expect(document.querySelector('.info-line__text').textContent).toBe('1 task · Status: open');
  });

  it('clears the search field when Reset runs', async () => {
    document.body.innerHTML = '<div data-view="tasks"></div>';
    screen = mountAllTasks(document.querySelector('[data-view]'), {
      store: fakeStore(), toaster: { show: vi.fn() }, memory: { text: 'paint' }, getStorage: () => ({ getItem: () => null, setItem: vi.fn() }),
    });
    await screen.idle();
    const search = document.querySelector('[data-shortcut="search"]');
    expect(search.value).toBe('paint');
    expect(document.querySelector('.info-line__text').textContent).toBe('1 task · Search: paint · Status: open');
    document.querySelector('.info-line__reset').click();
    expect(search.value).toBe('');
  });
});
