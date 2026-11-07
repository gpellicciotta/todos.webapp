import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { writeServerUrl } from '../../src/js/core/preferences.js';
import { createApi } from '../../src/js/sync/api.js';
import { createEngine } from '../../src/js/sync/engine.js';
import { createSession } from '../../src/js/sync/session.js';
import { freshStore } from '../unit/store-helpers.js';
import { serverDir, startStack } from './server.js';

/**
 * Contract tests: the sync client against a real todos server on an in-memory database.
 * They run only when `TODOS_SERVER_DIR` names a todos checkout: `TODOS_SERVER_DIR=../todos npm run test:contract`.
 * Mocked REST tests (tests/unit) cannot see the server change; these show protocol drift before a release.
 */

const DIR = serverDir();
const ACCOUNTS = [
  { code: 'code-ada', id: 101, name: 'Ada', email: 'ada@example.com' },
  { code: 'code-root', id: 102, name: 'Root', email: 'root@example.com', admin: true },
];
let channelCount = 0;

/**
 * Keep a storage in memory, like `localStorage`.
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

describe.skipIf(!DIR)('the sync client against a real todos server', () => {
  let stack;

  beforeAll(async () => {
    stack = await startStack({ dir: DIR, accounts: ACCOUNTS });
  });

  afterAll(async () => {
    await stack?.stop();
  });

  /**
   * Count every request, and record the responses of the feed, so a test can see a `410`.
   * @returns {Function & {statuses: number[], count: number}} the fetch
   */
  function recordingFetch() {
    const record = async (url, init) => {
      record.count += 1;
      const response = await fetch(url, init);
      if (new URL(url).pathname === '/api/changes') {
        record.statuses.push(response.status);
      }
      return response;
    };
    record.statuses = [];
    record.count = 0;
    return record;
  }

  /**
   * Open a device that signed in as an account, through the real Auth routes of the server.
   * @param {string} code the authorization code the Auth stand-in grants
   * @param {{version?: string, localData?: (store: object) => Promise<void>}} [options] a client version, and local data to adopt
   * @returns {Promise<object>} the device: `store`, `clock`, `session`, `engine`, `fetch`, and `raw` for direct calls
   */
  async function device(code, { version, localData } = {}) {
    const { store, clock } = await freshStore({ tracking: () => true });
    clock.now = Date.now() - 3_600_000;
    await localData?.(store);
    const storage = memoryStorage();
    writeServerUrl(stack.url, () => storage);
    const fetchRecorded = recordingFetch();
    const session = createSession({ getStorage: () => storage, fetch: fetchRecorded });
    const started = new URL(session.start({ returnUrl: 'http://127.0.0.1/' }));
    await session.complete(code, started.searchParams.get('app-state'));
    const api = createApi({ session, fetch: fetchRecorded, ...(version ? { version } : {}) });
    const engine = createEngine({ store, session, fetch: fetchRecorded, api, locks: null, win: null, doc: null, channelName: `contract-${channelCount++}` });
    const raw = (method, path, headers = {}) => fetch(`${stack.url}${path}`, { method, headers: { Authorization: `Bearer ${session.token()}`, ...headers } });
    return { store, clock, session, engine, fetch: fetchRecorded, raw };
  }

  /**
   * Read what the server holds for a device's account.
   * @param {object} who the device
   * @returns {Promise<{lists: object[], tasks: object[], memberships: object[], notes: object[]}>} the snapshot
   */
  async function serverState(who) {
    const response = await who.raw('GET', '/api/changes?page-size=1000', { Accept: 'application/json' });
    expect(response.status).toBe(200);
    return response.json();
  }

  it('signs in through the Auth routes of the server', async () => {
    const ada = await device('code-ada');
    expect(ada.session.state()).toBe('connected');
    expect(ada.session.account()).toMatchObject({ email: 'ada@example.com', server: stack.url });
  });

  it('adopts local lists and tasks on first connect, merges same-named lists, and repeats without duplicates', async () => {
    const first = await device('code-ada', {
      localData: async (store) => {
        const list = await store.createList({ name: 'Groceries' });
        await store.createTask({ description: 'Milk' }, { lists: [list.id] });
      },
    });
    expect(await first.engine.syncNow()).toBe('synced');
    const [accountList] = (await serverState(first)).lists;

    const second = await device('code-ada', {
      localData: async (store) => {
        const groceries = await store.createList({ name: 'groceries' });
        await store.createTask({ description: 'Eggs' }, { lists: [groceries.id] });
        const garden = await store.createList({ name: 'Garden' });
        await store.createTask({ description: 'Mow' }, { lists: [garden.id] });
      },
    });
    expect(await second.engine.syncNow()).toBe('synced');
    const counts = (state) => [state.lists.length, state.tasks.length, state.memberships.length];
    const uploaded = await serverState(second);
    expect(counts(uploaded)).toEqual([2, 3, 3]);
    expect(uploaded.lists.filter((list) => list.name.toLowerCase() === 'groceries').map((list) => list.id)).toEqual([accountList.id]);
    expect((await second.store.listLists()).map((list) => list.name).sort()).toEqual(['Garden', 'Groceries']);

    await second.store.queue.setState('adoption', null);
    expect(await second.engine.syncNow()).toBe('synced');
    expect(counts(await serverState(second))).toEqual([2, 3, 3]);
  });

  // The server started with --memory-db answers 500 to a new note: its ToDo's repository does not know the users of its Auth repository.
  // This test passes while that holds; it turns red once the todos task T0207 fixes it, so then replace `it.fails` with `it`.
  it.fails('uploads a note with its task on first connect', async () => {
    const ada = await device('code-ada', {
      localData: async (store) => {
        const list = await store.createList({ name: 'Notes' });
        const task = await store.createTask({ description: 'Annotated' }, { lists: [list.id] });
        await store.addNote(task.id, { text: 'Free range' });
      },
    });
    expect(await ada.engine.syncNow()).toBe('synced');
    expect((await serverState(ada)).notes).toHaveLength(1);
  });

  it('merges edits of two devices: different fields both survive, and the later edit of one field wins', async () => {
    const phone = await device('code-ada');
    const laptop = await device('code-ada');
    const list = await phone.store.createList({ name: 'Merge' });
    const task = await phone.store.createTask({ description: 'Paint', status: 'todo' }, { lists: [list.id] });
    await phone.engine.syncNow();
    await laptop.engine.syncNow();

    phone.clock.tick(60_000);
    laptop.clock.tick(120_000);
    await phone.store.updateTask(task.id, { description: 'Paint the door' });
    await laptop.store.updateTask(task.id, { status: 'in-progress' });
    await phone.engine.syncNow();
    await laptop.engine.syncNow();
    await phone.engine.syncNow();
    for (const who of [phone, laptop]) {
      expect(await who.store.getTask(task.id)).toMatchObject({ description: 'Paint the door', status: 'in-progress' });
    }

    phone.clock.tick(60_000);
    laptop.clock.tick(180_000);
    await phone.store.updateTask(task.id, { description: 'Paint the fence' });
    await laptop.store.updateTask(task.id, { description: 'Paint the shed' });
    await laptop.engine.syncNow();
    await phone.engine.syncNow();
    await laptop.engine.syncNow();
    for (const who of [phone, laptop]) {
      expect((await who.store.getTask(task.id)).description).toBe('Paint the shed');
    }
    const overwritten = (await phone.store.queue.log()).filter((record) => record.kind === 'overwritten');
    expect(overwritten).toHaveLength(1);
    expect(overwritten[0]).toMatchObject({ field: 'description', sent: 'Paint the fence', kept: 'Paint the shed' });
  });

  it('delivers a purged list as a tombstone', async () => {
    const ada = await device('code-ada');
    const root = await device('code-root');
    const list = await ada.store.createList({ name: 'Doomed' });
    const task = await ada.store.createTask({ description: 'Short-lived' }, { lists: [list.id] });
    await ada.engine.syncNow();
    const before = (await ada.store.queue.getState('cursor')).value;

    expect((await root.raw('DELETE', `/api/lists/${list.id}`)).status).toBe(200);
    const feed = await (await ada.raw('GET', `/api/changes?cursor=${before}`, { Accept: 'application/json' })).json();
    expect(feed.tombstones).toEqual([expect.objectContaining({ type: 'list', id: list.id, reason: 'purged' })]);

    expect(await ada.engine.syncNow()).toBe('synced');
    expect(await ada.store.getList(list.id)).toBeUndefined();
    // A purge deletes the list and its memberships, never its tasks.
    expect(await ada.store.listsOfTask(task.id)).toEqual([]);
    expect(await ada.store.getTask(task.id)).toMatchObject({ description: 'Short-lived' });
  });

  it('answers 410 to an expired cursor, and the client fetches a new snapshot', async () => {
    const ada = await device('code-ada');
    const list = await ada.store.createList({ name: 'Cursor' });
    await ada.engine.syncNow();
    const stored = await ada.store.queue.getState('cursor');
    const [user, kind, revision] = Buffer.from(stored.value, 'base64url').toString().split(':');
    const forged = Buffer.from([user, kind, Number(revision) + 100_000].join(':')).toString('base64url');

    const refused = await ada.raw('GET', `/api/changes?cursor=${forged}`, { Accept: 'application/json' });
    expect(refused.status).toBe(410);

    await ada.store.queue.setState('cursor', { ...stored, value: forged });
    ada.fetch.statuses.length = 0;
    expect(await ada.engine.syncNow()).toBe('synced');
    expect(ada.fetch.statuses).toEqual([410, 200]);
    expect((await ada.store.queue.getState('cursor')).value).not.toBe(forged);
    expect(await ada.store.getList(list.id)).toMatchObject({ name: 'Cursor' });
  });

  it('answers 426 to a client below the minimum version, and the client stops syncing', async () => {
    const stale = await device('code-ada', { version: '0.0.1' });
    const refused = await stale.raw('GET', '/api/lists', { 'Client-Version': 'todos.webapp/0.0.1' });
    expect(refused.status).toBe(426);
    expect(refused.headers.get('upgrade')).toBe('todos.webapp/0.1.0');

    expect(await stale.engine.syncNow()).toBe('stopped');
    expect(stale.engine.state()).toMatchObject({ status: 'update-required', minimum: '0.1.0' });
    const requests = stale.fetch.count;
    expect(await stale.engine.syncNow()).toBe('stopped');
    expect(stale.fetch.count).toBe(requests);
  });
});
