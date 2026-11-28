import { describe, expect, it } from 'vitest';
import {
  APPROACHING, durationWords, formatMeasure, isOnTrack, meterColor, overage, paceNow, progressOf, trackOf, windowShare,
} from '../../src/js/core/progress.js';

const DAY = 86_400_000;
const START = Date.parse('2026-11-23T00:00:00.000Z');
const WEEK_END = START + 7 * DAY;

/**
 * Build an occurrence of a goal, with a week as its window by default.
 * @param {object} fields the fields to set over the defaults
 * @returns {object} the occurrence
 */
function occurrence(fields = {}) {
  return {
    occurrence: 1, status: 'in-progress', 'close-time': null, 'start-time': new Date(START).toISOString(), 'due-time': new Date(WEEK_END).toISOString(),
    'goal-direction': 'at-least', 'goal-measure': 'checks', 'goal-target': 3, 'target-count': 3, 'goal-unit': null, progress: 0, 'completion-count': 0,
    ...fields,
  };
}

const at = (ms) => new Date(ms);

describe('progressOf', () => {
  it('reads the goal and the progress, with the share of the target', () => {
    expect(progressOf(occurrence({ progress: 1 }))).toEqual({ direction: 'at-least', measure: 'checks', target: 3, value: 1, unit: null, share: 1 / 3 });
  });

  it('falls back to the counts of an occurrence without goal fields', () => {
    const old = { status: 'in-progress', 'target-count': 4, 'completion-count': 1, 'close-time': null };
    expect(progressOf(old)).toMatchObject({ direction: 'at-least', measure: 'checks', target: 4, value: 1, share: 0.25 });
  });

  it('keeps a reading without a value empty, with share 0', () => {
    expect(progressOf(occurrence({ 'goal-measure': 'reading', 'goal-target': 80, progress: null }))).toMatchObject({ value: null, share: 0 });
  });

  it('puts an at-most goal at share 1 on its limit, also a limit of 0', () => {
    expect(progressOf(occurrence({ 'goal-direction': 'at-most', 'goal-measure': 'amount', 'goal-target': 0, progress: 0 })).share).toBe(1);
    expect(progressOf(occurrence({ 'goal-direction': 'at-most', 'goal-measure': 'amount', 'goal-target': 0, progress: 5 })).share).toBe(Infinity);
  });
});

describe('meterColor and overage', () => {
  it('colors an at-least goal blue below 80%, yellow from 80%, and green once reached', () => {
    const color = (progress) => meterColor(occurrence({ 'goal-measure': 'amount', 'goal-target': 100, progress }));
    expect(APPROACHING).toBe(0.8);
    expect([color(0), color(79.9), color(80), color(99.9), color(100), color(140)]).toEqual(['blue', 'blue', 'yellow', 'yellow', 'green', 'green']);
  });

  it('colors an at-most goal gray below 80%, and orange from 80%, also on and above the limit', () => {
    const color = (progress) => meterColor(occurrence({ 'goal-direction': 'at-most', 'goal-measure': 'amount', 'goal-target': 1600, progress }));
    expect([color(0), color(1279), color(1280), color(1600), color(1720)]).toEqual(['gray', 'gray', 'orange', 'orange', 'orange']);
  });

  it('names the overage above an at-most limit only', () => {
    const calories = (progress) => occurrence({ 'goal-direction': 'at-most', 'goal-measure': 'amount', 'goal-target': 1600, progress });
    expect([overage(calories(1600)), overage(calories(1720)), overage(calories(10))]).toEqual([0, 120, 0]);
    expect(overage(occurrence({ progress: 9 }))).toBe(0);
  });
});

describe('windowShare and paceNow', () => {
  it('measures the share of the window gone, clamped, and null without a window end', () => {
    expect(windowShare(occurrence(), at(START + 3.5 * DAY))).toBe(0.5);
    expect(windowShare(occurrence(), at(START - DAY))).toBe(0);
    expect(windowShare(occurrence(), at(WEEK_END + DAY))).toBe(1);
    expect(windowShare(occurrence({ 'due-time': null }), at(START))).toBeNull();
  });

  it('gives the pace now of a goal as the target times the share gone', () => {
    expect(paceNow(occurrence(), at(START + 3.5 * DAY))).toBe(1.5);
    expect(paceNow(occurrence({ 'due-time': null }), at(START))).toBeNull();
  });
});

describe('trackOf and isOnTrack', () => {
  const half = at(START + 3.5 * DAY);

  it('keeps a Check goal on track until it is overdue', () => {
    const check = occurrence({ 'goal-target': 1, 'target-count': 1 });
    expect(trackOf(check, half)).toBe('on-track');
    expect(trackOf(check, at(WEEK_END + 1))).toBe('overdue');
    expect(trackOf(occurrence({ 'goal-target': 1, 'target-count': 1, 'due-time': null }), at(WEEK_END * 2))).toBe('on-track');
  });

  it('puts an at-least goal behind pace when its progress share trails the share of the window gone', () => {
    expect(trackOf(occurrence({ progress: 1 }), half)).toBe('behind-pace');
    expect(trackOf(occurrence({ progress: 2 }), half)).toBe('on-track');
    expect(trackOf(occurrence({ 'goal-measure': 'amount', 'goal-target': 100, progress: 50 }), half)).toBe('on-track');
    expect(isOnTrack(occurrence({ progress: 1 }), half)).toBe(false);
  });

  it('keeps an at-least goal without a window end on track, and an overdue one never', () => {
    expect(trackOf(occurrence({ 'due-time': null, progress: 0 }), at(WEEK_END * 3))).toBe('on-track');
    expect(trackOf(occurrence({ progress: 2 }), at(WEEK_END + 1))).toBe('overdue');
  });

  it('puts an at-most goal off track only above its limit', () => {
    const calories = (progress) => occurrence({ 'goal-direction': 'at-most', 'goal-measure': 'amount', 'goal-target': 1600, progress });
    expect(trackOf(calories(1600), half)).toBe('on-track');
    expect(trackOf(calories(1601), half)).toBe('over-limit');
    expect(trackOf(calories(1601), at(WEEK_END + DAY))).toBe('over-limit');
  });

  it('judges only open occurrences: finished ones are on track, failed ones are not', () => {
    expect(trackOf(occurrence({ status: 'completed', 'close-time': '2026-11-24T00:00:00.000Z', progress: 3 }), at(WEEK_END + DAY))).toBe('on-track');
    expect(trackOf(occurrence({ status: 'cancelled', 'close-time': '2026-11-24T00:00:00.000Z' }), at(WEEK_END + DAY))).toBe('on-track');
    expect(trackOf(occurrence({ status: 'failed', 'close-time': '2026-11-30T00:00:00.000Z' }), at(WEEK_END + DAY))).toBe('failed');
    expect(isOnTrack(occurrence({ status: 'failed', 'close-time': '2026-11-30T00:00:00.000Z' }), half)).toBe(false);
  });
});

describe('formatting', () => {
  it('names a duration in hours, minutes, and seconds, leaving out the parts that are 0', () => {
    expect([durationWords(10_200), durationWords(3600), durationWords(90), durationWords(0)]).toEqual(['2 h 50 min', '1 h', '1 min 30 s', '0 min']);
  });

  it('formats a measure with its unit', () => {
    expect(formatMeasure('time', 10_200, null, 'en')).toBe('2 h 50 min');
    expect(formatMeasure('checks', 2, null, 'en')).toBe('2');
    expect(formatMeasure('amount', 1720, 'kcal', 'en')).toBe('1,720 kcal');
    expect(formatMeasure('reading', 79.8, 'kg', 'en')).toBe('79.8 kg');
    expect(formatMeasure('reading', null, 'kg', 'en')).toBe('–');
  });
});
