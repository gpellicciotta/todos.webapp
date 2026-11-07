/**
 * Whole-store reads and writes for backup export and import.
 *
 * `snapshot` reads every record in one transaction. `applyChanges` reads the same snapshot,
 * lets a synchronous planner compute the writes, and stores them in that one transaction,
 * so nothing can change between planning and writing, and a failure stores nothing.
 * The planner must return records that already follow the store rules: these writes skip validation.
 */

import { request, STORES, transact } from './idb.js';

const ALL_STORES = [STORES.lists, STORES.tasks, STORES.memberships, STORES.notes];

/**
 * Read every record of every store inside a transaction.
 * @param {IDBTransaction} tx a transaction covering all stores
 * @returns {Promise<{lists: object[], tasks: object[], memberships: object[], notes: object[]}>} the records
 */
async function readAll(tx) {
  const [lists, tasks, memberships, notes] = await Promise.all(
    ALL_STORES.map((name) => request(tx.objectStore(name).getAll())),
  );
  return { lists, tasks, memberships, notes };
}

/**
 * Return every record of the store, in key order.
 * @param {{db: IDBDatabase}} ctx store context
 * @returns {Promise<{lists: object[], tasks: object[], memberships: object[], notes: object[]}>} the records
 */
export function snapshot(ctx) {
  return transact(ctx.db, ALL_STORES, 'readonly', readAll);
}

/**
 * Plan and apply bulk writes in one transaction.
 * The planner receives the snapshot and the store clock's current time, and returns
 * `{changes, result}`: `changes.put` maps store names to records to store,
 * `changes.delete` maps `memberships` and `notes` to keys to remove, and `lists` and `tasks` to identifiers to remove.
 * @param {{db: IDBDatabase, now: () => Date}} ctx store context
 * @param {(data: object, now: Date) => {changes: object, result: any}} planner synchronous planner
 * @returns {Promise<any>} the planner's result
 */
export function applyChanges(ctx, planner) {
  return transact(ctx.db, ALL_STORES, 'readwrite', async (tx) => {
    const { changes, result } = planner(await readAll(tx), ctx.now());
    for (const key of changes.delete?.memberships ?? []) {
      await request(tx.objectStore(STORES.memberships).delete(key));
    }
    for (const key of changes.delete?.notes ?? []) {
      await request(tx.objectStore(STORES.notes).delete(key));
    }
    for (const id of changes.delete?.lists ?? []) {
      await request(tx.objectStore(STORES.lists).delete(id));
    }
    for (const id of changes.delete?.tasks ?? []) {
      await request(tx.objectStore(STORES.tasks).delete(id));
    }
    for (const list of changes.put?.lists ?? []) {
      await request(tx.objectStore(STORES.lists).put(list));
    }
    for (const task of changes.put?.tasks ?? []) {
      await request(tx.objectStore(STORES.tasks).put(task));
    }
    for (const membership of changes.put?.memberships ?? []) {
      await request(tx.objectStore(STORES.memberships).put(membership, [membership['list-id'], membership['task-id']]));
    }
    for (const note of changes.put?.notes ?? []) {
      await request(tx.objectStore(STORES.notes).put(note, [note['task-id'], note.id]));
    }
    return result;
  });
}
