/**
 * Shared admin Logs screen (ADR-0003).
 *
 * - Displays the server's in-memory log buffer as spaced `.entry-list` cards, newest first,
 *   loaded through an app-supplied data adapter (`adapter.fetchLogs`) and `data-loader.js`.
 * - Preserves message line breaks while stripping shared leading indent (`stripIndent`), and wraps
 *   dotted logger names with `<wbr>` so narrow mobile viewports never scroll horizontally.
 * - Persists text filter, level filter, page size, and page number in the URL hash via `table-state.js`,
 *   mounts in the `admin-console.js` frame via `createAdminLogsScreen`, and uses `data-admin-logs-*`
 *   hooks and ARIA states only.
 */

import { attachDataLoader } from './data-loader.js';
import { createDomBuilders, severityOf } from './dom-builders.js';
import { createIcon } from './icon.js';
import { attachTableState, createPager } from './table-state.js';

export const DEFAULT_LOG_SIZES = [25, 50, 100];
export const DEFAULT_LOG_SIZE = 25;
export const DEFAULT_LOG_LEVELS = [
    ['', 'All levels'],
    ['error', 'Error'],
    ['warning', 'Warning'],
    ['info', 'Info'],
    ['debug', 'Debug']
];

const DEFAULT_LABELS = {
    what: 'Log entries',
    toolbarLabel: 'Filter logs',
    filterLabel: 'Filter logs',
    filterPlaceholder: 'Message or source',
    levelLabel: 'Level',
    sizeLabel: 'Page size',
    listLabel: 'Recent server log entries, newest first',
    pagerLabel: 'Log pages',
    noun: ['entry', 'entries'],
    emptyBuffer: 'The server has logged no entries since it started.',
    emptyFiltered: 'No log entry matches these filters.',
    clearFilters: 'Clear filters',
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
 * Strip the indent the server's log formatter puts before every message line.
 * Removes the indent all non-blank lines share so stack frames keep their relative indent,
 * and drops leading blank lines and trailing whitespace on each line.
 * @param {string|null|undefined} message logged message text
 * @returns {string} normalized multiline message without shared indent
 */
export function stripIndent(message) {
    const lines = String(message ?? '').trimEnd().split(/\r?\n/);
    while (lines.length > 0 && lines[0].trim() === '') {
        lines.shift();
    }
    const indents = lines
        .filter((line) => line.trim() !== '')
        .map((line) => line.match(/^[ \t]*/)[0].length);
    const shared = indents.length > 0 ? Math.min(...indents) : 0;
    return lines.map((line) => line.slice(shared).trimEnd()).join('\n');
}

/**
 * Format an ISO-8601 timestamp or `Date` as local `YYYY-MM-DD HH:MM:SS`.
 * Missing values return `emptyText`; unparseable strings return verbatim.
 * @param {string|Date|number|null|undefined} value timestamp value
 * @param {string} [emptyText] fallback text when missing, `'—'` by default
 * @returns {string} formatted timestamp
 */
export function formatLogTime(value, emptyText = '—') {
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
 * Normalize one raw log entry into a consistent shape while preserving the raw record.
 * @param {unknown} entry raw log entry object
 * @returns {{time: string|Date|number|null, level: string, severity: string, name: string, message: string, raw: unknown}}
 *   normalized log entry
 */
function normalizeLogEntry(entry) {
    const source = entry && typeof entry === 'object' ? entry : { message: entry };
    const rawLevel = source.level ?? source.severity ?? 'info';
    const level = String(rawLevel ?? 'info');
    return {
        time: source.time ?? source.timestamp ?? source['created-at'] ?? source.createdAt ?? null,
        level,
        severity: severityOf(level),
        name: String(source.name ?? source.source ?? source.logger ?? ''),
        message: String(source.message ?? ''),
        raw: source
    };
}

/**
 * Normalize `{ 'log-entries': [...] }`, `{ elements: [...] }`, generic envelope,
 * and plain array log payloads into an array of normalized entries in newest-first order.
 * @param {unknown} raw payload returned by `adapter.fetchLogs`
 * @returns {Array<{time: string|Date|number|null, level: string, severity: string, name: string, message: string, raw: unknown}>}
 *   normalized entries
 */
export function normalizeLogEntries(raw) {
    if (Array.isArray(raw)) {
        return raw.map(normalizeLogEntry);
    }
    if (raw && typeof raw === 'object') {
        const list = raw['log-entries']
            ?? raw.logEntries
            ?? raw.entries
            ?? raw.elements
            ?? raw.logs
            ?? raw.items;
        if (Array.isArray(list)) {
            return list.map(normalizeLogEntry);
        }
    }
    return [];
}

/**
 * Filter log entries by case-insensitive text query and normalized severity level.
 * @param {Array<object>} entries normalized or raw log entries
 * @param {{q?: string, level?: string}} [filters] active filter values
 * @param {{filterText?: (entry: object) => string}} [options] optional searchable-text extractor
 * @returns {Array<object>} filtered entries in their original order
 */
export function filterLogEntries(entries, filters = {}, options = {}) {
    const list = Array.isArray(entries) ? entries : [];
    const needle = String(filters?.q ?? '').trim().toLowerCase();
    const rawLevel = String(filters?.level ?? '').trim();
    const targetLevel = rawLevel ? severityOf(rawLevel) : '';
    const getText = typeof options.filterText === 'function'
        ? options.filterText
        : (entry) => `${entry?.message ?? ''}\n${entry?.name ?? entry?.source ?? entry?.logger ?? ''}`;

    return list.filter((entry) => {
        if (needle && !String(getText(entry) ?? '').toLowerCase().includes(needle)) {
            return false;
        }
        if (targetLevel && severityOf(entry?.severity ?? entry?.level) !== targetLevel) {
            return false;
        }
        return true;
    });
}

/**
 * Normalize configured level options into `[value, label]` tuples.
 * @param {Array} levels raw level options
 * @returns {Array<[string, string]>} normalized `[value, label]` tuples
 */
function normalizeLevelOptions(levels) {
    const source = Array.isArray(levels) && levels.length > 0 ? levels : DEFAULT_LOG_LEVELS;
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
 * Split a dotted logger/source name with `<wbr>` after each dot so long class names wrap on phones.
 * @param {object} dom bound DOM builders
 * @param {string|null|undefined} name logger or source name
 * @param {string} emptyText fallback when empty
 * @returns {Array<string|HTMLElement>} text and `<wbr>` parts
 */
function buildSourceParts(dom, name, emptyText) {
    const text = name ? String(name) : emptyText;
    return text.split(/(?<=\.)/).flatMap((part, index) => (index === 0 ? [part] : [dom.h('wbr'), part]));
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
 * Build one `.entry-list__item` card for a normalized log entry.
 * @param {object} entry normalized log entry
 * @param {object} helpers builder context (`doc`, `dom`, `formatTime`, `labels`, `extraChips`)
 * @returns {HTMLLIElement} built entry card
 */
function buildDefaultCard(entry, helpers) {
    const { doc, dom, formatTime, labels, extraChips } = helpers;
    const datetime = entry.time instanceof Date
        ? entry.time.toISOString()
        : (entry.time !== null && entry.time !== undefined && entry.time !== '' ? String(entry.time) : null);

    const timeChip = dom.h('span', { class: 'chip', 'data-admin-logs-time': '' },
        createIcon(doc, 'clock'),
        dom.h('time', { datetime }, formatTime(entry.time, labels.empty)));

    const levelChip = dom.severityChip(entry.severity);
    const sourceChip = dom.h('span', { class: 'chip entry-list__code', 'data-admin-logs-source': '' },
        buildSourceParts(dom, entry.name, labels.empty));

    const extras = typeof extraChips === 'function' ? extraChips(entry, helpers) : null;

    return dom.h('li', {
        class: 'entry-list__item',
        'data-admin-logs-item': '',
        'data-severity': entry.severity
    },
    dom.h('p', {
        class: 'entry-list__message entry-list__message--code',
        'data-admin-logs-message': ''
    }, stripIndent(entry.message)),
    dom.h('div', { class: 'entry-list__meta', 'data-admin-logs-meta': '' },
        timeChip,
        levelChip,
        sourceChip,
        extras));
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
    const fallbacks = focusedAction === 'first' || focusedAction === 'prev'
        ? ['next', 'last']
        : ['prev', 'first'];
    for (const action of fallbacks) {
        const candidate = pagerNav.querySelector(`[data-table-state-action="${action}"]`);
        if (candidate && !candidate.disabled && typeof candidate.focus === 'function') {
            candidate.focus();
            return;
        }
    }
    if (doc.activeElement === current && typeof current.blur === 'function') {
        current.blur();
    }
}

/**
 * Attach the shared admin Logs screen to a container element.
 * Loads log entries through `options.adapter.fetchLogs`, filters and pages them in memory with
 * URL hash persistence (`table-state.js`), and renders `.entry-list` cards using `dom-builders.js`.
 * @param {HTMLElement} root target container element
 * @param {object} options screen configuration
 * @param {{fetchLogs: (context: {signal?: AbortSignal}) => Promise<unknown>}} options.adapter app data adapter
 * @param {number[]} [options.sizes] allowed page sizes, `[25, 50, 100]` by default
 * @param {number} [options.defaultSize] default page size, `25` (or `sizes[0]`) by default
 * @param {Array} [options.levels] level select options, `DEFAULT_LOG_LEVELS` by default
 * @param {number} [options.debounce] text filter input debounce in ms, `0` by default
 * @param {boolean} [options.autoLoad] trigger initial load immediately, `true` by default
 * @param {(entry: object) => string} [options.filterText] custom searchable text extractor
 * @param {(entry: object, helpers: object) => unknown} [options.extraChips] append app-specific chips to each card
 * @param {(entry: object, helpers: object) => HTMLElement} [options.renderCard] custom card renderer replacing default cards
 * @param {(value: unknown, emptyText?: string) => string} [options.formatTime] custom timestamp formatter
 * @param {(error: unknown) => void} [options.onSignIn] callback wired to 401 Sign in actions
 * @param {(error: unknown) => boolean} [options.isUnauthorized] predicate classifying 401 errors
 * @param {Document} [options.document] injected document
 * @param {Window} [options.window] injected window for URL hash synchronization
 * @param {Location} [options.location] injected location override
 * @param {History} [options.history] injected history override
 * @param {object} [options.dom] pre-created `createDomBuilders` instance
 * @param {AbortSignal} [options.signal] external abort signal that disposes the screen
 * @param {object} [options.labels] label and message overrides
 * @returns {object} screen controller (`element`, `refresh`, `getEntries`, `getFilteredEntries`, `getState`, `resetFilters`, `tableState`, `dispose`, `destroy`)
 */
export function attachAdminLogs(root, options = {}) {
    if (!isNode(root) || root.nodeType !== 1) {
        throw new TypeError('A container element is required for admin-logs.');
    }
    const fetchLogs = options?.adapter?.fetchLogs;
    if (typeof fetchLogs !== 'function') {
        throw new TypeError('An adapter with a fetchLogs function is required for admin-logs.');
    }

    const doc = options.document ?? root.ownerDocument ?? globalThis.document;
    const view = options.window ?? doc?.defaultView ?? globalThis.window ?? null;
    const ownsDom = !options.dom;
    const dom = options.dom ?? createDomBuilders(doc);
    const labels = { ...DEFAULT_LABELS, ...options.labels };
    const formatTime = typeof options.formatTime === 'function' ? options.formatTime : formatLogTime;
    const sizes = Array.isArray(options.sizes) && options.sizes.length > 0 ? options.sizes : DEFAULT_LOG_SIZES;
    const defaultSize = options.defaultSize ?? (options.sizes ? sizes[0] : DEFAULT_LOG_SIZE);
    const levels = normalizeLevelOptions(options.levels);
    const validLevels = levels.map(([value]) => value);
    const seed = (instanceCounter += 1);

    let destroyed = false;
    let entries = null;
    let filteredEntries = [];
    let tableState = null;

    root.setAttribute('data-admin-logs', '');

    const filterInput = dom.h('input', {
        class: 'field__control',
        type: 'search',
        placeholder: labels.filterPlaceholder,
        'data-table-state-filter': 'q',
        'data-admin-logs-filter': 'q'
    });
    const levelSelect = dom.select(levels, '', {
        'data-table-state-filter': 'level',
        'data-admin-logs-filter': 'level'
    });
    const sizeSelect = dom.select(
        sizes.map((size) => [String(size), String(size)]),
        String(defaultSize),
        {
            'data-table-state-size': '',
            'data-admin-logs-size': ''
        }
    );

    const toolbar = dom.h('search', {
        class: 'toolbar',
        'aria-label': labels.toolbarLabel,
        'data-admin-logs-toolbar': ''
    },
    buildField(dom, `admin-logs-filter-${seed}`, labels.filterLabel, filterInput),
    buildField(dom, `admin-logs-level-${seed}`, labels.levelLabel, levelSelect),
    buildField(dom, `admin-logs-size-${seed}`, labels.sizeLabel, sizeSelect));

    const body = dom.h('div', { class: 'loading', 'data-admin-logs-body': '' });
    const pagerNav = createPager(doc, {
        dom,
        label: labels.pagerLabel,
        hidden: true,
        cut: { page: 1, pages: 1, total: 0, from: 0, to: 0 }
    });

    dom.setChildren(root, toolbar, body, pagerNav);

    /**
     * Build the body content for the currently loaded entries and update the persistent pager.
     * @returns {HTMLElement[]} nodes to place inside `body`
     */
    function buildView() {
        const focusedAction = pagerNav.contains(doc.activeElement)
            ? (doc.activeElement?.closest?.('[data-table-state-action]')?.getAttribute?.('data-table-state-action') ?? null)
            : null;

        if (!entries || entries.length === 0) {
            filteredEntries = [];
            tableState.updatePager({ hidden: true, cut: { page: 1, pages: 1, total: 0, from: 0, to: 0 } });
            return [dom.emptyState(labels.emptyBuffer, null, { 'data-admin-logs-empty': 'buffer' })];
        }

        const current = tableState.getState();
        const matches = filterLogEntries(entries, current.filters, { filterText: options.filterText });
        filteredEntries = matches;

        if (matches.length === 0) {
            tableState.updatePager({ hidden: true, cut: { page: 1, pages: 1, total: 0, from: 0, to: 0 } });
            const clearButton = dom.button(labels.clearFilters, () => {
                tableState.resetFilters();
                filterInput.focus();
            }, {
                kind: 'quiet',
                'data-admin-logs-action': 'clear'
            });
            return [dom.emptyState(labels.emptyFiltered, clearButton, { 'data-admin-logs-empty': 'filtered' })];
        }

        const cut = tableState.slice(matches);
        tableState.updatePager({
            hidden: false,
            cut,
            shown: matches.length,
            loaded: entries.length,
            noun: labels.noun,
            label: labels.pagerLabel
        });
        restorePagerFocus(doc, pagerNav, focusedAction);

        const helpers = {
            doc,
            dom,
            formatTime,
            labels,
            stripIndent,
            extraChips: options.extraChips,
            context: options.context
        };
        const renderCard = typeof options.renderCard === 'function' ? options.renderCard : buildDefaultCard;
        return [
            dom.h('ul', {
                class: 'entry-list',
                role: 'list',
                'aria-label': labels.listLabel,
                'data-admin-logs-list': ''
            }, cut.rows.map((entry) => renderCard(entry, helpers)))
        ];
    }

    /** Re-render the list from cached entries when a filter, page size, or page changes. */
    function render() {
        if (destroyed || entries === null) {
            return;
        }
        dom.setChildren(body, buildView());
    }

    tableState = attachTableState(root, {
        document: doc,
        window: view,
        location: options.location,
        history: options.history,
        dom,
        sizes,
        defaultSize,
        debounce: options.debounce,
        filters: {
            q: { default: '', trim: true },
            level: {
                default: '',
                values: validLevels,
                parse: (value) => {
                    const text = String(value ?? '').trim().toLowerCase();
                    if (!text) {
                        return '';
                    }
                    const canonical = text === 'warn' ? 'warning' : (text === 'danger' ? 'error' : text);
                    return validLevels.includes(canonical) ? canonical : '';
                }
            }
        },
        onChange: () => render()
    });

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
     * Load log entries through the adapter and render them with current filters and paging.
     * @param {{quiet?: boolean}} [callOptions] `quiet: true` keeps shown cards visible under `aria-busy`
     * @returns {Promise<boolean>} `true` when log entries rendered
     */
    async function refresh(callOptions = {}) {
        if (destroyed) {
            return false;
        }
        const quiet = Boolean(callOptions?.quiet);
        if (!quiet) {
            tableState.updatePager({ hidden: true, cut: { page: 1, pages: 1, total: 0, from: 0, to: 0 } });
        }
        const ok = await loader.load({
            quiet,
            fetcher: ({ signal }) => fetchLogs({ signal: combineSignals(signal, options.signal) }),
            render: (rawData) => {
                entries = normalizeLogEntries(rawData);
                return buildView();
            }
        });
        if (!ok && !destroyed && body.querySelector('[data-data-loader-error]')) {
            entries = null;
            filteredEntries = [];
            tableState.updatePager({ hidden: true, cut: { page: 1, pages: 1, total: 0, from: 0, to: 0 } });
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
        options.signal?.removeEventListener('abort', destroy);
        if (ownsDom) {
            dom.destroy();
        }
    }

    const controller = {
        element: root,
        refresh,
        getEntries: () => (entries ? [...entries] : null),
        getFilteredEntries: () => [...filteredEntries],
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
 * Create a new Logs screen root in an injected `Document` and attach the controller to it.
 * @param {Document|object} [docOrOptions] injected `Document` or options object
 * @param {object} [options] options passed to `attachAdminLogs`
 * @returns {object} screen controller
 */
export function createAdminLogs(docOrOptions = globalThis.document, options = {}) {
    if (isNode(docOrOptions) && docOrOptions.nodeType === 9) {
        const root = docOrOptions.createElement('div');
        return attachAdminLogs(root, { document: docOrOptions, ...options });
    }
    const resolved = (docOrOptions && typeof docOrOptions === 'object' ? docOrOptions : options) ?? {};
    const doc = resolved.document ?? globalThis.document;
    const root = doc.createElement('div');
    return attachAdminLogs(root, { document: doc, ...resolved });
}

/**
 * Build an `admin-console.js` screen descriptor for the shared Logs screen.
 * @param {object} options screen and `attachAdminLogs` options (`adapter`, `name`, `title`, `icon`, `badge`, `sizes`, ...)
 * @returns {{name: string, title: string, icon: string|Node|undefined, badge: unknown, mount: Function}}
 *   screen descriptor ready for `createAdminConsole` or `attachAdminConsole`
 */
export function createAdminLogsScreen(options = {}) {
    if (typeof options?.adapter?.fetchLogs !== 'function') {
        throw new TypeError('An adapter with a fetchLogs function is required for admin-logs.');
    }
    const {
        name = 'logs',
        title = 'Logs',
        icon = 'logs',
        badge,
        ...logsOptions
    } = options;

    return {
        name,
        title,
        icon,
        badge,
        mount: (view, ctx, route) => attachAdminLogs(view, {
            ...logsOptions,
            document: logsOptions.document ?? view.ownerDocument,
            window: logsOptions.window ?? view.ownerDocument?.defaultView,
            dom: logsOptions.dom ?? ctx?.dom,
            onSignIn: logsOptions.onSignIn ?? ctx?.signIn,
            signal: logsOptions.signal ?? ctx?.screenSignal,
            context: ctx,
            route
        })
    };
}
