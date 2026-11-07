import { describe, expect, it, vi } from 'vitest';
import { createEngine } from '../../src/js/sync/engine.js';
import { freshStore } from './store-helpers.js';
import { fakeFeed } from './sync-fake-feed.js';
import { fakeSession } from './sync-fake-service.js';

let channelCount = 0;
const ACCOUNT = { email: 'ada@example.com', server: 'https://todos.example.com' };

/**
 * Create a lock manager stand-in with exclusive semantics; `hold` takes a lock that never releases.
 * @returns {{request: Function, hold: Function}} the manager
 */
function fakeLocks() {
  const held = new Set();
  const waiting = [];
  return {
    hold: (name) => held.add(name),
    async request(name, callback) {
      while (held.has(name)) {
        await new Promise((resolve) => waiting.push(resolve));
      }
      held.add(name);
      try {
        return await callback();
      }
      finally {
        held.delete(name);
        waiting.shift()?.();
      }
    },
  };
}

/**
 * Create a window and document stand-in that dispatch events and report visibility.
 * @returns {{win: EventTarget, doc: EventTarget & {visibilityState: string}}} the pair
 */
function fakeDom() {
  const win = new EventTarget();
  const doc = Object.assign(new EventTarget(), { visibilityState: 'visible' });
  return { win, doc };
}

/**
 * Open a connected, adopted device on a service.
 * @param {object} service the fake feed
 * @param {object} [options] engine options
 * @returns {Promise<object>} the pieces
 */
async function device(service, options = {}) {
  const { store, clock } = await freshStore({ tracking: () => true });
  await store.queue.setState('account', ACCOUNT);
  await store.queue.setState('adoption', { status: 'done' });
  const session = options.session ?? fakeSession();
  const dom = fakeDom();
  const engine = createEngine({
    store, session, fetch: service.fetch, channelName: `test-engine-${channelCount++}`, locks: null, ...dom, ...options,
  });
  return { store, clock, session, engine, ...dom };
}

const changesCalls = (service) => service.calls.filter((call) => call.path.startsWith('/api/changes'));

describe('the sync state', () => {
  it('reports local-only without an account', async () => {
    const service = fakeFeed();
    const { engine, session } = await device(service);
    session.status = 'local';
    expect(engine.state().status).toBe('local-only');
  });

  it('reports synced after a sync, and pulls after the queue was replayed', async () => {
    const service = fakeFeed();
    const { engine, store } = await device(service);
    await store.createTask({ description: 'Paint' });
    expect(await engine.syncNow()).toBe('synced');
    expect(engine.state()).toMatchObject({ status: 'synced', pending: 0 });
    expect(service.calls.map((call) => `${call.method} ${call.path}`)).toEqual([
      'POST /api/tasks', 'GET /api/users/me', 'GET /api/changes?page-size=200',
    ]);
  });

  it('reports offline when the network fails', async () => {
    const service = fakeFeed();
    service.fail = () => 'network';
    const { engine } = await device(service);
    expect(await engine.syncNow()).toBe('retry');
    expect(engine.state().status).toBe('offline');
  });

  it('reports sign-in-needed after a 401', async () => {
    const service = fakeFeed();
    service.fail = () => 401;
    const { engine, session } = await device(service);
    expect(await engine.syncNow()).toBe('paused');
    expect(engine.state().status).toBe('sign-in-needed');
    expect(session.expired).toBe(1);
  });

  it('reports update-required and stops syncing for protocol 2', async () => {
    const service = fakeFeed({ protocol: 2 });
    const { engine } = await device(service);
    expect(await engine.syncNow()).toBe('stopped');
    expect(engine.state().status).toBe('update-required');
    const calls = service.calls.length;
    expect(await engine.syncNow()).toBe('stopped');
    expect(service.calls.length).toBe(calls);
  });

  it('reports error and logs the same failure once', async () => {
    const service = fakeFeed();
    const { engine, store } = await device(service);
    vi.spyOn(console, 'error').mockImplementation(() => {});
    store.queue.setState = () => Promise.reject(new Error('disk full'));
    expect(await engine.syncNow()).toBe('retry');
    expect(await engine.syncNow()).toBe('retry');
    expect(engine.state().status).toBe('error');
    expect((await store.queue.log()).filter((record) => record.kind === 'error')).toMatchObject([{ detail: 'disk full' }]);
    vi.restoreAllMocks();
  });
});

describe('polling', () => {
  it('polls every 30 seconds while the tab leads', async () => {
    const service = fakeFeed();
    const waits = [];
    const release = [];
    const wait = (ms) => new Promise((resolve) => {
      waits.push(ms);
      release.push(resolve);
    });
    const { engine } = await device(service, { wait });
    engine.start();
    await vi.waitFor(() => expect(waits).toEqual([30_000]));
    expect(changesCalls(service)).toHaveLength(1);
    release.shift()();
    await vi.waitFor(() => expect(changesCalls(service)).toHaveLength(2));
    engine.stop();
  });

  it('does not poll in a tab that does not lead', async () => {
    const service = fakeFeed();
    const locks = fakeLocks();
    locks.hold('todos-sync');
    const { engine } = await device(service, { locks, wait: () => new Promise(() => {}) });
    engine.start();
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(service.calls).toEqual([]);
    expect(engine.state().leader).toBe(false);
    engine.stop();
  });

  it('polls again after going online, gaining focus, and becoming visible', async () => {
    const service = fakeFeed();
    const { engine, win, doc } = await device(service, { wait: () => new Promise(() => {}) });
    engine.start();
    await vi.waitFor(() => expect(changesCalls(service)).toHaveLength(1));
    win.dispatchEvent(new Event('online'));
    await vi.waitFor(() => expect(changesCalls(service)).toHaveLength(2));
    win.dispatchEvent(new Event('focus'));
    await vi.waitFor(() => expect(changesCalls(service)).toHaveLength(3));
    doc.dispatchEvent(new Event('visibilitychange'));
    await vi.waitFor(() => expect(changesCalls(service)).toHaveLength(4));
    engine.stop();
  });

  it('does not pull while the page is hidden, but still replays the queue', async () => {
    const service = fakeFeed();
    const { engine, store, doc } = await device(service);
    doc.visibilityState = 'hidden';
    await store.createTask({ description: 'Paint' });
    await engine.syncNow();
    expect(service.calls.map((call) => call.method)).toEqual(['POST']);
  });
});

describe('disconnecting', () => {
  it('removes data of others and drops the cursor once the session turns local', async () => {
    const service = fakeFeed();
    const base = { 'creation-time': '2026-11-04T09:00:00.000Z' };
    service.lists.set('l1', { id: 'l1', name: 'Shared', description: '', owner: { id: 9 }, role: 'viewer', ...base, 'last-update-time': base['creation-time'], 'deletion-time': null, sharing: [], 'edit-times': {}, revision: 101 });
    service.seedTask({ id: 'theirs', description: 'Theirs', 'owner-id': 9, ...base }, ['l1']);
    service.seedTask({ id: 'mine', description: 'Mine', 'owner-id': 7, ...base }, []);
    const listeners = new Set();
    const session = fakeSession({ subscribe: (callback) => listeners.add(callback) && (() => listeners.delete(callback)) });
    const { engine, store } = await device(service, { session, wait: () => new Promise(() => {}) });
    engine.start();
    await vi.waitFor(() => expect(engine.state().status).toBe('synced'));
    expect((await store.listTasks()).map((task) => task.id).sort()).toEqual(['mine', 'theirs']);
    const calls = service.calls.length;
    session.status = 'local';
    listeners.forEach((callback) => callback('local'));
    await vi.waitFor(async () => expect((await store.listTasks()).map((task) => task.id)).toEqual(['mine']));
    expect(await store.listLists()).toEqual([]);
    expect(await store.queue.getState('cursor')).toBeNull();
    expect(service.calls.length).toBe(calls);
    engine.stop();
  });
});

describe('two devices', () => {
  it('converge after concurrent edits to different and to the same fields', async () => {
    const service = fakeFeed();
    const a = await device(service);
    const b = await device(service);
    const list = await a.store.createList({ name: 'Home' });
    const task = await a.store.createTask({ description: 'Paint' }, { lists: [list.id] });
    await a.engine.syncNow();
    await b.engine.syncNow();
    expect((await b.store.getTask(task.id)).description).toBe('Paint');

    a.clock.tick(1000);
    b.clock.tick(5000);
    await a.store.updateTask(task.id, { description: 'Paint the door', status: 'in-progress' });
    await b.store.updateTask(task.id, { status: 'completed', 'due-time': '2026-12-01T10:00:00.000Z' });
    await b.engine.syncNow();
    await a.engine.syncNow();
    await b.engine.syncNow();

    const [mine, theirs] = [await a.store.getTask(task.id), await b.store.getTask(task.id)];
    for (const row of [mine, theirs]) {
      expect(row).toMatchObject({ description: 'Paint the door', status: 'completed', 'due-time': '2026-12-01T10:00:00.000Z' });
    }
    expect(mine.revision).toBe(theirs.revision);
    const lost = (await a.store.queue.log()).filter((record) => record.kind === 'overwritten');
    expect(lost).toMatchObject([{ field: 'status', sent: 'in-progress', kept: 'completed' }]);
  });
});
