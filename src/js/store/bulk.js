/**
 * Whole-store reads and writes for backup export and import, sync merges, and undo.
 *
 * `snapshot` reads every record in one transaction. `applyChanges` reads the same snapshot,
 * lets a synchronous planner compute the writes, and stores them in that one transaction,
 * so nothing can change between planning and writing, and a failure stores nothing.
 * With the `queue` option, the planner's `changes.queue` entries join the change queue in that same transaction.
 * The planner must return records that already follow the store rules: these writes skip validation.
 * A stored task also stores its current occurrence, and a removed task takes its occurrences and events along.
 */

import { request, STORES, transact } from './idb.js';

const ALL_STORES = [STORES.lists, STORES.tasks, STORES.memberships, STORES.notes, STORES.occurrences, STORES.events];

/**
 * Read every record of every store inside a transaction.
 * @param {IDBTransaction} tx a transaction covering all stores
 * @returns {Promise<{lists: object[], tasks: object[], memberships: object[], notes: object[], occurrences: object[], events: object[]}>} the records
 */
async function readAll(tx) {
  const [lists, tasks, memberships, notes, occurrences, events] = await Promise.all(
    ALL_STORES.map((name) => request(tx.objectStore(name).getAll())),
  );
  return { lists, tasks, memberships, notes, occurrences, events };
}

/**
 * Return every record of the store, in key order.
 * @param {{db: IDBDatabase}} ctx store context
 * @param {string[]} [names] the stores to read, all of them by default; the result holds only these
 * @returns {Promise<{lists: object[], tasks: object[], memberships: object[], notes: object[], occurrences: object[], events: object[]}>} the records
 */
export function snapshot(ctx, names = ALL_STORES) {
  if (names === ALL_STORES) {
    return transact(ctx.db, ALL_STORES, 'readonly', readAll);
  }
  return transact(ctx.db, names, 'readonly', async (tx) => {
    const records = await Promise.all(names.map((name) => request(tx.objectStore(name).getAll())));
    return Object.fromEntries(names.map((name, index) => [name, records[index]]));
  });
}

/**
 * Plan and apply bulk writes in one transaction.
 * The planner receives the snapshot and the store clock's current time, and returns
 * `{changes, result}`: `changes.put` maps store names to records to store,
 * `changes.delete` maps `memberships`, `notes`, `events`, and `occurrences` to keys to remove,
 * and `lists` and `tasks` to identifiers to remove.
 * Removing a task also removes its occurrences and events; storing a task also stores its current occurrence.
 * `changes.put.occurrences` stores other occurrences, each with its `task-id`, after the tasks.
 * With `options.queue`, `changes.queue` lists change queue entries without `seq` to append,
 * and `changes.requeue` lists stored entries, with their `seq`, to replace.

 * @param {{db: IDBDatabase, keyRange: typeof IDBKeyRange, now: () => Date}} ctx store context
 * @param {(data: object, now: Date) => {changes: object, result: any}} planner synchronous planner
 * @param {{queue?: boolean}} [options] `queue` opens the change queue in the transaction
 * @returns {Promise<any>} the planner's result
 */
export function applyChanges(ctx, planner, { queue = false } = {}) {
  return transact(ctx.db, queue ? [...ALL_STORES, STORES.queue] : ALL_STORES, 'readwrite', async (tx) => {
    const { changes, result } = planner(await readAll(tx), ctx.now());
    const store = (name) => tx.objectStore(name);
    for (const key of changes.delete?.memberships ?? []) {
      await request(store(STORES.memberships).delete(key));
    }
    for (const key of changes.delete?.notes ?? []) {
      await request(store(STORES.notes).delete(key));
    }
    for (const key of changes.delete?.events ?? []) {
      await request(store(STORES.events).delete(key));
    }
    for (const key of changes.delete?.occurrences ?? []) {
      await request(store(STORES.occurrences).delete(key));
    }
    for (const id of changes.delete?.lists ?? []) {
      await request(store(STORES.lists).delete(id));
    }
    for (const id of changes.delete?.tasks ?? []) {
      await request(store(STORES.tasks).delete(id));
      for (const name of [STORES.occurrences, STORES.events]) {
        await request(store(name).delete(ctx.keyRange.bound([id], [id, []])));
      }
    }
    for (const list of changes.put?.lists ?? []) {
      await request(store(STORES.lists).put(list));
    }
    for (const task of changes.put?.tasks ?? []) {
      await request(store(STORES.tasks).put(task));
      const occurrence = task['current-occurrence'];
      await request(store(STORES.occurrences).put({ 'task-id': task.id, ...occurrence }, [task.id, occurrence.occurrence]));
    }
    for (const occurrence of changes.put?.occurrences ?? []) {
      await request(store(STORES.occurrences).put(occurrence, [occurrence['task-id'], occurrence.occurrence]));
    }
    for (const membership of changes.put?.memberships ?? []) {
      await request(store(STORES.memberships).put(membership, [membership['list-id'], membership['task-id']]));
    }
    for (const note of changes.put?.notes ?? []) {
      await request(store(STORES.notes).put(note, [note['task-id'], note.id]));
    }
    for (const event of changes.put?.events ?? []) {
      await request(store(STORES.events).put(event, [event['task-id'], event.id]));
    }
    for (const entry of queue ? changes.queue ?? [] : []) {
      await request(store(STORES.queue).add(entry));
    }
    for (const entry of queue ? changes.requeue ?? [] : []) {
      await request(store(STORES.queue).put(entry));
    }
    return result;
  });
}
