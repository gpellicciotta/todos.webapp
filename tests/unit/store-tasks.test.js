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
  it('embeds default one-off rules and a ready occurrence 1, and logs a create event', async () => {
    const task = await store.createTask({ description: 'Buy paint' });
    const time = '2026-11-04T09:00:00.000Z';
    expect(task).toEqual({
      id: task.id,
      description: 'Buy paint',
      'owner-id': null,
      'lifecycle-rules': {
        'due-time': null, 'overdue-handling': 'keep', 'recurrence-unit': null,
        'recurrence-interval': null, 'recurrence-end-date': null, 'recurrence-end-count': null, timezone: null,
        'start-time': null, 'goal-direction': 'at-least', 'goal-measure': 'checks', 'goal-target': 1, 'goal-unit': null,
      },
      'current-occurrence': {
        occurrence: 1, 'start-time': time, 'due-time': null, status: 'ready', 'close-time': null,
        'goal-direction': 'at-least', 'goal-measure': 'checks', 'goal-target': 1, 'goal-unit': null, progress: 0, 'time-spent-seconds': 0,
      },
      'creation-time': time,
      'last-update-time': time,
      'deletion-time': null,
    });
    expect(task.id[14]).toBe('7');
    expect((await store.eventsOfTask(task.id)).map((event) => [event.type, event['creation-time'], event.occurrence])).toEqual([['create', time, 1]]);
    expect(await store.occurrencesOfTask(task.id)).toEqual([{ 'task-id': task.id, ...task['current-occurrence'] }]);
  });

  it('stores a due time as a UTC ISO string in the rules and the occurrence', async () => {
    const task = await store.createTask({ description: 'Call', 'due-time': '2026-11-08T18:00:00+01:00' });
    expect(task['lifecycle-rules']['due-time']).toBe('2026-11-08T17:00:00.000Z');
    expect(task['current-occurrence']['due-time']).toBe('2026-11-08T17:00:00.000Z');
  });

  it('stores a date-only due time as 23:59 local time on that date', async () => {
    const task = await store.createTask({ description: 'Pay rent', 'due-time': '2026-11-08' });
    expect(task['lifecycle-rules']['due-time']).toBe(new Date(2026, 10, 8, 23, 59, 0, 0).toISOString());
  });

  it('creates a recurring task without due time or overdue handling, as the service requires, over the current week', async () => {
    const weekly = { 'recurrence-unit': 'week', 'recurrence-interval': 1, timezone: 'Europe/Brussels' };
    const task = await store.createTask({ description: 'Exercises', 'lifecycle-rules': weekly, 'overdue-handling': 'cancel' });
    expect(task['lifecycle-rules']).toMatchObject({ ...weekly, 'due-time': null, 'overdue-handling': null });
    expect(task['current-occurrence']).toMatchObject({ 'start-time': '2026-11-01T23:00:00.000Z', 'due-time': '2026-11-08T23:00:00.000Z' });
  });

  it('reaches a given starting status through events', async () => {
    const task = await store.createTask({ description: 'Done already', status: 'completed' });
    expect(task['current-occurrence']).toMatchObject({ status: 'completed', progress: 1 });
    expect((await store.eventsOfTask(task.id)).map((event) => event.type)).toEqual(['create', 'log']);
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
  it('changes the description, maps the deadline onto the rules, and the status onto events', async () => {
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
      'lifecycle-rules': { 'due-time': '2026-11-06T18:00:00.000Z', 'overdue-handling': 'cancel' },
      'current-occurrence': { status: 'in-progress', 'due-time': '2026-11-06T18:00:00.000Z' },
      'creation-time': task['creation-time'],
      'last-update-time': '2026-11-04T09:01:00.000Z',
    });
    expect((await store.eventsOfTask(task.id)).map((event) => [event.type, event['creation-time']])).toEqual([
      ['create', task['creation-time']], ['start', '2026-11-04T09:01:00.000Z'],
    ]);
  });

  it('maps every status edit onto the events that reach it', async () => {
    const task = await store.createTask({ description: 'Cycle' });
    for (const status of ['completed', 'cancelled', 'in-progress', 'ready', 'cancelled', 'completed', 'in-progress', 'ready']) {
      clock.tick();
      await expect(store.updateTask(task.id, { status })).resolves.toMatchObject({ 'current-occurrence': { status } });
    }
    expect((await store.eventsOfTask(task.id)).map((event) => event.type)).toEqual([
      'create', 'log', 'cancel', 'reopen', 'undo-log', 'start', 'unstart', 'cancel', 'reopen', 'log', 'undo-log', 'start', 'unstart',
    ]);
  });

  it('clears the due time with null', async () => {
    const task = await store.createTask({ description: 'A', 'due-time': '2026-11-06T18:00:00Z' });
    const updated = await store.updateTask(task.id, { 'due-time': null });
    expect([updated['lifecycle-rules']['due-time'], updated['current-occurrence']['due-time']]).toEqual([null, null]);
  });

  it('leaves omitted fields unchanged and ignores read-only fields', async () => {
    const task = await store.createTask({ description: 'Keep me', status: 'in-progress' });
    const updated = await store.updateTask(task.id, { 'creation-time': '2000-01-01T00:00:00Z', id: 'other' });
    expect(updated).toMatchObject({ id: task.id, description: 'Keep me', 'current-occurrence': { status: 'in-progress' } });
    expect(updated['creation-time']).toBe(task['creation-time']);
  });

  it('treats missing changes as no change', async () => {
    const task = await store.createTask({ description: 'Same' });
    await expect(store.updateTask(task.id)).resolves.toMatchObject({ description: 'Same' });
  });

  it('rejects an unknown status', async () => {
    const task = await store.createTask({ description: 'Same' });
    await expect(store.updateTask(task.id, { status: 'todo' })).rejects.toMatchObject({ field: 'status', code: 'invalid' });
  });

  it('fails for an unknown task', async () => {
    const error = await store.updateTask('0192f1a2-0000-7000-8000-00000000ffff', { status: 'ready' }).catch((e) => e);
    expect(error).toMatchObject({ code: 'not-found' });
  });
});

describe('events and rules', () => {
  it('ticks a target-3 task through complete events until it is completed', async () => {
    const task = await store.createTask({ description: 'Exercises', 'lifecycle-rules': { 'goal-target': 3 } });
    const counts = [];
    for (let tick = 0; tick < 3; tick++) {
      clock.tick();
      const { event, task: after } = await store.postEvent(task.id, 'complete');
      expect(event).toMatchObject({ 'task-id': task.id, type: 'log', checked: true, occurrence: 1, 'owner-id': null, details: null });
      expect(event.id[14]).toBe('7');
      counts.push([after['current-occurrence'].progress, after['current-occurrence'].status]);
    }
    expect(counts).toEqual([[1, 'in-progress'], [2, 'in-progress'], [3, 'completed']]);
    expect((await store.getTask(task.id))['last-update-time']).toBe('2026-11-04T09:00:03.000Z');
  });

  it('refuses an event whose precondition fails, storing nothing', async () => {
    const task = await store.createTask({ description: 'Fresh' });
    await expect(store.postEvent(task.id, 'uncomplete')).rejects.toMatchObject({ code: 'conflict' });
    await expect(store.postEvent(task.id, 'expire')).rejects.toMatchObject({ code: 'invalid' });
    expect((await store.eventsOfTask(task.id)).map((event) => event.type)).toEqual(['create']);
  });

  it('edits the target and deadline of the rules and the open occurrence', async () => {
    const task = await store.createTask({ description: 'Water', status: 'completed' });
    clock.tick();
    const updated = await store.updateRules(task.id, { 'goal-target': 2, 'due-time': '2026-11-09T10:00:00Z' });
    expect(updated['lifecycle-rules']).toMatchObject({ 'goal-target': 2, 'due-time': '2026-11-09T10:00:00.000Z' });
    expect(updated['current-occurrence']).toMatchObject({ 'goal-target': 2, progress: 1, status: 'in-progress', 'close-time': null });
    expect(updated['last-update-time']).toBe('2026-11-04T09:00:01.000Z');
    await expect(store.updateRules(task.id, { 'goal-target': 0 })).rejects.toMatchObject({ field: 'goal-target', code: 'invalid' });
  });

  it('expires an overdue task with handling cancel through a system event', async () => {
    const task = await store.createTask({ description: 'Late', 'due-time': '2026-11-04T08:00:00Z', 'overdue-handling': 'cancel' });
    const expired = await store.expireTask(task.id);
    expect(expired['current-occurrence']).toMatchObject({ status: 'failed', 'close-time': '2026-11-04T09:00:00.000Z' });
    expect((await store.eventsOfTask(task.id)).map((event) => [event.type, event['owner-id']])).toEqual([['create', null], ['expire', null]]);
    await expect(store.expireTask(task.id)).resolves.toBeNull();
  });

  it('removes the occurrences and events of a purged task', async () => {
    const task = await store.createTask({ description: 'Gone', status: 'in-progress' });
    await store.deleteTask(task.id);
    await store.purgeForever('task', task.id);
    expect(await store.eventsOfTask(task.id)).toEqual([]);
    expect(await store.occurrencesOfTask(task.id)).toEqual([]);
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

  it('moves the last update time on membership changes (TSK-12)', async () => {
    const home = await store.createList({ name: 'Home' });
    const task = await store.createTask({ description: 'Buy paint' });
    clock.tick(10_000);
    await store.addToList(task.id, home.id);
    expect((await store.getTask(task.id))['last-update-time']).toBe('2026-11-04T09:00:10.000Z');
    clock.tick(10_000);
    await store.removeFromList(task.id, home.id);
    const after = await store.getTask(task.id);
    expect(after['last-update-time']).toBe('2026-11-04T09:00:20.000Z');
    expect(Object.keys(after)).not.toContain('last-activity-time');
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

  it('moves the last update time of the moved task only', async () => {
    clock.tick(5000);
    await store.moveInList(c.id, home.id, { before: a.id });
    expect((await store.getTask(c.id))['last-update-time']).toBe('2026-11-04T09:00:05.000Z');
    expect((await store.getTask(a.id))['last-update-time']).toBe(a['last-update-time']);
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

describe('goal fields', () => {
  it('stores the goal rules and the occurrence snapshot, and keeps the mirrors through events and edits', async () => {
    const task = await store.createTask({ description: 'Exercises', 'lifecycle-rules': { 'goal-target': 3 } });
    expect(task['lifecycle-rules']).toMatchObject({ 'start-time': null, 'goal-direction': 'at-least', 'goal-measure': 'checks', 'goal-target': 3, 'goal-unit': null });
    expect(task['current-occurrence']).toMatchObject({ 'goal-target': 3, progress: 0, 'time-spent-seconds': 0 });
    clock.tick();
    const { task: ticked } = await store.postEvent(task.id, 'complete');
    expect(ticked['current-occurrence']).toMatchObject({ progress: 1 });
    clock.tick();
    const edited = await store.updateRules(task.id, { 'goal-target': 2 });
    expect(edited['lifecycle-rules']['goal-target']).toBe(2);
    const [stored] = await store.occurrencesOfTask(task.id);
    expect(stored).toMatchObject({ 'goal-target': 2, progress: 1, 'time-spent-seconds': 0 });
  });

  it('takes the year unit as a recurrence rule', async () => {
    const task = await store.createTask({ description: 'Renew passport' });
    const edited = await store.updateRules(task.id, { 'recurrence-unit': 'year', 'recurrence-interval': 1, timezone: 'UTC' });
    expect(edited['lifecycle-rules']).toMatchObject({ 'recurrence-unit': 'year', 'recurrence-interval': 1 });
    await expect(store.updateRules(task.id, { 'recurrence-unit': 'decade' })).rejects.toBeInstanceOf(ValidationError);
  });

  it('takes a decimal target from 0 for amount and reading goals, and only a whole number for checks and time', async () => {
    const task = await store.createTask({ description: 'Weigh in' });
    const edited = await store.updateRules(task.id, { 'goal-measure': 'reading', 'goal-target': 79.875, 'goal-unit': 'kg' });
    expect(edited['lifecycle-rules']).toMatchObject({ 'goal-target': 79.875, 'goal-unit': 'kg' });
    expect((await store.updateRules(task.id, { 'goal-target': 0 }))['lifecycle-rules']['goal-target']).toBe(0);
    await expect(store.updateRules(task.id, { 'goal-target': 1.2345 })).rejects.toBeInstanceOf(ValidationError);
    await expect(store.updateRules(task.id, { 'goal-measure': 'checks' })).rejects.toBeInstanceOf(ValidationError);
    await expect(store.updateRules(task.id, { 'goal-measure': 'time', 'goal-target': 1.5 })).rejects.toBeInstanceOf(ValidationError);
    await expect(store.updateRules(task.id, { 'goal-measure': 'checks', 'goal-target': 0 })).rejects.toBeInstanceOf(ValidationError);
    const checks = await store.updateRules(task.id, { 'goal-measure': 'checks', 'goal-target': 4 });
    expect(checks['lifecycle-rules']).toMatchObject({ 'goal-measure': 'checks', 'goal-target': 4, 'goal-unit': null });
  });
});

describe('log entries', () => {
  it('writes complete and uncomplete as a checked log and an undo-log of the latest live check', async () => {
    const task = await store.createTask({ description: 'Exercises', 'lifecycle-rules': { 'goal-target': 2 } });
    clock.tick();
    const first = await store.postEvent(task.id, 'complete');
    clock.tick();
    const second = await store.postEvent(task.id, 'complete');
    expect(first.event).toMatchObject({ type: 'log', checked: true, occurrence: 1 });
    expect(second.task['current-occurrence']).toMatchObject({ progress: 2, status: 'completed' });
    expect(second.task['current-occurrence'].entries.map((entry) => entry.id)).toEqual([first.event.id, second.event.id]);
    clock.tick();
    const undone = await store.postEvent(task.id, 'uncomplete');
    expect(undone.event).toMatchObject({ type: 'undo-log', 'target-event-id': second.event.id, occurrence: 1 });
    expect(undone.task['current-occurrence']).toMatchObject({ progress: 1, status: 'in-progress', 'close-time': null });
    expect(undone.task['current-occurrence'].entries.map((entry) => entry.id)).toEqual([first.event.id]);
    expect((await store.occurrencesOfTask(task.id))[0]).not.toHaveProperty('entries');
  });

  it('refuses an uncomplete without a live check', async () => {
    const task = await store.createTask({ description: 'Fresh' });
    await expect(store.postEvent(task.id, 'uncomplete')).rejects.toMatchObject({ code: 'conflict' });
  });

  it('writes the completions of a task created or updated with a status as logs', async () => {
    const task = await store.createTask({ description: 'Done', status: 'completed' });
    expect((await store.eventsOfTask(task.id)).map((event) => [event.type, event.checked])).toEqual([['create', undefined], ['log', true]]);
    expect(task['current-occurrence']).toMatchObject({ status: 'completed', progress: 1 });
    clock.tick();
    const reopened = await store.updateTask(task.id, { status: 'ready' });
    expect(reopened['current-occurrence']).toMatchObject({ status: 'ready', progress: 0, 'close-time': null, entries: [] });
    expect((await store.eventsOfTask(task.id)).map((event) => event.type)).toEqual(['create', 'log', 'undo-log']);
  });

  it('logs time and an amount without a check, summing time on the occurrence', async () => {
    const task = await store.createTask({ description: 'Run', 'lifecycle-rules': { 'goal-target': 2 } });
    clock.tick();
    const { event, task: after } = await store.logEntry(task.id, { 'time-spent-seconds': 600, amount: 2.5, label: '  Park  ' });
    expect(event).toMatchObject({ type: 'log', 'time-spent-seconds': 600, amount: 2.5, label: 'Park', occurrence: 1 });
    expect(event).not.toHaveProperty('checked');
    clock.tick();
    await store.logEntry(task.id, { checked: true, 'time-spent-seconds': 60 });
    const current = (await store.getTask(task.id))['current-occurrence'];
    expect(current).toMatchObject({ 'time-spent-seconds': 660, progress: 1, status: 'in-progress' });
    expect(current.entries).toHaveLength(2);
    expect(after['last-update-time']).toBe('2026-11-04T09:00:01.000Z');
  });

  it('validates the fields of an entry', async () => {
    const task = await store.createTask({ description: 'Run' });
    const bad = async (entry, field) => expect(store.logEntry(task.id, entry)).rejects.toMatchObject({ field, code: expect.any(String) });
    await bad({}, 'entry');
    await bad({ label: 'only a label' }, 'entry');
    await bad({ checked: false }, 'entry');
    await bad({ 'time-spent-seconds': 0 }, 'time-spent-seconds');
    await bad({ 'time-spent-seconds': 1.5 }, 'time-spent-seconds');
    await bad({ 'time-spent-seconds': 2_147_483_648 }, 'time-spent-seconds');
    await bad({ amount: -1 }, 'amount');
    await bad({ amount: 1.2345 }, 'amount');
    await bad({ amount: 1_000_000_000_000 }, 'amount');
    await bad({ checked: true, label: 'x'.repeat(101) }, 'label');
    expect((await store.eventsOfTask(task.id)).map((event) => event.type)).toEqual(['create']);
  });

  it('refuses a time total above the limit with a conflict', async () => {
    const task = await store.createTask({ description: 'Long' });
    await store.logEntry(task.id, { 'time-spent-seconds': 2_147_483_647 });
    for (let i = 0; i < 464; i++) {
      clock.tick();
      await store.logEntry(task.id, { 'time-spent-seconds': 2_147_483_647 });
    }
    clock.tick();
    await expect(store.logEntry(task.id, { 'time-spent-seconds': 2_147_483_647 })).rejects.toMatchObject({ code: 'conflict' });
    expect((await store.getTask(task.id))['current-occurrence']['time-spent-seconds']).toBeLessThanOrEqual(999_999_999_999);
  });

  it('applies the time of a log whose check is ignored on a cancelled task', async () => {
    const task = await store.createTask({ description: 'Stopped', status: 'cancelled' });
    clock.tick();
    const { task: after } = await store.logEntry(task.id, { checked: true, 'time-spent-seconds': 30 });
    expect(after['current-occurrence']).toMatchObject({ status: 'cancelled', progress: 0, 'time-spent-seconds': 30 });
  });

  it('undoes an entry by its identifier, retroactively, and accepts a second undo', async () => {
    const task = await store.createTask({ description: 'Water' });
    clock.tick();
    const { event } = await store.logEntry(task.id, { checked: true });
    clock.tick();
    const undone = await store.undoLog(task.id, event.id);
    expect(undone.event).toMatchObject({ type: 'undo-log', 'target-event-id': event.id, occurrence: 1 });
    expect(undone.task['current-occurrence']).toMatchObject({ progress: 0, status: 'ready', 'close-time': null, entries: [] });
    clock.tick();
    const again = await store.undoLog(task.id, event.id);
    expect(again.task['current-occurrence']).toMatchObject({ progress: 0, status: 'ready' });
    expect((await store.eventsOfTask(task.id)).map((entry) => entry.type)).toEqual(['create', 'log', 'undo-log', 'undo-log']);
  });

  it('refuses an undo of an unknown event, of another task, or of an undo', async () => {
    const task = await store.createTask({ description: 'Water' });
    const other = await store.createTask({ description: 'Other' });
    clock.tick();
    const { event } = await store.logEntry(other.id, { checked: true });
    clock.tick();
    const mine = await store.logEntry(task.id, { checked: true });
    clock.tick();
    const { event: undo } = await store.undoLog(task.id, mine.event.id);
    await expect(store.undoLog(task.id, '0192f1a2-0000-7000-8000-00000000ffff')).rejects.toMatchObject({ code: 'conflict' });
    await expect(store.undoLog(task.id, event.id)).rejects.toMatchObject({ code: 'conflict' });
    await expect(store.undoLog(task.id, undo.id)).rejects.toMatchObject({ code: 'conflict' });
  });

  it('keeps unticking through the status mapping working on converted checks', async () => {
    const task = await store.createTask({ description: 'Both', 'lifecycle-rules': { 'goal-target': 2 } });
    await store.logEntry(task.id, { checked: true });
    clock.tick();
    await store.logEntry(task.id, { checked: true });
    clock.tick();
    const after = await store.updateTask(task.id, { status: 'ready' });
    expect(after['current-occurrence']).toMatchObject({ progress: 0, status: 'ready' });
  });
});
