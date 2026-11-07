/**
 * API client: one request to the ToDo's service with the headers every sync request carries.
 *
 * Every request sends the bearer token and `Client-Version: todos.webapp/{{version}}`.
 * The app merges by edit time, so it sends `Edit-Time` and never `If-Match` (`SYN-5`, `SYN-6`).
 * Replies map to outcomes through `judge`; see docs/specs/local-store.md, Sync Queue.
 */

import { VERSION } from '../version.js';

export const CLIENT_NAME = 'todos.webapp';
const RETRYING = new Set([408, 429]);

/**
 * Syncing cannot go on for now. `kind` says why: `auth` (sign in again), `upgrade` (the app is too old),
 * or `retry` (no network or a service failure, so the same request is tried again later).
 */
export class SyncStop extends Error {
  /**
   * Create the stop.
   * @param {'auth'|'upgrade'|'retry'} kind the reason
   * @param {{offline?: boolean, minimum?: string|null}} [details] `offline` for a lost connection, `minimum` for an upgrade
   */
  constructor(kind, { offline = false, minimum = null } = {}) {
    super(kind);
    this.name = 'SyncStop';
    this.kind = kind;
    this.offline = offline;
    this.minimum = minimum;
  }
}

/**
 * Judge a reply: `done` for a 2xx, `rejected` for a change the service refuses.
 * @param {{status: number, ok: boolean, headers: {get: Function}}} response the reply
 * @returns {'done'|'rejected'} the outcome
 * @throws {SyncStop} for a `401`, a `426`, a `5xx`, or another reply to try again
 */
export function judge(response) {
  const { status } = response;
  if (response.ok) {
    return 'done';
  }
  if (status === 401) {
    throw new SyncStop('auth');
  }
  if (status === 426) {
    const upgrade = response.headers?.get?.('upgrade') ?? '';
    throw new SyncStop('upgrade', { minimum: upgrade.includes('/') ? upgrade.slice(upgrade.lastIndexOf('/') + 1) : upgrade || null });
  }
  if (status >= 500 || RETRYING.has(status)) {
    throw new SyncStop('retry');
  }
  // 400, 403, 404, 409, and 412 reject the change; any other 4xx is not worth retrying either.
  return 'rejected';
}

/**
 * Create the API client of a session.
 * @param {object} options the dependencies
 * @param {object} options.session the session
 * @param {Function} [options.fetch] the fetch function
 * @param {string} [options.version] the app version, from version.js by default
 * @returns {{send: Function, snapshotLists: Function}} the client
 */
export function createApi({ session, fetch = (...args) => globalThis.fetch(...args), version = VERSION }) {
  const clientVersion = `${CLIENT_NAME}/${version.replace(/-pre$/, '')}`;

  const api = {
    /**
     * Send one request.
     * @param {string} method the HTTP method
     * @param {string} path the path with its query, such as `/api/lists`
     * @param {{body?: object, editTime?: string}} [options] the JSON body and the client time of the edit
     * @returns {Promise<{status: number, ok: boolean, headers: object, body: any}>} the reply
     * @throws {SyncStop} without a token (`auth`) or a connection (`retry`)
     */
    async send(method, path, { body, editTime } = {}) {
      const token = session.token();
      if (!token) {
        throw new SyncStop('auth');
      }
      const headers = { Accept: 'application/json', Authorization: `Bearer ${token}`, 'Client-Version': clientVersion };
      if (body !== undefined) {
        headers['Content-Type'] = 'application/json';
      }
      if (editTime) {
        headers['Edit-Time'] = editTime;
      }
      let response;
      try {
        response = await fetch(`${session.serverUrl()}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
      }
      catch {
        throw new SyncStop('retry', { offline: true });
      }
      let data = null;
      try {
        data = await response.json();
      }
      catch {
        // An empty or non-JSON body carries nothing to read.
      }
      return { status: response.status, ok: response.ok, headers: response.headers, body: data };
    },

    /**
     * Read every list the account can see, trashed ones included, from the snapshot of the change feed.
     * @returns {Promise<object[]>} the `List` objects
     * @throws {SyncStop} when the service answers with another sync protocol than 1 (`upgrade`)
     */
    async snapshotLists() {
      const lists = [];
      let cursor = null;
      do {
        const query = new URLSearchParams({ 'page-size': '1000' });
        if (cursor) {
          query.set('cursor', cursor);
        }
        const response = await api.send('GET', `/api/changes?${query}`);
        if (judge(response) !== 'done') {
          throw new SyncStop('retry');
        }
        if (response.body?.protocol !== 1) {
          throw new SyncStop('upgrade');
        }
        lists.push(...(response.body.lists ?? []));
        cursor = response.body['has-more'] ? response.body.cursor : null;
      } while (cursor);
      return lists;
    },
  };
  return api;
}
