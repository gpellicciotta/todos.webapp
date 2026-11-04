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
