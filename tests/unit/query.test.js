import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { isOverdue } from '../../src/js/core/overdue.js';
import { freshStore } from './store-helpers.js';
import {
  DEFAULT_FILTER,
  clearFilters,
  DEFAULT_ORDER,
  exactMatchIndex,
  filterTasks,
  GROUPINGS,
  groupTasks,
  hidingFilters,
  indexMemberships,
  NO_LIST,
  normalizeDescription,
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
  it('defaults to creation time descending, so a new task comes first', () => {
    expect(DEFAULT_ORDER).toEqual({ field: 'creation-time', direction: 'desc' });
    const created = [
      task('a', { 'creation-time': '2026-11-01T09:00:00.000Z' }),
      task('c', { 'creation-time': '2026-11-03T09:00:00.000Z' }),
      task('b', { 'creation-time': '2026-11-02T09:00:00.000Z' }),
    ];
    expect(ids(sortTasks(created))).toEqual(['c', 'b', 'a']);
  });

  it('sorts by due time ascending when asked', () => {
    expect(ids(sortTasks(tasks, { field: 'due-time', direction: 'asc' }))).toEqual(['t3', 't1', 't2', 't4', 't5', 't6']);
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

describe('exact match and hidden task helpers', () => {
  it('normalizes a description by case and surrounding spaces', () => {
    expect(normalizeDescription('  Buy PAINT ')).toBe('buy paint');
  });

  it('indexes the normalized descriptions of tasks', () => {
    const index = exactMatchIndex([task('a', { description: 'Buy paint' }), task('b', { description: ' Call Dana ' })]);
    expect(index.has(normalizeDescription('  BUY paint '))).toBe(true);
    expect(index.has(normalizeDescription('paint'))).toBe(false);
  });

  it('names the filters that hide a task, each tested alone', () => {
    const fresh = task('n', { 'creation-time': '2026-11-04T12:00:00.000Z' });
    const filter = { statuses: ['completed'], due: ['today'], created: { from: '2026-11-01' }, text: 'x' };
    expect(hidingFilters(fresh, filter, { now: NOW })).toEqual(['statuses', 'due']);
    expect(hidingFilters(fresh, DEFAULT_FILTER, { now: NOW })).toEqual([]);
  });

  it('clears the named filters, restoring the default statuses', () => {
    const filter = { statuses: ['completed'], due: ['today'], lists: [HOME] };
    expect(clearFilters(filter, ['statuses', 'due'])).toEqual({ statuses: ['todo', 'in-progress'], lists: [HOME] });
    expect(filter.due).toEqual(['today']);
  });
});

describe('groupTasks (VO-9 to VO-12)', () => {
  const summary = (groups) => groups.map((group) => [group.key, ids(group.tasks)]);

  it('groups by status in lifecycle order and hides empty groups', () => {
    const groups = groupTasks(tasks, 'status', ctx);
    expect(summary(groups)).toEqual([['todo', ['t1', 't5', 't6']], ['in-progress', ['t2']], ['completed', ['t3']], ['cancelled', ['t4']]]);
    expect(groups.map((group) => group.label)).toEqual(['To do', 'In progress', 'Completed', 'Cancelled']);
    expect(summary(groupTasks(filterTasks(tasks, DEFAULT_FILTER, ctx), 'status', ctx))).toEqual([['todo', ['t1', 't5', 't6']], ['in-progress', ['t2']]]);
  });

  it('groups by due date from a fixed clock: Overdue, Today, Tomorrow, This week, Later, No due date', () => {
    const dated = [
      task('late', { 'due-time': local(2026, 10, 3, 18) }),
      task('now', { 'due-time': local(2026, 10, 4, 18) }),
      task('next', { 'due-time': local(2026, 10, 5, 9) }),
      task('sunday', { 'due-time': local(2026, 10, 8, 23, 59) }),
      task('week', { 'due-time': local(2026, 10, 6, 9) }),
      task('far', { 'due-time': local(2026, 10, 9, 9) }),
      task('open'),
    ];
    const groups = groupTasks(dated, 'due', { now: NOW });
    expect(summary(groups)).toEqual([
      ['overdue', ['late']], ['today', ['now']], ['tomorrow', ['next']], ['this-week', ['sunday', 'week']],
      ['later', ['far']], ['no-due', ['open']],
    ]);
    expect(groups.map((group) => group.label)).toEqual(['Overdue', 'Today', 'Tomorrow', 'This week', 'Later', 'No due date']);
  });

  it('keeps an overdue task in Overdue only while it is open, and a finished past task in Earlier', () => {
    const past = [
      task('open', { 'due-time': local(2026, 10, 4, 9) }),
      task('done', { status: 'completed', 'due-time': local(2026, 10, 4, 9) }),
      task('old', { status: 'completed', 'due-time': local(2026, 10, 1, 9) }),
    ];
    expect(summary(groupTasks(past, 'due', { now: NOW }))).toEqual([['overdue', ['open']], ['earlier', ['old']], ['today', ['done']]]);
  });

  it('follows the first day of the week for This week', () => {
    const friday = task('fri', { 'due-time': local(2026, 10, 6, 9) });
    expect(summary(groupTasks([friday], 'due', { now: NOW, weekStart: 4 }))).toEqual([['later', ['fri']]]);
    expect(summary(groupTasks([friday], 'due', { now: NOW, weekStart: 1 }))).toEqual([['this-week', ['fri']]]);
  });

  it('groups by list in the given list order, repeating a multi-list task and putting list-less tasks last', () => {
    const lists = [{ id: WORK, name: 'Work' }, { id: HOME, name: 'Home' }];
    const groups = groupTasks(tasks, 'list', { ...ctx, lists });
    expect(summary(groups)).toEqual([[WORK, ['t2', 't3']], [HOME, ['t1', 't3', 't5']], [NO_LIST, ['t4', 't6']]]);
    expect(groups.map((group) => group.label)).toEqual(['Work', 'Home', 'No list']);
  });

  it('accepts the lists as a map and leaves out lists without tasks', () => {
    const lists = new Map([[WORK, { id: WORK, name: 'Work' }], [HOME, { id: HOME, name: 'Home' }]]);
    expect(summary(groupTasks([tasks[0]], 'list', { ...ctx, lists }))).toEqual([[HOME, ['t1']]]);
  });

  it('keeps the input order inside each group, so sort applies per group', () => {
    const sorted = sortTasks(tasks, { field: 'description', direction: 'desc' });
    expect(summary(groupTasks(sorted, 'status', ctx))[0]).toEqual(['todo', ['t6', 't5', 't1']]);
  });

  it('never changes its input and rejects an unknown grouping', () => {
    const copy = structuredClone(tasks);
    groupTasks(tasks, 'status', ctx);
    expect(tasks).toEqual(copy);
    expect(() => groupTasks(tasks, 'color', ctx)).toThrow(RangeError);
    expect(GROUPINGS).toEqual(['none', 'list', 'due', 'status']);
  });

  it('groups 5000 tasks by list quickly', () => {
    const many = Array.from({ length: 5000 }, (_, index) => task(`m${index}`));
    const lists = [{ id: HOME, name: 'Home' }, { id: WORK, name: 'Work' }];
    const listsByTask = new Map(many.map((item, index) => [item.id, index % 3 === 0 ? [] : [lists[index % 2].id]]));
    const start = performance.now();
    const groups = groupTasks(many, 'list', { now: NOW, lists, listsByTask });
    const elapsed = performance.now() - start;
    expect(groups.reduce((sum, group) => sum + group.tasks.length, 0)).toBe(5000);
    expect(elapsed, `took ${elapsed.toFixed(1)} ms`).toBeLessThan(50);
  });
});
