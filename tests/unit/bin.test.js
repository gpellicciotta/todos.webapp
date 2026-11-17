import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { StoreError } from '../../src/js/store/db.js';
import { freshStore } from './store-helpers.js';

const DAY = 86_400_000;
const MISSING = '0192f1a2-0000-7000-8000-00000000ffff';

let store;
let clock;
let factory;
let home;
let work;
let task;

/**
 * Read every record of one object store through a second connection, bypassing the facade.
 * @param {string} name the object store name
 * @returns {Promise<object[]>} the records
 */
function rawAll(name) {
  return new Promise((resolve, reject) => {
    const open = factory.open('test');
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const db = open.result;
      const req = db.transaction([name], 'readonly').objectStore(name).getAll();
      req.onsuccess = () => {
        db.close();
        resolve(req.result);
      };
      req.onerror = () => reject(req.error);
    };
  });
}

/**
 * Expect a promise to reject with a StoreError of the given code.
 * @param {Promise<any>} promise the operation
 * @param {string} code the expected error code
 */
async function expectCode(promise, code) {
  const error = await promise.catch((e) => e);
  expect(error).toBeInstanceOf(StoreError);
  expect(error.code).toBe(code);
}

beforeEach(async () => {
  ({ store, clock, factory } = await freshStore());
  home = await store.createList({ name: 'Home' });
  work = await store.createList({ name: 'Work' });
  task = await store.createTask({ description: 'Fix door' }, { lists: [home.id, work.id] });
  clock.tick();
});

afterEach(() => {
  store.close();
});

describe('deleteList', () => {
  it('moves the list to the bin and hides it from listLists', async () => {
    const deleted = await store.deleteList(home.id);
    expect(deleted).toMatchObject({ 'deletion-time': '2026-11-04T09:00:01.000Z', 'last-update-time': '2026-11-04T09:00:01.000Z' });
    expect((await store.listLists()).map((list) => list.id)).toEqual([work.id]);
    expect(await store.getList(home.id)).toEqual(deleted);
  });

  it('keeps its tasks in their other lists, without changing their activity', async () => {
    await store.deleteList(home.id);
    expect(await store.listsOfTask(task.id)).toEqual([work.id]);
    expect((await store.tasksOfList(work.id)).map((t) => t.id)).toEqual([task.id]);
    expect(await store.getTask(task.id)).toEqual(task);
  });

  it('leaves a task of only that list in no list', async () => {
    const solo = await store.createTask({ description: 'Solo' }, { lists: [home.id] });
    await store.deleteList(home.id);
    expect(await store.listsOfTask(solo.id)).toEqual([]);
    expect((await store.listTasks()).map((t) => t.id)).toContain(solo.id);
  });

  it('keeps the memberships stored but shows no tasks for the deleted list', async () => {
    await store.deleteList(home.id);
    expect(await rawAll('memberships')).toHaveLength(2);
    expect(await store.tasksOfList(home.id)).toEqual([]);
  });

  it('rejects changes to the deleted list', async () => {
    const other = await store.createTask({ description: 'Other' });
    await store.deleteList(home.id);
    await expectCode(store.updateList(home.id, { name: 'House' }), 'deleted');
    await expectCode(store.addToList(other.id, home.id), 'deleted');
    await expectCode(store.removeFromList(task.id, home.id), 'deleted');
    await expectCode(store.createTask({ description: 'New' }, { lists: [home.id] }), 'deleted');
    await expectCode(store.deleteList(home.id), 'deleted');
  });

  it('fails with not-found for an unknown list', async () => {
    await expectCode(store.deleteList(MISSING), 'not-found');
  });
});

describe('deleteTask', () => {
  it('moves the task to the bin and hides it from every list and view', async () => {
    const deleted = await store.deleteTask(task.id);
    expect(deleted).toMatchObject({
      'deletion-time': '2026-11-04T09:00:01.000Z',
      'last-update-time': '2026-11-04T09:00:01.000Z',
    });
    expect(await store.listTasks()).toEqual([]);
    expect(await store.tasksOfList(home.id)).toEqual([]);
    expect(await store.tasksOfList(work.id)).toEqual([]);
    expect(await store.getTask(task.id)).toEqual(deleted);
  });

  it('rejects edits, membership changes, and note changes until restored', async () => {
    const note = await store.addNote(task.id, { text: 'Keep me' });
    const garden = await store.createList({ name: 'Garden' });
    await store.deleteTask(task.id);
    await expectCode(store.updateTask(task.id, { description: 'Changed' }), 'deleted');
    await expectCode(store.addToList(task.id, garden.id), 'deleted');
    await expectCode(store.removeFromList(task.id, home.id), 'deleted');
    await expectCode(store.addNote(task.id, { text: 'New' }), 'deleted');
    await expectCode(store.editNote(note.id, 'Changed'), 'deleted');
    await expectCode(store.deleteNote(note.id), 'deleted');
    await expectCode(store.deleteTask(task.id), 'deleted');
    expect(await store.notesOfTask(task.id)).toEqual([note]);
  });

  it('fails with not-found for an unknown task', async () => {
    await expectCode(store.deleteTask(MISSING), 'not-found');
  });
});

describe('restore', () => {
  it('brings back a task with all its memberships', async () => {
    await store.deleteTask(task.id);
    clock.tick();
    const restored = await store.restoreTask(task.id);
    expect(restored).toMatchObject({
      'deletion-time': null,
      'last-update-time': '2026-11-04T09:00:02.000Z',
    });
    expect((await store.listsOfTask(task.id)).sort()).toEqual([home.id, work.id].sort());
    expect((await store.tasksOfList(home.id)).map((t) => t.id)).toEqual([task.id]);
    await expect(store.updateTask(task.id, { status: 'completed' })).resolves.toMatchObject({ 'current-occurrence': { status: 'completed' } });

  });

  it('brings back a list with all its memberships', async () => {
    await store.deleteList(home.id);
    clock.tick();
    const restored = await store.restoreList(home.id);
    expect(restored).toMatchObject({ 'deletion-time': null, 'last-update-time': '2026-11-04T09:00:02.000Z' });
    expect((await store.listLists()).map((list) => list.id).sort()).toEqual([home.id, work.id].sort());
    expect((await store.tasksOfList(home.id)).map((t) => t.id)).toEqual([task.id]);
    expect((await store.listsOfTask(task.id)).sort()).toEqual([home.id, work.id].sort());
  });

  it('restores within 30 days and rejects later restores as expired', async () => {
    await store.deleteTask(task.id);
    await store.deleteList(home.id);
    clock.tick(30 * DAY);
    await expect(store.restoreTask(task.id)).resolves.toBeTruthy();
    await store.deleteTask(task.id);
    clock.tick(30 * DAY + 1);
    await expectCode(store.restoreTask(task.id), 'expired');
    await expectCode(store.restoreList(home.id), 'expired');
  });

  it('rejects restoring an entry outside the bin, or an unknown one', async () => {
    await expectCode(store.restoreTask(task.id), 'not-deleted');
    await expectCode(store.restoreList(home.id), 'not-deleted');
    await expectCode(store.restoreTask(MISSING), 'not-found');
    await expectCode(store.restoreList(MISSING), 'not-found');
  });
});

describe('listBin', () => {
  it('lists deleted lists and tasks, newest deletion first, with their purge time', async () => {
    await store.deleteList(home.id);
    clock.tick();
    await store.deleteTask(task.id);
    expect(await store.listBin()).toEqual([
      {
        type: 'task', id: task.id, description: 'Fix door',
        'deletion-time': '2026-11-04T09:00:02.000Z', 'purge-time': '2026-12-04T09:00:02.000Z',
      },
      {
        type: 'list', id: home.id, name: 'Home',
        'deletion-time': '2026-11-04T09:00:01.000Z', 'purge-time': '2026-12-04T09:00:01.000Z',
      },
    ]);
  });

  it('is empty when nothing is deleted', async () => {
    expect(await store.listBin()).toEqual([]);
  });
});

describe('purgeForever while tracking', () => {
  /**
   * Open a connected store whose rows were all sent already.
   * @returns {Promise<{store: object, clock: object}>} the store
   */
  async function sent() {
    const tracked = await freshStore({ tracking: () => true });
    return tracked;
  }

  it('queues a purge after the earlier entries of the row, which stay', async () => {
    const tracked = await sent();
    const item = await tracked.store.createTask({ description: 'Paint' });
    await tracked.store.queue.clear();
    await tracked.store.deleteTask(item.id);
    await tracked.store.purgeForever('task', item.id);
    const entries = await tracked.store.queue.all();
    expect(entries.map((entry) => entry.operation)).toEqual(['delete-task', 'purge']);
    expect(entries[1]).toMatchObject({ target: { type: 'task', id: item.id } });
    tracked.store.close();
  });

  it('queues a purge of a list', async () => {
    const tracked = await sent();
    const item = await tracked.store.createList({ name: 'A' });
    await tracked.store.queue.clear();
    await tracked.store.deleteList(item.id);
    await tracked.store.purgeForever('list', item.id);
    expect((await tracked.store.queue.all()).at(-1)).toMatchObject({ operation: 'purge', target: { type: 'list', id: item.id } });
    tracked.store.close();
  });

  it('keeps every earlier entry of a row whose create is still queued, then queues the purge', async () => {
    const tracked = await sent();
    const item = await tracked.store.createTask({ description: 'Paint' });
    await tracked.store.addNote(item.id, { text: 'Blue' });
    await tracked.store.deleteTask(item.id);
    await tracked.store.purgeForever('task', item.id);
    expect((await tracked.store.queue.all()).map((entry) => entry.operation)).toEqual(['create-task', 'create-note', 'delete-task', 'purge']);
    tracked.store.close();
  });
});

describe('purgeForever', () => {
  it('deletes a list and its memberships, never its tasks', async () => {
    await store.deleteList(home.id);
    await store.purgeForever('list', home.id);
    expect(await store.getList(home.id)).toBeUndefined();
    expect((await rawAll('memberships')).map((m) => m['list-id'])).toEqual([work.id]);
    expect(await store.getTask(task.id)).toEqual(task);
    expect(await store.listBin()).toEqual([]);
    await expect(store.createList({ name: 'Home' })).resolves.toBeTruthy();
  });

  it('deletes a task, its memberships, and its notes', async () => {
    const other = await store.createTask({ description: 'Other' }, { lists: [home.id] });
    await store.addNote(other.id, { text: 'Stays' });
    await store.addNote(task.id, { text: 'Goes' });
    await store.deleteTask(task.id);
    await store.purgeForever('task', task.id);
    expect(await store.getTask(task.id)).toBeUndefined();
    expect((await rawAll('memberships')).map((m) => m['task-id'])).toEqual([other.id]);
    expect((await rawAll('notes')).map((n) => n.text)).toEqual(['Stays']);
  });

  it('rejects entries outside the bin, unknown entries, and unknown types', async () => {
    await expectCode(store.purgeForever('task', task.id), 'not-deleted');
    await expectCode(store.purgeForever('list', home.id), 'not-deleted');
    await expectCode(store.purgeForever('task', MISSING), 'not-found');
    await expectCode(store.purgeForever('note', task.id), 'invalid');
  });
});

describe('purgeExpired', () => {
  it('removes entries deleted more than 30 days ago and keeps younger ones', async () => {
    const young = await store.createTask({ description: 'Young' }, { lists: [work.id] });
    await store.deleteList(home.id);
    await store.deleteTask(task.id);
    clock.tick(DAY);
    await store.deleteTask(young.id);
    clock.tick(29 * DAY);

    expect(await store.purgeExpired(new Date(clock.now))).toEqual([]);

    clock.tick(1);
    const purged = await store.purgeExpired(new Date(clock.now));
    expect(purged).toEqual(expect.arrayContaining([{ type: 'list', id: home.id }, { type: 'task', id: task.id }]));
    expect(purged).toHaveLength(2);
    expect(await store.getList(home.id)).toBeUndefined();
    expect(await store.getTask(task.id)).toBeUndefined();
    expect(await rawAll('memberships')).toEqual([expect.objectContaining({ 'list-id': work.id, 'task-id': young.id })]);
    expect((await store.listBin()).map((entry) => entry.id)).toEqual([young.id]);
  });

  it('uses the store clock by default', async () => {
    await store.deleteTask(task.id);
    clock.tick(30 * DAY + 1);
    expect(await store.purgeExpired()).toEqual([{ type: 'task', id: task.id }]);
  });
});

describe('emptyBin', () => {
  it('removes every deleted list and task with memberships and notes, and keeps live records', async () => {
    const live = await store.createTask({ description: 'Live' }, { lists: [work.id] });
    await store.addNote(task.id, { text: 'Remember the key' });
    await store.deleteList(home.id);
    await store.deleteTask(task.id);

    const purged = await store.emptyBin();

    expect(purged).toEqual(expect.arrayContaining([{ type: 'list', id: home.id }, { type: 'task', id: task.id }]));
    expect(purged).toHaveLength(2);
    expect(await store.listBin()).toEqual([]);
    expect(await store.getTask(task.id)).toBeUndefined();
    expect(await rawAll('notes')).toEqual([]);
    expect(await rawAll('memberships')).toEqual([expect.objectContaining({ 'list-id': work.id, 'task-id': live.id })]);
    expect((await store.listLists()).map((list) => list.id)).toEqual([work.id]);
  });

  it('returns an empty array and changes nothing for an empty bin', async () => {
    const heard = [];
    store.subscribe((change) => heard.push(change.operation));
    expect(await store.emptyBin()).toEqual([]);
    expect((await store.listLists()).map((list) => list.id)).toEqual([home.id, work.id]);
    expect(heard).toEqual(['emptyBin']);
  });

  it('tells subscribers once for a non-empty bin', async () => {
    await store.deleteTask(task.id);
    const heard = [];
    store.subscribe((change) => heard.push(change.operation));
    await store.emptyBin();
    expect(heard).toEqual(['emptyBin']);
  });

  it('queues one empty-bin entry with the emptying time while tracking, after the earlier entries', async () => {
    const tracked = await freshStore({ tracking: () => true });
    const list = await tracked.store.createList({ name: 'A' });
    await tracked.store.deleteList(list.id);
    await tracked.store.queue.remove((await tracked.store.queue.all()).filter((entry) => entry.operation === 'create-list').map((entry) => entry.seq));
    const before = (await tracked.store.queue.all()).length;
    tracked.clock.tick(5000);
    await tracked.store.emptyBin();
    const entries = await tracked.store.queue.all();
    expect(entries).toHaveLength(before + 1);
    expect(entries.at(-1)).toMatchObject({ operation: 'empty-bin', fields: { time: new Date(tracked.clock.now).toISOString() } });
    tracked.store.close();
  });

  it('keeps the entries of a row whose create is still queued, and queues empty-bin after them', async () => {
    const tracked = await freshStore({ tracking: () => true });
    const list = await tracked.store.createList({ name: 'A' });
    await tracked.store.deleteList(list.id);
    await tracked.store.emptyBin();
    expect((await tracked.store.queue.all()).map((entry) => entry.operation)).toEqual(['create-list', 'delete-list', 'empty-bin']);
    tracked.store.close();
  });

  it('queues nothing in local mode', async () => {
    const list = await store.createList({ name: 'A' });
    await store.deleteList(list.id);
    await store.purgeForever('list', list.id);
    await store.emptyBin();
    expect(await store.queue.count()).toBe(0);
  });

  it('removes nothing when a removal fails part way', async () => {
    const { IDBKeyRange } = await import('fake-indexeddb');
    let calls = 0;
    const keyRange = {
      bound: (...args) => {
        calls += 1;
        if (calls === 3) {
          throw new Error('disk full');
        }
        return IDBKeyRange.bound(...args);
      },
    };
    const other = await freshStore({ keyRange });
    const a = await other.store.createList({ name: 'A' });
    const b = await other.store.createList({ name: 'B' });
    const t1 = await other.store.createTask({ description: 'T' }, { lists: [a.id] });
    await other.store.deleteList(a.id);
    await other.store.deleteList(b.id);
    await other.store.deleteTask(t1.id);

    await expect(other.store.emptyBin()).rejects.toThrow('disk full');

    expect((await other.store.listBin()).map((entry) => entry.id).sort()).toEqual([a.id, b.id, t1.id].sort());
    expect(await other.store.listMemberships()).toEqual([expect.objectContaining({ 'list-id': a.id, 'task-id': t1.id })]);
    other.store.close();
  });
});

describe('deleteAllData', () => {
  it('erases lists, tasks, memberships, notes, and bin entries, and returns the counts', async () => {
    await store.addNote(task.id, { text: 'Remember the key' });
    await store.deleteTask(task.id);
    await store.createTask({ description: 'Live' }, { lists: [work.id] });

    expect(await store.deleteAllData()).toEqual({ lists: 2, tasks: 2 });

    for (const name of ['lists', 'tasks', 'memberships', 'notes']) {
      expect(await rawAll(name)).toEqual([]);
    }
    expect(await store.listBin()).toEqual([]);
  });

  it('leaves the sync stores alone', async () => {
    await store.queue.setState('user-id', 7);
    await store.deleteAllData();
    expect(await store.queue.getState('user-id')).toBe(7);
  });

  it('returns zero counts on a fresh store and tells subscribers once', async () => {
    const fresh = await freshStore();
    const heard = [];
    fresh.store.subscribe((change) => heard.push(change.operation));
    expect(await fresh.store.deleteAllData()).toEqual({ lists: 0, tasks: 0 });
    expect(heard).toEqual(['deleteAllData']);
    fresh.store.close();
  });

  it('erases nothing when a clear fails part way', async () => {
    let calls = 0;
    const { IDBObjectStore: FakeObjectStore } = await import('fake-indexeddb');
    const clear = FakeObjectStore.prototype.clear;
    FakeObjectStore.prototype.clear = function failing(...args) {
      calls += 1;
      if (calls === 3) {
        throw new Error('disk full');
      }
      return clear.apply(this, args);
    };
    try {
      await expect(store.deleteAllData()).rejects.toThrow('disk full');
    }
    finally {
      FakeObjectStore.prototype.clear = clear;
    }
    expect((await store.listLists()).map((list) => list.id)).toEqual([home.id, work.id]);
    expect(await store.getTask(task.id)).toBeDefined();
  });
});

describe('restoreEntries', () => {
  it('restores the given entries with memberships in one write, leaving other entries in the bin', async () => {
    const other = await store.createTask({ description: 'Other' }, { lists: [home.id] });
    await store.deleteTask(task.id);
    await store.deleteList(home.id);
    await store.deleteTask(other.id);
    clock.tick();
    const heard = [];
    store.subscribe((change) => heard.push(change.operation));
    const result = await store.restoreEntries([{ type: 'task', id: task.id }, { type: 'list', id: home.id }]);
    expect(result.restored.map(({ type, id }) => ({ type, id }))).toEqual([{ type: 'task', id: task.id }, { type: 'list', id: home.id }]);
    expect(result.skipped).toEqual([]);
    expect(heard).toEqual(['restoreEntries']);
    expect((await store.listBin()).map((entry) => entry.id)).toEqual([other.id]);
    expect((await store.listsOfTask(task.id)).sort()).toEqual([home.id, work.id].sort());
  });

  it('skips expired, missing, and not deleted entries, and restores the rest', async () => {
    const fresh = await store.createTask({ description: 'Fresh' });
    await store.deleteTask(task.id);
    clock.tick(30 * DAY + 1);
    await store.deleteTask(fresh.id);
    const result = await store.restoreEntries([
      { type: 'task', id: task.id }, { type: 'task', id: fresh.id }, { type: 'task', id: MISSING }, { type: 'list', id: work.id },
    ]);
    expect(result.restored.map((item) => item.id)).toEqual([fresh.id]);
    expect(result.skipped.map((item) => item.id).sort()).toEqual([task.id, MISSING, work.id].sort());
    expect((await store.listBin()).map((entry) => entry.id)).toEqual([task.id]);
  });

  it('restores nothing when a write fails part way', async () => {
    await store.deleteTask(task.id);
    await store.deleteList(home.id);
    await expectCode(store.restoreEntries([{ type: 'list', id: home.id }, { type: 'note', id: task.id }]), 'invalid');
    expect((await store.listBin()).map((entry) => entry.id).sort()).toEqual([task.id, home.id].sort());
  });

  it('queues one restore per restored entry while tracking, and nothing for skipped ones', async () => {
    const tracked = await freshStore({ tracking: () => true });
    const a = await tracked.store.createList({ name: 'A' });
    const t = await tracked.store.createTask({ description: 'T' });
    await tracked.store.deleteList(a.id);
    await tracked.store.deleteTask(t.id);
    await tracked.store.queue.clear();
    await tracked.store.restoreEntries([{ type: 'list', id: a.id }, { type: 'task', id: t.id }, { type: 'task', id: MISSING }]);
    expect((await tracked.store.queue.all()).map((entry) => [entry.operation, entry.target.id])).toEqual([['restore-list', a.id], ['restore-task', t.id]]);
    tracked.store.close();
  });
});

describe('purgeEntries', () => {
  it('purges the given entries with memberships and notes, and nothing else', async () => {
    const other = await store.createTask({ description: 'Other' }, { lists: [work.id] });
    await store.addNote(task.id, { text: 'Goes' });
    await store.addNote(other.id, { text: 'Stays' });
    await store.deleteTask(task.id);
    await store.deleteTask(other.id);
    await store.deleteList(home.id);
    const heard = [];
    store.subscribe((change) => heard.push(change.operation));
    const purged = await store.purgeEntries([{ type: 'task', id: task.id }, { type: 'list', id: home.id }]);
    expect(purged).toEqual([{ type: 'task', id: task.id }, { type: 'list', id: home.id }]);
    expect(heard).toEqual(['purgeEntries']);
    expect((await store.listBin()).map((entry) => entry.id)).toEqual([other.id]);
    expect((await rawAll('notes')).map((n) => n.text)).toEqual(['Stays']);
    expect((await rawAll('memberships')).map((m) => m['task-id'])).toEqual([other.id]);
    expect(await store.getTask(task.id)).toBeUndefined();
  });

  it('skips entries that are not in the bin, and rejects unknown types', async () => {
    await store.deleteTask(task.id);
    expect(await store.purgeEntries([{ type: 'task', id: MISSING }, { type: 'list', id: home.id }, { type: 'task', id: task.id }])).toEqual([{ type: 'task', id: task.id }]);
    expect(await store.getList(home.id)).toBeTruthy();
    await expectCode(store.purgeEntries([{ type: 'note', id: task.id }]), 'invalid');
  });

  it('queues one purge per purged entry while tracking', async () => {
    const tracked = await freshStore({ tracking: () => true });
    const a = await tracked.store.createList({ name: 'A' });
    const t = await tracked.store.createTask({ description: 'T' });
    await tracked.store.deleteList(a.id);
    await tracked.store.deleteTask(t.id);
    await tracked.store.queue.clear();
    await tracked.store.purgeEntries([{ type: 'list', id: a.id }, { type: 'task', id: t.id }]);
    expect((await tracked.store.queue.all()).map((entry) => [entry.operation, entry.target.type, entry.target.id])).toEqual([['purge', 'list', a.id], ['purge', 'task', t.id]]);
    tracked.store.close();
  });

  it('queues nothing in local mode', async () => {
    await store.deleteTask(task.id);
    await store.purgeEntries([{ type: 'task', id: task.id }]);
    expect(await store.queue.count()).toBe(0);
  });
});
