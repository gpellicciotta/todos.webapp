// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { countLists } from '../../src/js/core/list-counts.js';
import { renderShell } from '../../src/js/ui/layout.js';
import { mountLists } from '../../src/js/views/lists.js';
import { freshStore } from './store-helpers.js';

describe('list counts in the sidebar and on the Lists screen', () => {
  let store;
  let screen;
  let ids;
  let root;
  let shell;

  afterEach(() => {
    screen?.destroy();
    store?.close();
    document.body.replaceChildren();
    localStorage.clear();
  });

  /**
   * Read the sidebar open count of a list.
   * @param {string} listId the list identifier
   * @returns {string} the count text without the visually hidden meaning
   */
  const sidebarOpen = (listId) => root.querySelector(`[data-nav="list:${listId}"] .nav-item__count`).firstChild.textContent;

  /**
   * Read the Lists screen counts line of a list.
   * @param {string} listId the list identifier
   * @returns {string} the "4 open · 10 total" text
   */
  const screenCounts = (listId) => root.querySelector(`[data-list-id="${listId}"] .list-row__counts`).textContent;

  /** Push the store contents into the sidebar, as the app does after each change. */
  async function refreshSidebar() {
    const [lists, tasks, memberships] = await Promise.all([store.listLists(), store.listTasks(), store.listMemberships()]);
    shell.setLists(lists, countLists(tasks, memberships));
  }

  /**
   * Mount both consumers over shared fixtures: Home with two open, one done, and one cancelled task;
   * Work with one open task also in Home; and an empty list.
   */
  async function mount() {
    ({ store } = await freshStore());
    const home = await store.createList({ name: 'Home' });
    const work = await store.createList({ name: 'Work' });
    const empty = await store.createList({ name: 'Empty' });
    const open = await store.createTask({ description: 'Open one', status: 'todo' }, { lists: [home.id] });
    const progress = await store.createTask({ description: 'In progress', status: 'in-progress' }, { lists: [home.id] });
    const done = await store.createTask({ description: 'Done', status: 'completed' }, { lists: [home.id] });
    const cancelled = await store.createTask({ description: 'Cancelled', status: 'cancelled' }, { lists: [home.id] });
    const shared = await store.createTask({ description: 'Shared', status: 'todo' }, { lists: [home.id, work.id] });
    ids = { home: home.id, work: work.id, empty: empty.id, open: open.id, progress: progress.id, done: done.id, cancelled: cancelled.id, shared: shared.id };
    root = document.body.appendChild(document.createElement('div'));
    shell = renderShell(root, { navigate: vi.fn() });
    const view = root.querySelector('[data-view]') ?? root.appendChild(document.createElement('div'));
    screen = mountLists(view, { store });
    await screen.idle();
    await refreshSidebar();
  }

  it('show equal nonzero open counts, total counts, and zero for an empty list', async () => {
    await mount();
    expect(sidebarOpen(ids.home)).toBe('3');
    expect(screenCounts(ids.home)).toBe('3 open · 5 total');
    expect(sidebarOpen(ids.work)).toBe('1');
    expect(screenCounts(ids.work)).toBe('1 open · 1 total');
    expect(sidebarOpen(ids.empty)).toBe('0');
    expect(screenCounts(ids.empty)).toBe('0 open · 0 total');
  });

  it('count a task in two lists once in each, and once in the All tasks count', async () => {
    await mount();
    expect(root.querySelector('[data-count="all"]').firstChild.textContent).toBe('3');
  });

  it('follow task status changes, deletes, and list changes together', async () => {
    await mount();
    await store.updateTask(ids.open, { status: 'completed' });
    await store.updateTask(ids.done, { status: 'todo' });
    await store.updateTask(ids.cancelled, { status: 'in-progress' });
    await store.deleteTask(ids.shared);
    await refreshSidebar();
    await vi.waitFor(() => expect(screenCounts(ids.home)).toBe('3 open · 4 total'));
    expect(sidebarOpen(ids.home)).toBe('3');
    expect(screenCounts(ids.work)).toBe('0 open · 0 total');
    expect(sidebarOpen(ids.work)).toBe('0');
    expect(root.querySelector('[data-count="all"]').firstChild.textContent).toBe('3');
    await store.addToList(ids.progress, ids.empty);
    await refreshSidebar();
    await vi.waitFor(() => expect(screenCounts(ids.empty)).toBe('1 open · 1 total'));
    expect(sidebarOpen(ids.empty)).toBe('1');
  });
});
