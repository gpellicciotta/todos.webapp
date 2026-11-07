/**
 * Per-device preferences in `localStorage`, under keys that start with `todos.`.
 *
 * Values are stored as JSON. Storage that is missing, blocked, or full never throws:
 * reads return the fallback and writes report failure, so the app works in private windows.
 * The views store their filters, grouping, and sort here (`TV-12`), All tasks once and each list on its own; Settings stores `theme` and `server-url`.
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

/**
 * Remove a preference.
 * @param {string} key the key without the prefix
 * @param {() => Storage} [getStorage] returns the storage, `localStorage` by default
 * @returns {boolean} true when removed, or when nothing was stored
 */
export function removePreference(key, getStorage = () => globalThis.localStorage) {
  try {
    getStorage().removeItem(PREFIX + key);
    return true;
  }
  catch {
    return false;
  }
}

/** The server a new device connects to (`CON-12`). */
export const DEFAULT_SERVER_URL = 'https://todos.pellicciotta.com';
const THEMES = ['system', 'light', 'dark'];

/**
 * Read the theme preference of this device; a plain `light` or `dark`, stored without JSON quotes, counts too.
 * @param {() => Storage} [getStorage] returns the storage, `localStorage` by default
 * @returns {'system'|'light'|'dark'} the stored theme, or `system`
 */
export function readTheme(getStorage = () => globalThis.localStorage) {
  let plain;
  try {
    plain = getStorage()?.getItem(`${PREFIX}theme`);
  }
  catch {
    plain = null;
  }
  const theme = THEMES.includes(plain) ? plain : readPreference('theme', 'system', getStorage);
  return THEMES.includes(theme) ? theme : 'system';
}

/**
 * Store the theme preference of this device.
 * @param {'system'|'light'|'dark'} theme the theme
 * @param {() => Storage} [getStorage] returns the storage, `localStorage` by default
 * @returns {boolean} true when stored
 */
export function writeTheme(theme, getStorage) {
  return THEMES.includes(theme) && writePreference('theme', theme, getStorage);
}

/** Hosts that may use plain `http:`, since their traffic never leaves this machine. */
const LOCAL_HOSTS = ['localhost', '127.0.0.1', '[::1]'];

/**
 * Parse a server URL: an https address, or http on this machine, without credentials.
 * Only the origin and the path stay, without a trailing slash.
 * @param {string} text the typed address
 * @returns {string|null} the normalized URL, or null when it is not one
 */
export function parseServerUrl(text) {
  try {
    const url = new URL(String(text).trim());
    const secure = url.protocol === 'https:' || (url.protocol === 'http:' && LOCAL_HOSTS.includes(url.hostname));
    if (!secure || url.username || url.password) {
      return null;
    }
    return `${url.origin}${url.pathname}`.replace(/\/$/, '');
  }
  catch {
    return null;
  }
}

/**
 * Read the server URL of this device.
 * @param {() => Storage} [getStorage] returns the storage, `localStorage` by default
 * @returns {string} the stored URL, or the production service
 */
export function readServerUrl(getStorage) {
  return parseServerUrl(readPreference('server-url', '', getStorage)) ?? DEFAULT_SERVER_URL;
}

/**
 * Store the server URL of this device, once it parses.
 * @param {string} text the typed address
 * @param {() => Storage} [getStorage] returns the storage, `localStorage` by default
 * @returns {boolean} true when stored
 */
export function writeServerUrl(text, getStorage) {
  const url = parseServerUrl(text);
  return url !== null && writePreference('server-url', url, getStorage);
}
