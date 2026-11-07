/**
 * Inbox: the notifications and service broadcasts of the connected account (`NTF-1` to `NTF-7`).
 *
 * Contract: the service's REST API, Notifications & Broadcasts: list, mark read, discard, and discard all.
 * The inbox lives on the server only. It loads while the session is connected, at start, on sign-in,
 * when the tab turns visible, and every 2 minutes while visible; it holds nothing in local mode or after
 * the session expired, and then sends no request (`LOC-3`).
 * Status: `idle` without a connection, `ready` after a load, and `offline` when the last load failed;
 * an offline inbox keeps its last notifications. A `401` expires the session (`CON-13`).
 * Changes wait for the server's answer and report `false` when it does not come.
 */

const INTERVAL = 2 * 60 * 1000;
const PATH = '/api/notifications';

/**
 * Turn a server notification into the camel-cased shape the app uses.
 * @param {object} raw a `Notification` of the REST API
 * @returns {{id: number, title: string|null, message: string, type: string, banner: boolean,
 *   actionUrl: string|null, creationTime: string|null, read: boolean}} the notification
 */
export function normalizeNotification(raw) {
  const readTime = raw['read-time'] ?? null;
  return {
    id: raw.id,
    title: raw.title ?? null,
    message: raw.message ?? '',
    type: String(raw.type ?? 'info').toLowerCase(),
    banner: Boolean(raw.banner),
    actionUrl: raw['action-url'] ?? null,
    creationTime: raw['creation-time'] ?? null,
    read: raw.read ?? Boolean(readTime),
  };
}

/**
 * Resolve the action address of a notification against the server.
 * Only `http:` and `https:` addresses count, so a notification never carries a script or data link.
 * @param {{actionUrl: string|null}} notification the notification
 * @param {string} server the server URL
 * @returns {string|null} the address, or null without a safe one
 */
export function actionLink(notification, server) {
  if (!notification.actionUrl) {
    return null;
  }
  try {
    const url = new URL(notification.actionUrl, server);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : null;
  }
  catch {
    return null;
  }
}

/**
 * Create the inbox of a session.
 * @param {object} options the dependencies
 * @param {object} options.session the session
 * @param {Function} [options.fetch] the fetch function
 * @returns {object} the inbox
 */
export function createInbox({ session, fetch = (...args) => globalThis.fetch(...args) }) {
  const listeners = new Set();
  let notifications = [];
  let status = 'idle';
  let pending = null;
  let stopWatching = null;

  /** Tell the listeners the inbox changed. */
  function notify() {
    for (const listener of listeners) {
      listener();
    }
  }

  /** Forget everything, as when the connection ends. */
  function reset() {
    if (notifications.length > 0 || status !== 'idle') {
      notifications = [];
      status = 'idle';
      notify();
    }
  }

  /**
   * Send a request with the session token.
   * @param {string} method the HTTP method
   * @param {string} path the path below the server
   * @returns {Promise<{status: number, body: *}|null>} the answer, or null without a connection or an answer
   */
  async function send(method, path) {
    const token = session.token();
    const account = session.account();
    if (!token || !account) {
      return null;
    }
    try {
      const response = await fetch(`${account.server}${path}`, { method, headers: { Accept: 'application/json', Authorization: `Bearer ${token}` } });
      if (response.status === 401) {
        session.expire();
        reset();
        return null;
      }
      const body = response.ok ? await response.json().catch(() => null) : null;
      return { status: response.status, body };
    }
    catch {
      return null;
    }
  }

  /**
   * Load the notifications.
   * @returns {Promise<void>} resolves once the inbox is current; overlapping calls share one request
   */
  function refresh() {
    if (session.state() !== 'connected') {
      reset();
      return Promise.resolve();
    }
    pending ??= send('GET', PATH).then((answer) => {
      pending = null;
      if (session.state() !== 'connected') {
        return;
      }
      if (answer?.status === 200 && Array.isArray(answer.body)) {
        notifications = answer.body.map(normalizeNotification);
        status = 'ready';
      }
      else {
        status = 'offline';
      }
      notify();
    });
    return pending;
  }

  /**
   * Send a change, and resync when the service no longer knows the notification.
   * @param {string} method the HTTP method
   * @param {string} path the path below the server
   * @param {(body: *) => void} apply updates the local copy after the service accepted
   * @returns {Promise<boolean>} true when the service accepted the change
   */
  async function change(method, path, apply) {
    const answer = await send(method, path);
    if (answer?.status === 200) {
      apply(answer.body);
      notify();
      return true;
    }
    if (answer?.status === 404) {
      await refresh();
    }
    return false;
  }

  return {
    /** @returns {object[]} the notifications, most recent first */
    list: () => notifications,

    /** @returns {'idle'|'ready'|'offline'} the status */
    status: () => status,

    /** @returns {number} how many notifications are unread */
    unreadCount: () => notifications.filter((item) => !item.read).length,

    /** @returns {object[]} the unread notifications that ask for a banner */
    banners: () => notifications.filter((item) => item.banner && !item.read),

    refresh,

    /**
     * Mark a notification read.
     * @param {number} id the notification identifier
     * @returns {Promise<boolean>} true when done
     */
    markRead: (id) => change('POST', `${PATH}/${id}/read`, (body) => {
      notifications = notifications.map((item) => (item.id === id ? { ...item, ...(body ? normalizeNotification(body) : {}), read: true } : item));
    }),

    /**
     * Discard a notification.
     * @param {number} id the notification identifier
     * @returns {Promise<boolean>} true when done
     */
    discard: (id) => change('DELETE', `${PATH}/${id}`, () => {
      notifications = notifications.filter((item) => item.id !== id);
    }),

    /**
     * Discard every notification.
     * @returns {Promise<boolean>} true when done
     */
    clearAll: () => change('POST', `${PATH}/clear-all`, () => {
      notifications = [];
    }),

    /**
     * Listen to changes.
     * @param {() => void} listener called after each change
     * @returns {() => void} stops listening
     */
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    /**
     * Start following the session: load now, on sign-in, when the tab turns visible, and every 2 minutes.
     * @param {object} [options] the options
     * @param {Document} [options.document] the document, for its visibility
     * @param {number} [options.interval] the pause between loads in milliseconds
     */
    start({ document: doc = globalThis.document, interval = INTERVAL } = {}) {
      this.stop();
      const visible = () => doc?.visibilityState !== 'hidden';
      const refreshIfVisible = () => {
        if (visible()) {
          refresh();
        }
      };
      const unsubscribe = session.subscribe((state) => (state === 'connected' ? refresh() : reset()));
      const timer = setInterval(refreshIfVisible, interval);
      doc?.addEventListener('visibilitychange', refreshIfVisible);
      stopWatching = () => {
        unsubscribe();
        clearInterval(timer);
        doc?.removeEventListener('visibilitychange', refreshIfVisible);
      };
      refresh();
    },

    /** Stop following the session. */
    stop() {
      stopWatching?.();
      stopWatching = null;
    },
  };
}
