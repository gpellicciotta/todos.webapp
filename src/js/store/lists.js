/**
 * List records: create, rename, describe, read, and list.
 *
 * List names are unique per owner, compared case-insensitively (`LST-3`).
 * Like the service, the check also covers lists in the recycle bin.
 * A list in the recycle bin rejects changes until restored.
 */

import { uuid7 } from '../lib/uuid7.js';
import { request, StoreError, STORES, transact, ValidationError } from './idb.js';

export const NAME_MAX = 100;
export const DESCRIPTION_MAX = 1000;

/**
 * Return the owner key used for name uniqueness: the owner's id, or null for local lists.
 * @param {object} list a list record
 * @returns {number|null} the owner key
 */
function ownerKey(list) {
  return list.owner?.id ?? null;
}

/**
 * Validate and normalize a list name.
 * @param {unknown} value the input name
 * @returns {string} the trimmed name
 */
function checkName(value) {
  const name = typeof value === 'string' ? value.trim() : '';
  if (!name) {
    throw new ValidationError('name', 'required', 'A list needs a name.');
  }
  if (name.length > NAME_MAX) {
    throw new ValidationError('name', 'too-long', `A list name holds at most ${NAME_MAX} characters.`);
  }
  return name;
}

/**
 * Validate a list description.
 * @param {unknown} value the input description
 * @returns {string} the description, empty when absent
 */
function checkDescription(value) {
  const description = value ?? '';
  if (typeof description !== 'string') {
    throw new ValidationError('description', 'invalid', 'A list description must be text.');
  }
  if (description.length > DESCRIPTION_MAX) {
    throw new ValidationError('description', 'too-long', `A list description holds at most ${DESCRIPTION_MAX} characters.`);
  }
  return description;
}

/**
 * Fail when another list of the same owner has the same name, ignoring case.
 * @param {IDBObjectStore} store the lists store
 * @param {object} list the list being written
 */
async function checkUnique(store, list) {
  const key = list.name.toLocaleLowerCase();
  const all = await request(store.getAll());
  const clash = all.find((other) => other.id !== list.id
    && ownerKey(other) === ownerKey(list)
    && other.name.toLocaleLowerCase() === key);
  if (clash) {
    const where = clash['deletion-time'] ? ' in the recycle bin' : '';
    throw new ValidationError('name', 'duplicate', `A list named "${clash.name}" already exists${where}.`);
  }
}

/**
 * Create a list.
 * @param {{db: IDBDatabase, now: () => Date}} ctx store context
 * @param {{id?: string, name: string, description?: string}} input the new list
 * @returns {Promise<object>} the stored list
 */
export async function createList(ctx, input) {
  const time = ctx.now().toISOString();
  const list = {
    id: input.id ?? uuid7(() => ctx.now().getTime()),
    name: checkName(input.name),
    description: checkDescription(input.description),
    owner: input.owner ?? null,
    'creation-time': time,
    'last-update-time': time,
    'deletion-time': null,
  };
  return transact(ctx.db, [STORES.lists], 'readwrite', async (tx) => {
    const store = tx.objectStore(STORES.lists);
    await checkUnique(store, list);
    await request(store.add(list));
    return list;
  });
}

/**
 * Validate a new list without writing it; creation still checks uniqueness in its write transaction.
 * @param {{db: IDBDatabase}} ctx store context
 * @param {{name: string, description?: string}} input the draft
 * @returns {Promise<void>} resolves when the draft is valid
 */
export async function validateList(ctx, input) {
  const name = checkName(input.name);
  checkDescription(input.description);
  await transact(ctx.db, [STORES.lists], 'readonly', (tx) => checkUnique(tx.objectStore(STORES.lists), { name, owner: null }));
}

/**
 * Rename or describe a list; omitted fields stay unchanged.
 * @param {{db: IDBDatabase, now: () => Date}} ctx store context
 * @param {string} id the list identifier
 * @param {{name?: string, description?: string}} changes the new values
 * @returns {Promise<object>} the updated list
 */
export function updateList(ctx, id, changes = {}) {
  return transact(ctx.db, [STORES.lists], 'readwrite', async (tx) => {
    const store = tx.objectStore(STORES.lists);
    const list = await request(store.get(id));
    if (!list) {
      throw new StoreError('not-found', `No list ${id}.`);
    }
    if (list['deletion-time']) {
      throw new StoreError('deleted', `List ${id} is in the recycle bin.`);
    }
    const updated = { ...list };
    if ('name' in changes) {
      updated.name = checkName(changes.name);
    }
    if ('description' in changes) {
      updated.description = checkDescription(changes.description);
    }
    await checkUnique(store, updated);
    updated['last-update-time'] = ctx.now().toISOString();
    await request(store.put(updated));
    return updated;
  });
}

/**
 * Read one list, including a deleted one.
 * @param {{db: IDBDatabase}} ctx store context
 * @param {string} id the list identifier
 * @returns {Promise<object|undefined>} the list, or undefined
 */
export function getList(ctx, id) {
  return transact(ctx.db, [STORES.lists], 'readonly', (tx) => request(tx.objectStore(STORES.lists).get(id)));
}

/**
 * Return all lists outside the recycle bin, sorted by name, ignoring case.
 * @param {{db: IDBDatabase}} ctx store context
 * @returns {Promise<object[]>} the lists
 */
export async function listLists(ctx) {
  const all = await transact(ctx.db, [STORES.lists], 'readonly', (tx) => request(tx.objectStore(STORES.lists).getAll()));
  return all
    .filter((list) => !list['deletion-time'])
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
}
