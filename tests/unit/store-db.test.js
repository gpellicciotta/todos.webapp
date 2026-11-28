import { IDBFactory, IDBKeyRange } from 'fake-indexeddb';
import { describe, expect, it, vi } from 'vitest';
import { DB_VERSION, openStore, StoreError } from '../../src/js/store/db.js';

/**
 * Open a raw connection, creating the version 1 stores on upgrade.
 * @param {IDBFactory} factory the IndexedDB factory
 * @param {number} version the version to open
 * @returns {Promise<IDBDatabase>} the open connection
 */
function rawOpen(factory, version) {
  return new Promise((resolve, reject) => {
    const req = factory.open('test', version);
    req.onupgradeneeded = (event) => {
      if (event.oldVersion < 1) {
        for (const name of ['lists', 'tasks', 'memberships']) {
          req.result.createObjectStore(name, name === 'memberships' ? undefined : { keyPath: 'id' });
        }
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Open a store on a factory.
 * @param {IDBFactory} factory the IndexedDB factory
 * @param {object} [options] extra store options
 * @returns {Promise<object>} the store facade
 */
function open(factory, options = {}) {
  return openStore({ indexedDB: factory, keyRange: IDBKeyRange, name: 'test', ...options });
}

describe('openStore connection handling', () => {
  it('closes its connection when a newer version opens, and reports it', async () => {
    const factory = new IDBFactory();
    const onVersionChange = vi.fn();
    await open(factory, { onVersionChange });
    const newer = await rawOpen(factory, DB_VERSION + 1);
    expect(onVersionChange).toHaveBeenCalledTimes(1);
    expect(newer.version).toBe(DB_VERSION + 1);
    newer.close();
  });

  it('fails with a blocked StoreError while an older connection stays open', async () => {
    const factory = new IDBFactory();
    const older = await rawOpen(factory, 1);
    const error = await open(factory).catch((caught) => caught);
    expect(error).toBeInstanceOf(StoreError);
    expect(error.code).toBe('blocked');
    expect(error.message).toBe("Close other tabs of ToDo's to finish the update.");
    older.close();
    await new Promise((resolve) => setTimeout(resolve, 20));
    const store = await open(factory);
    expect(await store.listLists()).toEqual([]);
    store.close();
  });
});

describe('store change notifications', () => {
  it('tells subscribers after each write, but not after reads', async () => {
    const store = await open(new IDBFactory());
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);
    const list = await store.createList({ name: 'Home' });
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenLastCalledWith({ operation: 'createList', remote: false });
    await store.listLists();
    await store.getList(list.id);
    expect(listener).toHaveBeenCalledTimes(1);
    await store.deleteList(list.id);
    expect(listener).toHaveBeenCalledTimes(2);
    unsubscribe();
    await store.restoreList(list.id);
    expect(listener).toHaveBeenCalledTimes(2);
    store.close();
  });

  it('tells subscribers of writes made by another connection with broadcasting on', async () => {
    const factory = new IDBFactory();
    const first = await open(factory, { broadcast: true });
    const second = await open(factory, { broadcast: true });
    const changed = new Promise((resolve) => first.subscribe(resolve));
    await second.createList({ name: 'Work' });
    await expect(changed).resolves.toEqual({ operation: 'createList', remote: true });
    first.close();
    second.close();
  });
});

describe('store change notification coverage', () => {
  it('notifies once for every write operation of the facade', async () => {
    const store = await open(new IDBFactory());
    const heard = [];
    store.subscribe(({ operation }) => heard.push(operation));
    const list = await store.createList({ name: 'Home' });
    await store.updateList(list.id, { name: 'House' });
    const first = await store.createTask({ description: 'Buy paint' });
    const second = await store.createTask({ description: 'Call the plumber' }, { lists: [list.id] });
    await store.updateTask(first.id, { status: 'in-progress' });
    await store.addToList(first.id, list.id);
    await store.moveInList(first.id, list.id, { before: second.id });
    await store.removeFromList(first.id, list.id);
    const note = await store.addNote(first.id, { text: 'Blue' });
    await store.editNote(note.id, 'Green');
    await store.deleteNote(note.id);
    await store.deleteTask(first.id);
    await store.restoreTask(first.id);
    await store.deleteList(list.id);
    await store.restoreList(list.id);
    await store.deleteTask(second.id);
    await store.purgeForever('task', second.id);
    await store.purgeExpired();
    await store.applyChanges(() => ({ changes: {}, result: null }));
    expect(heard).toEqual([
      'createList', 'updateList', 'createTask', 'createTask', 'updateTask', 'addToList', 'moveInList', 'removeFromList',
      'addNote', 'editNote', 'deleteNote', 'deleteTask', 'restoreTask', 'deleteList', 'restoreList', 'deleteTask',
      'purgeForever', 'purgeExpired', 'applyChanges',
    ]);
    store.close();
  });

  it('keeps a committed write and the other subscribers when one subscriber throws', async () => {
    const store = await open(new IDBFactory());
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const after = vi.fn();
    store.subscribe(() => {
      throw new Error('subscriber failed');
    });
    store.subscribe(after);
    const list = await store.createList({ name: 'Home' });
    expect(list.name).toBe('Home');
    expect(after).toHaveBeenCalledTimes(1);
    expect(error).toHaveBeenCalledWith('Store subscriber failed:', expect.any(Error));
    error.mockRestore();
    store.close();
  });
});

describe('the version 4 migration', () => {
  it('keeps all data and adds the sync stores', async () => {
    const factory = new IDBFactory();
    const raw = await new Promise((resolve, reject) => {
      const req = factory.open('test', 3);
      req.onupgradeneeded = () => {
        req.result.createObjectStore('lists', { keyPath: 'id' }).put({ id: 'l1', name: 'Home', 'deletion-time': null });
        req.result.createObjectStore('tasks', { keyPath: 'id' });
        req.result.createObjectStore('memberships');
        req.result.createObjectStore('notes');
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    raw.close();
    const store = await open(factory);
    expect((await store.listLists()).map((list) => list.name)).toEqual(['Home']);
    expect(DB_VERSION).toBe(6);
    store.close();
    const upgraded = await new Promise((resolve, reject) => {
      const req = factory.open('test');
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    expect([...upgraded.objectStoreNames].sort()).toEqual([
      'events', 'lists', 'memberships', 'notes', 'occurrences', 'sync-log', 'sync-queue', 'sync-state', 'tasks',
    ]);
    expect(upgraded.transaction('sync-log').objectStore('sync-log').indexNames.contains('time')).toBe(true);
    expect(upgraded.transaction('sync-queue').objectStore('sync-queue').autoIncrement).toBe(true);
    upgraded.close();
  });
});

describe('the version 5 migration', () => {
  const T0 = '2026-10-01T08:00:00.000Z';
  const T1 = '2026-10-02T08:00:00.000Z';
  const T2 = '2026-10-03T08:00:00.000Z';
  const DUE = '2026-10-10T18:00:00.000Z';

  /**
   * Create a version 4 database holding a task of each status, notes, and queued changes of the former shape.
   * @param {IDBFactory} factory the IndexedDB factory
   * @returns {Promise<void>}
   */
  async function legacyDatabase(factory) {
    const raw = await new Promise((resolve, reject) => {
      const req = factory.open('test', 4);
      req.onupgradeneeded = () => {
        const db = req.result;
        db.createObjectStore('lists', { keyPath: 'id' });
        const tasks = db.createObjectStore('tasks', { keyPath: 'id' });
        db.createObjectStore('memberships');
        const notes = db.createObjectStore('notes');
        const queue = db.createObjectStore('sync-queue', { keyPath: 'seq', autoIncrement: true });
        db.createObjectStore('sync-state', { keyPath: 'key' });
        db.createObjectStore('sync-log', { keyPath: 'id' }).createIndex('time', 'time');
        for (const status of ['todo', 'in-progress', 'completed', 'cancelled']) {
          tasks.put({
            id: status, description: status, status, 'due-time': status === 'todo' ? DUE : null,
            'overdue-handling': status === 'todo' ? 'cancel' : 'keep', 'owner-id': status === 'completed' ? 7 : null,
            'creation-time': T0, 'last-update-time': T1, 'last-activity-time': T2, 'deletion-time': null,
            ...(status === 'completed' ? { revision: 40 } : {}),
          });
        }
        notes.put({ id: 'n1', 'task-id': 'todo', text: 'Plain', author: null, 'creation-time': T0, 'edit-time': null }, ['todo', 'n1']);
        notes.put({ id: 'n2', 'task-id': 'todo', text: 'Edited', author: 7, 'creation-time': T0, 'edit-time': T1, revision: 41 }, ['todo', 'n2']);
        queue.add({
          target: { type: 'task', id: 'todo' }, operation: 'create-task', created: T0, 'edit-times': {}, undo: { kind: 'remove-task', id: 'todo' },
          fields: { id: 'todo', description: 'todo', status: 'in-progress', 'due-time': DUE, 'overdue-handling': 'cancel', 'creation-time': T0, lists: [] },
        });
        queue.add({
          target: { type: 'task', id: 'completed' }, operation: 'update-task', created: T1,
          fields: { description: 'Done', status: 'completed', 'due-time': null }, 'edit-times': { description: T1, status: T1, 'due-time': T1 },
          undo: { kind: 'fields', type: 'task', id: 'completed', fields: { status: { from: 'todo', to: 'completed' }, 'due-time': { from: DUE, to: null } } },
        });
        queue.add({
          target: { type: 'note', id: 'n2', 'task-id': 'todo' }, operation: 'create-note', created: T1, 'edit-times': {},
          fields: { id: 'n2', text: 'Edited', 'creation-time': T0, 'last-edit-time': T1 }, undo: { kind: 'remove-note', taskId: 'todo', id: 'n2' },
        });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    raw.close();
  }

  it('maps every status onto occurrence 1 and the events of the server migration', async () => {
    const factory = new IDBFactory();
    await legacyDatabase(factory);
    const store = await open(factory);
    const expected = {
      todo: ['ready', 0, null, ['create']],
      'in-progress': ['in-progress', 0, null, ['create', 'start']],
      completed: ['completed', 1, T1, ['create', 'complete']],
      cancelled: ['cancelled', 0, T1, ['create', 'cancel']],
    };
    for (const [id, [status, count, closed, types]] of Object.entries(expected)) {
      const task = await store.getTask(id);
      expect(Object.keys(task)).not.toContain('status');
      expect(Object.keys(task)).not.toContain('last-activity-time');
      expect(task['last-update-time']).toBe(T2);
      expect(task['current-occurrence']).toEqual({
        occurrence: 1, 'start-time': T0, 'due-time': id === 'todo' ? DUE : null, 'target-count': 1,
        'completion-count': count, status, 'close-time': closed,
        'goal-direction': 'at-least', 'goal-measure': 'checks', 'goal-target': 1, 'goal-unit': null, progress: count, 'time-spent-seconds': 0,
      });
      expect(task['lifecycle-rules']).toMatchObject({
        'target-count': 1, 'due-time': id === 'todo' ? DUE : null, 'overdue-handling': id === 'todo' ? 'cancel' : 'keep',
      });
      expect(await store.occurrencesOfTask(id)).toEqual([{ 'task-id': id, ...task['current-occurrence'] }]);
      const events = await store.eventsOfTask(id);
      expect(events.map((event) => [event.type, event['creation-time'], event.occurrence])).toEqual(types.map((type) => [type, type === 'create' ? T0 : T1, 1]));
      expect(events[0]['owner-id']).toBe(id === 'completed' ? 7 : null);
    }
    expect((await store.getTask('completed')).revision).toBe(40);
    store.close();
  });

  it('renames the note fields to owner-id and last-update-time', async () => {
    const factory = new IDBFactory();
    await legacyDatabase(factory);
    const store = await open(factory);
    const notes = await store.notesOfTask('todo');
    expect(notes.map((note) => [note.id, note['owner-id'], note['last-update-time'], note.occurrence])).toEqual([['n2', 7, T1, null], ['n1', null, T0, null]]);
    expect(notes.every((note) => !('author' in note) && !('edit-time' in note))).toBe(true);
    store.close();
  });

  it('turns queued changes of the former shape into rule edits and events', async () => {
    const factory = new IDBFactory();
    await legacyDatabase(factory);
    const store = await open(factory);
    const entries = await store.queue.all();
    expect(entries.map((entry) => entry.operation)).toEqual(['create-task', 'update-task', 'create-note', 'post-event', 'update-rules', 'post-event']);
    expect(entries[0].fields).toEqual({
      id: 'todo', description: 'todo', 'lifecycle-rules': { 'due-time': DUE, 'overdue-handling': 'cancel' }, 'creation-time': T0, lists: [],
    });
    expect(entries[1].fields).toEqual({ description: 'Done' });
    expect(entries[1]['edit-times']).toEqual({ description: T1 });
    expect(entries[2].fields).toEqual({ id: 'n2', text: 'Edited', 'creation-time': T0, 'last-update-time': T1 });
    expect(entries[3]).toMatchObject({ target: { type: 'event', 'task-id': 'todo' }, fields: { type: 'start', 'creation-time': T0, occurrence: 1 } });
    expect(entries[4]).toMatchObject({ target: { type: 'rules', id: 'completed' }, fields: { 'due-time': null }, 'edit-times': { 'due-time': T1 } });
    expect(entries[5]).toMatchObject({ target: { type: 'event', 'task-id': 'completed' }, fields: { type: 'complete', 'creation-time': T1, occurrence: 1 } });
    expect(entries[5].fields.id).toBe(entries[5].target.id);
    store.close();
  });

  it('keeps the undo data of migrated rule edits and events, so a refused one rolls back', async () => {
    const factory = new IDBFactory();
    await legacyDatabase(factory);
    const store = await open(factory);
    const entries = await store.queue.all();
    const [rules, event] = [entries[4], entries[5]];
    expect(rules.undo.fields).toEqual({ 'due-time': { from: DUE, to: null } });
    expect(event.undo.before).toMatchObject({ status: 'ready', 'completion-count': 0 });
    await store.queue.undo(store, event);
    expect((await store.getTask('completed'))['current-occurrence']).toMatchObject({ status: 'ready', 'completion-count': 0, 'close-time': null });
    await store.queue.undo(store, rules);
    expect(await store.getTask('completed')).toMatchObject({ 'lifecycle-rules': { 'due-time': DUE }, 'current-occurrence': { 'due-time': DUE } });
    store.close();
  });
});

describe('the version 6 upgrade', () => {
  const T0 = '2026-10-01T08:00:00.000Z';

  /**
   * Create a version 5 database holding a one-off task, a recurring task, queued changes, and their occurrences.
   * @param {IDBFactory} factory the IndexedDB factory
   * @returns {Promise<void>}
   */
  async function version5Database(factory) {
    const raw = await new Promise((resolve, reject) => {
      const req = factory.open('test', 5);
      req.onupgradeneeded = () => {
        const db = req.result;
        db.createObjectStore('lists', { keyPath: 'id' });
        const tasks = db.createObjectStore('tasks', { keyPath: 'id' });
        db.createObjectStore('memberships');
        db.createObjectStore('notes');
        db.createObjectStore('sync-queue', { keyPath: 'seq', autoIncrement: true });
        db.createObjectStore('sync-state', { keyPath: 'key' });
        db.createObjectStore('sync-log', { keyPath: 'id' }).createIndex('time', 'time');
        const occurrences = db.createObjectStore('occurrences');
        db.createObjectStore('events');
        const rules = {
          'target-count': 3, 'due-time': null, 'overdue-handling': 'cancel', 'recurrence-unit': null,
          'recurrence-interval': null, 'recurrence-end-date': null, 'recurrence-end-count': null, timezone: null,
        };
        const occurrence = { occurrence: 1, 'start-time': T0, 'due-time': null, 'target-count': 3, 'completion-count': 2, status: 'in-progress', 'close-time': null };
        tasks.put({
          id: 't1', description: 'Water', 'owner-id': null, 'lifecycle-rules': rules, 'current-occurrence': occurrence,
          'creation-time': T0, 'last-update-time': T0, 'deletion-time': null,
        });
        occurrences.put({ 'task-id': 't1', ...occurrence }, ['t1', 1]);
        occurrences.put({ 'task-id': 't1', ...occurrence, occurrence: 0, status: 'completed', 'completion-count': 3, 'close-time': T0 }, ['t1', 0]);
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    raw.close();
  }

  it('is version 6', () => {
    expect(DB_VERSION).toBe(6);
  });

  it('fills the goal fields of rules and occurrences, mirrors equal to them, and keeps the counts and statuses', async () => {
    const factory = new IDBFactory();
    await version5Database(factory);
    const store = await open(factory);
    const task = await store.getTask('t1');
    expect(task['lifecycle-rules']).toMatchObject({
      'target-count': 3, 'overdue-handling': 'cancel', 'start-time': null, 'goal-direction': 'at-least', 'goal-measure': 'checks', 'goal-target': 3, 'goal-unit': null,
    });
    expect(task['current-occurrence']).toMatchObject({
      'target-count': 3, 'goal-target': 3, 'completion-count': 2, progress: 2, 'time-spent-seconds': 0, status: 'in-progress',
      'goal-direction': 'at-least', 'goal-measure': 'checks', 'goal-unit': null,
    });
    const stored = await store.occurrencesOfTask('t1');
    expect(stored.map((record) => [record.occurrence, record['goal-target'], record.progress, record['completion-count'], record.status, record['time-spent-seconds']]))
      .toEqual([[0, 3, 3, 3, 'completed', 0], [1, 3, 2, 2, 'in-progress', 0]]);
    expect((await store.listTasks()).map((listed) => listed['current-occurrence']['completion-count'])).toEqual([2]);
    store.close();
  });
});
