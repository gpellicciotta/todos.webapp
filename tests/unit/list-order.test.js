import { describe, expect, it, vi } from 'vitest';
import {
  applyListOrder, LIST_ORDER_KEY, moveList, moveListTo, onListOrderChange, readListOrder, writeListOrder,
} from '../../src/js/core/list-order.js';
import { PREFIX } from '../../src/js/core/preferences.js';

/**
 * Create an in-memory storage stand-in.
 * @returns {Storage} the storage
 */
function memoryStorage() {
  const data = new Map();
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, String(value)),
    removeItem: (key) => data.delete(key),
  };
}

const LISTS = [{ id: 'g', name: 'Garden' }, { id: 'h', name: 'Home' }, { id: 'w', name: 'Work' }];
const idsOf = (lists) => lists.map((list) => list.id);

describe('applyListOrder', () => {
  it('places the stored identifiers first, in stored order', () => {
    expect(idsOf(applyListOrder(LISTS, ['w', 'g', 'h']))).toEqual(['w', 'g', 'h']);
  });

  it('drops unknown and repeated identifiers', () => {
    expect(idsOf(applyListOrder(LISTS, ['x', 'h', 'h', 'w', 'y']))).toEqual(['h', 'w', 'g']);
  });

  it('appends unlisted lists at the end in name order', () => {
    const lists = [...LISTS, { id: 'a', name: 'apples' }, { id: 'b', name: 'Books' }];
    expect(idsOf(applyListOrder(lists, ['w', 'h']))).toEqual(['w', 'h', 'a', 'b', 'g']);
  });

  it('falls back to name order for an empty or missing order and leaves its input alone', () => {
    const shuffled = [LISTS[2], LISTS[0], LISTS[1]];
    expect(idsOf(applyListOrder(shuffled, []))).toEqual(['g', 'h', 'w']);
    expect(idsOf(applyListOrder(shuffled, undefined))).toEqual(['g', 'h', 'w']);
    expect(idsOf(shuffled)).toEqual(['w', 'g', 'h']);
  });
});

describe('moveList and moveListTo', () => {
  const IDS = ['a', 'b', 'c'];

  it('shifts a list one place up or down', () => {
    expect(moveList(IDS, 'b', -1)).toEqual(['b', 'a', 'c']);
    expect(moveList(IDS, 'b', 1)).toEqual(['a', 'c', 'b']);
  });

  it('clamps at both ends and ignores an unknown list', () => {
    expect(moveList(IDS, 'a', -1)).toEqual(IDS);
    expect(moveList(IDS, 'c', 1)).toEqual(IDS);
    expect(moveList(IDS, 'x', 1)).toEqual(IDS);
  });

  it('moves a list to an index, clamped to the ends', () => {
    expect(moveListTo(IDS, 'a', 2)).toEqual(['b', 'c', 'a']);
    expect(moveListTo(IDS, 'c', 0)).toEqual(['c', 'a', 'b']);
    expect(moveListTo(IDS, 'a', 9)).toEqual(['b', 'c', 'a']);
    expect(moveListTo(IDS, 'c', -4)).toEqual(['c', 'a', 'b']);
  });

  it('does not change its input', () => {
    moveList(IDS, 'b', 1);
    expect(IDS).toEqual(['a', 'b', 'c']);
  });
});

describe('the stored list order', () => {
  it('round-trips through the device preference', () => {
    const storage = memoryStorage();
    expect(readListOrder(() => storage)).toEqual([]);
    expect(writeListOrder(['w', 'g'], () => storage)).toBe(true);
    expect(JSON.parse(storage.getItem(`${PREFIX}${LIST_ORDER_KEY}`))).toEqual(['w', 'g']);
    expect(readListOrder(() => storage)).toEqual(['w', 'g']);
  });

  it('ignores corrupt stored values', () => {
    const storage = memoryStorage();
    storage.setItem(`${PREFIX}${LIST_ORDER_KEY}`, '{not json');
    expect(readListOrder(() => storage)).toEqual([]);
    storage.setItem(`${PREFIX}${LIST_ORDER_KEY}`, JSON.stringify({ a: 1 }));
    expect(readListOrder(() => storage)).toEqual([]);
    storage.setItem(`${PREFIX}${LIST_ORDER_KEY}`, JSON.stringify(['a', 3, null, '', 'b']));
    expect(readListOrder(() => storage)).toEqual(['a', 'b']);
  });

  it('survives storage that throws', () => {
    const blocked = () => {
      throw new Error('blocked');
    };
    expect(readListOrder(blocked)).toEqual([]);
    expect(writeListOrder(['a'], blocked)).toBe(false);
  });

  it('tells listeners about a write until they unsubscribe', () => {
    const storage = memoryStorage();
    const listener = vi.fn();
    const unsubscribe = onListOrderChange(listener);
    writeListOrder(['a', 'b'], () => storage);
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
    writeListOrder(['b', 'a'], () => storage);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('does not notify when the write fails', () => {
    const listener = vi.fn();
    const unsubscribe = onListOrderChange(listener);
    writeListOrder(['a'], () => {
      throw new Error('blocked');
    });
    unsubscribe();
    expect(listener).not.toHaveBeenCalled();
  });
});
