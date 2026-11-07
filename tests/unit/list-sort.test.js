import { describe, expect, it } from 'vitest';
import { LIST_SORTS, sortLists } from '../../src/js/core/list-sort.js';

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
