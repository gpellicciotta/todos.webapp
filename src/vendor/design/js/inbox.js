/**
 * Notifications inbox pattern and top-bar unread count button (ADR-0003, ADR-0004).
 *
 * - Renders one selectable row per notification on `selection.js`, with type badge, unread mark, source and time chips,
 *   and row actions (Open, Mark Read, Discard), plus bulk Mark Read and Discard, Discard All, empty state, and summary line.
 * - Emits bubbling `inbox:action` and `inbox:navigate` events so the package stays independent of app APIs and routers.
 * - Drives the top-bar unread count button whose badge and accessible name carry the unread count, capped at `99+`.
 * - Integrates with the T0290 `notices.js` store through `options.notices`, and builds all DOM nodes without `innerHTML`.
 */

import { createIcon } from './icon.js';
import { NOTIFICATIONS_UPDATED_EVENT, safeUrl } from './notices.js';
import { attachSelection } from './selection.js';

export const INBOX_ACTION_EVENT = 'inbox:action';
export const INBOX_NAVIGATE_EVENT = 'inbox:navigate';

const TYPE_BADGES = {
    warning: 'badge--warning',
    error: 'badge--danger',
    success: 'badge--success'
};

const DEFAULT_LABELS = {
    title: 'Notifications',
    loading: 'Loading notifications…',
    emptyTitle: 'No notifications',
    emptyText: 'You\'re all caught up. Announcements and messages for your account show here.',
    selectAll: 'Select all',
    selectedCount: (count) => `${count} selected`,
    bulkActions: 'Bulk actions',
    markRead: 'Mark Read',
    discard: 'Discard',
    clearSelection: 'Clear Selection',
    discardAll: 'Discard All',
    open: 'Open',
    unread: 'Unread',
    selectItem: (label) => `Select ${label}`,
    listLabel: 'Notifications',
    summary: (unread, total) => (total <= 0 ? '' : (unread > 0 ? `${unread} unread · ${total} total` : `${total} total`)),
    unreadButton: 'Notifications',
    unreadButtonCount: (count, display) => `Notifications, ${display} unread ${count === 1 ? 'notification' : 'notifications'}`
};

const DEFAULT_ICONS = {
    bell: 'bell',
    clock: 'clock'
};

/**
 * Capitalize the first character of a label.
 * @param {string} text raw label
 * @returns {string} capitalized label
 */
function capitalize(text) {
    return text ? text.charAt(0).toUpperCase() + text.slice(1) : '';
}

/**
 * Tell whether a notification is still live and unread.
 * Matches the unread predicate in `notices.js`.
 * @param {object|null|undefined} notification notification record
 * @returns {boolean} `true` when neither read nor deleted
 */
export function isUnread(notification) {
    return Boolean(
        notification
        && notification['read-time'] == null
        && !notification.readTime
        && !notification['deletion-time']
        && !notification.deletionTime
    );
}

/**
 * Map a notification type onto its `.badge` modifier class, empty for info or unknown types.
 * @param {string|undefined} type notification type (`error`, `warning`, `success`, `info`)
 * @returns {string} modifier class name, or empty string
 */
export function inboxTypeBadge(type) {
    return TYPE_BADGES[type] ?? '';
}

/**
 * Format an unread count for display inside a compact badge, capped at `99+`.
 * @param {number} count unread count
 * @returns {string} `''` when zero or invalid, `'1'`..`'99'`, or `'99+'`
 */
export function formatUnreadCount(count) {
    const n = Number(count);
    if (!Number.isFinite(n) || n <= 0) {
        return '';
    }
    const whole = Math.floor(n);
    if (whole <= 0) {
        return '';
    }
    return whole > 99 ? '99+' : String(whole);
}

/**
 * Format the accessible name and title of the top-bar Notifications button, capped at `99+`.
 * @param {number} count unread count
 * @param {Partial<typeof DEFAULT_LABELS>} [labels] optional localized labels
 * @returns {string} accessible button label
 */
export function formatUnreadLabel(count, labels = {}) {
    const merged = { ...DEFAULT_LABELS, ...labels };
    const display = formatUnreadCount(count);
    if (!display) {
        return merged.unreadButton;
    }
    const whole = Math.floor(Number(count));
    if (typeof merged.unreadButtonCount === 'function') {
        return String(merged.unreadButtonCount(whole, display));
    }
    return String(merged.unreadButtonCount).replaceAll('{{count}}', display);
}

/**
 * Format the inbox header summary line for unread and total counts.
 * @param {number} unread unread notification count
 * @param {number} total total notification count
 * @param {Partial<typeof DEFAULT_LABELS>} [labels] optional localized labels
 * @returns {string} summary line, or `''` when total is zero
 */
export function formatInboxSummary(unread, total, labels = {}) {
    const merged = { ...DEFAULT_LABELS, ...labels };
    const safeTotal = Number.isFinite(total) && total > 0 ? Math.floor(total) : 0;
    const safeUnread = Number.isFinite(unread) && unread > 0 ? Math.floor(unread) : 0;
    if (typeof merged.summary === 'function') {
        return String(merged.summary(safeUnread, safeTotal));
    }
    return safeTotal === 0 ? '' : String(merged.summary)
        .replaceAll('{{unread}}', String(safeUnread))
        .replaceAll('{{total}}', String(safeTotal));
}

/**
 * Parse a raw notification timestamp into a valid `Date`, or `null`.
 * @param {string|number|Date|null|undefined} raw raw timestamp
 * @returns {Date|null} parsed date or `null`
 */
function parseTime(raw) {
    if (raw === null || raw === undefined || raw === '') {
        return null;
    }
    const date = raw instanceof Date ? raw : new Date(raw);
    return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Default absolute timestamp formatter for the time chip tooltip.
 * @param {string|number|Date} raw raw timestamp
 * @returns {string} formatted timestamp
 */
function defaultFormatTime(raw) {
    const date = parseTime(raw);
    if (!date) {
        return String(raw ?? '');
    }
    try {
        return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
    }
    catch {
        return date.toISOString();
    }
}

/**
 * Default relative timestamp formatter for the time chip text.
 * @param {string|number|Date} raw raw timestamp
 * @param {number} nowMs reference time in epoch milliseconds
 * @returns {string} relative timestamp label
 */
function defaultFormatRelativeTime(raw, nowMs) {
    const date = parseTime(raw);
    if (!date) {
        return String(raw ?? '');
    }
    const diffSeconds = Math.round((date.getTime() - nowMs) / 1000);
    const abs = Math.abs(diffSeconds);
    const units = [
        ['year', 31_536_000],
        ['month', 2_592_000],
        ['day', 86_400],
        ['hour', 3_600],
        ['minute', 60]
    ];
    try {
        const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
        for (const [unit, seconds] of units) {
            if (abs >= seconds) {
                return rtf.format(Math.round(diffSeconds / seconds), unit);
            }
        }
        return rtf.format(0, 'second');
    }
    catch {
        return date.toISOString();
    }
}

/**
 * Format a short accessible item label from a notification's title, message, or ID.
 * @param {object} note notification object
 * @returns {string} item label
 */
function itemLabelOf(note) {
    const text = String(note?.title || note?.message || note?.note || '').trim();
    return text || `notification ${String(note?.id ?? '')}`.trim();
}

/**
 * Build a heading element at a clamped level (`h1` through `h6`).
 * @param {Document} doc owning document
 * @param {number|string} level heading level
 * @returns {HTMLHeadingElement} heading element
 */
function createHeading(doc, level) {
    const numeric = typeof level === 'number' ? level : Number(String(level).replace(/^h/i, ''));
    const clamped = Number.isInteger(numeric) ? Math.min(6, Math.max(1, numeric)) : 2;
    return doc.createElement(`h${clamped}`);
}

/**
 * Create a sprite icon safely; falls back to `null` if the sprite URL is not configured or glyph is omitted.
 * @param {Document} doc owning document
 * @param {string|null} glyph glyph name
 * @param {object} [iconOptions] `createIcon` options
 * @returns {SVGSVGElement|null} icon element or `null`
 */
function tryCreateIcon(doc, glyph, iconOptions) {
    if (!glyph) {
        return null;
    }
    try {
        return createIcon(doc, glyph, iconOptions);
    }
    catch {
        return null;
    }
}

/**
 * Build the default `.inbox` DOM skeleton inside `root` when it has not been pre-authored.
 * @param {HTMLElement} root container element
 * @param {object} config normalized configuration
 */
function buildSkeleton(root, config) {
    const { doc, labels, icons, headingLevel, showHeader } = config;
    const nodes = [];

    if (showHeader) {
        const header = doc.createElement('header');
        header.className = 'view-header';
        const title = createHeading(doc, headingLevel);
        title.className = 'view-header__title';
        title.textContent = labels.title;
        const summary = doc.createElement('p');
        summary.className = 'view-header__text';
        summary.setAttribute('role', 'status');
        summary.setAttribute('data-inbox-summary', '');
        summary.hidden = true;
        header.append(title, summary);
        nodes.push(header);
    }
    else {
        const summary = doc.createElement('p');
        summary.className = 'view-header__text';
        summary.setAttribute('role', 'status');
        summary.setAttribute('data-inbox-summary', '');
        summary.hidden = true;
        nodes.push(summary);
    }

    const loading = doc.createElement('p');
    loading.className = 'loading__status inbox__loading';
    loading.setAttribute('role', 'status');
    loading.setAttribute('aria-live', 'polite');
    loading.setAttribute('data-inbox-loading', '');
    loading.textContent = labels.loading;
    loading.hidden = true;
    nodes.push(loading);

    const empty = doc.createElement('div');
    empty.className = 'empty-state inbox__empty';
    empty.setAttribute('data-inbox-empty', '');
    empty.hidden = true;
    const bell = tryCreateIcon(doc, icons.bell, { size: 'lg' });
    if (bell) {
        empty.append(bell);
    }
    const emptyTitle = createHeading(doc, showHeader ? headingLevel + 1 : headingLevel);
    emptyTitle.className = 'empty-state__title';
    emptyTitle.textContent = labels.emptyTitle;
    const emptyText = doc.createElement('p');
    emptyText.className = 'empty-state__text';
    emptyText.textContent = labels.emptyText;
    empty.append(emptyTitle, emptyText);
    nodes.push(empty);

    const fieldset = doc.createElement('fieldset');
    fieldset.className = 'selection inbox__selection';
    fieldset.setAttribute('data-selection-root', '');
    fieldset.setAttribute('data-inbox-selection', '');
    fieldset.tabIndex = -1;
    fieldset.hidden = true;

    const legend = doc.createElement('legend');
    legend.className = 'visually-hidden';
    legend.textContent = labels.listLabel;

    const selectAllLabel = doc.createElement('label');
    selectAllLabel.className = 'selection__row';
    const selectAllInput = doc.createElement('input');
    selectAllInput.className = 'selection__control';
    selectAllInput.type = 'checkbox';
    selectAllInput.setAttribute('data-selection-all', '');
    selectAllLabel.append(selectAllInput, doc.createTextNode(` ${labels.selectAll}`));

    const list = doc.createElement('ul');
    list.className = 'list row__list inbox__list';
    list.setAttribute('role', 'list');
    list.setAttribute('aria-label', labels.listLabel);
    list.setAttribute('data-inbox-list', '');

    const count = doc.createElement('p');
    count.className = 'selection__count inbox__count';
    count.setAttribute('data-selection-count', '');
    count.setAttribute('role', 'status');
    count.setAttribute('aria-live', 'polite');
    count.setAttribute('aria-atomic', 'true');
    count.textContent = typeof labels.selectedCount === 'function' ? labels.selectedCount(0) : '0 selected';

    const bar = doc.createElement('div');
    bar.className = 'selection__bar';
    bar.setAttribute('data-selection-bar', '');
    bar.setAttribute('role', 'group');
    bar.setAttribute('aria-label', labels.bulkActions);
    bar.hidden = true;

    const bulkRead = doc.createElement('button');
    bulkRead.className = 'button button--secondary';
    bulkRead.type = 'button';
    bulkRead.setAttribute('data-selection-action', 'mark-read');
    bulkRead.textContent = labels.markRead;

    const bulkDiscard = doc.createElement('button');
    bulkDiscard.className = 'button button--danger';
    bulkDiscard.type = 'button';
    bulkDiscard.setAttribute('data-selection-action', 'discard');
    bulkDiscard.textContent = labels.discard;

    const bulkClear = doc.createElement('button');
    bulkClear.className = 'button button--quiet';
    bulkClear.type = 'button';
    bulkClear.setAttribute('data-selection-clear', '');
    bulkClear.textContent = labels.clearSelection;

    bar.append(bulkRead, bulkDiscard, bulkClear);
    fieldset.append(legend, selectAllLabel, list, count, bar);
    nodes.push(fieldset);

    const footer = doc.createElement('div');
    footer.className = 'inbox__footer';
    const discardAll = doc.createElement('button');
    discardAll.className = 'button button--secondary button--danger';
    discardAll.type = 'button';
    discardAll.setAttribute('data-inbox-discard-all', '');
    discardAll.disabled = true;
    discardAll.textContent = labels.discardAll;
    footer.append(discardAll);
    nodes.push(footer);

    root.replaceChildren(...nodes);
}

/**
 * Attach the notifications inbox pattern to a `.inbox` container.
 * Enhances pre-authored `data-inbox-*` markup or populates the standard skeleton when empty.
 * @param {HTMLElement} root `.inbox` container element
 * @param {object} [options] behavior and rendering options
 * @param {object[]} [options.notifications] initial inbox notifications
 * @param {object|null} [options.notices] optional T0290 `notices.js` controller to subscribe to
 * @param {boolean} [options.loading] start in loading state, `false` by default
 * @param {boolean} [options.showHeader] render `.view-header` when building the skeleton, `true` by default
 * @param {number|string} [options.headingLevel] heading level for built headers, `2` by default
 * @param {(detail: {action: string, ids: Array<string|number>, notifications: object[], scope: 'row'|'bulk'|'all'}, event: CustomEvent) => void} [options.onAction]
 *   optional callback invoked alongside the bubbling `inbox:action` event
 * @param {(href: string, context: {id: string|number, notification: object}) => void} [options.onNavigate]
 *   optional callback for unmodified clicks on same-origin row action links
 * @param {(rawTime: string|number|Date) => string} [options.formatTime] absolute time formatter for the time chip title
 * @param {(rawTime: string|number|Date) => string} [options.formatRelativeTime] relative time formatter for the time chip text
 * @param {() => number} [options.now] clock in milliseconds, `Date.now` by default
 * @param {Partial<typeof DEFAULT_LABELS>} [options.labels] localized UI strings
 * @param {Partial<typeof DEFAULT_ICONS>} [options.icons] sprite glyph names (`null` omits an icon)
 * @returns {object} the inbox controller
 */
export function attachInbox(root, options = {}) {
    const doc = root.ownerDocument;
    const EventCtor = doc.defaultView?.CustomEvent ?? globalThis.CustomEvent;
    const labels = { ...DEFAULT_LABELS, ...(options.labels ?? {}) };
    const icons = { ...DEFAULT_ICONS, ...(options.icons ?? {}) };
    const now = typeof options.now === 'function' ? options.now : (() => Date.now());
    const formatTime = typeof options.formatTime === 'function' ? options.formatTime : defaultFormatTime;
    const formatRelativeTime = typeof options.formatRelativeTime === 'function'
        ? options.formatRelativeTime
        : ((raw) => defaultFormatRelativeTime(raw, now()));
    const onAction = typeof options.onAction === 'function' ? options.onAction : null;
    const onNavigate = typeof options.onNavigate === 'function' ? options.onNavigate : null;
    const notices = options.notices ?? null;
    const headingLevel = options.headingLevel ?? 2;
    const showHeader = options.showHeader !== false;

    root.setAttribute('data-inbox', '');
    if (!root.querySelector('[data-inbox-selection]')) {
        buildSkeleton(root, { doc, labels, icons, headingLevel, showHeader });
    }

    const summaryEl = root.querySelector('[data-inbox-summary]');
    const loadingEl = root.querySelector('[data-inbox-loading]');
    const emptyEl = root.querySelector('[data-inbox-empty]');
    const selectionEl = root.querySelector('[data-inbox-selection]');
    const listEl = root.querySelector('[data-inbox-list]');
    const discardAllEl = root.querySelector('[data-inbox-discard-all]');

    const selection = attachSelection(selectionEl, {
        formatCount: typeof labels.selectedCount === 'function'
            ? labels.selectedCount
            : ((count) => String(labels.selectedCount).replaceAll('{{count}}', String(count)))
    });

    let notifications = [];
    const byKey = new Map();
    let isLoading = Boolean(options.loading);
    let destroyed = false;

    /**
     * Dispatch a bubbling `inbox:action` event and invoke `options.onAction` when provided.
     * @param {'mark-read'|'discard'|'discard-all'} action action name
     * @param {object[]} targets matched notification objects
     * @param {'row'|'bulk'|'all'} scope origin scope
     */
    function emitAction(action, targets, scope) {
        if (destroyed) {
            return;
        }
        const detail = {
            action,
            ids: targets.map((entry) => entry.id),
            notifications: targets.slice(),
            scope
        };
        const customEvent = new EventCtor(INBOX_ACTION_EVENT, { bubbles: true, detail });
        root.dispatchEvent(customEvent);
        onAction?.(detail, customEvent);
    }

    /**
     * Build one selectable notification row using DOM APIs only so every field is safely escaped.
     * @param {object} note notification object
     * @returns {HTMLLIElement} the row element
     */
    function buildRow(note) {
        const key = String(note.id ?? '');
        const type = String(note.type || 'info');
        const unread = isUnread(note);
        const titleText = note.title ? String(note.title) : '';
        const messageText = String(note.message ?? note.note ?? '');
        const sourceText = note.source ? String(note.source) : '';
        const rawTime = note['creation-time'] ?? note.creationTime ?? note.time;
        const actionUrl = safeUrl(note['action-url'] ?? note.actionUrl);
        const actionLabel = String(note['action-label'] ?? note.actionLabel ?? labels.open);
        const itemLabel = itemLabelOf(note);

        const li = doc.createElement('li');
        li.className = unread ? 'row inbox__item inbox__item--unread' : 'row inbox__item';
        li.setAttribute('data-inbox-item', key);
        if (unread) {
            li.setAttribute('data-inbox-unread', 'true');
        }

        const selectWrap = doc.createElement('label');
        selectWrap.className = 'inbox__select';
        const checkbox = doc.createElement('input');
        checkbox.className = 'selection__control';
        checkbox.type = 'checkbox';
        checkbox.value = key;
        checkbox.setAttribute('data-selection-item', '');
        const selectText = doc.createElement('span');
        selectText.className = 'visually-hidden';
        selectText.textContent = typeof labels.selectItem === 'function'
            ? labels.selectItem(itemLabel)
            : String(labels.selectItem).replaceAll('{{label}}', itemLabel);
        selectWrap.append(checkbox, selectText);

        const main = doc.createElement('span');
        main.className = 'row__main inbox__main';

        const heading = doc.createElement('span');
        heading.className = 'inbox__heading';
        if (titleText) {
            const titleEl = doc.createElement('span');
            titleEl.className = 'inbox__title';
            titleEl.textContent = titleText;
            heading.append(titleEl);
        }

        const typeBadge = doc.createElement('span');
        const badgeVariant = inboxTypeBadge(type);
        typeBadge.className = badgeVariant ? `badge ${badgeVariant}` : 'badge';
        typeBadge.textContent = capitalize(type);
        heading.append(typeBadge);

        if (unread) {
            const unreadBadge = doc.createElement('span');
            unreadBadge.className = 'badge inbox__unread';
            unreadBadge.setAttribute('data-inbox-unread-badge', '');
            unreadBadge.textContent = labels.unread;
            heading.append(unreadBadge);
        }
        main.append(heading);

        const message = doc.createElement('p');
        message.className = 'inbox__message';
        message.textContent = messageText;
        main.append(message);

        if (sourceText || (rawTime !== null && rawTime !== undefined && rawTime !== '')) {
            const meta = doc.createElement('span');
            meta.className = 'inbox__meta';
            if (sourceText) {
                const sourceChip = doc.createElement('span');
                sourceChip.className = 'chip';
                sourceChip.setAttribute('data-inbox-source', '');
                sourceChip.textContent = sourceText;
                meta.append(sourceChip);
            }
            if (rawTime !== null && rawTime !== undefined && rawTime !== '') {
                const timeChip = doc.createElement('span');
                timeChip.className = 'chip';
                timeChip.setAttribute('title', formatTime(rawTime));
                const clock = tryCreateIcon(doc, icons.clock);
                if (clock) {
                    timeChip.append(clock);
                }
                const timeEl = doc.createElement('time');
                const parsed = parseTime(rawTime);
                timeEl.setAttribute('datetime', parsed ? parsed.toISOString().replace('.000Z', 'Z') : String(rawTime));
                timeEl.textContent = formatRelativeTime(rawTime);
                timeChip.append(timeEl);
                meta.append(timeChip);
            }
            main.append(meta);
        }

        const actions = doc.createElement('span');
        actions.className = 'row__actions inbox__actions';

        if (actionUrl) {
            const openLink = doc.createElement('a');
            openLink.className = 'button button--secondary button--small';
            openLink.setAttribute('href', actionUrl);
            openLink.setAttribute('data-inbox-action', 'open');
            openLink.setAttribute('aria-label', `${actionLabel}: ${itemLabel}`);
            openLink.textContent = actionLabel;
            actions.append(openLink);
        }
        if (unread) {
            const readBtn = doc.createElement('button');
            readBtn.className = 'button button--secondary button--small';
            readBtn.type = 'button';
            readBtn.setAttribute('data-inbox-action', 'mark-read');
            readBtn.setAttribute('aria-label', `${labels.markRead}: ${itemLabel}`);
            readBtn.textContent = labels.markRead;
            actions.append(readBtn);
        }
        const discardBtn = doc.createElement('button');
        discardBtn.className = 'button button--secondary button--danger button--small';
        discardBtn.type = 'button';
        discardBtn.setAttribute('data-inbox-action', 'discard');
        discardBtn.setAttribute('aria-label', `${labels.discard}: ${itemLabel}`);
        discardBtn.textContent = labels.discard;
        actions.append(discardBtn);

        li.append(selectWrap, main, actions);
        return li;
    }

    /**
     * Re-render the loading, empty, summary, list, and footer states from current data.
     */
    function render() {
        if (destroyed) {
            return;
        }
        const total = notifications.length;
        const unread = notifications.filter(isUnread).length;

        if (loadingEl) {
            loadingEl.hidden = !isLoading;
        }
        if (isLoading) {
            if (emptyEl) {
                emptyEl.hidden = true;
            }
            selectionEl.hidden = true;
            if (discardAllEl) {
                discardAllEl.disabled = true;
            }
            if (summaryEl) {
                summaryEl.hidden = true;
                summaryEl.textContent = '';
            }
            return;
        }

        if (emptyEl) {
            emptyEl.hidden = total > 0;
        }
        selectionEl.hidden = total === 0;
        if (discardAllEl) {
            discardAllEl.disabled = total === 0;
        }
        if (summaryEl) {
            const text = formatInboxSummary(unread, total, labels);
            summaryEl.textContent = text;
            summaryEl.hidden = total === 0 || text === '';
        }

        byKey.clear();
        const rows = [];
        for (const note of notifications) {
            if (!note || typeof note !== 'object') {
                continue;
            }
            byKey.set(String(note.id ?? ''), note);
            rows.push(buildRow(note));
        }
        listEl.replaceChildren(...rows);
        selection.refresh();
    }

    /**
     * Replace the rendered notification list and leave loading state.
     * @param {object[]} items notification objects
     */
    function setNotifications(items) {
        if (destroyed) {
            return;
        }
        isLoading = false;
        notifications = Array.isArray(items) ? items.slice() : [];
        render();
    }

    /**
     * Toggle the inbox loading status visibility.
     * @param {boolean} loading whether notifications are currently loading
     */
    function setLoading(loading) {
        if (destroyed) {
            return;
        }
        isLoading = Boolean(loading);
        render();
    }

    /**
     * Resolve selected checkbox values back to original notification IDs.
     * @returns {Array<string|number>} selected notification IDs
     */
    function getSelectedIds() {
        return selection.selectedValues
            .map((key) => byKey.get(key))
            .filter(Boolean)
            .map((entry) => entry.id);
    }

    /**
     * Handle bulk action events emitted by `selection.js`.
     * @param {CustomEvent} event `selection:action` event
     */
    function onSelectionAction(event) {
        if (destroyed) {
            return;
        }
        const action = event.detail?.action;
        if (action !== 'mark-read' && action !== 'discard') {
            return;
        }
        event.stopPropagation();
        const keys = Array.isArray(event.detail?.values) ? event.detail.values : [];
        let targets = keys.map((key) => byKey.get(String(key))).filter(Boolean);
        if (action === 'mark-read') {
            targets = targets.filter(isUnread);
        }
        if (targets.length === 0) {
            return;
        }
        emitAction(action, targets, 'bulk');
    }

    /**
     * Handle delegated row action button and Open link clicks inside the list.
     * @param {MouseEvent} event click event
     */
    function onListClick(event) {
        if (destroyed || event.defaultPrevented) {
            return;
        }
        const rawTarget = event.target;
        const element = rawTarget && rawTarget.nodeType === 1 ? rawTarget : rawTarget?.parentElement;
        const control = element?.closest?.('[data-inbox-action]');
        if (!control || !listEl.contains(control)) {
            return;
        }
        const row = control.closest('[data-inbox-item]');
        const note = row ? byKey.get(row.dataset.inboxItem) : null;
        if (!note) {
            return;
        }
        const action = control.dataset.inboxAction;
        if (action === 'open') {
            const href = control.getAttribute('href');
            const modified = Boolean(event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || (typeof event.button === 'number' && event.button !== 0));
            if (href && href.startsWith('/') && !modified) {
                const navEvent = new EventCtor(INBOX_NAVIGATE_EVENT, {
                    bubbles: true,
                    cancelable: true,
                    detail: { href, id: note.id, notification: note }
                });
                const allowed = root.dispatchEvent(navEvent);
                if (!allowed || onNavigate) {
                    event.preventDefault();
                }
                onNavigate?.(href, { id: note.id, notification: note });
            }
            return;
        }
        if (action === 'mark-read' || action === 'discard') {
            event.preventDefault();
            if (action === 'mark-read' && !isUnread(note)) {
                return;
            }
            emitAction(action, [note], 'row');
        }
    }

    /**
     * Handle Discard All clicks.
     */
    function onDiscardAllClick() {
        if (destroyed || notifications.length === 0) {
            return;
        }
        emitAction('discard-all', notifications, 'all');
    }

    /**
     * Synchronize inbox items when the connected T0290 notices store updates.
     * @param {CustomEvent} event `notifications-updated` event
     */
    function onNoticesUpdated(event) {
        const items = event?.detail?.notifications ?? notices?.getInboxNotifications?.() ?? [];
        setNotifications(items);
    }

    selectionEl.addEventListener('selection:action', onSelectionAction);
    listEl.addEventListener('click', onListClick);
    discardAllEl?.addEventListener('click', onDiscardAllClick);
    notices?.addEventListener?.(NOTIFICATIONS_UPDATED_EVENT, onNoticesUpdated);

    if (Array.isArray(options.notifications)) {
        setNotifications(options.notifications);
    }
    else if (notices && !isLoading) {
        setNotifications(notices.getInboxNotifications?.() ?? []);
    }
    else {
        render();
    }

    return {
        element: root,
        setNotifications,
        getNotifications: () => notifications.slice(),
        setLoading,
        getSelectedIds,
        clearSelection: () => selection.clear(),
        refresh: render,
        destroy() {
            if (destroyed) {
                return;
            }
            destroyed = true;
            selectionEl.removeEventListener('selection:action', onSelectionAction);
            listEl.removeEventListener('click', onListClick);
            discardAllEl?.removeEventListener('click', onDiscardAllClick);
            notices?.removeEventListener?.(NOTIFICATIONS_UPDATED_EVENT, onNoticesUpdated);
            selection.destroy();
        }
    };
}

/**
 * Create a `.inbox` element and attach the inbox controller to it.
 * @param {Document} doc document that creates the elements
 * @param {object} [options] options accepted by `attachInbox`
 * @returns {ReturnType<typeof attachInbox>} the inbox controller, with `element`
 */
export function createInbox(doc, options = {}) {
    const root = doc.createElement('div');
    root.className = 'inbox';
    root.setAttribute('data-inbox', '');
    return attachInbox(root, options);
}

/**
 * Attach unread count behavior to a top-bar `.app__notifications-button` (`[data-inbox-button]`).
 * Updates the visual count badge (capped at `99+`) and the button's accessible name and title.
 * @param {HTMLElement} button link or button element in `.app__top-actions`
 * @param {object} [options] behavior options
 * @param {number} [options.count] initial unread count
 * @param {object|null} [options.notices] optional T0290 `notices.js` controller providing the count
 * @param {string|null} [options.route] current route compared with the button's `href` for `aria-current="page"`
 * @param {Partial<typeof DEFAULT_LABELS>} [options.labels] localized button labels
 * @returns {{element: HTMLElement, setCount: (count: number) => void, getCount: () => number, setRoute: (route: string|null) => void, destroy: () => void}}
 *   the unread button controller
 */
export function attachUnreadButton(button, options = {}) {
    const doc = button.ownerDocument;
    const labels = { ...DEFAULT_LABELS, ...(options.labels ?? {}) };
    const notices = options.notices ?? null;

    button.setAttribute('data-inbox-button', '');
    let countEl = button.querySelector('[data-inbox-count]');
    if (!countEl) {
        countEl = doc.createElement('span');
        countEl.className = 'badge badge--count app__notifications-count';
        countEl.setAttribute('data-inbox-count', '');
        countEl.setAttribute('aria-hidden', 'true');
        countEl.hidden = true;
        button.append(countEl);
    }

    let currentCount = 0;
    let destroyed = false;

    /**
     * Update the unread count badge, visibility, `aria-label`, and `title`.
     * @param {number} count unread notification count
     */
    function setCount(count) {
        if (destroyed) {
            return;
        }
        const n = Number(count);
        currentCount = Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
        const display = formatUnreadCount(currentCount);
        const label = formatUnreadLabel(currentCount, labels);
        button.setAttribute('aria-label', label);
        button.setAttribute('title', label);
        countEl.textContent = display;
        countEl.hidden = display === '';
    }

    /**
     * Mark the button with `aria-current="page"` when its `href` matches `route`.
     * @param {string|null} route active route path
     */
    function setRoute(route) {
        if (destroyed) {
            return;
        }
        const path = String(route ?? '').split(/[?#]/)[0];
        const href = (button.getAttribute('href') || '').split(/[?#]/)[0];
        if (path && href && path === href) {
            button.setAttribute('aria-current', 'page');
        }
        else {
            button.removeAttribute('aria-current');
        }
    }

    /**
     * Sync unread count when the connected T0290 notices store updates.
     * @param {CustomEvent} event `notifications-updated` event
     */
    function onNoticesUpdated(event) {
        const next = event?.detail?.unreadCount ?? notices?.getUnreadCount?.() ?? 0;
        setCount(next);
    }

    notices?.addEventListener?.(NOTIFICATIONS_UPDATED_EVENT, onNoticesUpdated);

    if (options.count !== undefined) {
        setCount(options.count);
    }
    else if (notices) {
        setCount(notices.getUnreadCount?.() ?? 0);
    }
    else {
        setCount(0);
    }
    if (options.route !== undefined) {
        setRoute(options.route);
    }

    return {
        element: button,
        setCount,
        getCount: () => currentCount,
        setRoute,
        destroy() {
            if (destroyed) {
                return;
            }
            destroyed = true;
            notices?.removeEventListener?.(NOTIFICATIONS_UPDATED_EVENT, onNoticesUpdated);
        }
    };
}

/**
 * Create a top-bar unread count button (`<a>` when `href` is a safe URL, otherwise `<button>`) and attach its controller.
 * @param {Document} doc document that creates the elements
 * @param {object} [options] options accepted by `attachUnreadButton`, plus `href` and `icon`
 * @param {string} [options.href] optional destination URL (same-origin path or `http(s)` URL)
 * @param {string|null} [options.icon] sprite glyph name, `'bell'` by default
 * @returns {ReturnType<typeof attachUnreadButton>} the unread button controller, with `element`
 */
export function createUnreadButton(doc, options = {}) {
    const safeHref = safeUrl(options.href);
    const el = doc.createElement(safeHref ? 'a' : 'button');
    el.className = 'icon-button app__notifications-button';
    if (safeHref) {
        el.setAttribute('href', safeHref);
    }
    else {
        el.type = 'button';
    }
    el.setAttribute('data-inbox-button', '');
    const glyph = options.icon === undefined ? DEFAULT_ICONS.bell : options.icon;
    const icon = tryCreateIcon(doc, glyph);
    if (icon) {
        el.append(icon);
    }
    const badge = doc.createElement('span');
    badge.className = 'badge badge--count app__notifications-count';
    badge.setAttribute('data-inbox-count', '');
    badge.setAttribute('aria-hidden', 'true');
    badge.hidden = true;
    el.append(badge);
    return attachUnreadButton(el, options);
}
