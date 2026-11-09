// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NO_LIST } from '../../src/js/core/query.js';
import {
  createInfoLine, createViewModel, defaultViewState, describeFilters, describeInfoLine,
  isDefaultViewState, loadViewState, mountViewOptions, saveViewState,
} from '../../src/js/views/view-controls.js';

/**
 * Create an in-memory Storage stand-in.
 * @returns {{getItem: Function, setItem: Function, data: Map<string, string>}} the storage
 */
function memoryStorage() {
  const data = new Map();
  return {
    data,
    getItem: (key) => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => data.set(key, String(value)),
    removeItem: (key) => data.delete(key),
  };
}

const LISTS = [{ id: 'l-home', name: 'Home' }, { id: 'l-work', name: 'Work' }];

describe('view state per device (TV-12)', () => {
  it('starts with the open status filter and created newest first, or manual order in a list view', () => {
    expect(loadViewState('tasks', () => memoryStorage())).toEqual({
      filter: { statuses: ['todo', 'in-progress'] },
      order: { field: 'creation-time', direction: 'desc' },
      group: 'none',
    });
    expect(defaultViewState()).toEqual(loadViewState('tasks', () => memoryStorage()));
    expect(loadViewState('list', () => memoryStorage())).toEqual({
      filter: { statuses: ['todo', 'in-progress'] },
      order: { field: 'manual', direction: 'asc' },
      group: 'none',
    });
    expect(defaultViewState('list')).toEqual(loadViewState('list', () => memoryStorage()));
  });

  it('round-trips filters and sort through the device storage', () => {
    const storage = memoryStorage();
    const state = {
      filter: {
        lists: ['l-home', NO_LIST],
        statuses: ['completed'],
        due: ['overdue', 'none', { from: '2026-11-01', to: '2026-11-30' }],
        created: { from: '2026-10-01', to: null },
      },
      order: { field: 'description', direction: 'desc' },
      group: 'list',
    };
    saveViewState('tasks', state, () => storage);
    expect([...storage.data.keys()]).toEqual(['todos.view.tasks']);
    expect(loadViewState('tasks', () => storage)).toEqual(state);
  });

  it('keeps the search text out of the device storage', () => {
    const storage = memoryStorage();
    saveViewState('tasks', { filter: { statuses: [], text: 'paint' }, order: { field: 'status', direction: 'asc' }, group: 'none' }, () => storage);
    expect(loadViewState('tasks', () => storage)).toEqual({ filter: { statuses: [] }, order: { field: 'status', direction: 'asc' }, group: 'none' });
  });

  it('stores the grouping per device and reads only the groupings a view offers (TV-12, VO-9)', () => {
    const storage = memoryStorage();
    for (const group of ['list', 'due', 'status']) {
      saveViewState('tasks', { ...defaultViewState(), group }, () => storage);
      expect(loadViewState('tasks', () => storage).group).toBe(group);
    }
    storage.setItem('todos.view.tasks', JSON.stringify({ group: 'size' }));
    expect(loadViewState('tasks', () => storage).group).toBe('none');
    storage.setItem('todos.view.list', JSON.stringify({ group: 'list' }));
    expect(loadViewState('list', () => storage).group).toBe('none');
    for (const group of ['due', 'status']) {
      storage.setItem('todos.view.list', JSON.stringify({ group }));
      expect(loadViewState('list', () => storage).group).toBe(group);
    }
  });

  it('accepts manual order in a list view only', () => {
    const storage = memoryStorage();
    storage.setItem('todos.view.tasks', JSON.stringify({ order: { field: 'manual', direction: 'asc' } }));
    storage.setItem('todos.view.list', JSON.stringify({ order: { field: 'manual', direction: 'desc' } }));
    expect(loadViewState('tasks', () => storage).order).toEqual({ field: 'creation-time', direction: 'desc' });
    expect(loadViewState('list', () => storage).order).toEqual({ field: 'manual', direction: 'asc' });
  });

  it('reads the order and status filter that the old list screen stored', () => {
    const storage = memoryStorage();
    storage.setItem('todos.view.list', JSON.stringify({ order: 'creation-time', statuses: ['completed'] }));
    expect(loadViewState('list', () => storage)).toEqual({
      filter: { statuses: ['completed'] },
      order: { field: 'creation-time', direction: 'desc' },
      group: 'none',
    });
    storage.setItem('todos.view.list', JSON.stringify({ order: 'manual', statuses: [] }));
    expect(loadViewState('list', () => storage)).toEqual({ filter: { statuses: [] }, order: { field: 'manual', direction: 'asc' }, group: 'none' });
  });

  it('falls back to the defaults for broken, unknown, or unreachable storage', () => {
    const broken = memoryStorage();
    broken.setItem('todos.view.tasks', '{not json');
    expect(loadViewState('tasks', () => broken)).toEqual(defaultViewState());
    const odd = memoryStorage();
    odd.setItem('todos.view.tasks', JSON.stringify({ filter: { statuses: ['done', 'todo'], due: ['soon'] }, order: { field: 'size', direction: 'up' }, group: 'color' }));
    expect(loadViewState('tasks', () => odd)).toEqual({ filter: { statuses: ['todo'] }, order: defaultViewState().order, group: 'none' });
    const blocked = () => {
      throw new Error('SecurityError');
    };
    expect(loadViewState('tasks', blocked)).toEqual(defaultViewState());
    expect(() => saveViewState('tasks', defaultViewState(), blocked)).not.toThrow();
  });
});

describe('describeFilters', () => {
  it('names each active filter with its value', () => {
    expect(describeFilters({ statuses: ['todo', 'in-progress'] }, LISTS)).toEqual(['Status: open']);
    expect(describeFilters({
      statuses: ['completed'], lists: ['l-home'], due: ['this-week'], created: { from: '2026-11-01' }, text: 'paint',
    }, LISTS)).toEqual(['Search: paint', 'Lists: Home', 'Status: completed', 'Due: this week', 'Created: from 2026-11-01']);
    expect(describeFilters({ lists: [NO_LIST, 'l-work'], due: ['overdue', 'none'] }, LISTS)).toEqual(['Lists: 2 lists', 'Due: 2 options']);
    expect(describeFilters({ lists: [NO_LIST], statuses: [] }, LISTS)).toEqual(['Lists: in no list']);
  });
});

describe('describeInfoLine (VO-7)', () => {
  const open = defaultViewState();

  it('reads the count and the default open status for the defaults', () => {
    expect(describeInfoLine({ shown: 24, total: 24, state: open, lists: LISTS })).toEqual(['24 tasks', 'Status: open']);
    expect(describeInfoLine({ shown: 1, total: 1, state: open, lists: LISTS })).toEqual(['1 task', 'Status: open']);
    expect(describeInfoLine({ shown: 0, total: 0, state: open, lists: LISTS })).toEqual(['0 tasks', 'Status: open']);
  });

  it('reads "12 of 24 tasks" when the view is narrowed', () => {
    expect(describeInfoLine({ shown: 12, total: 24, state: open, lists: LISTS })).toEqual(['12 of 24 tasks', 'Status: open']);
  });

  it('names each active filter and the search text', () => {
    const state = {
      filter: { statuses: ['completed'], lists: ['l-home'], due: ['overdue'], created: { from: '2026-11-01', to: null }, text: 'paint' },
      order: open.order,
    };
    expect(describeInfoLine({ shown: 2, total: 9, state, lists: LISTS })).toEqual([
      '2 of 9 tasks', 'Search: paint', 'Lists: Home', 'Status: completed', 'Due: overdue', 'Created: from 2026-11-01',
    ]);
  });

  it('reads "Status: all" for an empty status filter, and leaves out a Lists filter of deleted lists', () => {
    const state = { filter: { statuses: [], lists: ['l-gone'] }, order: open.order };
    expect(describeInfoLine({ shown: 9, total: 9, state, lists: LISTS })).toEqual(['9 tasks', 'Status: all']);
  });

  it('adds the sort only when it differs from the default', () => {
    const sorted = (field, direction, kind) => describeInfoLine({
      shown: 3, total: 3, state: { filter: open.filter, order: { field, direction } }, lists: LISTS, kind,
    });
    expect(sorted('creation-time', 'desc')).toEqual(['3 tasks', 'Status: open']);
    expect(sorted('due-time', 'asc')).toEqual(['3 tasks', 'Status: open', 'Sorted by Due time']);
    expect(sorted('description', 'asc')).toEqual(['3 tasks', 'Status: open', 'Sorted by Description']);
    expect(sorted('description', 'desc')).toEqual(['3 tasks', 'Status: open', 'Sorted by Description, descending']);
    expect(sorted('creation-time', 'asc')).toEqual(['3 tasks', 'Status: open', 'Sorted by Created, ascending']);
    expect(sorted('manual', 'asc', 'list')).toEqual(['3 tasks', 'Status: open']);
    expect(sorted('due-time', 'asc', 'list')).toEqual(['3 tasks', 'Status: open', 'Sorted by Due time']);
  });
});

describe('grouping in the info line (VO-7)', () => {
  it('names a grouping other than none, before the sort', () => {
    const state = { ...defaultViewState(), group: 'due', order: { field: 'description', direction: 'asc' } };
    expect(describeInfoLine({ shown: 3, total: 3, state, lists: LISTS }))
      .toEqual(['3 tasks', 'Status: open', 'Grouped by Due date', 'Sorted by Description']);
    expect(describeInfoLine({ shown: 3, total: 3, state: { ...state, group: 'list' }, lists: LISTS })[2]).toBe('Grouped by List');
    expect(describeInfoLine({ shown: 3, total: 3, state: { ...state, group: 'status' }, lists: LISTS })[2]).toBe('Grouped by Status');
    expect(describeInfoLine({ shown: 3, total: 3, state: { ...state, group: 'none' }, lists: LISTS })).not.toContain('Grouped by None');
  });
});

describe('the Shared filter (TV-7)', () => {
  it('names the filter, keeps it in the device storage, and counts it as a change from the defaults', () => {
    expect(describeFilters({ shared: true }, LISTS)).toEqual(['Shared: yes']);
    expect(describeFilters({ shared: false }, LISTS)).toEqual(['Shared: no']);
    const storage = memoryStorage();
    const state = { ...defaultViewState(), filter: { statuses: ['todo'], shared: false } };
    saveViewState('tasks', state, () => storage);
    expect(loadViewState('tasks', () => storage).filter.shared).toBe(false);
    expect(isDefaultViewState({ ...defaultViewState(), filter: { ...defaultViewState().filter, shared: true } })).toBe(false);
  });

  it('drops a stored value that is not a boolean', () => {
    const storage = memoryStorage();
    storage.setItem('todos.view.tasks', JSON.stringify({ filter: { statuses: ['todo'], shared: 'yes' }, order: { field: 'creation-time', direction: 'desc' } }));
    expect(loadViewState('tasks', () => storage).filter.shared).toBeUndefined();
  });
});

describe('the Finished today only choice (TV-14)', () => {
  const all = ['todo', 'in-progress', 'completed', 'cancelled'];

  it('names the choice after the status value, in the info line and in empty results', () => {
    const line = (filter) => describeInfoLine({ shown: 3, total: 9, state: { filter, order: defaultViewState().order }, lists: LISTS });
    expect(line({ statuses: all, finishedToday: true })).toEqual(['3 of 9 tasks', 'Status: 4 statuses, finished today']);
    expect(line({ statuses: ['completed'], finishedToday: true })).toEqual(['3 of 9 tasks', 'Status: completed, finished today']);
    expect(line({ statuses: [], finishedToday: true })).toEqual(['3 of 9 tasks', 'Status: all, finished today']);
    expect(describeFilters({ statuses: [], finishedToday: true }, LISTS)).toEqual(['Status: all, finished today']);
    expect(describeFilters({ statuses: ['todo', 'in-progress'], finishedToday: true }, LISTS)).toEqual(['Status: open, finished today']);
  });

  it('keeps the choice in the device storage only when it is true', () => {
    const storage = memoryStorage();
    saveViewState('tasks', { ...defaultViewState(), filter: { statuses: all, finishedToday: true } }, () => storage);
    expect(loadViewState('tasks', () => storage).filter).toEqual({ statuses: all, finishedToday: true });
    for (const value of [false, 'yes', 1, null]) {
      storage.setItem('todos.view.tasks', JSON.stringify({ filter: { statuses: all, finishedToday: value } }));
      expect(loadViewState('tasks', () => storage).filter.finishedToday).toBeUndefined();
    }
    expect(defaultViewState().filter.finishedToday).toBeUndefined();
  });

  it('counts as a change from the defaults, so Reset shows (VO-8)', () => {
    const state = defaultViewState();
    expect(isDefaultViewState({ ...state, filter: { ...state.filter, finishedToday: true } })).toBe(false);
    expect(isDefaultViewState(defaultViewState('list'), 'list')).toBe(true);
  });
});

describe('isDefaultViewState (VO-8)', () => {
  it('tells the defaults from any other option or search text', () => {
    expect(isDefaultViewState(defaultViewState())).toBe(true);
    expect(isDefaultViewState(defaultViewState('list'), 'list')).toBe(true);
    expect(isDefaultViewState(defaultViewState('list'), 'tasks')).toBe(false);
    const state = defaultViewState();
    expect(isDefaultViewState({ ...state, filter: { ...state.filter, text: 'paint' } })).toBe(false);
    expect(isDefaultViewState({ ...state, filter: { statuses: [] } })).toBe(false);
    expect(isDefaultViewState({ ...state, filter: { ...state.filter, due: ['today'] } })).toBe(false);
    expect(isDefaultViewState({ ...state, order: { field: 'status', direction: 'asc' } })).toBe(false);
    expect(isDefaultViewState({ ...state, group: 'status' })).toBe(false);
    expect(isDefaultViewState({ ...state, filter: { ...state.filter, text: '  ' } })).toBe(true);
  });
});

describe('createViewModel', () => {
  it('stores each new state per device and tells its listeners', () => {
    const storage = memoryStorage();
    const model = createViewModel('tasks', () => storage);
    const listener = vi.fn();
    const stop = model.subscribe(listener);
    const next = { filter: { statuses: ['completed'], text: 'paint' }, order: { field: 'status', direction: 'asc' } };
    model.set(next);
    expect(model.get()).toEqual(next);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(loadViewState('tasks', () => storage).filter).toEqual({ statuses: ['completed'] });
    stop();
    model.set(defaultViewState());
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('resets every option and the search text to the defaults', () => {
    const model = createViewModel('list', () => memoryStorage());
    model.set({ filter: { statuses: [], text: 'x', due: ['today'] }, order: { field: 'status', direction: 'desc' } });
    model.reset();
    expect(model.get()).toEqual(defaultViewState('list'));
  });

  describe('per list', () => {
    const grouped = { filter: { statuses: ['completed'] }, order: { field: 'status', direction: 'asc' }, group: 'due' };

    it('keeps the options of each list apart, under one entry per list', () => {
      const storage = memoryStorage();
      const model = createViewModel('list', () => storage);
      model.select('l-home');
      model.set(grouped);
      model.select('l-work');
      expect(model.get()).toEqual(defaultViewState('list'));
      model.set({ ...defaultViewState('list'), group: 'status' });
      model.select('l-home');
      expect(model.get()).toEqual(grouped);
      expect(storage.data.has('todos.view.list.l-home')).toBe(true);
      expect(storage.data.has('todos.view.list.l-work')).toBe(true);
      expect(storage.data.has('todos.view.list')).toBe(false);
    });

    it('restores the options of a list on a new model', () => {
      const storage = memoryStorage();
      const first = createViewModel('list', () => storage);
      first.select('l-home');
      first.set(grouped);
      const second = createViewModel('list', () => storage);
      second.select('l-home');
      expect(second.get()).toEqual(grouped);
      second.select('l-work');
      expect(second.get()).toEqual(defaultViewState('list'));
    });

    it('ignores the old entry shared by every list', () => {
      const storage = memoryStorage();
      storage.setItem('todos.view.list', JSON.stringify(grouped));
      const model = createViewModel('list', () => storage);
      model.select('l-home');
      expect(model.get()).toEqual(defaultViewState('list'));
    });

    it('tells its listeners when another list is selected, and not when the same one is selected again', () => {
      const model = createViewModel('list', () => memoryStorage());
      const listener = vi.fn();
      model.select('l-home');
      model.subscribe(listener);
      model.select('l-home');
      expect(listener).not.toHaveBeenCalled();
      model.select('l-work');
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('drops the search text when another list is selected', () => {
      const model = createViewModel('list', () => memoryStorage());
      model.select('l-home');
      model.set({ ...defaultViewState('list'), filter: { statuses: ['todo'], text: 'paint' } });
      model.select('l-work');
      expect(model.get().filter.text).toBeUndefined();
    });

    it('resets one list to the defaults and removes its entry, leaving the other lists alone', () => {
      const storage = memoryStorage();
      const model = createViewModel('list', () => storage);
      model.select('l-home');
      model.set(grouped);
      model.select('l-work');
      model.set(grouped);
      model.reset();
      expect(model.get()).toEqual(defaultViewState('list'));
      expect(storage.data.has('todos.view.list.l-work')).toBe(false);
      model.select('l-home');
      expect(model.get()).toEqual(grouped);
    });

    it('does not store options before a list is selected', () => {
      const storage = memoryStorage();
      const model = createViewModel('list', () => storage);
      model.set(grouped);
      expect(storage.data.size).toBe(0);
    });
  });

  it('reports the shown and total counts to its count listeners', () => {
    const model = createViewModel('tasks', () => memoryStorage());
    const listener = vi.fn();
    model.subscribeCounts(listener);
    model.setCounts({ shown: 3, total: 9 });
    expect(model.counts()).toEqual({ shown: 3, total: 9 });
    expect(listener).toHaveBeenCalledWith({ shown: 3, total: 9 });
  });
});

describe('createInfoLine (VO-7, VO-8)', () => {
  it('shows the parts joined by dots, and Reset only while an option differs from its default', () => {
    const onReset = vi.fn();
    const line = createInfoLine({ document, onReset });
    document.body.append(line.element);
    line.update({ shown: 12, total: 24, state: defaultViewState(), lists: LISTS });
    expect(line.element.querySelector('.info-line__text').textContent).toBe('12 of 24 tasks · Status: open');
    expect(line.element.querySelector('.info-line__reset').hidden).toBe(true);
    line.update({ shown: 3, total: 24, state: { filter: { statuses: [] }, order: defaultViewState().order }, lists: LISTS });
    expect(line.element.querySelector('.info-line__text').textContent).toBe('3 of 24 tasks · Status: all');
    const reset = line.element.querySelector('.info-line__reset');
    expect(reset.hidden).toBe(false);
    reset.click();
    expect(onReset).toHaveBeenCalledTimes(1);
    line.element.remove();
  });

  it('judges the defaults of a list view by manual order', () => {
    const line = createInfoLine({ document, onReset: vi.fn() });
    line.update({ shown: 1, total: 1, state: defaultViewState('list'), lists: [], kind: 'list' });
    expect(line.element.querySelector('.info-line__reset').hidden).toBe(true);
    line.update({ shown: 1, total: 1, state: defaultViewState('tasks'), lists: [], kind: 'list' });
    expect(line.element.querySelector('.info-line__reset').hidden).toBe(false);
    expect(line.element.querySelector('.info-line__text').textContent).toBe('1 task · Status: open · Sorted by Created');
  });
});

describe('mountViewOptions (VO-5, VO-6, VO-13)', () => {
  let models;
  let controller;
  let panel;
  let context;

  /**
   * Mount the view options of a view into a panel stand-in.
   * @param {'tasks'|'list'} view the view
   * @param {object[]} [lists] the lists the store holds
   * @param {object} [session] the session, local when left out
   * @returns {Promise<void>} resolves once the lists loaded
   */
  async function mount(view, lists = LISTS, session = undefined) {
    const element = document.body.appendChild(document.createElement('aside'));
    const body = element.appendChild(document.createElement('div'));
    panel = { element, body, document, setTitle: vi.fn(), close: vi.fn() };
    context = {
      store: { listLists: async () => lists, subscribe: () => () => {} },
      viewModels: models,
      session,
    };
    controller = mountViewOptions(panel, { view, params: {} }, context);
    if (view === 'tasks') {
      await vi.waitFor(() => expect(body.querySelectorAll('[data-region="lists"] input')).toHaveLength(lists.length + 1));
    }
  }

  /**
   * Check or uncheck an input and fire its change event.
   * @param {HTMLInputElement} input the input
   * @param {boolean} checked the new state
   */
  function toggle(input, checked) {
    input.checked = checked;
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }

  beforeEach(() => {
    document.body.innerHTML = '';
    models = { tasks: createViewModel('tasks', () => memoryStorage()), list: createViewModel('list', () => memoryStorage()) };
  });

  afterEach(() => {
    controller?.destroy();
    controller = null;
  });

  it('titles the panel and holds Reset, the Filter rows, Group by, and Sort by', async () => {
    await mount('tasks');
    expect(panel.setTitle).toHaveBeenCalledWith('View options');
    expect([...panel.body.querySelectorAll('.view-options__heading')].map((heading) => heading.textContent))
      .toEqual(['Filter', 'Group by', 'Sort by']);
    expect(panel.body.querySelector('.view-options__reset').textContent).toBe('Reset');
    const rows = [...panel.body.querySelectorAll('.view-options__row')].filter((row) => !row.hidden);
    expect(rows.map((row) => row.dataset.row)).toEqual(['lists', 'statuses', 'due', 'created']);
    expect(rows.map((row) => row.querySelector('.view-options__value').textContent)).toEqual(['All', 'open', 'Any', 'Any']);
  });

  it('offers Group by with None, List, Due date, and Status in All tasks, and changes the grouping (VO-9)', async () => {
    await mount('tasks');
    const radios = [...panel.body.querySelectorAll('input[name$="group"]')];
    expect(radios.map((radio) => radio.parentElement.textContent)).toEqual(['None', 'List', 'Due date', 'Status']);
    expect(radios.find((radio) => radio.checked).value).toBe('none');
    toggle(radios.find((radio) => radio.value === 'list'), true);
    expect(models.tasks.get().group).toBe('list');
    models.tasks.set({ ...models.tasks.get(), group: 'status' });
    expect(radios.find((radio) => radio.checked).value).toBe('status');
    panel.body.querySelector('.view-options__reset').click();
    expect(models.tasks.get().group).toBe('none');
    expect(radios.find((radio) => radio.checked).value).toBe('none');
  });

  it('offers Group by with None, Due date, and Status in a list view, but not List (LV-11)', async () => {
    await mount('list');
    const radios = [...panel.body.querySelectorAll('input[name$="group"]')];
    expect(radios.map((radio) => radio.parentElement.textContent)).toEqual(['None', 'Due date', 'Status']);
    expect([...panel.body.querySelectorAll('.view-options__heading')].map((heading) => heading.textContent)).toEqual(['Filter', 'Group by', 'Sort by']);
    toggle(radios.find((radio) => radio.value === 'status'), true);
    expect(models.list.get().group).toBe('status');
    panel.body.querySelector('.view-options__reset').click();
    expect(models.list.get().group).toBe('none');
    expect(radios.find((radio) => radio.checked).value).toBe('none');
  });

  it('offers no Lists row in a list view, and Manual order as the first sort choice (LV-6)', async () => {
    await mount('list');
    expect([...panel.body.querySelectorAll('.view-options__row')].map((row) => row.dataset.row)).toEqual(['statuses', 'due', 'created']);
    const options = [...panel.body.querySelectorAll('select option')].map((option) => option.textContent);
    expect(options).toEqual(['Manual order', 'Due time', 'Created', 'Last activity', 'Status', 'Description']);
    expect(panel.body.querySelector('select').value).toBe('manual');
  });

  it('offers five sort fields in All tasks, starting at Created descending', async () => {
    await mount('tasks');
    expect([...panel.body.querySelectorAll('select option')].map((option) => option.textContent))
      .toEqual(['Due time', 'Created', 'Last activity', 'Status', 'Description']);
    expect(panel.body.querySelector('select').value).toBe('creation-time');
    expect(panel.body.querySelector('input[name$="direction"]:checked').value).toBe('desc');
  });

  it('opens one filter row at a time, keeping aria-expanded in step', async () => {
    await mount('tasks');
    const rows = [...panel.body.querySelectorAll('.view-options__row')];
    expect(rows.every((row) => row.getAttribute('aria-expanded') === 'false')).toBe(true);
    rows[1].click();
    expect(rows[1].getAttribute('aria-expanded')).toBe('true');
    expect(document.getElementById(rows[1].getAttribute('aria-controls')).hidden).toBe(false);
    rows[0].click();
    expect(rows[1].getAttribute('aria-expanded')).toBe('false');
    expect(document.getElementById(rows[1].getAttribute('aria-controls')).hidden).toBe(true);
    expect(rows[0].getAttribute('aria-expanded')).toBe('true');
    rows[0].click();
    expect(rows[0].getAttribute('aria-expanded')).toBe('false');
  });

  it('lists every list and In no list, and filters by the ones checked', async () => {
    await mount('tasks');
    const region = panel.body.querySelector('[data-region="lists"]');
    expect([...region.querySelectorAll('.choice')].map((choice) => choice.textContent.trim())).toEqual(['Home', 'Work', 'In no list']);
    toggle(region.querySelector('input[value="l-home"]'), true);
    expect(models.tasks.get().filter.lists).toEqual(['l-home']);
    expect(panel.body.querySelector('[data-row="lists"] .view-options__value').textContent).toBe('Home');
    toggle(region.querySelector('input[value="no-list"]'), true);
    expect(panel.body.querySelector('[data-row="lists"] .view-options__value').textContent).toBe('2 lists');
    toggle(region.querySelector('input[value="l-home"]'), false);
    toggle(region.querySelector('input[value="no-list"]'), false);
    expect(models.tasks.get().filter.lists).toBeUndefined();
  });

  it('offers the Shared filter in All tasks only while connected, as Any, Shared, and Not shared (TV-7)', async () => {
    await mount('tasks');
    expect(panel.body.querySelector('[data-row="shared"]').hidden).toBe(true);
    controller.destroy();
    await mount('tasks', LISTS, { state: () => 'connected', subscribe: () => () => {} });
    const row = panel.body.querySelector('[data-row="shared"]');
    expect(row.hidden).toBe(false);
    expect(row.querySelector('.view-options__label').textContent).toBe('Shared');
    expect(row.querySelector('.view-options__value').textContent).toBe('Any');
    const region = panel.body.querySelector('[data-region="shared"]');
    expect([...region.querySelectorAll('.choice')].map((choice) => choice.textContent.trim())).toEqual(['Any', 'Shared', 'Not shared']);
    toggle(region.querySelector('input[value="true"]'), true);
    expect(models.tasks.get().filter.shared).toBe(true);
    expect(row.querySelector('.view-options__value').textContent).toBe('Shared');
    toggle(region.querySelector('input[value="false"]'), true);
    expect(models.tasks.get().filter.shared).toBe(false);
    expect(row.querySelector('.view-options__value').textContent).toBe('Not shared');
    toggle(region.querySelector('input[value="any"]'), true);
    expect(models.tasks.get().filter.shared).toBeUndefined();
  });

  it('offers no Shared filter in a list view (TV-7)', async () => {
    await mount('list', LISTS, { state: () => 'connected', subscribe: () => () => {} });
    expect(panel.body.querySelector('[data-row="shared"]')).toBeNull();
  });

  it('shows the Shared row once the session connects', async () => {
    let listener;
    const session = {
      state: () => 'local',
      subscribe: (callback) => {
        listener = callback;
        return () => {};
      },
    };
    await mount('tasks', LISTS, session);
    session.state = () => 'connected';
    listener('connected');
    expect(panel.body.querySelector('[data-row="shared"]').hidden).toBe(false);
  });

  it('changes the status filter, and keeps an empty one as every status', async () => {
    await mount('tasks');
    const region = panel.body.querySelector('[data-region="statuses"]');
    toggle(region.querySelector('input[value="completed"]'), true);
    expect(models.tasks.get().filter.statuses).toEqual(['todo', 'in-progress', 'completed']);
    expect(panel.body.querySelector('[data-row="statuses"] .view-options__value').textContent).toBe('3 statuses');
    for (const status of ['todo', 'in-progress', 'completed']) {
      toggle(region.querySelector(`input[value="${status}"]`), false);
    }
    expect(models.tasks.get().filter.statuses).toEqual([]);
    expect(panel.body.querySelector('[data-row="statuses"] .view-options__value').textContent).toBe('All');
  });

  it('offers Finished today only after the four statuses, and sets and clears it (TV-14)', async () => {
    await mount('tasks');
    const region = panel.body.querySelector('[data-region="statuses"]');
    const labels = [...region.querySelectorAll('label')].map((label) => label.textContent.trim());
    expect(labels).toEqual(['To do', 'In progress', 'Completed', 'Cancelled', 'Finished today only']);
    const choice = region.querySelector('input[data-toggle="finishedToday"]');
    expect(choice.type).toBe('checkbox');
    expect(choice.checked).toBe(false);
    toggle(region.querySelector('input[value="completed"]'), true);
    toggle(choice, true);
    expect(models.tasks.get().filter).toEqual({ statuses: ['todo', 'in-progress', 'completed'], finishedToday: true });
    expect(panel.body.querySelector('[data-row="statuses"] .view-options__value').textContent).toBe('3 statuses, finished today');
    toggle(choice, false);
    expect(models.tasks.get().filter).toEqual({ statuses: ['todo', 'in-progress', 'completed'] });
    expect(panel.body.querySelector('[data-row="statuses"] .view-options__value').textContent).toBe('3 statuses');
  });

  it('shows a stored Finished today only choice, offers it in a list view, and Reset clears it (TV-14, VO-8)', async () => {
    models.list.select('l-home');
    models.list.set({ ...models.list.get(), filter: { statuses: [], finishedToday: true } });
    await mount('list');
    const choice = panel.body.querySelector('[data-region="statuses"] input[data-toggle="finishedToday"]');
    expect(choice.checked).toBe(true);
    expect(panel.body.querySelector('[data-row="statuses"] .view-options__value').textContent).toBe('all, finished today');
    panel.body.querySelector('.view-options__reset').click();
    expect(choice.checked).toBe(false);
    expect(models.list.get().filter.finishedToday).toBeUndefined();
  });

  it('sets the due quick options and ranges, and the created range', async () => {
    await mount('tasks');
    toggle(panel.body.querySelector('[data-region="due"] input[value="overdue"]'), true);
    expect(models.tasks.get().filter.due).toEqual(['overdue']);
    const from = panel.body.querySelector('[data-region="due"] input[type="date"]');
    from.value = '2026-11-01';
    from.dispatchEvent(new Event('change', { bubbles: true }));
    expect(models.tasks.get().filter.due).toEqual(['overdue', { from: '2026-11-01', to: null }]);
    const to = panel.body.querySelector('[data-region="created"] input[data-filter="created-to"]');
    to.value = '2026-11-30';
    to.dispatchEvent(new Event('change', { bubbles: true }));
    expect(models.tasks.get().filter.created).toEqual({ from: null, to: '2026-11-30' });
    expect(panel.body.querySelector('[data-row="created"] .view-options__value').textContent).toBe('until 2026-11-30');
  });

  it('sorts by the chosen field with its natural direction, and by the direction toggle', async () => {
    await mount('tasks');
    const select = panel.body.querySelector('select');
    select.value = 'creation-time';
    select.dispatchEvent(new Event('change', { bubbles: true }));
    expect(models.tasks.get().order).toEqual({ field: 'creation-time', direction: 'desc' });
    expect(panel.body.querySelector('input[name$="direction"]:checked').value).toBe('desc');
    toggle(panel.body.querySelector('input[name$="direction"][value="asc"]'), true);
    expect(models.tasks.get().order).toEqual({ field: 'creation-time', direction: 'asc' });
    select.value = 'description';
    select.dispatchEvent(new Event('change', { bubbles: true }));
    expect(models.tasks.get().order).toEqual({ field: 'description', direction: 'asc' });
  });

  it('disables the direction while a list view keeps its manual order (LV-8)', async () => {
    await mount('list');
    const radios = [...panel.body.querySelectorAll('input[name$="direction"]')];
    expect(radios.every((radio) => radio.disabled)).toBe(true);
    const select = panel.body.querySelector('select');
    select.value = 'status';
    select.dispatchEvent(new Event('change', { bubbles: true }));
    expect(radios.every((radio) => !radio.disabled)).toBe(true);
    expect(models.list.get().order).toEqual({ field: 'status', direction: 'asc' });
  });

  it('resets every option, and follows a state set from outside', async () => {
    await mount('tasks');
    models.tasks.set({ filter: { statuses: [], due: ['today'], text: 'paint' }, order: { field: 'status', direction: 'desc' } });
    expect(panel.body.querySelector('select').value).toBe('status');
    expect(panel.body.querySelector('[data-region="statuses"] input[value="todo"]').checked).toBe(false);
    expect(panel.body.querySelector('[data-region="due"] input[value="today"]').checked).toBe(true);
    panel.body.querySelector('.view-options__reset').click();
    expect(models.tasks.get()).toEqual(defaultViewState());
    expect(panel.body.querySelector('select').value).toBe('creation-time');
    expect(panel.body.querySelector('[data-region="statuses"] input[value="todo"]').checked).toBe(true);
  });

  it('labels the Show button with the shown count, and closes the panel on click', async () => {
    await mount('tasks');
    const done = panel.body.querySelector('.view-options__done');
    expect(done.textContent).toBe('Show tasks');
    models.tasks.setCounts({ shown: 12, total: 24 });
    expect(done.textContent).toBe('Show 12 tasks');
    models.tasks.setCounts({ shown: 1, total: 24 });
    expect(done.textContent).toBe('Show 1 task');
    done.click();
    expect(panel.close).toHaveBeenCalledTimes(1);
  });

  it('announces the task count after a change, and not for changes it did not make (VO-13)', async () => {
    await mount('tasks');
    const live = () => panel.element.querySelector('[data-live-region="polite"]').textContent;
    models.tasks.setCounts({ shown: 5, total: 9 });
    await new Promise((resolve) => setTimeout(resolve, 150));
    expect(live()).toBe('');
    models.tasks.subscribe(() => models.tasks.setCounts({ shown: 2, total: 9 }));
    toggle(panel.body.querySelector('[data-region="statuses"] input[value="completed"]'), true);
    await vi.waitFor(() => expect(live()).toBe('2 tasks'));
  });

  it('follows lists the store adds, keeping the checked ones', async () => {
    let listener;
    await mount('tasks');
    controller.destroy();
    panel.body.replaceChildren();
    let lists = LISTS;
    context.store = { listLists: async () => lists, subscribe: (callback) => {
      listener = callback; return () => {}; 
    } };
    controller = mountViewOptions(panel, { view: 'tasks', params: {} }, context);
    await vi.waitFor(() => expect(panel.body.querySelectorAll('[data-region="lists"] input')).toHaveLength(3));
    toggle(panel.body.querySelector('[data-region="lists"] input[value="l-work"]'), true);
    lists = [...LISTS, { id: 'l-trip', name: 'Trip' }];
    listener();
    await vi.waitFor(() => expect(panel.body.querySelectorAll('[data-region="lists"] input')).toHaveLength(4));
    expect(panel.body.querySelector('[data-region="lists"] input[value="l-work"]').checked).toBe(true);
  });
});
