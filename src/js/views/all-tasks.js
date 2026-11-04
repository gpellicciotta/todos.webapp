/**
 * All tasks screen: every task outside the recycle bin, in any list or none (`TV-1`).
 *
 * It fills the shell's `[data-view="tasks"]` element with the view controls, the add bar, and the task list,
 * and renders again after every store change, local or from another tab.
 * A store without tasks shows the first-launch empty state with the add bar, and no sign-in (`LOC-1`).
 * The first added task replaces it, and the app then asks the browser for persistent storage (`TEC-5`).
 * An empty result names the active filters and offers Clear all.
 */

import { filterTasks, indexMemberships, NO_LIST, sortTasks } from '../core/query.js';
import { formatRoute } from '../ui/router.js';
import { createAddBar } from './add-bar.js';
import { createTaskList, spriteIcon } from './task-list.js';
import { createViewControls, describeFilters, loadViewState, saveViewState } from './view-controls.js';

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
  clearAll: 'Clear all',
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
  };
}

/**
 * Mount the All tasks screen into its view element.
 * @param {HTMLElement} view the `[data-view="tasks"]` element
 * @param {object} options screen options
 * @param {object} options.store the store facade
 * @param {{show: Function}} options.toaster the toaster
 * @param {object} [options.memory] the router's memory object of the view, which keeps the search text
 * @param {() => Storage} [options.getStorage] returns the storage of the per-device view state
 * @param {() => Date} [options.now] the clock
 * @param {() => Promise<void>} [options.persist] asks for persistent storage
 * @returns {{update: (route: object) => void, idle: () => Promise<void>, destroy: () => void}} the screen
 */
export function mountAllTasks(view, {
  store, toaster, memory = {}, getStorage, now = () => new Date(), persist = requestPersistence,
}) {
  const doc = view.ownerDocument;
  const state = loadViewState(VIEW, getStorage);
  if (memory.text) {
    state.filter.text = memory.text;
  }
  let data = null;
  let asked = false;
  let pending = null;
  let controls = null;
  let listsKey = '';
  let destroyed = false;

  const root = doc.createElement('div');
  root.className = 'task-view';
  const addBar = createAddBar({ document: doc, onAdd: add });
  const taskList = createTaskList({
    document: doc, store, toaster, label: STRINGS.label, hrefOf: (task) => formatRoute('task', { taskId: task.id }),
    fallbackFocus: () => addBar.input,
  });
  const empty = doc.createElement('div');
  empty.className = 'empty-state';
  root.append(addBar.element, taskList.element, empty);
  view.replaceChildren(root);

  /**
   * Store a new task in the lists of the active list filter, or in no list.
   * @param {string} description the trimmed description
   * @returns {Promise<void>} rejects when the task could not be stored
   */
  async function add(description) {
    const listIds = new Set(data?.lists.map((list) => list.id) ?? []);
    const lists = (state.filter.lists ?? []).filter((id) => id !== NO_LIST && listIds.has(id));
    const first = data?.tasks.length === 0;
    try {
      await store.createTask({ description }, { lists });
    }
    catch (error) {
      console.error('Adding the task failed:', error);
      toaster.show(STRINGS.addFailed);
      throw error;
    }
    if (first && !asked) {
      asked = true;
      persist();
    }
  }

  /**
   * Keep a new view state: on this device, in the session memory, and on screen.
   * @param {{filter: object, order: object}} next the view state
   */
  function setState(next) {
    state.filter = next.filter;
    state.order = next.order;
    saveViewState(VIEW, state, getStorage);
    memory.text = state.filter.text ?? '';
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
    clear.textContent = STRINGS.clearAll;
    clear.addEventListener('click', () => {
      setState({ filter: { statuses: [] }, order: state.order });
      controls?.setState(state);
      // The button hides with the empty result, so focus moves to search.
      root.querySelector('[data-shortcut="search"]')?.focus();
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
      controls?.element.remove();
      taskList.render([], {});
      showFirstLaunch();
      empty.hidden = false;
      return;
    }
    const nextKey = JSON.stringify(data.lists.map((list) => [list.id, list.name]));
    if (!controls) {
      controls = createViewControls({ document: doc, state, lists: data.lists, onChange: setState });
    }
    else if (nextKey !== listsKey) {
      controls.setLists(data.lists);
    }
    listsKey = nextKey;
    if (!controls.element.isConnected) {
      root.prepend(controls.element);
    }
    const listIds = new Set(data.lists.map((list) => list.id));
    const filter = { ...state.filter };
    if (filter.lists) {
      filter.lists = filter.lists.filter((id) => id === NO_LIST || listIds.has(id));
    }
    const ctx = { now: now(), lists: new Map(data.lists.map((list) => [list.id, list])), ...data };
    const shown = sortTasks(filterTasks(data.tasks, filter, ctx), state.order);
    taskList.render(shown, ctx);
    empty.hidden = shown.length > 0;
    if (shown.length === 0) {
      showNoMatch(describeFilters(filter, data.lists));
    }
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
   * Follow the clock: a Due filter can change which tasks show, so it renders again; otherwise only due chips change.
   */
  function tick() {
    if (state.filter.due?.length) {
      render();
    }
    else {
      taskList.tick(now());
    }
  }

  const unsubscribe = store.subscribe(refresh);
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
      controls?.destroy();
      unsubscribe();
      clearInterval(timer);
      taskList.destroy();
    },
  };
}
