/**
 * Sort lists for the Lists screen: manual order, name, open task count, or last activity (`LST-12`).
 *
 * The input is in manual order, and every sort keeps it among ties, since the array sort is stable.
 * A sort never changes the stored order; it returns a new array.
 */

import { countOf } from './list-counts.js';

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
