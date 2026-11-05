// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mountList } from '../../src/js/views/list.js';
import { freshStore } from './store-helpers.js';

describe('mountList', () => {
  let store;
  let screen;

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
    screen = mountList(view, { store, toaster: { show: vi.fn() }, navigate: vi.fn(), getStorage: () => null });
    await screen.idle();
    return view;
  }

  it('shows the status filter state without aria-pressed, since the chip opens a popover', async () => {
    const view = await mount();
    const chip = view.querySelector('.list-view__status');
    expect(chip.hasAttribute('aria-pressed')).toBe(false);
    expect(chip.getAttribute('aria-expanded')).toBe('false');
    expect(chip.dataset.active).toBe('true');
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
