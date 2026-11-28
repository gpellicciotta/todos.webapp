import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { applyOverdueHandling, isOverdue, startOverdueTimer } from '../../src/js/core/overdue.js';
import { filterTasks } from '../../src/js/core/query.js';
import { freshStore } from './store-helpers.js';
import { shapeTask } from './task-shape.js';

const NOW = Date.UTC(2026, 10, 4, 9, 0, 0);

/**
 * Build a task record for the pure overdue check.
 * @param {object} fields fields that differ from an open task due one second before NOW
 * @returns {object} the task
 */
function taskWith(fields) {
  return shapeTask({ 'due-time': new Date(NOW - 1000).toISOString(), ...fields });
}

describe('isOverdue', () => {
  it.each(['ready', 'in-progress'])('is true for a %s task whose due time passed', (status) => {
    expect(isOverdue(taskWith({ status }), new Date(NOW))).toBe(true);
  });

  it.each(['completed', 'cancelled'])('is false for a %s task whose due time passed', (status) => {
    expect(isOverdue(taskWith({ status }), new Date(NOW))).toBe(false);
  });

  it('is false for a task without a due time', () => {
    expect(isOverdue(taskWith({ 'due-time': null }), new Date(NOW))).toBe(false);
  });

  it('is false until the due time has passed', () => {
    const due = new Date(NOW).toISOString();
    expect(isOverdue(taskWith({ 'due-time': due }), new Date(NOW - 1))).toBe(false);
    expect(isOverdue(taskWith({ 'due-time': due }), new Date(NOW))).toBe(false);
    expect(isOverdue(taskWith({ 'due-time': due }), new Date(NOW + 1))).toBe(true);
  });

  it('accepts the current time as milliseconds', () => {
    expect(isOverdue(taskWith({}), NOW)).toBe(true);
  });
});

describe('applyOverdueHandling', () => {
  let store;
  let clock;

  beforeEach(async () => {
    ({ store, clock } = await freshStore());
  });

  afterEach(() => {
    store.close();
  });

  it('expires overdue cancel tasks through an expire event and leaves every other task unchanged', async () => {
    const past = new Date(clock.now + 30_000).toISOString();
    const future = new Date(clock.now + 3_600_000).toISOString();
    const cancel = await store.createTask({ description: 'Cancel me', 'due-time': past, 'overdue-handling': 'fail' });
    const started = await store.createTask({
      description: 'Started', status: 'in-progress', 'due-time': past, 'overdue-handling': 'fail',
    });
    const keep = await store.createTask({ description: 'Keep me', 'due-time': past });
    const later = await store.createTask({ description: 'Later', 'due-time': future, 'overdue-handling': 'fail' });
    const done = await store.createTask({
      description: 'Done', status: 'completed', 'due-time': past, 'overdue-handling': 'fail',
    });
    const dropped = await store.createTask({
      description: 'Dropped', status: 'cancelled', 'due-time': past, 'overdue-handling': 'fail',
    });
    const trashed = await store.createTask({ description: 'Trashed', 'due-time': past, 'overdue-handling': 'fail' });
    await store.deleteTask(trashed.id);
    const untouched = [keep, later, done, dropped, await store.getTask(trashed.id)];

    clock.tick(60_000);
    const cancelled = await applyOverdueHandling(store, new Date(clock.now));

    expect(cancelled.map((task) => task.id).sort()).toEqual([cancel.id, started.id].sort());
    for (const id of [cancel.id, started.id]) {
      expect(await store.getTask(id)).toMatchObject({
        'current-occurrence': { status: 'failed', 'close-time': '2026-11-04T09:01:00.000Z' },
        'last-update-time': '2026-11-04T09:01:00.000Z',
      });
      expect((await store.eventsOfTask(id)).at(-1)).toMatchObject({ type: 'expire', 'owner-id': null, 'creation-time': '2026-11-04T09:01:00.000Z' });
    }
    for (const task of untouched) {
      expect(await store.getTask(task.id)).toEqual(task);
    }
  });

  it('leaves a task alone that was completed or deleted after the first read', async () => {
    const past = new Date(clock.now + 30_000).toISOString();
    const completed = await store.createTask({ description: 'Done meanwhile', 'due-time': past, 'overdue-handling': 'fail' });
    const deleted = await store.createTask({ description: 'Gone meanwhile', 'due-time': past, 'overdue-handling': 'fail' });
    const open = await store.createTask({ description: 'Still open', 'due-time': past, 'overdue-handling': 'fail' });
    const snapshot = await store.listTasks();
    await store.updateTask(completed.id, { status: 'completed' });
    await store.deleteTask(deleted.id);
    const stale = { ...store, listTasks: async () => snapshot };

    clock.tick(60_000);
    const cancelled = await applyOverdueHandling(stale, new Date(clock.now));

    expect(cancelled.map((task) => task.id)).toEqual([open.id]);
    expect(await store.getTask(completed.id)).toMatchObject({ 'current-occurrence': { status: 'completed' } });
    expect(await store.getTask(deleted.id)).toMatchObject({ 'current-occurrence': { status: 'ready' } });
  });

  it('returns no tasks when nothing is overdue', async () => {
    await store.createTask({ description: 'Open', 'overdue-handling': 'fail' });
    expect(await applyOverdueHandling(store, new Date(clock.now))).toEqual([]);
  });
});

describe('startOverdueTimer', () => {
  let store;

  beforeEach(async () => {
    // Only the interval timers and Date are fake; fake-indexeddb keeps its real setImmediate.
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'Date'] });
    vi.setSystemTime(NOW);
    ({ store } = await freshStore({ now: () => new Date() }));
  });

  afterEach(() => {
    store.close();
    vi.useRealTimers();
  });

  it('runs on start and then every minute, cancelling a task right after its due time', async () => {
    const overdueOnStart = await store.createTask({
      description: 'Missed while closed', 'due-time': new Date(NOW - 60_000).toISOString(), 'overdue-handling': 'fail',
    });
    const dueSoon = await store.createTask({
      description: 'Due soon', 'due-time': new Date(NOW + 30_000).toISOString(), 'overdue-handling': 'fail',
    });

    const stop = startOverdueTimer({ store });
    await stop.idle();
    const statusOf = async (id) => (await store.getTask(id))['current-occurrence'].status;
    expect(await statusOf(overdueOnStart.id)).toBe('failed');
    expect(await statusOf(dueSoon.id)).toBe('ready');

    await vi.advanceTimersByTimeAsync(59_999);
    await stop.idle();
    expect(await statusOf(dueSoon.id)).toBe('ready');

    await vi.advanceTimersByTimeAsync(1);
    await stop.idle();
    expect(await store.getTask(dueSoon.id)).toMatchObject({
      'current-occurrence': { status: 'failed' },
      'last-update-time': '2026-11-04T09:01:00.000Z',
    });


    stop();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('reports a failed run and keeps running', async () => {
    const failing = { listTasks: vi.fn().mockRejectedValue(new Error('boom')) };
    const onError = vi.fn();
    const stop = startOverdueTimer({ store: failing, onError });
    await stop.idle();
    await vi.advanceTimersByTimeAsync(60_000);
    await stop.idle();
    stop();
    expect(onError).toHaveBeenCalledTimes(2);
    expect(onError.mock.calls[0][0].message).toBe('boom');
  });
});

describe('expiry by goal (OVD-4)', () => {
  let store;
  let clock;

  beforeEach(async () => {
    ({ store, clock } = await freshStore());
  });

  afterEach(() => {
    store.close();
  });

  const due = () => new Date(clock.now + 30_000).toISOString();
  const statusOf = async (id) => (await store.getTask(id))['current-occurrence'].status;

  it('leaves an at-least task under keep open and overdue', async () => {
    const task = await store.createTask({ description: 'Keep', 'due-time': due(), 'overdue-handling': 'keep' });
    clock.tick(60_000);
    expect(await applyOverdueHandling(store, new Date(clock.now))).toEqual([]);
    expect(await statusOf(task.id)).toBe('ready');
    expect(isOverdue(await store.getTask(task.id), new Date(clock.now))).toBe(true);
  });

  it('fails an at-least task under fail, and expires once per occurrence when it is reopened', async () => {
    const task = await store.createTask({ description: 'Fail', 'due-time': due(), 'overdue-handling': 'fail' });
    clock.tick(60_000);
    expect(await applyOverdueHandling(store, new Date(clock.now))).toHaveLength(1);
    expect(await statusOf(task.id)).toBe('failed');
    await store.postEvent(task.id, 'reopen');
    expect(await statusOf(task.id)).toBe('ready');
    clock.tick(60_000);
    expect(await applyOverdueHandling(store, new Date(clock.now))).toEqual([]);
    expect(await statusOf(task.id)).toBe('ready');
    expect((await store.eventsOfTask(task.id)).filter((event) => event.type === 'expire')).toHaveLength(1);
  });

  it('closes an at-most task at its due time with the verdict of its progress, whatever the handling', async () => {
    const rules = { 'goal-direction': 'at-most', 'target-count': 2 };
    const within = await store.createTask({ description: 'Within', 'due-time': due(), 'lifecycle-rules': rules });
    const over = await store.createTask({ description: 'Over', 'due-time': due(), 'lifecycle-rules': rules });
    const none = await store.createTask({ description: 'None', 'due-time': due(), 'lifecycle-rules': rules });
    await store.logEntry(within.id, { checked: true });
    for (let i = 0; i < 3; i += 1) {
      await store.logEntry(over.id, { checked: true });
    }
    clock.tick(60_000);
    expect(await applyOverdueHandling(store, new Date(clock.now))).toHaveLength(3);
    expect([await statusOf(within.id), await statusOf(over.id), await statusOf(none.id)]).toEqual(['completed', 'failed', 'completed']);
  });

  it('cannot reopen an at-most occurrence, and an undo changes its verdict', async () => {
    const task = await store.createTask({ description: 'Limit', 'due-time': due(), 'lifecycle-rules': { 'goal-direction': 'at-most', 'target-count': 1 } });
    const entries = [];
    for (let i = 0; i < 2; i += 1) {
      entries.push((await store.logEntry(task.id, { checked: true })).event.id);
    }
    clock.tick(60_000);
    await applyOverdueHandling(store, new Date(clock.now));
    expect(await statusOf(task.id)).toBe('failed');
    await expect(store.postEvent(task.id, 'reopen')).rejects.toMatchObject({ code: 'conflict' });
    await store.undoLog(task.id, entries[1]);
    expect(await statusOf(task.id)).toBe('completed');
  });

  it('shows an overdue fail task as failed through the failed filter, end to end', async () => {
    const task = await store.createTask({ description: 'Missed', 'due-time': due(), 'overdue-handling': 'fail' });
    clock.tick(60_000);
    await applyOverdueHandling(store, new Date(clock.now));
    const shown = filterTasks(await store.listTasks(), { statuses: ['failed'] }, { now: new Date(clock.now) });
    expect(shown.map((found) => found.id)).toEqual([task.id]);
  });
});
