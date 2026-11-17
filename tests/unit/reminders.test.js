import { describe, expect, it, vi } from 'vitest';
import { createReminders, fireTimeOf, LEAD_TIMES, reminderTag } from '../../src/js/core/reminders.js';

const MIN = 60_000;
const local = (...parts) => new Date(...parts);

/**
 * Build a task record with the fields reminders read.
 * @param {object} [fields] overrides: `id`, `due`, `status`, `deleted`, `recurring`
 * @returns {object} the task
 */
function task({ id = 't1', due = null, status = 'ready', deleted = false, description = 'Buy paint' } = {}) {
  return {
    id,
    description,
    'deletion-time': deleted ? '2026-11-17T00:00:00.000Z' : null,
    'lifecycle-rules': { 'overdue-handling': 'keep' },
    'current-occurrence': { status, 'due-time': due },
  };
}

/**
 * Create reminders over a fake store and clock.
 * @param {object[]} tasks the stored tasks, mutable by the test
 * @param {object} [options] overrides
 * @returns {object} the reminders and their fakes
 */
function setup(tasks, options = {}) {
  const clock = { now: local(2026, 10, 17, 10, 0).getTime() };
  const notified = new Set();
  const listeners = [];
  const store = {
    listTasks: options.listTasks ?? (async () => tasks),
    subscribe: (listener) => {
      listeners.push(listener);
      return () => listeners.splice(listeners.indexOf(listener), 1);
    },
  };
  const notify = options.notify ?? vi.fn(async () => {});
  const timers = [];
  const reminders = createReminders({
    store,
    notify,
    now: () => clock.now,
    lead: () => options.lead ?? 0,
    since: () => options.since ?? 0,
    ledger: {
      read: () => new Set(notified),
      add: (tags) => tags.forEach((tag) => notified.add(tag)),
      prune: (keep) => [...notified].forEach((tag) => !keep.has(tag) && notified.delete(tag)),
    },
    locks: options.locks ?? null,
    setTimeout: (fn, ms) => {
      timers.push({ fn, ms });
      return timers.length;
    },
    clearTimeout: () => {},
    onError: options.onError ?? ((error) => {
      throw error;
    }),
  });
  return { reminders, clock, notify, notified, listeners, timers };
}

describe('fireTimeOf', () => {
  it('subtracts each lead time from the due time', () => {
    const due = local(2026, 11, 1, 14, 30);
    expect(LEAD_TIMES).toEqual([0, 5, 15, 30, 60]);
    for (const lead of LEAD_TIMES) {
      expect(fireTimeOf(task({ due: due.toISOString() }), lead)).toBe(due.getTime() - lead * MIN);
    }
  });

  it('fires date-only tasks (due 23:59) at 09:00 on the due date, whatever the lead time', () => {
    const due = local(2026, 11, 1, 23, 59).toISOString();
    for (const lead of LEAD_TIMES) {
      expect(fireTimeOf(task({ due }), lead)).toBe(local(2026, 11, 1, 9, 0).getTime());
    }
  });

  it('has no fire time without a due time', () => {
    expect(fireTimeOf(task(), 0)).toBeNull();
  });
});

describe('reminders', () => {
  it('tags a notification with the task id and the UTC due time', () => {
    const due = '2026-11-17T10:05:00.000Z';
    expect(reminderTag(task({ id: 'abc', due }))).toBe('task-due:abc:2026-11-17T10:05:00.000Z');
  });

  it('notifies a task once when its fire time arrives, and never again', async () => {
    const due = new Date(local(2026, 10, 17, 10, 5)).toISOString();
    const { reminders, clock, notify } = setup([task({ due })]);
    await reminders.tick();
    expect(notify).not.toHaveBeenCalled();
    clock.now += 5 * MIN;
    await reminders.tick();
    await reminders.tick();
    expect(notify).toHaveBeenCalledTimes(1);
    expect(notify.mock.calls[0][0]).toMatchObject({ taskId: 't1', tag: `task-due:t1:${due}`, title: 'Buy paint' });
  });

  it('does not notify again after a reload, since the ledger remembers the due time', async () => {
    const due = new Date(local(2026, 10, 17, 9, 59)).toISOString();
    const first = setup([task({ due })]);
    await first.reminders.tick();
    expect(first.notify).toHaveBeenCalledTimes(1);
    // A reload builds new reminders over the same ledger.
    const tasks = [task({ due })];
    const second = setup(tasks);
    for (const tag of first.notified) {
      second.notified.add(tag);
    }
    await second.reminders.tick();
    expect(second.notify).not.toHaveBeenCalled();
  });

  it('notifies at the lead time before the due time', async () => {
    const due = new Date(local(2026, 10, 17, 10, 30)).toISOString();
    const { reminders, clock, notify } = setup([task({ due })], { lead: 15 });
    clock.now = local(2026, 10, 17, 10, 14).getTime();
    await reminders.tick();
    expect(notify).not.toHaveBeenCalled();
    clock.now += MIN;
    await reminders.tick();
    expect(notify).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['completed', { status: 'completed' }],
    ['cancelled', { status: 'cancelled' }],
    ['deleted', { deleted: true }],
  ])('cancels the reminder of a %s task', async (_name, change) => {
    const due = new Date(local(2026, 10, 17, 10, 5)).toISOString();
    const tasks = [task({ due })];
    const { reminders, clock, notify } = setup(tasks);
    await reminders.tick();
    tasks[0] = task({ due, ...change });
    clock.now += 5 * MIN;
    await reminders.tick();
    expect(notify).not.toHaveBeenCalled();
  });

  it('cancels the reminder when the due time is cleared, and re-arms it when it changes', async () => {
    const due = new Date(local(2026, 10, 17, 10, 5)).toISOString();
    const later = new Date(local(2026, 10, 17, 11, 0)).toISOString();
    const tasks = [task({ due })];
    const { reminders, clock, notify } = setup(tasks);
    tasks[0] = task({ due: null });
    clock.now += 5 * MIN;
    await reminders.tick();
    expect(notify).not.toHaveBeenCalled();
    tasks[0] = task({ due: later });
    clock.now = local(2026, 10, 17, 11, 0).getTime();
    await reminders.tick();
    expect(notify).toHaveBeenCalledTimes(1);
    expect(notify.mock.calls[0][0].tag).toBe(`task-due:t1:${later}`);
  });

  it('re-arms a due time that was already notified once the task is edited to a new due time', async () => {
    const first = new Date(local(2026, 10, 17, 9, 55)).toISOString();
    const second = new Date(local(2026, 10, 17, 10, 20)).toISOString();
    const tasks = [task({ due: first })];
    const { reminders, clock, notify } = setup(tasks);
    await reminders.tick();
    expect(notify).toHaveBeenCalledTimes(1);
    tasks[0] = task({ due: second });
    clock.now += 20 * MIN;
    await reminders.tick();
    expect(notify).toHaveBeenCalledTimes(2);
  });

  it('reminds a weekly task for this occurrence, then for the next after the roll-over', async () => {
    const thisWeek = new Date(local(2026, 10, 17, 10, 5)).toISOString();
    const nextWeek = new Date(local(2026, 10, 24, 10, 5)).toISOString();
    const tasks = [task({ due: thisWeek })];
    const { reminders, clock, notify } = setup(tasks);
    clock.now = local(2026, 10, 17, 10, 5).getTime();
    await reminders.tick();
    expect(notify).toHaveBeenCalledTimes(1);
    tasks[0] = task({ due: nextWeek });
    clock.now = local(2026, 10, 24, 10, 5).getTime();
    await reminders.tick();
    expect(notify).toHaveBeenCalledTimes(2);
    expect(notify.mock.calls[1][0].tag).toBe(`task-due:t1:${nextWeek}`);
  });

  it('ignores fire times before the opt-in time', async () => {
    const due = new Date(local(2026, 10, 16, 10, 0)).toISOString();
    const { reminders, notify } = setup([task({ due })], { since: local(2026, 10, 17, 9, 0).getTime() });
    await reminders.tick();
    expect(notify).not.toHaveBeenCalled();
  });

  it('shows reminders missed while closed as one summary on start', async () => {
    const tasks = [
      task({ id: 'a', due: new Date(local(2026, 10, 17, 8, 0)).toISOString() }),
      task({ id: 'b', due: new Date(local(2026, 10, 17, 9, 0)).toISOString() }),
    ];
    const { reminders, notify } = setup(tasks, { since: local(2026, 10, 16, 0, 0).getTime() });
    await reminders.start();
    expect(notify).toHaveBeenCalledTimes(1);
    expect(notify.mock.calls[0][0]).toMatchObject({ summary: true, title: '2 tasks came due' });
    reminders.stop();
  });

  it('shows one missed reminder as an ordinary notification', async () => {
    const tasks = [task({ due: new Date(local(2026, 10, 17, 8, 0)).toISOString() })];
    const { reminders, notify } = setup(tasks, { since: local(2026, 10, 16, 0, 0).getTime() });
    await reminders.start();
    expect(notify).toHaveBeenCalledTimes(1);
    expect(notify.mock.calls[0][0]).toMatchObject({ taskId: 't1', title: 'Buy paint' });
    reminders.stop();
  });

  it('arms a short timer and re-arms it after each tick', async () => {
    const due = new Date(local(2026, 10, 17, 10, 0, 20)).toISOString();
    const { reminders, timers } = setup([task({ due })]);
    await reminders.start();
    expect(timers.at(-1).ms).toBeLessThanOrEqual(30_000);
    expect(timers.at(-1).ms).toBeGreaterThanOrEqual(1000);
    reminders.stop();
  });

  it('re-checks after a store change', async () => {
    const due = new Date(local(2026, 10, 17, 10, 5)).toISOString();
    const tasks = [];
    const { reminders, clock, notify, listeners } = setup(tasks);
    await reminders.start();
    tasks.push(task({ due }));
    clock.now += 5 * MIN;
    listeners.forEach((listener) => listener({ operation: 'createTask', remote: false }));
    await vi.waitFor(() => expect(notify).toHaveBeenCalledTimes(1));
    reminders.stop();
  });

  it('only the tab that holds the lock schedules', async () => {
    const due = new Date(local(2026, 10, 17, 9, 59)).toISOString();
    const held = { release: null };
    const locks = { request: vi.fn(() => new Promise(() => {})) };
    const waiting = setup([task({ due })], { locks });
    await waiting.reminders.start();
    expect(waiting.reminders.isLeader()).toBe(false);
    await waiting.reminders.tick();
    expect(waiting.notify).not.toHaveBeenCalled();

    const leading = setup([task({ due })], {
      locks: { request: vi.fn(async (_name, callback) => {
        await callback({});
      }) },
    });
    await leading.reminders.start();
    expect(leading.reminders.isLeader()).toBe(true);
    await vi.waitFor(() => expect(leading.notify).toHaveBeenCalledTimes(1));
    leading.reminders.stop();
    expect(held.release).toBeNull();
  });

  it('keeps every delivered reminder across more than 500 eligible tasks, with no repeat on later checks or after a reload', async () => {
    const tasks = Array.from({ length: 501 }, (_, index) => task({ id: `t${index}`, due: new Date(local(2026, 10, 17, 9, 0, index % 60)).toISOString() }));
    const first = setup(tasks);
    await first.reminders.tick();
    await first.reminders.tick();
    expect(first.notify).toHaveBeenCalledTimes(501);
    expect(first.notified.size).toBe(501);
    const second = setup(tasks);
    first.notified.forEach((tag) => second.notified.add(tag));
    await second.reminders.tick();
    expect(second.notify).not.toHaveBeenCalled();
  });

  it('does not repeat tasks already summarized on start, past 500 of them', async () => {
    const tasks = Array.from({ length: 501 }, (_, index) => task({ id: `t${index}`, due: new Date(local(2026, 10, 17, 8, 0, index % 60)).toISOString() }));
    const { reminders, notify, notified } = setup(tasks, { since: local(2026, 10, 16, 0, 0).getTime() });
    await reminders.start();
    await reminders.tick();
    await reminders.tick();
    expect(notify).toHaveBeenCalledTimes(1);
    expect(notified.size).toBe(501);
    reminders.stop();
  });

  it('forgets the tag of a task that left the store or changed its due time', async () => {
    const due = new Date(local(2026, 10, 17, 9, 0)).toISOString();
    const tasks = [task({ id: 'a', due }), task({ id: 'b', due })];
    const { reminders, notified } = setup(tasks);
    await reminders.tick();
    expect(notified.size).toBe(2);
    tasks.pop();
    await reminders.tick();
    expect([...notified]).toEqual([`task-due:a:${due}`]);
  });

  it('retries a notification that failed, without recording it, and still notifies the others', async () => {
    const due = new Date(local(2026, 10, 17, 9, 0)).toISOString();
    const tasks = [task({ id: 'a', due }), task({ id: 'b', due })];
    let failing = true;
    const notify = vi.fn(async ({ taskId }) => {
      if (failing && taskId === 'a') {
        throw new Error('showNotification failed');
      }
    });
    const onError = vi.fn();
    const { reminders, notified } = setup(tasks, { notify, onError });
    await reminders.tick();
    expect(onError).toHaveBeenCalledTimes(1);
    expect([...notified]).toEqual([`task-due:b:${due}`]);
    failing = false;
    await reminders.tick();
    expect(notified.size).toBe(2);
    expect(notify.mock.calls.filter(([entry]) => entry.taskId === 'a')).toHaveLength(2);
  });

  it('retries a summary that failed, and records its tasks only once it showed', async () => {
    const tasks = [
      task({ id: 'a', due: new Date(local(2026, 10, 17, 8, 0)).toISOString() }),
      task({ id: 'b', due: new Date(local(2026, 10, 17, 9, 0)).toISOString() }),
    ];
    const notify = vi.fn().mockRejectedValueOnce(new Error('denied')).mockResolvedValue(undefined);
    const { reminders, notified } = setup(tasks, { since: local(2026, 10, 16, 0, 0).getTime(), notify, onError: vi.fn() });
    await reminders.start();
    expect(notified.size).toBe(0);
    await reminders.tick();
    expect(notified.size).toBe(2);
    reminders.stop();
  });

  it('arms the next timer after a failed notification or a failed read of the tasks', async () => {
    const due = new Date(local(2026, 10, 17, 9, 0)).toISOString();
    const failing = setup([task({ due })], { notify: vi.fn(async () => {
      throw new Error('failed');
    }), onError: vi.fn() });
    await failing.reminders.start();
    expect(failing.timers.at(-1).ms).toBeLessThanOrEqual(30_000);
    failing.reminders.stop();
    const unreadable = setup([], { onError: vi.fn(), listTasks: async () => Promise.reject(new Error('closed')) });
    await unreadable.reminders.start();
    await unreadable.reminders.tick();
    expect(unreadable.timers.length).toBeGreaterThan(0);
    unreadable.reminders.stop();
  });
});