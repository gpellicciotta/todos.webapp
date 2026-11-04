/**
 * Task records and list memberships.
 *
 * A task belongs to zero, one, or many lists. Memberships live in their own store,
 * keyed by `[list-id, task-id]`, so each list can keep its own order.
 */

import { uuid7 } from '../lib/uuid7.js';
import { request, StoreError, STORES, transact, ValidationError } from './idb.js';

export const DESCRIPTION_MAX = 500;
export const STATUSES = ['todo', 'in-progress', 'completed', 'cancelled'];
export const OVERDUE_HANDLINGS = ['keep', 'cancel'];

const EDITABLE = ['description', 'status', 'due-time', 'overdue-handling'];
const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Parse a due time; a date without a time of day means 23:59 local time on that date (`TSK-6`).
 * @param {string} value an ISO-8601 date or date-time
 * @returns {number} the Unix time in milliseconds, or NaN when invalid
 */
function parseDueTime(value) {
  const date = DATE_ONLY.exec(value);
  if (!date) {
    return Date.parse(value);
  }
  const [year, month, day] = date.slice(1).map(Number);
  const local = new Date(year, month - 1, day, 23, 59, 0, 0);
  const valid = local.getFullYear() === year && local.getMonth() === month - 1 && local.getDate() === day;
  return valid ? local.getTime() : NaN;
}

/**
 * Validate one editable task field and return its normalized value.
 * @param {string} field the field name
 * @param {unknown} value the input value
 * @returns {unknown} the value to store
 */
function checkField(field, value) {
  switch (field) {
    case 'description': {
      const description = typeof value === 'string' ? value.trim() : '';
      if (!description) {
        throw new ValidationError(field, 'required', 'A task needs a description.');
      }
      if (description.length > DESCRIPTION_MAX) {
        throw new ValidationError(field, 'too-long', `A task description holds at most ${DESCRIPTION_MAX} characters.`);
      }
      return description;
    }
    case 'status': {
      if (!STATUSES.includes(value)) {
        throw new ValidationError(field, 'invalid', `Unknown status: ${value}.`);
      }
      return value;
    }
    case 'overdue-handling': {
      if (!OVERDUE_HANDLINGS.includes(value)) {
        throw new ValidationError(field, 'invalid', `Unknown overdue handling: ${value}.`);
      }
      return value;
    }
    case 'due-time': {
      if (value === null || value === undefined || value === '') {
        return null;
      }
      const time = typeof value === 'string' ? parseDueTime(value) : NaN;
      if (Number.isNaN(time)) {
        throw new ValidationError(field, 'invalid', `Not a valid due time: ${value}.`);
      }
      return new Date(time).toISOString();
    }
    default:
      throw new StoreError('invalid', `Unknown task field: ${field}.`);
  }
}

/**
 * Read a task inside a transaction, failing when it does not exist.
 * @param {IDBTransaction} tx the transaction
 * @param {string} id the task identifier
 * @returns {Promise<object>} the task
 */
async function mustGetTask(tx, id) {
  const task = await request(tx.objectStore(STORES.tasks).get(id));
  if (!task) {
    throw new StoreError('not-found', `No task ${id}.`);
  }
  return task;
}

/**
 * Read a list inside a transaction, failing when it does not exist.
 * @param {IDBTransaction} tx the transaction
 * @param {string} id the list identifier
 * @returns {Promise<object>} the list
 */
async function mustGetList(tx, id) {
  const list = await request(tx.objectStore(STORES.lists).get(id));
  if (!list) {
    throw new StoreError('not-found', `No list ${id}.`);
  }
  return list;
}

/**
 * Store a membership unless it exists; return whether it was added.
 * @param {IDBTransaction} tx the transaction
 * @param {string} taskId the task identifier
 * @param {string} listId the list identifier
 * @param {string} time the ISO time of the change
 * @returns {Promise<boolean>} true when the membership is new
 */
async function putMembership(tx, taskId, listId, time) {
  const store = tx.objectStore(STORES.memberships);
  const key = [listId, taskId];
  if (await request(store.get(key))) {
    return false;
  }
  await request(store.put({ 'list-id': listId, 'task-id': taskId, 'added-time': time }, key));
  return true;
}

/**
 * Create a task, optionally inside lists.
 * @param {{db: IDBDatabase, now: () => Date}} ctx store context
 * @param {object} input the new task: `description` is required, other editable fields are optional
 * @param {{lists?: string[]}} [options] identifiers of the lists the task joins
 * @returns {Promise<object>} the stored task
 */
export async function createTask(ctx, input, { lists = [] } = {}) {
  const time = ctx.now().toISOString();
  const task = {
    id: input.id ?? uuid7(() => ctx.now().getTime()),
    description: checkField('description', input.description),
    status: checkField('status', input.status ?? 'todo'),
    'due-time': checkField('due-time', input['due-time'] ?? null),
    'overdue-handling': checkField('overdue-handling', input['overdue-handling'] ?? 'keep'),
    'owner-id': input['owner-id'] ?? null,
    'creation-time': time,
    'last-update-time': time,
    'last-activity-time': time,
    'deletion-time': null,
  };
  return transact(ctx.db, [STORES.lists, STORES.tasks, STORES.memberships], 'readwrite', async (tx) => {
    await request(tx.objectStore(STORES.tasks).add(task));
    for (const listId of lists) {
      await mustGetList(tx, listId);
      await putMembership(tx, task.id, listId, time);
    }
    return task;
  });
}

/**
 * Update editable task fields; omitted and read-only fields stay unchanged.
 * @param {{db: IDBDatabase, now: () => Date}} ctx store context
 * @param {string} id the task identifier
 * @param {object} changes new values for `description`, `status`, `due-time`, or `overdue-handling`
 * @returns {Promise<object>} the updated task
 */
export function updateTask(ctx, id, changes = {}) {
  return transact(ctx.db, [STORES.tasks], 'readwrite', async (tx) => {
    const task = await mustGetTask(tx, id);
    const updated = { ...task };
    for (const field of EDITABLE) {
      if (field in changes) {
        updated[field] = checkField(field, changes[field]);
      }
    }
    const time = ctx.now().toISOString();
    updated['last-update-time'] = time;
    updated['last-activity-time'] = time;
    await request(tx.objectStore(STORES.tasks).put(updated));
    return updated;
  });
}

/**
 * Read one task, including a deleted one.
 * @param {{db: IDBDatabase}} ctx store context
 * @param {string} id the task identifier
 * @returns {Promise<object|undefined>} the task, or undefined
 */
export function getTask(ctx, id) {
  return transact(ctx.db, [STORES.tasks], 'readonly', (tx) => request(tx.objectStore(STORES.tasks).get(id)));
}

/**
 * Return all tasks outside the recycle bin, in creation order.
 * @param {{db: IDBDatabase}} ctx store context
 * @returns {Promise<object[]>} the tasks
 */
export async function listTasks(ctx) {
  const all = await transact(ctx.db, [STORES.tasks], 'readonly', (tx) => request(tx.objectStore(STORES.tasks).getAll()));
  return all.filter((task) => !task['deletion-time']);
}

/**
 * Add a task to a list; adding an existing member changes nothing.
 * @param {{db: IDBDatabase, now: () => Date}} ctx store context
 * @param {string} taskId the task identifier
 * @param {string} listId the list identifier
 * @returns {Promise<void>}
 */
export function addToList(ctx, taskId, listId) {
  return transact(ctx.db, [STORES.lists, STORES.tasks, STORES.memberships], 'readwrite', async (tx) => {
    const task = await mustGetTask(tx, taskId);
    await mustGetList(tx, listId);
    const time = ctx.now().toISOString();
    if (await putMembership(tx, taskId, listId, time)) {
      await request(tx.objectStore(STORES.tasks).put({ ...task, 'last-activity-time': time }));
    }
  });
}

/**
 * Remove a task from a list; the task and its other memberships stay.
 * @param {{db: IDBDatabase, now: () => Date}} ctx store context
 * @param {string} taskId the task identifier
 * @param {string} listId the list identifier
 * @returns {Promise<void>}
 */
export function removeFromList(ctx, taskId, listId) {
  return transact(ctx.db, [STORES.tasks, STORES.memberships], 'readwrite', async (tx) => {
    const task = await mustGetTask(tx, taskId);
    const store = tx.objectStore(STORES.memberships);
    const key = [listId, taskId];
    if (await request(store.get(key))) {
      await request(store.delete(key));
      await request(tx.objectStore(STORES.tasks).put({ ...task, 'last-activity-time': ctx.now().toISOString() }));
    }
  });
}

/**
 * Return the identifiers of the lists a task belongs to.
 * @param {{db: IDBDatabase}} ctx store context
 * @param {string} taskId the task identifier
 * @returns {Promise<string[]>} the list identifiers
 */
export async function listsOfTask(ctx, taskId) {
  const all = await transact(ctx.db, [STORES.memberships], 'readonly',
    (tx) => request(tx.objectStore(STORES.memberships).getAll()));
  return all.filter((m) => m['task-id'] === taskId).map((m) => m['list-id']);
}

/**
 * Return the tasks of a list outside the recycle bin, in the order they joined it.
 * @param {{db: IDBDatabase, keyRange: typeof IDBKeyRange}} ctx store context
 * @param {string} listId the list identifier
 * @returns {Promise<object[]>} the tasks
 */
export function tasksOfList(ctx, listId) {
  return transact(ctx.db, [STORES.tasks, STORES.memberships], 'readonly', async (tx) => {
    const range = ctx.keyRange.bound([listId], [listId, []]);
    const members = await request(tx.objectStore(STORES.memberships).getAll(range));
    members.sort((a, b) => a['added-time'].localeCompare(b['added-time']));
    const result = [];
    for (const member of members) {
      const task = await request(tx.objectStore(STORES.tasks).get(member['task-id']));
      if (task && !task['deletion-time']) {
        result.push(task);
      }
    }
    return result;
  });
}
