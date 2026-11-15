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
    expect(events.map((call) => call.body.id)).toEqual((await store.eventsOfTask(task.id)).slice(1).map((event) => event.id));
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
