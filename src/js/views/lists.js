/**
 * Lists overview: every list with its name, description start, and "4 open · 10 total" (`LST-5`).
 *
 * It fills the shell's `[data-view="lists"]` element, and renders again after every store change.
 * Each row opens its list; the floating plus button, named New list, opens the list editor on `#/lists/new`.
 * The button hides while an editor is open, so it never covers the editor panel.
 * Rows follow the order of this device (`LST-8`): drag a row by its handle, press Alt+Up or Alt+Down on a row,
 * or use its Move up and Move down buttons. The order stays on the device and new lists come last.
 * Sharing state and the owner of others' lists join the rows once sharing lands (`SHR-3`).
 */

import { applyListOrder, movedMessage, moveListTo, onListOrderChange, readListOrder, writeListOrder } from '../core/list-order.js';
import { createLiveRegion } from '../ui/live-region.js';
import { formatRoute } from '../ui/router.js';
import { attachReorder } from './reorder.js';
import { make, spriteIcon } from './task-list.js';

const OPEN = ['todo', 'in-progress'];

/** Screen strings, for the strings module of TEC-13 to absorb. */
const STRINGS = Object.freeze({
  newList: 'New list',
  lists: 'Lists',
  counts: (open, total) => `${open} open · ${total} total`,
  empty: 'No lists yet. A list groups tasks, such as Home or Work.',
  moveUp: 'Move up',
  moveDown: 'Move down',
  notSaved: 'The list order could not be saved on this device.',
});

/**
 * Count the open and the total tasks of each list.
 * @param {object[]} tasks the tasks outside the recycle bin
 * @param {object[]} memberships the membership records
 * @returns {Map<string, {open: number, total: number}>} the counts by list identifier
 */
export function countTasks(tasks, memberships) {
  const byId = new Map(tasks.map((task) => [task.id, task]));
  const counts = new Map();
  for (const membership of memberships) {
    const task = byId.get(membership['task-id']);
    if (task) {
      const count = counts.get(membership['list-id']) ?? { open: 0, total: 0 };
      count.total += 1;
      count.open += OPEN.includes(task.status) ? 1 : 0;
      counts.set(membership['list-id'], count);
    }
  }
  return counts;
}

/**
 * Create a Move up or Move down button of a list row.
 * @param {Document} doc the document
 * @param {object} list the list
 * @param {-1|1} step -1 for up, 1 for down
 * @param {boolean} disabled whether no row is left in that direction
 * @returns {HTMLButtonElement} the button
 */
function moveButton(doc, list, step, disabled) {
  const label = step < 0 ? STRINGS.moveUp : STRINGS.moveDown;
  const button = make(doc, 'button', 'icon-button list-item__move');
  button.type = 'button';
  button.dataset.role = String(step);
  button.disabled = disabled;
  button.title = label;
  button.setAttribute('aria-label', `${label}: ${list.name}`);
  button.append(spriteIcon(doc, 'chevron-down', step < 0 ? 'icon list-item__up' : 'icon'));
  return button;
}

/**
 * Create the row of one list: a drag handle, a link to its List screen, and Move up and Move down.
 * @param {Document} doc the document
 * @param {object} list the list
 * @param {{open: number, total: number}} count its task counts
 * @param {{first: boolean, last: boolean}} edge whether the row is the first or the last
 * @returns {HTMLLIElement} the row
 */
function row(doc, list, count, edge) {
  const item = make(doc, 'li', 'list-item');
  item.dataset.listId = list.id;
  const grip = make(doc, 'span', 'list-item__handle');
  grip.setAttribute('aria-hidden', 'true');
  grip.append(spriteIcon(doc, 'grip'));
  const link = make(doc, 'a', 'list-row');
  link.dataset.role = 'open';
  link.href = formatRoute('list', { listId: list.id });
  link.append(make(doc, 'span', 'list-row__name', list.name));
  if (list.description) {
    link.append(make(doc, 'span', 'list-row__description', list.description));
  }
  link.append(make(doc, 'span', 'list-row__counts', STRINGS.counts(count.open, count.total)));
  item.append(grip, link, moveButton(doc, list, -1, edge.first), moveButton(doc, list, 1, edge.last));
  return item;
}

/**
 * Mount the Lists overview into its view element.
 * @param {HTMLElement} view the `[data-view="lists"]` element
 * @param {object} options screen options
 * @param {object} options.store the store facade
 * @returns {{update: () => void, idle: () => Promise<void>, destroy: () => void}} the screen
 */
export function mountLists(view, { store }) {
  const doc = view.ownerDocument;
  let pending = null;
  let destroyed = false;
  const root = make(doc, 'div', 'lists-view');
  const add = make(doc, 'a', 'fab');
  add.href = formatRoute('list-new');
  add.setAttribute('aria-label', STRINGS.newList);
  add.title = STRINGS.newList;
  add.append(spriteIcon(doc, 'plus'));
  const rows = make(doc, 'ul', 'lists-view__rows');
  rows.setAttribute('aria-label', STRINGS.lists);
  const empty = make(doc, 'p', 'empty-state empty-state__text', STRINGS.empty);
  root.append(rows, empty, add);
  view.replaceChildren(root);
  const announcer = createLiveRegion({ document: doc, parent: root });
  let shown = [];
  let refocus = null;

  /**
   * Read the lists and their counts and render them, once per burst of store changes.
   * @returns {Promise<void>} resolves once rendered
   */
  function refresh() {
    pending ??= Promise.resolve().then(async () => {
      pending = null;
      const [lists, tasks, memberships] = await Promise.all([store.listLists(), store.listTasks(), store.listMemberships()]);
      if (destroyed) {
        return;
      }
      const counts = countTasks(tasks, memberships);
      shown = applyListOrder(lists, readListOrder());
      rows.replaceChildren(...shown.map((list, index) => row(doc, list, counts.get(list.id) ?? { open: 0, total: 0 },
        { first: index === 0, last: index === shown.length - 1 })));
      rows.hidden = shown.length === 0;
      empty.hidden = shown.length > 0;
      restoreFocus();
    }).catch((error) => console.error('The lists failed to render:', error));
    return pending;
  }

  /**
   * Put focus back on the control that had it before a move, or on its sibling button once an end is reached.
   * The render that follows a move replaces every row.
   */
  function restoreFocus() {
    if (!refocus) {
      return;
    }
    const item = [...rows.children].find((candidate) => candidate.dataset.listId === refocus.id);
    const target = item?.querySelector(`[data-role="${refocus.role}"]`);
    const other = item?.querySelector(`[data-role="${-refocus.role}"]`);
    (target && !target.disabled ? target : other ?? target)?.focus();
    refocus = null;
  }

  /**
   * Store a move in the device order and announce the new position.
   * @param {string} listId the moved list
   * @param {{index: number}} move the move, with the new index among the shown lists
   */
  function move(listId, { index }) {
    const active = doc.activeElement;
    const inRow = active?.closest?.('.list-item')?.dataset.listId === listId;
    refocus ??= inRow ? { id: listId, role: active.dataset.role } : null;
    const stored = writeListOrder(moveListTo(shown.map((list) => list.id), listId, index));
    announcer.announce(stored ? movedMessage(shown.find((list) => list.id === listId)?.name ?? '', index + 1, shown.length)
      : STRINGS.notSaved);
  }

  const reorder = attachReorder(rows, { enabled: () => true, onMove: move, row: '.list-item', handle: '.list-item__handle', idKey: 'listId' });
  rows.addEventListener('click', (event) => {
    const button = event.target.closest?.('.list-item__move');
    if (button && !button.disabled) {
      const id = button.closest('.list-item').dataset.listId;
      refocus = { id, role: button.dataset.role };
      reorder.step(id, Number(button.dataset.role));
    }
  });
  const unsubscribe = store.subscribe(() => refresh());
  const unsubscribeOrder = onListOrderChange(() => refresh());
  const first = refresh();

  return {
    /**
     * Follow a route of this view: the floating New list button hides while an editor is open.
     * @param {{editor?: string|null}} [route] the route
     */
    update(route) {
      add.hidden = Boolean(route?.editor);
    },

    /**
     * Wait for the first render.
     * @returns {Promise<void>} resolves once the first data rendered
     */
    idle: () => first,

    /** Stop following the store. */
    destroy() {
      destroyed = true;
      unsubscribe();
      unsubscribeOrder();
      reorder.destroy();
      announcer.destroy();
    },
  };
}
