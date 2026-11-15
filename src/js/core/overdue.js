/**
 * Overdue handling: the overdue flag and the expiry of overdue `cancel` tasks (`OVD-1` to `OVD-6`).
 *
 * The app runs the check once on start, for tasks that became overdue while it was closed (`OVD-5`),
 * and then every minute, so a `cancel` task expires within one minute of its due time (`OVD-4`).
 * Expiring writes a system `expire` event, as the service's hourly run does; the event never joins the change queue.
 */

import { dueTimeOf, OPEN_STATUSES, shouldExpire, statusOf } from './occurrences.js';

export const INTERVAL_MS = 60_000;

/**
 * Tell whether a task is overdue: the due time of its current occurrence has passed and it is still open.
 * @param {object} task a task record
 * @param {Date|number} now the current time, as a Date or Unix milliseconds
 * @returns {boolean} true when the task is overdue
 */
export function isOverdue(task, now) {
  const due = dueTimeOf(task);
  if (!due || !OPEN_STATUSES.includes(statusOf(task))) {
    return false;
  }
  return Date.parse(due) < new Date(now).getTime();
}

/**
 * Expire every overdue task with handling `cancel` through an `expire` event.
 * Each expiry re-checks the stored task in its own transaction, so a task completed, changed,
 * or deleted since the first read is left alone (`OVD-6`). The expiry sets the last update time.
 * @param {object} store the store facade
 * @param {Date|number} [now] the current time
 * @returns {Promise<object[]>} the expired tasks
 */
export async function applyOverdueHandling(store, now = new Date()) {
  const tasks = await store.listTasks();
  const cancelled = [];
  for (const task of tasks) {
    if (!shouldExpire(task, now)) {
      continue;
    }
    let result = null;
    try {
      result = await store.expireTask(task.id, { now: new Date(now) });
    }

    catch (error) {
      if (error?.code !== 'deleted' && error?.code !== 'not-found') {
        throw error;
      }
    }
    if (result) {
      cancelled.push(result);
    }
  }
  return cancelled;
}

/**
 * Run overdue handling now and then at every interval; a run never overlaps the previous one.
 * @param {object} options timer options
 * @param {object} options.store the store facade
 * @param {() => Date} [options.now] the clock
 * @param {number} [options.intervalMs] the time between runs, one minute by default
 * @param {typeof globalThis.setInterval} [options.setInterval] the interval scheduler
 * @param {typeof globalThis.clearInterval} [options.clearInterval] the interval canceler
 * @param {(error: unknown) => void} [options.onError] receives the error of a failed run
 * @returns {(() => void) & {idle: () => Promise<void>}} a function that stops the timer;
 *   its `idle()` resolves once no run is in progress
 */
export function startOverdueTimer({
  store,
  now = () => new Date(),
  intervalMs = INTERVAL_MS,
  setInterval = globalThis.setInterval,
  clearInterval = globalThis.clearInterval,
  onError = (error) => console.error('Overdue handling failed:', error),
}) {
  let running = null;

  /** Start a run unless one is in progress. */
  const run = () => {
    if (running) {
      return;
    }
    running = applyOverdueHandling(store, now())
      .then(() => {}, onError)
      .finally(() => {
        running = null;
      });
  };

  run();
  const handle = setInterval(run, intervalMs);

  /** Stop the timer; a run in progress still finishes. */
  const stop = () => clearInterval(handle);
  stop.idle = () => running ?? Promise.resolve();
  return stop;
}
