// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { readListOrder } from '../../src/js/core/list-order.js';
import { mountLists } from '../../src/js/views/lists.js';
import { freshStore, setListFields } from './store-helpers.js';

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

  it('puts the floating button in the given overlay layer and removes it when the screen closes', async () => {
    ({ store } = await freshStore());
    const view = document.body.appendChild(document.createElement('div'));
    const overlays = document.body.appendChild(document.createElement('div'));
    screen = mountLists(view, { store, overlays });
    await screen.idle();
    expect(overlays.querySelectorAll('.fab')).toHaveLength(1);
    expect(view.querySelector('.fab')).toBeNull();
    screen.update({ name: 'list-new', view: 'lists', editor: 'list', params: {} });
    expect(overlays.querySelector('.fab').hidden).toBe(true);
    screen.destroy();
    screen = null;
    expect(overlays.querySelector('.fab')).toBeNull();
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
    button(view, 'List actions: Home').click();
    const menu = button(view, 'List actions: Home').closest('.list-item').querySelector('.menu');
    expect([...menu.querySelectorAll('.menu__item')].map((item) => item.textContent))
      .toEqual(['Edit list', 'Edit view options', 'Share list', 'Delete list']);
    expect(menu.querySelector('[data-action="delete"]').classList.contains('menu__item--danger')).toBe(true);
  });

  it('opens the list editor, the view options, and the sharing section of the row list from its More menu', async () => {
    const view = await mountThree();
    const home = (await store.listLists()).find((list) => list.name === 'Home');
    for (const [action, route] of [['edit', 'edit'], ['view-options', 'view-options'], ['share', 'share']]) {
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

  it('offers each role only the list actions it may use, and shows the owner of lists shared with the user (SHR-3, SHR-4)', async () => {
    const view = await mount();
    const sam = { id: 9, email: 'sam@example.com', name: 'Sam Roe' };
    const ids = {};
    for (const [name, fields] of [
      ['Editing', { role: 'editor', owner: sam, sharing: [] }],
      ['Reading', { role: 'viewer', owner: sam, sharing: [] }],
      ['Mine', { role: 'owner', owner: { id: 3, name: 'Jane Doe' }, sharing: [{ id: 1 }, { id: 2 }] }],
    ]) {
      ids[name] = (await store.createList({ name })).id;
      await setListFields(store, ids[name], fields);
    }
    await vi.waitFor(() => expect(view.querySelector(`[data-list-id="${ids.Mine}"] .list-row__sharing`)).not.toBeNull());
    const actions = (name) => {
      view.querySelector(`[data-list-id="${ids[name]}"] .list-item__more`).click();
      return [...view.querySelector(`[data-list-id="${ids[name]}"]`).querySelectorAll('.menu__item')].map((item) => item.textContent);
    };
    expect(actions('Mine')).toEqual(['Edit list', 'Edit view options', 'Share list', 'Delete list']);
    expect(actions('Editing')).toEqual(['Edit list', 'Edit view options']);
    expect(actions('Reading')).toEqual(['List details', 'Edit view options']);
    const sharing = (name) => view.querySelector(`[data-list-id="${ids[name]}"] .list-row__sharing`)?.textContent ?? null;
    expect(sharing('Reading')).toBe('Shared by Sam Roe');
    expect(sharing('Mine')).toBe('Shared with 2 people');
    expect([...view.querySelectorAll('.list-item')].filter((item) => !item.querySelector('.list-row__sharing'))).toHaveLength(1);
  });
});

describe('mountLists find, sort, and the reorder lock (LST-10, LST-11, LST-12)', () => {
  let store;
  let screen;
  let navigate;

  afterEach(() => {
    screen?.destroy();
    store?.close();
    document.body.replaceChildren();
    localStorage.clear();
  });

  /**
   * Mount the screen over lists named "List 1" to "List n", with an action bar and the router memory.
   * @param {number} total how many lists
   * @param {object} [extra] more mount options
   * @returns {Promise<{view: HTMLElement, bar: HTMLElement, memory: object}>} the parts
   */
  async function mountMany(total, extra = {}) {
    ({ store } = await freshStore());
    for (let index = 1; index <= total; index += 1) {
      await store.createList({ name: `List ${index}`, description: index === 3 ? 'Ürgent garden work' : '' });
    }
    const view = document.body.appendChild(document.createElement('div'));
    const bar = document.body.appendChild(document.createElement('div'));
    const memory = {};
    navigate = vi.fn();
    screen = mountLists(view, { store, navigate, actionBar: bar, memory, ...extra });
    await screen.idle();
    return { view, bar, memory };
  }

  const field = (bar) => bar.querySelector('input[type="search"]');
  const rowNames = (view) => [...view.querySelectorAll('.list-row__name')].map((name) => name.textContent);
  const infoText = (bar) => bar.querySelector('.info-line__text').textContent;
  const type = async (input, text) => {
    input.value = text;
    input.dispatchEvent(new Event('input', { bubbles: true }));
  };

  it('shows the find bar from 12 lists, and not before', async () => {
    const few = await mountMany(11);
    expect(few.bar.querySelector('.lists-find')?.hidden ?? true).toBe(true);
    screen.destroy();
    store.close();
    document.body.replaceChildren();
    const many = await mountMany(12);
    expect(many.bar.querySelector('.lists-find').hidden).toBe(false);
    expect(field(many.bar).getAttribute('aria-label')).toBe('Find a list');
    expect(field(many.bar).maxLength).toBe(100);
    expect(field(many.bar).dataset.shortcut).toContain('search');
    expect(infoText(many.bar)).toBe('12 lists');
    expect(many.bar.querySelector('.info-line__reset').hidden).toBe(true);
  });

  it('filters names and descriptions after a 150 ms pause and shows the count', async () => {
    const { view, bar, memory } = await mountMany(13);
    await type(field(bar), 'list 1');
    expect(rowNames(view)).toHaveLength(13);
    await vi.waitFor(() => expect(rowNames(view)).toEqual(['List 1', 'List 10', 'List 11', 'List 12', 'List 13']));
    expect(infoText(bar)).toBe('5 of 13 lists');
    expect(memory.text).toBe('list 1');
    await type(field(bar), 'urgent');
    await vi.waitFor(() => expect(rowNames(view)).toEqual(['List 3']));
  });

  it('announces the matches politely', async () => {
    const { bar } = await mountMany(13);
    await type(field(bar), 'list 1');
    await vi.waitFor(() => expect(document.body.querySelector('[aria-live="polite"]').textContent).toBe('5 of 13 lists'));
  });

  it('opens the first match on Enter, clears on Escape, and enters the rows on Down', async () => {
    const { view, bar } = await mountMany(13);
    const lists = await store.listLists();
    await type(field(bar), 'list 13');
    await vi.waitFor(() => expect(rowNames(view)).toEqual(['List 13']));
    field(bar).dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    expect(document.activeElement).toBe(view.querySelector('.list-row'));
    field(bar).dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(navigate).toHaveBeenCalledWith(`#/lists/${lists.find((list) => list.name === 'List 13').id}`);
    field(bar).dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(field(bar).value).toBe('');
    await vi.waitFor(() => expect(rowNames(view)).toHaveLength(13));
  });

  it('restores the text of the session memory, and keeps the bar while text is typed below 12 lists', async () => {
    const { view, bar } = await mountMany(3, { memory: { text: 'list 2' } });
    expect(field(bar).value).toBe('list 2');
    expect(bar.querySelector('.lists-find').hidden).toBe(false);
    expect(rowNames(view)).toEqual(['List 2']);
  });

  it('sorts from the menu, names the sort on the button and info line, and persists it', async () => {
    const { view, bar } = await mountMany(13);
    const sort = bar.querySelector('.lists-find__sort');
    expect(sort.textContent).toContain('Sort: Manual order');
    sort.click();
    const items = [...bar.querySelectorAll('.menu [role="menuitemradio"]')];
    expect(items.map((item) => item.textContent)).toEqual(['Manual order', 'Name (A to Z)', 'Open tasks (most first)', 'Last update (newest first)']);
    items[1].click();
    await vi.waitFor(() => expect(rowNames(view)[1]).toBe('List 10'));
    expect(JSON.parse(localStorage.getItem('todos.view.lists'))).toEqual({ sort: 'name' });
    expect(sort.textContent).toContain('Sort: Name');
    expect(infoText(bar)).toBe('13 lists · Sorted by Name');
    await vi.waitFor(() => expect(document.body.querySelector('[aria-live="polite"]').textContent).toBe('Sorted by Name'));
    expect(await store.listLists()).toHaveLength(13);
    expect(localStorage.getItem('todos.lists.order')).toBeNull();
  });

  it('starts with the stored sort, and Reset clears the sort and the text', async () => {
    localStorage.setItem('todos.view.lists', JSON.stringify({ sort: 'name' }));
    const { view, bar } = await mountMany(13);
    await type(field(bar), 'list 1');
    await vi.waitFor(() => expect(infoText(bar)).toBe('5 of 13 lists · Sorted by Name'));
    bar.querySelector('.info-line__reset').click();
    expect(field(bar).value).toBe('');
    await vi.waitFor(() => expect(rowNames(view)).toHaveLength(13));
    expect(bar.querySelector('.lists-find__sort').textContent).toContain('Sort: Manual order');
    expect(localStorage.getItem('todos.view.lists')).toBeNull();
    expect(infoText(bar)).toBe('13 lists');
    expect(bar.querySelector('.info-line__reset').hidden).toBe(true);
  });

  it('hides reordering while sorted or searching, and announces why on Alt+Up', async () => {
    const { view, bar } = await mountMany(13);
    expect(view.querySelector('.list-item__handle').hidden).toBe(false);
    await type(field(bar), 'list 1');
    await vi.waitFor(() => expect(rowNames(view)).toHaveLength(5));
    expect(view.querySelector('.list-item__handle').hidden).toBe(true);
    view.querySelectorAll('.list-row')[1].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', altKey: true, bubbles: true }));
    await vi.waitFor(() => expect(document.body.querySelector('[aria-live="polite"]').textContent).toBe('Reordering needs Manual order and no search.'));
    expect(localStorage.getItem('todos.lists.order')).toBeNull();
    expect(rowNames(view)[1]).toBe('List 10');
    field(bar).value = '';
    field(bar).dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await vi.waitFor(() => expect(view.querySelector('.list-item__handle').hidden).toBe(false));
  });

  it('keeps the handles hidden under another sort', async () => {
    localStorage.setItem('todos.view.lists', JSON.stringify({ sort: 'open' }));
    const { view } = await mountMany(13);
    expect(view.querySelector('.list-item__handle').hidden).toBe(true);
  });

  it('offers Create list for a no-match text, opens its editor, and hides the offer for a taken or empty name', async () => {
    const { view, bar } = await mountMany(13);
    await type(field(bar), 'Orchard');
    await vi.waitFor(() => expect(rowNames(view)).toHaveLength(0));
    expect(view.querySelector('.empty-state__text').textContent).toBe('No list matches "Orchard".');
    expect(infoText(bar)).toBe('0 of 13 lists');
    const create = view.querySelector('.lists-view__create');
    await vi.waitFor(() => expect(create.hidden).toBe(false));
    expect(create.textContent).toBe('Create list "Orchard"');
    create.click();
    await vi.waitFor(() => expect(navigate).toHaveBeenCalled());
    const made = (await store.listLists()).find((list) => list.name === 'Orchard');
    expect(made).toBeDefined();
    expect(navigate).toHaveBeenCalledWith(`#/lists/${made.id}/edit`);
    await vi.waitFor(() => expect(document.body.querySelector('[aria-live="polite"]').textContent).toBe('No list matches "Orchard".'));
  });

  it('hides Create list when the name is taken by a list in the recycle bin', async () => {
    const { view, bar } = await mountMany(13);
    const banked = await store.createList({ name: 'Banked', description: '' });
    await vi.waitFor(() => expect(rowNames(view)).toHaveLength(14));
    await store.deleteList(banked.id);
    await vi.waitFor(() => expect(rowNames(view)).toHaveLength(13));
    await type(field(bar), 'banked');
    await vi.waitFor(() => expect(rowNames(view)).toHaveLength(0));
    await vi.waitFor(() => expect(view.querySelector('.lists-view__create').hidden).toBe(true));
    expect(view.querySelector('.empty-state__text').textContent).toBe('No list matches "banked".');
  });
});
