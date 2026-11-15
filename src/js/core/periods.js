/**
 * Recurrence periods, computed as the todos.server business logic spec says, section Periods (`LOC-2`).
 *
 * A period spans `interval` units of `day`, `week`, or `month` in an IANA timezone.
 * Days start at local midnight, weeks on Monday (ISO 8601), and months on the 1st; periods are half-open.
 * A local midnight skipped by daylight saving resolves to the first valid instant of that day,
 * and units add in local dates, so a day spans 23 or 25 hours on daylight saving changes.
 * The period after a period starts at its end and runs `interval` units from the unit start containing that end.
 * `tests/unit/periods.test.js` runs the shared vectors of todos.server, which the Java implementation passes too.
 */

const DAY_MS = 86_400_000;
const formats = new Map();

/**
 * Return a shared format that splits an instant into its local date and time in a zone.
 * @param {string} zone the IANA zone name
 * @returns {Intl.DateTimeFormat} the format
 */
function partsFormat(zone) {
  if (!formats.has(zone)) {
    formats.set(zone, new Intl.DateTimeFormat('en-US', {
      timeZone: zone, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric',
    }));
  }
  return formats.get(zone);
}

/**
 * Split an instant into its local date and time in a zone.
 * @param {number} ms the Unix time in milliseconds
 * @param {string} zone the IANA zone name
 * @returns {{year: number, month: number, day: number, hour: number, minute: number, second: number}} the local fields
 */
function localParts(ms, zone) {
  const parts = {};
  for (const { type, value } of partsFormat(zone).formatToParts(new Date(ms))) {
    if (type !== 'literal') {
      parts[type] = Number(value);
    }
  }
  return parts;
}

/**
 * Return the offset of a zone at an instant: local wall time minus UTC, in milliseconds.
 * @param {number} ms the Unix time in milliseconds
 * @param {string} zone the IANA zone name
 * @returns {number} the offset
 */
function offsetAt(ms, zone) {
  const p = localParts(ms, zone);
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - Math.floor(ms / 1000) * 1000;
}

/**
 * Return the first instant of a local date in a zone: its midnight, or the end of the gap that skips it.
 * @param {{year: number, month: number, day: number}} date the local date
 * @param {string} zone the IANA zone name
 * @returns {number} the Unix time in milliseconds
 */
function startOfDay(date, zone) {
  const wall = Date.UTC(date.year, date.month - 1, date.day);
  const offsets = [...new Set([offsetAt(wall - DAY_MS, zone), offsetAt(wall, zone), offsetAt(wall + DAY_MS, zone)])];
  const candidates = offsets.map((offset) => wall - offset);
  const valid = candidates.filter((ms) => {
    const p = localParts(ms, zone);
    return p.year === date.year && p.month === date.month && p.day === date.day && p.hour === 0 && p.minute === 0 && p.second === 0;
  });
  if (valid.length > 0) {
    return Math.min(...valid);
  }
  // A gap skips midnight: the first valid instant is the transition, which midnight in the earlier offset names.
  return Math.max(...candidates);
}

/**
 * Return the local date of an instant in a zone.
 * @param {number} ms the Unix time in milliseconds
 * @param {string} zone the IANA zone name
 * @returns {{year: number, month: number, day: number}} the local date
 */
function dateAt(ms, zone) {
  const { year, month, day } = localParts(ms, zone);
  return { year, month, day };
}

/**
 * Move a local date by a number of days, in calendar arithmetic.
 * @param {{year: number, month: number, day: number}} date the date
 * @param {number} days the days to add
 * @returns {{year: number, month: number, day: number}} the new date
 */
function plusDays(date, days) {
  const moved = new Date(Date.UTC(date.year, date.month - 1, date.day + days));
  return { year: moved.getUTCFullYear(), month: moved.getUTCMonth() + 1, day: moved.getUTCDate() };
}

/**
 * Align a local date to the start of its unit: itself, the Monday of its ISO week, or the 1st of its month.
 * @param {{year: number, month: number, day: number}} date the date
 * @param {string} unit `day`, `week`, or `month`
 * @returns {{year: number, month: number, day: number}} the unit start
 */
function unitStart(date, unit) {
  if (unit === 'week') {
    const weekday = new Date(Date.UTC(date.year, date.month - 1, date.day)).getUTCDay();
    return plusDays(date, -((weekday + 6) % 7));
  }
  return unit === 'month' ? { ...date, day: 1 } : date;
}

/**
 * Add units to a unit start.
 * @param {{year: number, month: number, day: number}} date the unit start
 * @param {string} unit `day`, `week`, or `month`
 * @param {number} count the number of units
 * @returns {{year: number, month: number, day: number}} the later unit start
 */
function plusUnits(date, unit, count) {
  if (unit === 'month') {
    const months = date.year * 12 + date.month - 1 + count;
    return { year: Math.floor(months / 12), month: (months % 12) + 1, day: 1 };
  }
  return plusDays(date, unit === 'week' ? 7 * count : count);
}

/**
 * Check a rule: a known unit, an interval of at least 1, and a zone.
 * @param {{unit: string, interval: number, zone: string}} rule the rule
 */
function checkRule({ unit, interval, zone }) {
  if (!['day', 'week', 'month'].includes(unit) || !Number.isInteger(interval) || interval < 1 || !zone) {
    throw new RangeError(`Not a recurrence rule: ${unit}, ${interval}, ${zone}.`);
  }
}

/**
 * Turn an instant given as an ISO string, a Date, or Unix milliseconds into milliseconds.
 * @param {string|Date|number} instant the instant
 * @returns {number} the Unix time in milliseconds
 */
function msOf(instant) {
  return typeof instant === 'string' ? Date.parse(instant) : new Date(instant).getTime();
}

/**
 * Return the period containing an instant: `interval` units from the unit start containing it.
 * @param {string|Date|number} instant the instant
 * @param {{unit: string, interval: number, zone: string}} rule the unit, the interval, and the IANA zone
 * @returns {{start: string, end: string}} the half-open period, as ISO instants
 */
export function periodContaining(instant, rule) {
  checkRule(rule);
  const start = unitStart(dateAt(msOf(instant), rule.zone), rule.unit);
  return {
    start: new Date(startOfDay(start, rule.zone)).toISOString(),
    end: new Date(startOfDay(plusUnits(start, rule.unit, rule.interval), rule.zone)).toISOString(),
  };
}

/**
 * Return the period after a period: from its end, `interval` units from the unit start containing that end.
 * The period may come from another unit, interval, or zone; the new one then is shorter, so later ones align again.
 * @param {{end: string}} period the period to follow
 * @param {{unit: string, interval: number, zone: string}} rule the unit, the interval, and the IANA zone
 * @returns {{start: string, end: string}} the next period, as ISO instants
 */
export function nextPeriod(period, rule) {
  checkRule(rule);
  const end = msOf(period.end);
  const start = unitStart(dateAt(end, rule.zone), rule.unit);
  return {
    start: new Date(end).toISOString(),
    end: new Date(startOfDay(plusUnits(start, rule.unit, rule.interval), rule.zone)).toISOString(),
  };
}

/**
 * Return the local date of an instant in a zone.
 * @param {string|Date|number} instant the instant
 * @param {string} zone the IANA zone name
 * @returns {string} the date, such as `2026-06-15`
 */
export function localDate(instant, zone) {
  const { year, month, day } = dateAt(msOf(instant), zone);
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/**
 * Tell whether a name is an IANA zone that this browser knows.
 * @param {unknown} zone the name
 * @returns {boolean} true for a known zone
 */
export function isValidTimezone(zone) {
  if (typeof zone !== 'string' || !zone.trim()) {
    return false;
  }
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: zone });
    return true;
  }
  catch {
    return false;
  }
}

/**
 * Name the timezone of the browser, the default of a new recurrence.
 * @returns {string} the IANA zone name, `UTC` when unknown
 */
export function browserTimezone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
}
