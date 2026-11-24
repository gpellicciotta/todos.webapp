/**
 * Shared admin Changelog screen (ADR-0003).
 *
 * - Loads releases through an app-supplied data adapter (`adapter.fetchReleases`) via `data-loader.js`,
 *   hiding endpoint differences such as parsed Markdown files (`/CHANGELOG.md`) and JSON endpoints (`/changelog`).
 * - Draws releases with `release-notes.js` grouped by area with status chips and dates, paged ten at a time
 *   (`DEFAULT_PAGE_SIZE = 10`), and uses `dom-builders.js` for empty, loading, failure, and 401 states.
 * - Mounts in the `admin-console.js` frame via `createAdminChangelogScreen` and uses `data-admin-changelog-*`
 *   hooks and ARIA states only.
 */

import { attachDataLoader } from './data-loader.js';
import { createDomBuilders } from './dom-builders.js';
import { createReleaseNotes } from './release-notes.js';

export const DEFAULT_PAGE_SIZE = 10;

const DEFAULT_LABELS = {
    what: 'Changelog',
    empty: 'The changelog has no releases.',
    retry: 'Retry',
    signIn: 'Sign in'
};

const RELEASE_NOTES_LABEL_KEYS = [
    'filterGroup',
    'filterUser',
    'filterAll',
    'latest',
    'breaking',
    'emptyEntries',
    'noDate',
    'otherArea',
    'showOlder'
];

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
 * Extract release-notes label overrides from combined screen `labels` and explicit `releaseNotesLabels`.
 * @param {Record<string, unknown>|undefined} labels screen label overrides
 * @param {Record<string, unknown>|undefined} explicit explicit release-notes label overrides
 * @returns {Record<string, unknown>} merged release-notes label overrides
 */
function pickReleaseNotesLabels(labels, explicit) {
    const picked = {};
    if (labels && typeof labels === 'object') {
        for (const key of RELEASE_NOTES_LABEL_KEYS) {
            if (labels[key] !== undefined) {
                picked[key] = labels[key];
            }
        }
    }
    return explicit && typeof explicit === 'object' ? { ...picked, ...explicit } : picked;
}

/**
 * Normalize an adapter result into a plain array of release objects.
 * Accepts a plain release array, `{ releases: [...] }`, or `{ items: [...] }`.
 * @param {unknown} raw value returned by `adapter.fetchReleases`
 * @returns {object[]} shallow copy of the normalized release list
 */
export function normalizeReleasesResult(raw) {
    if (Array.isArray(raw)) {
        return [...raw];
    }
    if (raw && typeof raw === 'object') {
        if (Array.isArray(raw.releases)) {
            return [...raw.releases];
        }
        if (Array.isArray(raw.items)) {
            return [...raw.items];
        }
    }
    return [];
}

/**
 * Attach the shared admin Changelog screen to a container element.
 * Loads releases through `options.adapter.fetchReleases` and renders them with `release-notes.js`,
 * grouped by area with status chips and paged ten at a time by default.
 * @param {HTMLElement} root target container element
 * @param {object} options screen configuration
 * @param {{fetchReleases: (context: {signal?: AbortSignal}) => Promise<object[]|{releases: object[]}|{items: object[]}>}} options.adapter app data adapter
 * @param {number} [options.pageSize=10] releases shown per page
 * @param {boolean} [options.groupByArea=true] group entries under area headings
 * @param {boolean} [options.showStatus=true] show release status chips and dates
 * @param {boolean} [options.showFilter=false] show User Highlights / All Changes filter chips
 * @param {'user'|'all'} [options.filter] initial release-notes filter mode
 * @param {boolean} [options.showCategoryBadges] show per-entry category badges
 * @param {boolean} [options.showLatest=true] show the Latest badge when a release marks `isLatest`
 * @param {boolean} [options.collapsible=false] render each release as a collapsible panel
 * @param {boolean} [options.openFirst=true] expand the first release when `collapsible` is `true`
 * @param {string} [options.idPrefix] optional `idPrefix` forwarded to `createReleaseNotes`
 * @param {Record<string, string>} [options.categoryLabels] custom category labels forwarded to `release-notes.js`
 * @param {Record<string, string>} [options.statusLabels] custom status labels forwarded to `release-notes.js`
 * @param {Record<string, unknown>} [options.releaseNotesLabels] label overrides forwarded to `release-notes.js`
 * @param {Record<string, string|null>} [options.icons] icon overrides forwarded to `release-notes.js`
 * @param {(mode: 'user'|'all') => void} [options.onFilterChange] callback fired when the release-notes filter changes
 * @param {boolean} [options.autoLoad=true] fetch releases immediately on mount
 * @param {(releases: object[], helpers: object) => unknown} [options.extraSections] optional app-specific trailing sections
 * @param {(error: unknown) => void} [options.onSignIn] callback wired to 401 Sign in actions
 * @param {(error: unknown) => boolean} [options.isUnauthorized] predicate classifying 401 errors
 * @param {Document} [options.document] injected document
 * @param {object} [options.dom] pre-created `createDomBuilders` instance
 * @param {AbortSignal} [options.signal] external abort signal that disposes the screen
 * @param {object} [options.labels] label and message overrides
 * @returns {{element: HTMLElement, refresh: (options?: {quiet?: boolean}) => Promise<boolean>, showMore: () => void,
 *   setFilter: (mode: 'user'|'all') => void, getFilter: () => 'user'|'all'|null, expandAll: () => void,
 *   collapseAll: () => void, getReleases: () => object[], getReleaseNotes: () => object|null,
 *   dispose: () => void, destroy: () => void}} screen controller
 */
export function attachAdminChangelog(root, options = {}) {
    if (!isNode(root) || root.nodeType !== 1) {
        throw new TypeError('A container element is required for admin-changelog.');
    }
    const fetchReleases = options?.adapter?.fetchReleases;
    if (typeof fetchReleases !== 'function') {
        throw new TypeError('An adapter with a fetchReleases function is required for admin-changelog.');
    }

    const doc = options.document ?? root.ownerDocument ?? globalThis.document;
    const ownsDom = !options.dom;
    const dom = options.dom ?? createDomBuilders(doc);
    const labels = { ...DEFAULT_LABELS, ...options.labels };
    const releaseNotesLabels = pickReleaseNotesLabels(options.labels, options.releaseNotesLabels);

    const pageSize = options.pageSize ?? DEFAULT_PAGE_SIZE;
    const groupByArea = options.groupByArea ?? true;
    const showStatus = options.showStatus ?? true;
    const showFilter = options.showFilter ?? false;
    const collapsible = options.collapsible ?? false;
    const openFirst = options.openFirst ?? true;
    const showLatest = options.showLatest ?? true;

    let destroyed = false;
    let lastReleases = [];
    let releaseNotesController = null;

    root.setAttribute('data-admin-changelog', '');
    const body = dom.h('div', { class: 'loading', 'data-admin-changelog-body': '' });
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
        signInLabel: options.signInLabel ?? labels.signIn,
        retryIcon: options.retryIcon,
        errorIcon: options.errorIcon
    });

    /** Destroy the currently rendered release-notes controller, if any. */
    function clearRenderer() {
        if (releaseNotesController) {
            releaseNotesController.destroy();
            releaseNotesController = null;
        }
    }

    /**
     * Load releases from the adapter and render them, resetting pagination to the first page.
     * @param {{quiet?: boolean}} [callOptions] `quiet: true` keeps shown content visible under `aria-busy`
     * @returns {Promise<boolean>} `true` when the changelog rendered
     */
    function refresh(callOptions = {}) {
        if (destroyed) {
            return Promise.resolve(false);
        }
        const quiet = Boolean(callOptions?.quiet);
        if (!quiet) {
            clearRenderer();
        }
        return loader.load({
            quiet,
            fetcher: ({ signal }) => fetchReleases({ signal: combineSignals(signal, options.signal) }),
            render: (raw) => {
                clearRenderer();
                const releases = normalizeReleasesResult(raw);
                lastReleases = releases;
                const helpers = { dom, labels, refresh, context: options.context };
                const extra = typeof options.extraSections === 'function'
                    ? options.extraSections(releases, helpers)
                    : null;

                if (releases.length === 0) {
                    return [
                        dom.emptyState(labels.empty, null, { 'data-admin-changelog-empty': '' }),
                        extra
                    ];
                }

                const rendererOptions = {
                    releases,
                    pageSize,
                    groupByArea,
                    showStatus,
                    showFilter,
                    showLatest,
                    collapsible,
                    openFirst,
                    labels: releaseNotesLabels
                };
                if (options.filter !== undefined) {
                    rendererOptions.filter = options.filter;
                }
                if (options.showCategoryBadges !== undefined) {
                    rendererOptions.showCategoryBadges = options.showCategoryBadges;
                }
                if (options.idPrefix !== undefined) {
                    rendererOptions.idPrefix = options.idPrefix;
                }
                if (options.categoryLabels !== undefined) {
                    rendererOptions.categoryLabels = options.categoryLabels;
                }
                if (options.statusLabels !== undefined) {
                    rendererOptions.statusLabels = options.statusLabels;
                }
                if (options.icons !== undefined) {
                    rendererOptions.icons = options.icons;
                }
                if (typeof options.onFilterChange === 'function') {
                    rendererOptions.onFilterChange = options.onFilterChange;
                }

                releaseNotesController = createReleaseNotes(doc, rendererOptions);
                return [releaseNotesController.element, extra];
            }
        });
    }

    /** Cancel active requests and release nested renderer, signal listener, and owned builders. */
    function destroy() {
        if (destroyed) {
            return;
        }
        destroyed = true;
        clearRenderer();
        loader.destroy();
        options.signal?.removeEventListener('abort', destroy);
        if (ownsDom) {
            dom.destroy();
        }
    }

    const controller = {
        element: root,
        refresh,
        showMore: () => releaseNotesController?.showMore(),
        setFilter: (mode) => releaseNotesController?.setFilter(mode),
        getFilter: () => releaseNotesController?.getFilter() ?? null,
        expandAll: () => releaseNotesController?.expandAll(),
        collapseAll: () => releaseNotesController?.collapseAll(),
        getReleases: () => [...lastReleases],
        getReleaseNotes: () => releaseNotesController,
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
 * Create a new Changelog screen root in an injected `Document` and attach the controller to it.
 * @param {Document|object} [docOrOptions] injected `Document` or options object
 * @param {object} [options] options passed to `attachAdminChangelog`
 * @returns {ReturnType<typeof attachAdminChangelog>} screen controller
 */
export function createAdminChangelog(docOrOptions = globalThis.document, options = {}) {
    if (isNode(docOrOptions) && docOrOptions.nodeType === 9) {
        const root = docOrOptions.createElement('div');
        return attachAdminChangelog(root, { document: docOrOptions, ...options });
    }
    const resolved = (docOrOptions && typeof docOrOptions === 'object' ? docOrOptions : options) ?? {};
    const doc = resolved.document ?? globalThis.document;
    const root = doc.createElement('div');
    return attachAdminChangelog(root, { document: doc, ...resolved });
}

/**
 * Build an `admin-console.js` screen descriptor for the shared Changelog screen.
 * @param {object} options screen and `attachAdminChangelog` options (`adapter`, `name`, `title`, `icon`, `badge`, `pageSize`, ...)
 * @returns {{name: string, title: string, icon: string|Node|undefined, badge: unknown, mount: Function}}
 *   screen descriptor ready for `createAdminConsole` or `attachAdminConsole`
 */
export function createAdminChangelogScreen(options = {}) {
    if (typeof options?.adapter?.fetchReleases !== 'function') {
        throw new TypeError('An adapter with a fetchReleases function is required for admin-changelog.');
    }
    const {
        name = 'changelog',
        title = 'Changelog',
        icon = 'note',
        badge,
        ...changelogOptions
    } = options;

    return {
        name,
        title,
        icon,
        badge,
        mount: (view, ctx, route) => attachAdminChangelog(view, {
            ...changelogOptions,
            document: changelogOptions.document ?? view.ownerDocument,
            dom: changelogOptions.dom ?? ctx?.dom,
            onSignIn: changelogOptions.onSignIn ?? ctx?.signIn,
            signal: changelogOptions.signal ?? ctx?.screenSignal,
            context: ctx,
            route
        })
    };
}
