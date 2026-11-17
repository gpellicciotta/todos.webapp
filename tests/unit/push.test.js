import { describe, expect, it, vi } from 'vitest';
import { createPush } from '../../src/js/sync/push.js';
import { freshStore } from './store-helpers.js';
import { fakeService, fakeSession } from './sync-fake-service.js';

let channelCount = 0;

/**
 * Create a lock manager stand-in with the exclusive semantics of Web Locks.
 * @returns {{request: Function}} the manager
 */
function fakeLocks() {
  const held = new Set();
  const waiting = [];
  const grant = async (name, callback) => {
    held.add(name);
    try {
      return await callback();
    }
    finally {
      held.delete(name);
      waiting.shift()?.();
    }
  };
  return {
    async request(name, callback) {
      while (held.has(name)) {
        await new Promise((resolve) => waiting.push(resolve));
      }
      return grant(name, callback);
    },
  };
}

/**
 * Set up a connected, adopted store with a push engine in front of a fake service.
 * @param {object} [options] service and engine options
 * @returns {Promise<object>} the pieces
 */
async function setup({ service = fakeService(), ...options } = {}) {
  const { store, clock } = await freshStore({ tracking: () => true });
  await store.queue.setState('account', { email: 'ada@example.com', server: 'https://todos.example.com' });
  await store.queue.setState('adoption', { status: 'done' });
  const session = fakeSession();
  const rejected = [];
  const push = createPush({
    store,
    session,
    fetch: service.fetch,
    channelName: `test-sync-${channelCount++}`,
    onRejected: (info) => rejected.push(info),
    ...options,
  });
  return { store, clock, service, session, push, rejected };
}

describe('uploading the queue', () => {
  it('uploads the changes in their original order and empties the queue', async () => {
    const { store, service, push } = await setup();
    const list = await store.createList({ name: 'Home' });
    const task = await store.createTask({ description: 'Paint' }, { lists: [list.id] });
    await store.updateTask(task.id, { status: 'completed' });
    await store.addNote(task.id, { text: 'Blue' });
    expect(await push.drainOnce()).toBe('synced');
    expect(service.calls.map((call) => `${call.method} ${call.path}`)).toEqual([
      'POST /api/lists', 'POST /api/tasks', `POST /api/tasks/${task.id}/events`, `POST /api/tasks/${task.id}/notes`,
    ]);
    expect(service.calls[1].body.lists).toEqual([list.id]);
    expect(await store.queue.count()).toBe(0);
  });

  it('creates no duplicate list, task, or note when a reply is lost and the entry is retried', async () => {
    const { store, service, push } = await setup();
    const lost = new Set();
    service.fail = (call) => {
      if (call.method === 'POST' && !lost.has(call.path)) {
        lost.add(call.path);
        return 'lost-reply';
      }
      return null;
    };
    const list = await store.createList({ name: 'Home' });
    const task = await store.createTask({ description: 'Paint' }, { lists: [list.id] });
    await store.addNote(task.id, { text: 'Blue' });
    const results = [];
    for (let attempt = 0; attempt < 6 && results.at(-1) !== 'synced'; attempt++) {
      results.push(await push.drainOnce());
    }
    expect(results).toEqual(['retry', 'retry', 'retry', 'synced']);
    expect([service.lists.size, service.tasks.size, service.notes.size]).toEqual([1, 1, 1]);
    expect(service.created).toBe(3);
    expect(await store.queue.count()).toBe(0);
  });

  it('sends only the changed fields of an update, each with its own edit time', async () => {
    const { store, clock, service, push } = await setup();
    const task = await store.createTask({ description: 'Paint' });
    await push.drainOnce();
    clock.tick(60_000);
    const updated = await store.updateTask(task.id, { description: 'Paint it', status: 'ready' });
    await push.drainOnce();
    const update = service.calls.at(-1);
    expect(update.body).toEqual({ description: 'Paint it', 'edit-times': { description: updated['last-update-time'] } });
    expect(Object.keys(update.headers).map((name) => name.toLowerCase())).not.toContain('if-match');
  });

  it('sends the changed note fields of an edit with their edit times', async () => {
    const { store, clock, service, push } = await setup();
    const task = await store.createTask({ description: 'Paint' });
    const note = await store.addNote(task.id, { text: 'Hi' });
    await push.drainOnce();
    clock.tick(60_000);
    const edited = await store.editNote(note.id, { text: 'Hello', occurrence: 1 });
    await push.drainOnce();
    const edit = service.calls.at(-1);
    expect([edit.method, edit.path]).toEqual(['PUT', `/api/tasks/${task.id}/notes/${note.id}`]);
    const time = edited['last-update-time'];
    expect(edit.body).toEqual({ text: 'Hello', occurrence: 1, 'edit-times': { text: time, occurrence: time } });
  });

  it('creates a task with its rules, posts its events in order, and patches its rules', async () => {
    const { store, clock, service, push } = await setup();
    const task = await store.createTask({ description: 'Exercises', 'lifecycle-rules': { 'target-count': 3 } });
    for (let tick = 0; tick < 3; tick++) {
      clock.tick();
      await store.postEvent(task.id, 'complete');
    }
    clock.tick();
    await store.updateRules(task.id, { 'due-time': '2026-11-09T10:00:00Z' });
    expect(await push.drainOnce()).toBe('synced');
    expect(service.calls[0].body['lifecycle-rules']).toMatchObject({ 'target-count': 3, 'due-time': null });
    const events = service.calls.filter((call) => call.path === `/api/tasks/${task.id}/events`);
    expect(events.map((call) => [call.method, call.body.type, call.body['creation-time'], call.body.occurrence])).toEqual([
      ['POST', 'complete', '2026-11-04T09:00:01.000Z', 1],
      ['POST', 'complete', '2026-11-04T09:00:02.000Z', 1],
      ['POST', 'complete', '2026-11-04T09:00:03.000Z', 1],
    ]);
    expect(events.map((call) => call.body.id)).toEqual((await store.eventsOfTask(task.id)).filter((event) => event.type === 'complete').map((event) => event.id));
    const rules = service.calls.at(-1);
    expect([rules.method, rules.path]).toEqual(['PATCH', `/api/tasks/${task.id}/lifecycle-rules`]);
    expect(rules.body).toEqual({ 'due-time': '2026-11-09T10:00:00.000Z', 'edit-times': { 'due-time': '2026-11-04T09:00:04.000Z' } });
    expect(await store.queue.count()).toBe(0);
  });
});

describe('handling replies', () => {
  it('logs the fields a merge overwrote and applies the value the service kept', async () => {
    const { store, service, push, rejected } = await setup();
    const task = await store.createTask({ description: 'Paint' });
    await push.drainOnce();
    await store.updateTask(task.id, { description: 'Paint it' });
    const conflict = { field: 'description', sent: 'Paint it', kept: 'Repaint', 'kept-edit-time': '2026-11-04T10:00:00.000Z' };
    service.fail = (call) => (call.method === 'PUT' ? { status: 200, body: { id: task.id, conflicts: [conflict] } } : null);
    expect(await push.drainOnce()).toBe('synced');
    expect((await store.getTask(task.id)).description).toBe('Repaint');
    expect(rejected).toEqual([]);
    const log = await store.queue.log();
    expect(log).toHaveLength(1);
    expect(log[0]).toMatchObject({ kind: 'overwritten', target: { type: 'task', id: task.id }, field: 'description', sent: 'Paint it', kept: 'Repaint' });
  });

  it.each([400, 403, 409, 412])('reverts a change answered %i and logs it', async (status) => {
    const { store, service, push, rejected } = await setup();
    const task = await store.createTask({ description: 'Paint' });
    await push.drainOnce();
    await store.updateTask(task.id, { description: 'Paint it' });
    service.fail = (call) => (call.method === 'PUT' ? status : null);
    expect(await push.drainOnce()).toBe('synced');
    expect((await store.getTask(task.id)).description).toBe('Paint');
    expect(await store.queue.count()).toBe(0);
    expect(rejected).toHaveLength(1);
    expect((await store.queue.log())[0]).toMatchObject({ kind: 'rejected', status, operation: 'update-task' });
  });

  it('reverts an event answered 409 and logs it like other rejected changes', async () => {
    const { store, service, push, rejected } = await setup();
    const task = await store.createTask({ description: 'Paint' });
    await push.drainOnce();
    await store.updateTask(task.id, { status: 'completed' });
    service.fail = (call) => (call.path.endsWith('/events') ? 409 : null);
    expect(await push.drainOnce()).toBe('synced');
    expect((await store.getTask(task.id))['current-occurrence']).toMatchObject({ status: 'ready', 'completion-count': 0, 'close-time': null });
    expect((await store.eventsOfTask(task.id)).map((event) => event.type)).toEqual(['create']);
    expect(rejected).toHaveLength(1);
    expect((await store.queue.log())[0]).toMatchObject({ kind: 'rejected', status: 409, operation: 'post-event', message: 'The service refused a status change, so it was undone.' });
  });

  it('restores the occurrence when the service refuses every queued tick', async () => {
    const { store, clock, service, push, rejected } = await setup();
    const task = await store.createTask({ description: 'Count', 'lifecycle-rules': { 'target-count': 3 } });
    await push.drainOnce();
    for (let tick = 0; tick < 3; tick++) {
      clock.tick();
      await store.postEvent(task.id, 'complete');
    }
    service.fail = (call) => (call.path.endsWith('/events') ? 403 : null);
    expect(await push.drainOnce()).toBe('synced');
    expect(rejected).toHaveLength(3);
    expect((await store.getTask(task.id))['current-occurrence']).toMatchObject({ 'completion-count': 0, status: 'ready', 'close-time': null });
    expect((await store.eventsOfTask(task.id)).map((event) => event.type)).toEqual(['create']);
  });

  it('removes a rejected create and drops the queued changes that depend on it', async () => {
    const { store, service, push } = await setup();
    const task = await store.createTask({ description: 'Paint' });
    await store.updateTask(task.id, { status: 'completed' });
    await store.addNote(task.id, { text: 'Blue' });
    service.fail = (call) => (call.method === 'POST' ? 403 : null);
    await push.drainOnce();
    expect(await store.getTask(task.id)).toBeUndefined();
    expect(await store.queue.count()).toBe(0);
  });

  it('counts a 404 on a delete as done', async () => {
    const { store, service, push, rejected } = await setup();
    const task = await store.createTask({ description: 'Paint' });
    await push.drainOnce();
    await store.deleteTask(task.id);
    service.fail = (call) => (call.method === 'DELETE' ? 404 : null);
    expect(await push.drainOnce()).toBe('synced');
    expect((await store.getTask(task.id))['deletion-time']).not.toBeNull();
    expect(rejected).toEqual([]);
    expect(await store.queue.log()).toEqual([]);
  });

  it('pauses on 401, expires the session, and keeps the queue', async () => {
    const { store, service, session, push } = await setup();
    await store.createList({ name: 'Home' });
    service.fail = () => 401;
    expect(await push.drainOnce()).toBe('paused');
    expect(session.expired).toBe(1);
    expect(push.state()).toMatchObject({ status: 'sign-in-needed', pending: 1 });
    expect(await store.queue.count()).toBe(1);
  });

  it('stops all syncing on 426 and reports the minimum version', async () => {
    const { store, service, push } = await setup();
    await store.createList({ name: 'Home' });
    service.fail = () => ({ status: 426, headers: { upgrade: 'todos.webapp/1.0.0' } });
    expect(await push.drainOnce()).toBe('stopped');
    expect(push.state()).toMatchObject({ status: 'update-required', minimum: '1.0.0', pending: 1 });
    service.fail = () => null;
    const calls = service.calls.length;
    expect(await push.drainOnce()).toBe('stopped');
    expect(service.calls).toHaveLength(calls);
  });

  it('reports the time of the last sync and the detail of an error for the sync indicator', async () => {
    const { store, service, push } = await setup();
    await store.createList({ name: 'Home' });
    service.fail = () => 503;
    await push.drainOnce();
    expect(push.state()).toMatchObject({ status: 'error', lastSync: null, error: 'The service is unavailable.' });
    service.fail = () => null;
    expect(await push.drainOnce()).toBe('synced');
    expect(push.state()).toMatchObject({ status: 'synced', error: null });
    expect(new Date(push.state().lastSync).getTime()).toBeGreaterThan(0);
  });

  it('retries a failing entry first, keeping the order', async () => {
    const { store, service, push } = await setup();
    await store.createList({ name: 'Home' });
    await store.createList({ name: 'Work' });
    service.fail = () => 503;
    expect(await push.drainOnce()).toBe('retry');
    expect(push.state().status).toBe('error');
    expect(service.calls).toHaveLength(1);
    service.fail = () => 'network';
    expect(await push.drainOnce()).toBe('retry');
    expect(push.state().status).toBe('offline');
    service.fail = () => null;
    expect(await push.drainOnce()).toBe('synced');
    expect(service.calls.slice(-2).map((call) => call.body.name)).toEqual(['Home', 'Work']);
  });
});

describe('one tab syncs', () => {
  it('lets only the lock holder drain the queue while the other tab reads the state', async () => {
    const locks = fakeLocks();
    const service = fakeService();
    const first = await setup({ service, locks, channelName: 'test-sync-shared' });
    const second = createPush({ store: first.store, session: first.session, fetch: service.fetch, locks, channelName: 'test-sync-shared' });
    first.push.start();
    await vi.waitFor(() => expect(first.push.isLeader()).toBe(true));
    second.start();
    await first.store.createList({ name: 'Home' });
    second.kick();
    first.push.kick();
    await vi.waitFor(() => expect(service.calls).toHaveLength(1));
    await vi.waitFor(() => expect(second.state().status).toBe('synced'));
    expect(second.isLeader()).toBe(false);
    expect(service.calls).toHaveLength(1);
    first.push.stop();
    await vi.waitFor(() => expect(second.isLeader()).toBe(true));
    second.stop();
  });
});

describe('purging from the recycle bin', () => {
  it('sends the purge routes and the empty route without a time, in order', async () => {
    const { store, clock, service, push } = await setup();
    const list = await store.createList({ name: 'Home' });
    const one = await store.createTask({ description: 'One' });
    const two = await store.createTask({ description: 'Two' });
    await push.drainOnce();
    await store.deleteList(list.id);
    await store.deleteTask(one.id);
    await store.deleteTask(two.id);
    await store.purgeForever('list', list.id);
    await store.purgeForever('task', one.id);
    clock.tick(5000);
    await store.emptyBin();
    service.calls.length = 0;
    expect(await push.drainOnce()).toBe('synced');
    expect(service.calls.map((call) => `${call.method} ${call.path}`)).toEqual([
      `PUT /api/lists/${list.id}`, `DELETE /api/tasks/${one.id}`, `DELETE /api/tasks/${two.id}`,
      `DELETE /api/recycle-bin/lists/${list.id}`, `DELETE /api/recycle-bin/tasks/${one.id}`, 'DELETE /api/recycle-bin',
    ]);
    expect(service.calls.at(-1).query).toEqual({});
    expect([service.lists.size, service.tasks.size]).toEqual([0, 0]);
    expect(await store.queue.count()).toBe(0);
    expect(await store.queue.log()).toEqual([]);
  });

  it('counts a 404 on a purge as done', async () => {
    const { store, service, push, rejected } = await setup();
    const task = await store.createTask({ description: 'Paint' });
    await push.drainOnce();
    await store.deleteTask(task.id);
    await store.purgeForever('task', task.id);
    service.fail = (call) => (call.path.startsWith('/api/recycle-bin') ? 404 : null);
    expect(await push.drainOnce()).toBe('synced');
    expect(rejected).toEqual([]);
    expect(await store.queue.log()).toEqual([]);
  });

  it('reads a task back, stores it, and logs it when the purge answers 409', async () => {
    const { store, service, push, rejected } = await setup();
    const task = await store.createTask({ description: 'Paint' });
    await push.drainOnce();
    await store.deleteTask(task.id);
    await push.drainOnce();
    await store.purgeForever('task', task.id);
    expect(await store.getTask(task.id)).toBeUndefined();
    const row = service.tasks.get(task.id);
    row['deletion-time'] = null;
    row['current-occurrence'] = task['current-occurrence'];
    expect(await push.drainOnce()).toBe('synced');
    expect(service.calls.map((call) => `${call.method} ${call.path}`).slice(-2)).toEqual([
      `DELETE /api/recycle-bin/tasks/${task.id}`, `GET /api/tasks/${task.id}`,
    ]);
    expect(await store.getTask(task.id)).toMatchObject({ id: task.id, description: 'Paint', 'deletion-time': null });
    expect(await store.queue.count()).toBe(0);
    expect(rejected).toEqual([]);
    expect((await store.queue.log()).map((record) => [record.kind, record.message])).toEqual([
      ['error', 'Not deleted: it was restored on another device.'],
    ]);
  });

  it('reads a list back, stores it, and logs it when the purge answers 409', async () => {
    const { store, service, push } = await setup();
    const list = await store.createList({ name: 'Home' });
    await push.drainOnce();
    await store.deleteList(list.id);
    await push.drainOnce();
    await store.purgeForever('list', list.id);
    service.lists.get(list.id)['deletion-time'] = null;
    expect(await push.drainOnce()).toBe('synced');
    expect(await store.getList(list.id)).toMatchObject({ id: list.id, name: 'Home', 'deletion-time': null });
    expect((await store.queue.log()).map((record) => record.kind)).toEqual(['error']);
  });

  it('drops a purge refused with another 4xx and logs a sync error', async () => {
    const { store, service, push } = await setup();
    const task = await store.createTask({ description: 'Paint' });
    await push.drainOnce();
    await store.deleteTask(task.id);
    await store.purgeForever('task', task.id);
    service.fail = (call) => (call.path.startsWith('/api/recycle-bin') ? 403 : null);
    expect(await push.drainOnce()).toBe('synced');
    expect(await store.queue.count()).toBe(0);
    expect((await store.queue.log()).map((record) => record.kind)).toEqual(['error']);
    expect(await store.getTask(task.id)).toBeUndefined();
  });

  it('keeps the purge while offline and pauses on 401', async () => {
    const { store, service, push } = await setup();
    const task = await store.createTask({ description: 'Paint' });
    await push.drainOnce();
    await store.deleteTask(task.id);
    await store.purgeForever('task', task.id);
    service.fail = () => 'network';
    expect(await push.drainOnce()).toBe('retry');
    expect(await store.queue.count()).toBe(2);
    service.fail = () => 401;
    expect(await push.drainOnce()).toBe('paused');
    expect(await store.queue.count()).toBe(2);
  });
});

describe('purging rows whose creation may have reached the service', () => {
  it.each([['task'], ['list']])('purges a %s whose create reply was lost, so the service keeps no row', async (type) => {
    const { store, service, push } = await setup();
    const row = type === 'task' ? await store.createTask({ description: 'Paint' }) : await store.createList({ name: 'Home' });
    service.fail = (call) => (call.method === 'POST' ? 'lost-reply' : null);
    expect(await push.drainOnce()).toBe('retry');
    expect((type === 'task' ? service.tasks : service.lists).has(row.id)).toBe(true);
    await (type === 'task' ? store.deleteTask(row.id) : store.deleteList(row.id));
    await store.purgeForever(type, row.id);
    service.fail = () => null;
    expect(await push.drainOnce()).toBe('synced');
    expect((type === 'task' ? service.tasks : service.lists).has(row.id)).toBe(false);
    expect(await store.queue.count()).toBe(0);
  });

  it.each([['task'], ['list']])('purges a %s whose create is in flight when it is purged locally', async (type) => {
    const { store, service, push } = await setup();
    const row = type === 'task' ? await store.createTask({ description: 'Paint' }) : await store.createList({ name: 'Home' });
    const rows = type === 'task' ? service.tasks : service.lists;
    let release;
    const gate = new Promise((resolve) => {
      release = resolve;
    });
    const fetchOriginal = service.fetch;
    service.fetch = async (url, init) => {
      if (init?.method === 'POST' && !release.done) {
        release.done = true;
        release.reached = true;
        await gate;
      }
      return fetchOriginal(url, init);
    };
    const drain = createPush({ store, session: fakeSession(), fetch: service.fetch, channelName: `test-sync-${channelCount++}` }).drainOnce();
    await vi.waitFor(() => expect(release.reached).toBe(true));
    await (type === 'task' ? store.deleteTask(row.id) : store.deleteList(row.id));
    await store.purgeForever(type, row.id);
    release();
    await drain;
    expect(await push.drainOnce()).toBe('synced');
    expect(rows.has(row.id)).toBe(false);
    expect(await store.queue.count()).toBe(0);
  });
});

describe('recovering from a refused purge', () => {
  /**
   * Prepare a task that was purged locally while another device restored it, with the recovery read failing once.
   * @param {(call: object) => any} failure how the first read fails
   * @returns {Promise<object>} the pieces and the task
   */
  async function conflicted(failure) {
    const pieces = await setup();
    const { store, service, push } = pieces;
    const task = await store.createTask({ description: 'Paint' });
    await push.drainOnce();
    await store.deleteTask(task.id);
    await push.drainOnce();
    await store.purgeForever('task', task.id);
    Object.assign(service.tasks.get(task.id), { 'deletion-time': null, 'current-occurrence': task['current-occurrence'] });
    let failed = false;
    service.fail = (call) => {
      if (call.method === 'GET' && !failed) {
        failed = true;
        return failure;
      }
      return null;
    };
    return { ...pieces, task };
  }

  it.each([
    ['a network failure', 'network', 'retry'],
    ['a 503', 503, 'retry'],
    ['a 401', 401, 'paused'],
  ])('keeps the purge queued through %s on the read, then recovers the row on the retry', async (_name, failure, outcome) => {
    const { store, service, session, push, task } = await conflicted(failure);
    expect(await push.drainOnce()).toBe(outcome);
    expect(await store.queue.count()).toBe(1);
    expect(await store.queue.log()).toEqual([]);
    expect(await store.getTask(task.id)).toBeUndefined();
    session.status = 'connected';
    expect(await push.drainOnce()).toBe('synced');
    expect(await store.getTask(task.id)).toMatchObject({ description: 'Paint', 'deletion-time': null });
    expect(await store.queue.count()).toBe(0);
    expect((await store.queue.log()).map((record) => record.message)).toEqual(['Not deleted: it was restored on another device.']);
    expect(service.tasks.has(task.id)).toBe(true);
  });
});
