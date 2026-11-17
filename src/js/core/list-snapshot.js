/**
 * One shared read of the lists and their task counts, for the sidebar and the Lists screen (`TEC-16`, `LST-5`).
 *
 * Counting reads every task and membership, which takes most of the time the Lists screen needs to open.
 * The sidebar already reads them after every change, so the screen takes that result instead of reading again.
 * The snapshot lasts until the next store write or `invalidate()`, which the clock calls because a recurring task
 * past its period end counts as open.
 */

import { countLists } from './list-counts.js';

/**
 * Create the shared snapshot of a store.
 * Create it before any screen subscribes to the store, so it drops the snapshot before a screen reads again.
 * @param {object} store the store facade
 * @returns {{read: () => Promise<{lists: object[], counts: object}>, invalidate: () => void, destroy: () => void}}
 *   `read` resolves the lists and the result of `countLists`; every reader between two writes gets the same object
 */
export function createListSnapshot(store) {
  let current = null;

  /** Forget the snapshot, so the next read goes to the store. */
  const invalidate = () => {
    current = null;
  };
  const unsubscribe = store.subscribe(invalidate);

  /**
   * Read the lists and their counts, or share the read in flight or the last result.
   * @returns {Promise<{lists: object[], counts: object}>} the lists and their counts
   */
  function read() {
    if (!current) {
      const reading = Promise.all([store.listLists(), store.listTasks(), store.listMemberships()])
        .then(([lists, tasks, memberships]) => ({ lists, counts: countLists(tasks, memberships) }))
        .catch((error) => {
          // A failed read is not kept, and an older read must not clear a newer one.
          if (current === reading) {
            current = null;
          }
          throw error;
        });
      current = reading;
    }
    return current;
  }

  return { read, invalidate, destroy: unsubscribe };
}
