/**
 * Shared admin Sessions screen (ADR-0003).
 *
 * - Displays authentication and session tokens in a semantic data table with search, type, state,
 *   and page-size filters persisted in the URL hash via `table-state.js` (supporting client slicing
 *   and server bookmark Page envelopes).
 * - Selects revocable rows through `selection.js` using the `.selection--table` variant, with single,
 *   bulk, and expired token revocation confirmed in-place through `dom.inlineConfirm`.
 * - Protects the console's own session (matched by `currentTokenId`, `ctx.tokenId()`, `ctx.session.id`,
 *   or `token.current === true`) so it can be neither selected nor revoked.
 * - Mounts in the `admin-console.js` frame via `createAdminSessionsScreen` and uses `data-admin-sessions-*`
 *   hooks and ARIA states only.
 */

import { attachDataLoader } from './data-loader.js';
import { createDomBuilders } from './dom-builders.js';
import { attachSelection } from './selection.js';
import { attachTableState } from './table-state.js';

export const DEFAULT_TOKEN_TYPES = [
    'session',
    'one-time-code',
    'authorization',
    'change-request',
    'note-account-deleted',
    'note-account-purged'
];

export const DEFAULT_TOKEN_STATES = [
    ['', 'All states'],
    ['active', 'Active'],
    ['expired', 'Expired']
];

export const DEFAULT_TOKEN_SIZES = [20, 50, 100];
export const DEFAULT_TOKEN_SIZE = 20;

const DEFAULT_LABELS = {
    what: 'Tokens',
    noun: 'token',
    toolbarLabel: 'Filter tokens',
    searchLabel: 'Filter tokens',
    searchPlaceholder: 'Name, email, or token ID',
    typeLabel: 'Type',
    allTypes: 'All types',
    stateLabel: 'State',
    sizeLabel: 'Page size',
    removeExpired: 'Remove expired',
    removeExpiredConfirmLabel: 'Confirm removing expired tokens',
    removeExpiredConfirmText: (count) => `Remove ${plural(count, 'expired token')}? Active sessions stay signed in.`,
    removeExpiredDone: 'Expired tokens removed.',
    removeExpiredFailed: 'Expired tokens were not removed',
    selectionLegend: 'Select tokens for bulk revocation',
    bulkActionsLabel: 'Bulk actions',
    selectAllLabel: 'Select all revocable tokens on this page',
    selectTokenLabel: (token, name) => `Select token ${token.id} of ${name}`,
    ownSelectDisabled: 'Your current session cannot be selected',
    ownSession: 'Your session',
    revoke: 'Revoke',
    revokeAriaLabel: (token) => `Revoke token ${token.id}`,
    revokeConfirmLabel: (token) => `Confirm revoking token ${token.id}`,
    revokeConfirmText: (token, name) => `Revoke token ${token.id} of ${name}?`,
    revokeSingleDone: (id) => `Token ${id} revoked.`,
    revokeSingleFailed: (id) => `Token ${id} was not revoked`,
    revokeSelected: 'Revoke selected',
    revokeSelectedConfirmLabel: 'Confirm revoking the selected tokens',
    revokeSelectedConfirmText: (count) => `Revoke ${plural(count, 'selected token')}?`,
    revokeSelectedDone: (count) => `${plural(count, 'token')} revoked.`,
    revokeSelectedFailed: 'The selected tokens were not revoked',
    revokePartialFailure: (succeeded, total, failures) => `Revoked ${succeeded} of ${plural(total, 'token')}. ${failures.join('. ')}.`,
    revokeItemFailed: (id, error) => `Token ${id} failed: ${messageOf(error)}`,
    clearSelection: 'Clear selection',
    keepLabel: 'Keep',
    signIn: 'Sign in',
    caption: (size) => `Authentication and session tokens, ${size} per page`,
    pagerLabel: 'Token pages',
    colSelect: 'Select',
    colId: 'ID',
    colUser: 'User',
    colType: 'Type',
    colCreated: 'Created',
    colExpires: 'Expires',
    colState: 'State',
    colAction: 'Action',
    activeState: 'Active',
    expiredState: 'Expired',
    never: 'Never',
    empty: '—',
    emptyNone: 'There are no tokens.',
    emptyFiltered: 'No token matches these filters.',
    clearFilters: 'Clear filters'
};

const pad = (number) => String(number).padStart(2, '0');
let instanceCounter = 0;

/**
 * Format a count with its singular or plural noun.
 * @param {number} count item count
 * @param {string} singular singular noun
 * @param {string} [pluralWord] optional irregular plural
 * @returns {string} formatted phrase
 */
function plural(count, singular, pluralWord = `${singular}s`) {
    return `${count} ${count === 1 ? singular : pluralWord}`;
}

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
 * @returns {string} non-empty message text
 */
function messageOf(error) {
    if (error && typeof error === 'object' && typeof error.message === 'string' && error.message.trim()) {
        return error.message.trim();
    }
    if (typeof error === 'string' && error.trim()) {
        return error.trim();
    }
    return 'Unknown error';
}

/**
 * Resolve a static string or formatter callback.
 * @param {string|Function} entry static text or formatter function
 * @param {...unknown} args formatter arguments
 * @returns {string} formatted text
 */
function resolveText(entry, ...args) {
    return typeof entry === 'function' ? entry(...args) : String(entry ?? '');
}

/**
 * Combine an internal abort signal with an optional external cancellation signal.
 * @param {AbortSignal|undefined} primary primary signal
 * @param {AbortSignal|undefined} secondary optional outer signal
 * @returns {AbortSignal|undefined} combined signal
 */
function combineSignals(primary, secondary) {
    if (primary && secondary) {
        if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.any === 'function') {
            return AbortSignal.any([primary, secondary]);
        }
        return secondary.aborted ? secondary : primary;
    }
    return primary ?? secondary;
}

/**
 * Tell whether an error represents an HTTP 401 Unauthorized response.
 * @param {unknown} error caught error
 * @returns {boolean} `true` when `error.status === 401`
 */
function defaultIsUnauthorized(error) {
    return Boolean(error && typeof error === 'object' && error.status === 401);
}

/**
 * Tell whether a token has expired based on its explicit `expired` flag or `expiry-time` timestamp.
 * Tokens without an expiry time never expire.
 * @param {object|null|undefined} token token record
 * @param {number} [now] current time in milliseconds, `Date.now()` by default
 * @returns {boolean} `true` when the token is expired
 */
export function isTokenExpired(token, now = Date.now()) {
    if (!token || typeof token !== 'object') {
        return false;
    }
    if (typeof token.expired === 'boolean') {
        return token.expired;
    }
    const expiry = token['expiry-time'] ?? token.expiryTime ?? token.expiresAt ?? null;
    if (!expiry) {
        return false;
    }
    const timestamp = expiry instanceof Date ? expiry.getTime() : new Date(expiry).getTime();
    return !Number.isNaN(timestamp) && timestamp <= now;
}

/**
 * Tell whether a token belongs to the console's own current session.
 * Matches `token.current === true` or a token ID matching `currentTokenId`.
 * @param {object|null|undefined} token token record
 * @param {string|number|null|undefined} [currentTokenId] console's own token identifier
 * @returns {boolean} `true` when the token is the console's own session
 */
export function isOwnToken(token, currentTokenId = null) {
    if (!token || typeof token !== 'object') {
        return false;
    }
    if (token.current === true) {
        return true;
    }
    if (currentTokenId === null || currentTokenId === undefined || currentTokenId === '') {
        return false;
    }
    if (token.id === null || token.id === undefined || token.id === '') {
        return false;
    }
    return String(token.id) === String(currentTokenId);
}

/**
 * Extract the trimmed email address of a token's user across nested (`token.user.email`) and flat (`user-email`) shapes.
 * @param {object|null|undefined} token token record
 * @returns {string} trimmed email or empty string
 */
export function tokenUserEmail(token) {
    if (!token || typeof token !== 'object') {
        return '';
    }
    const raw = token.user?.email ?? token['user-email'] ?? token.userEmail ?? '';
    return typeof raw === 'string' ? raw.trim() : '';
}

/**
 * Pick the visible user label of a token, preferring trimmed name, then email, then `emptyText`.
 * @param {object|null|undefined} token token record
 * @param {string} [emptyText] fallback text when no user is attached, `'—'` by default
 * @returns {string} visible user label
 */
export function tokenUserName(token, emptyText = '—') {
    if (!token || typeof token !== 'object') {
        return emptyText;
    }
    const rawName = token.user?.name ?? token['user-name'] ?? token.userName ?? '';
    const name = typeof rawName === 'string' ? rawName.trim() : '';
    if (name) {
        return name;
    }
    const email = tokenUserEmail(token);
    return email || emptyText;
}

/**
 * Format an ISO-8601 timestamp or `Date` as local `YYYY-MM-DD HH:MM:SS`.
 * Missing values return `emptyText`; unparseable strings return verbatim.
 * @param {string|Date|number|null|undefined} value timestamp value
 * @param {string} [emptyText] fallback text when missing, `'—'` by default
 * @returns {string} formatted timestamp
 */
export function formatSessionTime(value, emptyText = '—') {
    if (value === null || value === undefined || value === '') {
        return emptyText;
    }
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) {
        return String(value);
    }
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} `
        + `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

/**
 * Normalize an `adapter.fetchTokens` response into `{ tokens, envelope }`.
 * Accepts a plain array, a server Page envelope (`{ elements, 'start-bookmark', 'end-bookmark' }`),
 * or `{ tokens }`, `{ sessions }`, or `{ items }`.
 * @param {unknown} raw adapter response
 * @returns {{tokens: object[], envelope: object|null}} normalized token list and optional server envelope
 */
export function normalizeTokensResult(raw) {
    if (Array.isArray(raw)) {
        return { tokens: raw, envelope: null };
    }
    if (raw && typeof raw === 'object') {
        if (Array.isArray(raw.elements)) {
            return { tokens: raw.elements, envelope: raw };
        }
        const list = raw.tokens ?? raw.sessions ?? raw.items;
        if (Array.isArray(list)) {
            return { tokens: list, envelope: null };
        }
    }
    return { tokens: [], envelope: null };
}

/**
 * Build a labeled toolbar `.field` wrapper around an existing control.
 * @param {object} dom DOM builders
 * @param {string} id control id
 * @param {string} label visible label text
 * @param {HTMLElement} control form control
 * @returns {HTMLElement} `.field` container
 */
function toolbarField(dom, id, label, control) {
    control.id = id;
    return dom.h('div', { class: 'field' },
        dom.h('label', { class: 'field__label', for: id }, label),
        control);
}

/**
 * Merge built-in columns with app-supplied `extraColumns`.
 * @param {object[]} baseColumns built-in column definitions
 * @param {object[]|null|undefined} extras extension column definitions
 * @returns {object[]} ordered column definitions
 */
function mergeColumns(baseColumns, extras) {
    const result = [...baseColumns];
    for (const column of extras ?? []) {
        if (!column || typeof column !== 'object') {
            continue;
        }
        if (column.position === 'before-action') {
            const actionIndex = result.findIndex((item) => item.key === 'action');
            if (actionIndex >= 0) {
                result.splice(actionIndex, 0, column);
            }
            else {
                result.push(column);
            }
        }
        else if (typeof column.position === 'number' && Number.isInteger(column.position)) {
            const clamped = Math.max(0, Math.min(result.length, column.position));
            result.splice(clamped, 0, column);
        }
        else {
            result.push(column);
        }
    }
    return result;
}

/**
 * Attach the shared admin Sessions screen to `root`.
 * @param {HTMLElement} root target container element
 * @param {object} options screen configuration
 * @param {object} options.adapter data adapter (`fetchTokens` required; optional `revokeToken`, `revokeTokens`, `revokeExpired`)
 * @param {'client'|'server'} [options.mode] paging mode, `'client'` by default
 * @param {string|number|(() => string|number|null)|null} [options.currentTokenId] console's own token ID or getter
 * @param {string[]} [options.types] token type options, `DEFAULT_TOKEN_TYPES` by default (`[]` hides type filter)
 * @param {Array<[string, string]>} [options.states] token state filter choices
 * @param {number[]} [options.sizes] page size choices
 * @param {number} [options.defaultSize] default page size
 * @param {boolean} [options.showTypeFilter] show type filter in toolbar (defaults to `types.length > 0`)
 * @param {boolean} [options.showStateFilter] show state filter in toolbar (`true` by default)
 * @param {boolean} [options.allowBulk] enable table multi-select and bulk revocation (defaults to `true` when revocation is configured)
 * @param {() => number} [options.now] clock function returning epoch milliseconds (`Date.now` by default)
 * @param {Array|Function} [options.extraColumns] extension hook adding table columns
 * @param {(token: object, filters: object, helpers: {now: number, isExpired: Function}) => boolean} [options.filterPredicate] custom row filter predicate
 * @param {(value: unknown, emptyText?: string) => string} [options.formatTime] custom timestamp formatter
 * @param {(count: number) => string} [options.formatSelectionCount] custom bulk selection count formatter
 * @param {(error: unknown) => boolean} [options.isUnauthorized] custom 401 detector
 * @param {() => void} [options.onSignIn] callback when a 401 Sign in action is clicked
 * @param {object} [options.labels] label overrides
 * @param {number} [options.debounce] search input debounce delay in milliseconds (`0` by default)
 * @param {object} [options.context] optional admin console context
 * @param {AbortSignal} [options.signal] optional lifecycle abort signal
 * @param {Document} [options.document] injected document
 * @param {Window} [options.window] injected window
 * @param {Location} [options.location] injected location
 * @param {History} [options.history] injected history
 * @param {object} [options.dom] pre-created `createDomBuilders` instance
 * @param {boolean} [options.autoLoad] automatically fetch tokens on attach (`true` by default)
 * @returns {object} Sessions screen controller
 */
export function attachAdminSessions(root, options = {}) {
    if (!root) {
        throw new TypeError('A root element is required for admin-sessions.');
    }
    const adapter = options?.adapter;
    if (!adapter || typeof adapter.fetchTokens !== 'function') {
        throw new TypeError('An adapter with a fetchTokens function is required for admin-sessions.');
    }

    const doc = options.document ?? root.ownerDocument ?? globalThis.document;
    const view = options.window ?? doc?.defaultView ?? globalThis.window ?? null;
    const ownsDom = !options.dom;
    const dom = options.dom ?? createDomBuilders(doc);
    const seed = (instanceCounter += 1);
    const labels = { ...DEFAULT_LABELS, ...options.labels };
    const mode = options.mode === 'server' ? 'server' : 'client';
    const types = Array.isArray(options.types) ? [...options.types] : [...DEFAULT_TOKEN_TYPES];
    const states = Array.isArray(options.states) && options.states.length > 0 ? options.states : DEFAULT_TOKEN_STATES;
    const sizes = Array.isArray(options.sizes) && options.sizes.length > 0 ? options.sizes : DEFAULT_TOKEN_SIZES;
    const defaultSize = options.defaultSize ?? sizes[0] ?? DEFAULT_TOKEN_SIZE;
    const showTypeFilter = options.showTypeFilter ?? types.length > 0;
    const showStateFilter = options.showStateFilter !== false;
    const canRevokeSingle = typeof adapter.revokeToken === 'function';
    const canRevokeBulk = typeof adapter.revokeTokens === 'function' || canRevokeSingle;
    const allowBulk = options.allowBulk !== undefined ? Boolean(options.allowBulk) : canRevokeBulk;
    const canRevokeExpired = typeof adapter.revokeExpired === 'function';
    const nowFn = typeof options.now === 'function' ? options.now : () => Date.now();
    const formatTime = typeof options.formatTime === 'function' ? options.formatTime : formatSessionTime;
    const isUnauthorized = typeof options.isUnauthorized === 'function' ? options.isUnauthorized : defaultIsUnauthorized;
    const onSignIn = typeof options.onSignIn === 'function'
        ? options.onSignIn
        : (typeof options.context?.signIn === 'function' ? options.context.signIn : null);

    const resolveCurrentTokenId = () => {
        if (typeof options.currentTokenId === 'function') {
            return options.currentTokenId();
        }
        if (options.currentTokenId !== undefined && options.currentTokenId !== null) {
            return options.currentTokenId;
        }
        if (typeof options.context?.tokenId === 'function') {
            return options.context.tokenId();
        }
        if (options.context?.tokenId !== undefined && options.context?.tokenId !== null) {
            return options.context.tokenId;
        }
        return options.context?.session?.id
            ?? options.context?.session?.tokenId
            ?? options.context?.session?.['token-id']
            ?? null;
    };

    const state = {
        tokens: null,
        filtered: [],
        envelope: null,
        selection: null,
        tableDom: null,
        lastTableQuery: null,
        revoking: false,
        destroyed: false
    };

    // Build toolbar controls using data-table-state-* and data-admin-sessions-* hooks.
    const filterInput = dom.h('input', {
        class: 'field__control',
        type: 'search',
        placeholder: labels.searchPlaceholder,
        autocorrect: 'off',
        autocapitalize: 'none',
        spellcheck: 'false',
        'data-table-state-filter': 'q',
        'data-admin-sessions-filter': 'q'
    });

    const typeSelect = showTypeFilter
        ? dom.select([['', labels.allTypes], ...types.map((type) => [type, type])], '', {
            'data-table-state-filter': 'type',
            'data-admin-sessions-filter': 'type'
        })
        : null;

    const stateSelect = showStateFilter
        ? dom.select(states, '', {
            'data-table-state-filter': 'state',
            'data-admin-sessions-filter': 'state'
        })
        : null;

    const sizeSelect = dom.select(sizes.map((size) => [String(size), String(size)]), String(defaultSize), {
        'data-table-state-size': '',
        'data-admin-sessions-size': ''
    });

    /**
     * Count loaded expired tokens excluding the console's own session.
     * @param {number} [now] current time in milliseconds
     * @returns {number} expired token count
     */
    function countExpired(now = nowFn()) {
        const currentId = resolveCurrentTokenId();
        return (state.tokens ?? []).filter((token) => !isOwnToken(token, currentId) && isTokenExpired(token, now)).length;
    }

    const removeExpiredButton = canRevokeExpired
        ? dom.button(labels.removeExpired, null, {
            danger: true,
            disabled: true,
            'data-admin-sessions-action': 'remove-expired'
        })
        : null;

    const removeExpiredSlot = removeExpiredButton
        ? dom.inlineConfirm(removeExpiredButton, {
            label: labels.removeExpiredConfirmLabel,
            text: () => resolveText(labels.removeExpiredConfirmText, countExpired()),
            confirmLabel: labels.removeExpired,
            cancelLabel: labels.keepLabel,
            onConfirm: () => removeExpired()
        })
        : null;

    const toolbar = dom.h('search', {
        class: 'toolbar',
        'aria-label': labels.toolbarLabel,
        'data-admin-sessions-toolbar': ''
    },
    toolbarField(dom, `admin-sessions-q-${seed}`, labels.searchLabel, filterInput),
    typeSelect ? toolbarField(dom, `admin-sessions-type-${seed}`, labels.typeLabel, typeSelect) : null,
    stateSelect ? toolbarField(dom, `admin-sessions-state-${seed}`, labels.stateLabel, stateSelect) : null,
    toolbarField(dom, `admin-sessions-size-${seed}`, labels.sizeLabel, sizeSelect),
    removeExpiredSlot);

    const banner = dom.h('div', { class: 'app__slot', 'data-admin-sessions-banner': '' });
    const notice = dom.statusLine('', { className: 'app__status', 'data-admin-sessions-notice': '' });
    const body = dom.h('div', { 'data-admin-sessions-body': '' });

    root.setAttribute('data-admin-sessions', '');
    dom.setChildren(root, toolbar, banner, notice, body);

    const filterDefs = {
        q: { default: '', trim: true }
    };
    if (showTypeFilter) {
        filterDefs.type = { default: '', values: types };
    }
    if (showStateFilter) {
        filterDefs.state = {
            default: '',
            values: states.map(([value]) => value).filter(Boolean)
        };
    }

    const tableState = attachTableState(toolbar, {
        document: doc,
        window: view,
        location: options.location,
        history: options.history,
        dom,
        mode,
        sizes,
        defaultSize,
        debounce: options.debounce ?? 0,
        filters: filterDefs,
        onChange: (_snapshot, reason) => {
            if (state.destroyed) {
                return;
            }
            if (reason === 'hashchange' && tableState.query() === state.lastTableQuery) {
                return;
            }
            if (mode === 'server' && reason === 'size') {
                refresh({ direction: 'first' });
                return;
            }
            renderTable();
        }
    });

    const listLoader = attachDataLoader(body, {
        document: doc,
        dom,
        what: labels.what,
        isUnauthorized,
        onSignIn
    });

    /** Release the active table selection controller and per-render inline confirmations. */
    function cleanupTableResources() {
        if (state.selection) {
            state.selection.destroy();
            state.selection = null;
        }
        if (state.tableDom) {
            state.tableDom.destroy();
            state.tableDom = null;
        }
    }

    /** Update the Remove expired button disabled state from the loaded tokens. */
    function syncRemoveExpiredButton(now = nowFn()) {
        if (!removeExpiredButton) {
            return;
        }
        removeExpiredButton.disabled = state.revoking || state.tokens === null || countExpired(now) === 0;
    }

    /**
     * Filter loaded tokens using the active query, type, and state filters.
     * @param {object[]} all loaded tokens
     * @param {Record<string, unknown>} filters active filter snapshot
     * @param {number} now current epoch milliseconds
     * @returns {object[]} matching tokens
     */
    function applyFilters(all, filters, now) {
        if (typeof options.filterPredicate === 'function') {
            return all.filter((token) => options.filterPredicate(token, filters, { now, isExpired: isTokenExpired }));
        }
        const needle = String(filters.q ?? '').trim().toLowerCase();
        const typeFilter = showTypeFilter ? String(filters.type ?? '') : '';
        const stateFilter = showStateFilter ? String(filters.state ?? '') : '';
        return all.filter((token) => {
            if (needle) {
                const name = tokenUserName(token, '').toLowerCase();
                const email = tokenUserEmail(token).toLowerCase();
                const idText = String(token.id ?? '').toLowerCase();
                if (!`${name} ${email}`.includes(needle) && idText !== needle) {
                    return false;
                }
            }
            if (typeFilter && String(token.type ?? 'session') !== typeFilter) {
                return false;
            }
            if (stateFilter && (stateFilter === 'expired') !== isTokenExpired(token, now)) {
                return false;
            }
            return true;
        });
    }

    /**
     * Build the User cell content for a token across nested and flat user shapes.
     * @param {object} tDom per-render DOM builders
     * @param {object} token token record
     * @returns {unknown} cell content
     */
    function buildUserCell(tDom, token) {
        const name = tokenUserName(token, '');
        const email = tokenUserEmail(token);
        if (!name && !email) {
            return labels.empty;
        }
        if (name && email && name !== email) {
            return [tDom.h('strong', null, name), tDom.h('br'), tDom.h('span', { 'data-admin-sessions-email': '' }, email)];
        }
        return tDom.h('strong', null, name || email);
    }

    /**
     * Build the Action cell for a token, protecting the console's own session from revocation.
     * @param {object} tDom per-render DOM builders
     * @param {object} token token record
     * @param {boolean} own true when the token is the console's own session
     * @param {string} name visible user label
     * @returns {unknown} cell content
     */
    function buildActionCell(tDom, token, own, name) {
        const revokeButton = tDom.button(labels.revoke, null, {
            danger: true,
            small: true,
            disabled: own || !canRevokeSingle,
            'aria-label': resolveText(labels.revokeAriaLabel, token),
            'data-admin-sessions-action': 'revoke',
            'data-token-id': String(token.id)
        });
        if (own) {
            return [tDom.h('span', { 'data-admin-sessions-own': '' }, labels.ownSession), ' ', revokeButton];
        }
        if (!canRevokeSingle) {
            return revokeButton;
        }
        return tDom.inlineConfirm(revokeButton, {
            label: resolveText(labels.revokeConfirmLabel, token),
            text: resolveText(labels.revokeConfirmText, token, name),
            confirmLabel: labels.revoke,
            cancelLabel: labels.keepLabel,
            onConfirm: () => runRevocation(
                () => performRevoke([String(token.id)]),
                resolveText(labels.revokeSingleFailed, token.id)
            )
        });
    }

    /**
     * Run a revocation action, display the resulting status or error banner, and reload quietly.
     * @param {() => Promise<string|null>} action async revocation action returning status message or `null` when skipped
     * @param {string} failedPrefix error message prefix on non-partial failures
     * @returns {Promise<boolean>} `true` when the action succeeded without error
     */
    async function runRevocation(action, failedPrefix) {
        if (state.destroyed || state.revoking) {
            return false;
        }
        state.revoking = true;
        syncRemoveExpiredButton();
        dom.setChildren(banner);
        notice.textContent = '';
        let succeeded = false;
        try {
            const message = await action();
            if (state.destroyed) {
                return false;
            }
            if (message === null) {
                return false;
            }
            notice.textContent = message;
            succeeded = true;
        }
        catch (error) {
            if (state.destroyed) {
                return false;
            }
            const unauthorized = Boolean(isUnauthorized(error));
            const rawText = error?.partial
                ? error.message
                : `${failedPrefix}: ${messageOf(error)}.${unauthorized ? ' Sign in again.' : ''}`;
            const signInAction = unauthorized && onSignIn
                ? dom.button(labels.signIn, () => onSignIn(error), { kind: 'primary', 'data-admin-sessions-action': 'sign-in' })
                : null;
            dom.setChildren(banner, dom.errorBanner(rawText, signInAction));
        }
        finally {
            state.revoking = false;
            syncRemoveExpiredButton();
        }
        if (!state.destroyed) {
            await refresh({ quiet: true });
        }
        return succeeded;
    }

    /**
     * Revoke one or more token IDs while refusing the console's own session.
     * Uses `adapter.revokeTokens` for multi-token batch requests when provided, otherwise calls
     * `adapter.revokeToken` sequentially and collects any partial failures.
     * @param {Array<string|number>} rawIds token IDs to revoke
     * @returns {Promise<string|null>} polite status notice or `null` when no revocable IDs remained
     */
    async function performRevoke(rawIds) {
        const currentId = resolveCurrentTokenId();
        const tokenMap = new Map((state.tokens ?? []).map((token) => [String(token.id), token]));
        const revocable = [];
        const seen = new Set();
        for (const rawId of rawIds ?? []) {
            const id = String(rawId);
            if (!id || seen.has(id)) {
                continue;
            }
            const token = tokenMap.get(id) ?? { id };
            if (isOwnToken(token, currentId)) {
                continue;
            }
            seen.add(id);
            revocable.push({ id, token });
        }
        if (revocable.length === 0) {
            return null;
        }
        const ids = revocable.map((entry) => entry.id);
        const tokens = revocable.map((entry) => entry.token);
        if (ids.length > 1 && typeof adapter.revokeTokens === 'function') {
            await adapter.revokeTokens(ids, tokens, { signal: options.signal });
            return resolveText(labels.revokeSelectedDone, ids.length);
        }
        if (!canRevokeSingle) {
            if (typeof adapter.revokeTokens === 'function') {
                await adapter.revokeTokens(ids, tokens, { signal: options.signal });
                return ids.length === 1
                    ? resolveText(labels.revokeSingleDone, ids[0])
                    : resolveText(labels.revokeSelectedDone, ids.length);
            }
            return null;
        }
        if (ids.length === 1) {
            await adapter.revokeToken(ids[0], tokens[0], { signal: options.signal });
            return resolveText(labels.revokeSingleDone, ids[0]);
        }
        const failures = [];
        for (const entry of revocable) {
            try {
                await adapter.revokeToken(entry.id, entry.token, { signal: options.signal });
            }
            catch (error) {
                failures.push(resolveText(labels.revokeItemFailed, entry.id, error));
            }
        }
        if (failures.length > 0) {
            const error = new Error(resolveText(labels.revokePartialFailure, ids.length - failures.length, ids.length, failures));
            error.partial = true;
            throw error;
        }
        return resolveText(labels.revokeSelectedDone, ids.length);
    }

    /**
     * Programmatically revoke one or more token IDs (protecting the console's own session).
     * @param {Array<string|number>} ids token IDs to revoke
     * @returns {Promise<boolean>} `true` when revocation succeeded
     */
    function revoke(ids) {
        const list = Array.isArray(ids) ? ids : [ids];
        const currentId = resolveCurrentTokenId();
        const tokenMap = new Map((state.tokens ?? []).map((token) => [String(token.id), token]));
        const hasRevocable = list.some((rawId) => {
            const id = String(rawId);
            return id && !isOwnToken(tokenMap.get(id) ?? { id }, currentId);
        });
        if (!hasRevocable) {
            return Promise.resolve(false);
        }
        const failedPrefix = list.length === 1
            ? resolveText(labels.revokeSingleFailed, list[0])
            : labels.revokeSelectedFailed;
        return runRevocation(() => performRevoke(list), failedPrefix);
    }

    /**
     * Remove all expired tokens via `adapter.revokeExpired`, report status, and reload quietly.
     * @returns {Promise<boolean>} `true` when removal succeeded
     */
    function removeExpired() {
        if (!canRevokeExpired) {
            return Promise.resolve(false);
        }
        return runRevocation(async () => {
            await adapter.revokeExpired({ signal: options.signal });
            return labels.removeExpiredDone;
        }, labels.removeExpiredFailed);
    }

    /**
     * Build the selection fieldset, data table, and pager for the currently loaded tokens.
     * @returns {HTMLElement[]} rendered body nodes
     */
    function buildTableView() {
        cleanupTableResources();
        const now = nowFn();
        const currentId = resolveCurrentTokenId();
        const all = state.tokens ?? [];
        syncRemoveExpiredButton(now);

        if (all.length === 0) {
            state.filtered = [];
            return [dom.emptyState(labels.emptyNone, null, { 'data-admin-sessions-empty': 'none' })];
        }

        const snapshot = tableState.getState();
        const filtered = applyFilters(all, snapshot.filters, now);
        state.filtered = filtered;

        if (filtered.length === 0) {
            const clearButton = dom.button(labels.clearFilters, () => tableState.resetFilters(), {
                kind: 'quiet',
                'data-admin-sessions-action': 'clear-filters'
            });
            return [dom.emptyState(labels.emptyFiltered, clearButton, { 'data-admin-sessions-empty': 'filtered' })];
        }

        const cut = mode === 'client' ? tableState.slice(filtered) : null;
        const pageRows = mode === 'client' ? cut.rows : filtered;
        const tDom = createDomBuilders(doc);
        state.tableDom = tDom;

        const baseColumns = [
            ...(allowBulk ? [{
                key: 'select',
                label: labels.colSelect,
                headerContent: tDom.h('label', { class: 'selection__cell' },
                    tDom.h('input', {
                        class: 'selection__control',
                        type: 'checkbox',
                        'data-selection-all': true,
                        'aria-label': labels.selectAllLabel
                    })),
                cell: (token, { own, name }) => tDom.h('label', { class: 'selection__cell' },
                    tDom.h('input', {
                        class: 'selection__control',
                        type: 'checkbox',
                        value: String(token.id),
                        disabled: own,
                        'data-selection-item': true,
                        'aria-label': own
                            ? labels.ownSelectDisabled
                            : resolveText(labels.selectTokenLabel, token, name)
                    }))
            }] : []),
            {
                key: 'id',
                label: labels.colId,
                numeric: true,
                cell: (token) => String(token.id ?? '')
            },
            {
                key: 'user',
                label: labels.colUser,
                cell: (token) => buildUserCell(tDom, token)
            },
            {
                key: 'type',
                label: labels.colType,
                cell: (token) => tDom.h('span', { class: 'chip' }, token.type ?? 'session')
            },
            {
                key: 'created',
                label: labels.colCreated,
                cell: (token) => formatTime(token['creation-time'] ?? token.creationTime ?? token.createdAt, labels.empty)
            },
            {
                key: 'expires',
                label: labels.colExpires,
                cell: (token) => formatTime(token['expiry-time'] ?? token.expiryTime ?? token.expiresAt, labels.never)
            },
            {
                key: 'state',
                label: labels.colState,
                cell: (token, { expired }) => (expired
                    ? tDom.severityChip('warning', labels.expiredState)
                    : labels.activeState),
                cellProps: (_token, { expired }) => ({ 'data-admin-sessions-state': expired ? 'expired' : 'active' })
            },
            ...(canRevokeSingle ? [{
                key: 'action',
                label: labels.colAction,
                cell: (token, { own, name }) => buildActionCell(tDom, token, own, name)
            }] : [])
        ];

        const extraColumnSpecs = typeof options.extraColumns === 'function'
            ? options.extraColumns({ tokens: all, rows: pageRows, dom: tDom, formatTime, isExpired: isTokenExpired, context: options.context })
            : options.extraColumns;
        const columns = mergeColumns(baseColumns, extraColumnSpecs);

        const rows = pageRows.map((token) => {
            const own = isOwnToken(token, currentId);
            const expired = isTokenExpired(token, now);
            const name = tokenUserName(token, labels.empty);
            const cellHelpers = {
                dom: tDom,
                own,
                expired,
                name,
                now,
                formatTime,
                isExpired: isTokenExpired,
                context: options.context
            };
            const cells = columns.map((column) => {
                const value = typeof column.cell === 'function' ? column.cell(token, cellHelpers) : null;
                if (isNode(value) && (value.tagName === 'TD' || value.tagName === 'TH')) {
                    return value;
                }
                const extraProps = typeof column.cellProps === 'function' ? column.cellProps(token, cellHelpers) : null;
                const cellClass = [column.numeric ? 'table__numeric' : '', column.className ?? ''].filter(Boolean).join(' ') || null;
                return tDom.h('td', { class: cellClass, ...extraProps }, value);
            });
            return tDom.h('tr', {
                'data-admin-sessions-row': '',
                'data-token-id': String(token.id ?? '')
            }, cells);
        });

        const tableEl = tDom.dataTable(
            resolveText(labels.caption, snapshot.size),
            columns.map((column) => ({
                label: column.label,
                numeric: Boolean(column.numeric),
                className: column.className ?? '',
                content: column.headerContent
            })),
            rows,
            { 'data-admin-sessions-table': '' }
        );

        let contentEl = tableEl;
        if (allowBulk) {
            const revokeSelectedButton = tDom.button(labels.revokeSelected, null, {
                danger: true,
                kind: 'primary',
                'data-admin-sessions-action': 'revoke-selected'
            });
            const bulkConfirmSlot = tDom.inlineConfirm(revokeSelectedButton, {
                label: labels.revokeSelectedConfirmLabel,
                text: () => resolveText(labels.revokeSelectedConfirmText, state.selection?.selectedValues.length ?? 0),
                confirmLabel: labels.revokeSelected,
                cancelLabel: labels.keepLabel,
                onConfirm: () => {
                    const selectedIds = state.selection ? [...state.selection.selectedValues] : [];
                    return runRevocation(() => performRevoke(selectedIds), labels.revokeSelectedFailed);
                }
            });
            const fieldset = tDom.h('fieldset', {
                class: 'selection selection--table',
                'data-selection-root': true,
                tabindex: '-1'
            },
            tDom.h('legend', { class: 'visually-hidden' }, labels.selectionLegend),
            tDom.h('div', {
                class: 'selection__bar',
                'data-selection-bar': true,
                role: 'group',
                'aria-label': labels.bulkActionsLabel,
                hidden: true
            },
            tDom.h('p', {
                class: 'selection__count',
                'data-selection-count': true,
                role: 'status',
                'aria-live': 'polite',
                'aria-atomic': 'true'
            }),
            bulkConfirmSlot,
            tDom.button(labels.clearSelection, null, { 'data-selection-clear': true })),
            tableEl);
            state.selection = attachSelection(fieldset, options.formatSelectionCount ? { formatCount: options.formatSelectionCount } : undefined);
            contentEl = fieldset;
        }

        const pagerEl = mode === 'server'
            ? tableState.createPager({
                envelope: state.envelope,
                shown: pageRows.length,
                noun: labels.noun,
                label: labels.pagerLabel,
                onPage: ({ direction }) => refresh({ direction })
            })
            : tableState.createPager({
                cut,
                shown: filtered.length,
                loaded: all.length,
                noun: labels.noun,
                label: labels.pagerLabel
            });

        return [contentEl, pagerEl];
    }

    /** Re-render the table from the loaded tokens without re-fetching. */
    function renderTable() {
        if (state.destroyed || state.tokens === null) {
            return;
        }
        state.lastTableQuery = tableState.query();
        dom.setChildren(body, buildTableView());
    }

    /**
     * Load tokens from `adapter.fetchTokens` and render the table.
     * @param {{quiet?: boolean, direction?: 'first'|'prev'|'next'|'last'|'current'}} [callOptions] load options
     * @returns {Promise<boolean>} `true` when the list rendered
     */
    async function refresh(callOptions = {}) {
        if (state.destroyed) {
            return false;
        }
        const direction = callOptions.direction ?? (mode === 'server' ? (state.envelope ? 'current' : 'first') : 'first');
        const requestParams = mode === 'server' ? tableState.serverParams(direction) : null;
        const ok = await listLoader.load({
            quiet: Boolean(callOptions.quiet),
            fetcher: ({ signal }) => adapter.fetchTokens({
                signal: combineSignals(signal, options.signal),
                direction,
                params: requestParams,
                size: tableState.getState().size,
                filters: tableState.getState().filters,
                state: tableState.getState()
            }),
            render: (raw) => {
                const { tokens, envelope } = normalizeTokensResult(raw);
                state.tokens = tokens;
                state.envelope = envelope;
                if (mode === 'server' && envelope) {
                    tableState.applyEnvelope(direction, envelope, requestParams);
                }
                state.lastTableQuery = tableState.query();
                return buildTableView();
            }
        });
        if (!ok && !state.destroyed && body.querySelector('[data-data-loader-error]')) {
            cleanupTableResources();
            state.tokens = null;
            state.filtered = [];
            syncRemoveExpiredButton();
        }
        return ok;
    }

    /** Cancel active requests and release all selection, table, loader, and builder resources. */
    function destroy() {
        if (state.destroyed) {
            return;
        }
        state.destroyed = true;
        cleanupTableResources();
        listLoader.destroy();
        tableState.destroy();
        root.removeAttribute('data-admin-sessions');
        options.signal?.removeEventListener('abort', destroy);
        if (ownsDom) {
            dom.destroy();
        }
    }

    const controller = {
        element: root,
        refresh,
        revoke,
        removeExpired,
        getTokens: () => (state.tokens ? [...state.tokens] : null),
        getFilteredTokens: () => [...state.filtered],
        getSelectedIds: () => (state.selection ? [...state.selection.selectedValues] : []),
        getExpiredCount: () => countExpired(),
        getState: () => tableState.getState(),
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

    if (options.autoLoad !== false) {
        refresh();
    }

    return controller;
}

/**
 * Create a new Sessions screen root in an injected `Document` and attach the controller to it.
 * @param {Document|object} [docOrOptions] injected `Document` or options object
 * @param {object} [options] options passed to `attachAdminSessions`
 * @returns {object} Sessions screen controller
 */
export function createAdminSessions(docOrOptions = globalThis.document, options = {}) {
    if (isNode(docOrOptions) && docOrOptions.nodeType === 9) {
        const root = docOrOptions.createElement('div');
        return attachAdminSessions(root, { document: docOrOptions, ...options });
    }
    const resolved = (docOrOptions && typeof docOrOptions === 'object' ? docOrOptions : options) ?? {};
    const doc = resolved.document ?? globalThis.document;
    const root = doc.createElement('div');
    return attachAdminSessions(root, { document: doc, ...resolved });
}

/**
 * Build an `admin-console.js` screen descriptor for the shared Sessions screen.
 * @param {object} options screen and `attachAdminSessions` options (`adapter`, `name`, `title`, `icon`, `badge`, ...)
 * @returns {{name: string, title: string, icon: string|Node|undefined, badge: unknown, mount: Function}}
 *   screen descriptor ready for `createAdminConsole` or `attachAdminConsole`
 */
export function createAdminSessionsScreen(options = {}) {
    const adapter = options?.adapter;
    if (!adapter || typeof adapter.fetchTokens !== 'function') {
        throw new TypeError('An adapter with a fetchTokens function is required for admin-sessions.');
    }
    const {
        name = 'sessions',
        title = 'Sessions',
        icon = 'sessions',
        badge,
        ...sessionOptions
    } = options;

    return {
        name,
        title,
        icon,
        badge,
        mount: (view, ctx) => attachAdminSessions(view, {
            ...sessionOptions,
            document: sessionOptions.document ?? view.ownerDocument,
            window: sessionOptions.window ?? view.ownerDocument?.defaultView,
            dom: sessionOptions.dom ?? ctx?.dom,
            onSignIn: sessionOptions.onSignIn ?? ctx?.signIn,
            signal: sessionOptions.signal ?? ctx?.screenSignal,
            context: ctx
        })
    };
}
