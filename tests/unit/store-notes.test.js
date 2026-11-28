import { IDBFactory, IDBKeyRange } from 'fake-indexeddb';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DB_VERSION, openStore, StoreError, ValidationError } from '../../src/js/store/db.js';
import { freshStore } from './store-helpers.js';

const MISSING = '0192f1a2-0000-7000-8000-00000000ffff';

let store;
let clock;
let task;

beforeEach(async () => {
  ({ store, clock } = await freshStore());
  task = await store.createTask({ description: 'Paint the fence' });
  clock.tick();
});

afterEach(() => {
  store.close();
});

describe('addNote', () => {
  it('stores the text, a last update time equal to the creation time, no occurrence, and a null local owner', async () => {
    const note = await store.addNote(task.id, { text: 'Bought white paint' });
    expect(note).toEqual({
      id: note.id,
      'task-id': task.id,
      text: 'Bought white paint',
      'owner-id': null,
      occurrence: null,
      'creation-time': '2026-11-04T09:00:01.000Z',
      'last-update-time': '2026-11-04T09:00:01.000Z',
    });
    expect(note.id[14]).toBe('7');
  });

  it('keeps a given owner', async () => {
    const note = await store.addNote(task.id, { text: 'Hi', 'owner-id': 7 });
    expect(note['owner-id']).toBe(7);
  });

  it('trims the text before checking its length', async () => {
    const note = await store.addNote(task.id, { text: `  ${'x'.repeat(2000)}  ` });
    expect(note.text).toBe('x'.repeat(2000));
  });

  it('accepts notes of 1 and 2000 characters', async () => {
    await expect(store.addNote(task.id, { text: 'x' })).resolves.toBeTruthy();
    await expect(store.addNote(task.id, { text: 'y'.repeat(2000) })).resolves.toBeTruthy();
  });

  it.each([
    ['an empty note', '', 'required'],
    ['a blank note', '   ', 'required'],
    ['a missing text', undefined, 'required'],
    ['a note over 2000 characters', 'x'.repeat(2001), 'too-long'],
  ])('rejects %s and stores nothing', async (_, text, code) => {
    const error = await store.addNote(task.id, { text }).catch((e) => e);
    expect(error).toBeInstanceOf(ValidationError);
    expect(error).toMatchObject({ field: 'text', code });
    expect(await store.notesOfTask(task.id)).toEqual([]);
    expect((await store.getTask(task.id))['last-update-time']).toBe(task['last-update-time']);
  });

  it('fails with not-found for an unknown task', async () => {
    const error = await store.addNote(MISSING, { text: 'Hi' }).catch((e) => e);
    expect(error).toBeInstanceOf(StoreError);
    expect(error.code).toBe('not-found');
  });
});

describe('notesOfTask', () => {
  it('returns the notes of one task, newest first', async () => {
    const other = await store.createTask({ description: 'Other' });
    const first = await store.addNote(task.id, { text: 'First' });
    clock.tick();
    const second = await store.addNote(task.id, { text: 'Second' });
    clock.tick();
    await store.addNote(other.id, { text: 'Elsewhere' });
    const third = await store.addNote(task.id, { text: 'Third' });
    const notes = await store.notesOfTask(task.id);
    expect(notes.map((note) => note.id)).toEqual([third.id, second.id, first.id]);
  });

  it('orders notes created in the same millisecond newest first', async () => {
    const first = await store.addNote(task.id, { text: 'First' });
    const second = await store.addNote(task.id, { text: 'Second' });
    const notes = await store.notesOfTask(task.id);
    expect(notes.map((note) => note.id)).toEqual([second.id, first.id]);
  });

  it('keeps the creation order after an edit', async () => {
    const first = await store.addNote(task.id, { text: 'First' });
    clock.tick();
    const second = await store.addNote(task.id, { text: 'Second' });
    clock.tick();
    await store.editNote(first.id, 'First, edited');
    const notes = await store.notesOfTask(task.id);
    expect(notes.map((note) => note.id)).toEqual([second.id, first.id]);
  });

  it('fails with not-found for an unknown task', async () => {
    await expect(store.notesOfTask(MISSING)).rejects.toMatchObject({ code: 'not-found' });
  });
});

describe('editNote', () => {
  it('replaces the text and sets the last update time, keeping the creation time', async () => {
    const note = await store.addNote(task.id, { text: 'Draft' });
    clock.tick(60_000);
    const edited = await store.editNote(note.id, '  Final  ');
    expect(edited).toMatchObject({
      id: note.id,
      'task-id': task.id,
      text: 'Final',
      'creation-time': '2026-11-04T09:00:01.000Z',
      'last-update-time': '2026-11-04T09:01:01.000Z',
    });
    expect(await store.notesOfTask(task.id)).toEqual([edited]);
  });

  it.each([
    ['an empty text', '', 'required'],
    ['a text over 2000 characters', 'x'.repeat(2001), 'too-long'],
  ])('rejects %s and keeps the note', async (_, text, code) => {
    const note = await store.addNote(task.id, { text: 'Keep me' });
    await expect(store.editNote(note.id, text)).rejects.toMatchObject({ field: 'text', code });
    expect(await store.notesOfTask(task.id)).toEqual([note]);
  });

  it('fails with not-found for an unknown note', async () => {
    await expect(store.editNote(MISSING, 'Hi')).rejects.toMatchObject({ code: 'not-found' });
  });
});

describe('deleteNote', () => {
  it('removes only that note', async () => {
    const first = await store.addNote(task.id, { text: 'First' });
    clock.tick();
    const second = await store.addNote(task.id, { text: 'Second' });
    await store.deleteNote(second.id);
    expect(await store.notesOfTask(task.id)).toEqual([first]);
  });

  it('fails with not-found for an unknown note', async () => {
    await expect(store.deleteNote(MISSING)).rejects.toMatchObject({ code: 'not-found' });
  });
});

describe('task activity', () => {
  it('moves the last update time of the task on every note change (NOT-5)', async () => {
    const note = await store.addNote(task.id, { text: 'Added' });
    expect((await store.getTask(task.id))['last-update-time']).toBe('2026-11-04T09:00:01.000Z');

    clock.tick();
    await store.editNote(note.id, 'Edited');
    expect((await store.getTask(task.id))['last-update-time']).toBe('2026-11-04T09:00:02.000Z');

    clock.tick();
    await store.deleteNote(note.id);
    expect((await store.getTask(task.id))['last-update-time']).toBe('2026-11-04T09:00:03.000Z');
  });
});

describe('schema upgrade', () => {
  /**
   * Create a version-1 database, as the first release of the store wrote it, with one list, task, and membership.
   * @param {IDBFactory} factory the IndexedDB factory
   * @returns {Promise<void>}
   */
  function createVersion1(factory) {
    return new Promise((resolve, reject) => {
      const req = factory.open('legacy', 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        const lists = db.createObjectStore('lists', { keyPath: 'id' });
        const tasks = db.createObjectStore('tasks', { keyPath: 'id' });
        const memberships = db.createObjectStore('memberships');
        lists.add({
          id: 'list-1', name: 'Home', description: '', owner: null,
          'creation-time': '2026-11-01T08:00:00.000Z', 'last-update-time': '2026-11-01T08:00:00.000Z', 'deletion-time': null,
        });
        tasks.add({
          id: 'task-1', description: 'Fix door', status: 'todo', 'due-time': null, 'overdue-handling': 'keep', 'owner-id': null,
          'creation-time': '2026-11-01T08:00:00.000Z', 'last-update-time': '2026-11-01T08:00:00.000Z',
          'last-activity-time': '2026-11-01T08:00:00.000Z', 'deletion-time': null,
        });
        memberships.add({ 'list-id': 'list-1', 'task-id': 'task-1', 'added-time': '2026-11-01T08:00:00.000Z' }, ['list-1', 'task-1']);
      };
      req.onsuccess = () => {
        req.result.close();
        resolve();
      };
      req.onerror = () => reject(req.error);
    });
  }

  it('upgrades version 1 with the notes store and positions, without losing lists, tasks, or memberships', async () => {
    const factory = new IDBFactory();
    await createVersion1(factory);
    const upgraded = await openStore({
      indexedDB: factory, keyRange: IDBKeyRange, name: 'legacy', now: () => new Date(Date.UTC(2026, 10, 4, 9, 0, 0)),
    });
    try {
      expect(DB_VERSION).toBe(6);
      expect(await upgraded.listLists()).toMatchObject([{ id: 'list-1', name: 'Home' }]);
      expect(await upgraded.listTasks()).toMatchObject([{ id: 'task-1', description: 'Fix door', 'current-occurrence': { status: 'ready' } }]);
      expect((await upgraded.tasksOfList('list-1')).map((t) => t.id)).toEqual(['task-1']);
      expect(await upgraded.listMemberships()).toMatchObject([{ 'list-id': 'list-1', 'task-id': 'task-1', position: 'a0' }]);
      expect(await upgraded.notesOfTask('task-1')).toEqual([]);
      const note = await upgraded.addNote('task-1', { text: 'After the upgrade' });
      expect(await upgraded.notesOfTask('task-1')).toEqual([note]);
    }
    finally {
      upgraded.close();
    }
  });
});

describe('note links to occurrences', () => {
  const DAILY = { 'recurrence-unit': 'day', 'recurrence-interval': 1, timezone: 'UTC' };
  let daily;

  beforeEach(async () => {
    daily = await store.createTask({ description: 'Water the plants', 'lifecycle-rules': DAILY });
    clock.tick();
  });

  it('links a note on a recurring task to the occurrence whose period holds its creation time', async () => {
    expect((await store.addNote(daily.id, { text: 'Day one' })).occurrence).toBe(1);
    clock.tick(24 * 3_600_000);
    await store.rollOverTask(daily.id);
    expect((await store.addNote(daily.id, { text: 'Day two' })).occurrence).toBe(2);
  });

  it('keeps a note on a one-off task global unless the caller links it', async () => {
    expect((await store.addNote(task.id, { text: 'Global' })).occurrence).toBeNull();
    expect((await store.addNote(task.id, { text: 'Linked', occurrence: 1 })).occurrence).toBe(1);
    expect((await store.addNote(daily.id, { text: 'Whole task', occurrence: null })).occurrence).toBeNull();
  });

  it('keeps a note global when its creation time lies in no stored period', async () => {
    const connected = await freshStore({ tracking: () => true });
    const recurring = await connected.store.createTask({ description: 'Walk', 'lifecycle-rules': DAILY });
    connected.clock.tick(24 * 3_600_000);
    // Connected, the service rolls over; the period holding the note is not stored yet.
    expect((await connected.store.addNote(recurring.id, { text: 'Late' })).occurrence).toBeNull();
    connected.store.close();
  });

  it('links by the newest occurrence that began by the creation time, as the service does', async () => {
    const WEEKLY = { 'recurrence-unit': 'week', 'recurrence-interval': 1, timezone: 'UTC' };
    const weekly = await store.createTask({ description: 'Mow', 'lifecycle-rules': WEEKLY });
    const first = {
      occurrence: 1, 'start-time': '2026-11-02T00:00:00.000Z', 'due-time': '2026-11-09T00:00:00.000Z', 'goal-target': 1,
      progress: 0, status: 'cancelled', 'close-time': '2026-11-04T09:00:00.000Z',
    };
    // A reopen opened occurrence 2 in the same week; an end rule then closed it at noon.
    const second = { ...first, occurrence: 2, 'due-time': '2026-11-04T12:00:00.000Z', 'close-time': '2026-11-04T12:00:00.000Z' };
    for (const current of [first, second]) {
      await store.applyChanges((data) => ({
        changes: { put: { tasks: [{ ...data.tasks.find((candidate) => candidate.id === weekly.id), 'current-occurrence': current }] } }, result: null,
      }));
    }
    clock.now = Date.parse('2026-11-04T13:00:00.000Z');
    // Occurrence 1 still spans the time, but occurrence 2 began later and has ended: the note stays global.
    expect((await store.addNote(weekly.id, { text: 'After the end' })).occurrence).toBeNull();
    clock.now = Date.parse('2026-11-04T11:00:00.000Z');
    expect((await store.addNote(weekly.id, { text: 'Before noon' })).occurrence).toBe(2);
  });

  it.each([
    ['0', 0, 'invalid'],
    ['a fraction', 1.5, 'invalid'],
    ['a string', '1', 'invalid'],
  ])('refuses a link to %s', async (_, occurrence, code) => {
    await expect(store.addNote(daily.id, { text: 'Bad', occurrence })).rejects.toMatchObject({ field: 'occurrence', code });
    const note = await store.addNote(daily.id, { text: 'Good' });
    await expect(store.editNote(note.id, { occurrence })).rejects.toMatchObject({ field: 'occurrence', code });
  });

  it('refuses a link past the current occurrence with a conflict', async () => {
    await expect(store.addNote(task.id, { text: 'Future', occurrence: 2 })).rejects.toBeInstanceOf(StoreError);
    await expect(store.addNote(task.id, { text: 'Future', occurrence: 2 })).rejects.toMatchObject({ code: 'conflict' });
    const note = await store.addNote(task.id, { text: 'Now' });
    await expect(store.editNote(note.id, { occurrence: 2 })).rejects.toMatchObject({ code: 'conflict' });
    expect(await store.notesOfTask(task.id)).toEqual([note]);
  });

  it('changes and clears a link, setting the last update time and keeping the text', async () => {
    clock.tick(24 * 3_600_000);
    await store.rollOverTask(daily.id);
    const note = await store.addNote(daily.id, { text: 'Pruned' });
    clock.tick(60_000);
    const moved = await store.editNote(note.id, { occurrence: 1 });
    expect(moved).toMatchObject({ text: 'Pruned', occurrence: 1, 'last-update-time': new Date(clock.now).toISOString() });
    clock.tick(60_000);
    const cleared = await store.editNote(note.id, { occurrence: null });
    expect(cleared).toMatchObject({ text: 'Pruned', occurrence: null });
    const both = await store.editNote(note.id, { text: 'Pruned twice', occurrence: 2 });
    expect(both).toMatchObject({ text: 'Pruned twice', occurrence: 2 });
    expect(await store.notesOfTask(daily.id)).toEqual([both]);
  });

  it('refuses an edit without text or link', async () => {
    const note = await store.addNote(daily.id, { text: 'Keep' });
    await expect(store.editNote(note.id, {})).rejects.toBeInstanceOf(ValidationError);
  });
});
