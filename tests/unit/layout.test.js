// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderShell } from '../../src/js/ui/layout.js';

afterEach(() => {
  vi.useRealTimers();
  document.body.replaceChildren();
  localStorage.clear();
});

/**
 * Render the shell into a fresh root.
 * @returns {{root: HTMLElement, shell: object}} the root and the shell controller
 */
function render() {
  const root = document.body.appendChild(document.createElement('div'));
  return { root, shell: renderShell(root, { navigate: vi.fn() }) };
}

describe('renderShell navigation', () => {
  it('keeps list creation out of the sidebar', () => {
    const { root } = render();
    expect(root.querySelectorAll('.app__sidebar .nav-item__label')).toHaveLength(2);
    expect(root.querySelector('.app__sidebar h2')).toBeNull();
    expect(root.querySelector('.app__sidebar [href="#/lists/new"]')).toBeNull();
    expect(root.querySelector('.app__sidebar .icon-button')).toBeNull();
  });
  it('ends the top bar with the user button and shows no sync indicator', () => {
    const { root } = render();
    const bar = root.querySelector('.app__top-bar');
    expect(bar.lastElementChild.contains(bar.querySelector('.user-button'))).toBe(true);
    expect(root.querySelector('.sync-indicator')).toBeNull();
  });

  it('has no More button or menu in the top bar, since New list lives in the Lists view', () => {
    const { root } = render();
    expect(root.querySelector('.app__more')).toBeNull();
    expect(root.querySelector('.app__top-bar .menu')).toBeNull();
    expect([...root.querySelector('.app__top-bar').children].map((child) => child.tagName)).toEqual(['H1', 'DIV']);
  });

  it('keeps Recycle bin and Settings out of the sidebar and the bottom bar', () => {
    const { root } = render();
    const sidebar = [...root.querySelectorAll('.app__sidebar a')].map((link) => link.getAttribute('href'));
    const bottom = [...root.querySelectorAll('.app__bottom-nav a')].map((link) => link.getAttribute('href'));
    expect(sidebar).toEqual(['#/tasks', '#/lists']);
    expect(bottom).toEqual(['#/tasks', '#/lists']);
    expect([...root.querySelectorAll('.user-panel a')].map((link) => link.getAttribute('href'))).toEqual(['#/bin', '#/settings']);
  });

  it('marks the panel link of the current route, also for the screens under Settings', () => {
    const { root, shell } = render();
    shell.update({ view: 'bin', viewKey: 'bin', params: {} }, 'Recycle bin');
    expect(root.querySelector('.user-panel [data-nav="bin"]').getAttribute('aria-current')).toBe('page');
    expect(root.querySelector('.user-panel [data-nav="settings"]').hasAttribute('aria-current')).toBe(false);
    shell.update({ view: 'connect', viewKey: 'connect', params: {} }, 'Connect');
    expect(root.querySelector('.user-panel [data-nav="settings"]').getAttribute('aria-current')).toBe('page');
    expect(root.querySelector('.user-panel [data-nav="bin"]').hasAttribute('aria-current')).toBe(false);
  });
});

describe('renderShell', () => {
  it('announces a lasting notice through the polite live region, not a status role made with its text', () => {
    vi.useFakeTimers();
    const root = document.body.appendChild(document.createElement('div'));
    const shell = renderShell(root, { navigate: vi.fn() });
    const reload = vi.fn();
    shell.showNotice('ToDo\'s was updated in another tab. Reload to continue.', { actionLabel: 'Reload', onAction: reload });
    const banner = root.querySelector('.app__banners .banner');
    expect(banner.textContent).toContain('updated in another tab');
    expect(banner.hasAttribute('role')).toBe(false);
    vi.runAllTimers();
    const region = document.querySelector('[aria-live="polite"]');
    expect(region.textContent).toBe('ToDo\'s was updated in another tab. Reload to continue.');
    banner.querySelector('button').click();
    expect(reload).toHaveBeenCalledTimes(1);
  });
});

describe('renderShell inbox', () => {
  /**
   * Render a shell for a connected account with a stand-in inbox.
   * @param {object[]} banners the banner notifications
   * @returns {{root: HTMLElement, shell: object}} the root and the shell
   */
  function connected(banners) {
    localStorage.setItem('todos.session', JSON.stringify({ token: 't', expiry: '2099-01-01T00:00:00Z', email: 'a@example.com', server: 'https://todos.example.com' }));
    const root = document.body.appendChild(document.createElement('div'));
    const shell = renderShell(root, { navigate: vi.fn() });
    const inbox = { list: () => banners, banners: () => banners, unreadCount: () => banners.length, status: () => 'ready', subscribe: () => () => {} };
    shell.showInbox({ inbox, toaster: { show: vi.fn() } });
    return { root, shell };
  }

  it('puts the bell before the user button, and keeps the top bar at a title and one menu slot', () => {
    const { root } = connected([]);
    const slot = root.querySelector('.app__top-bar').lastElementChild;
    expect(slot.querySelector('.inbox-button').compareDocumentPosition(slot.querySelector('.user-button')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect([...root.querySelector('.app__top-bar').children].map((child) => child.tagName)).toEqual(['H1', 'DIV']);
  });

  it('shows the broadcast banners beside a lasting notice, and the notice does not replace them', () => {
    const { root, shell } = connected([{ id: 1, title: 'Maintenance', message: 'Sunday 02:00.', read: false, banner: true, actionUrl: null }]);
    shell.showNotice('A newer version is ready.');
    expect(root.querySelectorAll('.app__banners .banner')).toHaveLength(2);
    expect(root.querySelector('.app__broadcasts').textContent).toContain('Maintenance');
  });
});

describe('renderShell list order', () => {
  const LISTS = [{ id: 'g', name: 'Garden' }, { id: 'h', name: 'Home' }, { id: 'w', name: 'Work' }];
  const COUNTS = { all: 0, byList: new Map() };
  const labels = (root) => [...root.querySelectorAll('.app__sidebar .nav-item--list .nav-item__label')].map((label) => label.textContent);
  const press = (target, key, altKey = true) => target.dispatchEvent(new KeyboardEvent('keydown', { key, altKey, bubbles: true }));

  it('shows the lists in the stored device order, unlisted lists last', () => {
    localStorage.setItem('todos.lists.order', JSON.stringify(['w', 'h']));
    const { root, shell } = render();
    shell.setLists(LISTS, COUNTS);
    expect(labels(root)).toEqual(['Work', 'Home', 'Garden']);
  });

  it('moves the focused list with Alt+ArrowDown and Alt+ArrowUp, keeps focus, and announces it', async () => {
    const { root, shell } = render();
    shell.setLists(LISTS, COUNTS);
    const link = root.querySelector('[data-nav="list:g"]');
    link.focus();
    press(link, 'ArrowDown');
    expect(labels(root)).toEqual(['Home', 'Garden', 'Work']);
    expect(document.activeElement).toBe(root.querySelector('[data-nav="list:g"]'));
    await vi.waitFor(() => expect(document.body.textContent).toContain('Garden moved to position 2 of 3.'));
    press(document.activeElement, 'ArrowUp');
    expect(labels(root)).toEqual(['Garden', 'Home', 'Work']);
  });

  it('leaves the order alone at the ends and for keys without Alt', () => {
    const { root, shell } = render();
    shell.setLists(LISTS, COUNTS);
    const first = root.querySelector('[data-nav="list:g"]');
    press(first, 'ArrowUp');
    press(first, 'ArrowDown', false);
    expect(labels(root)).toEqual(['Garden', 'Home', 'Work']);
    expect(localStorage.getItem('todos.lists.order')).toBeNull();
  });

  it('follows an order stored elsewhere, such as the Lists screen', async () => {
    const { root, shell } = render();
    shell.setLists(LISTS, COUNTS);
    const { writeListOrder } = await import('../../src/js/core/list-order.js');
    writeListOrder(['w', 'g', 'h']);
    expect(labels(root)).toEqual(['Work', 'Garden', 'Home']);
  });
});
