/**
 * Shared admin System events screen (ADR-0003).
 *
 * - Displays persistent audit records as spaced `.entry-list` cards, newest first, loaded through an
 *   app-supplied data adapter (`adapter.fetchEvents` and optional `adapter.fetchUsers`) via `data-loader.js`.
 * - Sends event type, severity, row limit, and offset to the adapter; filters loaded rows client-side on
 *   Search, persisting active filters and non-default row limit in the URL hash via `table-state.js`.
 * - Toggles pretty-printed JSON metadata inside each entry card with `aria-expanded` and `aria-controls`,
 *   mounts in the `admin-console.js` frame via `createAdminSystemEventsScreen`, and uses
 *   `data-admin-system-events-*` hooks and ARIA states only.
 */

import { attachDataLoader } from './data-loader.js';
import { createDomBuilders, severityOf } from './dom-builders.js';
import { createIcon } from './icon.js';
import { attachTableState, createPager } from './table-state.js';

export const DEFAULT_EVENT_TYPES = ['broadcast-published', 'broadcast-retracted'];
export const DEFAULT_EVENT_SEVERITIES = [
    ['', 'All severities'],
    ['info', 'Info'],
    ['warning', 'Warning'],
    ['error', 'Error']
];
export const DEFAULT_EVENT_LIMITS = [25, 50, 100, 200];
export const DEFAULT_EVENT_LIMIT = 50;
export const DEFAULT_DEBOUNCE_MS = 300;

const EVENT_TYPE_PATTERN = /^[\w.:-]{1,100}$/;

const DEFAULT_LABELS = {
    what: 'System events',
    toolbarLabel: 'Filter system events',
    searchLabel: 'Search',
    searchPlaceholder: 'Type, description, or actor',
    typeLabel: 'Event type',
    allTypes: 'All event types',
    severityLabel: 'Severity',
    limitLabel: 'Rows',
    listLabel: 'System audit events, newest first',
    pagerLabel: 'System event pages',
    previous: 'Previous',
    next: 'Next',
    noRows: 'No rows',
    emptyNone: 'No system events have been recorded.',
    emptyFiltered: 'No system events match these filters.',
    clearFilters: 'Clear filters',
    showDetails: 'Show details of',
    hideDetails: 'Hide details of',
    noMetadata: 'No metadata',
    systemActor: 'system',
    empty: '—',
    retry: 'Retry'
};

const pad = (number) => String(number).padStart(2, '0');
let instanceCounter = 0;

/**
 * Tell whether a value is a DOM `Node` across realms and injected documents.
 * @param {unknown} value candidate value
 * @returns {boolean} `true` when `value` is a DOM node
 */
function isNode(value) {
    return typeof value === 'object' && value !== null && typeof value.nodeType === 'number';
}

/**
 * Combine an internal loader signal with an optional external cancellation signal.
 * @param {AbortSignal|undefined} loaderSignal signal created by `data-loader.js`
 * @param {AbortSignal|undefined} externalSignal optional caller/frame signal
 * @returns {AbortSignal|undefined} combined signal
 */
function combineSignals(loaderSignal, externalSignal) {
    if (loaderSignal && externalSignal) {
        if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.any === 'function') {
            return AbortSignal.any([loaderSignal, externalSignal]);
        }
        return externalSignal.aborted ? externalSignal : loaderSignal;
    }
    return loaderSignal ?? externalSignal;
}

/**
 * Format event metadata for display inside an entry card.
 * @param {unknown} metadata stored metadata, usually a JSON string or plain object
 * @returns {string|null} pretty-printed JSON, raw trimmed text when not valid JSON, or `null` when empty
 */
export function formatMetadata(metadata) {
    let text = '';
    if (typeof metadata === 'string') {
        text = metadata.trim();
    }
    else if (metadata !== null && metadata !== undefined) {
        try {
            text = JSON.stringify(metadata);
        }
        catch {
            text = String(metadata).trim();
        }
    }
    if (!text || text === '{}' || text === 'null') {
        return null;
    }
    try {
        return JSON.stringify(JSON.parse(text), null, 2);
    }
    catch {
        return text;
    }
}

/**
 * Format an ISO-8601 timestamp or `Date` as local `YYYY-MM-DD HH:MM:SS`.
 * Missing values return `emptyText`; unparseable strings return verbatim.
 * @param {string|Date|number|null|undefined} value timestamp value
 * @param {string} [emptyText] fallback text when missing, `'—'` by default
 * @returns {string} formatted timestamp
 */
export function formatEventTime(value, emptyText = '—') {
    if (value === null || value === undefined || value === '') {
        return emptyText;
    }
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) {
        return String(value);
    }
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

/**
 * Normalize one raw system event record into a consistent shape while keeping `raw`.
 * @param {unknown} item raw event object
 * @returns {{id: string|number|null, eventType: string, severity: string, description: string, time: string|Date|number|null, actorUserId: string|number|null, actor: string|null, metadata: unknown, raw: unknown}}
 *   normalized system event
 */
function normalizeSystemEvent(item) {
    const source = item && typeof item === 'object' ? item : { description: item };
    const rawActor = source.actor;
    return {
        id: source.id ?? null,
        eventType: String(source['event-type'] ?? source.eventType ?? source.type ?? ''),
        severity: severityOf(source.severity ?? 'info'),
        description: String(source.description ?? source.message ?? ''),
        time: source['creation-time']
            ?? source.creationTime
            ?? source.timestamp
            ?? source.time
            ?? source['created-at']
            ?? source.createdAt
            ?? null,
        actorUserId: source['actor-user-id'] ?? source.actorUserId ?? null,
        actor: rawActor !== null && rawActor !== undefined && String(rawActor).trim() !== ''
            ? String(rawActor)
            : null,
        metadata: source.metadata ?? null,
        raw: source
    };
}

/**
 * Normalize plain arrays and envelope payloads (`system-events`, `events`, `elements`, `items`) into an array of normalized events.
 * @param {unknown} raw payload returned by `adapter.fetchEvents`
 * @returns {Array<ReturnType<typeof normalizeSystemEvent>>} normalized system events
 */
export function normalizeSystemEvents(raw) {
    if (Array.isArray(raw)) {
        return raw.map(normalizeSystemEvent);
    }
    if (raw && typeof raw === 'object') {
        const list = raw['system-events']
            ?? raw.systemEvents
            ?? raw.events
            ?? raw.elements
            ?? raw.items;
        if (Array.isArray(list)) {
            return list.map(normalizeSystemEvent);
        }
    }
    return [];
}

/**
 * Filter loaded system events client-side by case-insensitive text query.
 * @param {Array<object>} events normalized or raw events
 * @param {string} [query] search text
 * @param {{actorOf?: (event: object) => string, filterText?: (event: object) => string}} [options] optional extractors
 * @returns {Array<object>} matching events in their original order
 */
export function filterSystemEvents(events, query = '', options = {}) {
    const list = Array.isArray(events) ? events : [];
    const needle = String(query ?? '').trim().toLowerCase();
    if (!needle) {
        return [...list];
    }
    const actorOf = typeof options.actorOf === 'function' ? options.actorOf : (item) => item?.actor ?? '';
    const getText = typeof options.filterText === 'function'
        ? options.filterText
        : (item) => [
            item?.eventType ?? item?.['event-type'] ?? '',
            item?.description ?? item?.message ?? '',
            actorOf(item),
            item?.id !== null && item?.id !== undefined ? String(item.id) : ''
        ].join('\n');

    return list.filter((item) => String(getText(item) ?? '').toLowerCase().includes(needle));
}

/**
 * Normalize configured severity select options into `[value, label]` tuples.
 * @param {Array} severities raw severity options
 * @returns {Array<[string, string]>} normalized `[value, label]` tuples
 */
function normalizeSeverityOptions(severities) {
    const source = Array.isArray(severities) && severities.length > 0 ? severities : DEFAULT_EVENT_SEVERITIES;
    return source.map((item) => {
        if (Array.isArray(item)) {
            return [String(item[0] ?? ''), String(item[1] ?? item[0] ?? '')];
        }
        if (item && typeof item === 'object') {
            return [String(item.value ?? ''), String(item.label ?? item.value ?? '')];
        }
        const value = String(item ?? '');
        return [value, value];
    });
}

/**
 * Normalize a user directory payload (Map, array, or envelope) into a `Map<string, object>`.
 * @param {unknown} raw result from `adapter.fetchUsers`
 * @returns {Map<string, object>} user directory keyed by string ID
 */
function normalizeUsersMap(raw) {
    if (raw instanceof Map) {
        return raw;
    }
    const list = Array.isArray(raw)
        ? raw
        : (raw && typeof raw === 'object' ? (raw.users ?? raw.elements ?? raw.items ?? []) : []);
    const map = new Map();
    for (const item of list) {
        if (item && typeof item === 'object' && item.id !== null && item.id !== undefined) {
            map.set(String(item.id), item);
        }
    }
    return map;
}

/**
 * Build a labeled `.field` container wrapping one control.
 * @param {object} dom bound DOM builders
 * @param {string} id control ID paired with `<label for>`
 * @param {string} label visible label text
 * @param {HTMLElement} control input or select control
 * @returns {HTMLDivElement} built field wrapper
 */
function buildField(dom, id, label, control) {
    control.id = id;
    return dom.h('div', { class: 'field' },
        dom.h('label', { class: 'field__label', for: id }, label),
        control);
}

/**
 * Build a descriptive subject string for an event's details toggle accessible name.
 * @param {object} event normalized event
 * @param {number} index 0-based position in the rendered list
 * @returns {string} subject phrase such as `'event 101 broadcast-published'`
 */
function subjectOf(event, index) {
    const parts = ['event'];
    if (event.id !== null && event.id !== undefined && String(event.id) !== '') {
        parts.push(String(event.id));
    }
    else {
        parts.push(String(index + 1));
    }
    if (event.eventType) {
        parts.push(event.eventType);
    }
    return parts.join(' ');
}

/**
 * Restore focus to an enabled pager button if the currently focused pager button became disabled.
 * @param {Document} doc active document
 * @param {HTMLElement} pagerNav pager nav element
 * @param {string|null} focusedAction action key focused prior to pager update
 */
function restorePagerFocus(doc, pagerNav, focusedAction) {
    if (!focusedAction) {
        return;
    }
    const current = pagerNav.querySelector(`[data-table-state-action="${focusedAction}"]`);
    if (!current || !current.disabled) {
        return;
    }
    const fallbackAction = focusedAction === 'prev' ? 'next' : 'prev';
    const candidate = pagerNav.querySelector(`[data-table-state-action="${fallbackAction}"]`);
    if (candidate && !candidate.disabled && typeof candidate.focus === 'function') {
        candidate.focus();
        return;
    }
    if (doc.activeElement === current && typeof current.blur === 'function') {
        current.blur();
    }
}

/**
 * Build one `.entry-list__item` card for a normalized system event, with an expandable JSON details toggle.
 * @param {object} event normalized event
 * @param {number} index 0-based row index in the current render
 * @param {object} helpers builder context
 * @returns {HTMLLIElement} built event card
 */
function buildDefaultCard(event, index, helpers) {
    const { doc, dom, formatTime, actorOf, labels, extraChips, seed } = helpers;
    const metadata = formatMetadata(event.metadata);
    const subject = subjectOf(event, index);
    const detailId = `admin-system-events-details-${seed}-${index + 1}`;
    const datetime = event.time instanceof Date
        ? event.time.toISOString()
        : (event.time !== null && event.time !== undefined && event.time !== '' ? String(event.time) : null);

    const toggle = dom.h('button', {
        class: 'icon-button',
        type: 'button',
        'aria-expanded': 'false',
        'aria-label': `${labels.showDetails} ${subject}`,
        disabled: metadata === null,
        title: metadata === null ? labels.noMetadata : null,
        'data-admin-system-events-toggle': ''
    }, createIcon(doc, 'chevron-down'));

    const timeChip = dom.h('span', { class: 'chip', 'data-admin-system-events-time': '' },
        createIcon(doc, 'clock'),
        dom.h('time', { datetime }, formatTime(event.time, labels.empty)));

    const severityChip = dom.severityChip(event.severity);
    const typeChip = dom.h('span', { class: 'chip entry-list__code', 'data-admin-system-events-type': '' },
        event.eventType || labels.empty);
    const actorChip = dom.h('span', { class: 'chip', 'data-admin-system-events-actor': '' },
        createIcon(doc, 'user'),
        actorOf(event));
    const extras = typeof extraChips === 'function' ? extraChips(event, helpers) : null;

    const li = dom.h('li', {
        class: 'entry-list__item',
        'data-admin-system-events-item': '',
        'data-severity': event.severity,
        'data-event-id': event.id !== null && event.id !== undefined ? String(event.id) : null
    },
    dom.h('p', {
        class: 'entry-list__message',
        'data-admin-system-events-message': ''
    }, event.description),
    dom.h('div', { class: 'entry-list__meta', 'data-admin-system-events-meta': '' },
        timeChip,
        severityChip,
        typeChip,
        actorChip,
        extras,
        dom.h('span', { class: 'entry-list__action' }, toggle)));

    let detail = null;
    toggle.addEventListener('click', () => {
        if (metadata === null) {
            return;
        }
        if (detail) {
            detail.remove();
            detail = null;
            toggle.removeAttribute('aria-controls');
        }
        else {
            detail = dom.h('pre', {
                class: 'entry-list__details',
                id: detailId,
                'data-admin-system-events-details': ''
            }, metadata);
            li.append(detail);
            toggle.setAttribute('aria-controls', detailId);
        }
        toggle.setAttribute('aria-expanded', String(Boolean(detail)));
        toggle.setAttribute('aria-label', `${detail ? labels.hideDetails : labels.showDetails} ${subject}`);
    });

    return li;
}

/**
 * Attach the shared admin System events screen to a container element.
 * Sends event type, severity, limit, and offset to `options.adapter.fetchEvents`, filters loaded rows
 * client-side on search, persists filters in the URL hash (`table-state.js`), and renders `.entry-list`
 * cards with expandable JSON metadata using `dom-builders.js`.
 * @param {HTMLElement} root target container element
 * @param {object} options screen configuration
 * @param {{fetchEvents: (query: {eventType: string, severity: string, limit: number, offset: number, params: URLSearchParams, signal?: AbortSignal}) => Promise<unknown>, fetchUsers?: (context: {signal?: AbortSignal}) => Promise<unknown>}} options.adapter app data adapter
 * @param {string[]} [options.types] initial known event types, `DEFAULT_EVENT_TYPES` by default
 * @param {Array} [options.severities] severity select options, `DEFAULT_EVENT_SEVERITIES` by default
 * @param {number[]} [options.limits] allowed row limits, `[25, 50, 100, 200]` by default
 * @param {number} [options.defaultLimit] default row limit, `50` (or `limits[0]`) by default
 * @param {number} [options.debounce] search input debounce in ms, `300` by default
 * @param {boolean} [options.autoLoad] trigger initial load immediately, `true` by default
 * @param {(event: object, users: Map<string, object>|null) => string} [options.formatActor] custom actor formatter
 * @param {(value: unknown, emptyText?: string) => string} [options.formatTime] custom timestamp formatter
 * @param {(event: object) => string} [options.filterText] custom searchable text extractor
 * @param {(event: object, helpers: object) => unknown} [options.extraChips] append app-specific chips to each card
 * @param {(event: object, helpers: object) => HTMLElement} [options.renderCard] custom card renderer replacing default cards
 * @param {(error: unknown) => void} [options.onSignIn] callback wired to 401 Sign in actions
 * @param {(error: unknown) => boolean} [options.isUnauthorized] predicate classifying 401 errors
 * @param {Document} [options.document] injected document
 * @param {Window} [options.window] injected window for URL hash synchronization
 * @param {Location} [options.location] injected location override
 * @param {History} [options.history] injected history override
 * @param {object} [options.dom] pre-created `createDomBuilders` instance
 * @param {AbortSignal} [options.signal] external abort signal that disposes the screen
 * @param {object} [options.labels] label and message overrides
 * @returns {object} screen controller (`element`, `refresh`, `getEvents`, `getFilteredEvents`, `getState`, `resetFilters`, `tableState`, `dispose`, `destroy`)
 */
export function attachAdminSystemEvents(root, options = {}) {
    if (!isNode(root) || root.nodeType !== 1) {
        throw new TypeError('A container element is required for admin-system-events.');
    }
    const fetchEvents = options?.adapter?.fetchEvents;
    if (typeof fetchEvents !== 'function') {
        throw new TypeError('An adapter with a fetchEvents function is required for admin-system-events.');
    }
    const fetchUsers = typeof options?.adapter?.fetchUsers === 'function' ? options.adapter.fetchUsers : null;

    const doc = options.document ?? root.ownerDocument ?? globalThis.document;
    const view = options.window ?? doc?.defaultView ?? globalThis.window ?? null;
    const ownsDom = !options.dom;
    const dom = options.dom ?? createDomBuilders(doc);
    const labels = { ...DEFAULT_LABELS, ...options.labels };
    const formatTime = typeof options.formatTime === 'function' ? options.formatTime : formatEventTime;
    const limits = Array.isArray(options.limits) && options.limits.length > 0 ? options.limits : DEFAULT_EVENT_LIMITS;
    const defaultLimit = options.defaultLimit ?? (options.limits ? limits[0] : DEFAULT_EVENT_LIMIT);
    const severities = normalizeSeverityOptions(options.severities);
    const validSeverities = severities.map(([value]) => value);
    const debounce = options.debounce === undefined ? DEFAULT_DEBOUNCE_MS : Math.max(0, Number(options.debounce) || 0);
    const seed = (instanceCounter += 1);

    const knownTypes = [...new Set(
        (Array.isArray(options.types) ? options.types : DEFAULT_EVENT_TYPES)
            .map((type) => String(type ?? '').trim())
            .filter(Boolean)
    )];

    let destroyed = false;
    let offset = 0;
    let loadedKey = null;
    let events = null;
    let filteredEvents = [];
    let usersMap = null;
    let usersPromise = null;
    let tableState = null;

    root.setAttribute('data-admin-system-events', '');

    const searchInput = dom.h('input', {
        class: 'field__control',
        type: 'search',
        placeholder: labels.searchPlaceholder,
        'data-table-state-filter': 'q',
        'data-admin-system-events-filter': 'q'
    });
    const typeSelect = dom.h('select', {
        class: 'field__control',
        'data-table-state-filter': 'event-type',
        'data-admin-system-events-filter': 'event-type'
    });
    const severitySelect = dom.select(severities, '', {
        'data-table-state-filter': 'severity',
        'data-admin-system-events-filter': 'severity'
    });
    const limitSelect = dom.select(
        limits.map((limit) => [String(limit), String(limit)]),
        String(defaultLimit),
        {
            'data-table-state-size': '',
            'data-admin-system-events-limit': ''
        }
    );

    /**
     * Rebuild the Event type `<select>` options from `knownTypes`, preserving `selectedValue`.
     * @param {string} [selectedValue] option value to keep selected
     */
    function fillTypes(selectedValue = typeSelect.value) {
        if (selectedValue && !knownTypes.includes(selectedValue)) {
            knownTypes.push(selectedValue);
        }
        dom.setChildren(
            typeSelect,
            dom.h('option', { value: '' }, labels.allTypes),
            knownTypes.map((type) => dom.h('option', { value: type }, type))
        );
        typeSelect.value = selectedValue;
    }

    fillTypes('');

    const toolbar = dom.h('search', {
        class: 'toolbar',
        'aria-label': labels.toolbarLabel,
        'data-admin-system-events-toolbar': ''
    },
    buildField(dom, `admin-system-events-search-${seed}`, labels.searchLabel, searchInput),
    buildField(dom, `admin-system-events-type-${seed}`, labels.typeLabel, typeSelect),
    buildField(dom, `admin-system-events-severity-${seed}`, labels.severityLabel, severitySelect),
    buildField(dom, `admin-system-events-limit-${seed}`, labels.limitLabel, limitSelect));

    const body = dom.h('div', { class: 'loading', 'data-admin-system-events-body': '' });
    const pagerNav = createPager(doc, {
        dom,
        label: labels.pagerLabel,
        hidden: true,
        text: labels.noRows,
        actions: [
            { action: 'prev', label: labels.previous, disabled: true },
            { action: 'next', label: labels.next, disabled: true }
        ]
    });

    dom.setChildren(root, toolbar, body, pagerNav);

    /**
     * Compute the cache key representing the active server-side query parameters.
     * @param {object} [snapshot] table-state snapshot
     * @param {number} [currentOffset] offset to include
     * @returns {string} serialized server query key
     */
    function serverKey(snapshot = tableState.getState(), currentOffset = offset) {
        return JSON.stringify([
            snapshot.filters['event-type'] ?? '',
            snapshot.filters.severity ?? '',
            snapshot.size,
            currentOffset
        ]);
    }

    /**
     * Compute the key for server filters and limit alone (excluding offset).
     * @param {object} [snapshot] table-state snapshot
     * @returns {string} serialized server filter key
     */
    function serverFilterKey(snapshot = tableState.getState()) {
        return JSON.stringify([
            snapshot.filters['event-type'] ?? '',
            snapshot.filters.severity ?? '',
            snapshot.size
        ]);
    }

    /**
     * Resolve the display name of an event's actor.
     * @param {object} event normalized event
     * @returns {string} actor email, trimmed name, `User #{{id}}`, or `system`
     */
    function actorOf(event) {
        if (typeof options.formatActor === 'function') {
            return String(options.formatActor(event, usersMap));
        }
        if (event.actor !== null && event.actor !== undefined && event.actor !== '') {
            return event.actor;
        }
        const id = event.actorUserId;
        if (id === null || id === undefined || id === '') {
            return labels.systemActor;
        }
        const account = usersMap?.get(String(id));
        return account ? (account.email || account.name?.trim() || `User #${id}`) : `User #${id}`;
    }

    /**
     * Load the optional user directory once, degrading gracefully to `User #{{id}}` on failure.
     * @param {AbortSignal|undefined} signal cancellation signal
     * @returns {Promise<Map<string, object>|null>} cached user map or empty map on failure
     */
    async function loadUsers(signal) {
        if (!fetchUsers) {
            return null;
        }
        if (usersMap) {
            return usersMap;
        }
        if (!usersPromise) {
            usersPromise = (async () => {
                try {
                    const result = await fetchUsers({ signal });
                    usersMap = normalizeUsersMap(result);
                    return usersMap;
                }
                catch {
                    return new Map();
                }
                finally {
                    usersPromise = null;
                }
            })();
        }
        return usersPromise;
    }

    /**
     * Format the server pager status text for the current offset, loaded count, and filtered count.
     * @param {number} loadedCount rows returned by the adapter for this page
     * @param {number} shownCount rows remaining after client search
     * @returns {string} pager status text
     */
    function formatPagerText(loadedCount, shownCount) {
        if (loadedCount === 0) {
            return labels.noRows;
        }
        const range = `Rows ${offset + 1}–${offset + loadedCount}`;
        return shownCount < loadedCount ? `${range} · ${shownCount} matching` : range;
    }

    /**
     * Update the persistent server pager nav with the current offset and loaded count.
     * @param {boolean} hidden whether to hide the pager
     * @param {number} loadedCount loaded row count on this page
     * @param {number} shownCount displayed row count after client search
     */
    function syncPager(hidden, loadedCount, shownCount) {
        const limit = tableState.getState().size;
        tableState.updatePager({
            hidden,
            label: labels.pagerLabel,
            text: formatPagerText(loadedCount, shownCount),
            actions: [
                { action: 'prev', label: labels.previous, disabled: offset === 0 },
                { action: 'next', label: labels.next, disabled: loadedCount < limit }
            ]
        });
    }

    /**
     * Build the body content for the currently loaded events and update the persistent pager.
     * @returns {HTMLElement[]} nodes to place inside `body`
     */
    function buildView() {
        const focusedAction = pagerNav.contains(doc.activeElement)
            ? (doc.activeElement?.closest?.('[data-table-state-action]')?.getAttribute?.('data-table-state-action') ?? null)
            : null;

        const all = events ?? [];
        const current = tableState.getState();
        const q = current.filters.q ?? '';
        const eventType = current.filters['event-type'] ?? '';
        const severity = current.filters.severity ?? '';
        const matches = filterSystemEvents(all, q, { actorOf, filterText: options.filterText });
        filteredEvents = matches;

        const filtered = Boolean(q || eventType || severity || offset > 0);
        if (matches.length === 0) {
            if (offset > 0 && all.length === 0) {
                syncPager(false, 0, 0);
                restorePagerFocus(doc, pagerNav, focusedAction);
            }
            else {
                syncPager(true, 0, 0);
            }
            if (filtered) {
                const clearButton = dom.button(labels.clearFilters, () => {
                    tableState.resetFilters({ includeSize: true });
                    searchInput.focus();
                }, {
                    kind: 'quiet',
                    'data-admin-system-events-action': 'clear'
                });
                return [dom.emptyState(labels.emptyFiltered, clearButton, { 'data-admin-system-events-empty': 'filtered' })];
            }
            return [dom.emptyState(labels.emptyNone, null, { 'data-admin-system-events-empty': 'none' })];
        }

        syncPager(false, all.length, matches.length);
        restorePagerFocus(doc, pagerNav, focusedAction);

        const helpers = {
            doc,
            dom,
            formatTime,
            formatMetadata,
            actorOf,
            labels,
            extraChips: options.extraChips,
            context: options.context,
            seed
        };
        const renderCard = typeof options.renderCard === 'function'
            ? (event, index) => options.renderCard(event, helpers, index)
            : (event, index) => buildDefaultCard(event, index, helpers);

        return [
            dom.h('ul', {
                class: 'entry-list',
                role: 'list',
                'aria-label': labels.listLabel,
                'data-admin-system-events-list': ''
            }, matches.map((event, index) => renderCard(event, index)))
        ];
    }

    /** Re-render the list from loaded events when only the client-side search changed. */
    function render() {
        if (destroyed || events === null) {
            return;
        }
        dom.setChildren(body, buildView());
    }

    let lastServerFilterKey = null;

    tableState = attachTableState(root, {
        mode: 'server',
        document: doc,
        window: view,
        location: options.location,
        history: options.history,
        dom,
        sizes: limits,
        defaultSize: defaultLimit,
        sizeKey: 'limit',
        pageKey: null,
        debounce,
        filters: {
            q: { default: '', trim: true },
            'event-type': {
                default: '',
                parse: (value) => {
                    const text = String(value ?? '').trim();
                    if (!EVENT_TYPE_PATTERN.test(text)) {
                        return '';
                    }
                    if (!knownTypes.includes(text)) {
                        fillTypes(text);
                    }
                    return text;
                }
            },
            severity: {
                default: '',
                values: validSeverities,
                parse: (value) => {
                    const text = String(value ?? '').trim().toLowerCase();
                    if (!text) {
                        return '';
                    }
                    const canonical = text === 'warn' ? 'warning' : (text === 'danger' ? 'error' : text);
                    return validSeverities.includes(canonical) ? canonical : '';
                }
            }
        },
        onChange: (nextState, reason) => {
            const nextFilterKey = serverFilterKey(nextState);
            if (reason === 'reset' || reason === 'hashchange' || reason === 'size' || nextFilterKey !== lastServerFilterKey) {
                offset = 0;
                lastServerFilterKey = nextFilterKey;
                if (serverKey(nextState, offset) === loadedKey) {
                    render();
                }
                else {
                    refresh();
                }
                return;
            }
            render();
        },
        onPage: ({ direction, state: currentState }) => {
            const limit = currentState.size;
            if (direction === 'prev') {
                offset = Math.max(0, offset - limit);
            }
            else if (direction === 'next') {
                offset += limit;
            }
            else {
                return;
            }
            refresh();
        }
    });

    // Ensure any valid event-type hydrated from the URL hash stays selected in the dropdown.
    fillTypes(tableState.getFilter('event-type') ?? '');
    tableState.syncControls();
    lastServerFilterKey = serverFilterKey();

    const loader = attachDataLoader(body, {
        document: doc,
        dom,
        what: labels.what,
        onSignIn: options.onSignIn,
        isUnauthorized: options.isUnauthorized,
        loadingText: options.loadingText,
        errorText: options.errorText,
        retryLabel: labels.retry,
        signInLabel: options.signInLabel,
        retryIcon: options.retryIcon,
        errorIcon: options.errorIcon
    });

    /**
     * Load events for the active server filters and offset through the adapter and render them.
     * @param {{quiet?: boolean}} [callOptions] `quiet: true` keeps shown cards visible under `aria-busy`
     * @returns {Promise<boolean>} `true` when events rendered
     */
    async function refresh(callOptions = {}) {
        if (destroyed) {
            return false;
        }
        const quiet = Boolean(callOptions?.quiet);
        if (!quiet) {
            syncPager(true, 0, 0);
        }
        const current = tableState.getState();
        const eventType = current.filters['event-type'] ?? '';
        const severity = current.filters.severity ?? '';
        const limit = current.size;
        const currentOffset = offset;
        const key = serverKey(current, currentOffset);
        const params = new URLSearchParams({
            limit: String(limit),
            offset: String(currentOffset)
        });
        if (eventType) {
            params.set('event-type', eventType);
        }
        if (severity) {
            params.set('severity', severity);
        }

        const ok = await loader.load({
            quiet,
            fetcher: async ({ signal }) => {
                const combined = combineSignals(signal, options.signal);
                const [rawEvents] = await Promise.all([
                    fetchEvents({ eventType, severity, limit, offset: currentOffset, params, signal: combined }),
                    loadUsers(combined)
                ]);
                return rawEvents;
            },
            render: (rawData) => {
                events = normalizeSystemEvents(rawData);
                loadedKey = key;
                const fresh = events
                    .map((item) => item.eventType)
                    .filter((type) => type && !knownTypes.includes(type));
                if (fresh.length > 0) {
                    knownTypes.push(...new Set(fresh));
                    fillTypes(tableState.getFilter('event-type') ?? '');
                }
                return buildView();
            }
        });
        if (!ok && !destroyed && body.querySelector('[data-data-loader-error]')) {
            events = null;
            filteredEvents = [];
            loadedKey = null;
            syncPager(true, 0, 0);
        }
        return ok;
    }

    /** Cancel active loads and release table-state, signal, and owned builder listeners. */
    function destroy() {
        if (destroyed) {
            return;
        }
        destroyed = true;
        loader.destroy();
        tableState.destroy();
        root.removeAttribute('data-admin-system-events');
        options.signal?.removeEventListener('abort', destroy);
        if (ownsDom) {
            dom.destroy();
        }
    }

    const controller = {
        element: root,
        refresh,
        getEvents: () => (events ? [...events] : null),
        getFilteredEvents: () => [...filteredEvents],
        getState: () => ({ ...tableState.getState(), offset }),
        resetFilters: (callOptions) => tableState.resetFilters({ includeSize: true, ...callOptions }),
        tableState,
        dispose: destroy,
        destroy
    };

    if (options.signal) {
        if (options.signal.aborted) {
            destroy();
            return controller;
        }
        options.signal.addEventListener('abort', destroy, { once: true });
    }

    if (options.autoLoad !== false) {
        refresh();
    }

    return controller;
}

/**
 * Create a new System events screen root in an injected `Document` and attach the controller to it.
 * @param {Document|object} [docOrOptions] injected `Document` or options object
 * @param {object} [options] options passed to `attachAdminSystemEvents`
 * @returns {object} screen controller
 */
export function createAdminSystemEvents(docOrOptions = globalThis.document, options = {}) {
    if (isNode(docOrOptions) && docOrOptions.nodeType === 9) {
        const root = docOrOptions.createElement('div');
        return attachAdminSystemEvents(root, { document: docOrOptions, ...options });
    }
    const resolved = (docOrOptions && typeof docOrOptions === 'object' ? docOrOptions : options) ?? {};
    const doc = resolved.document ?? globalThis.document;
    const root = doc.createElement('div');
    return attachAdminSystemEvents(root, { document: doc, ...resolved });
}

/**
 * Build an `admin-console.js` screen descriptor for the shared System events screen.
 * @param {object} options screen and `attachAdminSystemEvents` options (`adapter`, `name`, `title`, `icon`, `badge`, ...)
 * @returns {{name: string, title: string, icon: string|Node|undefined, badge: unknown, mount: Function}}
 *   screen descriptor ready for `createAdminConsole` or `attachAdminConsole`
 */
export function createAdminSystemEventsScreen(options = {}) {
    if (typeof options?.adapter?.fetchEvents !== 'function') {
        throw new TypeError('An adapter with a fetchEvents function is required for admin-system-events.');
    }
    const {
        name = 'system-events',
        title = 'System events',
        icon = 'events',
        badge,
        ...eventsOptions
    } = options;

    return {
        name,
        title,
        icon,
        badge,
        mount: (view, ctx, route) => attachAdminSystemEvents(view, {
            ...eventsOptions,
            document: eventsOptions.document ?? view.ownerDocument,
            window: eventsOptions.window ?? view.ownerDocument?.defaultView,
            dom: eventsOptions.dom ?? ctx?.dom,
            onSignIn: eventsOptions.onSignIn ?? ctx?.signIn,
            signal: eventsOptions.signal ?? ctx?.screenSignal,
            context: ctx,
            route
        })
    };
}
