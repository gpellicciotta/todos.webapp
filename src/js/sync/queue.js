/**
 * Change queue: the local changes that wait for upload while connected (`SYN-1`, `SYN-2`).
 *
 * The store facade records every local write after it commits, when the `tracking` option says the device is connected.
 * An entry holds `seq` (the order), `target` (`{type, id}`, plus `list-id` or `task-id` for memberships, notes, and events),
 * `operation`, `fields` (only what changed), `edit-times` (one per changed field), `created`,
 * and `undo`, the data that rolls the change back locally if the service rejects it (`SYN-9`).
 * Besides the queue, this module reads and writes the `sync-state` and `sync-log` stores.
 * See docs/specs/local-store.md, Sync Queue.
 */

import { applyEvent, applyRuleEdit, firstOccurrence, RULE_FIELDS } from '../core/occurrences.js';
import { request, STORES, transact } from '../store/idb.js';
import { eventsOfWrite } from '../store/tasks.js';
import { createSyncLog } from './sync-log.js';

const LIST_FIELDS = ['name', 'description'];
const TASK_FIELDS = ['description'];
const NOTE_FIELDS = ['text', 'occurrence'];
const OPERATIONS = new Set([
  'createList', 'updateList', 'deleteList', 'restoreList', 'createTask', 'updateTask', 'deleteTask', 'restoreTask',
  'postEvent', 'updateRules', 'addToList', 'removeFromList', 'moveInList', 'addNote', 'editNote', 'deleteNote',
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
    undo: async (store, entry) => {
      const later = (await queue.all()).filter((other) => other.seq > entry.seq);
      await store.applyChanges((data) => ({ changes: planUndo(data, entry.undo, later), result: null }), { queue: true });
    },
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
    case 'postEvent':
    case 'updateRules':
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
 * Tell whether two rule values differ.
 * @param {unknown} a a value
 * @param {unknown} b another value
 * @returns {boolean} true when they differ
 */
const differs = (a, b) => (a ?? null) !== (b ?? null);

/**
 * Build the entry of a rule edit: only the changed rule fields, each with the task's last update time as edit time.
 * @param {object} before the task before
 * @param {object} after the task after
 * @returns {object[]} the entry, or none when no rule changed
 */
function rulesEntry(before, after) {
  const [old, rules] = [before['lifecycle-rules'], after['lifecycle-rules']];
  const changed = RULE_FIELDS.filter((name) => differs(old[name], rules[name]));
  if (changed.length === 0) {
    return [];
  }
  const time = after['last-update-time'];
  return [{
    target: { type: 'rules', id: after.id },
    operation: 'update-rules',
    fields: Object.fromEntries(changed.map((name) => [name, rules[name]])),
    'edit-times': Object.fromEntries(changed.map((name) => [name, time])),
    undo: { kind: 'rules', id: after.id, fields: Object.fromEntries(changed.map((name) => [name, { from: old[name], to: rules[name] }])) },
  }];
}

/**
 * Name how undoing a posted event restores the task: `previous` for a grace event that named a past occurrence,
 * which leaves the current occurrence alone; `replace` when the event opened another occurrence, such as a recurring
 * reopen or an event past the period end, so the whole occurrence before returns; `fold` when it changed the
 * current occurrence in place.
 * @param {object} before the current occurrence before the event
 * @param {object} after the current occurrence after the event
 * @param {object} event the event
 * @returns {'previous'|'replace'|'fold'} the undo mode
 */
export function eventUndoMode(before, after, event) {
  if (event.occurrence !== null && event.occurrence !== undefined && event.occurrence !== after.occurrence) {
    return 'previous';
  }
  return before.occurrence !== after.occurrence || before['start-time'] !== after['start-time'] ? 'replace' : 'fold';
}

/**
 * Build the entries of events, one request each; each undo holds the occurrence before its event.
 * @param {string} taskId the task
 * @param {object} base the occurrence before the first event
 * @param {object} rules the lifecycle rules
 * @param {object[]} events the events, in order
 * @param {'previous'|'replace'|'fold'} [mode] how undoing restores the task, see `eventUndoMode`
 * @returns {object[]} the entries
 */
function eventEntries(taskId, base, rules, events, mode = 'fold') {
  let occurrence = base;
  return events.map((event) => {
    const before = occurrence;
    occurrence = applyEvent(occurrence, event, rules) ?? occurrence;
    // An unplaced event, past the period end of a recurring task, lets the service assign the period containing its time.
    const fields = { id: event.id, type: event.type, 'creation-time': event['creation-time'] };
    if (event.occurrence !== null && event.occurrence !== undefined) {
      fields.occurrence = event.occurrence;
    }
    return {
      target: { type: 'event', id: event.id, 'task-id': taskId },
      operation: 'post-event',
      fields,
      'edit-times': {},
      undo: { kind: 'event', taskId, id: event.id, before, mode },
    };
  });
}

/**
 * Return the occurrence a task update starts its events from: the old one, moved by the update's rule edit.
 * @param {object} before the task before
 * @param {object} after the task after
 * @returns {object} the occurrence
 */
function eventBase(before, after) {
  const [old, rules] = [before['lifecycle-rules'], after['lifecycle-rules']];
  const edit = Object.fromEntries(RULE_FIELDS.filter((name) => differs(old[name], rules[name])).map((name) => [name, rules[name]]));
  return Object.keys(edit).length > 0 ? applyRuleEdit(before, edit, after['last-update-time'])['current-occurrence'] : before['current-occurrence'];
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
          'lifecycle-rules': result['lifecycle-rules'],
          'creation-time': result['creation-time'],
          lists: args[1]?.lists ?? [],
        },
        'edit-times': {},
        undo: { kind: 'remove-task', id: result.id },
      }, ...eventEntries(result.id, firstOccurrence(result['lifecycle-rules'], result['creation-time']), result['lifecycle-rules'], eventsOfWrite(result))];
    case 'updateTask':
      return result ? [
        ...updateEntry('task', 'update-task', before, result, TASK_FIELDS),
        ...rulesEntry(before, result),
        ...eventEntries(result.id, eventBase(before, result), result['lifecycle-rules'], eventsOfWrite(result)),
      ] : [];
    case 'postEvent':
      return eventEntries(result.task.id, before['current-occurrence'], before['lifecycle-rules'], [result.event],
        eventUndoMode(before['current-occurrence'], result.task['current-occurrence'], result.event));
    case 'updateRules':
      return rulesEntry(before, result);
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
    case 'addNote': {
      const fields = { id: result.id, text: result.text, 'creation-time': result['creation-time'] };
      // A linked or explicitly global note names its link; an unplaced one leaves it to the service, which rolls over first.
      if (result.occurrence !== null || args[1]?.occurrence === null) {
        fields.occurrence = result.occurrence;
      }
      return [{
        target: { type: 'note', id: result.id, 'task-id': result['task-id'] },
        operation: 'create-note',
        fields,
        'edit-times': {},
        undo: { kind: 'remove-note', taskId: result['task-id'], id: result.id },
      }];
    }
    case 'editNote': {
      const changed = NOTE_FIELDS.filter((name) => differs(before[name], result[name]));
      const pick = (note) => Object.fromEntries(changed.map((name) => [name, note[name] ?? null]));
      return changed.length === 0 ? [] : [{
        target: { type: 'note', id: result.id, 'task-id': result['task-id'] },
        operation: 'edit-note',
        fields: pick(result),
        'edit-times': Object.fromEntries(changed.map((name) => [name, result['last-update-time']])),
        undo: { kind: 'note-fields', taskId: result['task-id'], id: result.id, from: pick(before), to: pick(result) },
      }];
    }
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
 * Describe the queue entries of a merge import (`BAK-6`).
 * A row the import adds becomes a create; a row it replaces sends all its mergeable fields.
 * No entry carries an edit time, so the service takes its receive time and the whole row wins.
 * Restores go first and bin moves last, since the service refuses writes to a binned row without an edit time.
 * An import adds memberships and notes only, so it never queues a removal.
 * @param {{lists: object[], tasks: object[], memberships: object[], notes: object[]}} data the store snapshot before the import
 * @param {{put: object}} changes the planned writes, which hold the final records
 * @param {Date} now the import time
 * @returns {object[]} the entries without `seq`, in upload order
 */
export function importEntries(data, changes, now) {
  const created = now.toISOString();
  const restores = [];
  const content = [];
  const bins = [];
  const entry = (target, operation, fields, undo) => ({ target, operation, fields, 'edit-times': {}, undo, created });
  const rows = [
    ['list', 'lists', LIST_FIELDS, (record) => ({ id: record.id, name: record.name, description: record.description, 'creation-time': record['creation-time'] })],
    ['task', 'tasks', TASK_FIELDS, (record) => ({
      id: record.id,
      description: record.description,
      'lifecycle-rules': record['lifecycle-rules'],
      'creation-time': record['creation-time'],
      lists: [],
    })],
  ];
  const events = (changes.put.events ?? []).filter((event) => event.type !== 'create');
  for (const [type, store, names, createFields] of rows) {
    const known = new Map(data[store].map((record) => [record.id, record]));
    for (const record of changes.put[store] ?? []) {
      const old = known.get(record.id);
      const target = { type, id: record.id };
      if (old) {
        content.push(entry(target, `update-${type}`, Object.fromEntries(names.map((name) => [name, record[name]])), {
          kind: 'fields', type, id: record.id, fields: Object.fromEntries(names.map((name) => [name, { from: old[name], to: record[name] }])),
        }));
      }
      else {
        content.push(entry(target, `create-${type}`, createFields(record), { kind: `remove-${type}`, id: record.id }));
      }
      if (type === 'task') {
        const [oldRules, rules] = [old?.['lifecycle-rules'], record['lifecycle-rules']];
        if (old) {
          content.push(entry({ type: 'rules', id: record.id }, 'update-rules', Object.fromEntries(RULE_FIELDS.map((name) => [name, rules[name]])), {
            kind: 'rules', id: record.id, fields: Object.fromEntries(RULE_FIELDS.map((name) => [name, { from: oldRules[name], to: rules[name] }])),
          }));
        }
        const base = old ? eventBase(old, record) : firstOccurrence(rules, record['creation-time']);
        const own = events.filter((event) => event['task-id'] === record.id);
        content.push(...eventEntries(record.id, base, rules, own).map((item) => ({ ...item, created })));
      }
      const from = old?.['deletion-time'] ?? null;
      const to = record['deletion-time'] ?? null;
      if ((from === null) !== (to === null)) {
        const undo = { kind: 'fields', type, id: record.id, fields: { 'deletion-time': { from, to } } };
        (to === null ? restores : bins).push(entry(target, `${to === null ? 'restore' : 'delete'}-${type}`, {}, undo));
      }
    }
  }
  const members = new Set(data.memberships.map((m) => `${m['list-id']}\n${m['task-id']}`));
  for (const m of changes.put.memberships ?? []) {
    if (!members.has(`${m['list-id']}\n${m['task-id']}`)) {
      content.push(entry({ type: 'membership', id: m['task-id'], 'list-id': m['list-id'] }, 'add-membership', {},
        { kind: 'remove-membership', listId: m['list-id'], taskId: m['task-id'] }));
    }
  }
  const noted = new Set(data.notes.map((note) => note.id));
  for (const note of changes.put.notes ?? []) {
    if (!noted.has(note.id)) {
      const fields = { id: note.id, text: note.text, 'creation-time': note['creation-time'] };
      if (note['last-update-time'] && note['last-update-time'] !== note['creation-time']) {
        fields['last-update-time'] = note['last-update-time'];
      }
      if (Number.isInteger(note.occurrence)) {
        fields.occurrence = note.occurrence;
      }
      content.push(entry({ type: 'note', id: note.id, 'task-id': note['task-id'] }, 'create-note', fields,
        { kind: 'remove-note', taskId: note['task-id'], id: note.id }));
    }
  }
  return [...restores, ...content, ...bins];
}

/**
 * Return the queued events of a task.
 * @param {object[]} entries queue entries
 * @param {string} taskId the task
 * @returns {object[]} its `post-event` entries, in queue order
 */
function laterEvents(entries, taskId) {
  return entries.filter((other) => other.operation === 'post-event' && other.target['task-id'] === taskId);
}

/**
 * Fold queued events onto a new base after a rollback, and give each entry the occurrence before it,
 * so rolling back a later entry too restores the right occurrence.
 * @param {object} changes the planned changes; `changes.requeue` receives the rewritten entries
 * @param {object[]} events the queued `post-event` entries of the task, in order
 * @param {object} base the occurrence before the first of them
 * @param {object} rules the lifecycle rules
 * @returns {object} the occurrence after them
 */
function rechain(changes, events, base, rules) {
  let occurrence = base;
  for (const entry of events) {
    if (entry.undo?.mode === 'previous') {
      // A grace event names a past occurrence, so it never folds onto the current one.
      continue;
    }
    changes.requeue.push({ ...entry, undo: { ...entry.undo, before: occurrence } });
    occurrence = applyEvent(occurrence, entry.fields, rules) ?? occurrence;
  }
  return occurrence;
}

/**
 * Plan the bulk changes that roll back one change.
 * A rolled-back event leaves the events store, and the occurrence before it takes the events queued after it again.
 * @param {{lists: object[], tasks: object[], memberships: object[], notes: object[]}} data the store snapshot
 * @param {object} undo the entry's undo data
 * @param {object[]} [later] the queue entries after the rolled-back one
 * @returns {object} the changes for `applyChanges`
 */
function planUndo(data, undo, later = []) {
  const changes = { put: {}, delete: { memberships: [], notes: [], events: [] }, requeue: [] };

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
    case 'note-fields': {
      // Each field goes back only while it still holds the rejected value.
      const note = data.notes.find((candidate) => candidate.id === undo.id);
      const back = Object.keys(undo.to).filter((name) => note && (note[name] ?? null) === undo.to[name]);
      if (back.length > 0) {
        changes.put.notes = [{ ...note, ...Object.fromEntries(back.map((name) => [name, undo.from[name]])) }];
      }
      break;
    }
    case 'note-text': {
      // Entries queued before note links existed.
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
    case 'rules': {
      const task = data.tasks.find((candidate) => candidate.id === undo.id);
      const rules = task?.['lifecycle-rules'] ?? {};
      const reverted = Object.entries(undo.fields).filter(([name, { to }]) => !differs(rules[name], to));
      if (reverted.length > 0) {
        const edit = Object.fromEntries(reverted.map(([name, { from }]) => [name, from ?? null]));
        const settled = applyRuleEdit(task, edit, task['last-update-time']);
        const events = laterEvents(later, undo.id);
        let occurrence = settled['current-occurrence'];
        if (events.length > 0 && events[0].undo?.before) {
          // The queued events folded onto the edited rules; refold them from the first one's base under the old rules.
          const base = applyRuleEdit({ 'lifecycle-rules': rules, 'current-occurrence': events[0].undo.before }, edit, task['last-update-time']);
          occurrence = rechain(changes, events, base['current-occurrence'], settled['lifecycle-rules']);
        }
        changes.put.tasks = [{ ...task, ...settled, 'current-occurrence': occurrence }];
      }
      break;
    }
    case 'event': {
      changes.delete.events = [[undo.taskId, undo.id]];
      const task = data.tasks.find((candidate) => candidate.id === undo.taskId);
      if (task && undo.before && undo.mode !== 'previous') {
        // An event in place changes only the count, status, and close time; the other fields stay the stored ones.
        // An event that opened another occurrence gives back the whole occurrence before it.
        const current = task['current-occurrence'];
        const base = undo.mode === 'replace' ? undo.before
          : { ...current, 'completion-count': undo.before['completion-count'], status: undo.before.status, 'close-time': undo.before['close-time'] };
        const occurrence = rechain(changes, laterEvents(later, undo.taskId), base, task['lifecycle-rules']);
        changes.put.tasks = [{ ...task, 'current-occurrence': occurrence }];
      }
      break;
    }
    default:

      break;
  }
  return changes;
}
