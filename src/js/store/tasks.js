/**
 * Task records and list memberships.
 *
 * A task belongs to zero, one, or many lists. Memberships live in their own store,
 * keyed by `[list-id, task-id]`, so each list can keep its own order.
 * Each membership has a fractional-index `position`; a list shows its tasks in ascending position order (`LV-2` to `LV-5`).
 * Deleted tasks and lists keep their memberships, but are hidden and reject changes (`BIN-6`).
 */

import { keyBetween, keysBetween, MAX_KEY_LENGTH } from '../lib/fractional-index.js';
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
export async function mustGetTask(tx, id) {
  const task = await request(tx.objectStore(STORES.tasks).get(id));
  if (!task) {
    throw new StoreError('not-found', `No task ${id}.`);
  }
  return task;
}

/**
 * Read a task outside the recycle bin inside a transaction, failing when it is missing or deleted.
 * @param {IDBTransaction} tx the transaction
 * @param {string} id the task identifier
 * @returns {Promise<object>} the task
 */
export async function mustGetLiveTask(tx, id) {
  const task = await mustGetTask(tx, id);
  if (task['deletion-time']) {
    throw new StoreError('deleted', `Task ${id} is in the recycle bin.`);
  }
  return task;
}

/**
 * Set a task's last activity time inside a transaction, leaving its last update time unchanged.
 * Fails when the task is missing or deleted, so deleted tasks accept no note or membership changes.
 * @param {IDBTransaction} tx a read-write transaction covering the tasks store
 * @param {string} id the task identifier
 * @param {string} time the ISO time of the activity
 * @returns {Promise<object>} the updated task
 */
export async function markActivity(tx, id, time) {
  const task = await mustGetLiveTask(tx, id);
  const updated = { ...task, 'last-activity-time': time };
  await request(tx.objectStore(STORES.tasks).put(updated));
  return updated;
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
 * Read a list outside the recycle bin inside a transaction, failing when it is missing or deleted.
 * @param {IDBTransaction} tx the transaction
 * @param {string} id the list identifier
 * @returns {Promise<object>} the list
 */
async function mustGetLiveList(tx, id) {
  const list = await mustGetList(tx, id);
  if (list['deletion-time']) {
    throw new StoreError('deleted', `List ${id} is in the recycle bin.`);
  }
  return list;
}

/**
 * Return the key of a membership record.
 * @param {object} membership the membership
 * @returns {[string, string]} the key `[list-id, task-id]`
 */
function membershipKey(membership) {
  return [membership['list-id'], membership['task-id']];
}

/**
 * Compare memberships by position in code unit order, which equals byte order for keys, then by task identifier.
 * @param {object} a a membership
 * @param {object} b another membership
 * @returns {number} negative, zero, or positive
 */
function byPosition(a, b) {
  const x = a.position ?? '';
  const y = b.position ?? '';
  if (x !== y) {
    return x < y ? -1 : 1;
  }
  if (a['task-id'] === b['task-id']) {
    return 0;
  }
  return a['task-id'] < b['task-id'] ? -1 : 1;
}

/**
 * Read the memberships of a list inside a transaction, in ascending position order.
 * @param {IDBTransaction} tx the transaction
 * @param {typeof IDBKeyRange} keyRange the IDBKeyRange class
 * @param {string} listId the list identifier
 * @returns {Promise<object[]>} the memberships
 */
async function membersOfList(tx, keyRange, listId) {
  const range = keyRange.bound([listId], [listId, []]);
  const members = await request(tx.objectStore(STORES.memberships).getAll(range));
  return members.sort(byPosition);
}

/**
 * Store a membership at an index among the other memberships of its list.
 * The new position goes between the neighbors, so no other membership changes.
 * When that position would exceed 128 characters, or the neighbors share a position,
 * the whole list gets short, evenly spread positions in the same order instead.
 * @param {IDBTransaction} tx a read-write transaction covering the memberships store
 * @param {object[]} others the other memberships of the list, in position order
 * @param {object} membership the membership to place
 * @param {number} index the index among `others` before which it goes
 * @returns {Promise<void>}
 */
async function placeMembership(tx, others, membership, index) {
  const store = tx.objectStore(STORES.memberships);
  const lower = index > 0 ? others[index - 1].position : null;
  const upper = index < others.length ? others[index].position : null;
  let position = null;
  try {
    position = keyBetween(lower ?? null, upper ?? null);
  }
  catch {
    // Equal, missing, or malformed neighbor positions: only a rebalance can place the membership.
  }
  if (position !== null && position.length <= MAX_KEY_LENGTH) {
    await request(store.put({ ...membership, position }, membershipKey(membership)));
    return;
  }
  const ordered = [...others.slice(0, index), membership, ...others.slice(index)];
  const positions = keysBetween(null, null, ordered.length);
  for (let i = 0; i < ordered.length; i++) {
    await request(store.put({ ...ordered[i], position: positions[i] }, membershipKey(ordered[i])));
  }
}

/**
 * Store a membership after the last task of its list unless it exists; return whether it was added (`LV-5`).
 * @param {IDBTransaction} tx the transaction
 * @param {typeof IDBKeyRange} keyRange the IDBKeyRange class
 * @param {string} taskId the task identifier
 * @param {string} listId the list identifier
 * @param {string} time the ISO time of the change
 * @returns {Promise<boolean>} true when the membership is new
 */
async function putMembership(tx, keyRange, taskId, listId, time) {
  const store = tx.objectStore(STORES.memberships);
  if (await request(store.get([listId, taskId]))) {
    return false;
  }
  const others = await membersOfList(tx, keyRange, listId);
  await placeMembership(tx, others, { 'list-id': listId, 'task-id': taskId, 'added-time': time }, others.length);
  return true;
}

/**
 * Give every membership of an upgraded database a position, per list in added-time order.
 * Runs inside the version-change transaction, so it issues requests without awaiting them.
 * @param {IDBObjectStore} store the memberships store
 */
export function backfillPositions(store) {
  const all = store.getAll();
  all.onsuccess = () => {
    const byList = new Map();
    for (const membership of all.result) {
      const members = byList.get(membership['list-id']) ?? [];
      members.push(membership);
      byList.set(membership['list-id'], members);
    }
    for (const members of byList.values()) {
      members.sort((a, b) => a['added-time'].localeCompare(b['added-time']) || (a['task-id'] < b['task-id'] ? -1 : 1));
      const positions = keysBetween(null, null, members.length);
      members.forEach((membership, i) => {
        store.put({ ...membership, position: positions[i] }, membershipKey(membership));
      });
    }
  };
}

/**
 * Create a task, optionally inside lists.
 * @param {{db: IDBDatabase, keyRange: typeof IDBKeyRange, now: () => Date}} ctx store context
 * @param {object} input the new task: `description` is required, other editable fields are optional
 * @param {{lists?: string[]}} [options] identifiers of the lists the task joins, each after its last task
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
      await mustGetLiveList(tx, listId);
      await putMembership(tx, ctx.keyRange, task.id, listId, time);
    }
    return task;
  });
}

/**
 * Update editable task fields; omitted and read-only fields stay unchanged.
 * @param {{db: IDBDatabase, now: () => Date}} ctx store context
 * @param {string} id the task identifier
 * @param {object} changes new values for `description`, `status`, `due-time`, or `overdue-handling`
 * @param {{when?: (task: object) => boolean}} [options] `when` checks the stored task inside the transaction;
 *   when it returns false, nothing changes and the result is null
 * @returns {Promise<object|null>} the updated task, or null when `when` declined
 */
export function updateTask(ctx, id, changes = {}, { when } = {}) {
  return transact(ctx.db, [STORES.tasks], 'readwrite', async (tx) => {
    const task = await mustGetLiveTask(tx, id);
    if (when && !when(task)) {
      return null;
    }
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
 * Add a task to a list, after its last task; adding an existing member changes nothing.
 * @param {{db: IDBDatabase, keyRange: typeof IDBKeyRange, now: () => Date}} ctx store context
 * @param {string} taskId the task identifier
 * @param {string} listId the list identifier
 * @returns {Promise<void>}
 */
export function addToList(ctx, taskId, listId) {
  return transact(ctx.db, [STORES.lists, STORES.tasks, STORES.memberships], 'readwrite', async (tx) => {
    const task = await mustGetLiveTask(tx, taskId);
    await mustGetLiveList(tx, listId);
    const time = ctx.now().toISOString();
    if (await putMembership(tx, ctx.keyRange, taskId, listId, time)) {
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
  return transact(ctx.db, [STORES.lists, STORES.tasks, STORES.memberships], 'readwrite', async (tx) => {
    const task = await mustGetLiveTask(tx, taskId);
    const list = await request(tx.objectStore(STORES.lists).get(listId));
    if (list?.['deletion-time']) {
      throw new StoreError('deleted', `List ${listId} is in the recycle bin.`);
    }
    const store = tx.objectStore(STORES.memberships);
    const key = [listId, taskId];
    if (await request(store.get(key))) {
      await request(store.delete(key));
      await request(tx.objectStore(STORES.tasks).put({ ...task, 'last-activity-time': ctx.now().toISOString() }));
    }
  });
}

/**
 * Return the identifiers of the lists a task belongs to, leaving out lists in the recycle bin.
 * @param {{db: IDBDatabase}} ctx store context
 * @param {string} taskId the task identifier
 * @returns {Promise<string[]>} the list identifiers
 */
export function listsOfTask(ctx, taskId) {
  return transact(ctx.db, [STORES.lists, STORES.memberships], 'readonly', async (tx) => {
    const all = await request(tx.objectStore(STORES.memberships).getAll());
    const result = [];
    for (const member of all.filter((m) => m['task-id'] === taskId)) {
      const list = await request(tx.objectStore(STORES.lists).get(member['list-id']));
      if (list && !list['deletion-time']) {
        result.push(member['list-id']);
      }
    }
    return result;
  });
}

/**
 * Return all memberships, each with its position, by list and then in position order.
 * @param {{db: IDBDatabase}} ctx store context
 * @returns {Promise<object[]>} the membership records
 */
export async function listMemberships(ctx) {
  const all = await transact(ctx.db, [STORES.memberships], 'readonly',
    (tx) => request(tx.objectStore(STORES.memberships).getAll()));
  return all.sort((a, b) => {
    if (a['list-id'] !== b['list-id']) {
      return a['list-id'] < b['list-id'] ? -1 : 1;
    }
    return byPosition(a, b);
  });
}

/**
 * Return the tasks of a list outside the recycle bin, in its manual order (`LV-2`).
 * A list in the recycle bin shows no tasks.
 * @param {{db: IDBDatabase, keyRange: typeof IDBKeyRange}} ctx store context
 * @param {string} listId the list identifier
 * @returns {Promise<object[]>} the tasks
 */
export function tasksOfList(ctx, listId) {
  return transact(ctx.db, [STORES.lists, STORES.tasks, STORES.memberships], 'readonly', async (tx) => {
    const list = await request(tx.objectStore(STORES.lists).get(listId));
    if (list?.['deletion-time']) {
      return [];
    }
    const members = await membersOfList(tx, ctx.keyRange, listId);
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

/**
 * Move a task directly before or after another task of the same list (`LV-3`, `LV-4`).
 * Only this membership changes, unless the list needs a rebalance; the other lists of the task keep their order.
 * Sets the last activity time of the task, not its last update time; a deleted task or list fails with `deleted`.
 * @param {{db: IDBDatabase, keyRange: typeof IDBKeyRange, now: () => Date}} ctx store context
 * @param {string} taskId the task identifier
 * @param {string} listId the list identifier
 * @param {{before?: string, after?: string}} placement exactly one neighbor task identifier
 * @returns {Promise<void>}
 */
export async function moveInList(ctx, taskId, listId, placement = {}) {
  const hasBefore = placement.before !== undefined && placement.before !== null;
  const hasAfter = placement.after !== undefined && placement.after !== null;
  if (hasBefore === hasAfter) {
    throw new ValidationError('placement', 'invalid', 'A move needs exactly one of before or after.');
  }
  const field = hasBefore ? 'before' : 'after';
  const neighborId = placement[field];
  if (neighborId === taskId) {
    throw new ValidationError(field, 'invalid', 'A task cannot be its own neighbor.');
  }
  return transact(ctx.db, [STORES.lists, STORES.tasks, STORES.memberships], 'readwrite', async (tx) => {
    await mustGetLiveTask(tx, taskId);
    await mustGetLiveList(tx, listId);
    const members = await membersOfList(tx, ctx.keyRange, listId);
    const own = members.find((m) => m['task-id'] === taskId);
    if (!own) {
      throw new StoreError('not-found', `Task ${taskId} is not in list ${listId}.`);
    }
    const others = members.filter((m) => m !== own);
    const neighbor = others.findIndex((m) => m['task-id'] === neighborId);
    if (neighbor < 0) {
      throw new ValidationError(field, 'invalid', `Task ${neighborId} is not in list ${listId}.`);
    }
    await placeMembership(tx, others, own, field === 'before' ? neighbor : neighbor + 1);
    await markActivity(tx, taskId, ctx.now().toISOString());
  });
}
