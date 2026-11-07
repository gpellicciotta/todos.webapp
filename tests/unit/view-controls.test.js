// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NO_LIST } from '../../src/js/core/query.js';
import {
  createInfoLine, createSearchField, createViewModel, defaultViewState, describeFilters, describeInfoLine,
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
  };
}

const LISTS = [{ id: 'l-home', name: 'Home' }, { id: 'l-work', name: 'Work' }];

describe('view state per device (TV-12)', () => {
  it('starts with the open status filter and due time ascending, or manual order in a list view', () => {
    expect(loadViewState('tasks', () => memoryStorage())).toEqual({
      filter: { statuses: ['todo', 'in-progress'] },
      order: { field: 'due-time', direction: 'asc' },
    });
    expect(defaultViewState()).toEqual(loadViewState('tasks', () => memoryStorage()));
    expect(loadViewState('list', () => memoryStorage())).toEqual({
      filter: { statuses: ['todo', 'in-progress'] },
      order: { field: 'manual', direction: 'asc' },
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
    };
    saveViewState('tasks', state, () => storage);
    expect([...storage.data.keys()]).toEqual(['todos.view.tasks']);
    expect(loadViewState('tasks', () => storage)).toEqual(state);
  });

  it('keeps the search text out of the device storage', () => {
    const storage = memoryStorage();
    saveViewState('tasks', { filter: { statuses: [], text: 'paint' }, order: { field: 'status', direction: 'asc' } }, () => storage);
    expect(loadViewState('tasks', () => storage)).toEqual({ filter: { statuses: [] }, order: { field: 'status', direction: 'asc' } });
  });

  it('accepts manual order in a list view only', () => {
    const storage = memoryStorage();
    storage.setItem('todos.view.tasks', JSON.stringify({ order: { field: 'manual', direction: 'asc' } }));
    storage.setItem('todos.view.list', JSON.stringify({ order: { field: 'manual', direction: 'desc' } }));
    expect(loadViewState('tasks', () => storage).order).toEqual({ field: 'due-time', direction: 'asc' });
    expect(loadViewState('list', () => storage).order).toEqual({ field: 'manual', direction: 'asc' });
  });

  it('reads the order and status filter that the old list screen stored', () => {
    const storage = memoryStorage();
    storage.setItem('todos.view.list', JSON.stringify({ order: 'creation-time', statuses: ['completed'] }));
    expect(loadViewState('list', () => storage)).toEqual({
      filter: { statuses: ['completed'] },
      order: { field: 'creation-time', direction: 'desc' },
    });
    storage.setItem('todos.view.list', JSON.stringify({ order: 'manual', statuses: [] }));
    expect(loadViewState('list', () => storage)).toEqual({ filter: { statuses: [] }, order: { field: 'manual', direction: 'asc' } });
  });

  it('falls back to the defaults for broken, unknown, or unreachable storage', () => {
    const broken = memoryStorage();
    broken.setItem('todos.view.tasks', '{not json');
    expect(loadViewState('tasks', () => broken)).toEqual(defaultViewState());
    const odd = memoryStorage();
    odd.setItem('todos.view.tasks', JSON.stringify({ filter: { statuses: ['done', 'todo'], due: ['soon'] }, order: { field: 'size', direction: 'up' } }));
    expect(loadViewState('tasks', () => odd)).toEqual({ filter: { statuses: ['todo'] }, order: defaultViewState().order });
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
    expect(sorted('due-time', 'asc')).toEqual(['3 tasks', 'Status: open']);
    expect(sorted('description', 'asc')).toEqual(['3 tasks', 'Status: open', 'Sorted by Description']);
    expect(sorted('description', 'desc')).toEqual(['3 tasks', 'Status: open', 'Sorted by Description, descending']);
    expect(sorted('creation-time', 'desc')).toEqual(['3 tasks', 'Status: open', 'Sorted by Created']);
    expect(sorted('creation-time', 'asc')).toEqual(['3 tasks', 'Status: open', 'Sorted by Created, ascending']);
    expect(sorted('manual', 'asc', 'list')).toEqual(['3 tasks', 'Status: open']);
    expect(sorted('due-time', 'asc', 'list')).toEqual(['3 tasks', 'Status: open', 'Sorted by Due time']);
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
    expect(line.element.querySelector('.info-line__text').textContent).toBe('1 task · Status: open · Sorted by Due time');
  });
});

describe('createSearchField', () => {
  let field;
  let onChange;

  beforeEach(() => {
    document.body.innerHTML = '';
    onChange = vi.fn();
    field = createSearchField({ document, text: '', onChange });
    document.body.append(field.element);
  });

  afterEach(() => {
    field.destroy();
  });

  it('is a labelled search field that the / shortcut finds', () => {
    const input = document.querySelector('[data-shortcut="search"]');
    expect(input.type).toBe('search');
    expect(document.querySelector(`label[for="${input.id}"]`).textContent).toBe('Search tasks and notes');
  });

  it('reports the search text once typing pauses, with one query for the whole word (TEC-16)', () => {
    vi.useFakeTimers();
    try {
      const search = document.querySelector('[data-shortcut="search"]');
      for (const text of ['p', 'pa', 'pai', 'paint']) {
        search.value = text;
        search.dispatchEvent(new Event('input', { bubbles: true }));
        vi.advanceTimersByTime(100);
      }
      expect(onChange).not.toHaveBeenCalled();
      vi.advanceTimersByTime(50);
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenLastCalledWith('paint');
    }
    finally {
      vi.useRealTimers();
    }
  });

  it('reports waiting text at once on Enter, and once more on destroy', () => {
    vi.useFakeTimers();
    try {
      const search = document.querySelector('[data-shortcut="search"]');
      search.value = 'paint';
      search.dispatchEvent(new Event('input', { bubbles: true }));
      search.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      expect(onChange).toHaveBeenCalledTimes(1);
      search.value = 'paints';
      search.dispatchEvent(new Event('input', { bubbles: true }));
      field.destroy();
      expect(onChange).toHaveBeenCalledTimes(2);
      expect(onChange).toHaveBeenLastCalledWith('paints');
      vi.advanceTimersByTime(150);
      expect(onChange).toHaveBeenCalledTimes(2);
    }
    finally {
      vi.useRealTimers();
    }
  });

  it('shows text set from outside without reporting it', () => {
    field.setText('paint');
    expect(document.querySelector('[data-shortcut="search"]').value).toBe('paint');
    field.setText('');
    expect(document.querySelector('[data-shortcut="search"]').value).toBe('');
    expect(onChange).not.toHaveBeenCalled();
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
   * @returns {Promise<void>} resolves once the lists loaded
   */
  async function mount(view, lists = LISTS) {
    const element = document.body.appendChild(document.createElement('aside'));
    const body = element.appendChild(document.createElement('div'));
    panel = { element, body, document, setTitle: vi.fn(), close: vi.fn() };
    context = {
      store: { listLists: async () => lists, subscribe: () => () => {} },
      viewModels: models,
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

  it('titles the panel and holds Reset, the Filter rows, and Sort by, without Group by', async () => {
    await mount('tasks');
    expect(panel.setTitle).toHaveBeenCalledWith('View options');
    expect([...panel.body.querySelectorAll('.view-options__heading')].map((heading) => heading.textContent)).toEqual(['Filter', 'Sort by']);
    expect(panel.body.querySelector('.view-options__reset').textContent).toBe('Reset');
    const rows = [...panel.body.querySelectorAll('.view-options__row')];
    expect(rows.map((row) => row.dataset.row)).toEqual(['lists', 'statuses', 'due', 'created']);
    expect(rows.map((row) => row.querySelector('.view-options__value').textContent)).toEqual(['All', 'open', 'Any', 'Any']);
  });

  it('offers no Lists row in a list view, and Manual order as the first sort choice (LV-6)', async () => {
    await mount('list');
    expect([...panel.body.querySelectorAll('.view-options__row')].map((row) => row.dataset.row)).toEqual(['statuses', 'due', 'created']);
    const options = [...panel.body.querySelectorAll('select option')].map((option) => option.textContent);
    expect(options).toEqual(['Manual order', 'Due time', 'Created', 'Last activity', 'Status', 'Description']);
    expect(panel.body.querySelector('select').value).toBe('manual');
  });

  it('offers five sort fields in All tasks, starting at Due time ascending', async () => {
    await mount('tasks');
    expect([...panel.body.querySelectorAll('select option')].map((option) => option.textContent))
      .toEqual(['Due time', 'Created', 'Last activity', 'Status', 'Description']);
    expect(panel.body.querySelector('select').value).toBe('due-time');
    expect(panel.body.querySelector('input[name$="direction"]:checked').value).toBe('asc');
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
    expect(panel.body.querySelector('select').value).toBe('due-time');
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
