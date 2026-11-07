import { describe, expect, it } from 'vitest';
import { AuthError, exchangeCode, readReturn, signInUrl } from '../../src/js/sync/auth.js';
import { createSession } from '../../src/js/sync/session.js';
import { freshStore } from './store-helpers.js';

const SERVER = 'https://todos.pellicciotta.com';
const START = Date.UTC(2026, 10, 4, 9, 0, 0);

/**
 * Create an in-memory storage stand-in.
 * @returns {Storage & {data: Map<string, string>}} the storage
 */
function memoryStorage() {
  const data = new Map();
  return {
    data,
    getItem: (key) => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => data.set(key, String(value)),
    removeItem: (key) => data.delete(key),
  };
}

/**
 * Create a fake fetch that answers like Auth and ToDo's, and records every call.
 * @param {{callbackStatus?: number, fail?: boolean, json?: boolean}} [options] the callback status, a network failure, or a JSON callback answer
 * @returns {Function & {calls: {url: string, init: object}[]}} the fetch
 */
function fakeFetch({ callbackStatus = 200, fail = false, json = false } = {}) {
  const calls = [];
  const answer = (status, body = {}, url = '') => ({ ok: status < 300, status, url, json: async () => body });
  const fetch = async (url, init = {}) => {
    calls.push({ url, init });
    if (fail) {
      throw new TypeError('Failed to fetch');
    }
    const { pathname } = new URL(url);
    if (pathname === '/api/auth-token/callback' && json) {
      // The service answers 200 with JSON and no redirect.
      return answer(callbackStatus, callbackStatus === 200 ? { email: 'jane@example.com', 'one-time-passcode': '123456' } : {}, url);
    }
    if (pathname === '/api/auth-token/callback') {
      // A followed redirect reports the landing address; a refusal reports the callback's own.
      return answer(callbackStatus, {}, callbackStatus === 200 ? `${SERVER}/sign-in?opc=123456&email=jane%40example.com` : url);
    }
    if (pathname === '/api/auth-token' && init.method === 'POST') {
      return answer(200, { id: 7, 'bearer-token': 'session-1', 'expiration-time': '2026-11-05T09:00:00Z', 'user-id': 3, email: 'jane@example.com' });
    }
    if (pathname === '/api/users/me') {
      return answer(200, { id: 3, name: 'Jane Doe', email: 'jane@example.com' });
    }
    return answer(204);
  };
  fetch.calls = calls;
  return fetch;
}

/**
 * Create a session over a storage, a fetch, and a controllable clock.
 * @param {object} [options] overrides
 * @returns {{session: object, storage: Storage, fetch: Function, clock: {now: number}}} the parts
 */
function setup({ storage = memoryStorage(), fetch = fakeFetch(), clock = { now: START } } = {}) {
  const session = createSession({ getStorage: () => storage, fetch, now: () => clock.now });
  return { session, storage, fetch, clock };
}

/**
 * Sign in through a started sign-in and a returned code.
 * @param {object} session the session
 * @returns {Promise<object>} the account
 */
function signIn(session) {
  session.start({ returnUrl: 'https://app.example/#/connect' });
  return session.complete('auth-code-1');
}

describe('the Auth adapter', () => {
  it('builds the sign-in URL with the app name, the return URL, and the logo', () => {
    const url = new URL(signInUrl('https://app.example/#/connect', { logoUrl: 'https://app.example/img/app-icon-192.png' }));
    expect(url.origin + url.pathname).toBe('https://auth.pellicciotta.com/sign-in');
    expect(url.searchParams.get('app-name')).toBe('todos');
    expect(url.searchParams.get('app-redirect-url')).toBe('https://app.example/#/connect');
    expect(url.searchParams.get('app-logo-url')).toBe('https://app.example/img/app-icon-192.png');
  });

  it('reads the code or the error that Auth appends to the connect route, and nothing else', () => {
    expect(readReturn('#/connect?authorization-code=a%2Bb')).toEqual({ code: 'a+b' });
    expect(readReturn('#/connect?error=denied')).toEqual({ error: 'denied' });
    expect(readReturn('#/connect')).toBeNull();
    expect(readReturn('#/tasks?authorization-code=x')).toBeNull();
  });

  it('exchanges the code at the callback, then signs in with the one-time passcode', async () => {
    const fetch = fakeFetch();
    const result = await exchangeCode(SERVER, 'auth-code-1', fetch);
    expect(result).toEqual({ token: 'session-1', expiry: '2026-11-05T09:00:00Z', user: { name: 'Jane Doe', email: 'jane@example.com' } });
    expect(fetch.calls[0].url).toBe(`${SERVER}/api/auth-token/callback?authorization-code=auth-code-1`);
    expect(fetch.calls[1].init.headers.Authorization).toBe(`Basic ${btoa('jane@example.com:123456')}`);
    expect(fetch.calls[2].init.headers.Authorization).toBe('Bearer session-1');
  });

  it('reads the one-time passcode from the JSON answer of the callback', async () => {
    const fetch = fakeFetch({ json: true });
    const result = await exchangeCode(SERVER, 'auth-code-1', fetch);
    expect(result).toEqual({ token: 'session-1', expiry: '2026-11-05T09:00:00Z', user: { name: 'Jane Doe', email: 'jane@example.com' } });
    expect(fetch.calls[1].init.headers.Authorization).toBe(`Basic ${btoa('jane@example.com:123456')}`);
    await expect(exchangeCode(SERVER, 'c', fakeFetch({ json: true, callbackStatus: 403 }))).rejects.toMatchObject({ reason: 'not-invited' });
  });

  it('reports a 403 as not invited, a 401 as rejected, and a failed request as a network problem', async () => {
    await expect(exchangeCode(SERVER, 'c', fakeFetch({ callbackStatus: 403 }))).rejects.toMatchObject({ reason: 'not-invited' });
    await expect(exchangeCode(SERVER, 'c', fakeFetch({ callbackStatus: 401 }))).rejects.toMatchObject({ reason: 'rejected' });
    await expect(exchangeCode(SERVER, 'c', fakeFetch({ fail: true }))).rejects.toBeInstanceOf(AuthError);
    await expect(exchangeCode(SERVER, 'c', fakeFetch({ fail: true }))).rejects.toMatchObject({ reason: 'network' });
  });
});

describe('the session', () => {
  it('starts local and sends no request', () => {
    const { session, fetch } = setup();
    expect(session.state()).toBe('local');
    expect(session.token()).toBeNull();
    expect(session.account()).toBeNull();
    expect(fetch.calls).toEqual([]);
  });

  it('stores the token and the account after sign-in, and reads them back in a new session', async () => {
    const { session, storage, fetch } = setup();
    const url = new URL(session.start({ returnUrl: 'https://app.example/#/connect' }));
    expect(url.searchParams.get('app-redirect-url')).toBe('https://app.example/#/connect');
    const changes = [];
    session.subscribe((state) => changes.push(state));
    await expect(session.complete('auth-code-1')).resolves.toEqual({ name: 'Jane Doe', email: 'jane@example.com', server: SERVER });
    expect(session.state()).toBe('connected');
    expect(session.token()).toBe('session-1');
    expect(changes).toEqual(['connected']);
    const again = setup({ storage, fetch }).session;
    expect(again.state()).toBe('connected');
    expect(again.token()).toBe('session-1');
    expect(again.account()).toEqual({ name: 'Jane Doe', email: 'jane@example.com', server: SERVER });
  });

  it('accepts a returned code only after a sign-in started on this device within 15 minutes', async () => {
    const { session, fetch, clock } = setup();
    await expect(session.complete('crafted')).rejects.toMatchObject({ reason: 'not-started' });
    session.start({ returnUrl: 'https://app.example/#/connect' });
    clock.now += 16 * 60 * 1000;
    await expect(session.complete('late')).rejects.toMatchObject({ reason: 'not-started' });
    expect(fetch.calls).toEqual([]);
    expect(session.state()).toBe('local');
  });

  it('turns to sign in needed once the token expires, removing the stored token but keeping the account', async () => {
    const { session, storage, clock } = setup();
    await signIn(session);
    clock.now = Date.parse('2026-11-05T09:00:01Z');
    expect(session.state()).toBe('sign-in-needed');
    expect(session.token()).toBeNull();
    expect(session.account()?.email).toBe('jane@example.com');
    expect(storage.getItem('todos.session')).not.toContain('session-1');
  });

  it('expires on request, as after a 401, and stores no token any more', async () => {
    const { session, storage } = setup();
    await signIn(session);
    session.expire();
    expect(session.state()).toBe('sign-in-needed');
    expect(storage.getItem('todos.session')).not.toContain('session-1');
  });

  it('keeps local operations working while sign in is needed', async () => {
    const { store } = await freshStore();
    const { session, fetch } = setup();
    await signIn(session);
    session.expire();
    const callsBefore = fetch.calls.length;
    const task = await store.createTask({ description: 'Water the plants' });
    expect((await store.getTask(task.id)).description).toBe('Water the plants');
    expect(session.state()).toBe('sign-in-needed');
    expect(fetch.calls.length).toBe(callsBefore);
    store.close();
  });

  it('deletes the token on disconnect, ends the server session, and returns to local', async () => {
    const { session, storage, fetch } = setup();
    await signIn(session);
    await session.disconnect();
    expect(session.state()).toBe('local');
    expect(storage.getItem('todos.session')).toBeNull();
    const last = fetch.calls.at(-1);
    expect([last.url, last.init.method, last.init.headers.Authorization]).toEqual([`${SERVER}/api/auth-token`, 'DELETE', 'Bearer session-1']);
  });

  it('deletes the token even when the server cannot be reached', async () => {
    const storage = memoryStorage();
    const { session } = setup({ storage });
    await signIn(session);
    const offline = setup({ storage, fetch: fakeFetch({ fail: true }) }).session;
    await offline.disconnect();
    expect(offline.state()).toBe('local');
    expect(storage.getItem('todos.session')).toBeNull();
  });

  it('captures the returned code from the address and strips it before routing', async () => {
    const { session } = setup();
    const win = { location: { hash: '#/connect?authorization-code=auth-code-1' }, history: { replaceState: (state, title, url) => (win.location.hash = url) } };
    expect(session.capture(win)).toBe(true);
    expect(win.location.hash).toBe('#/connect');
    session.start({ returnUrl: 'https://app.example/#/connect' });
    await expect(session.finish()).resolves.toMatchObject({ email: 'jane@example.com' });
    expect(session.finish()).toBeNull();
  });
});
