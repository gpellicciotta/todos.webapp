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
    models = { list: createViewModel('list', () => null) };
    screen = mountList(view, { store, toaster: { show: vi.fn() }, navigate, viewModels: models, getStorage: () => null });
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
});
