import { IDBFactory, IDBKeyRange } from 'fake-indexeddb';
import { openStore } from '../../src/js/store/db.js';

/**
 * Open a store on a fresh in-memory IndexedDB with a controllable clock.
 * @param {object} [options] extra store options
 * @returns {Promise<{store: object, clock: {now: number, tick: (ms?: number) => void}, factory: IDBFactory}>}
 */
export async function freshStore(options = {}) {
  const factory = new IDBFactory();
  const clock = {
    now: Date.UTC(2026, 10, 4, 9, 0, 0),
    tick(ms = 1000) {
      clock.now += ms;
    },
  };
  const store = await openStore({ indexedDB: factory, keyRange: IDBKeyRange, name: 'test', now: () => new Date(clock.now), ...options });
  return { store, clock, factory };
}

/**
 * Give a stored list fields that only a sync sets, such as `role`, `owner`, and `sharing`.
 * @param {object} store the store facade
 * @param {string} listId the list identifier
 * @param {object} fields the fields to set
 * @returns {Promise<void>}
 */
export async function setListFields(store, listId, fields) {
  await store.applyChanges((data) => ({
    changes: { put: { lists: [{ ...data.lists.find((list) => list.id === listId), ...fields }] } },
    result: null,
  }));
}
