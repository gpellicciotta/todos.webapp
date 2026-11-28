/**
 * View options of the task views: the info line, and the View options panel.
 *
 * All tasks and every list view share one set of options: filters, a grouping, and a sort (`VO-1`). The view model holds
 * them, stores them through preferences.js, which syncs them with the account while connected (`TV-12`, `SYN-13`), and tells
 * the screen and the panel about changes; the search text from the add field stays out of storage, so a reload never hides
 * tasks behind forgotten text. Options downloaded while the panel of their view is open apply once it closes.
 * The info line under the add bar names the count and every active option (`VO-7`) and offers Reset (`VO-8`).
 * The panel opens in the editor panel from the More menu (`VO-4`, `VO-5`) with Reset, the Filter rows, Group by, and Sort by.
 * Manual order is a sort of the list view, and of All tasks while it groups by list, where each list group keeps its own order.
 */

import { OPEN_STATUSES, STATUSES } from '../core/occurrences.js';
import { onSettingsChange, PREFIX, readPreference, removePreference, touchesSetting, writePreference } from '../core/preferences.js';
import { DEFAULT_FILTER, DEFAULT_ORDER, DUE_OPTIONS, GROUPINGS, NO_LIST, SORT_FIELDS } from '../core/query.js';
import { createLiveRegion } from '../../vendor/design/js/live-region.js';
import { spriteIcon, STATUS_LABELS } from './task-list.js';
import { make } from '../ui/dom.js';

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const MANUAL = 'manual';
const NONE = 'none';
let instances = 0;

/** Control strings, for the strings module of TEC-13 to absorb. */
const STRINGS = Object.freeze({
  searchValue: 'Search',
  title: 'View options',
  reset: 'Reset',
  filter: 'Filter',
  sortBy: 'Sort by',
  groupBy: 'Group by',
  groupedBy: (group) => `Grouped by ${group}`,
  direction: 'Direction',
  asc: 'Ascending',
  desc: 'Descending',
  ascending: 'ascending',
  descending: 'descending',
  open: 'open',
  all: 'All',
  any: 'Any',
  shared: 'Shared',
  notShared: 'Not shared',
  noList: 'In no list',
  from: 'From',
  to: 'To',
  lists: (count) => `${count} lists`,
  statuses: (count) => `${count} statuses`,
  options: (count) => `${count} options`,
  finishedToday: 'Finished today only',
  finishedTodayValue: (value) => `${value}, finished today`,
  sortedBy: (field) => `Sorted by ${field}`,
  tasks: (count) => `${count} ${count === 1 ? 'task' : 'tasks'}`,
  tasksOf: (shown, total) => `${shown} of ${total} ${total === 1 ? 'task' : 'tasks'}`,
  show: (counts) => (counts ? `Show ${counts.shown} ${counts.shown === 1 ? 'task' : 'tasks'}` : 'Show tasks'),
});

/** The filters with a row in the panel, in display order; the Lists and Shared filters are for All tasks only (`TV-7`). */
const FILTERS = Object.freeze([
  { key: 'lists', label: 'Lists' },
  { key: 'statuses', label: 'Status' },
  { key: 'due', label: 'Due' },
  { key: 'created', label: 'Created' },
  { key: 'shared', label: 'Shared' },
]);

/** Sort field names, with Manual order for the list view (`LV-6`). */
export const FIELD_LABELS = Object.freeze({
  [MANUAL]: 'Manual order', 'due-time': 'Due time', 'creation-time': 'Created', 'last-update-time': 'Last update',
  status: 'Status', description: 'Description',
});

/** The direction a field starts with: Due, Status, and Description ascend; Created and Last update show the newest first. */
export const NATURAL_DIRECTION = Object.freeze({
  [MANUAL]: 'asc', 'due-time': 'asc', 'creation-time': 'desc', 'last-update-time': 'desc', status: 'asc', description: 'asc',
});

/** The groupings with a control, by kind of view; a list view cannot group by list (`LV-11`). */
const GROUPINGS_OF = Object.freeze({ tasks: GROUPINGS, list: Object.freeze(GROUPINGS.filter((group) => group !== 'list')) });

/**
 * Name the sort fields a view offers: Manual order comes first in a list view, and in All tasks while it groups by list.
 * @param {'tasks'|'list'} kind the kind of view
 * @param {string} [group] the grouping
 * @returns {string[]} the sort fields
 */
function sortFieldsOf(kind, group) {
  return kind === 'list' || group === 'list' ? [MANUAL, ...SORT_FIELDS] : SORT_FIELDS;
}

/** Grouping names, for the Group by control and the info line (`VO-9`, `VO-7`). */
export const GROUP_LABELS = Object.freeze({ [NONE]: 'None', list: 'List', due: 'Due date', status: 'Status' });

const DUE_LABELS = Object.freeze({ overdue: 'Overdue', today: 'Today', 'this-week': 'This week', none: 'No due time' });

/**
 * Name the kind of a view: All tasks, or a list view.
 * @param {string} view the view key, `tasks`, `list`, or `list.{{list-id}}`
 * @returns {'tasks'|'list'} the kind
 */
function kindOf(view) {
  return view === 'list' || view.startsWith('list.') ? 'list' : 'tasks';
}

/**
 * Return the default view state: every status, created newest first, or manual order in a list view (`LV-10`, `TV-13`).
 * @param {'tasks'|'list'} [kind] the kind of view
 * @returns {{filter: object, order: {field: string, direction: string}, group: string}} a new state, ungrouped
 */
export function defaultViewState(kind = 'tasks') {
  return {
    filter: { statuses: [...DEFAULT_FILTER.statuses] }, order: kind === 'list' ? { field: MANUAL, direction: 'asc' } : { ...DEFAULT_ORDER }, group: NONE,
  };
}

/**
 * Read a `{from, to}` range of date-only strings, dropping other values.
 * @param {unknown} value the stored value
 * @returns {{from: string|null, to: string|null}|null} the range, or null without a bound
 */
function readRange(value) {
  if (!value || typeof value !== 'object') {
    return null;
  }
  const from = DATE.test(value.from) ? value.from : null;
  const to = DATE.test(value.to) ? value.to : null;
  return from || to ? { from, to } : null;
}

/**
 * Keep the valid parts of a stored view state and fill the rest with the defaults.
 * The List screen of v0.1.0 stored `{order, statuses}`; that shape still reads.
 * Views stored before the lifecycle rules read `todo` as `ready` and `last-activity-time` as `last-update-time`.
 * @param {unknown} raw the stored value
 * @param {'tasks'|'list'} [kind] the kind of view
 * @returns {{filter: object, order: object, group: string}} the view state, without search text
 */
export function sanitizeViewState(raw, kind = 'tasks') {
  const state = defaultViewState(kind);
  if (!raw || typeof raw !== 'object') {
    return state;
  }
  const old = typeof raw.order === 'string' && !raw.filter;
  const stored = old ? { statuses: raw.statuses } : raw.filter;
  const renamed = (field) => (field === 'last-activity-time' ? 'last-update-time' : field);
  const order = old ? { field: renamed(raw.order), direction: NATURAL_DIRECTION[renamed(raw.order)] } : raw.order && { ...raw.order, field: renamed(raw.order.field) };
  if (stored && typeof stored === 'object') {
    state.filter = {};
    if (Array.isArray(stored.statuses)) {
      state.filter.statuses = [...new Set(stored.statuses.map((status) => (status === 'todo' ? 'ready' : status)))].filter((status) => STATUSES.includes(status));
    }

    if (stored.finishedToday === true) {
      state.filter.finishedToday = true;
    }
    // Show upcoming is on by default, so only the choice to hide them is stored (`TV-15`).
    if (stored.showUpcoming === false) {
      state.filter.showUpcoming = false;
    }
    const lists = Array.isArray(stored.lists) ? stored.lists.filter((id) => typeof id === 'string') : [];
    if (lists.length > 0) {
      state.filter.lists = lists;
    }
    const due = Array.isArray(stored.due)
      ? stored.due.map((option) => (typeof option === 'string' ? (DUE_OPTIONS.includes(option) ? option : null) : readRange(option)))
        .filter(Boolean)
      : [];
    if (due.length > 0) {
      state.filter.due = due;
    }
    const created = readRange(stored.created);
    if (created) {
      state.filter.created = created;
    }
    if (typeof stored.shared === 'boolean') {
      state.filter.shared = stored.shared;
    }
  }
  if (GROUPINGS_OF[kind].includes(raw.group)) {
    state.group = raw.group;
  }
  if (order && sortFieldsOf(kind, state.group).includes(order.field) && ['asc', 'desc'].includes(order.direction)) {
    state.order = { field: order.field, direction: order.field === MANUAL ? 'asc' : order.direction };
  }
  return state;
}

/**
 * Read the stored filters, grouping, and order of a view (`TV-12`).
 * @param {string} view the view key, `tasks` or `list.{{list-id}}`
 * @param {() => Storage} [getStorage] returns the storage, `localStorage` by default
 * @returns {{filter: object, order: object, group: string}} the view state
 */
export function loadViewState(view, getStorage) {
  return sanitizeViewState(readPreference(`view.${view}`, null, getStorage), kindOf(view));
}

/**
 * Store the filters, grouping, and order of a view, leaving out the search text.
 * @param {string} view the view key, `tasks` or `list.{{list-id}}`
 * @param {{filter: object, order: object, group: string}} state the view state
 * @param {() => Storage} [getStorage] returns the storage, `localStorage` by default
 * @returns {boolean} true when stored
 */
export function saveViewState(view, state, getStorage) {
  const filter = { ...state.filter };
  delete filter.text;
  return writePreference(`view.${view}`, { filter, order: state.order, group: state.group ?? NONE }, getStorage);
}

/**
 * Forget the stored options of a view, so it shows the defaults again.
 * @param {string} view the view key, `tasks` or `list.{{list-id}}`
 * @param {() => Storage} [getStorage] returns the storage, `localStorage` by default
 * @returns {boolean} true when removed
 */
export function clearViewState(view, getStorage) {
  return removePreference(`view.${view}`, getStorage);
}

/**
 * Tell whether every option and the search text have their default values (`VO-8`).
 * @param {{filter: object, order: object, group: string}} state the view state
 * @param {'tasks'|'list'} [kind] the kind of view
 * @returns {boolean} true when Reset would change nothing
 */
export function isDefaultViewState(state, kind = 'tasks') {
  const { filter, order } = state;
  const fallback = defaultViewState(kind).order;
  const statuses = filter.statuses ?? [];
  return !(typeof filter.text === 'string' && filter.text.trim())
    && hasExactly(statuses, DEFAULT_FILTER.statuses) && filter.finishedToday !== true && filter.showUpcoming !== false
    && !filter.lists?.length && !filter.due?.length && !filter.created && typeof filter.shared !== 'boolean'
    && (state.group ?? NONE) === NONE
    && order.field === fallback.field && (order.field === MANUAL || order.direction === fallback.direction);
}

/**
 * Tell whether a list of statuses holds exactly the given ones, in any order.
 * @param {string[]} values the statuses
 * @param {readonly string[]} expected the statuses to match
 * @returns {boolean} true when both hold the same statuses
 */
function hasExactly(values, expected) {
  return values.length === expected.length && expected.every((status) => values.includes(status));
}

/**
 * Describe a date range.
 * @param {{from: string|null, to: string|null}} range the range
 * @returns {string} the text, such as `from 2026-11-01`
 */
function rangeText({ from, to }) {
  if (from && to) {
    return `${from} to ${to}`;
  }
  return from ? `from ${from}` : `until ${to}`;
}

/**
 * Return the value text of the Status filter, or null when it shows every status: all four checked, or none.
 * Finished today only adds `, finished today`, also to a filter of every status, which then reads `all` (`TV-14`).
 * @param {object} filter the filter
 * @returns {string|null} the value text, such as `open` or `3 statuses, finished today`
 */
function statusValue(filter) {
  const values = Array.isArray(filter.statuses) ? filter.statuses : [];
  let value = null;
  if (hasExactly(values, OPEN_STATUSES)) {
    value = STRINGS.open;
  }
  else if (values.length > 0 && !hasExactly(values, STATUSES)) {
    value = values.length === 1 ? STATUS_LABELS[values[0]].toLowerCase() : STRINGS.statuses(values.length);
  }
  if (filter.finishedToday === true) {
    return STRINGS.finishedTodayValue(value ?? STRINGS.all.toLowerCase());
  }
  return value;
}

/**
 * Return the value text of one filter, or null when the filter is off.
 * @param {string} key the filter key
 * @param {object} filter the filter
 * @param {object[]} lists the live lists
 * @param {boolean} [capital] start the text with an uppercase letter, as a panel row does; list names stay as typed
 * @returns {string|null} the value text
 */
function filterValue(key, filter, lists, capital = false) {
  const value = valueText(key, filter, lists, capital);
  return capital && value && key !== 'lists' ? `${value.charAt(0).toUpperCase()}${value.slice(1)}` : value;
}

/**
 * Return the value text of one filter in lowercase, apart from list names, or null when the filter is off.
 * @param {string} key the filter key
 * @param {object} filter the filter
 * @param {object[]} lists the live lists
 * @param {boolean} capital name In no list with its uppercase letter
 * @returns {string|null} the value text
 */
function valueText(key, filter, lists, capital) {
  if (key === 'statuses') {
    return statusValue(filter);
  }
  const values = filter[key];
  if (key === 'shared') {
    return typeof values === 'boolean' ? (values ? 'yes' : 'no') : null;
  }
  if (key === 'created') {
    return values ? rangeText(values) : null;
  }
  if (!Array.isArray(values) || values.length === 0) {
    return null;
  }
  if (key === 'lists') {
    const noList = capital ? STRINGS.noList : STRINGS.noList.toLowerCase();
    const names = values.map((id) => (id === NO_LIST ? noList : lists.find((list) => list.id === id)?.name))
      .filter(Boolean);
    // A stored filter of deleted lists filters nothing, so it shows no value.
    if (names.length === 0) {
      return null;
    }
    return names.length === 1 ? names[0] : STRINGS.lists(names.length);
  }
  if (values.length > 1) {
    return STRINGS.options(values.length);
  }
  return typeof values[0] === 'string' ? DUE_LABELS[values[0]].toLowerCase() : rangeText(values[0]);
}

/**
 * Name the active filters, such as `Status: open`, for the info line and empty results.
 * A status filter of every status hides nothing, so it goes unnamed unless Finished today only narrows it.
 * @param {object} filter the filter, with optional search text
 * @param {object[]} lists the live lists
 * @returns {string[]} the descriptions: search first, then the filters in display order
 */
export function describeFilters(filter, lists) {
  const text = typeof filter.text === 'string' ? filter.text.trim() : '';
  const parts = text ? [`${STRINGS.searchValue}: ${text}`] : [];
  for (const { key, label } of FILTERS) {
    const value = filterValue(key, filter, lists);
    if (value) {
      parts.push(`${label}: ${value}`);
    }
  }
  return parts;
}

/**
 * Describe a sort that differs from the default of its view, or return null.
 * @param {{field: string, direction: string}} order the order
 * @param {'tasks'|'list'} kind the kind of view
 * @returns {string|null} the text, such as `Sorted by Description, descending`
 */
function describeSort(order, kind) {
  const fallback = defaultViewState(kind).order;
  if (order.field === fallback.field && (order.field === MANUAL || order.direction === fallback.direction)) {
    return null;
  }
  const unusual = order.direction !== NATURAL_DIRECTION[order.field];
  const direction = unusual ? `, ${order.direction === 'asc' ? STRINGS.ascending : STRINGS.descending}` : '';
  return `${STRINGS.sortedBy(FIELD_LABELS[order.field])}${direction}`;
}

/**
 * Describe a view for the info line: the count, each active filter, the grouping, and a sort other than the default (`VO-7`).
 * @param {object} view what the view shows
 * @param {number} view.shown the tasks the options show
 * @param {number} view.total the tasks of the view
 * @param {{filter: object, order: object, group: string}} view.state the view state, with optional search text
 * @param {object[]} view.lists the live lists
 * @param {'tasks'|'list'} [view.kind] the kind of view
 * @returns {string[]} the parts, such as `12 of 24 tasks` and `Status: open`
 */
export function describeInfoLine({ shown, total, state, lists, kind = 'tasks' }) {
  const parts = [shown === total ? STRINGS.tasks(total) : STRINGS.tasksOf(shown, total)];
  parts.push(...describeFilters(state.filter, lists));
  if (state.group && state.group !== NONE) {
    parts.push(STRINGS.groupedBy(GROUP_LABELS[state.group]));
  }
  const sort = describeSort(state.order, kind);
  if (sort) {
    parts.push(sort);
  }
  return parts;
}

/**
 * Copy a view state, so callers never share its arrays.
 * @param {{filter: object, order: object, group: string}} state the view state
 * @returns {{filter: object, order: object, group: string}} the copy
 */
function copy(state) {
  return structuredClone(state);
}

/**
 * Create the view model of a view: its stored options, which follow the account while connected, and the counts of its screen.
 * The screen and the panel share it, so the rows, the info line, and the panel follow one state.
 * The list model holds the options of one list at a time: `select` switches to another list, which keeps its own entry (`TV-12`).
 * @param {string} view the view key, `tasks` or `list`
 * @param {() => Storage} [getStorage] returns the storage, `localStorage` by default
 * @returns {{kind: string, get: Function, set: Function, select: Function, hold: Function, reset: Function, subscribe: Function,
 *   counts: Function, setCounts: Function, subscribeCounts: Function}} the model
 */
export function createViewModel(view, getStorage) {
  const kind = kindOf(view);
  // A list model has no entry to read or write until a list is selected.
  let key = kind === 'list' ? null : view;
  let selected = null;
  let state = key ? loadViewState(key, getStorage) : defaultViewState(kind);
  let counts = null;
  let holds = 0;
  let waiting = false;
  const listeners = new Set();
  const countListeners = new Set();

  /** Tell every listener about the state. */
  function notify() {
    [...listeners].forEach((listener) => listener(state));
  }

  /** Read the stored options again after a download or a write in another tab, keeping the search text. */
  function reload() {
    const text = state.filter.text;
    state = loadViewState(key, getStorage);
    if (text !== undefined) {
      state.filter.text = text;
    }
    notify();
  }

  // Downloaded options apply at once, or once the View options panel closes, so they never move the user's focus (`SYN-13`).
  onSettingsChange((names) => {
    if (key && touchesSetting(names, `${PREFIX}view.${key}`)) {
      waiting = holds > 0;
      if (!waiting) {
        reload();
      }
    }
  });

  /**
   * Keep a new state: on this device, and with every listener.
   * @param {{filter: object, order: object, group: string}} next the view state
   */
  function set(next) {
    state = copy(next);
    if (key) {
      saveViewState(key, state, getStorage);
    }
    notify();
  }

  return {
    kind,

    /**
     * Switch a list model to the options of a list: its stored entry, or the defaults, without the search text of the last list.
     * @param {string} listId the list
     */
    select(listId) {
      if (kind !== 'list' || listId === selected) {
        return;
      }
      selected = listId;
      key = `list.${listId}`;
      waiting = false;
      state = loadViewState(key, getStorage);
      notify();
    },

    /**
     * Hold downloaded options of this view while its View options panel is open.
     * @returns {() => void} releases the hold; the last release applies an options download that waited
     */
    hold() {
      holds += 1;
      let released = false;
      return () => {
        if (released) {
          return;
        }
        released = true;
        holds -= 1;
        if (holds === 0 && waiting) {
          waiting = false;
          reload();
        }
      };
    },

    /**
     * Read the state; treat it as read-only and call `set` to change it.
     * @returns {{filter: object, order: object, group: string}} the view state
     */
    get: () => state,
    set,

    /** Restore every option and the search text to their defaults, and forget the entry of the list (`VO-8`). */
    reset() {
      state = defaultViewState(kind);
      if (key && kind === 'list') {
        clearViewState(key, getStorage);
      }
      else if (key) {
        saveViewState(key, state, getStorage);
      }
      notify();
    },

    /**
     * Follow state changes.
     * @param {(state: object) => void} listener called after each change
     * @returns {() => void} stops following
     */
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    /**
     * Read the counts of the last render.
     * @returns {{shown: number, total: number}|null} the counts, or null before the screen rendered
     */
    counts: () => counts,

    /**
     * Report the counts of a render, which the panel shows and announces.
     * @param {{shown: number, total: number}} next the counts
     */
    setCounts(next) {
      counts = next;
      [...countListeners].forEach((listener) => listener(counts));
    },

    /**
     * Follow the counts.
     * @param {(counts: object) => void} listener called after each render
     * @returns {() => void} stops following
     */
    subscribeCounts(listener) {
      countListeners.add(listener);
      return () => countListeners.delete(listener);
    },
  };
}

/**
 * Create a button.
 * @param {Document} doc the document
 * @param {string} className the class
 * @param {string} [text] the text
 * @returns {HTMLButtonElement} the button
 */
function button(doc, className, text) {
  const element = make(doc, 'button', className, text);
  element.type = 'button';
  return element;
}

/**
 * Create the info line: a quiet line of the count and the active options, ending with Reset (`VO-7`, `VO-8`).
 * @param {object} options line options
 * @param {Document} [options.document] the document
 * @param {() => void} options.onReset called when the user picks Reset
 * @returns {{element: HTMLElement, update: Function}} the info line
 */
export function createInfoLine({ document: doc = globalThis.document, onReset }) {
  const element = make(doc, 'div', 'info-line');
  const text = make(doc, 'p', 'info-line__text');
  const reset = button(doc, 'button button--quiet info-line__reset', STRINGS.reset);
  reset.addEventListener('click', onReset);
  element.append(text, reset);
  return {
    element,

    /**
     * Show the view as it is now.
     * @param {object} view what the view shows, as for `describeInfoLine`
     */
    update(view) {
      text.textContent = describeInfoLine(view).join(' · ');
      reset.hidden = isDefaultViewState(view.state, view.kind);
    },
  };
}

/**
 * Mount the View options into the editor panel (`VO-5`, `VO-6`).
 * Changes apply at once. The panel holds Reset, the Filter rows with one open at a time, Group by, and Sort by;
 * the list view groups by due date or status, not by list (`LV-11`). A polite live region announces the count after each change (`VO-13`).
 * Group by and Sort by are selects; Sort by offers Manual order while the view allows it, and leaving the List grouping
 * of All tasks also leaves Manual order for the default sort.
 * @param {object} panel the editor panel
 * @param {HTMLElement} panel.element the panel element
 * @param {HTMLElement} panel.body the body to fill
 * @param {Document} panel.document the document
 * @param {(title: string) => void} panel.setTitle sets the panel title
 * @param {() => void} panel.close leaves the view options route
 * @param {{view: string}} route the route
 * @param {object} context what the editors share
 * @param {{listLists: Function, subscribe: Function}} context.store the store facade
 * @param {{tasks: object, list: object}} context.viewModels the view models
 * @returns {{destroy: () => void}} the controller
 */
export function mountViewOptions(panel, route, context) {
  const doc = panel.document;
  const kind = kindOf(route.view);
  const model = context.viewModels[kind];
  if (kind === 'list' && route.params?.listId) {
    model.select(route.params.listId);
  }
  const id = `view-options-${(instances += 1)}`;
  let lists = [];
  let announceNext = false;
  let destroyed = false;
  panel.setTitle(STRINGS.title);

  const root = make(doc, 'div', 'view-options');
  const reset = button(doc, 'button button--secondary view-options__reset', STRINGS.reset);
  // The content scrolls and the Show button stays below it, so the button never covers a control.
  const content = make(doc, 'div', 'view-options__content');
  content.append(make(doc, 'div', 'view-options__top'));
  content.firstElementChild.append(reset);

  /**
   * Create a checkbox choice.
   * @param {string} key the filter key
   * @param {string} value the value
   * @param {string} text the label
   * @returns {HTMLLabelElement} the choice
   */
  function choice(key, value, text) {
    const label = make(doc, 'label', 'choice');
    const input = doc.createElement('input');
    input.type = 'checkbox';
    input.dataset.filter = key;
    input.value = value;
    label.append(input, ` ${text}`);
    return label;
  }

  /**
   * Create a pair of date fields for a range.
   * @param {string} key `due` or `created`
   * @returns {HTMLElement} the fields
   */
  function rangeFields(key) {
    const range = make(doc, 'div', 'view-options__range');
    for (const [end, text] of [['from', STRINGS.from], ['to', STRINGS.to]]) {
      const field = make(doc, 'div', 'field');
      const label = make(doc, 'label', 'field__label', text);
      const input = make(doc, 'input', 'field__control');
      input.type = 'date';
      input.id = `${id}-${key}-${end}`;
      input.dataset.filter = `${key}-${end}`;
      label.htmlFor = input.id;
      field.append(label, input);
      range.append(field);
    }
    return range;
  }

  /**
   * Create the choices of one filter row.
   * @param {string} key the filter key
   * @returns {HTMLElement[]} the choices, with date fields where the filter has a range
   */
  function choicesOf(key) {
    if (key === 'statuses') {
      // Finished today only narrows Completed and Cancelled, so it is a toggle of its own, not a status value (`TV-14`).
      const finishedToday = choice(key, 'true', STRINGS.finishedToday);
      const input = finishedToday.firstElementChild;
      delete input.dataset.filter;
      input.dataset.toggle = 'finishedToday';
      return [...STATUSES.map((status) => choice(key, status, STATUS_LABELS[status])), finishedToday];
    }
    if (key === 'due') {
      return [...DUE_OPTIONS.map((option) => choice(key, option, DUE_LABELS[option])), rangeFields(key)];
    }
    if (key === 'shared') {
      return [['any', STRINGS.any], ['true', STRINGS.shared], ['false', STRINGS.notShared]].map(([value, text]) => {
        const label = choice(key, value, text);
        const input = label.firstElementChild;
        input.type = 'radio';
        input.name = `${id}-shared`;
        return label;
      });
    }
    return key === 'created' ? [rangeFields(key)] : [];
  }

  const connected = () => Boolean(context.session) && context.session.state() !== 'local';
  const rows = new Map();
  const accordion = make(doc, 'div', 'view-options__rows');
  for (const { key, label } of FILTERS.filter(({ key: filterKey }) => (filterKey !== 'lists' && filterKey !== 'shared') || kind === 'tasks')) {
    const row = button(doc, 'view-options__row');
    row.dataset.row = key;
    row.setAttribute('aria-expanded', 'false');
    row.setAttribute('aria-controls', `${id}-${key}`);
    const region = make(doc, 'div', 'choice-group view-options__region');
    region.id = `${id}-${key}`;
    region.dataset.region = key;
    region.setAttribute('role', 'group');
    region.setAttribute('aria-label', label);
    region.hidden = true;
    region.append(...choicesOf(key));
    accordion.append(row, region);
    rows.set(key, { row, region, label });
  }

  /**
   * Fill a select with options, unless it already holds them.
   * @param {HTMLSelectElement} target the select
   * @param {string[]} values the option values, in order
   * @param {Record<string, string>} labels the option labels by value
   */
  function fillSelect(target, values, labels) {
    if ([...target.options].map((option) => option.value).join() === values.join()) {
      return;
    }
    target.replaceChildren(...values.map((value) => {
      const option = doc.createElement('option');
      option.value = value;
      option.textContent = labels[value];
      return option;
    }));
  }

  const groupings = GROUPINGS_OF[kind];
  const groupHeading = make(doc, 'h3', 'view-options__heading', STRINGS.groupBy);
  groupHeading.id = `${id}-group`;
  const groupSelect = make(doc, 'select', 'field__control view-options__group');
  groupSelect.setAttribute('aria-labelledby', groupHeading.id);
  fillSelect(groupSelect, groupings, GROUP_LABELS);

  const sortHeading = make(doc, 'h3', 'view-options__heading', STRINGS.sortBy);
  sortHeading.id = `${id}-sort`;
  const select = make(doc, 'select', 'field__control view-options__sort');
  select.setAttribute('aria-labelledby', sortHeading.id);
  const directions = make(doc, 'fieldset', 'segmented view-options__direction');
  const segments = make(doc, 'div', 'segmented__options');
  for (const value of ['asc', 'desc']) {
    const label = make(doc, 'label', 'segmented__option');
    const input = doc.createElement('input');
    input.type = 'radio';
    input.name = `${id}-direction`;
    input.value = value;
    label.append(input, STRINGS[value]);
    segments.append(label);
  }
  directions.append(make(doc, 'legend', 'visually-hidden', STRINGS.direction), segments);

  const done = button(doc, 'button view-options__done');
  content.append(make(doc, 'h3', 'view-options__heading', STRINGS.filter), accordion);
  if (groupings.length > 1) {
    content.append(groupHeading, groupSelect);
  }
  content.append(sortHeading, select, directions);
  root.append(content, done);
  panel.body.replaceChildren(root);
  const announcer = createLiveRegion({ document: doc, parent: panel.element });

  /** Fill the Lists choices with the current lists and In no list, keeping focus on a focused choice. */
  function fillLists() {
    const region = rows.get('lists')?.region;
    if (!region) {
      return;
    }
    const focused = doc.activeElement;
    const value = region.contains(focused) ? focused.value : null;
    region.replaceChildren(...lists.map((list) => choice('lists', list.id, list.name)), choice('lists', NO_LIST, STRINGS.noList));
    sync();
    if (value !== null) {
      [...region.querySelectorAll('input')].find((input) => input.value === value)?.focus();
    }
  }

  /** Show the state in every control. */
  function sync() {
    const state = model.get();
    for (const [key, { row, region, label }] of rows) {
      if (key === 'shared') {
        row.hidden = !connected();
        region.hidden = region.hidden || !connected();
      }
      const shared = typeof state.filter.shared === 'boolean' ? (state.filter.shared ? STRINGS.shared : STRINGS.notShared) : null;
      const value = (key === 'shared' ? shared : filterValue(key, state.filter, lists, true)) ?? (key === 'lists' || key === 'statuses' ? STRINGS.all : STRINGS.any);
      row.replaceChildren(make(doc, 'span', 'view-options__label', label), make(doc, 'span', 'view-options__value', value),
        spriteIcon(doc, 'chevron-down'));
    }
    const dueRange = state.filter.due?.find((option) => typeof option === 'object') ?? {};
    for (const input of root.querySelectorAll('input[data-toggle="finishedToday"]')) {
      input.checked = state.filter.finishedToday === true;
    }
    for (const input of root.querySelectorAll('input[data-filter]')) {
      const key = input.dataset.filter;
      if (input.type === 'checkbox') {
        input.checked = (state.filter[key] ?? []).includes(input.value);
      }
      else if (input.type === 'radio') {
        input.checked = input.value === String(state.filter.shared ?? 'any');
      }
      else {
        const [filterKey, end] = key.split('-');
        input.value = (filterKey === 'due' ? dueRange[end] : state.filter.created?.[end]) ?? '';
      }
    }
    groupSelect.value = state.group ?? NONE;
    fillSelect(select, sortFieldsOf(kind, state.group), FIELD_LABELS);
    select.value = state.order.field;
    for (const input of directions.querySelectorAll('input')) {
      input.checked = input.value === state.order.direction;
      input.disabled = state.order.field === MANUAL;
    }
    done.textContent = STRINGS.show(model.counts());
  }

  /**
   * Set a filter, removing it when it has no value; an empty status filter stays, meaning every status.
   * @param {object} filter the filter to change
   * @param {string} key the filter key
   * @param {unknown} value the value
   */
  function setFilter(filter, key, value) {
    const empty = value === null || value === undefined || value === '' || (Array.isArray(value) && value.length === 0);
    if (empty && key !== 'statuses') {
      delete filter[key];
    }
    else {
      filter[key] = empty ? [] : value;
    }
  }

  /**
   * Apply a change of the user, and announce the count that follows.
   * @param {(state: {filter: object, order: object, group: string}) => void} change edits a copy of the state
   */
  function apply(change) {
    const next = copy(model.get());
    change(next);
    announceNext = true;
    model.set(next);
    announceNext = false;
  }

  for (const { row } of rows.values()) {
    row.addEventListener('click', () => {
      const open = row.getAttribute('aria-expanded') !== 'true';
      for (const other of rows.values()) {
        other.row.setAttribute('aria-expanded', String(other.row === row && open));
        other.region.hidden = !(other.row === row && open);
      }
    });
  }
  root.addEventListener('change', (event) => {
    const input = event.target;
    const key = input.dataset?.filter;
    if (key) {
      apply(({ filter }) => {
        if (input.type === 'radio') {
          setFilter(filter, 'shared', input.value === 'any' ? null : input.value === 'true');
          return;
        }
        if (input.type === 'checkbox') {
          const values = (filter[key] ?? []).filter((value) => value !== input.value);
          setFilter(filter, key, input.checked ? [...values, input.value] : values);
          return;
        }
        const [filterKey, end] = key.split('-');
        const value = DATE.test(input.value) ? input.value : null;
        if (filterKey === 'created') {
          setFilter(filter, 'created', readRange({ ...filter.created, [end]: value }));
          return;
        }
        const options = filter.due ?? [];
        const range = readRange({ ...options.find((option) => typeof option === 'object'), [end]: value });
        setFilter(filter, 'due', [...options.filter((option) => typeof option === 'string'), ...(range ? [range] : [])]);
      });
    }
    else if (input.dataset?.toggle === 'finishedToday') {
      apply(({ filter }) => {
        if (input.checked) {
          filter.finishedToday = true;
        }
        else {
          delete filter.finishedToday;
        }
      });
    }
    else if (input === select) {
      apply((state) => {
        state.order = { field: select.value, direction: NATURAL_DIRECTION[select.value] };
      });
    }
    else if (input === groupSelect) {
      apply((state) => {
        state.group = groupSelect.value;
        if (!sortFieldsOf(kind, state.group).includes(state.order.field)) {
          state.order = defaultViewState(kind).order;
        }
      });
    }
    else if (input.name === `${id}-direction`) {
      apply((state) => {
        state.order = { field: state.order.field, direction: input.value };
      });
    }
  });
  reset.addEventListener('click', () => {
    announceNext = true;
    model.reset();
    announceNext = false;
  });
  done.addEventListener('click', () => panel.close());

  const stops = [
    model.hold(),
    model.subscribe(sync),
    ...(context.session?.subscribe ? [context.session.subscribe(sync)] : []),
    model.subscribeCounts((counts) => {
      done.textContent = STRINGS.show(counts);
      if (announceNext) {
        announceNext = false;
        announcer.announce(STRINGS.tasks(counts.shown));
      }
    }),
  ];

  /** Read the live lists of the Lists filter, in the order the screens show them. */
  async function loadLists() {
    const all = await context.store.listLists();
    if (destroyed) {
      return;
    }
    lists = all.filter((list) => !list['deletion-time'])
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
    fillLists();
  }

  if (kind === 'tasks') {
    stops.push(context.store.subscribe(() => loadLists().catch((error) => console.error('Reading the lists failed:', error))));
    loadLists().catch((error) => console.error('Reading the lists failed:', error));
  }
  fillLists();
  sync();

  return {
    destroy() {
      destroyed = true;
      stops.forEach((stop) => stop());
      announcer.destroy();
    },
  };
}
