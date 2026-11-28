import { describe, expect, it, vi } from 'vitest';
import { createApi } from '../../src/js/sync/api.js';
import { applicationServerKey, createPushSubscription, deviceNameOf } from '../../src/js/sync/push-subscription.js';
import { fakeSession } from './sync-fake-service.js';

/**
 * Keep preferences in memory, like `localStorage`.
 * @returns {Storage} the storage
 */
function memoryStorage() {
  const items = new Map();
  return {
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => items.set(key, String(value)),
    removeItem: (key) => items.delete(key),
  };
}

/**
 * Build a fake browser push manager that holds at most one subscription.
 * @param {string|null} [endpoint] the endpoint of an existing subscription
 * @returns {object} the manager, with `current()`
 */
function fakeManager(endpoint = null) {
  let current = null;
  const make = (url) => ({
    endpoint: url,
    toJSON: () => ({ endpoint: url, keys: { p256dh: 'P256DH', auth: 'AUTH' } }),
    unsubscribe: vi.fn(async () => {
      current = null;
      return true;
    }),
  });
  if (endpoint) {
    current = make(endpoint);
  }
  return {
    current: () => current,
    getSubscription: async () => current,
    subscribe: vi.fn(async () => {
      current = make('https://fcm.googleapis.com/fcm/send/abc');
      return current;
    }),
  };
}

/**
 * Build a fake service for the push routes, recording every call.
 * @param {{vapid?: number}} [options] the status of the key route
 * @returns {{fetch: Function, calls: {method: string, path: string, body: object|undefined}[]}} the service
 */
function fakeService({ vapid = 200 } = {}) {
  const calls = [];
  const answer = (status, body) => ({ ok: status < 300, status, headers: { get: () => null }, json: async () => body ?? {} });
  return {
    calls,
    fetch: async (url, init) => {
      const path = url.replace('https://todos.example.com', '');
      calls.push({ method: init.method, path, body: init.body ? JSON.parse(init.body) : undefined });
      if (path === '/api/push/vapid-public-key') {
        return answer(vapid, vapid === 200 ? { 'public-key': 'BAUD' } : { message: 'off' });
      }
      if (init.method === 'POST') {
        return answer(201, { id: 'sub-1' });
      }
      if (init.method === 'DELETE') {
        return answer(204);
      }
      return answer(200, { id: 'sub-1' });
    },
  };
}

/**
 * Set up the subscription sync with fakes.
 * @param {object} [options] overrides
 * @returns {object} the pieces
 */
function setup({ endpoint = null, wanted = true, lead = 15, vapid = 200, session = fakeSession(), registration } = {}) {
  const manager = fakeManager(endpoint);
  const service = fakeService({ vapid });
  const storage = memoryStorage();
  const state = { wanted, lead };
  const push = createPushSubscription({
    session,
    api: createApi({ session, fetch: service.fetch }),
    getRegistration: async () => registration ?? { pushManager: manager },
    wanted: () => state.wanted,
    lead: () => state.lead,
    getStorage: () => storage,
    deviceName: () => 'Chrome on Windows',
  });
  return { push, manager, service, storage, state, session };
}

describe('subscribing to Web Push while connected', () => {
  it('subscribes with the service key and registers the subscription with the lead time and device name', async () => {
    const { push, manager, service } = setup();
    expect(await push.sync()).toBe('on');
    expect(manager.subscribe).toHaveBeenCalledWith({ userVisibleOnly: true, applicationServerKey: expect.any(Uint8Array) });
    expect(service.calls.map((call) => `${call.method} ${call.path}`)).toEqual(['GET /api/push/vapid-public-key', 'POST /api/push-subscriptions']);
    expect(service.calls[1].body).toEqual({
      endpoint: 'https://fcm.googleapis.com/fcm/send/abc',
      keys: { p256dh: 'P256DH', auth: 'AUTH' },
      'lead-minutes': 15,
      'device-name': 'Chrome on Windows',
    });
  });

  it('changes nothing on a repeated sync', async () => {
    const { push, service } = setup();
    await push.sync();
    await push.sync();
    expect(service.calls).toHaveLength(2);
  });

  it('patches the lead time when it changes', async () => {
    const { push, service, state } = setup();
    await push.sync();
    state.lead = 60;
    await push.sync();
    expect(service.calls.at(-1)).toEqual({ method: 'PATCH', path: '/api/push-subscriptions/sub-1', body: { 'lead-minutes': 60 } });
  });

  it('registers an existing browser subscription without subscribing again', async () => {
    const { push, manager, service } = setup({ endpoint: 'https://updates.push.services.mozilla.com/x' });
    await push.sync();
    expect(manager.subscribe).not.toHaveBeenCalled();
    expect(service.calls.map((call) => call.method)).toEqual(['POST']);
  });

  it('sends nothing in local mode and without reminders', async () => {
    const local = setup({ session: fakeSession({ status: 'local', state: () => 'local', token: () => null }) });
    expect(await local.push.sync()).toBe('off');
    const off = setup({ wanted: false });
    expect(await off.push.sync()).toBe('off');
    expect(local.service.calls).toEqual([]);
    expect(off.service.calls).toEqual([]);
    expect(local.manager.subscribe).not.toHaveBeenCalled();
    expect(off.manager.subscribe).not.toHaveBeenCalled();
  });

  it('reports unavailable when the service has no push key, and unsupported without a push manager', async () => {
    const unavailable = setup({ vapid: 503 });
    expect(await unavailable.push.sync()).toBe('unavailable');
    expect(unavailable.manager.subscribe).not.toHaveBeenCalled();
    const unsupported = setup({ registration: {} });
    expect(await unsupported.push.sync()).toBe('unsupported');
    expect(unsupported.service.calls).toEqual([]);
  });

  it('tells the listeners the new status', async () => {
    const { push } = setup();
    const seen = [];
    push.subscribe((status) => seen.push(status));
    await push.sync();
    expect(seen).toEqual(['on']);
    expect(push.status()).toBe('on');
  });
});

describe('unsubscribing from Web Push', () => {
  it('deletes the registration and the browser subscription when reminders turn off', async () => {
    const { push, manager, service, state } = setup();
    await push.sync();
    state.wanted = false;
    expect(await push.sync()).toBe('off');
    expect(service.calls.at(-1)).toEqual({ method: 'DELETE', path: '/api/push-subscriptions/sub-1', body: undefined });
    expect(manager.current()).toBeNull();
  });

  it('deletes on request while the token is still there, as a disconnect does', async () => {
    const { push, manager, service } = setup();
    await push.sync();
    await push.unregister();
    expect(service.calls.at(-1).method).toBe('DELETE');
    expect(manager.current()).toBeNull();
    await push.unregister();
    expect(service.calls.filter((call) => call.method === 'DELETE')).toHaveLength(1);
  });

  it('drops the browser subscription without a request once the session is gone', async () => {
    const session = fakeSession();
    const { push, manager, service } = setup({ session });
    await push.sync();
    const before = service.calls.length;
    session.status = 'sign-in-needed';
    expect(await push.sync()).toBe('off');
    expect(service.calls).toHaveLength(before);
    expect(manager.current()).toBeNull();
  });

  it('takes the registration as gone on a 404', async () => {
    const { push, manager, service, state } = setup();
    await push.sync();
    const fetch = service.fetch;
    service.fetch = async (url, init) => (init.method === 'DELETE' ? { ok: false, status: 404, headers: { get: () => null }, json: async () => ({}) } : fetch(url, init));
    state.wanted = false;
    await push.sync();
    expect(manager.current()).toBeNull();
  });
});

describe('push helpers', () => {
  it('decodes a base64url key to bytes', () => {
    expect([...applicationServerKey('AQID')]).toEqual([1, 2, 3]);
    expect([...applicationServerKey('-_8')]).toEqual([251, 255]);
  });

  it('names the device from the browser and the platform', () => {
    expect(deviceNameOf('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36')).toBe('Chrome on Windows');
    expect(deviceNameOf('Mozilla/5.0 (X11; Linux x86_64; rv:120.0) Gecko/20100101 Firefox/120.0')).toBe('Firefox on Linux');
    expect(deviceNameOf('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605 Version/17.0 Mobile Safari/604.1')).toBe('Safari on iOS');
    expect(deviceNameOf('')).toBe('Web browser');
  });
});
