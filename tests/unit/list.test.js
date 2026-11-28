// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mountList } from '../../src/js/views/list.js';
import { createViewModel, defaultViewState } from '../../src/js/views/view-controls.js';
import { freshStore, setListFields } from './store-helpers.js';

describe('mountList', () => {
  let store;
  let screen;
  let navigate;
  let models;
  let toaster;

  afterEach(() => {
    screen?.destroy();
    store?.close();
    document.body.replaceChildren();
  });

  /**
   * Mount the List screen of a new list named Home.
   * @param {() => Storage|null} [getStorage] returns the per-device preferences
   * @returns {Promise<HTMLElement>} the view element
   */
  async function mount(getStorage = () => null, extra = {}) {
    ({ store } = await freshStore());
    const home = await store.createList({ name: 'Home' });
    const view = document.body.appendChild(document.createElement('div'));
    view.dataset.listId = home.id;
    navigate = vi.fn();
    toaster = { show: vi.fn() };
    models = { list: createViewModel('list', () => null) };
    screen = mountList(view, { store, toaster, navigate, viewModels: models, getStorage, ...extra });
    await screen.idle();
    return view;
  }

  it('holds Edit list, Edit view options, Share list, and Delete list in the More menu (VO-4)', async () => {
    const view = await mount();
    const items = [...view.querySelectorAll('.menu__item')];
    expect(items.map((item) => item.textContent)).toEqual(['Edit list', 'Edit view options', 'Share list', 'Delete list']);
    expect(items.map((item) => item.dataset.action)).toEqual(['edit', 'view-options', 'share', 'delete']);
  });

  describe('with a header slot', () => {
    /**
     * Mount on a wide or compact layout with a header slot.
     * @param {boolean} compact whether the layout is compact
     * @returns {Promise<{view: HTMLElement, slot: HTMLElement}>} the view and the slot
     */
    async function mountWithSlot(compact) {
      vi.spyOn(window, 'matchMedia').mockImplementation((query) => ({ matches: query === '(width < 64rem)' && compact, media: query }));
      const slot = document.body.appendChild(document.createElement('div'));
      const view = await mount(() => null, { actionsSlot: slot });
      return { view, slot };
    }

    it('puts the role-filtered menu in the header on a wide layout, named after the list, and keeps Delete list asking first', async () => {
      const { view, slot } = await mountWithSlot(false);
      expect(slot.hidden).toBe(false);
      expect(slot.querySelector('.icon-button').getAttribute('aria-label')).toBe('Home actions');
      expect(slot.querySelector('.icon-button use').getAttribute('href')).toContain('#more-vertical');
      expect(view.querySelector('.view-header .icon-button')).toBeNull();
      expect([...slot.querySelectorAll('.menu__item')].map((item) => item.dataset.action)).toEqual(['edit', 'view-options', 'share', 'delete']);
      const [home] = await store.listLists();
      await setListFields(store, home.id, { role: 'viewer', owner: { id: 9, email: 'sam@example.com', name: 'Sam Roe' }, sharing: [] });
      await vi.waitFor(() => expect([...slot.querySelectorAll('.menu__item')].map((item) => item.textContent)).toEqual(['List details', 'Edit view options']));
    });

    it('asks before deleting from the header menu', async () => {
      const { view, slot } = await mountWithSlot(false);
      slot.querySelector('.icon-button').click();
      slot.querySelector('[data-action="delete"]').click();
      expect(view.querySelector('dialog').open).toBe(true);
      expect(await store.listLists()).toHaveLength(1);
    });

    it('puts the menu in the header on a compact layout too, and empties the slot on destroy', async () => {
      const { view, slot } = await mountWithSlot(true);
      expect(slot.hidden).toBe(false);
      expect(slot.querySelector('.icon-button').getAttribute('aria-label')).toBe('Home actions');
      expect(slot.querySelector('.icon-button use').getAttribute('href')).toContain('#more-vertical');
      expect(view.querySelector('.view-header .icon-button')).toBeNull();
      screen.destroy();
      expect(slot.childElementCount).toBe(0);
      expect(slot.hidden).toBe(true);
    });
  });

  it('names the owner and the own role of a shared list, and offers a viewer no list changes (SHR-3, SHR-4)', async () => {
    const view = await mount();
    const [home] = await store.listLists();
    await setListFields(store, home.id, { role: 'viewer', owner: { id: 9, email: 'sam@example.com', name: 'Sam Roe' }, sharing: [] });
    await vi.waitFor(() => expect(view.querySelector('.list-view__owner')?.textContent).toBe('Shared by Sam Roe · Viewer'));
    expect([...view.querySelectorAll('.menu__item')].map((item) => item.textContent)).toEqual(['List details', 'Edit view options']);
    expect(view.querySelector('.add-bar button[type="submit"], .add-bar__button')?.hidden ?? true).toBe(true);
  });

  it('opens the view options route from Edit view options, and the list editor from Edit list', async () => {
    const view = await mount();
    for (const [action, route] of [['view-options', 'view-options'], ['edit', 'edit']]) {
      view.querySelector('.list-view__more').click();
      view.querySelector(`[data-action="${action}"]`).click();
      expect(navigate).toHaveBeenLastCalledWith(expect.stringMatching(new RegExp(`^#/lists/[^/]+/${route}$`)));
    }
  });

  it('shows an info line under the add bar and none of the old order buttons or status chip (VO-2, VO-7)', async () => {
    const view = await mount();
    const line = view.querySelector('.info-line');
    expect(line.previousElementSibling).toBe(view.querySelector('.add-bar'));
    expect(line.querySelector('.info-line__text').textContent).toBe('0 tasks');
    expect(line.querySelector('.info-line__reset').hidden).toBe(true);
    for (const gone of ['.list-view__orders', '.list-view__status', '.list-view__note', '.filter-chip']) {
      expect(view.querySelector(gone)).toBeNull();
    }
  });

  it('reads the sort on the info line and offers Reset, which restores manual order (LV-7, VO-8)', async () => {
    const view = await mount();
    models.list.set({ filter: { statuses: [] }, order: { field: 'due-time', direction: 'asc' } });
    expect(view.querySelector('.info-line__text').textContent).toBe('0 tasks · Sorted by Due time');
    view.querySelector('.info-line__reset').click();
    expect(models.list.get()).toEqual(defaultViewState('list'));
    expect(view.querySelector('.info-line__text').textContent).toBe('0 tasks');
  });

  it('remembers the view options of each list on its own, and Reset restores the defaults of this list only', async () => {
    const storage = new Map();
    const getStorage = () => ({ getItem: (key) => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: (key) => storage.delete(key) });
    ({ store } = await freshStore());
    const [home, work] = [await store.createList({ name: 'Home' }), await store.createList({ name: 'Work' })];
    models = { list: createViewModel('list', getStorage) };
    const mountOf = async (list) => {
      const view = document.body.appendChild(document.createElement('div'));
      view.dataset.listId = list.id;
      const mounted = mountList(view, { store, toaster: { show: vi.fn() }, navigate: vi.fn(), viewModels: models, getStorage });
      await mounted.idle();
      return { view, mounted };
    };
    const first = await mountOf(home);
    models.list.set({ ...defaultViewState('list'), group: 'status' });
    expect(first.view.querySelector('.info-line__text').textContent).toContain('Grouped by Status');
    first.mounted.destroy();
    const second = await mountOf(work);
    expect(second.view.querySelector('.info-line__text').textContent).not.toContain('Grouped by');
    second.mounted.destroy();
    const again = await mountOf(home);
    expect(again.view.querySelector('.info-line__text').textContent).toContain('Grouped by Status');
    again.view.querySelector('.info-line__reset').click();
    expect(models.list.get()).toEqual(defaultViewState('list'));
    expect(storage.has(`todos.view.list.${home.id}`)).toBe(false);
    again.mounted.destroy();
  });

  it('styles only the Delete item of the list menu as danger', async () => {
    const view = await mount();
    const danger = [...view.querySelectorAll('.menu__item--danger')];
    expect(danger.map((item) => item.dataset.action)).toEqual(['delete']);
  });

  it('closes an open Delete list dialog as Keep when the view unmounts', async () => {
    const view = await mount();
    view.querySelector('.list-view__more').click();
    view.querySelector('[data-action="delete"]').click();
    const dialog = view.querySelector('dialog');
    expect(dialog.open).toBe(true);
    screen.destroy();
    screen = null;
    expect(dialog.open).toBe(false);
    await vi.waitFor(() => expect(dialog.isConnected).toBe(false));
    expect((await store.listLists()).map((list) => list.name)).toEqual(['Home']);
  });

  it('filters its rows from the add field, and Enter only searches while Make Enter add is off (VO-3)', async () => {
    const view = await mount(() => ({ getItem: (key) => (key === 'todos.enter-adds' ? 'false' : null), setItem: () => {} }));
    const home = (await store.listLists())[0];
    await store.createTask({ description: 'Buy paint' }, { lists: [home.id] });
    await store.createTask({ description: 'Call Dana' }, { lists: [home.id] });
    await vi.waitFor(() => expect(view.querySelectorAll('.task-row')).toHaveLength(2));
    const field = view.querySelector('[data-shortcut~="add"]');
    expect(field.placeholder).toBe('Search or add a task');
    field.value = 'PAINT';
    field.dispatchEvent(new Event('input', { bubbles: true }));
    field.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    await vi.waitFor(() => expect(view.querySelectorAll('.task-row')).toHaveLength(1));
    expect(view.querySelector('.info-line__text').textContent).toBe('1 of 2 tasks · Search: PAINT');
    expect((await store.snapshot()).tasks).toHaveLength(2);
    expect(view.querySelector('.add-hint').textContent).toBe('Add creates a new task “PAINT”.');
  });

  it('adds the task to the list at its end, clears the field, and toasts with Show when the options hide it', async () => {
    const view = await mount();
    models.list.set({ filter: { statuses: ['completed'] }, order: defaultViewState('list').order });
    const field = view.querySelector('[data-shortcut~="add"]');
    field.value = 'Paint the door';
    view.querySelector('.add-bar').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await vi.waitFor(() => expect(toaster.show).toHaveBeenCalledTimes(1));
    expect(field.value).toBe('');
    expect(toaster.show.mock.calls[0][0]).toBe('Task added. Status: completed hides it.');
    toaster.show.mock.calls[0][1].onAction();
    expect(models.list.get().filter.statuses).toEqual(['ready', 'in-progress', 'completed', 'failed', 'cancelled']);
    await vi.waitFor(() => expect(view.querySelectorAll('.task-row')).toHaveLength(1));
  });

  it('adds on Enter on a compact screen without opening the editor, and marks and announces the new row (TSK-13)', async () => {
    vi.spyOn(window, 'matchMedia').mockImplementation((query) => ({ matches: query === '(width < 64rem)', media: query }));
    try {
      const view = await mount();
      const field = view.querySelector('[data-shortcut~="add"]');
      field.focus();
      for (const text of ['Milk', 'Eggs']) {
        field.value = text;
        field.dispatchEvent(new Event('input', { bubbles: true }));
        field.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
        await vi.waitFor(() => expect(field.value).toBe(''));
      }
      await vi.waitFor(() => expect([...view.querySelectorAll('.task-row__description')].map((node) => node.textContent)).toEqual(['Milk', 'Eggs']));
      expect(navigate).not.toHaveBeenCalled();
      expect(document.activeElement).toBe(field);
      const eggs = (await store.snapshot()).tasks.find((task) => task.description === 'Eggs');
      await vi.waitFor(() => expect(view.querySelector('.task-row--added')?.dataset.taskId).toBe(eggs.id));
      await vi.waitFor(() => expect(view.querySelector('[data-live-region="polite"]').textContent).toBe('Added “Eggs”.'));
    }
    finally {
      vi.restoreAllMocks();
    }
  });

  it('renders again on the minute tick while Finished today only is on, so a task finished yesterday leaves (TV-14)', async () => {
    let clock;
    ({ store, clock } = await freshStore());
    const home = await store.createList({ name: 'Home' });
    await store.createTask({ description: 'Still open' }, { lists: [home.id] });
    await store.createTask({ description: 'Done today', status: 'completed' }, { lists: [home.id] });
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    try {
      let time = new Date(clock.now);
      const view = document.body.appendChild(document.createElement('div'));
      view.dataset.listId = home.id;
      models = { list: createViewModel('list', () => null) };
      screen = mountList(view, { store, toaster: { show: vi.fn() }, navigate: vi.fn(), viewModels: models, getStorage: () => null, now: () => time });
      await screen.idle();
      models.list.set({ ...models.list.get(), filter: { statuses: [], finishedToday: true } });
      const descriptions = () => [...view.querySelectorAll('.task-row__description')].map((node) => node.textContent);
      expect(descriptions()).toEqual(['Still open', 'Done today']);
      time = new Date(time.getFullYear(), time.getMonth(), time.getDate() + 1, 0, 0, 30);
      vi.advanceTimersByTime(60_000);
      expect(descriptions()).toEqual(['Still open']);
      expect(view.querySelector('.info-line__text').textContent).toBe('1 of 2 tasks · Status: all, finished today');
    }
    finally {
      vi.useRealTimers();
    }
  });

  it('groups the rows by status, keeping the manual order inside each group, and hides the moves (LV-8, LV-11)', async () => {
    const view = await mount();
    const home = (await store.listLists())[0];
    await store.createTask({ description: 'First open' }, { lists: [home.id] });
    await store.createTask({ description: 'Doing it', status: 'in-progress' }, { lists: [home.id] });
    await store.createTask({ description: 'Second open' }, { lists: [home.id] });
    await vi.waitFor(() => expect(view.querySelectorAll('.task-row')).toHaveLength(3));
    expect(view.querySelector('.group-header')).toBeNull();
    expect(view.querySelector('.task-row__handle')).not.toBeNull();
    models.list.set({ ...models.list.get(), group: 'status' });
    const entries = [...view.querySelectorAll('.group-header, .task-row .task-row__description')].map((node) => node.textContent);
    expect(entries).toEqual(['To do2', 'First open', 'Second open', 'In progress1', 'Doing it']);
    expect(view.querySelector('.task-row__handle')).toBeNull();
    expect(view.querySelector('.info-line__text').textContent).toBe('3 tasks · Grouped by Status');
    models.list.set({ ...models.list.get(), group: 'none' });
    expect(view.querySelector('.group-header')).toBeNull();
    expect(view.querySelector('.task-row__handle')).not.toBeNull();
  });

  it('opens the task editor of a new task in this list and gives the focus back to the add field', async () => {
    const view = await mount();
    const field = view.querySelector('[data-shortcut~="add"]');
    view.querySelector('.add-bar button[type="submit"]').focus();
    field.value = 'Paint the door';
    view.querySelector('.add-bar').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await vi.waitFor(() => expect(navigate).toHaveBeenCalledTimes(1));
    const [task] = (await store.snapshot()).tasks;
    expect(navigate).toHaveBeenCalledWith(`#/lists/${view.dataset.listId}/tasks/${task.id}`);
    await vi.waitFor(() => expect(field.value).toBe(''));
    await vi.waitFor(() => expect(document.activeElement).toBe(field));
  });

  it('keeps this list for a task added with typed syntax, and joins the tagged lists too', async () => {
    const view = await mount();
    const work = await store.createList({ name: 'Work' });
    const field = view.querySelector('[data-shortcut~="add"]');
    field.value = 'Paint the door 2099-12-24 #work #home';
    // The preview names Work once the screen has read the new list.
    await vi.waitFor(() => {
      field.dispatchEvent(new Event('input', { bubbles: true }));
      expect(view.querySelector('.add-bar__preview').textContent).toBe('Due Dec 24, 2099 · Lists: Work, Home');
    });
    view.querySelector('.add-bar').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await vi.waitFor(() => expect(navigate).toHaveBeenCalledTimes(1));
    const snapshot = await store.snapshot();
    const [task] = snapshot.tasks;
    expect(task.description).toBe('Paint the door');
    expect(task['lifecycle-rules']['due-time']).toBe(new Date(2099, 11, 24, 23, 59).toISOString());
    const joined = snapshot.memberships.filter((membership) => membership['task-id'] === task.id).map((membership) => membership['list-id']);
    expect(joined.sort()).toEqual([view.dataset.listId, work.id].sort());
  });

  it('opens no editor when adding fails', async () => {
    const view = await mount();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(store, 'createTask').mockRejectedValue(new Error('quota'));
    const field = view.querySelector('[data-shortcut~="add"]');
    field.value = 'Paint the door';
    view.querySelector('.add-bar').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await vi.waitFor(() => expect(toaster.show).toHaveBeenCalledWith('The task could not be added.'));
    expect(navigate).not.toHaveBeenCalled();
  });
});
