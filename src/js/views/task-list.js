/**
 * Task list: the task rows of All tasks and the list view, with their status and More menus.
 *
 * A row shows the status button, the description, the done and target counts above target 1, the due chip,
 * up to two list chips, and the note count. The open link fills the row and opens the task editor route.
 * A click on the status button ticks: it posts `complete` below target, `uncomplete` once completed, and `reopen`
 * once cancelled; `x` does the same on the focused row (`TSK-4`).
 * A right-click, a long press by touch, Down, Up, Shift+F10, or the Menu key on it opens the status menu,
 * which offers `start`, `unstart`, `cancel`, and `reopen` while their preconditions hold.
 * An event that hides the row under the view's filters shows an Undo toast, which Ctrl+Z also runs.
 * The More button offers Add to list and Delete, which moves the task to the recycle bin
 * with an Undo toast (`TSK-8`, `TSK-11`). Status is not in the More menu; the status button sets it.
 * In a list view, the More menu adds Remove from this list, and Move up and Move down while moves are on,
 * when rows also show a drag handle (`LV-3`).
 * One status menu and one More menu serve every row: each opening attaches the menu to that row's button.
 * Rendering again keeps an open menu open on the same row and item, and keeps focus on the same row control.
 * Rows are kept by key, the task id or, in a grouped list, the group and the task id, since a task of several lists
 * shows in each group: a render builds only the rows whose content changed and moves as few rows as it can,
 * and the clock tick redraws only due chips (`TEC-16`).
 * A grouped list shows a header row before each group, with the group name and count (`VO-10`).
 * The count reads "6 of 10" while the view's filters hide tasks of the group, else the plain total.
 * Headers are 32 px rows of the virtual list that take no selection or drag. Their one control, a button with
 * `aria-expanded`, collapses the group: its rows leave the list until it expands again.
 * A collapsed group stays collapsed by group key across renders and filter changes, for the life of the task list.
 * A list of more than 200 tasks renders only the rows in view plus a buffer, so 5000 tasks open fast (`TEC-16`).
 * Padding on the list and a margin on a row after a gap stand in for the rows left out, so the scroll height holds;
 * the offsets of the rows add up the row and header heights.
 * The focused row, the row of an open menu, the dragged row, and the selected row stay rendered with their
 * neighbors, so focus, menus, Tab order, and drags survive a scroll. Rows carry `aria-setsize` and `aria-posinset`.
 * The menus live outside the list, since the list is a size container, which would anchor fixed menus.
 * `markAdded` highlights a new task's row for two seconds and scrolls it into view, rendering it first when needed.
 */

import { applyEvent, dueTimeOf, statusOf } from '../core/occurrences.js';
import { isOverdue } from '../core/overdue.js';
import { can, canTrashTask, listRole, taskRole } from '../core/permissions.js';
import { attachMenu } from '../../vendor/design/js/menu.js';

const ICONS = 'img/icons.svg';
const SVG = 'http://www.w3.org/2000/svg';
const DAY_MS = 86_400_000;
const MAX_LIST_CHIPS = 2;
/** Lists up to this many tasks render every row; longer lists render the rows in view plus a buffer. */
const FULL_ROWS = 200;
/**
 * The rows rendered past each edge of the view, so a scroll shows built rows before the next update.
 * A list's first render leaves them out and adds them once its rows painted, so the view opens sooner.
 */
const BUFFER_ROWS = 20;
/** How long the row of a new task stays highlighted. */
const ADDED_MS = 2000;
/** The row height until a row was measured: the 48 px of the `--row-height` token. */
const ROW_PX = 48;
/** The header height until a header was measured: 32 px, two thirds of the row height. */
const HEADER_PX = 32;
/** The most renders for one change: each measures the rows that showed for the first time, so few are needed. */
const MAX_PASSES = 4;
/** How long a touch must rest on a status button to open the status menu instead of ticking. */
const LONG_PRESS_MS = 500;
/** How far a touch may move before it no longer counts as a long press, in pixels. */
const LONG_PRESS_SLOP = 10;
let instances = 0;

/** Status names, in lifecycle order. */
export const STATUS_LABELS = Object.freeze({
  ready: 'To do', 'in-progress': 'In progress', completed: 'Completed', cancelled: 'Cancelled',
});

/**
 * The event actions of the status menu, in menu order, with their labels and the status each leads to,
 * whose icon the item shows. The status button ticks, so `complete` and `uncomplete` have no entry.
 */
export const STATUS_ACTIONS = Object.freeze([
  Object.freeze({ event: 'start', label: 'Start', status: 'in-progress' }),
  Object.freeze({ event: 'unstart', label: 'Undo start', status: 'ready' }),
  Object.freeze({ event: 'cancel', label: 'Cancel task', status: 'cancelled' }),
  Object.freeze({ event: 'reopen', label: 'Reopen', status: 'ready' }),
]);

/** The event that undoes each user event, for the Undo toast. */
const INVERSE = Object.freeze({
  complete: 'uncomplete', uncomplete: 'complete', start: 'unstart', unstart: 'start', cancel: 'reopen', reopen: 'cancel',
});

/**
 * Tell whether an occurrence shows its done and target counts: a target above 1, or a count past a target of 1.
 * @param {object} occurrence the current occurrence
 * @returns {boolean} true when the counts show
 */
export function showsCount(occurrence) {
  return occurrence['target-count'] > 1 || occurrence['completion-count'] > 1;
}

/**
 * Return the done and target counts of an occurrence as words, such as `2 of 3 done`.
 * @param {object} occurrence the current occurrence
 * @returns {string} the counts
 */
export function countWords(occurrence) {
  return `${occurrence['completion-count']} of ${occurrence['target-count']} done`;
}

/** Row strings, for the strings module of TEC-13 to absorb. */
const STRINGS = Object.freeze({
  statusOf: 'Status of ',
  tick: (type, description, occurrence) => {
    if (type === 'reopen') {
      return `Reopen ${description}`;
    }
    if (showsCount(occurrence)) {
      return `${type === 'complete' ? 'Tick' : 'Untick'} ${description}, ${countWords(occurrence)}`;
    }
    return `Mark ${description} ${type === 'complete' ? 'completed' : 'to do'}`;
  },
  statusHint: (occurrence) => `${STATUS_LABELS[occurrence.status]}${showsCount(occurrence) ? `, ${countWords(occurrence)}` : ''}`
    + '. Right-click or press Down for more actions.',
  marked: (status) => `Task marked ${STATUS_LABELS[status].toLowerCase()}.`,
  done: ' done',
  moreFor: 'More actions for ',
  addToList: 'Add to list',
  addTo: 'Add to a list: ',
  removeFromList: 'Remove from this list',
  moveUp: 'Move up',
  moveDown: 'Move down',
  delete: 'Delete',
  deleted: 'Task moved to the recycle bin.',
  failed: 'That change could not be saved.',
  overdue: 'Overdue',
  today: 'Today',
  tomorrow: 'Tomorrow',
  moreLists: ' more lists',
  notes: ' notes',
  groupCount: (shown, total) => (shown < total ? `${shown} of ${total}` : String(total)),
  groupLabel: (label, shown, total) => `${label}, ${shown < total ? `${shown} of ` : ''}${total} ${total === 1 ? 'task' : 'tasks'}`,
});

/**
 * Return the event one click on the status button posts, its tick: `complete` below target, `uncomplete` once completed,
 * and `reopen` for a cancelled occurrence, whose count changes only after it reopens.
 * @param {object} occurrence the current occurrence
 * @returns {'complete'|'uncomplete'|'reopen'} the event type
 */
export function tickEvent(occurrence) {
  if (occurrence.status === 'cancelled') {
    return 'reopen';
  }
  return occurrence.status === 'completed' ? 'uncomplete' : 'complete';
}

/**
 * Return the status menu actions whose preconditions hold for an occurrence, as the todos.server status rules say.
 * @param {object} occurrence the current occurrence
 * @returns {object[]} the entries of `STATUS_ACTIONS` that apply
 */
export function statusActions(occurrence) {
  return STATUS_ACTIONS.filter(({ event }) => applyEvent(occurrence, { type: event, 'creation-time': occurrence['start-time'] }) !== null);
}


/**
 * Tell whether a key event comes from a text field, where letter shortcuts must type instead.
 * @param {Event} event the key event
 * @returns {boolean} whether the target takes text
 */
function inTextField(event) {
  const target = event.target;
  return Boolean(target?.isContentEditable || target?.closest?.('input, textarea, select, [contenteditable="true"]'));
}

/**
 * Create a sprite icon element.
 * @param {Document} doc the document
 * @param {string} id the symbol identifier
 * @param {string} [className] the class of the SVG element
 * @returns {SVGSVGElement} the icon
 */
export function spriteIcon(doc, id, className = 'icon') {
  const svg = doc.createElementNS(SVG, 'svg');
  svg.setAttribute('class', className);
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  const use = doc.createElementNS(SVG, 'use');
  use.setAttribute('href', `${ICONS}#${id}`);
  svg.append(use);
  return svg;
}

/**
 * Create an element with a class and optional text.
 * @param {Document} doc the document
 * @param {string} tag the tag name
 * @param {string} className the class
 * @param {string} [text] the text content
 * @returns {HTMLElement} the element
 */
export function make(doc, tag, className, text) {
  const element = doc.createElement(tag);
  element.className = className;
  if (text !== undefined) {
    element.textContent = text;
  }
  return element;
}

/**
 * Return the local midnight of a time, in Unix milliseconds.
 * @param {Date} date the time
 * @returns {number} the start of its local day
 */
function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

const formats = new Map();

/**
 * Return a shared date and time format, since creating one costs far more than using it.
 * @param {string|undefined} locale the locale, the user's when undefined
 * @param {object} settings the format settings
 * @returns {Intl.DateTimeFormat} the format
 */
function dateFormat(locale, settings) {
  const key = `${locale}|${JSON.stringify(settings)}`;
  if (!formats.has(key)) {
    formats.set(key, new Intl.DateTimeFormat(locale, settings));
  }
  return formats.get(key);
}

/**
 * Format a task's due time for its chip: Overdue, Today or Tomorrow, a weekday within the week, or a date.
 * A due time of 23:59 is a date-only due time (`TSK-6`), so it shows no time of day.
 * @param {object} task the task
 * @param {Date|number} [now] the current time
 * @param {string} [locale] the locale of the date and time formats, the user's by default
 * @returns {{text: string, overdue: boolean}|null} the chip, or null without a due time
 */
export function formatDue(task, now = new Date(), locale = undefined) {
  if (!dueTimeOf(task)) {
    return null;
  }
  if (isOverdue(task, now)) {
    return { text: STRINGS.overdue, overdue: true };
  }
  const due = new Date(dueTimeOf(task));
  const current = new Date(now);
  const days = Math.round((startOfDay(due) - startOfDay(current)) / DAY_MS);
  const time = due.getHours() === 23 && due.getMinutes() === 59
    ? '' : ` ${dateFormat(locale, { hour: '2-digit', minute: '2-digit' }).format(due)}`;
  if (days === 0 || days === 1) {
    return { text: `${days === 0 ? STRINGS.today : STRINGS.tomorrow}${time}`, overdue: false };
  }
  if (days > 1 && days < 7) {
    return { text: `${dateFormat(locale, { weekday: 'short' }).format(due)}${time}`, overdue: false };
  }
  const format = { day: 'numeric', month: 'short' };
  if (due.getFullYear() !== current.getFullYear()) {
    format.year = 'numeric';
  }
  return { text: dateFormat(locale, format).format(due), overdue: false };
}

/**
 * Create a chip with an optional icon and visually hidden meaning.
 * @param {Document} doc the document
 * @param {string} className the classes
 * @param {string} text the visible text
 * @param {{icon?: string, hidden?: string}} [extra] an icon and a visually hidden suffix
 * @returns {HTMLElement} the chip
 */
function chip(doc, className, text, { icon, hidden } = {}) {
  const element = make(doc, 'span', className);
  if (icon) {
    element.append(spriteIcon(doc, icon));
  }
  element.append(text);
  if (hidden) {
    element.append(make(doc, 'span', 'visually-hidden', hidden));
  }
  return element;
}

/**
 * Compute what the row of a task shows, with a key that changes whenever the row must be built again.
 * The due chip has a key of its own, since the clock changes it without any change to the task.
 * @param {object} task the task
 * @param {object} ctx the render context of `render`
 * @param {object} options the list options
 * @returns {{key: string, dueKey: string, due: object|null, count: string|null, href: string, handle: boolean,
 *   names: string[], notes: number, locked: boolean, menu: boolean}} the row content
 */
function viewOf(task, ctx, options) {
  const ids = ctx.listsByTask?.get(task.id) ?? [];
  const access = accessOf(task, ctx, options.listId);
  const names = ids.length === 0 ? [] : [...(ctx.lists?.values() ?? [])]
    .filter((list) => list.id !== options.listId && ids.includes(list.id)).map((list) => list.name);
  const notes = ctx.notesByTask?.get(task.id)?.length ?? 0;
  const href = options.hrefOf(task);
  const handle = Boolean(options.moves?.enabled());
  const due = formatDue(task, ctx.now);
  const occurrence = task['current-occurrence'];
  const count = showsCount(occurrence) ? `${occurrence['completion-count']}/${occurrence['target-count']}` : null;
  return {
    key: JSON.stringify([statusOf(task), count, task.description, href, handle, names, notes, access.locked, access.menu]),
    dueKey: due ? `${due.overdue}|${due.text}` : '', due, count, href, handle, names, notes, locked: access.locked, menu: access.menu,
  };
}

/**
 * Work out what the user's roles allow on a task (`SHR-4`, `SHR-5`): changing it, adding it to lists, removing it
 * from the list of a list view, and sending it to the recycle bin. A local task allows everything.
 * @param {object} task the task
 * @param {{lists?: Map<string, object>, listsByTask?: Map<string, string[]>, userId?: number|string|null}} ctx the render context
 * @param {string|null} listId the list a list view shows
 * @returns {{locked: boolean, add: boolean, remove: boolean, trash: boolean, menu: boolean}} the allowed actions;
 *   `menu` tells whether the More menu has an entry beyond the moves
 */
function accessOf(task, ctx, listId) {
  const held = (ctx.listsByTask?.get(task.id) ?? []).map((id) => ctx.lists?.get(id)).filter(Boolean);
  const userId = ctx.userId ?? null;
  const role = taskRole(task, held, userId);
  const trash = canTrashTask(task, held, userId);
  const add = can(role, 'add-to-list');
  const remove = listId !== null && can(listRole(ctx.lists?.get(listId)), 'remove-from-list');
  return { locked: !can(role, 'update-task'), add, remove, trash, menu: add || remove || trash };
}

/**
 * Create the chips of a row: the done and target counts, the due chip, up to two list chips, and the note count.
 * @param {Document} doc the document
 * @param {{count: string|null, due: object|null, names: string[], notes: number}} view the row content of `viewOf`
 * @returns {HTMLElement|null} the chips, or null without any
 */
function metaOf(doc, { count, due, names, notes }) {
  const meta = make(doc, 'span', 'task-row__meta');
  if (count) {
    meta.append(chip(doc, 'chip task-row__count', count, { hidden: STRINGS.done }));
  }
  if (due) {
    meta.append(chip(doc, due.overdue ? 'chip chip--overdue' : 'chip', due.text, { icon: due.overdue ? 'alert' : 'clock' }));
  }
  for (const name of names.slice(0, MAX_LIST_CHIPS)) {
    const listChip = make(doc, 'span', 'chip task-row__list');
    listChip.append(make(doc, 'span', 'task-row__chip-text', name));
    meta.append(listChip);
  }
  if (names.length > MAX_LIST_CHIPS) {
    meta.append(chip(doc, 'chip task-row__more-lists', `+${names.length - MAX_LIST_CHIPS}`, { hidden: STRINGS.moreLists }));
  }
  if (notes > 0) {
    meta.append(chip(doc, 'chip task-row__notes', String(notes), { icon: 'note', hidden: STRINGS.notes }));
  }
  return meta.childElementCount > 0 ? meta : null;
}

/**
 * Create the empty row that the rows of a list are cloned from, since cloning beats building each element.
 * @param {Document} doc the document
 * @param {boolean} handle whether the row has a drag handle
 * @returns {HTMLLIElement} the row
 */
function rowTemplate(doc, handle) {
  const row = make(doc, 'li', 'task-row');
  if (handle) {
    const grip = make(doc, 'span', 'task-row__handle');
    grip.setAttribute('aria-hidden', 'true');
    grip.append(spriteIcon(doc, 'grip'));
    row.append(grip);
  }
  const status = make(doc, 'button', 'icon-button status-button');
  status.type = 'button';
  status.dataset.role = 'status';
  status.append(spriteIcon(doc, 'status-ready'));
  const open = make(doc, 'a', 'task-row__open');
  open.dataset.role = 'open';
  open.append(make(doc, 'span', 'task-row__description'));
  const more = make(doc, 'button', 'icon-button task-row__more');
  more.type = 'button';
  more.dataset.role = 'more';
  more.setAttribute('aria-haspopup', 'menu');
  more.append(spriteIcon(doc, 'more'));
  row.append(status, open, more);
  return row;
}

/**
 * Render an empty group header: a heading whose toggle button holds a chevron, the group name, and the task count.
 * @param {Document} doc the document
 * @returns {HTMLLIElement} the header, for `fillHeader`
 */
function renderHeader(doc) {
  const header = make(doc, 'li', 'group-header');
  const heading = make(doc, 'h3', 'group-header__heading');
  const toggle = make(doc, 'button', 'group-header__toggle');
  toggle.type = 'button';
  toggle.dataset.role = 'toggle';
  toggle.append(
    spriteIcon(doc, 'chevron-down', 'icon icon--sm group-header__icon'),
    make(doc, 'span', 'group-header__name'),
    make(doc, 'span', 'group-header__count'),
  );
  heading.append(toggle);
  header.append(heading);
  return header;
}

/**
 * Return the count of a group: its shown tasks and its total, which is never below the shown tasks.
 * @param {{tasks: object[], total?: number}} group the group
 * @returns {{shown: number, total: number}} the count
 */
function countOf(group) {
  const shown = group.tasks.length;
  return { shown, total: Math.max(group.total ?? shown, shown) };
}

/**
 * Fill a group header: the name, the count as "6 of 10" while filters hide tasks of the group, and the toggle state.
 * @param {HTMLLIElement} header the header of `renderHeader`
 * @param {{key: string, label: string, tasks: object[], total?: number}} group the group
 * @param {boolean} collapsed whether the group is collapsed
 */
function fillHeader(header, group, collapsed) {
  const { shown, total } = countOf(group);
  const toggle = header.querySelector('.group-header__toggle');
  header.dataset.groupKey = group.key;
  header.querySelector('.group-header__name').textContent = group.label;
  header.querySelector('.group-header__count').textContent = STRINGS.groupCount(shown, total);
  toggle.setAttribute('aria-label', STRINGS.groupLabel(group.label, shown, total));
  toggle.setAttribute('aria-expanded', String(!collapsed));
}

/**
 * Render the row of a task from the row template.
 * @param {Document} doc the document
 * @param {object} task the task
 * @param {object} view the row content of `viewOf`
 * @param {HTMLLIElement} template the row template of `rowTemplate`
 * @param {string|null} selected the task whose editor is open
 * @returns {HTMLLIElement} the row
 */
function renderRow(doc, task, view, template, selected) {
  const row = template.cloneNode(true);
  row.dataset.status = statusOf(task);
  row.dataset.taskId = task.id;
  const more = row.lastElementChild;
  const open = more.previousElementSibling;
  const status = open.previousElementSibling;
  const occurrence = task['current-occurrence'];
  status.setAttribute('aria-label', STRINGS.tick(tickEvent(occurrence), task.description, occurrence));
  status.title = STRINGS.statusHint(occurrence);
  status.dataset.status = statusOf(task);
  status.firstElementChild.firstElementChild.setAttribute('href', `${ICONS}#status-${statusOf(task)}`);
  open.href = view.href;
  if (task.id === selected) {
    open.setAttribute('aria-current', 'page');
  }
  open.firstElementChild.textContent = task.description;
  const meta = metaOf(doc, view);
  if (meta) {
    open.append(meta);
  }
  more.setAttribute('aria-label', `${STRINGS.moreFor}${task.description}`);
  status.disabled = view.locked;
  more.hidden = !view.menu && !view.handle;
  return row;
}

/**
 * Show the chips of a row anew, such as a due chip the clock changed, keeping the rest of the row.
 * @param {Document} doc the document
 * @param {HTMLLIElement} row the row
 * @param {object} view the row content of `viewOf`
 */
function updateMeta(doc, row, view) {
  const open = row.querySelector('.task-row__open');
  const meta = metaOf(doc, view);
  const old = open.querySelector('.task-row__meta');
  if (old && meta) {
    old.replaceWith(meta);
  }
  else if (old) {
    old.remove();
  }
  else if (meta) {
    open.append(meta);
  }
}

/**
 * Return the indexes of the longest run of entries whose old places increase: those rows can stay put.
 * @param {number[]} places the old place of each entry, or -1 for a new entry
 * @returns {Set<number>} the indexes of the entries that stay
 */
function stayers(places) {
  const tails = [];
  const previous = new Array(places.length);
  for (let index = 0; index < places.length; index += 1) {
    if (places[index] < 0) {
      continue;
    }
    let low = 0;
    let high = tails.length;
    while (low < high) {
      const middle = (low + high) >> 1;
      if (places[tails[middle]] < places[index]) {
        low = middle + 1;
      }
      else {
        high = middle;
      }
    }
    previous[index] = low > 0 ? tails[low - 1] : -1;
    tails[low] = index;
  }
  const stay = new Set();
  for (let index = tails.at(-1) ?? -1; index >= 0; index = previous[index]) {
    stay.add(index);
  }
  return stay;
}

/**
 * Put rows into a list in the given order, moving as few of the rows already there as possible.
 * The list must hold no rows other than the given ones.
 * @param {HTMLElement} list the list
 * @param {HTMLElement[]} rows the rows, in order
 */
function placeRows(list, rows) {
  if (list.childElementCount === 0) {
    list.append(...rows);
    return;
  }
  const old = new Map([...list.children].map((row, index) => [row, index]));
  const stay = stayers(rows.map((row) => old.get(row) ?? -1));
  let anchor = null;
  for (let index = rows.length - 1; index >= 0; index -= 1) {
    if (!stay.has(index)) {
      list.insertBefore(rows[index], anchor);
    }
    anchor = rows[index];
  }
}

/**
 * Create a menu item.
 * @param {Document} doc the document
 * @param {string} role `menuitem` or `menuitemradio`
 * @param {string} text the label
 * @param {object} data the dataset entries
 * @param {{icon?: string, checked?: boolean}} [extra] a leading icon and the radio state
 * @returns {HTMLButtonElement} the item
 */
function menuItem(doc, role, text, data, { icon, checked, danger } = {}) {
  const item = make(doc, 'button', danger ? 'menu__item menu__item--danger' : 'menu__item');
  item.type = 'button';
  item.setAttribute('role', role);
  Object.assign(item.dataset, data);
  if (role === 'menuitemradio') {
    item.setAttribute('aria-checked', String(Boolean(checked)));
    item.append(spriteIcon(doc, 'check', 'icon menu__check'));
  }
  if (icon) {
    item.append(spriteIcon(doc, icon));
  }
  item.append(text);
  return item;
}

/**
 * Create a task list.
 * @param {object} options list options
 * @param {Document} [options.document] the document
 * @param {object} options.store the store facade
 * @param {{show: Function}} options.toaster shows the Undo toast
 * @param {string} options.label the accessible name of the list
 * @param {(task: object) => string} options.hrefOf the editor route of a task
 * @param {string|null} [options.listId] the list a list view shows, left out of the list chips
 * @param {(error: unknown) => void} [options.onError] reports a failed change
 * @param {() => HTMLElement|null} [options.fallbackFocus] the control that gets focus when the last row leaves
 * @param {{enabled: () => boolean, step: (taskId: string, step: -1|1) => void}} [options.moves] the moves
 *   of a list view: whether they are on, and the move of a task one row up or down
 * @param {() => HTMLElement|null} [options.scroller] the element the list scrolls in, the main column by default
 * @returns {{element: HTMLElement, render: Function, tick: Function, setSelected: Function, ids: Function,
 *   destroy: Function}} the list
 */
export function createTaskList({
  document: doc = globalThis.document, store, toaster, label, hrefOf, listId = null, onError, fallbackFocus, moves = null,
  scroller = null,
}) {
  const id = `task-list-${(instances += 1)}`;
  const element = make(doc, 'div', 'task-list-frame');
  const list = make(doc, 'ul', 'task-list');
  list.setAttribute('aria-label', label);
  const statusMenu = make(doc, 'div', 'menu status-menu');
  statusMenu.id = `${id}-status`;
  statusMenu.hidden = true;
  const moreMenu = make(doc, 'div', 'menu');
  moreMenu.id = `${id}-more`;
  moreMenu.hidden = true;
  element.append(list, statusMenu, moreMenu);
  const options = { hrefOf, listId, moves, selected: null };
  const byId = new Map();
  const templates = new Map();
  const places = new Map();
  let rows = new Map();
  let items = [];
  let offsets = [0];
  let rowPx = ROW_PX;
  let headerPx = HEADER_PX;
  // The heights of the rows and headers that differ from the base height, by item key, as measured once they showed.
  let known = new Map();
  let calibrated = false;
  let watcher = null;
  let watchedWidth = -1;
  let fillFrame = null;
  let fillTimer = null;
  /** The new task whose row is highlighted, and the timer that ends the highlight. */
  let added = null;
  let addedTimer = null;
  let ctx = {};
  let active = null;
  let justClosed = null;
  // Whether a task shows under the view's filters, as the last render passed it.
  let shows = null;
  // The keys of the collapsed groups, and the arguments of the last render, which a toggle renders again.
  const collapsed = new Set();
  let last = null;
  // A touch resting on a status button: its timer and start point; `pressed` is the button whose long press opened the menu.
  let press = null;
  let pressed = null;

  /**
   * Report a change that failed, in the console and in a toast.
   * @param {unknown} error the error
   */
  const fail = onError ?? ((error) => {
    console.error('Task change failed:', error);
    toaster.show(STRINGS.failed);
  });

  /** Detach the open or last menu from its row button. */
  function detach() {
    if (active) {
      const { trigger, controller } = active;
      active = null;
      controller.destroy();
      // The status button opens its menu only by right-click, long press, or keys, so a click never announces a popup.
      if (trigger.dataset.role === 'more') {
        trigger.setAttribute('aria-haspopup', 'menu');
      }
    }
  }

  /**
   * Post a user event on a task; when the change hides its row under the view's filters, show an Undo toast,
   * whose Undo posts the inverse event. The row is judged with the event applied, so a task finished now counts as
   * finished today. An event whose precondition fails, such as after another tab changed the task, posts nothing.
   * @param {object} task the task
   * @param {string} type the event type
   */
  function post(task, type) {
    const time = new Date(ctx.now ?? Date.now()).toISOString();
    const occurrence = applyEvent(task['current-occurrence'], { type, 'creation-time': time }, task['lifecycle-rules']);
    if (!occurrence) {
      return;
    }
    const hides = shows !== null && !shows({ ...task, 'current-occurrence': occurrence, 'last-update-time': time });
    store.postEvent(task.id, type).then(() => {
      if (hides) {
        toaster.show(STRINGS.marked(occurrence.status), {
          undo: true,
          onAction: () => store.postEvent(task.id, INVERSE[type]).catch(fail),
        });
      }
    }, fail);
  }

  /**
   * Tick a task, unless the user's role locks its status (`SHR-4`): complete below target, uncomplete once completed,
   * and reopen once cancelled.
   * @param {object|undefined} task the task
   */
  function tick(task) {
    if (task && !accessOf(task, ctx, listId).locked) {
      post(task, tickEvent(task['current-occurrence']));
    }
  }

  /**
   * Fill a menu, attach it to a row button, and open it.
   * @param {HTMLElement} trigger the row button
   * @param {HTMLElement} menu the menu
   * @param {(item: HTMLElement) => void} onSelect handles the picked item
   * @param {'first'|'last'|(() => HTMLElement|null)} at the item that gets focus
   * @param {'status'|'more'|'add-to-list'} kind which menu content is open, to reopen it after a render
   */
  function openMenu(trigger, menu, onSelect, at, kind) {
    detach();
    const controller = attachMenu(trigger, menu, {
      onSelect,
      onClose: () => {
        if (active?.controller === controller) {
          detach();
          justClosed = trigger;
          setTimeout(() => {
            justClosed = justClosed === trigger ? null : justClosed;
          });
        }
      },
    });
    active = { trigger, controller, kind };
    controller.open(typeof at === 'string' ? at : 'first');
    if (typeof at === 'function') {
      at()?.focus();
    }
  }

  /**
   * Open the status menu of a task: the event actions whose preconditions hold, with focus on the first.
   * @param {HTMLElement} trigger the status button
   * @param {object} task the task
   */
  function openStatus(trigger, task) {
    if (accessOf(task, ctx, listId).locked) {
      return;
    }
    statusMenu.setAttribute('aria-label', `${STRINGS.statusOf}${task.description}`);
    statusMenu.replaceChildren(...statusActions(task['current-occurrence']).map(({ event, label, status }) =>
      menuItem(doc, 'menuitem', label, { event, status }, { icon: `status-${status}` })));
    openMenu(trigger, statusMenu, (item) => post(task, item.dataset.event), 'first', 'status');
  }

  /**
   * List the lists that do not hold a task yet.
   * @param {object} task the task
   * @returns {object[]} the lists, in display order
   */
  function freeLists(task) {
    const member = ctx.listsByTask?.get(task.id) ?? [];
    return [...(ctx.lists?.values() ?? [])].filter((candidate) => !member.includes(candidate.id) && can(listRole(candidate), 'add-to-list'));
  }

  /**
   * Open the Add to list choices of a task in the More menu; with no list left, such as after a render, focus More.
   * @param {HTMLElement} trigger the More button
   * @param {object} task the task
   */
  function openAddToList(trigger, task) {
    const free = freeLists(task);
    if (free.length === 0) {
      detach();
      moreMenu.replaceChildren();
      trigger.focus();
      return;
    }
    moreMenu.setAttribute('aria-label', `${STRINGS.addTo}${task.description}`);
    moreMenu.replaceChildren(...free.map((candidate) => menuItem(doc, 'menuitem', candidate.name, { listId: candidate.id })));
    openMenu(trigger, moreMenu, (choice) => store.addToList(task.id, choice.dataset.listId).catch(fail), 'first', 'add-to-list');
  }

  /**
   * Open the More menu of a task: Add to list when a list is left, Remove from this list in a list view,
   * Move up and Move down while moves are on and a row is left that way, and Delete.
   * @param {HTMLElement} trigger the More button
   * @param {object} task the task
   * @param {'first'|'last'} at the item that gets focus
   */
  function openMore(trigger, task, at) {
    const index = places.get(task.id);
    const movable = moves?.enabled() ?? false;
    const access = accessOf(task, ctx, listId);
    const entries = [
      [access.add && freeLists(task).length > 0, STRINGS.addToList, 'add-to-list', 'plus'],
      [access.remove, STRINGS.removeFromList, 'remove-from-list'],
      [movable && index > 0, STRINGS.moveUp, 'move-up'],
      [movable && index < items.length - 1, STRINGS.moveDown, 'move-down'],
      [access.trash, STRINGS.delete, 'delete', 'bin'],
    ];
    moreMenu.setAttribute('aria-label', `${STRINGS.moreFor}${task.description}`);
    moreMenu.replaceChildren(...entries.filter(([shown]) => shown)
      .map(([, text, action, icon]) => menuItem(doc, 'menuitem', text, { action }, { icon, danger: action === 'delete' })));
    openMenu(trigger, moreMenu, (item) => {
      if (item.dataset.action === 'add-to-list') {
        openAddToList(trigger, task);
      }
      else if (item.dataset.action === 'remove-from-list') {
        store.removeFromList(task.id, listId).catch(fail);
      }
      else if (item.dataset.action === 'move-up' || item.dataset.action === 'move-down') {
        moves.step(task.id, item.dataset.action === 'move-up' ? -1 : 1);
      }
      else if (item.dataset.action === 'delete') {
        store.deleteTask(task.id).then(() => toaster.show(STRINGS.deleted, {
          undo: true,
          onAction: () => store.restoreTask(task.id).catch(fail),
        }), fail);
      }
    }, at, 'more');
  }

  /**
   * Return the key of a menu item: its event, action, or list identifier.
   * @param {Element|null} item the item
   * @returns {string|undefined} the key
   */
  function itemKey(item) {
    return item?.dataset.event ?? item?.dataset.action ?? item?.dataset.listId;
  }

  /**
   * Build the row of a task.
   * @param {object} item the item of the row: its key and task
   * @param {object} view the row content of `viewOf`
   * @returns {{row: HTMLLIElement, key: string, dueKey: string, taskId: string}} the row entry
   */
  function build(item, view) {
    if (!templates.has(view.handle)) {
      templates.set(view.handle, rowTemplate(doc, view.handle));
    }
    const row = renderRow(doc, item.task, view, templates.get(view.handle), options.selected);
    row.dataset.rowKey = item.key;
    return { row, key: view.key, dueKey: view.dueKey, taskId: item.task.id };
  }

  /**
   * Return the height of an item: the height measured once it showed, else the base height of a row or header.
   * @param {number} index the item index
   * @returns {number} the height in pixels
   */
  function sizeOf(index) {
    const item = items[index];
    return known.get(item.key) ?? (item.group ? headerPx : rowPx);
  }

  /** Add up the heights of the items: item `i` starts `offsets[i]` pixels below the top of the list. */
  function layout() {
    offsets = new Float64Array(items.length + 1);
    for (let index = 0; index < items.length; index += 1) {
      offsets[index + 1] = offsets[index] + sizeOf(index);
    }
  }

  /**
   * Find the item that covers a height below the top of the list.
   * @param {number} px the height in pixels
   * @returns {number} the item index, clamped to the items
   */
  function indexAt(px) {
    let low = 0;
    let high = items.length - 1;
    while (low < high) {
      const middle = (low + high + 1) >> 1;
      if (offsets[middle] <= px) {
        low = middle;
      }
      else {
        high = middle - 1;
      }
    }
    return low;
  }

  /**
   * Compute the rows in view plus a buffer.
   * The view is the part of the scroller inside the window; item `i` starts `offsets[i]` pixels below the list's top.
   * @param {number} buffer the rows to add past each edge of the view
   * @returns {{first: number, last: number}} the indexes of the first and last row to render
   */
  function windowOf(buffer) {
    const box = list.getBoundingClientRect();
    const view = (scroller?.() ?? element.closest('.app__main'))?.getBoundingClientRect();
    const top = Math.max(view?.top ?? 0, 0) - box.top;
    const bottom = Math.min(view?.bottom ?? Infinity, doc.defaultView?.innerHeight ?? Infinity) - box.top;
    return {
      first: Math.max(0, indexAt(top) - buffer),
      last: Math.min(items.length - 1, indexAt(bottom - 0.001) + buffer),
    };
  }

  /**
   * List the items that stay rendered out of view: the focused row or header, the row of the open menu, the dragged row,
   * and the selected row, which gets focus back when its editor closes.
   * @param {Array<string|undefined>} extra more row keys, such as those a render keeps for focus
   * @returns {Set<string>} the row keys
   */
  function pinned(extra) {
    const keys = new Set([...extra, selectedKey()]);
    const focused = doc.activeElement?.closest?.('.task-row, .group-header');
    for (const row of [focused, active?.trigger.closest('.task-row'), list.querySelector('.task-row[data-dragging]')]) {
      if (row && list.contains(row)) {
        keys.add(row.dataset.rowKey);
      }
    }
    return keys;
  }

  /**
   * Find the key of the row of the selected task; in a grouped list it is the first row of the task.
   * @returns {string|undefined} the key
   */
  function selectedKey() {
    if (options.selected === null || places.has(options.selected)) {
      return options.selected ?? undefined;
    }
    return items.find((item) => item.task?.id === options.selected)?.key;
  }

  /**
   * List the indexes of the rows to render: every row of a short list, or the rows in view plus the buffer and each
   * pinned row with its neighbors, so Tab reaches the next row from a pinned one.
   * @param {Array<string|undefined>} extra more row keys to keep rendered
   * @param {number} buffer the rows to add past each edge of the view
   * @returns {number[]} the indexes, in increasing order
   */
  function wanted(extra, buffer) {
    if (items.length <= FULL_ROWS) {
      return [...items.keys()];
    }
    const { first, last } = windowOf(buffer);
    const indexes = new Set();
    for (let index = first; index <= last; index += 1) {
      indexes.add(index);
    }
    for (const key of pinned(extra)) {
      const at = places.get(key) ?? -2;
      for (let index = Math.max(0, at - 1); index <= Math.min(items.length - 1, at + 1); index += 1) {
        indexes.add(index);
      }
    }
    return [...indexes].sort((a, b) => a - b);
  }

  /**
   * Set where a row sits: its place in the set, and the margin that stands in for the rows left out above it.
   * @param {object} entry the row entry
   * @param {number} index the row's index in the order
   * @param {number} gap the height of the rows left out between it and the rendered row above, in pixels
   */
  function locate(entry, index, gap) {
    if (entry.index !== index || entry.size !== items.length) {
      entry.row.setAttribute('aria-posinset', String(index + 1));
      entry.row.setAttribute('aria-setsize', String(items.length));
      Object.assign(entry, { index, size: items.length });
    }
    if (entry.gap !== gap) {
      entry.row.style.marginBlockStart = gap > 0 ? `${gap}px` : '';
      entry.gap = gap;
    }
  }

  /**
   * Set the place of the rendered rows, and the padding that stands in for the rows left out before and after them.
   * @param {number[]} indexes the indexes of the rendered items, in increasing order
   * @param {Map<string, object>} entries the row entries by item key, in the same order
   */
  function place(indexes, entries) {
    let previous = indexes[0] - 1;
    let at = 0;
    for (const entry of entries.values()) {
      const index = indexes[at];
      locate(entry, index, offsets[index] - offsets[previous + 1]);
      previous = index;
      at += 1;
    }
    list.style.paddingBlockStart = `${offsets[indexes[0] ?? 0]}px`;
    list.style.paddingBlockEnd = `${offsets[items.length] - offsets[(indexes.at(-1) ?? -1) + 1]}px`;
  }

  /**
   * Find the first rendered row that shows in the scroller, and where it is: the row that keeps its place on screen
   * when rows come in with other heights than expected.
   * @returns {{row: HTMLElement, top: number}|null} the row and its top edge, or null without any rendered row
   */
  function anchorRow() {
    const view = (scroller?.() ?? element.closest('.app__main'))?.getBoundingClientRect();
    for (const entry of rows.values()) {
      const box = entry.row.getBoundingClientRect();
      if (!view || box.bottom > view.top) {
        return { row: entry.row, top: box.top };
      }
    }
    return null;
  }

  /**
   * Measure the rows that showed for the first time, and keep the heights that differ from the base height.
   * The first rows set the base height, so a uniform change of the row height, such as a larger text size,
   * needs no entry per row. Rows that came in taller or shorter than expected move everything after them,
   * so the offsets follow, and the scroller moves with them to keep the rows in view where they were.
   * @param {Map<string, object>} entries the row entries by item key
   * @param {number[]} indexes the indexes of the rendered items
   * @param {{row: HTMLElement, top: number}|null} anchor the row in view before the rows rendered, and its top edge
   * @returns {boolean} whether a height changed, so the rows to render may differ
   */
  function settle(entries, indexes, anchor) {
    const fresh = [...entries.values()].filter((entry) => !entry.measured);
    if (fresh.length === 0) {
      return false;
    }
    const heights = fresh.map((entry) => entry.row.offsetHeight);
    for (const entry of fresh) {
      entry.measured = true;
    }
    let changed = false;
    if (!calibrated && heights.some((height) => height > 0)) {
      const rowHeights = fresh.filter((entry) => entry.taskId).map((entry) => entry.row.offsetHeight).filter((height) => height > 0);
      const headerHeights = fresh.filter((entry) => !entry.taskId).map((entry) => entry.row.offsetHeight).filter((height) => height > 0);
      calibrated = true;
      const baseRow = rowHeights.length > 0 ? Math.min(...rowHeights) : rowPx;
      const baseHeader = headerHeights.length > 0 ? Math.min(...headerHeights) : headerPx;
      changed = baseRow !== rowPx || baseHeader !== headerPx;
      rowPx = baseRow;
      headerPx = baseHeader;
    }
    fresh.forEach((entry, at) => {
      const height = heights[at];
      const base = entry.taskId ? rowPx : headerPx;
      const key = items[entry.index].key;
      if (height > 0 && height !== (known.get(key) ?? base)) {
        if (height === base) {
          known.delete(key);
        }
        else {
          known.set(key, height);
        }
        changed = true;
      }
    });
    if (changed) {
      layout();
      place(indexes, entries);
    }
    if (anchor?.row.isConnected) {
      const shift = anchor.row.getBoundingClientRect().top - anchor.top;
      const view = scroller?.() ?? element.closest('.app__main');
      if (shift !== 0 && view) {
        view.scrollTop += shift;
      }
    }
    return changed;
  }

  /**
   * Render the rows that show once, reusing the rendered rows by task id.
   * @param {boolean} fresh whether the tasks changed, so reused rows check their content
   * @param {Array<string|undefined>} extra more row keys to keep rendered
   * @param {number} buffer the rows to add past each edge of the view
   * @returns {boolean} whether the heights of the rows changed, so the rows to render may differ
   */
  function drawOnce(fresh, extra, buffer) {
    const anchor = items.length > FULL_ROWS && rows.size > 0 ? anchorRow() : null;
    const indexes = wanted(extra, buffer);
    const entries = new Map();
    for (const index of indexes) {
      const item = items[index];
      let entry = rows.get(item.key);
      if (item.group) {
        const { shown, total } = countOf(item.group);
        const folded = collapsed.has(item.group.key);
        const key = `${item.group.label}|${shown}|${total}|${folded}`;
        if (!entry) {
          entry = { row: renderHeader(doc), key: null };
          entry.row.dataset.rowKey = item.key;
        }
        // The header changes in place, so its toggle keeps focus when it collapses or expands the group.
        if (entry.key !== key) {
          fillHeader(entry.row, item.group, folded);
          entry.key = key;
        }
      }
      else if (!entry || fresh) {
        const view = viewOf(item.task, ctx, options);
        if (entry?.key !== view.key) {
          entry = build(item, view);
        }
        else if (entry.dueKey !== view.dueKey) {
          updateMeta(doc, entry.row, view);
          entry.dueKey = view.dueKey;
        }
      }
      entries.set(item.key, entry);
    }
    for (const [key, entry] of rows) {
      if (entries.get(key) !== entry) {
        entry.row.remove();
      }
    }
    rows = entries;
    placeRows(list, [...entries.values()].map((entry) => entry.row));
    place(indexes, entries);
    markRows();
    return items.length > FULL_ROWS && settle(entries, indexes, anchor);
  }

  /** Highlight the rendered row of the newest added task, and only that one; rows rebuilt by a render get it back. */
  function markRows() {
    for (const entry of rows.values()) {
      if (entry.taskId) {
        entry.row.classList.toggle('task-row--added', entry.taskId === added);
      }
    }
  }

  /**
   * Render the rows that show, reusing the rendered rows by task id; padding on the list holds the rest of the height.
   * Rows that showed with another height than expected move the rows to render, which a second pass renders.
   * @param {boolean} fresh whether the tasks changed, so reused rows check their content
   * @param {Array<string|undefined>} [extra] more row keys to keep rendered
   * @param {number} [buffer] the rows to add past each edge of the view
   */
  function draw(fresh, extra = [], buffer = BUFFER_ROWS) {
    for (let pass = 0; pass < MAX_PASSES && drawOnce(fresh && pass === 0, extra, buffer); pass += 1) {
      // The heights are known now, so the next pass finds the rows that fill the view.
    }
  }

  /** Stop a waiting buffer fill. */
  function cancelFill() {
    if (fillFrame !== null) {
      cancelAnimationFrame(fillFrame);
      fillFrame = null;
    }
    if (fillTimer !== null) {
      clearTimeout(fillTimer);
      fillTimer = null;
    }
  }

  /** Add the buffer rows once the next frame painted, since a timeout set in a frame callback runs after its paint. */
  function fillLater() {
    fillFrame = requestAnimationFrame(() => {
      fillFrame = null;
      fillTimer = setTimeout(() => {
        fillTimer = null;
        draw(false);
      });
    });
  }

  /**
   * Measure the rows again, since a new width of the list can change their heights.
   * @param {boolean} [redraw] whether to render the rows again
   */
  function remeasure(redraw = true) {
    known = new Map();
    calibrated = false;
    for (const entry of rows.values()) {
      entry.measured = false;
    }
    if (redraw && items.length > FULL_ROWS && list.isConnected) {
      draw(false);
    }
  }

  /**
   * Render the rows that came into view after a scroll of the list's scroller or a resize of the window.
   * @param {Event} event the scroll or resize event
   */
  function onScroll(event) {
    const target = event.target;
    if (event.type === 'resize') {
      remeasure();
    }
    else if (items.length > FULL_ROWS && list.isConnected && (target === doc.defaultView || target.contains?.(list))) {
      draw(false);
    }
  }

  /**
   * Measure the rows again when the list gets another width, such as when the editor panel opens beside it.
   * @param {Array<{contentRect: {width: number}}>} changes the observed size changes
   */
  function onWidth([change]) {
    const width = change.contentRect.width;
    if (width !== watchedWidth) {
      const first = watchedWidth < 0;
      watchedWidth = width;
      if (!first) {
        remeasure();
      }
    }
  }

  /**
   * Remember what has focus in the list or its open menu, before the rows render again: a row control or a header toggle.
   * @returns {{key: string, taskId: string, role: string, index: number, kind?: string, item?: string}|null} the memo
   */
  function remember() {
    if (active?.controller.isOpen()) {
      const row = active.trigger.closest('.task-row');
      const menu = active.kind === 'status' ? statusMenu : moreMenu;
      const item = doc.activeElement?.closest?.('.menu__item');
      return {
        key: row.dataset.rowKey, taskId: row.dataset.taskId, role: active.trigger.dataset.role, index: places.get(row.dataset.rowKey),
        kind: active.kind, item: item && menu.contains(item) ? itemKey(item) : undefined,
      };
    }
    const focused = doc.activeElement?.closest?.('.task-row, .group-header');
    return focused && list.contains(focused)
      ? {
        key: focused.dataset.rowKey, taskId: focused.dataset.taskId, role: doc.activeElement.dataset.role ?? 'open',
        index: places.get(focused.dataset.rowKey),
      }
      : null;
  }

  /**
   * Find the task row at or after an index, for the focus of a row that left; past the last row, a header takes it.
   * @param {number} index the index, clamped to the items
   * @returns {number} the index of a task item
   */
  function taskIndexNear(index) {
    let at = Math.min(index, items.length - 1);
    while (at < items.length - 1 && items[at].group) {
      at += 1;
    }
    return at;
  }

  /**
   * Restore focus after the rows rendered again: the open menu on the same row and item, the same row control,
   * the control of the row now at the old place, or the fallback control once no row is left.
   * A row that moved, such as with Alt+Down, scrolls into view.
   * @param {object|null} memo the memo of `remember`
   */
  function restore(memo) {
    if (!memo) {
      return;
    }
    if (items.length === 0) {
      fallbackFocus?.()?.focus();
      return;
    }
    const same = rows.get(memo.key)?.row;
    const row = same ?? rows.get(items[taskIndexNear(memo.index)].key)?.row;
    const trigger = row?.querySelector(`[data-role="${memo.role}"]`) ?? row?.querySelector('[data-role="open"], [data-role="toggle"]');
    if (same && memo.kind) {
      const reopen = { status: openStatus, more: openMore, 'add-to-list': openAddToList }[memo.kind];
      reopen(trigger, byId.get(memo.taskId), 'first');
      const menu = memo.kind === 'status' ? statusMenu : moreMenu;
      [...menu.querySelectorAll('.menu__item')].find((item) => itemKey(item) === memo.item)?.focus();
    }
    else {
      trigger?.focus();
    }
    if (same && places.get(memo.key) !== memo.index) {
      same.scrollIntoView?.({ block: 'nearest' });
    }
  }

  /**
   * Open the menu of a row button.
   * @param {HTMLElement} trigger the status or More button
   * @param {'first'|'last'} at the item that gets focus
   */
  function openFor(trigger, at) {
    const task = byId.get(trigger.closest('.task-row').dataset.taskId);
    if (trigger.dataset.role === 'status') {
      openStatus(trigger, task);
    }
    else {
      openMore(trigger, task, at);
    }
  }

  /**
   * Find the row button of an event that has no menu attached yet.
   * @param {Event} event the click or keydown event
   * @returns {HTMLElement|null} the button
   */
  function menuButton(event) {
    const trigger = event.target.closest?.('[data-role="status"], [data-role="more"]');
    return trigger && active?.trigger !== trigger && justClosed !== trigger ? trigger : null;
  }

  /**
   * Find the task of the row an event happened in.
   * @param {Event} event the event
   * @returns {object|undefined} the task
   */
  function taskOf(event) {
    return byId.get(event.target.closest?.('.task-row')?.dataset.taskId);
  }

  /**
   * Tell whether a key opens the status menu on the status button: Down, Up, Shift+F10, or the Menu key.
   * Alt+Up and Alt+Down move the row in a list view, so they never open a menu.
   * @param {KeyboardEvent} event the keydown event
   * @returns {boolean} whether the key opens the menu
   */
  function opensStatusMenu(event) {
    if (event.altKey || event.ctrlKey || event.metaKey) {
      return false;
    }
    return ['ArrowDown', 'ArrowUp', 'ContextMenu'].includes(event.key) || (event.key === 'F10' && event.shiftKey);
  }

  /**
   * Collapse or expand a group, and render the last tasks again without or with its rows.
   * @param {string} key the group key
   */
  function toggleGroup(key) {
    if (!collapsed.delete(key)) {
      collapsed.add(key);
    }
    if (last) {
      api.render(...last);
    }
  }

  /** Stop waiting for a long press. */
  function cancelPress() {
    if (press) {
      clearTimeout(press.timer);
      press = null;
    }
  }

  // The click that ends a long press must neither tick nor reach the popover, which would close the menu.
  list.addEventListener('click', (event) => {
    if (pressed && event.target.closest?.('[data-role="status"]') === pressed) {
      pressed = null;
      event.preventDefault();
      event.stopPropagation();
    }
  }, true);
  list.addEventListener('click', (event) => {
    const header = event.target.closest?.('[data-role="toggle"]')?.closest('.group-header');
    if (header) {
      toggleGroup(header.dataset.groupKey);
      return;
    }
    const trigger = menuButton(event);
    if (trigger?.dataset.role === 'status') {
      tick(taskOf(event));
    }
    else if (trigger) {
      // The menu makes the button its popover invoker during this click, whose default toggle would close it again.
      event.preventDefault();
      openFor(trigger, 'first');
    }
  });
  list.addEventListener('keydown', (event) => {
    const trigger = menuButton(event);
    if (trigger?.dataset.role === 'status' && opensStatusMenu(event)) {
      event.preventDefault();
      openFor(trigger, 'first');
    }
    else if (trigger?.dataset.role === 'more' && !event.altKey && ['Enter', ' ', 'ArrowDown', 'ArrowUp'].includes(event.key)) {
      event.preventDefault();
      openFor(trigger, event.key === 'ArrowUp' ? 'last' : 'first');
    }
    else if (event.key === 'x' && !event.altKey && !event.ctrlKey && !event.metaKey && !inTextField(event) && taskOf(event)) {
      event.preventDefault();
      tick(taskOf(event));
    }
  });
  list.addEventListener('contextmenu', (event) => {
    const trigger = event.target.closest?.('[data-role="status"]');
    if (!trigger) {
      return;
    }
    event.preventDefault();
    // A long press already opened the menu, and some browsers follow it with this event.
    if (active?.trigger !== trigger || !active.controller.isOpen()) {
      openFor(trigger, 'first');
    }
  });
  list.addEventListener('pointerdown', (event) => {
    cancelPress();
    pressed = null;
    const trigger = event.target.closest?.('[data-role="status"]');
    if (!trigger || trigger.disabled || event.pointerType === 'mouse') {
      return;
    }
    press = {
      x: event.clientX, y: event.clientY,
      timer: setTimeout(() => {
        press = null;
        pressed = trigger;
        openFor(trigger, 'first');
      }, LONG_PRESS_MS),
    };
  });
  list.addEventListener('pointermove', (event) => {
    if (press && Math.hypot(event.clientX - press.x, event.clientY - press.y) > LONG_PRESS_SLOP) {
      cancelPress();
    }
  });
  for (const type of ['pointerup', 'pointercancel']) {
    list.addEventListener(type, cancelPress);
  }
  doc.addEventListener('scroll', onScroll, { capture: true, passive: true });
  doc.defaultView?.addEventListener('resize', onScroll);
  if (typeof doc.defaultView?.ResizeObserver === 'function') {
    watcher = new doc.defaultView.ResizeObserver(onWidth);
    watcher.observe(list);
  }

  const api = {
    element,

    /**
     * Show tasks as rows, in the given order, keeping focus on the same row control and an open menu open.
     * A focused row that left the list passes focus to the row now at its place, or to the fallback control.
     * With groups, a header row starts each group and the tasks of the groups show instead of `tasks`;
     * a collapsed group shows its header only.
     * @param {object[]} tasks the tasks to show
     * @param {{now?: Date, lists?: Map<string, object>, listsByTask?: Map<string, string[]>,
     *   notesByTask?: Map<string, string[]>}} context the time, the live lists in display order,
     *   list identifiers by task, and note texts by task
     * @param {{groups?: Array<{key: string, label: string, tasks: object[], total?: number}>|null,
     *   shows?: ((task: object) => boolean)|null}} [grouping] the groups of `groupTasks`, and whether a task shows under the view's filters, for the Undo toast
     *   of a status change that hides its row
     */
    render(tasks, context, grouping = {}) {
      const { groups = null, shows: filter = null } = grouping;
      last = [tasks, context, grouping];
      ctx = context;
      shows = filter;
      const memo = remember();
      detach();
      cancelFill();
      items = [];
      if (groups) {
        for (const group of groups) {
          items.push({ key: `#${group.key}`, group });
          for (const task of collapsed.has(group.key) ? [] : group.tasks) {
            items.push({ key: `${group.key}\u0000${task.id}`, task });
          }
        }
      }
      else {
        for (const task of tasks) {
          items.push({ key: task.id, task });
        }
      }
      const lean = rows.size === 0 && items.length > FULL_ROWS;
      byId.clear();
      places.clear();
      items.forEach((item, index) => {
        places.set(item.key, index);
        if (item.task) {
          byId.set(item.task.id, item.task);
        }
      });
      for (const key of known.keys()) {
        if (!places.has(key)) {
          known.delete(key);
        }
      }
      layout();
      // The focused row stays rendered, or the row now at its place when it left, so focus can stay or pass on.
      draw(true, memo ? [memo.key, items[Math.min(memo.index, items.length - 1)]?.key] : [], lean ? 0 : BUFFER_ROWS);
      restore(memo);
      if (lean) {
        fillLater();
      }
    },

    /**
     * Show the due chips at a new time, such as on the minute tick, keeping every row, menu, and focus (`OVD-2`).
     * @param {Date} now the current time
     */
    tick(now) {
      ctx = { ...ctx, now };
      for (const entry of rows.values()) {
        if (!entry.taskId) {
          continue;
        }
        const view = viewOf(byId.get(entry.taskId), ctx, options);
        if (view.dueKey !== entry.dueKey) {
          updateMeta(doc, entry.row, view);
          entry.dueKey = view.dueKey;
        }
      }
    },

    /**
     * Mark the task whose editor is open.
     * @param {string|null} taskId the task identifier, or null
     */
    setSelected(taskId) {
      for (const entry of rows.values()) {
        if (entry.taskId && (entry.taskId === options.selected || entry.taskId === taskId)) {
          const open = entry.row.querySelector('.task-row__open');
          if (entry.taskId === taskId) {
            open.setAttribute('aria-current', 'page');
          }
          else {
            open.removeAttribute('aria-current');
          }
        }
      }
      options.selected = taskId;
    },

    /**
     * List the shown tasks, rendered or not, for moves and drags across the whole list.
     * @returns {string[]} the task identifiers, in order
     */
    ids: () => items.filter((item) => item.task).map((item) => item.task.id),

    /**
     * Give the vertical middle of each shown task's row, from the top of the list, for drops across the whole list.
     * Rendered rows are measured; the rows of a long list that are not rendered use their known or base heights.
     * @returns {number[]} the middles in pixels, in the order of `ids`
     */
    midpoints() {
      const top = list.getBoundingClientRect().top;
      const middles = [];
      items.forEach((item, index) => {
        if (item.task) {
          const rendered = items.length <= FULL_ROWS ? rows.get(item.key)?.row.getBoundingClientRect() : null;
          middles.push(rendered?.height > 0 ? rendered.top - top + rendered.height / 2 : (offsets[index] + offsets[index + 1]) / 2);
        }
      });
      return middles;
    },

    /**
     * Show which row an add created: highlight it for two seconds and scroll it into view.
     * In a long list the row renders first, since it may sit past the rendered rows.
     * @param {string} taskId the new task
     * @returns {boolean} true when the task shows in the list; a task the view options hide has no row
     */
    markAdded(taskId) {
      const key = items.find((item) => item.task?.id === taskId)?.key;
      if (key === undefined) {
        return false;
      }
      added = taskId;
      clearTimeout(addedTimer);
      addedTimer = setTimeout(() => {
        added = null;
        markRows();
      }, ADDED_MS);
      if (!rows.has(key)) {
        draw(false, [key]);
      }
      markRows();
      rows.get(key)?.row.scrollIntoView?.({ block: 'nearest' });
      return true;
    },

    /** Close any open menu, and stop adding rows and following scrolls. */
    destroy() {
      clearTimeout(addedTimer);
      cancelFill();
      cancelPress();
      detach();
      doc.removeEventListener('scroll', onScroll, { capture: true });
      doc.defaultView?.removeEventListener('resize', onScroll);
      watcher?.disconnect();
    },
  };
  return api;
}
