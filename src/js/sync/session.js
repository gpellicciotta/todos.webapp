/**
 * Session: the connection to one account on one server, kept per device (`CON-11`, `CON-13`, `TEC-18`).
 *
 * `todos.session` in `localStorage` holds the token, its expiry, the account, and the server.
 * States: `local` without a record, `connected` with a live token, and `sign-in-needed` once it expired.
 * An expired token is removed from the storage once read, and the account kept, so local work and the queue go on.
 * Local mode sends nothing; only completing a sign-in and disconnecting reach the server (`LOC-3`).
 * A returned code counts only after a sign-in started on this device within 15 minutes,
 * so a crafted link cannot connect the device to another account.
 * The sign-in sends a random state that Auth returns; a return with another state is rejected (login CSRF).
 */

import { readPreference, readServerUrl, writePreference } from '../core/preferences.js';
import { AuthError, endSession, exchangeCode, randomState, readReturn, signInUrl } from './auth.js';

const RECORD = 'session';
const PENDING = 'sign-in';
const START_WINDOW = 15 * 60 * 1000;

/**
 * Create the session of this device.
 * @param {object} [options] the dependencies
 * @param {() => Storage} [options.getStorage] returns the storage, `localStorage` by default
 * @param {Function} [options.fetch] the fetch function
 * @param {() => number} [options.now] the clock, in milliseconds
 * @param {string} [options.authUrl] the Auth origin, for tests
 * @returns {object} the session
 */
export function createSession({ getStorage = () => globalThis.localStorage, fetch = (...args) => globalThis.fetch(...args), now = Date.now, authUrl } = {}) {
  const listeners = new Set();
  let returned = null;

  /**
   * Read the stored record, removing a token past its expiry from the storage.
   * @returns {object|null} the record
   */
  function record() {
    const stored = readPreference(RECORD, null, getStorage);
    if (!stored || typeof stored.email !== 'string') {
      return null;
    }
    if (stored.token && stored.expiry && Date.parse(stored.expiry) <= now()) {
      const expired = { ...stored, token: null };
      writePreference(RECORD, expired, getStorage);
      return expired;
    }
    return stored;
  }

  /**
   * Store or remove the record, then tell the listeners the new state.
   * @param {object|null} next the record, or null to remove it
   */
  function save(next) {
    if (next) {
      writePreference(RECORD, next, getStorage);
    }
    else {
      try {
        getStorage()?.removeItem(`todos.${RECORD}`);
      }
      catch {
        // Blocked storage holds no session either.
      }
    }
    const current = session.state();
    for (const listener of listeners) {
      listener(current);
    }
  }

  const session = {
    /**
     * Tell the connection state.
     * @returns {'local'|'connected'|'sign-in-needed'} the state
     */
    state() {
      const current = record();
      if (!current) {
        return 'local';
      }
      return current.token ? 'connected' : 'sign-in-needed';
    },

    /**
     * Return the live token.
     * @returns {string|null} the token, or null when local or expired
     */
    token() {
      return record()?.token ?? null;
    },

    /**
     * Return the connected account.
     * @returns {{name: string|null, email: string, server: string}|null} the account, or null when local
     */
    account() {
      const current = record();
      return current ? { name: current.name ?? null, email: current.email, server: current.server } : null;
    },

    /**
     * Return the server a sign-in would use: the account's, or the server URL setting.
     * @returns {string} the server URL
     */
    serverUrl() {
      return record()?.server ?? readServerUrl(getStorage);
    },

    /**
     * Start a sign-in: remember it on this device and return the Auth URL to open.
     * A connected account signs in again on its own server; otherwise the server URL setting applies.
     * @param {{returnUrl: string, logoUrl?: string}} options the return URL and the logo
     * @returns {string} the Auth URL
     */
    start({ returnUrl, logoUrl }) {
      const state = randomState();
      writePreference(PENDING, { server: session.serverUrl(), started: now(), state }, getStorage);
      return signInUrl(returnUrl, { authUrl, logoUrl, state });
    },

    /**
     * Complete a started sign-in with the code Auth returned, and store the session.
     * The started sign-in is used up; a state that is missing or differs from the one sent rejects it.
     * @param {string} code the authorization code
     * @param {string|null} state the state Auth returned
     * @returns {Promise<{name: string|null, email: string, server: string}>} the account
     */
    async complete(code, state) {
      const pending = readPreference(PENDING, null, getStorage);
      writePreference(PENDING, null, getStorage);
      if (!pending?.server || !(now() - pending.started <= START_WINDOW)) {
        throw new AuthError('not-started');
      }
      if (!pending.state || state !== pending.state) {
        throw new AuthError('state-mismatch');
      }
      const { token, expiry, user } = await exchangeCode(pending.server, code, fetch);
      save({ token, expiry, name: user.name, email: user.email, server: pending.server });
      return session.account();
    },

    /**
     * Take the Auth return out of the address before routing, so the code never stays in the history.
     * @param {Window} win the window
     * @returns {boolean} true when the address held a return
     */
    capture(win) {
      returned = readReturn(win.location.hash);
      if (returned) {
        win.history.replaceState(null, '', '#/connect');
      }
      return returned !== null;
    },

    /**
     * Finish the captured return, once.
     * @returns {Promise<object>|null} resolves with the account, or null without a captured return
     */
    finish() {
      const taken = returned;
      returned = null;
      if (!taken) {
        return null;
      }
      if (taken.error) {
        writePreference(PENDING, null, getStorage);
        return Promise.reject(new AuthError('rejected', taken.error));
      }
      return session.complete(taken.code, taken.state);
    },

    /** Mark the session expired, as after a `401`: drop the token and keep the account. */
    expire() {
      const current = record();
      if (current) {
        save({ ...current, token: null });
      }
    },

    /**
     * Disconnect: delete the token from this device, then ask the server to end the session.
     * @returns {Promise<void>}
     */
    async disconnect() {
      const current = record();
      save(null);
      if (current?.token) {
        await endSession(current.server, current.token, fetch);
      }
    },

    /**
     * Listen to state changes.
     * @param {(state: string) => void} listener called with the new state
     * @returns {() => void} stops listening
     */
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
  return session;
}
