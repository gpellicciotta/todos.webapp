/**
 * Recycle bin screen: deleted lists and tasks with their deletion time and days left (`BIN-1`).
 *
 * Each row offers Restore and Delete permanently (`BIN-2`, `BIN-4`).
 * Delete permanently asks in the row first, with Keep and Delete; Escape or Keep closes the question.
 * Restoring brings back every membership (`BIN-3`) and shows a toast whose Open action goes to the item.
 * Days count calendar days in the device timezone (`TEC-14`); the screen renders again after every store change.
 */

import { RETENTION_DAYS } from '../store/bin.js';
import { formatRoute } from '../ui/router.js';
import { spriteIcon } from './task-list.js';

const DAY_MS = 86_400_000;
const REDRAW_MS = 60_000;
const relative = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

/** Screen strings, for the strings module of TEC-13 to absorb. */
const STRINGS = Object.freeze({
  label: 'Deleted lists and tasks',
  note: `Deleted items stay here for ${RETENTION_DAYS} days.`,
  emptyTitle: 'The recycle bin is empty.',
  types: Object.freeze({ list: 'List', task: 'Task' }),
  restore: 'Restore',
  purge: 'Delete permanently',
  question: 'Delete forever?',
  keep: 'Keep',
  confirm: 'Delete',
  open: 'Open',
  lastDay: 'last day',
  restored: (name) => `Restored "${name}".`,
  expired: (name) => `"${name}" was deleted more than ${RETENTION_DAYS} days ago and can no longer be restored.`,
  restoreFailed: (name) => `"${name}" could not be restored.`,
  purgeFailed: (name) => `"${name}" could not be deleted.`,
});

/**
 * Count the calendar days between two times in the device timezone.
 * @param {Date} from the earlier time
 * @param {Date} to the later time
 * @returns {number} whole days between their local dates
 */
function calendarDays(from, to) {
  const day = (date) => Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  return Math.round((day(to) - day(from)) / DAY_MS);
}

/**
 * Describe when a bin entry was deleted and how long it stays, such as "Deleted 5 days ago · 25 days left".
 * @param {{'deletion-time': string, 'purge-time': string}} entry the bin entry
 * @param {Date} now the current time
 * @returns {string} the description
 */
export function describeDeletion(entry, now) {
  const ago = Math.max(0, calendarDays(new Date(entry['deletion-time']), now));
  // Days left count to the exact purge time, which a daylight saving change can move to another local date.
  const left = calendarDays(now, new Date(entry['purge-time']));
  const remaining = left <= 0 ? STRINGS.lastDay : `${left} ${left === 1 ? 'day' : 'days'} left`;
  return `Deleted ${relative.format(-ago, 'day')} · ${remaining}`;
}

/**
 * Return the name of a bin entry: a list's name or a task's description.
 * @param {object} entry the bin entry
 * @returns {string} the name
 */
function nameOf(entry) {
  return entry.type === 'list' ? entry.name : entry.description;
}

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
 * Create a button.
 * @param {Document} doc the document
 * @param {string} className the class
 * @param {string} text the visible label
 * @param {string} [role] the `data-role` that names it across renders
 * @returns {HTMLButtonElement} the button
 */
function button(doc, className, text, role) {
  const element = make(doc, 'button', className, text);
  element.type = 'button';
  if (role) {
    element.dataset.role = role;
  }
  return element;
}

/**
 * Mount the Recycle bin screen into its view element.
 * @param {HTMLElement} view the `[data-view="bin"]` element
 * @param {object} options screen options
 * @param {object} options.store the store facade
 * @param {{show: Function}} options.toaster the toaster
 * @param {(hash: string) => void} [options.navigate] opens a route, setting the location hash by default
 * @param {() => Date} [options.now] the clock
 * @returns {{update: () => void, idle: () => Promise<void>, destroy: () => void}} the screen
 */
export function mountRecycleBin(view, {
  store, toaster, navigate = (hash) => {
    view.ownerDocument.defaultView.location.hash = hash;
  }, now = () => new Date(),
}) {
  const doc = view.ownerDocument;
  let entries = [];
  let asking = null;
  let pending = null;
  let shownDay = null;

  const root = make(doc, 'div', 'bin');
  const note = make(doc, 'p', 'bin__note', STRINGS.note);
  const list = make(doc, 'ul', 'bin__list');
  list.setAttribute('aria-label', STRINGS.label);
  const empty = make(doc, 'div', 'empty-state');
  const emptyTitle = make(doc, 'p', 'empty-state__title', STRINGS.emptyTitle);
  emptyTitle.tabIndex = -1;
  empty.append(spriteIcon(doc, 'bin', 'icon empty-state__icon'), emptyTitle, make(doc, 'p', 'empty-state__text', STRINGS.note));
  root.append(note, list, empty);
  view.replaceChildren(root);

  /**
   * Return the key of a bin entry, unique across lists and tasks.
   * @param {object} entry the bin entry
   * @returns {string} the key
   */
  const keyOf = (entry) => `${entry.type}:${entry.id}`;

  /**
   * Move focus to a control of the row at an index, or to the empty bin text.
   * @param {number} index the row index
   * @param {string} role the `data-role` of the control
   */
  function focusRow(index, role) {
    const rows = [...list.children];
    const row = rows[Math.min(index, rows.length - 1)];
    (row?.querySelector(`[data-role="${role}"]`) ?? row?.querySelector('[data-role="restore"]') ?? emptyTitle).focus();
  }

  /**
   * Run a bin action and report a failure in a toast.
   * @param {object} entry the bin entry
   * @param {() => Promise<void>} action the store call
   * @param {(name: string) => string} failure the failure message
   * @returns {Promise<boolean>} true when the action succeeded
   */
  async function attempt(entry, action, failure) {
    try {
      await action();
      return true;
    }
    catch (error) {
      console.error('Recycle bin action failed:', error);
      toaster.show(error?.code === 'expired' ? STRINGS.expired(nameOf(entry)) : failure(nameOf(entry)));
      return false;
    }
  }

  /**
   * Restore an entry with its memberships, and offer to open it.
   * @param {object} entry the bin entry
   * @returns {Promise<void>}
   */
  async function restore(entry) {
    const done = await attempt(entry, () => (entry.type === 'list' ? store.restoreList(entry.id) : store.restoreTask(entry.id)),
      STRINGS.restoreFailed);
    if (done) {
      const hash = entry.type === 'list' ? formatRoute('list', { listId: entry.id }) : formatRoute('task', { taskId: entry.id });
      toaster.show(STRINGS.restored(nameOf(entry)), { actionLabel: STRINGS.open, onAction: () => navigate(hash) });
    }
  }

  /**
   * Delete an entry for good, after the row's question; the question stays open when it fails.
   * The render after a delete drops the question with its row.
   * @param {object} entry the bin entry
   * @returns {Promise<void>}
   */
  async function purge(entry) {
    await attempt(entry, () => store.purgeForever(entry.type, entry.id), STRINGS.purgeFailed);
  }

  /**
   * Create the actions of a row: Restore and Delete permanently, or the in-row question.
   * @param {object} entry the bin entry
   * @returns {HTMLElement} the actions element
   */
  function actionsOf(entry) {
    const name = nameOf(entry);
    if (asking === keyOf(entry)) {
      const group = make(doc, 'div', 'inline-confirm bin-row__confirm');
      group.setAttribute('role', 'group');
      group.setAttribute('aria-label', `Delete ${name} permanently`);
      const actions = make(doc, 'div', 'inline-confirm__actions');
      const keep = button(doc, 'button button--secondary', STRINGS.keep, 'keep');
      const confirm = button(doc, 'button button--danger', STRINGS.confirm, 'confirm');
      keep.addEventListener('click', () => ask(null, 'purge'));
      confirm.addEventListener('click', () => purge(entry));
      group.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          event.stopPropagation();
          ask(null, 'purge');
        }
      });
      actions.append(keep, confirm);
      group.append(make(doc, 'p', 'inline-confirm__text', STRINGS.question), actions);
      return group;
    }
    const actions = make(doc, 'div', 'bin-row__actions');
    const restoreButton = button(doc, 'button button--secondary', STRINGS.restore, 'restore');
    restoreButton.setAttribute('aria-label', `${STRINGS.restore} ${name}`);
    restoreButton.addEventListener('click', () => restore(entry));
    const purgeButton = button(doc, 'button button--secondary button--danger bin-row__purge', '', 'purge');
    purgeButton.setAttribute('aria-label', `Delete ${name} permanently`);
    purgeButton.append(spriteIcon(doc, 'close'), make(doc, 'span', 'bin-row__purge-label', STRINGS.purge));
    purgeButton.addEventListener('click', () => ask(keyOf(entry), 'keep'));
    actions.append(restoreButton, purgeButton);
    return actions;
  }

  /**
   * Open or close the in-row question, and move focus into the changed row.
   * @param {string|null} key the key of the entry to ask about, or null to close
   * @param {string} role the `data-role` that gets focus in that row
   */
  function ask(key, role) {
    const index = entries.findIndex((entry) => keyOf(entry) === (key ?? asking));
    asking = key;
    render();
    focusRow(index, role);
  }

  /**
   * Create the row of a bin entry.
   * @param {object} entry the bin entry
   * @param {Date} time the current time
   * @returns {HTMLLIElement} the row
   */
  function rowOf(entry, time) {
    const row = make(doc, 'li', 'bin-row');
    row.dataset.key = keyOf(entry);
    row.dataset.type = entry.type;
    const type = make(doc, 'span', 'bin-row__type');
    type.append(spriteIcon(doc, entry.type === 'list' ? 'lists' : 'tasks'), make(doc, 'span', 'visually-hidden', STRINGS.types[entry.type]));
    const text = make(doc, 'div', 'bin-row__text');
    // Compact rows hide the deletion part and keep the days left, as in "25 days left".
    const [deleted, left] = describeDeletion(entry, time).split(' · ');
    const meta = make(doc, 'span', 'bin-row__meta');
    meta.append(make(doc, 'span', 'bin-row__deleted', `${deleted} · `), left);
    text.append(make(doc, 'span', 'bin-row__name', nameOf(entry)), meta);
    row.append(type, text, actionsOf(entry));
    return row;
  }

  /** Render the entries, keeping focus on the same control of the same row, or on the row now at its place. */
  function render() {
    const focused = doc.activeElement?.closest?.('.bin-row');
    const memo = focused && list.contains(focused)
      ? { key: focused.dataset.key, role: doc.activeElement.dataset.role, index: [...list.children].indexOf(focused) } : null;
    if (asking && !entries.some((entry) => keyOf(entry) === asking)) {
      asking = null;
    }
    const time = now();
    shownDay = time.toDateString();
    list.replaceChildren(...entries.map((entry) => rowOf(entry, time)));
    list.hidden = entries.length === 0;
    note.hidden = entries.length === 0;
    empty.hidden = entries.length > 0;
    if (memo) {
      const index = entries.findIndex((entry) => keyOf(entry) === memo.key);
      focusRow(index < 0 ? memo.index : index, index < 0 ? 'restore' : memo.role);
    }
  }

  /**
   * Read the bin and render, once per burst of changes.
   * @returns {Promise<void>} resolves once rendered
   */
  function refresh() {
    pending ??= Promise.resolve().then(async () => {
      pending = null;
      entries = await store.listBin();
      render();
    }).catch((error) => {
      // A newer version in another tab closes the connection; the shell's Reload banner already says so.
      (error?.name === 'InvalidStateError' ? console.warn : console.error)('Recycle bin failed to render:', error);
    });
    return pending;
  }

  const unsubscribe = store.subscribe(refresh);
  // Days ago and days left follow the clock past midnight, so the rows render again only on a new local date.
  const timer = setInterval(() => {
    if (now().toDateString() !== shownDay) {
      render();
    }
  }, REDRAW_MS);
  const first = refresh();

  return {
    /** Follow a route of this view; the bin has no sub-routes. */
    update() {},

    /**
     * Wait for the first render.
     * @returns {Promise<void>} resolves once the first data rendered
     */
    idle: () => first,

    /** Stop following the store and the clock. */
    destroy() {
      unsubscribe();
      clearInterval(timer);
    },
  };
}
