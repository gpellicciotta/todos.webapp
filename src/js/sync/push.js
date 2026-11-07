/**
 * Push: uploads the change queue to the service, one request per change, in order (`SYN-1`, `SYN-2`, `SYN-9`, `SYN-12`).
 *
 * Only one tab uploads: the tab that holds the Web Lock `todos-sync` is the leader and drains the queue.
 * The other tabs read its state through a BroadcastChannel, and take over when the leader closes.
 * Replies map to outcomes (docs/specs/local-store.md, Sync Queue):
 * - 2xx: the entry is done; fields the merge overwrote go to the sync log, and the value the service kept applies locally.
 * - 400, 403, 404, 409, 412: the change is rolled back locally and logged, except a 404 on a delete or remove.
 * - 401: pause and report Sign in needed; the queue keeps its entries.
 * - 426: stop all syncing and report Update required.
 * - No network or 5xx: try the same entry again with backoff.
 * Before the first entry of a newly connected account, the local data is adopted (see adopt.js).
 */

import { adopt } from './adopt.js';
import { createApi, judge, SyncStop } from './api.js';
import { planConflicts } from './merge.js';

export const LOCK_NAME = 'todos-sync';
const POLL_MS = 30_000;
const BACKOFF_MS = [1000, 2000, 5000, 15_000, 30_000, 60_000];
const DONE_ON_404 = new Set(['delete-list', 'delete-task', 'delete-note', 'remove-membership']);
const LABELS = {
  'create-list': 'a new list', 'update-list': 'a list change', 'delete-list': 'a list deletion', 'restore-list': 'a list restore',
  'create-task': 'a new task', 'update-task': 'a task change', 'delete-task': 'a task deletion', 'restore-task': 'a task restore',
  'add-membership': 'adding a task to a list', 'move-membership': 'a task move', 'remove-membership': 'removing a task from a list',
  'create-note': 'a new note', 'edit-note': 'a note change', 'delete-note': 'a note deletion',
};

/**
 * Describe an entry for people.
 * @param {object} entry the queue entry
 * @returns {string} a short label, such as `a task change`
 */
export function describeEntry(entry) {
  return LABELS[entry.operation] ?? entry.operation;
}

/**
 * Build the request of an entry.
 * @param {object} entry the queue entry
 * @param {(id: string) => string} mapList turns a local list id into the account's
 * @returns {[string, string, {body?: object, editTime?: string}]} the method, path, and options
 */
function toRequest(entry, mapList) {
  const { target, fields } = entry;
  const times = entry['edit-times'];
  const editTime = Object.values(times).sort().at(-1);
  const list = mapList(target['list-id'] ?? target.id);
  switch (entry.operation) {
    case 'create-list':
      return ['POST', '/api/lists', { body: fields }];
    case 'update-list':
      return ['PUT', `/api/lists/${list}`, { body: { ...fields, 'edit-times': times } }];
    case 'delete-list':
      return ['PUT', `/api/lists/${list}`, { body: { delete: true }, editTime }];
    case 'restore-list':
      return ['PUT', `/api/lists/${list}`, { body: { 'undo-delete': true }, editTime }];
    case 'create-task':
      return ['POST', '/api/tasks', { body: { ...fields, lists: fields.lists.map(mapList) } }];
    case 'update-task':
      return ['PUT', `/api/tasks/${target.id}`, { body: { ...fields, 'edit-times': times } }];
    case 'delete-task':
      return ['DELETE', `/api/tasks/${target.id}`, { editTime }];
    case 'restore-task':
      return ['POST', `/api/tasks/${target.id}/restore`, { editTime }];
    case 'add-membership':
    case 'move-membership':
      return ['PUT', `/api/lists/${list}/tasks/${target.id}`, { body: fields, editTime }];
    case 'remove-membership':
      return ['DELETE', `/api/lists/${list}/tasks/${target.id}`, { editTime }];
    case 'create-note':
      return ['POST', `/api/tasks/${target['task-id']}/notes`, { body: fields }];
    case 'edit-note':
      return ['PUT', `/api/tasks/${target['task-id']}/notes/${target.id}`, { body: fields, editTime }];
    case 'delete-note':
      return ['DELETE', `/api/tasks/${target['task-id']}/notes/${target.id}`, { editTime }];
    default:
      throw new Error(`Unknown queue operation: ${entry.operation}`);
  }
}

/**
 * Tell whether an entry builds on a row, so it cannot upload once the row's creation was rejected.
 * @param {object} entry the queue entry
 * @param {string} id the row identifier
 * @returns {boolean} true when the entry refers to the row
 */
function refersTo(entry, id) {
  const { target, fields } = entry;
  return target.id === id || target['list-id'] === id || target['task-id'] === id
    || fields.lists?.includes(id) || fields.before === id || fields.after === id;
}

/**
 * Create the push engine of a session.
 * @param {object} options the dependencies
 * @param {object} options.store the store facade, opened with `tracking`
 * @param {object} options.session the session
 * @param {Function} [options.fetch] the fetch function
 * @param {object} [options.api] the API client, built from `session` and `fetch` by default
 * @param {{request: Function}|null} [options.locks] the Web Locks manager; without one this tab always leads
 * @param {(ms: number) => Promise<void>} [options.wait] waits; stopped early by `kick`
 * @param {string} [options.channelName] the BroadcastChannel name
 * @param {(info: {entry: object, status: number, message: string}) => void} [options.onRejected] called after a rollback
 * @param {() => Promise<void>} [options.afterDrain] runs once the queue is empty, as the pull does; its stops and failures count as the run's
 * @returns {object} the engine: `start`, `stop`, `kick`, `drainOnce`, `state`, `subscribe`, `isLeader`
 */
export function createPush({
  store,
  session,
  fetch = (...args) => globalThis.fetch(...args),
  api = createApi({ session, fetch }),
  locks = globalThis.navigator?.locks ?? null,
  wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  channelName = 'todos-sync',
  onRejected = () => {},
  afterDrain = async () => {},
}) {
  const listeners = new Set();
  const queue = store.queue;
  let current = { status: 'idle', pending: 0, minimum: null, progress: null };
  let leader = false;
  let running = false;
  let stopped = null;
  let draining = null;
  let channel = null;
  let wake = null;
  let woken = false;
  let unsubscribe = [];
  let lastError = null;

  /**
   * Replace the state, then tell the listeners and the other tabs.
   * @param {object} next the changed parts of the state
   * @param {boolean} [share] false when the state came from the leader
   */
  async function publish(next, share = true) {
    current = { ...current, ...next };
    if (share) {
      current.pending = await queue.count();
      channel?.postMessage({ type: 'state', state: current });
    }
    for (const listener of listeners) {
      listener(push.state());
    }
  }

  /**
   * Roll back a rejected change, and the changes that build on it, then report it.
   * @param {object} entry the entry
   * @param {number} status the HTTP status
   */
  async function reject(entry, status) {
    await queue.undo(store, entry);
    const dependents = entry.operation.startsWith('create-')
      ? (await queue.all()).filter((other) => other.seq !== entry.seq && refersTo(other, entry.target.id))
      : [];
    await queue.remove([entry.seq, ...dependents.map((other) => other.seq)]);
    const message = `The service refused ${describeEntry(entry)}, so it was undone.`;
    await queue.appendLog([{ kind: 'rejected', operation: entry.operation, target: entry.target, fields: entry.fields, status, message }]);
    onRejected({ entry, status, message });
  }

  /**
   * Upload the first entry.
   * @param {object} entry the entry
   * @param {Record<string, string>} listMap the local-to-account list ids
   */
  async function upload(entry, listMap) {
    const [method, path, options] = toRequest(entry, (id) => listMap[id] ?? id);
    const response = await api.send(method, path, options);
    if (judge(response) === 'done') {
      const conflicts = response.body?.conflicts ?? [];
      if (conflicts.length > 0) {
        await queue.appendLog(conflicts.map((conflict) => ({ kind: 'overwritten', target: entry.target, ...conflict })));
        const pending = await queue.all();
        await store.applyChanges((data) => ({ changes: planConflicts(data, entry, conflicts, pending), result: null }));
      }
      await queue.remove([entry.seq]);
    }
    else if (response.status === 404 && DONE_ON_404.has(entry.operation)) {
      await queue.remove([entry.seq]);
    }
    else {
      await reject(entry, response.status);
    }
  }

  /**
   * Adopt the local data when this account has not had it yet.
   * @returns {Promise<void>}
   */
  async function ensureAdopted() {
    const { email, server } = session.account();
    await adopt({
      store,
      api,
      account: { email, server },
      onProgress: (progress) => publish({ status: 'syncing', progress }),
    });
  }

  /** @returns {Promise<'synced'|'retry'|'paused'|'stopped'|'idle'>} how the run ended */
  async function drain() {
    if (stopped) {
      return 'stopped';
    }
    const connection = session.state();
    if (connection === 'local') {
      await publish({ status: 'idle', progress: null });
      return 'idle';
    }
    if (connection === 'sign-in-needed') {
      await publish({ status: 'sign-in-needed' });
      return 'paused';
    }
    try {
      await publish({ status: 'syncing', progress: null });
      await ensureAdopted();
      const listMap = await queue.getState('list-map', {});
      for (let entry = await queue.first(); entry; entry = await queue.first()) {
        await upload(entry, listMap);
      }
      await afterDrain();
      lastError = null;
      await publish({ status: 'synced', progress: null });
      return 'synced';
    }
    catch (error) {
      if (!(error instanceof SyncStop)) {
        console.error('Sync failed:', error);
        if (lastError !== error.message) {
          lastError = error.message;
          await queue.appendLog([{ kind: 'error', message: 'Syncing failed. It will try again.', detail: error.message }]).catch(() => {});
        }
        await publish({ status: 'error' });
        return 'retry';
      }
      if (error.kind === 'auth') {
        session.expire();
        await publish({ status: 'sign-in-needed' });
        return 'paused';
      }
      if (error.kind === 'upgrade') {
        stopped = { minimum: error.minimum };
        await publish({ status: 'update-required', minimum: error.minimum });
        return 'stopped';
      }
      await publish({ status: error.offline ? 'offline' : 'error' });
      return 'retry';
    }
  }

  /** Sleep until the time passes or a change calls `kick`. */
  function sleep(ms) {
    if (woken) {
      woken = false;
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      wake = resolve;
      wait(ms).then(resolve);
    });
  }

  /** Lead: drain the queue whenever there is something to do, until stopped. */
  async function lead() {
    leader = true;
    channel?.postMessage({ type: 'state', state: current });
    let attempt = 0;
    while (running) {
      const result = await drain();
      attempt = result === 'retry' ? attempt + 1 : 0;
      await sleep(result === 'retry' ? BACKOFF_MS[Math.min(attempt, BACKOFF_MS.length) - 1] : POLL_MS);
      woken = false;
    }
    leader = false;
  }

  const push = {
    /**
     * Drain the queue once: adopt local data if needed, then upload until the queue is empty or a stop.
     * @returns {Promise<'synced'|'retry'|'paused'|'stopped'|'idle'>} how the run ended
     */
    drainOnce() {
      draining ??= drain().finally(() => {
        draining = null;
      });
      return draining;
    },

    /** Join the tabs: take the lead when the lock is free, otherwise read the leader's state. */
    start() {
      running = true;
      if (typeof BroadcastChannel === 'function') {
        channel = new BroadcastChannel(channelName);
        channel.onmessage = ({ data }) => {
          if (data?.type === 'state' && !leader) {
            publish(data.state, false);
          }
          else if (data?.type === 'ask' && leader) {
            channel.postMessage({ type: 'state', state: current });
          }
        };
        channel.postMessage({ type: 'ask' });
      }
      unsubscribe = [store.subscribe(() => push.kick()), session.subscribe(() => push.kick())];
      if (locks) {
        locks.request(LOCK_NAME, () => (running ? lead() : undefined)).catch((error) => console.error('Sync lock failed:', error));
      }
      else {
        lead();
      }
    },

    /** Leave: stop leading, which hands the lock to another tab. */
    stop() {
      running = false;
      wake?.();
      unsubscribe.forEach((off) => off());
      unsubscribe = [];
      channel?.close();
      channel = null;
    },

    /** Look at the queue again soon, as after a local change, going online, or a sign-in. */
    kick() {
      if (leader) {
        woken = true;
        wake?.();
      }
    },

    /** @returns {{status: string, pending: number, minimum: string|null, progress: object|null, leader: boolean}} the sync state */
    state: () => ({ ...current, leader }),

    /** @returns {boolean} true while this tab holds the lead */
    isLeader: () => leader,

    /**
     * Listen to state changes, including those another tab reports.
     * @param {(state: object) => void} listener called with the new state
     * @returns {() => void} stops listening
     */
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
  return push;
}
