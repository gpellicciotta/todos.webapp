import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { browserTimezone, isValidTimezone, localDate, nextPeriod, periodContaining } from '../../src/js/core/periods.js';

/** The shared cases of todos.server `docs/specs/recurrence-test-vectors.json`, copied by hand. */
const { vectors } = JSON.parse(readFileSync(new URL('../fixtures/recurrence-test-vectors.json', import.meta.url), 'utf8'));

/**
 * Turn a period into Unix milliseconds, since the vectors compare instants, not strings.
 * @param {{start: string, end: string}} period the period
 * @returns {{start: number, end: number}} the instants
 */
const instants = (period) => ({ start: Date.parse(period.start), end: Date.parse(period.end) });

describe('recurrence periods', () => {
  it('has the shared vectors', () => {
    expect(vectors.length).toBeGreaterThanOrEqual(31);
  });

  for (const vector of vectors) {
    it(`passes the shared vector: ${vector.name}`, () => {
      const rule = { unit: vector.unit, interval: vector.interval, zone: vector.zone };
      const containing = periodContaining(vector.instant, rule);
      expect(instants(containing)).toEqual(instants(vector.containing));
      expect(instants(nextPeriod(containing, rule))).toEqual(instants(vector.next));
    });
  }

  it('returns ISO instants in UTC', () => {
    const period = periodContaining('2026-06-15T10:00:00Z', { unit: 'day', interval: 1, zone: 'Europe/Brussels' });
    expect(period).toEqual({ start: '2026-06-14T22:00:00.000Z', end: '2026-06-15T22:00:00.000Z' });
  });

  it('starts the next period at the end of a shorter one after a unit edit', () => {
    // A day period of Wednesday, followed under a weekly rule: it runs to the next Monday, so later periods align again.
    const day = periodContaining('2026-06-17T10:00:00Z', { unit: 'day', interval: 1, zone: 'Europe/Brussels' });
    expect(nextPeriod(day, { unit: 'week', interval: 1, zone: 'Europe/Brussels' })).toEqual({ start: '2026-06-17T22:00:00.000Z', end: '2026-06-21T22:00:00.000Z' });
  });

  it('reads the local date of an instant in a zone', () => {
    expect(localDate('2026-06-14T22:30:00Z', 'Europe/Brussels')).toBe('2026-06-15');
    expect(localDate('2026-06-14T22:30:00Z', 'UTC')).toBe('2026-06-14');
  });

  it('checks IANA zone names and names the browser zone', () => {
    expect(isValidTimezone('Europe/Brussels')).toBe(true);
    expect(isValidTimezone('Mars/Olympus')).toBe(false);
    expect(isValidTimezone('')).toBe(false);
    expect(isValidTimezone(browserTimezone())).toBe(true);
  });
});
