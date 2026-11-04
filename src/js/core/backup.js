/**
 * JSON backups: export, validation, import preview, and import in merge or overwrite mode (`BAK-1` to `BAK-14`).
 *
 * docs/specs/backup-format.md describes the file format and the import rules.
 * Imports plan their writes from a store snapshot with a pure function, so the preview
 * and the import count the same changes, and the store applies them in one transaction.
 */

import { NAME_MAX, DESCRIPTION_MAX as LIST_DESCRIPTION_MAX } from '../store/lists.js';
import { TEXT_MAX } from '../store/notes.js';
import { OVERDUE_HANDLINGS, STATUSES, DESCRIPTION_MAX as TASK_DESCRIPTION_MAX } from '../store/tasks.js';
import { isValidKey, keyBetween, MAX_KEY_LENGTH } from '../lib/fractional-index.js';

export const FORMAT = 'todos-backup';
export const FORMAT_VERSION = 1;
export const MODES = ['merge', 'overwrite'];

/** The fields of each record type, in file order. */
export const FIELDS = {
  lists: ['id', 'name', 'description', 'owner', 'creation-time', 'last-update-time', 'deletion-time'],
  tasks: [
    'id', 'description', 'status', 'due-time', 'overdue-handling', 'owner-id',
    'creation-time', 'last-update-time', 'last-activity-time', 'deletion-time',
  ],
  memberships: ['list-id', 'task-id', 'position', 'added-time'],
  notes: ['id', 'task-id', 'text', 'author', 'creation-time', 'edit-time'],
};

const TYPES = Object.keys(FIELDS);
const ID_MAX = 128;
const TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;

/** A backup file or import request is invalid; `code` names the reason and `path` the bad value. */
export class BackupError extends Error {
  /**
   * @param {string} code `invalid-json`, `invalid`, or `unsupported-version`
   * @param {string} message human-readable message
   * @param {string} [path] the path of the bad value, such as `tasks[2].status`
   */
  constructor(code, message, path = '') {
    super(message);
    this.name = 'BackupError';
    this.code = code;
    this.path = path;
  }
}

/**
 * Throw an `invalid` BackupError for a value.
 * @param {string} path the path of the value
 * @param {string} problem what is wrong with it
 */
function fail(path, problem) {
  throw new BackupError('invalid', `Invalid backup: ${path} ${problem}.`, path);
}

/**
 * Compare two strings by code unit order.
 * @param {string} a a string
 * @param {string} b another string
 * @returns {number} negative, zero, or positive
 */
function compare(a, b) {
  if (a === b) {
    return 0;
  }
  return a < b ? -1 : 1;
}

/**
 * Copy the known fields of a record, in file order.
 * @param {object} record the record
 * @param {string} type the record type
 * @returns {object} the copy
 */
function pick(record, type) {
  return Object.fromEntries(FIELDS[type].map((field) => [field, record[field] ?? null]));
}

/**
 * Check a plain object.
 * @param {unknown} value the value
 * @param {string} path its path
 * @returns {object} the object
 */
function checkObject(value, path) {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    fail(path, 'must be an object');
  }
  return value;
}

/**
 * Check an identifier.
 * @param {unknown} value the value
 * @param {string} path its path
 * @returns {string} the identifier
 */
function checkId(value, path) {
  if (typeof value !== 'string' || !value || value.length > ID_MAX) {
    fail(path, `must be an identifier of 1 to ${ID_MAX} characters`);
  }
  return value;
}

/**
 * Check a UTC time, or null when allowed.
 * @param {unknown} value the value
 * @param {string} path its path
 * @param {boolean} [nullable] whether null is allowed
 * @returns {string|null} the time
 */
function checkTime(value, path, nullable = false) {
  if (value === null && nullable) {
    return null;
  }
  const ms = typeof value === 'string' && TIME.test(value) ? Date.parse(value) : NaN;
  // Date.parse rolls impossible dates over, such as February 30 to March 2, so compare the components back.
  if (Number.isNaN(ms) || new Date(ms).toISOString().slice(0, 19) !== value.slice(0, 19)) {
    fail(path, 'must be a valid UTC time such as 2026-11-04T09:00:00.000Z');
  }
  return value;
}

/**
 * Check a list description, which the store keeps exactly as entered, without trimming.
 * @param {unknown} value the value, empty when missing
 * @param {string} path its path
 * @returns {string} the description
 */
function checkDescription(value, path) {
  const description = value ?? '';
  if (typeof description !== 'string' || description.length > LIST_DESCRIPTION_MAX) {
    fail(path, `must be a text of at most ${LIST_DESCRIPTION_MAX} characters`);
  }
  return description;
}

/**
 * Return an identifier as a comparable key, so that 7 and '7' match.
 * @param {unknown} id a numeric or string identifier, or null
 * @returns {string|null} the key
 */
function idKey(id) {
  return id === null || id === undefined ? null : String(id);
}

/**
 * Check a text and return it trimmed.
 * @param {unknown} value the value
 * @param {string} path its path
 * @param {number} min the minimum length after trimming
 * @param {number} max the maximum length after trimming
 * @returns {string} the trimmed text
 */
function checkText(value, path, min, max) {
  const text = typeof value === 'string' ? value.trim() : null;
  if (text === null || text.length < min || text.length > max) {
    fail(path, `must be a text of ${min} to ${max} characters`);
  }
  return text;
}

/**
 * Check a value against allowed values.
 * @param {unknown} value the value
 * @param {string} path its path
 * @param {string[]} allowed the allowed values
 * @returns {string} the value
 */
function checkEnum(value, path, allowed) {
  if (!allowed.includes(value)) {
    fail(path, `must be one of ${allowed.join(', ')}`);
  }
  return value;
}

/**
 * Check a person reference: null, or an object with an `id`.
 * @param {unknown} value the value
 * @param {string} path its path
 * @returns {object|null} the reference
 */
function checkPerson(value, path) {
  if (value === null || value === undefined) {
    return null;
  }
  const person = checkObject(value, path);
  if (!['number', 'string'].includes(typeof person.id)) {
    fail(`${path}.id`, 'must be a number or a string');
  }
  return { ...person };
}

/**
 * Validate the records of one type, also checking unique keys and references.
 * @param {object} data the backup object
 * @param {string} type the record type
 * @param {(raw: object, path: string) => object} check validates one record
 * @param {(record: object) => string} keyOf the unique key of a record
 * @param {string} keyField the field reported for a duplicate, or null for the record itself
 * @returns {object[]} the normalized records
 */
function checkRecords(data, type, check, keyOf, keyField) {
  if (!Array.isArray(data[type])) {
    fail(type, 'must be an array');
  }
  const seen = new Set();
  return data[type].map((raw, i) => {
    const path = `${type}[${i}]`;
    const record = check(checkObject(raw, path), path);
    const key = keyOf(record);
    if (seen.has(key)) {
      fail(keyField ? `${path}.${keyField}` : path, 'repeats an earlier record');
    }
    seen.add(key);
    return record;
  });
}

/**
 * Validate a backup object and return its normalized copy, without unknown fields.
 * @param {unknown} data the parsed file
 * @returns {object} the backup
 */
export function validateBackup(data) {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    throw new BackupError('invalid', 'Invalid backup: the file does not hold a backup object.');
  }
  if (data.format !== FORMAT) {
    fail('format', `must be ${FORMAT}`);
  }
  const version = data['format-version'];
  if (!Number.isInteger(version)) {
    fail('format-version', 'must be an integer');
  }
  if (version !== FORMAT_VERSION) {
    throw new BackupError('unsupported-version',
      `Unsupported backup format version ${version}; this app reads version ${FORMAT_VERSION}.`, 'format-version');
  }
  if (typeof data['app-version'] !== 'string' || !data['app-version']) {
    fail('app-version', 'must be a non-empty string');
  }
  const exportTime = checkTime(data['export-time'], 'export-time');

  const lists = checkRecords(data, 'lists', (raw, path) => ({
    id: checkId(raw.id, `${path}.id`),
    name: checkText(raw.name, `${path}.name`, 1, NAME_MAX),
    description: checkDescription(raw.description, `${path}.description`),
    owner: checkPerson(raw.owner, `${path}.owner`),
    'creation-time': checkTime(raw['creation-time'], `${path}.creation-time`),
    'last-update-time': checkTime(raw['last-update-time'], `${path}.last-update-time`),
    'deletion-time': checkTime(raw['deletion-time'] ?? null, `${path}.deletion-time`, true),
  }), (list) => list.id, 'id');
  const names = new Set();
  lists.forEach((list, i) => {
    const key = `${idKey(list.owner?.id)}\n${list.name.toLocaleLowerCase()}`;
    if (names.has(key)) {
      fail(`lists[${i}].name`, 'repeats the name of an earlier list of the same owner');
    }
    names.add(key);
  });

  const tasks = checkRecords(data, 'tasks', (raw, path) => {
    const ownerId = raw['owner-id'] ?? null;
    if (ownerId !== null && !Number.isInteger(ownerId) && (typeof ownerId !== 'string' || !ownerId)) {
      fail(`${path}.owner-id`, 'must be null, an integer, or a string');
    }
    return {
      id: checkId(raw.id, `${path}.id`),
      description: checkText(raw.description, `${path}.description`, 1, TASK_DESCRIPTION_MAX),
      status: checkEnum(raw.status, `${path}.status`, STATUSES),
      'due-time': checkTime(raw['due-time'] ?? null, `${path}.due-time`, true),
      'overdue-handling': checkEnum(raw['overdue-handling'], `${path}.overdue-handling`, OVERDUE_HANDLINGS),
      'owner-id': ownerId,
      'creation-time': checkTime(raw['creation-time'], `${path}.creation-time`),
      'last-update-time': checkTime(raw['last-update-time'], `${path}.last-update-time`),
      'last-activity-time': checkTime(raw['last-activity-time'], `${path}.last-activity-time`),
      'deletion-time': checkTime(raw['deletion-time'] ?? null, `${path}.deletion-time`, true),
    };
  }, (task) => task.id, 'id');

  const listIds = new Set(lists.map((list) => list.id));
  const taskIds = new Set(tasks.map((task) => task.id));
  /**
   * Check a reference to a record of the same file.
   * @param {unknown} value the identifier
   * @param {string} path its path
   * @param {Set<string>} ids the known identifiers
   * @returns {string} the identifier
   */
  const checkRef = (value, path, ids) => {
    if (!ids.has(checkId(value, path))) {
      fail(path, 'must refer to a record of this file');
    }
    return value;
  };

  const memberships = checkRecords(data, 'memberships', (raw, path) => {
    if (!isValidKey(raw.position) || raw.position.length > MAX_KEY_LENGTH) {
      fail(`${path}.position`, `must be a fractional-index key of at most ${MAX_KEY_LENGTH} characters`);
    }
    return {
      'list-id': checkRef(raw['list-id'], `${path}.list-id`, listIds),
      'task-id': checkRef(raw['task-id'], `${path}.task-id`, taskIds),
      position: raw.position,
      'added-time': checkTime(raw['added-time'], `${path}.added-time`),
    };
  }, (m) => `${m['list-id']}\n${m['task-id']}`, null);

  const notes = checkRecords(data, 'notes', (raw, path) => ({
    id: checkId(raw.id, `${path}.id`),
    'task-id': checkRef(raw['task-id'], `${path}.task-id`, taskIds),
    text: checkText(raw.text, `${path}.text`, 1, TEXT_MAX),
    author: checkPerson(raw.author, `${path}.author`),
    'creation-time': checkTime(raw['creation-time'], `${path}.creation-time`),
    'edit-time': checkTime(raw['edit-time'] ?? null, `${path}.edit-time`, true),
  }), (note) => note.id, 'id');

  return {
    format: FORMAT,
    'format-version': FORMAT_VERSION,
    'app-version': data['app-version'],
    'export-time': exportTime,
    lists,
    tasks,
    memberships,
    notes,
  };
}

/**
 * Parse and validate the text of a backup file.
 * @param {string} text the file contents
 * @returns {object} the backup
 */
export function parseBackup(text) {
  let data;
  try {
    data = JSON.parse(text);
  }
  catch (error) {
    throw new BackupError('invalid-json', `The file is not valid JSON: ${error.message}`);
  }
  return validateBackup(data);
}

/**
 * Return the backup file name for an export date, in local time (`BAK-4`).
 * @param {Date} [date] the export time
 * @returns {string} the file name
 */
export function backupFileName(date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return `todos-backup-${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}.json`;
}

/**
 * Export every list, task, membership, and note of the store, including recycle bin entries.
 * @param {object} store the store facade
 * @param {{now?: Date, appVersion: string}} options the export time and the app version
 * @returns {Promise<object>} the backup object; `JSON.stringify(backup, null, 2)` gives the file text
 */
export async function exportBackup(store, { now = new Date(), appVersion }) {
  if (typeof appVersion !== 'string' || !appVersion) {
    throw new TypeError('exportBackup needs the app version.');
  }
  const data = await store.snapshot();
  return {
    format: FORMAT,
    'format-version': FORMAT_VERSION,
    'app-version': appVersion,
    'export-time': now.toISOString(),
    lists: data.lists.map((list) => pick(list, 'lists')).sort((a, b) => compare(a.id, b.id)),
    tasks: data.tasks.map((task) => pick(task, 'tasks')).sort((a, b) => compare(a.id, b.id)),
    memberships: data.memberships.map((m) => pick(m, 'memberships')).sort((a, b) => compare(a['list-id'], b['list-id'])
      || compare(a.position, b.position) || compare(a['task-id'], b['task-id'])),
    notes: data.notes.map((note) => pick(note, 'notes')).sort((a, b) => compare(a['task-id'], b['task-id'])
      || compare(a['creation-time'], b['creation-time']) || compare(a.id, b.id)),
  };
}

/**
 * Return empty import counts, in total and per record type.
 * @returns {object} the counts
 */
function emptyCounts() {
  const zero = () => ({ added: 0, updated: 0, binned: 0, removed: 0, skipped: 0 });
  return { ...zero(), ...Object.fromEntries(TYPES.map((type) => [type, zero()])) };
}

/**
 * Tell whether one time is strictly later than another.
 * @param {string} a an ISO time
 * @param {string} b another ISO time
 * @returns {boolean} true when `a` is later
 */
function later(a, b) {
  return Date.parse(a) > Date.parse(b);
}

/**
 * Tell whether two records hold the same values in the known fields of their type.
 * @param {object} a a record
 * @param {object} b another record
 * @param {string} type the record type
 * @returns {boolean} true when equal
 */
function same(a, b, type) {
  return FIELDS[type].every((field) => JSON.stringify(a[field] ?? null) === JSON.stringify(b[field] ?? null));
}

/**
 * Plan an import: compute the writes and their counts from a store snapshot, without writing.
 * @param {{lists: object[], tasks: object[], memberships: object[], notes: object[]}} data the store snapshot
 * @param {object} backup a validated backup
 * @param {string} mode `merge` or `overwrite`
 * @param {{now: Date, ownerId?: number|string|null}} options the time for binning, and the connected user
 * @returns {{changes: object, result: object}} the writes, and the counts
 */
export function planImport(data, backup, mode, { now, ownerId = null }) {
  const time = now.toISOString();
  const overwrite = mode === 'overwrite';
  const result = emptyCounts();
  /**
   * Count one change.
   * @param {string} type the record type
   * @param {string} kind the kind of change
   */
  const count = (type, kind) => {
    result[kind] += 1;
    result[type][kind] += 1;
  };

  // Ownership (BAK-10): in local mode everything is owned.
  const user = idKey(ownerId);
  const ownsList = (list) => user === null || idKey(list.owner?.id) === null || idKey(list.owner.id) === user;
  const ownsTask = (task) => user === null || idKey(task['owner-id']) === null || idKey(task['owner-id']) === user;
  const foreignLists = new Set([...data.lists, ...backup.lists].filter((list) => !ownsList(list)).map((list) => list.id));
  const lockedTasks = new Set([...data.memberships, ...backup.memberships]
    .filter((m) => foreignLists.has(m['list-id'])).map((m) => m['task-id']));
  const editable = {
    lists: (list) => !foreignLists.has(list.id),
    tasks: (task) => !lockedTasks.has(task.id),
  };

  const final = {
    lists: new Map(data.lists.map((list) => [list.id, list])),
    tasks: new Map(data.tasks.map((task) => [task.id, task])),
  };
  const written = { lists: new Map(), tasks: new Map() };
  const binnedNow = new Set();
  /**
   * Record the new state of a list or task.
   * @param {string} type `lists` or `tasks`
   * @param {object} record the record to store
   */
  const write = (type, record) => {
    final[type].set(record.id, record);
    written[type].set(record.id, record);
  };

  for (const type of ['lists', 'tasks']) {
    const local = new Map(data[type].map((record) => [record.id, record]));
    for (const incoming of backup[type]) {
      const current = local.get(incoming.id);
      if (!editable[type](incoming)) {
        count(type, 'skipped');
        continue;
      }
      if (!current) {
        write(type, incoming);
        count(type, 'added');
        continue;
      }
      let record = null;
      if (overwrite) {
        record = same(current, incoming, type) ? null : incoming;
      }
      else if (later(incoming['last-update-time'], current['last-update-time'])) {
        record = incoming;
        if (type === 'tasks' && later(current['last-activity-time'], incoming['last-activity-time'])) {
          record = { ...incoming, 'last-activity-time': current['last-activity-time'] };
        }
      }
      if (!record) {
        count(type, 'skipped');
        continue;
      }
      write(type, record);
      count(type, !current['deletion-time'] && record['deletion-time'] ? 'binned' : 'updated');
    }
    if (overwrite) {
      const inBackup = new Set(backup[type].map((record) => record.id));
      const owns = type === 'lists' ? ownsList : ownsTask;
      for (const current of data[type]) {
        if (!inBackup.has(current.id) && !current['deletion-time'] && editable[type](current) && owns(current)) {
          const binned = { ...current, 'deletion-time': time, 'last-update-time': time };
          if (type === 'tasks') {
            binned['last-activity-time'] = time;
          }
          write(type, binned);
          binnedNow.add(current.id);
          count(type, 'binned');
        }
      }
    }
  }

  // Name clashes (LST-3): a list that this import bins yields its name to an imported list;
  // otherwise the imported list takes a free name with a numeric suffix.
  const fromBackup = new Set(backup.lists.map((list) => list.id));
  const ownerOf = (list) => idKey(list.owner?.id);
  const clash = (a, b) => a.id !== b.id && ownerOf(a) === ownerOf(b) && a.name.toLocaleLowerCase() === b.name.toLocaleLowerCase();
  /**
   * Store a list under the first free name, keeping its name when it is free.
   * @param {object} list the list
   */
  const rename = (list) => {
    let candidate = list;
    for (let n = 2; [...final.lists.values()].some((other) => clash(other, candidate)); n++) {
      const suffix = ` (${n})`;
      candidate = { ...list, name: `${list.name.slice(0, NAME_MAX - suffix.length)}${suffix}` };
    }
    if (candidate !== list) {
      write('lists', candidate);
    }
  };
  const imported = [...written.lists.keys()].filter((id) => fromBackup.has(id));
  for (const id of binnedNow) {
    const list = final.lists.get(id);
    if (list && imported.some((other) => clash(final.lists.get(other), list))) {
      rename(list);
    }
  }
  for (const id of imported) {
    rename(final.lists.get(id));
  }

  const changes = { put: { lists: [], tasks: [], memberships: [], notes: [] }, delete: { memberships: [], notes: [] } };
  const linkable = (listId, taskId) => final.lists.has(listId) && final.tasks.has(taskId)
    && !foreignLists.has(listId) && !lockedTasks.has(taskId);

  // Memberships: merge appends the missing ones (BAK-7); overwrite takes the backup set.
  const keyOf = (m) => `${m['list-id']}\n${m['task-id']}`;
  const localMembers = new Map(data.memberships.map((m) => [keyOf(m), m]));
  const lastPosition = new Map();
  for (const m of data.memberships) {
    const last = lastPosition.get(m['list-id']);
    if (last === undefined || m.position > last) {
      lastPosition.set(m['list-id'], m.position);
    }
  }
  const incomingMembers = [...backup.memberships]
    .sort((a, b) => compare(a['list-id'], b['list-id']) || compare(a.position, b.position));
  for (const incoming of incomingMembers) {
    const current = localMembers.get(keyOf(incoming));
    if (!linkable(incoming['list-id'], incoming['task-id']) || (current && (!overwrite || same(current, incoming, 'memberships')))) {
      count('memberships', 'skipped');
      continue;
    }
    let membership = incoming;
    if (!overwrite && lastPosition.has(incoming['list-id'])) {
      const position = keyBetween(lastPosition.get(incoming['list-id']), null);
      lastPosition.set(incoming['list-id'], position);
      membership = { ...incoming, position };
    }
    changes.put.memberships.push(membership);
    count('memberships', current ? 'updated' : 'added');
  }
  if (overwrite) {
    const backupTasks = new Set(backup.tasks.map((task) => task.id));
    const backupKeys = new Set(backup.memberships.map(keyOf));
    for (const m of data.memberships) {
      if (fromBackup.has(m['list-id']) && backupTasks.has(m['task-id']) && !backupKeys.has(keyOf(m))
        && linkable(m['list-id'], m['task-id'])) {
        changes.delete.memberships.push([m['list-id'], m['task-id']]);
        count('memberships', 'removed');
      }
    }
  }

  // Notes: merge keeps the later version (BAK-6); overwrite takes the backup set of each backup task.
  const noteTime = (note) => note['edit-time'] ?? note['creation-time'];
  const localNotes = new Map(data.notes.map((note) => [note.id, note]));
  for (const incoming of backup.notes) {
    const current = localNotes.get(incoming.id);
    const changed = current && (overwrite ? !same(current, incoming, 'notes') : later(noteTime(incoming), noteTime(current)));
    if (!final.tasks.has(incoming['task-id']) || lockedTasks.has(incoming['task-id']) || (current && !changed)) {
      count('notes', 'skipped');
      continue;
    }
    if (current && current['task-id'] !== incoming['task-id']) {
      changes.delete.notes.push([current['task-id'], current.id]);
    }
    changes.put.notes.push(incoming);
    count('notes', current ? 'updated' : 'added');
  }
  if (overwrite) {
    const backupTasks = new Set(backup.tasks.map((task) => task.id));
    const backupNotes = new Set(backup.notes.map((note) => note.id));
    for (const note of data.notes) {
      if (backupTasks.has(note['task-id']) && !backupNotes.has(note.id) && !lockedTasks.has(note['task-id'])) {
        changes.delete.notes.push([note['task-id'], note.id]);
        count('notes', 'removed');
      }
    }
  }

  changes.put.lists = [...written.lists.values()];
  changes.put.tasks = [...written.tasks.values()];
  return { changes, result };
}

/**
 * Check an import mode.
 * @param {unknown} mode the mode
 */
function checkMode(mode) {
  if (!MODES.includes(mode)) {
    throw new BackupError('invalid', `Unknown import mode: ${mode}; use merge or overwrite.`, 'mode');
  }
}

/**
 * Count the changes an import would make, without writing (`BAK-11`).
 * @param {object} store the store facade
 * @param {object} backup the backup, as `parseBackup` returns it
 * @param {string} mode `merge` or `overwrite`
 * @param {{ownerId?: number|string|null}} [options] the connected user, null in local mode
 * @returns {Promise<object>} counts of added, updated, binned, removed, and skipped records
 */
export async function previewImport(store, backup, mode, { ownerId = null } = {}) {
  checkMode(mode);
  const valid = validateBackup(backup);
  return planImport(await store.snapshot(), valid, mode, { now: new Date(), ownerId }).result;
}

/**
 * Import a backup in one transaction; an invalid backup changes nothing (`BAK-5` to `BAK-13`).
 * @param {object} store the store facade
 * @param {object} backup the backup, as `parseBackup` returns it
 * @param {string} mode `merge` or `overwrite`
 * @param {{ownerId?: number|string|null}} [options] the connected user, null in local mode
 * @returns {Promise<object>} counts of added, updated, binned, removed, and skipped records
 */
export async function importBackup(store, backup, mode, { ownerId = null } = {}) {
  checkMode(mode);
  const valid = validateBackup(backup);
  return store.applyChanges((data, now) => planImport(data, valid, mode, { now, ownerId }));
}
