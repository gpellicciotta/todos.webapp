import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  BackupError, backupFileName, exportBackup, importBackup, parseBackup, previewImport,
} from '../../src/js/core/backup.js';
import { freshStore } from './store-helpers.js';

const FIXTURE_TEXT = readFileSync(new URL('../fixtures/backup-v1.json', import.meta.url), 'utf8');
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
      'format-version': 1,
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

  it('exports an empty store as empty arrays', async () => {
    const backup = await exportBackup(store, { now: new Date('2026-11-04T12:00:00.000Z'), appVersion: '1.0.0' });
    expect(backup).toEqual({
      format: 'todos-backup', 'format-version': 1, 'app-version': '1.0.0', 'export-time': '2026-11-04T12:00:00.000Z',
      lists: [], tasks: [], memberships: [], notes: [],
    });
  });

  it('names the file after the local export date', () => {
    expect(backupFileName(new Date(2026, 10, 4, 23, 30))).toBe('todos-backup-2026-11-04.json');
  });
});

describe('parseBackup', () => {
  it('reads a version 1 file', () => {
    expect(parseBackup(FIXTURE_TEXT)).toEqual(fixture());
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
      d['format-version'] = 2;
    });
    expect(error).toBeInstanceOf(BackupError);
    expect(error).toMatchObject({ code: 'unsupported-version', path: 'format-version' });
    expect(error.message).toMatch(/version 2/);
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

describe('merge import', () => {
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

  it('keeps the later last activity time of a replaced task', async () => {
    const data = fixture();
    data.tasks[0]['last-update-time'] = '2026-11-05T00:00:00.000Z';
    data.tasks[0]['last-activity-time'] = '2026-11-01T00:00:00.000Z';
    await importBackup(store, data, 'merge');
    expect(await store.getTask(T101)).toMatchObject({
      description: 'Almond milk\n\nunsweetened',
      'last-update-time': '2026-11-05T00:00:00.000Z',
      'last-activity-time': '2026-11-04T09:00:00.000Z',
    });
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

describe('overwrite import', () => {
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
      expect(await store.getTask(task.id)).toEqual(task);
    }
    expect(await store.getList(home.id)).toMatchObject({ 'deletion-time': '2026-11-04T09:00:01.000Z' });
    expect(await store.getTask(local.id)).toMatchObject({
      'deletion-time': '2026-11-04T09:00:01.000Z',
      'last-update-time': '2026-11-04T09:00:01.000Z',
      'last-activity-time': '2026-11-04T09:00:01.000Z',
    });
    expect(await store.getTask(gone.id)).toEqual(gone);
    expect((await store.listLists()).map((list) => list.id)).toEqual([L1]);
    expect((await store.tasksOfList(L1)).map((task) => task.id)).toEqual([T102, T101]);

    const memberships = await store.listMemberships();
    expect(memberships.filter((m) => m['task-id'] !== local.id)).toEqual(data.memberships);
    expect(memberships.find((m) => m['task-id'] === local.id)).toMatchObject({ 'list-id': L1 });
    expect(await store.notesOfTask(T101)).toEqual([data.notes[0]]);
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
    data.tasks.push({ ...before.mine, description: 'Changed', 'last-update-time': '2027-01-01T00:00:00.000Z' });

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
  it('reproduces the same data when an export is imported into an empty store in overwrite mode', async () => {
    const home = await store.createList({ name: 'Home', description: '  House chores\n- kitchen\n' });
    const work = await store.createList({ name: 'Work' });
    const old = await store.createList({ name: 'Old' });
    clock.tick();
    const door = await store.createTask({ description: ' Fix door\n  and frame ', 'due-time': '2026-11-08' }, { lists: [home.id, work.id] });
    const lamp = await store.createTask({ description: 'Fix lamp', 'overdue-handling': 'cancel' }, { lists: [home.id, old.id] });
    const solo = await store.createTask({ description: 'No list' });
    clock.tick();
    await store.moveInList(lamp.id, home.id, { before: door.id });
    await store.updateTask(door.id, { status: 'in-progress' });
    const note = await store.addNote(door.id, { text: 'Hinge' });
    clock.tick();
    await store.editNote(note.id, 'Hinge is loose\n\n  top one ');
    await store.addNote(lamp.id, { text: 'Bulb', author: { id: 3, name: 'Ada' } });
    await store.deleteList(old.id);
    await store.deleteTask(solo.id);

    const options = { now: new Date('2026-11-04T12:00:00.000Z'), appVersion: '0.1.0-pre' };
    const text = JSON.stringify(await exportBackup(store, options), null, 2);
    expect((await store.getList(home.id)).description).toBe('  House chores\n- kitchen\n');
    expect((await store.getTask(door.id)).description).toBe('Fix door\n  and frame');

    const { store: target } = await freshStore();
    try {
      const result = await importBackup(target, parseBackup(text), 'overwrite');
      expect(result).toMatchObject(counts({ added: 3 + 3 + 4 + 2 }));
      expect(await target.snapshot()).toEqual(await store.snapshot());
      expect(JSON.stringify(await exportBackup(target, options), null, 2)).toBe(text);
    }
    finally {
      target.close();
    }
  });
});
