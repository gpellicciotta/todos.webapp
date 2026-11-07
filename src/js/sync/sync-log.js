/**
 * Sync log: what sync changed, refused, or lost, kept for 30 days (`SYN-8`).
 *
 * Records live in the `sync-log` store, keyed by `id` with an index on `time`. Each has a `kind`:
 * - `overwritten`: a value the merge replaced; `target`, `field`, `sent`, `kept`, `kept-edit-time`.
 * - `rejected`: a change the service refused and the app undid; `operation`, `target`, `fields`, `status`, `message`.
 * - `lost-access`: a list the user can no longer see; `target`, `name`, `undone`, `message`.
 * - `error`: a failure that stopped a sync run; `message`, `detail`.
 * See docs/specs/local-store.md, Stores.
 */

import { uuid7 } from '../lib/uuid7.js';
import { request, STORES, transact } from '../store/idb.js';

export const LOG_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Create the log over an open database.
 * @param {{db: IDBDatabase, keyRange: typeof IDBKeyRange, now: () => Date}} ctx the store context
 * @returns {{append: Function, all: Function, purge: Function}} the log
 */
export function createSyncLog(ctx) {
  const read = (work) => transact(ctx.db, [STORES.log], 'readonly', (tx) => work(tx.objectStore(STORES.log)));
  const write = (work) => transact(ctx.db, [STORES.log], 'readwrite', (tx) => work(tx.objectStore(STORES.log)));
  return {
    /**
     * Append records; each gets an identifier and the time.
     * @param {object[]} records the records, each with a `kind`
     * @returns {Promise<void>}
     */
    append: (records) => write(async (store) => {
      const time = ctx.now().toISOString();
      for (const record of records) {
        await request(store.add({ id: uuid7(() => ctx.now().getTime()), time, ...record }));
      }
    }),
    /** @returns {Promise<object[]>} the records, oldest first */
    all: () => read((store) => request(store.index('time').getAll())),
    /**
     * Remove the records older than 30 days.
     * @returns {Promise<number>} how many were removed
     */
    purge: () => write(async (store) => {
      const cutoff = new Date(ctx.now().getTime() - LOG_DAYS * DAY_MS).toISOString();
      const ids = await request(store.index('time').getAllKeys(ctx.keyRange.upperBound(cutoff, true)));
      for (const id of ids) {
        await request(store.delete(id));
      }
      return ids.length;
    }),
  };
}
