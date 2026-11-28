/**
 * Push subscription: delivers due reminders while every tab is closed, through Web Push (`REM-11` to `REM-14`).
 *
 * While connected, with Reminders on and notification permission granted, this device subscribes through `PushManager`
 * with the service's VAPID key and registers the subscription with the service, with the lead time and a device name.
 * A lead time change patches the registration. Turning Reminders off, disconnecting, and a lost session unsubscribe the browser;
 * the first two also delete the registration, since they still hold a token. A lost session cannot delete it, so the service
 * drops the registration when its push service answers that the subscription is gone.
 * Local mode sends no request (`LOC-3`). The service worker shows the pushed reminders (see service-worker.js).
 * The status says how it stands, for Settings: `off`, `on`, `unavailable`, `unsupported`, or `unsupported-ios`.
 */

import { readPreference, writePreference } from '../core/preferences.js';
import { judge, SyncStop } from './api.js';

const RECORD = 'push-subscription';
const UNAVAILABLE = 503;

/**
 * Decode a base64url key, such as the VAPID public key, to bytes.
 * @param {string} text the base64url text
 * @returns {Uint8Array} the bytes
 */
export function applicationServerKey(text) {
  const base64 = text.replaceAll('-', '+').replaceAll('_', '/').padEnd(Math.ceil(text.length / 4) * 4, '=');
  return Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
}

/**
 * Name this device for the service from its user agent, such as `Chrome on Windows`.
 * @param {string} userAgent the user agent
 * @returns {string} the name, or `Web browser` when nothing is recognized
 */
export function deviceNameOf(userAgent) {
  const browser = [['Edg', 'Edge'], ['Firefox', 'Firefox'], ['Chrome', 'Chrome'], ['Safari', 'Safari']].find(([token]) => userAgent.includes(token))?.[1];
  const platform = [['Android', 'Android'], ['iPhone', 'iOS'], ['iPad', 'iOS'], ['iPod', 'iOS'], ['Windows', 'Windows'], ['Macintosh', 'macOS'], ['CrOS', 'ChromeOS'], ['Linux', 'Linux']].find(([token]) => userAgent.includes(token))?.[1];
  if (browser && platform) {
    return `${browser} on ${platform}`;
  }
  return browser ?? platform ?? 'Web browser';
}

/**
 * Tell whether this browser is Safari on an iPhone or iPad, where Web Push needs the app on the Home Screen.
 * @returns {boolean} true on iOS
 */
function onIos() {
  const { userAgent = '', platform = '', maxTouchPoints = 0 } = globalThis.navigator ?? {};
  return /iPad|iPhone|iPod/.test(userAgent) || (platform === 'MacIntel' && maxTouchPoints > 1);
}

/**
 * Create the push subscription of this device.
 * @param {object} options the dependencies
 * @param {object} options.session the session
 * @param {object} options.api the API client
 * @param {() => Promise<{pushManager?: PushManager}>} [options.getRegistration] resolves the service worker registration
 * @param {() => boolean} options.wanted true while Reminders are on and notification permission is granted
 * @param {() => number} options.lead the lead time in minutes
 * @param {() => Storage} [options.getStorage] returns the storage, `localStorage` by default
 * @param {() => string} [options.deviceName] names this device
 * @param {boolean} [options.ios] true on iOS, detected by default
 * @returns {{sync: () => Promise<string>, unregister: () => Promise<void>, status: () => string, subscribe: Function}} the subscription
 */
export function createPushSubscription({
  session,
  api,
  getRegistration = () => globalThis.navigator.serviceWorker.ready,
  wanted,
  lead,
  getStorage,
  deviceName = () => deviceNameOf(globalThis.navigator?.userAgent ?? ''),
  ios = onIos(),
}) {
  const listeners = new Set();
  let status = 'off';
  let queue = Promise.resolve();

  const read = () => readPreference(RECORD, null, getStorage);
  const forget = () => writePreference(RECORD, null, getStorage);
  const set = (next) => {
    if (next !== status) {
      status = next;
      listeners.forEach((listener) => listener(status));
    }
    return status;
  };

  /**
   * Find the push manager of this browser.
   * @returns {Promise<PushManager|null>} the manager, or null without Web Push support
   */
  async function managerOf() {
    try {
      return (await getRegistration())?.pushManager ?? null;
    }
    catch {
      return null;
    }
  }

  /**
   * Drop this device's subscription: delete the registration while a token is there, then unsubscribe the browser.
   * A failed delete is not retried; the service drops a registration whose subscription is gone.
   * @returns {Promise<void>}
   */
  async function release() {
    const saved = read();
    if (!saved) {
      return;
    }
    if (session.token() && saved.id && saved.server === session.serverUrl()) {
      try {
        await api.deletePushSubscription(saved.id);
      }
      catch (error) {
        if (error instanceof SyncStop && error.kind === 'auth') {
          session.expire();
        }
      }
    }
    try {
      await (await (await managerOf())?.getSubscription())?.unsubscribe();
    }
    catch (error) {
      console.error('Unsubscribing from push failed:', error);
    }
    forget();
  }

  /**
   * Subscribe this browser, taking an existing subscription as is.
   * @param {PushManager} manager the push manager
   * @returns {Promise<PushSubscription|null>} the subscription, or null when the service has no push key
   */
  async function subscription(manager) {
    const existing = await manager.getSubscription();
    if (existing) {
      return existing;
    }
    const key = await api.getVapidKey();
    // A 503 means the service has no push keys, which is no reason to retry; other failures judge as everywhere.
    if (key.status === UNAVAILABLE || judge(key) !== 'done') {
      return null;
    }
    return manager.subscribe({ userVisibleOnly: true, applicationServerKey: applicationServerKey(key.body['public-key']) });
  }

  /**
   * Register the subscription with the service, or update the lead time of the registration held.
   * @param {PushSubscription} browser the browser subscription
   * @returns {Promise<boolean>} true when the service holds the registration
   */
  async function register(browser) {
    const minutes = lead();
    const saved = read();
    const server = session.serverUrl();
    if (saved?.endpoint === browser.endpoint && saved.server === server) {
      if (saved.lead === minutes) {
        return true;
      }
      const reply = await api.updatePushSubscription(saved.id, { 'lead-minutes': minutes });
      if (judge(reply) === 'done') {
        writePreference(RECORD, { ...saved, lead: minutes }, getStorage);
        return true;
      }
    }
    const { endpoint, keys } = browser.toJSON();
    const reply = await api.registerPushSubscription({ endpoint, keys, 'lead-minutes': minutes, 'device-name': deviceName() });
    if (judge(reply) !== 'done') {
      return false;
    }
    writePreference(RECORD, { id: reply.body.id, endpoint, server, lead: minutes }, getStorage);
    return true;
  }

  /**
   * Bring the subscription in line with the connection, the Reminders choice, and the lead time.
   * @returns {Promise<string>} the status
   */
  async function run() {
    if (session.state() !== 'connected' || !wanted()) {
      await release();
      return set('off');
    }
    try {
      const manager = await managerOf();
      if (!manager) {
        return set(ios ? 'unsupported-ios' : 'unsupported');
      }
      const browser = await subscription(manager);
      return set(browser && await register(browser) ? 'on' : 'unavailable');
    }
    catch (error) {
      if (error instanceof SyncStop) {
        if (error.kind === 'auth') {
          session.expire();
          await release();
          return set('off');
        }
        // No network or a service failure: keep the status, and try again at the next change or focus.
        return status;
      }
      console.error('Subscribing to push failed:', error);
      return set('unavailable');
    }
  }

  const push = {
    /**
     * Bring the subscription in line now; calls queue, so they never overlap.
     * @returns {Promise<string>} the status
     */
    sync() {
      queue = queue.then(run, run);
      return queue;
    },

    /**
     * Delete the registration and unsubscribe the browser, as a disconnect needs while the token is still there.
     * @returns {Promise<void>}
     */
    unregister() {
      const done = queue.then(release, release).then(() => {
        set('off');
      });
      queue = done.catch(() => {});
      return done;
    },

    /** @returns {string} the status */
    status: () => status,

    /**
     * Listen to status changes.
     * @param {(status: string) => void} listener called with the new status
     * @returns {() => void} stops listening
     */
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
  return push;
}
