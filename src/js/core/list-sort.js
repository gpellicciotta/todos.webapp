/**
 * Sort lists for the Lists screen: manual order, name, open task count, or last activity (`LST-12`).
 *
 * The input is in manual order, and every sort keeps it among ties, since the array sort is stable.
 * A sort never changes the stored order; it returns a new array.
 * The choice persists in `todos.view.lists` as `{sort, shared}` (`TV-12`, `LST-16`); the defaults store nothing.
 * While connected it follows the account (`SYN-13`).
 */

import { countOf } from './list-counts.js';
import { readPreference, removePreference, writePreference } from './preferences.js';

/** The sort identifiers, in menu order: the default first. */
export const LIST_SORTS = Object.freeze(['manual', 'name', 'open', 'activity']);

const COMPARES = {
  name: (a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
  open: (a, b, counts) => countOf(counts, b.id).open - countOf(counts, a.id).open,
  // A list without task activity sorts after every list with some.
  activity: (a, b, counts) => (countOf(counts, b.id).activity ?? -Infinity) - (countOf(counts, a.id).activity ?? -Infinity) || 0,
};

/**
 * Sort lists.
 * @param {object[]} lists the lists in manual order
 * @param {string} sort one of {@link LIST_SORTS}; any other value, such as an inherited key, keeps the manual order
 * @param {{byList: Map<string, object>}} counts the result of `countLists`
 * @returns {object[]} a new array; ties keep the manual order, and the newest or biggest comes first
 */
export function sortLists(lists, sort, counts) {
  const compare = Object.hasOwn(COMPARES, sort) ? COMPARES[sort] : null;
  return compare ? [...lists].sort((a, b) => compare(a, b, counts)) : [...lists];
}

/** The key of the stored choice, under the `todos.` prefix. */
export const LIST_SORT_KEY = 'view.lists';

/** Sort names: the menu entry and the short name of the button and info line. */
export const SORT_LABELS = Object.freeze({
  manual: Object.freeze({ menu: 'Manual order', short: 'Manual order' }),
  name: Object.freeze({ menu: 'Name (A to Z)', short: 'Name' }),
  open: Object.freeze({ menu: 'Open tasks (most first)', short: 'Open tasks' }),
  activity: Object.freeze({ menu: 'Last update (newest first)', short: 'Last update' }),
});

/**
 * Read the stored sort.
 * @param {() => Storage} [getStorage] returns the storage, `localStorage` by default
 * @returns {string} one of {@link LIST_SORTS}; manual order for a missing, unknown, or corrupt entry
 */
export function readListSort(getStorage) {
  const stored = readPreference(LIST_SORT_KEY, null, getStorage);
  return typeof stored?.sort === 'string' && LIST_SORTS.includes(stored.sort) ? stored.sort : 'manual';
}

/**
 * Store the sort; manual order forgets the entry.
 * @param {string} sort one of {@link LIST_SORTS}
 * @param {() => Storage} [getStorage] returns the storage, `localStorage` by default
 * @returns {boolean} true when stored or removed
 */
export function writeListSort(sort, getStorage) {
  return writeListView({ sort, sharedOnly: readSharedOnly(getStorage) }, getStorage);
}

/**
 * Read the stored Shared only choice (`LST-16`).
 * @param {() => Storage} [getStorage] returns the storage, `localStorage` by default
 * @returns {boolean} true only for an entry holding `shared: true`
 */
export function readSharedOnly(getStorage) {
  return readPreference(LIST_SORT_KEY, null, getStorage)?.shared === true;
}

/**
 * Store the sort and the Shared only choice together as `{sort, shared}`; the defaults forget their keys, and none forgets the entry.
 * @param {{sort: string, sharedOnly: boolean}} view the choices
 * @param {() => Storage} [getStorage] returns the storage, `localStorage` by default
 * @returns {boolean} true when stored or removed
 */
export function writeListView({ sort, sharedOnly }, getStorage) {
  const entry = {};
  if (sort !== 'manual') {
    entry.sort = sort;
  }
  if (sharedOnly) {
    entry.shared = true;
  }
  return Object.keys(entry).length === 0 ? removePreference(LIST_SORT_KEY, getStorage) : writePreference(LIST_SORT_KEY, entry, getStorage);
}
