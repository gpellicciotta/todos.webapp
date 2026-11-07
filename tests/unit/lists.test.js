// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { readListOrder } from '../../src/js/core/list-order.js';
import { mountLists } from '../../src/js/views/lists.js';
import { freshStore } from './store-helpers.js';

describe('mountLists', () => {
  let store;
  let screen;
  let navigate;
  let toaster;

  afterEach(() => {
    screen?.destroy();
    store?.close();
    document.body.replaceChildren();
    localStorage.clear();
  });

  /**
   * Mount the Lists overview over a store with one list.
   * @returns {Promise<HTMLElement>} the view element
   */
  async function mount() {
    ({ store } = await freshStore());
    await store.createList({ name: 'Home' });
    const view = document.body.appendChild(document.createElement('div'));
    screen = mountLists(view, { store });
    await screen.idle();
    return view;
  }

  it('offers New list as a floating plus button that links to the new list editor', async () => {
    const view = await mount();
    const button = view.querySelector('.fab');
    expect(button.tagName).toBe('A');
    expect(button.getAttribute('href')).toBe('#/lists/new');
    expect(button.getAttribute('aria-label')).toBe('New list');
    expect(button.title).toBe('New list');
    expect(button.textContent.trim()).toBe('');
    expect(button.querySelector('svg.icon use').getAttribute('href')).toContain('#plus');
    expect(view.querySelectorAll('.fab')).toHaveLength(1);
  });

  it('has no New list button in the view header any more', async () => {
    const view = await mount();
    expect(view.querySelector('.lists-view__new')).toBeNull();
    expect(view.querySelector('.lists-view__header')).toBeNull();
  });

  it('hides the floating button while an editor is open, and shows it again once closed', async () => {
    const view = await mount();
    const button = view.querySelector('.fab');
    expect(button.hidden).toBe(false);
    screen.update({ name: 'list-new', view: 'lists', editor: 'list', params: {} });
    expect(button.hidden).toBe(true);
    screen.update({ name: 'lists', view: 'lists', editor: null, params: {} });
    expect(button.hidden).toBe(false);
  });

  it('still lists every list as a link to its screen', async () => {
    const view = await mount();
    const rows = [...view.querySelectorAll('.list-row')];
    expect(rows.map((row) => row.querySelector('.list-row__name').textContent)).toEqual(['Home']);
  });

  /**
   * Mount the Lists overview over a store with the lists Garden, Home, and Work, after a stored order.
   * @param {(ids: string[]) => string[]|null} [order] maps the list identifiers, in name order, to a stored order
   * @returns {Promise<HTMLElement>} the view element
   */
  async function mountThree(order = () => null) {
    ({ store } = await freshStore());
    for (const name of ['Garden', 'Home', 'Work']) {
      await store.createList({ name });
    }
    const stored = order((await store.listLists()).map((list) => list.id));
    if (stored) {
      localStorage.setItem('todos.lists.order', JSON.stringify(stored));
    }
    const view = document.body.appendChild(document.createElement('div'));
    navigate = vi.fn();
    toaster = { show: vi.fn() };
    screen = mountLists(view, { store, navigate, toaster });
    await screen.idle();
    return view;
  }

  const names = (view) => [...view.querySelectorAll('.list-row__name')].map((name) => name.textContent);
  const button = (view, label) => view.querySelector(`button[aria-label="${label}"]`);

  it('shows the stored device order, with unlisted lists at the end', async () => {
    const view = await mountThree(([garden, , work]) => ['unknown', work, garden]);
    expect(names(view)).toEqual(['Work', 'Garden', 'Home']);
  });

  it('gives each row a drag handle and a More button, and no Move up or Move down buttons', async () => {
    const view = await mountThree();
    expect(view.querySelectorAll('.list-item__handle')).toHaveLength(3);
    expect(view.querySelectorAll('.list-item__more')).toHaveLength(3);
    expect(button(view, 'List actions: Garden')).not.toBeNull();
    expect(view.querySelectorAll('.list-item__move')).toHaveLength(0);
    expect(view.querySelector('button[aria-label^="Move up"], button[aria-label^="Move down"]')).toBeNull();
  });

  it('holds Edit list, Edit view options, Share list, and Delete list in the More menu of a row (VO-4)', async () => {
    const view = await mountThree();
    const menu = button(view, 'List actions: Home').closest('.list-item').querySelector('.menu');
    expect([...menu.querySelectorAll('.menu__item')].map((item) => item.textContent))
      .toEqual(['Edit list', 'Edit view options', 'Share list', 'Delete list']);
    expect(menu.querySelector('[data-action="delete"]').classList.contains('menu__item--danger')).toBe(true);
  });

  it('opens the list editor, the view options, and the sharing section of the row list from its More menu', async () => {
    const view = await mountThree();
    const home = (await store.listLists()).find((list) => list.name === 'Home');
    for (const [action, route] of [['edit', 'edit'], ['view-options', 'view-options'], ['share', 'edit']]) {
      button(view, 'List actions: Home').click();
      button(view, 'List actions: Home').closest('.list-item').querySelector(`[data-action="${action}"]`).click();
      expect(navigate).toHaveBeenLastCalledWith(`#/lists/${home.id}/${route}`);
    }
  });

  it('asks before Delete list, and moves the list to the recycle bin once confirmed', async () => {
    const view = await mountThree();
    button(view, 'List actions: Home').click();
    button(view, 'List actions: Home').closest('.list-item').querySelector('[data-action="delete"]').click();
    const dialog = await vi.waitFor(() => {
      const found = view.querySelector('dialog');
      expect(found).not.toBeNull();
      return found;
    });
    expect(dialog.textContent).toContain('Its tasks stay in your other lists.');
    dialog.querySelector('[data-dialog-close="delete"]').click();
    await vi.waitFor(() => expect(names(view)).toEqual(['Garden', 'Work']));
    expect(navigate).toHaveBeenLastCalledWith('#/tasks');
  });

  it('does not open the list when the More button is used', async () => {
    const view = await mountThree();
    button(view, 'List actions: Home').click();
    expect(navigate).not.toHaveBeenCalled();
  });

  it('moves the focused row with Alt+ArrowUp', async () => {
    const view = await mountThree();
    view.querySelectorAll('.list-row')[1].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', altKey: true, bubbles: true }));
    await vi.waitFor(() => expect(names(view)).toEqual(['Home', 'Garden', 'Work']));
    expect(readListOrder()).toHaveLength(3);
    await vi.waitFor(() => expect(document.body.textContent).toContain('Home moved to position 1 of 3.'));
  });

  it('adds a new list at the end of the stored order', async () => {
    const view = await mountThree();
    view.querySelectorAll('.list-row')[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', altKey: true, bubbles: true }));
    await vi.waitFor(() => expect(names(view)).toEqual(['Home', 'Garden', 'Work']));
    await store.createList({ name: 'Archive' });
    await vi.waitFor(() => expect(names(view)).toEqual(['Home', 'Garden', 'Work', 'Archive']));
  });
});
