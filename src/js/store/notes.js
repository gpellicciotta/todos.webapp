/**
 * Task notes: add, edit, delete, and list by task, newest first (`NOT-1` to `NOT-5`).
 *
 * Notes live in their own store, keyed out of line by `[task-id, id]`,
 * so one key range reads all notes of a task.
 * Every note change sets the task's last activity time in the same transaction.
 */

import { uuid7 } from '../lib/uuid7.js';
import { request, StoreError, STORES, transact, ValidationError } from './idb.js';
import { markActivity, mustGetTask } from './tasks.js';

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
 * Add a note to a task.
 * @param {{db: IDBDatabase, now: () => Date}} ctx store context
 * @param {string} taskId the task identifier
 * @param {{id?: string, text: string, author?: object|null}} input the new note; the author is null locally
 * @returns {Promise<object>} the stored note
 */
export async function addNote(ctx, taskId, input = {}) {
  const time = ctx.now().toISOString();
  const note = {
    id: input.id ?? uuid7(() => ctx.now().getTime()),
    'task-id': taskId,
    text: checkText(input.text),
    author: input.author ?? null,
    'creation-time': time,
    'edit-time': null,
  };
  return transact(ctx.db, [STORES.tasks, STORES.notes], 'readwrite', async (tx) => {
    await markActivity(tx, taskId, time);
    await request(tx.objectStore(STORES.notes).add(note, [taskId, note.id]));
    return note;
  });
}

/**
 * Replace a note's text and set its edit time.
 * @param {{db: IDBDatabase, now: () => Date}} ctx store context
 * @param {string} id the note identifier
 * @param {string} text the new text
 * @returns {Promise<object>} the updated note
 */
export async function editNote(ctx, id, text) {
  const checked = checkText(text);
  return transact(ctx.db, [STORES.tasks, STORES.notes], 'readwrite', async (tx) => {
    const key = await mustFindKey(tx, id);
    const store = tx.objectStore(STORES.notes);
    const time = ctx.now().toISOString();
    const updated = { ...(await request(store.get(key))), text: checked, 'edit-time': time };
    await request(store.put(updated, key));
    await markActivity(tx, updated['task-id'], time);
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
    await markActivity(tx, key[0], ctx.now().toISOString());
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
