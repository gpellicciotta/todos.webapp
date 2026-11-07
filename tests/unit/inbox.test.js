// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { actionLink, createInbox, normalizeNotification } from '../../src/js/sync/inbox.js';
import { createSession } from '../../src/js/sync/session.js';

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
    id, 'event-id': 17, title: `Title ${id}`, message: `Message ${id}`, type: 'info', source: 'admin-broadcast', banner: false,
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
 * Create a fake service that holds notifications and records every call.
 * @param {object[]} initial the raw notifications
 * @returns {Function & {calls: {url: string, method: string, authorization: string}[], notifications: object[], fail: Function}} the fetch
 */
function fakeService(initial) {
  const state = { notifications: initial, mode: null };
  const calls = [];
  const answer = (status, body = {}) => ({ ok: status >= 200 && status < 300, status, json: async () => body });
  const fetch = async (url, init = {}) => {
    const method = init.method ?? 'GET';
    calls.push({ url, method, authorization: init.headers?.Authorization ?? '' });
    if (state.mode === 'network') {
      throw new TypeError('Failed to fetch');
    }
    if (state.mode) {
      return answer(state.mode);
    }
    const { pathname } = new URL(url);
    if (pathname === '/api/notifications' && method === 'GET') {
      return answer(200, state.notifications);
    }
    if (pathname === '/api/notifications/clear-all') {
      const count = state.notifications.length;
      state.notifications = [];
      return answer(200, { success: true, message: `${count}` });
    }
    const [, id, action] = pathname.match(/^\/api\/notifications\/(\d+)(?:\/(read))?$/) ?? [];
    const found = state.notifications.find((item) => String(item.id) === id);
    if (!found) {
      return answer(404);
    }
    if (action === 'read') {
      Object.assign(found, { read: true, 'read-time': '2026-11-07T09:00:00Z' });
      return answer(200, found);
    }
    state.notifications = state.notifications.filter((item) => item !== found);
    return answer(200, { success: true });
  };
  Object.defineProperties(fetch, {
    calls: { value: calls },
    notifications: { get: () => state.notifications },
  });
  fetch.fail = (mode) => {
    state.mode = mode;
  };
  return fetch;
}

/**
 * Build an inbox over a session and a fake service.
 * @param {object|null} record the stored session record, or null for local mode
 * @param {object[]} notifications the raw notifications the service holds
 * @returns {{inbox: object, session: object, service: Function}} the parts
 */
function build(record = ACCOUNT, notifications = [raw(2), raw(1)]) {
  const storage = memoryStorage();
  if (record) {
    storage.setItem('todos.session', JSON.stringify(record));
  }
  const service = fakeService(notifications);
  const session = createSession({ getStorage: () => storage, now: () => NOW, fetch: service });
  return { inbox: createInbox({ session, fetch: service }), session, service };
}

beforeEach(() => {
  vi.useFakeTimers({ now: NOW });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('normalizeNotification', () => {
  it('camel-cases a server notification and defaults the optional fields', () => {
    expect(normalizeNotification(raw(5, { banner: true, type: 'WARNING', 'action-url': '/index.html#about' }))).toMatchObject({
      id: 5, title: 'Title 5', message: 'Message 5', type: 'warning', banner: true, read: false, actionUrl: '/index.html#about',
      creationTime: '2026-11-07T08:00:00Z',
    });
    expect(normalizeNotification({ id: 6 })).toMatchObject({ title: null, message: '', type: 'info', banner: false, read: false, actionUrl: null });
  });

  it('counts a notification with a read time as read', () => {
    expect(normalizeNotification({ id: 7, 'read-time': '2026-11-07T09:00:00Z' }).read).toBe(true);
  });
});

describe('actionLink', () => {
  it('resolves a server path against the server and keeps https links', () => {
    expect(actionLink({ actionUrl: '/index.html#about' }, SERVER)).toBe(`${SERVER}/index.html#about`);
    expect(actionLink({ actionUrl: 'https://example.org/news' }, SERVER)).toBe('https://example.org/news');
  });

  it('refuses addresses that are not http or https, and missing ones', () => {
    expect(actionLink({ actionUrl: 'javascript:alert(1)' }, SERVER)).toBeNull();
    expect(actionLink({ actionUrl: 'data:text/html,hi' }, SERVER)).toBeNull();
    expect(actionLink({ actionUrl: null }, SERVER)).toBeNull();
    expect(actionLink({ actionUrl: 'http://[bad' }, SERVER)).toBeNull();
  });
});

describe('inbox refresh', () => {
  it('loads the notifications with the bearer token, most recent first, and tells the listeners', async () => {
    const { inbox, service } = build();
    const listener = vi.fn();
    inbox.subscribe(listener);
    await inbox.refresh();
    expect(service.calls).toEqual([{ url: `${SERVER}/api/notifications`, method: 'GET', authorization: 'Bearer session-1' }]);
    expect(inbox.list().map((item) => item.id)).toEqual([2, 1]);
    expect(inbox.status()).toBe('ready');
    expect(listener).toHaveBeenCalled();
  });

  it('counts the unread notifications and lists the unread banners', async () => {
    const { inbox } = build(ACCOUNT, [raw(3, { banner: true }), raw(2, { banner: true, read: true }), raw(1)]);
    await inbox.refresh();
    expect(inbox.unreadCount()).toBe(2);
    expect(inbox.banners().map((item) => item.id)).toEqual([3]);
  });

  it('sends no request in local mode', async () => {
    const { inbox, service } = build(null);
    await inbox.refresh();
    expect(service.calls).toEqual([]);
    expect(inbox.list()).toEqual([]);
    expect(inbox.status()).toBe('idle');
  });

  it('sends no request after the session expired', async () => {
    const { inbox, service } = build({ ...ACCOUNT, expiry: '2026-11-07T08:00:00Z' });
    await inbox.refresh();
    expect(service.calls).toEqual([]);
  });

  it('expires the session on a 401 and empties the inbox', async () => {
    const { inbox, session, service } = build();
    await inbox.refresh();
    service.fail(401);
    await inbox.refresh();
    expect(session.state()).toBe('sign-in-needed');
    expect(inbox.list()).toEqual([]);
  });

  it('keeps the last notifications and reports offline when the network fails', async () => {
    const { inbox, session, service } = build();
    await inbox.refresh();
    service.fail('network');
    await inbox.refresh();
    expect(inbox.list()).toHaveLength(2);
    expect(inbox.status()).toBe('offline');
    expect(session.state()).toBe('connected');
  });

  it('keeps the last notifications and reports offline on a server error', async () => {
    const { inbox, service } = build();
    await inbox.refresh();
    service.fail(503);
    await inbox.refresh();
    expect(inbox.list()).toHaveLength(2);
    expect(inbox.status()).toBe('offline');
  });

  it('shares one request between overlapping refreshes', async () => {
    const { inbox, service } = build();
    await Promise.all([inbox.refresh(), inbox.refresh()]);
    expect(service.calls).toHaveLength(1);
  });
});

describe('inbox actions', () => {
  it('marks a notification read through the service', async () => {
    const { inbox, service } = build();
    await inbox.refresh();
    expect(await inbox.markRead(2)).toBe(true);
    expect(service.calls.at(-1)).toMatchObject({ url: `${SERVER}/api/notifications/2/read`, method: 'POST', authorization: 'Bearer session-1' });
    expect(inbox.list().find((item) => item.id === 2).read).toBe(true);
    expect(inbox.unreadCount()).toBe(1);
  });

  it('discards a notification through the service', async () => {
    const { inbox, service } = build();
    await inbox.refresh();
    expect(await inbox.discard(1)).toBe(true);
    expect(service.calls.at(-1)).toMatchObject({ url: `${SERVER}/api/notifications/1`, method: 'DELETE' });
    expect(inbox.list().map((item) => item.id)).toEqual([2]);
  });

  it('discards every notification through the service', async () => {
    const { inbox, service } = build();
    await inbox.refresh();
    expect(await inbox.clearAll()).toBe(true);
    expect(service.calls.at(-1)).toMatchObject({ url: `${SERVER}/api/notifications/clear-all`, method: 'POST' });
    expect(inbox.list()).toEqual([]);
  });

  it('changes nothing and reports false when the service cannot be reached', async () => {
    const { inbox, service } = build();
    await inbox.refresh();
    service.fail('network');
    expect(await inbox.markRead(2)).toBe(false);
    expect(await inbox.discard(1)).toBe(false);
    expect(await inbox.clearAll()).toBe(false);
    expect(inbox.list()).toHaveLength(2);
    expect(inbox.unreadCount()).toBe(2);
  });

  it('reports false for a notification the service does not know', async () => {
    const { inbox } = build();
    await inbox.refresh();
    expect(await inbox.markRead(99)).toBe(false);
    expect(inbox.list()).toHaveLength(2);
  });

  it('sends no request for an action in local mode', async () => {
    const { inbox, service } = build(null);
    expect(await inbox.markRead(1)).toBe(false);
    expect(service.calls).toEqual([]);
  });
});

describe('inbox start', () => {
  it('refreshes at once, then every 2 minutes while connected', async () => {
    const { inbox, service } = build();
    inbox.start({ document });
    await vi.advanceTimersByTimeAsync(0);
    expect(service.calls).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(120000);
    expect(service.calls).toHaveLength(2);
    inbox.stop();
    await vi.advanceTimersByTimeAsync(240000);
    expect(service.calls).toHaveLength(2);
  });

  it('sends nothing in local mode, however long it runs', async () => {
    const { inbox, service } = build(null);
    inbox.start({ document });
    await vi.advanceTimersByTimeAsync(600000);
    expect(service.calls).toEqual([]);
    inbox.stop();
  });

  it('refreshes when the tab becomes visible', async () => {
    const { inbox, service } = build();
    inbox.start({ document });
    await vi.advanceTimersByTimeAsync(0);
    document.dispatchEvent(new Event('visibilitychange'));
    await vi.advanceTimersByTimeAsync(0);
    expect(service.calls).toHaveLength(2);
    inbox.stop();
  });

  it('loads on sign-in, then empties on disconnect', async () => {
    const service = fakeService([raw(1)]);
    let record = null;
    const listeners = new Set();
    const session = {
      state: () => (record ? 'connected' : 'local'),
      token: () => record?.token ?? null,
      account: () => record,
      subscribe: (listener) => listeners.add(listener) && (() => listeners.delete(listener)),
    };
    const change = (next) => {
      record = next;
      listeners.forEach((listener) => listener(session.state()));
    };
    const inbox = createInbox({ session, fetch: service });
    inbox.start({ document });
    await vi.advanceTimersByTimeAsync(0);
    expect(service.calls).toEqual([]);
    change(ACCOUNT);
    await vi.advanceTimersByTimeAsync(0);
    expect(inbox.list()).toHaveLength(1);
    change(null);
    expect(inbox.list()).toEqual([]);
    expect(inbox.status()).toBe('idle');
    inbox.stop();
  });
});
