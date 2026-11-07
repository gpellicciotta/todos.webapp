import { describe, expect, it } from 'vitest';
import { planConflicts, planDisconnect, planPage, planReset } from '../../src/js/sync/merge.js';

const T0 = '2026-11-04T09:00:00.000Z';
const NOW = new Date('2026-11-05T09:00:00.000Z');

const task = (id, extra = {}) => ({
  id, description: `Task ${id}`, status: 'todo', 'due-time': null, 'overdue-handling': 'keep', 'owner-id': 7,
  'creation-time': T0, 'last-update-time': T0, 'last-activity-time': T0, 'deletion-time': null, revision: 10, ...extra,
});
const list = (id, extra = {}) => ({
  id, name: `List ${id}`, description: '', owner: { id: 7 }, role: 'owner', sharing: [],
  'creation-time': T0, 'last-update-time': T0, 'deletion-time': null, revision: 10, ...extra,
});
const note = (id, taskId, extra = {}) => ({
  id, 'task-id': taskId, 'author-id': 7, text: `Note ${id}`, 'creation-time': T0, 'last-edit-time': T0, revision: 10, ...extra,
});
const membership = (listId, taskId, extra = {}) => ({ 'list-id': listId, 'task-id': taskId, position: 'a0', revision: 10, ...extra });
const empty = () => ({ lists: [], tasks: [], memberships: [], notes: [] });
const feed = (extra = {}) => ({ lists: [], tasks: [], memberships: [], notes: [], tombstones: [], ...extra });
const tombstone = (type, id, extra = {}) => ({ type, id, 'list-id': null, reason: 'purged', revision: 20, time: T0, ...extra });
const entry = (operation, target, fields = {}, extra = {}) => ({ seq: 1, operation, target, fields, 'edit-times': {}, ...extra });
const plan = (data, page, options = {}) => planPage(data, page, { pending: [], userId: 7, final: true, now: NOW, ...options });

/**
 * Apply planned changes to a snapshot, the way `applyChanges` stores them.
 * @param {object} data the snapshot
 * @param {object} changes the planned changes
 * @returns {object} the snapshot after the changes
 */
function applied(data, changes) {
  const result = {
    lists: new Map(data.lists.map((row) => [row.id, row])),
    tasks: new Map(data.tasks.map((row) => [row.id, row])),
    memberships: new Map(data.memberships.map((row) => [`${row['list-id']}/${row['task-id']}`, row])),
    notes: new Map(data.notes.map((row) => [row.id, row])),
  };
  for (const key of changes.delete?.memberships ?? []) {
    result.memberships.delete(key.join('/'));
  }
  for (const key of changes.delete?.notes ?? []) {
    result.notes.delete(key[1]);
  }
  for (const id of changes.delete?.lists ?? []) {
    result.lists.delete(id);
  }
  for (const id of changes.delete?.tasks ?? []) {
    result.tasks.delete(id);
  }
  for (const row of changes.put?.lists ?? []) {
    result.lists.set(row.id, row);
  }
  for (const row of changes.put?.tasks ?? []) {
    result.tasks.set(row.id, row);
  }
  for (const row of changes.put?.memberships ?? []) {
    result.memberships.set(`${row['list-id']}/${row['task-id']}`, row);
  }
  for (const row of changes.put?.notes ?? []) {
    result.notes.set(row.id, row);
  }
  return result;
}

describe('merging a pulled row', () => {
  it('keeps edits to different fields of one task from two devices', () => {
    const local = { ...empty(), tasks: [task('t1', { description: 'Local text', revision: 10 })] };
    const pending = [entry('update-task', { type: 'task', id: 't1' }, { description: 'Local text' })];
    const page = feed({ tasks: [task('t1', { description: 'Old text', status: 'completed', revision: 12 })] });
    const { changes } = plan(local, page, { pending });
    const merged = applied(local, changes).tasks.get('t1');
    expect(merged).toMatchObject({ description: 'Local text', status: 'completed', revision: 12 });
  });

  it('keeps a pending field over the pulled row and takes the other fields', () => {
    const local = { ...empty(), tasks: [task('t1', { status: 'in-progress' })] };
    const pending = [entry('update-task', { type: 'task', id: 't1' }, { status: 'in-progress' })];
    const page = feed({ tasks: [task('t1', { status: 'cancelled', 'due-time': '2026-12-01T10:00:00.000Z', revision: 11 })] });
    const merged = applied(local, plan(local, page, { pending }).changes).tasks.get('t1');
    expect(merged.status).toBe('in-progress');
    expect(merged['due-time']).toBe('2026-12-01T10:00:00.000Z');
  });

  it('keeps a pending trash of a list and a pending membership removal', () => {
    const local = { ...empty(), lists: [list('l1', { 'deletion-time': T0 })], tasks: [task('t1')], memberships: [] };
    const pending = [
      entry('delete-list', { type: 'list', id: 'l1' }, {}, { 'edit-times': { 'deletion-time': T0 } }),
      entry('remove-membership', { type: 'membership', id: 't1', 'list-id': 'l2' }),
    ];
    const page = feed({ lists: [list('l1', { revision: 11 })], memberships: [membership('l2', 't1', { revision: 12 })] });
    const result = applied(local, plan(local, page, { pending }).changes);
    expect(result.lists.get('l1')['deletion-time']).toBe(T0);
    expect(result.memberships.size).toBe(0);
  });

  it('never replaces a row that was not uploaded yet', () => {
    const local = { ...empty(), tasks: [task('t1', { description: 'Draft', revision: undefined })] };
    const pending = [entry('create-task', { type: 'task', id: 't1' }, { description: 'Draft', lists: [] })];
    const page = feed({ tasks: [task('t1', { description: 'Server copy', revision: 30 })] });
    expect(applied(local, plan(local, page, { pending }).changes).tasks.get('t1').description).toBe('Draft');
  });

  it('replaces an uploaded row that has no revision yet', () => {
    const local = { ...empty(), tasks: [task('t1', { description: 'Draft', revision: undefined })] };
    const page = feed({ tasks: [task('t1', { description: 'Server copy', revision: 30 })] });
    expect(applied(local, plan(local, page).changes).tasks.get('t1')).toMatchObject({ description: 'Server copy', revision: 30 });
  });

  it('stores pulled rows without computed fields', () => {
    const page = feed({
      lists: [list('l1', { 'task-count': 4 })],
      tasks: [task('t1', { overdue: true, role: 'owner', lists: [{ 'list-id': 'l1', position: 'a0', revision: 10 }] })],
    });
    const result = applied(empty(), plan(empty(), page).changes);
    expect(result.tasks.get('t1')).not.toHaveProperty('overdue');
    expect(result.tasks.get('t1')).not.toHaveProperty('role');
    expect(result.tasks.get('t1')).not.toHaveProperty('lists');
    expect(result.lists.get('l1')).not.toHaveProperty('task-count');
    expect(result.lists.get('l1')).toMatchObject({ role: 'owner', revision: 10 });
  });

  it('never conflicts notes: each note merges as its own record', () => {
    const local = { ...empty(), tasks: [task('t1')], notes: [note('n1', 't1', { text: 'Mine' }), note('n2', 't1')] };
    const pending = [entry('edit-note', { type: 'note', id: 'n1', 'task-id': 't1' }, { text: 'Mine' })];
    const page = feed({ notes: [note('n1', 't1', { text: 'Theirs', revision: 12 }), note('n2', 't1', { text: 'Changed', revision: 13 }), note('n3', 't1', { revision: 14 })] });
    const result = applied(local, plan(local, page, { pending }).changes);
    expect([...result.notes.values()].map((n) => [n.id, n.text])).toEqual([['n1', 'Mine'], ['n2', 'Changed'], ['n3', 'Note n3']]);
  });

  it('maps the feed note fields to the local note', () => {
    const page = feed({ notes: [note('n1', 't1', { 'last-edit-time': '2026-11-04T10:00:00.000Z' }), note('n2', 't1')] });
    const result = applied(empty(), plan(empty(), page).changes).notes;
    expect(result.get('n1')).toMatchObject({ author: 7, 'edit-time': '2026-11-04T10:00:00.000Z' });
    expect(result.get('n2')['edit-time']).toBeNull();
  });
});

describe('revisions and tombstones', () => {
  it('ignores entries and tombstones at or below the stored revision', () => {
    const local = {
      lists: [list('l1', { revision: 10 })],
      tasks: [task('t1', { revision: 10 })],
      memberships: [membership('l1', 't1', { revision: 10 })],
      notes: [note('n1', 't1', { revision: 10 })],
    };
    const page = feed({
      tasks: [task('t1', { description: 'Stale', revision: 10 })],
      tombstones: [
        tombstone('task', 't1', { revision: 10 }),
        tombstone('list', 'l1', { revision: 9 }),
        tombstone('note', 'n1', { revision: 10 }),
        tombstone('membership', 't1', { 'list-id': 'l1', revision: 10 }),
      ],
    });
    const { changes } = plan(local, page);
    const result = applied(local, changes);
    expect(result.tasks.get('t1').description).toBe('Task t1');
    expect(result.lists.size + result.memberships.size + result.notes.size).toBe(3);
  });

  it('applies tombstones above the stored revision before the entries', () => {
    const local = {
      lists: [list('l1')], tasks: [task('t1'), task('t2')],
      memberships: [membership('l1', 't1'), membership('l1', 't2')], notes: [note('n1', 't1')],
    };
    const page = feed({
      tasks: [task('t1', { description: 'Regained', revision: 8 })],
      tombstones: [tombstone('task', 't1', { revision: 20 }), tombstone('membership', 't2', { 'list-id': 'l1', revision: 21 })],
    });
    const result = applied(local, plan(local, page).changes);
    expect(result.tasks.get('t1').description).toBe('Regained');
    expect(result.notes.size).toBe(0);
    expect([...result.memberships.keys()]).toEqual([]);
  });

  it('removes the memberships of a purged list and the notes of a purged task', () => {
    const local = {
      lists: [list('l1')], tasks: [task('t1')], memberships: [membership('l1', 't1')], notes: [note('n1', 't1')],
    };
    const page = feed({ tombstones: [tombstone('list', 'l1'), tombstone('note', 'n1', { revision: 21 })] });
    const result = applied(local, plan(local, page).changes);
    expect(result.lists.size + result.memberships.size + result.notes.size).toBe(0);
    expect(result.tasks.has('t1')).toBe(true);
  });
});

describe('tasks of other owners', () => {
  const shared = () => ({
    lists: [list('l1', { owner: { id: 9 }, role: 'task-editor' })],
    tasks: [task('theirs', { 'owner-id': 9 }), task('mine', { 'owner-id': 7 }), task('draft', { 'owner-id': null, revision: undefined })],
    memberships: [membership('l1', 'theirs'), membership('l1', 'mine'), membership('l1', 'draft')],
    notes: [note('n1', 'theirs')],
  });

  it('drops orphan tasks only after the last page of a paged feed', () => {
    const local = { ...shared(), memberships: [] };
    const first = plan(local, feed(), { final: false });
    expect(first.dropped.tasks).toEqual([]);
    const last = plan(local, feed(), { final: true });
    expect(last.dropped.tasks).toEqual(['theirs']);
    expect(applied(local, last.changes).notes.size).toBe(0);
  });

  it('keeps a task of another owner that a visible list still holds', () => {
    const local = shared();
    expect(plan(local, feed()).dropped.tasks).toEqual([]);
  });

  it('removes the list and the tasks owned by others when access is lost, keeping own tasks', () => {
    const local = shared();
    const page = feed({ tombstones: [tombstone('list', 'l1', { reason: 'access-lost' })] });
    const outcome = plan(local, page);
    const result = applied(local, outcome.changes);
    expect([...result.tasks.keys()].sort()).toEqual(['draft', 'mine']);
    expect(result.lists.size).toBe(0);
    expect(result.memberships.size).toBe(0);
    expect(outcome.lost).toEqual([{ id: 'l1', name: 'List l1', tasks: ['theirs'] }]);
  });

  it('keeps a lost list task that another visible list holds', () => {
    const local = shared();
    local.lists.push(list('l2'));
    local.memberships.push(membership('l2', 'theirs'));
    const outcome = plan(local, feed({ tombstones: [tombstone('list', 'l1', { reason: 'access-lost' })] }));
    expect(outcome.dropped.tasks).toEqual([]);
  });
});

describe('replayed changes that lost a field', () => {
  it('applies the kept value of a task field', () => {
    const local = { ...empty(), tasks: [task('t1', { description: 'Mine' })] };
    const conflicts = [{ field: 'description', sent: 'Mine', kept: 'Theirs', 'kept-edit-time': T0 }];
    const changes = planConflicts(local, entry('update-task', { type: 'task', id: 't1' }), conflicts, []);
    expect(applied(local, changes).tasks.get('t1').description).toBe('Theirs');
  });

  it('leaves a field that a later queued change still sets', () => {
    const local = { ...empty(), tasks: [task('t1', { description: 'Newer' })] };
    const conflicts = [{ field: 'description', sent: 'Mine', kept: 'Theirs', 'kept-edit-time': T0 }];
    const later = entry('update-task', { type: 'task', id: 't1' }, { description: 'Newer' }, { seq: 2 });
    const changes = planConflicts(local, entry('update-task', { type: 'task', id: 't1' }), conflicts, [later]);
    expect(applied(local, changes).tasks.get('t1').description).toBe('Newer');
  });

  it('applies the kept position of a membership and the kept text of a note', () => {
    const local = { ...empty(), memberships: [membership('l1', 't1', { position: 'a5' })], notes: [note('n1', 't1', { text: 'Mine' })] };
    const moved = planConflicts(local, entry('move-membership', { type: 'membership', id: 't1', 'list-id': 'l1' }),
      [{ field: 'position', 'list-id': 'l1', sent: 'a5', kept: 'a2', 'kept-edit-time': T0 }], []);
    expect(applied(local, moved).memberships.get('l1/t1').position).toBe('a2');
    const edited = planConflicts(local, entry('edit-note', { type: 'note', id: 'n1', 'task-id': 't1' }),
      [{ field: 'text', sent: 'Mine', kept: 'Theirs', 'kept-edit-time': T0 }], []);
    expect(applied(local, edited).notes.get('n1').text).toBe('Theirs');
  });
});

describe('rebuilding after a 410', () => {
  it('drops rows that came from the service and keeps never-uploaded rows', () => {
    const local = {
      lists: [list('l1'), list('local', { owner: null, revision: undefined })],
      tasks: [task('t1'), task('draft', { revision: undefined })],
      memberships: [membership('l1', 't1'), membership('local', 'draft', { revision: undefined })],
      notes: [note('n1', 't1'), note('n2', 'draft', { revision: undefined })],
    };
    const result = applied(local, planReset(local, []));
    expect([...result.lists.keys(), ...result.tasks.keys(), ...result.notes.keys()].sort()).toEqual(['draft', 'local', 'n2']);
    expect([...result.memberships.keys()]).toEqual(['local/draft']);
  });

  it('strips the revision of a row with queued changes, so the snapshot can merge into it', () => {
    const local = { ...empty(), tasks: [task('t1')] };
    const pending = [entry('update-task', { type: 'task', id: 't1' }, { status: 'completed' })];
    const row = applied(local, planReset(local, pending)).tasks.get('t1');
    expect(row.revision).toBeUndefined();
  });
});

describe('disconnecting', () => {
  it('keeps own lists and tasks and removes the rest', () => {
    const local = {
      lists: [list('own'), list('shared', { owner: { id: 9 } }), list('local', { owner: null })],
      tasks: [task('mine'), task('theirs', { 'owner-id': 9 }), task('draft', { 'owner-id': null })],
      memberships: [membership('own', 'mine'), membership('shared', 'theirs'), membership('shared', 'mine')],
      notes: [note('n1', 'theirs'), note('n2', 'mine')],
    };
    const result = applied(local, planDisconnect(local, 7));
    expect([...result.lists.keys()].sort()).toEqual(['local', 'own']);
    expect([...result.tasks.keys()].sort()).toEqual(['draft', 'mine']);
    expect([...result.memberships.keys()]).toEqual(['own/mine']);
    expect([...result.notes.keys()]).toEqual(['n2']);
    expect(result.tasks.get('mine').revision).toBeUndefined();
    expect(result.lists.get('own')).not.toHaveProperty('sharing');
  });
});
