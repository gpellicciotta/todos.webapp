/**
 * View options of the task views: the info line, and the View options panel.
 *
 * All tasks and every list view share one set of options: filters, a grouping, and a sort (`VO-1`). The view model holds
 * them, stores them per device through preferences.js (`TV-12`), and tells the screen and the panel about
 * changes; the search text from the add field stays out of storage, so a reload never hides tasks behind forgotten text.
 * The info line under the add bar names the count and every active option (`VO-7`) and offers Reset (`VO-8`).
 * The panel opens in the editor panel from the More menu (`VO-4`, `VO-5`) with Reset, the Filter rows, Group by, and Sort by.
 */

import { readPreference, writePreference } from '../core/preferences.js';
import { DEFAULT_FILTER, DEFAULT_ORDER, DUE_OPTIONS, GROUPINGS, NO_LIST, SORT_FIELDS } from '../core/query.js';
import { STATUSES } from '../store/tasks.js';
import { createLiveRegion } from '../ui/live-region.js';
import { spriteIcon, STATUS_LABELS } from './task-list.js';

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const OPEN = DEFAULT_FILTER.statuses;
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
  noList: 'In no list',
  from: 'From',
  to: 'To',
  lists: (count) => `${count} lists`,
  statuses: (count) => `${count} statuses`,
  options: (count) => `${count} options`,
  statusAll: 'Status: all',
  sortedBy: (field) => `Sorted by ${field}`,
  tasks: (count) => `${count} ${count === 1 ? 'task' : 'tasks'}`,
  tasksOf: (shown, total) => `${shown} of ${total} ${total === 1 ? 'task' : 'tasks'}`,
  show: (counts) => (counts ? `Show ${counts.shown} ${counts.shown === 1 ? 'task' : 'tasks'}` : 'Show tasks'),
});

/** The filters with a row in the panel, in display order; the Lists filter is for All tasks only. */
const FILTERS = Object.freeze([
  { key: 'lists', label: 'Lists' },
  { key: 'statuses', label: 'Status' },
  { key: 'due', label: 'Due' },
  { key: 'created', label: 'Created' },
]);

/** Sort field names, with Manual order for the list view (`LV-6`). */
export const FIELD_LABELS = Object.freeze({
  [MANUAL]: 'Manual order', 'due-time': 'Due time', 'creation-time': 'Created', 'last-activity-time': 'Last activity',
  status: 'Status', description: 'Description',
});

/** The direction a field starts with: Due, Status, and Description ascend; Created and Activity show the newest first. */
export const NATURAL_DIRECTION = Object.freeze({
  [MANUAL]: 'asc', 'due-time': 'asc', 'creation-time': 'desc', 'last-activity-time': 'desc', status: 'asc', description: 'asc',
});

/** The groupings with a control, by kind of view; the list view groups with a later task (`LV-11`). */
const GROUPINGS_OF = Object.freeze({ tasks: GROUPINGS, list: Object.freeze([NONE]) });

/** Grouping names, for the Group by control and the info line (`VO-9`, `VO-7`). */
export const GROUP_LABELS = Object.freeze({ [NONE]: 'None', list: 'List', due: 'Due date', status: 'Status' });

const DUE_LABELS = Object.freeze({ overdue: 'Overdue', today: 'Today', 'this-week': 'This week', none: 'No due time' });

/**
 * Name the kind of a view: All tasks, or a list view.
 * @param {string} view the view key, `tasks` or `list`
 * @returns {'tasks'|'list'} the kind
 */
function kindOf(view) {
  return view === 'list' ? 'list' : 'tasks';
}

/**
 * Return the default view state: open tasks, due time ascending, or manual order in a list view (`LV-10`, `TV-10`).
 * @param {'tasks'|'list'} [kind] the kind of view
 * @returns {{filter: object, order: {field: string, direction: string}, group: string}} a new state, ungrouped
 */
export function defaultViewState(kind = 'tasks') {
  return {
    filter: { statuses: [...OPEN] }, order: kind === 'list' ? { field: MANUAL, direction: 'asc' } : { ...DEFAULT_ORDER }, group: NONE,
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
  const order = old ? { field: raw.order, direction: NATURAL_DIRECTION[raw.order] } : raw.order;
  if (stored && typeof stored === 'object') {
    state.filter = {};
    if (Array.isArray(stored.statuses)) {
      state.filter.statuses = stored.statuses.filter((status) => STATUSES.includes(status));
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
  }
  const fields = kind === 'list' ? [MANUAL, ...SORT_FIELDS] : SORT_FIELDS;
  if (order && fields.includes(order.field) && ['asc', 'desc'].includes(order.direction)) {
    state.order = { field: order.field, direction: order.field === MANUAL ? 'asc' : order.direction };
  }
  if (GROUPINGS_OF[kind].includes(raw.group)) {
    state.group = raw.group;
  }
  return state;
}

/**
 * Read the stored filters, grouping, and order of a view (`TV-12`).
 * @param {string} view the view key, `tasks` or `list`
 * @param {() => Storage} [getStorage] returns the storage, `localStorage` by default
 * @returns {{filter: object, order: object, group: string}} the view state
 */
export function loadViewState(view, getStorage) {
  return sanitizeViewState(readPreference(`view.${view}`, null, getStorage), kindOf(view));
}

/**
 * Store the filters, grouping, and order of a view, leaving out the search text.
 * @param {string} view the view key
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
    && statuses.length === OPEN.length && OPEN.every((status) => statuses.includes(status))
    && !filter.lists?.length && !filter.due?.length && !filter.created && (state.group ?? NONE) === NONE
    && order.field === fallback.field && (order.field === MANUAL || order.direction === fallback.direction);
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
 * Return the value text of one filter, or null when the filter is off.
 * @param {string} key the filter key
 * @param {object} filter the filter
 * @param {object[]} lists the live lists
 * @returns {string|null} the value text
 */
function filterValue(key, filter, lists) {
  const values = filter[key];
  if (key === 'created') {
    return values ? rangeText(values) : null;
  }
  if (!Array.isArray(values) || values.length === 0) {
    return null;
  }
  if (key === 'lists') {
    const names = values.map((id) => (id === NO_LIST ? STRINGS.noList.toLowerCase() : lists.find((list) => list.id === id)?.name))
      .filter(Boolean);
    // A stored filter of deleted lists filters nothing, so it shows no value.
    if (names.length === 0) {
      return null;
    }
    return names.length === 1 ? names[0] : STRINGS.lists(names.length);
  }
  if (key === 'statuses') {
    if (values.length === OPEN.length && OPEN.every((status) => values.includes(status))) {
      return STRINGS.open;
    }
    return values.length === 1 ? STATUS_LABELS[values[0]].toLowerCase() : STRINGS.statuses(values.length);
  }
  if (values.length > 1) {
    return STRINGS.options(values.length);
  }
  return typeof values[0] === 'string' ? DUE_LABELS[values[0]].toLowerCase() : rangeText(values[0]);
}

/**
 * Name the active filters, such as `Status: open`, for the info line and empty results.
 * @param {object} filter the filter, with optional search text
 * @param {object[]} lists the live lists
 * @param {object} [options] naming options
 * @param {boolean} [options.allStatuses] also name an empty status filter, as `Status: all`
 * @returns {string[]} the descriptions: search first, then the filters in display order
 */
export function describeFilters(filter, lists, { allStatuses = false } = {}) {
  const text = typeof filter.text === 'string' ? filter.text.trim() : '';
  const parts = text ? [`${STRINGS.searchValue}: ${text}`] : [];
  for (const { key, label } of FILTERS) {
    const value = filterValue(key, filter, lists);
    if (value) {
      parts.push(`${label}: ${value}`);
    }
    else if (allStatuses && key === 'statuses') {
      parts.push(STRINGS.statusAll);
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
  parts.push(...describeFilters(state.filter, lists, { allStatuses: true }));
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
 * Create the view model of a view: its options, stored per device, and the counts of its screen.
 * The screen and the panel share it, so the rows, the info line, and the panel follow one state.
 * @param {string} view the view key, `tasks` or `list`; every list view shares the `list` model
 * @param {() => Storage} [getStorage] returns the storage, `localStorage` by default
 * @returns {{kind: string, get: Function, set: Function, reset: Function, subscribe: Function,
 *   counts: Function, setCounts: Function, subscribeCounts: Function}} the model
 */
export function createViewModel(view, getStorage) {
  const kind = kindOf(view);
  let state = loadViewState(view, getStorage);
  let counts = null;
  const listeners = new Set();
  const countListeners = new Set();

  /**
   * Keep a new state: on this device, and with every listener.
   * @param {{filter: object, order: object, group: string}} next the view state
   */
  function set(next) {
    state = copy(next);
    saveViewState(view, state, getStorage);
    [...listeners].forEach((listener) => listener(state));
  }

  return {
    kind,

    /**
     * Read the state; treat it as read-only and call `set` to change it.
     * @returns {{filter: object, order: object, group: string}} the view state
     */
    get: () => state,
    set,

    /** Restore every option and the search text to their defaults (`VO-8`). */
    reset: () => set(defaultViewState(kind)),

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
 * Create an element with a class and optional text.
 * @param {Document} doc the document
 * @param {string} tag the tag name
 * @param {string} className the class
 * @param {string} [text] the text
 * @returns {HTMLElement} the element
 */
function make(doc, tag, className, text) {
  const element = doc.createElement(tag);
  element.className = className;
  if (text !== undefined) {
    element.textContent = text;
  }
  return element;
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
 * the list view offers no Group by until it groups (`LV-11`). A polite live region announces the count after each change (`VO-13`).
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
      return STATUSES.map((status) => choice(key, status, STATUS_LABELS[status]));
    }
    if (key === 'due') {
      return [...DUE_OPTIONS.map((option) => choice(key, option, DUE_LABELS[option])), rangeFields(key)];
    }
    return key === 'created' ? [rangeFields(key)] : [];
  }

  const rows = new Map();
  const accordion = make(doc, 'div', 'view-options__rows');
  for (const { key, label } of FILTERS.filter(({ key: filterKey }) => filterKey !== 'lists' || kind === 'tasks')) {
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

  const groupings = GROUPINGS_OF[kind];
  const groupHeading = make(doc, 'h3', 'view-options__heading', STRINGS.groupBy);
  const groupSet = make(doc, 'fieldset', 'segmented view-options__group');
  const groupOptions = make(doc, 'div', 'segmented__options');
  for (const value of groupings) {
    const label = make(doc, 'label', 'segmented__option');
    const input = doc.createElement('input');
    input.type = 'radio';
    input.name = `${id}-group`;
    input.value = value;
    label.append(input, GROUP_LABELS[value]);
    groupOptions.append(label);
  }
  groupSet.append(make(doc, 'legend', 'visually-hidden', STRINGS.groupBy), groupOptions);

  const sortHeading = make(doc, 'h3', 'view-options__heading', STRINGS.sortBy);
  sortHeading.id = `${id}-sort`;
  const select = make(doc, 'select', 'field__control view-options__sort');
  select.setAttribute('aria-labelledby', sortHeading.id);
  for (const field of kind === 'list' ? [MANUAL, ...SORT_FIELDS] : SORT_FIELDS) {
    const option = doc.createElement('option');
    option.value = field;
    option.textContent = FIELD_LABELS[field];
    select.append(option);
  }
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
    content.append(groupHeading, groupSet);
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
    for (const [key, { row, label }] of rows) {
      const value = filterValue(key, state.filter, lists) ?? (key === 'lists' || key === 'statuses' ? STRINGS.all : STRINGS.any);
      row.replaceChildren(make(doc, 'span', 'view-options__label', label), make(doc, 'span', 'view-options__value', value),
        spriteIcon(doc, 'chevron-down'));
    }
    const dueRange = state.filter.due?.find((option) => typeof option === 'object') ?? {};
    for (const input of root.querySelectorAll('input[data-filter]')) {
      const key = input.dataset.filter;
      if (input.type === 'checkbox') {
        input.checked = (state.filter[key] ?? []).includes(input.value);
      }
      else {
        const [filterKey, end] = key.split('-');
        input.value = (filterKey === 'due' ? dueRange[end] : state.filter.created?.[end]) ?? '';
      }
    }
    for (const input of groupSet.querySelectorAll('input')) {
      input.checked = input.value === (state.group ?? NONE);
    }
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
    else if (input === select) {
      apply((state) => {
        state.order = { field: select.value, direction: NATURAL_DIRECTION[select.value] };
      });
    }
    else if (input.name === `${id}-group`) {
      apply((state) => {
        state.group = input.value;
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
    model.subscribe(sync),
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
