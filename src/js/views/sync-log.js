/**
 * Sync log screen: what sync overwrote, refused, or lost in the last 30 days, newest first (`SYN-8`, `SYN-9`).
 *
 * Each entry shows its kind and time, then the item and the values: an overwritten value names the lost and the kept value,
 * a rejected change its reason and the change that was undone, a lost list its name, and an error its detail.
 * An entry links to its item while that item still exists. Values render as text only, so they can be copied back by hand.
 * Opening the screen marks the log as seen, which clears the dot of the sync indicator (see sync-indicator.js).
 */

import { readPreference, writePreference } from '../core/preferences.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const LOG_DAYS = 30;
const SEEN_KEY = 'sync-log.seen';
const ISO_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/u;

/** Screen strings, for the strings module of TEC-13 to absorb. */
export const LOG_STRINGS = Object.freeze({
  intro: 'Values that sync overwrote or undid in the last 30 days.',
  empty: 'Nothing to show. Sync overwrote or undid nothing in the last 30 days.',
  retention: 'Entries stay for 30 days.',
  kinds: Object.freeze({
    overwritten: 'Overwritten value', rejected: 'Rejected change', 'lost-access': 'Lost access', error: 'Sync error',
  }),
  lost: 'Lost',
  kept: 'Kept',
  undone: 'Undone',
  open: 'Open',
  empty_value: 'empty',
  today: 'Today',
  yesterday: 'Yesterday',
  unknownTask: 'A task',
  unknownList: 'A list',
  unknownItem: 'An item',
  undoneChanges: (count) => `${count} queued ${count === 1 ? 'change was' : 'changes were'} undone`,
});

/**
 * Create an element with a class and optional text.
 * @param {Document} doc the document
 * @param {string} tag the tag name
 * @param {string} className the class
 * @param {string} [text] the text content
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
 * Create the marker of the last visit to the Sync log, kept per device.
 * Entries newer than the mark are unseen; every tab follows a mark another tab sets.
 * @param {object} [options] the dependencies
 * @param {() => Storage} [options.getStorage] returns the storage, `localStorage` by default
 * @param {() => Date} [options.now] returns the current time
 * @param {EventTarget|null} [options.win] the window, which reports storage changes of other tabs
 * @returns {{get: () => string|null, mark: (time?: string) => void, subscribe: (listener: (time: string) => void) => () => void}} the marker
 */
export function createSeenMarker({ getStorage, now = () => new Date(), win = globalThis.window ?? null } = {}) {
  const listeners = new Set();
  const get = () => {
    const time = readPreference(SEEN_KEY, null, getStorage);
    return typeof time === 'string' ? time : null;
  };
  const tell = () => {
    for (const listener of listeners) {
      listener(get());
    }
  };
  win?.addEventListener?.('storage', (event) => {
    if (event.key === null || event.key?.endsWith(SEEN_KEY)) {
      tell();
    }
  });
  return {
    get,

    /**
     * Mark the log as seen up to a time.
     * @param {string} [time] the ISO time, now by default
     */
    mark(time = now().toISOString()) {
      writePreference(SEEN_KEY, time, getStorage);
      tell();
    },

    /**
     * Listen to marks, including those of other tabs.
     * @param {(time: string|null) => void} listener called with the new mark
     * @returns {() => void} stops listening
     */
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

/**
 * Format the time of an entry as "Today 09:14", "Yesterday 22:40", or a date and time.
 * @param {string} iso the ISO time
 * @param {Date} now the current time
 * @returns {string} the text, empty without a valid time
 */
function formatTime(iso, now) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  const clock = new Intl.DateTimeFormat(undefined, { timeStyle: 'short' }).format(date);
  const days = Math.round((new Date(now.getFullYear(), now.getMonth(), now.getDate()) - new Date(date.getFullYear(), date.getMonth(), date.getDate())) / DAY_MS);
  if (days === 0) {
    return `${LOG_STRINGS.today} ${clock}`;
  }
  if (days === 1) {
    return `${LOG_STRINGS.yesterday} ${clock}`;
  }
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

/**
 * Format a field value as text.
 * @param {unknown} value the value
 * @returns {string} the text
 */
function formatValue(value) {
  if (value === null || value === undefined || value === '') {
    return LOG_STRINGS.empty_value;
  }
  if (typeof value === 'string' && ISO_TIME.test(value) && !Number.isNaN(new Date(value).getTime())) {
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
  }
  return typeof value === 'object' ? JSON.stringify(value) : String(value);
}

/**
 * Turn a field name into a label, such as `due-time` into `Due time`.
 * @param {string} field the field name
 * @returns {string} the label
 */
function fieldLabel(field) {
  const text = String(field ?? '').replaceAll('-', ' ');
  return text.charAt(0).toLocaleUpperCase() + text.slice(1);
}

/**
 * Find the item an entry is about.
 * @param {object} store the store facade
 * @param {object} entry the log entry
 * @returns {Promise<{name: string, href: string|null}>} the item name, and its route while it exists
 */
async function findItem(store, entry) {
  const target = entry.target ?? {};
  try {
    if (target.type === 'list') {
      const list = await store.getList(target.id);
      const exists = Boolean(list) && !list['deletion-time'];
      return { name: list?.name ?? entry.name ?? LOG_STRINGS.unknownList, href: exists ? `#/lists/${encodeURIComponent(list.id)}` : null };
    }
    const taskId = target.type === 'task' ? target.id : target['task-id'] ?? (target.type === 'membership' ? target.id : null);
    if (taskId) {
      const task = await store.getTask(taskId);
      const exists = Boolean(task) && !task['deletion-time'];
      return { name: task?.description ?? LOG_STRINGS.unknownTask, href: exists ? `#/tasks/${encodeURIComponent(task.id)}` : null };
    }
  }
  catch (error) {
    console.error('Reading a sync log item failed:', error);
  }
  return { name: entry.name ?? LOG_STRINGS.unknownItem, href: null };
}

/**
 * Describe the body of an entry as its item line and detail line.
 * @param {object} entry the log entry
 * @param {{name: string}} item the item of the entry
 * @returns {{item: string, detail: string}} the lines
 */
function describeEntry(entry, item) {
  switch (entry.kind) {
    case 'overwritten':
      return {
        item: `${item.name} · ${fieldLabel(entry.field)}`,
        detail: `${LOG_STRINGS.lost}: ${formatValue(entry.sent)} · ${LOG_STRINGS.kept}: ${formatValue(entry.kept)}`,
      };
    case 'rejected': {
      const fields = Object.entries(entry.fields ?? {}).map(([name, value]) => `${name}: ${formatValue(value)}`).join(', ');
      return { item: `${item.name} · ${entry.message ?? ''}`.replace(/ · $/u, ''), detail: fields ? `${LOG_STRINGS.undone}: ${fields}` : '' };
    }
    case 'lost-access':
      return { item: item.name, detail: LOG_STRINGS.undoneChanges(entry.undone ?? 0) };
    default:
      return { item: entry.message ?? '', detail: entry.detail ?? '' };
  }
}

/**
 * Mount the Sync log screen into its view element.
 * @param {HTMLElement} view the `[data-view="sync-log"]` element
 * @param {object} options the dependencies
 * @param {object} options.store the store facade
 * @param {{mark: (time?: string) => void}} options.seen the marker of the last visit
 * @param {() => Date} [options.now] returns the current time
 * @param {{subscribe: Function}} [options.sync] the sync engine, whose changes refresh the open screen
 * @returns {{update: () => Promise<void>, idle: () => Promise<void>, destroy: () => void}} the screen
 */
export function mountSyncLog(view, { store, seen, now = () => new Date(), sync }) {
  const doc = view.ownerDocument;
  const root = make(doc, 'div', 'sync-log');
  const intro = make(doc, 'p', 'sync-log__intro', LOG_STRINGS.intro);
  const list = make(doc, 'ul', 'sync-log__list');
  const empty = make(doc, 'p', 'sync-log__empty', LOG_STRINGS.empty);
  const note = make(doc, 'p', 'sync-log__note', LOG_STRINGS.retention);
  empty.hidden = true;
  root.append(intro, list, empty, note);
  view.replaceChildren(root);
  let destroyed = false;
  let latest = 0;

  /**
   * Build the row of an entry.
   * @param {object} entry the log entry
   * @param {Date} current the current time
   * @returns {Promise<HTMLLIElement>} the row
   */
  async function row(entry, current) {
    const item = await findItem(store, entry);
    const lines = describeEntry(entry, item);
    const element = make(doc, 'li', 'sync-log-entry');
    element.dataset.kind = entry.kind;
    const head = make(doc, 'div', 'sync-log-entry__head');
    const time = make(doc, 'time', 'sync-log-entry__time', formatTime(entry.time, current));
    time.dateTime = entry.time;
    head.append(make(doc, 'h2', 'sync-log-entry__kind', LOG_STRINGS.kinds[entry.kind] ?? entry.kind), time);
    element.append(head, make(doc, 'p', 'sync-log-entry__item', lines.item));
    if (lines.detail) {
      element.append(make(doc, 'p', 'sync-log-entry__detail', lines.detail));
    }
    if (item.href) {
      const link = make(doc, 'a', 'sync-log-entry__link', LOG_STRINGS.open);
      link.href = item.href;
      link.setAttribute('aria-label', `${LOG_STRINGS.open} ${item.name}`);
      element.append(link);
    }
    return element;
  }

  /**
   * Read the log and show the entries of the last 30 days, newest first, then mark them seen.
   * @returns {Promise<void>}
   */
  async function render() {
    const ticket = ++latest;
    const current = now();
    const cutoff = current.getTime() - LOG_DAYS * DAY_MS;
    const entries = (await store.queue.log()).filter((entry) => new Date(entry.time).getTime() >= cutoff).reverse();
    const rows = await Promise.all(entries.map((entry) => row(entry, current)));
    if (destroyed || ticket !== latest) {
      return;
    }
    list.replaceChildren(...rows);
    empty.hidden = rows.length > 0;
    const newest = entries[0]?.time ?? '';
    seen.mark(newest > current.toISOString() ? newest : current.toISOString());
  }

  let pending = render().catch((error) => console.error('Reading the sync log failed:', error));
  const stop = sync?.subscribe(() => {
    pending = render().catch((error) => console.error('Reading the sync log failed:', error));
  });

  return {
    /**
     * Show the log again, as when the route is opened once more.
     * @returns {Promise<void>}
     */
    update() {
      pending = render().catch((error) => console.error('Reading the sync log failed:', error));
      return pending;
    },

    /** @returns {Promise<void>} resolves once the entries are shown */
    idle: () => pending,

    /** Stop following the sync engine. */
    destroy() {
      destroyed = true;
      stop?.();
    },
  };
}
