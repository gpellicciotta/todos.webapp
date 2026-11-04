import { IDBKeyRange } from 'fake-indexeddb';
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
