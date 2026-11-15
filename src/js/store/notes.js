/**
 * Task notes: add, edit, delete, and list by task, newest first (`NOT-1` to `NOT-6`).
 *
 * Notes live in their own store, keyed out of line by `[task-id, id]`,
 * so one key range reads all notes of a task.
 * Every note change sets the task's last update time in the same transaction (`NOT-5`).
 * A note belongs to one occurrence of its task, or with `occurrence` null to the whole task (`NOT-6`).
 * The rules follow the todos.server business logic spec, Notes and Occurrences.
 */

import { isRecurring } from '../core/occurrences.js';
import { uuid7 } from '../lib/uuid7.js';
import { request, StoreError, STORES, transact, ValidationError } from './idb.js';
import { mustGetLiveTask, mustGetTask, rollOverTask, touchTask } from './tasks.js';

export const TEXT_MAX = 2000;

/**
 * Validate and normalize a note text.
 * @param {unknown} value the input text
 * @returns {string} the trimmed text
 */
function checkText(value) {
  const text = typeof value === 'string' ? value.trim() : '';
  if (!text) {
    throw new ValidationError('text', 'required', 'A note needs a text.');
  }
  if (text.length > TEXT_MAX) {
    throw new ValidationError('text', 'too-long', `A note holds at most ${TEXT_MAX} characters.`);
  }
  return text;
}

/**
 * Validate an occurrence link: null for the whole task, or an occurrence number of at least 1.
 * @param {unknown} value the input link
 * @returns {number|null} the link
 */
function checkOccurrence(value) {
  if (value === null || (Number.isInteger(value) && value >= 1)) {
    return value;
  }
  throw new ValidationError('occurrence', 'invalid', 'A note links to an occurrence number of at least 1, or to the whole task.');
}

/**
 * Check that a task has reached the occurrence a note links to.
 * @param {object} task the task
 * @param {number|null} link the occurrence number, or null for the whole task
 * @returns {number|null} the link
 */
function mustBeReached(task, link) {
  if (link !== null && link > task['current-occurrence'].occurrence) {
    throw new StoreError('conflict', `Task ${task.id} has no occurrence ${link} yet.`);
  }
  return link;
}

/**
 * Return the default link of a note on a task, as the service's `defaultLink` does: on a recurring task,
 * the newest occurrence that began by the time, when its period has not ended by then.
 * A one-off task, or a time in no period, such as before occurrence 1 or after the recurrence ended, gives null.
 * @param {{keyRange: typeof IDBKeyRange}} ctx store context
 * @param {IDBTransaction} tx a transaction covering the occurrences store
 * @param {object} task the task
 * @param {string} time the ISO time
 * @returns {Promise<number|null>} the occurrence number, or null
 */
async function occurrenceAt(ctx, tx, task, time) {
  if (!isRecurring(task['lifecycle-rules'])) {
    return null;
  }
  const at = Date.parse(time);
  const current = task['current-occurrence'];
  // The task holds the newest copy of its current occurrence; the store holds the earlier ones.
  const stored = await request(tx.objectStore(STORES.occurrences).getAll(ctx.keyRange.bound([task.id], [task.id, []])));
  const started = [...stored.filter((occurrence) => occurrence.occurrence !== current.occurrence), current]
    .filter((occurrence) => Date.parse(occurrence['start-time']) <= at)
    .sort((a, b) => b.occurrence - a.occurrence)[0];
  return started?.['due-time'] && at < Date.parse(started['due-time']) ? started.occurrence : null;
}

/**
 * Find a note's key by its identifier inside a transaction, failing when it does not exist.
 * Reads keys only, since the identifier is the second part of the key.
 * @param {IDBTransaction} tx the transaction
 * @param {string} id the note identifier
 * @returns {Promise<[string, string]>} the key `[task-id, id]`
 */
async function mustFindKey(tx, id) {
  const keys = await request(tx.objectStore(STORES.notes).getAllKeys());
  const key = keys.find((candidate) => candidate[1] === id);
  if (!key) {
    throw new StoreError('not-found', `No note ${id}.`);
  }
  return key;
}

/**
 * Add a note to a task. In local mode a recurring task rolls over first, as the service does before it links a note.
 * Without `occurrence`, a note on a recurring task links to the occurrence whose period holds its creation time;
 * a note on a one-off task, or one written in no stored period, stays global.
 * @param {{db: IDBDatabase, keyRange: typeof IDBKeyRange, now: () => Date}} ctx store context
 * @param {string} taskId the task identifier
 * @param {{id?: string, text: string, 'owner-id'?: number|string|null, occurrence?: number|null}} input the new note;
 *   the owner is null locally, and `occurrence` null keeps the note global
 * @returns {Promise<object>} the stored note, last updated at its creation time
 * @throws {ValidationError} for an empty or too long text, or a link below 1
 * @throws {StoreError} with code `conflict` for a link past the current occurrence
 */
export async function addNote(ctx, taskId, input = {}) {
  const named = input.occurrence !== undefined;
  const link = named ? checkOccurrence(input.occurrence) : null;
  const text = checkText(input.text);
  await rollOverTask(ctx, taskId);
  const time = ctx.now().toISOString();
  const note = {
    id: input.id ?? uuid7(() => ctx.now().getTime()),
    'task-id': taskId,
    text,
    'owner-id': input['owner-id'] ?? null,
    occurrence: null,
    'creation-time': time,
    'last-update-time': time,
  };
  return transact(ctx.db, [STORES.tasks, STORES.occurrences, STORES.notes], 'readwrite', async (tx) => {
    const task = await touchTask(tx, taskId, time);
    note.occurrence = named ? mustBeReached(task, link) : await occurrenceAt(ctx, tx, task, time);
    await request(tx.objectStore(STORES.notes).add(note, [taskId, note.id]));
    return note;
  });
}

/**
 * Change a note's text, its occurrence link, or both, and set its last update time.
 * A new link rolls a recurring task over first in local mode, and may name any occurrence up to the current one.
 * @param {{db: IDBDatabase, now: () => Date}} ctx store context
 * @param {string} id the note identifier
 * @param {string|{text?: string, occurrence?: number|null}} changes the new text, or the new text and link;
 *   `occurrence` null makes the note global
 * @returns {Promise<object>} the updated note
 * @throws {ValidationError} for no change, an empty or too long text, or a link below 1
 * @throws {StoreError} with code `conflict` for a link past the current occurrence
 */
export async function editNote(ctx, id, changes) {
  const input = typeof changes === 'string' ? { text: changes } : { ...changes };
  const relink = input.occurrence !== undefined;
  if (input.text === undefined && !relink) {
    throw new ValidationError('text', 'required', 'A note edit needs a text or an occurrence.');
  }
  const text = input.text === undefined ? undefined : checkText(input.text);
  const link = relink ? checkOccurrence(input.occurrence) : undefined;
  if (relink) {
    const [taskId] = await transact(ctx.db, [STORES.notes], 'readonly', (tx) => mustFindKey(tx, id));
    await rollOverTask(ctx, taskId);
  }
  return transact(ctx.db, [STORES.tasks, STORES.notes], 'readwrite', async (tx) => {
    const key = await mustFindKey(tx, id);
    const store = tx.objectStore(STORES.notes);
    const time = ctx.now().toISOString();
    const updated = { ...(await request(store.get(key))), 'last-update-time': time };
    if (text !== undefined) {
      updated.text = text;
    }
    if (relink) {
      updated.occurrence = mustBeReached(await mustGetLiveTask(tx, key[0]), link);
    }
    await request(store.put(updated, key));
    await touchTask(tx, updated['task-id'], time);
    return updated;
  });
}

/**
 * Delete a note.
 * @param {{db: IDBDatabase, now: () => Date}} ctx store context
 * @param {string} id the note identifier
 * @returns {Promise<void>}
 */
export function deleteNote(ctx, id) {
  return transact(ctx.db, [STORES.tasks, STORES.notes], 'readwrite', async (tx) => {
    const key = await mustFindKey(tx, id);
    await request(tx.objectStore(STORES.notes).delete(key));
    await touchTask(tx, key[0], ctx.now().toISOString());
  });
}

/**
 * Return the notes of a task, newest first.
 * Notes of the same millisecond fall back to their UUIDv7 identifiers, which also sort by creation.
 * @param {{db: IDBDatabase, keyRange: typeof IDBKeyRange}} ctx store context
 * @param {string} taskId the task identifier
 * @returns {Promise<object[]>} the notes
 */
export function notesOfTask(ctx, taskId) {
  return transact(ctx.db, [STORES.tasks, STORES.notes], 'readonly', async (tx) => {
    await mustGetTask(tx, taskId);
    const range = ctx.keyRange.bound([taskId], [taskId, []]);
    const notes = await request(tx.objectStore(STORES.notes).getAll(range));
    return notes.sort((a, b) => b['creation-time'].localeCompare(a['creation-time']) || (a.id < b.id ? 1 : -1));
  });
}
