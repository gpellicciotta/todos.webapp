import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { onListOrderChange } from '../../src/js/core/list-order.js';
import {
  isSyncedSetting, readEditTimes, readEnterAdds, readPendingSettings, removePreference, writeNavState, writePanelWidths,
  writePreference, writeServerUrl, writeTheme,
} from '../../src/js/core/preferences.js';
import { createApi } from '../../src/js/sync/api.js';
import { createEngine } from '../../src/js/sync/engine.js';
import { createSettingsSync, SETTINGS_ROUTE } from '../../src/js/sync/settings.js';
import { createViewModel } from '../../src/js/views/view-controls.js';
import { freshStore } from './store-helpers.js';
import { fakeFeed } from './sync-fake-feed.js';
import { fakeSession } from './sync-fake-service.js';

const T1 = '2026-11-16T10:00:00.000Z';
const T2 = '2026-11-16T11:00:00.000Z';
const T3 = '2026-11-16T12:00:00.000Z';
const LIST = '0192f1a2-7c3e-7b4a-9d10-5f2e8a1b2c41';
const ORDERED = { filter: { statuses: ['ready'] }, order: { field: 'due-time', direction: 'asc' }, group: 'list' };

/**
 * Keep a storage in memory, like `localStorage`, with `length` and `key` for listing.
 * @param {Record<string, unknown>} [seed] values by full key, stored as JSON
 * @returns {Storage & {items: Map<string, string>}} the storage
 */
function memoryStorage(seed = {}) {
  const items = new Map(Object.entries(seed).map(([key, value]) => [key, JSON.stringify(value)]));
  return {
    items,
    get length() {
      return items.size;
    },
    key: (index) => [...items.keys()][index] ?? null,
    getItem: (key) => (items.has(key) ? items.get(key) : null),
    setItem: (key, value) => items.set(key, String(value)),
    removeItem: (key) => items.delete(key),
  };
}

/**
 * Read a JSON value from a storage.
 * @param {Storage} storage the storage
 * @param {string} key the full key
 * @returns {unknown} the value, or undefined when absent
 */
function stored(storage, key) {
  const raw = storage.getItem(key);
  return raw === null ? undefined : JSON.parse(raw);
}

/**
 * Stand in for the user settings routes of the service: merge by edit time, tombstones, and an `ETag`.
 * @param {Record<string, {value: unknown, 'edit-time': string}>} [seed] the stored settings
 * @returns {object} the service with `fetch`, `calls`, `settings`, `fail`, and `clock` (clamps later edit times)
 */
function settingsService(seed = {}) {
  const service = { settings: new Map(Object.entries(seed)), version: 1, calls: [], fail: null, clock: null };
  const reply = (status, body, headers = {}) => ({
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (name) => headers[name.toLowerCase()] ?? null },
    json: async () => {
      if (body === undefined) {
        throw new SyntaxError('no body');
      }
      return body;
    },
  });
  const view = () => ({ settings: Object.fromEntries([...service.settings].sort(([a], [b]) => a.localeCompare(b))) });
  const tag = () => `"v${service.version}"`;
  service.fetch = async (url, init) => {
    const { pathname } = new URL(url);
    const body = init.body === undefined ? undefined : JSON.parse(init.body);
    service.calls.push({ method: init.method, path: pathname, headers: init.headers, body });
    if (service.fail === 'network') {
      throw new TypeError('Failed to fetch');
    }
    if (typeof service.fail === 'number') {
      return reply(service.fail, { message: 'failed' });
    }
    if (pathname !== SETTINGS_ROUTE) {
      return reply(404, { message: 'not found' });
    }
    if (init.method === 'GET') {
      return init.headers['If-None-Match'] === tag() ? reply(304, undefined, { etag: tag() }) : reply(200, view(), { etag: tag() });
    }
    const fallback = init.headers['Edit-Time'] ?? new Date().toISOString();
    for (const [name, value] of Object.entries(body.settings)) {
      let time = body['edit-times']?.[name] ?? fallback;
      if (service.clock && Date.parse(time) > Date.parse(service.clock)) {
        time = service.clock;
      }
      const current = service.settings.get(name);
      if (!current || Date.parse(time) >= Date.parse(current['edit-time'])) {
        service.settings.set(name, { value, 'edit-time': time });
        service.version += 1;
      }
    }
    return reply(200, view(), { etag: tag() });
  };
  return service;
}

/**
 * Create a settings sync over a storage and a service.
 * @param {Storage} storage the storage
 * @param {object} service the service
 * @param {object} [options] more options, such as `listIds` or `session`
 * @returns {object} the settings sync
 */
function syncOf(storage, service, options = {}) {
  const session = options.session ?? fakeSession();
  const api = createApi({ session, fetch: service.fetch });
  return createSettingsSync({ session, api, getStorage: () => storage, ...options });
}

const patches = (service) => service.calls.filter((call) => call.method === 'PATCH');

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(T1));
});

afterEach(() => {
  vi.useRealTimers();
});

describe('the synced names', () => {
  it('cover the view options, the Lists screen sort, the list order, and Make Enter add, and nothing else', () => {
    for (const name of ['todos.view.tasks', `todos.view.list.${LIST}`, 'todos.view.lists', 'todos.lists.order', 'todos.enter-adds']) {
      expect(isSyncedSetting(name)).toBe(true);
    }
    for (const name of ['todos.theme', 'todos.server-url', 'todos.view.panels', 'todos.view.nav', 'todos.view.list.', 'todos.session', 'todos.sync-log.seen', 'timezone']) {
      expect(isSyncedSetting(name)).toBe(false);
    }
  });
});

describe('edit times of synced settings', () => {
  it('records an edit time and a pending name for a write and a removal of a synced name', () => {
    const storage = memoryStorage();
    writePreference('view.tasks', ORDERED, () => storage);
    expect(readEditTimes(() => storage)).toEqual({ 'todos.view.tasks': T1 });
    expect(readPendingSettings(() => storage)).toEqual(['todos.view.tasks']);
    vi.setSystemTime(new Date(T2));
    removePreference('view.tasks', () => storage);
    expect(readEditTimes(() => storage)).toEqual({ 'todos.view.tasks': T2 });
    expect(readPendingSettings(() => storage)).toEqual(['todos.view.tasks']);
  });

  it('records no edit time for the theme, the server URL, the panel widths, and the sidebar state', () => {
    const storage = memoryStorage();
    writeTheme('dark', () => storage);
    writeServerUrl('https://todos.example.com', () => storage);
    writePanelWidths({ sidebar: 16, editor: 25 }, () => storage);
    writeNavState('rail', () => storage);
    writePreference('reminders', true, () => storage);
    expect(readEditTimes(() => storage)).toEqual({});
    expect(readPendingSettings(() => storage)).toEqual([]);
  });

  it('records no edit for a write of the stored value, and moves a later edit past the stored edit time', () => {
    const storage = memoryStorage({ 'todos.enter-adds': false, 'todos.settings.edit-times': { 'todos.enter-adds': T2 } });
    writePreference('enter-adds', false, () => storage);
    expect(readPendingSettings(() => storage)).toEqual([]);
    // The clock reads T1, before the stored edit time, so the edit lands just after it.
    writePreference('enter-adds', true, () => storage);
    expect(readEditTimes(() => storage)['todos.enter-adds']).toBe('2026-11-16T11:00:00.001Z');
  });
});

describe('the settings sync run', () => {
  it('applies a newer server value, keeps and uploads a newer local one, and removes the key for a newer tombstone', async () => {
    const storage = memoryStorage({
      'todos.view.tasks': ORDERED,
      'todos.lists.order': ['a', 'b'],
      [`todos.view.list.${LIST}`]: ORDERED,
      'todos.settings.edit-times': { 'todos.view.tasks': T3, 'todos.lists.order': T1, [`todos.view.list.${LIST}`]: T1 },
    });
    const service = settingsService({
      'todos.view.tasks': { value: { filter: {}, order: { field: 'status', direction: 'asc' }, group: 'none' }, 'edit-time': T2 },
      'todos.lists.order': { value: ['b', 'a'], 'edit-time': T2 },
      [`todos.view.list.${LIST}`]: { value: null, 'edit-time': T2 },
    });
    expect(await syncOf(storage, service).run()).toBe('uploaded');
    expect(stored(storage, 'todos.lists.order')).toEqual(['b', 'a']);
    expect(storage.getItem(`todos.view.list.${LIST}`)).toBeNull();
    expect(stored(storage, 'todos.view.tasks')).toEqual(ORDERED);
    expect(service.settings.get('todos.view.tasks')).toEqual({ value: ORDERED, 'edit-time': T3 });
    expect(patches(service)).toHaveLength(1);
    expect(Object.keys(patches(service)[0].body.settings)).toEqual(['todos.view.tasks']);
    expect(readEditTimes(() => storage)).toMatchObject({ 'todos.lists.order': T2, [`todos.view.list.${LIST}`]: T2, 'todos.view.tasks': T3 });
    expect(readPendingSettings(() => storage)).toEqual([]);
  });

  it('counts a local value without an edit time as the oldest, and uploads one the server lacks on the first connect', async () => {
    const storage = memoryStorage({ 'todos.view.tasks': ORDERED, 'todos.enter-adds': false });
    const service = settingsService({ 'todos.view.tasks': { value: null, 'edit-time': T1 } });
    await syncOf(storage, service).run();
    expect(storage.getItem('todos.view.tasks')).toBeNull();
    expect(service.settings.get('todos.enter-adds')?.value).toBe(false);
    expect(Object.keys(patches(service)[0].body.settings)).toEqual(['todos.enter-adds']);
  });

  it('keeps the pending names after a failed upload and a reload, and uploads them on a later run', async () => {
    const storage = memoryStorage();
    const service = settingsService();
    writePreference('enter-adds', false, () => storage);
    service.fail = 'network';
    expect(await syncOf(storage, service).run()).toBe('failed');
    service.fail = 503;
    expect(await syncOf(storage, service).run()).toBe('failed');
    expect(readPendingSettings(() => storage)).toEqual(['todos.enter-adds']);
    service.fail = null;
    // A new instance stands for a reload of the page.
    expect(await syncOf(storage, service).run()).toBe('uploaded');
    expect(service.settings.get('todos.enter-adds')).toEqual({ value: false, 'edit-time': T1 });
    expect(readPendingSettings(() => storage)).toEqual([]);
  });

  it('changes nothing on a 304', async () => {
    const storage = memoryStorage();
    const service = settingsService({ 'todos.enter-adds': { value: false, 'edit-time': T1 } });
    const sync = syncOf(storage, service);
    expect(await sync.run()).toBe('downloaded');
    const before = new Map(storage.items);
    expect(await sync.run()).toBe('unchanged');
    expect(service.calls.at(-1).headers['If-None-Match']).toBe('"v1"');
    expect(storage.items).toEqual(before);
  });

  it('adopts the edit time the service kept, so a clamped edit is not uploaded again', async () => {
    const storage = memoryStorage();
    const service = settingsService();
    service.clock = T1;
    vi.setSystemTime(new Date(T2));
    writePreference('enter-adds', false, () => storage);
    const sync = syncOf(storage, service);
    expect(await sync.run()).toBe('uploaded');
    expect(readEditTimes(() => storage)['todos.enter-adds']).toBe(T1);
    expect(await sync.run()).toBe('unchanged');
    expect(patches(service)).toHaveLength(1);
  });

  it('uploads only names that start with todos., and never stores a downloaded timezone or another unsynced name', async () => {
    const storage = memoryStorage({ 'todos.theme': 'dark', 'todos.server-url': 'https://todos.example.com', 'todos.view.panels': { sidebar: 16, editor: 25 } });
    writePreference('view.tasks', ORDERED, () => storage);
    writePreference('lists.order', ['a'], () => storage);
    const service = settingsService({
      timezone: { value: 'Europe/Brussels', 'edit-time': T3 },
      'todos.theme': { value: 'light', 'edit-time': T3 },
    });
    service.version = 5;
    await syncOf(storage, service).run();
    const names = patches(service).flatMap((call) => Object.keys(call.body.settings));
    expect(names.sort()).toEqual(['todos.lists.order', 'todos.view.tasks']);
    expect(names.every((name) => name.startsWith('todos.'))).toBe(true);
    expect([...storage.items.keys()].filter((key) => !key.startsWith('todos.'))).toEqual([]);
    expect(stored(storage, 'todos.theme')).toBe('dark');
  });

  it('sends null for the view options of a list that is gone from the store', async () => {
    const storage = memoryStorage({ [`todos.view.list.${LIST}`]: ORDERED, 'todos.view.list.kept': ORDERED });
    const service = settingsService();
    await syncOf(storage, service, { listIds: async () => ['kept'] }).run();
    expect(storage.getItem(`todos.view.list.${LIST}`)).toBeNull();
    expect(service.settings.get(`todos.view.list.${LIST}`)).toEqual({ value: null, 'edit-time': T1 });
  });

  it('calls no route in local mode', async () => {
    const storage = memoryStorage();
    writePreference('enter-adds', false, () => storage);
    const service = settingsService();
    const session = fakeSession({ status: 'local' });
    expect(await syncOf(storage, service, { session }).run()).toBe('skipped');
    expect(service.calls).toEqual([]);
  });

  it('forgets the pending names, the ETag, and the edit times on disconnect, and keeps the settings', async () => {
    const storage = memoryStorage();
    const service = settingsService({ 'todos.view.tasks': { value: ORDERED, 'edit-time': T1 } });
    const sync = syncOf(storage, service);
    await sync.run();
    writePreference('enter-adds', false, () => storage);
    sync.disconnect();
    expect(readPendingSettings(() => storage)).toEqual([]);
    expect(readEditTimes(() => storage)).toEqual({});
    expect(storage.getItem('todos.settings.etag')).toBeNull();
    expect(stored(storage, 'todos.view.tasks')).toEqual(ORDERED);
    expect(stored(storage, 'todos.enter-adds')).toBe(false);
  });
});

describe('the refresh after a download', () => {
  it('tells the list order listeners, and changes what the add bar reads for Make Enter add', async () => {
    const storage = memoryStorage();
    const service = settingsService({
      'todos.lists.order': { value: ['b', 'a'], 'edit-time': T1 },
      'todos.enter-adds': { value: false, 'edit-time': T1 },
    });
    const listener = vi.fn();
    const stop = onListOrderChange(listener);
    await syncOf(storage, service).run();
    stop();
    expect(listener).toHaveBeenCalledTimes(1);
    expect(readEnterAdds(() => storage)).toBe(false);
  });

  it('reloads the view model of a downloaded view, and waits while its view options panel is open', async () => {
    const storage = memoryStorage();
    const model = createViewModel('tasks', () => storage);
    model.set({ ...model.get(), filter: { ...model.get().filter, text: 'paint' } });
    const listener = vi.fn();
    model.subscribe(listener);
    const service = settingsService({ 'todos.view.tasks': { value: ORDERED, 'edit-time': T2 } });
    const release = model.hold();
    await syncOf(storage, service).run();
    expect(model.get().group).toBe('none');
    expect(listener).not.toHaveBeenCalled();
    release();
    expect(model.get()).toMatchObject({ group: 'list', order: { field: 'due-time' }, filter: { text: 'paint' } });
    expect(listener).toHaveBeenCalledTimes(1);
  });
});

describe('the settings step of the engine', () => {
  it('runs after the feed pull, and forgets its state when the session turns local', async () => {
    const service = fakeFeed();
    const { store } = await freshStore({ tracking: () => true });
    await store.queue.setState('account', { email: 'ada@example.com', server: 'https://todos.example.com' });
    await store.queue.setState('adoption', { status: 'done' });
    let follow = null;
    const session = fakeSession({ subscribe: (listener) => (follow = listener, () => {}) });
    const order = [];
    const settings = { run: vi.fn(async () => order.push('settings')), disconnect: vi.fn() };
    const fetchSpy = async (...args) => {
      order.push(new URL(args[0]).pathname);
      return service.fetch(...args);
    };
    const engine = createEngine({ store, session, fetch: fetchSpy, settings, locks: null, win: null, doc: null, channelName: 'settings-engine' });
    engine.start();
    expect(await engine.syncNow()).toBe('synced');
    expect(order.at(-1)).toBe('settings');
    expect(order.indexOf('/api/changes')).toBeLessThan(order.indexOf('settings'));
    follow('local');
    expect(settings.disconnect).toHaveBeenCalledTimes(1);
    engine.stop();
  });

  it('keeps the view options of a binned list, and sends null for them once the list is purged, through its default settings sync', async () => {
    const feed = fakeFeed();
    const settings = settingsService();
    const fetchBoth = (url, init) => (new URL(url).pathname === SETTINGS_ROUTE ? settings.fetch(url, init) : feed.fetch(url, init));
    const storage = memoryStorage();
    const saved = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
    Object.defineProperty(globalThis, 'localStorage', { value: storage, configurable: true, writable: true });
    try {
      const { store } = await freshStore({ tracking: () => true });
      await store.queue.setState('account', { email: 'ada@example.com', server: 'https://todos.example.com' });
      await store.queue.setState('adoption', { status: 'done' });
      const engine = createEngine({ store, session: fakeSession(), fetch: fetchBoth, locks: null, win: null, doc: null, channelName: 'settings-prune' });
      const list = await store.createList({ name: 'Garden' });
      const key = `todos.view.list.${list.id}`;
      storage.setItem(key, JSON.stringify(ORDERED));
      expect(await engine.syncNow()).toBe('synced');
      expect(settings.settings.get(key)?.value).toEqual(ORDERED);

      await store.deleteList(list.id);
      expect(await engine.syncNow()).toBe('synced');
      expect(stored(storage, key)).toEqual(ORDERED);
      expect(settings.settings.get(key)?.value).toEqual(ORDERED);

      await store.purgeForever('list', list.id);
      expect(await engine.syncNow()).toBe('synced');
      expect(storage.getItem(key)).toBeNull();
      expect(settings.settings.get(key)?.value).toBeNull();
      store.close();
    }
    finally {
      if (saved) {
        Object.defineProperty(globalThis, 'localStorage', saved);
      }
      else {
        delete globalThis.localStorage;
      }
    }
  });

  it('runs again soon after a local edit of a synced setting, and not after an edit of the theme', async () => {
    const service = fakeFeed();
    const { store } = await freshStore({ tracking: () => true });
    await store.queue.setState('account', { email: 'ada@example.com', server: 'https://todos.example.com' });
    await store.queue.setState('adoption', { status: 'done' });
    const settings = { run: vi.fn(async () => 'unchanged'), disconnect: vi.fn() };
    const engine = createEngine({
      store, session: fakeSession(), fetch: service.fetch, settings, locks: null, win: null, doc: null,
      wait: () => new Promise(() => {}), channelName: 'settings-kick',
    });
    engine.start();
    await vi.waitFor(() => expect(settings.run).toHaveBeenCalledTimes(1));
    const storage = memoryStorage();
    writeTheme('dark', () => storage);
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(settings.run).toHaveBeenCalledTimes(1);
    writePreference('enter-adds', false, () => storage);
    await vi.waitFor(() => expect(settings.run).toHaveBeenCalledTimes(2));
    engine.stop();
  });
});
