import { describe, expect, it } from 'vitest';
import { describeQuickAdd, parseQuickAdd } from '../../src/js/core/quick-add.js';

// Monday, November 16, 2026, at 10:00 local time.
const NOW = new Date(2026, 10, 16, 10, 0);
const HOME = { id: 'home', name: 'Home' };
const WORK = { id: 'work', name: 'Work' };
const CAFE = { id: 'cafe', name: 'Café' };
const DEPOT = { id: 'depot', name: 'Home Depot' };
const SHARED = { id: 'shared', name: 'Shared', role: 'viewer' };
const EDITABLE = { id: 'team', name: 'Team', role: 'task-editor' };
const LISTS = [HOME, WORK, CAFE, DEPOT, SHARED, EDITABLE];

/**
 * Parse with the fixed clock and lists.
 * @param {string} text the typed text
 * @param {Date} [now] the current time
 * @returns {object} the parse result
 */
function parse(text, now = NOW) {
  return parseQuickAdd(text, { now, lists: LISTS });
}

/**
 * Build the ISO due time of a local date and time.
 * @param {number[]} parts year, month from 1, day, hours, and minutes
 * @returns {string} the ISO string
 */
function at(...parts) {
  const [year, month, day, hours, minutes] = parts;
  return new Date(year, month - 1, day, hours, minutes).toISOString();
}

describe('parseQuickAdd dates', () => {
  it('reads today and tomorrow as date-only due times (TSK-6)', () => {
    expect(parse('Call mom today')).toMatchObject({ description: 'Call mom', due: '2026-11-16', dateOnly: true });
    expect(parse('Call mom Tomorrow')).toMatchObject({ description: 'Call mom', due: '2026-11-17', dateOnly: true });
  });

  it('reads a weekday name as the next such day, today included while it lasts', () => {
    expect(parse('Pay rent friday').due).toBe('2026-11-20');
    expect(parse('Pay rent Sunday').due).toBe('2026-11-22');
    expect(parse('Pay rent monday').due).toBe('2026-11-16');
  });

  it('rolls a weekday to next week on the same day once its time passed', () => {
    expect(parse('Standup monday 9:00').due).toBe(at(2026, 11, 23, 9, 0));
    expect(parse('Standup monday 11:00').due).toBe(at(2026, 11, 16, 11, 0));
  });

  it('reads a yyyy-mm-dd date and leaves an impossible one as text', () => {
    expect(parse('Wrap gifts 2026-12-24')).toMatchObject({ description: 'Wrap gifts', due: '2026-12-24' });
    expect(parse('Wrap gifts 2026-02-30')).toMatchObject({ description: 'Wrap gifts 2026-02-30', due: null });
  });

  it('leaves short weekday names as text, so words like sun stay in the description', () => {
    expect(parse('Buy sun cream')).toMatchObject({ description: 'Buy sun cream', due: null });
  });

  it('takes the first date and leaves a later one in the description', () => {
    expect(parse('Move friday meeting to monday')).toMatchObject({ description: 'Move meeting to monday', due: '2026-11-20' });
  });
});

describe('parseQuickAdd times', () => {
  it('reads hh:mm as today, or tomorrow once the time passed', () => {
    expect(parse('Call 18:00')).toMatchObject({ description: 'Call', due: at(2026, 11, 16, 18, 0), dateOnly: false });
    expect(parse('Call 9:00').due).toBe(at(2026, 11, 17, 9, 0));
    expect(parse('Call 10:00').due).toBe(at(2026, 11, 17, 10, 0));
    expect(parse('Call 00:30').due).toBe(at(2026, 11, 17, 0, 30));
  });

  it('reads h am and h pm, with or without a space and minutes', () => {
    expect(parse('Call 6 pm').due).toBe(at(2026, 11, 16, 18, 0));
    expect(parse('Call 6pm').due).toBe(at(2026, 11, 16, 18, 0));
    expect(parse('Call 6:30 PM').due).toBe(at(2026, 11, 16, 18, 30));
    expect(parse('Call 12pm').due).toBe(at(2026, 11, 16, 12, 0));
    expect(parse('Call 12 am').due).toBe(at(2026, 11, 17, 0, 0));
    expect(parse('Call 11am').due).toBe(at(2026, 11, 16, 11, 0));
  });

  it('leaves impossible times as text', () => {
    expect(parse('Gate 25:00')).toMatchObject({ description: 'Gate 25:00', due: null });
    expect(parse('Gate 13 pm')).toMatchObject({ description: 'Gate 13 pm', due: null });
    expect(parse('Gate 7:60')).toMatchObject({ description: 'Gate 7:60', due: null });
  });

  it('combines a date and a time in any order and position', () => {
    const expected = { description: 'Buy paint', due: at(2026, 11, 17, 18, 0), dateOnly: false };
    expect(parse('Buy paint tomorrow 18:00')).toMatchObject(expected);
    expect(parse('18:00 Buy tomorrow paint')).toMatchObject(expected);
    expect(parse('tomorrow 6 pm Buy paint')).toMatchObject(expected);
    expect(parse('Buy paint 2026-11-17 18:00')).toMatchObject(expected);
  });

  it('keeps an explicit date even when its time already passed', () => {
    expect(parse('Call today 9:00').due).toBe(at(2026, 11, 16, 9, 0));
  });
});

describe('parseQuickAdd list tags', () => {
  it('matches tags ignoring case and accents, and removes them from the description (LST-10)', () => {
    const result = parse('Buy paint #HOME #cafe');
    expect(result.description).toBe('Buy paint');
    expect(result.lists.map((list) => list.id)).toEqual(['home', 'cafe']);
  });

  it('matches a list name with spaces written with dashes, underscores, or nothing', () => {
    for (const tag of ['#home-depot', '#home_depot', '#homedepot']) {
      expect(parse(`Buy nails ${tag}`).lists.map((list) => list.id)).toEqual(['depot']);
    }
  });

  it('keeps an unknown tag, and a tag of a list the user cannot add to, in the description (SHR-4)', () => {
    expect(parse('Sweep #garage')).toMatchObject({ description: 'Sweep #garage', lists: [] });
    expect(parse('Read #shared')).toMatchObject({ description: 'Read #shared', lists: [] });
    expect(parse('Plan #team').lists.map((list) => list.id)).toEqual(['team']);
  });

  it('joins each list once when tagged twice', () => {
    expect(parse('Dust #home #Home')).toMatchObject({ description: 'Dust', lists: [HOME] });
  });

  it('combines tags with a date and a time', () => {
    expect(parse('Buy paint tomorrow 18:00 #home')).toEqual({
      description: 'Buy paint', due: at(2026, 11, 17, 18, 0), dateOnly: false, lists: [HOME],
    });
  });
});

describe('parseQuickAdd literal text', () => {
  it('keeps text without tokens unchanged, apart from trimming', () => {
    expect(parse('  Buy   paint  ')).toEqual({ description: 'Buy   paint', due: null, dateOnly: false, lists: [] });
  });

  it('keeps an escaped token literal and drops its backslash', () => {
    expect(parse('Read \\tomorrow today')).toMatchObject({ description: 'Read tomorrow', due: '2026-11-16' });
    expect(parse('Use \\#home tag')).toMatchObject({ description: 'Use #home tag', lists: [] });
    expect(parse('Meet at 6 \\pm')).toMatchObject({ description: 'Meet at 6 pm', due: null });
    expect(parse('Open \\18:00')).toMatchObject({ description: 'Open 18:00', due: null });
  });

  it('keeps a backslash that does not escape a token', () => {
    expect(parse('Clean C:\\temp')).toMatchObject({ description: 'Clean C:\\temp', due: null });
  });

  it('adds the text literally when nothing would be left of the description', () => {
    expect(parse('tomorrow #home')).toEqual({ description: 'tomorrow #home', due: null, dateOnly: false, lists: [] });
  });

  it('keeps every tag as text without lists', () => {
    expect(parseQuickAdd('Buy paint #home')).toMatchObject({ description: 'Buy paint #home', lists: [] });
  });
});

describe('describeQuickAdd', () => {
  /**
   * Describe the parse of a text.
   * @param {string} text the typed text
   * @returns {string} the preview
   */
  const preview = (text) => describeQuickAdd(parse(text), NOW);

  it('names the due day and time and the lists', () => {
    expect(preview('Buy paint tomorrow 18:00 #home')).toBe('Due tomorrow 18:00 · List: Home');
    expect(preview('Buy paint #home #work')).toBe('Lists: Home, Work');
    expect(preview('Buy paint today')).toBe('Due today');
    expect(preview('Buy paint 6 pm')).toBe('Due today 18:00');
  });

  it('uses the weekday within a week, and the date beyond it', () => {
    expect(preview('Pay rent friday')).toBe('Due Friday');
    expect(preview('Standup monday 9:00')).toBe('Due Nov 23 09:00');
    expect(preview('Wrap gifts 2026-12-24')).toBe('Due Dec 24');
    expect(preview('File taxes 2027-01-05')).toBe('Due Jan 5, 2027');
  });

  it('is empty when the text sets nothing', () => {
    expect(preview('Buy paint')).toBe('');
    expect(preview('tomorrow')).toBe('');
  });
});
