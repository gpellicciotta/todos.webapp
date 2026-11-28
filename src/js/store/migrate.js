/**
 * The version 5 migration to lifecycle rules, occurrences, and events, as the todos.server migration converts its data.
 *
 * - Each task gets default one-off rules with its due time and overdue handling, occurrence 1, a `create` event,
 *   and at most one status event; `last-update-time` takes the later of it and `last-activity-time`.
 * - Notes rename `author` to `owner-id` and `edit-time` to `last-update-time`, and stay global.
 * - Queued changes of the former shape become rule edits and events, appended after the existing entries.
 * It runs inside the version-change transaction, so it issues requests from callbacks without awaiting them.
 * See docs/specs/local-store.md, Database.
 */

import {
  applyEvent, byEventOrder, DEFAULT_RULES, eventsTowardsStatus, firstOccurrence, foldInPlace, foldLog, fromLegacyTask, isPeriodEnd,
  fullOccurrence, fullRules, isRecurring, makeEvent, OPEN_STATUSES,
} from '../core/occurrences.js';

import { uuid7 } from '../lib/uuid7.js';
import { STORES } from './idb.js';

const RULE_FIELDS = ['due-time', 'overdue-handling'];

/**
 * Return a new identifier for an event at a time.
 * @param {string} time the ISO event time
 * @returns {string} the UUIDv7
 */
const newId = (time) => uuid7(() => Date.parse(time) || Date.now());

/**
 * Convert a note of the former shape.
 * @param {object} note the former note, with `author` and `edit-time`
 * @returns {object} the note with `owner-id`, `occurrence`, and `last-update-time`
 */
export function upgradeNote(note) {
  const { author = null, 'edit-time': editTime = null, ...rest } = note;
  return {
    ...rest,
    'owner-id': author !== null && typeof author === 'object' ? author.id ?? null : author,
    occurrence: rest.occurrence ?? null,
    'last-update-time': editTime ?? rest['creation-time'],
  };
}

/**
 * Return the occurrence a former status stands for, for picking the events that leave it.
 * @param {string} status a former status
 * @returns {object} an occurrence of target 1 in that status
 */
function occurrenceOf(status) {
  const current = !status || status === 'todo' ? 'ready' : status;
  return { ...firstOccurrence(DEFAULT_RULES, null), status: current, progress: current === 'completed' ? 1 : 0 };
}

/**
 * Build the queue entries of events that move a task from one former status to another.
 * @param {string} taskId the task
 * @param {string} from the status before
 * @param {string} to the wanted status
 * @param {string} time the time of the change
 * @returns {object[]} the entries without `seq`
 */
function eventEntries(taskId, from, to, time) {
  const wanted = to === 'todo' ? 'ready' : to;
  let occurrence = occurrenceOf(from);
  return eventsTowardsStatus(occurrence, wanted).map((type) => {
    const event = makeEvent({ id: newId(time), 'task-id': taskId, type, 'creation-time': time });
    // Each undo holds the count, status, and close time before its event, which is what a rollback restores.
    const before = occurrence;
    occurrence = applyEvent(occurrence, event) ?? occurrence;
    return {
      target: { type: 'event', id: event.id, 'task-id': taskId },
      operation: 'post-event',
      fields: { id: event.id, type, 'creation-time': time, occurrence: 1 },
      'edit-times': {},
      undo: { kind: 'event', taskId, id: event.id, before },
      created: time,
    };
  });
}

/**
 * Convert one queued change of the former shape.
 * @param {object} entry the stored entry
 * @returns {{entry: object|null, followers: object[]}} the entry to store instead, null to remove it, and the entries to append
 */
export function upgradeEntry(entry) {
  const { operation, fields = {} } = entry;
  const taskId = entry.target?.id;
  if (operation === 'create-task') {
    const { status, ...rest } = fields;
    const rules = Object.fromEntries(RULE_FIELDS.filter((field) => field in rest).map((field) => [field, rest[field]]));
    RULE_FIELDS.forEach((field) => delete rest[field]);
    const upgraded = { ...entry, fields: { ...rest, 'lifecycle-rules': rules } };
    return { entry: upgraded, followers: status && status !== 'todo' ? eventEntries(taskId, 'todo', status, entry.created) : [] };
  }
  if (operation === 'update-task') {
    const times = entry['edit-times'] ?? {};
    const followers = [];
    const rules = RULE_FIELDS.filter((field) => field in fields);
    if (rules.length > 0) {
      followers.push({
        target: { type: 'rules', id: taskId },
        operation: 'update-rules',
        fields: Object.fromEntries(rules.map((field) => [field, fields[field]])),
        'edit-times': Object.fromEntries(rules.filter((field) => field in times).map((field) => [field, times[field]])),
        undo: {
          kind: 'rules',
          id: taskId,
          fields: Object.fromEntries(rules.filter((field) => entry.undo?.fields?.[field]).map((field) => [field, entry.undo.fields[field]])),
        },
        created: entry.created,
      });
    }
    if ('status' in fields) {
      const from = entry.undo?.fields?.status?.from ?? 'todo';
      followers.push(...eventEntries(taskId, from, fields.status, times.status ?? entry.created));
    }
    const kept = 'description' in fields;
    const upgraded = kept ? {
      ...entry,
      fields: { description: fields.description },
      'edit-times': 'description' in times ? { description: times.description } : {},
      undo: { ...entry.undo, fields: Object.fromEntries(Object.entries(entry.undo?.fields ?? {}).filter(([field]) => field === 'description')) },
    } : null;
    return { entry: upgraded, followers };
  }
  if (operation === 'create-note' && 'last-edit-time' in fields) {
    const { 'last-edit-time': lastEdit, ...rest } = fields;
    return { entry: { ...entry, fields: { ...rest, 'last-update-time': lastEdit } }, followers: [] };
  }
  if (entry.undo?.kind === 'put-note') {
    return { entry: { ...entry, undo: { ...entry.undo, note: upgradeNote(entry.undo.note) } }, followers: [] };
  }
  return { entry, followers: [] };
}

/**
 * Add the ADR-0006 goal fields to every stored task, rule set, and occurrence inside the version-change transaction.
 * Rules gain `start-time` null and an `at-least` goal of `target-count` `checks`; occurrences get the same snapshot,
 * `progress` equal to `completion-count`, and `time-spent-seconds` 0. `target-count` and `completion-count` go.
 * Statuses, events, and queued changes stay as they are.
 * @param {IDBTransaction} tx the version-change transaction, after the version 5 stores exist
 * @param {() => void} [done] called once every write is requested, so the next step reads the converted records
 */
export function migrateToGoals(tx, done = () => {}) {
  const tasks = tx.objectStore(STORES.tasks);
  const occurrences = tx.objectStore(STORES.occurrences);
  const allTasks = tasks.getAll();
  allTasks.onsuccess = () => {
    for (const record of allTasks.result) {
      tasks.put({ ...record, 'lifecycle-rules': fullRules(record['lifecycle-rules']), 'current-occurrence': fullOccurrence(record['current-occurrence']) });
    }
  };
  const allOccurrences = occurrences.getAll();
  allOccurrences.onsuccess = () => {
    for (const record of allOccurrences.result) {
      occurrences.put(fullOccurrence(record), [record['task-id'], record.occurrence]);
    }
    done();
  };
}

/**
 * Ask the next download of a connected device for a fresh snapshot, through the `resync` sync state.
 * Version 6 refolded each occurrence from the events on this device, which a connected device holds only in part,
 * and the change feed never sends an unchanged task again.
 * @param {IDBTransaction} tx the version-change transaction
 */
export function requestResync(tx) {
  const state = tx.objectStore(STORES.state);
  const cursor = state.get('cursor');
  cursor.onsuccess = () => {
    if (cursor.result?.value) {
      state.put({ key: 'resync', value: true });
    }
  };
}

/** The old fold's events that end an occurrence. */
const CLOSERS = Object.freeze(['cancel', 'expire', 'roll-over', 'end-recurrence']);

/**
 * Convert the events of one occurrence as the version 6 upgrade does (see docs/specs/local-store.md, Store Upgrade).
 * The old fold runs first, noting which events applied and which event closed the occurrence. Each `complete` becomes a
 * checked `log` and each applied `uncomplete` an `undo-log` of the latest live check at its place; an ignored `uncomplete` is dropped.
 * The closing event maps the status: `expire`, a period end below target, or a `roll-over` that closed a `ready` or `in-progress`
 * occurrence gives `failed`. The in-place fold must then reproduce the old count, the mapped status, and the close time.
 * @param {object} input the occurrence to convert
 * @param {object} input.occurrence the occurrence, without `task-id`
 * @param {object} input.rules the lifecycle rules of the task
 * @param {object[]} input.events the stored events of the occurrence
 * @param {string} [input.taskId] the task, for the error message
 * @returns {{converted: object[], dropped: string[], mapped: {progress: number, status: string, 'close-time': string|null},
 *   real: object, differs: boolean}} the converted events in fold order, the identifiers of the dropped events,
 *   the verdict of the old fold mapped to the new statuses, the result of the real fold, and whether they differ
 * @throws {Error} when the in-place fold does not reproduce the old fold, which aborts the upgrade
 */
export function convertOccurrence({ occurrence, rules, events, taskId = '' }) {
  const recurring = isRecurring(rules);
  const ordered = [...events].sort((a, b) => (recurring ? isPeriodEnd(a.type) - isPeriodEnd(b.type) : 0) || byEventOrder(a, b));
  let old = { ...fullOccurrence(occurrence), progress: 0, status: 'ready', 'close-time': null };
  const live = [];
  const converted = [];
  const dropped = [];
  let closer = null;
  for (const event of ordered) {
    const next = applyEvent(old, event, rules);
    if (event.type === 'complete') {
      converted.push({ ...event, type: 'log', checked: true });
      if (next) {
        live.push(event.id);
      }
    }
    else if (event.type === 'uncomplete') {
      if (next) {
        converted.push({ ...event, type: 'undo-log', 'target-event-id': live.pop() });
      }
      else {
        dropped.push(event.id);
      }
    }
    else {
      converted.push(event);
    }
    if (next) {
      if (CLOSERS.includes(event.type)) {
        closer = { type: event.type, before: old.status, after: next.status };
      }
      else if (event.type === 'reopen') {
        closer = null;
      }
      old = next;
    }
  }
  let { status } = old;
  if (old['close-time'] !== null && closer) {
    const unmet = closer.type === 'end-recurrence' && closer.after === 'cancelled' && closer.before !== 'cancelled';
    if (closer.type === 'expire' || unmet || (closer.type === 'roll-over' && OPEN_STATUSES.includes(closer.before))) {
      status = 'failed';
    }
  }
  const mapped = { progress: old.progress, status, 'close-time': old['close-time'] };
  const target = old['goal-target'];
  const inPlace = foldInPlace({ target, recurring, events: converted });
  if (inPlace.progress !== mapped.progress || inPlace.status !== mapped.status || inPlace['close-time'] !== mapped['close-time']) {
    throw new Error(`The in-place fold of occurrence ${occurrence.occurrence} of task ${taskId} gives ${JSON.stringify(inPlace)}, not ${JSON.stringify(mapped)}.`);
  }
  const goal = { direction: old['goal-direction'], measure: old['goal-measure'], target };
  const real = foldLog({ goal, recurring, events: converted });
  const differs = real.progress !== mapped.progress || real.status !== mapped.status || real['close-time'] !== mapped['close-time'];
  return { converted, dropped, mapped, real, differs };
}

/**
 * Convert a queued change to the version 6 rule fields: `update-rules` sends `goal-target` for `target-count`, and `fail` for `cancel`.
 * The undo data keeps `target-count`, which a rollback reads as `goal-target`.
 * @param {object} entry the stored entry
 * @returns {object} the entry to store, the same object when nothing changes
 */
export function upgradeQueuedRules(entry) {
  const rename = (record) => Object.fromEntries(Object.entries(record ?? {}).map(([name, value]) => [name === 'target-count' ? 'goal-target' : name, value]));
  if (entry.operation !== 'update-rules' || !('target-count' in (entry.fields ?? {}) || entry.fields?.['overdue-handling'] === 'cancel' || 'target-count' in (entry['edit-times'] ?? {}))) {
    return entry;
  }
  const fields = rename(entry.fields);
  if (fields['overdue-handling'] === 'cancel') {
    fields['overdue-handling'] = 'fail';
  }
  return { ...entry, fields, 'edit-times': rename(entry['edit-times']) };
}

/**
 * Convert the events, statuses, and queued changes to version 6 inside the version-change transaction, and abort it on a mismatch.
 * Each occurrence with events is converted by `convertOccurrence`, stored with the real fold's cache, and the current one
 * also embeds its live `entries`. An occurrence without events keeps its stored cache. The counts go to the console.
 * @param {IDBTransaction} tx the version-change transaction, after the goal fields exist
 * @param {(error: Error) => void} [fail] called with the cause before the transaction aborts
 */
export function migrateToLog(tx, fail = () => {}) {
  const names = [STORES.tasks, STORES.occurrences, STORES.events, STORES.queue];
  const loaded = {};
  const next = (index) => {
    if (index === names.length) {
      try {
        convertStores(tx, loaded);
      }
      catch (error) {
        console.error('The upgrade to version 6 failed and keeps version 5:', error.message);
        fail(error);
        tx.abort();
      }
      return;
    }
    const request = tx.objectStore(names[index]).getAll();
    request.onsuccess = () => {
      loaded[names[index]] = request.result;
      next(index + 1);
    };
  };
  next(0);
}

/**
 * Write the converted events, occurrences, tasks, and queued changes of `migrateToLog`.
 * @param {IDBTransaction} tx the version-change transaction
 * @param {Record<string, object[]>} data the stored tasks, occurrences, events, and queue entries
 */
function convertStores(tx, data) {
  const counts = { occurrences: 0, completions: 0, dropped: 0, differing: 0 };
  const byTask = (rows) => rows.reduce((map, row) => map.set(row['task-id'], [...(map.get(row['task-id']) ?? []), row]), new Map());
  const events = byTask(data[STORES.events]);
  const occurrences = byTask(data[STORES.occurrences]);
  for (const task of data[STORES.tasks]) {
    const own = events.get(task.id) ?? [];
    for (const record of occurrences.get(task.id) ?? []) {
      const { 'task-id': taskId, ...occurrence } = record;
      const group = own.filter((event) => (event.occurrence ?? task['current-occurrence'].occurrence) === occurrence.occurrence);
      if (group.length === 0) {
        continue;
      }
      const result = convertOccurrence({ occurrence, rules: task['lifecycle-rules'], events: group, taskId });
      counts.occurrences += 1;
      counts.dropped += result.dropped.length;
      counts.differing += result.differs ? 1 : 0;
      for (const event of result.converted) {
        if (group.find((source) => source.id === event.id).type !== event.type) {
          counts.completions += 1;
          tx.objectStore(STORES.events).put(event, [taskId, event.id]);
        }
      }
      result.dropped.forEach((id) => tx.objectStore(STORES.events).delete([taskId, id]));
      const folded = fullOccurrence({
        ...occurrence,
        progress: result.real.progress ?? 0,
        status: result.real.status,
        'close-time': result.real['close-time'],
        'time-spent-seconds': result.real['time-spent-seconds'],
      });
      tx.objectStore(STORES.occurrences).put({ 'task-id': taskId, ...folded }, [taskId, occurrence.occurrence]);
      if (occurrence.occurrence === task['current-occurrence'].occurrence) {
        const byId = new Map(result.converted.map((event) => [event.id, event]));
        tx.objectStore(STORES.tasks).put({ ...task, 'current-occurrence': { ...folded, entries: result.real.entries.map((id) => byId.get(id)) } });
      }
    }
  }
  for (const entry of data[STORES.queue]) {
    const upgraded = upgradeQueuedRules(entry);
    if (upgraded !== entry) {
      tx.objectStore(STORES.queue).put(upgraded);
    }
  }
  console.info(`Store upgrade to version 6: ${counts.occurrences} occurrences refolded, ${counts.completions} events converted, `
    + `${counts.dropped} uncompletes dropped, ${counts.differing} occurrences refolded differently.`);
}

/**
 * Migrate the data of a version 1 to 4 database inside the version-change transaction.
 * @param {IDBTransaction} tx the version-change transaction, after the version 5 stores exist
 * @param {() => void} [done] called once every write is requested, so the next step reads the converted records
 */
export function migrateToLifecycle(tx, done = () => {}) {
  const tasks = tx.objectStore(STORES.tasks);
  const all = tasks.getAll();
  all.onsuccess = () => {
    for (const legacy of all.result) {
      const { task, events } = fromLegacyTask(legacy, newId);
      tasks.put(task);
      const occurrence = task['current-occurrence'];
      tx.objectStore(STORES.occurrences).put({ 'task-id': task.id, ...occurrence }, [task.id, occurrence.occurrence]);
      for (const event of events) {
        tx.objectStore(STORES.events).put(event, [task.id, event.id]);
      }
    }
  };
  const notes = tx.objectStore(STORES.notes);
  const noteCursor = notes.openCursor();
  noteCursor.onsuccess = () => {
    const cursor = noteCursor.result;
    if (cursor) {
      cursor.update(upgradeNote(cursor.value));
      cursor.continue();
    }
  };
  const queue = tx.objectStore(STORES.queue);
  const entries = queue.getAll();
  entries.onsuccess = () => {
    const appended = [];
    for (const stored of entries.result) {
      const { entry, followers } = upgradeEntry(stored);
      if (entry === null) {
        queue.delete(stored.seq);
      }
      else if (entry !== stored) {
        queue.put(entry);
      }
      appended.push(...followers);
    }
    appended.forEach((entry) => queue.add(entry));
    done();
  };
}
