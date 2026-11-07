import { describe, expect, it } from 'vitest';
import { adopt } from '../../src/js/sync/adopt.js';
import { createApi } from '../../src/js/sync/api.js';
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

  it('drops queued changes that the upload of the whole local data covers', async () => {
    const { store, api } = await setup();
    await store.createList({ name: 'Home' });
    expect(await store.queue.count()).toBe(1);
    await adopt({ store, api, account: ACCOUNT });
    expect(await store.queue.count()).toBe(0);
  });
});
