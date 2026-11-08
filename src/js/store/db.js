/**
 * Local data store on IndexedDB: schema, transactions, errors, and the store facade.
 *
 * Records use the field names of the ToDo's service `List`, `Task`, and `Note` schemas, in kebab-case.
 * See docs/specs/local-store.md for the stores and their records.
 */

import * as bin from './bin.js';
import * as bulk from './bulk.js';
import { StoreError, STORES } from './idb.js';
import * as lists from './lists.js';
import * as notes from './notes.js';
import * as tasks from './tasks.js';
import { createQueue, isTracked, trackChange } from '../sync/queue.js';

export { StoreError, ValidationError } from './idb.js';

export const DB_NAME = 'todos';
export const DB_VERSION = 4;

/**
 * Create or upgrade the schema.
 * @param {IDBDatabase} db the database being upgraded
 * @param {number} oldVersion the version before the upgrade, 0 for a new database
 * @param {IDBTransaction} tx the version-change transaction
 */
function upgrade(db, oldVersion, tx) {
  if (oldVersion < 1) {
    db.createObjectStore(STORES.lists, { keyPath: 'id' });
    db.createObjectStore(STORES.tasks, { keyPath: 'id' });
    // Out-of-line keys [list-id, task-id]: IndexedDB key paths cannot hold the dashed field names.
    db.createObjectStore(STORES.memberships);
  }
  if (oldVersion < 2) {
    // Out-of-line keys [task-id, id], for the same reason; one key range reads the notes of a task.
    db.createObjectStore(STORES.notes);
  }
  if (oldVersion >= 1 && oldVersion < 3) {
    // Memberships gain positions for the manual order, assigned per list in added-time order.
    tasks.backfillPositions(tx.objectStore(STORES.memberships));
  }
  if (oldVersion < 4) {
    // All sync stores land at once, so later sync tasks add none; existing stores and data stay unchanged.
    db.createObjectStore(STORES.queue, { keyPath: 'seq', autoIncrement: true });
    db.createObjectStore(STORES.state, { keyPath: 'key' });
    db.createObjectStore(STORES.log, { keyPath: 'id' }).createIndex('time', 'time');
  }
}

/** Facade operations that change data; subscribers hear of each one once it commits. */
const WRITES = [
  'createList', 'updateList', 'createTask', 'updateTask', 'addToList', 'removeFromList', 'moveInList',
  'addNote', 'editNote', 'deleteNote', 'deleteList', 'deleteTask', 'restoreList', 'restoreTask',
  'purgeForever', 'emptyBin', 'purgeExpired', 'applyChanges',
];

/**
 * Open the database, creating or upgrading it as needed.
 * A newer version opened elsewhere closes this connection and calls `onVersionChange`.
 * An older connection that stays open fails the open with a `blocked` StoreError.
 * @param {IDBFactory} factory the IndexedDB factory
 * @param {string} name the database name
 * @param {() => void} [onVersionChange] called after a newer version closed this connection
 * @returns {Promise<IDBDatabase>} the open database
 */
export function openDatabase(factory, name, onVersionChange = () => {}) {
  return new Promise((resolve, reject) => {
    const req = factory.open(name, DB_VERSION);
    let blocked = false;
    req.onupgradeneeded = (event) => upgrade(req.result, event.oldVersion, req.transaction);
    req.onblocked = () => {
      blocked = true;
      reject(new StoreError('blocked', "Close other tabs of ToDo's to finish the update."));
    };
    req.onsuccess = () => {
      const db = req.result;
      if (blocked) {
        db.close();
        return;
      }
      db.onversionchange = () => {
        db.close();
        onVersionChange();
      };
      resolve(db);
    };
    req.onerror = () => reject(req.error);
  });
}

/**
 * Open the local store.
 * @param {object} [options] store options
 * @param {IDBFactory} [options.indexedDB] the IndexedDB factory, the browser's by default
 * @param {string} [options.name] the database name
 * @param {typeof IDBKeyRange} [options.keyRange] the IDBKeyRange class of the same IndexedDB implementation
 * @param {() => Date} [options.now] the clock
 * @param {() => void} [options.onVersionChange] called after a newer app version closed the connection
 * @param {boolean} [options.broadcast] tell stores in other tabs of each write, through a BroadcastChannel
 * @param {() => boolean} [options.tracking] tells whether the device is connected; while it is, each write also joins the change queue
 * @returns {Promise<object>} the store facade with list, task, membership, note, recycle bin, and bulk operations;
 *   `subscribe(listener)` hears of every write, as `{operation, remote}`, and returns an unsubscribe function;
 *   `queue` holds the change queue, the sync state, and the sync log (see sync/queue.js)
 */
export async function openStore({
  indexedDB = globalThis.indexedDB,
  keyRange = globalThis.IDBKeyRange,
  name = DB_NAME,
  now = () => new Date(),
  onVersionChange,
  broadcast = false,
  tracking = () => false,
} = {}) {
  const db = await openDatabase(indexedDB, name, onVersionChange);
  const ctx = { db, keyRange, now };
  const listeners = new Set();
  const channel = broadcast && typeof BroadcastChannel === 'function' ? new BroadcastChannel(`${name}-changes`) : null;
  /**
   * Tell every subscriber of a write; a failing subscriber never fails the committed write or the others.
   * @param {{operation: string, remote: boolean}} change the write
   */
  const emit = (change) => listeners.forEach((listener) => {
    try {
      listener(change);
    }
    catch (error) {
      console.error('Store subscriber failed:', error);
    }
  });
  if (channel) {
    channel.onmessage = (event) => emit({ operation: String(event.data?.operation), remote: true });
  }
  const queue = createQueue(ctx);
  const facade = {
    queue,
    close: () => {
      channel?.close();
      db.close();
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    createList: (input) => lists.createList(ctx, input),
    validateList: (input) => lists.validateList(ctx, input),
    updateList: (id, changes) => lists.updateList(ctx, id, changes),
    getList: (id) => lists.getList(ctx, id),
    listLists: () => lists.listLists(ctx),
    createTask: (input, options) => tasks.createTask(ctx, input, options),
    updateTask: (id, changes, options) => tasks.updateTask(ctx, id, changes, options),
    getTask: (id) => tasks.getTask(ctx, id),
    listTasks: () => tasks.listTasks(ctx),
    addToList: (taskId, listId) => tasks.addToList(ctx, taskId, listId),
    removeFromList: (taskId, listId) => tasks.removeFromList(ctx, taskId, listId),
    listsOfTask: (taskId) => tasks.listsOfTask(ctx, taskId),
    tasksOfList: (listId) => tasks.tasksOfList(ctx, listId),
    moveInList: (taskId, listId, placement) => tasks.moveInList(ctx, taskId, listId, placement),
    listMemberships: () => tasks.listMemberships(ctx),
    addNote: (taskId, input) => notes.addNote(ctx, taskId, input),
    editNote: (id, text) => notes.editNote(ctx, id, text),
    deleteNote: (id) => notes.deleteNote(ctx, id),
    notesOfTask: (taskId) => notes.notesOfTask(ctx, taskId),
    deleteList: (id) => bin.deleteList(ctx, id),
    deleteTask: (id) => bin.deleteTask(ctx, id),
    restoreList: (id) => bin.restoreList(ctx, id),
    restoreTask: (id) => bin.restoreTask(ctx, id),
    purgeForever: (type, id) => bin.purgeForever(ctx, type, id),
    emptyBin: () => bin.emptyBin(ctx),
    listBin: () => bin.listBin(ctx),
    purgeExpired: (now) => bin.purgeExpired(ctx, now),
    snapshot: () => bulk.snapshot(ctx),
    applyChanges: (planner, options) => bulk.applyChanges(ctx, planner, options),
  };
  for (const operation of WRITES) {
    const write = facade[operation];
    facade[operation] = async (...args) => {
      const record = isTracked(operation) && tracking() ? await trackChange(ctx, queue, operation, args) : null;
      const result = await write(...args);
      await record?.(result);
      emit({ operation, remote: false });
      channel?.postMessage({ operation });
      return result;
    };
  }
  return facade;
}
