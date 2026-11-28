import { afterEach, describe, expect, it } from 'vitest';
import { applyRollOver, startOverdueTimer } from '../../src/js/core/overdue.js';
import { freshStore } from './store-helpers.js';

// The store clock starts on Wednesday 4 November 2026, 09:00 UTC; its Brussels week runs from 1 November 23:00 UTC.
const WEEK_ENDS = ['2026-11-08T23:00:00.000Z', '2026-11-15T23:00:00.000Z', '2026-11-22T23:00:00.000Z'];
const WEEKLY = { 'recurrence-unit': 'week', 'recurrence-interval': 1, timezone: 'Europe/Brussels' };
const DAY_MS = 86_400_000;

let store;

afterEach(() => {
  store?.close();
});

/**
 * Open a store and create a weekly task in it.
 * @param {object} [options] `connected` for a store whose writes join the change queue, and extra rules
 * @returns {Promise<{task: object, clock: object}>} the task and the store clock
 */
async function weeklyTask({ connected = false, rules = {} } = {}) {
  const opened = await freshStore({ tracking: () => connected });
  store = opened.store;
  const task = await store.createTask({ description: 'Water the plants', 'lifecycle-rules': { ...WEEKLY, ...rules } });
  return { task, clock: opened.clock };
}

describe('local roll-over', () => {
  it('opens occurrence 1 over the current week', async () => {
    const { task } = await weeklyTask();
    expect(task['current-occurrence']).toMatchObject({ occurrence: 1, 'start-time': '2026-11-01T23:00:00.000Z', 'due-time': WEEK_ENDS[0] });
  });

  it('rolls a task over missed weeks with roll-over events, outside the change queue', async () => {
    const { task, clock } = await weeklyTask();
    await store.postEvent(task.id, 'complete');
    clock.tick(14 * DAY_MS);
    const rolled = await store.rollOverTask(task.id);
    expect(rolled['current-occurrence']).toMatchObject({ occurrence: 3, status: 'ready', 'completion-count': 0, 'due-time': WEEK_ENDS[2] });
    expect((await store.occurrencesOfTask(task.id)).map((o) => [o.occurrence, o.status, o['completion-count'], o['close-time']])).toEqual([
      [1, 'completed', 1, WEEK_ENDS[0]], [2, 'ready', 0, WEEK_ENDS[1]], [3, 'ready', 0, null],
    ]);
    expect((await store.eventsOfTask(task.id)).map((e) => [e.type, e.occurrence])).toEqual([
      ['create', 1], ['log', 1], ['roll-over', 1], ['roll-over', 2],
    ]);
    expect(await store.queue.all()).toEqual([]);
    expect(await store.rollOverTask(task.id)).toBeNull();
  });

  it('ends a recurrence at its end count', async () => {
    const { task, clock } = await weeklyTask({ rules: { 'recurrence-end-count': 2 } });
    clock.tick(21 * DAY_MS);
    const ended = await store.rollOverTask(task.id);
    expect(ended['current-occurrence']).toMatchObject({ occurrence: 2, status: 'cancelled', 'close-time': WEEK_ENDS[1] });
    expect((await store.eventsOfTask(task.id)).map((e) => e.type)).toEqual(['create', 'roll-over', 'end-recurrence']);
  });

  it('rolls over before an event, so a tick after the week joins the next occurrence', async () => {
    const { task, clock } = await weeklyTask();
    await store.postEvent(task.id, 'complete');
    clock.tick(7 * DAY_MS);
    const { task: after, event } = await store.postEvent(task.id, 'complete');
    expect(event.occurrence).toBe(2);
    expect(after['current-occurrence']).toMatchObject({ occurrence: 2, status: 'completed', 'close-time': null });
  });

  it('completes the previous week within the 24-hour grace period, and refuses it later', async () => {
    const { task, clock } = await weeklyTask();
    clock.now = Date.parse(WEEK_ENDS[0]) + 3_600_000;
    const { task: after, event } = await store.postEvent(task.id, 'complete', { occurrence: 1 });
    expect(event).toMatchObject({ occurrence: 1, 'creation-time': '2026-11-08T22:59:59.999Z' });
    expect(after['current-occurrence']).toMatchObject({ occurrence: 2, status: 'ready', 'completion-count': 0 });
    expect((await store.occurrencesOfTask(task.id))[0]).toMatchObject({ occurrence: 1, status: 'completed', 'completion-count': 1, 'close-time': WEEK_ENDS[0] });
    clock.now = Date.parse(WEEK_ENDS[0]) + DAY_MS + 1;
    await expect(store.postEvent(task.id, 'complete', { occurrence: 1 })).rejects.toMatchObject({ code: 'conflict' });
  });

  it('reopens a cancelled recurring task in a fresh period', async () => {
    const { task, clock } = await weeklyTask();
    await store.postEvent(task.id, 'cancel');
    clock.tick(7 * DAY_MS);
    expect(await store.rollOverTask(task.id)).toBeNull();
    const { task: after, event } = await store.postEvent(task.id, 'reopen');
    expect(event.occurrence).toBe(2);
    expect(after['current-occurrence']).toMatchObject({ occurrence: 2, status: 'ready', 'start-time': WEEK_ENDS[0], 'due-time': WEEK_ENDS[1] });
  });

  it('logs rule edits locally as edit-lifecycle-rules events and checks the timezone', async () => {
    const { task } = await weeklyTask();
    await store.updateRules(task.id, { 'recurrence-interval': 2 });
    const events = await store.eventsOfTask(task.id);
    expect(events.at(-1)).toMatchObject({ type: 'edit-lifecycle-rules', details: { 'recurrence-interval': { old: 1, new: 2 } } });
    await expect(store.updateRules(task.id, { timezone: 'Mars/Olympus' })).rejects.toMatchObject({ name: 'ValidationError' });
  });
});

describe('the minute timer', () => {
  it('rolls recurring tasks over beside the overdue handling, only while rollOver allows it', async () => {
    const { task, clock } = await weeklyTask();
    clock.tick(7 * DAY_MS);
    const intervals = [];
    const timer = (rollOver) => startOverdueTimer({
      store, now: () => new Date(clock.now), rollOver, setInterval: (run) => intervals.push(run), clearInterval: () => {},
    });
    const skipped = timer(() => false);
    await skipped.idle();
    expect((await store.getTask(task.id))['current-occurrence'].occurrence).toBe(1);
    const stop = timer(() => true);
    await stop.idle();
    expect((await store.getTask(task.id))['current-occurrence'].occurrence).toBe(2);
    expect(await applyRollOver(store, new Date(clock.now))).toEqual([]);
  });
});

describe('connected display rule', () => {
  it('never rolls over while connected', async () => {
    const { task, clock } = await weeklyTask({ connected: true });
    clock.tick(7 * DAY_MS);
    expect(await store.rollOverTask(task.id)).toBeNull();
  });

  it('applies a tick past the week end to the next period and lets the server place it', async () => {
    const { task, clock } = await weeklyTask({ connected: true });
    clock.tick(7 * DAY_MS);
    const { task: after } = await store.postEvent(task.id, 'complete');
    expect(after['current-occurrence']).toMatchObject({ occurrence: 2, status: 'completed', 'completion-count': 1, 'due-time': WEEK_ENDS[1] });
    const posted = (await store.queue.all()).filter((entry) => entry.operation === 'post-event');
    expect(posted.at(-1).fields).toEqual({ id: posted.at(-1).fields.id, type: 'log', checked: true, 'creation-time': '2026-11-11T09:00:00.000Z' });
  });

  it('names the cached occurrence for grace completion before the server rolls over', async () => {
    const { task, clock } = await weeklyTask({ connected: true });
    clock.now = Date.parse(WEEK_ENDS[0]) + 3_600_000;
    const { task: after } = await store.postEvent(task.id, 'complete', { occurrence: 1 });
    expect(after['current-occurrence']).toMatchObject({ occurrence: 1, 'completion-count': 1 });
    const posted = (await store.queue.all()).filter((entry) => entry.operation === 'post-event');
    expect(posted.at(-1).fields).toMatchObject({ type: 'log', checked: true, occurrence: 1 });
  });
});
