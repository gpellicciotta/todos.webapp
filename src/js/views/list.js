/**
 * List screen: the tasks of one list, in its manual order by default (`LV-1` to `LV-10`).
 *
 * It fills the shell's `[data-view="list"]` element with the header, the add bar, which also searches, with its
 * info line, and the shared task list, and renders again after every store change.
 * The More menu holds Edit list, Edit view options, Share list, and Delete list (`VO-4`).
 * Manual order shows drag handles and Move up and Move down; another sort affects the view only (`LV-7`, `LV-8`).
 * A grouping by due date or status splits the rows into groups, each in the chosen order, and hides the moves (`LV-8`, `LV-11`).
 * The options live in a view model that the View options panel shares; they persist per device,
 * for every list view together (`TV-12`).
 * A list that leaves the store, such as one deleted in another tab, opens All tasks with a toast.
 */

import {
  clearFilters, exactMatchIndex, filterTasks, groupTasks, indexMemberships, positionsOfList, sortByPosition, sortTasks,
} from '../core/query.js';
import { createLiveRegion } from '../ui/live-region.js';
import { attachMenu } from '../ui/menu.js';
import { DEFAULT_HASH, formatRoute } from '../ui/router.js';
import { createAddBar, createAddHint, notifyIfHidden } from './add-bar.js';
import { can, listRole, ROLE_LABELS } from '../core/permissions.js';
import { createListMenu, fillListMenu, runListAction } from './list-actions.js';
import { attachReorder } from './reorder.js';
import { createTaskList, make } from './task-list.js';
import { createInfoLine, createViewModel, describeFilters } from './view-controls.js';

const VIEW = 'list';
const REDRAW_MS = 60_000;
let instances = 0;

/** Screen strings, for the strings module of TEC-13 to absorb. */
const STRINGS = Object.freeze({
  notFound: 'That list was not found. Showing All tasks.',
  sharedBy: (owner, role) => `Shared by ${owner || 'someone'} · ${role}`,
  moved: (description, position, count) => `${description} moved to position ${position} of ${count}.`,
  empty: 'This list has no tasks yet.',
  noMatch: (parts) => `No tasks match ${parts}.`,
  addFailed: 'The task could not be added.',
  failed: 'That change could not be saved.',
});

/**
 * Read the store into the shape the screen renders.
 * @param {object} store the store facade
 * @param {string} listId the list identifier
 * @returns {Promise<object>} the list, or null once it left the store, its tasks, and the task list context
 */
async function readData(store, listId) {
  const snapshot = await store.snapshot();
  const userId = (await store.queue?.getState?.('user-id')) ?? null;
  const lists = snapshot.lists.filter((list) => !list['deletion-time'])
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
  const positions = positionsOfList(snapshot.memberships, listId);
  const notesByTask = new Map();
  for (const note of snapshot.notes) {
    notesByTask.set(note['task-id'], [...(notesByTask.get(note['task-id']) ?? []), note.text]);
  }
  return {
    list: lists.find((list) => list.id === listId) ?? null,
    tasks: sortByPosition(snapshot.tasks.filter((task) => !task['deletion-time'] && positions.has(task.id)), positions),
    lists: new Map(lists.map((list) => [list.id, list])),
    listsByTask: indexMemberships(snapshot.memberships, lists.map((list) => list.id)),
    notesByTask,
    userId,
  };
}

/**
 * Mount the List screen into its view element.
 * @param {HTMLElement} view the `[data-view="list"]` element, whose `data-list-id` names the list
 * @param {object} options screen options
 * @param {object} options.store the store facade
 * @param {{show: Function}} options.toaster the toaster
 * @param {(hash: string, settings?: {replace?: boolean}) => void} options.navigate opens another route
 * @param {{list: object}} [options.viewModels] the view models the panel shares, a new one by default
 * @param {() => Storage} [options.getStorage] returns the storage of the per-device view state
 * @param {() => Date} [options.now] the clock
 * @returns {{update: (route: object) => void, idle: () => Promise<void>, destroy: () => void}} the screen
 */
export function mountList(view, { store, toaster, navigate, viewModels, getStorage, now = () => new Date() }) {
  const doc = view.ownerDocument;
  const listId = view.dataset.listId;
  const id = `list-view-${(instances += 1)}`;
  const model = viewModels?.list ?? createViewModel(VIEW, getStorage);
  model.select(listId);
  // The text of an earlier visit must not filter this one.
  if (model.get().filter.text) {
    const filter = { ...model.get().filter };
    delete filter.text;
    model.set({ ...model.get(), filter });
  }
  let data = null;
  let pending = null;
  let gone = false;
  let deletedHere = false;

  /**
   * Report a change that failed, in the console and in a toast.
   * @param {unknown} error the error
   */
  const fail = (error) => {
    console.error('List change failed:', error);
    toaster.show(STRINGS.failed);
  };

  const root = make(doc, 'div', 'task-view list-view');
  const header = make(doc, 'div', 'view-header');
  const description = make(doc, 'p', 'list-view__description');
  const owner = make(doc, 'p', 'list-view__owner');
  const { more, menu } = createListMenu({ document: doc, id: `${id}-actions`, className: 'list-view__more' });
  header.append(description, owner, more, menu);

  const info = createInfoLine({ document: doc, onReset: () => model.reset() });
  const addBar = createAddBar({ document: doc, onAdd: add, onSearch: setText });
  const addHint = createAddHint({ document: doc });
  const moves = { enabled: () => can(listRole(data?.list), 'reorder-task') && model.get().order.field === 'manual' && (model.get().group ?? 'none') === 'none', step: (taskId, step) => reorder.step(taskId, step) };
  const taskList = createTaskList({
    document: doc, store, toaster, label: '', listId, moves, fallbackFocus: () => addBar.input,
    hrefOf: (task) => formatRoute('list-task', { listId, taskId: task.id }),
  });
  const reorder = attachReorder(taskList.element, { enabled: moves.enabled, onMove: move, ids: taskList.ids, midpoints: taskList.midpoints });
  const empty = make(doc, 'p', 'empty-state empty-state__text');
  const addBlock = make(doc, 'div', 'add-block');
  addBlock.append(addBar.element, info.element);
  root.append(header, addBlock, taskList.element, addHint.element, empty);
  view.replaceChildren(root);
  const announcer = createLiveRegion({ document: doc, parent: root });
  const behavior = attachMenu(more, menu, { onSelect: act });
  let menuRole = null;

  /**
   * Store a new task at the end of this list (`LV-5`) and open its editor.
   * @param {string} text the trimmed description
   * @returns {Promise<void>} resolves once stored; rejects when the task could not be stored
   */
  async function add(text) {
    let task;
    try {
      task = await store.createTask({ description: text }, { lists: [listId] });
    }
    catch (error) {
      console.error('Adding the task failed:', error);
      toaster.show(STRINGS.addFailed);
      throw error;
    }
    notifyIfHidden({
      task, listIds: [listId], filter: model.get().filter, lists: [...(data?.lists.values() ?? [])], now: now(), toaster,
      onShow: (keys) => model.set({ ...model.get(), filter: clearFilters(model.get().filter, keys) }),
    });
    navigate(formatRoute('list-task', { listId, taskId: task.id }));
  }

  /**
   * Filter by the search text, which lasts for the session only (`TV-6`).
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

  /** Show a state set by the add field, the panel, or Reset: the search text and the rows. */
  function follow() {
    addBar.setText(model.get().filter.text ?? '');
    render();
  }

  /**
   * Store a move in the manual order and announce the new position.
   * @param {string} taskId the moved task
   * @param {{placement: object, index: number}} next the neighbor and the new index among the shown rows
   */
  function move(taskId, next) {
    const count = taskList.ids().length;
    const task = data?.tasks.find((candidate) => candidate.id === taskId);
    store.moveInList(taskId, listId, next.placement)
      .then(() => announcer.announce(STRINGS.moved(task?.description ?? '', next.index + 1, count)), fail);
  }

  /**
   * Run a list action of the header menu; Edit list and Share open the list editor, Edit view options the panel.
   * @param {HTMLElement} item the picked menu item
   */
  function act(item) {
    runListAction(item, { listId, list: data?.list ?? null, parent: root, opener: more, store, toaster, navigate });
  }

  /** Render the current data with the current view options. */
  function render() {
    if (!data?.list) {
      return;
    }
    taskList.element.querySelector('.task-list').setAttribute('aria-label', data.list.name);
    description.textContent = data.list.description ?? '';
    description.hidden = !data.list.description;
    const role = listRole(data.list);
    owner.textContent = data.list.owner && role !== 'owner' ? STRINGS.sharedBy(data.list.owner.name || data.list.owner.email || '', ROLE_LABELS[role]) : '';
    owner.hidden = !owner.textContent;
    if (menuRole !== role) {
      menuRole = role;
      fillListMenu(menu, role);
    }
    const state = model.get();
    const ctx = { now: now(), lists: data.lists, listsByTask: data.listsByTask, notesByTask: data.notesByTask, userId: data.userId };
    const byOptions = filterTasks(data.tasks, { ...state.filter, text: undefined }, ctx);
    const filtered = filterTasks(byOptions, state.filter, ctx);
    const shown = state.order.field === 'manual' ? filtered : sortTasks(filtered, state.order);
    const groups = state.group && state.group !== 'none' ? groupTasks(shown, state.group, ctx) : null;
    taskList.render(shown, ctx, { groups });
    addBar.setKnown(exactMatchIndex(byOptions));
    const viewer = !can(role, 'create-task');
    addBar.setViewer(viewer);
    const nothingMatches = addHint.update({ text: state.filter.text ?? '', shown: shown.length, viewer });
    empty.hidden = shown.length > 0 || nothingMatches;
    empty.textContent = data.tasks.length === 0 ? STRINGS.empty : STRINGS.noMatch(describeFilters(state.filter, []).join(' and '));
    const lists = [...data.lists.values()];
    info.update({ shown: shown.length, total: data.tasks.length, state, lists, kind: VIEW });
    model.setCounts({ shown: shown.length, total: data.tasks.length });
  }

  /**
   * Read the store and render, once per burst of changes; a list that left the store opens All tasks.
   * @returns {Promise<void>} resolves once rendered
   */
  function refresh() {
    pending ??= Promise.resolve().then(async () => {
      pending = null;
      const local = deletedHere;
      deletedHere = false;
      data = await readData(store, listId);
      if (!data.list && !gone) {
        gone = true;
        if (!local) {
          toaster.show(STRINGS.notFound);
          navigate(DEFAULT_HASH, { replace: true });
        }
      }
      render();
    }).catch((error) => console.error('The list failed to render:', error));
    return pending;
  }

  // A delete in this tab, here or in the list editor, opens All tasks itself; only other deletes toast here.
  const unfollow = model.subscribe(follow);
  const unsubscribe = store.subscribe((change) => {
    deletedHere ||= change?.operation === 'deleteList' && !change.remote;
    refresh();
  });
  // Overdue chips follow the clock, also for tasks that keep their status (`OVD-2`); the rows stay.
  // Finished today only changes which rows show at midnight, so it renders again (`TV-14`).
  const timer = setInterval(() => {
    if (model.get().filter.finishedToday === true) {
      render();
    }
    else {
      taskList.tick(now());
    }
  }, REDRAW_MS);
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

    /** Stop following the store and the clock, and close an open dialog as Keep. */
    destroy() {
      unsubscribe();
      unfollow();
      addBar.destroy();
      clearInterval(timer);
      reorder.destroy();
      taskList.destroy();
      behavior.destroy();
      announcer.destroy();
      // An open Delete list dialog would stay in the top layer, unanswered, after Back leaves the view.
      root.querySelector('dialog[open]')?.close('cancel');
    },
  };
}
