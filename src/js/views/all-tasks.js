/**
 * All tasks screen: every task outside the recycle bin, in any list or none (`TV-1`).
 *
 * It fills the shell's `[data-view="tasks"]` element with the More menu, the add bar, which also searches, its
 * info line, and the task list, and renders again after every store change, local or from another tab.
 * The More menu holds Edit view options, which opens the View options panel (`VO-4`); the options live in a view
 * model that the panel shares, and the info line names them and offers Reset (`VO-7`, `VO-8`).
 * A store without tasks shows the first-launch empty state with the add bar, and no sign-in (`LOC-1`).
 * The first added task replaces it, and the app then asks the browser for persistent storage (`TEC-5`).
 * An empty result names the active filters and offers Reset.
 * A grouping splits the shown tasks into groups with a header and a count; filters and sort apply inside each group,
 * and list groups follow the list order of the sidebar (`VO-9` to `VO-12`).
 */

import { applyListOrder, onListOrderChange, readListOrder } from '../core/list-order.js';
import { isSharedList } from '../core/permissions.js';
import { clearFilters, exactMatchIndex, filterTasks, groupTasks, indexMemberships, NO_LIST, sortTasks } from '../core/query.js';
import { attachMenu } from '../ui/menu.js';
import { formatRoute } from '../ui/router.js';
import { createAddBar, createAddHint, notifyIfHidden } from './add-bar.js';
import { createTaskList, make, spriteIcon } from './task-list.js';
import { createInfoLine, createViewModel, describeFilters } from './view-controls.js';

const VIEW = 'tasks';
const REDRAW_MS = 60_000;

/** Screen strings, for the strings module of TEC-13 to absorb. */
const STRINGS = Object.freeze({
  label: 'All tasks',
  emptyTitle: 'No tasks yet.',
  emptyText: 'Your tasks stay on this device.',
  importBackup: 'Import a backup',
  connect: 'Connect to sync across devices',
  noMatch: 'No tasks match ',
  reset: 'Reset',
  actions: 'View actions',
  editViewOptions: 'Edit view options',
  addFailed: 'The task could not be added.',
});

/**
 * Ask the browser to keep the local data from eviction, once it holds a task (`TEC-5`).
 * @param {Navigator} [nav] the navigator
 * @returns {Promise<void>}
 */
export async function requestPersistence(nav = globalThis.navigator) {
  try {
    if (nav?.storage?.persist && !(await nav.storage.persisted?.())) {
      await nav.storage.persist();
    }
  }
  catch (error) {
    console.warn('Persistent storage request failed:', error);
  }
}

/**
 * Join filter descriptions into one phrase, such as `Status: open and Lists: Home`.
 * @param {string[]} parts the descriptions
 * @returns {string} the phrase
 */
function joinParts(parts) {
  return parts.length < 2 ? parts.join('') : `${parts.slice(0, -1).join(', ')} and ${parts.at(-1)}`;
}

/**
 * Read the store into the shape the screen renders.
 * @param {object} store the store facade
 * @returns {Promise<{tasks: object[], lists: object[], listsByTask: Map, notesByTask: Map}>} the data
 */
async function readData(store) {
  const snapshot = await store.snapshot();
  const userId = (await store.queue?.getState?.('user-id')) ?? null;
  const lists = snapshot.lists.filter((list) => !list['deletion-time'])
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
  const notesByTask = new Map();
  for (const note of snapshot.notes) {
    notesByTask.set(note['task-id'], [...(notesByTask.get(note['task-id']) ?? []), note.text]);
  }
  return {
    tasks: snapshot.tasks.filter((task) => !task['deletion-time']),
    lists,
    listsByTask: indexMemberships(snapshot.memberships, lists.map((list) => list.id)),
    notesByTask,
    sharedListIds: new Set(lists.filter(isSharedList).map((list) => list.id)),
    userId,
  };
}

/**
 * Mount the All tasks screen into its view element.
 * @param {HTMLElement} view the `[data-view="tasks"]` element
 * @param {object} options screen options
 * @param {object} options.store the store facade
 * @param {{show: Function}} options.toaster the toaster
 * @param {object} [options.memory] the router's memory object of the view, which keeps the search text
 * @param {{tasks: object}} [options.viewModels] the view models the panel shares, a new one by default
 * @param {(hash: string) => void} [options.navigate] opens another route
 * @param {() => Storage} [options.getStorage] returns the storage of the per-device view state
 * @param {() => Date} [options.now] the clock
 * @param {() => Promise<void>} [options.persist] asks for persistent storage
 * @param {{state: () => string}} [options.session] the session; the Shared filter applies while it is connected (`TV-7`)
 * @returns {{update: (route: object) => void, idle: () => Promise<void>, destroy: () => void}} the screen
 */
export function mountAllTasks(view, {
  store, toaster, memory = {}, viewModels, navigate = () => {}, getStorage, now = () => new Date(), persist = requestPersistence, session,
}) {
  const doc = view.ownerDocument;
  const model = viewModels?.tasks ?? createViewModel(VIEW, getStorage);
  if (memory.text) {
    model.set({ ...model.get(), filter: { ...model.get().filter, text: memory.text } });
  }
  let data = null;
  let asked = false;
  let pending = null;
  let destroyed = false;

  const root = doc.createElement('div');
  root.className = 'task-view';
  const header = make(doc, 'div', 'view-header');
  const more = make(doc, 'button', 'icon-button view-header__more');
  more.type = 'button';
  more.setAttribute('aria-label', STRINGS.actions);
  more.append(spriteIcon(doc, 'more'));
  const menu = make(doc, 'div', 'menu');
  menu.id = 'all-tasks-actions';
  menu.setAttribute('aria-label', STRINGS.actions);
  menu.hidden = true;
  const item = make(doc, 'button', 'menu__item', STRINGS.editViewOptions);
  item.type = 'button';
  item.setAttribute('role', 'menuitem');
  menu.append(item);
  header.append(more, menu);
  const menuBehavior = attachMenu(more, menu, { onSelect: () => navigate(formatRoute('view-options')) });
  const info = createInfoLine({ document: doc, onReset: () => model.reset() });
  const addBar = createAddBar({ document: doc, onAdd: add, onSearch: setText, text: model.get().filter.text ?? '' });
  const addHint = createAddHint({ document: doc });
  const addBlock = make(doc, 'div', 'add-block');
  addBlock.append(addBar.element);
  const taskList = createTaskList({
    document: doc, store, toaster, label: STRINGS.label, hrefOf: (task) => formatRoute('task', { taskId: task.id }),
    fallbackFocus: () => addBar.input,
  });
  const empty = doc.createElement('div');
  empty.className = 'empty-state';
  root.append(addBlock, taskList.element, addHint.element, empty);
  view.replaceChildren(root);

  /**
   * Store a new task in the lists of the active list filter, or in no list, and open its editor.
   * @param {string} description the trimmed description
   * @returns {Promise<void>} resolves once stored; rejects when the task could not be stored
   */
  async function add(description) {
    const listIds = new Set(data?.lists.map((list) => list.id) ?? []);
    const lists = (model.get().filter.lists ?? []).filter((id) => id !== NO_LIST && listIds.has(id));
    const first = data?.tasks.length === 0;
    let task;
    try {
      task = await store.createTask({ description }, { lists });
    }
    catch (error) {
      console.error('Adding the task failed:', error);
      toaster.show(STRINGS.addFailed);
      throw error;
    }
    notifyIfHidden({
      task, listIds: lists, filter: model.get().filter, lists: data?.lists ?? [], now: now(), toaster,
      onShow: (keys) => model.set({ ...model.get(), filter: clearFilters(model.get().filter, keys) }),
    });
    if (first && !asked) {
      asked = true;
      persist();
    }
    navigate(formatRoute('task', { taskId: task.id }));
  }

  /**
   * Filter by the search text, which the session memory keeps but the device does not (`TV-6`).
   * @param {string} text the search text
   */
  function setText(text) {
    if (text === (model.get().filter.text ?? '')) {
      return;
    }
    const next = structuredClone(model.get());
    if (text) {
      next.filter.text = text;
    }
    else {
      delete next.filter.text;
    }
    model.set(next);
  }

  /** Show a state set by the search field, the panel, or Reset: the search text, the memory, and the rows. */
  function follow() {
    const text = model.get().filter.text ?? '';
    memory.text = text;
    addBar.setText(text);
    render();
  }

  /** Fill the empty state of a store without tasks. */
  function showFirstLaunch() {
    empty.replaceChildren(spriteIcon(doc, 'tasks', 'icon empty-state__icon'));
    const title = doc.createElement('p');
    title.className = 'empty-state__title';
    title.textContent = STRINGS.emptyTitle;
    const text = doc.createElement('p');
    text.className = 'empty-state__text';
    text.textContent = STRINGS.emptyText;
    const actions = doc.createElement('div');
    actions.className = 'empty-state__actions';
    for (const [href, label] of [['#/settings', STRINGS.importBackup], ['#/connect', STRINGS.connect]]) {
      const link = doc.createElement('a');
      link.className = 'button button--quiet';
      link.href = href;
      link.textContent = label;
      actions.append(link);
    }
    empty.append(title, text, actions);
  }

  /**
   * Fill the empty state of a filter without results.
   * @param {string[]} parts the active filter descriptions
   */
  function showNoMatch(parts) {
    empty.replaceChildren(spriteIcon(doc, 'search', 'icon empty-state__icon'));
    const text = doc.createElement('p');
    text.className = 'empty-state__text';
    text.textContent = `${STRINGS.noMatch}${joinParts(parts)}.`;
    const actions = doc.createElement('div');
    actions.className = 'empty-state__actions';
    const clear = doc.createElement('button');
    clear.className = 'button button--quiet';
    clear.type = 'button';
    clear.textContent = STRINGS.reset;
    clear.addEventListener('click', () => {
      model.reset();
      // The button hides with the empty result, so focus moves to search.
      addBar.input.focus();
    });
    actions.append(clear);
    empty.append(text, actions);
  }

  /** Render the current data with the current filters and order. */
  function render() {
    if (!data || destroyed) {
      return;
    }
    const firstLaunch = data.tasks.length === 0;
    root.dataset.state = firstLaunch ? 'first-launch' : 'tasks';
    taskList.element.hidden = firstLaunch;
    if (firstLaunch) {
      header.remove();
      info.element.remove();
      addHint.update({ text: '', shown: 0, viewer: false });
      taskList.render([], {});
      model.setCounts({ shown: 0, total: 0 });
      showFirstLaunch();
      empty.hidden = false;
      return;
    }
    if (!header.isConnected) {
      root.prepend(header);
    }
    if (!info.element.isConnected) {
      addBlock.append(info.element);
    }
    const stored = model.get();
    const listIds = new Set(data.lists.map((list) => list.id));
    const filter = { ...stored.filter };
    if (!session || session.state() === 'local') {
      delete filter.shared;
    }
    const state = { ...stored, filter };
    if (filter.lists) {
      filter.lists = filter.lists.filter((id) => id === NO_LIST || listIds.has(id));
    }
    const ctx = { ...data, now: now(), lists: new Map(data.lists.map((list) => [list.id, list])) };
    const byOptions = filterTasks(data.tasks, { ...filter, text: undefined }, ctx);
    const shown = sortTasks(filterTasks(byOptions, filter, ctx), state.order);
    const groups = state.group && state.group !== 'none'
      ? groupTasks(shown, state.group, { ...ctx, lists: applyListOrder(data.lists, readListOrder(getStorage)) })
      : null;
    taskList.render(shown, ctx, { groups });
    addBar.setKnown(exactMatchIndex(byOptions));
    const nothingMatches = addHint.update({ text: filter.text ?? '', shown: shown.length, viewer: false });
    empty.hidden = shown.length > 0 || nothingMatches;
    if (!empty.hidden) {
      showNoMatch(describeFilters(filter, data.lists));
    }
    info.update({ shown: shown.length, total: data.tasks.length, state, lists: data.lists });
    model.setCounts({ shown: shown.length, total: data.tasks.length });
  }

  /**
   * Read the store and render, once per burst of changes.
   * @returns {Promise<void>} resolves once rendered
   */
  function refresh() {
    pending ??= Promise.resolve().then(async () => {
      pending = null;
      data = await readData(store);
      render();
    }).catch((error) => console.error('All tasks failed to render:', error));
    return pending;
  }

  /**
   * Follow the clock: a Due filter, Finished today only, or the due date groups can change which tasks show where,
   * so it renders again; otherwise only due chips change.
   */
  function tick() {
    const { filter, group } = model.get();
    if (filter.due?.length || filter.finishedToday === true || group === 'due') {
      render();
    }
    else {
      taskList.tick(now());
    }
  }

  const unsubscribe = store.subscribe(refresh);
  const unfollow = model.subscribe(follow);
  const unfollowOrder = onListOrderChange(() => model.get().group === 'list' && render());
  // Overdue chips follow the clock, also for tasks that keep their status (`OVD-2`).
  const timer = setInterval(tick, REDRAW_MS);
  const first = refresh();

  return {
    /**
     * Follow a route of this view, such as an open task editor.
     * @param {object} route the route
     */
    update(route) {
      taskList.setSelected(route.params.taskId ?? null);
    },

    /**
     * Wait for the first render.
     * @returns {Promise<void>} resolves once the first data rendered
     */
    idle: () => first,

    /** Stop following the store and the clock; search text still waiting reaches the session memory. */
    destroy() {
      destroyed = true;
      addBar.destroy();
      unfollow();
      unfollowOrder();
      menuBehavior.destroy();
      unsubscribe();
      clearInterval(timer);
      taskList.destroy();
    },
  };
}
