/**
 * List screen: the tasks of one list, in its manual order by default (`LV-1` to `LV-10`).
 *
 * It fills the shell's `[data-view="list"]` element with the header, the order buttons, the status filter chip,
 * the add bar, and the shared task list, and renders again after every store change.
 * Manual order shows drag handles and Move up and Move down; another order button sorts the view only (`LV-7`).
 * The order and the status filter persist per device, for every list view together (`TV-12`).
 * A list that leaves the store, such as one deleted in another tab, opens All tasks with a toast.
 */

import { readPreference, writePreference } from '../core/preferences.js';
import { DEFAULT_FILTER, filterTasks, indexMemberships, positionsOfList, sortByPosition, sortTasks } from '../core/query.js';
import { STATUSES } from '../store/tasks.js';
import { confirmDialog } from '../ui/dialog.js';
import { createLiveRegion } from '../ui/live-region.js';
import { attachMenu } from '../ui/menu.js';
import { attachPopover } from '../ui/popover.js';
import { DEFAULT_HASH, formatRoute } from '../ui/router.js';
import { createAddBar } from './add-bar.js';
import { attachReorder } from './reorder.js';
import { createTaskList, make, spriteIcon, STATUS_LABELS } from './task-list.js';
import { describeFilters } from './view-controls.js';

const PREFERENCE = 'view.list';
const REDRAW_MS = 60_000;
let instances = 0;

/** The order buttons: manual order, then the sort orders with their direction and note text (`LV-6`). */
const ORDERS = Object.freeze([
  { value: 'manual', label: 'Manual' },
  { value: 'due-time', label: 'Due', direction: 'asc', note: 'due time' },
  { value: 'creation-time', label: 'Created', direction: 'desc', note: 'creation time' },
  { value: 'last-activity-time', label: 'Activity', direction: 'desc', note: 'last activity' },
  { value: 'status', label: 'Status', direction: 'asc', note: 'status' },
  { value: 'description', label: 'A–Z', direction: 'asc', note: 'description' },
]);

/** Screen strings, for the strings module of TEC-13 to absorb. */
const STRINGS = Object.freeze({
  order: 'Order',
  sorted: (what) => `Sorted by ${what}. Manual order is kept.`,
  status: 'Status',
  all: 'all',
  clear: 'Clear',
  actions: 'List actions',
  edit: 'Edit list',
  share: 'Share',
  delete: 'Delete list',
  deleteTitle: (name) => `Delete the list ${name}?`,
  deleteText: 'The list moves to the recycle bin. Its tasks stay in your other lists.',
  keep: 'Keep',
  deleted: 'List moved to the recycle bin.',
  notFound: 'That list was not found. Showing All tasks.',
  moved: (description, position, count) => `${description} moved to position ${position} of ${count}.`,
  empty: 'This list has no tasks yet.',
  noMatch: (parts) => `No tasks match ${parts}.`,
  addFailed: 'The task could not be added.',
  failed: 'That change could not be saved.',
});

/**
 * Read the stored order and status filter of the list views, dropping invalid values.
 * @param {() => Storage} [getStorage] returns the storage, `localStorage` by default
 * @returns {{order: string, statuses: string[]}} the state: manual order and open tasks by default
 */
export function loadListState(getStorage) {
  const raw = readPreference(PREFERENCE, null, getStorage);
  const order = ORDERS.some((option) => option.value === raw?.order) ? raw.order : 'manual';
  const statuses = Array.isArray(raw?.statuses) ? raw.statuses.filter((status) => STATUSES.includes(status)) : null;
  return { order, statuses: statuses ?? [...DEFAULT_FILTER.statuses] };
}

/**
 * Read the store into the shape the screen renders.
 * @param {object} store the store facade
 * @param {string} listId the list identifier
 * @returns {Promise<object>} the list, or null once it left the store, its tasks, and the task list context
 */
async function readData(store, listId) {
  const snapshot = await store.snapshot();
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
  };
}

/**
 * Mount the List screen into its view element.
 * @param {HTMLElement} view the `[data-view="list"]` element, whose `data-list-id` names the list
 * @param {object} options screen options
 * @param {object} options.store the store facade
 * @param {{show: Function}} options.toaster the toaster
 * @param {(hash: string, settings?: {replace?: boolean}) => void} options.navigate opens another route
 * @param {() => Storage} [options.getStorage] returns the storage of the per-device view state
 * @param {() => Date} [options.now] the clock
 * @returns {{update: (route: object) => void, idle: () => Promise<void>, destroy: () => void}} the screen
 */
export function mountList(view, { store, toaster, navigate, getStorage, now = () => new Date() }) {
  const doc = view.ownerDocument;
  const listId = view.dataset.listId;
  const id = `list-view-${(instances += 1)}`;
  const state = loadListState(getStorage);
  let data = null;
  let pending = null;
  let gone = false;

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
  const more = make(doc, 'button', 'icon-button list-view__more');
  more.type = 'button';
  more.setAttribute('aria-label', STRINGS.actions);
  more.append(spriteIcon(doc, 'more'));
  const menu = make(doc, 'div', 'menu');
  menu.id = `${id}-actions`;
  menu.setAttribute('aria-label', STRINGS.actions);
  menu.hidden = true;
  for (const [action, text] of [['edit', STRINGS.edit], ['share', STRINGS.share], ['delete', STRINGS.delete]]) {
    const item = make(doc, 'button', 'menu__item', text);
    item.type = 'button';
    item.setAttribute('role', 'menuitem');
    item.dataset.action = action;
    menu.append(item);
  }
  header.append(description, more, menu);

  const controls = make(doc, 'div', 'view-controls list-view__controls');
  const orders = make(doc, 'fieldset', 'segmented list-view__orders');
  const options = make(doc, 'div', 'segmented__options');
  for (const option of ORDERS) {
    const label = make(doc, 'label', 'segmented__option');
    const input = doc.createElement('input');
    input.type = 'radio';
    input.name = `${id}-order`;
    input.value = option.value;
    input.checked = option.value === state.order;
    label.append(input, option.label);
    options.append(label);
  }
  orders.append(make(doc, 'legend', 'visually-hidden', STRINGS.order), options);
  const chip = make(doc, 'button', 'filter-chip list-view__status');
  chip.type = 'button';
  const panel = make(doc, 'div', 'popover list-view__status-panel');
  panel.id = `${id}-status`;
  panel.setAttribute('role', 'group');
  panel.setAttribute('aria-label', STRINGS.status);
  panel.hidden = true;
  const choices = make(doc, 'fieldset', 'choice-group');
  choices.append(make(doc, 'legend', 'popover__title', STRINGS.status));
  for (const status of STATUSES) {
    const label = make(doc, 'label', 'choice');
    const input = doc.createElement('input');
    input.type = 'checkbox';
    input.value = status;
    label.append(input, ` ${STATUS_LABELS[status]}`);
    choices.append(label);
  }
  const actions = make(doc, 'div', 'popover__actions');
  const clear = make(doc, 'button', 'button button--quiet', STRINGS.clear);
  clear.type = 'button';
  actions.append(clear);
  panel.append(choices, actions);
  controls.append(orders, chip, panel);
  const note = make(doc, 'p', 'list-view__note');

  const addBar = createAddBar({ document: doc, onAdd: add });
  const moves = { enabled: () => state.order === 'manual', step: (taskId, step) => reorder.step(taskId, step) };
  const taskList = createTaskList({
    document: doc, store, toaster, label: '', listId, moves, fallbackFocus: () => addBar.input,
    hrefOf: (task) => formatRoute('list-task', { listId, taskId: task.id }),
  });
  const reorder = attachReorder(taskList.element, { enabled: moves.enabled, onMove: move });
  const empty = make(doc, 'p', 'empty-state empty-state__text');
  const dialog = make(doc, 'dialog', 'dialog');
  dialog.setAttribute('aria-labelledby', `${id}-delete-title`);
  dialog.innerHTML = `<div class="dialog__header"><h2 class="dialog__title" id="${id}-delete-title"></h2></div>
    <div class="dialog__body"><p></p></div>
    <div class="dialog__actions"><button class="button button--secondary" type="button" data-dialog-close="cancel"></button>
    <button class="button" type="button" data-dialog-close="delete"></button></div>`;
  dialog.querySelector('p').textContent = STRINGS.deleteText;
  dialog.querySelector('[data-dialog-close="cancel"]').textContent = STRINGS.keep;
  dialog.querySelector('[data-dialog-close="delete"]').textContent = STRINGS.delete;
  root.append(header, controls, note, addBar.element, taskList.element, empty, dialog);
  view.replaceChildren(root);
  const announcer = createLiveRegion({ document: doc, parent: root });
  const behaviors = [attachPopover(chip, panel), attachMenu(more, menu, { onSelect: act })];

  /**
   * Store a new task at the end of this list (`LV-5`).
   * @param {string} text the trimmed description
   * @returns {Promise<void>} rejects when the task could not be stored
   */
  async function add(text) {
    try {
      await store.createTask({ description: text }, { lists: [listId] });
    }
    catch (error) {
      console.error('Adding the task failed:', error);
      toaster.show(STRINGS.addFailed);
      throw error;
    }
  }

  /**
   * Store a move in the manual order and announce the new position.
   * @param {string} taskId the moved task
   * @param {{placement: object, index: number}} next the neighbor and the new index among the shown rows
   */
  function move(taskId, next) {
    const count = taskList.element.querySelectorAll('.task-row').length;
    const task = data?.tasks.find((candidate) => candidate.id === taskId);
    store.moveInList(taskId, listId, next.placement)
      .then(() => announcer.announce(STRINGS.moved(task?.description ?? '', next.index + 1, count)), fail);
  }

  /**
   * Run a list action of the header menu; Edit list and Share open the list editor.
   * @param {HTMLElement} item the picked menu item
   */
  async function act(item) {
    if (item.dataset.action !== 'delete') {
      navigate(formatRoute('list-edit', { listId }));
      return;
    }
    dialog.querySelector('h2').textContent = STRINGS.deleteTitle(data?.list?.name ?? '');
    if (!(await confirmDialog(dialog, { opener: more }))) {
      return;
    }
    gone = true;
    try {
      await store.deleteList(listId);
    }
    catch (error) {
      gone = false;
      fail(error);
      return;
    }
    navigate(DEFAULT_HASH);
    toaster.show(STRINGS.deleted, { undo: true, onAction: () => store.restoreList(listId).catch(fail) });
  }

  /** Keep the state on this device and render it. */
  function save() {
    writePreference(PREFERENCE, state, getStorage);
    render();
  }

  /** Render the current data with the current order and status filter. */
  function render() {
    if (!data?.list) {
      return;
    }
    taskList.element.querySelector('.task-list').setAttribute('aria-label', data.list.name);
    description.textContent = data.list.description ?? '';
    description.hidden = !data.list.description;
    const value = describeFilters({ statuses: state.statuses }, [])[0]?.split(': ')[1] ?? STRINGS.all;
    chip.replaceChildren(`${STRINGS.status}: `, make(doc, 'span', 'filter-chip__value', value), spriteIcon(doc, 'chevron-down'));
    chip.setAttribute('aria-pressed', String(state.statuses.length > 0));
    for (const input of choices.querySelectorAll('input')) {
      input.checked = state.statuses.includes(input.value);
    }
    const order = ORDERS.find((option) => option.value === state.order);
    note.hidden = order.value === 'manual';
    note.textContent = note.hidden ? '' : STRINGS.sorted(order.note);
    const ctx = { now: now(), lists: data.lists, listsByTask: data.listsByTask, notesByTask: data.notesByTask };
    const filtered = filterTasks(data.tasks, { statuses: state.statuses }, ctx);
    const shown = note.hidden ? filtered : sortTasks(filtered, { field: order.value, direction: order.direction });
    taskList.render(shown, ctx);
    empty.hidden = shown.length > 0;
    empty.textContent = data.tasks.length === 0 ? STRINGS.empty : STRINGS.noMatch(`${STRINGS.status}: ${value}`);
  }

  /**
   * Read the store and render, once per burst of changes; a list that left the store opens All tasks.
   * @returns {Promise<void>} resolves once rendered
   */
  function refresh() {
    pending ??= Promise.resolve().then(async () => {
      pending = null;
      data = await readData(store, listId);
      if (!data.list && !gone) {
        gone = true;
        toaster.show(STRINGS.notFound);
        navigate(DEFAULT_HASH, { replace: true });
      }
      render();
    }).catch((error) => console.error('The list failed to render:', error));
    return pending;
  }

  orders.addEventListener('change', (event) => {
    state.order = event.target.value;
    save();
  });
  choices.addEventListener('change', (event) => {
    state.statuses = STATUSES.filter((status) => (status === event.target.value ? event.target.checked : state.statuses.includes(status)));
    save();
  });
  clear.addEventListener('click', () => {
    state.statuses = [];
    save();
  });
  const unsubscribe = store.subscribe(refresh);
  // Overdue chips follow the clock, also for tasks that keep their status (`OVD-2`).
  const timer = setInterval(render, REDRAW_MS);
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

    /** Stop following the store and the clock. */
    destroy() {
      unsubscribe();
      clearInterval(timer);
      reorder.destroy();
      taskList.destroy();
      behaviors.forEach((behavior) => behavior.destroy());
      announcer.destroy();
    },
  };
}
