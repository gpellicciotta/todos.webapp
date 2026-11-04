import { describe, expect, it } from 'vitest';
import { uuid7, uuid7Time } from '../../src/js/lib/uuid7.js';

const UUID7 = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe('uuid7', () => {
  it('returns lowercase version 7 UUIDs with the RFC 9562 variant', () => {
    for (let i = 0; i < 100; i++) {
      expect(uuid7()).toMatch(UUID7);
    }
  });

  it('encodes the creation time in the first 48 bits', () => {
    // Later than any earlier call in this file, so the monotonic guard keeps the given time.
    const time = Date.UTC(2100, 10, 4, 12, 30, 0);
    const id = uuid7(() => time);
    expect(uuid7Time(id)).toBe(time);
  });

  it('sorts by creation time, also within one millisecond', () => {
    const ids = [];
    let time = Date.UTC(2101, 0, 1);
    for (let i = 0; i < 500; i++) {
      if (i % 50 === 0) {
        time += 1;
      }
      ids.push(uuid7(() => time));
    }
    expect([...ids].sort()).toEqual(ids);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('stays ordered when the clock moves backward', () => {
    const first = uuid7(() => Date.UTC(2102, 5, 1));
    const second = uuid7(() => Date.UTC(2102, 4, 1));
    expect(second > first).toBe(true);
  });
});
