import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { applyOverdueHandling, isOverdue, startOverdueTimer } from '../../src/js/core/overdue.js';
import { freshStore } from './store-helpers.js';

const NOW = Date.UTC(2026, 10, 4, 9, 0, 0);

/**
 * Build a task record for the pure overdue check.
 * @param {object} fields fields that differ from an open task due one second before NOW
 * @returns {object} the task
 */
function taskWith(fields) {
  return { status: 'todo', 'due-time': new Date(NOW - 1000).toISOString(), 'deletion-time': null, ...fields };
}

describe('isOverdue', () => {
  it.each(['todo', 'in-progress'])('is true for a %s task whose due time passed', (status) => {
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

  it('cancels overdue cancel tasks and leaves every other task unchanged', async () => {
    const past = new Date(clock.now + 30_000).toISOString();
    const future = new Date(clock.now + 3_600_000).toISOString();
    const cancel = await store.createTask({ description: 'Cancel me', 'due-time': past, 'overdue-handling': 'cancel' });
    const started = await store.createTask({
      description: 'Started', status: 'in-progress', 'due-time': past, 'overdue-handling': 'cancel',
    });
    const keep = await store.createTask({ description: 'Keep me', 'due-time': past });
    const later = await store.createTask({ description: 'Later', 'due-time': future, 'overdue-handling': 'cancel' });
    const done = await store.createTask({
      description: 'Done', status: 'completed', 'due-time': past, 'overdue-handling': 'cancel',
    });
    const dropped = await store.createTask({
      description: 'Dropped', status: 'cancelled', 'due-time': past, 'overdue-handling': 'cancel',
    });
    const trashed = await store.createTask({ description: 'Trashed', 'due-time': past, 'overdue-handling': 'cancel' });
    await store.deleteTask(trashed.id);
    const untouched = [keep, later, done, dropped, await store.getTask(trashed.id)];

    clock.tick(60_000);
    const cancelled = await applyOverdueHandling(store, new Date(clock.now));

    expect(cancelled.map((task) => task.id).sort()).toEqual([cancel.id, started.id].sort());
    for (const id of [cancel.id, started.id]) {
      expect(await store.getTask(id)).toMatchObject({
        status: 'cancelled',
        'last-update-time': '2026-11-04T09:01:00.000Z',
        'last-activity-time': '2026-11-04T09:01:00.000Z',
      });
    }
    for (const task of untouched) {
      expect(await store.getTask(task.id)).toEqual(task);
    }
  });

  it('leaves a task alone that was completed or deleted after the first read', async () => {
    const past = new Date(clock.now + 30_000).toISOString();
    const completed = await store.createTask({ description: 'Done meanwhile', 'due-time': past, 'overdue-handling': 'cancel' });
    const deleted = await store.createTask({ description: 'Gone meanwhile', 'due-time': past, 'overdue-handling': 'cancel' });
    const open = await store.createTask({ description: 'Still open', 'due-time': past, 'overdue-handling': 'cancel' });
    const snapshot = await store.listTasks();
    await store.updateTask(completed.id, { status: 'completed' });
    await store.deleteTask(deleted.id);
    const stale = { ...store, listTasks: async () => snapshot };

    clock.tick(60_000);
    const cancelled = await applyOverdueHandling(stale, new Date(clock.now));

    expect(cancelled.map((task) => task.id)).toEqual([open.id]);
    expect(await store.getTask(completed.id)).toMatchObject({ status: 'completed' });
    expect(await store.getTask(deleted.id)).toMatchObject({ status: 'todo' });
  });

  it('returns no tasks when nothing is overdue', async () => {
    await store.createTask({ description: 'Open', 'overdue-handling': 'cancel' });
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
      description: 'Missed while closed', 'due-time': new Date(NOW - 60_000).toISOString(), 'overdue-handling': 'cancel',
    });
    const dueSoon = await store.createTask({
      description: 'Due soon', 'due-time': new Date(NOW + 30_000).toISOString(), 'overdue-handling': 'cancel',
    });

    const stop = startOverdueTimer({ store });
    await stop.idle();
    expect((await store.getTask(overdueOnStart.id)).status).toBe('cancelled');
    expect((await store.getTask(dueSoon.id)).status).toBe('todo');

    await vi.advanceTimersByTimeAsync(59_999);
    await stop.idle();
    expect((await store.getTask(dueSoon.id)).status).toBe('todo');

    await vi.advanceTimersByTimeAsync(1);
    await stop.idle();
    expect(await store.getTask(dueSoon.id)).toMatchObject({
      status: 'cancelled',
      'last-update-time': '2026-11-04T09:01:00.000Z',
      'last-activity-time': '2026-11-04T09:01:00.000Z',
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
