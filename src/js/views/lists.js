/**
 * Lists overview: every list with its name, description start, and "4 open · 10 total" (`LST-5`).
 *
 * It fills the shell's `[data-view="lists"]` element, and renders again after every store change.
 * Each row opens its list; the floating plus button, named New list, opens the list editor on `#/lists/new`.
 * The button sits in the shell's overlay layer while the screen is open.
 * The button hides while an editor is open, so it never covers the editor panel.
 * Each row also has a More button with the actions of the List screen: Edit list, Edit view options, Share list,
 * and Delete list (`VO-4`).
 * Rows follow the order of this device (`LST-8`): drag a row by its handle, or press Alt+Up or Alt+Down on a row.
 * The order stays on the device and new lists come last.
 * The counts come from core/list-counts.js, shared with the sidebar; core/list-find.js and core/list-sort.js hold the
 * find and sort rules of the Many Lists design (`LST-10`, `LST-12`).
 * From 12 lists, or while it holds text, a find block joins the shell's action bar, pinned under the rows: a find field,
 * a sort button with its menu, and an info line with Reset. The field searches names and descriptions once typing pauses
 * for 150 ms; Enter opens the first match, Escape clears, Down enters the rows, and `/` focuses it (`LST-10`).
 * The text lasts for the session in the router memory; the sort persists per device in `todos.view.lists` (`LST-12`).
 * A text with no match offers Create list for a valid new name, which opens the new list's editor (`LST-11`).
 * Reordering needs Manual order and an empty field; otherwise the handles hide and Alt+Up or Alt+Down says why.
 * Sharing state and the owner of others' lists join the rows once sharing lands (`SHR-3`).
 */

import { countLists, countOf } from '../core/list-counts.js';
import { FIND_MAX_LENGTH, findLists } from '../core/list-find.js';
import { applyListOrder, movedMessage, moveListTo, onListOrderChange, readListOrder, writeListOrder } from '../core/list-order.js';
import { LIST_SORTS, readListSort, SORT_LABELS, sortLists, writeListSort } from '../core/list-sort.js';
import { createLiveRegion } from '../../vendor/design/js/live-region.js';
import { attachMenu } from '../../vendor/design/js/menu.js';
import { formatRoute } from '../ui/router.js';
import { createListMenu, runListAction } from './list-actions.js';
import { attachReorder } from './reorder.js';
import { make, spriteIcon } from './task-list.js';

/** From this many lists the find block shows (`LST-10`). */
const FIND_FROM = 12;

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
 * Create the row of one list: a drag handle, a link to its List screen, and a More button with its menu.
 * @param {Document} doc the document
 * @param {object} list the list
 * @param {{open: number, total: number}} count its task counts
 * @param {boolean} reorderable whether the drag handle shows
 * @returns {{item: HTMLLIElement, more: HTMLButtonElement, menu: HTMLElement}} the row, its button, and its menu
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
  const { more, menu } = createListMenu({ document: doc, id: `list-actions-${list.id}`, name: list.name, className: 'list-item__more', list });
  more.dataset.role = 'more';
  item.append(grip, link, more, menu);
  return { item, more, menu };
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
  bar.append(field, sort, menu);
  const info = make(doc, 'div', 'info-line');
  const infoText = make(doc, 'p', 'info-line__text');
  const reset = make(doc, 'button', 'button button--quiet info-line__reset', STRINGS.reset);
  reset.type = 'button';
  info.append(infoText, reset);
  element.append(bar, info);
  return { element, field, sort, sortLabel, menu, infoText, reset };
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
 * @returns {{update: () => void, idle: () => Promise<void>, destroy: () => void}} the screen
 */
export function mountLists(view, {
  store, toaster = { show() {} }, navigate = () => {}, overlays = null, actionBar = null, memory = {}, getStorage,
}) {
  const doc = view.ownerDocument;
  let pending = null;
  let destroyed = false;
  let text = typeof memory.text === 'string' ? memory.text : '';
  let sort = readListSort(getStorage);
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
  let menus = [];

  /** @returns {boolean} true while reordering is on: Manual order and an empty field (`LV-8`) */
  const reorderable = () => sort === 'manual' && text.trim() === '';

  const sortMenu = attachMenu(find.sort, find.menu, {
    onSelect: (item) => chooseSort(item.dataset.sort),
    align: 'end',
  });

  /**
   * Read the lists and their counts, then render them, once per burst of store changes.
   * @returns {Promise<void>} resolves once rendered
   */
  function refresh() {
    pending ??= Promise.resolve().then(async () => {
      pending = null;
      const [lists, tasks, memberships] = await Promise.all([store.listLists(), store.listTasks(), store.listMemberships()]);
      if (destroyed) {
        return;
      }
      data = { lists, counts: countLists(tasks, memberships) };
      render();
    }).catch((error) => console.error('The lists failed to render:', error));
    return pending;
  }

  /** Render the rows from the last data: the device order or the sort, filtered by the find text. */
  function render() {
    renderToken += 1;
    const { lists, counts } = data;
    const query = text.trim();
    const ordered = applyListOrder(lists, readListOrder());
    shown = findLists(sort === 'manual' ? ordered : sortLists(ordered, sort, counts), query, { descriptions: true });
    for (const behavior of menus) {
      behavior.destroy();
    }
    const handles = reorderable();
    const built = shown.map((list) => ({ list, ...row(doc, list, countOf(counts, list.id), handles) }));
    menus = built.map(({ list, more, menu }) => attachMenu(more, menu, {
      onSelect: (picked) => runListAction(picked, { listId: list.id, list, parent: root, opener: more, store, toaster, navigate }),
    }));
    rows.replaceChildren(...built.map(({ item }) => item));
    rows.hidden = shown.length === 0;
    empty.hidden = shown.length > 0;
    emptyText.textContent = lists.length === 0 ? STRINGS.empty : STRINGS.noMatch(query);
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
    const hidden = total < FIND_FROM && query === '' && sort === 'manual';
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
    const parts = [query === '' ? STRINGS.total(total) : STRINGS.matches(shown.length, total)];
    if (sort !== 'manual') {
      parts.push(STRINGS.sortedBy(sort));
    }
    find.infoText.textContent = parts.join(' · ');
    find.reset.hidden = sort === 'manual' && query === '';
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
    writeListSort(sort, getStorage);
    if (data) {
      render();
    }
    announcer.announce(STRINGS.sortedBy(sort));
  }

  /** Reset clears the sort and the text, which are the defaults of this screen. */
  function reset() {
    clearTimeout(findTimer);
    find.field.value = '';
    sort = 'manual';
    writeListSort(sort, getStorage);
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
    else if (event.key === 'ArrowDown') {
      const first = rows.querySelector('.list-row');
      if (first) {
        event.preventDefault();
        first.focus();
      }
    }
  }

  /**
   * Say why Alt+Up and Alt+Down do nothing while reordering is off.
   * @param {KeyboardEvent} event the key event
   */
  function onRowsKeydown(event) {
    if (event.altKey && !event.ctrlKey && !event.metaKey && ['ArrowUp', 'ArrowDown'].includes(event.key)
      && event.target.closest?.('.list-item') && !reorderable()) {
      event.preventDefault();
      announcer.announce(STRINGS.locked);
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
  const reorder = attachReorder(rows, { enabled: reorderable, onMove: move, row: '.list-item', handle: '.list-item__handle', idKey: 'listId' });
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
      clearTimeout(findTimer);
      add.remove();
      find.element.remove();
      unsubscribe();
      unsubscribeOrder();
      sortMenu.destroy();
      for (const behavior of menus) {
        behavior.destroy();
      }
      reorder.destroy();
      announcer.destroy();
    },
  };
}
