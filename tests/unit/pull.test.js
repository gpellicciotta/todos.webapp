import { describe, expect, it } from 'vitest';
import { createApi, SyncStop } from '../../src/js/sync/api.js';
import { createPull } from '../../src/js/sync/pull.js';
import { freshStore } from './store-helpers.js';
import { fakeFeed } from './sync-fake-feed.js';
import { fakeSession } from './sync-fake-service.js';

const T0 = '2026-11-04T09:00:00.000Z';
const ACCOUNT = { email: 'ada@example.com', server: 'https://todos.example.com' };

/**
 * Set up a connected store with a pull in front of a fake feed.
 * @param {object} [options] pull options and the service
 * @returns {Promise<object>} the pieces
 */
async function setup({ service = fakeFeed(), ...options } = {}) {
  const { store, clock } = await freshStore({ tracking: () => true });
  await store.queue.setState('account', ACCOUNT);
  await store.queue.setState('adoption', { status: 'done' });
  const session = fakeSession();
  const api = createApi({ session, fetch: service.fetch });
  const lost = [];
  const pull = createPull({ store, session, api, onLostAccess: (info) => lost.push(info), ...options });
  return { store, clock, service, session, pull, lost };
}

const listRow = (id, name = `List ${id}`) => ({ id, name, 'creation-time': T0, 'last-update-time': T0 });
const taskRow = (id, extra = {}) => ({ id, description: `Task ${id}`, 'creation-time': T0, 'owner-id': 7, ...extra });

describe('downloading the change feed', () => {
  it('downloads everything the account can see and stores the cursor and the user', async () => {
    const { store, service, pull } = await setup();
    service.lists.set('l1', { ...listRow('l1'), owner: { id: 7 }, role: 'owner', 'deletion-time': null, sharing: [], 'edit-times': {}, revision: 101 });
    service.tasks.set('t1', { ...taskRow('t1'), status: 'todo', 'due-time': null, 'overdue-handling': 'keep', 'deletion-time': null, 'edit-times': {}, revision: 102 });
    service.memberships.set('l1/t1', { 'list-id': 'l1', 'task-id': 't1', position: 'a0', revision: 103 });
    service.notes.set('n1', { id: 'n1', 'task-id': 't1', 'author-id': 7, text: 'Hi', 'creation-time': T0, 'last-edit-time': T0, revision: 104 });
    service.revision = 104;
    await pull.pullOnce();
    expect((await store.getList('l1')).revision).toBe(101);
    expect((await store.getTask('t1')).revision).toBe(102);
    expect((await store.listMemberships())).toHaveLength(1);
    expect((await store.notesOfTask('t1'))[0].text).toBe('Hi');
    expect(await store.queue.getState('cursor')).toEqual({ account: ACCOUNT, value: 'c104' });
    expect(await store.queue.getState('user-id')).toBe(7);
  });

  it('asks only for changes after the stored cursor', async () => {
    const { store, service, pull } = await setup();
    await store.createList({ name: 'Home' });
    await pull.pullOnce();
    service.calls.length = 0;
    await pull.pullOnce();
    expect(service.calls.map((call) => call.path)).toEqual(['/api/changes?page-size=200&cursor=c100']);
  });

  it('follows pages until has-more is false and keeps a task whose membership arrives on a later page', async () => {
    const { store, service, pull } = await setup({ pageSize: 1 });
    service.lists.set('l1', { ...listRow('l1'), owner: { id: 9 }, role: 'task-editor', 'deletion-time': null, sharing: [], 'edit-times': {}, revision: 100 });
    service.seedTask(taskRow('theirs', { 'owner-id': 9 }), ['l1']);
    const result = await pull.pullOnce();
    expect(result.pages).toBe(3);
    expect((await store.listTasks()).map((task) => task.id)).toEqual(['theirs']);
  });

  it('applies a change from another device without a reload', async () => {
    const { store, service, pull } = await setup();
    service.seedTask(taskRow('t1'), []);
    await pull.pullOnce();
    const row = service.tasks.get('t1');
    row.description = 'Edited elsewhere';
    row.revision = ++service.revision;
    const events = [];
    store.subscribe((change) => events.push(change.operation));
    await pull.pullOnce();
    expect((await store.getTask('t1')).description).toBe('Edited elsewhere');
    expect(events).toContain('applyChanges');
  });

  it('keeps a pending local field over the pulled value', async () => {
    const { store, service, pull } = await setup();
    service.seedTask(taskRow('t1'), []);
    await pull.pullOnce();
    await store.updateTask('t1', { status: 'completed' });
    const row = service.tasks.get('t1');
    Object.assign(row, { description: 'Remote text', status: 'cancelled', revision: ++service.revision });
    await pull.pullOnce();
    expect(await store.getTask('t1')).toMatchObject({ description: 'Remote text', status: 'completed' });
  });

  it('writes nothing when the feed holds no change', async () => {
    const { store, pull } = await setup();
    await pull.pullOnce();
    const events = [];
    store.subscribe((change) => events.push(change.operation));
    await pull.pullOnce();
    expect(events).toEqual([]);
  });
});

describe('lost access', () => {
  it('removes the list and the tasks owned by others, keeps own tasks, and reports the undone changes', async () => {
    const { store, service, pull, lost } = await setup();
    service.lists.set('l1', { ...listRow('l1', 'Garden'), owner: { id: 9 }, role: 'task-editor', 'deletion-time': null, sharing: [], 'edit-times': {}, revision: 101 });
    service.seedTask(taskRow('theirs', { 'owner-id': 9 }), ['l1']);
    service.seedTask(taskRow('mine'), ['l1']);
    await pull.pullOnce();
    await store.updateTask('theirs', { status: 'completed' });
    await store.updateTask('mine', { status: 'completed' });
    service.revoke('l1');
    await pull.pullOnce();
    expect(await store.getList('l1')).toBeUndefined();
    expect((await store.listTasks()).map((task) => task.id)).toEqual(['mine']);
    expect(lost).toEqual([{ list: 'Garden', undone: 1, message: 'You no longer have access to Garden. 1 change was undone.' }]);
    expect((await store.queue.all()).map((entry) => entry.target.id)).toEqual(['mine']);
    expect((await store.queue.log()).filter((record) => record.kind === 'lost-access')).toMatchObject([{ target: { type: 'list', id: 'l1' }, name: 'Garden', undone: 1 }]);
  });

  it('words the message for several undone changes', async () => {
    const { store, service, pull, lost } = await setup();
    service.lists.set('l1', { ...listRow('l1', 'Garden'), owner: { id: 9 }, role: 'task-editor', 'deletion-time': null, sharing: [], 'edit-times': {}, revision: 101 });
    service.seedTask(taskRow('theirs', { 'owner-id': 9 }), ['l1']);
    await pull.pullOnce();
    await store.updateTask('theirs', { status: 'completed' });
    await store.updateTask('theirs', { description: 'Changed' });
    service.revoke('l1');
    await pull.pullOnce();
    expect(lost[0].message).toBe('You no longer have access to Garden. 2 changes were undone.');
  });
});

describe('an expired cursor', () => {
  it('keeps the queue, drops service rows, keeps never-uploaded rows, and fetches a new snapshot', async () => {
    const { store, service, pull } = await setup();
    service.seedTask(taskRow('t1'), []);
    await pull.pullOnce();
    const draft = await store.createTask({ description: 'Draft' });
    service.purge('task', 't1');
    service.expire();
    service.seedTask(taskRow('t2'), []);
    await store.updateTask(draft.id, { status: 'completed' });
    await pull.pullOnce();
    expect((await store.listTasks()).map((task) => task.id).sort()).toEqual([draft.id, 't2'].sort());
    expect(await store.queue.count()).toBe(2);
    expect((await store.queue.getState('cursor')).value).toBe(`c${service.revision}`);
  });

  it('resets without a message for a 410', async () => {
    const { service, pull } = await setup();
    await pull.pullOnce();
    service.revision += 5;
    service.expire();
    const result = await pull.pullOnce();
    expect(result.reset).toBe(true);
  });

  it('gives up when a snapshot itself answers 410', async () => {
    const { service, pull } = await setup();
    service.fail = () => 410;
    await expect(pull.pullOnce()).rejects.toMatchObject({ kind: 'retry' });
  });
});

describe('sync protocol', () => {
  it('stops with an upgrade request for a protocol other than 1', async () => {
    const { store, pull } = await setup({ service: fakeFeed({ protocol: 2 }) });
    await expect(pull.pullOnce()).rejects.toBeInstanceOf(SyncStop);
    await expect(pull.pullOnce()).rejects.toMatchObject({ kind: 'upgrade' });
    expect(await store.queue.getState('cursor')).toBeNull();
  });

  it('asks to sign in again on a 401', async () => {
    const { service, pull } = await setup();
    service.fail = () => 401;
    await expect(pull.pullOnce()).rejects.toMatchObject({ kind: 'auth' });
  });
});

describe('disconnecting', () => {
  it('keeps own lists and tasks, removes the rest, drops the cursor, and calls no route', async () => {
    const { store, service, pull } = await setup();
    service.lists.set('l1', { ...listRow('l1'), owner: { id: 7 }, role: 'owner', 'deletion-time': null, sharing: [], 'edit-times': {}, revision: 101 });
    service.lists.set('l2', { ...listRow('l2'), owner: { id: 9 }, role: 'viewer', 'deletion-time': null, sharing: [], 'edit-times': {}, revision: 102 });
    service.seedTask(taskRow('mine'), ['l1', 'l2']);
    service.seedTask(taskRow('theirs', { 'owner-id': 9 }), ['l2']);
    await pull.pullOnce();
    await store.updateTask('mine', { status: 'completed' });
    service.calls.length = 0;
    await pull.disconnect();
    expect((await store.listLists()).map((list) => list.id)).toEqual(['l1']);
    expect((await store.listTasks()).map((task) => task.id)).toEqual(['mine']);
    expect((await store.getTask('mine')).revision).toBeUndefined();
    expect(await store.queue.getState('cursor')).toBeNull();
    expect(await store.queue.getState('adoption')).toBeNull();
    expect(await store.queue.count()).toBe(0);
    expect(service.calls).toEqual([]);
  });
});
