import { readFileSync } from 'node:fs';
import { IDBFactory, IDBKeyRange } from 'fake-indexeddb';
import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_RULES, firstOccurrence } from '../../src/js/core/occurrences.js';
import { DB_VERSION, openStore, StoreError } from '../../src/js/store/db.js';
import { convertOccurrence } from '../../src/js/store/migrate.js';

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
      completed: ['completed', 1, T1, ['create', 'log']],
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
        entries: id === 'completed' ? [expect.objectContaining({ type: 'log', checked: true })] : [],
      });
      expect(task['lifecycle-rules']).toMatchObject({
        'target-count': 1, 'due-time': id === 'todo' ? DUE : null, 'overdue-handling': id === 'todo' ? 'cancel' : 'keep',
      });
      const occurrence = Object.fromEntries(Object.entries(task['current-occurrence']).filter(([name]) => name !== 'entries'));
      expect(await store.occurrencesOfTask(id)).toEqual([{ 'task-id': id, ...occurrence }]);
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

describe('the version 6 event conversion', () => {
  const { vectors } = JSON.parse(readFileSync(new URL('../fixtures/fold-test-vectors.json', import.meta.url), 'utf8'));
  const T0 = '2026-10-01T08:00:00.000Z';
  const DUE = '2026-10-10T18:00:00.000Z';
  const LATER = '2026-10-11T08:00:00.000Z';

  it('converts the shared migration vectors as the vectors say', () => {
    const migration = vectors.filter((vector) => vector.fold === 'migration');
    expect(migration.length).toBeGreaterThan(0);
    for (const vector of migration) {
      for (const source of vector.occurrences) {
        const { expected } = source;
        const rules = { ...DEFAULT_RULES, 'recurrence-unit': source.recurring ? 'day' : null };
        const occurrence = { ...firstOccurrence(rules, source.start), 'target-count': source.goal.target, 'goal-target': source.goal.target };
        const events = source.events.map(({ time, ...rest }) => ({ occurrence: source.number, 'creation-time': time, ...rest }));
        const result = convertOccurrence({ occurrence, rules, events });
        const where = `${vector.name}, occurrence ${source.number}`;
        expect(result.converted.map(({ id, type, 'creation-time': time, checked, 'target-event-id': target }) => ({
          id, type, time, ...(checked ? { checked } : {}), ...(target ? { 'target-event-id': target } : {}),
        })), where).toEqual(expected.migration.converted);
        expect(result.dropped, where).toEqual(expected.migration.dropped);
        expect(result.mapped, where).toEqual(expected.migration['in-place']);
        expect({ progress: result.real.progress, status: result.real.status, 'close-time': result.real['close-time'] }, where)
          .toEqual({ progress: expected.progress, status: expected.status, 'close-time': expected['close-time'] });
        expect(result.differs, where).toBe(expected.migration['in-place'].status !== expected.status || expected.migration['in-place'].progress !== expected.progress);
      }
    }
  });

  it('throws when the in-place fold cannot reproduce the old fold', () => {
    const rules = { ...DEFAULT_RULES };
    const occurrence = firstOccurrence(rules, T0);
    const events = [
      { id: 'x1', type: 'expire', occurrence: 1, 'creation-time': DUE },
      { id: 'm1', type: 'complete', occurrence: 1, 'creation-time': LATER },
    ];
    expect(() => convertOccurrence({ occurrence, rules, events })).toThrow(/occurrence 1/);
  });

  /**
   * Create a version 5 database with tasks and events of the former kinds.
   * @param {IDBFactory} factory the IndexedDB factory
   * @param {{events: object[][], queue?: object[]}} data the events per task, and queued changes
   * @returns {Promise<void>}
   */
  async function version5Events(factory, { events, queue: entries = [] }) {
    const raw = await new Promise((resolve, reject) => {
      const req = factory.open('test', 5);
      req.onupgradeneeded = () => {
        const db = req.result;
        db.createObjectStore('lists', { keyPath: 'id' });
        const tasks = db.createObjectStore('tasks', { keyPath: 'id' });
        db.createObjectStore('memberships');
        db.createObjectStore('notes');
        const queue = db.createObjectStore('sync-queue', { keyPath: 'seq', autoIncrement: true });
        db.createObjectStore('sync-state', { keyPath: 'key' });
        db.createObjectStore('sync-log', { keyPath: 'id' }).createIndex('time', 'time');
        const occurrences = db.createObjectStore('occurrences');
        const store = db.createObjectStore('events');
        const specs = { a: [2, null], b: [1, null], c: [1, DUE], d: [1, null] };
        Object.entries(specs).forEach(([id, [target, due]]) => {
          const rules = {
            'target-count': target, 'due-time': due, 'overdue-handling': due ? 'cancel' : 'keep', 'recurrence-unit': null,
            'recurrence-interval': null, 'recurrence-end-date': null, 'recurrence-end-count': null, timezone: null,
          };
          // The stored counts are stale on purpose: the conversion refolds from the events.
          const occurrence = { occurrence: 1, 'start-time': T0, 'due-time': due, 'target-count': target, 'completion-count': 7, status: 'completed', 'close-time': T0 };
          tasks.put({
            id, description: id, 'owner-id': null, 'lifecycle-rules': rules, 'current-occurrence': occurrence,
            'creation-time': T0, 'last-update-time': T0, 'deletion-time': null,
          });
          occurrences.put({ 'task-id': id, ...occurrence }, [id, 1]);
          events[id].forEach((event) => store.put({ 'task-id': id, occurrence: 1, 'owner-id': null, details: null, ...event }, [id, event.id]));
        });
        entries.forEach((entry) => queue.add(entry));
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    raw.close();
  }

  const minute = (n) => new Date(Date.parse(T0) + n * 60_000).toISOString();
  const seeded = {
    a: [
      { id: 'a0', type: 'create', 'creation-time': T0 },
      { id: 'a1', type: 'complete', 'creation-time': minute(1) },
      { id: 'a2', type: 'complete', 'creation-time': minute(2) },
      { id: 'a3', type: 'uncomplete', 'creation-time': minute(3) },
    ],
    b: [
      { id: 'b0', type: 'create', 'creation-time': T0 },
      { id: 'b1', type: 'complete', 'creation-time': minute(1), 'owner-id': 7 },
      { id: 'b2', type: 'uncomplete', 'creation-time': minute(2) },
    ],
    c: [
      { id: 'c0', type: 'create', 'creation-time': T0 },
      { id: 'c1', type: 'expire', 'creation-time': DUE },
    ],
    d: [
      { id: 'd0', type: 'create', 'creation-time': T0 },
      { id: 'd1', type: 'uncomplete', 'creation-time': minute(1) },
    ],
  };

  it('turns completions into logs and undos, refolds each occurrence, and counts what it did', async () => {
    const factory = new IDBFactory();
    await version5Events(factory, { events: seeded });
    const info = vi.spyOn(console, 'info').mockImplementation(() => {});
    const store = await openStore({ indexedDB: factory, keyRange: IDBKeyRange, name: 'test' });
    const types = async (id) => (await store.eventsOfTask(id)).map((event) => [event.id, event.type, event['target-event-id'], event.checked]);
    expect(await types('a')).toEqual([['a0', 'create', undefined, undefined], ['a1', 'log', undefined, true], ['a2', 'log', undefined, true], ['a3', 'undo-log', 'a2', undefined]]);
    expect(await types('b')).toEqual([['b0', 'create', undefined, undefined], ['b1', 'log', undefined, true], ['b2', 'undo-log', 'b1', undefined]]);
    expect((await store.eventsOfTask('b'))[1]['owner-id']).toBe(7);
    expect(await types('d')).toEqual([['d0', 'create', undefined, undefined]]);
    const summary = async (id) => {
      const occurrence = (await store.getTask(id))['current-occurrence'];
      return [occurrence.progress, occurrence['completion-count'], occurrence.status, occurrence['close-time'], occurrence.entries?.map((entry) => entry.id)];
    };
    expect(await summary('a')).toEqual([1, 1, 'in-progress', null, ['a1']]);
    expect(await summary('b')).toEqual([0, 0, 'ready', null, []]);
    expect(await summary('c')).toEqual([0, 0, 'failed', DUE, []]);
    expect(await summary('d')).toEqual([0, 0, 'ready', null, []]);
    const [stored] = await store.occurrencesOfTask('a');
    expect(stored).toMatchObject({ progress: 1, status: 'in-progress' });
    expect(stored).not.toHaveProperty('entries');
    expect(info).toHaveBeenCalledWith(expect.stringContaining('1 uncompletes dropped'));
    info.mockRestore();
    store.close();
  });

  it('keeps the real fold where it differs from the old fold, and counts it', async () => {
    const factory = new IDBFactory();
    // The old fold ignores the start after the completion; the real fold, with its retroactive undo, applies it.
    const events = { ...seeded, b: [
      { id: 'b0', type: 'create', 'creation-time': T0 },
      { id: 'b1', type: 'complete', 'creation-time': minute(1) },
      { id: 'b3', type: 'start', 'creation-time': minute(2) },
      { id: 'b2', type: 'uncomplete', 'creation-time': minute(3) },
    ] };
    await version5Events(factory, { events });
    const info = vi.spyOn(console, 'info').mockImplementation(() => {});
    const store = await openStore({ indexedDB: factory, keyRange: IDBKeyRange, name: 'test' });
    expect((await store.getTask('b'))['current-occurrence']).toMatchObject({ progress: 0, status: 'in-progress' });
    expect(info).toHaveBeenCalledWith(expect.stringContaining('1 occurrences refolded differently'));
    info.mockRestore();
    store.close();
  });

  it('aborts and keeps version 5 when the in-place fold cannot reproduce the old fold', async () => {
    const factory = new IDBFactory();
    const events = { ...seeded, c: [
      { id: 'c0', type: 'create', 'creation-time': T0 },
      { id: 'c1', type: 'expire', 'creation-time': DUE },
      { id: 'c2', type: 'complete', 'creation-time': LATER },
    ] };
    await version5Events(factory, { events });
    vi.spyOn(console, 'error').mockImplementation(() => {});
    await expect(openStore({ indexedDB: factory, keyRange: IDBKeyRange, name: 'test' })).rejects.toMatchObject({ code: 'upgrade-failed' });
    expect((await factory.databases()).find((database) => database.name === 'test').version).toBe(5);
    vi.restoreAllMocks();
  });

  it('converts queued rule edits and keeps queued completions', async () => {
    const factory = new IDBFactory();
    const queue = [
      {
        target: { type: 'rules', id: 'a' }, operation: 'update-rules', created: T0, fields: { 'target-count': 3, 'overdue-handling': 'cancel', 'due-time': null },
        'edit-times': { 'target-count': T0, 'overdue-handling': T0, 'due-time': T0 },
        undo: { kind: 'rules', id: 'a', fields: { 'target-count': { from: 2, to: 3 } } },
      },
      {
        target: { type: 'event', id: 'a1', 'task-id': 'a' }, operation: 'post-event', created: T0, fields: { id: 'a1', type: 'complete', 'creation-time': T0, occurrence: 1 },
        'edit-times': {}, undo: { kind: 'event', taskId: 'a', id: 'a1', before: null, mode: 'fold' },
      },
    ];
    await version5Events(factory, { events: seeded, queue });
    vi.spyOn(console, 'info').mockImplementation(() => {});
    const store = await openStore({ indexedDB: factory, keyRange: IDBKeyRange, name: 'test' });
    const entries = await store.queue.all();
    expect(entries[0].fields).toEqual({ 'goal-target': 3, 'overdue-handling': 'fail', 'due-time': null });
    expect(entries[0]['edit-times']).toEqual({ 'goal-target': T0, 'overdue-handling': T0, 'due-time': T0 });
    expect(entries[0].undo.fields).toEqual({ 'target-count': { from: 2, to: 3 } });
    expect(entries[1].fields.type).toBe('complete');
    vi.restoreAllMocks();
    store.close();
  });

  it('converts the events of a database older than version 5 in the same upgrade', async () => {
    const factory = new IDBFactory();
    const raw = await new Promise((resolve, reject) => {
      const req = factory.open('test', 4);
      req.onupgradeneeded = () => {
        const db = req.result;
        db.createObjectStore('lists', { keyPath: 'id' });
        db.createObjectStore('tasks', { keyPath: 'id' }).put({
          id: 'done', description: 'Done', status: 'completed', 'due-time': null, 'overdue-handling': 'keep', 'owner-id': null,
          'creation-time': T0, 'last-update-time': T0, 'last-activity-time': T0, 'deletion-time': null,
        });
        db.createObjectStore('memberships');
        db.createObjectStore('notes');
        db.createObjectStore('sync-queue', { keyPath: 'seq', autoIncrement: true });
        db.createObjectStore('sync-state', { keyPath: 'key' });
        db.createObjectStore('sync-log', { keyPath: 'id' }).createIndex('time', 'time');
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    raw.close();
    vi.spyOn(console, 'info').mockImplementation(() => {});
    const store = await openStore({ indexedDB: factory, keyRange: IDBKeyRange, name: 'test' });
    expect((await store.eventsOfTask('done')).map((event) => [event.type, event.checked])).toEqual([['create', undefined], ['log', true]]);
    expect((await store.getTask('done'))['current-occurrence']).toMatchObject({ progress: 1, status: 'completed', entries: [expect.objectContaining({ type: 'log' })] });
    vi.restoreAllMocks();
    store.close();
  });
});
