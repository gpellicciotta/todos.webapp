import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  BackupError, backupFileName, exportBackup, importBackup, parseBackup, previewImport,
} from '../../src/js/core/backup.js';
import { editedRules, mirrorOccurrence, mirrorRules, rulesShapeProblem, toLegacyTask } from '../../src/js/core/occurrences.js';
import { freshStore } from './store-helpers.js';

const FIXTURE_TEXT = readFileSync(new URL('../fixtures/backup-v1.json', import.meta.url), 'utf8');
const FIXTURE_2_TEXT = readFileSync(new URL('../fixtures/backup-v2.json', import.meta.url), 'utf8');
const L1 = '0192f1a2-0000-7000-8000-000000000001';
const L2 = '0192f1a2-0000-7000-8000-000000000002';
const T101 = '0192f1a2-0000-7000-8000-000000000101';
const T102 = '0192f1a2-0000-7000-8000-000000000102';
const T103 = '0192f1a2-0000-7000-8000-000000000103';
const N201 = '0192f1a2-0000-7000-8000-000000000201';
const N202 = '0192f1a2-0000-7000-8000-000000000202';

let store;
let clock;

/**
 * Return a fresh copy of the fixture backup.
 * @returns {object} the parsed fixture
 */
function fixture() {
  return JSON.parse(FIXTURE_TEXT);
}

/**
 * Return a fresh copy of the format 2 fixture backup.
 * @returns {object} the parsed fixture
 */
function fixture2() {
  return JSON.parse(FIXTURE_2_TEXT);
}

/**
 * Return the identifier of a format 2 fixture event by its last digits.
 * @param {number} n the number, such as 301
 * @returns {string} the identifier
 */
function eventId(n) {
  return `0192f1a2-0000-7000-8000-000000000${n}`;
}

/**
 * Return a format 3 export as a format 2 file: the former rule fields, and no occurrences, which import rebuilds.
 * @param {object} file the format 3 file
 * @returns {object} the format 2 file
 */
function asFormat2(file) {
  return {
    ...file,
    'format-version': 2,
    occurrences: [],
    'lifecycle-rules': file['lifecycle-rules'].map((rules) => ({
      'task-id': rules['task-id'], 'target-count': rules['goal-target'], 'due-time': rules['due-time'],
      'overdue-handling': rules['overdue-handling'] === 'fail' ? 'cancel' : rules['overdue-handling'],
      'recurrence-unit': rules['recurrence-unit'], 'recurrence-interval': rules['recurrence-interval'],
      'recurrence-end-date': rules['recurrence-end-date'], 'recurrence-end-count': rules['recurrence-end-count'], timezone: rules.timezone,
    })),
  };
}

/**
 * Set the store clock to an ISO time.
 * @param {string} iso the time
 */
function at(iso) {
  clock.now = Date.parse(iso);
}

/**
 * Run a function that must throw and return its error.
 * @param {() => unknown} fn the function
 * @returns {Error} the thrown error
 */
function thrown(fn) {
  try {
    fn();
  }
  catch (error) {
    return error;
  }
  throw new Error('The function did not throw');
}

/**
 * Return zero counts with some fields set.
 * @param {object} [fields] counts that are not zero
 * @returns {object} the counts
 */
function counts(fields = {}) {
  return { added: 0, updated: 0, binned: 0, removed: 0, skipped: 0, ...fields };
}

beforeEach(async () => {
  ({ store, clock } = await freshStore());
});

afterEach(() => {
  store.close();
});

describe('exportBackup', () => {
  it('holds the version fields, lists, tasks, memberships with positions, notes, and bin entries', async () => {
    const home = await store.createList({ name: 'Home' });
    const old = await store.createList({ name: 'Old' });
    clock.tick();
    const door = await store.createTask({ description: 'Fix door' }, { lists: [home.id, old.id] });
    const lamp = await store.createTask({ description: 'Fix lamp' }, { lists: [home.id] });
    await store.moveInList(lamp.id, home.id, { before: door.id });
    const note = await store.addNote(door.id, { text: 'Hinge is loose' });
    await store.deleteList(old.id);
    await store.deleteTask(lamp.id);

    const backup = await exportBackup(store, { now: new Date('2026-11-04T12:00:00.000Z'), appVersion: '0.1.0-pre' });

    expect(backup).toMatchObject({
      format: 'todos-backup',
      'format-version': 3,
      'app-version': '0.1.0-pre',
      'export-time': '2026-11-04T12:00:00.000Z',
    });
    expect(backup.lists).toEqual([await store.getList(home.id), await store.getList(old.id)]
      .sort((a, b) => (a.id < b.id ? -1 : 1)));
    expect(backup.lists.find((list) => list.id === old.id)['deletion-time']).toBe('2026-11-04T09:00:01.000Z');
    expect(backup.tasks.map((task) => task.id)).toEqual([door.id, lamp.id].sort());
    expect(backup.tasks.find((task) => task.id === lamp.id)['deletion-time']).toBe('2026-11-04T09:00:01.000Z');
    expect(backup.memberships).toEqual(await store.listMemberships());
    expect(backup.memberships).toHaveLength(3);
    const homeOrder = backup.memberships.filter((m) => m['list-id'] === home.id).map((m) => m['task-id']);
    expect(homeOrder).toEqual([lamp.id, door.id]);
    expect(backup.memberships.every((m) => typeof m.position === 'string')).toBe(true);
    expect(backup.notes).toEqual([note]);
  });

  it('writes tasks without their parts, and the rules, occurrences, and events as top-level arrays', async () => {
    clock.tick();
    const task = await store.createTask({ description: 'Paint', 'due-time': '2026-11-08T18:00:00Z', 'overdue-handling': 'cancel' });
    clock.tick();
    await store.updateRules(task.id, { 'target-count': 3 });
    clock.tick();
    await store.postEvent(task.id, 'complete');
    const note = await store.addNote(task.id, { text: 'Blue', 'owner-id': 7 });
    const backup = await exportBackup(store, { now: new Date('2026-11-04T12:00:00.000Z'), appVersion: '0.1.0-pre' });

    expect(backup.tasks).toEqual([{
      id: task.id, description: 'Paint', 'owner-id': null,
      'creation-time': '2026-11-04T09:00:01.000Z', 'last-update-time': '2026-11-04T09:00:03.000Z', 'deletion-time': null,
    }]);
    expect(backup['lifecycle-rules']).toEqual([{
      'task-id': task.id, 'start-time': null, 'due-time': '2026-11-08T18:00:00.000Z', 'overdue-handling': 'fail',
      'goal-direction': 'at-least', 'goal-measure': 'checks', 'goal-target': 3, 'goal-unit': null,
      'recurrence-unit': null, 'recurrence-interval': null, 'recurrence-end-date': null, 'recurrence-end-count': null, timezone: null,
    }]);
    expect(backup.occurrences).toEqual([{
      'task-id': task.id, occurrence: 1, 'start-time': '2026-11-04T09:00:01.000Z', 'due-time': '2026-11-08T18:00:00.000Z',
      status: 'in-progress', 'close-time': null, 'goal-direction': 'at-least', 'goal-measure': 'checks', 'goal-target': 3,
      progress: 1, 'time-spent-seconds': 0,
    }]);
    expect(backup.events.map((event) => [event.type, event['creation-time'], event.details])).toEqual([
      ['create', '2026-11-04T09:00:01.000Z', null],
      ['edit-lifecycle-rules', '2026-11-04T09:00:02.000Z', { 'goal-target': { old: 1, new: 3 } }],
      ['log', '2026-11-04T09:00:03.000Z', null],
    ]);
    const base = ['id', 'task-id', 'occurrence', 'creation-time', 'owner-id', 'type', 'details'];
    expect(backup.events.map((event) => Object.keys(event))).toEqual([base, base, [...base, 'checked']]);
    // The rule edit lists `goal-target` in the file, and `target-count` in the store.
    const withoutDetails = (event) => Object.fromEntries(Object.entries(event).filter(([name]) => name !== 'details'));
    expect(backup.events.map(withoutDetails)).toEqual((await store.eventsOfTask(task.id)).map(withoutDetails));
    expect(backup.notes).toEqual([{
      id: note.id, 'task-id': task.id, text: 'Blue', 'owner-id': 7, occurrence: null,
      'creation-time': '2026-11-04T09:00:03.000Z', 'last-update-time': '2026-11-04T09:00:03.000Z',
    }]);
  });

  it('exports the past occurrences and roll-over events of a recurring task', async () => {
    const weekly = { 'recurrence-unit': 'week', 'recurrence-interval': 1, timezone: 'UTC' };
    const task = await store.createTask({ description: 'Exercises', 'lifecycle-rules': weekly });
    await store.postEvent(task.id, 'complete');
    clock.tick(7 * 86_400_000);
    await store.rollOverTask(task.id);
    const backup = await exportBackup(store, { now: new Date('2026-11-11T12:00:00.000Z'), appVersion: '0.1.0-pre' });

    expect(backup['lifecycle-rules']).toEqual([expect.objectContaining({ ...weekly, 'due-time': null, 'overdue-handling': null })]);
    expect(backup.occurrences.map((o) => [o.occurrence, o['start-time'], o['due-time'], o.status, o['close-time']])).toEqual([
      [1, '2026-11-02T00:00:00.000Z', '2026-11-09T00:00:00.000Z', 'completed', '2026-11-09T00:00:00.000Z'],
      [2, '2026-11-09T00:00:00.000Z', '2026-11-16T00:00:00.000Z', 'ready', null],
    ]);
    expect(backup.events.map((event) => [event.type, event.occurrence])).toEqual([['create', 1], ['log', 1], ['roll-over', 1]]);
  });

  it('exports an empty store as empty arrays', async () => {
    const backup = await exportBackup(store, { now: new Date('2026-11-04T12:00:00.000Z'), appVersion: '1.0.0' });
    expect(backup).toEqual({
      format: 'todos-backup', 'format-version': 3, 'app-version': '1.0.0', 'export-time': '2026-11-04T12:00:00.000Z',
      lists: [], tasks: [], 'lifecycle-rules': [], occurrences: [], events: [], memberships: [], notes: [],
    });
  });

  it('names the file after the local export date', () => {
    expect(backupFileName(new Date(2026, 10, 4, 23, 30))).toBe('todos-backup-2026-11-04.json');
  });
});

describe('format 1 import', () => {
  it('maps a recurring task of a format 1 file onto the task, keeping its recurring rules', async () => {
    const weekly = { 'recurrence-unit': 'week', 'recurrence-interval': 1, timezone: 'Europe/Brussels' };
    const task = await store.createTask({ description: 'Exercises', 'lifecycle-rules': weekly });
    const legacy = toLegacyTask(task);
    expect(legacy).toMatchObject({ status: 'todo', 'due-time': null, 'overdue-handling': 'keep' });
    const backup = {
      format: 'todos-backup', 'format-version': 1, 'app-version': '0.1.0-pre', 'export-time': '2026-11-05T00:00:00.000Z',
      lists: [], memberships: [], notes: [],
      tasks: [{ ...legacy, description: 'Exercises, renamed', 'last-update-time': '2026-11-05T00:00:00.000Z', 'last-activity-time': '2026-11-05T00:00:00.000Z' }],
    };
    clock.tick(86_400_000);
    await importBackup(store, backup, 'merge', { connected: true });
    const imported = await store.getTask(task.id);
    expect(imported.description).toBe('Exercises, renamed');
    expect(imported['lifecycle-rules']).toEqual(task['lifecycle-rules']);
    const rules = (await store.queue.all()).find((entry) => entry.operation === 'update-rules');
    expect(rules.fields).toMatchObject({ ...weekly, 'due-time': null, 'overdue-handling': null });
  });
});

describe('parseBackup', () => {
  it('reads a version 1 file', () => {
    expect(parseBackup(FIXTURE_TEXT)).toEqual(fixture());
  });

  it('reads a version 2 file', () => {
    expect(parseBackup(FIXTURE_2_TEXT)).toEqual(fixture2());
  });

  it('reads a version 2 file without an occurrences array, as import rebuilds the occurrences', () => {
    const data = fixture2();
    delete data.occurrences;
    expect(parseBackup(JSON.stringify(data)).occurrences).toEqual([]);
  });

  it('gives a version 2 task without rules the default rules', () => {
    const data = fixture2();
    data['lifecycle-rules'] = data['lifecycle-rules'].filter((rules) => rules['task-id'] !== T103);
    const parsed = parseBackup(JSON.stringify(data));
    expect(parsed['lifecycle-rules'].find((rules) => rules['task-id'] === T103)).toEqual({
      'task-id': T103, 'target-count': 1, 'due-time': null, 'overdue-handling': 'keep',
      'recurrence-unit': null, 'recurrence-interval': null, 'recurrence-end-date': null, 'recurrence-end-count': null, timezone: null,
    });
  });

  it('keeps list descriptions exactly, and trims names, task descriptions, and note texts like the store', () => {
    const data = fixture();
    data.lists[0].name = '  Groceries ';
    data.tasks[1].description = '  Bread\n';
    data.notes[0].text = '\nThe unsweetened one ';
    const parsed = parseBackup(JSON.stringify(data));
    expect(parsed.lists.map((list) => list.description)).toEqual(['Weekly shopping\n  - fruit first\n', '  Archive  ']);
    expect(parsed.lists[0].name).toBe('Groceries');
    expect(parsed.tasks[1].description).toBe('Bread');
    expect(parsed.notes[0].text).toBe('The unsweetened one');
  });

  it('ignores unknown fields', () => {
    const data = fixture();
    data.extra = true;
    data.lists[0].role = 'owner';
    const parsed = parseBackup(JSON.stringify(data));
    expect(parsed).not.toHaveProperty('extra');
    expect(parsed.lists[0]).not.toHaveProperty('role');
  });

  /**
   * Parse a modified fixture and return the error.
   * @param {(data: object) => void} change the modification
   * @returns {BackupError} the error
   */
  function failure(change) {
    const data = fixture();
    change(data);
    return thrown(() => parseBackup(JSON.stringify(data)));
  }

  it('rejects text that is not JSON', () => {
    const error = thrown(() => parseBackup('{ not json'));
    expect(error).toBeInstanceOf(BackupError);
    expect(error.code).toBe('invalid-json');
  });

  it('rejects a file of another format', () => {
    expect(thrown(() => parseBackup('[]'))).toMatchObject({ code: 'invalid' });
    expect(failure((d) => {
      d.format = 'other';
    })).toMatchObject({ code: 'invalid', path: 'format' });
  });

  it('rejects an unknown format version', () => {
    const error = failure((d) => {
      d['format-version'] = 4;
    });
    expect(error).toBeInstanceOf(BackupError);
    expect(error).toMatchObject({ code: 'unsupported-version', path: 'format-version' });
    expect(error.message).toMatch(/version 4; this app reads versions 1, 2, and 3/);
  });

  it('rejects a version 1 file with format 2 tasks, and a version 2 file with format 1 tasks', () => {
    const one = fixture2();
    one['format-version'] = 1;
    expect(thrown(() => parseBackup(JSON.stringify(one)))).toMatchObject({ code: 'invalid', path: 'tasks[0].status' });
    const two = fixture();
    two['format-version'] = 2;
    expect(thrown(() => parseBackup(JSON.stringify(two)))).toMatchObject({ code: 'invalid', path: 'lifecycle-rules' });
  });

  it.each([
    ['rules of an unknown task', (d) => (d['lifecycle-rules'][0]['task-id'] = 'nope'), 'lifecycle-rules[0].task-id'],
    ['two rules of one task', (d) => (d['lifecycle-rules'][1]['task-id'] = T101), 'lifecycle-rules[1].task-id'],
    ['a target count of 0', (d) => (d['lifecycle-rules'][0]['target-count'] = 0), 'lifecycle-rules[0].target-count'],
    ['an unknown recurrence unit', (d) => (d['lifecycle-rules'][0]['recurrence-unit'] = 'year'), 'lifecycle-rules[0].recurrence-unit'],
    ['a recurring rule without timezone', (d) => Object.assign(d['lifecycle-rules'][0], {
      'recurrence-unit': 'week', 'recurrence-interval': 1, 'due-time': null, 'overdue-handling': null,
    }), 'lifecycle-rules[0].timezone'],
    ['an unknown timezone', (d) => (d['lifecycle-rules'][0].timezone = 'Mars/Olympus'), 'lifecycle-rules[0].timezone'],
    ['an occurrence of an unknown task', (d) => (d.occurrences[0]['task-id'] = 'nope'), 'occurrences[0].task-id'],
    ['an occurrence number of 0', (d) => (d.occurrences[0].occurrence = 0), 'occurrences[0].occurrence'],
    ['a repeated occurrence', (d) => d.occurrences.push({ ...d.occurrences[0] }), 'occurrences[3]'],
    ['an unknown occurrence status', (d) => (d.occurrences[1].status = 'todo'), 'occurrences[1].status'],
    ['an event of an unknown task', (d) => (d.events[0]['task-id'] = 'nope'), 'events[0].task-id'],
    ['a repeated event id', (d) => (d.events[1].id = d.events[0].id), 'events[1].id'],
    ['an unknown event type', (d) => (d.events[3].type = 'done'), 'events[3].type'],
    ['an invalid event time', (d) => (d.events[3]['creation-time'] = 'later'), 'events[3].creation-time'],
    ['a rule edit without details', (d) => (d.events[2].details = null), 'events[2].details'],
    ['a rule edit of an unknown field', (d) => (d.events[2].details.color = { old: 'red', new: 'blue' }), 'events[2].details.color'],
    ['a note occurrence of 0', (d) => (d.notes[1].occurrence = 0), 'notes[1].occurrence'],
    ['a missing note update time', (d) => delete d.notes[0]['last-update-time'], 'notes[0].last-update-time'],
    ['a rule edit to a target count of 0', (d) => (d.events[2].details['target-count'].new = 0), 'events[2].details.target-count.new'],
    ['a rule edit from an unknown overdue handling', (d) => (d.events[2].details['overdue-handling'].old = 'drop'), 'events[2].details.overdue-handling.old'],
    ['a rule edit to an unknown recurrence unit', (d) => (d.events[2].details['recurrence-unit'] = { old: null, new: 'year' }), 'events[2].details.recurrence-unit.new'],
    ['a rule edit to an interval of 100', (d) => (d.events[2].details['recurrence-interval'] = { old: null, new: 100 }), 'events[2].details.recurrence-interval.new'],
    ['a rule edit to an unknown timezone', (d) => (d.events[2].details.timezone = { old: null, new: 'Mars/Olympus' }), 'events[2].details.timezone.new'],
    ['a rule edit to a due time that is no UTC time', (d) => (d.events[2].details['due-time'] = { old: null, new: 'tomorrow' }), 'events[2].details.due-time.new'],
    ['a rule edit to an impossible end date', (d) => (d.events[2].details['recurrence-end-date'] = { old: null, new: '2026-02-30' }), 'events[2].details.recurrence-end-date.new'],
    ['a one-off rule with a timezone', (d) => (d['lifecycle-rules'][0].timezone = 'UTC'), 'lifecycle-rules[0].timezone'],
    ['a one-off rule with an interval', (d) => (d['lifecycle-rules'][1]['recurrence-interval'] = 2), 'lifecycle-rules[1].recurrence-interval'],
    ['a one-off rule with an end count', (d) => (d['lifecycle-rules'][2]['recurrence-end-count'] = 3), 'lifecycle-rules[2].recurrence-end-count'],
    ['a recurring rule with a due time', (d) => Object.assign(d['lifecycle-rules'][0], {
      'recurrence-unit': 'week', 'recurrence-interval': 1, timezone: 'UTC',
    }), 'lifecycle-rules[0].due-time'],
    ['a recurring rule with overdue handling', (d) => Object.assign(d['lifecycle-rules'][2], {
      'recurrence-unit': 'day', 'recurrence-interval': 1, timezone: 'UTC',
    }), 'lifecycle-rules[2].overdue-handling'],
  ])('rejects a version 2 file with %s', (_, change, path) => {
    const data = fixture2();
    change(data);
    expect(thrown(() => parseBackup(JSON.stringify(data)))).toMatchObject({ code: 'invalid', path });
  });

  it.each([
    ['a missing app version', (d) => delete d['app-version'], 'app-version'],
    ['an invalid export time', (d) => (d['export-time'] = 'yesterday'), 'export-time'],
    ['a missing tasks array', (d) => delete d.tasks, 'tasks'],
    ['an empty list name', (d) => (d.lists[0].name = ' '), 'lists[0].name'],
    ['a duplicate list name', (d) => (d.lists[1].name = 'GROCERIES'), 'lists[1].name'],
    ['a duplicate list id', (d) => (d.lists[1].id = L1), 'lists[1].id'],
    ['an unknown task status', (d) => (d.tasks[0].status = 'done'), 'tasks[0].status'],
    ['a task description over 500 characters', (d) => (d.tasks[1].description = 'x'.repeat(501)), 'tasks[1].description'],
    ['an invalid deletion time', (d) => (d.tasks[2]['deletion-time'] = 42), 'tasks[2].deletion-time'],
    ['a membership of an unknown task', (d) => (d.memberships[0]['task-id'] = 'nope'), 'memberships[0].task-id'],
    ['an invalid position', (d) => (d.memberships[1].position = 'a-0'), 'memberships[1].position'],
    ['a position with a digit head', (d) => (d.memberships[1].position = '0zz'), 'memberships[1].position'],
    ['a position ending with a zero fraction digit', (d) => (d.memberships[1].position = 'a00'), 'memberships[1].position'],
    ['a position shorter than its integer part', (d) => (d.memberships[1].position = 'a'), 'memberships[1].position'],
    ['a position over 128 characters', (d) => (d.memberships[1].position = `a0${'V'.repeat(127)}`), 'memberships[1].position'],
    ['an impossible date', (d) => (d.lists[0]['creation-time'] = '2026-02-30T00:00:00Z'), 'lists[0].creation-time'],
    ['an impossible hour', (d) => (d.tasks[0]['last-update-time'] = '2026-11-04T24:00:00.000Z'), 'tasks[0].last-update-time'],
    ['a duplicate membership', (d) => d.memberships.push({ ...d.memberships[0] }), 'memberships[3]'],
    ['a note over 2000 characters', (d) => (d.notes[0].text = 'x'.repeat(2001)), 'notes[0].text'],
    ['a note of an unknown task', (d) => (d.notes[1]['task-id'] = 'nope'), 'notes[1].task-id'],
  ])('rejects %s', (_, change, path) => {
    expect(failure(change)).toMatchObject({ code: 'invalid', path });
  });
});

describe('format 1 merge import', () => {
  let local;

  beforeEach(async () => {
    at('2026-11-01T12:00:00.000Z');
    await store.createList({ id: L1, name: 'Groceries' });
    await store.createList({ name: 'Home' });
    at('2026-11-02T09:00:00.000Z');
    await store.createTask({ id: T101, description: 'Oat milk' }, { lists: [L1] });
    await store.addNote(T101, { id: N201, text: 'Older local note' });
    at('2026-11-04T09:00:00.000Z');
    await store.updateTask(T101, { description: 'Oat milk, newer' });
    local = await store.createTask({ description: 'Local task' }, { lists: [L1] });
  });

  it('adds missing items, keeps the newer version, and appends missing memberships', async () => {
    const result = await importBackup(store, fixture(), 'merge');

    expect(result).toMatchObject(counts({ added: 6, updated: 2, skipped: 2 }));
    expect(result.lists).toEqual(counts({ added: 1, updated: 1 }));
    expect(result.tasks).toEqual(counts({ added: 2, skipped: 1 }));
    expect(result.memberships).toEqual(counts({ added: 2, skipped: 1 }));
    expect(result.notes).toEqual(counts({ added: 1, updated: 1 }));

    expect(await store.getList(L1)).toMatchObject({ name: 'Groceries', description: 'Weekly shopping\n  - fruit first\n' });
    expect((await store.listLists()).map((list) => list.name)).toEqual(['Groceries', 'Home']);
    expect((await store.getList(L2))['deletion-time']).toBe('2026-11-03T08:00:00.000Z');
    expect((await store.getTask(T101)).description).toBe('Oat milk, newer');
    expect((await store.getTask(T103))['deletion-time']).toBe('2026-11-03T07:00:00.000Z');
    expect((await store.tasksOfList(L1)).map((task) => task.id)).toEqual([T101, local.id, T102]);
    const kept = (await store.listMemberships()).filter((m) => m['list-id'] === L1).map((m) => m.position);
    expect(kept.slice(0, 2)).toEqual(['a0', 'a1']);
    const old = (await store.listMemberships()).find((m) => m['list-id'] === L2);
    expect(old).toMatchObject({ 'task-id': T103, position: 'a0' });
    expect((await store.notesOfTask(T101)).map((note) => note.text)).toEqual(['The unsweetened one']);
    expect((await store.notesOfTask(T103)).map((note) => note.id)).toEqual([N202]);
  });

  it('maps a newer format 1 task onto the new shape, its status onto events', async () => {
    const data = fixture();
    data.tasks[0]['last-update-time'] = '2026-11-05T00:00:00.000Z';
    data.tasks[0]['last-activity-time'] = '2026-11-06T00:00:00.000Z';
    data.tasks[0].status = 'completed';
    at('2026-11-07T10:00:00.000Z');
    await importBackup(store, data, 'merge');
    const task = await store.getTask(T101);
    expect(task).toMatchObject({
      description: 'Almond milk\n\nunsweetened',
      'lifecycle-rules': { 'due-time': '2026-11-05T22:59:00.000Z', 'overdue-handling': 'keep' },
      'current-occurrence': { status: 'completed', 'completion-count': 1, 'due-time': '2026-11-05T22:59:00.000Z' },
      'last-update-time': '2026-11-06T00:00:00.000Z',
    });
    expect(Object.keys(task)).not.toContain('status');
    expect((await store.eventsOfTask(T101)).map((event) => [event.type, event['creation-time']])).toEqual([
      ['create', '2026-11-02T09:00:00.000Z'], ['log', '2026-11-07T10:00:00.000Z'],
    ]);
    expect((await store.eventsOfTask(T102)).map((event) => event.type)).toEqual(['create', 'log']);
  });

  it('renames an added list whose name a kept list already uses', async () => {
    const data = fixture();
    data.lists[1].name = 'Home';
    await importBackup(store, data, 'merge');
    expect((await store.getList(L2)).name).toBe('Home (2)');
  });

  it('previews the same counts without writing', async () => {
    const before = await store.snapshot();
    const preview = await previewImport(store, fixture(), 'merge');
    expect(await store.snapshot()).toEqual(before);
    expect(preview).toEqual(await importBackup(store, fixture(), 'merge'));
  });

  it('changes nothing when imported twice', async () => {
    await importBackup(store, fixture(), 'merge');
    const after = await store.snapshot();
    const again = await importBackup(store, fixture(), 'merge');
    expect(again).toMatchObject(counts({ skipped: 10 }));
    expect(await store.snapshot()).toEqual(after);
  });
});

describe('format 1 overwrite import', () => {
  let home;
  let local;
  let gone;
  let localNote;

  beforeEach(async () => {
    await store.createList({ id: L1, name: 'Groceries' });
    home = await store.createList({ name: 'Home' });
    await store.createTask({ id: T101, description: 'Oat milk' }, { lists: [L1] });
    localNote = await store.addNote(T101, { text: 'Not in the backup' });
    local = await store.createTask({ description: 'Local task' }, { lists: [L1] });
    gone = await store.createTask({ description: 'Already binned' });
    await store.deleteTask(gone.id);
    gone = await store.getTask(gone.id);
    clock.tick();
  });

  it('replaces own data and moves missing own items to the recycle bin', async () => {
    const result = await importBackup(store, fixture(), 'overwrite');

    expect(result.lists).toEqual(counts({ added: 1, updated: 1, binned: 1 }));
    expect(result.tasks).toEqual(counts({ added: 2, updated: 1, binned: 1 }));
    expect(result.memberships).toEqual(counts({ added: 2, updated: 1 }));
    expect(result.notes).toEqual(counts({ added: 2, removed: 1 }));
    expect(result).toMatchObject(counts({ added: 7, updated: 3, binned: 2, removed: 1 }));

    const data = fixture();
    expect(await store.getList(L1)).toEqual(data.lists[0]);
    expect(await store.getList(L2)).toEqual(data.lists[1]);
    for (const task of data.tasks) {
      const last = task['last-activity-time'] > task['last-update-time'] ? task['last-activity-time'] : task['last-update-time'];
      expect(toLegacyTask(await store.getTask(task.id))).toEqual({ ...task, 'last-update-time': last, 'last-activity-time': last });
    }
    expect(await store.getList(home.id)).toMatchObject({ 'deletion-time': '2026-11-04T09:00:01.000Z' });
    expect(await store.getTask(local.id)).toMatchObject({
      'deletion-time': '2026-11-04T09:00:01.000Z',
      'last-update-time': '2026-11-04T09:00:01.000Z',
    });
    expect(await store.getTask(gone.id)).toEqual(gone);
    expect((await store.listLists()).map((list) => list.id)).toEqual([L1]);
    expect((await store.tasksOfList(L1)).map((task) => task.id)).toEqual([T102, T101]);

    const memberships = await store.listMemberships();
    expect(memberships.filter((m) => m['task-id'] !== local.id)).toEqual(data.memberships);
    expect(memberships.find((m) => m['task-id'] === local.id)).toMatchObject({ 'list-id': L1 });
    expect((await store.notesOfTask(T101)).map((note) => [note.id, note.text, note['owner-id']])).toEqual([[data.notes[0].id, data.notes[0].text, null]]);
    expect((await store.notesOfTask(T101)).map((note) => note.id)).not.toContain(localNote.id);

    await store.restoreTask(local.id);
    expect((await store.tasksOfList(L1)).map((task) => task.id)).toContain(local.id);
  });

  it('previews the same counts without writing', async () => {
    const before = await store.snapshot();
    const preview = await previewImport(store, fixture(), 'overwrite');
    expect(await store.snapshot()).toEqual(before);
    expect(preview).toEqual(await importBackup(store, fixture(), 'overwrite'));
  });

  it('lets an imported list keep a name that a local list binned by the same import used', async () => {
    const data = fixture();
    data.lists[0].name = 'Home';
    await importBackup(store, data, 'overwrite');
    expect((await store.getList(L1)).name).toBe('Home');
    expect(await store.getList(home.id)).toMatchObject({ name: 'Home (2)', 'deletion-time': '2026-11-04T09:00:01.000Z' });
    await expect(store.restoreList(home.id)).resolves.toMatchObject({ name: 'Home (2)' });
  });

  it('renames an imported list whose name a list already in the bin keeps', async () => {
    const attic = await store.createList({ name: 'Attic' });
    await store.deleteList(attic.id);
    const data = fixture();
    data.lists[1].name = 'attic';
    await importBackup(store, data, 'overwrite');
    expect((await store.getList(L2)).name).toBe('attic (2)');
    expect((await store.getList(attic.id)).name).toBe('Attic');
  });

  it('matches the connected user by identifier, whether a number or a string', async () => {
    const mine = await store.createTask({ description: 'Mine', 'owner-id': 12 });
    const theirs = await store.createTask({ description: 'Theirs', 'owner-id': 13 });
    await importBackup(store, fixture(), 'overwrite', { ownerId: '12' });
    expect((await store.getTask(mine.id))['deletion-time']).toBe('2026-11-04T09:00:01.000Z');
    expect((await store.getTask(theirs.id))['deletion-time']).toBeNull();
  });

  it('never changes lists owned by other users, nor tasks in them, when connected', async () => {
    const foreign = await store.createList({ name: 'Shared', owner: { id: 99, name: 'Ada' } });
    const shared = await store.createTask({ description: 'Shared task', 'owner-id': 99 }, { lists: [foreign.id] });
    const mine = await store.createTask({ description: 'My task', 'owner-id': 12 }, { lists: [foreign.id, home.id] });
    const before = { list: await store.getList(foreign.id), shared: await store.getTask(shared.id), mine: await store.getTask(mine.id) };
    const data = fixture();
    data.lists.push({ ...before.list, name: 'Renamed', 'last-update-time': '2027-01-01T00:00:00.000Z' });
    data.tasks.push({ ...toLegacyTask(before.mine), description: 'Changed', 'last-update-time': '2027-01-01T00:00:00.000Z' });

    const result = await importBackup(store, data, 'overwrite', { ownerId: 12 });

    expect(await store.getList(foreign.id)).toEqual(before.list);
    expect(await store.getTask(shared.id)).toEqual(before.shared);
    expect(await store.getTask(mine.id)).toEqual(before.mine);
    expect(result.lists.skipped).toBe(1);
    expect(result.tasks.skipped).toBe(1);
    expect((await store.getList(home.id))['deletion-time']).not.toBeNull();
  });
});

describe('invalid imports', () => {
  it.each(['merge', 'overwrite'])('change nothing in %s mode and report the reason', async (mode) => {
    await store.createTask({ description: 'Keep me' }, { lists: [(await store.createList({ name: 'Home' })).id] });
    const before = await store.snapshot();
    const data = fixture();
    data['format-version'] = 7;
    await expect(importBackup(store, data, mode)).rejects.toMatchObject({ code: 'unsupported-version' });
    await expect(previewImport(store, { ...fixture(), tasks: [{ id: 'x' }] }, mode))
      .rejects.toMatchObject({ code: 'invalid', path: 'tasks[0].description' });
    expect(await store.snapshot()).toEqual(before);
  });

  it('rejects an unknown mode', async () => {
    await expect(importBackup(store, fixture(), 'replace')).rejects.toMatchObject({ code: 'invalid', path: 'mode' });
  });
});

describe('round trip', () => {
  it('reproduces the same data, rules, occurrences, and events when an export is imported into an empty store in overwrite mode', async () => {
    const home = await store.createList({ name: 'Home', description: '  House chores\n- kitchen\n' });
    const work = await store.createList({ name: 'Work' });
    const old = await store.createList({ name: 'Old' });
    clock.tick();
    const door = await store.createTask({ description: ' Fix door\n  and frame ', 'due-time': '2026-11-08' }, { lists: [home.id, work.id] });
    const lamp = await store.createTask({ description: 'Fix lamp', 'overdue-handling': 'fail' }, { lists: [home.id, old.id] });
    const solo = await store.createTask({ description: 'No list' });
    const weekly = { 'recurrence-unit': 'week', 'recurrence-interval': 1, timezone: 'Europe/Brussels' };
    const water = await store.createTask({ description: 'Water plants', 'lifecycle-rules': weekly }, { lists: [home.id] });
    clock.tick();
    await store.moveInList(lamp.id, home.id, { before: door.id });
    await store.updateTask(door.id, { status: 'in-progress' });
    await store.updateRules(lamp.id, { 'target-count': 3 });
    await store.postEvent(lamp.id, 'complete');
    await store.postEvent(water.id, 'start');
    await store.postEvent(solo.id, 'cancel');
    const note = await store.addNote(door.id, { text: 'Hinge' });
    clock.tick();
    await store.editNote(note.id, 'Hinge is loose\n\n  top one ');
    await store.addNote(lamp.id, { text: 'Bulb', 'owner-id': 3 });
    // Monday 9 November, 10:00 UTC: the first week of Water plants ended at 23:00 UTC the day before.
    clock.tick(5 * 86_400_000 + 3_600_000);
    await store.postEvent(lamp.id, 'complete');
    await store.postEvent(water.id, 'complete', { occurrence: 1 });
    await store.updateRules(water.id, { 'target-count': 2 });
    await store.postEvent(water.id, 'complete');
    await store.deleteList(old.id);
    await store.deleteTask(solo.id);

    const options = { now: new Date('2026-11-09T12:00:00.000Z'), appVersion: '0.1.0-pre' };
    const text = JSON.stringify(await exportBackup(store, options), null, 2);
    const backup = JSON.parse(text);
    expect(backup.occurrences.filter((o) => o['task-id'] === water.id).map((o) => [o.status, o.progress, o['goal-target']]))
      .toEqual([['completed', 1, 1], ['in-progress', 1, 2]]);
    expect((await store.getTask(door.id)).description).toBe('Fix door\n  and frame');

    const { store: target } = await freshStore();
    try {
      const result = await importBackup(target, parseBackup(text), 'overwrite');
      expect(result).toMatchObject(counts({ added: 3 + 4 + 5 + 2 }));
      expect(await target.snapshot()).toEqual(await store.snapshot());
      expect(JSON.stringify(await exportBackup(target, options), null, 2)).toBe(text);
    }
    finally {
      target.close();
    }
  });

  it('reproduces a format 1 export of the same data in overwrite mode', async () => {
    const backup = fixture();
    const result = await importBackup(store, backup, 'overwrite');
    expect(result).toMatchObject(counts({ added: 2 + 3 + 3 + 2 }));
    for (const task of backup.tasks) {
      const last = task['last-activity-time'] > task['last-update-time'] ? task['last-activity-time'] : task['last-update-time'];
      expect(toLegacyTask(await store.getTask(task.id))).toEqual({ ...task, 'last-update-time': last, 'last-activity-time': last });
    }
  });
});

/**
 * Drop the `task-id` of a task part, as the task embeds it.
 * @param {object} part a rules or occurrence record
 * @returns {object} the part without `task-id`
 */
function embedded(part) {
  return Object.fromEntries(Object.entries(part).filter(([name]) => name !== 'task-id'));
}

/**
 * Return format 2 rules as the import stores them: `fail` takes the place of `cancel`.
 * @param {object} rules the format 2 rules, with or without `task-id`
 * @returns {object} the store rules
 */
function failing(rules) {
  return mirrorRules({ ...embedded(rules), 'overdue-handling': rules['overdue-handling'] === 'cancel' ? 'fail' : rules['overdue-handling'] });
}

/**
 * Return a format 2 event as the import stores it: a `complete` is a checked `log`.
 * @param {object} event the format 2 event
 * @returns {object} the stored event
 */
function logged(event) {
  if (event.type === 'edit-lifecycle-rules') {
    const fail = (value) => (value === 'cancel' ? 'fail' : value);
    const details = Object.fromEntries(Object.entries(event.details).map(([field, change]) => [field,
      field === 'overdue-handling' ? { old: fail(change.old), new: fail(change.new) } : change]));
    return { ...event, details };
  }
  return event.type === 'complete' ? { ...event, type: 'log', checked: true } : event;
}

/**
 * Return the format 2 fixture with T103 made a weekly task in UTC, created on Tuesday 20 October, whose backup holds only
 * its create event and its exported current occurrence.
 * @param {object} occurrence the exported current occurrence fields over occurrence 2, the week of 26 October
 * @param {object} [rules] more rule fields
 * @returns {object} the backup
 */
function weeklyGap(occurrence, rules = {}) {
  const data = fixture2();
  Object.assign(data['lifecycle-rules'][2], {
    'recurrence-unit': 'week', 'recurrence-interval': 1, timezone: 'UTC', 'due-time': null, 'overdue-handling': null, ...rules,
  });
  data.tasks[2]['creation-time'] = '2026-10-20T09:00:00.000Z';
  data.events = data.events.filter((event) => event['task-id'] !== T103 || event.type === 'create');
  data.events.find((event) => event['task-id'] === T103)['creation-time'] = '2026-10-20T09:00:00.000Z';
  data.occurrences[2] = {
    'task-id': T103, occurrence: 2, 'start-time': '2026-10-26T00:00:00.000Z', 'due-time': '2026-11-02T00:00:00.000Z',
    'target-count': 1, 'completion-count': 0, status: 'ready', 'close-time': null, ...occurrence,
  };
  return data;
}

describe('format 2 merge import', () => {
  beforeEach(async () => {
    at('2026-11-01T12:00:00.000Z');
    await store.createList({ id: L1, name: 'Groceries' });
    await store.createList({ name: 'Home' });
    at('2026-11-02T09:00:00.000Z');
    await store.createTask({ id: T101, description: 'Oat milk' }, { lists: [L1] });
    await store.addNote(T101, { id: N201, text: 'Older local note' });
    at('2026-11-04T09:00:00.000Z');
    await store.updateTask(T101, { description: 'Oat milk, newer' });
  });

  it('adds missing tasks with their rules and events, and rebuilds their occurrences', async () => {
    const result = await importBackup(store, fixture2(), 'merge');

    expect(result.lists).toEqual(counts({ added: 1, updated: 1 }));
    expect(result.tasks).toEqual(counts({ added: 2, skipped: 1 }));
    expect(result.memberships).toEqual(counts({ added: 2, skipped: 1 }));
    expect(result.notes).toEqual(counts({ added: 1, updated: 1 }));
    const data = fixture2();
    expect(await store.getTask(T102)).toEqual({
      ...data.tasks[1], 'lifecycle-rules': failing(data['lifecycle-rules'][1]),
      'current-occurrence': { ...mirrorOccurrence(embedded(data.occurrences[1])), entries: [logged(data.events.find((event) => event.id === eventId(304))), logged(data.events.find((event) => event.id === eventId(305)))] },
    });
    expect(await store.eventsOfTask(T102)).toEqual(data.events.filter((event) => event['task-id'] === T102).map(logged));
    expect(await store.occurrencesOfTask(T102)).toEqual([mirrorOccurrence(data.occurrences[1])]);
    expect((await store.getTask(T103))['current-occurrence']).toEqual(mirrorOccurrence(embedded(data.occurrences[2])));
    expect((await store.getTask(T101)).description).toBe('Oat milk, newer');
    expect((await store.eventsOfTask(T101)).map((event) => event.id)).not.toContain(eventId(301));
    expect(await store.notesOfTask(T101)).toEqual([data.notes[0]]);
    expect(await store.notesOfTask(T103)).toEqual([data.notes[1]]);
  });

  it('drops the imported occurrences, and rebuilds them from the rules and events', async () => {
    const data = fixture2();
    data.occurrences[2]['start-time'] = '2026-10-01T00:00:00.000Z';
    data.occurrences.push({ ...data.occurrences[2], occurrence: 2, 'completion-count': 1, status: 'completed', 'close-time': '2026-11-03T07:00:00.000Z' });
    await importBackup(store, data, 'merge');
    expect(await store.occurrencesOfTask(T103)).toEqual([mirrorOccurrence({
      'task-id': T103, occurrence: 1, 'start-time': '2026-11-01T09:02:00.000Z', 'due-time': null,
      'target-count': 1, 'completion-count': 0, status: 'in-progress', 'close-time': null,
    })]);
    expect((await store.getTask(T103))['current-occurrence']).toMatchObject({ occurrence: 1, status: 'in-progress' });
  });

  it('adds imported events by identifier, keeps the local ones, and never duplicates them', async () => {
    await store.postEvent(T101, 'complete');
    const local = await store.eventsOfTask(T101);
    const data = fixture2();
    data.tasks[0]['last-update-time'] = '2026-11-05T00:00:00.000Z';
    data.events.push({ id: eventId(308), 'task-id': T101, occurrence: 1, 'creation-time': '2026-11-04T08:00:00.000Z', 'owner-id': null, type: 'start', details: null });
    data.occurrences[0].status = 'in-progress';
    at('2026-11-06T10:00:00.000Z');

    const first = await importBackup(store, data, 'merge');

    expect(first.tasks).toEqual(counts({ added: 2, updated: 1 }));
    expect((await store.eventsOfTask(T101)).map((event) => event.id).sort()).toEqual([...local.map((event) => event.id), eventId(301), eventId(308)].sort());
    expect((await store.getTask(T101))['current-occurrence']).toMatchObject({
      'due-time': '2026-11-05T22:59:00.000Z', status: 'completed', 'completion-count': 1, 'close-time': '2026-11-04T09:00:00.000Z',
    });
    const after = await store.snapshot();
    expect((await importBackup(store, data, 'merge')).tasks).toEqual(counts({ skipped: 3 }));
    expect(await store.snapshot()).toEqual(after);
  });

  it('adds the events that the backup lacks for the status of its exported occurrence, at the import time', async () => {
    const data = fixture2();
    data.events = data.events.filter((event) => ![eventId(303), eventId(305)].includes(event.id));
    at('2026-11-06T10:00:00.000Z');
    await importBackup(store, data, 'merge');
    expect((await store.getTask(T102))['current-occurrence']).toMatchObject({ 'target-count': 3, 'completion-count': 2, status: 'in-progress' });
    expect((await store.eventsOfTask(T102)).map((event) => [event.type, event['creation-time']])).toEqual([
      ['create', '2026-11-01T09:01:00.000Z'], ['log', '2026-11-02T08:00:00.000Z'], ['log', '2026-11-06T10:00:00.000Z'],
    ]);
  });

  it('rolls a recurring task over to its exported occurrence when the backup lacks the roll-over events', async () => {
    const data = fixture2();
    const weekly = { 'recurrence-unit': 'week', 'recurrence-interval': 1, timezone: 'UTC', 'due-time': null, 'overdue-handling': null };
    Object.assign(data['lifecycle-rules'][2], weekly);
    data.tasks[2]['creation-time'] = '2026-10-27T09:00:00.000Z';
    data.events = data.events.filter((event) => event['task-id'] !== T103 || event.type === 'create');
    data.events.find((event) => event['task-id'] === T103)['creation-time'] = '2026-10-27T09:00:00.000Z';
    data.occurrences[2] = {
      'task-id': T103, occurrence: 2, 'start-time': '2026-11-02T00:00:00.000Z', 'due-time': '2026-11-09T00:00:00.000Z',
      'target-count': 1, 'completion-count': 1, status: 'completed', 'close-time': null,
    };
    at('2026-11-06T10:00:00.000Z');
    await importBackup(store, data, 'merge');
    expect(await store.occurrencesOfTask(T103)).toEqual([
      mirrorOccurrence({
        'task-id': T103, occurrence: 1, 'start-time': '2026-10-26T00:00:00.000Z', 'due-time': '2026-11-02T00:00:00.000Z',
        'target-count': 1, 'completion-count': 0, status: 'ready', 'close-time': '2026-11-02T00:00:00.000Z',
      }),
      mirrorOccurrence(data.occurrences[2]),
    ]);
    expect((await store.eventsOfTask(T103)).map((event) => [event.type, event.occurrence, event['creation-time']])).toEqual([
      ['create', 1, '2026-10-27T09:00:00.000Z'], ['roll-over', 1, '2026-11-02T00:00:00.000Z'], ['log', 2, '2026-11-06T10:00:00.000Z'],
    ]);
  });

  it('reaches the exported rules when the rule edits miss a later change, with an edit event at the last update', async () => {
    const data = fixture2();
    Object.assign(data['lifecycle-rules'][1], { 'target-count': 5, 'due-time': '2026-11-20T10:00:00.000Z' });
    Object.assign(data.occurrences[1], { 'target-count': 5, 'due-time': '2026-11-20T10:00:00.000Z' });
    at('2026-11-06T10:00:00.000Z');
    await importBackup(store, data, 'merge');
    const bread = await store.getTask(T102);
    expect(bread['lifecycle-rules']).toEqual(failing(data['lifecycle-rules'][1]));
    expect(bread['current-occurrence']).toMatchObject(mirrorOccurrence(embedded(data.occurrences[1])));
    const events = await store.eventsOfTask(T102);
    expect(events.slice(0, -1)).toEqual(data.events.filter((event) => event['task-id'] === T102).map(logged));
    expect(events.at(-1)).toMatchObject({
      type: 'edit-lifecycle-rules', 'creation-time': '2026-11-02T09:00:00.000Z', occurrence: 1,
      details: { 'target-count': { old: 3, new: 5 } },
    });
    // No event names the due time, so the task has the exported one from its first rules on.
    expect(events.filter((event) => event.type === 'edit-lifecycle-rules').every((event) => !('due-time' in event.details))).toBe(true);
  });

  it('gives the settling rule edit a time after the last logged rule edit, since the service merges rules by edit time', async () => {
    const data = fixture2();
    data.tasks[1]['last-update-time'] = '2026-11-01T10:00:00.000Z';
    data['lifecycle-rules'][1]['target-count'] = 5;
    data.occurrences[1]['target-count'] = 5;
    await importBackup(store, data, 'merge');
    const edits = (await store.eventsOfTask(T102)).filter((event) => event.type === 'edit-lifecycle-rules');
    expect(edits.map((event) => [event['creation-time'], event.details])).toEqual([
      ['2026-11-01T10:00:00.000Z', { 'target-count': { old: 1, new: 3 }, 'overdue-handling': { old: 'keep', new: 'fail' } }],
      ['2026-11-01T10:00:00.001Z', { 'target-count': { old: 3, new: 5 } }],
    ]);
    expect((await store.getTask(T102))['current-occurrence']).toMatchObject({ 'target-count': 5, 'completion-count': 2, status: 'in-progress' });
  });

  it('never lets older local rule edits override the rules of a newer backup task', async () => {
    at('2026-11-04T10:00:00.000Z');
    await store.updateRules(T101, { 'target-count': 2, 'overdue-handling': 'cancel' });
    const data = fixture2();
    data.tasks[0]['last-update-time'] = '2026-11-05T00:00:00.000Z';
    at('2026-11-06T10:00:00.000Z');
    await importBackup(store, data, 'merge');
    const milk = await store.getTask(T101);
    expect(milk['lifecycle-rules']).toEqual(mirrorRules(embedded(data['lifecycle-rules'][0])));
    expect(milk['current-occurrence']).toMatchObject({ 'target-count': 1, 'due-time': '2026-11-05T22:59:00.000Z', status: 'ready' });
    expect((await store.eventsOfTask(T101)).filter((event) => event.type === 'edit-lifecycle-rules').map((event) => [event['creation-time'], event.details])).toEqual([
      ['2026-11-04T10:00:00.000Z', { 'target-count': { old: 1, new: 2 }, 'overdue-handling': { old: 'keep', new: 'cancel' } }],
      ['2026-11-05T00:00:00.000Z', { 'target-count': { old: 2, new: 1 }, 'overdue-handling': { old: 'cancel', new: 'keep' } }],
    ]);
  });

  it.each([
    ['met, as completed', { 'completion-count': 1, status: 'completed' }, [['log', 2, '2026-11-01T23:59:59.999Z']]],
    ['unmet, as cancelled', { status: 'cancelled' }, []],
  ])('closes a series that ended %s with end-recurrence, never with a user cancel', async (_, occurrence, user) => {
    const data = weeklyGap({ ...occurrence, 'close-time': '2026-11-02T00:00:00.000Z' }, { 'recurrence-end-count': 2 });
    at('2026-11-06T10:00:00.000Z');
    await importBackup(store, data, 'merge', { connected: true });
    expect((await store.getTask(T103))['current-occurrence']).toMatchObject(mirrorOccurrence(embedded(data.occurrences[2])));
    expect((await store.eventsOfTask(T103)).map((event) => [event.type, event.occurrence, event['creation-time']])).toEqual([
      ['create', 1, '2026-10-20T09:00:00.000Z'], ['roll-over', 1, '2026-10-26T00:00:00.000Z'], ...user, ['end-recurrence', 2, '2026-11-02T00:00:00.000Z'],
    ]);
    const posted = (await store.queue.all()).filter((entry) => entry.operation === 'post-event' && entry.target['task-id'] === T103);
    expect(posted.map((entry) => entry.fields.type)).toEqual(user.map(([type]) => type));
  });

  it('cancels a series that the user cancelled before its period ended', async () => {
    const data = weeklyGap({ status: 'cancelled', 'close-time': '2026-10-28T12:00:00.000Z' });
    at('2026-11-06T10:00:00.000Z');
    await importBackup(store, data, 'merge');
    expect((await store.getTask(T103))['current-occurrence']).toEqual(mirrorOccurrence(embedded(data.occurrences[2])));
    expect((await store.eventsOfTask(T103)).map((event) => event.type)).toEqual(['create', 'roll-over', 'cancel']);
  });

  it('previews the same counts without writing', async () => {
    const before = await store.snapshot();
    const preview = await previewImport(store, fixture2(), 'merge');
    expect(await store.snapshot()).toEqual(before);
    expect(preview).toEqual(await importBackup(store, fixture2(), 'merge'));
  });
});

describe('format 2 overwrite import', () => {
  it('takes exactly the backup events of a replaced task, and rebuilds its occurrences', async () => {
    await store.createList({ id: L1, name: 'Groceries' });
    await store.createTask({ id: T102, description: 'Old bread' }, { lists: [L1] });
    await store.postEvent(T102, 'cancel');
    clock.tick();

    const result = await importBackup(store, fixture2(), 'overwrite');

    expect(result.tasks).toEqual(counts({ added: 2, updated: 1 }));
    const data = fixture2();
    expect(await store.eventsOfTask(T102)).toEqual(data.events.filter((event) => event['task-id'] === T102).map(logged));
    expect(await store.occurrencesOfTask(T102)).toEqual([mirrorOccurrence(data.occurrences[1])]);
    expect((await store.getTask(T102))['current-occurrence']).toMatchObject(mirrorOccurrence(embedded(data.occurrences[1])));
    const after = await store.snapshot();
    expect(await importBackup(store, fixture2(), 'overwrite')).toMatchObject(counts({ skipped: 10 }));
    expect(await store.snapshot()).toEqual(after);
  });

  it('rebuilds a task whose fields and rules match the backup but whose events or occurrences differ', async () => {
    await importBackup(store, fixture2(), 'overwrite');
    const data = fixture2();
    const extra = { ...data.events[4], id: eventId(399), 'creation-time': '2026-11-02T09:30:00.000Z' };
    const bogus = { ...data.occurrences[2], occurrence: 2, status: 'completed', 'completion-count': 1, 'close-time': '2026-11-03T07:00:00.000Z' };
    await store.applyChanges(() => ({
      changes: { delete: { events: [[T102, eventId(305)]] }, put: { events: [extra], occurrences: [bogus] } },
      result: null,
    }));

    const result = await importBackup(store, fixture2(), 'overwrite');

    expect(result.tasks).toEqual(counts({ updated: 2, skipped: 1 }));
    expect(await store.eventsOfTask(T102)).toEqual(data.events.filter((event) => event['task-id'] === T102).map(logged));
    expect(await store.occurrencesOfTask(T103)).toEqual([mirrorOccurrence(data.occurrences[2])]);
  });

  it('changes nothing when a backup whose import writes events anew is imported twice', async () => {
    const data = weeklyGap({ 'completion-count': 1, status: 'completed' });
    await importBackup(store, data, 'overwrite');
    const after = await store.snapshot();
    expect((await importBackup(store, data, 'overwrite')).tasks).toEqual(counts({ skipped: 3 }));
    expect(await store.snapshot()).toEqual(after);
  });

  it('previews the same counts without writing', async () => {
    await store.createTask({ id: T102, description: 'Old bread' });
    const before = await store.snapshot();
    const preview = await previewImport(store, fixture2(), 'overwrite');
    expect(await store.snapshot()).toEqual(before);
    expect(preview).toEqual(await importBackup(store, fixture2(), 'overwrite'));
  });
});

describe('format 2 import while connected', () => {
  it('replays a missing task: its first rules, then its rule edits and user events with import true, in time order', async () => {
    at('2026-11-07T10:00:00.000Z');
    await importBackup(store, fixture2(), 'merge', { connected: true });
    const entries = await store.queue.all();
    expect(entries.map((entry) => entry.operation)).toEqual([
      'create-list', 'create-list', 'create-task', 'create-task', 'update-rules', 'post-event', 'post-event', 'create-task', 'post-event',
      'add-membership', 'add-membership', 'add-membership', 'create-note', 'create-note', 'delete-list', 'delete-task',
    ]);
    const bread = entries.filter((entry) => entry.target.id === T102 || entry.target['task-id'] === T102);
    const [create, rules, first, second] = bread;
    expect(create.fields).toEqual({
      id: T102, description: 'Bread', 'creation-time': '2026-11-01T09:01:00.000Z', lists: [], import: true, 'event-id': eventId(302),
      'lifecycle-rules': { ...embedded(fixture2()['lifecycle-rules'][1]), 'target-count': 1, 'overdue-handling': 'keep' },
    });
    expect(rules).toMatchObject({
      target: { type: 'rules', id: T102 },
      fields: { 'target-count': 3, 'overdue-handling': 'fail', import: true, 'event-id': eventId(303) },
      'edit-times': { 'target-count': '2026-11-01T10:00:00.000Z', 'overdue-handling': '2026-11-01T10:00:00.000Z' },
    });
    expect(Object.keys(rules.fields)).toEqual(['target-count', 'overdue-handling', 'import', 'event-id']);
    expect(first.fields).toEqual({ id: eventId(304), type: 'log', checked: true, 'creation-time': '2026-11-02T08:00:00.000Z', occurrence: 1, import: true });
    expect(second.fields).toEqual({ id: eventId(305), type: 'log', checked: true, 'creation-time': '2026-11-02T09:00:00.000Z', occurrence: 1, import: true });
  });

  it('replays the rules that a partial rule history misses as one more rule edit, so the service reaches them', async () => {
    const data = fixture2();
    data['lifecycle-rules'][1]['target-count'] = 5;
    data.occurrences[1]['target-count'] = 5;
    at('2026-11-07T10:00:00.000Z');
    await importBackup(store, data, 'merge', { connected: true });
    const bread = (await store.queue.all()).filter((entry) => entry.target.type !== 'membership' && [entry.target.id, entry.target['task-id']].includes(T102));
    expect(bread.map((entry) => entry.operation)).toEqual(['create-task', 'update-rules', 'post-event', 'post-event', 'update-rules']);
    expect(bread[0].fields['lifecycle-rules']).toMatchObject({ 'target-count': 1, 'overdue-handling': 'keep' });
    const settled = (await store.eventsOfTask(T102)).at(-1);
    expect(bread[4]).toMatchObject({
      fields: { 'target-count': 5, import: true, 'event-id': settled.id },
      'edit-times': { 'target-count': '2026-11-02T09:00:00.000Z' },
    });
  });

  it('keeps a global note global, and a linked note linked, when it replays notes', async () => {
    at('2026-11-07T10:00:00.000Z');
    await importBackup(store, fixture2(), 'merge', { connected: true });
    const notes = (await store.queue.all()).filter((entry) => entry.operation === 'create-note');
    expect(notes.map((entry) => [entry.target.id, entry.fields.occurrence])).toEqual([[N201, null], [N202, 1]]);
    expect(notes[0].fields).toHaveProperty('occurrence', null);
  });

  it.each([
    ['a timezone edit of a task whose recurrence came from an unlogged change', {
      rules: { 'recurrence-unit': 'week', 'recurrence-interval': 1, timezone: 'UTC', 'due-time': null, 'overdue-handling': null },
      details: { 'target-count': { old: 1, new: 3 }, timezone: { old: null, new: 'UTC' } },
    }],
    ['an interval edit that an unlogged end of recurrence left on a one-off task', {
      rules: {},
      details: { 'recurrence-interval': { old: null, new: 2 } },
    }],
  ])('replays %s without breaking the rule shape', async (_, { rules, details }) => {
    const data = fixture2();
    Object.assign(data['lifecycle-rules'][1], rules);
    data.events.find((event) => event.id === eventId(303)).details = details;
    at('2026-11-07T10:00:00.000Z');
    await importBackup(store, data, 'merge', { connected: true });

    const bread = await store.getTask(T102);
    expect(bread['lifecycle-rules']).toEqual(failing(data['lifecycle-rules'][1]));
    expect((await store.eventsOfTask(T102)).map((event) => event.id)).toContain(eventId(303));
    for (const occurrence of await store.occurrencesOfTask(T102)) {
      expect(occurrence['completion-count']).toBeLessThanOrEqual(2);
    }
    // The service checks every replayed rule request: the create and each rule edit must keep a valid shape.
    const entries = (await store.queue.all()).filter((entry) => entry.target.type !== 'membership' && [entry.target.id, entry.target['task-id']].includes(T102));
    let replayed = entries[0].fields['lifecycle-rules'];
    expect(rulesShapeProblem(replayed)).toBeNull();
    for (const entry of entries.filter((item) => item.operation === 'update-rules')) {
      const edit = Object.fromEntries(Object.entries(entry.fields).filter(([name]) => !['event-id', 'import'].includes(name)));
      const { rules: next, problem } = editedRules(replayed, edit);
      expect(problem).toBeNull();
      replayed = next;
    }
    expect(mirrorRules(replayed)).toEqual(failing(data['lifecycle-rules'][1]));
  });

  it('posts only the imported user events of an existing newer task, with import true', async () => {
    await importBackup(store, fixture2(), 'merge');
    const data = fixture2();
    data.tasks[2]['last-update-time'] = '2026-11-04T08:00:00.000Z';
    data.events.push({ id: eventId(309), 'task-id': T103, occurrence: 1, 'creation-time': '2026-11-04T08:00:00.000Z', 'owner-id': null, type: 'complete', details: null });
    Object.assign(data.occurrences[2], { 'completion-count': 1, status: 'completed', 'close-time': '2026-11-04T08:00:00.000Z' });
    at('2026-11-07T10:00:00.000Z');

    await importBackup(store, data, 'merge', { connected: true });

    const entries = await store.queue.all();
    expect(entries.map((entry) => entry.operation)).toEqual(['update-task', 'update-rules', 'post-event']);
    expect(entries[2].fields).toEqual({ id: eventId(309), type: 'log', checked: true, 'creation-time': '2026-11-04T08:00:00.000Z', occurrence: 1, import: true });
    expect((await store.getTask(T103))['current-occurrence']).toMatchObject({ status: 'completed', 'completion-count': 1 });
  });
});

describe('format 1 import while connected', () => {
  const OLD = '2026-10-01T08:00:00.000Z';
  const NEWER_LOCAL = '2026-12-01T08:00:00.000Z';

  /**
   * Build the local data a connected import meets: older rows L1 and T101, a newer local T102, and note N201.
   * Rows L2, T103, and N202 are missing, so the import adds them.
   * @returns {object} the backup to import locally
   */
  function localData() {
    const old = fixture();
    old.lists = [{ ...old.lists[0], name: 'Old name', description: 'Old description', 'last-update-time': OLD }];
    old.tasks = [
      { ...old.tasks[0], description: 'Old milk', status: 'in-progress', 'last-update-time': OLD, 'last-activity-time': OLD },
      { ...old.tasks[1], description: 'Local bread', 'last-update-time': NEWER_LOCAL },
    ];
    old.memberships = old.memberships.filter((m) => m['list-id'] === L1);
    old.notes = [{ ...old.notes[0], text: 'Local text' }];
    return old;
  }

  /**
   * Import the fixture while connected, after loading the local data in local mode.
   * @param {object} [options] import options
   * @returns {Promise<{result: object, entries: object[]}>} the counts and the queued entries
   */
  async function connectedImport(options = {}) {
    await importBackup(store, localData(), 'merge');
    expect(await store.queue.all()).toEqual([]);
    at('2026-11-07T10:00:00.000Z');
    const result = await importBackup(store, fixture(), 'merge', { connected: true, ...options });
    return { result, entries: await store.queue.all() };
  }

  it('queues all fields of a newer row without an edit time, nothing for an older row, and only missing notes', async () => {
    const { result, entries } = await connectedImport();
    expect(entries.map((entry) => `${entry.operation} ${entry.target.type}`)).toEqual([
      'update-list list', 'create-list list', 'update-task task', 'update-rules rules', 'post-event event', 'create-task task', 'post-event event',
      'add-membership membership', 'create-note note', 'delete-list list', 'delete-task task',
    ]);
    const [updateList, createList, updateTask, updateRules, unstart, createTask, start, addMembership, createNote] = entries;
    expect(updateList).toMatchObject({
      target: { type: 'list', id: L1 },
      fields: { name: 'Groceries', description: 'Weekly shopping\n  - fruit first\n' },
      'edit-times': {},
    });
    expect(updateTask).toMatchObject({ target: { type: 'task', id: T101 }, fields: { description: 'Almond milk\n\nunsweetened' }, 'edit-times': {} });
    expect(updateRules).toMatchObject({
      target: { type: 'rules', id: T101 },
      fields: { 'target-count': 1, 'due-time': '2026-11-05T22:59:00.000Z', 'overdue-handling': 'keep' },
      'edit-times': {},
    });
    expect(unstart).toMatchObject({ target: { type: 'event', 'task-id': T101 }, fields: { type: 'unstart', 'creation-time': '2026-11-07T10:00:00.000Z', occurrence: 1 } });
    expect(start).toMatchObject({ target: { type: 'event', 'task-id': T103 }, fields: { type: 'start', 'creation-time': '2026-11-03T07:00:00.000Z' } });
    expect(createList.fields).toMatchObject({ id: L2, name: 'Old projects', 'creation-time': '2026-11-01T08:00:00.000Z' });
    expect(createTask.fields).toMatchObject({ id: T103, description: 'Paint the shed', lists: [], 'lifecycle-rules': { 'overdue-handling': 'keep' } });
    expect(addMembership.target).toMatchObject({ id: T103, 'list-id': L2 });
    expect(createNote).toMatchObject({ target: { id: N202, 'task-id': T103 }, fields: { id: N202, text: 'Needs two coats\n  of paint' } });
    expect(createNote.fields).not.toHaveProperty('occurrence');
    expect(entries.every((entry) => entry.created === '2026-11-07T10:00:00.000Z')).toBe(true);
    expect(entries.map((entry) => entry.seq)).toEqual([...entries.map((entry) => entry.seq)].sort((a, b) => a - b));
    expect((await store.getTask(T102)).description).toBe('Local bread');
    expect((await store.notesOfTask(T101)).map((note) => note.text)).toEqual(['Local text']);
    expect(result.notes).toEqual(counts({ added: 1, skipped: 1 }));
    expect(result.tasks).toEqual(counts({ added: 1, updated: 1, skipped: 1 }));
  });

  it('sends the final name of a renamed list, and adds new memberships in their list order', async () => {
    await store.createList({ name: 'Groceries' });
    const result = await importBackup(store, fixture(), 'merge', { connected: true });
    const entries = await store.queue.all();
    expect(entries.find((entry) => entry.operation === 'create-list' && entry.target.id === L1).fields.name).toBe('Groceries (2)');
    expect(entries.filter((entry) => entry.operation === 'add-membership' && entry.target['list-id'] === L1).map((entry) => entry.target.id))
      .toEqual([T102, T101]);
    expect(result.lists).toMatchObject({ added: 2 });
  });

  it('sends a restore before the update when the newer row leaves the recycle bin', async () => {
    const old = localData();
    old.lists[0]['deletion-time'] = OLD;
    await importBackup(store, old, 'merge');
    await importBackup(store, fixture(), 'merge', { connected: true });
    const entries = (await store.queue.all()).filter((entry) => entry.target.id === L1);
    expect(entries.map((entry) => entry.operation)).toEqual(['restore-list', 'update-list']);
  });

  it('never queues a removal, and refuses overwrite mode', async () => {
    const { entries } = await connectedImport();
    const inBackup = new Set([...fixture().lists, ...fixture().tasks, ...fixture().notes].map((record) => record.id));
    expect(entries.every((entry) => inBackup.has(entry.target.type === 'event' ? entry.target['task-id'] : entry.target.id))).toBe(true);
    expect(entries.map((entry) => entry.operation)).not.toContain('remove-membership');
    expect(entries.map((entry) => entry.operation)).not.toContain('delete-note');
    const before = await store.snapshot();
    const queued = entries.length;
    for (const call of [
      () => importBackup(store, fixture(), 'overwrite', { connected: true }),
      () => previewImport(store, fixture(), 'overwrite', { connected: true }),
    ]) {
      const error = await call().then(() => null, (problem) => problem);
      expect(error).toBeInstanceOf(BackupError);
      expect(error).toMatchObject({ code: 'invalid', path: 'mode' });
    }
    expect(await store.snapshot()).toEqual(before);
    expect(await store.queue.count()).toBe(queued);
  });

  it('never changes or queues a list owned by another user, nor its tasks', async () => {
    const foreign = { id: 99, name: 'Ada' };
    const old = localData();
    old.lists[0].owner = foreign;
    await importBackup(store, old, 'merge');
    const data = fixture();
    data.lists[0].owner = foreign;
    const before = await store.snapshot();
    const result = await importBackup(store, data, 'merge', { connected: true, ownerId: 12 });
    const entries = await store.queue.all();
    expect(entries.map((entry) => entry.target.id)).not.toContain(L1);
    expect(entries.map((entry) => entry.target.id)).not.toContain(T101);
    expect(entries.map((entry) => entry.target['list-id'])).not.toContain(L1);
    expect(await store.getList(L1)).toEqual(before.lists.find((list) => list.id === L1));
    expect(await store.getTask(T101)).toEqual(before.tasks.find((task) => task.id === T101));
    expect(result.lists).toMatchObject({ skipped: 1, added: 1 });
  });

  it('counts the same changes in the preview as the import makes', async () => {
    await importBackup(store, localData(), 'merge');
    const preview = await previewImport(store, fixture(), 'merge', { connected: true });
    const result = await importBackup(store, fixture(), 'merge', { connected: true });
    expect(preview).toEqual(result);
  });

  it('queues nothing in local mode, and nothing when the file is invalid', async () => {
    await importBackup(store, fixture(), 'merge');
    expect(await store.queue.count()).toBe(0);
    const bad = fixture();
    bad.tasks[0].status = 'nope';
    await expect(importBackup(store, bad, 'merge', { connected: true })).rejects.toBeInstanceOf(BackupError);
    expect(await store.queue.count()).toBe(0);
  });

  it('rolls an entry back through the queue undo, as for a refused change', async () => {
    const { entries } = await connectedImport();
    await store.queue.undo(store, entries.find((entry) => entry.operation === 'update-list'));
    expect(await store.getList(L1)).toMatchObject({ name: 'Old name', description: 'Old description' });
    await store.queue.undo(store, entries.find((entry) => entry.operation === 'create-task'));
    expect(await store.getTask(T103)).toBeUndefined();
  });
});

describe('log entries in a backup', () => {
  it('exports every log field and undo relationship, and an overwrite import restores them with their caches', async () => {
    const { store: source, clock } = await freshStore();
    const { store: target } = await freshStore();
    try {
      const task = await source.createTask({ description: 'Run', 'lifecycle-rules': { 'target-count': 2 } });
      clock.tick();
      await source.logEntry(task.id, { 'time-spent-seconds': 600, amount: 2.5, label: 'Park' });
      clock.tick();
      const { event: check } = await source.logEntry(task.id, { checked: true, label: 'Loop' });
      clock.tick();
      await source.logEntry(task.id, { checked: true });
      clock.tick();
      await source.undoLog(task.id, check.id);
      const options = { now: new Date('2026-11-09T12:00:00.000Z'), appVersion: '0.1.0-pre' };
      const text = JSON.stringify(await exportBackup(source, options), null, 2);
      const exported = JSON.parse(text).events;
      expect(exported.filter((event) => event.type === 'log').map((event) => [event['time-spent-seconds'], event.amount, event.label, event.checked]))
        .toEqual([[600, 2.5, 'Park', undefined], [undefined, undefined, 'Loop', true], [undefined, undefined, undefined, true]]);
      expect(exported.find((event) => event.type === 'undo-log')['target-event-id']).toBe(check.id);
      await importBackup(target, parseBackup(text), 'overwrite');
      const restored = await target.getTask(task.id);
      expect(restored['current-occurrence']).toMatchObject({ progress: 1, 'time-spent-seconds': 600, status: 'in-progress' });
      expect(restored['current-occurrence'].entries).toHaveLength(2);
      expect(await target.snapshot()).toEqual(await source.snapshot());
    }
    finally {
      source.close();
      target.close();
    }
  });

  it('rejects a log field on another event type and a log without content', () => {
    const backup = JSON.parse(JSON.stringify(fixture()));
    const event = { id: 'e1', 'task-id': backup.tasks[0].id, occurrence: 1, 'creation-time': '2026-11-04T09:00:00.000Z', 'owner-id': null, details: null };
    const bad = (extra) => parseBackup(JSON.stringify({ ...backup, 'format-version': 2, events: [{ ...event, ...extra }] }));
    expect(() => bad({ type: 'start', amount: 1 })).toThrow();
    expect(() => bad({ type: 'log' })).toThrow();
  });
});

describe('mixed legacy and log histories in a backup', () => {
  it('rebuilds time spent and live entries when the file holds a legacy completion beside a log', async () => {
    const { store: source, clock } = await freshStore();
    const { store: target } = await freshStore();
    try {
      const task = await source.createTask({ description: 'Mixed', 'lifecycle-rules': { 'target-count': 3 } });
      clock.tick();
      await source.logEntry(task.id, { checked: true });
      clock.tick();
      await source.logEntry(task.id, { 'time-spent-seconds': 60 });
      const options = { now: new Date('2026-11-09T12:00:00.000Z'), appVersion: '0.1.0-pre' };
      const file = JSON.parse(JSON.stringify(await exportBackup(source, options)));
      file.events = file.events.map((event) => (event.checked ? { ...event, type: 'complete', checked: undefined } : event));
      await importBackup(target, parseBackup(JSON.stringify(asFormat2(file))), 'overwrite');
      const current = (await target.getTask(task.id))['current-occurrence'];
      expect(current).toMatchObject({ progress: 1, 'time-spent-seconds': 60 });
      expect(current.entries).toHaveLength(2);
    }
    finally {
      source.close();
      target.close();
    }
  });
});

describe('legacy uncomplete events beside checked logs in a backup', () => {
  it('undoes the latest live check, a logged one with time, and keeps the right entries and totals', async () => {
    const { store: source, clock } = await freshStore();
    const { store: target } = await freshStore();
    try {
      const task = await source.createTask({ description: 'Mixed', 'lifecycle-rules': { 'target-count': 3 } });
      clock.tick();
      await source.logEntry(task.id, { checked: true });
      clock.tick();
      await source.logEntry(task.id, { checked: true, 'time-spent-seconds': 45 });
      clock.tick();
      await source.postEvent(task.id, 'uncomplete');
      const options = { now: new Date('2026-11-09T12:00:00.000Z'), appVersion: '0.1.0-pre' };
      const file = JSON.parse(JSON.stringify(await exportBackup(source, options)));
      let first = true;
      file.events = file.events.map((event) => {
        if (event.type === 'log' && first) {
          first = false;
          return { ...event, type: 'complete', checked: undefined };
        }
        return event.type === 'undo-log' ? { ...event, type: 'uncomplete', 'target-event-id': undefined } : event;
      });
      await importBackup(target, parseBackup(JSON.stringify(asFormat2(file))), 'overwrite');
      const current = (await target.getTask(task.id))['current-occurrence'];
      expect(current).toMatchObject({ progress: 1, 'time-spent-seconds': 0 });
      expect(current.entries).toHaveLength(1);
      expect(current.entries[0].checked).toBe(true);
      expect(current.entries[0]['time-spent-seconds']).toBeUndefined();
    }
    finally {
      source.close();
      target.close();
    }
  });
});


describe('format 3 export', () => {
  const options = { now: new Date('2026-11-09T12:00:00.000Z'), appVersion: '0.1.0-pre' };
  const GOAL = {
    'start-time': '2026-11-01T00:00:00.000Z', 'due-time': '2026-11-20T18:00:00.000Z', 'overdue-handling': 'cancel',
    'goal-measure': 'amount', 'goal-unit': 'km', 'target-count': 10,
  };

  it('writes the goal, start time, and cache fields of ADR-0006, with fail for cancel, and no target-count', async () => {
    clock.tick();
    const task = await store.createTask({ description: 'Run', 'lifecycle-rules': GOAL });
    clock.tick();
    await store.logEntry(task.id, { amount: 4, label: 'Park' });
    clock.tick();
    await store.updateRules(task.id, { 'target-count': 12 });
    const backup = await exportBackup(store, options);

    expect(backup['format-version']).toBe(3);
    expect(backup['lifecycle-rules']).toEqual([{
      'task-id': task.id, 'start-time': '2026-11-01T00:00:00.000Z', 'due-time': '2026-11-20T18:00:00.000Z', 'overdue-handling': 'fail',
      'goal-direction': 'at-least', 'goal-measure': 'amount', 'goal-target': 12, 'goal-unit': 'km',
      'recurrence-unit': null, 'recurrence-interval': null, 'recurrence-end-date': null, 'recurrence-end-count': null, timezone: null,
    }]);
    expect(backup.occurrences).toEqual([{
      'task-id': task.id, occurrence: 1, 'start-time': '2026-11-01T00:00:00.000Z', 'due-time': '2026-11-20T18:00:00.000Z',
      status: 'in-progress', 'close-time': null, 'goal-direction': 'at-least', 'goal-measure': 'amount', 'goal-target': 12,
      progress: 4, 'time-spent-seconds': 0,
    }]);
    const edit = backup.events.find((event) => event.type === 'edit-lifecycle-rules');
    expect(edit.details).toEqual({ 'goal-target': { old: 10, new: 12 } });
    expect(backup.events.find((event) => event.type === 'log')).toMatchObject({ amount: 4, label: 'Park' });
    expect(JSON.stringify(backup)).not.toContain('target-count');
    expect(JSON.stringify(backup)).not.toContain('completion-count');
  });

  it('exports a legacy complete event stored by an earlier import as a checked log', async () => {
    clock.tick();
    const task = await store.createTask({ description: 'Old', 'lifecycle-rules': { 'target-count': 2 } });
    const { task: stored } = { task: await store.getTask(task.id) };
    const events = await store.eventsOfTask(task.id);
    const legacy = [
      ...events,
      { ...events[0], id: 'e-complete', type: 'complete', 'creation-time': '2026-11-04T10:00:00.000Z' },
      { ...events[0], id: 'e-undo', type: 'uncomplete', 'creation-time': '2026-11-04T11:00:00.000Z' },
    ];
    const backup = await exportBackup({ snapshot: async () => ({ ...(await store.snapshot()), events: legacy }) }, options);
    expect(stored.id).toBe(task.id);
    expect(backup.events.map((event) => [event.id === 'e-complete' ? 'e-complete' : event.type, event.type, event.checked ?? null]))
      .toContainEqual(['e-complete', 'log', true]);
    expect(backup.events.find((event) => event.id === 'e-undo')).toMatchObject({ type: 'undo-log', 'target-event-id': 'e-complete' });
    expect(backup.events.some((event) => event.type === 'complete' || event.type === 'uncomplete')).toBe(false);
  });

  it('round-trips a goal task with entries into an empty store, in overwrite and merge mode', async () => {
    const { store: target } = await freshStore();
    const { store: merged } = await freshStore();
    try {
      clock.tick();
      const task = await store.createTask({ description: 'Run', 'lifecycle-rules': { ...GOAL, 'overdue-handling': 'fail' } });
      clock.tick();
      const { event } = await store.logEntry(task.id, { amount: 4, label: 'Park' });
      clock.tick();
      await store.logEntry(task.id, { amount: 3 });
      clock.tick();
      await store.undoLog(task.id, event.id);
      const text = JSON.stringify(await exportBackup(store, options), null, 2);
      await importBackup(target, parseBackup(text), 'overwrite');
      await importBackup(merged, parseBackup(text), 'merge');
      expect(await target.snapshot()).toEqual(await store.snapshot());
      expect(await merged.snapshot()).toEqual(await store.snapshot());
      expect((await target.getTask(task.id))['lifecycle-rules']).toMatchObject({ 'goal-measure': 'amount', 'goal-unit': 'km', 'start-time': GOAL['start-time'] });
      expect(JSON.stringify(await exportBackup(target, options))).toBe(JSON.stringify(await exportBackup(store, options)));
    }
    finally {
      target.close();
      merged.close();
    }
  });

  it('adds no missing checks for a huge valid progress, which a log per check could not reach', async () => {
    clock.tick();
    const task = await store.createTask({ description: 'Tap', 'lifecycle-rules': { 'target-count': 999_999_999_999 } });
    const file = JSON.parse(JSON.stringify(await exportBackup(store, options)));
    file.occurrences[0].progress = 999_999_999_998;
    file.occurrences[0].status = 'in-progress';
    const { store: target } = await freshStore();
    try {
      const started = Date.now();
      const preview = await previewImport(target, parseBackup(JSON.stringify(file)), 'merge');
      expect(preview.unrebuiltProgress).toEqual([{ 'task-id': task.id, missing: 999_999_999_998 }]);
      const result = await importBackup(target, parseBackup(JSON.stringify(file)), 'merge');
      expect(Date.now() - started).toBeLessThan(5000);
      expect(result.unrebuiltProgress).toEqual([{ 'task-id': task.id, missing: 999_999_999_998 }]);
      expect((await target.eventsOfTask(task.id)).filter((event) => event.type === 'log')).toHaveLength(0);
    }
    finally {
      target.close();
    }
  }, 10_000);

  it('rebuilds a gap of exactly 10000 checks, and reports the first gap above it', async () => {
    clock.tick();
    const task = await store.createTask({ description: 'Tap', 'lifecycle-rules': { 'target-count': 100_000 } });
    const base = JSON.parse(JSON.stringify(await exportBackup(store, options)));
    for (const [gap, rebuilt] of [[10_000, true], [10_001, false]]) {
      const file = JSON.parse(JSON.stringify(base));
      file.occurrences[0].progress = gap;
      file.occurrences[0].status = 'in-progress';
      const { store: target } = await freshStore();
      try {
        const result = await importBackup(target, parseBackup(JSON.stringify(file)), 'merge');
        expect((await target.getTask(task.id))['current-occurrence'].progress).toBe(rebuilt ? gap : 0);
        expect(result.unrebuiltProgress).toEqual(rebuilt ? undefined : [{ 'task-id': task.id, missing: gap }]);
      }
      finally {
        target.close();
      }
    }
  }, 20_000);

  it('skips and reports an undo-log whose target is missing from the file, without failing the file', async () => {
    clock.tick();
    const task = await store.createTask({ description: 'Run', 'lifecycle-rules': GOAL });
    clock.tick();
    await store.logEntry(task.id, { amount: 4 });
    const file = JSON.parse(JSON.stringify(await exportBackup(store, options)));
    const orphan = { ...file.events[0], id: 'u-orphan', type: 'undo-log', 'target-event-id': 'missing-event', 'creation-time': '2026-11-05T00:00:00.000Z' };
    file.events.push(orphan);
    const { store: target } = await freshStore();
    try {
      const preview = await previewImport(target, parseBackup(JSON.stringify(file)), 'merge');
      expect(preview.skippedEvents).toEqual(['u-orphan']);
      const result = await importBackup(target, parseBackup(JSON.stringify(file)), 'merge');
      expect(result.skippedEvents).toEqual(['u-orphan']);
      expect((await target.eventsOfTask(task.id)).map((event) => event.id)).not.toContain('u-orphan');
      expect((await target.getTask(task.id))['current-occurrence']).toMatchObject({ progress: 4 });
    }
    finally {
      target.close();
    }
  });

  it('rejects complete and uncomplete events, and the rule fields of format 2, in a format 3 file', async () => {
    clock.tick();
    const task = await store.createTask({ description: 'Run', 'lifecycle-rules': GOAL });
    const file = JSON.parse(JSON.stringify(await exportBackup(store, options)));
    const event = { ...file.events[0], id: 'x1', type: 'complete' };
    expect(() => parseBackup(JSON.stringify({ ...file, events: [...file.events, event] }))).toThrow(/events\[1\]\.type/);
    const rules = { ...file['lifecycle-rules'][0], 'overdue-handling': 'cancel' };
    expect(() => parseBackup(JSON.stringify({ ...file, 'lifecycle-rules': [rules] }))).toThrow(/overdue-handling/);
    const atMost = { ...file['lifecycle-rules'][0], 'goal-direction': 'at-most', 'due-time': null };
    expect(() => parseBackup(JSON.stringify({ ...file, 'lifecycle-rules': [atMost] }))).toThrow(/goal-direction/);
    const unit = { ...file['lifecycle-rules'][0], 'goal-measure': 'checks' };
    expect(() => parseBackup(JSON.stringify({ ...file, 'lifecycle-rules': [unit] }))).toThrow(/goal-unit/);
    expect(task.id).toBe(file.tasks[0].id);
  });
});

describe('format 1 status events in log form', () => {
  const id = '0192f1a2-0000-7000-8000-000000000701';
  const file = (status, update) => ({
    format: 'todos-backup', 'format-version': 1, 'app-version': '0.1.0', 'export-time': '2026-11-05T00:00:00.000Z',
    lists: [], memberships: [], notes: [],
    tasks: [{
      id, description: 'Sweep', status, 'due-time': null, 'overdue-handling': 'keep', 'owner-id': null,
      'creation-time': '2026-11-01T09:00:00.000Z', 'last-update-time': update, 'last-activity-time': update, 'deletion-time': null,
    }],
  });

  it('stores a completed task as a checked log with its entry, never as a complete event', async () => {
    await importBackup(store, file('completed', '2026-11-02T09:00:00.000Z'), 'merge');
    const events = await store.eventsOfTask(id);
    expect(events.map((event) => [event.type, event.checked ?? null])).toEqual([['create', null], ['log', true]]);
    expect((await store.getTask(id))['current-occurrence']).toMatchObject({ status: 'completed', progress: 1 });
    expect((await store.getTask(id))['current-occurrence'].entries).toHaveLength(1);
  });

  it('undoes the check of a replaced task that the backup reopens, with an undo-log', async () => {
    await importBackup(store, file('completed', '2026-11-02T09:00:00.000Z'), 'merge');
    clock.tick(86_400_000);
    await importBackup(store, file('todo', '2026-11-04T09:00:00.000Z'), 'merge');
    const events = await store.eventsOfTask(id);
    expect(events.map((event) => event.type)).toEqual(['create', 'log', 'undo-log']);
    expect(events[2]['target-event-id']).toBe(events[1].id);
    expect((await store.getTask(id))['current-occurrence']).toMatchObject({ status: 'ready', progress: 0 });
    expect((await store.getTask(id))['current-occurrence'].entries).toHaveLength(0);
  });
});

describe('format 3 sample file', () => {
  const sample = readFileSync(new URL('../fixtures/backup-v3.json', import.meta.url), 'utf8');

  it('parses unchanged, and an overwrite import then export writes it again', async () => {
    const file = JSON.parse(sample);
    expect(parseBackup(sample)).toEqual(file);
    await importBackup(store, parseBackup(sample), 'overwrite');
    const again = await exportBackup(store, { now: new Date(file['export-time']), appVersion: file['app-version'] });
    expect(again).toEqual(file);
  });

  it('gives the same store as the format 2 sample that it was made from', async () => {
    const { store: other } = await freshStore();
    try {
      at('2026-11-05T12:00:00.000Z');
      await importBackup(store, parseBackup(sample), 'overwrite');
      await importBackup(other, parseBackup(FIXTURE_2_TEXT), 'overwrite');
      const local = await store.snapshot();
      const converted = await other.snapshot();
      expect(local.tasks.map((task) => task['lifecycle-rules'])).toEqual(converted.tasks.map((task) => task['lifecycle-rules']));
      expect(local.events.map((event) => event.id).sort()).toEqual(converted.events.map((event) => event.id).sort());
    }
    finally {
      other.close();
    }
  });
});

describe('format 2 conversion on import', () => {
  const task = '0192f1a2-0000-7000-8000-000000000501';
  const ev = (n, type, minute) => ({
    id: `0192f1a2-0000-7000-8000-00000000060${n}`, 'task-id': task, occurrence: 1, 'creation-time': `2026-11-04T10:${minute}:00.000Z`,
    'owner-id': null, type, details: null,
  });

  /**
   * Return a format 2 file with one task of target 2, two completions, and three uncompletes, the last one ignored.
   * @returns {object} the file
   */
  function legacyFile() {
    return {
      format: 'todos-backup', 'format-version': 2, 'app-version': '0.5.0', 'export-time': '2026-11-05T00:00:00.000Z',
      lists: [], memberships: [], notes: [],
      tasks: [{ id: task, description: 'Water plants', 'owner-id': null, 'creation-time': '2026-11-04T09:00:00.000Z', 'last-update-time': '2026-11-04T10:30:00.000Z', 'deletion-time': null }],
      'lifecycle-rules': [{
        'task-id': task, 'target-count': 2, 'due-time': '2026-11-30T18:00:00.000Z', 'overdue-handling': 'cancel',
        'recurrence-unit': null, 'recurrence-interval': null, 'recurrence-end-date': null, 'recurrence-end-count': null, timezone: null,
      }],
      occurrences: [],
      events: [
        ev(1, 'create', '00'), ev(2, 'complete', '10'), ev(3, 'complete', '11'),
        ev(4, 'uncomplete', '12'), ev(5, 'uncomplete', '13'), ev(6, 'uncomplete', '14'),
      ],
    };
  }

  it('turns target-count into a checks goal, cancel into fail, complete into logs, and uncomplete into undos', async () => {
    await importBackup(store, parseBackup(JSON.stringify(legacyFile())), 'merge');
    const stored = await store.getTask(task);
    expect(stored['lifecycle-rules']).toMatchObject({
      'goal-direction': 'at-least', 'goal-measure': 'checks', 'goal-target': 2, 'goal-unit': null, 'start-time': null, 'overdue-handling': 'fail',
    });
    const events = await store.eventsOfTask(task);
    expect(events.map((event) => [event.id.slice(-2), event.type, event.checked ?? null, event['target-event-id']?.slice(-2) ?? null])).toEqual([
      ['01', 'create', null, null], ['02', 'log', true, null], ['03', 'log', true, null], ['04', 'undo-log', null, '03'], ['05', 'undo-log', null, '02'],
    ]);
    expect(stored['current-occurrence']).toMatchObject({ progress: 0, status: 'ready' });
    const backup = await exportBackup(store, { now: new Date('2026-11-09T12:00:00.000Z'), appVersion: '0.1.0-pre' });
    expect(backup['format-version']).toBe(3);
    expect(backup.events.some((event) => event.type === 'complete' || event.type === 'uncomplete')).toBe(false);
  });

  it('rebuilds at most 10000 missing completions, and reports a larger gap without adding events', async () => {
    for (const [gap, rebuilt] of [[10_000, true], [10_001, false]]) {
      const file = legacyFile();
      file['lifecycle-rules'][0]['target-count'] = 20_000;
      file.events = [ev(1, 'create', '00')];
      file.occurrences = [{
        'task-id': task, occurrence: 1, 'start-time': '2026-11-04T09:00:00.000Z', 'due-time': '2026-11-30T18:00:00.000Z',
        'target-count': 20_000, 'completion-count': gap, status: 'in-progress', 'close-time': null,
      }];
      const { store: target } = await freshStore();
      try {
        const result = await importBackup(target, parseBackup(JSON.stringify(file)), 'merge');
        expect((await target.getTask(task))['current-occurrence'].progress).toBe(rebuilt ? gap : 0);
        expect(result.unrebuiltProgress).toEqual(rebuilt ? undefined : [{ 'task-id': task, missing: gap }]);
      }
      finally {
        target.close();
      }
    }
  }, 30_000);

  it('converts the edit events, and reports the uncomplete that the old fold ignored', async () => {
    const file = legacyFile();
    file['lifecycle-rules'][0]['target-count'] = 3;
    file.events.push({ ...ev(7, 'edit-lifecycle-rules', '20'), details: { 'target-count': { old: 2, new: 3 }, 'overdue-handling': { old: 'keep', new: 'cancel' } } });
    const result = await importBackup(store, parseBackup(JSON.stringify(file)), 'merge');
    expect(result.skippedEvents).toEqual([ev(6, 'uncomplete', '14').id]);
    const edit = (await store.eventsOfTask(task)).find((event) => event.type === 'edit-lifecycle-rules');
    expect(edit.details).toMatchObject({ 'target-count': { old: 2, new: 3 } });
    expect((await store.getTask(task))['lifecycle-rules']).toMatchObject({ 'goal-target': 3 });
    const preview = await previewImport(store, JSON.parse(JSON.stringify(file)), 'merge');
    expect(preview.skippedEvents).toEqual([ev(6, 'uncomplete', '14').id]);
  });

  it('keeps a merge per row: a newer local task stays, and an unchanged converted file skips', async () => {
    await importBackup(store, parseBackup(JSON.stringify(legacyFile())), 'merge');
    clock.tick(1000);
    const again = await importBackup(store, parseBackup(JSON.stringify(legacyFile())), 'merge');
    expect(again.tasks).toEqual(counts({ skipped: 1 }));
    const older = legacyFile();
    older.tasks[0].description = 'Older name';
    older.tasks[0]['last-update-time'] = '2026-11-01T00:00:00.000Z';
    await importBackup(store, parseBackup(JSON.stringify(older)), 'merge');
    expect((await store.getTask(task)).description).toBe('Water plants');
  });
});
