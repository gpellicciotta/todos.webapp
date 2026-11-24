/**
 * Shared admin Users screen (ADR-0003).
 *
 * - Displays user accounts in a semantic data table with search, realm, status, and page-size filters
 *   persisted in the URL hash via `table-state.js` (supporting both client paging and server bookmark paging).
 * - Opens a detail side panel (`.detail-panel`) for editing account fields, viewing facts, exporting account
 *   data (`file-download.js`), and confirming mark-for-deletion, restore, and permanent deletion in-place
 *   through `dom.inlineConfirm`.
 * - Opens a New user creation panel when `adapter.createUser` is supplied, validates with `field.js`, and
 *   exposes `extraColumns`, `extraFacts`, and `extraSections` extension hooks so app-specific sections
 *   (such as passwords, credentials, and application access) stay app-local.
 * - Mounts in the `admin-console.js` frame via `createAdminUsersScreen` and uses `data-admin-users-*`
 *   hooks and ARIA states only.
 */

import { attachDataLoader } from './data-loader.js';
import { createDomBuilders } from './dom-builders.js';
import { createField } from './field.js';
import { downloadJson } from './file-download.js';
import { createIcon } from './icon.js';
import { attachTableState } from './table-state.js';

export const DEFAULT_USER_REALMS = ['owner', 'admin', 'test'];
export const DEFAULT_USER_STATUSES = [
    ['', 'All statuses'],
    ['active', 'Active'],
    ['marked', 'Marked for deletion']
];
export const DEFAULT_USER_SIZES = [20, 50, 100];
export const DEFAULT_USER_SIZE = 20;
export const NEW_USER_ROUTE_ID = 'new';

const DEFAULT_LABELS = {
    what: 'Users',
    noun: 'user',
    toolbarLabel: 'Filter users',
    searchLabel: 'Filter users',
    searchPlaceholder: 'Name, email, or ID',
    realmLabel: 'Realm',
    allRealms: 'All realms',
    statusLabel: 'Status',
    sizeLabel: 'Page size',
    newUser: 'New user',
    caption: (size) => `User accounts, ${size} per page`,
    pagerLabel: 'User pages',
    colId: 'ID',
    colName: 'Name',
    colEmail: 'Email',
    colRealms: 'Realms',
    colLastActive: 'Last active',
    colStatus: 'Status',
    activeStatus: 'Active',
    markedStatus: 'Marked for deletion',
    never: 'Never',
    empty: '—',
    emptyNone: 'There are no user accounts.',
    emptyFiltered: 'No user matches these filters.',
    clearFilters: 'Clear filters',
    panelTitleFallback: 'User',
    closeDetails: 'Close user details',
    loadingUser: 'Loading user…',
    loadUserFailed: (error, unauthorized) => `The user could not be loaded: ${messageOf(error)}.${unauthorized ? ' Sign in again.' : ''}`,
    retry: 'Retry',
    signIn: 'Sign in',
    accountHeading: 'Account',
    nameLabel: 'Name',
    nameRequired: 'Enter a name.',
    emailLabel: 'Email',
    emailRequired: 'Enter an email address.',
    emailInvalid: 'Enter an email address with an @.',
    realmsLegend: 'Realms',
    ownAdminRealmHint: 'You cannot remove the admin realm from your own account.',
    saveChanges: 'Save changes',
    saved: 'Changes saved.',
    savedEmailChanged: (email) => `Changes saved. A confirmation mail was sent to ${email}; the address changes once it is confirmed.`,
    saveFailed: 'The changes were not saved',
    factsHeading: 'Facts',
    factId: 'ID',
    factRealms: 'Realms',
    factStatus: 'Status',
    factCreated: 'Created',
    factLastActive: 'Last active',
    factScheduledPurge: 'Scheduled purge',
    exportData: 'Export account data',
    exportDone: 'Account data exported.',
    exportFailed: 'The account data could not be exported',
    dangerHeading: 'Danger zone',
    ownDangerHint: 'You cannot mark or delete your own account.',
    markDelete: 'Mark for deletion',
    markDeleteConfirmLabel: 'Confirm marking for deletion',
    markDeleteConfirmText: (name) => `Mark ${name} for deletion? The account will be purged at the scheduled time unless it is restored.`,
    markDeleteDone: 'Account marked for deletion.',
    markDeleteFailed: 'The account was not marked',
    restore: 'Restore account',
    restoreConfirmLabel: 'Confirm restoring account',
    restoreConfirmText: (name) => `Restore ${name} and cancel its scheduled deletion?`,
    restoreCancelLabel: 'Cancel',
    restoreDone: 'Account restored.',
    restoreFailed: 'The account was not restored',
    deletePermanently: 'Delete permanently',
    deleteConfirmLabel: 'Confirm permanent deletion',
    deleteConfirmText: (name) => `Delete ${name} and all their data now? This cannot be undone.`,
    deleteFailed: 'The account was not deleted',
    keepLabel: 'Keep',
    createHeading: 'New user',
    closeCreate: 'Close the New user panel',
    createNameLabel: 'Name (optional)',
    createNamePlaceholder: 'Display name',
    createPasswordLabel: 'Initial password (optional)',
    createWelcomeLabel: 'Send welcome email',
    createCancel: 'Cancel',
    createSubmit: 'Create user',
    createFailed: 'The account was not created'
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
 * Tell whether a user account is marked for deletion across `expiry-time`, `deletion-time`, and `deleted` fields.
 * @param {object|null|undefined} user account record
 * @returns {boolean} `true` when the account has a scheduled deletion or `deleted` flag
 */
export function isUserMarked(user) {
    return Boolean(user && (user['expiry-time'] || user['deletion-time'] || user.deleted));
}

/**
 * Pick the display name for a user account, preferring trimmed `name` and falling back to `email`.
 * @param {object|null|undefined} user account record
 * @returns {string} visible account name
 */
export function userDisplayName(user) {
    if (!user || typeof user !== 'object') {
        return '';
    }
    const name = typeof user.name === 'string' ? user.name.trim() : '';
    if (name) {
        return name;
    }
    return typeof user.email === 'string' ? user.email.trim() : '';
}

/**
 * Format an ISO-8601 timestamp or `Date` as local `YYYY-MM-DD HH:MM:SS`.
 * Missing values return `emptyText`; unparseable strings return verbatim.
 * @param {string|Date|number|null|undefined} value timestamp value
 * @param {string} [emptyText] fallback text when missing, `'—'` by default
 * @returns {string} formatted timestamp
 */
export function formatUserTime(value, emptyText = '—') {
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
 * Normalize an `adapter.fetchUsers` response into `{ users, envelope }`.
 * Accepts a plain array, a server Page envelope (`{ elements, 'start-bookmark', 'end-bookmark' }`),
 * or `{ users: [...] }`.
 * @param {unknown} raw adapter response
 * @returns {{users: object[], envelope: object|null}} normalized user rows and optional server envelope
 */
export function normalizeUsersResult(raw) {
    if (Array.isArray(raw)) {
        return { users: raw, envelope: null };
    }
    if (raw && typeof raw === 'object') {
        if (Array.isArray(raw.elements)) {
            return { users: raw.elements, envelope: raw };
        }
        if (Array.isArray(raw.users)) {
            return { users: raw.users, envelope: null };
        }
    }
    return { users: [], envelope: null };
}

/**
 * Unwrap an `adapter.fetchUser` response into `{ user, data }`.
 * Supports returning either a plain user object or a bundle `{ user, ...extra }`.
 * @param {unknown} raw adapter response
 * @returns {{user: object, data: object}} unwrapped user and full detail bundle
 */
function unwrapUserDetail(raw) {
    if (raw && typeof raw === 'object' && raw.user && typeof raw.user === 'object' && !Array.isArray(raw.user)) {
        return { user: raw.user, data: raw };
    }
    return { user: raw, data: { user: raw } };
}

/**
 * Build realm chips separated by spaces so assistive technology reads them as separate words.
 * @param {object} dom DOM builders
 * @param {object} user account record
 * @returns {Array<Node|string|null>} chip nodes
 */
function buildRealmChips(dom, user) {
    return (user?.realms ?? []).flatMap((realm, index) => [index ? ' ' : null, dom.h('span', { class: 'chip' }, realm)]);
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
 * @param {object[]} extras extension column definitions
 * @returns {object[]} ordered column definitions
 */
function mergeColumns(baseColumns, extras) {
    const result = [...baseColumns];
    for (const column of extras ?? []) {
        if (!column || typeof column !== 'object') {
            continue;
        }
        if (column.position === 'before-status') {
            const statusIndex = result.findIndex((item) => item.key === 'status');
            if (statusIndex >= 0) {
                result.splice(statusIndex, 0, column);
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
 * Attach the shared admin Users screen to `root`.
 * @param {HTMLElement} root target container element
 * @param {object} options screen configuration
 * @param {object} options.adapter data adapter (`fetchUsers` required; optional `fetchUser`, `updateUser`, `createUser`, `markUserForDeletion`, `restoreUser`, `deleteUser`, `exportUserData`)
 * @param {HTMLElement} [options.panel] side panel host element (defaults to `context.panel`, `context.editor`, or an internal panel)
 * @param {string} [options.routeName] route segment name, `'users'` by default
 * @param {string} [options.newRouteId] route id for creation, `'new'` by default
 * @param {'client'|'server'} [options.mode] paging mode, `'client'` by default
 * @param {string[]} [options.realms] realm options, `DEFAULT_USER_REALMS` by default (`[]` disables realm column/filter/editor)
 * @param {string} [options.adminRealm] realm guarded on own account, `'admin'` by default
 * @param {Array<[string, string]>} [options.statuses] status filter choices
 * @param {number[]} [options.sizes] page size choices
 * @param {number} [options.defaultSize] default page size
 * @param {boolean} [options.showRealms] show realm column, filter, and checkboxes (defaults to `realms.length > 0`)
 * @param {boolean} [options.showRealmFilter] show realm filter in toolbar (defaults to `showRealms`)
 * @param {boolean} [options.showRealmEditor] show realm checkboxes in detail panel (defaults to `showRealms`)
 * @param {boolean} [options.showStatusFilter] show status filter in toolbar (`true` by default)
 * @param {boolean} [options.showCreateName] show Name field in New user panel (`true` by default)
 * @param {boolean} [options.showCreatePassword] show Initial password field in New user panel (`true` by default)
 * @param {boolean} [options.showCreateWelcome] show Send welcome email checkbox (`true` by default)
 * @param {boolean} [options.alwaysSendEmail] include `email` in `updateUser` payload even when unchanged (`false` by default)
 * @param {string|number|null} [options.currentUserId] signed-in administrator's user ID for own-account guards
 * @param {object|null} [options.me] signed-in account object fallback for `currentUserId`
 * @param {Array|Function} [options.extraColumns] extension hook adding table columns
 * @param {Array|Function} [options.extraFacts] extension hook adding Facts `<dl>` rows
 * @param {Array|Function} [options.extraSections] extension hook adding detail panel sections
 * @param {(user: object, filters: object) => boolean} [options.filterPredicate] custom row filter predicate
 * @param {(value: unknown, emptyText?: string) => string} [options.formatTime] custom timestamp formatter
 * @param {(error: unknown) => boolean} [options.isUnauthorized] custom 401 detector
 * @param {(hash: string) => void} [options.navigate] hash navigation callback
 * @param {() => void} [options.onSignIn] callback when a 401 Sign in action is clicked
 * @param {object} [options.labels] label overrides
 * @param {object} [options.downloadOptions] options forwarded to `downloadJson` for account export
 * @param {object} [options.route] initial route `{ id }`
 * @param {object} [options.context] optional admin console context
 * @param {AbortSignal} [options.signal] optional lifecycle abort signal
 * @param {Document} [options.document] injected document
 * @param {Window} [options.window] injected window
 * @param {Location} [options.location] injected location
 * @param {History} [options.history] injected history
 * @param {object} [options.dom] pre-created `createDomBuilders` instance
 * @param {boolean} [options.autoLoad] automatically fetch users on attach (`true` by default)
 * @returns {object} Users screen controller
 */
export function attachAdminUsers(root, options = {}) {
    if (!root) {
        throw new TypeError('A root element is required for admin-users.');
    }
    const adapter = options?.adapter;
    if (!adapter || typeof adapter.fetchUsers !== 'function') {
        throw new TypeError('An adapter with a fetchUsers function is required for admin-users.');
    }

    const doc = options.document ?? root.ownerDocument ?? globalThis.document;
    const view = options.window ?? doc?.defaultView ?? globalThis.window ?? null;
    const ownsDom = !options.dom;
    const dom = options.dom ?? createDomBuilders(doc);
    const seed = (instanceCounter += 1);
    const labels = { ...DEFAULT_LABELS, ...options.labels };
    const mode = options.mode === 'server' ? 'server' : 'client';
    const routeName = options.routeName ?? 'users';
    const newRouteId = options.newRouteId ?? NEW_USER_ROUTE_ID;
    const realms = Array.isArray(options.realms) ? [...options.realms] : [...DEFAULT_USER_REALMS];
    const adminRealm = options.adminRealm ?? 'admin';
    const statuses = Array.isArray(options.statuses) && options.statuses.length > 0 ? options.statuses : DEFAULT_USER_STATUSES;
    const sizes = Array.isArray(options.sizes) && options.sizes.length > 0 ? options.sizes : DEFAULT_USER_SIZES;
    const defaultSize = options.defaultSize ?? sizes[0] ?? DEFAULT_USER_SIZE;
    const showRealms = options.showRealms ?? realms.length > 0;
    const showRealmFilter = options.showRealmFilter ?? showRealms;
    const showRealmEditor = options.showRealmEditor ?? showRealms;
    const showStatusFilter = options.showStatusFilter !== false;
    const showCreateName = options.showCreateName !== false;
    const showCreatePassword = options.showCreatePassword !== false;
    const showCreateWelcome = options.showCreateWelcome !== false;
    const canCreate = typeof adapter.createUser === 'function';
    const formatTime = typeof options.formatTime === 'function' ? options.formatTime : formatUserTime;
    const isUnauthorized = typeof options.isUnauthorized === 'function' ? options.isUnauthorized : defaultIsUnauthorized;
    const onSignIn = typeof options.onSignIn === 'function'
        ? options.onSignIn
        : (typeof options.context?.signIn === 'function' ? options.context.signIn : null);
    const navCallback = typeof options.navigate === 'function'
        ? options.navigate
        : (typeof options.context?.navigate === 'function' ? options.context.navigate : null);

    let panelHost = options.panel ?? options.context?.panel ?? options.context?.editor ?? null;
    let ownsPanelHost = false;
    if (!panelHost) {
        panelHost = dom.h('aside', {
            class: 'app__side-panel',
            hidden: true,
            'data-admin-users-panel-host': ''
        });
        ownsPanelHost = true;
    }

    const resolveCurrentUserId = () => {
        const candidate = options.currentUserId
            ?? options.me?.id
            ?? options.context?.me?.id
            ?? options.context?.account?.id
            ?? null;
        return candidate === null || candidate === undefined ? null : String(candidate);
    };

    const state = {
        users: null,
        filtered: [],
        envelope: null,
        selected: null,
        returnFocus: null,
        lastTableQuery: null,
        panelRun: 0,
        panelAbort: null,
        panelDom: null,
        panelCleanups: new Set(),
        destroyed: false
    };

    const knownUsers = new Map();

    // Build toolbar controls using data-table-state-* and data-admin-users-* hooks.
    const filterInput = dom.h('input', {
        class: 'field__control',
        type: 'search',
        placeholder: labels.searchPlaceholder,
        autocorrect: 'off',
        autocapitalize: 'none',
        spellcheck: 'false',
        'data-table-state-filter': 'q',
        'data-admin-users-filter': 'q'
    });

    const realmSelect = showRealmFilter
        ? dom.select([['', labels.allRealms], ...realms.map((realm) => [realm, realm])], '', {
            'data-table-state-filter': 'realm',
            'data-admin-users-filter': 'realm'
        })
        : null;

    const statusSelect = showStatusFilter
        ? dom.select(statuses, '', {
            'data-table-state-filter': 'status',
            'data-admin-users-filter': 'status'
        })
        : null;

    const sizeSelect = dom.select(sizes.map((size) => [String(size), String(size)]), String(defaultSize), {
        'data-table-state-size': '',
        'data-admin-users-size': ''
    });

    const newButton = canCreate
        ? dom.button(labels.newUser, () => requestOpen(newRouteId), {
            icon: 'plus',
            'data-admin-users-action': 'new'
        })
        : null;

    const toolbar = dom.h('search', {
        class: 'toolbar',
        'aria-label': labels.toolbarLabel,
        'data-admin-users-toolbar': ''
    },
    toolbarField(dom, `admin-users-q-${seed}`, labels.searchLabel, filterInput),
    realmSelect ? toolbarField(dom, `admin-users-realm-${seed}`, labels.realmLabel, realmSelect) : null,
    statusSelect ? toolbarField(dom, `admin-users-status-${seed}`, labels.statusLabel, statusSelect) : null,
    toolbarField(dom, `admin-users-size-${seed}`, labels.sizeLabel, sizeSelect),
    newButton);

    const body = dom.h('div', { 'data-admin-users-body': '' });

    root.setAttribute('data-admin-users', '');
    dom.setChildren(root, toolbar, body, ownsPanelHost ? panelHost : null);

    const filterDefs = {
        q: { default: '', trim: true }
    };
    if (showRealmFilter) {
        filterDefs.realm = { default: '', values: realms };
    }
    if (showStatusFilter) {
        filterDefs.status = {
            default: '',
            values: statuses.map(([value]) => value).filter(Boolean)
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
        },
        onPage: ({ direction }) => {
            if (!state.destroyed && mode === 'server') {
                refresh({ direction });
            }
        }
    });

    const listLoader = attachDataLoader(body, {
        document: doc,
        dom,
        what: labels.what,
        onSignIn,
        isUnauthorized,
        retryLabel: labels.retry,
        signInLabel: labels.signIn
    });

    /**
     * Build the current URL hash query string from `tableState`.
     * @returns {string} formatted `?k=v` query string or `''`
     */
    function currentQuery() {
        return tableState.query();
    }

    /**
     * Navigate to a Users route via the console router, or fall back to direct panel state updates when standalone.
     * @param {string|null} id user ID, `newRouteId`, or `null` to close
     */
    function navigateTo(id) {
        const hash = id
            ? `#/${routeName}/${encodeURIComponent(id)}${currentQuery()}`
            : `#/${routeName}${currentQuery()}`;
        if (navCallback) {
            navCallback(hash);
            return;
        }
        update({ name: routeName, id: id ? String(id) : null });
    }

    /**
     * Request opening a user detail panel or the New user panel.
     * @param {string} id user ID or `newRouteId`
     */
    function requestOpen(id) {
        if (navCallback) {
            navigateTo(id);
            return;
        }
        openPanel(String(id));
    }

    /** Close the panel and schedule focus return to the opener control. */
    function closePanel() {
        state.returnFocus = state.selected;
        navigateTo(null);
    }

    /** Clean up per-panel DOM builders, fields, and extension cleanups before replacing or hiding the panel. */
    function cleanupPanelResources() {
        for (const fn of state.panelCleanups) {
            try {
                fn();
            }
            catch {
                // Ignore individual cleanup errors during panel teardown.
            }
        }
        state.panelCleanups.clear();
        state.panelDom?.destroy();
        state.panelDom = null;
    }

    /** Abort any in-flight panel load. */
    function abortPanelLoad() {
        state.panelRun += 1;
        state.panelAbort?.abort();
        state.panelAbort = null;
    }

    /**
     * Filter a list of users against the active `tableState` filters.
     * @param {object[]} users loaded user records
     * @returns {object[]} matching users
     */
    function filterUsers(users) {
        const { filters } = tableState.getState();
        if (typeof options.filterPredicate === 'function') {
            return users.filter((user) => options.filterPredicate(user, filters));
        }
        const needle = String(filters.q ?? '').trim().toLowerCase();
        const realm = showRealmFilter ? String(filters.realm ?? '') : '';
        const status = showStatusFilter ? String(filters.status ?? '') : '';
        return users.filter((user) => {
            if (needle) {
                const haystack = `${user.name ?? ''} ${user.email ?? ''}`.toLowerCase();
                if (!haystack.includes(needle) && String(user.id) !== needle) {
                    return false;
                }
            }
            if (realm && !(user.realms ?? []).includes(realm)) {
                return false;
            }
            if (status) {
                const marked = isUserMarked(user);
                if (status === 'marked' && !marked) {
                    return false;
                }
                if (status === 'active' && marked) {
                    return false;
                }
            }
            return true;
        });
    }

    /**
     * Build the table and pager nodes from the currently loaded user records.
     * @returns {HTMLElement[]} rendered children for `body`
     */
    function buildTableView() {
        const all = state.users ?? [];
        const snapshot = tableState.getState();
        if (all.length === 0) {
            state.filtered = [];
            return [dom.emptyState(labels.emptyNone, null, { 'data-admin-users-empty': 'none' })];
        }

        const filtered = filterUsers(all);
        state.filtered = filtered;

        if (filtered.length === 0) {
            return [dom.emptyState(
                labels.emptyFiltered,
                dom.button(labels.clearFilters, () => tableState.resetFilters(), {
                    kind: 'quiet',
                    'data-admin-users-action': 'clear-filters'
                }),
                { 'data-admin-users-empty': 'filtered' }
            )];
        }

        const cut = mode === 'client' ? tableState.slice(filtered) : null;
        const pageRows = mode === 'client' ? cut.rows : filtered;
        const query = currentQuery();

        const baseColumns = [
            {
                key: 'id',
                label: labels.colId,
                numeric: true,
                cell: (user) => String(user.id ?? '')
            },
            {
                key: 'name',
                label: labels.colName,
                rowHeader: true,
                cell: (user) => {
                    const id = String(user.id);
                    const href = `#/${routeName}/${encodeURIComponent(id)}${query}`;
                    const linkProps = {
                        class: 'link-button',
                        href,
                        'data-admin-users-link': id
                    };
                    if (!navCallback) {
                        linkProps.onclick = (event) => {
                            event.preventDefault();
                            openPanel(id);
                        };
                    }
                    return dom.h('a', linkProps, userDisplayName(user));
                }
            },
            {
                key: 'email',
                label: labels.colEmail,
                cell: (user) => user.email ?? ''
            },
            ...(showRealms ? [{
                key: 'realms',
                label: labels.colRealms,
                cell: (user) => buildRealmChips(dom, user)
            }] : []),
            {
                key: 'last-active',
                label: labels.colLastActive,
                cell: (user) => formatTime(user['last-activity-time'], labels.never)
            },
            {
                key: 'status',
                label: labels.colStatus,
                cell: (user) => (isUserMarked(user)
                    ? dom.severityChip('warning', labels.markedStatus)
                    : labels.activeStatus)
            }
        ];

        const extraColumnSpecs = typeof options.extraColumns === 'function'
            ? options.extraColumns({ users: all, rows: pageRows, dom, query, formatTime, isMarked: isUserMarked, context: options.context })
            : options.extraColumns;
        const columns = mergeColumns(baseColumns, extraColumnSpecs);

        const cellHelpers = {
            dom,
            query,
            formatTime,
            isMarked: isUserMarked,
            context: options.context
        };

        const rows = pageRows.map((user) => {
            const id = String(user.id);
            knownUsers.set(id, user);
            const selected = state.selected === id;
            const cells = columns.map((column) => {
                const value = typeof column.cell === 'function' ? column.cell(user, cellHelpers) : null;
                if (isNode(value) && (value.tagName === 'TD' || value.tagName === 'TH')) {
                    return value;
                }
                if (column.rowHeader) {
                    return dom.h('th', { scope: 'row', class: column.className || null }, value);
                }
                const cellClass = [column.numeric ? 'table__numeric' : '', column.className ?? ''].filter(Boolean).join(' ') || null;
                return dom.h('td', { class: cellClass }, value);
            });
            return dom.h('tr', {
                'data-admin-users-row': '',
                'data-user-id': id,
                'aria-selected': selected ? 'true' : null
            }, cells);
        });

        const tableEl = dom.dataTable(
            resolveText(labels.caption, snapshot.size),
            columns.map((column) => ({
                label: column.label,
                numeric: Boolean(column.numeric),
                className: column.className ?? ''
            })),
            rows,
            { 'data-admin-users-table': '' }
        );

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

        return [tableEl, pagerEl];
    }

    /** Re-render the table from the loaded users without re-fetching. */
    function renderTable() {
        if (state.destroyed || state.users === null) {
            return;
        }
        const activeLinkId = doc.activeElement && body.contains(doc.activeElement)
            ? doc.activeElement.getAttribute?.('data-admin-users-link') ?? null
            : null;
        state.lastTableQuery = tableState.query();
        dom.setChildren(body, buildTableView());
        if (activeLinkId) {
            body.querySelector(`[data-admin-users-link="${activeLinkId}"]`)?.focus();
        }
    }

    /**
     * Load user accounts from `adapter.fetchUsers` and render the table.
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
            fetcher: ({ signal }) => adapter.fetchUsers({
                signal: combineSignals(signal, options.signal),
                direction,
                params: requestParams,
                size: tableState.getState().size,
                filters: tableState.getState().filters,
                state: tableState.getState()
            }),
            render: (raw) => {
                const { users, envelope } = normalizeUsersResult(raw);
                state.users = users;
                state.envelope = envelope;
                if (mode === 'server' && envelope) {
                    tableState.applyEnvelope(direction, envelope, requestParams);
                }
                for (const user of users) {
                    if (user && user.id !== undefined && user.id !== null) {
                        knownUsers.set(String(user.id), user);
                    }
                }
                state.lastTableQuery = tableState.query();
                return buildTableView();
            }
        });
        if (!ok && !state.destroyed && body.querySelector('[data-data-loader-error]')) {
            state.users = null;
            state.filtered = [];
        }
        return ok;
    }

    /**
     * Build a `.detail-panel` frame with header, focusable title, close button, and scrolling body.
     * @param {object} pDom per-panel DOM builders
     * @param {string} title panel heading text
     * @param {string} closeLabel accessible label for the close button
     * @param {...unknown} content panel body children
     * @returns {{panel: HTMLElement, titleEl: HTMLElement, titleId: string}} built frame
     */
    function buildPanelFrame(pDom, title, closeLabel, ...content) {
        const titleId = `admin-users-panel-title-${seed}`;
        const titleEl = pDom.h('h2', {
            class: 'detail-panel__title',
            id: titleId,
            tabindex: '-1',
            'data-admin-users-panel-title': ''
        }, title);
        const closeBtn = pDom.h('button', {
            class: 'icon-button',
            type: 'button',
            'aria-label': closeLabel,
            'data-admin-users-action': 'close',
            onclick: closePanel
        }, createIcon(doc, 'close'));
        const panelEl = pDom.h('div', {
            class: 'detail-panel',
            'data-admin-users-panel': ''
        },
        pDom.h('header', { class: 'detail-panel__header' }, titleEl, closeBtn),
        pDom.h('div', { class: 'detail-panel__body' }, content));
        return { panel: panelEl, titleEl, titleId };
    }

    /**
     * Mount built panel content into `panelHost` and optionally focus the panel title.
     * @param {{panel: HTMLElement, titleEl: HTMLElement, titleId: string}} frame built panel frame
     * @param {boolean} focusTitle whether to move focus to the panel heading
     */
    function showPanel(frame, focusTitle) {
        panelHost.setAttribute('aria-labelledby', frame.titleId);
        panelHost.removeAttribute('aria-label');
        panelHost.hidden = false;
        dom.setChildren(panelHost, frame.panel);
        if (focusTitle) {
            frame.titleEl.focus();
        }
    }

    /**
     * Build a validated email field using `createField` from `field.js`.
     * @param {string} id field control id
     * @param {string} name control name
     * @param {string} label visible label
     * @param {string} value initial value
     * @returns {ReturnType<typeof createField>} attached field controller
     */
    function buildEmailField(id, name, label, value) {
        const fieldCtrl = createField(doc, {
            id,
            name,
            label,
            type: 'email',
            messages: {
                valueMissing: labels.emailRequired,
                typeMismatch: labels.emailInvalid
            },
            validate: (text) => {
                const trimmed = text.trim();
                if (!trimmed) {
                    return labels.emailRequired;
                }
                return trimmed.includes('@') ? null : labels.emailInvalid;
            }
        });
        fieldCtrl.control.value = value ?? '';
        fieldCtrl.control.required = true;
        fieldCtrl.control.autocomplete = 'off';
        fieldCtrl.control.setAttribute('inputmode', 'email');
        fieldCtrl.control.setAttribute('autocorrect', 'off');
        fieldCtrl.control.setAttribute('autocapitalize', 'none');
        fieldCtrl.control.setAttribute('spellcheck', 'false');
        fieldCtrl.control.setAttribute('data-admin-users-input', 'email');
        state.panelCleanups.add(() => fieldCtrl.destroy());
        return fieldCtrl;
    }

    /**
     * Open the panel for a route ID: either the New user creation panel or a user detail panel.
     * @param {string} id user ID or `newRouteId`
     */
    function openPanel(id) {
        state.selected = id;
        renderTable();
        if (id === newRouteId && canCreate) {
            abortPanelLoad();
            renderCreatePanel();
            return;
        }
        cleanupPanelResources();
        const loadingDom = createDomBuilders(doc);
        state.panelDom = loadingDom;
        showPanel(buildPanelFrame(loadingDom, labels.panelTitleFallback, labels.closeDetails, loadingDom.statusLine(labels.loadingUser)), false);
        loadDetailPanel(id, { focus: true });
    }

    /**
     * Fetch user detail data via `adapter.fetchUser` (or fall back to the loaded list) and render the panel.
     * @param {string} id user ID
     * @param {{focus?: boolean, section?: string|null, notice?: string}} [panelOptions] focus and status options
     */
    async function loadDetailPanel(id, { focus = false, section = null, notice = '' } = {}) {
        abortPanelLoad();
        const run = state.panelRun;
        const abortController = typeof AbortController === 'function' ? new AbortController() : null;
        state.panelAbort = abortController;
        const signal = combineSignals(abortController?.signal, options.signal);

        let detail;
        try {
            if (typeof adapter.fetchUser === 'function') {
                detail = unwrapUserDetail(await adapter.fetchUser(id, { signal }));
            }
            else {
                const cached = knownUsers.get(String(id))
                    ?? (state.users ?? []).find((item) => String(item.id) === String(id))
                    ?? null;
                if (!cached) {
                    throw new Error('User not found');
                }
                detail = { user: cached, data: { user: cached } };
            }
        }
        catch (error) {
            if (state.destroyed || run !== state.panelRun || state.selected !== id) {
                return;
            }
            cleanupPanelResources();
            const errDom = createDomBuilders(doc);
            state.panelDom = errDom;
            const unauthorized = Boolean(isUnauthorized(error));
            const action = unauthorized
                ? (onSignIn ? errDom.button(labels.signIn, () => onSignIn(error), { kind: 'primary', 'data-admin-users-action': 'sign-in' }) : null)
                : errDom.button(labels.retry, () => loadDetailPanel(id, { focus: true }), { icon: 'refresh', 'data-admin-users-action': 'retry' });
            showPanel(buildPanelFrame(
                errDom,
                labels.panelTitleFallback,
                labels.closeDetails,
                errDom.errorBanner(resolveText(labels.loadUserFailed, error, unauthorized), action)
            ), focus);
            return;
        }

        if (state.destroyed || run !== state.panelRun || state.selected !== id) {
            return;
        }
        if (detail.user && detail.user.id !== undefined && detail.user.id !== null) {
            knownUsers.set(String(detail.user.id), detail.user);
        }
        renderDetailPanel(detail, { focus, section, notice });
    }

    /**
     * Render the detail panel of one user account, including Account form, extension sections, Facts, and Danger zone.
     * @param {{user: object, data: object}} detail loaded user and extension bundle
     * @param {{focus?: boolean, section?: string|null, notice?: string}} panelOptions focus and announcement options
     */
    function renderDetailPanel({ user, data }, { focus = false, section = null, notice = '' }) {
        cleanupPanelResources();
        const pDom = createDomBuilders(doc);
        state.panelDom = pDom;

        const id = String(user.id);
        const currentId = resolveCurrentUserId();
        const own = currentId !== null && currentId === id;
        const marked = isUserMarked(user);
        const name = userDisplayName(user);
        const sections = {};

        /**
         * Build a `.detail-panel__section` with a focusable heading, banner slot, body content, and status line.
         * @param {string} key section identifier
         * @param {string} heading visible section title
         * @param {unknown} content section body nodes
         * @param {string} [className] optional extra classes (such as `'detail-panel__danger'`)
         * @returns {HTMLElement} built `<section>` element
         */
        const block = (key, heading, content, className = '') => {
            const headingId = `admin-users-${seed}-${key}-heading`;
            const banner = pDom.h('div', { class: 'app__slot', 'data-admin-users-banner': key });
            const status = pDom.statusLine('', { className: 'app__status', 'data-admin-users-status': key });
            const title = pDom.h('h3', { id: headingId, tabindex: '-1' }, heading);
            sections[key] = { banner, status, title, headingId };
            return pDom.h('section', {
                class: ['detail-panel__section', className].filter(Boolean).join(' '),
                'aria-labelledby': headingId,
                'data-admin-users-section': key
            }, title, banner, content, status);
        };

        /**
         * Run a panel mutation, then quietly reload the table and refresh the panel with a section status announcement.
         * @param {string} key target section key
         * @param {() => Promise<unknown>} change async mutation
         * @param {string|((result: unknown) => string)} done success notice
         * @param {string} failed error prefix
         * @returns {Promise<boolean>} `true` when the mutation succeeded
         */
        const act = async (key, change, done, failed) => {
            const target = sections[key];
            if (target) {
                pDom.setChildren(target.banner);
            }
            let result;
            try {
                result = await change();
            }
            catch (error) {
                if (!state.destroyed && target) {
                    pDom.setChildren(target.banner, pDom.errorBanner(`${failed}: ${messageOf(error)}.`));
                }
                return false;
            }
            if (state.destroyed) {
                return false;
            }
            refresh({ quiet: true });
            await loadDetailPanel(id, {
                section: key,
                notice: typeof done === 'function' ? done(result) : done
            });
            return true;
        };

        // 1. Account editing section (when adapter.updateUser is provided).
        let accountSection = null;
        if (typeof adapter.updateUser === 'function') {
            const nameField = createField(doc, {
                id: `admin-users-${seed}-name`,
                name: 'name',
                label: labels.nameLabel,
                type: 'text',
                validate: (text) => (text.trim() === '' ? labels.nameRequired : null)
            });
            nameField.control.value = user.name ?? '';
            nameField.control.required = true;
            nameField.control.autocomplete = 'off';
            nameField.control.setAttribute('data-admin-users-input', 'name');
            state.panelCleanups.add(() => nameField.destroy());

            const emailField = buildEmailField(`admin-users-${seed}-email`, 'email', labels.emailLabel, user.email ?? '');

            const realmBoxes = showRealmEditor
                ? realms.map((realm) => pDom.checkbox(realm, {
                    name: 'realms',
                    value: realm,
                    checked: (user.realms ?? []).includes(realm),
                    disabled: own && realm === adminRealm,
                    'data-admin-users-realm': realm
                }))
                : [];

            const saveButton = pDom.button(labels.saveChanges, null, {
                kind: 'primary',
                type: 'submit',
                'data-admin-users-action': 'save'
            });

            const accountForm = pDom.h('form', {
                novalidate: true,
                class: 'app__section',
                'aria-labelledby': `admin-users-${seed}-account-heading`,
                onsubmit: async (event) => {
                    event.preventDefault();
                    if (saveButton.disabled) {
                        return;
                    }
                    const [nameValid, emailValid] = await Promise.all([nameField.validate(), emailField.validate()]);
                    if (!nameValid || !emailValid) {
                        (nameValid ? emailField : nameField).control.focus();
                        return;
                    }
                    const nextEmail = emailField.control.value.trim();
                    const emailChanged = nextEmail.toLowerCase() !== String(user.email ?? '').toLowerCase();
                    const payload = { name: nameField.control.value.trim() };
                    if (showRealmEditor) {
                        payload.realms = realmBoxes
                            .map((box) => box.querySelector('input'))
                            .filter((input) => input?.checked)
                            .map((input) => input.value);
                    }
                    if (emailChanged || options.alwaysSendEmail) {
                        payload.email = nextEmail;
                    }
                    saveButton.disabled = true;
                    const doneMessage = emailChanged && !options.alwaysSendEmail
                        ? resolveText(labels.savedEmailChanged, nextEmail)
                        : labels.saved;
                    const ok = await act(
                        'account',
                        () => adapter.updateUser(id, payload, { user, emailChanged, signal: options.signal }),
                        doneMessage,
                        labels.saveFailed
                    );
                    if (!ok && !state.destroyed) {
                        saveButton.disabled = false;
                    }
                }
            },
            nameField.element,
            emailField.element,
            showRealmEditor
                ? pDom.h('fieldset', { class: 'field-group' },
                    pDom.h('legend', { class: 'field-group__legend' }, labels.realmsLegend),
                    realmBoxes,
                    own ? pDom.h('p', { class: 'field-group__hint' }, labels.ownAdminRealmHint) : null)
                : null,
            pDom.h('div', { class: 'detail-panel__actions' }, saveButton));

            accountSection = block('account', labels.accountHeading, [accountForm]);
        }

        // 2. Extension sections via `extraSections` hook.
        const extHelpers = {
            user,
            data,
            id,
            own,
            marked,
            dom: pDom,
            block,
            act,
            reload: (opts) => refresh(opts),
            reloadPanel: (opts) => loadDetailPanel(id, opts),
            closePanel,
            registerCleanup: (fn) => {
                if (typeof fn === 'function') {
                    state.panelCleanups.add(fn);
                }
            },
            formatTime,
            isMarked: isUserMarked,
            context: options.context
        };

        const rawExtraSections = typeof options.extraSections === 'function'
            ? options.extraSections(extHelpers)
            : (options.extraSections ?? []);
        const sectionsByPosition = {
            'after-account': [],
            'before-facts': [],
            'after-facts': [],
            'before-danger': []
        };
        for (const item of rawExtraSections ?? []) {
            if (!item) {
                continue;
            }
            if (isNode(item)) {
                sectionsByPosition['after-account'].push(item);
            }
            else if (typeof item === 'object' && item.key) {
                const pos = Object.hasOwn(sectionsByPosition, item.position) ? item.position : 'after-account';
                sectionsByPosition[pos].push(block(item.key, item.heading ?? item.key, item.content, item.className ?? ''));
            }
        }

        // 3. Facts section (+ `extraFacts` extension hook + optional export button).
        const purgeTime = user['expiry-time'] ?? user['deletion-time'] ?? null;
        const factRows = [
            { term: labels.factId, value: id, key: 'id' },
            showRealms ? { term: labels.factRealms, value: buildRealmChips(pDom, user), key: 'realms' } : null,
            {
                term: labels.factStatus,
                value: marked ? pDom.severityChip('warning', labels.markedStatus) : labels.activeStatus,
                key: 'status'
            },
            { term: labels.factCreated, value: formatTime(user['creation-time'], labels.empty), key: 'created' },
            { term: labels.factLastActive, value: formatTime(user['last-activity-time'], labels.never), key: 'last-active' },
            marked && purgeTime ? { term: labels.factScheduledPurge, value: formatTime(purgeTime, labels.empty), key: 'scheduled-purge' } : null
        ].filter(Boolean);

        const extraFactRows = typeof options.extraFacts === 'function'
            ? options.extraFacts(extHelpers)
            : (options.extraFacts ?? []);
        for (const row of extraFactRows ?? []) {
            if (row) {
                factRows.push(row);
            }
        }

        const factsContent = [pDom.facts(factRows, true)];
        if (typeof adapter.exportUserData === 'function') {
            const exportButton = pDom.button(labels.exportData, async () => {
                pDom.setChildren(sections.facts.banner);
                try {
                    const exported = await adapter.exportUserData(id, { user, signal: options.signal });
                    const filename = typeof options.exportFilename === 'function'
                        ? options.exportFilename(user)
                        : `user-${id}-data.json`;
                    downloadJson(exported, filename, { document: doc, ...(options.downloadOptions ?? {}) });
                    sections.facts.status.textContent = labels.exportDone;
                }
                catch (error) {
                    if (!state.destroyed) {
                        pDom.setChildren(sections.facts.banner, pDom.errorBanner(`${labels.exportFailed}: ${messageOf(error)}.`));
                    }
                }
            }, {
                icon: options.exportIcon ?? null,
                'data-admin-users-action': 'export'
            });
            factsContent.push(pDom.h('div', { class: 'detail-panel__actions' }, exportButton));
        }
        const factsSection = block('facts', labels.factsHeading, factsContent);

        // 4. Danger zone: inline confirmations for mark-for-deletion, restore, and permanent deletion.
        const canMark = typeof adapter.markUserForDeletion === 'function';
        const canRestore = typeof adapter.restoreUser === 'function';
        const canDelete = typeof adapter.deleteUser === 'function';
        let dangerSection = null;
        if (canMark || canRestore || canDelete) {
            const dangerControls = [];
            if (own) {
                dangerControls.push(pDom.h('p', null, labels.ownDangerHint));
            }
            if (marked && canRestore) {
                const restoreTrigger = pDom.button(labels.restore, null, {
                    kind: 'secondary',
                    disabled: own,
                    'data-admin-users-action': 'restore'
                });
                const restoreSlot = pDom.inlineConfirm(restoreTrigger, {
                    label: labels.restoreConfirmLabel,
                    text: resolveText(labels.restoreConfirmText, name, user),
                    confirmLabel: labels.restore,
                    cancelLabel: labels.restoreCancelLabel,
                    onConfirm: () => act(
                        'danger',
                        () => adapter.restoreUser(id, { user, signal: options.signal }),
                        labels.restoreDone,
                        labels.restoreFailed
                    )
                });
                // Restore is non-destructive, so confirm uses primary button styling rather than danger.
                restoreSlot.querySelector('[data-inline-confirm-answer="yes"]')?.classList.remove('button--danger');
                dangerControls.push(restoreSlot);
            }
            else if (!marked && canMark) {
                const markTrigger = pDom.button(labels.markDelete, null, {
                    kind: 'secondary',
                    danger: true,
                    disabled: own,
                    'data-admin-users-action': 'mark-delete'
                });
                dangerControls.push(pDom.inlineConfirm(markTrigger, {
                    label: labels.markDeleteConfirmLabel,
                    text: resolveText(labels.markDeleteConfirmText, name, user),
                    confirmLabel: labels.markDelete,
                    cancelLabel: labels.keepLabel,
                    onConfirm: () => act(
                        'danger',
                        () => adapter.markUserForDeletion(id, { user, signal: options.signal }),
                        labels.markDeleteDone,
                        labels.markDeleteFailed
                    )
                }));
            }
            if (canDelete) {
                const deleteTrigger = pDom.button(labels.deletePermanently, null, {
                    kind: 'secondary',
                    danger: true,
                    disabled: own,
                    'data-admin-users-action': 'delete'
                });
                dangerControls.push(pDom.inlineConfirm(deleteTrigger, {
                    label: labels.deleteConfirmLabel,
                    text: resolveText(labels.deleteConfirmText, name, user),
                    confirmLabel: labels.deletePermanently,
                    cancelLabel: labels.keepLabel,
                    onConfirm: async () => {
                        pDom.setChildren(sections.danger.banner);
                        try {
                            await adapter.deleteUser(id, { user, signal: options.signal });
                        }
                        catch (error) {
                            if (!state.destroyed) {
                                pDom.setChildren(sections.danger.banner, pDom.errorBanner(`${labels.deleteFailed}: ${messageOf(error)}.`));
                            }
                            return;
                        }
                        if (state.destroyed) {
                            return;
                        }
                        knownUsers.delete(id);
                        if (state.users) {
                            state.users = state.users.filter((item) => String(item.id) !== id);
                        }
                        closePanel();
                        refresh({ quiet: true });
                    }
                }));
            }
            dangerSection = block(
                'danger',
                labels.dangerHeading,
                [pDom.h('div', { class: 'detail-panel__actions' }, dangerControls)],
                'detail-panel__danger'
            );
        }

        const frame = buildPanelFrame(
            pDom,
            name || labels.panelTitleFallback,
            labels.closeDetails,
            accountSection,
            ...sectionsByPosition['after-account'],
            ...sectionsByPosition['before-facts'],
            factsSection,
            ...sectionsByPosition['after-facts'],
            ...sectionsByPosition['before-danger'],
            dangerSection
        );
        showPanel(frame, focus);

        if (section && sections[section]) {
            sections[section].status.textContent = notice;
            sections[section].title.focus();
        }
    }

    /** Render the New user creation panel inside the side panel. */
    function renderCreatePanel() {
        cleanupPanelResources();
        const pDom = createDomBuilders(doc);
        state.panelDom = pDom;

        const banner = pDom.h('div', { class: 'app__slot', 'data-admin-users-banner': 'create' });
        const emailField = buildEmailField(`admin-users-${seed}-new-email`, 'email', labels.emailLabel, '');

        let nameField = null;
        if (showCreateName) {
            nameField = createField(doc, {
                id: `admin-users-${seed}-new-name`,
                name: 'name',
                label: labels.createNameLabel,
                type: 'text'
            });
            nameField.control.autocomplete = 'off';
            nameField.control.placeholder = labels.createNamePlaceholder;
            nameField.control.setAttribute('data-admin-users-input', 'name');
            state.panelCleanups.add(() => nameField.destroy());
        }

        let passwordField = null;
        if (showCreatePassword) {
            passwordField = createField(doc, {
                id: `admin-users-${seed}-new-password`,
                name: 'password',
                label: labels.createPasswordLabel,
                type: 'password'
            });
            passwordField.control.autocomplete = 'new-password';
            passwordField.control.setAttribute('data-admin-users-input', 'password');
            state.panelCleanups.add(() => passwordField.destroy());
        }

        const welcomeBox = showCreateWelcome
            ? pDom.checkbox(labels.createWelcomeLabel, {
                name: 'send-welcome-email',
                checked: true,
                'data-admin-users-input': 'welcome'
            })
            : null;

        const submitButton = pDom.button(labels.createSubmit, null, {
            kind: 'primary',
            type: 'submit',
            'data-admin-users-action': 'create'
        });

        const form = pDom.h('form', {
            novalidate: true,
            class: 'detail-panel__section',
            'aria-labelledby': `admin-users-panel-title-${seed}`,
            'data-admin-users-section': 'create',
            onsubmit: async (event) => {
                event.preventDefault();
                if (submitButton.disabled) {
                    return;
                }
                if (!(await emailField.validate())) {
                    emailField.control.focus();
                    return;
                }
                const payload = { email: emailField.control.value.trim() };
                if (nameField && nameField.control.value.trim()) {
                    payload.name = nameField.control.value.trim();
                }
                if (passwordField && passwordField.control.value) {
                    payload.password = passwordField.control.value;
                }
                if (welcomeBox) {
                    payload['send-welcome-email'] = Boolean(welcomeBox.querySelector('input')?.checked);
                }
                pDom.setChildren(banner);
                submitButton.disabled = true;
                let created;
                try {
                    created = await adapter.createUser(payload, { signal: options.signal });
                }
                catch (error) {
                    if (!state.destroyed) {
                        submitButton.disabled = false;
                        pDom.setChildren(banner, pDom.errorBanner(`${labels.createFailed}: ${messageOf(error)}.`));
                    }
                    return;
                }
                if (state.destroyed) {
                    return;
                }
                await refresh({ quiet: true });
                if (state.destroyed) {
                    return;
                }
                if (created && created.id !== undefined && created.id !== null) {
                    knownUsers.set(String(created.id), created);
                    navigateTo(String(created.id));
                }
                else {
                    closePanel();
                }
            }
        },
        banner,
        emailField.element,
        nameField ? nameField.element : null,
        passwordField ? passwordField.element : null,
        welcomeBox,
        pDom.h('div', { class: 'detail-panel__actions' },
            pDom.button(labels.createCancel, closePanel, { 'data-admin-users-action': 'cancel-create' }),
            submitButton));

        const frame = buildPanelFrame(pDom, labels.createHeading, labels.closeCreate, form);
        showPanel(frame, true);
    }

    /**
     * Apply a same-screen route change (`#/users`, `#/users/:id`, `#/users/new`) without reloading the table.
     * @param {{id?: string|null}|null|undefined} next next route object
     */
    function update(next) {
        if (state.destroyed) {
            return;
        }
        const nextId = next?.id ? String(next.id) : null;
        if (nextId) {
            if (nextId !== state.selected) {
                openPanel(nextId);
            }
            return;
        }
        state.selected = null;
        abortPanelLoad();
        cleanupPanelResources();
        panelHost.hidden = true;
        dom.setChildren(panelHost);
        renderTable();
        if (state.returnFocus) {
            const targetId = state.returnFocus;
            state.returnFocus = null;
            const focusTarget = targetId === newRouteId
                ? newButton
                : (body.querySelector(`[data-admin-users-link="${targetId}"]`) ?? newButton);
            focusTarget?.focus();
        }
    }

    /** Cancel active requests and release all listeners, panel resources, and controllers. */
    function destroy() {
        if (state.destroyed) {
            return;
        }
        state.destroyed = true;
        state.selected = null;
        abortPanelLoad();
        cleanupPanelResources();
        listLoader.destroy();
        tableState.destroy();
        if (ownsPanelHost) {
            panelHost.remove();
        }
        root.removeAttribute('data-admin-users');
        options.signal?.removeEventListener('abort', destroy);
        if (ownsDom) {
            dom.destroy();
        }
    }

    const controller = {
        element: root,
        refresh,
        update,
        openUser: (id) => requestOpen(String(id)),
        openCreate: () => {
            if (canCreate) {
                requestOpen(newRouteId);
            }
        },
        closePanel,
        getUsers: () => (state.users ? [...state.users] : null),
        getFilteredUsers: () => [...state.filtered],
        getSelectedId: () => state.selected,
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
    if (options.route?.id) {
        openPanel(String(options.route.id));
    }

    return controller;
}

/**
 * Create a new Users screen root in an injected `Document` and attach the controller to it.
 * @param {Document|object} [docOrOptions] injected `Document` or options object
 * @param {object} [options] options passed to `attachAdminUsers`
 * @returns {object} Users screen controller
 */
export function createAdminUsers(docOrOptions = globalThis.document, options = {}) {
    if (isNode(docOrOptions) && docOrOptions.nodeType === 9) {
        const root = docOrOptions.createElement('div');
        return attachAdminUsers(root, { document: docOrOptions, ...options });
    }
    const resolved = (docOrOptions && typeof docOrOptions === 'object' ? docOrOptions : options) ?? {};
    const doc = resolved.document ?? globalThis.document;
    const root = doc.createElement('div');
    return attachAdminUsers(root, { document: doc, ...resolved });
}

/**
 * Build an `admin-console.js` screen descriptor for the shared Users screen.
 * @param {object} options screen and `attachAdminUsers` options (`adapter`, `name`, `title`, `icon`, `badge`, ...)
 * @returns {{name: string, title: string, icon: string|Node|undefined, badge: unknown, mount: Function}}
 *   screen descriptor ready for `createAdminConsole` or `attachAdminConsole`
 */
export function createAdminUsersScreen(options = {}) {
    const adapter = options?.adapter;
    if (!adapter || typeof adapter.fetchUsers !== 'function') {
        throw new TypeError('An adapter with a fetchUsers function is required for admin-users.');
    }
    const {
        name = 'users',
        title = 'Users',
        icon = 'people',
        badge,
        ...userOptions
    } = options;

    return {
        name,
        title,
        icon,
        badge,
        mount: (view, ctx, route) => attachAdminUsers(view, {
            ...userOptions,
            routeName: userOptions.routeName ?? name,
            document: userOptions.document ?? view.ownerDocument,
            window: userOptions.window ?? view.ownerDocument?.defaultView,
            dom: userOptions.dom ?? ctx?.dom,
            panel: userOptions.panel ?? ctx?.panel ?? ctx?.editor,
            navigate: userOptions.navigate ?? ctx?.navigate,
            onSignIn: userOptions.onSignIn ?? ctx?.signIn,
            me: userOptions.me ?? ctx?.me ?? ctx?.account,
            signal: userOptions.signal ?? ctx?.screenSignal,
            context: ctx,
            route
        })
    };
}
