// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createInbox } from '../../src/js/sync/inbox.js';
import { createSession } from '../../src/js/sync/session.js';
import { attachInbox, INBOX_STRINGS } from '../../src/js/ui/inbox.js';

const SERVER = 'https://todos.example.com';
const NOW = Date.UTC(2026, 10, 7, 9, 0, 0);
const ACCOUNT = { token: 'session-1', expiry: '2099-01-01T00:00:00Z', name: 'Ada Lovelace', email: 'ada@example.com', server: SERVER };

/**
 * Create a server notification.
 * @param {number} id the identifier
 * @param {object} [overrides] fields to override
 * @returns {object} the raw notification
 */
function raw(id, overrides = {}) {
  return {
    id, title: `Title ${id}`, message: `Message ${id}`, type: 'info', source: 'admin-broadcast', banner: false,
    'action-url': null, 'creation-time': '2026-11-07T08:00:00Z', 'read-time': null, read: false, ...overrides,
  };
}

/**
 * Create an in-memory storage stand-in.
 * @returns {Storage} the storage
 */
function memoryStorage() {
  const data = new Map();
  return {
    getItem: (key) => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => data.set(key, String(value)),
    removeItem: (key) => data.delete(key),
  };
}

/**
 * Create a fake service over a notification list.
 * @param {object[]} initial the raw notifications
 * @returns {Function & {down: boolean, calls: string[]}} the fetch
 */
function fakeService(initial) {
  let items = initial;
  const fetch = async (url, init = {}) => {
    const method = init.method ?? 'GET';
    const answer = (status, body = {}) => ({ ok: status < 300, status, json: async () => body });
    if (fetch.down) {
      throw new TypeError('Failed to fetch');
    }
    const { pathname } = new URL(url);
    fetch.calls.push(`${method} ${pathname}`);
    if (pathname === '/api/notifications' && method === 'GET') {
      return answer(200, items);
    }
    if (pathname.endsWith('/clear-all')) {
      items = [];
      return answer(200);
    }
    const id = Number(pathname.split('/')[3]);
    if (pathname.endsWith('/read')) {
      items = items.map((item) => (item.id === id ? { ...item, read: true, 'read-time': '2026-11-07T09:00:00Z' } : item));
      return answer(200, items.find((item) => item.id === id));
    }
    items = items.filter((item) => item.id !== id);
    return answer(200);
  };
  fetch.down = false;
  fetch.calls = [];
  return fetch;
}

/**
 * Mount the inbox view over a fake service.
 * @param {object} [options] the stored session record and the notifications
 * @param {object|null} [options.record] the session record, null for local mode
 * @param {object[]} [options.notifications] the raw notifications
 * @returns {Promise<object>} the parts
 */
async function mount({ record = ACCOUNT, notifications = [raw(2), raw(1)] } = {}) {
  const storage = memoryStorage();
  if (record) {
    storage.setItem('todos.session', JSON.stringify(record));
  }
  const service = fakeService(notifications);
  const session = createSession({ getStorage: () => storage, now: () => NOW, fetch: service });
  const inbox = createInbox({ session, fetch: service });
  const slot = document.body.appendChild(document.createElement('div'));
  const banners = document.body.appendChild(document.createElement('div'));
  const toaster = { show: vi.fn() };
  const announce = vi.fn();
  const view = attachInbox(slot, { inbox, session, banners, toaster, announce });
  await inbox.refresh();
  return { slot, banners, inbox, session, service, toaster, announce, view };
}

/**
 * Click an element and let the pending promises settle.
 * @param {Element} target the element
 */
async function click(target) {
  target.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
  await vi.advanceTimersByTimeAsync(0);
}

/**
 * Tick the selection checkbox of a row.
 * @param {HTMLElement} slot the inbox slot
 * @param {number} id the notification identifier
 */
function select(slot, id) {
  const box = slot.querySelector(`[data-inbox-item="${id}"] [data-selection-item]`);
  box.checked = true;
  box.dispatchEvent(new Event('change', { bubbles: true }));
}

/**
 * Find the bell.
 * @param {HTMLElement} slot the inbox slot
 * @returns {HTMLElement} the bell button
 */
const bell = (slot) => slot.querySelector('.app__notifications-button');

/**
 * List the rendered row identifiers.
 * @param {HTMLElement} slot the inbox slot
 * @returns {string[]} the identifiers, in order
 */
const rowIds = (slot) => [...slot.querySelectorAll('.inbox-panel [data-inbox-item]')].map((row) => row.dataset.inboxItem);

beforeEach(() => {
  vi.useFakeTimers({ now: NOW });
  document.body.replaceChildren();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('inbox button', () => {
  it('shows the package bell named Inbox with the unread count while connected', async () => {
    const { slot } = await mount();
    expect(bell(slot).hidden).toBe(false);
    expect(bell(slot).getAttribute('aria-label')).toBe(INBOX_STRINGS.buttonUnread(2));
    expect(bell(slot).querySelector('[data-inbox-count]').textContent).toBe('2');
    expect(bell(slot).querySelector('[data-inbox-count]').hidden).toBe(false);
  });

  it('shows no badge once everything is read', async () => {
    const { slot } = await mount({ notifications: [raw(1, { read: true, 'read-time': '2026-11-07T08:30:00Z' })] });
    expect(bell(slot).getAttribute('aria-label')).toBe(INBOX_STRINGS.button);
    expect(bell(slot).querySelector('[data-inbox-count]').hidden).toBe(true);
  });

  it('caps the badge at 99+ and keeps the full count in the name', async () => {
    const many = Array.from({ length: 120 }, (_, index) => raw(index + 1));
    const { slot } = await mount({ notifications: many });
    expect(bell(slot).querySelector('[data-inbox-count]').textContent).toBe('99+');
    expect(bell(slot).getAttribute('aria-label')).toBe('Inbox, 120 unread');
  });

  it('is hidden in local mode', async () => {
    const { slot } = await mount({ record: null });
    expect(bell(slot).hidden).toBe(true);
  });

  it('hides when the session expires', async () => {
    const { slot, session } = await mount();
    session.expire();
    expect(bell(slot).hidden).toBe(true);
  });

  it('opens the panel with the inbox inside, and holds no inbox in the closed panel', async () => {
    const { slot } = await mount();
    expect(slot.querySelector('.inbox-panel .inbox')).toBeNull();
    await click(bell(slot));
    expect(bell(slot).getAttribute('aria-expanded')).toBe('true');
    expect(slot.querySelector('.inbox-panel .inbox')).not.toBeNull();
    expect(slot.querySelector('.inbox-panel').contains(document.activeElement)).toBe(true);
    await click(bell(slot));
    expect(slot.querySelector('.inbox-panel .inbox')).toBeNull();
  });
});

describe('inbox panel', () => {
  it('lists the notifications most recent first, unread ones marked, Mark read only on those', async () => {
    const { slot } = await mount({ notifications: [raw(2), raw(1, { read: true, 'read-time': '2026-11-07T08:30:00Z' })] });
    await click(bell(slot));
    expect(rowIds(slot)).toEqual(['2', '1']);
    const rows = slot.querySelectorAll('[data-inbox-item]');
    expect(rows[0].textContent).toContain('Title 2');
    expect(rows[0].textContent).toContain('Message 2');
    expect(rows[0].dataset.inboxUnread).toBe('true');
    expect(rows[1].hasAttribute('data-inbox-unread')).toBe(false);
    expect(rows[1].querySelector('[data-inbox-action="mark-read"]')).toBeNull();
    expect(rows[0].querySelector('[data-inbox-action="mark-read"]').textContent).toBe(INBOX_STRINGS.markRead);
  });

  it('says so when the inbox is empty, with Clear all disabled', async () => {
    const { slot } = await mount({ notifications: [] });
    await click(bell(slot));
    const empty = slot.querySelector('[data-inbox-empty]');
    expect(empty.hidden).toBe(false);
    expect(empty.textContent).toContain(INBOX_STRINGS.empty);
    const clearAll = slot.querySelector('[data-inbox-discard-all]');
    expect(clearAll.textContent).toBe(INBOX_STRINGS.clearAll);
    expect(clearAll.disabled).toBe(true);
  });

  it('marks a notification read from its button', async () => {
    const { slot, inbox } = await mount();
    await click(bell(slot));
    await click(slot.querySelector('[data-inbox-item="2"] [data-inbox-action="mark-read"]'));
    expect(inbox.unreadCount()).toBe(1);
    expect(slot.querySelector('[data-inbox-item="2"]').hasAttribute('data-inbox-unread')).toBe(false);
    expect(bell(slot).querySelector('[data-inbox-count]').textContent).toBe('1');
  });

  it('discards a notification from its button', async () => {
    const { slot } = await mount();
    await click(bell(slot));
    await click(slot.querySelector('[data-inbox-item="1"] [data-inbox-action="discard"]'));
    expect(rowIds(slot)).toEqual(['2']);
  });

  it('discards everything with Clear all', async () => {
    const { slot, service } = await mount();
    await click(bell(slot));
    await click(slot.querySelector('[data-inbox-discard-all]'));
    expect(rowIds(slot)).toEqual([]);
    expect(slot.querySelector('[data-inbox-empty]').hidden).toBe(false);
    expect(service.calls).toContain('POST /api/notifications/clear-all');
  });

  it('marks the selected notifications read, one request each, and clears the selection', async () => {
    const { slot, inbox, service } = await mount({ notifications: [raw(3), raw(2), raw(1)] });
    await click(bell(slot));
    select(slot, 3);
    select(slot, 1);
    await click(slot.querySelector('[data-selection-action="mark-read"]'));
    expect(inbox.list().filter((item) => item.read).map((item) => item.id)).toEqual([3, 1]);
    expect(service.calls.filter((call) => call.startsWith('POST'))).toEqual(['POST /api/notifications/3/read', 'POST /api/notifications/1/read']);
    expect(slot.querySelectorAll('[data-selection-item]:checked')).toHaveLength(0);
  });

  it('discards the selected notifications', async () => {
    const { slot } = await mount({ notifications: [raw(3), raw(2), raw(1)] });
    await click(bell(slot));
    select(slot, 3);
    select(slot, 2);
    await click(slot.querySelector('[data-selection-action="discard"]'));
    expect(rowIds(slot)).toEqual(['1']);
  });

  it('shows a toast and keeps the row when an action fails', async () => {
    const { slot, service, toaster } = await mount();
    await click(bell(slot));
    service.down = true;
    await click(slot.querySelector('[data-inbox-item="1"] [data-inbox-action="discard"]'));
    expect(toaster.show).toHaveBeenCalledWith(INBOX_STRINGS.failed);
    expect(rowIds(slot)).toEqual(['2', '1']);
  });

  it('shows one toast when a bulk action fails', async () => {
    const { slot, service, toaster } = await mount();
    await click(bell(slot));
    select(slot, 2);
    select(slot, 1);
    service.down = true;
    await click(slot.querySelector('[data-selection-action="discard"]'));
    expect(toaster.show).toHaveBeenCalledTimes(1);
    expect(rowIds(slot)).toEqual(['2', '1']);
  });

  it('notes that it shows the last inbox while the service is unreachable', async () => {
    const { slot, service, inbox } = await mount();
    await click(bell(slot));
    expect(slot.querySelector('.inbox-panel__note').hidden).toBe(true);
    await click(bell(slot));
    service.down = true;
    await inbox.refresh();
    await click(bell(slot));
    const note = slot.querySelector('.inbox-panel__note');
    expect(note.hidden).toBe(false);
    expect(note.textContent).toBe(INBOX_STRINGS.offline);
  });

  it('opens a safe action link in a new tab, and shows no link for an unsafe one', async () => {
    const { slot } = await mount({ notifications: [
      raw(2, { 'action-url': '/index.html#about' }), raw(1, { 'action-url': 'javascript:alert(1)' }),
    ] });
    await click(bell(slot));
    const link = slot.querySelector('[data-inbox-item="2"] [data-inbox-action="open"]');
    expect(link.href).toBe(`${SERVER}/index.html#about`);
    expect(link.target).toBe('_blank');
    expect(link.rel).toBe('noopener noreferrer');
    expect(slot.querySelector('[data-inbox-item="1"] a')).toBeNull();
  });

  it('renders service text as text, never as markup', async () => {
    const { slot } = await mount({ notifications: [raw(1, { title: '<img src=x onerror=alert(1)>', message: '<b>bold</b>' })] });
    await click(bell(slot));
    expect(slot.querySelector('[data-inbox-item] img, [data-inbox-item] b')).toBeNull();
    expect(slot.querySelector('[data-inbox-item]').textContent).toContain('<b>bold</b>');
  });

  it('keeps focus in the panel when the focused row goes away', async () => {
    const { slot } = await mount();
    await click(bell(slot));
    const discard = slot.querySelector('[data-inbox-item="2"] [data-inbox-action="discard"]');
    discard.focus();
    await click(discard);
    expect(slot.querySelector('.inbox-panel').contains(document.activeElement)).toBe(true);
    expect(document.activeElement.closest('[data-inbox-item]')?.dataset.inboxItem).toBe('1');
  });
});

describe('broadcast banners', () => {
  it('shows the unread banner notification above the views with its title and message', async () => {
    const { banners } = await mount({ notifications: [
      raw(3, { banner: true }), raw(2, { banner: true, read: true, 'read-time': '2026-11-07T08:30:00Z' }), raw(1),
    ] });
    const shown = banners.querySelectorAll('[data-notices-banner]');
    expect(shown).toHaveLength(1);
    expect(shown[0].dataset.noticesId).toBe('3');
    expect(shown[0].textContent).toContain('Title 3');
    expect(shown[0].textContent).toContain('Message 3');
    expect(banners.querySelector('[data-notices-all]')).toBeNull();
  });

  it('shows the most severe banner first, with a link that opens the inbox for the rest', async () => {
    const { slot, banners } = await mount({ notifications: [raw(3, { banner: true }), raw(2, { banner: true, type: 'warning' })] });
    expect(banners.querySelector('[data-notices-banner]').dataset.noticesId).toBe('2');
    expect(banners.querySelector('[data-notices-banner]').classList.contains('banner--warning')).toBe(true);
    const all = banners.querySelector('[data-notices-all]');
    expect(all.textContent).toBe(INBOX_STRINGS.viewAll(2));
    await click(all);
    expect(bell(slot).getAttribute('aria-expanded')).toBe('true');
  });

  it('announces a new banner once', async () => {
    const { announce, inbox } = await mount({ notifications: [raw(3, { banner: true })] });
    expect(announce).toHaveBeenCalledTimes(1);
    expect(announce).toHaveBeenCalledWith(expect.stringContaining('Title 3'));
    await inbox.refresh();
    expect(announce).toHaveBeenCalledTimes(1);
  });

  it('marks the notification read when the banner is dismissed', async () => {
    const { banners, inbox } = await mount({ notifications: [raw(3, { banner: true })] });
    await click(banners.querySelector('[data-notices-dismiss]'));
    expect(banners.querySelectorAll('[data-notices-banner]')).toHaveLength(0);
    expect(inbox.list()[0].read).toBe(true);
  });

  it('keeps the banner and shows a toast when the dismissal fails', async () => {
    const { banners, service, toaster } = await mount({ notifications: [raw(3, { banner: true })] });
    service.down = true;
    await click(banners.querySelector('[data-notices-dismiss]'));
    expect(banners.querySelectorAll('[data-notices-banner]')).toHaveLength(1);
    expect(toaster.show).toHaveBeenCalledWith(INBOX_STRINGS.failed);
  });

  it('names the Dismiss button', async () => {
    const { banners } = await mount({ notifications: [raw(3, { banner: true })] });
    expect(banners.querySelector('[data-notices-dismiss]').getAttribute('aria-label')).toBe(INBOX_STRINGS.dismiss);
  });

  it('opens a safe banner link in a new tab', async () => {
    const { banners } = await mount({ notifications: [raw(3, { banner: true, 'action-url': '/status' })] });
    const link = banners.querySelector('[data-notices-action]');
    expect(link.href).toBe(`${SERVER}/status`);
    expect(link.target).toBe('_blank');
    expect(link.rel).toBe('noopener noreferrer');
  });

  it('removes the banners when the session expires', async () => {
    const { banners, session } = await mount({ notifications: [raw(3, { banner: true })] });
    session.expire();
    expect(banners.querySelectorAll('[data-notices-banner]')).toHaveLength(0);
  });
});

describe('destroy', () => {
  it('removes the button, the panel, and the banners', async () => {
    const { slot, banners, view } = await mount({ notifications: [raw(3, { banner: true })] });
    view.destroy();
    expect(slot.querySelector('.app__notifications-button, .inbox-panel')).toBeNull();
    expect(banners.querySelector('[data-notices-banner]')).toBeNull();
  });
});
