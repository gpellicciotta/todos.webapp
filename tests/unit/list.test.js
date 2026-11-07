// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mountList } from '../../src/js/views/list.js';
import { createViewModel, defaultViewState } from '../../src/js/views/view-controls.js';
import { freshStore } from './store-helpers.js';

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
   * @returns {Promise<HTMLElement>} the view element
   */
  async function mount() {
    ({ store } = await freshStore());
    const home = await store.createList({ name: 'Home' });
    const view = document.body.appendChild(document.createElement('div'));
    view.dataset.listId = home.id;
    navigate = vi.fn();
    toaster = { show: vi.fn() };
    models = { list: createViewModel('list', () => null) };
    screen = mountList(view, { store, toaster, navigate, viewModels: models, getStorage: () => null });
    await screen.idle();
    return view;
  }

  it('holds Edit list, Edit view options, Share list, and Delete list in the More menu (VO-4)', async () => {
    const view = await mount();
    const items = [...view.querySelectorAll('.menu__item')];
    expect(items.map((item) => item.textContent)).toEqual(['Edit list', 'Edit view options', 'Share list', 'Delete list']);
    expect(items.map((item) => item.dataset.action)).toEqual(['edit', 'view-options', 'share', 'delete']);
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
    expect(line.querySelector('.info-line__text').textContent).toBe('0 tasks · Status: open');
    expect(line.querySelector('.info-line__reset').hidden).toBe(true);
    for (const gone of ['.list-view__orders', '.list-view__status', '.list-view__note', '.filter-chip']) {
      expect(view.querySelector(gone)).toBeNull();
    }
  });

  it('reads the sort on the info line and offers Reset, which restores manual order (LV-7, VO-8)', async () => {
    const view = await mount();
    models.list.set({ filter: { statuses: [] }, order: { field: 'due-time', direction: 'asc' } });
    expect(view.querySelector('.info-line__text').textContent).toBe('0 tasks · Status: all · Sorted by Due time');
    view.querySelector('.info-line__reset').click();
    expect(models.list.get()).toEqual(defaultViewState('list'));
    expect(view.querySelector('.info-line__text').textContent).toBe('0 tasks · Status: open');
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

  it('filters its rows from the add field, and only the Add button adds (VO-3)', async () => {
    const view = await mount();
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
    expect(view.querySelector('.info-line__text').textContent).toBe('1 of 2 tasks · Search: PAINT · Status: open');
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
    expect(models.list.get().filter.statuses).toEqual(['todo', 'in-progress']);
    await vi.waitFor(() => expect(view.querySelectorAll('.task-row')).toHaveLength(1));
  });

  it('opens the task editor of a new task in this list and leaves focus to the editor', async () => {
    const view = await mount();
    const field = view.querySelector('[data-shortcut~="add"]');
    field.focus();
    const refocus = vi.spyOn(field, 'focus');
    field.value = 'Paint the door';
    view.querySelector('.add-bar').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await vi.waitFor(() => expect(navigate).toHaveBeenCalledTimes(1));
    const [task] = (await store.snapshot()).tasks;
    expect(navigate).toHaveBeenCalledWith(`#/lists/${view.dataset.listId}/tasks/${task.id}`);
    await vi.waitFor(() => expect(field.value).toBe(''));
    expect(refocus).not.toHaveBeenCalled();
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
