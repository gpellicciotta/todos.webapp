/**
 * Lists overview: every list with its name, description start, and "4 open · 10 total" (`LST-5`).
 *
 * It fills the shell's `[data-view="lists"]` element, and renders again after every store change.
 * Each row opens its list; the floating plus button, named New list, opens the list editor on `#/lists/new`.
 * The button hides while an editor is open, so it never covers the editor panel.
 * Each row also has a More button with the actions of the List screen: Edit list, Edit view options, Share list,
 * and Delete list (`VO-4`).
 * Rows follow the order of this device (`LST-8`): drag a row by its handle, or press Alt+Up or Alt+Down on a row.
 * The order stays on the device and new lists come last.
 * Sharing state and the owner of others' lists join the rows once sharing lands (`SHR-3`).
 */

import { applyListOrder, movedMessage, moveListTo, onListOrderChange, readListOrder, writeListOrder } from '../core/list-order.js';
import { createLiveRegion } from '../ui/live-region.js';
import { attachMenu } from '../ui/menu.js';
import { formatRoute } from '../ui/router.js';
import { createListMenu, runListAction } from './list-actions.js';
import { attachReorder } from './reorder.js';
import { make, spriteIcon } from './task-list.js';

const OPEN = ['todo', 'in-progress'];

/** Screen strings, for the strings module of TEC-13 to absorb. */
const STRINGS = Object.freeze({
  newList: 'New list',
  lists: 'Lists',
  counts: (open, total) => `${open} open · ${total} total`,
  sharedBy: (owner) => (owner ? `Shared by ${owner}` : 'Shared with you'),
  sharedWith: (count) => `Shared with ${count} ${count === 1 ? 'person' : 'people'}`,
  empty: 'No lists yet. A list groups tasks, such as Home or Work.',
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
 * Tell the sharing state of a list: who shares it with the user, or with how many people the user shares it (`LST-5`, `SHR-3`).
 * @param {object} list the list
 * @returns {string} the text, empty for a list that is not shared
 */
function sharingText(list) {
  if (list.role && list.role !== 'owner') {
    return STRINGS.sharedBy(list.owner?.name || list.owner?.email || '');
  }
  const people = list.sharing?.length ?? 0;
  return people > 0 ? STRINGS.sharedWith(people) : '';
}

/**
 * Create the row of one list: a drag handle, a link to its List screen, and a More button with its menu.
 * @param {Document} doc the document
 * @param {object} list the list
 * @param {{open: number, total: number}} count its task counts
 * @returns {{item: HTMLLIElement, more: HTMLButtonElement, menu: HTMLElement}} the row, its button, and its menu
 */
function row(doc, list, count) {
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
  const sharing = sharingText(list);
  if (sharing) {
    link.append(make(doc, 'span', 'list-row__sharing', sharing));
  }
  const { more, menu } = createListMenu({ document: doc, id: `list-actions-${list.id}`, name: list.name, className: 'list-item__more', list });
  more.dataset.role = 'more';
  item.append(grip, link, more, menu);
  return { item, more, menu };
}

/**
 * Mount the Lists overview into its view element.
 * @param {HTMLElement} view the `[data-view="lists"]` element
 * @param {object} options screen options
 * @param {object} options.store the store facade
 * @param {{show: Function}} [options.toaster] the toaster, for the Delete list result
 * @param {(hash: string) => void} [options.navigate] opens another route
 * @returns {{update: () => void, idle: () => Promise<void>, destroy: () => void}} the screen
 */
export function mountLists(view, { store, toaster = { show() {} }, navigate = () => {} }) {
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
  let menus = [];

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
      for (const behavior of menus) {
        behavior.destroy();
      }
      const built = shown.map((list) => ({ list, ...row(doc, list, counts.get(list.id) ?? { open: 0, total: 0 }) }));
      menus = built.map(({ list, more, menu }) => attachMenu(more, menu, {
        onSelect: (picked) => runListAction(picked, { listId: list.id, list, parent: root, opener: more, store, toaster, navigate }),
      }));
      rows.replaceChildren(...built.map(({ item }) => item));
      rows.hidden = shown.length === 0;
      empty.hidden = shown.length > 0;
      restoreFocus();
    }).catch((error) => console.error('The lists failed to render:', error));
    return pending;
  }

  /** Put focus back on the control that had it before a move; the render that follows a move replaces every row. */
  function restoreFocus() {
    if (!refocus) {
      return;
    }
    const item = [...rows.children].find((candidate) => candidate.dataset.listId === refocus.id);
    item?.querySelector(`[data-role="${refocus.role}"]`)?.focus();
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
      for (const behavior of menus) {
        behavior.destroy();
      }
      reorder.destroy();
      announcer.destroy();
    },
  };
}
