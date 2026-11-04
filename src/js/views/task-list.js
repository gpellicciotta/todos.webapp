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
 * The menus live outside the list, since the list is a size container, which would anchor fixed menus.
 */

import { isOverdue } from '../core/overdue.js';
import { STATUSES } from '../store/tasks.js';
import { attachMenu } from '../ui/menu.js';

const ICONS = 'img/icons.svg';
const SVG = 'http://www.w3.org/2000/svg';
const DAY_MS = 86_400_000;
const MAX_LIST_CHIPS = 2;
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
    ? '' : ` ${new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }).format(due)}`;
  if (days === 0 || days === 1) {
    return { text: `${days === 0 ? STRINGS.today : STRINGS.tomorrow}${time}`, overdue: false };
  }
  if (days > 1 && days < 7) {
    return { text: `${new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(due)}${time}`, overdue: false };
  }
  const format = { day: 'numeric', month: 'short' };
  if (due.getFullYear() !== current.getFullYear()) {
    format.year = 'numeric';
  }
  return { text: new Intl.DateTimeFormat(locale, format).format(due), overdue: false };
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
 * Render the row of a task.
 * @param {Document} doc the document
 * @param {object} task the task
 * @param {object} ctx the render context of `render`
 * @param {object} options the list options
 * @returns {HTMLLIElement} the row
 */
function renderRow(doc, task, ctx, options) {
  const row = make(doc, 'li', 'task-row');
  row.dataset.status = task.status;
  row.dataset.taskId = task.id;
  if (options.moves?.enabled()) {
    const handle = make(doc, 'span', 'task-row__handle');
    handle.setAttribute('aria-hidden', 'true');
    handle.append(spriteIcon(doc, 'grip'));
    row.append(handle);
  }
  const status = make(doc, 'button', 'icon-button status-button');
  status.type = 'button';
  status.dataset.role = 'status';
  status.setAttribute('aria-haspopup', 'menu');
  status.setAttribute('aria-label', `${STRINGS.statusOf}${task.description}: ${STATUS_LABELS[task.status]}`);
  status.append(spriteIcon(doc, `status-${task.status}`));

  const open = make(doc, 'a', 'task-row__open');
  open.href = options.hrefOf(task);
  open.dataset.role = 'open';
  if (task.id === options.selected) {
    open.setAttribute('aria-current', 'page');
  }
  open.append(make(doc, 'span', 'task-row__description', task.description));
  const meta = make(doc, 'span', 'task-row__meta');
  const due = formatDue(task, ctx.now);
  if (due) {
    meta.append(chip(doc, due.overdue ? 'chip chip--overdue' : 'chip', due.text, { icon: due.overdue ? 'alert' : 'clock' }));
  }
  const ids = ctx.listsByTask?.get(task.id) ?? [];
  const lists = [...(ctx.lists?.values() ?? [])].filter((list) => list.id !== options.listId && ids.includes(list.id));
  for (const list of lists.slice(0, MAX_LIST_CHIPS)) {
    const listChip = make(doc, 'span', 'chip task-row__list');
    listChip.append(make(doc, 'span', 'task-row__chip-text', list.name));
    meta.append(listChip);
  }
  if (lists.length > MAX_LIST_CHIPS) {
    meta.append(chip(doc, 'chip task-row__more-lists', `+${lists.length - MAX_LIST_CHIPS}`, { hidden: STRINGS.moreLists }));
  }
  const notes = ctx.notesByTask?.get(task.id)?.length ?? 0;
  if (notes > 0) {
    meta.append(chip(doc, 'chip task-row__notes', String(notes), { icon: 'note', hidden: STRINGS.notes }));
  }
  if (meta.childElementCount > 0) {
    open.append(meta);
  }

  const more = make(doc, 'button', 'icon-button task-row__more');
  more.type = 'button';
  more.dataset.role = 'more';
  more.setAttribute('aria-haspopup', 'menu');
  more.setAttribute('aria-label', `${STRINGS.moreFor}${task.description}`);
  more.append(spriteIcon(doc, 'more'));
  row.append(status, open, more);
  return row;
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
function menuItem(doc, role, text, data, { icon, checked } = {}) {
  const item = make(doc, 'button', 'menu__item');
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
 * @returns {{element: HTMLElement, render: Function, setSelected: Function, destroy: Function}} the list
 */
export function createTaskList({
  document: doc = globalThis.document, store, toaster, label, hrefOf, listId = null, onError, fallbackFocus, moves = null,
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
   * Open the Add to list choices of a task in the More menu.
   * @param {HTMLElement} trigger the More button
   * @param {object} task the task
   */
  function openAddToList(trigger, task) {
    moreMenu.setAttribute('aria-label', `${STRINGS.addTo}${task.description}`);
    moreMenu.replaceChildren(...freeLists(task).map((candidate) => menuItem(doc, 'menuitem', candidate.name, { listId: candidate.id })));
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
    const index = [...list.children].indexOf(trigger.closest('.task-row'));
    const movable = moves?.enabled() ?? false;
    const entries = [
      [freeLists(task).length > 0, STRINGS.addToList, 'add-to-list', 'plus'],
      [listId !== null, STRINGS.removeFromList, 'remove-from-list'],
      [movable && index > 0, STRINGS.moveUp, 'move-up'],
      [movable && index < list.children.length - 1, STRINGS.moveDown, 'move-down'],
      [true, STRINGS.delete, 'delete', 'bin'],
    ];
    moreMenu.setAttribute('aria-label', `${STRINGS.moreFor}${task.description}`);
    moreMenu.replaceChildren(...entries.filter(([shown]) => shown)
      .map(([, text, action, icon]) => menuItem(doc, 'menuitem', text, { action }, { icon })));
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
   * Remember what has focus in the list or its open menu, before the rows render again.
   * @returns {{id: string, role: string, index: number, kind?: string, item?: string}|null} the memo
   */
  function remember() {
    const rows = [...list.children];
    if (active?.controller.isOpen()) {
      const row = active.trigger.closest('.task-row');
      const menu = active.kind === 'status' ? statusMenu : moreMenu;
      const item = doc.activeElement?.closest?.('.menu__item');
      return {
        id: row.dataset.taskId, role: active.trigger.dataset.role, index: rows.indexOf(row),
        kind: active.kind, item: item && menu.contains(item) ? itemKey(item) : undefined,
      };
    }
    const focused = doc.activeElement?.closest?.('.task-row');
    return focused && list.contains(focused)
      ? { id: focused.dataset.taskId, role: doc.activeElement.dataset.role ?? 'open', index: rows.indexOf(focused) }
      : null;
  }

  /**
   * Restore focus after the rows rendered again: the open menu on the same row and item, the same row control,
   * the control of the row now at the old place, or the fallback control once no row is left.
   * @param {object|null} memo the memo of `remember`
   */
  function restore(memo) {
    if (!memo) {
      return;
    }
    const rows = [...list.children];
    if (rows.length === 0) {
      fallbackFocus?.()?.focus();
      return;
    }
    const same = rows.find((candidate) => candidate.dataset.taskId === memo.id);
    const trigger = (same ?? rows[Math.min(memo.index, rows.length - 1)]).querySelector(`[data-role="${memo.role}"]`);
    if (same && memo.kind) {
      const task = byId.get(memo.id);
      const reopen = { status: openStatus, more: openMore, 'add-to-list': openAddToList }[memo.kind];
      reopen(trigger, task, 'first');
      const menu = memo.kind === 'status' ? statusMenu : moreMenu;
      [...menu.querySelectorAll('.menu__item')].find((item) => itemKey(item) === memo.item)?.focus();
      return;
    }
    trigger?.focus();
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

  return {
    element,

    /**
     * Show tasks as rows, in the given order, keeping focus on the same row control and an open menu open.
     * A focused row that left the list passes focus to the row now at its place, or to the fallback control.
     * @param {object[]} tasks the tasks to show
     * @param {{now?: Date, lists?: Map<string, object>, listsByTask?: Map<string, string[]>,
     *   notesByTask?: Map<string, string[]>}} context the time, the live lists in display order,
     *   list identifiers by task, and note texts by task
     */
    render(tasks, context) {
      ctx = context;
      const memo = remember();
      detach();
      byId.clear();
      for (const task of tasks) {
        byId.set(task.id, task);
      }
      list.replaceChildren(...tasks.map((task) => renderRow(doc, task, ctx, options)));
      restore(memo);
    },

    /**
     * Mark the task whose editor is open.
     * @param {string|null} taskId the task identifier, or null
     */
    setSelected(taskId) {
      options.selected = taskId;
      for (const link of list.querySelectorAll('.task-row__open')) {
        if (link.closest('.task-row').dataset.taskId === taskId) {
          link.setAttribute('aria-current', 'page');
        }
        else {
          link.removeAttribute('aria-current');
        }
      }
    },

    /** Close any open menu. */
    destroy() {
      detach();
    },
  };
}
