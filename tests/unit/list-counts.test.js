import { describe, expect, it } from 'vitest';
import { countLists, countOf, EMPTY_COUNT } from '../../src/js/core/list-counts.js';

const task = (id, status, activity, extra = {}) => ({ id, status, 'last-activity-time': activity, ...extra });
const member = (taskId, listId) => ({ 'task-id': taskId, 'list-id': listId });

describe('countLists', () => {
  const tasks = [
    task('t1', 'todo', '2026-01-01T10:00:00.000Z'),
    task('t2', 'in-progress', '2026-01-03T10:00:00.000Z'),
    task('t3', 'completed', '2026-01-05T10:00:00.000Z'),
    task('t4', 'cancelled', '2026-01-02T10:00:00.000Z'),
    task('t5', 'todo', '2026-01-04T10:00:00.000Z'),
  ];
  const memberships = [
    member('t1', 'home'), member('t2', 'home'), member('t3', 'home'),
    member('t2', 'work'), member('t4', 'work'),
  ];

  it('gives open, total, and last activity per list', () => {
    const { byList } = countLists(tasks, memberships);
    expect(byList.get('home')).toEqual({ open: 2, total: 3, activity: Date.parse('2026-01-05T10:00:00.000Z') });
    expect(byList.get('work')).toEqual({ open: 1, total: 2, activity: Date.parse('2026-01-03T10:00:00.000Z') });
  });

  it('counts every open task once in all, also when it is in no list or in two lists', () => {
    expect(countLists(tasks, memberships).all).toBe(3);
  });

  it('leaves out lists without memberships', () => {
    expect(countLists(tasks, memberships).byList.has('empty')).toBe(false);
  });

  it('excludes deleted tasks everywhere', () => {
    const withDeleted = [...tasks, task('t6', 'todo', '2026-02-01T10:00:00.000Z', { 'deletion-time': '2026-02-02T10:00:00.000Z' })];
    const counts = countLists(withDeleted, [...memberships, member('t6', 'home')]);
    expect(counts.all).toBe(3);
    expect(counts.byList.get('home')).toEqual({ open: 2, total: 3, activity: Date.parse('2026-01-05T10:00:00.000Z') });
  });

  it('ignores memberships of unknown tasks', () => {
    const counts = countLists(tasks, [member('ghost', 'home')]);
    expect(counts.byList.size).toBe(0);
  });

  it('gives a missing or invalid activity time a null activity', () => {
    const counts = countLists([task('a', 'todo', undefined), task('b', 'todo', 'not a date')], [member('a', 'x'), member('b', 'x')]);
    expect(counts.byList.get('x')).toEqual({ open: 2, total: 2, activity: null });
  });

  it('counts nothing for no tasks', () => {
    const counts = countLists([], []);
    expect(counts.all).toBe(0);
    expect(counts.byList.size).toBe(0);
  });
});

describe('countOf', () => {
  it('reads a list count, or the empty count', () => {
    const counts = countLists([task('a', 'todo', '2026-01-01T00:00:00.000Z')], [member('a', 'x')]);
    expect(countOf(counts, 'x').open).toBe(1);
    expect(countOf(counts, 'none')).toBe(EMPTY_COUNT);
    expect(EMPTY_COUNT).toEqual({ open: 0, total: 0, activity: null });
  });
});

/**
 * Define a property whose reads are counted.
 * @param {object} target the object
 * @param {string} key the property name
 * @param {*} value the property value
 * @param {{reads: number}} counter the counter to raise on each read
 */
function countedProperty(target, key, value, counter) {
  Object.defineProperty(target, key, {
    enumerable: true,
    get() {
      counter.reads += 1;
      return value;
    },
  });
}

describe('countLists at scale', () => {
  it('reads each task and each membership once for 500 lists and 5000 tasks', () => {
    const taskReads = { reads: 0 };
    const membershipReads = { reads: 0 };
    const tasks = [];
    const memberships = [];
    for (let index = 0; index < 5000; index += 1) {
      const record = { id: `t${index}` };
      countedProperty(record, 'status', index % 2 === 0 ? 'todo' : 'completed', taskReads);
      countedProperty(record, 'deletion-time', undefined, taskReads);
      countedProperty(record, 'last-activity-time', new Date(Date.UTC(2026, 0, 1) + index * 1000).toISOString(), taskReads);
      tasks.push(record);
      for (const listIndex of [index % 500, (index * 7 + 1) % 500]) {
        const entry = {};
        countedProperty(entry, 'task-id', record.id, membershipReads);
        countedProperty(entry, 'list-id', `l${listIndex}`, membershipReads);
        memberships.push(entry);
      }
    }
    const counts = countLists(tasks, memberships);
    expect(taskReads.reads).toBeLessThanOrEqual(tasks.length * 3);
    expect(membershipReads.reads).toBeLessThanOrEqual(memberships.length * 2);
    expect(counts.all).toBe(2500);
    expect(counts.byList.size).toBe(500);
    const total = [...counts.byList.values()].reduce((sum, count) => sum + count.total, 0);
    expect(total).toBe(memberships.length);
  });
});
