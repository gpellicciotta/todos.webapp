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
