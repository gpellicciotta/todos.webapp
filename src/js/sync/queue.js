/**
 * Change queue: the local changes that wait for upload while connected (`SYN-1`, `SYN-2`).
 *
 * The store facade records every local write after it commits, when the `tracking` option says the device is connected.
 * An entry holds `seq` (the order), `target` (`{type, id}`, plus `list-id` or `task-id` for memberships and notes),
 * `operation`, `fields` (only what changed), `edit-times` (one per changed field), `created`,
 * and `undo`, the data that rolls the change back locally if the service rejects it (`SYN-9`).
 * Besides the queue, this module reads and writes the `sync-state` and `sync-log` stores.
 * See docs/specs/local-store.md, Sync Queue.
 */

import { request, STORES, transact } from '../store/idb.js';
import { createSyncLog } from './sync-log.js';

const LIST_FIELDS = ['name', 'description'];
const TASK_FIELDS = ['description', 'status', 'due-time', 'overdue-handling'];
const OPERATIONS = new Set([
  'createList', 'updateList', 'deleteList', 'restoreList', 'createTask', 'updateTask', 'deleteTask', 'restoreTask',
  'addToList', 'removeFromList', 'moveInList', 'addNote', 'editNote', 'deleteNote',
]);

/**
 * Tell whether the facade records an operation.
 * @param {string} operation the facade method name
 * @returns {boolean} true when a call queues changes
 */
export function isTracked(operation) {
  return OPERATIONS.has(operation);
}

/**
 * Create the queue over an open database.
 * @param {{db: IDBDatabase}} ctx the store context
 * @returns {object} the queue
 */
export function createQueue(ctx) {
  const read = (store, work) => transact(ctx.db, [store], 'readonly', (tx) => work(tx.objectStore(store)));
  const write = (store, work) => transact(ctx.db, [store], 'readwrite', (tx) => work(tx.objectStore(store)));
  const log = createSyncLog(ctx);
  const queue = {
    /**
     * Append entries in one transaction, in the given order.
     * @param {object[]} entries entries without `seq`
     * @returns {Promise<void>}
     */
    add: (entries) => write(STORES.queue, async (store) => {
      for (const entry of entries) {
        await request(store.add(entry));
      }
    }),
    /** @returns {Promise<object[]>} all entries in upload order */
    all: () => read(STORES.queue, (store) => request(store.getAll())),
    /** @returns {Promise<object|undefined>} the first entry */
    first: () => read(STORES.queue, async (store) => (await request(store.getAll(null, 1)))[0]),
    /** @returns {Promise<number>} the number of entries */
    count: () => read(STORES.queue, (store) => request(store.count())),
    /**
     * Remove entries.
     * @param {number[]} seqs the entry numbers
     * @returns {Promise<void>}
     */
    remove: (seqs) => write(STORES.queue, async (store) => {
      for (const seq of seqs) {
        await request(store.delete(seq));
      }
    }),
    /** @returns {Promise<void>} */
    clear: () => write(STORES.queue, (store) => request(store.clear())),

    /**
     * Read a value of the sync state.
     * @param {string} key the key
     * @param {any} [fallback] returned when the key is absent
     * @returns {Promise<any>} the value
     */
    getState: async (key, fallback = null) => (await read(STORES.state, (store) => request(store.get(key))))?.value ?? fallback,
    /**
     * Store a value of the sync state.
     * @param {string} key the key
     * @param {any} value the value
     * @returns {Promise<void>}
     */
    setState: (key, value) => write(STORES.state, (store) => request(store.put({ key, value }))),

    /**
     * Append records to the sync log; each gets an identifier and the time.
     * @param {object[]} records the records, each with a `kind` (see sync-log.js)
     * @returns {Promise<void>}
     */
    appendLog: (records) => log.append(records),
    /** @returns {Promise<object[]>} the log records, oldest first */
    log: () => log.all(),
    /** @returns {Promise<number>} how many records older than 30 days were removed */
    purgeLog: () => log.purge(),

    /**
     * Roll an entry's change back on the local data, without queueing anything.
     * A field returns to its old value only while it still holds the value this change gave it.
     * @param {object} store the store facade
     * @param {object} entry the entry
     * @returns {Promise<void>}
     */
    undo: (store, entry) => store.applyChanges((data) => ({ changes: planUndo(data, entry.undo), result: null })),
  };
  return queue;
}

/**
 * Read a membership.
 * @param {{db: IDBDatabase}} ctx the store context
 * @param {string} listId the list
 * @param {string} taskId the task
 * @returns {Promise<object|undefined>} the membership
 */
function readMembership(ctx, listId, taskId) {
  return transact(ctx.db, [STORES.memberships], 'readonly', (tx) => request(tx.objectStore(STORES.memberships).get([listId, taskId])));
}

/**
 * Read what the write is about to change.
 * @param {{db: IDBDatabase}} ctx the store context
 * @param {string} operation the facade method
 * @param {any[]} args its arguments
 * @returns {Promise<object|undefined>} the record before the write
 */
function readBefore(ctx, operation, args) {
  const named = (store, id) => transact(ctx.db, [store], 'readonly', (tx) => request(tx.objectStore(store).get(id)));
  switch (operation) {
    case 'updateList':
    case 'restoreList':
      return named(STORES.lists, args[0]);
    case 'updateTask':
    case 'restoreTask':
      return named(STORES.tasks, args[0]);
    case 'addToList':
    case 'removeFromList':
    case 'moveInList':
      return readMembership(ctx, args[1], args[0]);
    case 'editNote':
    case 'deleteNote':
      return transact(ctx.db, [STORES.notes], 'readonly', async (tx) => (await request(tx.objectStore(STORES.notes).getAll())).find((note) => note.id === args[0]));
    default:
      return undefined;
  }
}

/**
 * Pick the fields of a record that differ between two versions.
 * @param {object} before the old record
 * @param {object} after the new record
 * @param {string[]} names the mergeable fields
 * @returns {string[]} the changed field names
 */
function changedFields(before, after, names) {
  return names.filter((name) => before[name] !== after[name]);
}

/**
 * Build an entry for a field update of a list or task.
 * @param {'list'|'task'} type the target type
 * @param {string} operation the entry operation
 * @param {object} before the record before
 * @param {object} after the record after
 * @param {string[]} names the fields that can change
 * @returns {object[]} the entry, or none when no field changed
 */
function updateEntry(type, operation, before, after, names) {
  const changed = changedFields(before, after, names);
  if (changed.length === 0) {
    return [];
  }
  const time = after['last-update-time'];
  return [{
    target: { type, id: after.id },
    operation,
    fields: Object.fromEntries(changed.map((name) => [name, after[name]])),
    'edit-times': Object.fromEntries(changed.map((name) => [name, time])),
    undo: { kind: 'fields', type, id: after.id, fields: Object.fromEntries(changed.map((name) => [name, { from: before[name], to: after[name] }])) },
  }];
}

/**
 * Build the entry of a move to or from the recycle bin.
 * @param {'list'|'task'} type the target type
 * @param {string} operation the entry operation
 * @param {object} record the record after
 * @param {string|null} from the old deletion time
 * @returns {object[]} the entry
 */
function binEntry(type, operation, record, from) {
  const time = record['deletion-time'] ?? record['last-update-time'];
  return [{
    target: { type, id: record.id },
    operation,
    fields: {},
    'edit-times': { 'deletion-time': time },
    undo: { kind: 'fields', type, id: record.id, fields: { 'deletion-time': { from, to: record['deletion-time'] } } },
  }];
}

/**
 * Describe the queue entries of a committed write.
 * @param {{db: IDBDatabase, now: () => Date}} ctx the store context
 * @param {string} operation the facade method
 * @param {any[]} args its arguments
 * @param {object|undefined} before the record before the write
 * @param {any} result what the write returned
 * @returns {Promise<object[]>} the entries, empty when nothing needs to upload
 */
async function describe(ctx, operation, args, before, result) {
  const time = ctx.now().toISOString();
  const membership = (op, listId, taskId, fields, name, undo) => [{
    target: { type: 'membership', id: taskId, 'list-id': listId }, operation: op, fields, 'edit-times': { [name]: time }, undo,
  }];
  switch (operation) {
    case 'createList':
      return [{
        target: { type: 'list', id: result.id },
        operation: 'create-list',
        fields: { id: result.id, name: result.name, description: result.description, 'creation-time': result['creation-time'] },
        'edit-times': {},
        undo: { kind: 'remove-list', id: result.id },
      }];
    case 'updateList':
      return updateEntry('list', 'update-list', before, result, LIST_FIELDS);
    case 'deleteList':
      return binEntry('list', 'delete-list', result, null);
    case 'restoreList':
      return binEntry('list', 'restore-list', result, before['deletion-time']);
    case 'createTask':
      return [{
        target: { type: 'task', id: result.id },
        operation: 'create-task',
        fields: {
          id: result.id,
          description: result.description,
          status: result.status,
          'due-time': result['due-time'],
          'overdue-handling': result['overdue-handling'],
          'creation-time': result['creation-time'],
          lists: args[1]?.lists ?? [],
        },
        'edit-times': {},
        undo: { kind: 'remove-task', id: result.id },
      }];
    case 'updateTask':
      return result ? updateEntry('task', 'update-task', before, result, TASK_FIELDS) : [];
    case 'deleteTask':
      return binEntry('task', 'delete-task', result, null);
    case 'restoreTask':
      return binEntry('task', 'restore-task', result, before['deletion-time']);
    case 'addToList':
      return before ? [] : membership('add-membership', args[1], args[0], {}, 'existence', { kind: 'remove-membership', listId: args[1], taskId: args[0] });
    case 'removeFromList':
      return before ? membership('remove-membership', args[1], args[0], {}, 'existence', { kind: 'put-membership', membership: before }) : [];
    case 'moveInList': {
      const after = await readMembership(ctx, args[1], args[0]);
      const placement = args[2].before ? { before: args[2].before } : { after: args[2].after };
      return membership('move-membership', args[1], args[0], placement, 'position', {
        kind: 'position', listId: args[1], taskId: args[0], from: before?.position, to: after?.position,
      });
    }
    case 'addNote':
      return [{
        target: { type: 'note', id: result.id, 'task-id': result['task-id'] },
        operation: 'create-note',
        fields: { id: result.id, text: result.text, 'creation-time': result['creation-time'] },
        'edit-times': {},
        undo: { kind: 'remove-note', taskId: result['task-id'], id: result.id },
      }];
    case 'editNote':
      return before.text === result.text ? [] : [{
        target: { type: 'note', id: result.id, 'task-id': result['task-id'] },
        operation: 'edit-note',
        fields: { text: result.text },
        'edit-times': { text: result['edit-time'] },
        undo: { kind: 'note-text', taskId: result['task-id'], id: result.id, from: before.text, to: result.text },
      }];
    case 'deleteNote':
      return [{
        target: { type: 'note', id: before.id, 'task-id': before['task-id'] },
        operation: 'delete-note',
        fields: {},
        'edit-times': { existence: time },
        undo: { kind: 'put-note', note: before },
      }];
    default:
      return [];
  }
}

/**
 * Start recording a write: read what it changes now, and return the function that queues it once it committed.
 * @param {{db: IDBDatabase, now: () => Date}} ctx the store context
 * @param {object} queue the queue
 * @param {string} operation the facade method
 * @param {any[]} args its arguments
 * @returns {Promise<(result: any) => Promise<void>>} queues the entries of the committed write
 */
export async function trackChange(ctx, queue, operation, args) {
  const before = await readBefore(ctx, operation, args);
  return async (result) => {
    const created = ctx.now().toISOString();
    const entries = await describe(ctx, operation, args, before, result);
    await queue.add(entries.map((entry) => ({ ...entry, created })));
  };
}

/**
 * Plan the bulk changes that roll back one change.
 * @param {{lists: object[], tasks: object[], memberships: object[], notes: object[]}} data the store snapshot
 * @param {object} undo the entry's undo data
 * @returns {object} the changes for `applyChanges`
 */
function planUndo(data, undo) {
  const changes = { put: {}, delete: { memberships: [], notes: [] } };
  const key = (membership) => [membership['list-id'], membership['task-id']];
  switch (undo.kind) {
    case 'remove-list':
      changes.delete.lists = [undo.id];
      changes.delete.memberships = data.memberships.filter((m) => m['list-id'] === undo.id).map(key);
      break;
    case 'remove-task':
      changes.delete.tasks = [undo.id];
      changes.delete.memberships = data.memberships.filter((m) => m['task-id'] === undo.id).map(key);
      changes.delete.notes = data.notes.filter((note) => note['task-id'] === undo.id).map((note) => [note['task-id'], note.id]);
      break;
    case 'remove-note':
      changes.delete.notes = [[undo.taskId, undo.id]];
      break;
    case 'fields': {
      const record = data[`${undo.type}s`].find((candidate) => candidate.id === undo.id);
      const reverted = Object.entries(undo.fields).filter(([name, { to }]) => record?.[name] === to);
      if (reverted.length > 0) {
        changes.put[`${undo.type}s`] = [{ ...record, ...Object.fromEntries(reverted.map(([name, { from }]) => [name, from])) }];
      }
      break;
    }
    case 'remove-membership':
      changes.delete.memberships = [[undo.listId, undo.taskId]];
      break;
    case 'put-membership':
      if (data.lists.some((list) => list.id === undo.membership['list-id']) && data.tasks.some((task) => task.id === undo.membership['task-id'])) {
        changes.put.memberships = [undo.membership];
      }
      break;
    case 'position': {
      const current = data.memberships.find((m) => m['list-id'] === undo.listId && m['task-id'] === undo.taskId);
      if (current && current.position === undo.to && undo.from !== undefined) {
        changes.put.memberships = [{ ...current, position: undo.from }];
      }
      break;
    }
    case 'note-text': {
      const note = data.notes.find((candidate) => candidate.id === undo.id);
      if (note?.text === undo.to) {
        changes.put.notes = [{ ...note, text: undo.from }];
      }
      break;
    }
    case 'put-note':
      if (data.tasks.some((task) => task.id === undo.note['task-id'])) {
        changes.put.notes = [undo.note];
      }
      break;
    default:
      break;
  }
  return changes;
}
