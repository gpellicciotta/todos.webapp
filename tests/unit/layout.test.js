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
  it('ends the top bar with the user button and holds no sync indicator until the sync is shown', () => {
    const { root } = render();
    const bar = root.querySelector('.app__top-bar');
    expect(bar.lastElementChild.contains(bar.querySelector('.user-button'))).toBe(true);
    expect(root.querySelector('.sync-indicator')).toBeNull();
  });

  it('puts the sync indicator before the bell and the user button, and the session banner above the views', () => {
    localStorage.setItem('todos.session', JSON.stringify({ token: 't', expiry: '2099-01-01T00:00:00Z', email: 'a@example.com', server: 'https://todos.example.com' }));
    const root = document.body.appendChild(document.createElement('div'));
    const shell = renderShell(root, { navigate: vi.fn() });
    const inbox = { list: () => [], banners: () => [], unreadCount: () => 0, status: () => 'ready', subscribe: () => () => {} };
    shell.showInbox({ inbox, toaster: { show: vi.fn() } });
    const engine = { state: () => ({ status: 'synced', pending: 0 }), subscribe: () => () => {}, syncNow: vi.fn() };
    shell.showSync({ engine, readLog: async () => [], seen: { get: () => null, subscribe: () => () => {} }, checkForUpdate: vi.fn() });
    const slot = root.querySelector('.app__top-bar').lastElementChild;
    const order = [...slot.children].map((child) => ['sync-indicator', 'inbox-button', 'user-button'].find((name) => child.classList.contains(name)));
    expect(order.indexOf('sync-indicator')).toBeLessThan(order.indexOf('inbox-button'));
    expect(order.indexOf('inbox-button')).toBeLessThan(order.indexOf('user-button'));
    expect(root.querySelector('.app__banners [data-session-banner]')).not.toBeNull();
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
    expect([...root.querySelectorAll('.user-panel__link')].map((link) => link.getAttribute('href'))).toEqual(['#/connect', '#/bin', '#/settings']);
  });

  it('marks the panel link of the current route, also for the screens under Settings', () => {
    const { root, shell } = render();
    shell.update({ view: 'bin', viewKey: 'bin', params: {} }, 'Recycle bin');
    expect(root.querySelector('.user-panel [data-nav="bin"]').getAttribute('aria-current')).toBe('page');
    expect(root.querySelector('.user-panel [data-nav="settings"]').hasAttribute('aria-current')).toBe(false);
    shell.update({ view: 'connect', viewKey: 'connect', params: {} }, 'Connect');
    expect(root.querySelector('.user-panel [data-nav="connect"]').getAttribute('aria-current')).toBe('page');
    expect(root.querySelector('.user-panel [data-nav="settings"]').hasAttribute('aria-current')).toBe(false);
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

describe('renderShell areas (ADR-0004)', () => {
  const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

  it('renders the shell areas in skeleton order on a root in the main scroll mode', () => {
    const { root } = render();
    expect([...root.classList]).toEqual(expect.arrayContaining(['app', 'app--scroll-main']));
    expect([...root.children].map((child) => child.className.split(' ').find((name) => name.startsWith('app__') || name === 'skip-link'))).toEqual([
      'skip-link', 'app__top-bar', 'app__sidebar', 'app__banners', 'app__main', 'app__side-panel', 'app__bottom-nav', 'app__overlays',
    ]);
    expect(root.querySelector('.app__top-bar > .app__top-actions[data-user-menu]')).not.toBeNull();
    expect(root.querySelector('aside.app__side-panel[data-editor-slot]').hidden).toBe(true);
    expect(root.querySelector('.app__main > .app__banners')).toBeNull();
  });

  it('marks every navigation link as a shell nav item inside a shell nav list, keeping the app item classes', async () => {
    const { root, shell } = render();
    shell.setLists([{ id: 'h', name: 'Home' }], { all: 0, byList: new Map() });
    for (const nav of root.querySelectorAll('.app__sidebar, .app__bottom-nav')) {
      expect(nav.getAttribute('aria-label')).toBe('Main');
      for (const link of nav.querySelectorAll('a')) {
        expect(link.classList.contains('app__nav-item')).toBe(true);
        expect(link.parentElement.parentElement.classList.contains('app__nav-list')).toBe(true);
      }
    }
    expect(root.querySelectorAll('.app__sidebar a.nav-item')).toHaveLength(3);
    expect(root.querySelectorAll('.app__bottom-nav a.bottom-nav__item')).toHaveLength(2);
  });

  it('puts the toast region in the overlay layer and returns both', () => {
    const { root, shell } = render();
    expect(shell.overlays).toBe(root.querySelector('.app__overlays'));
    expect(shell.toastRegion.parentElement).toBe(shell.overlays);
    expect(shell.toastRegion.getAttribute('role')).toBe('region');
  });

  it('adds the action bar after the side panel only while it holds content, and empties it on a new view', async () => {
    const { root, shell } = render();
    expect(root.querySelector('.app__action-bar')).toBeNull();
    shell.update({ view: 'tasks', viewKey: 'tasks', params: {} }, 'All tasks');
    shell.actionBar.append(document.createElement('div'));
    await tick();
    expect(root.querySelector('.app__side-panel').nextElementSibling).toBe(shell.actionBar);
    expect(shell.actionBar.classList.contains('app__action-bar')).toBe(true);
    shell.update({ view: 'tasks', viewKey: 'tasks', editor: 'task', params: { taskId: 't1' } }, 'All tasks');
    await tick();
    expect(shell.actionBar.isConnected).toBe(true);
    shell.update({ view: 'lists', viewKey: 'lists', params: {} }, 'Lists');
    await tick();
    expect(shell.actionBar.childElementCount).toBe(0);
    expect(root.querySelector('.app__action-bar')).toBeNull();
  });

  it('hides each banner slot while it is empty, so the banner area leaves the grid', async () => {
    const { root, shell } = render();
    const slots = [...root.querySelector('.app__banners').children];
    expect(slots.every((slot) => slot.hidden)).toBe(true);
    shell.showNotice('A newer version is ready.');
    await tick();
    expect(root.querySelector('[data-notice]').hidden).toBe(false);
    expect(root.querySelector('.app__broadcasts').hidden).toBe(true);
  });

  it('opens with a skip link that focuses the main area without changing the route', () => {
    const { root } = render();
    location.hash = '#/lists';
    const link = root.querySelector('.skip-link');
    expect(link.getAttribute('href')).toBe('#main');
    expect(link.textContent).toBe('Skip to content');
    link.click();
    expect(document.activeElement).toBe(root.querySelector('#main'));
    expect(location.hash).toBe('#/lists');
  });
});
