import { describe, expect, it } from 'vitest';
import { FIND_MAX_LENGTH, findLists, foldText } from '../../src/js/core/list-find.js';

const LISTS = [
  { id: 'a', name: 'Garden', description: 'Plants and tools' },
  { id: 'b', name: 'Café Menu', description: 'Dinner ideas' },
  { id: 'c', name: 'Work', description: 'Quarterly GARDEN party' },
  { id: 'd', name: 'Home' },
];
const idsOf = (lists) => lists.map((list) => list.id);

describe('foldText', () => {
  it('lowercases and drops accents', () => {
    expect(foldText('CAFÉ Ñandú')).toBe('cafe nandu');
  });
});

describe('findLists', () => {
  it('ignores case', () => {
    expect(idsOf(findLists(LISTS, 'gArDeN'))).toEqual(['a']);
  });

  it('ignores accents in the text and in the name', () => {
    expect(idsOf(findLists(LISTS, 'cafe'))).toEqual(['b']);
    expect(idsOf(findLists(LISTS, 'CAFÉ'))).toEqual(['b']);
  });

  it('matches inside a word', () => {
    expect(idsOf(findLists(LISTS, 'rde'))).toEqual(['a']);
    expect(idsOf(findLists(LISTS, 'u'))).toEqual(['b']);
  });

  it('keeps the input order', () => {
    expect(idsOf(findLists(LISTS, 'e'))).toEqual(['a', 'b', 'd']);
    expect(idsOf(findLists([...LISTS].reverse(), 'e'))).toEqual(['d', 'b', 'a']);
  });

  it('returns every list for an empty or blank text, as a new array', () => {
    const all = findLists(LISTS, '');
    expect(idsOf(all)).toEqual(['a', 'b', 'c', 'd']);
    expect(all).not.toBe(LISTS);
    expect(idsOf(findLists(LISTS, '   '))).toEqual(['a', 'b', 'c', 'd']);
  });

  it('trims the text', () => {
    expect(idsOf(findLists(LISTS, '  home  '))).toEqual(['d']);
  });

  it('searches names only by default', () => {
    expect(idsOf(findLists(LISTS, 'dinner'))).toEqual([]);
  });

  it('searches descriptions when asked, and tolerates a missing description', () => {
    expect(idsOf(findLists(LISTS, 'dinner', { descriptions: true }))).toEqual(['b']);
    expect(idsOf(findLists(LISTS, 'garden', { descriptions: true }))).toEqual(['a', 'c']);
    expect(idsOf(findLists(LISTS, 'home', { descriptions: true }))).toEqual(['d']);
  });

  it('returns nothing when no list matches', () => {
    expect(findLists(LISTS, 'zzz')).toEqual([]);
  });

  it('works with the full 100 characters', () => {
    const name = 'N'.repeat(FIND_MAX_LENGTH);
    const lists = [{ id: 'x', name }, { id: 'y', name: 'Other' }];
    expect(FIND_MAX_LENGTH).toBe(100);
    expect(idsOf(findLists(lists, name.toLowerCase()))).toEqual(['x']);
  });
});
