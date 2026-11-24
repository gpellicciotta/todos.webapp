/**
 * Shared admin Broadcasts screen (ADR-0003).
 *
 * - Composes announcements with a live recipient preview (inbox row plus optional banner when enabled),
 *   lazy searchable recipient selection (`selection.js`), validation (`field.js`), and publishing through an
 *   app-supplied data adapter (`adapter.publish`, `adapter.fetchHistory`, `adapter.retract`, optional `adapter.fetchUsers`).
 * - Displays broadcast history normalized from either `system-events` records (`broadcast-published` / `broadcast-retracted`)
 *   or direct broadcast lists, with URL-hash filter persistence (`table-state.js`), Show more paging, and
 *   inline confirmation (`dom-builders.js` / `inline-confirm.js`) for retraction.
 * - Mounts in the `admin-console.js` frame via `createAdminBroadcastsScreen` and uses `data-admin-broadcasts-*`
 *   hooks and ARIA states only.
 */

import { attachDataLoader } from './data-loader.js';
import { createDomBuilders } from './dom-builders.js';
import { createField } from './field.js';
import { createIcon } from './icon.js';
import { inboxTypeBadge } from './inbox.js';
import { bannerRole, bannerVariant, safeUrl } from './notices.js';
import { attachSelection } from './selection.js';
import { attachTableState } from './table-state.js';

export const DEFAULT_BROADCAST_TYPES = [
    ['info', 'Info'],
    ['warning', 'Warning'],
    ['error', 'Error']
];

export const DEFAULT_BROADCAST_AUDIENCES = [
    ['all', 'Everyone'],
    ['role:owner', 'Realm: owner'],
    ['role:admin', 'Realm: admin'],
    ['role:test', 'Realm: test'],
    ['specific-users', 'Selected accounts']
];

export const DEFAULT_BROADCAST_STATUSES = [
    ['', 'All statuses'],
    ['active', 'Active'],
    ['retracted', 'Retracted']
];

export const DEFAULT_TITLE_MAX = 200;
export const DEFAULT_MESSAGE_MAX = 1000;
export const DEFAULT_ACTION_URL_MAX = 250;
export const DEFAULT_HISTORY_STEP = 25;
export const DEFAULT_DEBOUNCE_MS = 200;

const KNOWN_TYPES = new Set(['info', 'success', 'warning', 'error']);

const DEFAULT_BANNER_ICONS = {
    info: 'note',
    success: 'check',
    warning: 'sync-error',
    error: 'alert'
};

const DEFAULT_LABELS = {
    composeHeading: 'Compose broadcast',
    previewHeading: 'Preview',
    previewInboxHeading: 'Inbox row',
    previewBannerHeading: 'Banner',
    previewPlaceholder: 'Your message appears here.',
    previewJustNow: 'Just now',
    previewUnread: 'Unread',
    previewOpenLink: 'Open link',
    titleLabel: 'Title (optional)',
    messageLabel: 'Message',
    messageRequired: 'Enter a message.',
    typeLabel: 'Type',
    audienceLabel: 'Audience',
    recipientsLegend: 'Selected accounts',
    recipientsWhat: 'Accounts',
    recipientFilterLabel: 'Filter accounts',
    recipientFilterPlaceholder: 'Name or email',
    selectAllRecipients: 'Select all shown accounts',
    noActiveAccounts: 'There are no active accounts.',
    recipientSelectionActions: 'Recipient selection actions',
    clearSelection: 'Clear selection',
    recipientRequired: 'Select at least one account.',
    bannerLabel: 'Also show as a banner',
    actionUrlLabel: 'Action URL (optional)',
    actionUrlPlaceholder: '/help or https://status.example.com',
    expiresLabel: 'Expires (optional)',
    publishButton: 'Publish broadcast',
    historyHeading: 'History',
    historyWhat: 'Broadcast history',
    historyToolbarLabel: 'Filter broadcast history',
    historyFilterLabel: 'Filter history',
    historyFilterPlaceholder: 'Title, message, or event ID',
    historyTypeLabel: 'Type',
    allTypes: 'All types',
    historyStatusLabel: 'Status',
    historyCaption: 'Published broadcasts, newest first',
    colId: 'ID',
    colMessage: 'Title and message',
    colType: 'Type',
    colAudience: 'Audience',
    colBanner: 'Banner',
    colRecipients: 'Recipients',
    colPublished: 'Published',
    colExpires: 'Expires',
    colAction: 'Action',
    yes: 'Yes',
    no: 'No',
    linkPrefix: 'Link: ',
    retractButton: 'Retract',
    retractedLabel: 'Retracted',
    cancelRetract: 'Keep',
    retractConfirmLabel: (entry) => `Confirm retracting broadcast ${entry.id}`,
    retractConfirmText: (entry) => `Retract broadcast #${entry.id} from active inboxes?`,
    retractAriaLabel: (entry) => `Retract broadcast ${entry.id}`,
    emptyNone: 'No broadcasts have been published.',
    emptyFiltered: 'No broadcasts match these filters.',
    clearFilters: 'Clear filters',
    showMore: (count) => `Show ${count} more`,
    publishSuccess: (result) => {
        if (result && typeof result === 'object') {
            if (typeof result.message === 'string' && result.message.trim()) {
                return `${result.message.trim().replace(/\.$/, '')}. The form is cleared.`;
            }
            const count = result['recipient-count'] ?? result.recipientCount;
            if (typeof count === 'number' && Number.isFinite(count)) {
                return `Published to ${plural(count, 'user')}. The form is cleared.`;
            }
        }
        return 'The broadcast was published. The form is cleared.';
    },
    publishError: (error, unauthorized) => `The broadcast was not published: ${messageOf(error)}.${unauthorized ? ' Sign in again.' : ''}`,
    retractSuccess: (id, result) => {
        if (result && typeof result === 'object' && typeof result.message === 'string' && result.message.trim()) {
            return `${result.message.trim().replace(/\.$/, '')}.`;
        }
        return `Broadcast ${id} retracted.`;
    },
    retractError: (id, error, unauthorized) => `Broadcast ${id} was not retracted: ${messageOf(error)}.${unauthorized ? ' Sign in again.' : ''}`,
    signIn: 'Sign in',
    retry: 'Retry',
    empty: '—'
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
 * Extract a trimmed message string from an error or rejection reason.
 * @param {unknown} error caught error value
 * @returns {string} non-empty error message
 */
function messageOf(error) {
    if (error && typeof error === 'object' && typeof error.message === 'string' && error.message.trim()) {
        return error.message.trim().replace(/\.$/, '');
    }
    if (typeof error === 'string' && error.trim()) {
        return error.trim().replace(/\.$/, '');
    }
    return 'Unknown error';
}

/**
 * Format a singular/plural count phrase.
 * @param {number} count item count
 * @param {string} singular singular noun
 * @param {string} [pluralNoun] plural noun, `${singular}s` by default
 * @returns {string} count phrase
 */
function plural(count, singular, pluralNoun = `${singular}s`) {
    return `${count} ${count === 1 ? singular : pluralNoun}`;
}

/**
 * Capitalize the first character of a string.
 * @param {string} value raw string
 * @returns {string} capitalized string
 */
function capitalize(value) {
    return value ? value.charAt(0).toUpperCase() + value.slice(1) : '';
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
 * Parse event metadata, accepting plain objects or JSON strings.
 * @param {unknown} metadata raw metadata
 * @returns {Record<string, unknown>|null} parsed metadata object, or `null`
 */
function parseMetadata(metadata) {
    if (metadata && typeof metadata === 'object' && !Array.isArray(metadata)) {
        return metadata;
    }
    if (typeof metadata !== 'string') {
        return null;
    }
    try {
        const value = JSON.parse(metadata);
        return value && typeof value === 'object' && !Array.isArray(value) ? value : null;
    }
    catch {
        return null;
    }
}

/**
 * Return a trimmed non-empty string or `null`.
 * @param {unknown} value candidate text
 * @returns {string|null} trimmed text or `null`
 */
function nonEmptyText(value) {
    return typeof value === 'string' && value.trim() ? value.trim() : null;
}

/**
 * Normalize a broadcast severity type.
 * @param {unknown} value raw type
 * @returns {'info'|'success'|'warning'|'error'|null} normalized type or `null`
 */
function normalizeType(value) {
    const key = String(value ?? '').trim().toLowerCase();
    const mapped = key === 'warn' ? 'warning' : (key === 'danger' ? 'error' : key);
    return KNOWN_TYPES.has(mapped) ? mapped : null;
}

/**
 * Normalize configured `[value, label]` option arrays.
 * @param {Array} source raw option list
 * @param {Array<[string, string]>} fallback default options
 * @returns {Array<[string, string]>} normalized tuples
 */
function normalizeOptions(source, fallback) {
    const list = Array.isArray(source) && source.length > 0 ? source : fallback;
    return list.map((item) => {
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
 * Format an ISO-8601 timestamp or `Date` as local `YYYY-MM-DD HH:MM:SS`.
 * Missing values return `emptyText`; unparseable strings return verbatim.
 * @param {string|Date|number|null|undefined} value timestamp value
 * @param {string} [emptyText] fallback text when missing, `'—'` by default
 * @returns {string} formatted timestamp
 */
export function formatBroadcastTime(value, emptyText = '—') {
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
 * Convert a `datetime-local` or ISO date string into the server's UTC time format (`YYYY-MM-DDTHH:MM:SSZ`).
 * @param {string|Date|null|undefined} value local or ISO date/time value
 * @returns {string|null} UTC ISO timestamp without milliseconds, or `null` when empty or invalid
 */
export function toUtcTime(value) {
    if (value === null || value === undefined || value === '') {
        return null;
    }
    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString().replace(/\.\d{3}Z$/, 'Z');
}

/**
 * Describe a broadcast audience from either a `target-filter` object or a string audience value.
 * @param {object|string|null|undefined} filterOrAudience target filter object or audience string
 * @returns {string} human-readable audience label
 */
export function formatAudience(filterOrAudience) {
    if (typeof filterOrAudience === 'string') {
        const value = filterOrAudience.trim();
        if (!value || value.toLowerCase() === 'all') {
            return 'Everyone';
        }
        if (value.startsWith('role:')) {
            return `Role: ${value.slice('role:'.length)}`;
        }
        return value;
    }
    const filter = filterOrAudience && typeof filterOrAudience === 'object' ? filterOrAudience : null;
    const type = String(filter?.type ?? 'all').toLowerCase();
    if (type === 'all') {
        return 'Everyone';
    }
    if (type === 'role') {
        return `Realm: ${filter['role-name'] ?? filter.roleName ?? filter.role ?? 'unknown'}`;
    }
    if (type === 'specific-users') {
        const ids = filter['user-ids'] ?? filter.userIds ?? filter.users ?? [];
        return plural(Array.isArray(ids) ? ids.length : 0, 'account');
    }
    if (type === 'active-recently') {
        return `Active in the last ${filter.days ?? '?'} days`;
    }
    return type;
}

/**
 * Rebuild broadcast history entries from `system-events` records (`broadcast-published` and `broadcast-retracted`).
 * @param {object[]} events system event records, newest first
 * @returns {Array<{id: string|number|null, title: string|null, message: string, type: string, banner: boolean,
 *   actionUrl: string|null, filter: object, audience: string|null, recipientCount: number|null,
 *   published: string|null, expires: string|null, retracted: boolean, raw: object}>} reconstructed entries
 */
export function buildBroadcastHistory(events) {
    const list = Array.isArray(events) ? events : [];
    const retracted = new Set();
    for (const item of list) {
        const eventType = item?.['event-type'] ?? item?.eventType;
        if (eventType === 'broadcast-retracted') {
            const meta = parseMetadata(item.metadata);
            const id = meta?.['retracted-event-id'] ?? meta?.retractedEventId;
            if (id !== undefined && id !== null && id !== '') {
                retracted.add(String(id));
            }
        }
    }
    return list
        .filter((item) => (item?.['event-type'] ?? item?.eventType) === 'broadcast-published')
        .map((item) => {
            const meta = parseMetadata(item.metadata) ?? {};
            const rawFilter = meta['target-filter'] ?? meta.targetFilter;
            const filter = rawFilter && typeof rawFilter === 'object' && !Array.isArray(rawFilter)
                ? rawFilter
                : { type: 'all' };
            const rawRecipients = meta['recipient-count'] ?? meta.recipientCount;
            return {
                id: item.id ?? null,
                title: nonEmptyText(meta.title),
                message: nonEmptyText(meta.message) ?? String(item.description ?? ''),
                type: normalizeType(meta.type) ?? normalizeType(item.severity) ?? 'info',
                banner: meta.banner === true || meta.banner === 1 || meta.banner === '1',
                actionUrl: nonEmptyText(meta['action-url'] ?? meta.actionUrl),
                filter,
                audience: null,
                recipientCount: typeof rawRecipients === 'number' && Number.isFinite(rawRecipients) ? rawRecipients : null,
                published: item['creation-time'] ?? item.creationTime ?? item['created-at'] ?? item.createdAt ?? null,
                expires: nonEmptyText(meta['deletion-time'] ?? meta.deletionTime),
                retracted: retracted.has(String(item.id)),
                raw: item
            };
        });
}

/**
 * Normalize one direct broadcast record into the shared entry shape.
 * @param {object} item raw broadcast record
 * @returns {object} normalized entry
 */
function normalizeDirectBroadcast(item) {
    const source = item && typeof item === 'object' ? item : { message: String(item ?? '') };
    const rawFilter = source['target-filter'] ?? source.targetFilter ?? source.filter;
    const filter = rawFilter && typeof rawFilter === 'object' && !Array.isArray(rawFilter) ? rawFilter : null;
    const rawAudience = nonEmptyText(source['audience-type'] ?? source.audienceType ?? source.audience);
    const rawRecipients = source['recipient-count'] ?? source.recipientCount;
    const status = String(source.status ?? '').trim().toLowerCase();
    return {
        id: source.id ?? null,
        title: nonEmptyText(source.title),
        message: nonEmptyText(source.message) ?? String(source.description ?? ''),
        type: normalizeType(source.type) ?? normalizeType(source.severity) ?? 'info',
        banner: source.banner === true || source.banner === 1 || source.banner === '1',
        actionUrl: nonEmptyText(source['action-url'] ?? source.actionUrl),
        filter: filter ?? (rawAudience ? null : { type: 'all' }),
        audience: rawAudience,
        recipientCount: typeof rawRecipients === 'number' && Number.isFinite(rawRecipients) ? rawRecipients : null,
        published: source.published ?? source['created-at'] ?? source.createdAt ?? source['creation-time'] ?? source.creationTime ?? null,
        expires: nonEmptyText(source.expires ?? source['deletion-time'] ?? source.deletionTime),
        retracted: source.retracted === true || status === 'retracted',
        raw: source
    };
}

/**
 * Normalize broadcast history returned by `adapter.fetchHistory`, accepting system-event lists,
 * direct broadcast lists, or envelope objects (`broadcasts`, `system-events`, `events`, `items`, `elements`).
 * @param {unknown} raw adapter payload
 * @returns {Array<ReturnType<typeof normalizeDirectBroadcast>>} normalized broadcast entries
 */
export function normalizeBroadcastHistory(raw) {
    let list = null;
    if (Array.isArray(raw)) {
        list = raw;
    }
    else if (raw && typeof raw === 'object') {
        const candidate = raw.broadcasts
            ?? raw['system-events']
            ?? raw.systemEvents
            ?? raw.events
            ?? raw.elements
            ?? raw.items;
        if (Array.isArray(candidate)) {
            list = candidate;
        }
    }
    if (!list || list.length === 0) {
        return [];
    }
    const isSystemEvents = list.some((item) => item && typeof item === 'object'
        && ((item['event-type'] ?? item.eventType) === 'broadcast-published'
            || (item['event-type'] ?? item.eventType) === 'broadcast-retracted'));
    if (isSystemEvents) {
        return buildBroadcastHistory(list);
    }
    return list.map(normalizeDirectBroadcast);
}

/**
 * Filter normalized broadcast entries by search query, type, and active/retracted status.
 * @param {Array<object>} entries normalized broadcast entries
 * @param {{q?: string, type?: string, status?: string}} [filters] active filter values
 * @returns {Array<object>} matching entries in original order
 */
export function filterBroadcastHistory(entries, filters = {}) {
    const list = Array.isArray(entries) ? entries : [];
    const needle = String(filters?.q ?? '').trim().toLowerCase();
    const type = String(filters?.type ?? '').trim().toLowerCase();
    const status = String(filters?.status ?? '').trim().toLowerCase();
    return list.filter((entry) => {
        if (needle) {
            const haystack = [entry?.title, entry?.message, entry?.id !== null && entry?.id !== undefined ? String(entry.id) : ''];
            if (!haystack.some((value) => String(value ?? '').toLowerCase().includes(needle))) {
                return false;
            }
        }
        if (type && entry?.type !== type) {
            return false;
        }
        if (status === 'active' && entry?.retracted) {
            return false;
        }
        if (status === 'retracted' && !entry?.retracted) {
            return false;
        }
        return true;
    });
}

/**
 * Normalize a user directory payload (array or envelope) into an array of user objects.
 * @param {unknown} raw result from `adapter.fetchUsers`
 * @returns {Array<object>} user list
 */
function normalizeUsersList(raw) {
    if (Array.isArray(raw)) {
        return raw;
    }
    if (raw && typeof raw === 'object') {
        const list = raw.users ?? raw.elements ?? raw.items;
        if (Array.isArray(list)) {
            return list;
        }
    }
    return [];
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
 * Attach the shared admin Broadcasts screen to a container element.
 * Renders the compose form and live recipient preview (inbox row and optional banner) in a responsive `.app__split`,
 * followed by a filterable history table with inline-confirmation retraction.
 * @param {HTMLElement} root target container element
 * @param {object} options screen configuration
 * @param {{fetchHistory: (ctx: {signal?: AbortSignal}) => Promise<unknown>, publish: (payload: object, ctx: {signal?: AbortSignal}) => Promise<unknown>, retract: (id: string|number, entry: object, ctx: {signal?: AbortSignal}) => Promise<unknown>, fetchUsers?: (ctx: {signal?: AbortSignal}) => Promise<unknown>}} options.adapter app data adapter
 * @param {Array} [options.types] broadcast types, `DEFAULT_BROADCAST_TYPES` by default
 * @param {Array} [options.audiences] audience select options; omits `specific-users` when `adapter.fetchUsers` is absent
 * @param {Array} [options.statuses] history status filter options, `DEFAULT_BROADCAST_STATUSES` by default
 * @param {'target-filter'|'audience'} [options.payloadFormat] publish payload style, `'target-filter'` by default
 * @param {(draft: object) => object} [options.buildPayload] optional custom payload builder overriding `payloadFormat`
 * @param {boolean} [options.defaultBanner] initial checked state of the banner checkbox, `false` by default
 * @param {boolean} [options.showExpires] show the Expires datetime-local field and column, `true` by default
 * @param {'auto'|boolean} [options.showRecipientsColumn] show the Recipients history column, `'auto'` by default
 * @param {number} [options.titleMax] title max length, `200` by default
 * @param {number} [options.messageMax] message max length, `1000` by default
 * @param {number} [options.actionUrlMax] action URL max length, `250` by default
 * @param {number} [options.historyStep] rows shown per Show more step, `25` by default
 * @param {number} [options.debounce] filter search debounce in ms, `200` by default
 * @param {boolean} [options.autoLoad] trigger initial history load immediately, `true` by default
 * @param {(user: object) => boolean} [options.filterUser] active-account predicate for recipient selection
 * @param {(user: object) => string} [options.formatUser] recipient checklist label formatter
 * @param {(filterOrAudience: unknown, entry?: object) => string} [options.formatAudience] audience formatter
 * @param {(value: unknown, emptyText?: string) => string} [options.formatTime] timestamp formatter
 * @param {(error: unknown) => void} [options.onSignIn] callback wired to 401 Sign in actions
 * @param {(error: unknown) => boolean} [options.isUnauthorized] predicate classifying 401 errors
 * @param {Record<string, string>} [options.icons] optional icon glyph overrides
 * @param {Document} [options.document] injected document
 * @param {Window} [options.window] injected window for URL hash synchronization
 * @param {Location} [options.location] injected location override
 * @param {History} [options.history] injected history override
 * @param {object} [options.dom] pre-created `createDomBuilders` instance
 * @param {AbortSignal} [options.signal] external abort signal that disposes the screen
 * @param {object} [options.labels] label and message overrides
 * @returns {object} screen controller
 */
export function attachAdminBroadcasts(root, options = {}) {
    if (!isNode(root) || root.nodeType !== 1) {
        throw new TypeError('A container element is required for admin-broadcasts.');
    }
    const adapter = options?.adapter;
    if (!adapter || typeof adapter.fetchHistory !== 'function' || typeof adapter.publish !== 'function' || typeof adapter.retract !== 'function') {
        throw new TypeError('An adapter with fetchHistory, publish, and retract functions is required for admin-broadcasts.');
    }
    const fetchUsers = typeof adapter.fetchUsers === 'function' ? adapter.fetchUsers : null;

    const doc = options.document ?? root.ownerDocument ?? globalThis.document;
    const view = options.window ?? doc?.defaultView ?? globalThis.window ?? null;
    const ownsDom = !options.dom;
    const dom = options.dom ?? createDomBuilders(doc);
    const labels = { ...DEFAULT_LABELS, ...options.labels };
    const icons = { ...DEFAULT_BANNER_ICONS, ...options.icons };
    const types = normalizeOptions(options.types, DEFAULT_BROADCAST_TYPES);
    const defaultType = types[0][0];
    const defaultAudiences = fetchUsers
        ? DEFAULT_BROADCAST_AUDIENCES
        : DEFAULT_BROADCAST_AUDIENCES.filter(([value]) => value !== 'specific-users');
    const audiences = normalizeOptions(options.audiences, defaultAudiences);
    const defaultAudience = audiences[0][0];
    const statuses = normalizeOptions(options.statuses, DEFAULT_BROADCAST_STATUSES);
    const validTypes = ['', ...types.map(([value]) => value)];
    const validStatuses = statuses.map(([value]) => value);

    const payloadFormat = options.payloadFormat === 'audience' ? 'audience' : 'target-filter';
    const defaultBanner = Boolean(options.defaultBanner);
    const showExpires = options.showExpires !== false;
    const showRecipientsColumn = options.showRecipientsColumn ?? 'auto';
    const titleMax = options.titleMax ?? DEFAULT_TITLE_MAX;
    const messageMax = options.messageMax ?? DEFAULT_MESSAGE_MAX;
    const actionUrlMax = options.actionUrlMax ?? DEFAULT_ACTION_URL_MAX;
    const historyStep = Math.max(1, Number(options.historyStep) || DEFAULT_HISTORY_STEP);
    const debounce = options.debounce === undefined ? DEFAULT_DEBOUNCE_MS : Math.max(0, Number(options.debounce) || 0);
    const formatTime = typeof options.formatTime === 'function' ? options.formatTime : formatBroadcastTime;
    const describeAudience = typeof options.formatAudience === 'function' ? options.formatAudience : formatAudience;
    const isUnauthorized = typeof options.isUnauthorized === 'function'
        ? options.isUnauthorized
        : (error) => Boolean(error && typeof error === 'object' && error.status === 401);
    const filterUser = typeof options.filterUser === 'function'
        ? options.filterUser
        : (item) => !item['expiry-time'] && !item.expiryTime;
    const formatUser = typeof options.formatUser === 'function'
        ? options.formatUser
        : (account) => {
            const name = account.name?.trim();
            const email = account.email?.trim() || '';
            if (name && email && name !== email) {
                return `${name} (${email})`;
            }
            return name || email || `User #${account.id}`;
        };

    const seed = (instanceCounter += 1);
    const idPrefix = `admin-broadcasts-${seed}`;

    let destroyed = false;
    let historyEntries = null;
    let filteredEntries = [];
    let shownCount = historyStep;
    let usersList = null;
    let selection = null;
    let recipientFilterInput = null;
    let historyRowDom = null;
    let tableState = null;

    root.setAttribute('data-admin-broadcasts', '');

    // Compose controls.
    const titleInput = dom.h('input', {
        class: 'field__control',
        type: 'text',
        name: 'title',
        maxlength: String(titleMax),
        autocomplete: 'off',
        'data-admin-broadcasts-input': 'title'
    });

    const messageField = createField(doc, {
        id: `${idPrefix}-message`,
        label: labels.messageLabel,
        name: 'message',
        tag: 'textarea',
        maxLength: messageMax,
        messages: { valueMissing: labels.messageRequired },
        validate: (value) => (value.trim() ? null : labels.messageRequired)
    });
    const messageInput = messageField.control;
    messageInput.rows = 4;
    messageInput.required = true;
    messageInput.setAttribute('data-admin-broadcasts-input', 'message');
    const messageCounter = messageField.element.querySelector('.field__counter');

    const typeRadios = types.map(([value, label]) => {
        const radio = dom.h('input', {
            type: 'radio',
            name: `${idPrefix}-type`,
            value,
            checked: value === defaultType,
            'data-admin-broadcasts-input': 'type'
        });
        return {
            radio,
            label: dom.h('label', { class: 'segmented__option' }, radio, dom.h('span', null, label))
        };
    });

    const audienceSelect = dom.select(audiences, defaultAudience, {
        name: 'audience',
        'data-admin-broadcasts-input': 'audience'
    });

    const recipientsBox = dom.h('div', {
        hidden: true,
        'data-admin-broadcasts-recipients': ''
    });

    const recipientError = dom.h('p', {
        class: 'field__error',
        id: `${idPrefix}-recipients-error`,
        hidden: true,
        'data-admin-broadcasts-recipients-error': ''
    }, createIcon(doc, 'alert'), labels.recipientRequired);

    const bannerBox = dom.checkbox(labels.bannerLabel, {
        name: 'banner',
        checked: defaultBanner,
        'data-admin-broadcasts-input': 'banner'
    });
    const bannerInput = bannerBox.querySelector('input');

    const actionInput = dom.h('input', {
        class: 'field__control',
        type: 'text',
        name: 'action-url',
        maxlength: String(actionUrlMax),
        autocomplete: 'off',
        autocorrect: 'off',
        autocapitalize: 'none',
        spellcheck: 'false',
        placeholder: labels.actionUrlPlaceholder,
        'data-admin-broadcasts-input': 'action-url'
    });

    const expiresInput = showExpires
        ? dom.h('input', {
            class: 'field__control',
            type: 'datetime-local',
            name: 'expires',
            'data-admin-broadcasts-input': 'expires'
        })
        : null;

    const publishButton = dom.button(labels.publishButton, null, {
        kind: 'primary',
        type: 'submit',
        'data-admin-broadcasts-action': 'publish'
    });

    const composeBanner = dom.h('div', {
        class: 'app__slot',
        'data-admin-broadcasts-compose-banner': ''
    });
    const composeStatus = dom.statusLine('', {
        className: 'app__status',
        'data-admin-broadcasts-compose-status': ''
    });

    const composeHeadingId = `${idPrefix}-compose-heading`;
    const form = dom.h('form', {
        class: 'form',
        novalidate: true,
        'aria-labelledby': composeHeadingId,
        'data-admin-broadcasts-form': ''
    },
    buildField(dom, `${idPrefix}-title`, labels.titleLabel, titleInput),
    messageField.element,
    dom.h('fieldset', { class: 'segmented', 'data-admin-broadcasts-types': '' },
        dom.h('legend', { class: 'segmented__legend' }, labels.typeLabel),
        dom.h('div', { class: 'segmented__options' }, typeRadios.map((item) => item.label))),
    buildField(dom, `${idPrefix}-audience`, labels.audienceLabel, audienceSelect),
    recipientsBox,
    bannerBox,
    buildField(dom, `${idPrefix}-action-url`, labels.actionUrlLabel, actionInput),
    expiresInput ? buildField(dom, `${idPrefix}-expires`, labels.expiresLabel, expiresInput) : null,
    dom.h('div', null, publishButton));

    const composeSection = dom.h('section', {
        class: 'app__section',
        'aria-labelledby': composeHeadingId,
        'data-admin-broadcasts-compose': ''
    },
    dom.h('h2', { id: composeHeadingId }, labels.composeHeading),
    composeBanner,
    composeStatus,
    form);

    // Live preview controls.
    const previewInboxRow = dom.h('li', {
        class: 'row inbox__item inbox__item--unread',
        'data-admin-broadcasts-preview-row': ''
    });
    const previewInboxWrap = dom.h('div', {
        class: 'app__section',
        'data-admin-broadcasts-preview-inbox': ''
    },
    dom.h('h3', null, labels.previewInboxHeading),
    dom.h('ul', { class: 'row__list inbox__list', role: 'list' }, previewInboxRow));

    const previewBannerBox = dom.h('div', {
        class: 'banner',
        role: 'status',
        'data-admin-broadcasts-preview-banner-box': ''
    });
    const previewBannerWrap = dom.h('div', {
        class: 'app__section',
        hidden: !defaultBanner,
        'data-admin-broadcasts-preview-banner': ''
    },
    dom.h('h3', null, labels.previewBannerHeading),
    previewBannerBox);

    const previewHeadingId = `${idPrefix}-preview-heading`;
    const previewSection = dom.h('section', {
        class: 'app__section',
        'aria-labelledby': previewHeadingId,
        'data-admin-broadcasts-preview': '',
        'data-admin-broadcasts-preview-mode': defaultBanner ? 'banner' : 'inbox'
    },
    dom.h('h2', { id: previewHeadingId }, labels.previewHeading),
    previewInboxWrap,
    previewBannerWrap);

    const split = dom.h('div', {
        class: 'app__split',
        'data-admin-broadcasts-split': ''
    }, composeSection, previewSection);

    // History section.
    const historyHeadingId = `${idPrefix}-history-heading`;
    const historyQuery = dom.h('input', {
        class: 'field__control',
        type: 'search',
        name: 'q',
        placeholder: labels.historyFilterPlaceholder,
        autocorrect: 'off',
        autocapitalize: 'none',
        spellcheck: 'false',
        'data-table-state-filter': 'q',
        'data-admin-broadcasts-filter': 'q'
    });
    const historyType = dom.select([['', labels.allTypes], ...types], '', {
        name: 'type',
        'data-table-state-filter': 'type',
        'data-admin-broadcasts-filter': 'type'
    });
    const historyStatus = dom.select(statuses, '', {
        name: 'status',
        'data-table-state-filter': 'status',
        'data-admin-broadcasts-filter': 'status'
    });
    const historyToolbar = dom.h('search', {
        class: 'toolbar',
        'aria-label': labels.historyToolbarLabel,
        'data-admin-broadcasts-toolbar': ''
    },
    buildField(dom, `${idPrefix}-history-filter`, labels.historyFilterLabel, historyQuery),
    buildField(dom, `${idPrefix}-history-type`, labels.historyTypeLabel, historyType),
    buildField(dom, `${idPrefix}-history-status`, labels.historyStatusLabel, historyStatus));

    const historyBanner = dom.h('div', {
        class: 'app__slot',
        'data-admin-broadcasts-history-banner': ''
    });
    const historyStatusLine = dom.statusLine('', {
        className: 'app__status',
        'data-admin-broadcasts-history-status': ''
    });
    const historyBody = dom.h('div', {
        class: 'loading',
        'data-admin-broadcasts-history-body': ''
    });

    const historySection = dom.h('section', {
        class: 'app__section',
        'aria-labelledby': historyHeadingId,
        'data-admin-broadcasts-history': ''
    },
    dom.h('h2', { id: historyHeadingId }, labels.historyHeading),
    historyToolbar,
    historyBanner,
    historyStatusLine,
    historyBody);

    dom.setChildren(root, split, historySection);

    /**
     * Read the currently selected broadcast type value.
     * @returns {string} selected type key
     */
    function chosenType() {
        return typeRadios.find((item) => item.radio.checked)?.radio.value ?? defaultType;
    }

    /**
     * Collect all checked recipient IDs, preserving numeric IDs when the loaded user ID was numeric.
     * @returns {Array<number|string>} selected user identifiers
     */
    function selectedRecipientIds() {
        const checked = [...recipientsBox.querySelectorAll('[data-selection-item]:checked')];
        return checked.map((input) => {
            const raw = input.value;
            const matched = usersList?.find((user) => String(user.id) === raw);
            if (matched && typeof matched.id === 'number') {
                return matched.id;
            }
            return /^\d+$/.test(raw) ? Number(raw) : raw;
        });
    }

    /** Update the live inbox row and optional banner previews from the current form values. */
    function updatePreview() {
        if (destroyed) {
            return;
        }
        const title = titleInput.value.trim();
        const message = messageInput.value.trim();
        const type = chosenType();
        const isBanner = Boolean(bannerInput.checked);
        const safeAction = safeUrl(actionInput.value.trim());

        if (messageCounter) {
            messageCounter.textContent = `${messageInput.value.length} / ${messageMax}`;
        }

        previewSection.dataset.adminBroadcastsPreviewMode = isBanner ? 'banner' : 'inbox';

        // Inbox row preview using the shared inbox + row skeleton.
        const badgeVariant = inboxTypeBadge(type);
        const headingChildren = [
            title ? dom.h('span', { class: 'inbox__title' }, title) : null,
            dom.h('span', { class: badgeVariant ? `badge ${badgeVariant}` : 'badge' }, capitalize(type)),
            dom.h('span', { class: 'badge inbox__unread' }, labels.previewUnread)
        ];
        const mainSpan = dom.h('span', { class: 'row__main inbox__main' },
            dom.h('span', { class: 'inbox__heading' }, headingChildren),
            dom.h('p', { class: 'inbox__message' }, message || labels.previewPlaceholder),
            dom.h('span', { class: 'inbox__meta' },
                dom.h('span', { class: 'chip' }, createIcon(doc, 'clock'), labels.previewJustNow)));
        const actionsSpan = safeAction
            ? dom.h('span', { class: 'row__actions inbox__actions' },
                dom.h('a', {
                    class: 'button button--secondary button--small',
                    href: safeAction,
                    target: '_blank',
                    rel: 'noopener'
                }, labels.previewOpenLink))
            : null;
        dom.setChildren(previewInboxRow, mainSpan, actionsSpan);

        // Banner preview using the shared banner skeleton.
        previewBannerWrap.hidden = !isBanner;
        const variant = bannerVariant(type);
        previewBannerBox.className = variant ? `banner ${variant}` : 'banner';
        previewBannerBox.setAttribute('role', bannerRole(type));
        const bannerIconName = icons[type] ?? DEFAULT_BANNER_ICONS.info;
        dom.setChildren(previewBannerBox,
            createIcon(doc, bannerIconName),
            dom.h('p', { class: 'banner__text' },
                title ? [dom.h('strong', null, `${title}:`), ' '] : null,
                message || labels.previewPlaceholder),
            safeAction
                ? dom.h('a', {
                    class: 'button button--secondary button--small',
                    href: safeAction,
                    target: '_blank',
                    rel: 'noopener'
                }, labels.previewOpenLink)
                : null);
    }

    /**
     * Build the searchable recipient selection fieldset from `usersList`.
     * @returns {HTMLFieldSetElement} built selection fieldset
     */
    function buildRecipientsFieldset() {
        selection?.destroy();
        selection = null;

        const filterInput = dom.h('input', {
            class: 'field__control',
            type: 'search',
            placeholder: labels.recipientFilterPlaceholder,
            autocorrect: 'off',
            autocapitalize: 'none',
            spellcheck: 'false',
            'data-admin-broadcasts-recipient-filter': ''
        });
        recipientFilterInput = filterInput;

        const items = (usersList ?? []).map((account) => {
            const labelText = formatUser(account);
            const checkboxInput = dom.h('input', {
                class: 'selection__control',
                type: 'checkbox',
                value: String(account.id),
                'data-selection-item': ''
            });
            return {
                text: `${labelText} ${account.email ?? ''}`.toLowerCase(),
                row: dom.h('li', null,
                    dom.h('label', { class: 'selection__row' }, checkboxInput, labelText))
            };
        });

        const fieldset = dom.h('fieldset', {
            class: 'selection',
            'data-selection-root': '',
            tabindex: '-1',
            'aria-describedby': recipientError.id
        },
        dom.h('legend', null, labels.recipientsLegend),
        buildField(dom, `${idPrefix}-recipient-filter`, labels.recipientFilterLabel, filterInput),
        dom.h('label', { class: 'selection__row' },
            dom.h('input', {
                class: 'selection__control',
                type: 'checkbox',
                'data-selection-all': ''
            }),
            labels.selectAllRecipients),
        items.length > 0
            ? dom.h('ul', {
                class: 'selection__list app__scroll-list',
                'data-admin-broadcasts-recipient-list': ''
            }, items.map((item) => item.row))
            : dom.h('p', { class: 'loading__status' }, labels.noActiveAccounts),
        dom.h('div', {
            class: 'selection__bar',
            'data-selection-bar': '',
            role: 'group',
            'aria-label': labels.recipientSelectionActions
        },
        dom.h('p', {
            class: 'selection__count',
            'data-selection-count': '',
            role: 'status',
            'aria-live': 'polite',
            'aria-atomic': 'true'
        }),
        dom.button(labels.clearSelection, null, { 'data-selection-clear': '' })),
        recipientError);

        filterInput.addEventListener('input', () => {
            const needle = filterInput.value.trim().toLowerCase();
            for (const item of items) {
                item.row.hidden = Boolean(needle) && !item.text.includes(needle);
            }
            selection?.refresh();
        });

        fieldset.addEventListener('change', () => {
            if (selectedRecipientIds().length > 0) {
                recipientError.hidden = true;
            }
        });

        selection = attachSelection(fieldset);
        return fieldset;
    }

    const recipientsLoader = attachDataLoader(recipientsBox, {
        document: doc,
        dom,
        what: labels.recipientsWhat,
        onSignIn: options.onSignIn,
        isUnauthorized,
        retryLabel: labels.retry,
        signInLabel: labels.signIn
    });

    /** Reveal the recipient selector when `specific-users` is active and lazily load accounts once. */
    function syncRecipients() {
        const needsUsers = audienceSelect.value === 'specific-users';
        recipientsBox.hidden = !needsUsers;
        if (!needsUsers) {
            recipientError.hidden = true;
            return;
        }
        if (usersList !== null) {
            return;
        }
        if (!fetchUsers) {
            usersList = [];
            dom.setChildren(recipientsBox, buildRecipientsFieldset());
            return;
        }
        recipientsLoader.load({
            fetcher: ({ signal }) => fetchUsers({ signal: combineSignals(signal, options.signal) }),
            render: (rawUsers) => {
                usersList = normalizeUsersList(rawUsers)
                    .filter(filterUser)
                    .sort((a, b) => (a.name?.trim() || a.email || '').localeCompare(b.name?.trim() || b.email || ''));
                return buildRecipientsFieldset();
            }
        });
    }

    /**
     * Build the publish payload from current form values.
     * @returns {object} payload passed to `adapter.publish`
     */
    function buildPayload() {
        const audience = audienceSelect.value;
        const recipientIds = audience === 'specific-users' ? selectedRecipientIds() : [];
        const title = titleInput.value.trim();
        const message = messageInput.value.trim();
        const type = chosenType();
        const banner = Boolean(bannerInput.checked);
        const actionUrl = actionInput.value.trim();
        const expires = expiresInput ? toUtcTime(expiresInput.value) : null;

        if (typeof options.buildPayload === 'function') {
            return options.buildPayload({
                title: title || null,
                message,
                type,
                audience,
                recipientIds,
                banner,
                actionUrl: actionUrl || null,
                expires
            });
        }

        const payload = { message, type, banner };
        if (payloadFormat === 'audience') {
            payload.audience = audience;
            if (audience === 'specific-users') {
                payload['user-ids'] = recipientIds;
            }
        }
        else {
            let targetFilter = { type: 'all' };
            if (audience.startsWith('role:')) {
                targetFilter = { type: 'role', 'role-name': audience.slice('role:'.length) };
            }
            else if (audience === 'specific-users') {
                targetFilter = { type: 'specific-users', 'user-ids': recipientIds };
            }
            payload['target-filter'] = targetFilter;
        }

        if (title) {
            payload.title = title;
        }
        if (actionUrl) {
            payload['action-url'] = actionUrl;
        }
        if (expires) {
            payload['deletion-time'] = expires;
        }
        return payload;
    }

    /** Reset the compose form, recipient selection, and live preview to their defaults. */
    function resetForm() {
        titleInput.value = '';
        messageInput.value = '';
        messageField.clear();
        for (const item of typeRadios) {
            item.radio.checked = item.radio.value === defaultType;
        }
        audienceSelect.value = defaultAudience;
        bannerInput.checked = defaultBanner;
        actionInput.value = '';
        if (expiresInput) {
            expiresInput.value = '';
        }
        if (recipientFilterInput) {
            recipientFilterInput.value = '';
            for (const row of recipientsBox.querySelectorAll('[data-admin-broadcasts-recipient-list] > li')) {
                row.hidden = false;
            }
        }
        for (const checkbox of recipientsBox.querySelectorAll('[data-selection-item]')) {
            checkbox.checked = false;
        }
        selection?.refresh();
        recipientError.hidden = true;
        recipientsBox.hidden = defaultAudience !== 'specific-users';
        updatePreview();
    }

    /** Validate the compose form, publish via `adapter.publish`, reset on success, and reload history. */
    async function publish() {
        if (destroyed) {
            return false;
        }
        dom.setChildren(composeBanner);
        composeStatus.textContent = '';

        const messageOk = await messageField.validate();
        const needsRecipients = audienceSelect.value === 'specific-users';
        const recipientsOk = !needsRecipients || selectedRecipientIds().length > 0;
        recipientError.hidden = recipientsOk || !selection;

        if (!messageOk) {
            messageInput.focus();
            return false;
        }
        if (!recipientsOk) {
            const firstRecipient = recipientsBox.querySelector('[data-admin-broadcasts-recipient-list] > li:not([hidden]) [data-selection-item]')
                ?? recipientsBox.querySelector('input, select, button');
            firstRecipient?.focus();
            return false;
        }

        publishButton.disabled = true;
        try {
            const result = await adapter.publish(buildPayload(), { signal: options.signal });
            if (destroyed) {
                return false;
            }
            resetForm();
            composeStatus.textContent = labels.publishSuccess(result);
            refresh({ quiet: true });
            return true;
        }
        catch (error) {
            if (destroyed) {
                return false;
            }
            const unauthorized = Boolean(isUnauthorized(error));
            const action = unauthorized && typeof options.onSignIn === 'function'
                ? dom.button(labels.signIn, () => options.onSignIn(error), { kind: 'primary', 'data-admin-broadcasts-action': 'sign-in' })
                : null;
            dom.setChildren(composeBanner, dom.errorBanner(labels.publishError(error, unauthorized), action));
            return false;
        }
        finally {
            if (!destroyed) {
                publishButton.disabled = false;
            }
        }
    }

    const onFormChange = () => updatePreview();
    const onAudienceChange = () => syncRecipients();
    const onFormSubmit = (event) => {
        event.preventDefault();
        publish();
    };
    form.addEventListener('input', onFormChange);
    form.addEventListener('change', onFormChange);
    form.addEventListener('submit', onFormSubmit);
    audienceSelect.addEventListener('change', onAudienceChange);

    // History table state, loading, rendering, and retraction.
    tableState = attachTableState(historySection, {
        mode: 'client',
        document: doc,
        window: view,
        location: options.location,
        history: options.history,
        dom,
        sizeKey: null,
        pageKey: null,
        debounce,
        filters: {
            q: { default: '', trim: true },
            type: {
                default: '',
                values: validTypes,
                parse: (value) => {
                    const normalized = normalizeType(value);
                    return normalized && validTypes.includes(normalized) ? normalized : '';
                }
            },
            status: {
                default: '',
                values: validStatuses
            }
        },
        onChange: () => {
            shownCount = historyStep;
            renderHistory();
        }
    });
    tableState.syncControls();

    const historyLoader = attachDataLoader(historyBody, {
        document: doc,
        dom,
        what: labels.historyWhat,
        onSignIn: options.onSignIn,
        isUnauthorized,
        loadingText: options.loadingText,
        errorText: options.errorText,
        retryLabel: labels.retry,
        signInLabel: labels.signIn
    });

    /**
     * Retract a broadcast through `adapter.retract`, report the outcome, and reload history quietly.
     * @param {object} entry normalized broadcast history entry
     */
    async function retractEntry(entry) {
        if (destroyed) {
            return;
        }
        dom.setChildren(historyBanner);
        historyStatusLine.textContent = '';
        try {
            const result = await adapter.retract(entry.id, entry, { signal: options.signal });
            if (destroyed) {
                return;
            }
            historyStatusLine.textContent = labels.retractSuccess(entry.id, result);
        }
        catch (error) {
            if (destroyed) {
                return;
            }
            const unauthorized = Boolean(isUnauthorized(error));
            const action = unauthorized && typeof options.onSignIn === 'function'
                ? dom.button(labels.signIn, () => options.onSignIn(error), { kind: 'primary', 'data-admin-broadcasts-action': 'sign-in' })
                : null;
            dom.setChildren(historyBanner, dom.errorBanner(labels.retractError(entry.id, error, unauthorized), action));
        }
        await refresh({ quiet: true });
    }

    /**
     * Build one history table row with inline confirmation for active entries.
     * @param {object} entry normalized broadcast entry
     * @param {object} rowDom per-render DOM builder tracking inline confirmations
     * @param {boolean} includeRecipients whether to render the Recipients cell
     * @returns {HTMLTableRowElement} built table row
     */
    function buildHistoryRow(entry, rowDom, includeRecipients) {
        let actionCell;
        if (entry.retracted) {
            actionCell = rowDom.h('span', { 'data-admin-broadcasts-retracted': '' }, labels.retractedLabel);
        }
        else {
            const trigger = rowDom.button(labels.retractButton, null, {
                danger: true,
                small: true,
                'aria-label': labels.retractAriaLabel(entry)
            });
            actionCell = rowDom.inlineConfirm(trigger, {
                label: labels.retractConfirmLabel(entry),
                text: labels.retractConfirmText(entry),
                confirmLabel: labels.retractButton,
                cancelLabel: labels.cancelRetract,
                onConfirm: () => retractEntry(entry)
            });
        }

        const textCellChildren = [];
        if (entry.title) {
            textCellChildren.push(rowDom.h('strong', null, entry.title), rowDom.h('br'), entry.message);
        }
        else {
            textCellChildren.push(entry.message);
        }
        if (entry.actionUrl) {
            textCellChildren.push(rowDom.h('br'), labels.linkPrefix, rowDom.h('code', null, entry.actionUrl));
        }

        const cells = [
            rowDom.h('td', { class: 'table__numeric' }, entry.id !== null && entry.id !== undefined ? String(entry.id) : labels.empty),
            rowDom.h('td', null, textCellChildren),
            rowDom.h('td', null, rowDom.severityChip(entry.type)),
            rowDom.h('td', null, describeAudience(entry.filter ?? entry.audience, entry)),
            rowDom.h('td', null, entry.banner ? labels.yes : labels.no)
        ];
        if (includeRecipients) {
            cells.push(rowDom.h('td', { class: 'table__numeric' },
                entry.recipientCount !== null && entry.recipientCount !== undefined ? String(entry.recipientCount) : labels.empty));
        }
        cells.push(rowDom.h('td', null, formatTime(entry.published, labels.empty)));
        if (showExpires) {
            cells.push(rowDom.h('td', null, formatTime(entry.expires, labels.empty)));
        }
        cells.push(rowDom.h('td', null, actionCell));

        return rowDom.h('tr', {
            'data-admin-broadcasts-row': '',
            'data-broadcast-id': entry.id !== null && entry.id !== undefined ? String(entry.id) : null,
            'data-broadcast-status': entry.retracted ? 'retracted' : 'active'
        }, cells);
    }

    /**
     * Build the rendered history nodes for the loaded and filtered entries.
     * @returns {HTMLElement[]} history body children
     */
    function buildHistoryView() {
        historyRowDom?.destroy();
        historyRowDom = createDomBuilders(doc);

        const all = historyEntries ?? [];
        if (all.length === 0) {
            filteredEntries = [];
            return [dom.emptyState(labels.emptyNone, null, { 'data-admin-broadcasts-empty': 'none' })];
        }

        const current = tableState.getState().filters;
        const rows = filterBroadcastHistory(all, current);
        filteredEntries = rows;

        if (rows.length === 0) {
            const clearButton = dom.button(labels.clearFilters, () => {
                tableState.resetFilters();
                historyQuery.focus();
            }, {
                kind: 'quiet',
                'data-admin-broadcasts-action': 'clear'
            });
            return [dom.emptyState(labels.emptyFiltered, clearButton, { 'data-admin-broadcasts-empty': 'filtered' })];
        }

        const includeRecipients = showRecipientsColumn === true
            || (showRecipientsColumn === 'auto' && all.some((entry) => entry.recipientCount !== null && entry.recipientCount !== undefined));

        const columns = [
            { label: labels.colId, numeric: true },
            labels.colMessage,
            labels.colType,
            labels.colAudience,
            labels.colBanner
        ];
        if (includeRecipients) {
            columns.push({ label: labels.colRecipients, numeric: true });
        }
        columns.push(labels.colPublished);
        if (showExpires) {
            columns.push(labels.colExpires);
        }
        columns.push(labels.colAction);

        const visible = rows.slice(0, shownCount);
        const remaining = rows.length - visible.length;
        const moreButton = remaining > 0
            ? dom.h('div', null, dom.button(labels.showMore(Math.min(historyStep, remaining)), () => {
                shownCount += historyStep;
                renderHistory();
            }, { 'data-admin-broadcasts-action': 'more' }))
            : null;

        return [
            historyRowDom.dataTable(
                labels.historyCaption,
                columns,
                visible.map((entry) => buildHistoryRow(entry, historyRowDom, includeRecipients)),
                { 'data-admin-broadcasts-table': '' }
            ),
            moreButton
        ].filter(Boolean);
    }

    /** Re-render the history table from loaded entries without refetching. */
    function renderHistory() {
        if (destroyed || historyEntries === null) {
            return;
        }
        dom.setChildren(historyBody, buildHistoryView());
    }

    /**
     * Load broadcast history via `adapter.fetchHistory` and render the table.
     * @param {{quiet?: boolean}} [callOptions] `quiet: true` keeps the current table under `aria-busy`
     * @returns {Promise<boolean>} `true` when history rendered
     */
    async function refresh(callOptions = {}) {
        if (destroyed) {
            return false;
        }
        const ok = await historyLoader.load({
            quiet: Boolean(callOptions?.quiet),
            fetcher: ({ signal }) => adapter.fetchHistory({ signal: combineSignals(signal, options.signal) }),
            render: (rawData) => {
                historyEntries = normalizeBroadcastHistory(rawData);
                return buildHistoryView();
            }
        });
        if (!ok && !destroyed && historyBody.querySelector('[data-data-loader-error]')) {
            historyEntries = null;
            filteredEntries = [];
            historyRowDom?.destroy();
            historyRowDom = null;
        }
        return ok;
    }

    /** Cancel active loads and release all listeners, field controllers, and inline confirmations. */
    function destroy() {
        if (destroyed) {
            return;
        }
        destroyed = true;
        form.removeEventListener('input', onFormChange);
        form.removeEventListener('change', onFormChange);
        form.removeEventListener('submit', onFormSubmit);
        audienceSelect.removeEventListener('change', onAudienceChange);
        historyLoader.destroy();
        recipientsLoader.destroy();
        tableState.destroy();
        selection?.destroy();
        selection = null;
        messageField.destroy();
        historyRowDom?.destroy();
        historyRowDom = null;
        root.removeAttribute('data-admin-broadcasts');
        options.signal?.removeEventListener('abort', destroy);
        if (ownsDom) {
            dom.destroy();
        }
    }

    const controller = {
        element: root,
        refresh,
        updatePreview,
        resetForm,
        buildPayload,
        getHistory: () => (historyEntries ? [...historyEntries] : null),
        getFilteredHistory: () => [...filteredEntries],
        getState: () => ({ ...tableState.getState(), shown: shownCount }),
        resetFilters: (callOptions) => tableState.resetFilters(callOptions),
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

    updatePreview();
    if (options.autoLoad !== false) {
        refresh();
    }

    return controller;
}

/**
 * Create a new Broadcasts screen root in an injected `Document` and attach the controller to it.
 * @param {Document|object} [docOrOptions] injected `Document` or options object
 * @param {object} [options] options passed to `attachAdminBroadcasts`
 * @returns {object} screen controller
 */
export function createAdminBroadcasts(docOrOptions = globalThis.document, options = {}) {
    if (isNode(docOrOptions) && docOrOptions.nodeType === 9) {
        const root = docOrOptions.createElement('div');
        return attachAdminBroadcasts(root, { document: docOrOptions, ...options });
    }
    const resolved = (docOrOptions && typeof docOrOptions === 'object' ? docOrOptions : options) ?? {};
    const doc = resolved.document ?? globalThis.document;
    const root = doc.createElement('div');
    return attachAdminBroadcasts(root, { document: doc, ...resolved });
}

/**
 * Build an `admin-console.js` screen descriptor for the shared Broadcasts screen.
 * @param {object} options screen and `attachAdminBroadcasts` options (`adapter`, `name`, `title`, `icon`, `badge`, ...)
 * @returns {{name: string, title: string, icon: string|Node|undefined, badge: unknown, mount: Function}}
 *   screen descriptor ready for `createAdminConsole` or `attachAdminConsole`
 */
export function createAdminBroadcastsScreen(options = {}) {
    const adapter = options?.adapter;
    if (!adapter || typeof adapter.fetchHistory !== 'function' || typeof adapter.publish !== 'function' || typeof adapter.retract !== 'function') {
        throw new TypeError('An adapter with fetchHistory, publish, and retract functions is required for admin-broadcasts.');
    }
    const {
        name = 'broadcasts',
        title = 'Broadcasts',
        icon = 'broadcast',
        badge,
        ...broadcastOptions
    } = options;

    return {
        name,
        title,
        icon,
        badge,
        mount: (view, ctx, route) => attachAdminBroadcasts(view, {
            ...broadcastOptions,
            document: broadcastOptions.document ?? view.ownerDocument,
            window: broadcastOptions.window ?? view.ownerDocument?.defaultView,
            dom: broadcastOptions.dom ?? ctx?.dom,
            onSignIn: broadcastOptions.onSignIn ?? ctx?.signIn,
            signal: broadcastOptions.signal ?? ctx?.screenSignal,
            context: ctx,
            route
        })
    };
}
