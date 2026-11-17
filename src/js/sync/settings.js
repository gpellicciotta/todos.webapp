/**
 * Settings sync: the synced settings follow the account while connected (`SYN-13`).
 *
 * preferences.js names the synced settings, records the edit time of each local write, and keeps the pending names.
 * Each engine run calls `run` after the queue replay and the feed pull:
 * - With pending names, one `PATCH /api/users/me/settings` uploads them with their edit times; a removal sends `null`.
 * - Otherwise a `GET` with the last `ETag` in `If-None-Match` downloads them; a `304` ends the step.
 * - Every reply merges by edit time: a newer server entry replaces the local value, or removes it for `null`.
 *   A newer local value, or one the server lacks, becomes pending, so the first connect uploads the local settings.
 * - A sent name takes the entry the service kept, with its edit time, so a refused or clamped edit is not sent again.
 * - The view options of a list gone from the store are removed, which sends `null` for them.
 * A failed call keeps the pending names for the next run and never changes the sync state shown to the user.
 * Downloads write the storage directly, so they record no edit, and then tell the owner modules through `announceSettings`.
 * Disconnecting forgets the pending names, the `ETag`, and the edit times, and keeps the settings on this device.
 */

import {
  announceSettings, EDIT_TIMES_KEY, isSyncedSetting, PENDING_KEY, PREFIX, readEditTimes, readPendingSettings, readPreference,
  removePreference, writePreference,
} from '../core/preferences.js';
import { judge, SyncStop } from './api.js';

export const SETTINGS_ROUTE = '/api/users/me/settings';
const ETAG_KEY = 'settings.etag';
const VIEW_LIST = 'todos.view.list.';
/** The edit time sent for a value stored before edit times existed: older than any real edit, and inside the service's range. */
export const OLDEST_EDIT_TIME = '2000-01-01T00:00:00.000Z';
/** The service's name rule and its limit of names per request. */
const NAME_RULE = /^todos\.[a-z0-9]+([.-][a-z0-9]+)*$/;
const MAX_NAMES = 500;

/**
 * List the keys of a storage.
 * @param {Storage|null|undefined} storage the storage
 * @returns {string[]} the keys
 */
function storedNames(storage) {
  const names = [];
  try {
    for (let index = 0; index < (storage?.length ?? 0); index += 1) {
      const name = storage.key(index);
      if (name !== null) {
        names.push(name);
      }
    }
  }
  catch {
    // Blocked storage lists nothing.
  }
  return names;
}

/**
 * Read a server entry: `{value, edit-time}` with a valid edit time.
 * @param {unknown} entry the entry
 * @returns {{value: unknown, 'edit-time': string}|null} the entry, or null when absent or malformed
 */
function readEntry(entry) {
  return entry && typeof entry === 'object' && Number.isFinite(Date.parse(entry['edit-time'])) ? entry : null;
}

/**
 * Create the settings sync of a session.
 * @param {object} options the dependencies
 * @param {object} options.session the session
 * @param {object} options.api the API client
 * @param {() => Storage} [options.getStorage] returns the storage, `localStorage` by default
 * @param {(() => Promise<string[]>)|null} [options.listIds] lists every list identifier of the store, trashed ones included
 * @returns {{run: () => Promise<'skipped'|'unchanged'|'downloaded'|'uploaded'|'failed'>, disconnect: () => void}} the settings sync
 */
export function createSettingsSync({ session, api, getStorage = () => globalThis.localStorage, listIds = null }) {
  /** @returns {string} the account the stored `ETag` belongs to */
  const accountKey = () => {
    const account = session.account();
    return account ? `${account.email} ${account.server}` : '';
  };

  /** @returns {string|null} the stored `ETag` of this account */
  function readEtag() {
    const stored = readPreference(ETAG_KEY, null, getStorage);
    return stored?.account === accountKey() && typeof stored.value === 'string' ? stored.value : null;
  }

  /**
   * Read a stored value for an upload.
   * @param {Storage} storage the storage
   * @param {string} name the full key
   * @returns {unknown} the value, or null when removed
   */
  function readValue(storage, name) {
    const raw = storage.getItem(name);
    if (raw === null) {
      return null;
    }
    try {
      return JSON.parse(raw);
    }
    catch {
      return raw;
    }
  }

  /**
   * Merge a reply into the local settings by edit time, then tell the owner modules what changed.
   * @param {{headers: {get: Function}, body: any}} response the reply holding a `UserSettings` object
   * @param {Map<string, string|null>|null} sent the uploaded names with the local edit time they had, for a `PATCH`
   */
  function merge(response, sent) {
    const storage = getStorage();
    const body = response.body?.settings;
    const server = body && typeof body === 'object' ? body : {};
    const times = readEditTimes(getStorage);
    const pending = new Set(readPendingSettings(getStorage));
    const changed = [];

    /**
     * Take a server entry: its value, or the removal of the key for `null`, and its edit time.
     * @param {string} name the full key
     * @param {{value: unknown, 'edit-time': string}} entry the entry
     */
    function adopt(name, entry) {
      const next = entry.value === null || entry.value === undefined ? null : JSON.stringify(entry.value);
      if (next !== storage.getItem(name)) {
        if (next === null) {
          storage.removeItem(name);
        }
        else {
          storage.setItem(name, next);
        }
        changed.push(name);
      }
      times[name] = entry['edit-time'];
    }

    const names = new Set([...Object.keys(server), ...storedNames(storage), ...Object.keys(times)].filter(isSyncedSetting));
    for (const name of names) {
      const entry = readEntry(server[name]);
      const local = times[name] ?? null;
      if (sent?.has(name) && local === sent.get(name)) {
        pending.delete(name);
        if (entry) {
          adopt(name, entry);
        }
      }
      else if (entry && (local === null || Date.parse(entry['edit-time']) > Date.parse(local))) {
        adopt(name, entry);
      }
      else if ((!entry || Date.parse(local) > Date.parse(entry['edit-time'])) && (local !== null || storage.getItem(name) !== null)) {
        pending.add(name);
      }
    }
    writePreference(EDIT_TIMES_KEY, times, getStorage);
    writePreference(PENDING_KEY, [...pending], getStorage);
    const etag = response.headers?.get?.('etag');
    if (etag) {
      writePreference(ETAG_KEY, { account: accountKey(), value: etag }, getStorage);
    }
    announceSettings(changed);
  }

  /**
   * Upload the pending names, at most 500 per request.
   * A name the service would refuse is dropped, and so is a request it refuses, so one bad value cannot block the rest.
   * @returns {Promise<'uploaded'|'failed'>} how the upload ended
   * @throws {SyncStop} when the service or the network fails, which keeps the pending names
   */
  async function upload() {
    const all = readPendingSettings(getStorage);
    const valid = all.filter((name) => name.length <= 200 && NAME_RULE.test(name));
    if (valid.length < all.length) {
      writePreference(PENDING_KEY, valid, getStorage);
    }
    for (let start = 0; start < valid.length; start += MAX_NAMES) {
      const storage = getStorage();
      const times = readEditTimes(getStorage);
      const sent = new Map();
      const settings = {};
      const editTimes = {};
      for (const name of valid.slice(start, start + MAX_NAMES)) {
        settings[name] = readValue(storage, name);
        editTimes[name] = times[name] ?? OLDEST_EDIT_TIME;
        sent.set(name, times[name] ?? null);
      }
      const response = await api.send('PATCH', SETTINGS_ROUTE, { body: { settings, 'edit-times': editTimes } });
      if (judge(response) !== 'done') {
        console.warn(`The service refused the settings ${[...sent.keys()].join(', ')} (HTTP ${response.status}).`);
        const unchanged = [...sent].filter(([name, time]) => (readEditTimes(getStorage)[name] ?? null) === time).map(([name]) => name);
        writePreference(PENDING_KEY, readPendingSettings(getStorage).filter((name) => !unchanged.includes(name)), getStorage);
        return 'failed';
      }
      merge(response, sent);
    }
    return 'uploaded';
  }

  /** Remove the view options of lists gone from the store; each removal joins the pending names as `null`. */
  async function prune() {
    if (!listIds) {
      return;
    }
    const ids = new Set(await listIds());
    for (const name of storedNames(getStorage())) {
      if (name.startsWith(VIEW_LIST) && isSyncedSetting(name) && !ids.has(name.slice(VIEW_LIST.length))) {
        removePreference(name.slice(PREFIX.length), getStorage);
      }
    }
  }

  return {
    /**
     * Run one settings step: upload the pending names, or download the account's settings.
     * @returns {Promise<'skipped'|'unchanged'|'downloaded'|'uploaded'|'failed'>} how the step ended; `skipped` unless connected
     */
    async run() {
      if (session.state() !== 'connected') {
        return 'skipped';
      }
      try {
        await prune();
        if (readPendingSettings(getStorage).length === 0) {
          const etag = readEtag();
          const response = await api.send('GET', SETTINGS_ROUTE, etag ? { headers: { 'If-None-Match': etag } } : {});
          if (response.status === 304) {
            return 'unchanged';
          }
          if (judge(response) !== 'done') {
            return 'failed';
          }
          merge(response, null);
          if (readPendingSettings(getStorage).length === 0) {
            return 'downloaded';
          }
        }
        return await upload();
      }
      catch (error) {
        if (!(error instanceof SyncStop)) {
          console.error('Syncing the settings failed:', error);
        }
        return 'failed';
      }
    },

    /** Forget the pending names, the `ETag`, and the edit times; the settings stay on this device. */
    disconnect() {
      for (const key of [PENDING_KEY, ETAG_KEY, EDIT_TIMES_KEY]) {
        removePreference(key, getStorage);
      }
    },
  };
}
