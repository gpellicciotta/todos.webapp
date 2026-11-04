/**
 * Local data store on IndexedDB: schema, transactions, errors, and the store facade.
 *
 * Records use the field names of the ToDo's service `List` and `Task` schemas, in kebab-case.
 * See docs/specs/local-store.md for the stores and their records.
 */

import { request, STORES } from './idb.js';
import * as lists from './lists.js';
import * as tasks from './tasks.js';

export { StoreError, ValidationError } from './idb.js';

export const DB_NAME = 'todos';
export const DB_VERSION = 1;

/**
 * Create or upgrade the schema.
 * @param {IDBDatabase} db the database being upgraded
 * @param {number} oldVersion the version before the upgrade, 0 for a new database
 */
function upgrade(db, oldVersion) {
  if (oldVersion < 1) {
    db.createObjectStore(STORES.lists, { keyPath: 'id' });
    db.createObjectStore(STORES.tasks, { keyPath: 'id' });
    // Out-of-line keys [list-id, task-id]: IndexedDB key paths cannot hold the dashed field names.
    db.createObjectStore(STORES.memberships);
  }
}

/**
 * Open the database, creating or upgrading it as needed.
 * @param {IDBFactory} factory the IndexedDB factory
 * @param {string} name the database name
 * @returns {Promise<IDBDatabase>} the open database
 */
export function openDatabase(factory, name) {
  const req = factory.open(name, DB_VERSION);
  req.onupgradeneeded = (event) => upgrade(req.result, event.oldVersion);
  return request(req);
}

/**
 * Open the local store.
 * @param {object} [options] store options
 * @param {IDBFactory} [options.indexedDB] the IndexedDB factory, the browser's by default
 * @param {string} [options.name] the database name
 * @param {typeof IDBKeyRange} [options.keyRange] the IDBKeyRange class of the same IndexedDB implementation
 * @param {() => Date} [options.now] the clock
 * @returns {Promise<object>} the store facade with list, task, and membership operations
 */
export async function openStore({
  indexedDB = globalThis.indexedDB,
  keyRange = globalThis.IDBKeyRange,
  name = DB_NAME,
  now = () => new Date(),
} = {}) {
  const db = await openDatabase(indexedDB, name);
  const ctx = { db, keyRange, now };
  return {
    close: () => db.close(),
    createList: (input) => lists.createList(ctx, input),
    updateList: (id, changes) => lists.updateList(ctx, id, changes),
    getList: (id) => lists.getList(ctx, id),
    listLists: () => lists.listLists(ctx),
    createTask: (input, options) => tasks.createTask(ctx, input, options),
    updateTask: (id, changes) => tasks.updateTask(ctx, id, changes),
    getTask: (id) => tasks.getTask(ctx, id),
    listTasks: () => tasks.listTasks(ctx),
    addToList: (taskId, listId) => tasks.addToList(ctx, taskId, listId),
    removeFromList: (taskId, listId) => tasks.removeFromList(ctx, taskId, listId),
    listsOfTask: (taskId) => tasks.listsOfTask(ctx, taskId),
    tasksOfList: (listId) => tasks.tasksOfList(ctx, listId),
  };
}
