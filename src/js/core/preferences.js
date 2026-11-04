/**
 * Per-device preferences in `localStorage`, under keys that start with `todos.`.
 *
 * Values are stored as JSON. Storage that is missing, blocked, or full never throws:
 * reads return the fallback and writes report failure, so the app works in private windows.
 * The views store their filters and sort here (`TV-12`); the Settings screen adds its own keys.
 */

export const PREFIX = 'todos.';

/**
 * Read a preference.
 * @param {string} key the key without the prefix, such as `view.tasks`
 * @param {unknown} fallback the value for a missing, unreadable, or malformed entry
 * @param {() => Storage} [getStorage] returns the storage, `localStorage` by default
 * @returns {unknown} the stored value, or the fallback
 */
export function readPreference(key, fallback, getStorage = () => globalThis.localStorage) {
  try {
    const raw = getStorage()?.getItem(PREFIX + key);
    return raw === null || raw === undefined ? fallback : JSON.parse(raw);
  }
  catch {
    return fallback;
  }
}

/**
 * Store a preference.
 * @param {string} key the key without the prefix
 * @param {unknown} value a JSON-serializable value
 * @param {() => Storage} [getStorage] returns the storage, `localStorage` by default
 * @returns {boolean} true when stored
 */
export function writePreference(key, value, getStorage = () => globalThis.localStorage) {
  try {
    getStorage().setItem(PREFIX + key, JSON.stringify(value));
    return true;
  }
  catch {
    return false;
  }
}
