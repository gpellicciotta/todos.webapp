/**
 * Task queries for All tasks and the list view: filters, sort orders, groups, and manual order
 * (`TV-2` to `TV-10`, `LV-2`, `LV-6`, `VO-9` to `VO-12`).
 *
 * Pure functions over arrays of task records, run in memory over the local store (`TEC-16`).
 * They never change their inputs and return new arrays.
 * Callers pass live tasks from `listTasks()`; the store already leaves out tasks in the recycle bin.
 */

import { STATUSES } from '../store/tasks.js';
import { isOverdue } from './overdue.js';

/** The value of the Lists filter that selects tasks in no list. */
export const NO_LIST = 'no-list';

/** The default filter of All tasks and the list view: open tasks only (`LV-10`). */
export const DEFAULT_FILTER = Object.freeze({ statuses: Object.freeze(['todo', 'in-progress']) });

/** The default order of All tasks: due time ascending, tasks without a due time last (`TV-10`). */
export const DEFAULT_ORDER = Object.freeze({ field: 'due-time', direction: 'asc' });

/** The sortable task fields (`TV-9`, `LV-6`). */
export const SORT_FIELDS = Object.freeze(['due-time', 'creation-time', 'last-activity-time', 'status', 'description']);

/** The named options of the Due filter; a `{from, to}` range is the other option. */
export const DUE_OPTIONS = Object.freeze(['overdue', 'today', 'this-week', 'none']);

/** The groupings of a view (`VO-9`); `none` shows the tasks as one list. */
export const GROUPINGS = Object.freeze(['none', 'list', 'due', 'status']);

const DUE_GROUPS = Object.freeze([
  ['overdue', 'Overdue'], ['earlier', 'Earlier'], ['today', 'Today'], ['tomorrow', 'Tomorrow'], ['this-week', 'This week'],
  ['later', 'Later'], ['no-due', 'No due date'],
]);
const STATUS_GROUPS = Object.freeze({
  todo: 'To do', 'in-progress': 'In progress', completed: 'Completed', cancelled: 'Cancelled',
});
const NO_LIST_LABEL = 'No list';

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;
const collator = new Intl.Collator(undefined, { sensitivity: 'base', numeric: true });

/**
 * Convert a range bound to a Unix time in milliseconds.
 * A date-only string means the start of that local day, or its end for an upper bound.
 * @param {string|number|Date|null|undefined} value an ISO date or date-time, a Unix time, or a Date
 * @param {boolean} upper whether the value is an upper bound
 * @returns {number} the time, or an infinity for a missing bound
 */
function toBound(value, upper) {
  if (value === null || value === undefined || value === '') {
    return upper ? Infinity : -Infinity;
  }
  if (value instanceof Date) {
    return value.getTime();
  }
  if (typeof value === 'number') {
    return value;
  }
  const date = DATE_ONLY.exec(value);
  if (date) {
    const [year, month, day] = date.slice(1).map(Number);
    return upper ? new Date(year, month - 1, day + 1).getTime() - 1 : new Date(year, month - 1, day).getTime();
  }
  const time = Date.parse(value);
  if (Number.isNaN(time)) {
    throw new RangeError(`Not a valid range bound: ${value}.`);
  }
  return time;
}

/**
 * Convert a `{from, to}` range to inclusive Unix time bounds.
 * @param {{from?: string|number|Date, to?: string|number|Date}} range the range
 * @returns {{from: number, to: number}} the bounds
 */
function toRange(range) {
  return { from: toBound(range.from, false), to: toBound(range.to, true) };
}

/**
 * Return the Unix time of an ISO time field, or null when it is empty.
 * @param {string|null|undefined} value the ISO time
 * @returns {number|null} the time in milliseconds
 */
function timeOf(value) {
  return value ? Date.parse(value) : null;
}

/**
 * Return the time windows of the Due filter around `now`, in local time.
 * @param {Date} now the current time
 * @param {number} weekStart the first day of the week, 0 for Sunday to 6 for Saturday
 * @returns {{today: {from: number, to: number}, tomorrow: {to: number}, week: {from: number, to: number}}} half-open windows
 */
function dueWindows(now, weekStart) {
  const year = now.getFullYear();
  const month = now.getMonth();
  const day = now.getDate();
  const offset = (now.getDay() - weekStart + 7) % 7;
  return {
    today: { from: new Date(year, month, day).getTime(), to: new Date(year, month, day + 1).getTime() },
    tomorrow: { to: new Date(year, month, day + 2).getTime() },
    week: { from: new Date(year, month, day - offset).getTime(), to: new Date(year, month, day - offset + 7).getTime() },
  };
}

/**
 * Build the test of one Due filter option.
 * @param {string|object} option a named option or a `{from, to}` range
 * @param {number} now the current Unix time in milliseconds
 * @param {ReturnType<typeof dueWindows>} windows the today and week windows
 * @returns {(due: number|null, task: object) => boolean} the test
 */
function dueTest(option, now, windows) {
  if (option && typeof option === 'object') {
    const { from, to } = toRange(option);
    return (due) => due !== null && due >= from && due <= to;
  }
  switch (option) {
    case 'overdue':
      return (due, task) => isOverdue(task, now);
    case 'today':
      return (due) => due !== null && due >= windows.today.from && due < windows.today.to;
    case 'this-week':
      return (due) => due !== null && due >= windows.week.from && due < windows.week.to;
    case 'none':
      return (due) => due === null;
    default:
      throw new RangeError(`Unknown due filter option: ${option}.`);
  }
}

/**
 * Check whether a task's description or notes contain a lowercase text.
 * @param {object} task the task
 * @param {string|string[]|undefined} notes the note texts of the task
 * @param {string} needle the lowercase text
 * @returns {boolean} true when found
 */
function containsText(task, notes, needle) {
  if (task.description.toLowerCase().includes(needle)) {
    return true;
  }
  if (typeof notes === 'string') {
    return notes.toLowerCase().includes(needle);
  }
  return Array.isArray(notes) && notes.some((text) => text.toLowerCase().includes(needle));
}

/**
 * Return whether a filter value is set; an empty or missing value applies no filter.
 * @param {unknown} value the filter value
 * @returns {boolean} true when set
 */
function isSet(value) {
  return Array.isArray(value) ? value.length > 0 : value !== undefined && value !== null;
}

/**
 * Return the tasks that match a filter, in their input order (`TV-2` to `TV-8`).
 * Filters combine with AND; a filter with several values matches any of them.
 * An empty or missing filter value applies no filter.
 * @param {object[]} tasks the task records
 * @param {object} [filter] the filter
 * @param {string[]} [filter.lists] list identifiers, or `NO_LIST` for tasks in no list
 * @param {string[]} [filter.statuses] statuses
 * @param {Array<string|{from?: any, to?: any}>} [filter.due] `overdue`, `today`, `this-week`, `none`, or inclusive ranges
 * @param {{from?: any, to?: any}} [filter.created] an inclusive creation time range
 * @param {string} [filter.text] text to find in the description or the notes, ignoring case
 * @param {boolean} [filter.shared] true for tasks in a shared list, false for the others
 * @param {object} [ctx] the query context
 * @param {Date|number} [ctx.now] the current time, for the Due filter
 * @param {Map<string, string[]>} [ctx.listsByTask] list identifiers by task identifier
 * @param {Map<string, string|string[]>} [ctx.notesByTask] note texts by task identifier
 * @param {Set<string>} [ctx.sharedListIds] identifiers of shared lists
 * @param {number} [ctx.weekStart] the first day of the week, 0 for Sunday; 1, Monday, by default
 * @returns {object[]} the matching tasks
 */
export function filterTasks(tasks, filter = {}, ctx = {}) {
  const listsByTask = ctx.listsByTask ?? new Map();
  const tests = [];
  if (isSet(filter.lists)) {
    const wanted = new Set(filter.lists);
    const noList = wanted.has(NO_LIST);
    tests.push((task) => {
      const lists = listsByTask.get(task.id) ?? [];
      return (noList && lists.length === 0) || lists.some((id) => wanted.has(id));
    });
  }
  if (isSet(filter.statuses)) {
    const wanted = new Set(filter.statuses);
    tests.push((task) => wanted.has(task.status));
  }
  if (isSet(filter.due)) {
    const now = new Date(ctx.now ?? Date.now());
    const windows = dueWindows(now, ctx.weekStart ?? 1);
    const options = filter.due.map((option) => dueTest(option, now.getTime(), windows));
    tests.push((task) => {
      const due = timeOf(task['due-time']);
      return options.some((test) => test(due, task));
    });
  }
  if (isSet(filter.created)) {
    const { from, to } = toRange(filter.created);
    tests.push((task) => {
      const created = timeOf(task['creation-time']);
      return created >= from && created <= to;
    });
  }
  const needle = typeof filter.text === 'string' ? filter.text.trim().toLowerCase() : '';
  if (needle) {
    const notesByTask = ctx.notesByTask ?? new Map();
    tests.push((task) => containsText(task, notesByTask.get(task.id), needle));
  }
  if (typeof filter.shared === 'boolean') {
    const shared = ctx.sharedListIds ?? new Set();
    tests.push((task) => (listsByTask.get(task.id) ?? []).some((id) => shared.has(id)) === filter.shared);
  }
  return tasks.filter((task) => tests.every((test) => test(task)));
}

/**
 * Normalize a description for the exact-match check: lowercase, without surrounding spaces.
 * @param {string} text the description or typed text
 * @returns {string} the normalized text
 */
export function normalizeDescription(text) {
  return text.trim().toLowerCase();
}

/**
 * Index the descriptions of tasks for the exact-match check of the Add button.
 * @param {object[]} tasks the tasks the view options show
 * @returns {Set<string>} the normalized descriptions
 */
export function exactMatchIndex(tasks) {
  return new Set(tasks.map((task) => normalizeDescription(task.description)));
}

/** The filters that can hide a new task from its view, in display order. */
const HIDING_FILTERS = Object.freeze(['lists', 'statuses', 'due', 'created']);

/**
 * Name the filters that hide a task, testing each one alone; the search text and sharing never count.
 * @param {object} task the task
 * @param {object} filter the filter
 * @param {object} [ctx] the query context, as for `filterTasks`
 * @returns {string[]} the hiding filter keys, such as `['statuses', 'due']`
 */
export function hidingFilters(task, filter, ctx = {}) {
  return HIDING_FILTERS.filter((key) => isSet(filter[key]) && filterTasks([task], { [key]: filter[key] }, ctx).length === 0);
}

/**
 * Copy a filter with some filters back at their defaults: open statuses, and no other filter.
 * @param {object} filter the filter
 * @param {string[]} keys the filter keys to reset
 * @returns {object} the new filter
 */
export function clearFilters(filter, keys) {
  const next = { ...filter };
  for (const key of keys) {
    if (key === 'statuses') {
      next.statuses = [...DEFAULT_FILTER.statuses];
    }
    else {
      delete next[key];
    }
  }
  return next;
}

/**
 * Name the due date group of a task: open tasks past their due time are Overdue; the others go by their due day.
 * A finished task due on an earlier day goes to Earlier, since it is not overdue.
 * @param {object} task the task
 * @param {number} now the current Unix time in milliseconds
 * @param {ReturnType<typeof dueWindows>} windows the today and week windows
 * @returns {string} the group key
 */
function dueGroupOf(task, now, windows) {
  const due = timeOf(task['due-time']);
  if (due === null) {
    return 'no-due';
  }
  if (isOverdue(task, now)) {
    return 'overdue';
  }
  if (due < windows.today.from) {
    return 'earlier';
  }
  if (due < windows.today.to) {
    return 'today';
  }
  if (due < windows.tomorrow.to) {
    return 'tomorrow';
  }
  return due < windows.week.to ? 'this-week' : 'later';
}

/**
 * Split tasks into groups for a view (`VO-9` to `VO-12`). Groups come in a fixed order and empty groups are left out;
 * tasks keep their input order inside a group, so a sort applies within each group.
 * - `list`: one group per list in the order of `ctx.lists`, then No list. A task of several lists is in each group.
 * - `due`: Overdue, Earlier, Today, Tomorrow, This week, Later, and No due date.
 * - `status`: To do, In progress, Completed, and Cancelled.
 * @param {object[]} tasks the task records, filtered and sorted
 * @param {'list'|'due'|'status'} grouping the grouping
 * @param {object} [ctx] the query context
 * @param {Date|number} [ctx.now] the current time, for the due date groups
 * @param {number} [ctx.weekStart] the first day of the week, 0 for Sunday; 1, Monday, by default
 * @param {Map<string, string[]>} [ctx.listsByTask] list identifiers by task identifier
 * @param {Iterable<{id: string, name: string}>|Map<string, {id: string, name: string}>} [ctx.lists] the live lists in
 *   display order, as an array or a map
 * @returns {Array<{key: string, label: string, tasks: object[]}>} the non-empty groups
 */
export function groupTasks(tasks, grouping, ctx = {}) {
  let order;
  let place;
  switch (grouping) {
    case 'status':
      order = STATUSES.map((status) => [status, STATUS_GROUPS[status]]);
      place = (task) => [task.status];
      break;
    case 'due': {
      const now = new Date(ctx.now ?? Date.now());
      const windows = dueWindows(now, ctx.weekStart ?? 1);
      order = DUE_GROUPS;
      place = (task) => [dueGroupOf(task, now.getTime(), windows)];
      break;
    }
    case 'list': {
      const lists = ctx.lists instanceof Map ? [...ctx.lists.values()] : [...(ctx.lists ?? [])];
      const listsByTask = ctx.listsByTask ?? new Map();
      const known = new Set(lists.map((list) => list.id));
      order = [...lists.map((list) => [list.id, list.name]), [NO_LIST, NO_LIST_LABEL]];
      place = (task) => {
        const ids = (listsByTask.get(task.id) ?? []).filter((id) => known.has(id));
        return ids.length > 0 ? ids : [NO_LIST];
      };
      break;
    }
    default:
      throw new RangeError(`Unknown grouping: ${grouping}.`);
  }
  const buckets = new Map(order.map(([key]) => [key, []]));
  for (const task of tasks) {
    for (const key of place(task)) {
      (buckets.get(key) ?? buckets.get(NO_LIST))?.push(task);
    }
  }
  return order.filter(([key]) => buckets.get(key).length > 0).map(([key, label]) => ({ key, label, tasks: buckets.get(key) }));
}

/**
 * Compare two identifiers by code unit order.
 * @param {string} a an identifier
 * @param {string} b another identifier
 * @returns {number} negative, zero, or positive
 */
function compareIds(a, b) {
  if (a === b) {
    return 0;
  }
  return a < b ? -1 : 1;
}

/**
 * Return the sort key of a task for a field.
 * @param {object} task the task
 * @param {string} field the sort field
 * @returns {number|string|null} the key; null only for a missing due time
 */
function sortKey(task, field) {
  switch (field) {
    case 'due-time':
      return timeOf(task['due-time']);
    case 'creation-time':
    case 'last-activity-time':
      return timeOf(task[field]) ?? 0;
    case 'status': {
      const index = STATUSES.indexOf(task.status);
      return index < 0 ? STATUSES.length : index;
    }
    default:
      return task.description;
  }
}

/**
 * Return tasks sorted by one field, ascending or descending (`TV-9`, `LV-6`).
 * Tasks without a due time sort last in both directions (`TV-10`); statuses sort in lifecycle order;
 * descriptions ignore case and compare digits by number. Ties break on the task identifier, in the same direction.
 * @param {object[]} tasks the task records
 * @param {{field: string, direction: 'asc'|'desc'}} [order] the order, `DEFAULT_ORDER` by default
 * @returns {object[]} the sorted tasks
 */
export function sortTasks(tasks, order = DEFAULT_ORDER) {
  const { field, direction } = order;
  if (!SORT_FIELDS.includes(field)) {
    throw new RangeError(`Unknown sort field: ${field}.`);
  }
  if (direction !== 'asc' && direction !== 'desc') {
    throw new RangeError(`Unknown sort direction: ${direction}.`);
  }
  const sign = direction === 'asc' ? 1 : -1;
  const compareKeys = field === 'description' ? collator.compare : (a, b) => a - b;
  const decorated = tasks.map((task) => ({ task, key: sortKey(task, field) }));
  decorated.sort((x, y) => {
    if (x.key === null || y.key === null) {
      if (x.key !== y.key) {
        return x.key === null ? 1 : -1;
      }
    }
    else {
      const byKey = compareKeys(x.key, y.key);
      if (byKey !== 0) {
        return sign * byKey;
      }
    }
    return sign * compareIds(x.task.id, y.task.id);
  });
  return decorated.map((entry) => entry.task);
}

/**
 * Return tasks in a list's manual order (`LV-2`): ascending position by code unit order, ties on the identifier.
 * Tasks without a position in the list come last, by identifier.
 * @param {object[]} tasks the task records
 * @param {Map<string, string>} positions positions by task identifier, from `positionsOfList`
 * @returns {object[]} the sorted tasks
 */
export function sortByPosition(tasks, positions) {
  return [...tasks].sort((x, y) => {
    const a = positions.get(x.id);
    const b = positions.get(y.id);
    if (a === undefined || b === undefined) {
      if (a !== b) {
        return a === undefined ? 1 : -1;
      }
    }
    else if (a !== b) {
      return a < b ? -1 : 1;
    }
    return compareIds(x.id, y.id);
  });
}

/**
 * Index membership records by task, for the `listsByTask` query context.
 * The store's `listMemberships()` keeps memberships of lists in the recycle bin,
 * so pass the identifiers of the live lists, from `listLists()`, to leave those out.
 * @param {object[]} memberships membership records with `list-id` and `task-id`
 * @param {Iterable<string>} [listIds] identifiers of the lists to keep; all lists when omitted
 * @returns {Map<string, string[]>} list identifiers by task identifier
 */
export function indexMemberships(memberships, listIds) {
  const keep = listIds === undefined ? null : new Set(listIds);
  const index = new Map();
  for (const membership of memberships) {
    if (keep && !keep.has(membership['list-id'])) {
      continue;
    }
    const lists = index.get(membership['task-id']);
    if (lists) {
      lists.push(membership['list-id']);
    }
    else {
      index.set(membership['task-id'], [membership['list-id']]);
    }
  }
  return index;
}

/**
 * Return the positions of one list's memberships, for `sortByPosition`.
 * @param {object[]} memberships membership records with `list-id`, `task-id`, and `position`
 * @param {string} listId the list identifier
 * @returns {Map<string, string>} positions by task identifier
 */
export function positionsOfList(memberships, listId) {
  const positions = new Map();
  for (const membership of memberships) {
    if (membership['list-id'] === listId) {
      positions.set(membership['task-id'], membership.position);
    }
  }
  return positions;
}
