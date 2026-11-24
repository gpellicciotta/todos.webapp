/**
 * Shared admin Overview screen (ADR-0003).
 *
 * - Displays the server's state as bordered facts (`dom-builders.js`), loaded through an app-supplied data adapter
 *   (`adapter.fetchStatus`) and `data-loader.js`.
 * - Reloads quietly on a configurable interval (30 seconds by default) while the page is visible via `auto-refresh.js`,
 *   stopping while hidden and refreshing on return after a hidden interval.
 * - Mounts in the `admin-console.js` frame via `createAdminOverviewScreen`, exposes `data-admin-overview-*` hooks and
 *   ARIA states only, and supports app-specific `extraFacts` and `extraSections` extension hooks.
 */

import { attachAutoRefresh } from './auto-refresh.js';
import { attachDataLoader } from './data-loader.js';
import { createDomBuilders } from './dom-builders.js';

export const DEFAULT_RELOAD_INTERVAL = 30_000;

const DEFAULT_LABELS = {
    what: 'Server status',
    sectionTitle: 'Server',
    status: 'Status',
    running: 'Running',
    unknown: 'Unknown',
    uptime: 'Uptime',
    version: 'Version',
    buildTime: 'Build time',
    environment: 'Environment',
    repository: 'Repository',
    connected: 'Connected',
    notConnected: 'Not connected',
    repositoryVersion: (version) => ` version ${version}`,
    loggedInSessions: 'Signed-in sessions',
    feedbackAddress: 'Feedback address',
    apiUrl: 'API base URL',
    empty: '—',
    retry: 'Retry',
    repositoryDisconnected: 'The repository is not connected. Accounts, sessions, and system events cannot load.',
    updated: (time, intervalMs) => {
        if (typeof intervalMs === 'number' && Number.isFinite(intervalMs) && intervalMs > 0) {
            if (intervalMs >= 1000 && intervalMs % 1000 === 0) {
                const seconds = intervalMs / 1000;
                return `Updated ${time}. Refreshes every ${seconds} ${seconds === 1 ? 'second' : 'seconds'} while the tab is visible.`;
            }
            return `Updated ${time}. Refreshes automatically while the tab is visible.`;
        }
        return `Updated ${time}.`;
    }
};

const pad = (number) => String(number).padStart(2, '0');

/**
 * Tell whether a value is a DOM `Node` across realms and injected documents.
 * @param {unknown} value candidate value
 * @returns {boolean} `true` when `value` is a DOM node
 */
function isNode(value) {
    return typeof value === 'object' && value !== null && typeof value.nodeType === 'number';
}

/**
 * Resolve a static string or formatter callback.
 * @param {string|Function} entry static text or formatter function
 * @param {...unknown} args arguments forwarded to formatter
 * @returns {string} formatted text
 */
function resolveText(entry, ...args) {
    return typeof entry === 'function' ? entry(...args) : String(entry ?? '');
}

/**
 * Capitalize the first character of a trimmed string.
 * @param {unknown} value input text
 * @returns {string} capitalized string or empty string
 */
function capitalize(value) {
    const text = String(value ?? '').trim();
    return text ? text.charAt(0).toUpperCase() + text.slice(1) : '';
}

/**
 * Check whether an href is safe to emit on a link (`#`, `/`, relative, or `http(s):`).
 * @param {unknown} href candidate URL
 * @returns {boolean} `true` when safe
 */
function isSafeHref(href) {
    if (typeof href !== 'string') {
        return false;
    }
    const trimmed = href.trim();
    if (!trimmed || /[\u0000-\u001f\u007f]/.test(trimmed)) {
        return false;
    }
    if (trimmed.startsWith('#') || (trimmed.startsWith('/') && !trimmed.startsWith('//'))) {
        return true;
    }
    if (/^https?:\/\//i.test(trimmed)) {
        return true;
    }
    return !/^[a-z][a-z0-9+.-]*:/i.test(trimmed) && !trimmed.startsWith('//');
}

/**
 * Check whether a feedback address is safe to emit inside a `mailto:` link.
 * @param {unknown} address candidate email address
 * @returns {boolean} `true` when safe
 */
function isSafeEmail(address) {
    if (typeof address !== 'string') {
        return false;
    }
    const trimmed = address.trim();
    return Boolean(trimmed) && trimmed.includes('@') && !/[\s:\u0000-\u001f\u007f]/.test(trimmed);
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
 * Format an ISO-8601 timestamp or `Date` as local `YYYY-MM-DD HH:MM:SS`.
 * Missing values return `emptyText`; unparseable strings return verbatim.
 * @param {string|Date|number|null|undefined} value timestamp value
 * @param {string} [emptyText] fallback text when missing, `'—'` by default
 * @returns {string} formatted timestamp
 */
export function formatTimestamp(value, emptyText = '—') {
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
 * Normalize nested `extra-info`, flat kebab-case, and camelCase server status payloads into one shape.
 * @param {object|null|undefined} raw server status payload returned by `adapter.fetchStatus`
 * @param {object} [options] normalization options
 * @param {string} [options.healthyStatus] server status value treated as healthy, `'running'` by default
 * @param {string} [options.healthyRepositoryStatus] repository status treated as connected, `'connected'` by default
 * @returns {object} normalized server status object
 */
export function normalizeServerStatus(raw, options = {}) {
    const source = raw && typeof raw === 'object' ? raw : {};
    const info = source['extra-info'] && typeof source['extra-info'] === 'object' ? source['extra-info'] : {};
    const healthyStatus = String(options.healthyStatus ?? 'running').toLowerCase();
    const healthyRepo = String(options.healthyRepositoryStatus ?? 'connected').toLowerCase();

    const status = source.status ?? null;
    const running = typeof source.running === 'boolean'
        ? source.running
        : String(status ?? '').trim().toLowerCase() === healthyStatus;
    const repositoryStatus = source.repositoryStatus
        ?? source['repository-status']
        ?? info.repositoryStatus
        ?? info['repository-status']
        ?? null;
    const repositoryConnected = typeof source.repositoryConnected === 'boolean'
        ? source.repositoryConnected
        : String(repositoryStatus ?? '').trim().toLowerCase() === healthyRepo;
    const repositoryVersion = source.repositoryVersion
        ?? source['repository-version']
        ?? info.repositoryVersion
        ?? info['repository-version']
        ?? null;
    const loggedInSessions = source.loggedInSessions
        ?? source['logged-in-sessions']
        ?? source['logged-in-session-count']
        ?? info.loggedInSessions
        ?? info['logged-in-sessions']
        ?? info['logged-in-session-count']
        ?? null;
    const hasFeedbackAddress = Object.hasOwn(source, 'feedbackAddress')
        || Object.hasOwn(source, 'feedback-address')
        || Object.hasOwn(info, 'feedbackAddress')
        || Object.hasOwn(info, 'feedback-address');
    const feedbackAddress = source.feedbackAddress
        ?? source['feedback-address']
        ?? info.feedbackAddress
        ?? info['feedback-address']
        ?? null;
    const apiUrl = source.apiUrl
        ?? source['api-url']
        ?? source.baseUrl
        ?? source['base-url']
        ?? info.apiUrl
        ?? info['api-url']
        ?? info.baseUrl
        ?? info['base-url']
        ?? null;

    return {
        status,
        running,
        uptime: source.uptime ?? info.uptime ?? null,
        version: source.version ?? info.version ?? null,
        buildTime: source.buildTime ?? source['build-time'] ?? info.buildTime ?? info['build-time'] ?? null,
        environment: source.environment ?? info.environment ?? null,
        repositoryStatus,
        repositoryConnected,
        repositoryVersion,
        loggedInSessions,
        hasFeedbackAddress,
        feedbackAddress,
        apiUrl,
        raw: source
    };
}

/**
 * Build the bordered facts rows for a server status payload using `dom-builders.js`.
 * @param {object} statusInput raw or normalized server status
 * @param {object} [options] builder options (`document`, `dom`, `labels`, `changelogHref`, `formatTime`, `extraFacts`)
 * @returns {Array<{term: string, value: unknown, key: string}>} fact rows for `dom.facts(...)`
 */
export function buildServerFacts(statusInput, options = {}) {
    const normalized = statusInput && typeof statusInput.running === 'boolean' && Object.hasOwn(statusInput, 'raw')
        ? statusInput
        : normalizeServerStatus(statusInput, options);
    const doc = options.document ?? globalThis.document;
    const dom = options.dom ?? createDomBuilders(doc);
    const labels = { ...DEFAULT_LABELS, ...options.labels };
    const formatTime = typeof options.formatTime === 'function' ? options.formatTime : formatTimestamp;
    const changelogHref = options.changelogHref !== undefined ? options.changelogHref : '#/changelog';

    const statusLabel = normalized.running
        ? labels.running
        : (capitalize(normalized.status) || labels.unknown);

    const rawRepo = String(normalized.repositoryStatus ?? '').trim();
    const repoLower = rawRepo.toLowerCase();
    const repoLabel = normalized.repositoryConnected
        ? labels.connected
        : ((!rawRepo || repoLower === 'disconnected' || repoLower === 'not connected' || repoLower === 'not-connected')
            ? labels.notConnected
            : capitalize(rawRepo));
    const repoChip = dom.severityChip(normalized.repositoryConnected ? 'ok' : 'error', repoLabel);
    const repoValue = normalized.repositoryConnected && normalized.repositoryVersion
        ? [repoChip, resolveText(labels.repositoryVersion, normalized.repositoryVersion)]
        : repoChip;

    const versionValue = normalized.version
        ? (isSafeHref(changelogHref)
            ? dom.h('a', { href: changelogHref.trim() }, String(normalized.version))
            : String(normalized.version))
        : labels.empty;

    const rows = [
        { term: labels.status, value: dom.severityChip(normalized.running ? 'ok' : 'error', statusLabel), key: 'status' },
        { term: labels.uptime, value: normalized.uptime ?? labels.empty, key: 'uptime' },
        { term: labels.version, value: versionValue, key: 'version' },
        { term: labels.buildTime, value: formatTime(normalized.buildTime, labels.empty), key: 'build-time' },
        { term: labels.environment, value: normalized.environment ?? labels.empty, key: 'environment' },
        { term: labels.repository, value: repoValue, key: 'repository' },
        {
            term: labels.loggedInSessions,
            value: normalized.loggedInSessions !== null && normalized.loggedInSessions !== undefined
                ? String(normalized.loggedInSessions)
                : labels.empty,
            key: 'logged-in-sessions'
        }
    ];

    if (normalized.hasFeedbackAddress) {
        const feedback = normalized.feedbackAddress;
        const feedbackValue = feedback
            ? (isSafeEmail(feedback)
                ? dom.h('a', { href: `mailto:${feedback.trim()}` }, feedback.trim())
                : String(feedback))
            : labels.empty;
        rows.push({ term: labels.feedbackAddress, value: feedbackValue, key: 'feedback-address' });
    }

    rows.push({
        term: labels.apiUrl,
        value: normalized.apiUrl ? dom.h('code', null, String(normalized.apiUrl)) : labels.empty,
        key: 'api-url'
    });

    if (typeof options.extraFacts === 'function') {
        const extra = options.extraFacts(normalized, { dom, formatTime, labels });
        if (Array.isArray(extra)) {
            rows.push(...extra.filter(Boolean));
        }
    }

    return rows;
}

/**
 * Attach the shared admin Overview screen to a container element.
 * Loads server status through `options.adapter.fetchStatus`, renders facts and repository/error alerts,
 * and reloads quietly while the page is visible.
 * @param {HTMLElement} root target container element
 * @param {object} options screen configuration
 * @param {{fetchStatus: (context: {signal?: AbortSignal}) => Promise<object>}} options.adapter app data adapter
 * @param {number|null|false} [options.interval] reload interval in ms while visible, `30_000` by default; `0`/`null`/`false` disables polling
 * @param {number} [options.longAbsence] hidden duration in ms that triggers an immediate refresh on tab return, `interval` by default
 * @param {boolean} [options.compact] render compact facts list when `true`
 * @param {string|null} [options.changelogHref] link target for the Version fact, `'#/changelog'` by default, or `null` for plain text
 * @param {boolean} [options.showRepositoryBanner] show the disconnected-repository alert banner when `false` disables it, `true` by default
 * @param {boolean} [options.autoLoad] trigger initial load immediately, `true` by default
 * @param {(status: object, helpers: object) => Array} [options.facts] replace the entire Server facts rows array
 * @param {(status: object, helpers: object) => Array} [options.extraFacts] append app-specific fact rows
 * @param {(status: object, helpers: object) => unknown} [options.extraSections] render app-specific sections after Server facts
 * @param {(error: unknown) => void} [options.onSignIn] callback wired to 401 Sign in actions
 * @param {(error: unknown) => boolean} [options.isUnauthorized] predicate classifying 401 errors
 * @param {() => number} [options.now] clock in ms, `Date.now` by default
 * @param {Document} [options.document] injected document
 * @param {object} [options.dom] pre-created `createDomBuilders` instance
 * @param {AbortSignal} [options.signal] external abort signal that disposes the screen
 * @param {object} [options.labels] label and message overrides
 * @returns {{element: HTMLElement, refresh: (options?: {quiet?: boolean}) => Promise<boolean>, getStatus: () => object|null, dispose: () => void, destroy: () => void}}
 *   screen controller
 */
export function attachAdminOverview(root, options = {}) {
    if (!isNode(root) || root.nodeType !== 1) {
        throw new TypeError('A container element is required for admin-overview.');
    }
    const fetchStatus = options?.adapter?.fetchStatus;
    if (typeof fetchStatus !== 'function') {
        throw new TypeError('An adapter with a fetchStatus function is required for admin-overview.');
    }

    const doc = options.document ?? root.ownerDocument ?? globalThis.document;
    const ownsDom = !options.dom;
    const dom = options.dom ?? createDomBuilders(doc);
    const labels = { ...DEFAULT_LABELS, ...options.labels };
    const formatTime = typeof options.formatTime === 'function' ? options.formatTime : formatTimestamp;
    const now = typeof options.now === 'function' ? options.now : Date.now;
    const rawInterval = options.interval === undefined ? DEFAULT_RELOAD_INTERVAL : options.interval;
    const hasAutoRefresh = typeof rawInterval === 'number' && Number.isFinite(rawInterval) && rawInterval > 0;
    const effectiveInterval = hasAutoRefresh ? rawInterval : 0;

    let destroyed = false;
    let lastStatus = null;
    let autoRefresh = null;

    root.setAttribute('data-admin-overview', '');
    const body = dom.h('div', { class: 'loading', 'data-admin-overview-body': '' });
    dom.setChildren(root, body);

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
     * Load the server status through the adapter and render it.
     * @param {{quiet?: boolean}} [callOptions] `quiet: true` keeps shown facts visible under `aria-busy`
     * @returns {Promise<boolean>} `true` when the status rendered
     */
    function refresh(callOptions = {}) {
        if (destroyed) {
            return Promise.resolve(false);
        }
        return loader.load({
            quiet: Boolean(callOptions?.quiet),
            fetcher: ({ signal }) => fetchStatus({ signal: combineSignals(signal, options.signal) }),
            render: (rawStatus) => {
                lastStatus = rawStatus;
                const normalized = normalizeServerStatus(rawStatus, options);
                const helpers = { dom, formatTime, labels, refresh, context: options.context };
                const rows = typeof options.facts === 'function'
                    ? options.facts(normalized, helpers)
                    : buildServerFacts(normalized, { ...options, dom, labels, formatTime });
                const showRepoBanner = options.showRepositoryBanner !== false && !normalized.repositoryConnected;
                const updatedClock = formatTime(new Date(now()), labels.empty).slice(11);
                const updatedText = resolveText(labels.updated, updatedClock, effectiveInterval, normalized);
                const extra = typeof options.extraSections === 'function'
                    ? options.extraSections(normalized, helpers)
                    : null;

                return [
                    showRepoBanner
                        ? dom.errorBanner(
                            resolveText(labels.repositoryDisconnected, normalized),
                            dom.button(labels.retry, () => refresh(), {
                                icon: 'refresh',
                                'data-admin-overview-action': 'retry'
                            }),
                            { 'data-admin-overview-banner': 'repository' }
                        )
                        : null,
                    dom.h('section', { class: 'loading', 'data-admin-overview-section': 'server' },
                        dom.h('h2', null, labels.sectionTitle),
                        dom.facts(rows, Boolean(options.compact)),
                        updatedText ? dom.statusLine(updatedText, { 'data-admin-overview-status': '' }) : null),
                    extra
                ];
            }
        });
    }

    /** Stop polling, cancel active requests, and release listeners and owned builders. */
    function destroy() {
        if (destroyed) {
            return;
        }
        destroyed = true;
        autoRefresh?.destroy();
        autoRefresh = null;
        loader.destroy();
        options.signal?.removeEventListener('abort', destroy);
        if (ownsDom) {
            dom.destroy();
        }
    }

    if (options.signal) {
        if (options.signal.aborted) {
            destroy();
            return {
                element: root,
                refresh,
                getStatus: () => lastStatus,
                dispose: destroy,
                destroy
            };
        }
        options.signal.addEventListener('abort', destroy, { once: true });
    }

    if (hasAutoRefresh) {
        autoRefresh = attachAutoRefresh({
            document: doc,
            interval: effectiveInterval,
            longAbsence: options.longAbsence ?? effectiveInterval,
            now,
            onPoll: () => {
                refresh({ quiet: true });
            },
            onReturn: ({ long }) => {
                if (long) {
                    refresh({ quiet: true });
                }
            }
        });
    }

    if (options.autoLoad !== false) {
        refresh();
    }

    return {
        element: root,
        refresh,
        getStatus: () => lastStatus,
        dispose: destroy,
        destroy
    };
}

/**
 * Create a new Overview screen root in an injected `Document` and attach the controller to it.
 * @param {Document|object} [docOrOptions] injected `Document` or options object
 * @param {object} [options] options passed to `attachAdminOverview`
 * @returns {{element: HTMLElement, refresh: (options?: {quiet?: boolean}) => Promise<boolean>, getStatus: () => object|null, dispose: () => void, destroy: () => void}}
 *   screen controller
 */
export function createAdminOverview(docOrOptions = globalThis.document, options = {}) {
    if (isNode(docOrOptions) && docOrOptions.nodeType === 9) {
        const root = docOrOptions.createElement('div');
        return attachAdminOverview(root, { document: docOrOptions, ...options });
    }
    const resolved = (docOrOptions && typeof docOrOptions === 'object' ? docOrOptions : options) ?? {};
    const doc = resolved.document ?? globalThis.document;
    const root = doc.createElement('div');
    return attachAdminOverview(root, { document: doc, ...resolved });
}

/**
 * Build an `admin-console.js` screen descriptor for the shared Overview screen.
 * @param {object} options screen and `attachAdminOverview` options (`adapter`, `name`, `title`, `icon`, `badge`, `interval`, ...)
 * @returns {{name: string, title: string, icon: string|Node|undefined, badge: unknown, mount: Function}}
 *   screen descriptor ready for `createAdminConsole` or `attachAdminConsole`
 */
export function createAdminOverviewScreen(options = {}) {
    if (typeof options?.adapter?.fetchStatus !== 'function') {
        throw new TypeError('An adapter with a fetchStatus function is required for admin-overview.');
    }
    const {
        name = 'overview',
        title = 'Overview',
        icon = 'overview',
        badge,
        ...overviewOptions
    } = options;

    return {
        name,
        title,
        icon,
        badge,
        mount: (view, ctx, route) => attachAdminOverview(view, {
            ...overviewOptions,
            document: overviewOptions.document ?? view.ownerDocument,
            dom: overviewOptions.dom ?? ctx?.dom,
            onSignIn: overviewOptions.onSignIn ?? ctx?.signIn,
            signal: overviewOptions.signal ?? ctx?.screenSignal,
            context: ctx,
            route
        })
    };
}
