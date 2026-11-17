// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest';
import { mountLists } from '../../src/js/views/lists.js';
import { freshStore } from './store-helpers.js';

// Lazy row menus and the roving focus of the Lists screen with many lists (`LST-15`, `TEC-16`).

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
   * Mount the Lists overview over a store with 300 lists named "List 1" to "List 300".
   * @returns {Promise<void>} resolves once rendered
   */
  async function mount() {
    ({ store } = await freshStore());
    for (let index = 1; index <= TOTAL; index += 1) {
      await store.createList({ name: `List ${index}` });
    }
    view = document.body.appendChild(document.createElement('div'));
    screen = mountLists(view, { store });
    await screen.idle();
  }

  /**
   * Press a key on an element, as the browser would deliver it.
   * @param {Element} target the focused element
   * @param {string} key the key name
   */
  function press(target, key) {
    target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
  }

  const links = () => [...view.querySelectorAll('.list-row')];

  it('builds no row menu until a More button opens, and then only that one', async () => {
    await mount();
    expect(view.querySelectorAll('.list-item')).toHaveLength(TOTAL);
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
    rows[TOTAL - 1].focus();
    press(rows[TOTAL - 1], 'ArrowDown');
    expect(document.activeElement).toBe(rows[TOTAL - 1]);
    expect(links().filter((link) => link.tabIndex === 0)).toHaveLength(1);
  });

  it('jumps with Home, End, PageUp, and PageDown, clamped to the first and last row', async () => {
    await mount();
    const rows = links();
    rows[25].focus();
    press(rows[25], 'PageDown');
    expect(document.activeElement).toBe(rows[35]);
    expect(rows[35].tabIndex).toBe(0);
    press(rows[35], 'PageUp');
    expect(document.activeElement).toBe(rows[25]);
    press(rows[25], 'End');
    expect(document.activeElement).toBe(rows[TOTAL - 1]);
    press(rows[TOTAL - 1], 'PageDown');
    expect(document.activeElement).toBe(rows[TOTAL - 1]);
    press(rows[TOTAL - 1], 'Home');
    expect(document.activeElement).toBe(rows[0]);
    press(rows[0], 'PageUp');
    expect(document.activeElement).toBe(rows[0]);
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

  it('leaves Alt+Arrow to reordering and keeps arrows inside an open menu', async () => {
    await mount();
    const row = links()[0];
    row.focus();
    row.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', altKey: true, bubbles: true, cancelable: true }));
    expect(document.activeElement).toBe(row);
    const more = view.querySelectorAll('.list-item__more')[0];
    more.click();
    const item = view.querySelector('.list-item .menu [role="menuitem"]');
    press(item, 'ArrowDown');
    expect(links().filter((link) => link.tabIndex === 0)).toHaveLength(1);
  });

  it('keeps the tab stop on the same list after the rows render again', async () => {
    await mount();
    const row = links()[5];
    row.focus();
    const id = row.closest('.list-item').dataset.listId;
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
  });
});
