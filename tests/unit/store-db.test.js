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
