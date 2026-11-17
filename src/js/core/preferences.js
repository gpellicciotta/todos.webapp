/**
 * Preferences in `localStorage`, under keys that start with `todos.`.
 *
 * Values are stored as JSON. Storage that is missing, blocked, or full never throws:
 * reads return the fallback and writes report failure, so the app works in private windows.
 * The views store their filters, grouping, and sort here (`TV-12`), All tasks once and each list on its own; Settings stores `theme`, `enter-adds`, and `server-url`.
 * The names in `SYNCED_SETTINGS` follow the account while connected (`SYN-13`); sync/settings.js uploads and downloads them.
 * Each write or removal of one records its edit time and marks it pending; every other key stays on this device.
 */

export const PREFIX = 'todos.';

/**
 * The settings that follow the account while connected, as full keys; a trailing `*` matches any rest of the key.
 * A later setting joins the sync by joining this list.
 */
export const SYNCED_SETTINGS = Object.freeze(['todos.view.tasks', 'todos.view.list.*', 'todos.view.lists', 'todos.lists.order', 'todos.enter-adds']);

/** The map of a synced name to its ISO edit time, and the names not uploaded yet; both stay on this device. */
export const EDIT_TIMES_KEY = 'settings.edit-times';
export const PENDING_KEY = 'settings.pending';

/**
 * Tell whether a full key follows the account.
 * @param {string} name the full key, such as `todos.view.tasks`
 * @returns {boolean} true for a synced setting
 */
export function isSyncedSetting(name) {
  return typeof name === 'string' && SYNCED_SETTINGS.some((pattern) => (pattern.endsWith('*')
    ? name.length >= pattern.length && name.startsWith(pattern.slice(0, -1))
    : name === pattern));
}

/**
 * Read the edit times of the synced settings.
 * @param {() => Storage} [getStorage] returns the storage, `localStorage` by default
 * @returns {Record<string, string>} the ISO edit time by full key; a key without one counts as the oldest
 */
export function readEditTimes(getStorage) {
  const stored = readPreference(EDIT_TIMES_KEY, {}, getStorage);
  return stored && typeof stored === 'object' && !Array.isArray(stored) ? stored : {};
}

/**
 * Read the synced settings changed since the last upload.
 * @param {() => Storage} [getStorage] returns the storage, `localStorage` by default
 * @returns {string[]} the full keys
 */
export function readPendingSettings(getStorage) {
  const stored = readPreference(PENDING_KEY, [], getStorage);
  return Array.isArray(stored) ? stored.filter(isSyncedSetting) : [];
}

/**
 * Record an edit of a synced setting: its edit time, after the stored one so a local edit beats what it replaced, and its pending name.
 * @param {string} name the full key
 * @param {() => Storage} [getStorage] returns the storage
 */
function recordEdit(name, getStorage) {
  const times = readEditTimes(getStorage);
  const previous = Date.parse(times[name] ?? '');
  const now = Date.now();
  times[name] = new Date(Number.isFinite(previous) && previous >= now ? previous + 1 : now).toISOString();
  writePreference(EDIT_TIMES_KEY, times, getStorage);
  const pending = readPendingSettings(getStorage);
  if (!pending.includes(name)) {
    writePreference(PENDING_KEY, [...pending, name], getStorage);
  }
  [...editListeners].forEach((listener) => listener(name));
}

const editListeners = new Set();
const settingListeners = new Set();

/**
 * Follow local edits of synced settings on this page, so the sync engine uploads them soon.
 * @param {(name: string) => void} listener called with the full key after each recorded edit
 * @returns {() => void} stops following
 */
export function onSettingEdit(listener) {
  editListeners.add(listener);
  return () => editListeners.delete(listener);
}

/**
 * Tell the listeners of this page that the sync changed stored settings.
 * @param {string[]} names the full keys that changed
 */
export function announceSettings(names) {
  if (names.length > 0) {
    [...settingListeners].forEach((listener) => listener(names));
  }
}

/**
 * Follow changes of synced settings: downloads on this page, and writes in another tab through the `storage` event.
 * @param {(names: string[]|null) => void} listener called with the changed full keys; null when the whole storage was cleared
 * @param {EventTarget|null} [target] the window that reports `storage` events
 * @returns {() => void} stops following
 */
export function onSettingsChange(listener, target = globalThis) {
  const onStorage = (event) => {
    if (event.key === null || isSyncedSetting(event.key)) {
      listener(event.key === null ? null : [event.key]);
    }
  };
  settingListeners.add(listener);
  target?.addEventListener?.('storage', onStorage);
  return () => {
    settingListeners.delete(listener);
    target?.removeEventListener?.('storage', onStorage);
  };
}

/**
 * Tell whether a change notice names a key.
 * @param {string[]|null} names the changed full keys, or null for any
 * @param {string} name the full key
 * @returns {boolean} true when the key may have changed
 */
export function touchesSetting(names, name) {
  return names === null || names.includes(name);
}

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
  const name = PREFIX + key;
  const raw = JSON.stringify(value);
  let previous;
  try {
    const storage = getStorage();
    previous = isSyncedSetting(name) ? storage.getItem(name) : null;
    storage.setItem(name, raw);
  }
  catch {
    return false;
  }
  if (isSyncedSetting(name) && previous !== raw) {
    recordEdit(name, getStorage);
  }
  return true;
}

/**
 * Remove a preference.
 * @param {string} key the key without the prefix
 * @param {() => Storage} [getStorage] returns the storage, `localStorage` by default
 * @returns {boolean} true when removed, or when nothing was stored
 */
export function removePreference(key, getStorage = () => globalThis.localStorage) {
  const name = PREFIX + key;
  let previous;
  try {
    const storage = getStorage();
    previous = isSyncedSetting(name) ? storage.getItem(name) : null;
    storage.removeItem(name);
  }
  catch {
    return false;
  }
  if (previous !== null) {
    recordEdit(name, getStorage);
  }
  return true;
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

/**
 * Read whether Enter in the add field adds the typed task (Make Enter add); it is on unless stored off.
 * @param {() => Storage} [getStorage] returns the storage, `localStorage` by default
 * @returns {boolean} true when Enter adds
 */
export function readEnterAdds(getStorage = () => globalThis.localStorage) {
  return readPreference('enter-adds', true, getStorage) !== false;
}

/**
 * Store whether Enter in the add field adds the typed task.
 * @param {boolean} value true when Enter adds
 * @param {() => Storage} [getStorage] returns the storage, `localStorage` by default
 * @returns {boolean} true when stored
 */
export function writeEnterAdds(value, getStorage) {
  return writePreference('enter-adds', value === true, getStorage);
}

/** Lead times of reminders in minutes before the due time; core/reminders.js holds the same list. */
const REMINDER_LEADS = [0, 5, 15, 30, 60];

/**
 * Read whether reminders are on for this device; they are off unless stored on.
 * @param {() => Storage} [getStorage] returns the storage, `localStorage` by default
 * @returns {boolean} true when reminders are on
 */
export function readReminders(getStorage = () => globalThis.localStorage) {
  return readPreference('reminders', false, getStorage) === true;
}

/**
 * Store whether reminders are on, and the time they turned on, so older due times never notify.
 * @param {boolean} value true when reminders are on
 * @param {() => Storage} [getStorage] returns the storage, `localStorage` by default
 * @param {number} [now] the current time in Unix milliseconds
 * @returns {boolean} true when stored
 */
export function writeReminders(value, getStorage, now = Date.now()) {
  if (value === true && !writePreference('reminders-since', now, getStorage)) {
    return false;
  }
  return writePreference('reminders', value === true, getStorage);
}

/**
 * Read when reminders turned on, in Unix milliseconds.
 * @param {() => Storage} [getStorage] returns the storage, `localStorage` by default
 * @returns {number} the time, or 0 when never
 */
export function readRemindersSince(getStorage = () => globalThis.localStorage) {
  const value = readPreference('reminders-since', 0, getStorage);
  return Number.isFinite(value) ? value : 0;
}

/**
 * Read the reminder lead time in minutes; an unknown value falls back to 0, at the due time.
 * @param {() => Storage} [getStorage] returns the storage, `localStorage` by default
 * @returns {number} 0, 5, 15, 30, or 60
 */
export function readReminderLead(getStorage = () => globalThis.localStorage) {
  const value = readPreference('reminder-lead', 0, getStorage);
  return REMINDER_LEADS.includes(value) ? value : 0;
}

/**
 * Store the reminder lead time.
 * @param {number} minutes 0, 5, 15, 30, or 60
 * @param {() => Storage} [getStorage] returns the storage, `localStorage` by default
 * @returns {boolean} true when stored
 */
export function writeReminderLead(minutes, getStorage) {
  return REMINDER_LEADS.includes(minutes) && writePreference('reminder-lead', minutes, getStorage);
}

/** Default, minimum, and maximum widths of the side panels in rem; panel-resize.js holds the same limits. */
const PANEL_DEFAULTS = { sidebar: { fallback: 16, min: 12, max: 24 }, editor: { fallback: 25, min: 20, max: 40 } };

/**
 * Read the widths of the lists sidebar and the task editor panel on this device, in rem.
 * A missing, unreadable, or out of range value falls back to its default.
 * @param {() => Storage} [getStorage] returns the storage, `localStorage` by default
 * @returns {{sidebar: number, editor: number}} the widths
 */
export function readPanelWidths(getStorage) {
  const stored = readPreference('view.panels', null, getStorage);
  const read = (kind) => {
    const { fallback, min, max } = PANEL_DEFAULTS[kind];
    const value = stored !== null && typeof stored === 'object' ? stored[kind] : undefined;
    return typeof value === 'number' && value >= min && value <= max ? value : fallback;
  };
  return { sidebar: read('sidebar'), editor: read('editor') };
}

/**
 * Store the panel widths of this device (`SYN-13` keeps them out of the account sync).
 * @param {{sidebar: number, editor: number}} widths the widths in rem
 * @param {() => Storage} [getStorage] returns the storage, `localStorage` by default
 * @returns {boolean} true when stored
 */
export function writePanelWidths(widths, getStorage) {
  return writePreference('view.panels', { sidebar: widths.sidebar, editor: widths.editor }, getStorage);
}

/** The wide states of the sidebar that the nav toggle cycles through. */
const NAV_STATES = ['open', 'rail', 'hidden'];

/**
 * Read the wide sidebar state of this device: open, an icon rail, or hidden.
 * A missing, unreadable, or unknown value means open.
 * @param {() => Storage} [getStorage] returns the storage, `localStorage` by default
 * @returns {'open'|'rail'|'hidden'} the state
 */
export function readNavState(getStorage) {
  const stored = readPreference('view.nav', 'open', getStorage);
  return NAV_STATES.includes(stored) ? stored : 'open';
}

/**
 * Store the wide sidebar state of this device (`SYN-13` keeps it out of the account sync).
 * @param {string} state open, rail, or hidden
 * @param {() => Storage} [getStorage] returns the storage, `localStorage` by default
 * @returns {boolean} true when stored; false for another value or a failed write
 */
export function writeNavState(state, getStorage) {
  return NAV_STATES.includes(state) && writePreference('view.nav', state, getStorage);
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
