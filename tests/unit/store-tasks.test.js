import { IDBFactory, IDBKeyRange } from 'fake-indexeddb';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { openStore, ValidationError } from '../../src/js/store/db.js';
import { freshStore } from './store-helpers.js';

let store;
let clock;
let factory;

beforeEach(async () => {
  ({ store, clock, factory } = await freshStore());
});

afterEach(() => {
  store.close();
});

describe('createTask', () => {
  it('defaults to status todo and overdue handling keep', async () => {
    const task = await store.createTask({ description: 'Buy paint' });
    expect(task).toMatchObject({
      description: 'Buy paint',
      status: 'todo',
      'due-time': null,
      'overdue-handling': 'keep',
      'creation-time': '2026-11-04T09:00:00.000Z',
      'last-update-time': '2026-11-04T09:00:00.000Z',
      'last-activity-time': '2026-11-04T09:00:00.000Z',
      'deletion-time': null,
    });
    expect(task.id[14]).toBe('7');
  });

  it('stores a due time as a UTC ISO string', async () => {
    const task = await store.createTask({ description: 'Call', 'due-time': '2026-11-08T18:00:00+01:00' });
    expect(task['due-time']).toBe('2026-11-08T17:00:00.000Z');
  });

  it('stores a date-only due time as 23:59 local time on that date', async () => {
    const task = await store.createTask({ description: 'Pay rent', 'due-time': '2026-11-08' });
    expect(task['due-time']).toBe(new Date(2026, 10, 8, 23, 59, 0, 0).toISOString());
  });

  it('rejects an impossible date-only due time', async () => {
    await expect(store.createTask({ description: 'A', 'due-time': '2026-02-30' }))
      .rejects.toMatchObject({ field: 'due-time', code: 'invalid' });
  });

  it('trims the description before checking its length', async () => {
    const task = await store.createTask({ description: `  ${'x'.repeat(500)}  ` });
    expect(task.description).toBe('x'.repeat(500));
  });

  it('accepts descriptions of 1 and 500 characters', async () => {
    await expect(store.createTask({ description: 'x' })).resolves.toBeTruthy();
    await expect(store.createTask({ description: 'y'.repeat(500) })).resolves.toBeTruthy();
  });

  it.each([
    ['an empty description', { description: '' }, 'description', 'required'],
    ['a blank description', { description: '  ' }, 'description', 'required'],
    ['a description over 500 characters', { description: 'x'.repeat(501) }, 'description', 'too-long'],
    ['an unknown status', { description: 'A', status: 'done' }, 'status', 'invalid'],
    ['an unknown overdue handling', { description: 'A', 'overdue-handling': 'drop' }, 'overdue-handling', 'invalid'],
    ['an unparsable due time', { description: 'A', 'due-time': 'tomorrow' }, 'due-time', 'invalid'],
  ])('rejects %s', async (_, input, field, code) => {
    const error = await store.createTask(input).catch((e) => e);
    expect(error).toBeInstanceOf(ValidationError);
    expect(error).toMatchObject({ field, code });
  });

  it('creates a task directly in lists', async () => {
    const home = await store.createList({ name: 'Home' });
    const work = await store.createList({ name: 'Work' });
    const task = await store.createTask({ description: 'Fix door' }, { lists: [home.id, work.id] });
    expect((await store.listsOfTask(task.id)).sort()).toEqual([home.id, work.id].sort());
  });
});

describe('updateTask', () => {
  it('changes every editable field and updates both timestamps', async () => {
    const task = await store.createTask({ description: 'Buy paint' });
    clock.tick(60_000);
    const updated = await store.updateTask(task.id, {
      description: 'Buy white paint',
      status: 'in-progress',
      'due-time': '2026-11-06T18:00:00Z',
      'overdue-handling': 'cancel',
    });
    expect(updated).toMatchObject({
      description: 'Buy white paint',
      status: 'in-progress',
      'due-time': '2026-11-06T18:00:00.000Z',
      'overdue-handling': 'cancel',
      'creation-time': task['creation-time'],
      'last-update-time': '2026-11-04T09:01:00.000Z',
      'last-activity-time': '2026-11-04T09:01:00.000Z',
    });
  });

  it('allows any status to change to any other status', async () => {
    const task = await store.createTask({ description: 'Cycle' });
    for (const status of ['completed', 'cancelled', 'in-progress', 'todo', 'cancelled', 'completed']) {
      await expect(store.updateTask(task.id, { status })).resolves.toMatchObject({ status });
    }
  });

  it('clears the due time with null', async () => {
    const task = await store.createTask({ description: 'A', 'due-time': '2026-11-06T18:00:00Z' });
    await expect(store.updateTask(task.id, { 'due-time': null })).resolves.toMatchObject({ 'due-time': null });
  });

  it('leaves omitted fields unchanged and ignores read-only fields', async () => {
    const task = await store.createTask({ description: 'Keep me', status: 'in-progress' });
    const updated = await store.updateTask(task.id, { 'creation-time': '2000-01-01T00:00:00Z', id: 'other' });
    expect(updated).toMatchObject({ id: task.id, description: 'Keep me', status: 'in-progress' });
    expect(updated['creation-time']).toBe(task['creation-time']);
  });

  it('treats missing changes as no change', async () => {
    const task = await store.createTask({ description: 'Same' });
    await expect(store.updateTask(task.id)).resolves.toMatchObject({ description: 'Same' });
  });

  it('fails for an unknown task', async () => {
    const error = await store.updateTask('0192f1a2-0000-7000-8000-00000000ffff', { status: 'todo' }).catch((e) => e);
    expect(error).toMatchObject({ code: 'not-found' });
  });
});

describe('list membership', () => {
  it('adds a task to several lists and removes it from one', async () => {
    const home = await store.createList({ name: 'Home' });
    const errands = await store.createList({ name: 'Errands' });
    const task = await store.createTask({ description: 'Buy paint' });

    await store.addToList(task.id, home.id);
    await store.addToList(task.id, errands.id);
    await store.addToList(task.id, home.id);
    expect((await store.listsOfTask(task.id)).sort()).toEqual([home.id, errands.id].sort());

    await store.removeFromList(task.id, home.id);
    expect(await store.listsOfTask(task.id)).toEqual([errands.id]);
    expect((await store.tasksOfList(errands.id)).map((t) => t.id)).toEqual([task.id]);
    expect(await store.tasksOfList(home.id)).toEqual([]);
  });

  it('updates the last activity time on membership changes, not the last update time', async () => {
    const home = await store.createList({ name: 'Home' });
    const task = await store.createTask({ description: 'Buy paint' });
    clock.tick(10_000);
    await store.addToList(task.id, home.id);
    const after = await store.getTask(task.id);
    expect(after['last-activity-time']).toBe('2026-11-04T09:00:10.000Z');
    expect(after['last-update-time']).toBe(task['last-update-time']);
  });

  it('rejects unknown tasks and lists', async () => {
    const home = await store.createList({ name: 'Home' });
    const task = await store.createTask({ description: 'A' });
    await expect(store.addToList('0192f1a2-0000-7000-8000-00000000ffff', home.id)).rejects.toMatchObject({ code: 'not-found' });
    await expect(store.addToList(task.id, '0192f1a2-0000-7000-8000-00000000ffff')).rejects.toMatchObject({ code: 'not-found' });
  });

  it('keeps a task in no list visible in listTasks', async () => {
    const task = await store.createTask({ description: 'Loose' });
    expect((await store.listTasks()).map((t) => t.id)).toEqual([task.id]);
    expect(await store.listsOfTask(task.id)).toEqual([]);
  });
});

describe('persistence', () => {
  it('reads data back after closing and reopening the database', async () => {
    const list = await store.createList({ name: 'Home' });
    const task = await store.createTask({ description: 'Persist me' }, { lists: [list.id] });
    store.close();

    store = await openStore({ indexedDB: factory, keyRange: IDBKeyRange, name: 'test' });
    expect(await store.getList(list.id)).toMatchObject({ name: 'Home' });
    expect(await store.getTask(task.id)).toMatchObject({ description: 'Persist me' });
    expect(await store.listsOfTask(task.id)).toEqual([list.id]);
  });
});

/**
 * Return a promise for the result of a raw IndexedDB request.
 * @param {IDBRequest} req the request
 * @returns {Promise<any>} its result
 */
function raw(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Wait until a raw IndexedDB transaction commits.
 * @param {IDBTransaction} tx the transaction
 * @returns {Promise<void>}
 */
function committed(tx) {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onabort = () => reject(tx.error);
  });
}

/**
 * Overwrite membership positions directly in the database, bypassing the store.
 * @param {IDBFactory} idb the IndexedDB factory
 * @param {string} name the database name
 * @param {string} listId the list identifier
 * @param {Record<string, string>} positions new positions by task identifier
 * @returns {Promise<void>}
 */
async function seedPositions(idb, name, listId, positions) {
  const db = await raw(idb.open(name));
  const tx = db.transaction(['memberships'], 'readwrite');
  const done = committed(tx);
  const memberships = tx.objectStore('memberships');
  for (const [taskId, position] of Object.entries(positions)) {
    const key = [listId, taskId];
    const record = await raw(memberships.get(key));
    await raw(memberships.put({ ...record, position }, key));
  }
  await done;
  db.close();
}

/**
 * Return the positions of one list, as `[task-id, position]` pairs in position order.
 * @param {object} s the store
 * @param {string} listId the list identifier
 * @returns {Promise<string[][]>} the pairs
 */
async function positionsOf(s, listId) {
  const all = await s.listMemberships();
  return all.filter((m) => m['list-id'] === listId).map((m) => [m['task-id'], m.position]);
}

describe('manual order', () => {
  let home;
  let work;
  let a;
  let b;
  let c;

  /**
   * Reopen the store on the same database with the test clock.
   * @returns {Promise<void>}
   */
  async function reopen() {
    store = await openStore({ indexedDB: factory, keyRange: IDBKeyRange, name: 'test', now: () => new Date(clock.now) });
  }

  beforeEach(async () => {
    home = await store.createList({ name: 'Home' });
    work = await store.createList({ name: 'Work' });
    a = await store.createTask({ description: 'A' }, { lists: [home.id, work.id] });
    b = await store.createTask({ description: 'B' }, { lists: [home.id, work.id] });
    c = await store.createTask({ description: 'C' }, { lists: [home.id] });
  });

  it('appends created and added tasks after the last task of the list', async () => {
    expect(await positionsOf(store, home.id)).toEqual([[a.id, 'a0'], [b.id, 'a1'], [c.id, 'a2']]);
    await store.addToList(c.id, work.id);
    expect(await positionsOf(store, work.id)).toEqual([[a.id, 'a0'], [b.id, 'a1'], [c.id, 'a2']]);
  });

  it('appends after the last task by position, not by added time', async () => {
    await store.moveInList(c.id, home.id, { before: a.id });
    const d = await store.createTask({ description: 'D' });
    await store.addToList(d.id, home.id);
    expect((await store.tasksOfList(home.id)).map((t) => t.id)).toEqual([c.id, a.id, b.id, d.id]);
  });

  it('moves a task before or after a neighbor', async () => {
    await store.moveInList(a.id, home.id, { after: c.id });
    expect((await store.tasksOfList(home.id)).map((t) => t.id)).toEqual([b.id, c.id, a.id]);
    await store.moveInList(c.id, home.id, { before: b.id });
    expect((await store.tasksOfList(home.id)).map((t) => t.id)).toEqual([c.id, b.id, a.id]);
    await store.moveInList(a.id, home.id, { before: b.id });
    expect((await store.tasksOfList(home.id)).map((t) => t.id)).toEqual([c.id, a.id, b.id]);
  });

  it('changes only the moved membership and leaves other lists unchanged', async () => {
    const workBefore = await positionsOf(store, work.id);
    await store.moveInList(b.id, home.id, { before: a.id });
    expect(await positionsOf(store, work.id)).toEqual(workBefore);
    const homeAfter = await positionsOf(store, home.id);
    expect(homeAfter.map(([id]) => id)).toEqual([b.id, a.id, c.id]);
    expect(homeAfter.filter(([id]) => id !== b.id)).toEqual([[a.id, 'a0'], [c.id, 'a2']]);
  });

  it('updates the last activity time of the moved task, not its last update time', async () => {
    clock.tick(5000);
    await store.moveInList(c.id, home.id, { before: a.id });
    const moved = await store.getTask(c.id);
    expect(moved['last-activity-time']).toBe('2026-11-04T09:00:05.000Z');
    expect(moved['last-update-time']).toBe(c['last-update-time']);
    expect((await store.getTask(a.id))['last-activity-time']).toBe(a['last-activity-time']);
  });

  it.each([
    ['both neighbors', () => ({ before: a.id, after: b.id })],
    ['no neighbor', () => ({})],
    ['the task itself as neighbor', () => ({ before: c.id })],
    ['a neighbor outside the list', () => ({ after: '0192f1a2-0000-7000-8000-00000000ffff' })],
  ])('rejects %s', async (_, placement) => {
    const before = await positionsOf(store, home.id);
    const error = await store.moveInList(c.id, home.id, placement()).catch((e) => e);
    expect(error).toBeInstanceOf(ValidationError);
    expect(await positionsOf(store, home.id)).toEqual(before);
  });

  it('rejects a neighbor that is a member of another list only', async () => {
    const error = await store.moveInList(a.id, work.id, { after: c.id }).catch((e) => e);
    expect(error).toBeInstanceOf(ValidationError);
    expect(error).toMatchObject({ field: 'after', code: 'invalid' });
  });

  it('fails when the task is not in the list', async () => {
    await expect(store.moveInList(c.id, work.id, { before: a.id })).rejects.toMatchObject({ code: 'not-found' });
  });

  it('rejects moves of a deleted task or within a deleted list', async () => {
    await store.deleteTask(c.id);
    await expect(store.moveInList(c.id, home.id, { before: a.id })).rejects.toMatchObject({ code: 'deleted' });
    await store.deleteList(work.id);
    await expect(store.moveInList(b.id, work.id, { before: a.id })).rejects.toMatchObject({ code: 'deleted' });
  });

  it('keeps positions in the recycle bin and drops them with a purge', async () => {
    await store.moveInList(c.id, home.id, { before: a.id });
    const before = await positionsOf(store, home.id);
    await store.deleteTask(c.id);
    await store.restoreTask(c.id);
    expect(await positionsOf(store, home.id)).toEqual(before);
    expect((await store.tasksOfList(home.id)).map((t) => t.id)).toEqual([c.id, a.id, b.id]);

    await store.deleteTask(a.id);
    await store.purgeForever('task', a.id);
    expect(await positionsOf(store, home.id)).toEqual(before.filter(([id]) => id !== a.id));
    expect(await positionsOf(store, work.id)).toEqual([[b.id, 'a1']]);
  });

  it('rebalances the list when the new position would exceed 128 characters', async () => {
    store.close();
    const long = `a0${'0'.repeat(130)}`;
    await seedPositions(factory, 'test', home.id, { [a.id]: `${long}1`, [b.id]: `${long}2`, [c.id]: 'a1' });
    await reopen();
    const workBefore = await positionsOf(store, work.id);

    await store.moveInList(c.id, home.id, { after: a.id });
    expect(await positionsOf(store, home.id)).toEqual([[a.id, 'a0'], [c.id, 'a1'], [b.id, 'a2']]);
    expect(await positionsOf(store, work.id)).toEqual(workBefore);
  });

  it('rebalances the list when the neighbors share a position', async () => {
    store.close();
    await seedPositions(factory, 'test', home.id, { [a.id]: 'a1', [b.id]: 'a1', [c.id]: 'a0' });
    await reopen();

    await store.moveInList(c.id, home.id, { after: a.id });
    expect(await positionsOf(store, home.id)).toEqual([[a.id, 'a0'], [c.id, 'a1'], [b.id, 'a2']]);
  });

  it('keeps keys at most 128 characters over 800 moves to the same spot', async () => {
    let moved = b;
    for (let i = 0; i < 800; i++) {
      moved = moved === b ? c : b;
      await store.moveInList(moved.id, home.id, { after: a.id });
    }
    const other = moved === b ? c : b;
    const positions = await positionsOf(store, home.id);
    expect(positions.map(([id]) => id)).toEqual([a.id, moved.id, other.id]);
    expect(Math.max(...positions.map(([, key]) => key.length))).toBeLessThanOrEqual(128);
  });
});

describe('schema upgrade to version 3', () => {
  it('assigns positions to existing memberships in added-time order', async () => {
    const legacy = new IDBFactory();
    const req = legacy.open('legacy', 2);
    req.onupgradeneeded = () => {
      const db = req.result;
      db.createObjectStore('lists', { keyPath: 'id' });
      db.createObjectStore('tasks', { keyPath: 'id' });
      db.createObjectStore('memberships');
      db.createObjectStore('notes');
    };
    const db = await raw(req);
    const tx = db.transaction(['lists', 'tasks', 'memberships'], 'readwrite');
    const done = committed(tx);
    const time = '2026-11-01T09:00:00.000Z';
    tx.objectStore('lists').put({
      id: 'L1', name: 'Home', description: '', owner: null,
      'creation-time': time, 'last-update-time': time, 'deletion-time': null,
    });
    const added = { t1: '2026-11-03T09:00:00.000Z', t2: '2026-11-01T09:00:00.000Z', t3: '2026-11-02T09:00:00.000Z' };
    for (const [id, addedTime] of Object.entries(added)) {
      tx.objectStore('tasks').put({
        id, description: id, status: 'todo',
        'creation-time': time, 'last-update-time': time, 'last-activity-time': time, 'deletion-time': null,
      });
      tx.objectStore('memberships').put({ 'list-id': 'L1', 'task-id': id, 'added-time': addedTime }, ['L1', id]);
    }
    await done;
    db.close();

    const upgraded = await openStore({ indexedDB: legacy, keyRange: IDBKeyRange, name: 'legacy' });
    expect(await positionsOf(upgraded, 'L1')).toEqual([['t2', 'a0'], ['t3', 'a1'], ['t1', 'a2']]);
    expect((await upgraded.tasksOfList('L1')).map((t) => t.id)).toEqual(['t2', 't3', 't1']);
    upgraded.close();
  });
});
