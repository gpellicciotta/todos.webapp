// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest';
import { mountLists } from '../../src/js/views/lists.js';
import { freshStore } from './store-helpers.js';

describe('mountLists', () => {
  let store;
  let screen;

  afterEach(() => {
    screen?.destroy();
    store?.close();
    document.body.replaceChildren();
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
});
