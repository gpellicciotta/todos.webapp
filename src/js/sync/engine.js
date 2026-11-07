/**
 * Sync engine: the state machine and the scheduler of syncing (`SYN-3`, `SYN-4`, `SYN-11`, `SYN-12`).
 *
 * It joins push.js (the upload of the change queue) and pull.js (the download of the change feed).
 * Only the tab that holds the Web Lock `todos-sync` syncs. Its run replays the queue, then pulls the feed.
 * The leader runs again every 30 seconds, after going online, gaining focus, becoming visible, and after local changes.
 * It pulls only while the page is visible; a hidden page still replays the queue.
 * The state is `local-only`, `synced`, `syncing`, `offline`, `sign-in-needed`, `error`, or `update-required`.
 * Disconnecting leaves the account's data behind (`CON-8`, `CON-9`): see pull.js.
 */

import { createApi } from './api.js';
import { createPull } from './pull.js';
import { createPush } from './push.js';

/**
 * Create the engine of a session.
 * @param {object} options the dependencies
 * @param {object} options.store the store facade, opened with `tracking`
 * @param {object} options.session the session
 * @param {Function} [options.fetch] the fetch function
 * @param {object} [options.api] the API client, built from `session` and `fetch` by default
 * @param {{request: Function}|null} [options.locks] the Web Locks manager; without one this tab always leads
 * @param {(ms: number) => Promise<void>} [options.wait] waits between runs; stopped early by `kick`
 * @param {string} [options.channelName] the BroadcastChannel name
 * @param {EventTarget|null} [options.win] the window, which reports `online` and `focus`
 * @param {(EventTarget & {visibilityState: string})|null} [options.doc] the document, which reports visibility
 * @param {number} [options.pageSize] the page size of the feed calls
 * @param {Function} [options.onRejected] called with `{entry, status, message}` after a rollback
 * @param {Function} [options.onLostAccess] called with `{list, undone, message}` when a list was lost
 * @returns {object} the engine: `start`, `stop`, `kick`, `syncNow`, `pendingCount`, `state`, `subscribe`, `isLeader`
 */
export function createEngine({
  store,
  session,
  fetch = (...args) => globalThis.fetch(...args),
  api = createApi({ session, fetch }),
  locks,
  wait,
  channelName,
  win = globalThis.window ?? null,
  doc = globalThis.document ?? null,
  pageSize,
  onRejected,
  onLostAccess,
}) {
  const pull = createPull({ store, session, api, onLostAccess, pageSize });
  const visible = () => (doc?.visibilityState ?? 'visible') !== 'hidden';
  const push = createPush({
    store,
    session,
    fetch,
    api,
    locks,
    wait,
    channelName,
    onRejected,
    afterDrain: async () => {
      if (visible()) {
        await pull.pullOnce();
      }
    },
  });
  let off = [];

  /**
   * Listen to an event target, and remember how to stop.
   * @param {EventTarget|null} target the target
   * @param {string} type the event type
   * @param {() => void} listener the listener
   */
  function listen(target, type, listener) {
    target?.addEventListener(type, listener);
    off.push(() => target?.removeEventListener(type, listener));
  }

  const engine = {
    /** Join the tabs, and run again on the events that can bring changes. */
    start() {
      push.start();
      listen(win, 'online', () => push.kick());
      listen(win, 'focus', () => push.kick());
      listen(doc, 'visibilitychange', () => visible() && push.kick());
      off.push(session.subscribe((state) => {
        if (state === 'local') {
          pull.disconnect().catch((error) => console.error('Leaving the account data failed:', error));
        }
      }));
    },

    /** Leave: stop leading, which hands the lock to another tab. */
    stop() {
      off.forEach((undo) => undo());
      off = [];
      push.stop();
    },

    /** Run again soon, as after a local change. */
    kick: () => push.kick(),

    /**
     * Run once now: replay the queue, then pull the feed.
     * @returns {Promise<'synced'|'retry'|'paused'|'stopped'|'idle'>} how the run ended
     */
    syncNow: () => push.drainOnce(),

    /** @returns {Promise<number>} the count of changes not uploaded yet */
    pendingCount: () => store.queue.count(),

    /** @returns {{status: string, pending: number, minimum: string|null, progress: object|null, leader: boolean}} the sync state */
    state() {
      const current = push.state();
      if (session.state() === 'local') {
        return { ...current, status: 'local-only' };
      }
      return { ...current, status: current.status === 'idle' ? 'syncing' : current.status };
    },

    /** @returns {boolean} true while this tab syncs */
    isLeader: () => push.isLeader(),

    /**
     * Listen to state changes, including those another tab reports.
     * @param {(state: object) => void} listener called with the new state
     * @returns {() => void} stops listening
     */
    subscribe: (listener) => push.subscribe(() => listener(engine.state())),
  };
  return engine;
}
