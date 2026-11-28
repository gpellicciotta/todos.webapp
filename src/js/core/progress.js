/**
 * Progress rules of a goal: the share of the target, the meter color, the overage, and whether the task is on track.
 *
 * One module holds them, so the task editor's Status tab and the task rows (T0312) agree (`TSK-22`).
 * Colors: "approaching" starts at 80% of the target. An at-least goal is blue below it, yellow from it, and green once reached;
 * an at-most goal is gray below it and orange from it, also above the limit. Red marks Failed only.
 * On track follows the pace of the window: a Check goal stays on track until overdue; an at-least goal needs a progress share
 * at least the share of the window gone, and is on track without a window end; an at-most goal goes off track above its limit.
 * See docs/specs/ui-design.md, Task Rows and Status Tab.
 */

/** The share of the target where a goal counts as approaching its target or limit. */
export const APPROACHING = 0.8;

/** The statuses of an occurrence that is still open. */
const OPEN = Object.freeze(['ready', 'in-progress']);

/**
 * Read the goal and progress of an occurrence, falling back to the counts of one without goal fields.
 * `share` is the progress over the target: 0 without a value, 1 for a limit of 0 not yet passed, Infinity above it.
 * @param {object} occurrence the occurrence
 * @returns {{direction: string, measure: string, target: number, value: number|null, unit: string|null, share: number}} the progress
 */
export function progressOf(occurrence) {
  const target = occurrence['goal-target'] ?? occurrence['target-count'];
  const value = occurrence.progress === undefined ? occurrence['completion-count'] ?? 0 : occurrence.progress;
  let share = 0;
  if (target > 0) {
    share = (value ?? 0) / target;
  }
  else if (value !== null) {
    share = value > 0 ? Infinity : 1;
  }
  return {
    direction: occurrence['goal-direction'] ?? 'at-least',
    measure: occurrence['goal-measure'] ?? 'checks',
    target,
    value,
    unit: occurrence['goal-unit'] ?? null,
    share,
  };
}

/**
 * Name the color of a goal's meter by its progress.
 * @param {object} occurrence the occurrence
 * @returns {'blue'|'yellow'|'green'|'gray'|'orange'} the color
 */
export function meterColor(occurrence) {
  const { direction, share } = progressOf(occurrence);
  if (direction === 'at-most') {
    return share >= APPROACHING ? 'orange' : 'gray';
  }
  return share >= 1 ? 'green' : share >= APPROACHING ? 'yellow' : 'blue';
}

/**
 * Return how far an at-most goal is above its limit.
 * @param {object} occurrence the occurrence
 * @returns {number} the overage, 0 on or below the limit and for any other goal
 */
export function overage(occurrence) {
  const { direction, target, value } = progressOf(occurrence);
  return direction === 'at-most' && value !== null && value > target ? Math.round((value - target) * 1000) / 1000 : 0;
}

/**
 * Measure the share of an occurrence's window that is gone.
 * @param {object} occurrence the occurrence
 * @param {Date} now the moment
 * @returns {number|null} the share from 0 to 1, or null without a window end
 */
export function windowShare(occurrence, now) {
  if (!occurrence['due-time']) {
    return null;
  }
  const start = Date.parse(occurrence['start-time']);
  const end = Date.parse(occurrence['due-time']);
  return end > start ? Math.min(1, Math.max(0, (now.getTime() - start) / (end - start))) : 1;
}

/**
 * Return the progress the pace of the window asks for now.
 * @param {object} occurrence the occurrence
 * @param {Date} now the moment
 * @returns {number|null} the target times the share of the window gone, or null without a window end
 */
export function paceNow(occurrence, now) {
  const share = windowShare(occurrence, now);
  return share === null ? null : progressOf(occurrence).target * share;
}

/**
 * Tell whether an open occurrence is past its due time.
 * @param {object} occurrence the occurrence
 * @param {Date} now the moment
 * @returns {boolean} true when open and past due
 */
function isOverdue(occurrence, now) {
  return OPEN.includes(occurrence.status) && occurrence['close-time'] === null && Boolean(occurrence['due-time']) && now.getTime() > Date.parse(occurrence['due-time']);
}

/**
 * Tell how an occurrence stands against the pace of its window.
 * @param {object} occurrence the occurrence
 * @param {Date} now the moment
 * @returns {'on-track'|'behind-pace'|'overdue'|'over-limit'|'failed'} the standing; finished and cancelled occurrences are on track
 */
export function trackOf(occurrence, now) {
  if (occurrence.status === 'failed') {
    return 'failed';
  }
  if (!OPEN.includes(occurrence.status)) {
    return 'on-track';
  }
  const { direction, measure, target, share } = progressOf(occurrence);
  if (direction === 'at-most') {
    return share > 1 ? 'over-limit' : 'on-track';
  }
  if (isOverdue(occurrence, now)) {
    return 'overdue';
  }
  if (measure === 'checks' && target <= 1) {
    return 'on-track';
  }
  const gone = windowShare(occurrence, now);
  return gone === null || share >= gone ? 'on-track' : 'behind-pace';
}

/**
 * Tell whether an occurrence is on track.
 * @param {object} occurrence the occurrence
 * @param {Date} now the moment
 * @returns {boolean} true when on track
 */
export function isOnTrack(occurrence, now) {
  return trackOf(occurrence, now) === 'on-track';
}

/**
 * Name a duration in hours, minutes, and seconds, leaving out the parts that are 0.
 * @param {number} seconds the duration
 * @returns {string} the words, such as `3 h 20 min`
 */
export function durationWords(seconds) {
  const parts = [[Math.floor(seconds / 3600), 'h'], [Math.floor((seconds % 3600) / 60), 'min'], [seconds % 60, 's']];
  return parts.filter(([count]) => count > 0).map(([count, word]) => `${count} ${word}`).join(' ') || '0 min';
}

/**
 * Format a value of a measure, with the goal's unit for amounts and readings.
 * @param {string} measure `checks`, `time`, `amount`, or `reading`
 * @param {number|null} value the value, in seconds for time
 * @param {string|null} unit the unit of an amount or a reading
 * @param {string} [locale] the locale of the number, the user's by default
 * @returns {string} the text, an en dash for no value
 */
export function formatMeasure(measure, value, unit, locale = undefined) {
  if (value === null || value === undefined) {
    return '–';
  }
  if (measure === 'time') {
    return durationWords(value);
  }
  const number = value.toLocaleString(locale, { maximumFractionDigits: 3 });
  return measure === 'checks' || !unit ? number : `${number} ${unit}`;
}

/**
 * Name what a log entry holds: a check, a time, an amount, or a mix, such as `Check · 45 min`.
 * @param {{checked?: boolean, 'time-spent-seconds'?: number, amount?: number}} entry the `log` event
 * @param {{measure: string, unit: string|null}} goal the measure and unit of its goal, whose unit names an amount
 * @param {string} [locale] the locale of numbers, the user's by default
 * @returns {string} the words
 */
export function entryWords(entry, goal, locale = undefined) {
  const unit = ['amount', 'reading'].includes(goal.measure) ? goal.unit : null;
  return [
    entry.checked ? 'Check' : null,
    typeof entry['time-spent-seconds'] === 'number' ? durationWords(entry['time-spent-seconds']) : null,
    typeof entry.amount === 'number' ? formatMeasure('amount', entry.amount, unit, locale) : null,
  ].filter(Boolean).join(' · ');
}