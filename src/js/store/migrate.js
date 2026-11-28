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
  applyEvent, DEFAULT_RULES, eventsTowardsStatus, firstOccurrence, fromLegacyTask, makeEvent, mirrorOccurrence, mirrorRules,
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
  return { ...firstOccurrence(DEFAULT_RULES, null), status: current, 'completion-count': current === 'completed' ? 1 : 0 };
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
 * `progress` equal to `completion-count`, and `time-spent-seconds` 0. Counts, statuses, events, and queued changes stay as they are.
 * @param {IDBTransaction} tx the version-change transaction, after the version 5 stores exist
 */
export function migrateToGoals(tx) {
  for (const name of [STORES.tasks, STORES.occurrences]) {
    const cursor = tx.objectStore(name).openCursor();
    cursor.onsuccess = () => {
      const row = cursor.result;
      if (!row) {
        return;
      }
      const record = row.value;
      if (name === STORES.tasks) {
        row.update({ ...record, 'lifecycle-rules': mirrorRules(record['lifecycle-rules']), 'current-occurrence': mirrorOccurrence(record['current-occurrence']) });
      }
      else {
        row.update(mirrorOccurrence(record));
      }
      row.continue();
    };
  }
}

/**
 * Migrate the data of a version 1 to 4 database inside the version-change transaction.
 * @param {IDBTransaction} tx the version-change transaction, after the version 5 stores exist
 */
export function migrateToLifecycle(tx) {
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
  };
}
