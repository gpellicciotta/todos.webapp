/**
 * Quick add: read a due date, a due time, and list tags typed in the add field, such as
 * `Buy paint tomorrow 18:00 #home` (`TSK-14`).
 *
 * The parser is a pure function of the text, the current time, and the lists, and works offline in US English.
 * Tokens are whole words, in any position:
 * - Dates: `today`, `tomorrow`, a full weekday name for the next such day, or `yyyy-mm-dd`.
 * - Times: `hh:mm` in 24-hour form, or `h pm` and `h:mm am`, with or without the space.
 * - Lists: `#name` names a list the user may add tasks to, ignoring case, accents, spaces, dashes, and underscores.
 * The first date and the first time count; later ones stay in the description, as do unknown tags.
 * A backslash before a token keeps it as text and leaves the description, such as `\tomorrow`.
 * When nothing would be left of the description, the whole text is the description and sets nothing.
 */

import { foldText } from './list-find.js';
import { can, listRole } from './permissions.js';

const DAY_MS = 86_400_000;
const WEEKDAYS = Object.freeze(['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']);
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const CLOCK = /^([01]?\d|2[0-3]):([0-5]\d)$/;
const MERIDIEM = /^(\d{1,2})(?::([0-5]\d))?(am|pm)$/i;
const HOUR = /^\d{1,2}(?::[0-5]\d)?$/;
const AM_PM = /^(am|pm)$/i;
const TAG = /^#(\S+)$/;

/** Preview strings, for the strings module of TEC-13 to absorb. */
const STRINGS = Object.freeze({
  today: 'today',
  tomorrow: 'tomorrow',
  due: (when) => `Due ${when}`,
  lists: (names) => `${names.length === 1 ? 'List' : 'Lists'}: ${names.join(', ')}`,
  separator: ' · ',
});

/**
 * Read a date token as a local date.
 * @param {string} token the token
 * @param {Date} now the current time
 * @returns {{date: Date, weekday: boolean}|null} the date at local midnight, and whether it names a weekday
 */
function readDate(token, now) {
  const lower = token.toLowerCase();
  const offset = lower === 'today' ? 0 : lower === 'tomorrow' ? 1 : null;
  if (offset !== null) {
    return { date: new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset), weekday: false };
  }
  const weekday = WEEKDAYS.indexOf(lower);
  if (weekday >= 0) {
    const ahead = (weekday - now.getDay() + 7) % 7;
    return { date: new Date(now.getFullYear(), now.getMonth(), now.getDate() + ahead), weekday: true };
  }
  const iso = ISO_DATE.exec(token);
  if (iso) {
    const [year, month, day] = iso.slice(1).map(Number);
    const date = new Date(year, month - 1, day);
    if (date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day) {
      return { date, weekday: false };
    }
  }
  return null;
}

/**
 * Read a time from one token, or from an hour token followed by `am` or `pm`.
 * @param {string} token the token
 * @param {string|undefined} next the token after it
 * @returns {{hours: number, minutes: number, used: number}|null} the time and the number of tokens it used
 */
function readTime(token, next) {
  const split = HOUR.test(token) && next !== undefined && AM_PM.test(next);
  const joined = MERIDIEM.exec(split ? token + next : token);
  const hour = Number(joined?.[1]);
  if (joined && hour >= 1 && hour <= 12) {
    const pm = joined[3].toLowerCase() === 'pm';
    return { hours: (hour % 12) + (pm ? 12 : 0), minutes: Number(joined[2] ?? 0), used: split ? 2 : 1 };
  }
  const clock = CLOCK.exec(token);
  return clock ? { hours: Number(clock[1]), minutes: Number(clock[2]), used: 1 } : null;
}

/**
 * Tell whether a word would be read as a token, so a backslash before it keeps it as text.
 * @param {string} word the word after the backslash
 * @returns {boolean} true for a date, time, `am`, `pm`, or tag form
 */
function isTokenLike(word) {
  return readDate(word, new Date()) !== null || CLOCK.test(word) || MERIDIEM.test(word) || AM_PM.test(word) || TAG.test(word);
}

/**
 * Fold a list name or tag for matching: no case, accents, spaces, dashes, or underscores.
 * @param {string} name the name
 * @returns {string} the key
 */
function tagKey(name) {
  return foldText(name).replace(/[\s_-]+/g, '');
}

/**
 * Format a local date as `yyyy-mm-dd`.
 * @param {Date} date the date
 * @returns {string} the date
 */
function isoDay(date) {
  const pad = (value) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/**
 * Parse the text of the add field.
 * @param {string} text the typed text
 * @param {object} [options] parse options
 * @param {Date} [options.now] the current time
 * @param {object[]} [options.lists] the live lists; only those the user may add tasks to match (`SHR-4`)
 * @returns {{description: string, due: string|null, dateOnly: boolean, lists: object[]}} the trimmed description
 *   without the tokens; the due time as `yyyy-mm-dd` for a date alone (`TSK-6`), or as an ISO date-time; whether
 *   it is a date alone; and the tagged lists, each once, in typed order
 */
export function parseQuickAdd(text, { now = new Date(), lists = [] } = {}) {
  const trimmed = text.trim();
  const literal = { description: trimmed, due: null, dateOnly: false, lists: [] };
  const addable = new Map();
  for (const list of lists) {
    const key = tagKey(list.name ?? '');
    if (key && !addable.has(key) && can(listRole(list), 'add-to-list')) {
      addable.set(key, list);
    }
  }
  const words = trimmed === '' ? [] : trimmed.split(/\s+/);
  const kept = [];
  const tagged = [];
  let date = null;
  let time = null;
  let changed = false;
  for (let index = 0; index < words.length; index += 1) {
    const word = words[index];
    if (word.startsWith('\\') && isTokenLike(word.slice(1))) {
      kept.push(word.slice(1));
      changed = true;
      continue;
    }
    const day = date === null ? readDate(word, now) : null;
    if (day) {
      date = day;
      changed = true;
      continue;
    }
    const clock = time === null ? readTime(word, words[index + 1]) : null;
    if (clock) {
      time = clock;
      index += clock.used - 1;
      changed = true;
      continue;
    }
    const tag = TAG.exec(word);
    const list = tag ? addable.get(tagKey(tag[1])) : undefined;
    if (list) {
      if (!tagged.includes(list)) {
        tagged.push(list);
      }
      changed = true;
      continue;
    }
    kept.push(word);
  }
  if (kept.length === 0) {
    return literal;
  }
  const description = changed ? kept.join(' ') : trimmed;
  if (!date && !time) {
    return { description, due: null, dateOnly: false, lists: tagged };
  }
  const start = date?.date ?? new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const at = (base) => new Date(base.getFullYear(), base.getMonth(), base.getDate(), time?.hours ?? 23, time?.minutes ?? 59);
  let due = at(start);
  // A weekday or a time alone means the next one still to come.
  if ((!date || date.weekday) && due <= now) {
    due = at(new Date(start.getFullYear(), start.getMonth(), start.getDate() + (date ? 7 : 1)));
  }
  return time
    ? { description, due: due.toISOString(), dateOnly: false, lists: tagged }
    : { description, due: isoDay(due), dateOnly: true, lists: tagged };
}

/**
 * Describe what an add will set, such as `Due tomorrow 18:00 · List: Home`, in US English (`TEC-12`).
 * @param {{due: string|null, dateOnly: boolean, lists: object[]}} parsed a result of `parseQuickAdd`
 * @param {Date} [now] the current time
 * @returns {string} the preview, empty when the add sets nothing
 */
export function describeQuickAdd(parsed, now = new Date()) {
  const parts = [];
  if (parsed.due) {
    const iso = parsed.dateOnly ? ISO_DATE.exec(parsed.due) : null;
    const due = iso ? new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3])) : new Date(parsed.due);
    const midnight = (value) => new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime();
    const days = Math.round((midnight(due) - midnight(now)) / DAY_MS);
    let when;
    if (days === 0 || days === 1) {
      when = days === 0 ? STRINGS.today : STRINGS.tomorrow;
    }
    else if (days > 1 && days < 7) {
      when = new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(due);
    }
    else {
      const format = { month: 'short', day: 'numeric', ...(due.getFullYear() === now.getFullYear() ? {} : { year: 'numeric' }) };
      when = new Intl.DateTimeFormat('en-US', format).format(due);
    }
    const pad = (value) => String(value).padStart(2, '0');
    parts.push(STRINGS.due(parsed.dateOnly ? when : `${when} ${pad(due.getHours())}:${pad(due.getMinutes())}`));
  }
  if (parsed.lists.length > 0) {
    parts.push(STRINGS.lists(parsed.lists.map((list) => list.name)));
  }
  return parts.join(STRINGS.separator);
}
