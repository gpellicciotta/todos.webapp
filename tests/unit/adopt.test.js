import { describe, expect, it } from 'vitest';
import { adopt } from '../../src/js/sync/adopt.js';
import { createApi } from '../../src/js/sync/api.js';
import { createPush } from '../../src/js/sync/push.js';
import { freshStore } from './store-helpers.js';
import { fakeService, fakeSession } from './sync-fake-service.js';

const ACCOUNT = { email: 'ada@example.com', server: 'https://todos.example.com' };

/**
 * Set up a local store, an account on a fake service, and an API client.
 * @param {object} [seed] account rows
 * @returns {Promise<object>} the pieces
 */
async function setup(seed) {
  const { store, clock } = await freshStore({ tracking: () => true });
  const service = fakeService(seed);
  const api = createApi({ session: fakeSession(), fetch: service.fetch });
  return { store, clock, service, api };
}

/**
 * Fill the store with lists, tasks in them, and a note per task.
 * @param {object} store the store
 * @param {number} listCount the number of lists
 * @param {number} taskCount the number of tasks, spread over the lists
 * @returns {Promise<{lists: object[], tasks: object[]}>} the records
 */
async function fill(store, listCount, taskCount) {
  const lists = [];
  for (let i = 0; i < listCount; i++) {
    lists.push(await store.createList({ name: `List ${i}` }));
  }
  const tasks = [];
  for (let i = 0; i < taskCount; i++) {
    tasks.push(await store.createTask({ description: `Task ${i}` }, { lists: [lists[i % listCount].id] }));
    await store.addNote(tasks[i].id, { text: `Note ${i}` });
  }
  return { lists, tasks };
}

describe('adopting local data on first connect', () => {
  it('uploads the occurrence link of each note', async () => {
    const { store, service, api } = await setup();
    const daily = await store.createTask({ description: 'Water', 'lifecycle-rules': { 'recurrence-unit': 'day', 'recurrence-interval': 1, timezone: 'UTC' } });
    await store.addNote(daily.id, { text: 'Linked' });
    await store.addNote(daily.id, { text: 'Whole task', occurrence: null });
    await adopt({ store, api, account: ACCOUNT });
    const posts = service.calls.filter((call) => call.method === 'POST' && call.path.endsWith('/notes'));
    expect(posts.map((call) => [call.body.text, call.body.occurrence])).toEqual([['Linked', 1], ['Whole task', null]]);
  });

  it('merges a local list into the account list with the same name', async () => {
    const { store, service, api } = await setup({ lists: [{ id: 'acct-1', name: 'groceries', description: 'Weekly' }] });
    const local = await store.createList({ name: 'Groceries', description: 'Mine' });
    const first = await store.createTask({ description: 'Milk' }, { lists: [local.id] });
    const second = await store.createTask({ description: 'Eggs' }, { lists: [local.id] });
    await adopt({ store, api, account: ACCOUNT });
    expect(service.lists.size).toBe(1);
    expect(service.calls.some((call) => call.method === 'POST' && call.path === '/api/lists')).toBe(false);
    const adds = service.calls.filter((call) => call.path.startsWith('/api/lists/acct-1/tasks/')).map((call) => call.path.split('/').pop());
    expect(adds).toEqual([first.id, second.id]);
    expect(await store.getList(local.id)).toBeUndefined();
    expect((await store.listMemberships()).map((m) => m['list-id'])).toEqual(['acct-1', 'acct-1']);
    expect((await store.getList('acct-1')).name).toBe('groceries');
    expect(await store.queue.getState('list-map')).toEqual({ [local.id]: 'acct-1' });
  });

  it('renames a local list whose name a trashed account list holds', async () => {
    const { store, service, api } = await setup({
      lists: [{ id: 'acct-1', name: 'Home', 'deletion-time': '2026-11-01T00:00:00Z' }, { id: 'acct-2', name: 'Home (local)' }],
    });
    const local = await store.createList({ name: 'Home' });
    await adopt({ store, api, account: ACCOUNT });
    expect(service.lists.get(local.id).name).toBe('Home (local 2)');
    expect((await store.getList(local.id)).name).toBe('Home (local 2)');
    expect(service.lists.get('acct-1')['deletion-time']).not.toBeNull();
  });

  it('keeps a list whose identifier the account already holds as the same list', async () => {
    const { store, service, api } = await setup();
    const local = await store.createList({ name: 'Home' });
    service.lists.set(local.id, { id: local.id, name: 'Home', 'deletion-time': null, role: 'owner' });
    await adopt({ store, api, account: ACCOUNT });
    expect(service.lists.size).toBe(1);
    expect(await store.getList(local.id)).toBeDefined();
  });

  it('restores a trashed account list whose identifier matches a live local list', async () => {
    const { store, service, api } = await setup();
    const local = await store.createList({ name: 'Home' });
    const task = await store.createTask({ description: 'Paint' }, { lists: [local.id] });
    service.lists.set(local.id, { id: local.id, name: 'Home', 'deletion-time': '2026-11-01T00:00:00Z', role: 'owner' });
    const result = await adopt({ store, api, account: ACCOUNT });
    expect(service.lists.get(local.id)['deletion-time']).toBeNull();
    const restore = service.calls.findIndex((call) => call.method === 'PUT' && call.path === `/api/lists/${local.id}` && call.body['undo-delete']);
    const add = service.calls.findIndex((call) => call.path === `/api/lists/${local.id}/tasks/${task.id}`);
    expect(restore).toBeGreaterThanOrEqual(0);
    expect(restore).toBeLessThan(add);
    expect(service.memberships.has(`${local.id}/${task.id}`)).toBe(true);
    expect(result.rejected).toBe(0);
    expect((await store.getList(local.id))['deletion-time']).toBeNull();
  });

  it('keeps a trashed local list trashed when it matches a trashed account list', async () => {
    const { store, service, api } = await setup();
    const local = await store.createList({ name: 'Home' });
    await store.deleteList(local.id);
    service.lists.set(local.id, { id: local.id, name: 'Home', 'deletion-time': '2026-11-01T00:00:00Z', role: 'owner' });
    await adopt({ store, api, account: ACCOUNT });
    expect(service.calls.some((call) => call.body?.['undo-delete'])).toBe(false);
  });

  it('uploads 5 lists and 34 tasks with their notes and reports the progress', async () => {
    const { store, service, api } = await setup();
    await fill(store, 5, 34);
    const progress = [];
    const result = await adopt({ store, api, account: ACCOUNT, onProgress: (step) => progress.push(step) });
    expect([service.lists.size, service.tasks.size, service.notes.size, service.memberships.size]).toEqual([5, 34, 34, 34]);
    expect(result).toMatchObject({ lists: 5, tasks: 34, rejected: 0 });
    expect(progress.at(-1)).toEqual({ done: 5 + 34 + 34 + 34, total: 5 + 34 + 34 + 34 });
    expect(progress[0].done).toBeLessThan(progress.at(-1).done);
    expect(await store.queue.getState('adoption')).toMatchObject({ status: 'done' });
    expect(await store.queue.getState('account')).toEqual(ACCOUNT);
  });

  it('resumes an interrupted first connect without duplicates', async () => {
    const { store, service, api } = await setup();
    const { tasks } = await fill(store, 5, 34);
    let requests = 0;
    service.fail = (call) => {
      requests += 1;
      return call.method !== 'GET' && requests > 40 ? 'network' : null;
    };
    await expect(adopt({ store, api, account: ACCOUNT })).rejects.toMatchObject({ kind: 'retry' });
    expect(await store.queue.getState('adoption')).toMatchObject({ status: 'running' });
    service.fail = () => null;
    await adopt({ store, api, account: ACCOUNT });
    expect([service.lists.size, service.tasks.size, service.notes.size]).toEqual([5, 34, 34]);
    expect(service.created).toBe(5 + 34 + 34);
    const sent = service.calls.filter((call) => call.method === 'POST' && call.path === '/api/tasks').map((call) => call.body.id);
    expect(new Set(sent)).toEqual(new Set(tasks.map((task) => task.id)));
  });

  it('uploads the memberships of a list in its manual order', async () => {
    const { store, service, api } = await setup();
    const list = await store.createList({ name: 'Home' });
    const a = await store.createTask({ description: 'A' }, { lists: [list.id] });
    const b = await store.createTask({ description: 'B' }, { lists: [list.id] });
    const c = await store.createTask({ description: 'C' }, { lists: [list.id] });
    await store.moveInList(c.id, list.id, { before: a.id });
    await adopt({ store, api, account: ACCOUNT });
    const adds = service.calls.filter((call) => call.path.startsWith(`/api/lists/${list.id}/tasks/`)).map((call) => call.path.split('/').pop());
    expect(adds).toEqual([c.id, a.id, b.id]);
  });

  it('uploads a task with its rules, then replays its user events in order with import', async () => {
    const { store, service, api } = await setup();
    const task = await store.createTask({ description: 'Exercises', 'lifecycle-rules': { 'goal-target': 3 } });
    await store.postEvent(task.id, 'complete');
    await store.postEvent(task.id, 'complete');
    const result = await adopt({ store, api, account: ACCOUNT });
    expect(service.calls.find((call) => call.path === '/api/tasks').body['lifecycle-rules']).toMatchObject({ 'goal-target': 3 });
    const posted = service.calls.filter((call) => call.path === `/api/tasks/${task.id}/events`).map((call) => call.body);
    const local = (await store.eventsOfTask(task.id)).filter((event) => event.type === 'log');
    expect(posted).toEqual(local.map((event) => ({ id: event.id, type: 'log', checked: true, 'creation-time': event['creation-time'], occurrence: 1, import: true })));
    expect(result).toMatchObject({ tasks: 1, events: 2, rejected: 0 });
  });

  it('logs a refused event with its task, so the sync log can name and link it', async () => {
    const { store, service, api } = await setup();
    const task = await store.createTask({ description: 'Exercises' });
    const { event } = await store.postEvent(task.id, 'start');
    service.fail = (call) => (call.path.endsWith('/events') ? 409 : null);
    const result = await adopt({ store, api, account: ACCOUNT });
    expect(result).toMatchObject({ events: 0, rejected: 1 });
    expect((await store.queue.log()).map((record) => record.target)).toEqual([{ type: 'event', id: event.id, 'task-id': task.id }]);
  });

  it('drops queued changes that the upload of the whole local data covers', async () => {
    const { store, api } = await setup();
    await store.createList({ name: 'Home' });
    expect(await store.queue.count()).toBe(1);
    await adopt({ store, api, account: ACCOUNT });
    expect(await store.queue.count()).toBe(0);
  });
});

describe('a local erase waiting for the next connect', () => {
  const ERASED = '2026-11-03T08:00:00.000Z';
  let channels = 0;

  /**
   * Set up a device about to connect to ACCOUNT, with a pending erase and a task created after it.
   * @param {object|null} account the account of the pending erase
   * @returns {Promise<object>} the pieces, with the push engine
   */
  async function connecting(account) {
    const pieces = await setup({ lists: [{ id: 'acct-1', name: 'Old', 'creation-time': '2026-10-01T00:00:00.000Z' }] });
    await pieces.store.queue.setState('pending-erase', { time: ERASED, account });
    const task = await pieces.store.createTask({ description: 'After the erase' });
    const push = createPush({ store: pieces.store, session: fakeSession(), api: pieces.api, locks: null, channelName: `test-erase-${channels++}` });
    return { ...pieces, task, push };
  }

  const eraseCalls = (service) => service.calls.filter((call) => call.method === 'DELETE' && call.path.endsWith('/data'));

  it('erases the same account before adoption, with before set to the saved time', async () => {
    const { store, service, push, task } = await connecting(ACCOUNT);
    expect(await push.drainOnce()).toBe('synced');
    const erase = service.calls.findIndex((call) => call.method === 'DELETE' && call.path === '/api/users/7/data');
    const upload = service.calls.findIndex((call) => call.method === 'POST' && call.path === '/api/tasks');
    expect(erase).toBeGreaterThanOrEqual(0);
    expect(service.calls[erase].query).toEqual({ before: ERASED });
    expect(erase).toBeLessThan(upload);
    expect([...service.lists.keys()]).toEqual([]);
    expect([...service.tasks.keys()]).toEqual([task.id]);
    expect(await store.queue.getState('pending-erase')).toBeNull();
    expect((await store.queue.log()).map((record) => record.kind)).toEqual(['erased']);
  });

  it('asks before erasing another account, and uploads nothing until the answer', async () => {
    const { store, service, push } = await connecting({ email: 'bob@example.com', server: ACCOUNT.server });
    expect(await push.drainOnce()).toBe('paused');
    expect(push.state()).toMatchObject({ status: 'question', erase: { time: ERASED } });
    expect(eraseCalls(service)).toEqual([]);
    expect(service.calls.some((call) => call.method !== 'GET')).toBe(false);
    expect(await store.queue.getState('adoption')).toBeNull();
  });

  it('asks on a device never connected', async () => {
    const { push } = await connecting(null);
    expect(await push.drainOnce()).toBe('paused');
    expect(push.state().status).toBe('question');
  });

  it('leaves the account data alone after Keep, and adopts', async () => {
    const { store, service, push, task } = await connecting(null);
    await push.drainOnce();
    await store.queue.setState('pending-erase', null);
    expect(await push.drainOnce()).toBe('synced');
    expect(eraseCalls(service)).toEqual([]);
    expect([...service.lists.keys()]).toEqual(['acct-1']);
    expect([...service.tasks.keys()]).toEqual([task.id]);
  });

  it('erases after Erase, which names the connected account', async () => {
    const { store, service, push } = await connecting(null);
    await push.drainOnce();
    await store.queue.setState('pending-erase', { time: ERASED, account: ACCOUNT });
    expect(await push.drainOnce()).toBe('synced');
    expect(eraseCalls(service).map((call) => call.query.before)).toEqual([ERASED]);
  });

  it('keeps the pending erase and stops before adoption when the erase fails', async () => {
    const { store, service, push } = await connecting(ACCOUNT);
    service.fail = (call) => (call.path.endsWith('/data') ? 503 : null);
    expect(await push.drainOnce()).toBe('retry');
    expect(await store.queue.getState('pending-erase')).toEqual({ time: ERASED, account: ACCOUNT });
    expect(service.calls.some((call) => call.method === 'POST')).toBe(false);
    expect(await store.queue.getState('adoption')).toBeNull();
  });

  it('keeps a refused erase, stops before adoption, and erases before adoption on a later try', async () => {
    const { store, service, push, task } = await connecting(ACCOUNT);
    service.fail = (call) => (call.path.endsWith('/data') ? 403 : null);
    expect(await push.drainOnce()).toBe('retry');
    expect(push.state()).toMatchObject({ status: 'error', error: expect.stringContaining('HTTP 403') });
    expect(await store.queue.getState('pending-erase')).toEqual({ time: ERASED, account: ACCOUNT });
    expect(service.calls.some((call) => call.method === 'POST')).toBe(false);
    expect(await store.queue.getState('adoption')).toBeNull();
    expect((await store.queue.log()).map((record) => record.kind)).toEqual(['error']);
    service.fail = () => null;
    service.calls.length = 0;
    expect(await push.drainOnce()).toBe('synced');
    const erase = service.calls.findIndex((call) => call.method === 'DELETE' && call.path === '/api/users/7/data');
    const upload = service.calls.findIndex((call) => call.method === 'POST' && call.path === '/api/tasks');
    expect(erase).toBeGreaterThanOrEqual(0);
    expect(erase).toBeLessThan(upload);
    expect([...service.tasks.keys()]).toEqual([task.id]);
    expect(await store.queue.getState('pending-erase')).toBeNull();
  });
});
