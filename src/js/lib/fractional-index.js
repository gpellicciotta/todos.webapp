/**
 * Fractional-index keys for the manual order of tasks within a list (`LV-2` to `LV-5`).
 *
 * A key is an integer part (a head character giving its length, followed by digits) plus an optional
 * fractional part. Keys sort by code unit order, which equals byte order for their ASCII digits,
 * so a new key always fits strictly between two existing keys.
 *
 * This is the base-62 algorithm of rocicorp/fractional-indexing (https://github.com/rocicorp/fractional-indexing,
 * MIT license), reimplemented to produce the same keys as the
 * ToDo's service's FractionalIndex class. Like the service, it rejects bounds in the wrong order.
 */

/** The base-62 digits, in ascending code unit order. */
const DIGITS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
const ZERO = DIGITS[0];
const LAST_DIGIT = DIGITS[DIGITS.length - 1];
/** The smallest integer part, which has no predecessor. */
const SMALLEST_INTEGER = `A${ZERO.repeat(26)}`;

/** The longest key the service stores; longer keys require a rebalance of the list first. */
export const MAX_KEY_LENGTH = 128;

/**
 * Return the length of the integer part that a head character announces.
 * @param {string} head the first character of a key
 * @returns {number} the integer part length, head included
 */
function integerLength(head) {
  if (head >= 'a' && head <= 'z') {
    return head.charCodeAt(0) - 'a'.charCodeAt(0) + 2;
  }
  if (head >= 'A' && head <= 'Z') {
    return 'Z'.charCodeAt(0) - head.charCodeAt(0) + 2;
  }
  throw new RangeError(`Invalid key head character: '${head}'.`);
}

/**
 * Return the integer part of a key.
 * @param {string} key the key
 * @returns {string} its integer part
 */
function integerPart(key) {
  const length = integerLength(key[0]);
  if (length > key.length) {
    throw new RangeError(`Key is shorter than its integer part: '${key}'.`);
  }
  return key.slice(0, length);
}

/**
 * Check that a key is well formed.
 * @param {string} key the key
 */
function validateKey(key) {
  if (typeof key !== 'string' || key === '') {
    throw new RangeError('A key must be a non-empty string.');
  }
  if (key === SMALLEST_INTEGER) {
    throw new RangeError(`Key cannot be the smallest integer: '${key}'.`);
  }
  for (let i = 1; i < key.length; i++) {
    if (!DIGITS.includes(key[i])) {
      throw new RangeError(`Invalid key character '${key[i]}' in key '${key}'.`);
    }
  }
  const integer = integerPart(key);
  if (key.length > integer.length && key[key.length - 1] === ZERO) {
    throw new RangeError(`Key cannot end with a zero fraction digit: '${key}'.`);
  }
}

/**
 * Check both bounds and their order.
 * @param {string|null} a the lower bound, or null
 * @param {string|null} b the upper bound, or null
 */
function validateBounds(a, b) {
  if (a !== null) {
    validateKey(a);
  }
  if (b !== null) {
    validateKey(b);
  }
  if (a !== null && b !== null && a >= b) {
    throw new RangeError(`Key '${a}' does not sort before key '${b}'.`);
  }
}

/**
 * Return a fractional part strictly between two fractional parts.
 * @param {string} lower the lower fractional part, possibly empty
 * @param {string|null} upper the upper fractional part, or null for no upper bound
 * @returns {string} the middle fractional part
 */
function midpoint(lower, upper) {
  if (upper !== null) {
    let common = 0;
    while ((lower[common] ?? ZERO) === upper[common]) {
      common++;
    }
    if (common > 0) {
      return upper.slice(0, common) + midpoint(lower.slice(common), upper.slice(common));
    }
  }
  const digitLower = lower ? DIGITS.indexOf(lower[0]) : 0;
  const digitUpper = upper !== null ? DIGITS.indexOf(upper[0]) : DIGITS.length;
  if (digitUpper - digitLower > 1) {
    return DIGITS[Math.round(0.5 * (digitLower + digitUpper))];
  }
  if (upper !== null && upper.length > 1) {
    return upper.slice(0, 1);
  }
  return DIGITS[digitLower] + midpoint(lower.slice(1), null);
}

/**
 * Return the next integer part, or null past the largest one.
 * @param {string} integer an integer part
 * @returns {string|null} the incremented integer part
 */
function incrementInteger(integer) {
  const head = integer[0];
  const digits = integer.slice(1).split('');
  let carry = true;
  for (let i = digits.length - 1; carry && i >= 0; i--) {
    const digit = DIGITS.indexOf(digits[i]) + 1;
    if (digit === DIGITS.length) {
      digits[i] = ZERO;
    }
    else {
      digits[i] = DIGITS[digit];
      carry = false;
    }
  }
  if (!carry) {
    return head + digits.join('');
  }
  if (head === 'Z') {
    return `a${ZERO}`;
  }
  if (head === 'z') {
    return null;
  }
  const newHead = String.fromCharCode(head.charCodeAt(0) + 1);
  if (newHead > 'a') {
    digits.push(ZERO);
  }
  else {
    digits.pop();
  }
  return newHead + digits.join('');
}

/**
 * Return the previous integer part, or null before the smallest one.
 * @param {string} integer an integer part
 * @returns {string|null} the decremented integer part
 */
function decrementInteger(integer) {
  const head = integer[0];
  const digits = integer.slice(1).split('');
  let borrow = true;
  for (let i = digits.length - 1; borrow && i >= 0; i--) {
    const digit = DIGITS.indexOf(digits[i]) - 1;
    if (digit === -1) {
      digits[i] = LAST_DIGIT;
    }
    else {
      digits[i] = DIGITS[digit];
      borrow = false;
    }
  }
  if (!borrow) {
    return head + digits.join('');
  }
  if (head === 'a') {
    return `Z${LAST_DIGIT}`;
  }
  if (head === 'A') {
    return null;
  }
  const newHead = String.fromCharCode(head.charCodeAt(0) - 1);
  if (newHead < 'Z') {
    digits.push(LAST_DIGIT);
  }
  else {
    digits.pop();
  }
  return newHead + digits.join('');
}

/**
 * Return a key that sorts strictly between two keys.
 * @param {string|null} a the key to sort after, or null for no lower bound
 * @param {string|null} b the key to sort before, or null for no upper bound
 * @returns {string} the new key
 * @throws {RangeError} when a key is malformed, or `a` does not sort before `b`
 */
export function keyBetween(a, b) {
  validateBounds(a, b);
  if (a === null) {
    if (b === null) {
      return `a${ZERO}`;
    }
    const integerB = integerPart(b);
    const fractionB = b.slice(integerB.length);
    if (integerB === SMALLEST_INTEGER) {
      return integerB + midpoint('', fractionB);
    }
    if (integerB < b) {
      return integerB;
    }
    const decremented = decrementInteger(integerB);
    if (decremented === null) {
      throw new RangeError(`No key sorts before key '${b}'.`);
    }
    return decremented;
  }
  const integerA = integerPart(a);
  const fractionA = a.slice(integerA.length);
  if (b === null) {
    const incremented = incrementInteger(integerA);
    return incremented === null ? integerA + midpoint(fractionA, null) : incremented;
  }
  const integerB = integerPart(b);
  const fractionB = b.slice(integerB.length);
  if (integerA === integerB) {
    return integerA + midpoint(fractionA, fractionB);
  }
  const incremented = incrementInteger(integerA);
  if (incremented === null) {
    throw new RangeError(`No key sorts after key '${a}'.`);
  }
  if (incremented < b) {
    return incremented;
  }
  return integerA + midpoint(fractionA, null);
}

/**
 * Return `n` evenly spread keys that sort strictly between two keys, in ascending order.
 * @param {string|null} a the key to sort after, or null for no lower bound
 * @param {string|null} b the key to sort before, or null for no upper bound
 * @param {number} n the number of keys
 * @returns {string[]} the new keys
 * @throws {RangeError} when `n` is negative, a key is malformed, or `a` does not sort before `b`
 */
export function keysBetween(a, b, n) {
  if (!Number.isInteger(n) || n < 0) {
    throw new RangeError(`Key count must be a non-negative integer: ${n}.`);
  }
  if (n === 0) {
    validateBounds(a, b);
    return [];
  }
  if (n === 1) {
    return [keyBetween(a, b)];
  }
  if (b === null) {
    const keys = [keyBetween(a, null)];
    for (let i = 1; i < n; i++) {
      keys.push(keyBetween(keys[i - 1], null));
    }
    return keys;
  }
  if (a === null) {
    const keys = [keyBetween(null, b)];
    for (let i = 1; i < n; i++) {
      keys.push(keyBetween(null, keys[i - 1]));
    }
    return keys.reverse();
  }
  const middle = Math.floor(n / 2);
  const middleKey = keyBetween(a, b);
  return [...keysBetween(a, middleKey, middle), middleKey, ...keysBetween(middleKey, b, n - middle - 1)];
}
