// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest';
import { LIST_SORTS, readListSort, SORT_LABELS, sortLists, writeListSort } from '../../src/js/core/list-sort.js';

// The lists arrive in manual order: Zoo, apple, Mango, Bank, Empty.
const LISTS = [
  { id: 'z', name: 'Zoo' },
  { id: 'a', name: 'apple' },
  { id: 'm', name: 'Mango' },
  { id: 'b', name: 'Bank' },
  { id: 'e', name: 'Empty' },
];
const COUNTS = {
  all: 0,
  byList: new Map([
    ['z', { open: 2, total: 5, activity: 300 }],
    ['a', { open: 5, total: 5, activity: 100 }],
    ['m', { open: 2, total: 2, activity: 300 }],
    ['b', { open: 0, total: 3, activity: 200 }],
  ]),
};
const idsOf = (lists) => lists.map((list) => list.id);

describe('sortLists', () => {
  it('names the four sorts', () => {
    expect(LIST_SORTS).toEqual(['manual', 'name', 'open', 'activity']);
  });

  it('keeps the manual order as a new array', () => {
    const sorted = sortLists(LISTS, 'manual', COUNTS);
    expect(idsOf(sorted)).toEqual(['z', 'a', 'm', 'b', 'e']);
    expect(sorted).not.toBe(LISTS);
  });

  it('treats an unknown sort as manual', () => {
    expect(idsOf(sortLists(LISTS, 'nonsense', COUNTS))).toEqual(['z', 'a', 'm', 'b', 'e']);
  });

  it.each(['__proto__', 'constructor', 'toString', 'hasOwnProperty'])('keeps the manual order for the inherited key %s', (sort) => {
    expect(idsOf(sortLists(LISTS, sort, COUNTS))).toEqual(['z', 'a', 'm', 'b', 'e']);
  });

  it('sorts by name, ignoring case', () => {
    expect(idsOf(sortLists(LISTS, 'name', COUNTS))).toEqual(['a', 'b', 'e', 'm', 'z']);
  });

  it('sorts by open task count, most first, ties in manual order', () => {
    expect(idsOf(sortLists(LISTS, 'open', COUNTS))).toEqual(['a', 'z', 'm', 'b', 'e']);
  });

  it('sorts by last activity, newest first, ties in manual order', () => {
    expect(idsOf(sortLists(LISTS, 'activity', COUNTS))).toEqual(['z', 'm', 'b', 'a', 'e']);
  });

  it('sorts a list without tasks last by activity', () => {
    const counts = { all: 0, byList: new Map([['e', { open: 0, total: 0, activity: null }], ['b', { open: 1, total: 1, activity: 1 }]]) };
    expect(idsOf(sortLists(LISTS, 'activity', counts))).toEqual(['b', 'z', 'a', 'm', 'e']);
  });

  it('breaks name ties in manual order', () => {
    const twins = [{ id: 'x', name: 'Twin' }, { id: 'y', name: 'twin' }];
    expect(idsOf(sortLists(twins, 'name', COUNTS))).toEqual(['x', 'y']);
    expect(idsOf(sortLists([...twins].reverse(), 'name', COUNTS))).toEqual(['y', 'x']);
  });

  it('does not change the input', () => {
    sortLists(LISTS, 'name', COUNTS);
    expect(idsOf(LISTS)).toEqual(['z', 'a', 'm', 'b', 'e']);
  });
});

describe('the stored list sort (`todos.view.lists`, TV-12)', () => {
  afterEach(() => localStorage.clear());

  it('defaults to manual order and reads a stored choice', () => {
    expect(readListSort()).toBe('manual');
    expect(writeListSort('name')).toBe(true);
    expect(JSON.parse(localStorage.getItem('todos.view.lists'))).toEqual({ sort: 'name' });
    expect(readListSort()).toBe('name');
  });

  it('falls back to manual order for an unknown or corrupt entry', () => {
    localStorage.setItem('todos.view.lists', JSON.stringify({ sort: 'constructor' }));
    expect(readListSort()).toBe('manual');
    localStorage.setItem('todos.view.lists', '{broken');
    expect(readListSort()).toBe('manual');
  });

  it('forgets the entry when the sort is manual order', () => {
    writeListSort('open');
    writeListSort('manual');
    expect(localStorage.getItem('todos.view.lists')).toBeNull();
  });

  it('names every sort for the menu and the info line', () => {
    expect(LIST_SORTS.map((sort) => SORT_LABELS[sort].menu)).toEqual(['Manual order', 'Name (A to Z)', 'Open tasks (most first)', 'Last update (newest first)']);
    expect(LIST_SORTS.map((sort) => SORT_LABELS[sort].short)).toEqual(['Manual order', 'Name', 'Open tasks', 'Last update']);
  });
});
