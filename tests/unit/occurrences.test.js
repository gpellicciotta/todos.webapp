import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  applyEvent,
  applyRuleEdit,
  DEFAULT_RULES,
  displayTask,
  dueTimeOf,
  eventsTowardsStatus,
  firstOccurrence,
  foldEvents,
  foldInPlace,
  foldLog,
  foldLogCache,
  freshOccurrence,
  fromLegacyTask,
  graceOccurrence,
  isStale,
  mirrorOccurrence,
  normalizeRules,
  overdueHandlingOf,
  planRollOver,
  recurrenceLabel,
  refoldOccurrence,
  shouldExpire,
  STATUSES,
  statusFromCount,
  statusOf,
  toLegacyTask,
  USER_EVENT_TYPES,
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
    expect(STATUSES).toEqual(['ready', 'in-progress', 'completed', 'failed', 'cancelled']);
  });

  it('derives the status from the count', () => {
    expect([0, 1, 2, 3, 4].map((count) => statusFromCount(count, 3))).toEqual(['ready', 'in-progress', 'in-progress', 'completed', 'completed']);
  });
});

describe('folding events', () => {
  it('opens occurrence 1 ready, with the target and due time of the rules', () => {
    expect(fresh({ 'target-count': 3, 'due-time': at(60) })).toEqual(mirrorOccurrence({
      occurrence: 1, 'start-time': START, 'due-time': at(60), 'target-count': 3, 'completion-count': 0, status: 'ready', 'close-time': null,
    }));
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
    expect(applyEvent(fresh(), event('a', 'expire', 5))).toMatchObject({ status: 'failed', 'close-time': at(5) });
    expect(applyEvent(applyEvent(fresh(), event('b', 'complete', 1)), event('c', 'expire', 5))).toBeNull();
    const offline = [event('x', 'expire', 5), event('y', 'complete', 1)];
    expect(foldEvents(fresh(), offline)).toMatchObject({ status: 'completed', 'completion-count': 1 });
  });
});

describe('status edits as events', () => {
  const reach = (events, rules = {}) => foldEvents(fresh(rules), events.map((type, i) => event(`p${i}`, type, i)), { ...DEFAULT_RULES, ...rules });

  it('maps each status edit onto the events that reach it', () => {
    const byHand = STATUSES.filter((status) => status !== 'failed');
    for (const from of byHand) {
      for (const to of byHand) {
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
        'current-occurrence': mirrorOccurrence({
          occurrence: 1, 'start-time': START, 'due-time': at(60), 'target-count': 1, 'completion-count': count, status: current, 'close-time': closed,
        }),
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

describe('recurring tasks', () => {
  const WEEKLY = normalizeRules({ 'target-count': 3, 'recurrence-unit': 'week', 'recurrence-interval': 1, timezone: 'Europe/Brussels' });
  // Wednesday 17 June 2026; its ISO week runs from Monday 15 June, local midnight, to Monday 22 June.
  const CREATED = '2026-06-17T10:00:00.000Z';
  const WEEK_1 = { start: '2026-06-14T22:00:00.000Z', end: '2026-06-21T22:00:00.000Z' };
  const WEEK_ENDS = ['2026-06-21T22:00:00.000Z', '2026-06-28T22:00:00.000Z', '2026-07-05T22:00:00.000Z', '2026-07-12T22:00:00.000Z'];

  /**
   * Return a weekly task created on Wednesday, ticked once in its first week.
   * @param {object} [rules] rule fields over the weekly rules
   * @returns {object} the task
   */
  const weekly = (rules = {}) => {
    const all = normalizeRules({ ...WEEKLY, ...rules });
    return { 'lifecycle-rules': all, 'current-occurrence': applyEvent(firstOccurrence(all, CREATED), { type: 'complete', 'creation-time': CREATED }, all) };
  };

  it('opens occurrence 1 over the period containing the creation time', () => {
    expect(firstOccurrence(WEEKLY, CREATED)).toEqual(mirrorOccurrence({
      occurrence: 1, 'start-time': WEEK_1.start, 'due-time': WEEK_1.end, 'target-count': 3, 'completion-count': 0, status: 'ready', 'close-time': null,
    }));
  });

  it('rolls over missed periods: each closes with its status and its own roll-over event', () => {
    const task = weekly();
    const plan = planRollOver(task['lifecycle-rules'], task['current-occurrence'], '2026-07-08T10:00:00Z');
    expect(plan.occurrences.map((o) => [o.occurrence, o['start-time'], o['due-time'], o['completion-count'], o.status, o['close-time']])).toEqual([
      [1, WEEK_1.start, WEEK_ENDS[0], 1, 'in-progress', WEEK_ENDS[0]],
      [2, WEEK_ENDS[0], WEEK_ENDS[1], 0, 'ready', WEEK_ENDS[1]],
      [3, WEEK_ENDS[1], WEEK_ENDS[2], 0, 'ready', WEEK_ENDS[2]],
      [4, WEEK_ENDS[2], WEEK_ENDS[3], 0, 'ready', null],
    ]);
    expect(plan.events).toEqual([
      { type: 'roll-over', occurrence: 1, 'creation-time': WEEK_ENDS[0] },
      { type: 'roll-over', occurrence: 2, 'creation-time': WEEK_ENDS[1] },
      { type: 'roll-over', occurrence: 3, 'creation-time': WEEK_ENDS[2] },
    ]);
    expect(plan.current.occurrence).toBe(4);
  });

  it('changes nothing while the period covers now, for a closed occurrence, or for a one-off task', () => {
    const task = weekly();
    expect(planRollOver(task['lifecycle-rules'], task['current-occurrence'], '2026-06-21T21:59:59Z')).toEqual({ occurrences: [], events: [], current: task['current-occurrence'] });
    const cancelled = applyEvent(task['current-occurrence'], { type: 'cancel', 'creation-time': CREATED }, task['lifecycle-rules']);
    expect(planRollOver(task['lifecycle-rules'], cancelled, '2026-07-08T10:00:00Z').events).toEqual([]);
    expect(planRollOver(DEFAULT_RULES, fresh({ 'due-time': at(10) }), at(20)).events).toEqual([]);
  });

  it('ends the recurrence at its end count with end-recurrence, below target as cancelled', () => {
    const task = weekly({ 'recurrence-end-count': 3 });
    const plan = planRollOver(task['lifecycle-rules'], task['current-occurrence'], '2026-07-20T10:00:00Z');
    expect(plan.events.map((e) => [e.type, e.occurrence, e['creation-time']])).toEqual([
      ['roll-over', 1, WEEK_ENDS[0]], ['roll-over', 2, WEEK_ENDS[1]], ['end-recurrence', 3, WEEK_ENDS[2]],
    ]);
    expect(plan.current).toMatchObject({ occurrence: 3, status: 'cancelled', 'close-time': WEEK_ENDS[2] });
  });

  it('ends the recurrence when the next period would start after the end date, completed at target', () => {
    const rules = normalizeRules({ ...WEEKLY, 'target-count': 1, 'recurrence-end-date': '2026-06-28' });
    let occurrence = firstOccurrence(rules, CREATED);
    occurrence = applyEvent(occurrence, { type: 'complete', 'creation-time': CREATED }, rules);
    const first = planRollOver(rules, occurrence, '2026-06-24T10:00:00Z');
    expect(first.events.map((e) => e.type)).toEqual(['roll-over']);
    const done = applyEvent(first.current, { type: 'complete', 'creation-time': '2026-06-24T10:00:00Z' }, rules);
    const second = planRollOver(rules, done, '2026-07-08T10:00:00Z');
    expect(second.events.map((e) => [e.type, e.occurrence])).toEqual([['end-recurrence', 2]]);
    expect(second.current).toMatchObject({ occurrence: 2, status: 'completed', 'close-time': WEEK_ENDS[1] });
  });

  it('folds roll-over and end-recurrence events as the server does', () => {
    const open = { ...firstOccurrence(WEEKLY, CREATED), 'completion-count': 3, status: 'completed' };
    expect(applyEvent(open, { type: 'roll-over', 'creation-time': WEEK_1.end }, WEEKLY)).toMatchObject({ status: 'completed', 'close-time': WEEK_1.end });
    const partly = { ...open, 'completion-count': 1, status: 'in-progress' };
    expect(applyEvent(partly, { type: 'end-recurrence', 'creation-time': WEEK_1.end }, WEEKLY)).toMatchObject({ status: 'cancelled', 'close-time': WEEK_1.end });
  });

  it('refolds a closed occurrence with a late event: it stays closed and lifts its count', () => {
    const closed = planRollOver(WEEKLY, firstOccurrence(WEEKLY, CREATED), '2026-06-24T10:00:00Z').occurrences[0];
    const events = [
      { id: 'a', type: 'create', 'creation-time': CREATED },
      { id: 'b', type: 'roll-over', 'creation-time': WEEK_1.end },
      { id: 'c', type: 'complete', 'creation-time': '2026-06-21T21:59:59.999Z' },
    ];
    expect(refoldOccurrence(closed, events, WEEKLY)).toMatchObject({ 'completion-count': 1, status: 'in-progress', 'close-time': WEEK_1.end });
  });

  it('opens a fresh period containing now for a reopen, unless the end rules allow none', () => {
    const task = weekly();
    const cancelled = applyEvent(task['current-occurrence'], { type: 'cancel', 'creation-time': CREATED }, WEEKLY);
    expect(freshOccurrence(WEEKLY, cancelled, '2026-07-08T10:00:00Z')).toEqual(mirrorOccurrence({
      occurrence: 2, 'start-time': WEEK_ENDS[2], 'due-time': WEEK_ENDS[3], 'target-count': 3, 'completion-count': 0, status: 'ready', 'close-time': null,
    }));
    expect(freshOccurrence({ ...WEEKLY, 'recurrence-end-count': 1 }, cancelled, '2026-07-08T10:00:00Z')).toBeNull();
  });

  it('turns the open occurrence of a one-off task into the current period when it becomes recurring', () => {
    const task = { 'lifecycle-rules': { ...DEFAULT_RULES, 'target-count': 2 }, 'current-occurrence': applyEvent(firstOccurrence({ ...DEFAULT_RULES, 'target-count': 2 }, CREATED), { type: 'complete', 'creation-time': CREATED }) };
    const edited = applyRuleEdit(task, { 'recurrence-unit': 'week', 'recurrence-interval': 1, timezone: 'Europe/Brussels' }, '2026-06-24T10:00:00.000Z');
    expect(edited['current-occurrence']).toMatchObject({
      occurrence: 1, 'start-time': WEEK_ENDS[0], 'due-time': WEEK_ENDS[1], 'completion-count': 1, status: 'in-progress', 'close-time': null,
    });
  });

  it('opens a fresh period when a closed one-off task becomes recurring, and drops the deadline when recurrence stops', () => {
    const closed = applyEvent(firstOccurrence(DEFAULT_RULES, CREATED), { type: 'complete', 'creation-time': CREATED });
    const task = { 'lifecycle-rules': { ...DEFAULT_RULES }, 'current-occurrence': closed };
    const edited = applyRuleEdit(task, { 'recurrence-unit': 'week', 'recurrence-interval': 1, timezone: 'Europe/Brussels' }, '2026-06-24T10:00:00.000Z');
    expect(edited['current-occurrence']).toMatchObject({ occurrence: 2, 'start-time': WEEK_ENDS[0], status: 'ready', 'close-time': null });
    const stopped = applyRuleEdit({ 'lifecycle-rules': WEEKLY, 'current-occurrence': firstOccurrence(WEEKLY, CREATED) }, { 'recurrence-unit': null }, CREATED);
    expect(stopped['current-occurrence']).toMatchObject({ occurrence: 1, 'due-time': null, 'close-time': null });
  });

  it('keeps the period of the open occurrence on a unit, interval, or timezone edit', () => {
    const task = weekly();
    const edited = applyRuleEdit(task, { 'recurrence-unit': 'day', 'recurrence-interval': 2 }, CREATED);
    expect(edited['current-occurrence']).toMatchObject({ 'start-time': WEEK_1.start, 'due-time': WEEK_1.end });
    expect(planRollOver(edited['lifecycle-rules'], edited['current-occurrence'], '2026-06-22T10:00:00Z').current)
      .toMatchObject({ occurrence: 2, 'start-time': WEEK_1.end, 'due-time': '2026-06-23T22:00:00.000Z' });
  });

  it('shows a task past its period end as ready with count 0 until the roll-over', () => {
    const task = weekly();
    expect(isStale(task, '2026-06-21T21:59:59Z')).toBe(false);
    expect(displayTask(task, '2026-06-21T21:59:59Z')).toBe(task);
    expect(isStale(task, WEEK_1.end)).toBe(true);
    const shown = displayTask(task, WEEK_1.end);
    expect(shown['current-occurrence']).toMatchObject({ occurrence: 1, status: 'ready', 'completion-count': 0, 'target-count': 3, 'due-time': WEEK_1.end });
    expect(task['current-occurrence'].status).toBe('in-progress');
    const oneOff = { 'lifecycle-rules': DEFAULT_RULES, 'current-occurrence': fresh({ 'due-time': at(1) }) };
    expect(displayTask(oneOff, at(5))).toBe(oneOff);
  });

  it('names the occurrence that grace completion completes, within 24 hours of a period end', () => {
    const stale = weekly();
    expect(graceOccurrence(stale, '2026-06-21T21:00:00Z')).toBeNull();
    expect(graceOccurrence(stale, '2026-06-22T10:00:00Z')).toBe(1);
    expect(graceOccurrence(stale, '2026-06-22T22:00:01Z')).toBeNull();
    const rolled = { ...stale, 'current-occurrence': planRollOver(WEEKLY, stale['current-occurrence'], '2026-06-22T10:00:00Z').current };
    expect(graceOccurrence(rolled, '2026-06-22T10:00:00Z')).toBe(1);
    expect(graceOccurrence(rolled, '2026-06-23T10:00:00Z')).toBeNull();
    expect(graceOccurrence({ 'lifecycle-rules': DEFAULT_RULES, 'current-occurrence': fresh() }, at(5))).toBeNull();
  });

  it('describes a recurrence in words', () => {
    expect(['day', 'week', 'month'].map((unit) => recurrenceLabel({ 'recurrence-unit': unit, 'recurrence-interval': 1 }))).toEqual(['Daily', 'Weekly', 'Monthly']);
    expect(recurrenceLabel({ 'recurrence-unit': 'week', 'recurrence-interval': 2 })).toBe('Every 2 weeks');
    expect(recurrenceLabel(DEFAULT_RULES)).toBeNull();
  });
});

describe('fold test vectors', () => {
  const { vectors } = JSON.parse(readFileSync(new URL('../fixtures/fold-test-vectors.json', import.meta.url), 'utf8'));

  /**
   * Convert a vector event to the stored event shape.
   * @param {object} event the vector event, with `time`
   * @param {number} occurrence the occurrence number
   * @returns {object} the event
   */
  const stored = ({ time, ...rest }, occurrence) => ({ occurrence, 'creation-time': time, ...rest });

  it('runs the shared vectors', () => {
    expect(vectors.length).toBeGreaterThan(0);
    for (const vector of vectors) {
      let carried = vector['carried-reading'];
      for (const occurrence of vector.occurrences) {
        const { expected, goal } = occurrence;
        const source = vector.fold === 'migration' ? expected.migration.converted : occurrence.events;
        const events = source.map((event) => stored(event, occurrence.number));
        const folded = foldLog({ goal, recurring: occurrence.recurring, events, carriedReading: carried });
        const where = `${vector.name}, occurrence ${occurrence.number}`;
        expect(folded.entries, `${where} entries`).toEqual(expected.entries);
        expect(folded.progress, `${where} progress`).toBe(expected.progress);
        expect(folded['time-spent-seconds'], `${where} time`).toBe(expected['time-spent-seconds']);
        expect(folded.status, `${where} status`).toBe(expected.status);
        expect(folded['close-time'], `${where} close time`).toBe(expected['close-time']);
        carried = folded['carried-reading'];
        if (vector.fold === 'migration') {
          const inPlace = foldInPlace({
            target: goal.target,
            recurring: occurrence.recurring,
            events: occurrence.events.map((event) => stored(event, occurrence.number)),
          });
          expect(inPlace.progress, `${where} in-place progress`).toBe(expected.migration['in-place'].progress);
          expect(inPlace.status, `${where} in-place status`).toBe(expected.migration['in-place'].status);
          expect(inPlace['close-time'], `${where} in-place close time`).toBe(expected.migration['in-place']['close-time']);
        }
      }
    }
  });
});

describe('the log fold', () => {
  const goal = (fields) => ({ direction: 'at-least', measure: 'checks', target: 1, unit: null, ...fields });
  const log = (id, minutes, fields = {}) => ({ id, type: 'log', 'creation-time': at(minutes), ...fields });

  it('sums decimal amounts exactly', () => {
    const events = [log('e1', 1, { amount: 0.1 }), log('e2', 2, { amount: 0.2 })];
    const folded = foldLog({ goal: goal({ measure: 'amount', target: 0.3 }), events });
    expect(folded.progress).toBe(0.3);
    expect(folded.status).toBe('completed');
  });

  it('orders events with equal times by identifier', () => {
    const events = [log('e2', 1, { amount: 5 }), log('e1', 1, { amount: 9 })];
    const folded = foldLog({ goal: goal({ measure: 'reading', target: 100 }), events });
    expect(folded.entries).toEqual(['e1', 'e2']);
    expect(folded.progress).toBe(5);
    expect(folded['carried-reading']).toBe(5);
  });

  it('ignores the legacy complete and uncomplete events', () => {
    const events = [{ id: 'm1', type: 'complete', 'creation-time': at(1) }];
    expect(foldLog({ goal: goal(), events }).status).toBe('ready');
  });

  it('keeps a carried reading from completing an open occurrence', () => {
    const folded = foldLog({ goal: goal({ measure: 'reading', target: 50 }), recurring: true, events: [], carriedReading: 80 });
    expect(folded.progress).toBe(80);
    expect(folded.status).toBe('ready');
  });

  it('folds the legacy events in place with the new verdicts', () => {
    const events = [
      { id: 'm1', type: 'complete', 'creation-time': at(1) },
      { id: 'x1', type: 'expire', 'creation-time': at(9) },
    ];
    expect(foldInPlace({ target: 2, recurring: false, events })).toEqual({ progress: 1, status: 'failed', 'close-time': at(9) });
  });
});

describe('goal fields and their mirrors', () => {
  const GOAL = { 'goal-direction': 'at-least', 'goal-measure': 'checks', 'goal-target': 1, 'goal-unit': null };

  it('gives the default rules the goal fields and a null start time', () => {
    expect(DEFAULT_RULES).toMatchObject({ ...GOAL, 'start-time': null });
    expect(normalizeRules({ 'target-count': 4 })['goal-target']).toBe(4);
  });

  it('opens an occurrence with the goal snapshot, progress 0, and no time spent', () => {
    expect(fresh({ 'target-count': 3, 'goal-target': 3 })).toMatchObject({ ...GOAL, 'goal-target': 3, 'target-count': 3, progress: 0, 'time-spent-seconds': 0 });
  });

  it('keeps progress equal to the completion count through events', () => {
    let occurrence = fresh({ 'target-count': 2, 'goal-target': 2 });
    for (const type of ['complete', 'complete', 'uncomplete']) {
      occurrence = applyEvent(occurrence, { type, 'creation-time': START });
      expect(occurrence.progress).toBe(occurrence['completion-count']);
    }
    expect(occurrence.progress).toBe(1);
  });

  it('keeps goal-target equal to target-count through a rule edit', () => {
    const task = { 'lifecycle-rules': normalizeRules({}), 'current-occurrence': fresh() };
    const edited = applyRuleEdit(task, { 'target-count': 5 }, START);
    expect(edited['lifecycle-rules']['goal-target']).toBe(5);
    expect(edited['current-occurrence']).toMatchObject({ 'target-count': 5, 'goal-target': 5 });
  });

  it('resets progress with the count when a recurring period refolds or the display rule applies', () => {
    const open = { ...fresh(), 'completion-count': 1, progress: 1, status: 'completed' };
    expect(refoldOccurrence(open, [], DEFAULT_RULES)).toMatchObject({ 'completion-count': 0, progress: 0 });
  });
});

describe('log events in the in-place fold and the former fold', () => {
  const check = (id, minutes) => ({ id, type: 'log', checked: true, 'creation-time': at(minutes) });
  const undo = (id, minutes, target) => ({ id, type: 'undo-log', 'target-event-id': target, 'creation-time': at(minutes) });

  it('lists log and undo-log among the user events', () => {
    expect(USER_EVENT_TYPES).toEqual(expect.arrayContaining(['log', 'undo-log']));
  });

  it('folds a checked log and an undo-log in place like complete and uncomplete', () => {
    const events = [check('a', 1), check('b', 2), undo('c', 3, 'b'), check('d', 4)];
    const legacy = [event('a', 'complete', 1), event('b', 'complete', 2), event('c', 'uncomplete', 3), event('d', 'complete', 4)];
    expect(foldInPlace({ target: 2, events })).toEqual(foldInPlace({ target: 2, events: legacy }));
    expect(foldInPlace({ target: 2, events })).toMatchObject({ progress: 2, status: 'completed', 'close-time': at(4) });
  });

  it('ignores a log without a check in place', () => {
    const events = [{ id: 'a', type: 'log', amount: 3, 'creation-time': at(1) }];
    expect(foldInPlace({ target: 1, events })).toEqual({ progress: 0, status: 'ready', 'close-time': null });
  });

  it('counts a checked log like a completion in the former fold', () => {
    const once = applyEvent(fresh({ 'target-count': 2 }), check('a', 1));
    expect(once).toMatchObject({ 'completion-count': 1, progress: 1, status: 'in-progress' });
    const twice = applyEvent(once, check('b', 2));
    expect(twice).toMatchObject({ 'completion-count': 2, status: 'completed' });
    expect(applyEvent(twice, undo('c', 3, 'b'))).toMatchObject({ 'completion-count': 1, status: 'in-progress', 'close-time': null });
  });

  it('accepts a log without a check, or on a cancelled task, and leaves the occurrence unchanged', () => {
    const open = fresh();
    expect(applyEvent(open, { id: 'a', type: 'log', 'time-spent-seconds': 60, 'creation-time': at(1) })).toEqual(open);
    const cancelled = applyEvent(open, event('x', 'cancel', 1));
    expect(applyEvent(cancelled, check('b', 2))).toEqual(cancelled);
  });

  it('refuses an undo-log below zero, and lets a failed occurrence reopen', () => {
    expect(applyEvent(fresh(), undo('c', 1, 'a'))).toBeNull();
    const failed = { ...fresh(), status: 'failed', 'close-time': at(5) };
    expect(applyEvent(failed, event('r', 'reopen', 6))).toMatchObject({ status: 'ready', 'close-time': null });
    expect(applyEvent(failed, check('b', 6))).toMatchObject({ status: 'failed', 'completion-count': 1 });
  });
});

describe('the log cache of mixed legacy and log histories', () => {
  const occurrence = () => ({ ...fresh({ 'target-count': 3 }), occurrence: 1 });
  const stored = (id, type, minutes, fields = {}) => ({ id, type, occurrence: 1, 'creation-time': at(minutes), ...fields });

  it('rebuilds time, live entries, and undos next to legacy completions', () => {
    const events = [
      stored('c1', 'complete', 1),
      stored('l1', 'log', 2, { 'time-spent-seconds': 60 }),
      stored('c2', 'complete', 3),
      stored('u1', 'undo-log', 4, { 'target-event-id': 'l1' }),
      stored('l2', 'log', 5, { 'time-spent-seconds': 30, checked: true }),
    ];
    const cache = foldLogCache(occurrence(), events, DEFAULT_RULES);
    expect(cache).toMatchObject({ progress: 3, 'completion-count': 3, 'time-spent-seconds': 30, status: 'completed' });
    expect(cache.entries.map((entry) => entry.id)).toEqual(['c1', 'c2', 'l2']);
  });

  it('lets an uncomplete undo the latest legacy check, and drops an ignored one', () => {
    const events = [stored('x0', 'uncomplete', 0), stored('c1', 'complete', 1), stored('c2', 'complete', 2), stored('n1', 'uncomplete', 3), stored('l1', 'log', 4, { amount: 2 })];
    const cache = foldLogCache(occurrence(), events, DEFAULT_RULES);
    expect(cache).toMatchObject({ progress: 1, status: 'in-progress' });
    expect(cache.entries.map((entry) => entry.id)).toEqual(['c1', 'l1']);
  });
});

describe('legacy uncomplete events beside checked logs', () => {
  const stored = (id, type, minutes, fields = {}) => ({ id, type, occurrence: 1, 'creation-time': at(minutes), ...fields });
  const target3 = () => ({ ...fresh({ 'target-count': 3 }), occurrence: 1 });

  it('undoes the latest live check, which may be a checked log with time', () => {
    const events = [stored('a', 'complete', 1), stored('b', 'log', 2, { checked: true, 'time-spent-seconds': 45 }), stored('n', 'uncomplete', 3)];
    const cache = foldLogCache(target3(), events, DEFAULT_RULES);
    expect(cache).toMatchObject({ progress: 1, 'time-spent-seconds': 0 });
    expect(cache.entries.map((entry) => entry.id)).toEqual(['a']);
  });

  it('skips a check that an earlier undo-log already took back', () => {
    const events = [
      stored('a', 'complete', 1),
      stored('b', 'log', 2, { checked: true, amount: 3 }),
      stored('u', 'undo-log', 3, { 'target-event-id': 'b' }),
      stored('n', 'uncomplete', 4),
    ];
    const cache = foldLogCache(target3(), events, DEFAULT_RULES);
    expect(cache).toMatchObject({ progress: 0, status: 'ready' });
    expect(cache.entries).toEqual([]);
  });
});
