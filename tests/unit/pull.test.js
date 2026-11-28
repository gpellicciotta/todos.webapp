import { describe, expect, it } from 'vitest';
import { createApi, SyncStop } from '../../src/js/sync/api.js';
import { adopt } from '../../src/js/sync/adopt.js';
import { createPull } from '../../src/js/sync/pull.js';
import { freshStore } from './store-helpers.js';
import { fakeFeed, serviceTask } from './sync-fake-feed.js';
import { fakeService, fakeSession } from './sync-fake-service.js';

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
    service.tasks.set('t1', { ...serviceTask(taskRow('t1')), 'edit-times': {}, revision: 102 });
    service.memberships.set('l1/t1', { 'list-id': 'l1', 'task-id': 't1', position: 'a0', revision: 103 });
    service.notes.set('n1', { id: 'n1', 'task-id': 't1', 'owner-id': 7, text: 'Hi', occurrence: null, 'creation-time': T0, 'last-update-time': T0, revision: 104 });
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

  it('stores the pulled entries as events, undoes one locally, and drops one that another device undid', async () => {
    const { store, service, pull } = await setup();
    service.seedTask(taskRow('t1', { 'lifecycle-rules': { 'goal-target': 3 } }), []);
    const log = (id, time) => ({ id, 'task-id': 't1', occurrence: 1, 'creation-time': time, 'owner-id': 7, type: 'log', checked: true });
    service.events.set('e1', log('e1', '2026-11-04T10:00:00.000Z'));
    service.events.set('e2', log('e2', '2026-11-04T11:00:00.000Z'));
    Object.assign(service.tasks.get('t1')['current-occurrence'], { progress: 2, status: 'in-progress' });
    service.tasks.get('t1').revision = ++service.revision;
    await pull.pullOnce();
    expect((await store.eventsOfTask('t1')).map((event) => event.id)).toEqual(['e1', 'e2']);
    expect((await store.getTask('t1'))['current-occurrence']).toMatchObject({ progress: 2, 'goal-target': 3 });
    await store.undoLog('t1', 'e1');
    service.events.set('u2', { id: 'u2', 'task-id': 't1', occurrence: 1, 'creation-time': '2026-11-04T12:00:00.000Z', type: 'undo-log', 'target-event-id': 'e2' });
    service.tasks.get('t1').revision = ++service.revision;
    await pull.pullOnce();
    expect((await store.eventsOfTask('t1')).filter((event) => event.type === 'log').map((event) => event.id)).toEqual(['e1']);
  });

  it('embeds the live entries on the pulled current occurrence, also after folding a queued check onto it', async () => {
    const { store, service, pull } = await setup();
    service.seedTask(taskRow('t1', { 'lifecycle-rules': { 'goal-target': 3 } }), []);
    service.events.set('e1', { id: 'e1', 'task-id': 't1', occurrence: 1, 'creation-time': '2026-11-04T10:00:00.000Z', 'owner-id': 7, type: 'log', checked: true });
    Object.assign(service.tasks.get('t1')['current-occurrence'], { progress: 1, status: 'in-progress' });
    service.tasks.get('t1').revision = ++service.revision;
    await pull.pullOnce();
    expect((await store.getTask('t1'))['current-occurrence'].entries.map((entry) => entry.id)).toEqual(['e1']);
    await store.logEntry('t1', { checked: true });
    service.tasks.get('t1').revision = ++service.revision;
    await pull.pullOnce();
    const current = (await store.getTask('t1'))['current-occurrence'];
    expect(current.progress).toBe(2);
    expect(current.entries.map((entry) => entry['task-id'])).toEqual(['t1', 't1']);
  });

  it('takes the pulled fields and folds a pending event onto the pulled occurrence', async () => {
    const { store, service, pull } = await setup();
    service.seedTask(taskRow('t1', { 'lifecycle-rules': { 'goal-target': 2 } }), []);
    await pull.pullOnce();
    await store.postEvent('t1', 'complete');
    const row = service.tasks.get('t1');
    // The service holds the entry behind its progress, which the feed lists.
    service.events.set('e0', { id: 'e0', 'task-id': 't1', occurrence: 1, 'creation-time': '2026-11-04T08:00:00.000Z', 'owner-id': 7, type: 'log', checked: true });
    const ticked = { ...row['current-occurrence'], status: 'in-progress', progress: 1 };
    Object.assign(row, { description: 'Remote text', 'current-occurrence': ticked, revision: ++service.revision });
    await pull.pullOnce();
    expect(await store.getTask('t1')).toMatchObject({
      description: 'Remote text', 'current-occurrence': { status: 'completed', progress: 2, 'close-time': expect.any(String) },
    });

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
    expect((await store.queue.all()).map((entry) => entry.target['task-id'])).toEqual(['mine']);

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

  it('saves the account as the last account, which outlives the disconnect', async () => {
    const { store, pull } = await setup();
    await pull.disconnect();
    expect(await store.queue.getState('account')).toBeNull();
    expect(await store.queue.getState('last-account')).toEqual(ACCOUNT);
  });

  it('takes the last account from an unfinished adoption when no adoption finished', async () => {
    const { store, pull } = await setup();
    await store.queue.setState('account', null);
    await store.queue.setState('adoption', { status: 'running', account: ACCOUNT, done: 0, total: 3 });
    await pull.disconnect();
    expect(await store.queue.getState('last-account')).toEqual(ACCOUNT);
  });

  it('turns a queued erase into a pending erase with the entry time and the account', async () => {
    const { store, clock, pull } = await setup();
    await store.createTask({ description: 'Gone' });
    clock.tick(5000);
    await store.deleteAllData();
    const [entry] = await store.queue.all();
    clock.tick(5000);
    await store.createTask({ description: 'Kept' });
    await pull.disconnect();
    expect(await store.queue.count()).toBe(0);
    expect(await store.queue.getState('pending-erase')).toEqual({ time: entry.fields.time, account: ACCOUNT });
  });

  it('saves no pending erase when no erase is queued', async () => {
    const { store, pull } = await setup();
    await store.createTask({ description: 'Kept' });
    await pull.disconnect();
    expect(await store.queue.getState('pending-erase')).toBeNull();
  });

  it('keeps a status set on another device through a disconnect and the next adoption (CON-8, CON-4)', async () => {
    const { store, service, pull } = await setup();
    const done = { occurrence: 1, 'start-time': T0, 'due-time': null, 'goal-target': 1, progress: 1, status: 'completed', 'close-time': T0 };
    service.seedTask(taskRow('t1', { 'current-occurrence': done }), []);
    await pull.pullOnce();
    await pull.disconnect();
    expect(await store.getTask('t1')).toMatchObject({ 'owner-id': null, 'current-occurrence': { status: 'completed' } });

    const upload = fakeService();
    await adopt({ store, api: createApi({ session: fakeSession(), fetch: upload.fetch }), account: ACCOUNT });
    const posted = upload.calls.filter((call) => call.path === '/api/tasks/t1/events').map((call) => call.body.type);
    expect(posted).toEqual(['log']);
  });
});

describe('a fresh download after an upgrade', () => {
  it('replaces a stale task with the service copy once, which a delta download never does', async () => {
    const { store, service, pull } = await setup();
    service.seedTask(taskRow('t1'), []);
    await pull.pullOnce();
    // The service completed the task before the cursor; the local copy lost that, as the version 6 upgrade did.
    const row = service.tasks.get('t1');
    row['current-occurrence'] = { ...row['current-occurrence'], progress: 1, status: 'completed' };
    const draft = await store.createTask({ description: 'Draft' });
    await pull.pullOnce();
    expect((await store.getTask('t1'))['current-occurrence']).toMatchObject({ progress: 0, status: 'ready' });
    await store.queue.setState('resync', true);
    const result = await pull.pullOnce();
    expect(result.reset).toBe(true);
    expect((await store.getTask('t1'))['current-occurrence']).toMatchObject({ progress: 1, status: 'completed' });
    expect((await store.listTasks()).map((task) => task.id).sort()).toEqual([draft.id, 't1'].sort());
    expect(await store.queue.getState('resync') ?? null).toBeNull();
    service.calls.length = 0;
    expect((await pull.pullOnce()).reset).toBe(false);
    expect(service.calls[0].path).toContain('cursor=');
  });
});
