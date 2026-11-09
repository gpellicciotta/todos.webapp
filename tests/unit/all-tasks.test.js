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

  it('moves focus to the add field when Reset in an empty result hides itself', async () => {
    document.body.innerHTML = '<div data-view="tasks"></div>';
    const storage = { getItem: () => null, setItem: vi.fn() };
    const viewModels = { tasks: createViewModel('tasks', () => storage) };
    screen = mountAllTasks(document.querySelector('[data-view]'), {
      store: fakeStore(), toaster: { show: vi.fn() }, viewModels, getStorage: () => storage,
    });
    await screen.idle();
    viewModels.tasks.set({ filter: { statuses: ['completed'] }, order: defaultViewState().order });
    const clear = document.querySelector('.empty-state button');
    expect(clear.textContent).toBe('Reset');
    clear.focus();
    clear.click();
    expect(document.querySelector('.empty-state').hidden).toBe(true);
    expect(document.activeElement).toBe(document.querySelector('[data-shortcut~="add"]'));
  });

  it('keeps search text still waiting for the debounce in the session memory when the screen closes', async () => {
    document.body.innerHTML = '<div data-view="tasks"></div>';
    const memory = {};
    screen = mountAllTasks(document.querySelector('[data-view]'), {
      store: fakeStore(), toaster: { show: vi.fn() }, memory, getStorage: () => ({ getItem: () => null, setItem: vi.fn() }),
    });
    await screen.idle();
    const search = document.querySelector('[data-shortcut~="search"]');
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

  it('renders again on the minute tick while Finished today only is on, so a task finished yesterday leaves (TV-14)', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    try {
      let time = new Date(2026, 10, 4, 23, 59, 30);
      const done = {
        id: 't2', description: 'Fix door', status: 'completed', 'due-time': null, 'creation-time': '2026-11-01T09:00:00.000Z',
        'last-update-time': new Date(2026, 10, 4, 18).toISOString(), 'last-activity-time': new Date(2026, 10, 4, 18).toISOString(),
      };
      const open = { ...done, id: 't1', description: 'Buy paint', status: 'todo' };
      const store = { snapshot: async () => ({ lists: [], tasks: [open, done], memberships: [], notes: [] }), subscribe: () => () => {} };
      const storage = { getItem: () => null, setItem: vi.fn() };
      const viewModels = { tasks: createViewModel('tasks', () => storage) };
      document.body.innerHTML = '<div data-view="tasks"></div>';
      screen = mountAllTasks(document.querySelector('[data-view]'), {
        store, toaster: { show: vi.fn() }, viewModels, getStorage: () => storage, now: () => time,
      });
      await screen.idle();
      viewModels.tasks.set({ filter: { statuses: [], finishedToday: true }, order: defaultViewState().order });
      const descriptions = () => [...document.querySelectorAll('.task-row__description')].map((node) => node.textContent);
      expect(descriptions()).toEqual(['Buy paint', 'Fix door']);
      time = new Date(2026, 10, 5, 0, 0, 30);
      vi.advanceTimersByTime(60_000);
      expect(descriptions()).toEqual(['Buy paint']);
      expect(document.querySelector('.info-line__text').textContent).toBe('1 of 2 tasks · Status: all, finished today');
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
    const search = document.querySelector('[data-shortcut~="search"]');
    expect(search.value).toBe('paint');
    expect(document.querySelector('.info-line__text').textContent).toBe('1 task · Search: paint · Status: open');
    document.querySelector('.info-line__reset').click();
    expect(search.value).toBe('');
  });

  it('has no separate search field, since the add field also searches (VO-3)', async () => {
    document.body.innerHTML = '<div data-view="tasks"></div>';
    screen = mountAllTasks(document.querySelector('[data-view]'), {
      store: fakeStore(), toaster: { show: vi.fn() }, getStorage: () => ({ getItem: () => null, setItem: vi.fn() }),
    });
    await screen.idle();
    expect(document.querySelectorAll('input[type="search"]')).toHaveLength(0);
    expect(document.querySelectorAll('[data-shortcut~="search"]')).toHaveLength(1);
  });

  it('filters the rows from the add field and says what Add creates, or that nothing matches', async () => {
    document.body.innerHTML = '<div data-view="tasks"></div>';
    screen = mountAllTasks(document.querySelector('[data-view]'), {
      store: fakeStore(), toaster: { show: vi.fn() }, memory: { text: 'paint' }, getStorage: () => ({ getItem: () => null, setItem: vi.fn() }),
    });
    await screen.idle();
    const hint = document.querySelector('.add-hint');
    expect(document.querySelectorAll('.task-row, [data-task-id]')).toHaveLength(1);
    expect(hint.hidden).toBe(false);
    expect(hint.textContent).toBe('Add creates a new task “paint”.');
    expect(document.querySelector('button[type="submit"]').textContent.trim()).toBe('Add');
    const field = document.querySelector('[data-shortcut~="search"]');
    field.value = 'nothing like this';
    field.dispatchEvent(new Event('input', { bubbles: true }));
    field.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    expect(document.querySelectorAll('.task-row, [data-task-id]')).toHaveLength(0);
    expect(hint.textContent).toBe('No task matches. Add creates it.');
    field.value = '  BUY paint ';
    field.dispatchEvent(new Event('input', { bubbles: true }));
    expect(document.querySelector('button[type="submit"]').textContent.trim()).toBe('Add anyway');
  });

  it('shows a toast with Show when the new task is hidden by the view options', async () => {
    document.body.innerHTML = '<div data-view="tasks"></div>';
    const store = { ...fakeStore(), createTask: vi.fn(async (input) => ({ id: 't2', ...input, status: 'todo', 'due-time': null, 'creation-time': new Date().toISOString() })) };
    const show = vi.fn();
    const viewModels = { tasks: createViewModel('tasks', () => ({ getItem: () => null, setItem: vi.fn() })) };
    screen = mountAllTasks(document.querySelector('[data-view]'), {
      store, toaster: { show }, viewModels, getStorage: () => ({ getItem: () => null, setItem: vi.fn() }),
    });
    await screen.idle();
    viewModels.tasks.set({ filter: { statuses: ['completed'] }, order: defaultViewState().order });
    const field = document.querySelector('[data-shortcut~="add"]');
    field.value = 'Paint the door';
    field.dispatchEvent(new Event('input', { bubbles: true }));
    document.querySelector('.add-bar').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await vi.waitFor(() => expect(show).toHaveBeenCalledTimes(1));
    expect(show.mock.calls[0][0]).toBe('Task added. Status: completed hides it.');
    expect(show.mock.calls[0][1].actionLabel).toBe('Show');
    show.mock.calls[0][1].onAction();
    expect(viewModels.tasks.get().filter.statuses).toEqual(['todo', 'in-progress']);
  });

  it('opens the task editor of a new task and gives the focus back to the add field', async () => {
    document.body.innerHTML = '<div data-view="tasks"></div>';
    const store = { ...fakeStore(), createTask: vi.fn(async (input) => ({ id: 't2', ...input, status: 'todo', 'due-time': null, 'creation-time': new Date().toISOString() })) };
    const navigate = vi.fn();
    screen = mountAllTasks(document.querySelector('[data-view]'), {
      store, toaster: { show: vi.fn() }, navigate, getStorage: () => ({ getItem: () => null, setItem: vi.fn() }),
    });
    await screen.idle();
    const field = document.querySelector('[data-shortcut~="add"]');
    document.querySelector('.add-bar button[type="submit"]').focus();
    field.value = 'Paint the door';
    document.querySelector('.add-bar').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await vi.waitFor(() => expect(navigate).toHaveBeenCalledWith('#/tasks/t2'));
    await vi.waitFor(() => expect(field.value).toBe(''));
    await vi.waitFor(() => expect(document.activeElement).toBe(field));
  });

  it('opens no editor when adding fails', async () => {
    document.body.innerHTML = '<div data-view="tasks"></div>';
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const store = { ...fakeStore(), createTask: vi.fn(async () => {
      throw new Error('quota'); 
    }) };
    const navigate = vi.fn();
    const show = vi.fn();
    screen = mountAllTasks(document.querySelector('[data-view]'), {
      store, toaster: { show }, navigate, getStorage: () => ({ getItem: () => null, setItem: vi.fn() }),
    });
    await screen.idle();
    document.querySelector('[data-shortcut~="add"]').value = 'Paint the door';
    document.querySelector('.add-bar').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await vi.waitFor(() => expect(show).toHaveBeenCalledWith('The task could not be added.'));
    expect(navigate).not.toHaveBeenCalled();
  });

  it('shows no toast when the new task is visible', async () => {
    document.body.innerHTML = '<div data-view="tasks"></div>';
    const store = { ...fakeStore(), createTask: vi.fn(async (input) => ({ id: 't2', ...input, status: 'todo', 'due-time': null, 'creation-time': new Date().toISOString() })) };
    const show = vi.fn();
    screen = mountAllTasks(document.querySelector('[data-view]'), {
      store, toaster: { show }, getStorage: () => ({ getItem: () => null, setItem: vi.fn() }),
    });
    await screen.idle();
    const field = document.querySelector('[data-shortcut~="add"]');
    field.value = 'Paint the door';
    document.querySelector('.add-bar').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await vi.waitFor(() => expect(store.createTask).toHaveBeenCalled());
    await Promise.resolve();
    expect(show).not.toHaveBeenCalled();
  });

  describe('grouping (VO-9 to VO-12)', () => {
    const HOME = 'l-home';
    const WORK = 'l-work';

    /**
     * Create a store stand-in with two lists and four tasks; the paint task is in both lists.
     * @returns {object} the store
     */
    function groupedStore() {
      const make = (id, description, status, due) => ({
        id, description, status, 'due-time': due,
        'creation-time': '2026-11-04T09:00:00.000Z', 'last-activity-time': '2026-11-04T09:00:00.000Z',
      });
      const tasks = [
        make('t1', 'Buy paint', 'todo', new Date(2026, 10, 5, 9).toISOString()),
        make('t2', 'Call plumber', 'in-progress', new Date(2026, 10, 3, 9).toISOString()),
        make('t3', 'Book flights', 'todo', null),
        make('t4', 'Water plants', 'completed', null),
      ];
      const memberships = [
        { 'list-id': HOME, 'task-id': 't1' }, { 'list-id': WORK, 'task-id': 't1' }, { 'list-id': WORK, 'task-id': 't2' },
      ];
      return {
        snapshot: async () => ({
          lists: [{ id: HOME, name: 'Home' }, { id: WORK, name: 'Work' }], tasks, memberships, notes: [],
        }),
        subscribe: () => () => {},
      };
    }

    /**
     * Mount All tasks grouped, with a fixed clock of 2026-11-04 12:00.
     * @param {string} group the grouping
     * @param {object} [extra] more view state, such as a filter
     * @param {object} [storage] the per-device storage
     * @returns {Promise<object>} the view model
     */
    async function mountGrouped(group, extra = {}, storage = { getItem: () => null, setItem: vi.fn() }) {
      document.body.innerHTML = '<div data-view="tasks"></div>';
      const viewModels = { tasks: createViewModel('tasks', () => storage) };
      viewModels.tasks.set({ ...defaultViewState(), group, ...extra });
      screen = mountAllTasks(document.querySelector('[data-view]'), {
        store: groupedStore(), toaster: { show: vi.fn() }, viewModels, getStorage: () => storage, now: () => new Date(2026, 10, 4, 12),
      });
      await screen.idle();
      return viewModels.tasks;
    }

    /**
     * Read the list as text: each header as `# name count`, each row as its description.
     * @returns {string[]} the entries, top to bottom
     */
    function entries() {
      return [...document.querySelectorAll('.task-list > li')].map((item) => (item.classList.contains('group-header')
        ? `# ${item.querySelector('.group-header__name').textContent} ${item.querySelector('.group-header__count').textContent}`
        : item.querySelector('.task-row__description').textContent));
    }

    it('shows no headers while the grouping is none', async () => {
      await mountGrouped('none');
      expect(document.querySelector('.group-header')).toBeNull();
      expect(document.querySelectorAll('.task-row')).toHaveLength(3);
    });

    it('groups by status with a count in each header and hides empty groups', async () => {
      await mountGrouped('status', { filter: { statuses: ['todo', 'in-progress', 'completed'] } });
      expect(entries()).toEqual(['# To do 2', 'Book flights', 'Buy paint', '# In progress 1', 'Call plumber', '# Completed 1', 'Water plants']);
    });

    it('groups by list, repeating a task of two lists and ending with No list', async () => {
      await mountGrouped('list');
      expect(entries()).toEqual(['# Home 1', 'Buy paint', '# Work 2', 'Call plumber', 'Buy paint', '# No list 1', 'Book flights']);
      expect(document.querySelectorAll('.task-row')).toHaveLength(4);
      expect(document.querySelector('.info-line__text').textContent).toBe('3 of 4 tasks · Status: open · Grouped by List');
    });

    it('groups by due date from the clock', async () => {
      await mountGrouped('due');
      expect(entries()).toEqual(['# Overdue 1', 'Call plumber', '# Tomorrow 1', 'Buy paint', '# No due date 1', 'Book flights']);
    });

    it('applies the search text and the sort inside each group', async () => {
      const model = await mountGrouped('status', { order: { field: 'description', direction: 'desc' } });
      expect(entries()).toEqual(['# To do 2', 'Buy paint', 'Book flights', '# In progress 1', 'Call plumber']);
      model.set({ ...model.get(), filter: { ...model.get().filter, text: 'bo' } });
      expect(entries()).toEqual(['# To do 1', 'Book flights']);
    });

    it('keeps headers out of the row controls and gives the list its full size', async () => {
      await mountGrouped('status');
      const header = document.querySelector('.group-header');
      expect(header.querySelector('button, a')).toBeNull();
      expect(header.querySelector('h3').textContent).toBe('To do');
      expect(document.querySelector('.task-list').children).toHaveLength(5);
    });

    it('changes the grouping live and saves it with the other view options', async () => {
      const data = new Map();
      const storage = { data, getItem: (key) => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) };
      const model = await mountGrouped('none', {}, storage);
      model.set({ ...model.get(), group: 'status' });
      expect(entries()[0]).toBe('# To do 2');
      expect(JSON.parse(storage.data.get('todos.view.tasks')).group).toBe('status');
      screen.destroy();
      const reloaded = createViewModel('tasks', () => storage);
      expect(reloaded.get().group).toBe('status');
    });

    it('shows Reset in the info line while grouped, and Reset ungroups', async () => {
      const model = await mountGrouped('status');
      expect(document.querySelector('.info-line__reset').hidden).toBe(false);
      document.querySelector('.info-line__reset').click();
      expect(model.get().group).toBe('none');
      expect(document.querySelector('.group-header')).toBeNull();
    });
  });

  describe('the Shared filter (TV-7)', () => {
    const task = (id, description) => ({
      id, description, status: 'todo', 'due-time': null, 'owner-id': 3,
      'creation-time': '2026-11-04T09:00:00.000Z', 'last-activity-time': '2026-11-04T09:00:00.000Z',
    });
    const store = {
      snapshot: async () => ({
        lists: [
          { id: 'l1', name: 'Family', role: 'owner', sharing: [{ id: 1 }] },
          { id: 'l2', name: 'Solo', role: 'owner', sharing: [] },
          { id: 'l3', name: 'Theirs', role: 'viewer', owner: { id: 9 }, sharing: [] },
        ],
        tasks: [task('t1', 'Plan trip'), task('t2', 'Buy paint'), task('t3', 'Loose task'), task('t4', 'Their task')],
        memberships: [
          { 'list-id': 'l1', 'task-id': 't1', position: 'a0' },
          { 'list-id': 'l2', 'task-id': 't2', position: 'a0' },
          { 'list-id': 'l3', 'task-id': 't4', position: 'a0' },
        ],
        notes: [],
      }),
      subscribe: () => () => {},
    };

    /**
     * Mount All tasks with a Shared filter and a session.
     * @param {boolean|undefined} shared the filter value
     * @param {'local'|'connected'} state the connection state
     * @returns {Promise<{rows: () => string[], info: () => string}>} what the screen shows
     */
    async function mount(shared, state) {
      document.body.innerHTML = '<div data-view="tasks"></div>';
      const storage = { getItem: () => null, setItem: vi.fn() };
      const viewModels = { tasks: createViewModel('tasks', () => storage) };
      viewModels.tasks.set({ filter: { statuses: ['todo'], ...(shared === undefined ? {} : { shared }) }, order: defaultViewState().order });
      screen = mountAllTasks(document.querySelector('[data-view]'), {
        store, toaster: { show: vi.fn() }, viewModels, getStorage: () => storage, session: { state: () => state },
      });
      await screen.idle();
      return {
        rows: () => [...document.querySelectorAll('.task-row__description')].map((row) => row.textContent).sort(),
        info: () => document.querySelector('.info-line__text').textContent,
      };
    }

    it('shows the tasks in a list the user shares or that is shared with them for Shared', async () => {
      const view = await mount(true, 'connected');
      expect(view.rows()).toEqual(['Plan trip', 'Their task']);
      expect(view.info()).toContain('Shared: yes');
    });

    it('shows the others for Not shared', async () => {
      expect((await mount(false, 'connected')).rows()).toEqual(['Buy paint', 'Loose task']);
    });

    it('ignores a stored Shared filter in local mode, also in the info line', async () => {
      const view = await mount(true, 'local');
      expect(view.rows()).toEqual(['Buy paint', 'Loose task', 'Plan trip', 'Their task']);
      expect(view.info()).not.toContain('Shared');
    });
  });
});
