/**
 * Paged and filtered table state kept in the URL hash query (ADR-0003).
 *
 * - Keeps active filter values, non-default page sizes, and page numbers (> 1) in the hash query via `history.replaceState`
 *   so reloads and shared links restore the table without adding history entries or firing `hashchange`.
 * - Supports client paging (`pageOf`, `slice`) with automatic page clamping and server paging (`pageParams`, `offsetParams`,
 *   `serverParams`, `applyEnvelope`).
 * - Wires both modes to the package `.pager` component using `data-table-state-*` hooks and native `disabled` states,
 *   never selecting elements by style classes.
 */

import { createDomBuilders } from './dom-builders.js';

const SERVER_DIRECTIONS = new Set(['first', 'prev', 'next', 'last']);
const DEFAULT_NOUN = ['item', 'items'];

/**
 * Parse a positive integer value, returning `fallback` when invalid or less than 1.
 * @param {unknown} value candidate integer
 * @param {number} fallback default positive integer
 * @returns {number} integer greater than or equal to 1
 */
function normalizePositiveInt(value, fallback) {
    const num = typeof value === 'number' ? value : Number.parseInt(String(value ?? ''), 10);
    if (!Number.isFinite(num)) {
        return fallback;
    }
    const int = Math.floor(num);
    return int >= 1 ? int : fallback;
}

/**
 * Format a count with its singular or plural noun.
 * @param {number} count item count
 * @param {string|[string, string]} [noun] singular noun or `[singular, plural]` tuple
 * @returns {string} formatted count phrase
 */
function pluralize(count, noun = DEFAULT_NOUN) {
    const [singular, plural] = Array.isArray(noun) ? [noun[0], noun[1] ?? `${noun[0]}s`] : [noun, `${noun}s`];
    return `${count} ${count === 1 ? singular : plural}`;
}

/**
 * Resolve location and history objects from explicit options, an injected window, or globals.
 * @param {object} [options] `{ window, location, history }`
 * @returns {{location: Location|null, history: History|null}} resolved browser navigation objects
 */
function resolveNavigation(options = {}) {
    const view = options?.window ?? globalThis.window ?? null;
    return {
        location: options?.location ?? view?.location ?? globalThis.location ?? null,
        history: options?.history ?? view?.history ?? globalThis.history ?? null
    };
}

/**
 * Extract the normalized route prefix of a location hash (everything before `?`, treating `#` as empty).
 * @param {Location|{hash?: string}|null} [loc] location object
 * @returns {string} route prefix such as `'#/users'` or `''`
 */
function hashPrefixOf(loc) {
    const raw = String(loc?.hash ?? '');
    const at = raw.indexOf('?');
    const prefix = at < 0 ? raw : raw.slice(0, at);
    return prefix === '#' ? '' : prefix;
}

/**
 * Read query parameters stored inside `location.hash` (after the first `?`).
 * Supports hash routes (`#/users?q=alex&page=2`) and bare hash queries (`#?q=alex&page=2`).
 * @param {Location|{hash?: string}|null} [loc] location object, defaulting to `globalThis.location`
 * @returns {URLSearchParams} parsed hash query parameters; empty when absent
 */
export function readHashQuery(loc = globalThis.location) {
    const hash = String(loc?.hash ?? '');
    const at = hash.indexOf('?');
    return new URLSearchParams(at < 0 ? '' : hash.slice(at + 1));
}

/**
 * Format filter and paging entries into a `?key=value` query string, dropping empty, `null`, and `undefined` values.
 * @param {Record<string, unknown>|null|undefined} values parameter map
 * @returns {string} formatted query starting with `?`, or `''` when all values are empty
 */
export function formatHashQuery(values) {
    const entries = [];
    for (const [key, value] of Object.entries(values ?? {})) {
        if (value !== '' && value !== null && value !== undefined) {
            entries.push([key, String(value)]);
        }
    }
    const query = new URLSearchParams(entries).toString();
    return query ? `?${query}` : '';
}

/**
 * Write filter and paging parameters into the URL hash query using `history.replaceState`.
 * Adds no history entry, triggers no `hashchange`, and preserves `pathname`, `search`, and any hash prefix.
 * @param {Record<string, unknown>} values parameter map; empty, `null`, and `undefined` values drop out
 * @param {object} [options] optional injected `{ window, location, history }`
 * @returns {string} the formatted query string written to the hash
 */
export function writeHashQuery(values, options = {}) {
    const query = formatHashQuery(values);
    const { location: loc, history: hist } = resolveNavigation(options);
    if (!loc || !hist || typeof hist.replaceState !== 'function') {
        return query;
    }
    const rawHash = String(loc.hash ?? '');
    const at = rawHash.indexOf('?');
    const prefix = at < 0 ? rawHash : rawHash.slice(0, at);
    let hashPart = '';
    if (query) {
        hashPart = prefix ? `${prefix}${query}` : `#${query}`;
    }
    else if (prefix && prefix !== '#') {
        hashPart = prefix;
    }
    const nextUrl = `${loc.pathname ?? ''}${loc.search ?? ''}${hashPart}`;
    hist.replaceState(hist.state ?? null, '', nextUrl);
    return query;
}

/**
 * Slice one client-side page from a list of rows, clamping the page number to the available range `[1, pages]`.
 * @template T
 * @param {T[]} rows filtered rows to paginate
 * @param {number} page requested 1-based page number
 * @param {number} size number of rows per page
 * @returns {{rows: T[], page: number, pages: number, size: number, total: number, from: number, to: number}}
 *   clamped page slice and range metadata
 */
export function pageOf(rows, page, size) {
    const list = Array.isArray(rows) ? rows : [...(rows ?? [])];
    const pageSize = normalizePositiveInt(size, 1);
    const total = list.length;
    const pages = Math.max(1, Math.ceil(total / pageSize));
    const current = Math.min(Math.max(1, normalizePositiveInt(page, 1)), pages);
    const start = (current - 1) * pageSize;
    const slice = list.slice(start, start + pageSize);
    return {
        rows: slice,
        page: current,
        pages,
        size: pageSize,
        total,
        from: slice.length ? start + 1 : 0,
        to: start + slice.length
    };
}

/**
 * Append non-empty extra parameters to a `URLSearchParams` instance.
 * @param {URLSearchParams} params target search parameters
 * @param {Record<string, unknown>|null|undefined} extra optional filter map
 */
function appendNonEmpty(params, extra) {
    for (const [key, value] of Object.entries(extra ?? {})) {
        if (value !== '' && value !== null && value !== undefined) {
            params.set(key, String(value));
        }
    }
}

/**
 * Build server-side bookmark paging parameters for a Page envelope endpoint (`first`, `prev`, `next`, `last`).
 * @param {'first'|'prev'|'next'|'last'} direction paging direction
 * @param {object|null|undefined} envelope current server Page envelope with `start-bookmark` and `end-bookmark`
 * @param {number} size requested page size
 * @param {Record<string, unknown>|null} [extra] optional non-empty filter parameters to include
 * @returns {URLSearchParams} query parameters for the request
 */
export function pageParams(direction, envelope, size, extra = null) {
    if (!SERVER_DIRECTIONS.has(direction)) {
        throw new RangeError(`Unknown paging direction: ${direction}`);
    }
    const pageSize = normalizePositiveInt(size, 1);
    const params = new URLSearchParams({ page: direction, 'page-size': String(pageSize) });
    if (direction === 'next') {
        const bookmark = envelope?.['end-bookmark'];
        if (bookmark !== null && bookmark !== undefined && bookmark !== '') {
            params.set('page-bookmark', String(bookmark));
        }
    }
    else if (direction === 'prev') {
        const bookmark = envelope?.['start-bookmark'];
        if (bookmark !== null && bookmark !== undefined && bookmark !== '') {
            params.set('page-bookmark', String(bookmark));
        }
    }
    appendNonEmpty(params, extra);
    return params;
}

/**
 * Build server-side `limit` and `offset` parameters from a 1-based page number and page size.
 * @param {number} page 1-based page number
 * @param {number} size rows per page
 * @param {Record<string, unknown>|null} [extra] optional non-empty filter parameters to include
 * @returns {URLSearchParams} query parameters for the request
 */
export function offsetParams(page, size, extra = null) {
    const pageSize = normalizePositiveInt(size, 1);
    const current = normalizePositiveInt(page, 1);
    const params = new URLSearchParams({
        limit: String(pageSize),
        offset: String((current - 1) * pageSize)
    });
    appendNonEmpty(params, extra);
    return params;
}

/**
 * Build default client pager status text matching the admin console format.
 * @param {{page: number, pages: number, total: number, from: number, to: number}} cut page slice from `pageOf`
 * @param {object} options `{ shown, loaded, noun }`
 * @returns {string} status line text
 */
function formatClientPagerText(cut, options = {}) {
    const shown = options.shown ?? cut.total;
    const noun = options.noun ?? DEFAULT_NOUN;
    const range = shown > 0 ? `${cut.from}–${cut.to} of ` : '';
    const filtered = typeof options.loaded === 'number' && shown < options.loaded
        ? ` (filtered from ${options.loaded})`
        : '';
    return `Page ${cut.page} of ${cut.pages} · ${range}${pluralize(shown, noun)}${filtered}`;
}

/**
 * Build default server pager status text for a Page envelope.
 * @param {object|null|undefined} envelope current server Page envelope
 * @param {object} options `{ pageNumber, pageLabel, shown, noun }`
 * @returns {string} status line text
 */
function formatServerPagerText(envelope, options = {}) {
    const label = options.pageLabel
        ?? (options.pageNumber
            ? `Page ${options.pageNumber}`
            : (envelope?.['end-bookmark'] === null || envelope?.['end-bookmark'] === undefined ? 'Last page' : 'Current page'));
    const shown = options.shown ?? (envelope?.elements?.length ?? 0);
    const noun = options.noun ?? DEFAULT_NOUN;
    return `${label} · ${pluralize(shown, noun)} shown`;
}

/**
 * Resolve normalized text, hidden state, and button descriptors for a package pager.
 * @param {object} options pager options (`cut` for client, `envelope` for server, or explicit `actions`)
 * @returns {{label: string, text: string, hidden: boolean, actions: Array<{action: string, label: string, disabled: boolean, onClick?: Function}>}}
 *   normalized pager specification
 */
function resolvePagerSpec(options = {}) {
    const label = options.label ?? 'Pages';
    const hidden = Boolean(options.hidden);
    const onPage = typeof options.onPage === 'function' ? options.onPage : null;

    if (Array.isArray(options.actions)) {
        return {
            label,
            text: options.text ?? '',
            hidden,
            actions: options.actions
        };
    }

    if (options.cut) {
        const cut = options.cut;
        const text = options.text
            ?? (typeof options.formatText === 'function'
                ? options.formatText(cut, options)
                : formatClientPagerText(cut, options));
        return {
            label,
            text,
            hidden,
            actions: [
                { action: 'first', label: 'First', disabled: cut.page <= 1, onClick: onPage ? () => onPage(1) : null },
                { action: 'prev', label: 'Previous', disabled: cut.page <= 1, onClick: onPage ? () => onPage(cut.page - 1) : null },
                { action: 'next', label: 'Next', disabled: cut.page >= cut.pages, onClick: onPage ? () => onPage(cut.page + 1) : null },
                { action: 'last', label: 'Last', disabled: cut.page >= cut.pages, onClick: onPage ? () => onPage(cut.pages) : null }
            ]
        };
    }

    const envelope = options.envelope ?? null;
    const atStart = !envelope || envelope['start-bookmark'] === null || envelope['start-bookmark'] === undefined;
    const atEnd = !envelope || envelope['end-bookmark'] === null || envelope['end-bookmark'] === undefined;
    const text = options.text
        ?? (typeof options.formatText === 'function'
            ? options.formatText(envelope, options)
            : formatServerPagerText(envelope, options));
    return {
        label,
        text,
        hidden,
        actions: [
            { action: 'first', label: 'First', disabled: atStart, onClick: onPage ? () => onPage('first') : null },
            { action: 'prev', label: 'Previous', disabled: atStart, onClick: onPage ? () => onPage('prev') : null },
            { action: 'next', label: 'Next', disabled: atEnd, onClick: onPage ? () => onPage('next') : null },
            { action: 'last', label: 'Last', disabled: atEnd, onClick: onPage ? () => onPage('last') : null }
        ]
    };
}

/**
 * Build a package `<nav class="pager">` matching `components.md#pager` with `data-table-state-*` hooks.
 * @param {Document} [doc] document used to create elements, defaulting to `globalThis.document`
 * @param {object} [options] client (`cut`, `shown`, `loaded`, `noun`, `onPage`), server (`envelope`, `pageNumber`, `shown`, `noun`, `onPage`), or custom (`text`, `actions`) options
 * @returns {HTMLElement} built `<nav class="pager">` element
 */
export function createPager(doc = globalThis.document, options = {}) {
    const dom = options.dom ?? createDomBuilders(doc);
    const spec = resolvePagerSpec(options);
    const buttons = spec.actions.map((item) => dom.button(item.label, item.onClick ?? null, {
        kind: 'secondary',
        disabled: Boolean(item.disabled),
        'data-table-state-action': item.action
    }));
    return dom.h('nav', {
        class: 'pager',
        'aria-label': spec.label,
        hidden: spec.hidden,
        'data-table-state-pager': ''
    },
    dom.h('p', { class: 'pager__text', 'data-table-state-text': '' }, spec.text),
    dom.h('div', { class: 'pager__buttons' }, buttons));
}

/**
 * Normalize a filter field schema definition.
 * @param {unknown} raw default value or descriptor `{ default, values, trim, parse, format }`
 * @returns {{default: unknown, values: unknown[]|null, trim: boolean, parse: Function|null, format: Function|null}}
 *   normalized descriptor
 */
function normalizeFilterSpec(raw) {
    if (raw && typeof raw === 'object' && !Array.isArray(raw) && (
        Object.hasOwn(raw, 'default')
        || Object.hasOwn(raw, 'values')
        || Object.hasOwn(raw, 'trim')
        || Object.hasOwn(raw, 'parse')
        || Object.hasOwn(raw, 'format')
    )) {
        return {
            default: raw.default ?? '',
            values: Array.isArray(raw.values) ? raw.values : null,
            trim: Boolean(raw.trim),
            parse: typeof raw.parse === 'function' ? raw.parse : null,
            format: typeof raw.format === 'function' ? raw.format : null
        };
    }
    return {
        default: raw ?? '',
        values: null,
        trim: false,
        parse: null,
        format: null
    };
}

/**
 * Parse and validate one filter value against its descriptor.
 * @param {object} spec normalized filter descriptor
 * @param {unknown} rawValue candidate value from URL or caller
 * @returns {unknown} validated value or `spec.default`
 */
function coerceFilterValue(spec, rawValue) {
    if (rawValue === null || rawValue === undefined) {
        return spec.default;
    }
    let next = rawValue;
    if (spec.parse) {
        next = spec.parse(rawValue);
    }
    else if (typeof spec.default === 'boolean') {
        if (typeof rawValue === 'string') {
            next = rawValue === 'true' || rawValue === '1';
        }
        else {
            next = Boolean(rawValue);
        }
    }
    else if (typeof rawValue === 'string' && spec.trim) {
        next = rawValue.trim();
    }
    if (spec.values && !spec.values.includes(next)) {
        return spec.default;
    }
    return next;
}

/**
 * Format one filter value for URL hash storage, returning `''` when it matches the default or is empty.
 * @param {object} spec normalized filter descriptor
 * @param {unknown} value current filter value
 * @returns {string} serialized parameter value or `''` to omit
 */
function serializeFilterValue(spec, value) {
    if (value === spec.default || value === '' || value === null || value === undefined || value === false) {
        return '';
    }
    return spec.format ? String(spec.format(value) ?? '') : String(value);
}

/**
 * Create a URL-backed table state controller supporting client slicing and server paging.
 * @param {object} [options] configuration options
 * @param {Record<string, unknown>} [options.filters] filter definitions keyed by query parameter name
 * @param {number[]} [options.sizes] allowed page sizes
 * @param {number} [options.defaultSize] default page size (`sizes[0]` or `20`)
 * @param {string|null} [options.sizeKey] URL query key for page size, `'size'` by default (`null` to omit)
 * @param {string|null} [options.pageKey] URL query key for 1-based page number (`'page'` in client mode, `null` in server bookmark mode by default)
 * @param {'client'|'server'} [options.mode] paging mode, `'client'` by default
 * @param {Document} [options.document] injected document for `createPager`
 * @param {object} [options.dom] pre-created `createDomBuilders` instance
 * @param {Window} [options.window] injected window for `location` and `history`
 * @param {Location} [options.location] injected location override
 * @param {History} [options.history] injected history override
 * @param {(state: object, reason: string) => void} [options.onChange] callback invoked when filters, size, or page change
 * @param {(info: {direction: string, params: URLSearchParams, state: object}) => void} [options.onPage] server navigation callback
 * @returns {object} table state controller
 */
export function createTableState(options = {}) {
    const mode = options.mode === 'server' ? 'server' : 'client';
    const sizes = Array.isArray(options.sizes) ? options.sizes.map((item) => normalizePositiveInt(item, 1)) : null;
    const defaultSize = normalizePositiveInt(options.defaultSize ?? sizes?.[0] ?? 20, 20);
    const sizeKey = options.sizeKey === undefined ? 'size' : options.sizeKey;
    const pageKey = options.pageKey === undefined ? (mode === 'server' ? null : 'page') : options.pageKey;
    const navOptions = {
        window: options.window,
        location: options.location,
        history: options.history
    };
    const view = options.window ?? globalThis.window ?? null;
    const { location: loc } = resolveNavigation(navOptions);
    const initialPrefix = hashPrefixOf(loc);
    const doc = options.document ?? options.window?.document ?? globalThis.document;
    const dom = options.dom ?? null;
    const onChange = typeof options.onChange === 'function' ? options.onChange : null;
    const onServerPage = typeof options.onPage === 'function' ? options.onPage : null;
    const syncListeners = new Set();

    const filterSpecs = new Map();
    for (const [key, raw] of Object.entries(options.filters ?? {})) {
        filterSpecs.set(key, normalizeFilterSpec(raw));
    }

    const state = {
        filters: {},
        size: defaultSize,
        page: 1,
        pages: null,
        envelope: null,
        pageNumber: 1,
        params: null
    };

    /** Read filters, page size, and page number from the current URL hash into `state`. */
    function loadFromUrl() {
        const saved = readHashQuery(loc);
        for (const [key, spec] of filterSpecs) {
            state.filters[key] = saved.has(key) ? coerceFilterValue(spec, saved.get(key)) : spec.default;
        }
        const savedSizeRaw = sizeKey && saved.has(sizeKey) ? Number(saved.get(sizeKey)) : Number.NaN;
        state.size = Number.isFinite(savedSizeRaw)
            ? (sizes ? (sizes.includes(savedSizeRaw) ? savedSizeRaw : defaultSize) : normalizePositiveInt(savedSizeRaw, defaultSize))
            : defaultSize;
        const parsedPage = pageKey && saved.has(pageKey)
            ? normalizePositiveInt(saved.get(pageKey), 1)
            : 1;
        state.page = parsedPage;
        state.pageNumber = parsedPage;
    }

    loadFromUrl();

    const onHashChange = () => {
        if (hashPrefixOf(loc) !== initialPrefix) {
            return;
        }
        loadFromUrl();
        for (const listener of syncListeners) {
            listener();
        }
        notify('hashchange');
    };
    const canListenHash = options.syncHashChange !== false && view && typeof view.addEventListener === 'function';
    if (canListenHash) {
        view.addEventListener('hashchange', onHashChange);
    }

    /**
     * Build the serializable URL parameter dictionary for the current state with optional overrides.
     * @param {Record<string, unknown>} [overrides] temporary overrides for link generation
     * @returns {Record<string, string|number>} hash query map
     */
    function toQueryMap(overrides = null) {
        const out = {};
        for (const [key, spec] of filterSpecs) {
            out[key] = serializeFilterValue(spec, state.filters[key]);
        }
        if (sizeKey) {
            out[sizeKey] = state.size === defaultSize ? '' : state.size;
        }
        if (pageKey) {
            out[pageKey] = state.page > 1 ? state.page : '';
        }
        if (overrides) {
            for (const [key, value] of Object.entries(overrides)) {
                out[key] = value;
            }
        }
        return out;
    }

    /**
     * Return a safe snapshot of the current table state.
     * @returns {{filters: Record<string, unknown>, page: number, size: number, pages: number|null, pageNumber: number|null, envelope: object|null}}
     *   state snapshot
     */
    function getState() {
        return {
            filters: { ...state.filters },
            page: state.page,
            size: state.size,
            pages: state.pages,
            pageNumber: state.pageNumber,
            envelope: state.envelope
        };
    }

    /**
     * Read one filter value by key.
     * @param {string} key filter key
     * @returns {unknown} current filter value
     */
    function getFilter(key) {
        return state.filters[key];
    }

    /**
     * Build the `?k=v` hash query string for the current state (plus optional overrides).
     * @param {Record<string, unknown>} [overrides] optional parameter overrides
     * @returns {string} formatted query string or `''`
     */
    function query(overrides = null) {
        return formatHashQuery(toQueryMap(overrides));
    }

    /**
     * Persist the current state to the URL hash without adding a history entry.
     * @returns {string} written query string
     */
    function syncUrl() {
        return writeHashQuery(toQueryMap(), navOptions);
    }

    /**
     * Emit the `onChange` callback with a fresh state snapshot.
     * @param {string} reason change reason (`'filter'`, `'reset'`, `'size'`, `'page'`)
     */
    function notify(reason) {
        if (onChange) {
            onChange(getState(), reason);
        }
    }

    /**
     * Register a filter definition dynamically (used by `attachTableState` for discovered controls).
     * @param {string} key filter key
     * @param {unknown} rawSpec default value or descriptor
     */
    function registerFilter(key, rawSpec) {
        if (filterSpecs.has(key)) {
            return;
        }
        const spec = normalizeFilterSpec(rawSpec);
        filterSpecs.set(key, spec);
        const currentSaved = readHashQuery(loc);
        state.filters[key] = currentSaved.has(key) ? coerceFilterValue(spec, currentSaved.get(key)) : spec.default;
    }

    /**
     * Update a single filter value, resetting to page 1 unless `resetPage: false`.
     * @param {string} key filter key
     * @param {unknown} value new value
     * @param {{resetPage?: boolean, silent?: boolean}} [callOptions] update options
     * @returns {object} updated state snapshot
     */
    function setFilter(key, value, callOptions = {}) {
        if (!filterSpecs.has(key)) {
            filterSpecs.set(key, normalizeFilterSpec(''));
        }
        state.filters[key] = coerceFilterValue(filterSpecs.get(key), value);
        if (callOptions.resetPage !== false) {
            state.page = 1;
            state.pageNumber = 1;
        }
        syncUrl();
        if (!callOptions.silent) {
            notify('filter');
        }
        return getState();
    }

    /**
     * Update multiple filter values atomically, resetting to page 1 unless `resetPage: false`.
     * @param {Record<string, unknown>} patch filter updates
     * @param {{resetPage?: boolean, silent?: boolean}} [callOptions] update options
     * @returns {object} updated state snapshot
     */
    function setFilters(patch, callOptions = {}) {
        for (const [key, value] of Object.entries(patch ?? {})) {
            if (!filterSpecs.has(key)) {
                filterSpecs.set(key, normalizeFilterSpec(''));
            }
            state.filters[key] = coerceFilterValue(filterSpecs.get(key), value);
        }
        if (callOptions.resetPage !== false) {
            state.page = 1;
            state.pageNumber = 1;
        }
        syncUrl();
        if (!callOptions.silent) {
            notify('filter');
        }
        return getState();
    }

    /**
     * Reset all filters to their defaults and return to page 1.
     * @param {{includeSize?: boolean, silent?: boolean}} [callOptions] reset options
     * @returns {object} updated state snapshot
     */
    function resetFilters(callOptions = {}) {
        for (const [key, spec] of filterSpecs) {
            state.filters[key] = spec.default;
        }
        if (callOptions.includeSize) {
            state.size = defaultSize;
        }
        state.page = 1;
        state.pageNumber = 1;
        syncUrl();
        if (!callOptions.silent) {
            notify('reset');
        }
        return getState();
    }

    /**
     * Update the page size and return to page 1.
     * @param {number|string} size new page size
     * @param {{silent?: boolean}} [callOptions] update options
     * @returns {object} updated state snapshot
     */
    function setSize(size, callOptions = {}) {
        const parsed = normalizePositiveInt(size, defaultSize);
        state.size = sizes ? (sizes.includes(parsed) ? parsed : defaultSize) : parsed;
        state.page = 1;
        state.pageNumber = 1;
        state.params = null;
        syncUrl();
        if (!callOptions.silent) {
            notify('size');
        }
        return getState();
    }

    /**
     * Update the current 1-based page number, clamping to `[1, maxPages]` when known.
     * @param {number} page target 1-based page number
     * @param {{pages?: number, silent?: boolean}} [callOptions] optional upper bound and silence flag
     * @returns {object} updated state snapshot
     */
    function setPage(page, callOptions = {}) {
        let target = normalizePositiveInt(page, 1);
        const bound = callOptions.pages ?? state.pages;
        if (typeof bound === 'number' && bound >= 1) {
            target = Math.min(target, bound);
        }
        state.page = target;
        state.pageNumber = target;
        syncUrl();
        if (!callOptions.silent) {
            notify('page');
        }
        return getState();
    }

    /**
     * Slice the current client-side page from `rows`, clamping the page and syncing the hash if out of range.
     * @template T
     * @param {T[]} rows filtered rows
     * @returns {{rows: T[], page: number, pages: number, size: number, total: number, from: number, to: number}}
     *   clamped page slice
     */
    function slice(rows) {
        const cut = pageOf(rows, state.page, state.size);
        state.pages = cut.pages;
        if (cut.page !== state.page) {
            state.page = cut.page;
            state.pageNumber = cut.page;
            syncUrl();
        }
        return cut;
    }

    /**
     * Build server bookmark parameters for a direction (`first`, `prev`, `next`, `last`, or `current`).
     * @param {'first'|'prev'|'next'|'last'|'current'} [direction] paging direction, `'first'` by default
     * @param {Record<string, unknown>|null} [extra] optional extra query parameters
     * @returns {URLSearchParams} server query parameters
     */
    function serverParams(direction = 'first', extra = null) {
        if (direction === 'current' && state.params) {
            return new URLSearchParams(state.params);
        }
        const effective = direction === 'current' ? 'first' : direction;
        return pageParams(effective, state.envelope, state.size, extra);
    }

    /**
     * Build server offset/limit parameters for the current page and size.
     * @param {Record<string, unknown>|null} [extra] optional extra query parameters
     * @returns {URLSearchParams} server query parameters
     */
    function currentOffsetParams(extra = null) {
        return offsetParams(state.page, state.size, extra);
    }

    /**
     * Record a fetched server Page envelope and update the tracked page number and replayable params.
     * @param {'first'|'prev'|'next'|'last'|'current'} direction direction that produced `envelope`
     * @param {object} envelope fetched Page envelope
     * @param {URLSearchParams|null} [params] optional request parameters to replay on `current`
     * @returns {object} updated state snapshot
     */
    function applyEnvelope(direction, envelope, params = null) {
        const previous = state.pageNumber;
        // Capture the request parameters from the previous envelope before replacing it.
        const requestParams = params ? new URLSearchParams(params) : serverParams(direction);
        state.envelope = envelope ?? null;
        state.params = requestParams;
        if (direction === 'first') {
            state.pageNumber = 1;
        }
        else if (direction === 'next') {
            state.pageNumber = previous ? previous + 1 : null;
        }
        else if (direction === 'prev') {
            state.pageNumber = previous ? Math.max(1, previous - 1) : null;
        }
        else if (direction === 'last') {
            state.pageNumber = null;
        }
        state.page = state.pageNumber ?? 1;
        syncUrl();
        return getState();
    }

    /**
     * Trigger a server page navigation through `options.onPage` (or controller default `onPage`).
     * @param {'first'|'prev'|'next'|'last'} direction direction to load
     * @param {Function|null} [handler] optional per-call override callback
     * @param {Record<string, unknown>|null} [extra] optional extra query parameters
     */
    function navigateServer(direction, handler = null, extra = null) {
        const target = handler ?? onServerPage;
        if (!target) {
            return;
        }
        target({ direction, params: serverParams(direction, extra), state: getState() });
    }

    /**
     * Build a package `.pager` element wired to this controller (client or server mode).
     * @param {object} [pagerOptions] pager options (`cut`, `envelope`, `shown`, `loaded`, `noun`, `label`, `formatText`, `onPage`, `extra`)
     * @returns {HTMLElement} built `<nav class="pager">` element
     */
    function buildControllerPager(pagerOptions = {}) {
        const isServer = mode === 'server' || (!pagerOptions.cut && (pagerOptions.envelope !== undefined || state.envelope !== null));
        if (isServer) {
            const envelope = pagerOptions.envelope !== undefined ? pagerOptions.envelope : state.envelope;
            return createPager(pagerOptions.document ?? doc, {
                dom,
                ...pagerOptions,
                envelope,
                pageNumber: pagerOptions.pageNumber !== undefined ? pagerOptions.pageNumber : state.pageNumber,
                onPage: (direction) => navigateServer(direction, pagerOptions.onPage, pagerOptions.extra)
            });
        }
        return createPager(pagerOptions.document ?? doc, {
            dom,
            ...pagerOptions,
            onPage: (targetPage) => {
                setPage(targetPage, { pages: pagerOptions.cut?.pages });
                if (typeof pagerOptions.onPage === 'function') {
                    pagerOptions.onPage(targetPage);
                }
            }
        });
    }

    /**
     * Register an internal listener invoked after `hashchange` reloads state from the URL.
     * @param {() => void} listener callback to run before `onChange`
     * @returns {() => void} unsubscribe callback
     */
    function onSync(listener) {
        syncListeners.add(listener);
        return () => syncListeners.delete(listener);
    }

    /** Release the `hashchange` listener if attached. */
    function destroy() {
        if (canListenHash && typeof view.removeEventListener === 'function') {
            view.removeEventListener('hashchange', onHashChange);
        }
        syncListeners.clear();
    }

    return {
        getState,
        getFilter,
        query,
        syncUrl,
        setFilter,
        setFilters,
        resetFilters,
        setSize,
        setPage,
        slice,
        serverParams,
        offsetParams: currentOffsetParams,
        applyEnvelope,
        createPager: buildControllerPager,
        registerFilter,
        onSync,
        destroy
    };
}

/**
 * Attach URL-backed table state to existing controls and pager markup inside `root` via `data-table-state-*` hooks.
 *
 * Supported hooks (never CSS classes):
 * - `[data-table-state-filter="key"]`: text/search input, select, or checkbox filter control.
 * - `[data-table-state-size]`: page size select or input.
 * - `[data-table-state-pager]`: `<nav class="pager">` containing `[data-table-state-text]` and
 *   `[data-table-state-action="first"|"prev"|"next"|"last"]` buttons.
 *
 * @param {ParentNode} root container holding the table controls and optional pager
 * @param {object} [options] `createTableState` options plus optional `debounce` (ms for text inputs, default `0`)
 * @returns {object} attached table state controller with `syncControls`, `updatePager`, and `destroy`
 */
export function attachTableState(root, options = {}) {
    if (!root) {
        throw new TypeError('A root element is required.');
    }
    const mode = options.mode === 'server' ? 'server' : 'client';
    const debounceMs = Math.max(0, Number(options.debounce) || 0);
    const doc = options.document ?? root.ownerDocument ?? options.window?.document ?? globalThis.document;
    const onServerPage = typeof options.onPage === 'function' ? options.onPage : null;
    const controller = createTableState({ ...options, document: doc });

    const filterControls = [...root.querySelectorAll('[data-table-state-filter]')];
    const sizeControl = root.querySelector('[data-table-state-size]');
    const pagerNav = root.querySelector('[data-table-state-pager]');
    const cleanups = [];
    const timers = new Map();
    let lastCut = null;
    let pagerExtra = null;

    for (const control of filterControls) {
        const key = control.getAttribute('data-table-state-filter');
        if (!key) {
            continue;
        }
        const isCheckbox = control.tagName === 'INPUT' && control.type === 'checkbox';
        const isText = control.tagName === 'INPUT' && !isCheckbox;
        controller.registerFilter(key, isCheckbox ? false : { default: '', trim: isText });
    }

    /** Synchronize all bound DOM filter and page-size controls with the current state. */
    function syncControls() {
        const snapshot = controller.getState();
        for (const control of filterControls) {
            const key = control.getAttribute('data-table-state-filter');
            if (!key) {
                continue;
            }
            const value = snapshot.filters[key];
            if (control.tagName === 'INPUT' && control.type === 'checkbox') {
                control.checked = Boolean(value);
            }
            else {
                const next = value === null || value === undefined ? '' : String(value);
                if (control.value !== next) {
                    control.value = next;
                }
            }
        }
        if (sizeControl) {
            const sizeText = String(snapshot.size);
            if (sizeControl.value !== sizeText) {
                sizeControl.value = sizeText;
            }
        }
    }

    /** Clear all pending debounce timers. */
    function clearTimers() {
        for (const timer of timers.values()) {
            clearTimeout(timer);
        }
        timers.clear();
    }

    for (const control of filterControls) {
        const key = control.getAttribute('data-table-state-filter');
        if (!key) {
            continue;
        }
        const isCheckbox = control.tagName === 'INPUT' && control.type === 'checkbox';
        const isText = control.tagName === 'INPUT' && !isCheckbox;
        const readValue = () => (isCheckbox ? control.checked : control.value);
        const applyNow = () => {
            if (timers.has(control)) {
                clearTimeout(timers.get(control));
                timers.delete(control);
            }
            controller.setFilter(key, readValue());
        };

        if (isText) {
            const onInput = () => {
                if (debounceMs > 0) {
                    if (timers.has(control)) {
                        clearTimeout(timers.get(control));
                    }
                    timers.set(control, setTimeout(applyNow, debounceMs));
                }
                else {
                    applyNow();
                }
            };
            const onKeydown = (event) => {
                if (event.key === 'Enter' && debounceMs > 0) {
                    event.preventDefault();
                    applyNow();
                }
            };
            control.addEventListener('input', onInput);
            control.addEventListener('keydown', onKeydown);
            cleanups.push(() => {
                control.removeEventListener('input', onInput);
                control.removeEventListener('keydown', onKeydown);
            });
        }
        else {
            control.addEventListener('change', applyNow);
            cleanups.push(() => control.removeEventListener('change', applyNow));
        }
    }

    if (sizeControl) {
        const onSizeChange = () => {
            clearTimers();
            controller.setSize(sizeControl.value);
        };
        sizeControl.addEventListener('change', onSizeChange);
        cleanups.push(() => sizeControl.removeEventListener('change', onSizeChange));
    }

    if (pagerNav) {
        const onPagerClick = (event) => {
            const button = event.target?.closest?.('[data-table-state-action]');
            if (!button || !pagerNav.contains(button) || button.disabled) {
                return;
            }
            const action = button.getAttribute('data-table-state-action');
            if (!SERVER_DIRECTIONS.has(action)) {
                return;
            }
            if (mode === 'server') {
                if (onServerPage) {
                    onServerPage({
                        direction: action,
                        params: controller.serverParams(action, pagerExtra),
                        state: controller.getState()
                    });
                }
                return;
            }
            const current = controller.getState();
            const totalPages = lastCut?.pages ?? current.pages ?? 1;
            const targets = {
                first: 1,
                prev: Math.max(1, current.page - 1),
                next: Math.min(totalPages, current.page + 1),
                last: totalPages
            };
            controller.setPage(targets[action], { pages: totalPages });
        };
        pagerNav.addEventListener('click', onPagerClick);
        cleanups.push(() => pagerNav.removeEventListener('click', onPagerClick));
    }

    /**
     * Update an attached `[data-table-state-pager]` nav element's text, visibility, and boundary button states.
     * @param {object} [pagerOptions] client (`cut`, `shown`, `loaded`, `noun`) or server (`envelope`, `pageNumber`, `shown`, `noun`) options
     * @returns {HTMLElement|null} updated pager element or `null` when absent
     */
    function updatePager(pagerOptions = {}) {
        if (pagerOptions.cut) {
            lastCut = pagerOptions.cut;
        }
        if (pagerOptions.extra !== undefined) {
            pagerExtra = pagerOptions.extra;
        }
        if (!pagerNav) {
            return null;
        }
        const current = controller.getState();
        const spec = resolvePagerSpec({
            ...pagerOptions,
            envelope: pagerOptions.envelope !== undefined ? pagerOptions.envelope : current.envelope,
            pageNumber: pagerOptions.pageNumber !== undefined ? pagerOptions.pageNumber : current.pageNumber
        });
        pagerNav.hidden = spec.hidden;
        if (pagerOptions.label) {
            pagerNav.setAttribute('aria-label', spec.label);
        }
        const textEl = pagerNav.querySelector('[data-table-state-text]');
        if (textEl) {
            textEl.textContent = spec.text;
        }
        const disabledByAction = new Map(spec.actions.map((item) => [item.action, Boolean(item.disabled)]));
        for (const button of pagerNav.querySelectorAll('[data-table-state-action]')) {
            const action = button.getAttribute('data-table-state-action');
            if (disabledByAction.has(action)) {
                button.disabled = disabledByAction.get(action);
            }
        }
        return pagerNav;
    }

    /**
     * Slice client-side rows and remember the resulting page bounds for attached pager buttons.
     * @template T
     * @param {T[]} rows filtered rows
     * @returns {{rows: T[], page: number, pages: number, size: number, total: number, from: number, to: number}}
     *   clamped page slice
     */
    function slice(rows) {
        lastCut = controller.slice(rows);
        return lastCut;
    }

    syncControls();
    cleanups.push(controller.onSync(syncControls));

    return {
        ...controller,
        slice,
        setFilter: (key, value, callOptions) => {
            const result = controller.setFilter(key, value, callOptions);
            syncControls();
            return result;
        },
        setFilters: (patch, callOptions) => {
            const result = controller.setFilters(patch, callOptions);
            syncControls();
            return result;
        },
        resetFilters: (callOptions) => {
            clearTimers();
            const result = controller.resetFilters(callOptions);
            syncControls();
            return result;
        },
        setSize: (size, callOptions) => {
            const result = controller.setSize(size, callOptions);
            syncControls();
            return result;
        },
        syncControls,
        updatePager,
        destroy: () => {
            clearTimers();
            for (const cleanup of cleanups) {
                cleanup();
            }
            cleanups.length = 0;
            controller.destroy();
        }
    };
}
