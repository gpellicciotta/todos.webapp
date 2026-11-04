/**
 * Local data store on IndexedDB: schema, transactions, errors, and the store facade.
 *
 * Records use the field names of the ToDo's service `List`, `Task`, and `Note` schemas, in kebab-case.
 * See docs/specs/local-store.md for the stores and their records.
 */

import * as bin from './bin.js';
import { request, STORES } from './idb.js';
import * as lists from './lists.js';
import * as notes from './notes.js';
import * as tasks from './tasks.js';

export { StoreError, ValidationError } from './idb.js';

export const DB_NAME = 'todos';
export const DB_VERSION = 2;

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
  if (oldVersion < 2) {
    // Out-of-line keys [task-id, id], for the same reason; one key range reads the notes of a task.
    db.createObjectStore(STORES.notes);
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
 * @returns {Promise<object>} the store facade with list, task, membership, note, and recycle bin operations
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
    updateTask: (id, changes, options) => tasks.updateTask(ctx, id, changes, options),
    getTask: (id) => tasks.getTask(ctx, id),
    listTasks: () => tasks.listTasks(ctx),
    addToList: (taskId, listId) => tasks.addToList(ctx, taskId, listId),
    removeFromList: (taskId, listId) => tasks.removeFromList(ctx, taskId, listId),
    listsOfTask: (taskId) => tasks.listsOfTask(ctx, taskId),
    tasksOfList: (listId) => tasks.tasksOfList(ctx, listId),
    addNote: (taskId, input) => notes.addNote(ctx, taskId, input),
    editNote: (id, text) => notes.editNote(ctx, id, text),
    deleteNote: (id) => notes.deleteNote(ctx, id),
    notesOfTask: (taskId) => notes.notesOfTask(ctx, taskId),
    deleteList: (id) => bin.deleteList(ctx, id),
    deleteTask: (id) => bin.deleteTask(ctx, id),
    restoreList: (id) => bin.restoreList(ctx, id),
    restoreTask: (id) => bin.restoreTask(ctx, id),
    purgeForever: (type, id) => bin.purgeForever(ctx, type, id),
    listBin: () => bin.listBin(ctx),
    purgeExpired: (now) => bin.purgeExpired(ctx, now),
  };
}
