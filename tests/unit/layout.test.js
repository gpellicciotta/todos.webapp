// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { applyTheme, renderShell } from '../../src/js/ui/layout.js';
import { resetBody } from './dom-reset.js';

afterEach(() => {
  vi.useRealTimers();
  resetBody();
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

describe('applyTheme', () => {
  afterEach(() => {
    document.head.querySelectorAll('meta[name="color-scheme"]').forEach((meta) => meta.remove());
    delete document.documentElement.dataset.theme;
  });

  it('keeps the color-scheme meta that theme-boot.js set in step with live theme changes', () => {
    const meta = document.head.appendChild(document.createElement('meta'));
    meta.name = 'color-scheme';
    meta.content = 'dark';
    document.documentElement.dataset.theme = 'dark';
    applyTheme(document, 'light');
    expect(meta.content).toBe('light');
    expect(document.documentElement.dataset.theme).toBe('light');
    applyTheme(document, 'system');
    expect(meta.content).toBe('light dark');
    expect(document.documentElement.dataset.theme).toBeUndefined();
  });

  it('applies a theme on a page without a color-scheme meta', () => {
    expect(() => applyTheme(document, 'dark')).not.toThrow();
    expect(document.documentElement.dataset.theme).toBe('dark');
  });
});

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
    expect(bar.lastElementChild.contains(bar.querySelector('.account-menu__button'))).toBe(true);
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
    const order = [...slot.children].map((child) => ['sync-indicator', 'app__notifications-button', 'account-menu'].find((name) => child.classList.contains(name)));
    expect(order.indexOf('sync-indicator')).toBeLessThan(order.indexOf('app__notifications-button'));
    expect(order.indexOf('app__notifications-button')).toBeLessThan(order.indexOf('account-menu'));
    expect(root.querySelector('.app__banners [data-session-banner]')).not.toBeNull();
  });

  it('holds a hidden view actions slot just before the user button', () => {
    const { root, shell } = render();
    const slot = root.querySelector('.app__top-bar [data-view-actions]');
    expect(shell.actionsSlot).toBe(slot);
    expect(slot.hidden).toBe(true);
    expect(slot.nextElementSibling.classList.contains('account-menu')).toBe(true);
  });

  it('has no More button or menu in the top bar, since New list lives in the Lists view', () => {
    const { root } = render();
    expect(root.querySelector('.app__more')).toBeNull();
    expect(root.querySelector('.app__top-bar .menu:not(.account-menu__panel)')).toBeNull();
    expect(root.querySelector('.app__top-bar .icon-button:not(.app__nav-toggle)')).toBeNull();
    expect([...root.querySelector('.app__top-bar').children].map((child) => child.tagName)).toEqual(['BUTTON', 'H1', 'DIV']);
  });

  it('keeps Recycle bin and Settings out of the sidebar and the bottom bar', () => {
    const { root } = render();
    const sidebar = [...root.querySelectorAll('.app__sidebar a')].map((link) => link.getAttribute('href'));
    const bottom = [...root.querySelectorAll('.app__bottom-nav a')].map((link) => link.getAttribute('href'));
    expect(sidebar).toEqual(['#/tasks', '#/lists']);
    expect(bottom).toEqual(['#/tasks', '#/lists']);
    expect([...root.querySelectorAll('.account-menu__panel .menu__item')].map((link) => link.getAttribute('href'))).toEqual(['#/connect', '#/bin', '#/settings']);
  });

  it('marks the panel link of the current route, also for the screens under Settings', () => {
    const { root, shell } = render();
    shell.update({ view: 'bin', viewKey: 'bin', params: {} }, 'Recycle bin');
    expect(root.querySelector('.account-menu__panel [data-nav="bin"]').getAttribute('aria-current')).toBe('page');
    expect(root.querySelector('.account-menu__panel [data-nav="settings"]').hasAttribute('aria-current')).toBe(false);
    shell.update({ name: 'connect', view: 'settings', viewKey: 'settings', params: {} }, 'Settings');
    expect(root.querySelector('.account-menu__panel [data-nav="settings"]').getAttribute('aria-current')).toBe('page');
    expect(root.querySelector('.account-menu__panel [data-nav="connect"]').hasAttribute('aria-current')).toBe(false);
    expect(root.querySelector('.account-menu__panel [data-nav="bin"]').hasAttribute('aria-current')).toBe(false);
  });
});

describe('renderShell', () => {
  it('announces a lasting notice through the polite live region, not a status role made with its text', async () => {
    // The vendored live region is shared per document and keeps the timers of its first owner, so the test waits.
    const root = document.body.appendChild(document.createElement('div'));
    const shell = renderShell(root, { navigate: vi.fn() });
    const reload = vi.fn();
    shell.showNotice('ToDo\'s was updated in another tab. Reload to continue.', { actionLabel: 'Reload', onAction: reload });
    const banner = root.querySelector('.app__banners .banner');
    expect(banner.textContent).toContain('updated in another tab');
    expect(banner.hasAttribute('role')).toBe(false);
    const region = document.querySelector('[data-live-region="polite"]');
    await vi.waitFor(() => expect(region.textContent).toBe('ToDo\'s was updated in another tab. Reload to continue.'));
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

  it('puts the bell before the user button, and keeps the top bar at the nav toggle, a title, and one menu slot', () => {
    const { root } = connected([]);
    const slot = root.querySelector('.app__top-bar').lastElementChild;
    expect(slot.querySelector('.app__notifications-button').compareDocumentPosition(slot.querySelector('.account-menu__button')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect([...root.querySelector('.app__top-bar').children].map((child) => child.tagName)).toEqual(['BUTTON', 'H1', 'DIV']);
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

  it('moves the focused list to the bottom with Alt+End and to the top with Alt+Home, keeps focus, and announces it (LST-13)', async () => {
    const { root, shell } = render();
    shell.setLists(LISTS, COUNTS);
    const link = root.querySelector('[data-nav="list:g"]');
    link.focus();
    press(link, 'End');
    expect(labels(root)).toEqual(['Home', 'Work', 'Garden']);
    expect(document.activeElement).toBe(root.querySelector('[data-nav="list:g"]'));
    await vi.waitFor(() => expect(document.body.textContent).toContain('Garden moved to position 3 of 3.'));
    press(root.querySelector('[data-nav="list:w"]'), 'Home');
    expect(labels(root)).toEqual(['Work', 'Home', 'Garden']);
    expect(JSON.parse(localStorage.getItem('todos.lists.order'))).toEqual(['w', 'h', 'g']);
  });

  it('leaves the order alone at the ends and for keys without Alt', () => {
    const { root, shell } = render();
    shell.setLists(LISTS, COUNTS);
    const first = root.querySelector('[data-nav="list:g"]');
    press(first, 'ArrowUp');
    press(first, 'Home');
    press(root.querySelector('[data-nav="list:w"]'), 'End');
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

describe('renderShell sidebar scroll region and in-place patching (LST-14)', () => {
  const COUNTS = (open) => ({ all: 0, byList: new Map(Object.entries(open).map(([id, count]) => [id, { open: count, total: count }])) });
  const row = (root, id) => root.querySelector(`[data-nav="list:${id}"]`);
  const shown = (root, id) => row(root, id).querySelector('.nav-item__count > [aria-hidden="true"]').textContent;
  const hidden = (root, id) => row(root, id).querySelector('.nav-item__count .visually-hidden').textContent;
  const lists = (...ids) => ids.map((id) => ({ id, name: id.toUpperCase() }));

  it('starts the sidebar with the destinations, without a logo or app name', () => {
    const { root } = render();
    const sidebar = root.querySelector('.app__sidebar');
    expect(sidebar.firstElementChild.classList.contains('nav-list')).toBe(true);
    expect(sidebar.querySelector('img')).toBeNull();
    expect(sidebar.textContent).not.toContain("ToDo's");
  });

  it('holds only the list rows in a scroll region below the fixed All tasks and Lists items', () => {
    const { root } = render();
    const region = root.querySelector('.app__sidebar .sidebar__scroll');
    expect(region).not.toBeNull();
    expect(region.querySelector('[data-nav-lists]')).not.toBeNull();
    expect(region.querySelector('[data-nav="tasks"]')).toBeNull();
    expect(region.querySelector('[data-nav="lists"]')).toBeNull();
    expect(region.parentElement.classList.contains('app__sidebar')).toBe(true);
  });

  it('keeps the same row elements when counts change, so focus survives', () => {
    const { root, shell } = render();
    shell.setLists(lists('a', 'b'), COUNTS({ a: 1, b: 2 }));
    const a = row(root, 'a');
    a.focus();
    shell.setLists(lists('a', 'b'), COUNTS({ a: 7, b: 0 }));
    expect(row(root, 'a')).toBe(a);
    expect(document.activeElement).toBe(a);
    expect(shown(root, 'a')).toBe('7');
    expect(shown(root, 'b')).toBe('');
  });

  it('shows no text for a count of 0, keeps the exact number hidden, and caps the shown count at 999+', () => {
    const { root, shell } = render();
    shell.setLists(lists('a', 'b', 'c'), COUNTS({ a: 0, b: 999, c: 1000 }));
    expect(shown(root, 'a')).toBe('');
    expect(hidden(root, 'a')).toBe('0 open tasks');
    expect(shown(root, 'b')).toBe('999');
    expect(shown(root, 'c')).toBe('999+');
    expect(hidden(root, 'c')).toBe('1000 open tasks');
  });

  it('drops the row of a removed list and adds a new list at its place in the stored order', () => {
    localStorage.setItem('todos.lists.order', JSON.stringify(['c', 'a', 'b']));
    const { root, shell } = render();
    shell.setLists(lists('a', 'b'), COUNTS({}));
    const a = row(root, 'a');
    shell.setLists(lists('a', 'b', 'c'), COUNTS({}));
    expect([...root.querySelectorAll('[data-nav-lists] [data-nav]')].map((link) => link.dataset.nav)).toEqual(['list:c', 'list:a', 'list:b']);
    expect(row(root, 'a')).toBe(a);
    shell.setLists(lists('a', 'c'), COUNTS({}));
    expect(row(root, 'b')).toBeNull();
    expect(root.querySelectorAll('[data-nav-lists] li')).toHaveLength(2);
  });

  it('patches a renamed list in place', () => {
    const { root, shell } = render();
    shell.setLists([{ id: 'a', name: 'Old' }], COUNTS({}));
    const a = row(root, 'a');
    shell.setLists([{ id: 'a', name: 'New' }], COUNTS({}));
    expect(row(root, 'a')).toBe(a);
    expect(a.querySelector('.nav-item__label').textContent).toBe('New');
    expect(a.title).toBe('New');
  });

  it('scrolls the current row into view once per route change, and never for a count change', () => {
    const scroll = vi.fn();
    const original = Element.prototype.scrollIntoView;
    Element.prototype.scrollIntoView = scroll;
    try {
      const { root, shell } = render();
      shell.setLists(lists('a', 'b'), COUNTS({}));
      shell.update({ view: 'list', viewKey: 'list:b', params: { listId: 'b' } }, 'B');
      expect(scroll).toHaveBeenCalledTimes(1);
      expect(scroll.mock.contexts[0]).toBe(row(root, 'b'));
      expect(scroll).toHaveBeenCalledWith({ block: 'nearest' });
      shell.setLists(lists('a', 'b'), COUNTS({ b: 5 }));
      shell.update({ view: 'list', viewKey: 'list:b', editor: 'task', params: { listId: 'b', taskId: 't' } }, 'B');
      expect(scroll).toHaveBeenCalledTimes(1);
      shell.update({ view: 'list', viewKey: 'list:a', params: { listId: 'a' } }, 'A');
      expect(scroll).toHaveBeenCalledTimes(2);
    }
    finally {
      Element.prototype.scrollIntoView = original;
    }
  });

  it('scrolls the current row into view once it renders, when the route came before the lists', () => {
    const scroll = vi.fn();
    const original = Element.prototype.scrollIntoView;
    Element.prototype.scrollIntoView = scroll;
    try {
      const { shell } = render();
      shell.update({ view: 'list', viewKey: 'list:b', params: { listId: 'b' } }, 'B');
      expect(scroll).not.toHaveBeenCalled();
      shell.setLists(lists('a', 'b'), COUNTS({}));
      shell.setLists(lists('a', 'b'), COUNTS({ b: 2 }));
      expect(scroll).toHaveBeenCalledTimes(1);
    }
    finally {
      Element.prototype.scrollIntoView = original;
    }
  });
});

describe('renderShell navigation toggle and rail', () => {
  const NO_COUNTS = { all: 0, byList: new Map() };

  /**
   * Stand in for the wide layout query.
   * @param {boolean} matches true for a window of at least 64rem
   * @returns {{matches: boolean, addEventListener: Function, removeEventListener: Function}} the query
   */
  const media = (matches) => ({ matches, addEventListener: vi.fn(), removeEventListener: vi.fn() });

  /**
   * Render the shell with a stand-in layout query.
   * @param {boolean} [wide] true for a window of at least 64rem
   * @returns {{root: HTMLElement, shell: object, toggle: HTMLButtonElement, sidebar: HTMLElement}} the parts
   */
  function renderAt(wide = true) {
    const root = document.body.appendChild(document.createElement('div'));
    const shell = renderShell(root, { navMedia: media(wide) });
    return { root, shell, toggle: root.querySelector('.app__nav-toggle'), sidebar: root.querySelector('.app__sidebar') };
  }

  it('opens the top bar with the nav toggle, which controls the sidebar popover', () => {
    const { root, toggle, sidebar } = renderAt();
    expect(root.querySelector('.app__top-bar').firstElementChild).toBe(toggle);
    expect(toggle.matches('button.icon-button[type="button"][data-app-nav-toggle]')).toBe(true);
    expect(sidebar.id).toBe('app-nav');
    expect(sidebar.getAttribute('popover')).toBe('auto');
    expect(toggle.getAttribute('aria-controls')).toBe('app-nav');
    expect(toggle.getAttribute('popovertarget')).toBe('app-nav');
    expect(toggle.querySelector('svg.icon[aria-hidden="true"] use').getAttribute('href')).toBe('img/icons.svg#icon-nav-collapse');
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(toggle.getAttribute('aria-label')).toBe('Collapse navigation');
  });

  it('cycles the wide sidebar through open, rail, and hidden, and stores each state on the device', () => {
    const { toggle, sidebar } = renderAt();
    toggle.click();
    expect([toggle.getAttribute('aria-expanded'), sidebar.hidden, toggle.getAttribute('aria-label')]).toEqual(['false', false, 'Hide navigation']);
    expect(localStorage.getItem('todos.view.nav')).toBe('"rail"');
    toggle.click();
    expect([toggle.getAttribute('aria-expanded'), sidebar.hidden, toggle.getAttribute('aria-label')]).toEqual(['false', true, 'Show navigation']);
    expect(localStorage.getItem('todos.view.nav')).toBe('"hidden"');
    toggle.click();
    expect([toggle.getAttribute('aria-expanded'), sidebar.hidden, toggle.getAttribute('aria-label')]).toEqual(['true', false, 'Collapse navigation']);
    expect(localStorage.getItem('todos.view.nav')).toBe('"open"');
  });

  it('starts in the state stored on the device', () => {
    localStorage.setItem('todos.view.nav', '"rail"');
    const rail = renderAt();
    expect([rail.toggle.getAttribute('aria-expanded'), rail.sidebar.hidden]).toEqual(['false', false]);
    resetBody();
    localStorage.setItem('todos.view.nav', '"hidden"');
    const hidden = renderAt();
    expect([hidden.toggle.getAttribute('aria-expanded'), hidden.sidebar.hidden]).toEqual(['false', true]);
  });

  it('keeps the sidebar out of the hidden state below 64rem, where the toggle names the drawer', () => {
    localStorage.setItem('todos.view.nav', '"hidden"');
    const { toggle, sidebar } = renderAt(false);
    expect(sidebar.hidden).toBe(false);
    expect(toggle.getAttribute('aria-label')).toBe('Open navigation');
  });

  it('gives each list row a hidden monogram of its first letter, and every sidebar link a title', () => {
    const { root, shell } = renderAt();
    shell.setLists([{ id: 'g', name: 'groceries' }, { id: 'e', name: 'Élan' }, { id: 'l', name: '👍🏽 Likes' }], NO_COUNTS);
    const mark = (id) => root.querySelector(`[data-nav="list:${id}"] .nav-item__mark`);
    expect([mark('g').textContent, mark('e').textContent, mark('l').textContent]).toEqual(['G', 'É', '👍🏽']);
    expect(mark('g').getAttribute('aria-hidden')).toBe('true');
    expect(root.querySelector('[data-nav="list:g"]').firstElementChild).toBe(mark('g'));
    expect([...root.querySelectorAll('.app__sidebar a')].map((link) => link.title).sort()).toEqual(['All tasks', 'Lists', 'groceries', 'Élan', '👍🏽 Likes'].sort());
    shell.setLists([{ id: 'g', name: 'Work' }], NO_COUNTS);
    expect(mark('g').textContent).toBe('W');
    expect(root.querySelector('.app__nav-list:not([data-nav-lists]) .nav-item__mark')).toBeNull();
  });

  it('clears the find text when the sidebar becomes a rail', () => {
    vi.useFakeTimers();
    const { root, shell, toggle } = renderAt();
    shell.setLists(Array.from({ length: 14 }, (unused, index) => ({ id: `l${index}`, name: `List ${index}` })), NO_COUNTS);
    const field = root.querySelector('[data-find-lists]');
    field.value = 'List 1';
    field.dispatchEvent(new Event('input'));
    vi.advanceTimersByTime(150);
    expect(root.querySelectorAll('[data-nav-lists] li[hidden]').length).toBeGreaterThan(0);
    toggle.click();
    expect(field.value).toBe('');
    expect(root.querySelectorAll('[data-nav-lists] li[hidden]')).toHaveLength(0);
  });
});

describe('renderShell areas (ADR-0004)', () => {
  const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

  it('renders the shell areas in skeleton order on a root in the main scroll mode', () => {
    const { root } = render();
    expect([...root.classList]).toEqual(expect.arrayContaining(['app', 'app--scroll-main']));
    expect([...root.children].filter((child) => !child.classList.contains('panel-resize')).map((child) => child.className.split(' ').find((name) => name.startsWith('app__') || name === 'skip-link'))).toEqual([
      'skip-link', 'app__top-bar', 'app__sidebar', 'app__banners', 'app__main', 'app__side-panel', 'app__bottom-nav', 'app__overlays',
    ]);
    expect([...root.querySelectorAll(':scope > .panel-resize')].map((separator) => separator.dataset.panel)).toEqual(['sidebar', 'editor']);
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

describe('renderShell label tooltips', () => {
  /**
   * Hover a control with a mouse pointer.
   * @param {Element} control the control to hover
   */
  function hover(control) {
    control.dispatchEvent(new PointerEvent('pointerover', { bubbles: true, pointerType: 'mouse' }));
  }

  /**
   * Find the shown label tooltips in the document.
   * @returns {HTMLElement[]} the label tooltips that are not hidden
   */
  function shown() {
    return [...document.querySelectorAll('.tooltip--label')].filter((element) => !element.hidden);
  }

  it('names a hovered icon button with one shared label tooltip', () => {
    const { root } = render();
    const toggle = root.querySelector('.app__nav-toggle');
    hover(toggle);
    expect(shown().map((element) => element.textContent)).toEqual([toggle.getAttribute('aria-label')]);
    const more = root.querySelector('.app__main').appendChild(document.createElement('button'));
    more.className = 'icon-button';
    more.setAttribute('aria-label', 'All tasks actions');
    hover(more);
    expect(shown().map((element) => element.textContent)).toEqual(['All tasks actions']);
  });

  it('names a floating button in the overlay layer', () => {
    const { root } = render();
    const fab = root.querySelector('.app__overlays').appendChild(document.createElement('a'));
    fab.className = 'fab';
    fab.href = '#/lists/new';
    fab.setAttribute('aria-label', 'New list');
    hover(fab);
    expect(shown().map((element) => element.textContent)).toEqual(['New list']);
  });

  it('skips a control whose title holds a hint, which keeps its title', () => {
    const { root } = render();
    const status = root.querySelector('.app__main').appendChild(document.createElement('button'));
    status.className = 'icon-button status-button';
    status.setAttribute('aria-label', 'Mark Buy paint done');
    status.title = 'Press to mark it done';
    hover(status);
    expect(shown()).toEqual([]);
    expect(status.title).toBe('Press to mark it done');
  });

  it('removes its tooltip when the shell is destroyed', () => {
    const { root, shell } = render();
    const before = document.querySelectorAll('.tooltip--label').length;
    shell.destroy();
    expect(document.querySelectorAll('.tooltip--label')).toHaveLength(before - 1);
    hover(root.querySelector('.app__nav-toggle'));
    expect(shown()).toEqual([]);
  });
});
