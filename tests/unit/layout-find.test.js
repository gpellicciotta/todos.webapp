// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createLiveRegion } from '../../src/vendor/design/js/live-region.js';
import { renderShell } from '../../src/js/ui/layout.js';
import { resetBody } from './dom-reset.js';

// The sidebar find field, its filter, the roving focus, and the match announcement (`LST-10`, `LST-15`).

// The live region is shared per document and keeps the timers of its first caller, so it reads the current ones.
beforeEach(() => {
  createLiveRegion({ document, setTimeout: (...args) => globalThis.setTimeout(...args), clearTimeout: (...args) => globalThis.clearTimeout(...args) });
});

afterEach(() => {
  vi.useRealTimers();
  resetBody();
  localStorage.clear();
});

const COUNTS = { all: 0, byList: new Map() };

/**
 * Make lists named "List 1" to "List n", with "Café" and "Garden" at the end.
 * @param {number} total how many lists
 * @returns {object[]} the lists
 */
function makeLists(total) {
  const lists = [];
  for (let index = 1; index <= total - 2; index += 1) {
    lists.push({ id: `l${index}`, name: `List ${index}` });
  }
  lists.push({ id: 'cafe', name: 'Café' }, { id: 'garden', name: 'Garden' });
  return lists;
}

/**
 * Render the shell with lists.
 * @param {number} total how many lists
 * @returns {{root: HTMLElement, shell: object, field: HTMLInputElement}} the parts
 */
function setup(total) {
  const root = document.body.appendChild(document.createElement('div'));
  const shell = renderShell(root, { navigate: vi.fn() });
  shell.setLists(makeLists(total), COUNTS);
  return { root, shell, field: root.querySelector('.app__sidebar [data-find-lists]') };
}

const visible = (root) => [...root.querySelectorAll('.app__sidebar [data-nav-lists] li:not([hidden]) .nav-item__label')].map((label) => label.textContent);
const press = (target, key) => target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));

/**
 * Type text into the field and let the 150 ms pause pass.
 * @param {HTMLInputElement} field the field
 * @param {string} text the text
 */
function type(field, text) {
  field.value = text;
  field.dispatchEvent(new Event('input', { bubbles: true }));
  vi.advanceTimersByTime(150);
}

describe('sidebar find field', () => {
  it('shows from 12 lists and stays hidden below', () => {
    expect(setup(11).field.closest('.sidebar__find').hidden).toBe(true);
    expect(setup(12).field.closest('.sidebar__find').hidden).toBe(false);
  });

  it('keeps showing while it holds text, even when the lists drop below 12', () => {
    vi.useFakeTimers();
    const { shell, field } = setup(12);
    type(field, 'gar');
    shell.setLists(makeLists(5), COUNTS);
    expect(field.closest('.sidebar__find').hidden).toBe(false);
  });

  it('is labelled, takes 100 characters, and carries the l shortcut hook', () => {
    const { field } = setup(12);
    expect(field.type).toBe('search');
    expect(field.getAttribute('aria-label')).toBe('Find a list');
    expect(field.maxLength).toBe(100);
    expect(field.dataset.shortcut).toBe('find-list');
  });

  it('matches names ignoring case and accents, keeps the order, and counts at the end', () => {
    vi.useFakeTimers();
    const { root, field } = setup(124);
    type(field, 'CAFE');
    expect(visible(root)).toEqual(['Café']);
    expect(root.querySelector('.sidebar__find-count').textContent).toBe('1 of 124');
    type(field, 'list 12');
    expect(visible(root)).toEqual(['List 12', 'List 120', 'List 121', 'List 122']);
    expect(root.querySelector('.sidebar__find-count').textContent).toBe('4 of 124');
  });

  it('waits for a 150 ms pause before it filters', () => {
    vi.useFakeTimers();
    const { root, field } = setup(20);
    field.value = 'gar';
    field.dispatchEvent(new Event('input', { bubbles: true }));
    vi.advanceTimersByTime(149);
    expect(visible(root)).toHaveLength(20);
    vi.advanceTimersByTime(1);
    expect(visible(root)).toEqual(['Garden']);
  });

  it('shows a muted line and no creation action when nothing matches', () => {
    vi.useFakeTimers();
    const { root, field } = setup(20);
    const empty = root.querySelector('.sidebar__find-empty');
    expect(empty.hidden).toBe(true);
    type(field, 'zzz');
    expect(empty.hidden).toBe(false);
    expect(empty.textContent).toBe('No list matches.');
    expect(root.querySelector('.app__sidebar button')).toBeNull();
  });

  it('announces the match count politely after the pause', () => {
    vi.useFakeTimers();
    const { root, field } = setup(124);
    const status = () => [...document.querySelectorAll('[data-live-region="polite"]')].at(-1)?.textContent ?? '';
    field.value = 'list 12';
    field.dispatchEvent(new Event('input', { bubbles: true }));
    vi.advanceTimersByTime(149);
    expect(status()).toBe('');
    vi.advanceTimersByTime(1 + 100);
    expect(status()).toBe('4 of 124 lists match.');
    type(field, 'zzz');
    vi.advanceTimersByTime(100);
    expect(status()).toBe('No list matches.');
    expect(root.isConnected).toBe(true);
  });

  it('opens the first match on Enter and clears the field', () => {
    vi.useFakeTimers();
    const { root, field } = setup(20);
    type(field, 'gar');
    const link = root.querySelector('[data-nav="list:garden"]');
    const click = vi.fn((event) => event.preventDefault());
    link.addEventListener('click', click);
    press(field, 'Enter');
    expect(click).toHaveBeenCalledTimes(1);
    expect(field.value).toBe('');
    expect(visible(root)).toHaveLength(20);
  });

  it('does nothing on Enter without a match', () => {
    vi.useFakeTimers();
    const { root, field } = setup(20);
    type(field, 'zzz');
    press(field, 'Enter');
    expect(field.value).toBe('zzz');
    expect(visible(root)).toHaveLength(0);
  });

  it('clears the field on Escape, and on a click on a result', () => {
    vi.useFakeTimers();
    const { root, field } = setup(20);
    type(field, 'gar');
    press(field, 'Escape');
    expect(field.value).toBe('');
    expect(visible(root)).toHaveLength(20);
    type(field, 'gar');
    root.querySelector('[data-nav="list:garden"]').addEventListener('click', (event) => event.preventDefault());
    root.querySelector('[data-nav="list:garden"]').click();
    expect(field.value).toBe('');
    expect(visible(root)).toHaveLength(20);
  });

  it('moves into the first visible row on ArrowDown', () => {
    vi.useFakeTimers();
    const { root, field } = setup(20);
    type(field, 'gar');
    press(field, 'ArrowDown');
    expect(document.activeElement).toBe(root.querySelector('[data-nav="list:garden"]'));
  });

  it('keeps the text and the rows when a count changes', () => {
    vi.useFakeTimers();
    const { root, shell, field } = setup(20);
    type(field, 'gar');
    shell.setLists(makeLists(20), { all: 3, byList: new Map([['garden', { open: 2, total: 2 }]]) });
    expect(field.value).toBe('gar');
    expect(visible(root)).toEqual(['Garden']);
  });
});

describe('sidebar roving focus', () => {
  /** @returns {object} the shell and the list links */
  function rows() {
    const parts = setup(20);
    return { ...parts, links: [...parts.root.querySelectorAll('[data-nav-lists] [data-nav]')] };
  }

  it('makes the list rows one tab stop', () => {
    const { links } = rows();
    expect(links.filter((link) => link.tabIndex === 0)).toHaveLength(1);
    expect(links[0].tabIndex).toBe(0);
    expect(links.slice(1).every((link) => link.tabIndex === -1)).toBe(true);
  });

  it('makes the current list the tab stop', () => {
    const { root, shell } = rows();
    shell.update({ view: 'list', viewKey: 'list:garden', params: { listId: 'garden' } }, 'Garden');
    expect(root.querySelector('[data-nav="list:garden"]').tabIndex).toBe(0);
    expect(root.querySelector('[data-nav="list:l1"]').tabIndex).toBe(-1);
  });

  it('moves focus with Up, Down, Home, End, PageDown, and PageUp, and moves the tab stop', () => {
    const { links } = rows();
    links[0].focus();
    press(links[0], 'ArrowDown');
    expect(document.activeElement).toBe(links[1]);
    expect(links[1].tabIndex).toBe(0);
    expect(links[0].tabIndex).toBe(-1);
    press(links[1], 'End');
    expect(document.activeElement).toBe(links[19]);
    press(links[19], 'ArrowDown');
    expect(document.activeElement).toBe(links[19]);
    press(links[19], 'Home');
    expect(document.activeElement).toBe(links[0]);
    press(links[0], 'ArrowUp');
    expect(document.activeElement).toBe(links[0]);
    press(links[0], 'PageDown');
    expect(document.activeElement).toBe(links[10]);
    press(links[10], 'PageUp');
    expect(document.activeElement).toBe(links[0]);
  });

  it('skips filtered rows', () => {
    vi.useFakeTimers();
    const { root, field } = setup(20);
    type(field, 'list 1');
    const shown = [...root.querySelectorAll('[data-nav-lists] li:not([hidden]) [data-nav]')];
    shown[0].focus();
    press(shown[0], 'ArrowDown');
    expect(document.activeElement).toBe(shown[1]);
    press(shown[1], 'End');
    expect(document.activeElement).toBe(shown.at(-1));
    expect(shown.every((link) => link.dataset.nav.startsWith('list:l1'))).toBe(true);
    expect(field.value).toBe('list 1');
  });

  it('leaves Alt+Arrow to the list move', () => {
    const { links } = rows();
    links[0].focus();
    links[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', altKey: true, bubbles: true }));
    expect(document.activeElement).not.toBe(links[1]);
  });
});
