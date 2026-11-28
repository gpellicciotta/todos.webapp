/**
 * Task records and list memberships.
 *
 * A task belongs to zero, one, or many lists. Memberships live in their own store,
 * keyed by `[list-id, task-id]`, so each list can keep its own order.
 * Each membership has a fractional-index `position`; a list shows its tasks in ascending position order (`LV-2` to `LV-5`).
 * Deleted tasks and lists keep their memberships, but are hidden and reject changes (`BIN-6`).
 *
 * A task embeds its `lifecycle-rules` and `current-occurrence`, like the service's `Task` schema.
 * Statuses change only through events, which the `events` store keeps; `occurrences` keeps each occurrence.
 * Every change of a task or its parts sets its `last-update-time` (`TSK-12`, `NOT-5`).
 * In local mode the store rolls recurring tasks over before each event and rule edit, as the server does (`LOC-2`).
 * While connected it never rolls over: an event past the period end joins the period covering now,
 * and the service places it by its time. System events and rule edit events stay local; they never join the queue.
 */

import {
  applyEvent, applyRuleEdit, byEventOrder, eventsTowardsStatus, firstOccurrence, foldLogCache, freshOccurrence, GRACE_MS, graceOccurrence, isRecurring,
  isPeriodEnd, isStale, makeEvent, mirrorOccurrence, mirrorRules, normalizeRules, planRollOver, refoldOccurrence, RULE_FIELDS, shouldExpire, STATUSES, USER_EVENT_TYPES,
} from '../core/occurrences.js';
import { isValidTimezone } from '../core/periods.js';
import { keyBetween, keysBetween, MAX_KEY_LENGTH } from '../lib/fractional-index.js';
import { uuid7 } from '../lib/uuid7.js';
import { request, StoreError, STORES, transact, ValidationError } from './idb.js';

export { STATUSES };
export const DESCRIPTION_MAX = 500;
export const OVERDUE_HANDLINGS = ['keep', 'cancel'];
export const RECURRENCE_UNITS = ['day', 'week', 'month'];

/** The event types that the log fold reads; the store writes completions as the first of them. */
const LOG_TYPES = Object.freeze(['log', 'undo-log']);
/** The user events that `postEvent` accepts: the log events have their own actions. */
const POSTED_TYPES = USER_EVENT_TYPES.filter((type) => !LOG_TYPES.includes(type));
/** The most seconds that the entries of one occurrence add up to. */
const TIME_TOTAL_MAX = 999_999_999_999;

/** The stores a task write covers: the task, its occurrences, and its events. */
export const TASK_STORES = [STORES.tasks, STORES.occurrences, STORES.events];
const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;
const LOCAL_DATE = /^\d{4}-\d{2}-\d{2}$/;
/** The events each write created, for the change queue; a WeakMap keeps them off the returned records. */
const WRITTEN_EVENTS = new WeakMap();

/**
 * Return the events a task write created, in order.
 * @param {object|null} task the task a write returned
 * @returns {object[]} the events, empty when it created none
 */
export function eventsOfWrite(task) {
  return (task && WRITTEN_EVENTS.get(task)) ?? [];
}

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
 * Validate one lifecycle rule field and return its normalized value.
 * @param {string} field the rule field
 * @param {unknown} value the input value
 * @returns {unknown} the value to store
 */
function checkRule(field, value) {
  const optional = value === null || value === undefined;
  const fail = (rule) => {
    throw new ValidationError(field, 'invalid', `Not a valid ${field}: ${value}; ${rule}.`);
  };
  switch (field) {
    case 'target-count':
      if (!Number.isInteger(value) || value < 1) {
        fail('it is a whole number of at least 1');
      }
      return value;
    case 'due-time':
      return checkField('due-time', value);
    case 'overdue-handling':
      return optional ? null : checkField('overdue-handling', value);
    case 'recurrence-unit':
      if (!optional && !RECURRENCE_UNITS.includes(value)) {
        fail('it is day, week, or month');
      }
      return value ?? null;
    case 'recurrence-interval':
      if (!optional && (!Number.isInteger(value) || value < 1 || value > 99)) {
        fail('it is a whole number from 1 to 99');
      }
      return value ?? null;
    case 'recurrence-end-count':
      if (!optional && (!Number.isInteger(value) || value < 1)) {
        fail('it is a whole number of at least 1');
      }
      return value ?? null;
    case 'recurrence-end-date':
      if (!optional && (typeof value !== 'string' || !LOCAL_DATE.test(value))) {
        fail('it is a date such as 2026-12-31');
      }
      return value ?? null;
    case 'timezone':
      if (!optional && !isValidTimezone(value)) {
        fail('it is an IANA zone name, such as Europe/Brussels');
      }
      return value ?? null;
    default:
      throw new StoreError('invalid', `Unknown lifecycle rule field: ${field}.`);
  }
}

/**
 * Validate the rule fields of an edit, ignoring unknown fields.
 * @param {object} edit rule fields
 * @returns {object} the normalized fields that the edit holds
 */
function checkRuleEdit(edit) {
  return Object.fromEntries(RULE_FIELDS.filter((field) => field in edit).map((field) => [field, checkRule(field, edit[field])]));
}

/**
 * Check that recurring rules name their interval and timezone, which periods need.
 * @param {object} rules the full rules
 * @returns {object} the rules
 * @throws {ValidationError} for a recurring rule without interval or timezone
 */
function checkRecurrence(rules) {
  if (isRecurring(rules)) {
    for (const field of ['recurrence-interval', 'timezone']) {
      if (!rules[field]) {
        throw new ValidationError(field, 'required', `A recurring task needs a ${field}.`);
      }
    }
  }
  return rules;
}

/**
 * Tell whether the store works in local mode, where it rolls recurring tasks over itself.
 * @param {{local?: () => boolean}} ctx store context
 * @returns {boolean} true without a connection
 */
function isLocal(ctx) {
  return ctx.local?.() ?? true;
}

/**
 * Return a new event identifier, increasing within the same millisecond.
 * @param {{now: () => Date}} ctx store context
 * @returns {string} the UUIDv7
 */
function newEventId(ctx) {
  return uuid7(() => ctx.now().getTime());
}

/**
 * Store a task and its current occurrence inside a transaction covering `TASK_STORES`.
 * @param {IDBTransaction} tx the transaction
 * @param {object} task the task
 * @returns {Promise<void>}
 */
export async function putTask(tx, task) {
  const occurrence = mirrorOccurrence(task['current-occurrence']);
  await request(tx.objectStore(STORES.tasks).put({ ...task, 'lifecycle-rules': mirrorRules(task['lifecycle-rules']), 'current-occurrence': occurrence }));
  // Only the task embeds the live entries of its current occurrence.
  const cache = { ...occurrence };
  delete cache.entries;
  await request(tx.objectStore(STORES.occurrences).put({ 'task-id': task.id, ...cache }, [task.id, occurrence.occurrence]));
}

/**
 * Store an occurrence of a task that is not its current one, such as a closed one, inside a transaction.
 * @param {IDBTransaction} tx the transaction
 * @param {string} taskId the task identifier
 * @param {object} occurrence the occurrence
 * @returns {Promise<void>}
 */
async function putOccurrence(tx, taskId, occurrence) {
  const cache = mirrorOccurrence(occurrence);
  delete cache.entries;
  await request(tx.objectStore(STORES.occurrences).put({ 'task-id': taskId, ...cache }, [taskId, occurrence.occurrence]));
}

/**
 * Store events inside a transaction covering the events store.
 * @param {IDBTransaction} tx the transaction
 * @param {object[]} events the events
 * @returns {Promise<void>}
 */
export async function putEvents(tx, events) {
  for (const event of events) {
    await request(tx.objectStore(STORES.events).put(event, [event['task-id'], event.id]));
  }
}

/**
 * Apply user events to a task in order, as one action at one time.
 * @param {{now: () => Date}} ctx store context
 * @param {object} task the task
 * @param {string[]} types the event types
 * @param {string} time the ISO time of the action
 * @returns {{task: object, events: object[]}} the task after the events, and the events; `complete` and `uncomplete`
 *   stay as they are until `finishEvents` writes them as logs
 * @throws {StoreError} with code `conflict` when an event's precondition fails
 */
function applyUserEvents(ctx, task, types, time, { placed = true } = {}) {
  let occurrence = task['current-occurrence'];
  const events = [];
  for (const type of types) {
    // An unplaced event names no occurrence, so the service assigns the period containing its time.
    const event = makeEvent({ id: newEventId(ctx), 'task-id': task.id, type, 'creation-time': time, occurrence: placed ? occurrence.occurrence : null });
    const next = applyEvent(occurrence, event, task['lifecycle-rules']);
    if (!next) {
      throw new StoreError('conflict', `A ${type} event does not apply to a ${occurrence.status} task.`);
    }
    occurrence = next;
    events.push(event);
  }
  return { task: { ...task, 'current-occurrence': occurrence }, events };
}

/**
 * Write `complete` as a checked `log`, and `uncomplete` as an `undo-log` of the latest live check at its place.
 * @param {{keyRange: typeof IDBKeyRange}} ctx store context
 * @param {IDBTransaction} tx a transaction covering the events store
 * @param {object} task the task
 * @param {object[]} events the events of one action, in order
 * @returns {Promise<object[]>} the events to store
 * @throws {StoreError} with code `conflict` when an `uncomplete` finds no live check
 */
async function convertCompletions(ctx, tx, task, events) {
  if (!events.some((event) => event.type === 'complete' || event.type === 'uncomplete')) {
    return events;
  }
  const stored = (await request(tx.objectStore(STORES.events).getAll(ctx.keyRange.bound([task.id], [task.id, []])))).sort(byEventOrder);
  const undone = new Set(stored.filter((event) => event.type === 'undo-log').map((event) => event['target-event-id']));
  const live = new Map();
  const checks = (event) => {
    const number = event.occurrence ?? task['current-occurrence'].occurrence;
    return live.get(number) ?? live.set(number, []).get(number);
  };
  for (const event of stored) {
    // Events stored by an import may still be `complete` and `uncomplete`; they count the same.
    if (event.type === 'complete' || (event.type === 'log' && event.checked && !undone.has(event.id))) {
      checks(event).push(event.id);
    }
    else if (event.type === 'uncomplete') {
      checks(event).pop();
    }
  }
  return events.map((event) => {
    if (event.type === 'complete') {
      checks(event).push(event.id);
      return { ...event, type: 'log', checked: true };
    }
    if (event.type === 'uncomplete') {
      const target = checks(event).pop();
      if (target === undefined) {
        throw new StoreError('conflict', 'An uncomplete event needs a live check to undo.');
      }
      return { ...event, type: 'undo-log', 'target-event-id': target };
    }
    return event;
  });
}

/**
 * Fold the stored events of an occurrence into its cache, with the log fold; the current occurrence also embeds its live entries.
 * An occurrence that holds events stored as `complete` or `uncomplete`, such as an import, folds the former way instead.
 * @param {{keyRange: typeof IDBKeyRange}} ctx store context
 * @param {IDBTransaction} tx a transaction covering the events store
 * @param {object} task the task
 * @param {object} occurrence the occurrence to fold
 * @returns {Promise<object>} the occurrence with the folded count, progress, status, close time, and time spent
 */
async function refoldStored(ctx, tx, task, occurrence) {
  const all = await request(tx.objectStore(STORES.events).getAll(ctx.keyRange.bound([task.id], [task.id, []])));
  return foldLogCache(occurrence, all, task['lifecycle-rules']);
}

/**
 * Store the events of an action and the task, converting completions to logs and refolding the occurrence when logs joined it.
 * @param {{keyRange: typeof IDBKeyRange}} ctx store context
 * @param {IDBTransaction} tx a transaction covering `TASK_STORES`
 * @param {object} task the task after the events
 * @param {object[]} events the events of the action
 * @returns {Promise<{task: object, events: object[]}>} the stored task and events
 */
async function finishEvents(ctx, tx, task, events) {
  const converted = await convertCompletions(ctx, tx, task, events);
  await putEvents(tx, converted);
  const current = task['current-occurrence'];
  const logged = converted.some((event) => LOG_TYPES.includes(event.type) && event.occurrence === current.occurrence);
  const updated = logged ? { ...task, 'current-occurrence': await refoldStored(ctx, tx, task, current) } : task;
  await putTask(tx, updated);
  return { task: updated, events: converted };
}

/**
 * Return a task that remembers the events its write created.
 * @param {object} task the stored task
 * @param {object[]} events the events
 * @returns {object} the task
 */
function remember(task, events) {
  WRITTEN_EVENTS.set(task, events);
  return task;
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
 * Set a task's last update time inside a transaction, for a change of one of its parts (`TSK-12`, `NOT-5`).
 * Fails when the task is missing or deleted, so deleted tasks accept no note or membership changes.
 * @param {IDBTransaction} tx a read-write transaction covering the tasks store
 * @param {string} id the task identifier
 * @param {string} time the ISO time of the change
 * @returns {Promise<object>} the updated task
 */
export async function touchTask(tx, id, time) {
  const task = await mustGetLiveTask(tx, id);
  const updated = { ...task, 'last-update-time': time };
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
 * Create a task, optionally inside lists, with its rules, occurrence 1, and a `create` event.
 * @param {{db: IDBDatabase, keyRange: typeof IDBKeyRange, now: () => Date}} ctx store context
 * @param {object} input the new task: `description` is required; `lifecycle-rules`, `due-time`, `overdue-handling`,
 *   `owner-id`, and `id` are optional; a `status` other than `ready` is reached through events
 * @param {{lists?: string[]}} [options] identifiers of the lists the task joins, each after its last task
 * @returns {Promise<object>} the stored task
 */
export async function createTask(ctx, input, { lists = [] } = {}) {
  const time = ctx.now().toISOString();
  const edit = { ...input['lifecycle-rules'] };
  for (const field of ['due-time', 'overdue-handling']) {
    if (field in input) {
      edit[field] = input[field];
    }
  }
  const rules = checkRecurrence(normalizeRules(checkRuleEdit(edit)));
  const status = input.status === undefined ? 'ready' : checkField('status', input.status);
  const created = {
    id: input.id ?? uuid7(() => ctx.now().getTime()),
    description: checkField('description', input.description),
    'owner-id': input['owner-id'] ?? null,
    'lifecycle-rules': rules,
    'current-occurrence': firstOccurrence(rules, time),
    'creation-time': time,
    'last-update-time': time,
    'deletion-time': null,
  };
  const create = makeEvent({ id: newEventId(ctx), 'task-id': created.id, type: 'create', 'creation-time': time, 'owner-id': created['owner-id'] });
  const { task, events } = applyUserEvents(ctx, created, eventsTowardsStatus(created['current-occurrence'], status, rules), time);
  return transact(ctx.db, [STORES.lists, STORES.memberships, ...TASK_STORES], 'readwrite', async (tx) => {
    await request(tx.objectStore(STORES.tasks).add(task));
    await putEvents(tx, [create]);
    const done = await finishEvents(ctx, tx, task, events);
    for (const listId of lists) {
      await mustGetLiveList(tx, listId);
      await putMembership(tx, ctx.keyRange, task.id, listId, time);
    }
    return remember(done.task, done.events);
  });
}

/**
 * Update a task; omitted and read-only fields stay unchanged.
 * `description` changes the task, `due-time` and `overdue-handling` edit its rules,
 * and `status` posts the events that reach it, mirroring the todos.server status mapping.
 * @param {{db: IDBDatabase, now: () => Date}} ctx store context
 * @param {string} id the task identifier
 * @param {object} changes new values for `description`, `status`, `due-time`, or `overdue-handling`
 * @param {{when?: (task: object) => boolean}} [options] `when` checks the stored task inside the transaction;
 *   when it returns false, nothing changes and the result is null
 * @returns {Promise<object|null>} the updated task, or null when `when` declined
 */
export function updateTask(ctx, id, changes = {}, { when } = {}) {
  const description = 'description' in changes ? checkField('description', changes.description) : undefined;
  const status = 'status' in changes ? checkField('status', changes.status) : undefined;
  const ruleEdit = checkRuleEdit(Object.fromEntries(['due-time', 'overdue-handling'].filter((field) => field in changes).map((field) => [field, changes[field]])));
  return transact(ctx.db, TASK_STORES, 'readwrite', async (tx) => {
    const stored = await mustGetLiveTask(tx, id);
    if (when && !when(stored)) {
      return null;
    }
    const time = ctx.now().toISOString();
    let updated = { ...stored, 'last-update-time': time };
    if (description !== undefined) {
      updated.description = description;
    }
    if (Object.keys(ruleEdit).length > 0) {
      updated = { ...updated, ...applyRuleEdit(updated, ruleEdit, time) };
    }
    let events = [];
    if (status !== undefined) {
      ({ task: updated, events } = applyUserEvents(ctx, updated, eventsTowardsStatus(updated['current-occurrence'], status, updated['lifecycle-rules']), time));
    }
    const done = await finishEvents(ctx, tx, updated, events);
    return remember(done.task, done.events);
  });
}

/**
 * Roll a recurring task over up to a moment inside a transaction, storing the closed occurrences and their
 * `roll-over` or `end-recurrence` events, as the server does. The caller stores the returned task.
 * @param {{now: () => Date}} ctx store context
 * @param {IDBTransaction} tx a read-write transaction covering `TASK_STORES`
 * @param {object} task the task
 * @param {Date} now the moment to roll over to
 * @returns {Promise<{task: object, rolled: boolean}>} the task after the roll-over, and whether anything rolled over
 */
async function rollOverInside(ctx, tx, task, now) {
  const plan = planRollOver(task['lifecycle-rules'], task['current-occurrence'], now);
  if (plan.events.length === 0) {
    return { task, rolled: false };
  }
  for (const occurrence of plan.occurrences) {
    await putOccurrence(tx, task.id, occurrence);
  }
  await putEvents(tx, plan.events.map((event) => makeEvent({ id: newEventId(ctx), 'task-id': task.id, ...event })));
  return { task: { ...task, 'current-occurrence': plan.current }, rolled: true };
}

/**
 * Roll a recurring task over in local mode, as the minute timer does; while connected, the service rolls over.
 * @param {{db: IDBDatabase, now: () => Date, local?: () => boolean}} ctx store context
 * @param {string} id the task identifier
 * @param {{now?: Date}} [options] the moment to roll over to, the store clock by default
 * @returns {Promise<object|null>} the rolled-over task, or null when nothing rolled over
 */
export function rollOverTask(ctx, id, { now = ctx.now() } = {}) {
  if (!isLocal(ctx)) {
    return Promise.resolve(null);
  }
  return transact(ctx.db, TASK_STORES, 'readwrite', async (tx) => {
    const stored = await mustGetLiveTask(tx, id);
    const { task, rolled } = await rollOverInside(ctx, tx, stored, now);
    if (!rolled) {
      return null;
    }
    const updated = { ...task, 'last-update-time': now.toISOString() };
    await putTask(tx, updated);
    return updated;
  });
}

/**
 * Post an event for the previous occurrence of a recurring task, during the grace period after its period ended.
 * In local mode the event joins the stored occurrence, with a time inside its period, which then folds again;
 * while connected only the queue carries it, and the service checks and places it.
 * @param {{now: () => Date, local?: () => boolean}} ctx store context
 * @param {IDBTransaction} tx the transaction
 * @param {object} task the task after any roll-over
 * @param {string} type the event type
 * @param {number} number the occurrence the event names
 * @param {Date} now the current time
 * @returns {Promise<{event: object, task: object}>} the event and the task
 */
async function postForPrevious(ctx, tx, task, type, number, now) {
  const current = task['current-occurrence'];
  const refuse = (reason) => new StoreError('conflict', `A ${type} event cannot name occurrence ${number}: ${reason}.`);
  if (!isRecurring(task['lifecycle-rules']) || number !== current.occurrence - 1 || type === 'cancel' || type === 'reopen') {
    throw refuse('only the current occurrence, or the previous one of a recurring task, takes events');
  }
  if (!isLocal(ctx)) {
    if (graceOccurrence(task, now) !== number) {
      throw refuse('its grace period has ended');
    }
    const event = makeEvent({ id: newEventId(ctx), 'task-id': task.id, type, 'creation-time': now.toISOString(), occurrence: number });
    const done = await finishEvents(ctx, tx, task, [event]);
    return { event: done.events[0], task: remember(done.task, done.events) };
  }
  const previous = await request(tx.objectStore(STORES.occurrences).get([task.id, number]));
  const due = Date.parse(previous?.['due-time'] ?? '');
  if (!previous || !(now.getTime() <= due + GRACE_MS)) {
    throw refuse('its grace period has ended');
  }
  // So the event folds before the roll-over that closed the occurrence.
  const time = new Date(Math.min(now.getTime(), due - 1)).toISOString();
  const event = makeEvent({ id: newEventId(ctx), 'task-id': task.id, type, 'creation-time': time, occurrence: number });
  const occurrence = { ...previous };
  delete occurrence['task-id'];
  const events = (await request(tx.objectStore(STORES.events).getAll(ctx.keyRange.bound([task.id], [task.id, []]))))
    .filter((other) => other.occurrence === number);
  // As the server does, the precondition holds against the occurrence before its period ended.
  const open = refoldOccurrence(occurrence, events.filter((other) => !isPeriodEnd(other.type)), task['lifecycle-rules']);
  if (!applyEvent(open, event, task['lifecycle-rules'])) {
    throw new StoreError('conflict', `A ${type} event does not apply to a ${open.status} occurrence.`);
  }
  const [stored] = await convertCompletions(ctx, tx, task, [event]);
  await putEvents(tx, [stored]);
  await putOccurrence(tx, task.id, await refoldStored(ctx, tx, task, occurrence));
  await putTask(tx, task);
  return { event: stored, task: remember(task, [stored]) };
}

/**
 * Post a user event on a task, as the tick button and event actions do.
 * In local mode a recurring task rolls over first. While connected, an event on a task past its period end joins
 * the period covering now, unplaced, so the service assigns it once it rolled over (the display rule).
 * Naming the cached occurrence past its period end, or the previous one, records a grace completion.
 * A reopen of a closed recurring task, completed or cancelled, opens a fresh period containing now, unless the end rules
 * allow none; other events on it fail, since its period is over.
 * @param {{db: IDBDatabase, now: () => Date, local?: () => boolean}} ctx store context
 * @param {string} id the task identifier
 * @param {string} type `complete`, `uncomplete`, `start`, `unstart`, `cancel`, or `reopen`
 * @param {{occurrence?: number}} [options] the occurrence the event names, the current one by default
 * @returns {Promise<{event: object, task: object}>} the stored event and the updated task
 * @throws {StoreError} with code `conflict` when the precondition fails, and `invalid` for other types
 */
export function postEvent(ctx, id, type, { occurrence: named } = {}) {
  if (!POSTED_TYPES.includes(type)) {
    throw new StoreError('invalid', `Clients cannot post a ${type} event.`);
  }
  return transact(ctx.db, TASK_STORES, 'readwrite', async (tx) => {
    const stored = await mustGetLiveTask(tx, id);
    const now = ctx.now();
    const time = now.toISOString();
    let task = { ...stored, 'last-update-time': time };
    if (isLocal(ctx)) {
      ({ task } = await rollOverInside(ctx, tx, task, now));
    }
    const rules = task['lifecycle-rules'];
    const current = task['current-occurrence'];
    if (named !== undefined && named !== null && named !== current.occurrence) {
      return postForPrevious(ctx, tx, task, type, named, now);
    }
    let result;
    if (isStale(task, now) && named === current.occurrence) {
      // Grace completion before the service rolled over: the event joins the cached occurrence, inside its period.
      const due = Date.parse(current['due-time']);
      if (now.getTime() > due + GRACE_MS || type === 'cancel' || type === 'reopen') {
        throw new StoreError('conflict', `The grace period of occurrence ${current.occurrence} has ended.`);
      }
      result = applyUserEvents(ctx, task, [type], new Date(due - 1).toISOString());
    }
    else if (isStale(task, now)) {
      const { current: shown } = planRollOver(rules, current, now);
      if (shown['close-time'] !== null) {
        throw new StoreError('conflict', 'The recurrence of this task has ended.');
      }
      result = applyUserEvents(ctx, { ...task, 'current-occurrence': shown }, [type], time, { placed: false });
    }
    else if (type === 'reopen' && isRecurring(rules) && current['close-time'] !== null) {
      const fresh = freshOccurrence(rules, current, now);
      if (!fresh) {
        throw new StoreError('conflict', 'The recurrence of this task has ended; extend its end rules first.');
      }
      const event = makeEvent({ id: newEventId(ctx), 'task-id': id, type, 'creation-time': time, occurrence: fresh.occurrence });
      result = { task: { ...task, 'current-occurrence': fresh }, events: [event] };
    }
    else {
      result = applyUserEvents(ctx, task, [type], time);
    }
    const done = await finishEvents(ctx, tx, result.task, result.events);
    return { event: done.events[0], task: remember(done.task, done.events) };
  });
}

/**
 * Validate the fields of a log entry.
 * @param {object} input `checked`, `time-spent-seconds`, `amount`, and `label`; at least one of the first three
 * @returns {object} the event fields to store
 * @throws {ValidationError} naming the field that breaks a rule, or `entry` when the entry holds nothing to log
 */
function checkEntry(input) {
  const fail = (field, rule) => {
    throw new ValidationError(field, 'invalid', `Not a valid ${field}: ${rule}.`);
  };
  const given = (field) => input[field] !== undefined && input[field] !== null;
  const entry = {};
  if (given('checked') && typeof input.checked !== 'boolean') {
    fail('checked', 'it is true or false');
  }
  if (input.checked === true) {
    entry.checked = true;
  }
  if (given('time-spent-seconds')) {
    const seconds = input['time-spent-seconds'];
    if (!Number.isInteger(seconds) || seconds < 1 || seconds > 2_147_483_647) {
      fail('time-spent-seconds', 'it is a whole number from 1 to 2,147,483,647');
    }
    entry['time-spent-seconds'] = seconds;
  }
  if (given('amount')) {
    const { amount } = input;
    if (typeof amount !== 'number' || !Number.isFinite(amount) || amount < 0 || amount > 999_999_999_999.999 || Math.abs(amount * 1000 - Math.round(amount * 1000)) > 1e-6) {
      fail('amount', 'it is a decimal from 0 to 999,999,999,999.999 with at most 3 decimals');
    }
    entry.amount = amount;
  }
  if (given('label')) {
    const label = typeof input.label === 'string' ? input.label.trim() : fail('label', 'it is text');
    if (label.length > 100) {
      fail('label', 'it holds at most 100 characters');
    }
    if (label) {
      entry.label = label;
    }
  }
  if (!('checked' in entry || 'time-spent-seconds' in entry || 'amount' in entry)) {
    throw new ValidationError('entry', 'required', 'An entry needs a check, a time spent, or an amount.');
  }
  return entry;
}

/**
 * Write a `log` or `undo-log` event, and refold the occurrence it joins with the log fold.
 * The event joins the current occurrence, or the previous one of a recurring task within its grace period.
 * @param {{db: IDBDatabase, keyRange: typeof IDBKeyRange, now: () => Date, local?: () => boolean}} ctx store context
 * @param {string} id the task identifier
 * @param {'log'|'undo-log'} type the event type
 * @param {object} extra the log fields of the event
 * @param {{occurrence?: number}} options the occurrence a `log` names, the current one by default; an `undo-log` joins its target's
 * @returns {Promise<{event: object, task: object}>} the stored event and the updated task
 * @throws {StoreError} with code `conflict` for an undo of an event that is no `log` of the task, a closed grace period,
 *   or a time total above the limit
 */
function postLogEvent(ctx, id, type, extra, { occurrence: named } = {}) {
  return transact(ctx.db, TASK_STORES, 'readwrite', async (tx) => {
    const stored = await mustGetLiveTask(tx, id);
    const now = ctx.now();
    let task = { ...stored, 'last-update-time': now.toISOString() };
    if (isLocal(ctx)) {
      ({ task } = await rollOverInside(ctx, tx, task, now));
    }
    const current = task['current-occurrence'];
    let number = named ?? current.occurrence;
    if (type === 'undo-log') {
      const target = await request(tx.objectStore(STORES.events).get([id, extra['target-event-id']]));
      if (target?.type !== 'log') {
        throw new StoreError('conflict', 'An undo needs the identifier of a log entry of the task.');
      }
      number = target.occurrence ?? current.occurrence;
    }
    const refuse = (reason) => new StoreError('conflict', `A ${type} event cannot join occurrence ${number}: ${reason}.`);
    let time = now.toISOString();
    let placed = number;
    let previous = null;
    if (number !== current.occurrence) {
      if (!isRecurring(task['lifecycle-rules']) || number !== current.occurrence - 1) {
        throw refuse('only the current occurrence, or the previous one of a recurring task, takes entries');
      }
      previous = await request(tx.objectStore(STORES.occurrences).get([id, number]));
      const due = Date.parse(previous?.['due-time'] ?? '');
      if (!previous || !(now.getTime() <= due + GRACE_MS)) {
        throw refuse('its grace period has ended');
      }
      // So the entry folds before the roll-over that closed the occurrence.
      time = isLocal(ctx) ? new Date(Math.min(now.getTime(), due - 1)).toISOString() : time;
    }
    else if (isStale(task, now)) {
      const due = Date.parse(current['due-time']);
      if (named === undefined && type === 'log') {
        // Past the period end before the service rolled over: the service assigns the period containing the time.
        placed = null;
      }
      else if (now.getTime() > due + GRACE_MS) {
        throw refuse('its grace period has ended');
      }
      else {
        time = new Date(due - 1).toISOString();
      }
    }
    const event = { ...makeEvent({ id: newEventId(ctx), 'task-id': id, type, 'creation-time': time, occurrence: placed }), ...extra };
    await putEvents(tx, [event]);
    if (previous) {
      const { 'task-id': taskId, ...base } = previous;
      await putOccurrence(tx, taskId, await refoldStored(ctx, tx, task, base));
    }
    else if (placed !== null) {
      task = { ...task, 'current-occurrence': await refoldStored(ctx, tx, task, current) };
      if (task['current-occurrence']['time-spent-seconds'] > TIME_TOTAL_MAX) {
        throw new StoreError('conflict', `The time spent on an occurrence adds up to at most ${TIME_TOTAL_MAX} seconds.`);
      }
    }
    await putTask(tx, task);
    return { event, task: remember(task, [event]) };
  });
}

/**
 * Add an entry to a task: a `log` event holding a check, a time spent, an amount, or several, and an optional label.
 * @param {{db: IDBDatabase, keyRange: typeof IDBKeyRange, now: () => Date}} ctx store context
 * @param {string} id the task identifier
 * @param {{checked?: boolean, 'time-spent-seconds'?: number, amount?: number, label?: string}} input the entry
 * @param {{occurrence?: number}} [options] the occurrence the entry names, the current one by default
 * @returns {Promise<{event: object, task: object}>} the stored event and the updated task
 * @throws {ValidationError} for a broken field, or an entry with nothing to log
 */
export function logEntry(ctx, id, input = {}, options = {}) {
  return postLogEvent(ctx, id, 'log', checkEntry(input), options);
}

/**
 * Undo one entry with an `undo-log` event; the fold then treats the entry as never logged.
 * A second undo of the same entry is accepted and changes nothing.
 * @param {{db: IDBDatabase, keyRange: typeof IDBKeyRange, now: () => Date}} ctx store context
 * @param {string} id the task identifier
 * @param {string} targetEventId the identifier of the `log` to undo
 * @returns {Promise<{event: object, task: object}>} the stored event and the updated task
 * @throws {StoreError} with code `conflict` when the target is no `log` of the task
 */
export function undoLog(ctx, id, targetEventId) {
  return postLogEvent(ctx, id, 'undo-log', { 'target-event-id': targetEventId });
}

/**
 * Edit the lifecycle rules of a task; target and deadline edits move the open occurrence.
 * @param {{db: IDBDatabase, now: () => Date}} ctx store context
 * @param {string} id the task identifier
 * @param {object} edit rule fields; `null` clears a field
 * @returns {Promise<object>} the updated task
 */
export function updateRules(ctx, id, edit = {}) {
  const checked = checkRuleEdit(edit);
  return transact(ctx.db, TASK_STORES, 'readwrite', async (tx) => {
    let stored = await mustGetLiveTask(tx, id);
    const now = ctx.now();
    const time = now.toISOString();
    if (isLocal(ctx)) {
      ({ task: stored } = await rollOverInside(ctx, tx, stored, now));
    }
    const updated = { ...stored, ...applyRuleEdit(stored, checked, time), 'last-update-time': time };
    checkRecurrence(updated['lifecycle-rules']);
    await putTask(tx, updated);
    const [old, rules] = [stored['lifecycle-rules'], updated['lifecycle-rules']];
    const details = Object.fromEntries(RULE_FIELDS.filter((field) => (old[field] ?? null) !== (rules[field] ?? null))
      .map((field) => [field, { old: old[field] ?? null, new: rules[field] ?? null }]));
    if (Object.keys(details).length > 0) {
      // The local history keeps the edit as the service does; the service writes its own event, so this one stays local.
      const event = makeEvent({ id: newEventId(ctx), 'task-id': id, type: 'edit-lifecycle-rules', 'creation-time': time, occurrence: updated['current-occurrence'].occurrence });
      await putEvents(tx, [{ ...event, details }]);
    }
    return updated;
  });
}

/**
 * Expire an overdue task with overdue handling `cancel` through a system `expire` event (`OVD-4`).
 * The service writes its own `expire` event, so this one never joins the change queue.
 * @param {{db: IDBDatabase, now: () => Date}} ctx store context
 * @param {string} id the task identifier
 * @param {{now?: Date}} [options] the time of the expiry, the store clock by default
 * @returns {Promise<object|null>} the expired task, or null when the task is not due to expire
 */
export function expireTask(ctx, id, { now = ctx.now() } = {}) {
  return transact(ctx.db, TASK_STORES, 'readwrite', async (tx) => {
    const stored = await mustGetLiveTask(tx, id);
    if (!shouldExpire(stored, now)) {
      return null;
    }
    const time = now.toISOString();
    const occurrence = stored['current-occurrence'];
    const event = makeEvent({ id: newEventId(ctx), 'task-id': id, type: 'expire', 'creation-time': time, occurrence: occurrence.occurrence });
    const task = { ...stored, 'current-occurrence': applyEvent(occurrence, event, stored['lifecycle-rules']), 'last-update-time': time };
    await putTask(tx, task);
    await putEvents(tx, [event]);
    return task;
  });
}

/**
 * Return the events of a task, in fold order: creation time, then identifier.
 * @param {{db: IDBDatabase, keyRange: typeof IDBKeyRange}} ctx store context
 * @param {string} taskId the task identifier
 * @returns {Promise<object[]>} the events
 */
export async function eventsOfTask(ctx, taskId) {
  const events = await transact(ctx.db, [STORES.events], 'readonly',
    (tx) => request(tx.objectStore(STORES.events).getAll(ctx.keyRange.bound([taskId], [taskId, []]))));
  return events.sort((a, b) => a['creation-time'].localeCompare(b['creation-time']) || (a.id < b.id ? -1 : 1));
}

/**
 * Return the occurrences of a task, oldest first.
 * @param {{db: IDBDatabase, keyRange: typeof IDBKeyRange}} ctx store context
 * @param {string} taskId the task identifier
 * @returns {Promise<object[]>} the occurrences, each with its `task-id`
 */
export function occurrencesOfTask(ctx, taskId) {
  return transact(ctx.db, [STORES.occurrences], 'readonly',
    (tx) => request(tx.objectStore(STORES.occurrences).getAll(ctx.keyRange.bound([taskId], [taskId, []]))));
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
      await request(tx.objectStore(STORES.tasks).put({ ...task, 'last-update-time': time }));
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
      await request(tx.objectStore(STORES.tasks).put({ ...task, 'last-update-time': ctx.now().toISOString() }));
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
 * Sets the last update time of the task; a deleted task or list fails with `deleted`.
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
    await touchTask(tx, taskId, ctx.now().toISOString());
  });
}
