/**
 * Count the tasks of every list in one pass, shared by the sidebar and the Lists screen (`LST-5`, `LST-12`).
 *
 * The pass walks the tasks once, then the memberships once, so the cost is tasks plus memberships,
 * never lists times tasks. Deleted tasks count nowhere.
 */

const OPEN = new Set(['todo', 'in-progress']);

/** The count of a list without tasks. */
export const EMPTY_COUNT = Object.freeze({ open: 0, total: 0, activity: null });

/**
 * Count open tasks, in all and per list.
 * @param {object[]} tasks the tasks, with or without deleted ones
 * @param {object[]} memberships the membership records
 * @returns {{all: number, byList: Map<string, {open: number, total: number, activity: number|null}>}}
 *   the open tasks overall, and per list the open and total tasks and the newest task activity in milliseconds;
 *   lists without memberships are absent, see {@link countOf}
 */
export function countLists(tasks, memberships) {
  const byTask = new Map();
  let all = 0;
  for (const task of tasks) {
    if (!task['deletion-time']) {
      const open = OPEN.has(task.status);
      const time = Date.parse(task['last-activity-time']);
      all += open ? 1 : 0;
      byTask.set(task.id, { open, activity: Number.isNaN(time) ? null : time });
    }
  }
  const byList = new Map();
  for (const membership of memberships) {
    const task = byTask.get(membership['task-id']);
    if (task) {
      const listId = membership['list-id'];
      const count = byList.get(listId) ?? { open: 0, total: 0, activity: null };
      count.total += 1;
      count.open += task.open ? 1 : 0;
      if (task.activity !== null && (count.activity === null || task.activity > count.activity)) {
        count.activity = task.activity;
      }
      byList.set(listId, count);
    }
  }
  return { all, byList };
}

/**
 * Read the count of one list.
 * @param {{byList: Map<string, object>}} counts the result of {@link countLists}
 * @param {string} listId the list identifier
 * @returns {{open: number, total: number, activity: number|null}} the count, empty for a list without tasks
 */
export function countOf(counts, listId) {
  return counts.byList.get(listId) ?? EMPTY_COUNT;
}
