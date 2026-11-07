// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { readListOrder } from '../../src/js/core/list-order.js';
import { mountLists } from '../../src/js/views/lists.js';
import { freshStore } from './store-helpers.js';

describe('mountLists', () => {
  let store;
  let screen;

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
    screen = mountLists(view, { store });
    await screen.idle();
    return view;
  }

  const names = (view) => [...view.querySelectorAll('.list-row__name')].map((name) => name.textContent);
  const button = (view, label) => view.querySelector(`button[aria-label="${label}"]`);

  it('shows the stored device order, with unlisted lists at the end', async () => {
    const view = await mountThree(([garden, , work]) => ['unknown', work, garden]);
    expect(names(view)).toEqual(['Work', 'Garden', 'Home']);
  });

  it('gives each row a drag handle and Move up and Move down buttons', async () => {
    const view = await mountThree();
    expect(view.querySelectorAll('.list-item__handle')).toHaveLength(3);
    expect(button(view, 'Move up: Garden').disabled).toBe(true);
    expect(button(view, 'Move down: Garden').disabled).toBe(false);
    expect(button(view, 'Move down: Work').disabled).toBe(true);
    expect(button(view, 'Move up: Work').title).toBe('Move up');
  });

  it('moves a list with Move down, stores the order on the device, and announces the position', async () => {
    const view = await mountThree();
    button(view, 'Move down: Garden').click();
    await vi.waitFor(() => expect(names(view)).toEqual(['Home', 'Garden', 'Work']));
    expect(readListOrder()).toHaveLength(3);
    await vi.waitFor(() => expect(document.body.textContent).toContain('Garden moved to position 2 of 3.'));
    button(view, 'Move up: Work').click();
    await vi.waitFor(() => expect(names(view)).toEqual(['Home', 'Work', 'Garden']));
  });

  it('keeps focus on the moved list\'s button, or on its sibling once the end is reached', async () => {
    const view = await mountThree();
    button(view, 'Move down: Garden').click();
    await vi.waitFor(() => expect(names(view)).toEqual(['Home', 'Garden', 'Work']));
    expect(document.activeElement).toBe(button(view, 'Move down: Garden'));
    button(view, 'Move down: Garden').click();
    await vi.waitFor(() => expect(names(view)).toEqual(['Home', 'Work', 'Garden']));
    expect(document.activeElement).toBe(button(view, 'Move up: Garden'));
  });

  it('moves the focused row with Alt+ArrowUp', async () => {
    const view = await mountThree();
    view.querySelectorAll('.list-row')[1].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', altKey: true, bubbles: true }));
    await vi.waitFor(() => expect(names(view)).toEqual(['Home', 'Garden', 'Work']));
  });

  it('adds a new list at the end of the stored order', async () => {
    const view = await mountThree();
    button(view, 'Move down: Garden').click();
    await vi.waitFor(() => expect(names(view)).toEqual(['Home', 'Garden', 'Work']));
    await store.createList({ name: 'Archive' });
    await vi.waitFor(() => expect(names(view)).toEqual(['Home', 'Garden', 'Work', 'Archive']));
  });
});
