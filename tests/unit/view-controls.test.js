// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NO_LIST } from '../../src/js/core/query.js';
import {
  createViewControls, defaultViewState, describeFilters, loadViewState, saveViewState,
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
  it('starts with the open status filter and due time ascending', () => {
    expect(loadViewState('tasks', () => memoryStorage())).toEqual({
      filter: { statuses: ['todo', 'in-progress'] },
      order: { field: 'due-time', direction: 'asc' },
    });
    expect(defaultViewState()).toEqual(loadViewState('tasks', () => memoryStorage()));
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

describe('createViewControls', () => {
  let controls;
  let onChange;

  beforeEach(() => {
    document.body.innerHTML = '';
    onChange = vi.fn();
    controls = createViewControls({ document, state: defaultViewState(), lists: LISTS, onChange });
    document.body.append(controls.element);
  });

  afterEach(() => {
    controls.destroy();
  });

  it('shows a chip per filter, with the active value, and a Filters button with the count', () => {
    const chips = [...document.querySelectorAll('.view-controls__chip.filter-chip')];
    expect(chips.map((chip) => chip.textContent.trim())).toEqual(['Lists', 'Status: open', 'Due', 'Created']);
    expect(chips.map((chip) => chip.getAttribute('aria-pressed'))).toEqual(['false', 'true', 'false', 'false']);
    expect(document.querySelector('.view-controls__filters').textContent.trim()).toBe('Filters 1');
    expect(document.querySelector('[data-shortcut="search"]').type).toBe('search');
  });

  it('changes the filter when a checkbox changes, in the chip popover and the Filters panel alike', () => {
    const lists = document.querySelector('.view-controls__chip[data-filter="lists"]');
    lists.click();
    const panel = document.getElementById(lists.getAttribute('aria-controls'));
    expect(panel.hidden).toBe(false);
    expect([...panel.querySelectorAll('.choice')].map((choice) => choice.textContent.trim())).toEqual(['Home', 'Work', 'In no list']);
    const home = panel.querySelector('input[value="l-home"]');
    home.checked = true;
    home.dispatchEvent(new Event('change', { bubbles: true }));
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ filter: { statuses: ['todo', 'in-progress'], lists: ['l-home'] } }));
    expect(lists.textContent.trim()).toBe('Lists: Home');
    const twin = document.querySelector('.view-controls__panel input[data-filter="lists"][value="l-home"]');
    expect(twin.checked).toBe(true);
    const done = document.querySelector('.view-controls__panel input[data-filter="statuses"][value="completed"]');
    done.checked = true;
    done.dispatchEvent(new Event('change', { bubbles: true }));
    expect(onChange.mock.lastCall[0].filter.statuses).toEqual(['todo', 'in-progress', 'completed']);
    expect(document.querySelector('.view-controls__filters').textContent.trim()).toBe('Filters 2');
  });

  it('sets a due date range and a created range from date fields', () => {
    const from = document.querySelector('.view-controls__chip-panel input[data-filter="due-from"]');
    from.value = '2026-11-01';
    from.dispatchEvent(new Event('change', { bubbles: true }));
    expect(onChange.mock.lastCall[0].filter.due).toEqual([{ from: '2026-11-01', to: null }]);
    const to = document.querySelector('.view-controls__chip-panel input[data-filter="created-to"]');
    to.value = '2026-11-30';
    to.dispatchEvent(new Event('change', { bubbles: true }));
    expect(onChange.mock.lastCall[0].filter.created).toEqual({ from: null, to: '2026-11-30' });
  });

  it('filters by search text once typing pauses, with one query for the whole word (TEC-16)', () => {
    vi.useFakeTimers();
    try {
      const search = document.querySelector('[data-shortcut="search"]');
      const calls = onChange.mock.calls.length;
      for (const text of ['p', 'pa', 'pai', 'paint']) {
        search.value = text;
        search.dispatchEvent(new Event('input', { bubbles: true }));
        vi.advanceTimersByTime(100);
      }
      expect(onChange.mock.calls.length).toBe(calls);
      vi.advanceTimersByTime(50);
      expect(onChange.mock.calls.length).toBe(calls + 1);
      expect(onChange.mock.lastCall[0].filter.text).toBe('paint');
    }
    finally {
      vi.useRealTimers();
    }
  });

  it('reports waiting search text at once on Enter, and once more on destroy', () => {
    vi.useFakeTimers();
    try {
      const search = document.querySelector('[data-shortcut="search"]');
      const calls = onChange.mock.calls.length;
      search.value = 'paint';
      search.dispatchEvent(new Event('input', { bubbles: true }));
      search.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      expect(onChange.mock.calls.length).toBe(calls + 1);
      expect(onChange.mock.lastCall[0].filter.text).toBe('paint');
      search.value = 'paints';
      search.dispatchEvent(new Event('input', { bubbles: true }));
      controls.destroy();
      expect(onChange.mock.calls.length).toBe(calls + 2);
      expect(onChange.mock.lastCall[0].filter.text).toBe('paints');
      vi.advanceTimersByTime(150);
      expect(onChange.mock.calls.length).toBe(calls + 2);
    }
    finally {
      vi.useRealTimers();
    }
  });

  it('clears every filter with Clear all, which shows only while a filter is active', () => {
    const clear = document.querySelector('.view-controls__clear');
    expect(clear.hidden).toBe(false);
    clear.click();
    expect(onChange.mock.lastCall[0].filter).toEqual({ statuses: [] });
    expect(clear.hidden).toBe(true);
    expect(document.querySelector('.view-controls__chip[data-filter="statuses"]').getAttribute('aria-pressed')).toBe('false');
  });

  it('changes the order from the Sort menu, fields and direction apart', () => {
    const sort = document.querySelector('.view-controls__sort');
    expect(sort.textContent.trim()).toBe('Sort: Due time');
    sort.click();
    const menu = document.getElementById(sort.getAttribute('aria-controls'));
    const items = [...menu.querySelectorAll('[role="menuitemradio"]')];
    expect(items.map((item) => item.textContent.trim())).toEqual(
      ['Due time', 'Created', 'Last activity', 'Status', 'Description', 'Ascending', 'Descending'],
    );
    expect(items.filter((item) => item.getAttribute('aria-checked') === 'true').map((item) => item.textContent.trim()))
      .toEqual(['Due time', 'Ascending']);
    items[4].click();
    expect(onChange.mock.lastCall[0].order).toEqual({ field: 'description', direction: 'asc' });
    sort.click();
    items[6].click();
    expect(onChange.mock.lastCall[0].order).toEqual({ field: 'description', direction: 'desc' });
    expect(sort.textContent.trim()).toBe('Sort: Description');
  });

  it('follows new lists and outside state changes', () => {
    controls.setLists([...LISTS, { id: 'l-trip', name: 'Trip' }]);
    expect(document.querySelectorAll('.view-controls__panel input[data-filter="lists"]')).toHaveLength(4);
    controls.setState({ filter: { statuses: ['cancelled'] }, order: { field: 'status', direction: 'desc' } });
    expect(document.querySelector('.view-controls__chip[data-filter="statuses"]').textContent.trim()).toBe('Status: cancelled');
    expect(document.querySelector('.view-controls__sort').textContent.trim()).toBe('Sort: Status');
  });
});
