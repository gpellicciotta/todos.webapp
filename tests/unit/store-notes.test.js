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
  it('stores the text, creation time, no edit time, and a null local author', async () => {
    const note = await store.addNote(task.id, { text: 'Bought white paint' });
    expect(note).toMatchObject({
      'task-id': task.id,
      text: 'Bought white paint',
      author: null,
      'creation-time': '2026-11-04T09:00:01.000Z',
      'edit-time': null,
    });
    expect(note.id[14]).toBe('7');
  });

  it('keeps a given author', async () => {
    const author = { id: 7, name: 'Ada' };
    const note = await store.addNote(task.id, { text: 'Hi', author });
    expect(note.author).toEqual(author);
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
    expect((await store.getTask(task.id))['last-activity-time']).toBe(task['last-activity-time']);
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
  it('replaces the text and sets the edit time, keeping the creation time', async () => {
    const note = await store.addNote(task.id, { text: 'Draft' });
    clock.tick(60_000);
    const edited = await store.editNote(note.id, '  Final  ');
    expect(edited).toMatchObject({
      id: note.id,
      'task-id': task.id,
      text: 'Final',
      'creation-time': '2026-11-04T09:00:01.000Z',
      'edit-time': '2026-11-04T09:01:01.000Z',
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
  it('updates the last activity time, not the last update time, on every note change', async () => {
    const note = await store.addNote(task.id, { text: 'Added' });
    let current = await store.getTask(task.id);
    expect(current['last-activity-time']).toBe('2026-11-04T09:00:01.000Z');
    expect(current['last-update-time']).toBe(task['last-update-time']);

    clock.tick();
    await store.editNote(note.id, 'Edited');
    current = await store.getTask(task.id);
    expect(current['last-activity-time']).toBe('2026-11-04T09:00:02.000Z');
    expect(current['last-update-time']).toBe(task['last-update-time']);

    clock.tick();
    await store.deleteNote(note.id);
    current = await store.getTask(task.id);
    expect(current['last-activity-time']).toBe('2026-11-04T09:00:03.000Z');
    expect(current['last-update-time']).toBe(task['last-update-time']);
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
      expect(DB_VERSION).toBe(4);
      expect(await upgraded.listLists()).toMatchObject([{ id: 'list-1', name: 'Home' }]);
      expect(await upgraded.listTasks()).toMatchObject([{ id: 'task-1', description: 'Fix door' }]);
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
