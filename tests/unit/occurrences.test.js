import { describe, expect, it } from 'vitest';
import {
  applyEvent,
  applyRuleEdit,
  DEFAULT_RULES,
  dueTimeOf,
  eventsTowardsStatus,
  firstOccurrence,
  foldEvents,
  fromLegacyTask,
  normalizeRules,
  overdueHandlingOf,
  shouldExpire,
  STATUSES,
  statusFromCount,
  statusOf,
  toLegacyTask,
} from '../../src/js/core/occurrences.js';

const START = '2026-11-01T09:00:00.000Z';

/**
 * Return a time a number of minutes after the start.
 * @param {number} minutes the minutes after the start
 * @returns {string} the ISO time
 */
const at = (minutes) => new Date(Date.parse(START) + minutes * 60_000).toISOString();

/**
 * Build an event.
 * @param {string} id the identifier
 * @param {string} type the event type
 * @param {number} minutes its creation time, in minutes after the start
 * @returns {object} the event
 */
const event = (id, type, minutes) => ({ id, type, 'creation-time': at(minutes) });

/**
 * Return occurrence 1 of a one-off task.
 * @param {object} [rules] rule fields over the defaults
 * @returns {object} the open occurrence
 */
const fresh = (rules = {}) => firstOccurrence({ ...DEFAULT_RULES, ...rules }, START);

describe('statuses', () => {
  it('uses ready instead of todo, in lifecycle order', () => {
    expect(STATUSES).toEqual(['ready', 'in-progress', 'completed', 'cancelled']);
  });

  it('derives the status from the count', () => {
    expect([0, 1, 2, 3, 4].map((count) => statusFromCount(count, 3))).toEqual(['ready', 'in-progress', 'in-progress', 'completed', 'completed']);
  });
});

describe('folding events', () => {
  it('opens occurrence 1 ready, with the target and due time of the rules', () => {
    expect(fresh({ 'target-count': 3, 'due-time': at(60) })).toEqual({
      occurrence: 1, 'start-time': START, 'due-time': at(60), 'target-count': 3, 'completion-count': 0, status: 'ready', 'close-time': null,
    });
  });

  it('folds in creation-time order, then by identifier', () => {
    const occurrence = fresh({ 'target-count': 3 });
    expect(foldEvents(occurrence, [event('a', 'uncomplete', 2), event('b', 'complete', 1)])).toMatchObject({ 'completion-count': 0, status: 'ready' });
    expect(foldEvents(occurrence, [event('b', 'start', 1), event('a', 'unstart', 1)])).toMatchObject({ status: 'in-progress' });
  });

  it('ignores an event whose precondition fails at its place', () => {
    const events = ['start', 'start', 'unstart', 'complete', 'cancel', 'complete', 'uncomplete'].map((type, i) => event(`e${i}`, type, i));
    expect(foldEvents(fresh(), events)).toMatchObject({ 'completion-count': 1, status: 'cancelled', 'close-time': at(4) });
  });

  it('closes a one-off occurrence on completion or cancel, and reopens it when it leaves them', () => {
    const completed = applyEvent(fresh(), event('a', 'complete', 1));
    expect(completed).toMatchObject({ status: 'completed', 'completion-count': 1, 'close-time': at(1) });
    expect(applyEvent(completed, event('b', 'uncomplete', 2))).toMatchObject({ status: 'ready', 'completion-count': 0, 'close-time': null });
    const cancelled = applyEvent(fresh(), event('c', 'cancel', 3));
    expect(cancelled).toMatchObject({ status: 'cancelled', 'close-time': at(3) });
    expect(applyEvent(cancelled, event('d', 'reopen', 4))).toMatchObject({ status: 'ready', 'close-time': null });
  });

  it('counts every tick of a target-3 task and allows ticking past the target', () => {
    const ticks = [1, 2, 3, 4].map((minutes) => event(`t${minutes}`, 'complete', minutes));
    const states = ticks.map((_, i) => foldEvents(fresh({ 'target-count': 3 }), ticks.slice(0, i + 1)));
    expect(states.map((state) => [state['completion-count'], state.status, state['close-time']])).toEqual([
      [1, 'in-progress', null], [2, 'in-progress', null], [3, 'completed', at(3)], [4, 'completed', at(3)],
    ]);
  });

  it('refuses events whose precondition fails, and ignores server events without effect', () => {
    expect(applyEvent(fresh(), event('a', 'uncomplete', 1))).toBeNull();
    expect(applyEvent(fresh(), event('b', 'unstart', 1))).toBeNull();
    expect(applyEvent(fresh(), event('c', 'reopen', 1))).toBeNull();
    expect(applyEvent(applyEvent(fresh(), event('d', 'cancel', 1)), event('e', 'complete', 2))).toBeNull();
    expect(applyEvent(fresh(), event('f', 'create', 0))).toEqual(fresh());
  });

  it('expires an open occurrence below target, and nothing else', () => {
    expect(applyEvent(fresh(), event('a', 'expire', 5))).toMatchObject({ status: 'cancelled', 'close-time': at(5) });
    expect(applyEvent(applyEvent(fresh(), event('b', 'complete', 1)), event('c', 'expire', 5))).toBeNull();
    const offline = [event('x', 'expire', 5), event('y', 'complete', 1)];
    expect(foldEvents(fresh(), offline)).toMatchObject({ status: 'completed', 'completion-count': 1 });
  });
});

describe('status edits as events', () => {
  const reach = (events, rules = {}) => foldEvents(fresh(rules), events.map((type, i) => event(`p${i}`, type, i)), { ...DEFAULT_RULES, ...rules });

  it('maps each status edit onto the events that reach it', () => {
    for (const from of STATUSES) {
      for (const to of STATUSES) {
        const start = reach(eventsTowardsStatus(fresh(), from));
        const types = eventsTowardsStatus(start, to);
        const end = foldEvents(start, types.map((type, i) => event(`q${i}`, type, 100 + i)));
        expect([from, to, end.status]).toEqual([from, to, to]);
      }
    }
  });

  it('names the events of the todos.server mapping', () => {
    const completed = reach(['complete']);
    const cancelled = reach(['cancel']);
    expect(eventsTowardsStatus(fresh(), 'completed')).toEqual(['complete']);
    expect(eventsTowardsStatus(fresh(), 'cancelled')).toEqual(['cancel']);
    expect(eventsTowardsStatus(fresh(), 'in-progress')).toEqual(['start']);
    expect(eventsTowardsStatus(completed, 'ready')).toEqual(['uncomplete']);
    expect(eventsTowardsStatus(completed, 'in-progress')).toEqual(['uncomplete', 'start']);
    expect(eventsTowardsStatus(cancelled, 'in-progress')).toEqual(['reopen', 'start']);
    expect(eventsTowardsStatus(reach(['start']), 'ready')).toEqual(['unstart']);
    expect(eventsTowardsStatus(fresh({ 'target-count': 3 }), 'completed')).toEqual(['complete', 'complete', 'complete']);
    expect(eventsTowardsStatus(fresh(), 'ready')).toEqual([]);
  });
});

describe('rules', () => {
  it('moves the deadline and target of the open occurrence with a rule edit', () => {
    const task = { 'lifecycle-rules': { ...DEFAULT_RULES }, 'current-occurrence': applyEvent(fresh(), event('a', 'complete', 1)) };
    const raised = applyRuleEdit(task, { 'target-count': 2, 'due-time': at(90) }, at(2));
    expect(raised['lifecycle-rules']).toMatchObject({ 'target-count': 2, 'due-time': at(90) });
    expect(raised['current-occurrence']).toMatchObject({ 'target-count': 2, 'due-time': at(90), status: 'in-progress', 'close-time': null });
  });

  it('keeps the due time and overdue handling of a recurring task empty', () => {
    const weekly = { 'recurrence-unit': 'week', 'recurrence-interval': 1, timezone: 'Europe/Brussels' };
    expect(normalizeRules({ ...weekly, 'overdue-handling': 'keep', 'due-time': at(5) })).toMatchObject({ ...weekly, 'due-time': null, 'overdue-handling': null });
    const task = { 'lifecycle-rules': normalizeRules(weekly), 'current-occurrence': fresh() };
    expect(applyRuleEdit(task, { 'overdue-handling': 'keep', 'due-time': at(9) }, at(1))['lifecycle-rules']).toMatchObject({ 'due-time': null, 'overdue-handling': null });
    expect(applyRuleEdit(task, { 'recurrence-unit': null }, at(1))['lifecycle-rules']).toMatchObject({ 'overdue-handling': 'keep', timezone: null });
  });

  it('expires a one-off task past its deadline with overdue handling cancel', () => {
    const task = (rules, occurrence = fresh(rules)) => ({ 'lifecycle-rules': { ...DEFAULT_RULES, ...rules }, 'current-occurrence': occurrence });
    expect(shouldExpire(task({ 'due-time': at(10), 'overdue-handling': 'cancel' }), Date.parse(at(11)))).toBe(true);
    expect(shouldExpire(task({ 'due-time': at(10), 'overdue-handling': 'cancel' }), Date.parse(at(9)))).toBe(false);
    expect(shouldExpire(task({ 'due-time': at(10), 'overdue-handling': 'keep' }), Date.parse(at(11)))).toBe(false);
    const done = applyEvent(fresh({ 'due-time': at(10) }), event('a', 'complete', 1));
    expect(shouldExpire(task({ 'due-time': at(10), 'overdue-handling': 'cancel' }, done), Date.parse(at(11)))).toBe(false);
  });

  it('reads status, due time, and overdue handling of a task', () => {
    const task = { 'lifecycle-rules': { ...DEFAULT_RULES, 'due-time': at(10), 'overdue-handling': 'cancel' }, 'current-occurrence': fresh({ 'due-time': at(10) }) };
    expect([statusOf(task), dueTimeOf(task), overdueHandlingOf(task)]).toEqual(['ready', at(10), 'cancel']);
  });
});

describe('the former task shape', () => {
  const legacy = (status, fields = {}) => ({
    id: 't1', description: 'Paint', status, 'due-time': at(60), 'overdue-handling': 'cancel', 'owner-id': 7,
    'creation-time': START, 'last-update-time': at(5), 'last-activity-time': at(9), 'deletion-time': null, ...fields,
  });
  let counter = 0;
  const newId = () => `e${counter++}`;

  it('converts each status like the server migration', () => {
    const cases = {
      todo: [0, 'ready', null, ['create']],
      'in-progress': [0, 'in-progress', null, ['create', 'start']],
      completed: [1, 'completed', at(5), ['create', 'complete']],
      cancelled: [0, 'cancelled', at(5), ['create', 'cancel']],
    };
    for (const [status, [count, current, closed, types]] of Object.entries(cases)) {
      const { task, events } = fromLegacyTask(legacy(status), newId);
      expect(task).toEqual({
        id: 't1', description: 'Paint', 'owner-id': 7,
        'lifecycle-rules': { ...DEFAULT_RULES, 'due-time': at(60), 'overdue-handling': 'cancel' },
        'current-occurrence': {
          occurrence: 1, 'start-time': START, 'due-time': at(60), 'target-count': 1, 'completion-count': count, status: current, 'close-time': closed,
        },
        'creation-time': START, 'last-update-time': at(9), 'deletion-time': null,
      });
      expect(events.map((e) => [e.type, e['creation-time'], e['owner-id'], e.occurrence, e['task-id']])).toEqual(types.map((type) => [
        type, type === 'create' ? START : at(5), type === 'create' ? 7 : null, 1, 't1',
      ]));
    }
  });

  it('keeps the revision of a synced task', () => {
    expect(fromLegacyTask(legacy('todo', { revision: 12 }), newId).task.revision).toBe(12);
  });

  it('converts back to the former shape for backups', () => {
    for (const status of ['todo', 'in-progress', 'completed', 'cancelled']) {
      const { task } = fromLegacyTask(legacy(status), newId);
      expect(toLegacyTask(task)).toEqual({ ...legacy(status), 'last-update-time': at(9), 'last-activity-time': at(9) });
    }
  });
});
