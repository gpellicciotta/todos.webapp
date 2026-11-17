// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest';
import { mountLists } from '../../src/js/views/lists.js';
import { freshStore } from './store-helpers.js';

// Windowed rows, lazy row menus, and the roving focus of the Lists screen with many lists (`LST-15`, `TEC-16`).

const TOTAL = 300;

describe('mountLists with 300 lists', () => {
  let store;
  let screen;
  let view;

  afterEach(() => {
    screen?.destroy();
    store?.close();
    document.body.replaceChildren();
    localStorage.clear();
  });

  /**
   * Mount the Lists overview over a store with lists named "List 001" to "List {{count}}", zero-padded so name order is number order.
   * @param {number} [count] the number of lists
   * @returns {Promise<void>} resolves once rendered
   */
  async function mount(count = TOTAL) {
    ({ store } = await freshStore());
    for (let index = 1; index <= count; index += 1) {
      await store.createList({ name: `List ${String(index).padStart(3, '0')}` });
    }
    view = document.body.appendChild(document.createElement('div'));
    screen = mountLists(view, { store });
    await screen.idle();
  }

  /**
   * Press a key on an element, as the browser would deliver it.
   * @param {Element} target the focused element
   * @param {string} key the key name
   * @param {object} [modifiers] extra key event fields, such as `altKey`
   */
  function press(target, key, modifiers = {}) {
    target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...modifiers }));
  }

  const links = () => [...view.querySelectorAll('.list-row')];
  const nameOf = (element) => element?.closest('.list-item')?.querySelector('.list-row__name').textContent;
  const linkOf = (name) => links().find((link) => nameOf(link) === name);

  it('renders every row up to 200 lists', async () => {
    await mount(200);
    expect(view.querySelectorAll('.list-item')).toHaveLength(200);
    expect(view.querySelector('.lists-view__rows').style.paddingBlockEnd).toBe('');
  });

  it('renders only a window of the rows past 200 lists, with padding for the rest and the set size on each row', async () => {
    await mount();
    const items = [...view.querySelectorAll('.list-item')];
    expect(items.length).toBeGreaterThan(10);
    expect(items.length).toBeLessThan(80);
    expect(nameOf(items[0])).toBe('List 001');
    const rows = view.querySelector('.lists-view__rows');
    expect(rows.style.paddingBlockStart).toBe('0px');
    expect(rows.style.paddingBlockEnd).toBe(`${(TOTAL - items.length) * 48}px`);
    expect(items[0].getAttribute('aria-setsize')).toBe(String(TOTAL));
    expect(items[0].getAttribute('aria-posinset')).toBe('1');
    expect(items.at(-1).getAttribute('aria-posinset')).toBe(String(items.length));
  });

  it('builds no row menu until a More button opens, and then only that one', async () => {
    await mount();
    expect(view.querySelectorAll('.list-item .menu')).toHaveLength(0);
    const more = view.querySelectorAll('.list-item__more')[2];
    more.click();
    const menus = view.querySelectorAll('.list-item .menu');
    expect(menus).toHaveLength(1);
    expect(menus[0].id).toBe(`list-actions-${more.closest('.list-item').dataset.listId}`);
    expect(menus[0].querySelector('[data-action="edit"]').textContent).toBe('Edit list');
    expect(more.getAttribute('aria-expanded')).toBe('true');
  });

  it('opens a lazy menu from the keyboard and builds it once', async () => {
    await mount();
    const more = view.querySelectorAll('.list-item__more')[0];
    press(more, 'ArrowDown');
    expect(view.querySelectorAll('.list-item .menu')).toHaveLength(1);
    expect(more.getAttribute('aria-expanded')).toBe('true');
    const menu = view.querySelector('.list-item .menu');
    more.click();
    more.click();
    expect(view.querySelectorAll('.list-item .menu')).toHaveLength(1);
    expect(view.querySelector('.list-item .menu')).toBe(menu);
  });

  it('keeps exactly one tab stop over the rows, and keeps the More buttons out of the Tab order', async () => {
    await mount();
    const stops = links().filter((link) => link.tabIndex === 0);
    expect(stops).toHaveLength(1);
    expect(stops[0]).toBe(links()[0]);
    expect([...view.querySelectorAll('.list-item__more')].every((more) => more.tabIndex === -1)).toBe(true);
  });

  it('moves between rows with Up and Down, and the tab stop follows focus', async () => {
    await mount();
    const rows = links();
    rows[0].focus();
    press(rows[0], 'ArrowDown');
    expect(document.activeElement).toBe(rows[1]);
    expect(rows[1].tabIndex).toBe(0);
    expect(rows[0].tabIndex).toBe(-1);
    press(rows[1], 'ArrowDown');
    press(document.activeElement, 'ArrowUp');
    expect(document.activeElement).toBe(rows[1]);
    rows[0].focus();
    press(rows[0], 'ArrowUp');
    expect(document.activeElement).toBe(rows[0]);
    expect(links().filter((link) => link.tabIndex === 0)).toHaveLength(1);
  });

  it('renders the row below the window when Down leaves the last rendered row', async () => {
    await mount();
    const last = links().at(-1);
    const next = `List ${String(links().length + 1).padStart(3, '0')}`;
    expect(linkOf(next)).toBeUndefined();
    last.focus();
    press(last, 'ArrowDown');
    expect(nameOf(document.activeElement)).toBe(next);
    expect(document.activeElement.tabIndex).toBe(0);
    expect(links().filter((link) => link.tabIndex === 0)).toHaveLength(1);
  });

  it('jumps with Home, End, PageUp, and PageDown over every list, rendered or not, clamped to the ends', async () => {
    await mount();
    const rows = links();
    rows[5].focus();
    press(rows[5], 'PageDown');
    expect(nameOf(document.activeElement)).toBe('List 016');
    press(document.activeElement, 'PageUp');
    expect(nameOf(document.activeElement)).toBe('List 006');
    press(document.activeElement, 'End');
    expect(nameOf(document.activeElement)).toBe(`List ${TOTAL}`);
    expect(document.activeElement.tabIndex).toBe(0);
    press(document.activeElement, 'PageDown');
    expect(nameOf(document.activeElement)).toBe(`List ${TOTAL}`);
    press(document.activeElement, 'Home');
    expect(nameOf(document.activeElement)).toBe('List 001');
    press(document.activeElement, 'PageUp');
    expect(nameOf(document.activeElement)).toBe('List 001');
    expect(links().filter((link) => link.tabIndex === 0)).toHaveLength(1);
  });

  it('marks every More button as a collapsed menu button before its menu exists, and after it closes', async () => {
    await mount();
    const buttons = [...view.querySelectorAll('.list-item__more')];
    expect(buttons.every((more) => more.getAttribute('aria-haspopup') === 'menu' && more.getAttribute('aria-expanded') === 'false')).toBe(true);
    expect(view.querySelectorAll('.list-item .menu')).toHaveLength(0);
    buttons[1].click();
    expect(buttons[1].getAttribute('aria-expanded')).toBe('true');
    expect(buttons[1].getAttribute('aria-haspopup')).toBe('menu');
    press(view.querySelector('.list-item .menu [role="menuitem"]'), 'Escape');
    expect(buttons[1].getAttribute('aria-expanded')).toBe('false');
    expect(buttons[1].getAttribute('aria-haspopup')).toBe('menu');
    expect(buttons[0].getAttribute('aria-expanded')).toBe('false');
  });

  it('moves from a row to its More button with Right and back with Left', async () => {
    await mount();
    const row = links()[3];
    row.focus();
    press(row, 'ArrowRight');
    const more = row.closest('.list-item').querySelector('.list-item__more');
    expect(document.activeElement).toBe(more);
    expect(row.tabIndex).toBe(0);
    press(more, 'ArrowLeft');
    expect(document.activeElement).toBe(row);
  });

  it('keeps arrows inside an open menu', async () => {
    await mount();
    const more = view.querySelectorAll('.list-item__more')[0];
    more.click();
    const item = view.querySelector('.list-item .menu [role="menuitem"]');
    press(item, 'ArrowDown');
    expect(links().filter((link) => link.tabIndex === 0)).toHaveLength(1);
  });

  it('moves a list that starts out of the window with Alt+Up, over every list, and keeps focus on it', async () => {
    await mount();
    links()[0].focus();
    press(document.activeElement, 'End');
    const id = document.activeElement.closest('.list-item').dataset.listId;
    press(document.activeElement, 'ArrowUp', { altKey: true });
    await screen.idle();
    await new Promise((resolve) => setTimeout(resolve, 150));
    expect(view.querySelector('[aria-live="polite"]').textContent).toBe(`List ${TOTAL} moved to position ${TOTAL - 1} of ${TOTAL}.`);
    expect(document.activeElement.closest('.list-item').dataset.listId).toBe(id);
    expect(document.activeElement.closest('.list-item').getAttribute('aria-posinset')).toBe(String(TOTAL - 1));
  });

  it('keeps the tab stop on the same list after the rows render again, also out of the window', async () => {
    await mount();
    links()[0].focus();
    press(document.activeElement, 'End');
    const id = document.activeElement.closest('.list-item').dataset.listId;
    document.activeElement.blur();
    await store.createList({ name: 'Another' });
    await screen.idle();
    await new Promise((resolve) => setTimeout(resolve, 20));
    const stops = links().filter((link) => link.tabIndex === 0);
    expect(stops).toHaveLength(1);
    expect(stops[0].closest('.list-item').dataset.listId).toBe(id);
  });

  it('moves the tab stop to the first shown row when the filter hides the current one', async () => {
    await mount();
    links()[5].focus();
    const field = document.querySelector('.lists-find__field');
    field.value = 'List 300';
    field.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 250));
    const rows = links();
    expect(rows).toHaveLength(1);
    expect(rows[0].tabIndex).toBe(0);
    expect(view.querySelector('.lists-view__rows').style.paddingBlockEnd).toBe('');
  });

  it('enters the first list from the find field with Down, also after the window moved', async () => {
    await mount();
    links()[0].focus();
    press(document.activeElement, 'End');
    const field = document.querySelector('.lists-find__field');
    field.focus();
    press(field, 'ArrowDown');
    expect(nameOf(document.activeElement)).toBe('List 001');
  });
});
