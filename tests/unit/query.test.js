import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { isOverdue } from '../../src/js/core/overdue.js';
import { freshStore } from './store-helpers.js';
import {
  DEFAULT_FILTER,
  DEFAULT_ORDER,
  filterTasks,
  indexMemberships,
  NO_LIST,
  positionsOfList,
  sortByPosition,
  sortTasks,
} from '../../src/js/core/query.js';

// Wednesday 2026-11-04 12:00 local time.
const NOW = new Date(2026, 10, 4, 12, 0, 0);
const HOME = '019a4e00-0000-7000-8000-00000000000a';
const WORK = '019a4e00-0000-7000-8000-00000000000b';

/**
 * Build a task record with defaults for the fields a test leaves out.
 * @param {string} id the task identifier
 * @param {object} [fields] overriding fields
 * @returns {object} the task
 */
function task(id, fields = {}) {
  return {
    id,
    description: `Task ${id}`,
    status: 'todo',
    'due-time': null,
    'overdue-handling': 'keep',
    'owner-id': null,
    'creation-time': '2026-11-01T09:00:00.000Z',
    'last-update-time': '2026-11-01T09:00:00.000Z',
    'last-activity-time': '2026-11-01T09:00:00.000Z',
    'deletion-time': null,
    ...fields,
  };
}

/**
 * Return a local time as an ISO string.
 * @param {...number} parts year, month index, day, and optional hours and minutes
 * @returns {string} the ISO string
 */
function local(...parts) {
  return new Date(...parts).toISOString();
}

/**
 * Return the identifiers of tasks.
 * @param {object[]} tasks the tasks
 * @returns {string[]} their identifiers
 */
function ids(tasks) {
  return tasks.map((t) => t.id);
}

const tasks = [
  task('t1', { description: 'Buy paint', status: 'todo', 'due-time': local(2026, 10, 3, 18) }),
  task('t2', { description: 'call plumber', status: 'in-progress', 'due-time': local(2026, 10, 4, 18) }),
  task('t3', { description: 'Fix door', status: 'completed', 'due-time': local(2026, 10, 2, 18) }),
  task('t4', { description: 'Pay rent', status: 'cancelled', 'due-time': local(2026, 10, 8, 23, 59) }),
  task('t5', { description: 'Read book', status: 'todo', 'due-time': local(2026, 10, 10, 9) }),
  task('t6', { description: 'Water plants', status: 'todo', 'creation-time': '2026-10-20T09:00:00.000Z' }),
];

const ctx = {
  now: NOW,
  listsByTask: new Map([['t1', [HOME]], ['t2', [WORK]], ['t3', [HOME, WORK]], ['t5', [HOME]]]),
  notesByTask: new Map([['t5', ['Borrowed from Anna']], ['t6', ['Use the RAIN barrel']]]),
  sharedListIds: new Set([WORK]),
};

describe('filterTasks', () => {
  it('returns every task for an empty filter, in the input order', () => {
    expect(ids(filterTasks(tasks, {}, ctx))).toEqual(['t1', 't2', 't3', 't4', 't5', 't6']);
  });

  it('filters by any of several statuses', () => {
    expect(ids(filterTasks(tasks, { statuses: ['completed', 'cancelled'] }, ctx))).toEqual(['t3', 't4']);
  });

  it('defaults to the open statuses', () => {
    expect(DEFAULT_FILTER).toEqual({ statuses: ['todo', 'in-progress'] });
    expect(ids(filterTasks(tasks, DEFAULT_FILTER, ctx))).toEqual(['t1', 't2', 't5', 't6']);
  });

  it('filters by any of several lists', () => {
    expect(ids(filterTasks(tasks, { lists: [WORK] }, ctx))).toEqual(['t2', 't3']);
    expect(ids(filterTasks(tasks, { lists: [HOME, WORK] }, ctx))).toEqual(['t1', 't2', 't3', 't5']);
  });

  it('filters tasks in no list, alone or with lists', () => {
    expect(ids(filterTasks(tasks, { lists: [NO_LIST] }, ctx))).toEqual(['t4', 't6']);
    expect(ids(filterTasks(tasks, { lists: [NO_LIST, WORK] }, ctx))).toEqual(['t2', 't3', 't4', 't6']);
  });

  it('combines filters with AND', () => {
    expect(ids(filterTasks(tasks, { lists: [HOME], statuses: ['todo'] }, ctx))).toEqual(['t1', 't5']);
    expect(ids(filterTasks(tasks, { lists: [HOME], statuses: ['todo'], text: 'anna' }, ctx))).toEqual(['t5']);
    expect(filterTasks(tasks, { lists: [WORK], statuses: ['cancelled'] }, ctx)).toEqual([]);
  });

  it('treats a task as overdue only when its due time passed and it is open', () => {
    expect(ids(filterTasks(tasks, { due: ['overdue'] }, ctx))).toEqual(['t1']);
  });

  it('filters by due today and due this week, weeks starting on Monday', () => {
    expect(ids(filterTasks(tasks, { due: ['today'] }, ctx))).toEqual(['t2']);
    expect(ids(filterTasks(tasks, { due: ['this-week'] }, ctx))).toEqual(['t1', 't2', 't3', 't4']);
    expect(ids(filterTasks(tasks, { due: ['this-week'] }, { ...ctx, weekStart: 0 }))).toEqual(['t1', 't2', 't3']);
  });

  it('filters tasks without a due time', () => {
    expect(ids(filterTasks(tasks, { due: ['none'] }, ctx))).toEqual(['t6']);
  });

  it('filters by a due range with inclusive date-only bounds', () => {
    expect(ids(filterTasks(tasks, { due: [{ from: '2026-11-04', to: '2026-11-08' }] }, ctx))).toEqual(['t2', 't4']);
    expect(ids(filterTasks(tasks, { due: [{ from: '2026-11-09' }] }, ctx))).toEqual(['t5']);
    expect(ids(filterTasks(tasks, { due: [{ to: local(2026, 10, 3, 18) }] }, ctx))).toEqual(['t1', 't3']);
  });

  it('matches any of several due options', () => {
    expect(ids(filterTasks(tasks, { due: ['overdue', 'none'] }, ctx))).toEqual(['t1', 't6']);
  });

  it('filters by a creation range', () => {
    const created = { from: new Date(2026, 9, 19), to: new Date(2026, 9, 21) };
    expect(ids(filterTasks(tasks, { created }, ctx))).toEqual(['t6']);
    expect(ids(filterTasks(tasks, { created: { from: '2026-10-25' } }, ctx))).toEqual(['t1', 't2', 't3', 't4', 't5']);
  });

  it('searches description and notes, ignoring case and surrounding spaces', () => {
    expect(ids(filterTasks(tasks, { text: '  CALL ' }, ctx))).toEqual(['t2']);
    expect(ids(filterTasks(tasks, { text: 'rain' }, ctx))).toEqual(['t6']);
    expect(ids(filterTasks(tasks, { text: 'p' }, ctx))).toEqual(['t1', 't2', 't4', 't6']);
    expect(ids(filterTasks(tasks, { text: '   ' }, ctx))).toHaveLength(6);
  });

  it('filters shared and not shared tasks', () => {
    expect(ids(filterTasks(tasks, { shared: true }, ctx))).toEqual(['t2', 't3']);
    expect(ids(filterTasks(tasks, { shared: false }, ctx))).toEqual(['t1', 't4', 't5', 't6']);
  });

  it('works without memberships, notes, or shared lists in the context', () => {
    expect(ids(filterTasks(tasks, { lists: [NO_LIST], shared: false, text: 'rent' }, { now: NOW }))).toEqual(['t4']);
  });

  it('agrees with isOverdue, including a due time equal to now', () => {
    const edge = [
      task('e1', { 'due-time': NOW.toISOString() }),
      task('e2', { 'due-time': new Date(NOW.getTime() - 1).toISOString(), status: 'in-progress' }),
      task('e3', { 'due-time': new Date(NOW.getTime() - 1).toISOString(), status: 'cancelled' }),
    ];
    const expected = [...tasks, ...edge].filter((t) => isOverdue(t, NOW)).map((t) => t.id);
    expect(ids(filterTasks([...tasks, ...edge], { due: ['overdue'] }, ctx))).toEqual(expected);
    expect(expected).toEqual(['t1', 'e2']);
  });

  it('bounds today by local midnight on both sides', () => {
    const edge = [
      task('d1', { 'due-time': local(2026, 10, 4, 0, 0) }),
      task('d2', { 'due-time': new Date(new Date(2026, 10, 5).getTime() - 1).toISOString() }),
      task('d3', { 'due-time': local(2026, 10, 5, 0, 0) }),
      task('d4', { 'due-time': new Date(new Date(2026, 10, 4).getTime() - 1).toISOString() }),
    ];
    expect(ids(filterTasks(edge, { due: ['today'] }, ctx))).toEqual(['d1', 'd2']);
  });

  it('bounds this week from Monday midnight to the next Monday midnight', () => {
    const edge = [
      task('w1', { 'due-time': local(2026, 10, 2, 0, 0) }),
      task('w2', { 'due-time': new Date(new Date(2026, 10, 9).getTime() - 1).toISOString() }),
      task('w3', { 'due-time': local(2026, 10, 9, 0, 0) }),
      task('w4', { 'due-time': new Date(new Date(2026, 10, 2).getTime() - 1).toISOString() }),
    ];
    expect(ids(filterTasks(edge, { due: ['this-week'] }, ctx))).toEqual(['w1', 'w2']);
  });

  it('rejects an unknown due option and an invalid range bound', () => {
    expect(() => filterTasks(tasks, { due: ['soon'] }, ctx)).toThrow(RangeError);
    expect(() => filterTasks(tasks, { due: [{ from: 'tomorrow' }] }, ctx)).toThrow(RangeError);
  });

  it('searches every note of a task, given as a list or as one string, ignoring case', () => {
    const notesByTask = new Map([['t1', ['First note', 'Ask about PRIMER']], ['t3', 'Hinge is LOOSE']]);
    expect(ids(filterTasks(tasks, { text: 'primer' }, { ...ctx, notesByTask }))).toEqual(['t1']);
    expect(ids(filterTasks(tasks, { text: 'Loose' }, { ...ctx, notesByTask }))).toEqual(['t3']);
    expect(ids(filterTasks(tasks, { text: 'BUY' }, { ...ctx, notesByTask }))).toEqual(['t1']);
  });
});

describe('sortTasks', () => {
  it('defaults to due time ascending', () => {
    expect(DEFAULT_ORDER).toEqual({ field: 'due-time', direction: 'asc' });
    expect(ids(sortTasks(tasks))).toEqual(['t3', 't1', 't2', 't4', 't5', 't6']);
  });

  it('puts tasks without a due time last in both directions', () => {
    const mixed = [task('a'), ...tasks, task('0')];
    expect(ids(sortTasks(mixed, { field: 'due-time', direction: 'asc' })))
      .toEqual(['t3', 't1', 't2', 't4', 't5', '0', 'a', 't6']);
    expect(ids(sortTasks(mixed, { field: 'due-time', direction: 'desc' })))
      .toEqual(['t5', 't4', 't2', 't1', 't3', 't6', 'a', '0']);
  });

  it('sorts by creation and last activity time', () => {
    const list = [
      task('x', { 'creation-time': '2026-11-02T00:00:00.000Z', 'last-activity-time': '2026-11-03T00:00:00.000Z' }),
      task('y', { 'creation-time': '2026-11-01T00:00:00.000Z', 'last-activity-time': '2026-11-05T00:00:00.000Z' }),
      task('z', { 'creation-time': '2026-11-03T00:00:00.000Z', 'last-activity-time': '2026-11-04T00:00:00.000Z' }),
    ];
    expect(ids(sortTasks(list, { field: 'creation-time', direction: 'asc' }))).toEqual(['y', 'x', 'z']);
    expect(ids(sortTasks(list, { field: 'creation-time', direction: 'desc' }))).toEqual(['z', 'x', 'y']);
    expect(ids(sortTasks(list, { field: 'last-activity-time', direction: 'desc' }))).toEqual(['y', 'z', 'x']);
  });

  it('sorts by status in lifecycle order', () => {
    expect(ids(sortTasks(tasks, { field: 'status', direction: 'asc' }))).toEqual(['t1', 't5', 't6', 't2', 't3', 't4']);
    expect(ids(sortTasks(tasks, { field: 'status', direction: 'desc' }))).toEqual(['t4', 't3', 't2', 't6', 't5', 't1']);
  });

  it('sorts by description, ignoring case', () => {
    expect(ids(sortTasks(tasks, { field: 'description', direction: 'asc' }))).toEqual(['t1', 't2', 't3', 't4', 't5', 't6']);
    expect(ids(sortTasks(tasks, { field: 'description', direction: 'desc' }))).toEqual(['t6', 't5', 't4', 't3', 't2', 't1']);
  });

  it('breaks ties on the task identifier', () => {
    const same = [task('c'), task('a'), task('b')];
    expect(ids(sortTasks(same, { field: 'creation-time', direction: 'asc' }))).toEqual(['a', 'b', 'c']);
    expect(ids(sortTasks(same, { field: 'creation-time', direction: 'desc' }))).toEqual(['c', 'b', 'a']);
  });

  it('leaves the input array unchanged', () => {
    const input = [...tasks];
    sortTasks(input, { field: 'description', direction: 'desc' });
    expect(input).toEqual(tasks);
  });

  it('rejects an unknown field or direction', () => {
    expect(() => sortTasks(tasks, { field: 'owner', direction: 'asc' })).toThrow(RangeError);
    expect(() => sortTasks(tasks, { field: 'status', direction: 'up' })).toThrow(RangeError);
  });
});

describe('manual order', () => {
  const memberships = [
    { 'list-id': HOME, 'task-id': 't1', position: 'a1' },
    { 'list-id': HOME, 'task-id': 't3', position: 'a0V' },
    { 'list-id': HOME, 'task-id': 't5', position: 'Zz' },
    { 'list-id': WORK, 'task-id': 't3', position: 'a0' },
    { 'list-id': WORK, 'task-id': 't2', position: 'a1' },
  ];

  it('indexes list identifiers by task', () => {
    const index = indexMemberships(memberships);
    expect(index.get('t3')).toEqual([HOME, WORK]);
    expect(index.get('t4')).toBeUndefined();
  });

  it('sorts the tasks of a list by position, unplaced tasks last by identifier', () => {
    const positions = positionsOfList(memberships, HOME);
    expect(positions.size).toBe(3);
    expect(positions.get('t3')).toBe('a0V');
    expect(ids(sortByPosition(tasks, positions))).toEqual(['t5', 't3', 't1', 't2', 't4', 't6']);
    expect(ids(sortByPosition(tasks, positionsOfList(memberships, WORK))).slice(0, 2)).toEqual(['t3', 't2']);
  });

  it('skips memberships of lists outside the given live lists', () => {
    const index = indexMemberships(memberships, [HOME]);
    expect(index.get('t3')).toEqual([HOME]);
    expect(index.get('t2')).toBeUndefined();
    const listsByTask = indexMemberships(memberships, new Set([HOME]));
    expect(ids(filterTasks(tasks, { lists: [NO_LIST] }, { ...ctx, listsByTask }))).toEqual(['t2', 't4', 't6']);
  });
});

describe('queries over the local store', () => {
  let store;
  let clock;

  beforeEach(async () => {
    ({ store, clock } = await freshStore());
  });

  afterEach(() => {
    store.close();
  });

  /**
   * Build the query context from the store, the way a view does.
   * @returns {Promise<object>} the tasks and the context
   */
  async function load() {
    const live = await store.listLists();
    const memberships = await store.listMemberships();
    const all = await store.listTasks();
    const notesByTask = new Map();
    for (const t of all) {
      notesByTask.set(t.id, (await store.notesOfTask(t.id)).map((note) => note.text));
    }
    const listsByTask = indexMemberships(memberships, live.map((list) => list.id));
    return { all, memberships, ctx: { now: new Date(clock.now), listsByTask, notesByTask } };
  }

  it('matches the store manual order and leaves out deleted tasks and lists', async () => {
    const home = await store.createList({ name: 'Home' });
    const attic = await store.createList({ name: 'Attic' });
    const a = await store.createTask({ description: 'Sand the door' }, { lists: [home.id] });
    const b = await store.createTask({ description: 'Buy paint' }, { lists: [home.id, attic.id] });
    const c = await store.createTask({ description: 'Sort boxes' }, { lists: [attic.id] });
    const gone = await store.createTask({ description: 'Paint the fence' }, { lists: [home.id] });
    await store.addNote(c.id, { text: 'Mostly PAINT cans' });
    await store.moveInList(b.id, home.id, { before: a.id });
    await store.deleteTask(gone.id);
    await store.deleteList(attic.id);

    const { all, memberships, ctx } = await load();
    const inHome = filterTasks(all, { lists: [home.id] }, ctx);
    expect(ids(sortByPosition(inHome, positionsOfList(memberships, home.id)))).toEqual([b.id, a.id]);
    expect(ids(await store.tasksOfList(home.id))).toEqual([b.id, a.id]);
    expect(ids(filterTasks(all, { lists: [NO_LIST] }, ctx))).toEqual([c.id]);
    expect(ids(filterTasks(all, { text: 'paint' }, ctx))).toEqual([b.id, c.id]);
  });
});

describe('performance', () => {
  it('filters and sorts 5000 tasks in under 50 ms', () => {
    const statuses = ['todo', 'in-progress', 'completed', 'cancelled'];
    const words = ['paint', 'plumber', 'door', 'rent', 'book', 'plants', 'garden', 'report'];
    const many = [];
    const listsByTask = new Map();
    const notesByTask = new Map();
    for (let i = 0; i < 5000; i++) {
      const id = `019a4e00-0000-7000-8000-${String(i).padStart(12, '0')}`;
      many.push(task(id, {
        description: `${words[i % words.length]} task number ${i}`,
        status: statuses[i % 4],
        'due-time': i % 5 === 0 ? null : new Date(NOW.getTime() + (i - 2500) * 3_600_000).toISOString(),
        'creation-time': new Date(NOW.getTime() - i * 60_000).toISOString(),
      }));
      if (i % 3 !== 0) {
        listsByTask.set(id, i % 2 === 0 ? [HOME] : [HOME, WORK]);
      }
      if (i % 4 === 0) {
        notesByTask.set(id, [`Note about ${words[(i + 3) % words.length]}`, 'Second note']);
      }
    }
    const perfCtx = { now: NOW, listsByTask, notesByTask, sharedListIds: new Set([WORK]) };
    const filter = { lists: [HOME, NO_LIST], statuses: ['todo', 'in-progress'], due: ['overdue', 'this-week', 'none'], text: 'p' };
    const run = () => sortTasks(filterTasks(many, filter, perfCtx), DEFAULT_ORDER);

    run();
    const start = performance.now();
    const result = run();
    const elapsed = performance.now() - start;

    expect(result.length).toBeGreaterThan(0);
    expect(elapsed, `took ${elapsed.toFixed(1)} ms`).toBeLessThan(50);
    console.log(`filter+sort of 5000 tasks: ${elapsed.toFixed(1)} ms, ${result.length} results`);
  });
});
