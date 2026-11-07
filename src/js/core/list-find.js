/**
 * Find lists by typed text, shared by the sidebar and the Lists screen (`LST-10`).
 *
 * Matching ignores case and accents and finds the text anywhere in the name.
 * The Lists screen also searches descriptions; the sidebar searches names only.
 * Results keep the order of the input, with no ranking, so the order stays predictable.
 */

/** The length of the find field, the length of a list name. */
export const FIND_MAX_LENGTH = 100;

/**
 * Fold text for matching: lowercase, without accents.
 * @param {string} text the text
 * @returns {string} the folded text
 */
export function foldText(text) {
  return text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}

/**
 * Find the lists whose name, and optionally description, contain the text.
 * @param {object[]} lists the lists, in the order to keep
 * @param {string} text the typed text; blank text matches every list
 * @param {{descriptions?: boolean}} [options] `descriptions` also searches the descriptions
 * @returns {object[]} a new array of the matching lists, in input order
 */
export function findLists(lists, text, { descriptions = false } = {}) {
  const needle = foldText(text.trim());
  if (needle === '') {
    return [...lists];
  }
  return lists.filter((list) => foldText(list.name ?? '').includes(needle)
    || (descriptions && foldText(list.description ?? '').includes(needle)));
}
