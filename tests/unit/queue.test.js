import { IDBKeyRange } from 'fake-indexeddb';
import { describe, expect, it } from 'vitest';
import { openStore } from '../../src/js/store/db.js';
import { freshStore } from './store-helpers.js';

const TRACKED = { tracking: () => true };

describe('the change queue', () => {
  it('survives a reload and keeps the original order', async () => {
    const { store, clock, factory } = await freshStore(TRACKED);
    const list = await store.createList({ name: 'Home' });
    clock.tick();
    const task = await store.createTask({ description: 'Paint' }, { lists: [list.id] });
    clock.tick();
    await store.updateTask(task.id, { status: 'in-progress' });
    store.close();
    const reopened = await openStore({ indexedDB: factory, keyRange: IDBKeyRange, name: 'test', now: () => new Date(clock.now), ...TRACKED });
    const entries = await reopened.queue.all();
    expect(entries.map((entry) => entry.operation)).toEqual(['create-list', 'create-task', 'update-task']);
    expect(entries.map((entry) => entry.seq)).toEqual([...entries.map((entry) => entry.seq)].sort((a, b) => a - b));
    expect(entries[1].target).toEqual({ type: 'task', id: task.id });
    expect(entries[1].fields.lists).toEqual([list.id]);
  });

  it('records only the changed fields of an update, each with its edit time', async () => {
    const { store, clock } = await freshStore(TRACKED);
    const task = await store.createTask({ description: 'Paint', status: 'todo' });
    clock.tick(5000);
    const updated = await store.updateTask(task.id, { description: 'Paint the fence', status: 'todo' });
    const list = await store.createList({ name: 'Home' });
    clock.tick(5000);
    await store.updateList(list.id, { name: 'Home', description: 'Rooms' });
    const entries = await store.queue.all();
    const taskUpdate = entries.find((entry) => entry.operation === 'update-task');
    expect(taskUpdate.fields).toEqual({ description: 'Paint the fence' });
    expect(taskUpdate['edit-times']).toEqual({ description: updated['last-update-time'] });
    const listUpdate = entries.find((entry) => entry.operation === 'update-list');
    expect(listUpdate.fields).toEqual({ description: 'Rooms' });
    expect(Object.keys(listUpdate['edit-times'])).toEqual(['description']);
  });

  it('records nothing in local mode and nothing for a change that changes nothing', async () => {
    const local = await freshStore();
    await local.store.createList({ name: 'Home' });
    expect(await local.store.queue.count()).toBe(0);
    const { store } = await freshStore(TRACKED);
    const task = await store.createTask({ description: 'Paint' });
    await store.updateTask(task.id, { description: 'Paint' });
    expect(await store.queue.count()).toBe(1);
  });

  it('records memberships, notes, and recycle bin changes in order', async () => {
    const { store } = await freshStore(TRACKED);
    const list = await store.createList({ name: 'Home' });
    const other = await store.createList({ name: 'Work' });
    const first = await store.createTask({ description: 'One' });
    const second = await store.createTask({ description: 'Two' });
    await store.addToList(first.id, list.id);
    await store.addToList(second.id, list.id);
    await store.moveInList(second.id, list.id, { before: first.id });
    await store.removeFromList(first.id, list.id);
    const note = await store.addNote(first.id, { text: 'Hi' });
    await store.editNote(note.id, 'Hello');
    await store.deleteNote(note.id);
    await store.deleteTask(second.id);
    await store.restoreTask(second.id);
    await store.deleteList(other.id);
    await store.restoreList(other.id);
    const entries = await store.queue.all();
    expect(entries.slice(4).map((entry) => entry.operation)).toEqual([
      'add-membership', 'add-membership', 'move-membership', 'remove-membership',
      'create-note', 'edit-note', 'delete-note', 'delete-task', 'restore-task', 'delete-list', 'restore-list',
    ]);
    expect(entries.find((entry) => entry.operation === 'move-membership').fields).toEqual({ before: first.id });
    expect(entries.find((entry) => entry.operation === 'edit-note').fields).toEqual({ text: 'Hello' });
  });

  it('undoes entries on the local data', async () => {
    const { store } = await freshStore(TRACKED);
    const task = await store.createTask({ description: 'Paint' });
    await store.updateTask(task.id, { description: 'Paint more' });
    const [create, update] = await store.queue.all();
    await store.queue.undo(store, update);
    expect((await store.getTask(task.id)).description).toBe('Paint');
    await store.queue.undo(store, create);
    expect(await store.getTask(task.id)).toBeUndefined();
  });
});
