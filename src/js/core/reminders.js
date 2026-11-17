/**
 * Reminders: a notification when an open task comes due, while the app is open (`REM-1` to `REM-8`).
 *
 * The reminder of a task fires at its due time minus the lead time; a date-only task (due 23:59 on the device)
 * fires at 09:00 on its due date, whatever the lead time. A recurring task reminds once per occurrence,
 * because the due time of the current occurrence changes at the roll-over. Only open, undeleted tasks remind.
 * The ledger remembers each notified (after the notification succeeded; a failure retries at the next check) `task-due:{{task-id}}:{{due-time}}` tag, so a due time notifies once,
 * also after a reload, and an edited due time is a new tag that arms again.
 * Fire times before the opt-in time never notify. On start, reminders missed while the app was closed
 * show as one summary notification, or as an ordinary one when there is a single task.
 * Only the tab that holds the Web Lock `todos-reminders` schedules. It checks at least every 30 seconds
 * and after every store change, focus, and visibility change, so edits, syncs, imports, and a wake from sleep re-arm.
 */

import { dueTimeOf, OPEN_STATUSES, statusOf } from './occurrences.js';

export const LEAD_TIMES = Object.freeze([0, 5, 15, 30, 60]);
export const LOCK_NAME = 'todos-reminders';
export const MAX_WAIT_MS = 30_000;
const MIN_WAIT_MS = 1_000;
const MINUTE_MS = 60_000;
const DATE_ONLY_HOUR = 9;

/**
 * Build the notification tag of the current occurrence of a task.
 * @param {object} task the task
 * @returns {string} `task-due:{{task-id}}:{{due-time}}`, with the UTC due time
 */
export function reminderTag(task) {
  return `task-due:${task.id}:${new Date(dueTimeOf(task)).toISOString()}`;
}

/**
 * Tell when the reminder of a task fires.
 * @param {object} task the task
 * @param {number} leadMinutes the lead time in minutes
 * @returns {number|null} Unix milliseconds, or null when the task has no due time
 */
export function fireTimeOf(task, leadMinutes) {
  const due = dueTimeOf(task);
  if (!due || Number.isNaN(Date.parse(due))) {
    return null;
  }
  const date = new Date(due);
  if (date.getHours() === 23 && date.getMinutes() === 59) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate(), DATE_ONLY_HOUR, 0, 0, 0).getTime();
  }
  return date.getTime() - leadMinutes * MINUTE_MS;
}

/**
 * Tell whether a task can remind: open, not deleted, with a due time.
 * @param {object} task the task
 * @returns {boolean} true when it can
 */
function reminds(task) {
  return !task['deletion-time'] && OPEN_STATUSES.includes(statusOf(task)) && Boolean(dueTimeOf(task));
}

/**
 * Create the reminders of this tab.
 * @param {object} options the dependencies
 * @param {{listTasks: Function, subscribe: Function}} options.store the store facade
 * @param {(notification: object) => Promise<void>} options.notify shows one notification:
 *   `{title, body, tag, taskId}`, or `{summary: true, title, body, tag}`
 * @param {() => number} [options.now] the clock, in Unix milliseconds
 * @param {() => number} options.lead the lead time in minutes
 * @param {() => number} options.since the opt-in time in Unix milliseconds
 * @param {{read: () => Set<string>, add: (tags: string[]) => void, prune: (keep: Set<string>) => void}} options.ledger the notified tags
 * @param {{request: Function}|null} [options.locks] the Web Locks manager; without one this tab always leads
 * @param {EventTarget|null} [options.win] the window, which reports `focus`
 * @param {EventTarget|null} [options.doc] the document, which reports `visibilitychange`
 * @param {typeof globalThis.setTimeout} [options.setTimeout] the timer
 * @param {typeof globalThis.clearTimeout} [options.clearTimeout] the timer canceler
 * @param {(error: unknown) => void} [options.onError] receives the error of a failed check
 * @returns {{start: () => Promise<void>, stop: () => void, tick: () => Promise<void>, isLeader: () => boolean}} the reminders
 */
export function createReminders({
  store,
  notify,
  now = Date.now,
  lead,
  since,
  ledger,
  locks = null,
  win = null,
  doc = null,
  setTimeout = globalThis.setTimeout,
  clearTimeout = globalThis.clearTimeout,
  onError = (error) => console.error('Reminders failed:', error),
}) {
  let leader = !locks;
  let running = false;
  let timer = null;
  let release = null;
  let off = [];
  let checking = Promise.resolve();

  /**
   * Find the tasks to notify now and the next fire time, and forget notified tags of tasks that no longer carry them.
   * @returns {Promise<{due: object[], next: number|null}>} the tasks due now, and the next fire time after now
   */
  async function plan() {
    const time = now();
    const minimum = since();
    const seen = ledger.read();
    const live = new Set();
    const due = [];
    let next = null;
    for (const task of await store.listTasks()) {
      if (dueTimeOf(task)) {
        live.add(reminderTag(task));
      }
      if (!reminds(task) || seen.has(reminderTag(task))) {
        continue;
      }
      const fire = fireTimeOf(task, lead());
      if (fire === null || fire <= minimum) {
        continue;
      }
      if (fire <= time) {
        due.push({ task, fire });
      }
      else if (next === null || fire < next) {
        next = fire;
      }
    }
    // A tag lives as long as a stored task has that due time, so no delivered reminder repeats; others are dropped.
    if ([...seen].some((tag) => !live.has(tag))) {
      ledger.prune(live);
    }
    due.sort((a, b) => a.fire - b.fire);
    return { due: due.map((entry) => entry.task), next };
  }

  /**
   * Show one task's notification; the ledger records it only once the notification was shown.
   * @param {object} task the task
   * @returns {Promise<void>}
   */
  async function show(task) {
    const tag = reminderTag(task);
    await notify({
      title: task.description,
      body: `Due ${new Date(dueTimeOf(task)).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}`,
      tag,
      taskId: task.id,
    });
    ledger.add([tag]);
  }

  /**
   * Notify every task whose time came, then arm the next check, whatever failed.
   * A notification that fails stays unrecorded, so the next check tries it again, and the others still go out.
   * @param {boolean} [missed] true on start, when several tasks collapse into one summary
   * @returns {Promise<void>}
   */
  async function check(missed = false) {
    if (!leader) {
      return;
    }
    let next = null;
    try {
      const planned = await plan();
      next = planned.next;
      const { due } = planned;
      if (missed && due.length > 1) {
        try {
          await notify({ summary: true, title: `${due.length} tasks came due`, body: due.map((task) => task.description).join(', '), tag: 'task-due-summary' });
          ledger.add(due.map(reminderTag));
        }
        catch (error) {
          onError(error);
        }
      }
      else {
        for (const task of due) {
          try {
            await show(task);
          }
          catch (error) {
            onError(error);
          }
        }
      }
    }
    finally {
      if (running) {
        clearTimeout(timer);
        const wait = next === null ? MAX_WAIT_MS : Math.min(MAX_WAIT_MS, Math.max(MIN_WAIT_MS, next - now()));
        timer = setTimeout(() => {
          tick();
        }, wait);
      }
    }
  }
  /**
   * Run one check after the previous one; a failing check reports and never stops the chain.
   * @param {boolean} [missed] true on start
   * @returns {Promise<void>} resolves when the check ended
   */
  function tick(missed = false) {
    checking = checking.then(() => check(missed)).catch(onError);
    return checking;
  }

  return {
    /**
     * Start: join the tabs, check now, and then check on timers and on events that can change the tasks.
     * @returns {Promise<void>} resolves once the first check ended; a tab that waits for the lock resolves at once
     */
    async start() {
      if (running) {
        return;
      }
      running = true;
      const kick = () => {
        tick();
      };
      for (const [target, type] of [[win, 'focus'], [doc, 'visibilitychange']]) {
        target?.addEventListener(type, kick);
        off.push(() => target?.removeEventListener(type, kick));
      }
      off.push(store.subscribe(kick));
      if (locks) {
        locks.request(LOCK_NAME, () => {
          if (!running) {
            return undefined;
          }
          leader = true;
          const held = new Promise((resolve) => {
            release = resolve;
          });
          tick(true);
          return held;
        }).catch((error) => console.error('Reminders lock failed:', error));
        return;
      }
      leader = true;
      await tick(true);
    },

    /** Stop: cancel the timer, leave the listeners, and hand the lock to another tab. */
    stop() {
      running = false;
      leader = false;
      clearTimeout(timer);
      off.forEach((undo) => undo());
      off = [];
      release?.();
      release = null;
    },

    tick: () => tick(),

    /** @returns {boolean} true while this tab schedules */
    isLeader: () => leader,
  };
}
