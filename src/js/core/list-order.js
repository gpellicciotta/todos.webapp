/**
 * The order of the lists, shared by the sidebar and the Lists screen.
 *
 * The order is a preference of list identifiers (`lists.order`); the store and the change feed never see it.
 * While connected it follows the account as one value, so the latest whole order wins (`SYN-13`).
 * Stored identifiers come first; lists without one, such as new lists, follow in name order.
 * A list moves one place, to an index, or to either end (`LST-8`, `LST-13`).
 * A write tells the listeners of this page; a write in another tab or a download tells them too.
 */

import { onSettingsChange, PREFIX, readPreference, touchesSetting, writePreference } from './preferences.js';

export const LIST_ORDER_KEY = 'lists.order';

const listeners = new Set();

/**
 * Read the stored list order.
 * @param {() => Storage} [getStorage] returns the storage, `localStorage` by default
 * @returns {string[]} the list identifiers, or none for a missing or corrupt entry
 */
export function readListOrder(getStorage) {
  const stored = readPreference(LIST_ORDER_KEY, [], getStorage);
  return Array.isArray(stored) ? stored.filter((id) => typeof id === 'string' && id !== '') : [];
}

/**
 * Store the list order and tell the listeners once it is stored.
 * @param {string[]} ids the list identifiers in display order
 * @param {() => Storage} [getStorage] returns the storage, `localStorage` by default
 * @returns {boolean} true when stored
 */
export function writeListOrder(ids, getStorage) {
  const stored = writePreference(LIST_ORDER_KEY, ids, getStorage);
  if (stored) {
    listeners.forEach((listener) => listener());
  }
  return stored;
}

/**
 * Listen for a changed list order: on this page, in another tab, or downloaded from the account.
 * @param {() => void} listener called after each change
 * @returns {() => void} stops listening
 */
export function onListOrderChange(listener) {
  const stop = onSettingsChange((names) => {
    if (touchesSetting(names, PREFIX + LIST_ORDER_KEY)) {
      listener();
    }
  });
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    stop();
  };
}

/**
 * Sort lists by the stored order: stored identifiers first, then the others in name order.
 * @param {object[]} lists the lists, in any order
 * @param {string[]} [order] the stored identifiers
 * @returns {object[]} a new array in display order
 */
export function applyListOrder(lists, order = []) {
  const byId = new Map(lists.map((list) => [list.id, list]));
  const placed = [...new Set(order)].filter((id) => byId.has(id)).map((id) => byId.get(id));
  const rest = lists.filter((list) => !placed.includes(list))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
  return [...placed, ...rest];
}

/**
 * Move an identifier to an index of the order.
 * @param {string[]} ids the identifiers in display order
 * @param {string} id the moved identifier
 * @param {number} index the new index, clamped to the ends
 * @returns {string[]} a new array; the same order for an unknown identifier
 */
export function moveListTo(ids, id, index) {
  if (!ids.includes(id)) {
    return [...ids];
  }
  const others = ids.filter((other) => other !== id);
  others.splice(Math.max(0, Math.min(index, others.length)), 0, id);
  return others;
}

/**
 * Move an identifier one place up or down, staying put at the ends.
 * @param {string[]} ids the identifiers in display order
 * @param {string} id the moved identifier
 * @param {-1|1} step -1 for up, 1 for down
 * @returns {string[]} a new array
 */
export function moveList(ids, id, step) {
  return moveListTo(ids, id, ids.indexOf(id) + step);
}

/**
 * Move an identifier to the first or the last place, for Move to top, Move to bottom, Alt+Home, and Alt+End (`LST-13`).
 * @param {string[]} ids the identifiers in display order
 * @param {string} id the moved identifier
 * @param {-1|1} end -1 for the top, 1 for the bottom
 * @returns {string[]} a new array
 */
export function moveListToEnd(ids, id, end) {
  return moveListTo(ids, id, end < 0 ? 0 : ids.length - 1);
}

/**
 * Describe a move for the live region.
 * @param {string} name the list name
 * @param {number} position the new position, counted from 1
 * @param {number} count the number of lists
 * @returns {string} the message
 */
export function movedMessage(name, position, count) {
  return `${name} moved to position ${position} of ${count}.`;
}
