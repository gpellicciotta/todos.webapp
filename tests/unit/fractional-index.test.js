import { describe, expect, it } from 'vitest';
import { keyBetween, keysBetween, MAX_KEY_LENGTH } from '../../src/js/lib/fractional-index.js';

/**
 * Assert that keys sort strictly ascending by code unit order.
 * @param {string[]} keys the keys
 */
function expectStrictlySorted(keys) {
  for (let i = 1; i < keys.length; i++) {
    expect(keys[i - 1] < keys[i], `${keys[i - 1]} < ${keys[i]}`).toBe(true);
  }
}

describe('keyBetween', () => {
  // Base-62 vectors from rocicorp/fractional-indexing src/test.js (MIT),
  // cross-checked against the service's FractionalIndex.java, which yields the same keys.
  it.each([
    [null, null, 'a0'],
    [null, 'a0', 'Zz'],
    [null, 'Zz', 'Zy'],
    ['a0', null, 'a1'],
    ['a1', null, 'a2'],
    ['a0', 'a1', 'a0V'],
    ['a1', 'a2', 'a1V'],
    ['a0V', 'a1', 'a0l'],
    ['Zz', 'a0', 'ZzV'],
    ['Zz', 'a1', 'a0'],
    [null, 'Y00', 'Xzzz'],
    ['bzz', null, 'c000'],
    ['a0', 'a0V', 'a0G'],
    ['a0', 'a0G', 'a08'],
    ['b125', 'b129', 'b127'],
    ['a0', 'a1V', 'a1'],
    ['Zz', 'a01', 'a0'],
    [null, 'a0V', 'a0'],
    [null, 'b999', 'b99'],
    [null, 'A000000000000000000000000001', 'A000000000000000000000000000V'],
    ['zzzzzzzzzzzzzzzzzzzzzzzzzzy', null, 'zzzzzzzzzzzzzzzzzzzzzzzzzzz'],
    ['zzzzzzzzzzzzzzzzzzzzzzzzzzz', null, 'zzzzzzzzzzzzzzzzzzzzzzzzzzzV'],
    ['az', null, 'b00'],
  ])('places a key between %s and %s as %s', (a, b, expected) => {
    expect(keyBetween(a, b)).toBe(expected);
  });

  it.each([
    ['the smallest integer', null, 'A00000000000000000000000000'],
    ['a trailing zero fraction digit', 'a00', null],
    ['a trailing zero below an upper bound', 'a00', 'a1'],
    ['an invalid head', '0', '1'],
    ['an empty key', '', null],
    ['a key shorter than its integer part', 'a', null],
    ['a non base-62 character', 'a0-', null],
    ['bounds in the wrong order', 'a1', 'a0'],
    ['equal bounds', 'a0', 'a0'],
  ])('rejects %s', (_, a, b) => {
    expect(() => keyBetween(a, b)).toThrow(RangeError);
  });

  it('keeps keys strictly between their neighbors over 1000 repeated inserts at one spot', () => {
    const lower = 'a0';
    let upper = 'a1';
    const keys = [lower, upper];
    for (let i = 0; i < 1000; i++) {
      upper = keyBetween(lower, upper);
      keys.splice(1, 0, upper);
    }
    expectStrictlySorted(keys);
    // Matches the service implementation after the same 1000 inserts.
    expect(upper).toBe(`a${'0'.repeat(167)}4`);
  });

  it('keeps keys sorted and short over 1000 appends and 1000 prepends', () => {
    const appended = [];
    let last = null;
    for (let i = 0; i < 1000; i++) {
      last = keyBetween(last, null);
      appended.push(last);
    }
    expectStrictlySorted(appended);
    expect(last).toBe('bF7');
    const prepended = [];
    let first = null;
    for (let i = 0; i < 1000; i++) {
      first = keyBetween(null, first);
      prepended.unshift(first);
    }
    expectStrictlySorted(prepended);
    expect(Math.max(...appended.concat(prepended).map((key) => key.length))).toBeLessThanOrEqual(8);
  });

  it('sorts mixed keys the same by code unit order as by byte order', () => {
    const keys = ['a0', 'a0V', 'Zz', 'b00', 'a1', 'a0l', 'Xzzz'];
    const byCodeUnit = [...keys].sort();
    const byByte = [...keys].sort((x, y) => Buffer.compare(Buffer.from(x), Buffer.from(y)));
    expect(byCodeUnit).toEqual(byByte);
  });

  it('exposes the service limit of 128 characters', () => {
    expect(MAX_KEY_LENGTH).toBe(128);
  });
});

describe('keysBetween', () => {
  // Expected keys computed with the service's FractionalIndex.keysBetween.
  it.each([
    [null, null, 5, ['a0', 'a1', 'a2', 'a3', 'a4']],
    [null, 'a0', 5, ['Zv', 'Zw', 'Zx', 'Zy', 'Zz']],
    ['a0', 'a1', 5, ['a08', 'a0G', 'a0V', 'a0d', 'a0l']],
    ['a5', 'b07', 10, ['a58', 'a5G', 'a5V', 'a5d', 'a5l', 'a6', 'a6G', 'a6V', 'a7', 'a8']],
    [null, null, 0, []],
    [null, null, 1, ['a0']],
  ])('generates keys between %s and %s', (a, b, n, expected) => {
    expect(keysBetween(a, b, n)).toEqual(expected);
  });

  it('spreads many keys strictly between the bounds', () => {
    const keys = keysBetween('a0', 'a1', 50);
    expect(keys).toHaveLength(50);
    expectStrictlySorted(['a0', ...keys, 'a1']);
  });

  it('rejects a negative count and bounds in the wrong order', () => {
    expect(() => keysBetween(null, null, -1)).toThrow(RangeError);
    expect(() => keysBetween('a1', 'a0', 0)).toThrow(RangeError);
    expect(() => keysBetween('a1', 'a0', 5)).toThrow(RangeError);
  });
});
