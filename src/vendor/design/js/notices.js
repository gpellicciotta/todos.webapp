/**
 * Notices module: notification store and shell router (ADR-0003, ADR-0004).
 *
 * - Stores app notifications (newest first) and inbox notifications with unread counts and deduplicated updates.
 * - Routes app errors and warnings to dismissible `.banner` elements in `.app__banners`, capped at three visible.
 * - Routes other app notices to `.toast` elements through `toast.js`, preventing duplicate toasts on overflow.
 * - Shows the most severe, then newest, live sticky inbox notification as a banner with a link to all alerts.
 * - Validates banner and navigation action URLs as same-origin paths or `http(s)` links, and uses `data-notices-*` hooks only.
 */

import { createIcon } from './icon.js';
import { createToast } from './toast.js';

export const NOTIFICATION_ADDED_EVENT = 'notification-added';
export const NOTIFICATION_DELETED_EVENT = 'notification-deleted';
export const NOTIFICATIONS_CLEARED_EVENT = 'notifications-cleared';
export const NOTIFICATIONS_UPDATED_EVENT = 'notifications-updated';

const SEVERITY_RANK = { error: 3, warning: 2, info: 1, success: 0 };
const BANNER_VARIANTS = { error: 'banner--danger', warning: 'banner--warning', success: 'banner--success' };
const DEFAULT_ICONS = { error: 'alert', warning: 'alert', success: 'check', info: 'note', dismiss: 'close' };
const DEFAULT_LABELS = {
    dismiss: 'Dismiss',
    open: 'Open',
    viewAll: (count) => `View all ${count} alerts`
};
const DEFAULT_MAX_BANNERS = 3;
const DEFAULT_INBOX_HREF = '/notifications';

/**
 * Tell whether an inbox item is an active sticky banner notification.
 * @param {object|null|undefined} note candidate notification
 * @returns {boolean} `true` when sticky and not deleted
 */
function isStickyInboxNote(note) {
    return Boolean(note && (note.banner === true || note.banner === 1 || note.banner === '1') && !note['deletion-time'] && !note.deletionTime);
}

/**
 * Parse a notification's creation timestamp in milliseconds, defaulting to `0`.
 * @param {object} note notification object
 * @returns {number} epoch milliseconds
 */
function creationTime(note) {
    const raw = note['creation-time'] ?? note.creationTime ?? 0;
    const ms = new Date(raw).getTime();
    return Number.isFinite(ms) ? ms : 0;
}

/**
 * Compare two notification IDs in descending order for tiebreaking.
 * @param {number|string|undefined} a first ID
 * @param {number|string|undefined} b second ID
 * @returns {number} positive when `b` ranks ahead of `a`
 */
function compareIdsDesc(a, b) {
    const numA = Number(a ?? 0);
    const numB = Number(b ?? 0);
    if (Number.isFinite(numA) && Number.isFinite(numB) && numA !== numB) {
        return numB - numA;
    }
    return String(b ?? '').localeCompare(String(a ?? ''));
}

/**
 * Pick the inbox notification to show as a banner: the most severe, then newest, live sticky banner notification.
 * @param {object[]} [inbox] inbox notifications
 * @returns {{note: object, count: number}|null} the chosen banner and total live sticky count, or `null`
 */
export function pickBanner(inbox) {
    const live = Array.isArray(inbox) ? inbox.filter(isStickyInboxNote) : [];
    if (live.length === 0) {
        return null;
    }
    live.sort((a, b) => ((SEVERITY_RANK[b.type] || 0) - (SEVERITY_RANK[a.type] || 0))
        || (creationTime(b) - creationTime(a))
        || compareIdsDesc(a.id, b.id));
    return { note: live[0], count: live.length };
}

/**
 * Map a notification type onto its `.banner` modifier class, empty for info.
 * @param {string|undefined} type notification type (`error`, `warning`, `success`, `info`)
 * @returns {string} modifier class name, or empty string
 */
export function bannerVariant(type) {
    return BANNER_VARIANTS[type] ?? '';
}

/**
 * Map a notification type onto its banner ARIA role: `alert` for errors, `status` for all others.
 * @param {string|undefined} type notification type
 * @returns {'alert'|'status'} ARIA role
 */
export function bannerRole(type) {
    return type === 'error' ? 'alert' : 'status';
}

/**
 * Decide how an app notification displays: errors and warnings stay as banners; other notices become toasts.
 * @param {object|null|undefined} note notification object
 * @returns {'banner'|'toast'} display kind
 */
export function noticeKind(note) {
    return (note?.type === 'error' || note?.type === 'warning') ? 'banner' : 'toast';
}

/**
 * Return `url` when it is a same-origin path (`/path`, not `//host`) or an `http(s)` URL, otherwise `null`.
 * @param {unknown} url candidate URL
 * @returns {string|null} validated URL or `null`
 */
export function safeUrl(url) {
    if (typeof url !== 'string') {
        return null;
    }
    return (/^\/(?!\/)/.test(url) || /^https?:\/\//i.test(url)) ? url : null;
}

/**
 * Validate a download link URL: permits `blob:` URLs in addition to `safeUrl` paths and `http(s)` links.
 * @param {unknown} url candidate download URL
 * @returns {string|null} validated URL or `null`
 */
function safeDownloadUrl(url) {
    if (typeof url !== 'string') {
        return null;
    }
    if (/^blob:/i.test(url)) {
        return url;
    }
    return safeUrl(url);
}

/**
 * Format the "View all N alerts" label from a function or template string.
 * @param {((count: number) => string)|string} label label formatter or template
 * @param {number} count total live sticky alert count
 * @returns {string} formatted text
 */
function formatViewAll(label, count) {
    if (typeof label === 'function') {
        return String(label(count));
    }
    return String(label).replaceAll('{{count}}', String(count));
}

/**
 * Extract an array of inbox notifications from a raw payload.
 * @param {unknown} payload array or `{ items | notifications }` wrapper
 * @returns {object[]} normalized array
 */
function normalizeInboxList(payload) {
    if (Array.isArray(payload)) {
        return payload;
    }
    if (payload && typeof payload === 'object') {
        if (Array.isArray(payload.items)) {
            return payload.items;
        }
        if (Array.isArray(payload.notifications)) {
            return payload.notifications;
        }
    }
    return [];
}

/**
 * Create a notification store and shell notices router.
 * @param {object} [options] controller options
 * @param {HTMLElement|null} [options.banners] optional `.app__banners` container to attach immediately
 * @param {HTMLElement|null} [options.toastRegion] optional `.toast-region` element used when creating an owned toaster
 * @param {{show: (message: string, settings?: object) => () => void, destroy?: () => void}} [options.toaster]
 *   existing toaster controller; one is created via `createToast` on attach when omitted
 * @param {Document} [options.document] document used to create elements and events
 * @param {EventTarget} [options.events] event target for store events, a fresh `EventTarget` by default
 * @param {number} [options.maxBanners] maximum visible app banners at once, `3` by default
 * @param {string} [options.inboxHref] link target for "View all N alerts", `'/notifications'` by default
 * @param {() => boolean} [options.isSignedIn] returns whether inbox banners should show, `() => true` by default
 * @param {() => Promise<object[]|object>} [options.loadInbox] async loader used by `refreshInbox()`
 * @param {(id: number|string, note: object|null) => void|Promise<void>} [options.onDiscardInbox]
 *   callback invoked when the user dismisses an inbox banner
 * @param {(href: string, context: {source: 'app'|'inbox', id: number|string, kind: 'all'|'action', note: object}) => void} [options.onNavigate]
 *   callback invoked on unmodified clicks of same-origin banner or toast links
 * @param {Partial<typeof DEFAULT_ICONS>} [options.icons] sprite glyph names (`null` omits an icon)
 * @param {Partial<typeof DEFAULT_LABELS>} [options.labels] localized UI strings
 * @param {() => number} [options.now] clock in milliseconds, `Date.now` by default
 * @param {{warn?: Function}} [options.log] optional logger for caught async callback errors
 * @returns {object} the notices controller
 */
export function createNotices(options = {}) {
    const doc = options.document ?? options.banners?.ownerDocument ?? globalThis.document;
    const EventCtor = doc?.defaultView?.CustomEvent ?? globalThis.CustomEvent;
    const eventTarget = options.events ?? new EventTarget();
    const maxBanners = Number.isInteger(options.maxBanners) && options.maxBanners > 0 ? options.maxBanners : DEFAULT_MAX_BANNERS;
    const inboxHref = options.inboxHref ?? DEFAULT_INBOX_HREF;
    const isSignedIn = typeof options.isSignedIn === 'function' ? options.isSignedIn : (() => true);
    const loadInbox = typeof options.loadInbox === 'function' ? options.loadInbox : null;
    const onDiscardInbox = typeof options.onDiscardInbox === 'function' ? options.onDiscardInbox : null;
    const onNavigate = typeof options.onNavigate === 'function' ? options.onNavigate : null;
    const icons = { ...DEFAULT_ICONS, ...(options.icons ?? {}) };
    const labels = { ...DEFAULT_LABELS, ...(options.labels ?? {}) };
    const now = typeof options.now === 'function' ? options.now : (() => Date.now());
    const log = options.log ?? null;

    let nextId = 1;
    let notifications = [];
    let inboxNotifications = [];
    let inboxSignature = null;
    let unreadCount = 0;
    let refreshPromise = null;

    let bannersEl = null;
    let activeToaster = options.toaster ?? null;
    let ownToaster = !options.toaster;
    let defaultToastRegion = options.toastRegion ?? null;
    const toasts = new Map();
    let renderedBanners = new Map();
    const trackedListeners = [];
    let destroyed = false;

    /**
     * Dispatch a `CustomEvent` on the controller's event target.
     * @param {string} type event name
     * @param {object} detail event payload
     */
    function emit(type, detail) {
        if (destroyed) {
            return;
        }
        eventTarget.dispatchEvent(new EventCtor(type, { detail }));
    }

    /**
     * Add an app notification to the store and update rendered notices.
     * @param {string|object} note plain text message or notification descriptor
     * @param {string} [type] notification type (`info`, `success`, `warning`, `error`), `'info'` by default
     * @param {object} [noteOptions] optional settings (`action`, `download`, `title`, `persistent`, `action-url`, `action-label`)
     * @returns {number|null} assigned notification ID, or `null` when destroyed
     */
    function addNotification(note, type, noteOptions = {}) {
        if (destroyed) {
            return null;
        }
        let descriptor;
        if (typeof note === 'string') {
            if (note.length === 0) {
                throw new TypeError('Expecting non-empty notification text');
            }
            descriptor = { ...noteOptions, note, type: type || noteOptions.type || 'info' };
        }
        else if (note && typeof note === 'object') {
            const text = note.note ?? note.message;
            if (typeof text !== 'string' || text.length === 0) {
                throw new TypeError('Expecting notification object with non-empty note or message');
            }
            descriptor = { ...noteOptions, ...note, note: text, type: note.type || type || 'info' };
        }
        else {
            throw new TypeError('Expecting notification text or object');
        }

        const added = {
            id: nextId++,
            type: descriptor.type,
            note: descriptor.note,
            time: descriptor.time ?? now()
        };
        if (descriptor.title) {
            added.title = String(descriptor.title);
        }
        if (descriptor.action) {
            added.action = descriptor.action;
        }
        if (descriptor.download) {
            added.download = descriptor.download;
        }
        if (descriptor.persistent !== undefined) {
            added.persistent = Boolean(descriptor.persistent);
        }
        const rawActionUrl = descriptor['action-url'] ?? descriptor.actionUrl;
        if (rawActionUrl !== undefined) {
            added['action-url'] = rawActionUrl;
        }
        const rawActionLabel = descriptor['action-label'] ?? descriptor.actionLabel;
        if (rawActionLabel !== undefined) {
            added['action-label'] = rawActionLabel;
        }

        notifications.splice(0, 0, added);
        emit(NOTIFICATION_ADDED_EVENT, { notification: added });
        update();
        return added.id;
    }

    /**
     * Delete an app notification by ID and remove its banner or toast.
     * @param {number|string} noteId notification ID
     * @returns {boolean} `true` when the notification existed and was deleted
     */
    function deleteNotification(noteId) {
        if (noteId === null || noteId === undefined || (typeof noteId !== 'number' && typeof noteId !== 'string')) {
            throw new TypeError('Expecting notification ID');
        }
        if (destroyed) {
            return false;
        }
        const index = notifications.findIndex((entry) => entry.id === noteId);
        if (index < 0) {
            return false;
        }
        const [deleted] = notifications.splice(index, 1);
        emit(NOTIFICATION_DELETED_EVENT, { notification: deleted });
        update();
        return true;
    }

    /**
     * Return a shallow copy of current app notifications, newest first.
     * @returns {object[]} app notifications
     */
    function getNotifications() {
        return notifications.slice();
    }

    /**
     * Clear all app notifications, removing app banners and dismissing active toasts.
     */
    function clearNotifications() {
        if (destroyed || notifications.length === 0) {
            return;
        }
        notifications = [];
        emit(NOTIFICATIONS_CLEARED_EVENT, {});
        update();
    }

    /**
     * Replace the cached inbox notifications, emitting `NOTIFICATIONS_UPDATED_EVENT` only when the list changed.
     * @param {object[]|object} items inbox notifications array or wrapper
     * @returns {object[]} current inbox notifications
     */
    function setInboxNotifications(items) {
        if (destroyed) {
            return [];
        }
        const list = normalizeInboxList(items);
        const signature = JSON.stringify(list);
        if (signature === inboxSignature) {
            return inboxNotifications.slice();
        }
        inboxSignature = signature;
        inboxNotifications = list.slice();
        unreadCount = list.filter((entry) => entry && entry['read-time'] == null && !entry.readTime && !entry['deletion-time'] && !entry.deletionTime).length;
        emit(NOTIFICATIONS_UPDATED_EVENT, { notifications: inboxNotifications.slice(), unreadCount });
        update();
        return inboxNotifications.slice();
    }

    /**
     * Return a shallow copy of cached inbox notifications.
     * @returns {object[]} inbox notifications
     */
    function getInboxNotifications() {
        return inboxNotifications.slice();
    }

    /**
     * Return the current count of unread live inbox notifications.
     * @returns {number} unread count
     */
    function getUnreadCount() {
        return unreadCount;
    }

    /**
     * Reload inbox notifications through `loadInbox`, deduplicating concurrent calls and clearing while signed out.
     * @returns {Promise<object[]>} current inbox notifications
     */
    async function refreshInbox() {
        if (destroyed) {
            return [];
        }
        if (refreshPromise) {
            return refreshPromise;
        }
        refreshPromise = (async () => {
            try {
                if (isSignedIn() === false) {
                    return setInboxNotifications([]);
                }
                if (!loadInbox) {
                    return inboxNotifications.slice();
                }
                const items = await loadInbox();
                return setInboxNotifications(items);
            }
            catch (error) {
                log?.warn?.('Failed to refresh notifications:', error);
                return inboxNotifications.slice();
            }
            finally {
                refreshPromise = null;
            }
        })();
        return refreshPromise;
    }

    /**
     * Run a toast or banner notification action: trigger a download, navigate via `onNavigate`, follow a safe link, or call `onClick`.
     * @param {object} action action descriptor
     * @param {object} note owning notification
     */
    function runAction(action, note) {
        if (!action || typeof action !== 'object') {
            return;
        }
        if (action.href) {
            if (action.download) {
                const href = safeDownloadUrl(action.href);
                if (!href) {
                    return;
                }
                const link = doc.createElement('a');
                link.setAttribute('href', href);
                link.setAttribute('download', String(action.download));
                link.click();
                return;
            }
            const href = safeUrl(action.href);
            if (!href) {
                return;
            }
            if (href.startsWith('/') && onNavigate) {
                onNavigate(href, { source: 'app', id: note.id, kind: 'action', note });
                return;
            }
            const link = doc.createElement('a');
            link.setAttribute('href', href);
            link.click();
            return;
        }
        if (typeof action.onClick === 'function') {
            action.onClick(note);
        }
    }

    /**
     * Show one app notification as a toast; a placeholder entry guards against duplicate renders during overflow updates.
     * @param {object} note app notification
     */
    function showToast(note) {
        if (!activeToaster) {
            return;
        }
        const action = note.action;
        const download = note.download;
        const settings = {
            persistent: Boolean(note.persistent || action || download),
            onDismiss: () => {
                if (toasts.delete(note.id)) {
                    deleteNotification(note.id);
                }
            }
        };
        if (download) {
            settings.download = download;
        }
        if (action) {
            settings.actionLabel = action.label;
            settings.undo = Boolean(action.undo);
            settings.onAction = () => runAction(action, note);
        }
        // Showing a toast can push out the oldest one, whose onDismiss deletes its note and re-enters update() before show() returns.
        toasts.set(note.id, () => {});
        const dismiss = activeToaster.show(String(note.note ?? note.message ?? ''), settings);
        if (toasts.has(note.id)) {
            toasts.set(note.id, dismiss);
        }
    }

    /**
     * Build one `.banner` element using DOM APIs only so all text and attributes stay escaped.
     * @param {object} note inbox or app notification
     * @param {{count?: number, source: 'inbox'|'app'}} meta banner metadata
     * @returns {HTMLDivElement} the banner element
     */
    function buildBanner(note, { count = 1, source }) {
        const type = note.type || 'info';
        const variant = bannerVariant(type);
        const banner = doc.createElement('div');
        banner.className = variant ? `banner ${variant}` : 'banner';
        banner.setAttribute('role', bannerRole(type));
        banner.setAttribute('data-notices-banner', '');
        banner.setAttribute('data-notices-id', String(note.id));
        banner.setAttribute('data-notices-source', source);

        const glyph = Object.hasOwn(icons, type) ? icons[type] : icons.info;
        if (glyph) {
            banner.append(createIcon(doc, glyph));
        }

        const paragraph = doc.createElement('p');
        paragraph.className = 'banner__text';
        if (note.title) {
            const title = doc.createElement('strong');
            title.textContent = `${note.title}:`;
            paragraph.append(title, doc.createTextNode(' '));
        }
        paragraph.append(doc.createTextNode(String(note.message ?? note.note ?? '')));
        banner.append(paragraph);

        if (source === 'inbox' && count > 1) {
            const safeAllHref = safeUrl(inboxHref);
            if (safeAllHref) {
                const allLink = doc.createElement('a');
                allLink.className = 'link-button';
                allLink.setAttribute('href', safeAllHref);
                allLink.setAttribute('data-notices-all', '');
                allLink.textContent = formatViewAll(labels.viewAll, count);
                banner.append(allLink);
            }
        }

        const actionUrl = safeUrl(note['action-url'] ?? note.actionUrl);
        if (actionUrl) {
            const actionLink = doc.createElement('a');
            actionLink.className = 'button button--quiet';
            actionLink.setAttribute('href', actionUrl);
            actionLink.setAttribute('data-notices-action', '');
            actionLink.textContent = String(note['action-label'] ?? note.actionLabel ?? labels.open);
            banner.append(actionLink);
        }
        else if (note.action && typeof note.action === 'object') {
            if (typeof note.action.onClick === 'function') {
                const actionButton = doc.createElement('button');
                actionButton.className = 'button button--quiet';
                actionButton.type = 'button';
                actionButton.setAttribute('data-notices-action', '');
                actionButton.textContent = String(note.action.label ?? labels.open);
                banner.append(actionButton);
            }
            else {
                const safeActionHref = safeUrl(note.action.href);
                if (safeActionHref) {
                    const actionLink = doc.createElement('a');
                    actionLink.className = 'button button--quiet';
                    actionLink.setAttribute('href', safeActionHref);
                    actionLink.setAttribute('data-notices-action', '');
                    actionLink.textContent = String(note.action.label ?? labels.open);
                    banner.append(actionLink);
                }
            }
        }

        const dismissButton = doc.createElement('button');
        dismissButton.className = 'icon-button';
        dismissButton.type = 'button';
        dismissButton.setAttribute('data-notices-dismiss', '');
        dismissButton.setAttribute('aria-label', labels.dismiss);
        dismissButton.setAttribute('title', labels.dismiss);
        if (icons.dismiss) {
            dismissButton.append(createIcon(doc, icons.dismiss));
        }
        else {
            dismissButton.textContent = '×';
        }
        banner.append(dismissButton);

        return banner;
    }

    /**
     * Reconcile rendered banners and toasts with the current notification store.
     */
    function update() {
        if (destroyed || !bannersEl) {
            return;
        }
        const active = doc.activeElement;
        let focusedKey = null;
        let focusedIndex = -1;
        if (active && bannersEl.contains(active)) {
            const prevBanner = active.closest?.('[data-notices-banner]');
            if (prevBanner) {
                const prevEntry = renderedBanners.get(prevBanner);
                if (prevEntry) {
                    focusedKey = `${prevEntry.source}:${prevEntry.id}`;
                    focusedIndex = [...renderedBanners.keys()].indexOf(prevBanner);
                }
            }
        }

        const nodes = [];
        const nextRendered = new Map();
        const inboxBanner = isSignedIn() === false ? null : pickBanner(inboxNotifications);
        if (inboxBanner) {
            const el = buildBanner(inboxBanner.note, { count: inboxBanner.count, source: 'inbox' });
            nodes.push(el);
            nextRendered.set(el, { id: inboxBanner.note.id, source: 'inbox', note: inboxBanner.note });
        }
        for (const note of notifications.filter((entry) => noticeKind(entry) === 'banner').slice(0, maxBanners)) {
            const el = buildBanner(note, { source: 'app' });
            nodes.push(el);
            nextRendered.set(el, { id: note.id, source: 'app', note });
        }
        renderedBanners = nextRendered;
        bannersEl.replaceChildren(...nodes);

        if (focusedKey !== null && nodes.length > 0) {
            const same = nodes.find((node) => {
                const entry = nextRendered.get(node);
                return `${entry.source}:${entry.id}` === focusedKey;
            });
            const target = same ?? nodes[Math.min(Math.max(focusedIndex, 0), nodes.length - 1)];
            target?.querySelector('[data-notices-dismiss]')?.focus();
        }

        const liveIds = new Set(notifications.map((entry) => entry.id));
        for (const [id, dismiss] of [...toasts]) {
            if (!liveIds.has(id)) {
                toasts.delete(id);
                dismiss();
            }
        }
        for (const note of [...notifications].reverse()) {
            if (noticeKind(note) === 'toast' && !toasts.has(note.id)) {
                showToast(note);
            }
        }
    }

    /**
     * Dismiss a banner: app notices are deleted from the store; inbox notices route through `onDiscardInbox`.
     * @param {number|string} id notification ID
     * @param {'app'|'inbox'} [source] banner source, `'app'` by default
     * @returns {Promise<void>}
     */
    async function dismissBanner(id, source = 'app') {
        if (destroyed) {
            return;
        }
        if (source === 'app') {
            deleteNotification(id);
            return;
        }
        const match = inboxNotifications.find((entry) => entry.id === id || String(entry.id) === String(id)) ?? null;
        if (onDiscardInbox) {
            try {
                await onDiscardInbox(match ? match.id : id, match);
            }
            catch (error) {
                log?.warn?.('Failed to discard banner notification:', error);
            }
            if (loadInbox) {
                await refreshInbox();
            }
            return;
        }
        setInboxNotifications(inboxNotifications.filter((entry) => entry.id !== id && String(entry.id) !== String(id)));
    }

    /**
     * Handle delegated clicks on dismiss buttons, summary links, and banner actions inside the banners area.
     * @param {MouseEvent} event click event
     */
    function onBannerClick(event) {
        if (destroyed || event.defaultPrevented) {
            return;
        }
        const rawTarget = event.target;
        const elementTarget = rawTarget && rawTarget.nodeType === 1 ? rawTarget : rawTarget?.parentElement;
        const banner = elementTarget?.closest?.('[data-notices-banner]');
        if (!banner || !bannersEl?.contains(banner)) {
            return;
        }
        const entry = renderedBanners.get(banner);
        if (!entry) {
            return;
        }

        const dismiss = elementTarget.closest('[data-notices-dismiss]');
        if (dismiss && banner.contains(dismiss)) {
            event.preventDefault();
            event.stopPropagation();
            dismissBanner(entry.id, entry.source);
            return;
        }

        const linkOrAction = elementTarget.closest('[data-notices-all], [data-notices-action]');
        if (!linkOrAction || !banner.contains(linkOrAction)) {
            return;
        }
        if (linkOrAction.tagName === 'BUTTON') {
            event.preventDefault();
            event.stopPropagation();
            entry.note.action?.onClick?.(entry.note);
            deleteNotification(entry.id);
            return;
        }
        const href = linkOrAction.getAttribute('href');
        const modifiedClick = Boolean(event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || (typeof event.button === 'number' && event.button !== 0));
        if (href && href.startsWith('/') && onNavigate && !modifiedClick) {
            event.preventDefault();
            const kind = linkOrAction.hasAttribute('data-notices-all') ? 'all' : 'action';
            onNavigate(href, { source: entry.source, id: entry.id, kind, note: entry.note });
        }
    }

    /**
     * Attach notices rendering to the shell's `.app__banners` container and optional `.toast-region`.
     * @param {HTMLElement} banners banner area element
     * @param {HTMLElement|null} [toastRegion] optional toast region element
     */
    function attach(banners, toastRegion = defaultToastRegion) {
        if (destroyed || !banners) {
            return;
        }
        if (bannersEl === banners) {
            update();
            return;
        }
        if (bannersEl) {
            detach();
        }
        bannersEl = banners;
        defaultToastRegion = toastRegion ?? defaultToastRegion;
        if (!activeToaster) {
            activeToaster = createToast({ document: doc, ...(toastRegion ? { region: toastRegion } : {}) });
            ownToaster = true;
        }
        bannersEl.addEventListener('click', onBannerClick);
        update();
    }

    /**
     * Detach DOM listeners, dismiss rendered toasts, and destroy an owned toaster without clearing the store.
     */
    function detach() {
        if (bannersEl) {
            bannersEl.removeEventListener('click', onBannerClick);
            bannersEl = null;
        }
        renderedBanners.clear();
        const activeDismissals = [...toasts.values()];
        toasts.clear();
        for (const dismiss of activeDismissals) {
            dismiss();
        }
        if (ownToaster && activeToaster) {
            activeToaster.destroy?.();
            activeToaster = null;
        }
    }

    /**
     * Subscribe to notification store events.
     * @param {string} type event name
     * @param {EventListenerOrEventListenerObject} listener event callback
     * @param {boolean|AddEventListenerOptions} [listenerOptions] listener options
     */
    function addEventListener(type, listener, listenerOptions) {
        if (destroyed || !type || !listener) {
            return;
        }
        eventTarget.addEventListener(type, listener, listenerOptions);
        trackedListeners.push({ type, listener, options: listenerOptions });
    }

    /**
     * Unsubscribe from notification store events.
     * @param {string} type event name
     * @param {EventListenerOrEventListenerObject} listener event callback
     * @param {boolean|EventListenerOptions} [listenerOptions] listener options
     */
    function removeEventListener(type, listener, listenerOptions) {
        eventTarget.removeEventListener(type, listener, listenerOptions);
        const index = trackedListeners.findIndex((entry) => entry.type === type && entry.listener === listener);
        if (index !== -1) {
            trackedListeners.splice(index, 1);
        }
    }

    /**
     * Detach all DOM listeners, remove store event listeners, destroy any owned toaster, and clear stored notices.
     */
    function destroy() {
        if (destroyed) {
            return;
        }
        destroyed = true;
        detach();
        for (const { type, listener, options: listenerOptions } of trackedListeners) {
            eventTarget.removeEventListener(type, listener, listenerOptions);
        }
        trackedListeners.length = 0;
        notifications = [];
        inboxNotifications = [];
        inboxSignature = null;
        unreadCount = 0;
    }

    if (options.banners) {
        attach(options.banners, options.toastRegion);
    }

    return {
        addNotification,
        deleteNotification,
        getNotifications,
        clearNotifications,
        setInboxNotifications,
        getInboxNotifications,
        getUnreadCount,
        refreshInbox,
        dismissBanner,
        update,
        attach,
        detach,
        addEventListener,
        removeEventListener,
        destroy
    };
}

/**
 * Create a notices controller and immediately attach it to the shell's `.app__banners` container.
 * @param {HTMLElement} banners `.app__banners` container
 * @param {object} [options] options forwarded to `createNotices`
 * @returns {ReturnType<typeof createNotices>} the notices controller
 */
export function attachNotices(banners, options = {}) {
    return createNotices({ ...options, banners });
}
