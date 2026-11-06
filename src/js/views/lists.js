/**
 * Lists overview: every list with its name, description start, and "4 open · 10 total" (`LST-5`).
 *
 * It fills the shell's `[data-view="lists"]` element, and renders again after every store change.
 * Each row opens its list; the floating plus button, named New list, opens the list editor on `#/lists/new`.
 * The button hides while an editor is open, so it never covers the editor panel.
 * Sharing state and the owner of others' lists join the rows once sharing lands (`SHR-3`).
 */

import { formatRoute } from '../ui/router.js';
import { make, spriteIcon } from './task-list.js';

const OPEN = ['todo', 'in-progress'];

/** Screen strings, for the strings module of TEC-13 to absorb. */
const STRINGS = Object.freeze({
  newList: 'New list',
  lists: 'Lists',
  counts: (open, total) => `${open} open · ${total} total`,
  empty: 'No lists yet. A list groups tasks, such as Home or Work.',
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
 * Create the row of one list, a link to its List screen.
 * @param {Document} doc the document
 * @param {object} list the list
 * @param {{open: number, total: number}} count its task counts
 * @returns {HTMLLIElement} the row
 */
function row(doc, list, count) {
  const item = doc.createElement('li');
  const link = make(doc, 'a', 'list-row');
  link.href = formatRoute('list', { listId: list.id });
  link.append(make(doc, 'span', 'list-row__name', list.name));
  if (list.description) {
    link.append(make(doc, 'span', 'list-row__description', list.description));
  }
  link.append(make(doc, 'span', 'list-row__counts', STRINGS.counts(count.open, count.total)));
  item.append(link);
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
      rows.replaceChildren(...lists.map((list) => row(doc, list, counts.get(list.id) ?? { open: 0, total: 0 })));
      rows.hidden = lists.length === 0;
      empty.hidden = lists.length > 0;
    }).catch((error) => console.error('The lists failed to render:', error));
    return pending;
  }

  const unsubscribe = store.subscribe(() => refresh());
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
    },
  };
}
