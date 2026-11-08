/**
 * The recycle bin: delete, restore, list, permanently delete, empty, and purge lists and tasks; erase all data.
 *
 * Deleting sets `deletion-time` and keeps every membership, so restoring brings them back (`BIN-3`).
 * Lists and tasks never delete each other: purging a list keeps its tasks (`LST-6`, `LST-7`).
 * Entries deleted more than 30 days ago can no longer be restored and are purged (`BIN-2`, `BIN-5`).
 */

import { request, StoreError, STORES, transact } from './idb.js';

export const RETENTION_DAYS = 30;
const RETENTION_MS = RETENTION_DAYS * 86_400_000;
const TYPES = { list: STORES.lists, task: STORES.tasks };
const ALL_STORES = [STORES.lists, STORES.tasks, STORES.memberships, STORES.notes];

/**
 * Return the object store name of a bin entry type.
 * @param {string} type `list` or `task`
 * @returns {string} the object store name
 */
function storeOf(type) {
  const name = TYPES[type];
  if (!name) {
    throw new StoreError('invalid', `Unknown recycle bin entry type: ${type}.`);
  }
  return name;
}

/**
 * Return the time a deleted entry is purged: 30 days after its deletion.
 * @param {string} deletionTime the ISO deletion time
 * @returns {string} the ISO purge time
 */
export function purgeTime(deletionTime) {
  return new Date(Date.parse(deletionTime) + RETENTION_MS).toISOString();
}

/**
 * Read a list or task inside a transaction, failing when it does not exist.
 * @param {IDBTransaction} tx the transaction
 * @param {string} type `list` or `task`
 * @param {string} id the identifier
 * @returns {Promise<object>} the record
 */
async function mustGet(tx, type, id) {
  const record = await request(tx.objectStore(storeOf(type)).get(id));
  if (!record) {
    throw new StoreError('not-found', `No ${type} ${id}.`);
  }
  return record;
}

/**
 * Read a list or task in the recycle bin inside a transaction, failing when it is missing or not deleted.
 * @param {IDBTransaction} tx the transaction
 * @param {string} type `list` or `task`
 * @param {string} id the identifier
 * @returns {Promise<object>} the record
 */
async function mustGetDeleted(tx, type, id) {
  const record = await mustGet(tx, type, id);
  if (!record['deletion-time']) {
    throw new StoreError('not-deleted', `The ${type} ${id} is not in the recycle bin.`);
  }
  return record;
}

/**
 * Move a list or task to the recycle bin.
 * @param {{db: IDBDatabase, now: () => Date}} ctx store context
 * @param {string} type `list` or `task`
 * @param {string} id the identifier
 * @returns {Promise<object>} the deleted record
 */
function moveToBin(ctx, type, id) {
  return transact(ctx.db, [storeOf(type)], 'readwrite', async (tx) => {
    const record = await mustGet(tx, type, id);
    if (record['deletion-time']) {
      throw new StoreError('deleted', `The ${type} ${id} is already in the recycle bin.`);
    }
    const time = ctx.now().toISOString();
    const updated = { ...record, 'deletion-time': time, 'last-update-time': time };
    if (type === 'task') {
      updated['last-activity-time'] = time;
    }
    await request(tx.objectStore(storeOf(type)).put(updated));
    return updated;
  });
}

/**
 * Bring a list or task back from the recycle bin within 30 days of its deletion.
 * @param {{db: IDBDatabase, now: () => Date}} ctx store context
 * @param {string} type `list` or `task`
 * @param {string} id the identifier
 * @returns {Promise<object>} the restored record
 */
function restore(ctx, type, id) {
  return transact(ctx.db, [storeOf(type)], 'readwrite', async (tx) => {
    const record = await mustGetDeleted(tx, type, id);
    const now = ctx.now();
    if (now.getTime() > Date.parse(purgeTime(record['deletion-time']))) {
      throw new StoreError('expired', `The ${type} ${id} was deleted more than ${RETENTION_DAYS} days ago.`);
    }
    const time = now.toISOString();
    const updated = { ...record, 'deletion-time': null, 'last-update-time': time };
    if (type === 'task') {
      updated['last-activity-time'] = time;
    }
    await request(tx.objectStore(storeOf(type)).put(updated));
    return updated;
  });
}

/**
 * Remove a list or task for good inside a transaction, with its memberships and, for a task, its notes.
 * @param {IDBTransaction} tx a read-write transaction covering all stores
 * @param {{keyRange: typeof IDBKeyRange}} ctx store context
 * @param {string} type `list` or `task`
 * @param {string} id the identifier
 * @returns {Promise<void>}
 */
async function removeRecord(tx, ctx, type, id) {
  await request(tx.objectStore(storeOf(type)).delete(id));
  const memberships = tx.objectStore(STORES.memberships);
  if (type === 'list') {
    await request(memberships.delete(ctx.keyRange.bound([id], [id, []])));
    return;
  }
  const keys = await request(memberships.getAllKeys());
  for (const key of keys.filter((candidate) => candidate[1] === id)) {
    await request(memberships.delete(key));
  }
  await request(tx.objectStore(STORES.notes).delete(ctx.keyRange.bound([id], [id, []])));
}

/**
 * Move a list to the recycle bin; its memberships stay, and its tasks stay in their other lists.
 * @param {{db: IDBDatabase, now: () => Date}} ctx store context
 * @param {string} id the list identifier
 * @returns {Promise<object>} the deleted list
 */
export function deleteList(ctx, id) {
  return moveToBin(ctx, 'list', id);
}

/**
 * Move a task to the recycle bin; it disappears from every list and view.
 * @param {{db: IDBDatabase, now: () => Date}} ctx store context
 * @param {string} id the task identifier
 * @returns {Promise<object>} the deleted task
 */
export function deleteTask(ctx, id) {
  return moveToBin(ctx, 'task', id);
}

/**
 * Restore a list with all its memberships.
 * @param {{db: IDBDatabase, now: () => Date}} ctx store context
 * @param {string} id the list identifier
 * @returns {Promise<object>} the restored list
 */
export function restoreList(ctx, id) {
  return restore(ctx, 'list', id);
}

/**
 * Restore a task with all its memberships.
 * @param {{db: IDBDatabase, now: () => Date}} ctx store context
 * @param {string} id the task identifier
 * @returns {Promise<object>} the restored task
 */
export function restoreTask(ctx, id) {
  return restore(ctx, 'task', id);
}

/**
 * Permanently delete a recycle bin entry (`BIN-4`); the caller asks for confirmation first.
 * @param {{db: IDBDatabase, keyRange: typeof IDBKeyRange}} ctx store context
 * @param {string} type `list` or `task`
 * @param {string} id the identifier
 * @returns {Promise<void>}
 */
export async function purgeForever(ctx, type, id) {
  storeOf(type);
  await transact(ctx.db, ALL_STORES, 'readwrite', async (tx) => {
    await mustGetDeleted(tx, type, id);
    await removeRecord(tx, ctx, type, id);
  });
}

/**
 * Permanently delete every recycle bin entry in one transaction (`BIN-7`); the caller asks for confirmation first.
 * Like `purgeForever`, it queues nothing for sync.
 * @param {{db: IDBDatabase, keyRange: typeof IDBKeyRange}} ctx store context
 * @returns {Promise<{type: string, id: string}[]>} the purged entries
 */
export function emptyBin(ctx) {
  return transact(ctx.db, ALL_STORES, 'readwrite', async (tx) => {
    const purged = [];
    for (const type of Object.keys(TYPES)) {
      const records = await request(tx.objectStore(storeOf(type)).getAll());
      for (const record of records.filter((r) => r['deletion-time'])) {
        await removeRecord(tx, ctx, type, record.id);
        purged.push({ type, id: record.id });
      }
    }
    return purged;
  });
}

/**
 * Permanently erase every list, task, membership, note, and recycle bin entry in one transaction (`BAK-15`).
 * The caller asks for confirmation first and offers a backup. It leaves the sync stores alone and queues nothing,
 * so the app only offers it while not connected.
 * @param {{db: IDBDatabase}} ctx store context
 * @returns {Promise<{lists: number, tasks: number}>} how many lists and tasks it erased
 */
export function deleteAllData(ctx) {
  return transact(ctx.db, ALL_STORES, 'readwrite', async (tx) => {
    const counts = {
      lists: await request(tx.objectStore(STORES.lists).count()),
      tasks: await request(tx.objectStore(STORES.tasks).count()),
    };
    for (const name of ALL_STORES) {
      await request(tx.objectStore(name).clear());
    }
    return counts;
  });
}

/**
 * Return the recycle bin entries, most recently deleted first.
 * Lists carry their `name`, tasks their `description`.
 * @param {{db: IDBDatabase}} ctx store context
 * @returns {Promise<object[]>} entries with `type`, `id`, `name` or `description`, `deletion-time`, and `purge-time`
 */
export async function listBin(ctx) {
  const [lists, tasks] = await transact(ctx.db, [STORES.lists, STORES.tasks], 'readonly', (tx) => Promise.all([
    request(tx.objectStore(STORES.lists).getAll()),
    request(tx.objectStore(STORES.tasks).getAll()),
  ]));
  const entry = (type, record, label) => ({
    type,
    id: record.id,
    [label]: record[label],
    'deletion-time': record['deletion-time'],
    'purge-time': purgeTime(record['deletion-time']),
  });
  return [
    ...lists.filter((list) => list['deletion-time']).map((list) => entry('list', list, 'name')),
    ...tasks.filter((task) => task['deletion-time']).map((task) => entry('task', task, 'description')),
  ].sort((a, b) => b['deletion-time'].localeCompare(a['deletion-time']));
}

/**
 * Permanently delete every entry deleted more than 30 days ago, in one transaction.
 * @param {{db: IDBDatabase, keyRange: typeof IDBKeyRange, now: () => Date}} ctx store context
 * @param {Date} [now] the current time, the store clock by default
 * @returns {Promise<{type: string, id: string}[]>} the purged entries
 */
export function purgeExpired(ctx, now = ctx.now()) {
  const cutoff = new Date(now.getTime() - RETENTION_MS).toISOString();
  return transact(ctx.db, ALL_STORES, 'readwrite', async (tx) => {
    const purged = [];
    for (const type of Object.keys(TYPES)) {
      const records = await request(tx.objectStore(storeOf(type)).getAll());
      for (const record of records.filter((r) => r['deletion-time'] && r['deletion-time'] < cutoff)) {
        await removeRecord(tx, ctx, type, record.id);
        purged.push({ type, id: record.id });
      }
    }
    return purged;
  });
}
