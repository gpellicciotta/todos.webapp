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
 * @returns {Function & {down: boolean}} the fetch
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

beforeEach(() => {
  vi.useFakeTimers({ now: NOW });
  document.body.replaceChildren();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('inbox button', () => {
  it('shows a bell named Inbox with the unread count while connected', async () => {
    const { slot } = await mount();
    const button = slot.querySelector('.inbox-button');
    expect(button.hidden).toBe(false);
    expect(button.getAttribute('aria-label')).toBe(INBOX_STRINGS.buttonUnread(2));
    expect(button.querySelector('.inbox-button__badge').textContent).toBe('2');
  });

  it('shows no badge once everything is read', async () => {
    const { slot } = await mount({ notifications: [raw(1, { read: true })] });
    const button = slot.querySelector('.inbox-button');
    expect(button.getAttribute('aria-label')).toBe(INBOX_STRINGS.button);
    expect(button.querySelector('.inbox-button__badge')).toBeNull();
  });

  it('caps a long count at 99+', async () => {
    const many = Array.from({ length: 120 }, (_, index) => raw(index + 1));
    const { slot } = await mount({ notifications: many });
    expect(slot.querySelector('.inbox-button__badge').textContent).toBe('99+');
  });

  it('is hidden in local mode', async () => {
    const { slot } = await mount({ record: null });
    expect(slot.querySelector('.inbox-button').hidden).toBe(true);
  });

  it('hides when the session expires', async () => {
    const { slot, session } = await mount();
    session.expire();
    expect(slot.querySelector('.inbox-button').hidden).toBe(true);
  });
});

describe('inbox panel', () => {
  it('lists the notifications with their title and message, unread ones marked', async () => {
    const { slot } = await mount({ notifications: [raw(2), raw(1, { read: true })] });
    await click(slot.querySelector('.inbox-button'));
    const rows = [...slot.querySelectorAll('.inbox-item')];
    expect(rows.map((row) => row.dataset.id)).toEqual(['2', '1']);
    expect(rows[0].textContent).toContain('Title 2');
    expect(rows[0].textContent).toContain('Message 2');
    expect(rows[0].dataset.read).toBe('false');
    expect(rows[1].dataset.read).toBe('true');
    expect(rows[1].querySelector('[data-action="read"]')).toBeNull();
  });

  it('says so when the inbox is empty', async () => {
    const { slot } = await mount({ notifications: [] });
    await click(slot.querySelector('.inbox-button'));
    expect(slot.querySelector('.inbox-panel').textContent).toContain(INBOX_STRINGS.empty);
    expect(slot.querySelector('[data-action="clear-all"]').disabled).toBe(true);
  });

  it('marks a notification read from its button', async () => {
    const { slot, inbox } = await mount();
    await click(slot.querySelector('.inbox-button'));
    await click(slot.querySelector('.inbox-item[data-id="2"] [data-action="read"]'));
    expect(inbox.unreadCount()).toBe(1);
    expect(slot.querySelector('.inbox-item[data-id="2"]').dataset.read).toBe('true');
    expect(slot.querySelector('.inbox-button__badge').textContent).toBe('1');
  });

  it('discards a notification from its button', async () => {
    const { slot } = await mount();
    await click(slot.querySelector('.inbox-button'));
    await click(slot.querySelector('.inbox-item[data-id="1"] [data-action="discard"]'));
    expect([...slot.querySelectorAll('.inbox-item')].map((row) => row.dataset.id)).toEqual(['2']);
  });

  it('discards everything with Clear all', async () => {
    const { slot } = await mount();
    await click(slot.querySelector('.inbox-button'));
    await click(slot.querySelector('[data-action="clear-all"]'));
    expect(slot.querySelectorAll('.inbox-item')).toHaveLength(0);
    expect(slot.querySelector('.inbox-panel').textContent).toContain(INBOX_STRINGS.empty);
  });

  it('shows a toast and keeps the row when an action fails', async () => {
    const { slot, service, toaster } = await mount();
    await click(slot.querySelector('.inbox-button'));
    service.down = true;
    await click(slot.querySelector('.inbox-item[data-id="1"] [data-action="discard"]'));
    expect(toaster.show).toHaveBeenCalledWith(INBOX_STRINGS.failed);
    expect(slot.querySelectorAll('.inbox-item')).toHaveLength(2);
  });

  it('notes that it shows the last inbox while the service is unreachable', async () => {
    const { slot, service, inbox } = await mount();
    service.down = true;
    await inbox.refresh();
    await click(slot.querySelector('.inbox-button'));
    expect(slot.querySelector('.inbox-panel').textContent).toContain(INBOX_STRINGS.offline);
  });

  it('opens a safe action link in a new tab, and shows no link for an unsafe one', async () => {
    const { slot } = await mount({ notifications: [
      raw(2, { 'action-url': '/index.html#about' }), raw(1, { 'action-url': 'javascript:alert(1)' }),
    ] });
    await click(slot.querySelector('.inbox-button'));
    const link = slot.querySelector('.inbox-item[data-id="2"] a');
    expect(link.href).toBe(`${SERVER}/index.html#about`);
    expect(link.target).toBe('_blank');
    expect(link.rel).toBe('noopener noreferrer');
    expect(slot.querySelector('.inbox-item[data-id="1"] a')).toBeNull();
  });

  it('renders service text as text, never as markup', async () => {
    const { slot } = await mount({ notifications: [raw(1, { title: '<img src=x onerror=alert(1)>', message: '<b>bold</b>' })] });
    await click(slot.querySelector('.inbox-button'));
    expect(slot.querySelector('.inbox-item img, .inbox-item b')).toBeNull();
    expect(slot.querySelector('.inbox-item').textContent).toContain('<b>bold</b>');
  });
});

describe('broadcast banners', () => {
  it('shows each unread banner notification above the views with its title and message', async () => {
    const { banners } = await mount({ notifications: [raw(3, { banner: true }), raw(2, { banner: true, read: true }), raw(1)] });
    const shown = banners.querySelectorAll('.banner');
    expect(shown).toHaveLength(1);
    expect(shown[0].textContent).toContain('Title 3');
    expect(shown[0].textContent).toContain('Message 3');
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
    await click(banners.querySelector('.banner button'));
    expect(banners.querySelectorAll('.banner')).toHaveLength(0);
    expect(inbox.list()[0].read).toBe(true);
  });

  it('keeps the banner and shows a toast when the dismissal fails', async () => {
    const { banners, service, toaster } = await mount({ notifications: [raw(3, { banner: true })] });
    service.down = true;
    await click(banners.querySelector('.banner button'));
    expect(banners.querySelectorAll('.banner')).toHaveLength(1);
    expect(toaster.show).toHaveBeenCalledWith(INBOX_STRINGS.failed);
  });

  it('gives the Dismiss button an accessible name that names the notification', async () => {
    const { banners } = await mount({ notifications: [raw(3, { banner: true })] });
    expect(banners.querySelector('.banner button').getAttribute('aria-label')).toBe(INBOX_STRINGS.dismiss('Title 3'));
  });

  it('removes the banners when the session expires', async () => {
    const { banners, session } = await mount({ notifications: [raw(3, { banner: true })] });
    session.expire();
    expect(banners.querySelectorAll('.banner')).toHaveLength(0);
  });
});

describe('destroy', () => {
  it('removes the button, the panel, and the banners', async () => {
    const { slot, banners, view } = await mount({ notifications: [raw(3, { banner: true })] });
    view.destroy();
    expect(slot.querySelector('.inbox-button, .inbox-panel')).toBeNull();
    expect(banners.querySelector('.banner')).toBeNull();
  });
});
