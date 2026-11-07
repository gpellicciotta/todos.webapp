/**
 * Pull: downloads the change feed and applies it to the local data without a reload (`SYN-3`, `CON-6`, `SHR-8`).
 *
 * Rules: the todos business logic spec, Change Feed. merge.js plans how each page changes the data.
 * - The cursor is stored in `sync-state` per account and server; without one the call returns a snapshot.
 * - A page applies tombstones first. Tasks of others without a visible list wait for the last page.
 * - A `410` (or a cursor the service rejects) keeps the queue, drops the rows that came from the service,
 *   and fetches a new snapshot without a message.
 * - A feed `protocol` other than `1` stops syncing: the app asks for an update (`SYN-11`).
 * - Losing access to a list removes it, and the queued changes to it and to the tasks that left with it.
 *   The user hears of it once, and the sync log records it.
 */

import { judge, SyncStop } from './api.js';
import { entryTouches, planDisconnect, planPage, planReset, userOfLists } from './merge.js';

export const PROTOCOL = 1;
const PAGE_SIZE = 200;

/**
 * Compare two accounts.
 * @param {{email: string, server: string}|null|undefined} a one account
 * @param {{email: string, server: string}|null|undefined} b another account
 * @returns {boolean} true when both name the same account on the same server
 */
function sameAccount(a, b) {
  return Boolean(a && b) && a.email === b.email && a.server === b.server;
}

/**
 * Word the notice for a lost list.
 * @param {string} name the list name
 * @param {number} undone how many queued changes were undone
 * @returns {string} the message
 */
function lostMessage(name, undone) {
  const changes = undone === 0 ? 'No changes were' : `${undone} ${undone === 1 ? 'change was' : 'changes were'}`;
  return `You no longer have access to ${name}. ${changes} undone.`;
}

/**
 * Create the pull of a session.
 * @param {object} options the dependencies
 * @param {object} options.store the store facade
 * @param {object} options.session the session
 * @param {object} options.api the API client
 * @param {(info: {list: string, undone: number, message: string}) => void} [options.onLostAccess] called once per lost list
 * @param {number} [options.pageSize] the page size to ask for
 * @returns {{pullOnce: Function, disconnect: Function}} the pull
 */
export function createPull({ store, session, api, onLostAccess = () => {}, pageSize = PAGE_SIZE }) {
  const { queue } = store;

  /**
   * Find the connected user: remembered, then asked from the service.
   * @returns {Promise<number|string|null>} the user identifier
   */
  async function findUser() {
    const saved = await queue.getState('user-id');
    if (saved !== null) {
      return saved;
    }
    const response = await api.send('GET', '/api/users/me');
    const id = judge(response) === 'done' ? response.body?.id ?? null : null;
    if (id !== null) {
      await queue.setState('user-id', id);
    }
    return id;
  }

  /**
   * Remove the queued changes that rows we lost carried, and tell the user about lost lists.
   * @param {{dropped: {lists: string[], tasks: string[]}, lost: object[]}} plan the page plan
   */
  async function settleDropped({ dropped, lost }) {
    const gone = new Set([...dropped.lists, ...dropped.tasks]);
    if (gone.size === 0) {
      return;
    }
    const entries = (await queue.all()).filter((entry) => entryTouches(entry, gone));
    await queue.remove(entries.map((entry) => entry.seq));
    const counted = new Set();
    for (const item of lost) {
      const ids = new Set([item.id, ...item.tasks]);
      const undone = entries.filter((entry) => entryTouches(entry, ids) && !counted.has(entry.seq));
      undone.forEach((entry) => counted.add(entry.seq));
      const message = lostMessage(item.name, undone.length);
      await queue.appendLog([{ kind: 'lost-access', target: { type: 'list', id: item.id }, name: item.name, undone: undone.length, message }]);
      onLostAccess({ list: item.name, undone: undone.length, message });
    }
  }

  /**
   * Apply one page.
   * @param {object} feed the page
   * @param {boolean} final true on the last page
   * @param {number|string|null} userId the connected user
   */
  async function apply(feed, final, userId) {
    const rows = ['lists', 'tasks', 'memberships', 'notes', 'tombstones'];
    if (rows.every((name) => (feed[name] ?? []).length === 0)) {
      return;
    }
    const pending = await queue.all();
    const plan = await store.applyChanges((data, now) => {
      const planned = planPage(data, feed, { pending, userId, final, now });
      return { changes: planned.changes, result: planned };
    });
    await settleDropped(plan);
  }

  return {
    /**
     * Pull every page after the stored cursor.
     * @returns {Promise<{pages: number, reset: boolean}>} the number of pages and whether the cursor expired
     * @throws {SyncStop} for `auth`, `upgrade`, or `retry`
     */
    async pullOnce() {
      await queue.purgeLog();
      const { email, server } = session.account();
      const account = { email, server };
      const saved = await queue.getState('cursor');
      let cursor = sameAccount(saved?.account, account) ? saved.value : null;
      if (saved && !cursor) {
        await queue.setState('user-id', null);
      }
      let user = await findUser();
      let pages = 0;
      let reset = false;
      for (;;) {
        const query = new URLSearchParams({ 'page-size': String(pageSize) });
        if (cursor) {
          query.set('cursor', cursor);
        }
        const response = await api.send('GET', `/api/changes?${query}`);
        if (cursor && (response.status === 410 || response.status === 400)) {
          const pending = await queue.all();
          await store.applyChanges((data) => ({ changes: planReset(data, pending), result: null }));
          await queue.setState('cursor', null);
          cursor = null;
          reset = true;
          continue;
        }
        if (judge(response) !== 'done') {
          throw new SyncStop('retry');
        }
        const feed = response.body;
        if (feed?.protocol !== PROTOCOL) {
          throw new SyncStop('upgrade');
        }
        if (user === null) {
          user = userOfLists(feed.lists ?? []);
          if (user !== null) {
            await queue.setState('user-id', user);
          }
        }
        pages += 1;
        await apply(feed, !feed['has-more'], user);
        cursor = feed.cursor;
        await queue.setState('cursor', { account, value: cursor });
        if (!feed['has-more']) {
          return { pages, reset };
        }
      }
    },

    /**
     * Leave the account's data behind (`CON-8`, `CON-9`): keep own lists and tasks as local data,
     * remove the rest, forget the cursor and the queue, and call no route.
     * @returns {Promise<void>}
     */
    async disconnect() {
      const user = await queue.getState('user-id');
      await store.applyChanges((data) => ({ changes: planDisconnect(data, user), result: null }));
      await queue.clear();
      for (const key of ['cursor', 'user-id', 'account', 'adoption', 'list-map']) {
        await queue.setState(key, null);
      }
    },
  };
}
