/**
 * JSON backups: export, validation, import preview, and import in merge or overwrite mode (`BAK-1` to `BAK-14`).
 *
 * docs/specs/backup-format.md describes the file format and the import rules.
 * Imports plan their writes from a store snapshot with a pure function, so the preview
 * and the import count the same changes, and the store applies them in one transaction.
 * Format 2 holds tasks without their parts, and top-level `lifecycle-rules`, `occurrences`, and `events` arrays.
 * Import rebuilds the occurrences from the rules and events, so `occurrences` is export-only.
 * Format 1 holds the former task shape, with `status`, `due-time`, and `overdue-handling`, and notes with `author`.
 * Its import compares in that shape and maps written records into the store shape,
 * with each status change as events at the import time.
 */

import {
  applyEvent, applyRuleEdit, byEventOrder, eventsTowardsOccurrence, eventsTowardsStatus, fromLegacyTask, isPeriodEnd,
  isRecurring, makeEvent, normalizeRules, planRollOver, replayEvents, RULE_FIELDS, rulesShapeProblem, STATUSES, statusFromCount, statusOf, toLegacyTask,
} from './occurrences.js';
import { isValidTimezone } from './periods.js';
import { NAME_MAX, DESCRIPTION_MAX as LIST_DESCRIPTION_MAX } from '../store/lists.js';
import { TEXT_MAX } from '../store/notes.js';
import { OVERDUE_HANDLINGS, RECURRENCE_UNITS, DESCRIPTION_MAX as TASK_DESCRIPTION_MAX } from '../store/tasks.js';
import { isValidKey, keyBetween, MAX_KEY_LENGTH } from '../lib/fractional-index.js';
import { uuid7 } from '../lib/uuid7.js';
import { importEntries } from '../sync/queue.js';

export const FORMAT = 'todos-backup';
/** The format version that export writes. */
export const FORMAT_VERSION = 2;
/** The format versions that import reads. */
export const FORMAT_VERSIONS = [1, 2];
export const MODES = ['merge', 'overwrite'];

/** The fields of each record type of format 2, in file order. */
export const FIELDS = {
  lists: ['id', 'name', 'description', 'owner', 'creation-time', 'last-update-time', 'deletion-time'],
  tasks: ['id', 'description', 'owner-id', 'creation-time', 'last-update-time', 'deletion-time'],
  'lifecycle-rules': ['task-id', ...RULE_FIELDS],
  occurrences: ['task-id', 'occurrence', 'start-time', 'due-time', 'target-count', 'completion-count', 'status', 'close-time'],
  events: ['id', 'task-id', 'occurrence', 'creation-time', 'owner-id', 'type', 'details'],
  memberships: ['list-id', 'task-id', 'position', 'added-time'],
  notes: ['id', 'task-id', 'text', 'owner-id', 'occurrence', 'creation-time', 'last-update-time'],
};

/** The fields of each record type of format 1, in file order. */
export const FORMAT_1_FIELDS = {
  lists: FIELDS.lists,
  tasks: [
    'id', 'description', 'status', 'due-time', 'overdue-handling', 'owner-id',
    'creation-time', 'last-update-time', 'last-activity-time', 'deletion-time',
  ],
  memberships: FIELDS.memberships,
  notes: ['id', 'task-id', 'text', 'author', 'creation-time', 'edit-time'],
};

/** The record types that import counts. */
const TYPES = ['lists', 'tasks', 'memberships', 'notes'];
/** The task statuses of format 1, where `todo` stands for `ready`. */
export const FORMAT_STATUSES = ['todo', 'in-progress', 'completed', 'cancelled'];
/** The event types of format 2, as the service's `TaskEvent` schema lists them. */
export const EVENT_TYPES = [
  'create', 'complete', 'uncomplete', 'start', 'unstart', 'cancel', 'reopen',
  'edit-task', 'edit-lifecycle-rules', 'expire', 'roll-over', 'end-recurrence',
];
const ID_MAX = 128;
const COUNT_MAX = 32767;
const TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;
const LOCAL_DATE = /^\d{4}-\d{2}-\d{2}$/;

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
 * Copy the given fields of a record, in that order.
 * @param {object} record the record
 * @param {string[]} fields the field names
 * @returns {object} the copy
 */
function pick(record, fields) {
  return Object.fromEntries(fields.map((field) => [field, record[field] ?? null]));
}

/**
 * Return a task part without its `task-id`, as the task embeds it.
 * @param {object} part a rules or occurrence record
 * @returns {object} the part
 */
function embedded(part) {
  return Object.fromEntries(Object.entries(part).filter(([name]) => name !== 'task-id'));
}

/**
 * Return full rules with every rule field, in schema order.
 * @param {object} rules the rules
 * @returns {object} the rules
 */
function rulesOf(rules) {
  return pick(normalizeRules(rules), RULE_FIELDS);
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
 * Check a whole number in a range, or null when allowed.
 * @param {unknown} value the value
 * @param {string} path its path
 * @param {number} min the minimum
 * @param {number} max the maximum
 * @param {boolean} [nullable] whether null is allowed
 * @returns {number|null} the number
 */
function checkInteger(value, path, min, max, nullable = false) {
  if (value === null && nullable) {
    return null;
  }
  if (!Number.isInteger(value) || value < min || value > max) {
    fail(path, `must be a whole number from ${min} to ${max}${nullable ? ', or null' : ''}`);
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
 * Check an owner identifier: null, an integer, or a non-empty string.
 * @param {unknown} value the value, null when missing
 * @param {string} path its path
 * @returns {number|string|null} the identifier
 */
function checkOwnerId(value, path) {
  const id = value ?? null;
  if (id !== null && !Number.isInteger(id) && (typeof id !== 'string' || !id)) {
    fail(path, 'must be null, an integer, or a string');
  }
  return id;
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
 * Check one lifecycle rule value, as the store's rule checks do; every field but `target-count` may be null.
 * @param {string} field the rule field
 * @param {unknown} value the value
 * @param {string} path its path
 * @returns {unknown} the value, null when missing
 */
function checkRuleField(field, value, path) {
  if (field === 'target-count') {
    return checkInteger(value, path, 1, COUNT_MAX);
  }
  if (value === null || value === undefined) {
    return null;
  }
  switch (field) {
    case 'due-time':
      return checkTime(value, path);
    case 'overdue-handling':
      return checkEnum(value, path, OVERDUE_HANDLINGS);
    case 'recurrence-unit':
      return checkEnum(value, path, RECURRENCE_UNITS);
    case 'recurrence-interval':
      return checkInteger(value, path, 1, 99);
    case 'recurrence-end-count':
      return checkInteger(value, path, 1, COUNT_MAX);
    case 'recurrence-end-date':
      if (typeof value !== 'string' || !LOCAL_DATE.test(value) || Number.isNaN(Date.parse(`${value}T00:00:00Z`))
        || new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) !== value) {
        fail(path, 'must be a date such as 2026-12-31');
      }
      return value;
    default:
      if (!isValidTimezone(value)) {
        fail(path, 'must be an IANA zone name, such as Europe/Brussels');
      }
      return value;
  }
}

/**
 * Check the lifecycle rules of a format 2 task; a recurring rule needs its interval and timezone,
 * and keeps `due-time` and `overdue-handling` empty, as the store does.
 * @param {object} raw the rules record
 * @param {string} path its path
 * @param {(value: unknown, path: string) => string} checkTask checks the task reference
 * @returns {object} the rules, with `task-id` first
 */
function checkRules(raw, path, checkTask) {
  const rules = {
    'task-id': checkTask(raw['task-id'], `${path}.task-id`),
    ...Object.fromEntries(RULE_FIELDS.map((field) => [field, checkRuleField(field, field === 'target-count' ? raw[field] ?? 1 : raw[field], `${path}.${field}`)])),
  };
  const problem = rulesShapeProblem(embedded(rules));
  if (problem) {
    const recurring = isRecurring(rules);
    fail(`${path}.${problem}`, recurring && ['recurrence-interval', 'timezone'].includes(problem) ? 'is required for a recurring task'
      : `must be null for a ${recurring ? 'recurring' : 'one-off'} task`);
  }
  return { 'task-id': rules['task-id'], ...normalizeRules(embedded(rules)) };
}

/**
 * Check the `details` of a format 2 event: an `edit-lifecycle-rules` event lists the old and new value of each changed rule field,
 * and each value follows the rule checks.
 * @param {object} raw the event record
 * @param {string} path the path of the event
 * @returns {object|null} the details
 */
function checkDetails(raw, path) {
  const details = raw.details ?? null;
  if (raw.type !== 'edit-lifecycle-rules') {
    return details === null ? null : structuredClone(checkObject(details, `${path}.details`));
  }
  if (typeof details !== 'object' || details === null || Array.isArray(details) || Object.keys(details).length === 0) {
    fail(`${path}.details`, 'must list the old and new value of each changed rule field');
  }
  return Object.fromEntries(Object.entries(details).map(([field, change]) => {
    const at = `${path}.details.${field}`;
    if (!RULE_FIELDS.includes(field)) {
      fail(at, `must be a rule field, one of ${RULE_FIELDS.join(', ')}`);
    }
    if (typeof change !== 'object' || change === null || !('old' in change) || !('new' in change)) {
      fail(at, 'must hold the old and new value');
    }
    return [field, { old: checkRuleField(field, change.old, `${at}.old`), new: checkRuleField(field, change.new, `${at}.new`) }];
  }));
}

/**
 * Validate a backup object and return its normalized copy, without unknown fields.
 * A format 2 task without a `lifecycle-rules` record gets the default rules.
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
  if (!FORMAT_VERSIONS.includes(version)) {
    throw new BackupError('unsupported-version',
      `Unsupported backup format version ${version}; this app reads versions ${FORMAT_VERSIONS.join(' and ')}.`, 'format-version');
  }
  if (typeof data['app-version'] !== 'string' || !data['app-version']) {
    fail('app-version', 'must be a non-empty string');
  }
  const exportTime = checkTime(data['export-time'], 'export-time');
  const one = version === 1;

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

  const tasks = checkRecords(data, 'tasks', (raw, path) => ({
    id: checkId(raw.id, `${path}.id`),
    description: checkText(raw.description, `${path}.description`, 1, TASK_DESCRIPTION_MAX),
    ...(one ? {
      status: checkEnum(raw.status, `${path}.status`, FORMAT_STATUSES),
      'due-time': checkTime(raw['due-time'] ?? null, `${path}.due-time`, true),
      'overdue-handling': checkEnum(raw['overdue-handling'], `${path}.overdue-handling`, OVERDUE_HANDLINGS),
    } : {}),
    'owner-id': checkOwnerId(raw['owner-id'], `${path}.owner-id`),
    'creation-time': checkTime(raw['creation-time'], `${path}.creation-time`),
    'last-update-time': checkTime(raw['last-update-time'], `${path}.last-update-time`),
    ...(one ? { 'last-activity-time': checkTime(raw['last-activity-time'], `${path}.last-activity-time`) } : {}),
    'deletion-time': checkTime(raw['deletion-time'] ?? null, `${path}.deletion-time`, true),
  }), (task) => task.id, 'id');

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
  const checkTask = (value, path) => checkRef(value, path, taskIds);

  const parts = {};
  if (!one) {
    const rules = checkRecords(data, 'lifecycle-rules', (raw, path) => checkRules(raw, path, checkTask), (r) => r['task-id'], 'task-id');
    const ruled = new Set(rules.map((r) => r['task-id']));
    parts['lifecycle-rules'] = [...rules, ...tasks.filter((task) => !ruled.has(task.id)).map((task) => ({ 'task-id': task.id, ...rulesOf({}) }))];
    parts.occurrences = checkRecords(data, 'occurrences', (raw, path) => ({
      'task-id': checkTask(raw['task-id'], `${path}.task-id`),
      occurrence: checkInteger(raw.occurrence, `${path}.occurrence`, 1, Number.MAX_SAFE_INTEGER),
      'start-time': checkTime(raw['start-time'], `${path}.start-time`),
      'due-time': checkTime(raw['due-time'] ?? null, `${path}.due-time`, true),
      'target-count': checkInteger(raw['target-count'], `${path}.target-count`, 1, COUNT_MAX),
      'completion-count': checkInteger(raw['completion-count'], `${path}.completion-count`, 0, COUNT_MAX),
      status: checkEnum(raw.status, `${path}.status`, STATUSES),
      'close-time': checkTime(raw['close-time'] ?? null, `${path}.close-time`, true),
    }), (o) => `${o['task-id']}\n${o.occurrence}`, null);
    parts.events = checkRecords(data, 'events', (raw, path) => ({
      id: checkId(raw.id, `${path}.id`),
      'task-id': checkTask(raw['task-id'], `${path}.task-id`),
      occurrence: checkInteger(raw.occurrence ?? null, `${path}.occurrence`, 1, Number.MAX_SAFE_INTEGER, true),
      'creation-time': checkTime(raw['creation-time'], `${path}.creation-time`),
      'owner-id': checkOwnerId(raw['owner-id'], `${path}.owner-id`),
      type: checkEnum(raw.type, `${path}.type`, EVENT_TYPES),
      details: checkDetails(raw, path),
    }), (event) => event.id, 'id');
  }

  const memberships = checkRecords(data, 'memberships', (raw, path) => {
    if (!isValidKey(raw.position) || raw.position.length > MAX_KEY_LENGTH) {
      fail(`${path}.position`, `must be a fractional-index key of at most ${MAX_KEY_LENGTH} characters`);
    }
    return {
      'list-id': checkRef(raw['list-id'], `${path}.list-id`, listIds),
      'task-id': checkTask(raw['task-id'], `${path}.task-id`),
      position: raw.position,
      'added-time': checkTime(raw['added-time'], `${path}.added-time`),
    };
  }, (m) => `${m['list-id']}\n${m['task-id']}`, null);

  const notes = checkRecords(data, 'notes', (raw, path) => (one ? {
    id: checkId(raw.id, `${path}.id`),
    'task-id': checkTask(raw['task-id'], `${path}.task-id`),
    text: checkText(raw.text, `${path}.text`, 1, TEXT_MAX),
    author: checkPerson(raw.author, `${path}.author`),
    'creation-time': checkTime(raw['creation-time'], `${path}.creation-time`),
    'edit-time': checkTime(raw['edit-time'] ?? null, `${path}.edit-time`, true),
  } : {
    id: checkId(raw.id, `${path}.id`),
    'task-id': checkTask(raw['task-id'], `${path}.task-id`),
    text: checkText(raw.text, `${path}.text`, 1, TEXT_MAX),
    'owner-id': checkOwnerId(raw['owner-id'], `${path}.owner-id`),
    occurrence: checkInteger(raw.occurrence ?? null, `${path}.occurrence`, 1, Number.MAX_SAFE_INTEGER, true),
    'creation-time': checkTime(raw['creation-time'], `${path}.creation-time`),
    'last-update-time': checkTime(raw['last-update-time'], `${path}.last-update-time`),
  }), (note) => note.id, 'id');

  return {
    format: FORMAT,
    'format-version': version,
    'app-version': data['app-version'],
    'export-time': exportTime,
    lists,
    tasks,
    ...parts,
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
 * Convert a stored note to format 1: `owner-id` becomes `author`, and a last update after the creation the `edit-time`.
 * @param {object} note the stored note
 * @returns {object} the format 1 note
 */
function toFormatNote(note) {
  const owner = note['owner-id'] ?? null;
  const updated = note['last-update-time'] ?? note['creation-time'];
  return {
    id: note.id,
    'task-id': note['task-id'],
    text: note.text,
    author: owner === null ? null : { id: owner },
    'creation-time': note['creation-time'],
    'edit-time': updated === note['creation-time'] ? null : updated,
  };
}

/**
 * Convert a format 1 note to the store shape; it stays global, or keeps the occurrence of the stored note.
 * @param {object} note the format 1 note
 * @param {object|undefined} current the stored note with the same identifier
 * @returns {object} the store note
 */
function fromFormatNote(note, current) {
  return {
    id: note.id,
    'task-id': note['task-id'],
    text: note.text,
    'owner-id': note.author?.id ?? null,
    occurrence: current?.occurrence ?? null,
    'creation-time': note['creation-time'],
    'last-update-time': note['edit-time'] ?? note['creation-time'],
  };
}

/**
 * Fold the two times of a format 1 task into the store's single last update time, the later of both.
 * @param {object} task a format 1 task
 * @returns {object} the task with both times set to the later one
 */
function foldTimes(task) {
  const last = Date.parse(task['last-activity-time']) > Date.parse(task['last-update-time']) ? task['last-activity-time'] : task['last-update-time'];
  return { ...task, 'last-update-time': last, 'last-activity-time': last };
}

/**
 * Turn a written format 1 task into the store shape.
 * A known task keeps its occurrences and events: deadline changes edit its rules, and a status change posts events at `time`.
 * @param {object} record the format 1 task to store
 * @param {object|undefined} stored the stored task
 * @param {string} time the ISO import time
 * @returns {{task: object, events: object[]}} the store task and its new events
 */
function toStoreTask(record, stored, time) {
  if (!stored) {
    return fromLegacyTask(record, (at) => uuid7(() => Date.parse(at)));
  }
  let task = {
    ...stored,
    description: record.description,
    'owner-id': record['owner-id'],
    'creation-time': record['creation-time'],
    'last-update-time': record['last-update-time'],
    'deletion-time': record['deletion-time'],
  };
  const rules = task['lifecycle-rules'];
  // Format 1 knows no recurrence: a recurring task keeps its rules, which hold no deadline.
  const deadline = rules['recurrence-unit'] ? [] : ['due-time', 'overdue-handling'];
  const edit = Object.fromEntries(deadline.filter((name) => (rules[name] ?? null) !== (record[name] ?? null)).map((name) => [name, record[name]]));

  if (Object.keys(edit).length > 0) {
    task = { ...task, ...applyRuleEdit(task, edit, time) };
  }
  const wanted = record.status === 'todo' ? 'ready' : record.status;
  const events = [];
  let occurrence = task['current-occurrence'];
  for (const type of statusOf(task) === wanted ? [] : eventsTowardsStatus(occurrence, wanted, task['lifecycle-rules'])) {
    const event = makeEvent({ id: uuid7(() => Date.parse(time)), 'task-id': task.id, type, 'creation-time': time, occurrence: occurrence.occurrence });
    occurrence = applyEvent(occurrence, event, task['lifecycle-rules']);
    events.push(event);
  }
  return { task: { ...task, 'current-occurrence': occurrence }, events };
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
 * Export every list, task, membership, and note of the store, including recycle bin entries, in format 2.
 * Each task's rules, occurrences, and events go to the top-level `lifecycle-rules`, `occurrences`, and `events` arrays.
 * @param {object} store the store facade
 * @param {{now?: Date, appVersion: string}} options the export time and the app version
 * @returns {Promise<object>} the backup object; `JSON.stringify(backup, null, 2)` gives the file text
 */
export async function exportBackup(store, { now = new Date(), appVersion }) {
  if (typeof appVersion !== 'string' || !appVersion) {
    throw new TypeError('exportBackup needs the app version.');
  }
  const data = await store.snapshot();
  const tasks = [...data.tasks].sort((a, b) => compare(a.id, b.id));
  const known = new Set(tasks.map((task) => task.id));
  // The occurrences store holds every occurrence; the task's own copy of its current one wins.
  const occurrences = new Map();
  const keyOf = (taskId, number) => `${taskId}\n${number}`;
  for (const occurrence of data.occurrences ?? []) {
    if (known.has(occurrence['task-id'])) {
      occurrences.set(keyOf(occurrence['task-id'], occurrence.occurrence), occurrence);
    }
  }
  for (const task of tasks) {
    const current = task['current-occurrence'];
    occurrences.set(keyOf(task.id, current.occurrence), { 'task-id': task.id, ...current });
  }
  return {
    format: FORMAT,
    'format-version': FORMAT_VERSION,
    'app-version': appVersion,
    'export-time': now.toISOString(),
    lists: data.lists.map((list) => pick(list, FIELDS.lists)).sort((a, b) => compare(a.id, b.id)),
    tasks: tasks.map((task) => pick(task, FIELDS.tasks)),
    'lifecycle-rules': tasks.map((task) => ({ 'task-id': task.id, ...rulesOf(task['lifecycle-rules']) })),
    occurrences: [...occurrences.values()].map((occurrence) => pick(occurrence, FIELDS.occurrences))
      .sort((a, b) => compare(a['task-id'], b['task-id']) || a.occurrence - b.occurrence),
    events: (data.events ?? []).filter((event) => known.has(event['task-id'])).map((event) => pick(event, FIELDS.events))
      .sort((a, b) => compare(a['task-id'], b['task-id']) || byEventOrder(a, b)),
    memberships: data.memberships.map((m) => pick(m, FIELDS.memberships)).sort((a, b) => compare(a['list-id'], b['list-id'])
      || compare(a.position, b.position) || compare(a['task-id'], b['task-id'])),
    notes: data.notes.map((note) => pick(note, FIELDS.notes)).sort((a, b) => compare(a['task-id'], b['task-id'])
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
 * Tell whether two records hold the same values in the given fields.
 * @param {object} a a record
 * @param {object} b another record
 * @param {string[]} fields the field names
 * @returns {boolean} true when equal
 */
function same(a, b, fields) {
  return fields.every((field) => JSON.stringify(a[field] ?? null) === JSON.stringify(b[field] ?? null));
}

/**
 * Hash a text to a 53-bit number (cyrb53), for identifiers that need no secrecy.
 * @param {string} text the text
 * @param {number} seed the seed
 * @returns {number} the hash
 */
function hash53(text, seed) {
  let h1 = 0xdeadbeef ^ seed;
  let h2 = 0x41c6ce57 ^ seed;
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    h1 = Math.imul(h1 ^ code, 2654435761);
    h2 = Math.imul(h2 ^ code, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return 4294967296 * (2097151 & h2) + (h1 >>> 0);
}

/**
 * Return the identifier of an event that an import writes anew: a UUIDv7 with the event time,
 * and the other bits from its task, type, occurrence, time, and sequence number.
 * The same import therefore writes the same identifiers again, so importing a file twice changes nothing.
 * @param {{'task-id': string, type: string, occurrence: number|null, 'creation-time': string, seq?: number}} event the event fields
 * @returns {string} the UUIDv7
 */
function newEventId(event) {
  const key = JSON.stringify([event['task-id'], event.type, event.occurrence ?? null, event['creation-time'], event.seq ?? 0]);
  const time = Date.parse(event['creation-time']).toString(16).padStart(12, '0').slice(-12);
  const bits = hash53(key, 1).toString(16).padStart(14, '0') + hash53(key, 2).toString(16).padStart(14, '0');
  const variant = (8 + (parseInt(bits[3], 16) & 3)).toString(16);
  return `${time.slice(0, 8)}-${time.slice(8)}-7${bits.slice(0, 3)}-${variant}${bits.slice(4, 7)}-${bits.slice(7, 19)}`;
}

/**
 * How each format compares records with the store, and turns written notes into the store shape.
 * Imports compare in the shape of the file, so unchanged records count as unchanged; only what gets written is converted.
 */
const SHAPES = {
  1: {
    fields: FORMAT_1_FIELDS,
    storeTask: toLegacyTask,
    storeNote: toFormatNote,
    backupTasks: (file) => file.tasks.map(foldTimes),
    noteTime: (note) => note['edit-time'] ?? note['creation-time'],
    writtenNote: fromFormatNote,
  },
  2: {
    fields: { ...FIELDS, tasks: [...FIELDS.tasks, 'lifecycle-rules'] },
    storeTask: (task) => ({ ...pick(task, FIELDS.tasks), 'lifecycle-rules': rulesOf(task['lifecycle-rules']) }),
    storeNote: (note) => pick(note, FIELDS.notes),
    backupTasks: (file) => {
      const rules = new Map(file['lifecycle-rules'].map((record) => [record['task-id'], embedded(record)]));
      return file.tasks.map((task) => ({ ...task, 'lifecycle-rules': rules.get(task.id) }));
    },
    noteTime: (note) => note['last-update-time'],
    writtenNote: (note) => note,
  },
};

/**
 * Group records by their `task-id`.
 * @param {object[]} records the records
 * @returns {Map<string, object[]>} the records of each task
 */
function byTask(records) {
  const groups = new Map();
  for (const record of records) {
    groups.set(record['task-id'], [...(groups.get(record['task-id']) ?? []), record]);
  }
  return groups;
}

/**
 * Return the events a format 2 backup lacks for the count and status of a task's exported current occurrence,
 * such as the events another device made, which a connected device does not keep.
 * A recurring task first rolls over up to that occurrence; the events take the import time,
 * or the last moment of a recurring occurrence's period when that came earlier.
 * @param {object} record the backup task, with its `lifecycle-rules`
 * @param {object[]} events the backup events of the task
 * @param {object[]} occurrences the backup occurrences of the task
 * @param {string} time the ISO import time
 * @returns {object[]} the missing events, empty when the backup events explain its current occurrence
 */
function missingEvents(record, events, occurrences, time) {
  const wanted = occurrences.reduce((last, occurrence) => (!last || occurrence.occurrence > last.occurrence ? occurrence : last), null);
  if (!wanted) {
    return [];
  }
  const replay = replayEvents(record, record['lifecycle-rules'], events, newEventId, { settleAt: record['last-update-time'] });
  const { rules } = replay;
  let current = replay.current;
  const missing = [];
  /**
   * Add a missing event.
   * @param {string} type the event type
   * @param {string} at the ISO event time
   */
  const add = (type, at) => {
    const base = { 'task-id': record.id, type, 'creation-time': at, occurrence: current.occurrence };
    const event = makeEvent({ ...base, id: newEventId({ ...base, seq: missing.length }) });
    current = applyEvent(current, event, rules) ?? current;
    missing.push(event);
  };
  if (isRecurring(rules) && current['close-time'] === null && wanted.occurrence > current.occurrence) {
    const plan = planRollOver(rules, current, wanted['start-time']);
    if (plan.current.occurrence === wanted.occurrence) {
      for (const event of plan.events) {
        const base = { 'task-id': record.id, type: event.type, 'creation-time': event['creation-time'], occurrence: event.occurrence };
        missing.push(makeEvent({ ...base, id: newEventId(base) }));
      }
      current = plan.current;
    }
  }
  if (current.occurrence !== wanted.occurrence) {
    return [];
  }
  const recurring = isRecurring(rules);
  const end = recurring && current['due-time'] ? Date.parse(current['due-time']) - 1 : Infinity;
  const at = new Date(Math.min(Date.parse(time), end)).toISOString();
  // A closed recurring occurrence gets its count inside its period; the end of the series, or a user cancel, then closes it.
  const closesSeries = recurring && wanted['close-time'] !== null && current['close-time'] === null;
  const goal = closesSeries ? { ...wanted, status: statusFromCount(wanted['completion-count'], current['target-count']), 'close-time': null } : wanted;
  for (const type of eventsTowardsOccurrence(current, goal, rules)) {
    add(type, at);
  }
  if (closesSeries) {
    const plan = planRollOver(rules, current, wanted['close-time']);
    const [event] = plan.events;
    if (plan.events.length === 1 && event.type === 'end-recurrence' && plan.current.status === wanted.status) {
      const base = { 'task-id': record.id, type: event.type, 'creation-time': event['creation-time'], occurrence: event.occurrence };
      missing.push(makeEvent({ ...base, id: newEventId(base) }));
    }
    else if (wanted.status === 'cancelled') {
      add('cancel', new Date(Math.min(Date.parse(at), Date.parse(wanted['close-time']))).toISOString());
    }
  }
  return missing;
}

/**
 * Turn a written format 2 task into the store shape, with its occurrences rebuilt from its rules and events.
 * Merge keeps the local events and adds the backup ones by identifier; overwrite takes exactly the backup events.
 * @param {object} record the backup task, with its `lifecycle-rules`
 * @param {object|undefined} stored the stored task
 * @param {object} context the import: `overwrite`, `time`, and the backup and store events and occurrences by task
 * @returns {{task: object, occurrences: object[], put: object[], remove: object[], dropOccurrences: number[]}} the store task,
 *   its other occurrences, the events to store and to remove, and the numbers of stored occurrences to remove
 */
function rebuildTask(record, stored, { overwrite, time, fileEvents, fileOccurrences, storeEvents, storeOccurrences }) {
  const own = fileEvents.get(record.id) ?? [];
  const backupEvents = [...own, ...missingEvents(record, own, fileOccurrences.get(record.id) ?? [], time)];
  const local = stored ? storeEvents.get(record.id) ?? [] : [];
  const localIds = new Set(local.map((event) => event.id));
  // A local period end already closes its occurrence, so the backup's one for the same occurrence stays out.
  const ended = new Set(local.filter((event) => isPeriodEnd(event.type)).map((event) => event.occurrence));
  const events = overwrite ? backupEvents
    : [...local, ...backupEvents.filter((event) => !localIds.has(event.id) && !(isPeriodEnd(event.type) && ended.has(event.occurrence)))];
  const replay = replayEvents(record, record['lifecycle-rules'], events, newEventId, { settleAt: record['last-update-time'] });
  const task = {
    ...stored,
    id: record.id,
    description: record.description,
    'owner-id': record['owner-id'],
    'lifecycle-rules': replay.rules,
    'current-occurrence': replay.current,
    'creation-time': record['creation-time'],
    'last-update-time': record['last-update-time'],
    'deletion-time': record['deletion-time'],
  };
  const final = [...replay.events, ...replay.added];
  const finalIds = new Set(final.map((event) => event.id));
  const numbers = new Set(replay.occurrences.map((occurrence) => occurrence.occurrence));
  return {
    task,
    occurrences: replay.occurrences.filter((occurrence) => occurrence.occurrence !== replay.current.occurrence)
      .map((occurrence) => ({ 'task-id': record.id, ...occurrence })),
    put: overwrite ? final : final.filter((event) => !localIds.has(event.id)),
    remove: overwrite ? local.filter((event) => !finalIds.has(event.id)) : [],
    dropOccurrences: (storeOccurrences.get(record.id) ?? []).map((occurrence) => occurrence.occurrence).filter((number) => !numbers.has(number)),
  };
}

/**
 * Tell whether rebuilding a format 2 task in overwrite mode leaves its stored events and occurrences as they are.
 * @param {object} record the backup task, with its `lifecycle-rules`
 * @param {object} stored the stored task
 * @param {object} context the import, as for `rebuildTask`
 * @returns {boolean} true when the events, the occurrences, and the current occurrence all match
 */
function rebuildMatches(record, stored, context) {
  const rebuilt = rebuildTask(record, stored, context);
  const text = (records, names) => records.map((item) => JSON.stringify(pick(item, names))).sort().join('\n');
  const local = { events: context.storeEvents.get(record.id) ?? [], occurrences: context.storeOccurrences.get(record.id) ?? [] };
  const current = { 'task-id': record.id, ...rebuilt.task['current-occurrence'] };
  return rebuilt.remove.length === 0 && rebuilt.dropOccurrences.length === 0
    && text(rebuilt.put, FIELDS.events) === text(local.events, FIELDS.events)
    && text([...rebuilt.occurrences, current], FIELDS.occurrences) === text(local.occurrences, FIELDS.occurrences)
    && JSON.stringify(pick(rebuilt.task['current-occurrence'], FIELDS.occurrences.slice(1)))
      === JSON.stringify(pick(stored['current-occurrence'], FIELDS.occurrences.slice(1)));
}

/**
 * Plan an import: compute the writes and their counts from a store snapshot, without writing.
 * @param {{lists: object[], tasks: object[], memberships: object[], notes: object[], occurrences?: object[], events?: object[]}} store
 *   the store snapshot
 * @param {object} file a validated backup of format 1 or 2
 * @param {string} mode `merge` or `overwrite`
 * @param {{now: Date, ownerId?: number|string|null, connected?: boolean}} options the time for binning, the connected user,
 *   and whether the device is connected, which adds the queue entries to `changes.queue` and keeps existing notes
 * @returns {{changes: object, result: object}} the writes, and the counts
 */
export function planImport(store, file, mode, { now, ownerId = null, connected = false }) {
  checkMode(mode, connected);
  const time = now.toISOString();
  const version = file['format-version'];
  const shape = SHAPES[version];
  const fields = shape.fields;
  const data = { ...store, tasks: store.tasks.map(shape.storeTask), notes: store.notes.map(shape.storeNote) };
  const backup = { ...file, tasks: shape.backupTasks(file) };
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
  const context = {
    overwrite,
    time,
    fileEvents: byTask(file.events ?? []),
    fileOccurrences: byTask(file.occurrences ?? []),
    storeEvents: byTask(store.events ?? []),
    storeOccurrences: byTask(store.occurrences ?? []),
  };
  const storedTasks = new Map(store.tasks.map((task) => [task.id, task]));
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
        const unchanged = same(current, incoming, fields[type])
          && (version === 1 || type === 'lists' || rebuildMatches(incoming, storedTasks.get(incoming.id), context));
        record = unchanged ? null : incoming;
      }
      else if (later(incoming['last-update-time'], current['last-update-time'])) {
        record = incoming;
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
          write(type, { ...current, 'deletion-time': time, 'last-update-time': time, ...(type === 'tasks' ? { 'last-activity-time': time } : {}) });
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

  const changes = {
    put: { lists: [], tasks: [], occurrences: [], memberships: [], notes: [], events: [] },
    delete: { memberships: [], notes: [], events: [], occurrences: [] },
  };
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
    if (!linkable(incoming['list-id'], incoming['task-id']) || (current && (!overwrite || same(current, incoming, fields.memberships)))) {
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
  const { noteTime } = shape;
  const localNotes = new Map(data.notes.map((note) => [note.id, note]));
  for (const incoming of backup.notes) {
    const current = localNotes.get(incoming.id);
    // Connected, an import only creates missing notes: the service takes no edit time for a note text.
    const changed = current && !connected && (overwrite ? !same(current, incoming, fields.notes) : later(noteTime(incoming), noteTime(current)));
    if (!final.tasks.has(incoming['task-id']) || lockedTasks.has(incoming['task-id']) || (current && !changed)) {
      count('notes', 'skipped');
      continue;
    }
    if (current && current['task-id'] !== incoming['task-id']) {
      changes.delete.notes.push([current['task-id'], current.id]);
    }
    changes.put.notes.push(shape.writtenNote(incoming, store.notes.find((note) => note.id === incoming.id)));
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
  for (const record of written.tasks.values()) {
    const stored = storedTasks.get(record.id);
    if (version === 1) {
      const { task, events } = toStoreTask(record, stored, time);
      changes.put.tasks.push(task);
      changes.put.events.push(...events);
    }
    else if (binnedNow.has(record.id)) {
      changes.put.tasks.push({ ...stored, 'deletion-time': time, 'last-update-time': time });
    }
    else {
      const rebuilt = rebuildTask(record, stored, context);
      changes.put.tasks.push(rebuilt.task);
      changes.put.occurrences.push(...rebuilt.occurrences);
      changes.put.events.push(...rebuilt.put);
      changes.delete.events.push(...rebuilt.remove.map((event) => [record.id, event.id]));
      changes.delete.occurrences.push(...rebuilt.dropOccurrences.map((number) => [record.id, number]));
    }
  }
  // Format 2 replays each new task through the service routes, with `import: true` (todos.server JSON format).
  changes.replay = version === 2;
  if (connected) {
    changes.queue = importEntries(store, changes, now);
  }

  return { changes, result };
}

/**
 * Check an import mode. While connected only merge works, since an import never removes data from the account.
 * @param {unknown} mode the mode
 * @param {boolean} [connected] whether the device is connected
 */
function checkMode(mode, connected = false) {
  if (!MODES.includes(mode)) {
    throw new BackupError('invalid', `Unknown import mode: ${mode}; use merge or overwrite.`, 'mode');
  }
  if (connected && mode === 'overwrite') {
    throw new BackupError('invalid', 'Overwrite is not available while connected; an import never removes data from your account.', 'mode');
  }
}

/**
 * Count the changes an import would make, without writing (`BAK-11`).
 * @param {object} store the store facade
 * @param {object} backup the backup, as `parseBackup` returns it
 * @param {string} mode `merge` or `overwrite`
 * @param {{ownerId?: number|string|null, connected?: boolean}} [options] the connected user, null in local mode,
 *   and whether the device is connected
 * @returns {Promise<object>} counts of added, updated, binned, removed, and skipped records
 */
export async function previewImport(store, backup, mode, { ownerId = null, connected = false } = {}) {
  checkMode(mode, connected);
  const valid = validateBackup(backup);
  return planImport(await store.snapshot(), valid, mode, { now: new Date(), ownerId, connected }).result;
}

/**
 * Import a backup in one transaction; an invalid backup changes nothing (`BAK-5` to `BAK-13`).
 * @param {object} store the store facade
 * @param {object} backup the backup, as `parseBackup` returns it
 * @param {string} mode `merge` or `overwrite`
 * @param {{ownerId?: number|string|null, connected?: boolean}} [options] the connected user, null in local mode;
 *   `connected` queues the changes for upload in the same transaction (`BAK-6`), and only merge works
 * @returns {Promise<object>} counts of added, updated, binned, removed, and skipped records
 */
export async function importBackup(store, backup, mode, { ownerId = null, connected = false } = {}) {
  checkMode(mode, connected);
  const valid = validateBackup(backup);
  return store.applyChanges((data, now) => planImport(data, valid, mode, { now, ownerId, connected }), connected ? { queue: true } : undefined);
}
