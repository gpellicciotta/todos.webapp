/**
 * View controls of the task views: search, the filter chips with their popovers, Clear all, and the Sort menu.
 *
 * Search filters by text in descriptions and notes (`TV-6`); the Lists, Status, Due, and Created chips
 * open popovers with checkboxes or date ranges (`TV-2` to `TV-5`); the Sort menu picks a field and a
 * direction (`TV-9`). Compact layouts show one Filters button whose panel holds every filter instead.
 * Filters and the order persist per device through preferences.js (`TV-12`); the search text does not,
 * so a reload never hides tasks behind a forgotten search.
 */

import { readPreference, writePreference } from '../core/preferences.js';
import { DEFAULT_FILTER, DEFAULT_ORDER, DUE_OPTIONS, NO_LIST, SORT_FIELDS } from '../core/query.js';
import { STATUSES } from '../store/tasks.js';
import { attachMenu } from '../ui/menu.js';
import { attachPopover } from '../ui/popover.js';
import { spriteIcon, STATUS_LABELS } from './task-list.js';

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const OPEN = DEFAULT_FILTER.statuses;
let instances = 0;

/** Control strings, for the strings module of TEC-13 to absorb. */
const STRINGS = Object.freeze({
  search: 'Search tasks and notes',
  searchPlaceholder: 'Search',
  searchValue: 'Search',
  filters: 'Filters',
  clear: 'Clear',
  clearAll: 'Clear all',
  sort: 'Sort',
  orderBy: 'Order by',
  direction: 'Direction',
  asc: 'Ascending',
  desc: 'Descending',
  open: 'open',
  noList: 'In no list',
  from: 'From',
  to: 'To',
  range: 'Due between',
  lists: (count) => `${count} lists`,
  statuses: (count) => `${count} statuses`,
  options: (count) => `${count} options`,
});

/** The filters with a chip, in display order. */
const FILTERS = Object.freeze([
  { key: 'lists', label: 'Lists' },
  { key: 'statuses', label: 'Status' },
  { key: 'due', label: 'Due' },
  { key: 'created', label: 'Created' },
]);

/** Sort field names. */
export const FIELD_LABELS = Object.freeze({
  'due-time': 'Due time', 'creation-time': 'Created', 'last-activity-time': 'Last activity',
  status: 'Status', description: 'Description',
});

const DUE_LABELS = Object.freeze({ overdue: 'Overdue', today: 'Today', 'this-week': 'This week', none: 'No due time' });

/**
 * Return the default view state: open tasks, due time ascending (`LV-10`, `TV-10`).
 * @returns {{filter: object, order: {field: string, direction: string}}} a new state
 */
export function defaultViewState() {
  return { filter: { statuses: [...OPEN] }, order: { ...DEFAULT_ORDER } };
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
 * @param {unknown} raw the stored value
 * @returns {{filter: object, order: object}} the view state, without search text
 */
export function sanitizeViewState(raw) {
  const state = defaultViewState();
  if (!raw || typeof raw !== 'object') {
    return state;
  }
  const stored = raw.filter;
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
  if (raw.order && SORT_FIELDS.includes(raw.order.field) && ['asc', 'desc'].includes(raw.order.direction)) {
    state.order = { field: raw.order.field, direction: raw.order.direction };
  }
  return state;
}

/**
 * Read the stored filters and order of a view (`TV-12`).
 * @param {string} view the view key, such as `tasks`
 * @param {() => Storage} [getStorage] returns the storage, `localStorage` by default
 * @returns {{filter: object, order: object}} the view state
 */
export function loadViewState(view, getStorage) {
  return sanitizeViewState(readPreference(`view.${view}`, null, getStorage));
}

/**
 * Store the filters and order of a view, leaving out the search text.
 * @param {string} view the view key
 * @param {{filter: object, order: object}} state the view state
 * @param {() => Storage} [getStorage] returns the storage, `localStorage` by default
 * @returns {boolean} true when stored
 */
export function saveViewState(view, state, getStorage) {
  const filter = { ...state.filter };
  delete filter.text;
  return writePreference(`view.${view}`, { filter, order: state.order }, getStorage);
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
 * Return the value text of one filter chip, or null when the filter is off.
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
 * Name the active filters, such as `Status: open`, for chips and empty results.
 * @param {object} filter the filter, with optional search text
 * @param {object[]} lists the live lists
 * @returns {string[]} the descriptions: search first, then the chips in display order
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
 * Copy a view state, so callers never share its arrays.
 * @param {{filter: object, order: object}} state the view state
 * @returns {{filter: object, order: object}} the copy
 */
function copy(state) {
  return structuredClone(state);
}

/**
 * Create the view controls.
 * @param {object} options control options
 * @param {Document} [options.document] the document
 * @param {{filter: object, order: object}} options.state the starting view state
 * @param {object[]} options.lists the live lists, in display order
 * @param {(state: {filter: object, order: object}) => void} options.onChange receives each new state
 * @returns {{element: HTMLElement, setState: Function, setLists: Function, destroy: Function}} the controls
 */
export function createViewControls({ document: doc = globalThis.document, state: initial, lists: initialLists, onChange }) {
  const id = `view-controls-${(instances += 1)}`;
  let state = copy(initial);
  let lists = initialLists;
  const behaviors = [];

  /**
   * Create an element with a class and optional text.
   * @param {string} tag the tag name
   * @param {string} className the class
   * @param {string} [text] the text
   * @returns {HTMLElement} the element
   */
  function make(tag, className, text) {
    const element = doc.createElement(tag);
    element.className = className;
    if (text !== undefined) {
      element.textContent = text;
    }
    return element;
  }

  /**
   * Create a button.
   * @param {string} className the class
   * @param {string} [text] the text
   * @returns {HTMLButtonElement} the button
   */
  function button(className, text) {
    const element = make('button', className, text);
    element.type = 'button';
    return element;
  }

  /**
   * Create a checkbox choice.
   * @param {string} key the filter key
   * @param {string} value the value
   * @param {string} text the label
   * @returns {HTMLLabelElement} the choice
   */
  function choice(key, value, text) {
    const label = make('label', 'choice');
    const input = doc.createElement('input');
    input.type = 'checkbox';
    input.dataset.filter = key;
    input.value = value;
    label.append(input, ` ${text}`);
    return label;
  }

  /**
   * Create a pair of date fields for a range.
   * @param {string} prefix the identifier prefix
   * @param {string} key `due` or `created`
   * @returns {HTMLElement} the fields
   */
  function rangeFields(prefix, key) {
    const range = make('div', 'view-controls__range');
    for (const [end, text] of [['from', STRINGS.from], ['to', STRINGS.to]]) {
      const field = make('div', 'field');
      const label = make('label', 'field__label', text);
      const input = make('input', 'field__control');
      input.type = 'date';
      input.id = `${prefix}-${key}-${end}`;
      input.dataset.filter = `${key}-${end}`;
      label.htmlFor = input.id;
      field.append(label, input);
      range.append(field);
    }
    return range;
  }

  /**
   * Create the choices of one filter as a fieldset.
   * @param {string} key the filter key
   * @param {string} label the filter name
   * @param {string} prefix the identifier prefix
   * @returns {HTMLFieldSetElement} the section
   */
  function section(key, label, prefix) {
    const fieldset = make('fieldset', 'choice-group view-controls__group');
    fieldset.dataset.section = key;
    fieldset.append(make('legend', 'popover__title', label));
    if (key === 'statuses') {
      fieldset.append(...STATUSES.map((status) => choice(key, status, STATUS_LABELS[status])));
    }
    else if (key === 'due') {
      fieldset.append(...DUE_OPTIONS.map((option) => choice(key, option, DUE_LABELS[option])), rangeFields(prefix, key));
    }
    else if (key === 'created') {
      fieldset.append(rangeFields(prefix, key));
    }
    return fieldset;
  }

  /**
   * Fill every Lists section with the current lists and In no list, keeping focus on a focused choice.
   */
  function fillLists() {
    const focused = doc.activeElement;
    for (const fieldset of root.querySelectorAll('[data-section="lists"]')) {
      const value = fieldset.contains(focused) ? focused.value : null;
      fieldset.replaceChildren(fieldset.querySelector('legend'),
        ...lists.map((list) => choice('lists', list.id, list.name)), choice('lists', NO_LIST, STRINGS.noList));
      if (value !== null) {
        [...fieldset.querySelectorAll('input')].find((input) => input.value === value)?.focus();
      }
    }
  }

  /**
   * Create a popover panel.
   * @param {string} panelId the identifier
   * @param {string} className the extra class
   * @param {string} label the accessible name
   * @param {HTMLElement[]} children the content
   * @returns {HTMLElement} the panel
   */
  function panel(panelId, className, label, children) {
    const element = make('div', `popover ${className}`);
    element.id = panelId;
    element.setAttribute('role', 'group');
    element.setAttribute('aria-label', label);
    element.hidden = true;
    element.append(...children);
    return element;
  }

  const root = make('div', 'view-controls');
  const search = make('div', 'field view-controls__search');
  const searchLabel = make('label', 'field__label visually-hidden', STRINGS.search);
  const searchInput = make('input', 'field__control');
  searchInput.type = 'search';
  searchInput.id = `${id}-search`;
  searchInput.placeholder = STRINGS.searchPlaceholder;
  searchInput.dataset.shortcut = 'search';
  searchLabel.htmlFor = searchInput.id;
  search.append(searchLabel, searchInput);
  root.append(search);

  const filtersButton = button('filter-chip view-controls__filters');
  const clearAllInPanel = button('button button--quiet', STRINGS.clearAll);
  clearAllInPanel.dataset.clear = 'all';
  const actions = make('div', 'popover__actions');
  actions.append(clearAllInPanel);
  const filtersPanel = panel(`${id}-filters`, 'view-controls__panel', STRINGS.filters,
    [...FILTERS.map(({ key, label }) => section(key, label, `${id}-all`)), actions]);
  root.append(filtersButton, filtersPanel);
  behaviors.push(attachPopover(filtersButton, filtersPanel));

  const chips = new Map();
  for (const { key, label } of FILTERS) {
    const chipButton = button('filter-chip view-controls__chip');
    chipButton.dataset.filter = key;
    const clear = button('button button--quiet', STRINGS.clear);
    clear.dataset.clear = key;
    const chipActions = make('div', 'popover__actions');
    chipActions.append(clear);
    const chipPanel = panel(`${id}-${key}`, 'view-controls__chip-panel', label, [section(key, label, `${id}-${key}`), chipActions]);
    root.append(chipButton, chipPanel);
    behaviors.push(attachPopover(chipButton, chipPanel));
    chips.set(key, { button: chipButton, label });
  }
  const clearAll = button('button button--quiet view-controls__chip view-controls__clear', STRINGS.clearAll);
  clearAll.dataset.clear = 'all';
  root.append(clearAll);

  const sortButton = button('button button--secondary view-controls__sort');
  const sortMenu = make('div', 'menu');
  sortMenu.id = `${id}-sort`;
  sortMenu.setAttribute('aria-label', STRINGS.sort);
  sortMenu.hidden = true;
  const fields = make('div', '');
  fields.setAttribute('role', 'group');
  fields.setAttribute('aria-label', STRINGS.orderBy);
  const directions = make('div', '');
  directions.setAttribute('role', 'group');
  directions.setAttribute('aria-label', STRINGS.direction);
  const separator = make('div', 'menu__separator');
  separator.setAttribute('role', 'separator');
  for (const [group, key, values] of [[fields, 'field', SORT_FIELDS], [directions, 'direction', ['asc', 'desc']]]) {
    for (const value of values) {
      const item = button('menu__item');
      item.setAttribute('role', 'menuitemradio');
      item.dataset[key] = value;
      item.append(spriteIcon(doc, 'check', 'icon menu__check'), key === 'field' ? FIELD_LABELS[value] : STRINGS[value]);
      group.append(item);
    }
  }
  sortMenu.append(fields, separator, directions);
  root.append(sortButton, sortMenu);
  behaviors.push(attachMenu(sortButton, sortMenu, {
    onSelect: (item) => {
      state.order = item.dataset.field ? { ...state.order, field: item.dataset.field } : { ...state.order, direction: item.dataset.direction };
      emit();
    },
  }));
  fillLists();

  /**
   * Fill a filter chip or the Filters button: a name, an optional value, and the chevron.
   * @param {HTMLElement} target the button
   * @param {string} name the name
   * @param {string|null} value the value text
   * @param {string} separatorText the text between the name and the value
   */
  function fillChip(target, name, value, separatorText) {
    target.replaceChildren(value ? `${name}${separatorText}` : name);
    if (value) {
      target.append(make('span', 'filter-chip__value', value));
    }
    target.append(spriteIcon(doc, 'chevron-down'));
    target.setAttribute('aria-pressed', String(Boolean(value)));
  }

  /** Show the state in every control. */
  function sync() {
    let active = 0;
    for (const [key, chip] of chips) {
      const value = filterValue(key, state.filter, lists);
      active += value ? 1 : 0;
      fillChip(chip.button, chip.label, value, ': ');
    }
    fillChip(filtersButton, STRINGS.filters, active ? String(active) : null, ' ');
    clearAll.hidden = describeFilters(state.filter, lists).length === 0;
    if (searchInput.value !== (state.filter.text ?? '')) {
      searchInput.value = state.filter.text ?? '';
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
    const sortLabel = make('span', '', STRINGS.sort);
    sortLabel.append(make('span', 'view-controls__sort-value', `: ${FIELD_LABELS[state.order.field]}`));
    sortButton.replaceChildren(spriteIcon(doc, 'sort'), sortLabel);
    for (const item of sortMenu.querySelectorAll('[role="menuitemradio"]')) {
      const checked = item.dataset.field ? item.dataset.field === state.order.field : item.dataset.direction === state.order.direction;
      item.setAttribute('aria-checked', String(checked));
    }
  }

  /** Show the new state and report it. */
  function emit() {
    sync();
    onChange(copy(state));
  }

  /**
   * Set a filter, removing it when it has no value; an empty status filter stays, meaning every status.
   * @param {string} key the filter key
   * @param {unknown} value the value
   */
  function setFilter(key, value) {
    const empty = value === null || value === undefined || value === '' || (Array.isArray(value) && value.length === 0);
    if (empty && key !== 'statuses') {
      delete state.filter[key];
    }
    else {
      state.filter[key] = empty ? [] : value;
    }
  }

  root.addEventListener('change', (event) => {
    const input = event.target;
    const key = input.dataset?.filter;
    if (!key) {
      return;
    }
    if (input.type === 'checkbox') {
      const values = (state.filter[key] ?? []).filter((value) => value !== input.value);
      setFilter(key, input.checked ? [...values, input.value] : values);
    }
    else {
      const [filterKey, end] = key.split('-');
      const value = DATE.test(input.value) ? input.value : null;
      if (filterKey === 'created') {
        setFilter('created', readRange({ ...state.filter.created, [end]: value }));
      }
      else {
        const options = state.filter.due ?? [];
        const range = readRange({ ...options.find((option) => typeof option === 'object'), [end]: value });
        setFilter('due', [...options.filter((option) => typeof option === 'string'), ...(range ? [range] : [])]);
      }
    }
    emit();
  });
  root.addEventListener('click', (event) => {
    const clear = event.target.closest?.('[data-clear]');
    if (!clear) {
      return;
    }
    if (clear.dataset.clear === 'all') {
      state.filter = { statuses: [] };
    }
    else {
      setFilter(clear.dataset.clear, null);
    }
    emit();
  });
  searchInput.addEventListener('input', () => {
    setFilter('text', searchInput.value);
    emit();
  });
  sync();

  return {
    element: root,

    /**
     * Show a state set from outside, such as Clear all in the empty result.
     * @param {{filter: object, order: object}} next the view state
     */
    setState(next) {
      state = copy(next);
      sync();
    },

    /**
     * Show new lists in the Lists filter.
     * @param {object[]} next the live lists, in display order
     */
    setLists(next) {
      lists = next;
      fillLists();
      sync();
    },

    /** Close the popovers and the menu. */
    destroy() {
      behaviors.forEach((behavior) => behavior.destroy());
    },
  };
}
