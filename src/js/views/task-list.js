/**
 * Task list: the task rows of All tasks and the list view, with their status and More menus.
 *
 * A row shows the status button, the description, the due chip, up to two list chips, and the note count.
 * The open link fills the row and opens the task editor route; the status button opens the status menu
 * (`TSK-4`), and the More button offers Add to list and Delete, which moves the task to the recycle bin
 * with an Undo toast (`TSK-8`, `TSK-11`). Status is not in the More menu; the status button sets it.
 * In a list view, the More menu adds Remove from this list, and Move up and Move down while moves are on,
 * when rows also show a drag handle (`LV-3`).
 * One status menu and one More menu serve every row: each opening attaches the menu to that row's button.
 * Rendering again keeps an open menu open on the same row and item, and keeps focus on the same row control.
 * Rows are kept by key, the task id or, in a grouped list, the group and the task id, since a task of several lists
 * shows in each group: a render builds only the rows whose content changed and moves as few rows as it can,
 * and the clock tick redraws only due chips (`TEC-16`).
 * A grouped list shows a header row before each group, with the group name and count (`VO-10`). Headers are
 * 32 px rows without controls, so they take no focus, selection, or drag; they count as rows of the virtual list.
 * A list of more than 200 tasks renders only the rows in view plus a buffer, so 5000 tasks open fast (`TEC-16`).
 * Padding on the list and a margin on a row after a gap stand in for the rows left out, so the scroll height holds;
 * the offsets of the rows add up the row and header heights.
 * The focused row, the row of an open menu, the dragged row, and the selected row stay rendered with their
 * neighbors, so focus, menus, Tab order, and drags survive a scroll. Rows carry `aria-setsize` and `aria-posinset`.
 * The menus live outside the list, since the list is a size container, which would anchor fixed menus.
 */

import { isOverdue } from '../core/overdue.js';
import { STATUSES } from '../store/tasks.js';
import { attachMenu } from '../ui/menu.js';

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
/** The row height until a row was measured: the 48 px of the `--row-height` token. */
const ROW_PX = 48;
/** The header height until a header was measured: 32 px, two thirds of the row height. */
const HEADER_PX = 32;
let instances = 0;

/** Status names, in lifecycle order. */
export const STATUS_LABELS = Object.freeze({
  todo: 'To do', 'in-progress': 'In progress', completed: 'Completed', cancelled: 'Cancelled',
});

/** Row strings, for the strings module of TEC-13 to absorb. */
const STRINGS = Object.freeze({
  statusOf: 'Status of ',
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
});

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
  if (!task['due-time']) {
    return null;
  }
  if (isOverdue(task, now)) {
    return { text: STRINGS.overdue, overdue: true };
  }
  const due = new Date(task['due-time']);
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
 * @returns {{key: string, dueKey: string, due: object|null, href: string, handle: boolean, names: string[],
 *   notes: number}} the row content
 */
function viewOf(task, ctx, options) {
  const ids = ctx.listsByTask?.get(task.id) ?? [];
  const names = ids.length === 0 ? [] : [...(ctx.lists?.values() ?? [])]
    .filter((list) => list.id !== options.listId && ids.includes(list.id)).map((list) => list.name);
  const notes = ctx.notesByTask?.get(task.id)?.length ?? 0;
  const href = options.hrefOf(task);
  const handle = Boolean(options.moves?.enabled());
  const due = formatDue(task, ctx.now);
  return {
    key: JSON.stringify([task.status, task.description, href, handle, names, notes]),
    dueKey: due ? `${due.overdue}|${due.text}` : '', due, href, handle, names, notes,
  };
}

/**
 * Create the chips of a row: the due chip, up to two list chips, and the note count.
 * @param {Document} doc the document
 * @param {{due: object|null, names: string[], notes: number}} view the row content of `viewOf`
 * @returns {HTMLElement|null} the chips, or null without any
 */
function metaOf(doc, { due, names, notes }) {
  const meta = make(doc, 'span', 'task-row__meta');
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
  status.setAttribute('aria-haspopup', 'menu');
  status.append(spriteIcon(doc, 'status-todo'));
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
 * Render the header of a group: its name and its task count.
 * @param {Document} doc the document
 * @param {{label: string, tasks: object[]}} group the group
 * @returns {HTMLLIElement} the header
 */
function renderHeader(doc, group) {
  const header = make(doc, 'li', 'group-header');
  header.append(make(doc, 'h3', 'group-header__name', group.label), make(doc, 'span', 'group-header__count', String(group.tasks.length)));
  return header;
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
  row.dataset.status = task.status;
  row.dataset.taskId = task.id;
  const more = row.lastElementChild;
  const open = more.previousElementSibling;
  const status = open.previousElementSibling;
  status.setAttribute('aria-label', `${STRINGS.statusOf}${task.description}: ${STATUS_LABELS[task.status]}`);
  status.dataset.status = task.status;
  status.firstElementChild.firstElementChild.setAttribute('href', `${ICONS}#status-${task.status}`);
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
  let fillFrame = null;
  let fillTimer = null;
  let ctx = {};
  let active = null;
  let justClosed = null;

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
      trigger.setAttribute('aria-haspopup', 'menu');
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
   * Open the status menu of a task, with focus on its current status.
   * @param {HTMLElement} trigger the status button
   * @param {object} task the task
   */
  function openStatus(trigger, task) {
    statusMenu.setAttribute('aria-label', `${STRINGS.statusOf}${task.description}`);
    statusMenu.replaceChildren(...STATUSES.map((status) => menuItem(doc, 'menuitemradio', STATUS_LABELS[status], { status },
      { icon: `status-${status}`, checked: status === task.status })));
    openMenu(trigger, statusMenu, (item) => {
      if (item.dataset.status !== task.status) {
        store.updateTask(task.id, { status: item.dataset.status }).catch(fail);
      }
    }, () => statusMenu.querySelector('[aria-checked="true"]'), 'status');
  }

  /**
   * List the lists that do not hold a task yet.
   * @param {object} task the task
   * @returns {object[]} the lists, in display order
   */
  function freeLists(task) {
    const member = ctx.listsByTask?.get(task.id) ?? [];
    return [...(ctx.lists?.values() ?? [])].filter((candidate) => !member.includes(candidate.id));
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
    const entries = [
      [freeLists(task).length > 0, STRINGS.addToList, 'add-to-list', 'plus'],
      [listId !== null, STRINGS.removeFromList, 'remove-from-list'],
      [movable && index > 0, STRINGS.moveUp, 'move-up'],
      [movable && index < items.length - 1, STRINGS.moveDown, 'move-down'],
      [true, STRINGS.delete, 'delete', 'bin'],
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
   * Return the key of a menu item: its status, action, or list identifier.
   * @param {Element|null} item the item
   * @returns {string|undefined} the key
   */
  function itemKey(item) {
    return item?.dataset.status ?? item?.dataset.action ?? item?.dataset.listId;
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

  /** Add up the heights of the items: item `i` starts `offsets[i]` pixels below the top of the list. */
  function layout() {
    offsets = new Float64Array(items.length + 1);
    for (let index = 0; index < items.length; index += 1) {
      offsets[index + 1] = offsets[index] + (items[index].group ? headerPx : rowPx);
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

  /** Measure a row and a header once they show, and lay out the items again when a height differs. */
  function measure() {
    const row = list.querySelector('.task-row');
    const header = list.querySelector('.group-header');
    const rowHeight = row?.offsetHeight > 0 ? row.offsetHeight : rowPx;
    const headerHeight = header?.offsetHeight > 0 ? header.offsetHeight : headerPx;
    if (rowHeight !== rowPx || headerHeight !== headerPx) {
      rowPx = rowHeight;
      headerPx = headerHeight;
      layout();
    }
  }

  /**
   * Compute the rows in view plus a buffer, measuring the row height once a row shows.
   * The view is the part of the scroller inside the window; item `i` starts `offsets[i]` pixels below the list's top.
   * @param {number} buffer the rows to add past each edge of the view
   * @returns {{first: number, last: number}} the indexes of the first and last row to render
   */
  function windowOf(buffer) {
    measure();
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
   * List the tasks whose rows stay rendered out of view: the focused row, the row of the open menu, the dragged row,
   * and the selected row, which gets focus back when its editor closes.
   * @param {Array<string|undefined>} extra more row keys, such as those a render keeps for focus
   * @returns {Set<string>} the row keys
   */
  function pinned(extra) {
    const keys = new Set([...extra, selectedKey()]);
    const focused = doc.activeElement?.closest?.('.task-row');
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
   * Render the rows that show, reusing the rendered rows by task id; padding on the list holds the rest of the height.
   * @param {boolean} fresh whether the tasks changed, so reused rows check their content
   * @param {Array<string|undefined>} [extra] more row keys to keep rendered
   * @param {number} [buffer] the rows to add past each edge of the view
   */
  function draw(fresh, extra = [], buffer = BUFFER_ROWS) {
    const indexes = wanted(extra, buffer);
    const entries = new Map();
    let previous = indexes[0] - 1;
    for (const index of indexes) {
      const item = items[index];
      let entry = rows.get(item.key);
      if (item.group) {
        const key = `${item.group.label}|${item.group.tasks.length}`;
        if (entry?.key !== key) {
          entry = { row: renderHeader(doc, item.group), key };
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
      locate(entry, index, offsets[index] - offsets[previous + 1]);
      previous = index;
      entries.set(item.key, entry);
    }
    for (const [key, entry] of rows) {
      if (entries.get(key) !== entry) {
        entry.row.remove();
      }
    }
    rows = entries;
    placeRows(list, [...entries.values()].map((entry) => entry.row));
    list.style.paddingBlockStart = `${offsets[indexes[0] ?? 0]}px`;
    list.style.paddingBlockEnd = `${offsets[items.length] - offsets[(indexes.at(-1) ?? -1) + 1]}px`;
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
   * Render the rows that came into view after a scroll of the list's scroller or a resize of the window.
   * @param {Event} event the scroll or resize event
   */
  function onScroll(event) {
    const target = event.target;
    if (items.length > FULL_ROWS && list.isConnected && (target === doc.defaultView || target.contains?.(list))) {
      draw(false);
    }
  }

  /**
   * Remember what has focus in the list or its open menu, before the rows render again.
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
    const focused = doc.activeElement?.closest?.('.task-row');
    return focused && list.contains(focused)
      ? {
        key: focused.dataset.rowKey, taskId: focused.dataset.taskId, role: doc.activeElement.dataset.role ?? 'open',
        index: places.get(focused.dataset.rowKey),
      }
      : null;
  }

  /**
   * Find the task row at or after an index, since a header takes no focus.
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
    const trigger = row?.querySelector(`[data-role="${memo.role}"]`);
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

  list.addEventListener('click', (event) => {
    const trigger = menuButton(event);
    if (trigger) {
      openFor(trigger, 'first');
    }
  });
  list.addEventListener('keydown', (event) => {
    const trigger = menuButton(event);
    // Alt+Up and Alt+Down move the row in a list view, so they never open a menu.
    if (trigger && !event.altKey && ['Enter', ' ', 'ArrowDown', 'ArrowUp'].includes(event.key)) {
      event.preventDefault();
      openFor(trigger, event.key === 'ArrowUp' ? 'last' : 'first');
    }
  });
  doc.addEventListener('scroll', onScroll, { capture: true, passive: true });
  doc.defaultView?.addEventListener('resize', onScroll);

  return {
    element,

    /**
     * Show tasks as rows, in the given order, keeping focus on the same row control and an open menu open.
     * A focused row that left the list passes focus to the row now at its place, or to the fallback control.
     * With groups, a header row starts each group and the tasks of the groups show instead of `tasks`.
     * @param {object[]} tasks the tasks to show
     * @param {{now?: Date, lists?: Map<string, object>, listsByTask?: Map<string, string[]>,
     *   notesByTask?: Map<string, string[]>}} context the time, the live lists in display order,
     *   list identifiers by task, and note texts by task
     * @param {{groups?: Array<{key: string, label: string, tasks: object[]}>|null}} [grouping] the groups of `groupTasks`
     */
    render(tasks, context, { groups = null } = {}) {
      ctx = context;
      const memo = remember();
      detach();
      cancelFill();
      items = [];
      if (groups) {
        for (const group of groups) {
          items.push({ key: `#${group.key}`, group });
          for (const task of group.tasks) {
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

    /** Close any open menu, and stop adding rows and following scrolls. */
    destroy() {
      cancelFill();
      detach();
      doc.removeEventListener('scroll', onScroll, { capture: true });
      doc.defaultView?.removeEventListener('resize', onScroll);
    },
  };
}
