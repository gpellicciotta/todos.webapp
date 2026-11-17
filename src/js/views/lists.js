/**
 * Lists overview: every list with its name, description start, and "4 open · 10 total" (`LST-5`).
 *
 * It fills the shell's `[data-view="lists"]` element, and renders again after every store change.
 * Each row opens its list; the floating plus button, named New list, opens the list editor on `#/lists/new`.
 * The button sits in the shell's overlay layer while the screen is open.
 * The button hides while an editor is open, so it never covers the editor panel.
 * Each row also has a More button with the actions of the List screen: Edit list, Edit view options, Share list,
 * and Delete list (`VO-4`), plus Move to top and Move to bottom while reordering is on (`LST-13`).
 * Rows follow the stored list order (`LST-8`): drag a row by its handle, press Alt+Up or Alt+Down on a row, or move
 * it to an end with Alt+Home, Alt+End, or the menu, all through reorder.js. Each move announces the new position and
 * keeps focus on the row, which scrolls into view. New lists come last. While connected the order follows the account
 * (`SYN-13`); an order downloaded during a drag shows after the drop, which then wins as the newer edit.
 * The counts come from core/list-counts.js, shared with the sidebar, and the app passes the sidebar's own read of them
 * (core/list-snapshot.js) so the screen opens without counting 5000 tasks again (`TEC-16`); core/list-find.js and core/list-sort.js hold the
 * find and sort rules of the Many Lists design (`LST-10`, `LST-12`).
 * From 12 lists, or while it holds text, a find block joins the shell's action bar, pinned under the rows: a find field,
 * a sort button with its menu, and an info line with Reset. The field searches names and descriptions once typing pauses
 * for 150 ms; Enter opens the first match, Escape clears, Down enters the rows, and `/` focuses it (`LST-10`).
 * The text lasts for the session in the router memory; the sort persists in `todos.view.lists` (`LST-12`), which follows
 * the account while connected, so a sort downloaded from another device applies at once.
 * A text with no match offers Create list for a valid new name, which opens the new list's editor (`LST-11`).
 * Reordering needs Manual order, an empty field, and no Shared only; otherwise the handles and move entries hide, and
 * Alt+Up, Alt+Down, Alt+Home, or Alt+End says why.
 * While connected with at least one shared list, the sort menu ends with a Shared only checkbox that the info line names; it persists
 * in `todos.view.lists` beside the sort and Reset clears it (`LST-16`).
 * Long lists stay cheap: up to 200 shown lists render every row, with `content-visibility: auto`; more render only the
 * rows in view plus a buffer, as task rows do, with padding and margins for the rest (`TEC-16`). The focused row, the tab
 * stop, and a dragged row stay rendered out of view. A row's menu builds on its first open, and the rows are one roving tab
 * stop with Up and Down between rows, rendered or not, and Right and Left between a row and its More button (`LST-15`).
 * Rows show the sharing state and the owner of others' lists (`SHR-3`).
 */

import { countLists, countOf } from '../core/list-counts.js';
import { FIND_MAX_LENGTH, findLists } from '../core/list-find.js';
import { applyListOrder, movedMessage, moveListTo, onListOrderChange, readListOrder, writeListOrder } from '../core/list-order.js';
import { LIST_SORT_KEY, LIST_SORTS, readListSort, readSharedOnly, SORT_LABELS, sortLists, writeListView } from '../core/list-sort.js';
import { isSharedList } from '../core/permissions.js';
import { onSettingsChange, PREFIX, touchesSetting } from '../core/preferences.js';
import { createLiveRegion } from '../../vendor/design/js/live-region.js';
import { attachMenu } from '../../vendor/design/js/menu.js';
import { formatRoute } from '../ui/router.js';
import { actionsLabel, createListMenuElement, runListAction } from './list-actions.js';
import { attachReorder } from './reorder.js';
import { make, spriteIcon } from './task-list.js';

/** From this many lists the find block shows (`LST-10`). */
const FIND_FROM = 12;

/** Row height in pixels when none is measured, and the rows a page key moves when the screen has no height. */
const ROW_HEIGHT = 64;
const PAGE_ROWS = 10;

/** Up to this many shown lists render every row; more render the rows in view plus a buffer, as task rows do (`TEC-16`). */
const FULL_ROWS = 200;
/** The rows rendered past each edge of the view, and the height of a row not measured yet: the 48 px `--row-height`. */
const BUFFER_ROWS = 10;
const ROW_PX = 48;

/** The row a navigation key moves to, from the focused index, the row count, and the rows per page (`LST-15`). */
const ROW_STEPS = Object.freeze({
  ArrowUp: (at) => at - 1,
  ArrowDown: (at) => at + 1,
  Home: () => 0,
  End: (at, count) => count - 1,
  PageUp: (at, count, page) => at - page,
  PageDown: (at, count, page) => at + page,
});

/** The pause after typing before the rows filter (`TEC-16`). */
const FIND_PAUSE_MS = 150;

/** Screen strings, for the strings module of TEC-13 to absorb. */
const STRINGS = Object.freeze({
  newList: 'New list',
  lists: 'Lists',
  counts: (open, total) => `${open} open · ${total} total`,
  sharedBy: (owner) => (owner ? `Shared by ${owner}` : 'Shared with you'),
  sharedWith: (count) => `Shared with ${count} ${count === 1 ? 'person' : 'people'}`,
  empty: 'No lists yet. A list groups tasks, such as Home or Work.',
  notSaved: 'The list order could not be saved on this device.',
  find: 'Find a list',
  reset: 'Reset',
  sortButton: (sort) => `Sort: ${SORT_LABELS[sort].short}`,
  sortedBy: (sort) => `Sorted by ${SORT_LABELS[sort].short}`,
  sharedOnly: 'Shared only',
  noShared: 'No shared lists.',
  total: (count) => `${count} ${count === 1 ? 'list' : 'lists'}`,
  matches: (shown, total) => `${shown} of ${total} ${total === 1 ? 'list' : 'lists'}`,
  noMatch: (text) => `No list matches "${text}".`,
  create: (text) => `Create list "${text}"`,
  locked: 'Reordering needs Manual order and no search.',
  createFailed: 'The list could not be created.',
});

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
 * Create the row of one list: a drag handle, a link to its List screen, and a More button.
 * Both start out of the Tab order, and the menu builds on first open (`TEC-16`).
 * @param {Document} doc the document
 * @param {object} list the list
 * @param {{open: number, total: number}} count its task counts
 * @param {boolean} reorderable whether the drag handle shows
 * @returns {{item: HTMLLIElement, more: HTMLButtonElement}} the row and its More button
 */
function row(doc, list, count, reorderable) {
  const item = make(doc, 'li', 'list-item');
  item.dataset.listId = list.id;
  const grip = make(doc, 'span', 'list-item__handle');
  grip.setAttribute('aria-hidden', 'true');
  grip.hidden = !reorderable;
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
  const more = make(doc, 'button', 'icon-button list-item__more');
  more.type = 'button';
  more.tabIndex = -1;
  // The menu behavior sets the same state on first open; the closed button announces it before then.
  more.setAttribute('aria-haspopup', 'menu');
  more.setAttribute('aria-expanded', 'false');
  more.setAttribute('aria-label', actionsLabel(list.name));
  more.append(spriteIcon(doc, 'more'));
  more.dataset.role = 'more';
  item.append(grip, link, more);
  return { item, more };
}

/**
 * Create the find block: the find field, the sort button with its menu, and the info line with Reset.
 * @param {Document} doc the document
 * @returns {object} the block and its parts
 */
function createFindBlock(doc) {
  const element = make(doc, 'div', 'add-block lists-find');
  element.hidden = true;
  const bar = make(doc, 'div', 'lists-find__bar');
  const field = make(doc, 'input', 'field__control lists-find__field');
  field.type = 'search';
  field.maxLength = FIND_MAX_LENGTH;
  field.autocomplete = 'off';
  field.spellcheck = false;
  field.enterKeyHint = 'go';
  field.placeholder = STRINGS.find;
  field.setAttribute('aria-label', STRINGS.find);
  field.dataset.shortcut = 'search';
  const sort = make(doc, 'button', 'button button--quiet lists-find__sort');
  sort.type = 'button';
  const sortLabel = make(doc, 'span', 'lists-find__sort-label');
  sort.append(spriteIcon(doc, 'sort'), sortLabel);
  const menu = make(doc, 'div', 'menu');
  menu.id = 'lists-sort-menu';
  menu.setAttribute('aria-label', 'Sort lists');
  menu.hidden = true;
  for (const key of LIST_SORTS) {
    const item = make(doc, 'button', 'menu__item', SORT_LABELS[key].menu);
    item.type = 'button';
    item.setAttribute('role', 'menuitemradio');
    item.dataset.sort = key;
    menu.append(item);
  }
  // The Shared only item joins the menu's end only while it applies (`LST-16`), so it never takes a hidden place in the arrow keys.
  const shared = make(doc, 'button', 'menu__item', STRINGS.sharedOnly);
  shared.type = 'button';
  shared.setAttribute('role', 'menuitemcheckbox');
  shared.dataset.filter = 'shared';
  bar.append(field, sort, menu);
  const info = make(doc, 'div', 'info-line');
  const infoText = make(doc, 'p', 'info-line__text');
  const reset = make(doc, 'button', 'button button--quiet info-line__reset', STRINGS.reset);
  reset.type = 'button';
  info.append(infoText, reset);
  element.append(bar, info);
  return { element, field, sort, sortLabel, menu, shared, infoText, reset };
}

/**
 * Mount the Lists overview into its view element.
 * @param {HTMLElement} view the `[data-view="lists"]` element
 * @param {object} options screen options
 * @param {object} options.store the store facade
 * @param {{show: Function}} [options.toaster] the toaster, for the Delete list result
 * @param {(hash: string) => void} [options.navigate] opens another route
 * @param {HTMLElement} [options.overlays] the shell's overlay layer, which takes the floating button; the view by default
 * @param {HTMLElement} [options.actionBar] the shell's action bar, which takes the find block; the view by default
 * @param {object} [options.memory] the router's memory object of the view, which keeps the find text for the session
 * @param {() => Storage} [options.getStorage] returns the storage of the per-device sort
 * @param {() => Promise<{lists: object[], counts: object}>} [options.readSnapshot] reads the lists and their counts shared
 *   with the sidebar, so opening the screen does not read every task again (`TEC-16`); the store is read when absent
 * @param {{state: () => string, subscribe?: Function}} [options.session] the session; Shared only applies while it is not local (`LST-16`)
 * @returns {{update: () => void, idle: () => Promise<void>, destroy: () => void}} the screen
 */
export function mountLists(view, {
  store, toaster = { show() {} }, navigate = () => {}, overlays = null, actionBar = null, memory = {}, getStorage, readSnapshot = null,
  session = null,
}) {
  const doc = view.ownerDocument;
  let pending = null;
  let destroyed = false;
  let text = typeof memory.text === 'string' ? memory.text : '';
  let sort = readListSort(getStorage);
  let sharedOnly = readSharedOnly(getStorage);
  let data = null;
  let findTimer = null;
  let renderToken = 0;
  const root = make(doc, 'div', 'lists-view');
  const add = make(doc, 'a', 'fab');
  add.href = formatRoute('list-new');
  add.setAttribute('aria-label', STRINGS.newList);
  add.title = STRINGS.newList;
  add.append(spriteIcon(doc, 'plus'));
  const rows = make(doc, 'ul', 'lists-view__rows');
  rows.setAttribute('aria-label', STRINGS.lists);
  const empty = make(doc, 'div', 'empty-state');
  const emptyText = make(doc, 'p', 'empty-state__text', STRINGS.empty);
  const create = make(doc, 'button', 'button lists-view__create');
  create.type = 'button';
  create.hidden = true;
  empty.append(emptyText, create);
  const find = createFindBlock(doc);
  find.field.value = text;
  root.append(...(actionBar ? [] : [find.element]), rows, empty, ...(overlays ? [] : [add]));
  overlays?.append(add);
  view.replaceChildren(root);
  const announcer = createLiveRegion({ document: doc, parent: root });
  let shown = [];
  let refocus = null;
  let tabStopId = null;
  const menus = new Map();
  // The windowing state: the rendered rows by list id in shown order, each list's place, and the row offsets.
  let entries = new Map();
  let places = new Map();
  let offsets = new Float64Array(1);
  let handles = false;
  let rowPx = ROW_PX;
  let known = new Map();
  let measureFrame = null;
  const Observer = doc.defaultView?.ResizeObserver;
  const sizes = Observer ? new Observer(() => measureLater()) : null;

  /** @returns {boolean} true while the shown lists are too many to render every row */
  const windowed = () => shown.length > FULL_ROWS;

  /** @returns {HTMLElement|null} the main column, which scrolls the rows */
  const scroller = () => view.closest('.app__main');

  /** @returns {boolean} true when the Shared only item applies: connected, with at least one shared list (`LST-16`) */
  const sharedAvailable = () => Boolean(data) && Boolean(session) && session.state() !== 'local' && data.lists.some(isSharedList);

  /** @returns {boolean} true while only the shared lists show */
  const sharedActive = () => sharedOnly && sharedAvailable();

  /** @returns {boolean} true while reordering is on: Manual order, an empty field, and no Shared only (`LV-8`, `LST-16`) */
  const reorderable = () => sort === 'manual' && text.trim() === '' && !sharedActive();

  const sortMenu = attachMenu(find.sort, find.menu, {
    onSelect: (item) => (item.dataset.filter === 'shared' ? chooseShared(!sharedOnly) : chooseSort(item.dataset.sort)),
    align: 'end',
  });

  /** Destroy the behaviors of the row menus built so far; the menus leave with their rows. */
  function destroyMenus() {
    for (const behavior of menus.values()) {
      behavior.destroy();
    }
    menus.clear();
  }

  /**
   * Build the menu of a row's More button on first use, so a long screen holds only the menus that were opened (`TEC-16`).
   * @param {HTMLButtonElement} more the More button
   */
  function ensureMenu(more) {
    const item = more.closest('.list-item');
    const id = item?.dataset.listId;
    if (!id || menus.has(id)) {
      return;
    }
    const list = shown.find((candidate) => candidate.id === id);
    if (!list) {
      return;
    }
    // Every render rebuilds the rows and drops the menus, so the move entries follow the row's place and the lock (`LST-13`).
    const index = places.get(id);
    const movable = reorderable();
    const moves = { top: movable && index > 0, bottom: movable && index < shown.length - 1 };
    const menu = createListMenuElement({ document: doc, id: `list-actions-${id}`, name: list.name, list, moves });
    item.append(menu);
    menus.set(id, attachMenu(more, menu, {
      onSelect: (picked) => runListAction(picked, {
        listId: id, list, parent: root, opener: more, store, toaster, navigate, jump: (end) => reorder.jump(id, end),
      }),
    }));
  }

  /**
   * Destroy the menu behavior of a row that leaves the window; its menu element leaves with the row.
   * @param {string} id the list id of the row
   */
  function dropMenu(id) {
    menus.get(id)?.destroy();
    menus.delete(id);
  }

  /** Make exactly one row link the tab stop: the last focused row, else the first shown row, which stays rendered (`LST-15`). */
  function syncTabStop() {
    for (const [id, entry] of entries) {
      entry.link.tabIndex = id === tabStopId ? 0 : -1;
    }
  }

  /** Add up the row heights: row `i` starts `offsets[i]` pixels below the top of the rows. */
  function layout() {
    offsets = new Float64Array(shown.length + 1);
    for (let index = 0; index < shown.length; index += 1) {
      offsets[index + 1] = offsets[index] + (known.get(shown[index].id) ?? rowPx);
    }
  }

  /**
   * Find the row that covers a height below the top of the rows.
   * @param {number} px the height in pixels
   * @returns {number} the row index, clamped to the rows
   */
  function indexAt(px) {
    let low = 0;
    let high = shown.length - 1;
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
   * List the indexes of the rows to render: every row of a short screen, or the rows in view plus the buffer and the
   * rows that must stay: the tab stop, the focused row or the row of the open menu, a dragged row, and the given ones.
   * @param {string[]} extra more list ids to render
   * @returns {number[]} the indexes, in increasing order
   */
  function wanted(extra) {
    if (!windowed()) {
      return [...shown.keys()];
    }
    const box = rows.getBoundingClientRect();
    const port = scroller()?.getBoundingClientRect();
    const top = Math.max(port?.top ?? 0, 0) - box.top;
    const bottom = Math.min(port?.bottom ?? Infinity, doc.defaultView?.innerHeight ?? Infinity) - box.top;
    const indexes = new Set();
    for (let index = Math.max(0, indexAt(top) - BUFFER_ROWS); index <= Math.min(shown.length - 1, indexAt(bottom - 0.001) + BUFFER_ROWS); index += 1) {
      indexes.add(index);
    }
    const focused = doc.activeElement?.closest?.('.list-item');
    const dragged = rows.querySelector('.list-item[data-dragging]');
    for (const id of [...extra, tabStopId, refocus?.id, rows.contains(focused) ? focused.dataset.listId : null, dragged?.dataset.listId]) {
      if (places.has(id)) {
        indexes.add(places.get(id));
      }
    }
    return [...indexes].sort((a, b) => a - b);
  }

  /**
   * Set each rendered row's place in the set and the margin that stands in for the rows left out above it, and the
   * padding that stands in for the rows left out before the first and after the last rendered row.
   * @param {number[]} indexes the indexes of the rendered rows, in the order of `entries`
   */
  function place(indexes) {
    let previous = indexes[0] - 1;
    let at = 0;
    for (const entry of entries.values()) {
      const index = indexes[at];
      if (entry.index !== index || entry.size !== shown.length) {
        entry.item.setAttribute('aria-posinset', String(index + 1));
        entry.item.setAttribute('aria-setsize', String(shown.length));
        Object.assign(entry, { index, size: shown.length });
      }
      const gap = offsets[index] - offsets[previous + 1];
      if (entry.gap !== gap) {
        entry.item.style.marginBlockStart = gap > 0 ? `${gap}px` : '';
        entry.gap = gap;
      }
      previous = index;
      at += 1;
    }
    const windowing = windowed();
    rows.style.paddingBlockStart = windowing ? `${offsets[indexes[0] ?? 0]}px` : '';
    rows.style.paddingBlockEnd = windowing ? `${offsets[shown.length] - offsets[(indexes.at(-1) ?? -1) + 1]}px` : '';
  }

  /**
   * Find the first rendered row that shows in the scroller, and its top edge, to keep it in place when heights change.
   * @returns {{item: HTMLElement, top: number}|null} the row and its top edge, or null without rendered rows
   */
  function anchorRow() {
    const port = scroller()?.getBoundingClientRect();
    for (const entry of entries.values()) {
      const box = entry.item.getBoundingClientRect();
      if (!port || box.bottom > port.top) {
        return { item: entry.item, top: box.top };
      }
    }
    return null;
  }

  /**
   * Measure the rendered rows after they changed size, such as on their first layout or once the fonts load.
   * The shortest sets the height of the rows not rendered, and other heights are kept per list. A change moves the
   * rows after it, and the scroller follows, so the rows in view stay where they were.
   */
  function measure() {
    measureFrame = null;
    if (destroyed || !data || !windowed() || !rows.isConnected) {
      return;
    }
    const sizes = [...entries].map(([id, entry]) => [id, entry.item.offsetHeight]).filter(([, height]) => height > 0);
    if (sizes.length === 0) {
      return;
    }
    const base = Math.min(...sizes.map(([, height]) => height));
    let changed = base !== rowPx;
    if (changed) {
      rowPx = base;
      known = new Map();
    }
    for (const [id, height] of sizes) {
      if (height !== (known.get(id) ?? rowPx)) {
        if (height === rowPx) {
          known.delete(id);
        }
        else {
          known.set(id, height);
        }
        changed = true;
      }
    }
    if (!changed) {
      return;
    }
    const anchor = anchorRow();
    layout();
    draw();
    const shift = anchor?.item.isConnected ? anchor.item.getBoundingClientRect().top - anchor.top : 0;
    if (shift !== 0 && scroller()) {
      scroller().scrollTop += shift;
    }
  }

  /** Measure the rows in the next frame, since the size observer may not change the layout it reports. */
  function measureLater() {
    measureFrame ??= requestAnimationFrame(measure);
  }

  /**
   * Render the rows that show, reusing the rendered rows by list id and moving none of them, so focus stays.
   * The rows to render are found before any row leaves, so the rows' height and the scroll position hold meanwhile.
   * @param {string[]} [extra] more list ids to render, such as a row that a key moves focus to
   * @param {boolean} [fresh] whether the data changed, so every row builds again
   */
  function draw(extra = [], fresh = false) {
    const indexes = wanted(extra);
    const next = new Map();
    for (const index of indexes) {
      const list = shown[index];
      let entry = fresh ? null : entries.get(list.id);
      if (!entry) {
        const built = row(doc, list, countOf(data.counts, list.id), handles);
        entry = { ...built, link: built.item.querySelector('.list-row'), index: -1, size: -1, gap: -1 };
        if (windowed()) {
          sizes?.observe(entry.item);
        }
      }
      next.set(list.id, entry);
    }
    for (const [id, entry] of entries) {
      if (next.get(id) !== entry) {
        sizes?.unobserve(entry.item);
        entry.item.remove();
        dropMenu(id);
      }
    }
    entries = next;
    // The rows still rendered keep their order, so only new rows go in, before the first kept row after them.
    let cursor = rows.firstElementChild;
    const tail = [];
    for (const entry of entries.values()) {
      if (entry.item === cursor) {
        cursor = cursor.nextElementSibling;
      }
      else if (cursor) {
        rows.insertBefore(entry.item, cursor);
      }
      else {
        tail.push(entry.item);
      }
    }
    rows.append(...tail);
    place(indexes);
    syncTabStop();
  }

  /**
   * Focus the link of a shown row, rendering it first when it is out of the window; the focus scrolls it into view.
   * @param {number} index the row index among the shown lists
   */
  function focusRow(index) {
    const id = shown[index]?.id;
    if (id && !entries.has(id)) {
      draw([id]);
    }
    entries.get(id)?.link.focus();
  }

  /**
   * The middles of the shown rows from the top of the rows, for a drag: measured while every row renders, else from the offsets.
   * @returns {number[]} the middles, in the shown order
   */
  function midpoints() {
    if (!windowed()) {
      const top = rows.getBoundingClientRect().top;
      return [...entries.values()].map(({ item }) => {
        const box = item.getBoundingClientRect();
        return box.top - top + box.height / 2;
      });
    }
    return shown.map((_, index) => (offsets[index] + offsets[index + 1]) / 2);
  }

  /**
   * Read the lists, the tasks, and the memberships from the store and count them, when no shared snapshot is given.
   * @returns {Promise<{lists: object[], counts: object}>} the lists and their counts
   */
  async function readStore() {
    const [lists, tasks, memberships] = await Promise.all([store.listLists(), store.listTasks(), store.listMemberships()]);
    return { lists, counts: countLists(tasks, memberships) };
  }

  /**
   * Read the lists and their counts, then render them, once per burst of store changes.
   * @returns {Promise<void>} resolves once rendered
   */
  function refresh() {
    pending ??= Promise.resolve().then(async () => {
      pending = null;
      const next = await (readSnapshot ? readSnapshot() : readStore());
      if (destroyed) {
        return;
      }
      data = next;
      render();
    }).catch((error) => console.error('The lists failed to render:', error));
    return pending;
  }

  /** Render the rows from the last data: the device order or the sort, filtered by the find text. */
  function render() {
    renderToken += 1;
    const { lists, counts } = data;
    const query = text.trim();
    const ordered = applyListOrder(sharedActive() ? lists.filter(isSharedList) : lists, readListOrder());
    shown = findLists(sort === 'manual' ? ordered : sortLists(ordered, sort, counts), query, { descriptions: true });
    places = new Map(shown.map((list, index) => [list.id, index]));
    destroyMenus();
    handles = reorderable();
    // The data may have changed, so every row builds again; the tab stop falls back to the first shown row.
    if (!places.has(tabStopId)) {
      tabStopId = shown[0]?.id ?? null;
    }
    layout();
    draw([], true);
    rows.hidden = shown.length === 0;
    empty.hidden = shown.length > 0;
    emptyText.textContent = lists.length === 0 ? STRINGS.empty : query === '' ? STRINGS.noShared : STRINGS.noMatch(query);
    create.hidden = true;
    if (shown.length === 0 && lists.length > 0) {
      offerCreate(query, renderToken);
    }
    renderFindBlock(lists.length);
    restoreFocus();
  }

  /**
   * Show Create list when the typed name would be a valid new list, so no clash keeps the offer away (`LST-11`).
   * @param {string} name the typed name
   * @param {number} token the render that asked, so a later render drops this answer
   * @returns {Promise<void>} resolves once decided
   */
  async function offerCreate(name, token) {
    let valid = false;
    try {
      await store.validateList({ name });
      valid = true;
    }
    catch {
      // A blank, long, or taken name offers nothing.
    }
    if (valid && !destroyed && token === renderToken) {
      create.textContent = STRINGS.create(name);
      create.hidden = false;
    }
  }

  /**
   * Show the find block from 12 lists or while it holds text, with the sort button and the info line.
   * @param {number} total how many lists exist
   */
  function renderFindBlock(total) {
    const query = text.trim();
    const filtered = sharedActive();
    const hidden = total < FIND_FROM && query === '' && sort === 'manual' && !filtered;
    find.element.hidden = hidden;
    // The action bar joins the shell only while it holds content, so a hidden block leaves it.
    if (actionBar && hidden === find.element.isConnected) {
      if (hidden) {
        find.element.remove();
      }
      else {
        actionBar.append(find.element);
      }
    }
    find.sortLabel.textContent = STRINGS.sortButton(sort);
    find.sort.setAttribute('aria-label', STRINGS.sortButton(sort));
    for (const item of find.menu.querySelectorAll('[role="menuitemradio"]')) {
      item.setAttribute('aria-checked', String(item.dataset.sort === sort));
    }
    // The item is in the menu only while it applies, and a render settles its checked state.
    if (sharedAvailable()) {
      find.shared.setAttribute('aria-checked', String(filtered));
      find.menu.append(find.shared);
    }
    else {
      find.shared.remove();
    }
    const parts = [query === '' && !filtered ? STRINGS.total(total) : STRINGS.matches(shown.length, total)];
    if (sort !== 'manual') {
      parts.push(STRINGS.sortedBy(sort));
    }
    if (filtered) {
      parts.push(STRINGS.sharedOnly);
    }
    find.infoText.textContent = parts.join(' · ');
    find.reset.hidden = sort === 'manual' && query === '' && !filtered;
  }

  /** Put focus back on the control that had it before a move; the render that follows a move replaces every row. */
  function restoreFocus() {
    if (!refocus) {
      return;
    }
    const control = entries.get(refocus.id)?.item.querySelector(`[data-role="${refocus.role}"]`);
    control?.focus();
    // A move to an end can land far away, so the row scrolls into view even where focus does not scroll it (`LST-13`).
    control?.scrollIntoView?.({ block: 'nearest' });
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

  /**
   * Take the text now: keep it in the session memory, render, and optionally announce the matches.
   * @param {string} next the field text
   * @param {boolean} announce whether to announce the matches
   */
  function setText(next, announce) {
    clearTimeout(findTimer);
    findTimer = null;
    text = next;
    memory.text = next;
    if (!data) {
      return;
    }
    render();
    if (announce) {
      const query = text.trim();
      announcer.announce(query === '' ? STRINGS.total(data.lists.length)
        : shown.length === 0 ? STRINGS.noMatch(query) : STRINGS.matches(shown.length, data.lists.length));
    }
  }

  /**
   * Take a sort: store it on this device, render, and announce it.
   * @param {string} next one of the list sorts
   */
  function chooseSort(next) {
    if (!LIST_SORTS.includes(next) || next === sort) {
      return;
    }
    sort = next;
    writeListView({ sort, sharedOnly }, getStorage);
    if (data) {
      render();
    }
    announcer.announce(STRINGS.sortedBy(sort));
  }

  /**
   * Turn Shared only on or off: store it with the sort, render, and announce it (`LST-16`).
   * @param {boolean} next true to show only the shared lists
   */
  function chooseShared(next) {
    sharedOnly = next;
    writeListView({ sort, sharedOnly }, getStorage);
    if (data) {
      render();
    }
    announcer.announce(next ? STRINGS.sharedOnly : STRINGS.total(data?.lists.length ?? 0));
  }

  /** Reset clears the sort, the Shared only filter, and the text, which are the defaults of this screen. */
  function reset() {
    clearTimeout(findTimer);
    find.field.value = '';
    sort = 'manual';
    sharedOnly = false;
    writeListView({ sort, sharedOnly }, getStorage);
    setText('', false);
    if (!data) {
      return;
    }
    announcer.announce(STRINGS.total(data.lists.length));
  }

  /** Create the list of the typed name and open its editor, as a wide-screen add opens the task editor (`LST-11`). */
  async function createFromText() {
    const name = text.trim();
    create.disabled = true;
    try {
      const list = await store.createList({ name });
      find.field.value = '';
      text = '';
      memory.text = '';
      navigate(formatRoute('list-edit', { listId: list.id }));
      if (!destroyed) {
        refresh();
      }
    }
    catch (error) {
      announcer.announce(error?.message || STRINGS.createFailed);
    }
    finally {
      create.disabled = false;
    }
  }

  /**
   * Handle the keys of the field: Enter opens the first match, Escape clears, Down enters the rows.
   * @param {KeyboardEvent} event the key event
   */
  function onFieldKeydown(event) {
    if (event.altKey || event.ctrlKey || event.metaKey || event.isComposing) {
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      if (find.field.value !== text) {
        setText(find.field.value, false);
      }
      if (shown[0] && text.trim() !== '') {
        navigate(formatRoute('list', { listId: shown[0].id }));
      }
    }
    else if (event.key === 'Escape' && (find.field.value !== '' || text !== '')) {
      event.preventDefault();
      find.field.value = '';
      setText('', true);
    }
    else if (event.key === 'ArrowDown' && shown.length > 0) {
      event.preventDefault();
      focusRow(0);
    }
  }

  /**
   * Say why Alt+Up, Alt+Down, Alt+Home, and Alt+End do nothing while reordering is off.
   * @param {KeyboardEvent} event the key event
   */
  function onRowsKeydown(event) {
    if (event.altKey && !event.ctrlKey && !event.metaKey && ['ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)
      && event.target.closest?.('.list-item') && !reorderable()) {
      event.preventDefault();
      announcer.announce(STRINGS.locked);
      return;
    }
    roveRows(event);
  }

  /**
   * Move focus between rows with Up, Down, Home, End, PageUp, and PageDown, and between a row and its More button with Right and Left (`LST-15`).
   * Keys inside an open menu and the More button's own Up and Down stay with the menu.
   * @param {KeyboardEvent} event the key event
   */
  function roveRows(event) {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || event.defaultPrevented) {
      return;
    }
    const target = event.target;
    const item = target.closest?.('.list-item');
    if (!item || target.closest('.menu')) {
      return;
    }
    const onLink = target.matches('.list-row');
    const onMore = target.matches('.list-item__more');
    if (onLink && event.key in ROW_STEPS) {
      event.preventDefault();
      const at = places.get(item.dataset.listId) ?? 0;
      const height = item.offsetHeight || ROW_HEIGHT;
      const page = Math.max(1, Math.floor((view.closest('main')?.clientHeight || height * PAGE_ROWS) / height));
      const index = ROW_STEPS[event.key](at, shown.length, page);
      focusRow(Math.min(shown.length - 1, Math.max(0, index)));
    }
    else if (onLink && event.key === 'ArrowRight') {
      event.preventDefault();
      item.querySelector('.list-item__more').focus();
    }
    else if (onMore && event.key === 'ArrowLeft') {
      event.preventDefault();
      item.querySelector('.list-row').focus();
    }
  }

  /**
   * Follow focus with the roving tab stop, which stays on the row last used.
   * @param {FocusEvent} event the focus event
   */
  function onRowsFocusin(event) {
    const id = event.target.closest?.('.list-item')?.dataset.listId;
    if (id && id !== tabStopId) {
      tabStopId = id;
      syncTabStop();
    }
  }

  /**
   * Build a row's menu just before its More button handles the opening click or key.
   * @param {Event} event the click or keydown event, seen in the capture phase
   */
  function onRowsCapture(event) {
    const more = event.target.closest?.('.list-item__more');
    if (more && (event.type === 'click' || ['Enter', ' ', 'ArrowDown', 'ArrowUp'].includes(event.key))) {
      ensureMenu(more);
    }
  }

  find.field.addEventListener('input', () => {
    clearTimeout(findTimer);
    findTimer = setTimeout(() => setText(find.field.value, true), FIND_PAUSE_MS);
  });
  find.field.addEventListener('keydown', onFieldKeydown);
  find.reset.addEventListener('click', reset);
  create.addEventListener('click', createFromText);
  rows.addEventListener('keydown', onRowsKeydown);
  rows.addEventListener('keydown', onRowsCapture, true);
  rows.addEventListener('click', onRowsCapture, true);
  rows.addEventListener('focusin', onRowsFocusin);
  // An order that arrives during a drag waits for its end, so the dragged row stays put (`SYN-13`).
  let orderWaiting = false;
  const reorder = attachReorder(rows, {
    enabled: reorderable, onMove: move, scroller, ids: () => shown.map((list) => list.id), midpoints,
    row: '.list-item', handle: '.list-item__handle', idKey: 'listId', ends: true,
    onEnd: () => {
      if (orderWaiting) {
        orderWaiting = false;
        refresh();
      }
    },
  });

  /**
   * Render the rows that came into view after a scroll of the rows' scroller or a resize of the window.
   * The size observer measures rows that change height.
   * @param {Event} event the scroll or resize event
   */
  function onScroll(event) {
    if (data && windowed() && rows.isConnected && (event.type === 'resize' || event.target === doc || event.target.contains?.(rows))) {
      draw();
    }
  }

  doc.addEventListener('scroll', onScroll, { capture: true, passive: true });
  doc.defaultView?.addEventListener('resize', onScroll);
  const unsubscribe = store.subscribe(() => refresh());
  const unsubscribeOrder = onListOrderChange(() => {
    if (reorder.dragging()) {
      orderWaiting = true;
    }
    else {
      refresh();
    }
  });
  const unfollowSort = onSettingsChange((names) => {
    if (touchesSetting(names, PREFIX + LIST_SORT_KEY)) {
      sort = readListSort(getStorage);
      sharedOnly = readSharedOnly(getStorage);
      if (data && !destroyed) {
        render();
      }
    }
  });
  // Signing in or out changes whether Shared only applies.
  const unsubscribeSession = session?.subscribe?.(() => {
    if (data && !destroyed) {
      render();
    }
  });
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
      clearTimeout(findTimer);
      doc.removeEventListener('scroll', onScroll, { capture: true });
      doc.defaultView?.removeEventListener('resize', onScroll);
      sizes?.disconnect();
      if (measureFrame !== null) {
        cancelAnimationFrame(measureFrame);
      }
      add.remove();
      find.element.remove();
      unsubscribe();
      unsubscribeOrder();
      unfollowSort();
      unsubscribeSession?.();
      sortMenu.destroy();
      destroyMenus();
      reorder.destroy();
      announcer.destroy();
    },
  };
}
