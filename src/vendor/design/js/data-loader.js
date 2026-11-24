/**
 * Data loading helper (ADR-0003).
 *
 * - Loads async data into a container with loading, failed (Retry), and expired-session (Sign in) states.
 * - Uses `dom-builders.js` for status lines, danger error banners, and action buttons.
 * - Newest call on a container wins: older calls are aborted via `AbortSignal` and their late results are dropped.
 * - Quiet mode keeps shown content visible with `aria-busy="true"` while polling; non-quiet loads render a polite
 *   `role="status"` line outside any `aria-busy` region so announcements are not deferred.
 */

import { createDomBuilders } from './dom-builders.js';

const activeRuns = new WeakMap();

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
 * Normalize the subject label for default status and error messages.
 * @param {unknown} what subject phrase, such as `"Server status"`
 * @returns {string} trimmed subject, defaulting to `"Data"`
 */
function subjectOf(what) {
    return typeof what === 'string' && what.trim() ? what.trim() : 'Data';
}

/**
 * Build the default loading announcement for a subject.
 * @param {string} what subject phrase
 * @returns {string} loading message
 */
function defaultLoadingText(what) {
    return `Loading ${what.toLowerCase()}…`;
}

/**
 * Build the default error message for a failed or unauthorized load.
 * @param {string} what subject phrase
 * @param {unknown} error caught error
 * @param {boolean} unauthorized whether the failure represents an expired session
 * @returns {string} error message
 */
function defaultErrorText(what, error, unauthorized) {
    const raw = messageOf(error);
    const detail = raw.endsWith('.') ? raw : `${raw}.`;
    return `${what} could not be loaded: ${detail}${unauthorized ? ' Sign in again.' : ''}`;
}

/**
 * Tell whether an error represents a 401 Unauthorized response.
 * @param {unknown} error caught error
 * @returns {boolean} `true` when `error.status === 401`
 */
function defaultIsUnauthorized(error) {
    return Boolean(error && typeof error === 'object' && error.status === 401);
}

/**
 * Start a new tracked run on `container`, aborting any previous in-flight run.
 * @param {HTMLElement} container target container
 * @returns {{run: number, controller: AbortController|null}} run state
 */
function startRun(container) {
    const previous = activeRuns.get(container);
    previous?.controller?.abort();
    const run = (previous?.run ?? 0) + 1;
    const controller = typeof AbortController === 'function' ? new AbortController() : null;
    const state = { run, controller };
    activeRuns.set(container, state);
    return state;
}

/**
 * Cancel any active run on `container`, abort its signal, and clear `aria-busy`.
 * @param {HTMLElement|null|undefined} container target container
 */
function cancelContainer(container) {
    if (!container) {
        return;
    }
    const previous = activeRuns.get(container);
    if (previous) {
        previous.controller?.abort();
        activeRuns.set(container, { run: previous.run + 1, controller: null });
    }
    container.removeAttribute('aria-busy');
}

/**
 * Check whether `run` is still the latest active run on `container`.
 * @param {HTMLElement} container target container
 * @param {number} run run token
 * @returns {boolean} `true` when `run` is current
 */
function isCurrentRun(container, run) {
    return activeRuns.get(container)?.run === run;
}

/**
 * Execute one load lifecycle into `container` with loading, error, and 401 sign-in states.
 * @param {HTMLElement} container target container element
 * @param {object} config normalized load options
 * @returns {Promise<boolean>} `true` when this run rendered the fetched data
 */
async function executeLoad(container, config) {
    if (!container) {
        throw new TypeError('A target container element is required.');
    }
    const { fetcher, render } = config;
    if (typeof fetcher !== 'function') {
        throw new TypeError('A fetcher function is required.');
    }
    if (typeof render !== 'function') {
        throw new TypeError('A render function is required.');
    }

    const doc = config.document ?? container.ownerDocument ?? globalThis.document;
    const dom = config.dom ?? createDomBuilders(doc);
    const what = subjectOf(config.what);
    const quiet = Boolean(config.quiet);
    const onSignIn = typeof config.onSignIn === 'function'
        ? config.onSignIn
        : (typeof config.signIn === 'function' ? config.signIn : null);
    const isUnauthorized = typeof config.isUnauthorized === 'function' ? config.isUnauthorized : defaultIsUnauthorized;
    const formatLoading = typeof config.loadingText === 'function' ? config.loadingText : defaultLoadingText;
    const formatError = typeof config.errorText === 'function' ? config.errorText : defaultErrorText;
    const retryLabel = config.retryLabel ?? 'Retry';
    const signInLabel = config.signInLabel ?? 'Sign in';
    const retryIcon = config.retryIcon !== undefined ? config.retryIcon : 'refresh';
    const errorIcon = config.errorIcon !== undefined ? config.errorIcon : 'alert';

    const { run, controller } = startRun(container);
    const keepContent = quiet && container.hasChildNodes();
    if (keepContent) {
        container.setAttribute('aria-busy', 'true');
    }
    else {
        // Keep the status line outside any aria-busy ancestor so screen readers announce it immediately.
        container.removeAttribute('aria-busy');
        dom.setChildren(container, dom.statusLine(formatLoading(what), { 'data-data-loader-status': '' }));
    }

    try {
        const data = await fetcher({ signal: controller?.signal });
        if (!isCurrentRun(container, run)) {
            return false;
        }
        const rendered = render(data);
        container.removeAttribute('aria-busy');
        dom.setChildren(container, rendered);
        return true;
    }
    catch (error) {
        if (!isCurrentRun(container, run)) {
            return false;
        }
        container.removeAttribute('aria-busy');
        const unauthorized = Boolean(isUnauthorized(error));
        const text = formatError(what, error, unauthorized);
        const action = unauthorized
            ? (onSignIn ? dom.button(signInLabel, () => onSignIn(error), { kind: 'primary', 'data-data-loader-action': 'sign-in' }) : null)
            : dom.button(retryLabel, () => {
                executeLoad(container, { ...config, quiet: false });
            }, { icon: retryIcon, 'data-data-loader-action': 'retry' });
        dom.setChildren(container, dom.errorBanner(text, action, {
            icon: errorIcon,
            'data-data-loader-error': unauthorized ? 'unauthorized' : 'failed'
        }));
        return false;
    }
}

/**
 * Load data into `container` with loading, Retry on failure, and Sign in on 401 states.
 * Accepts either the positional signature `(container, ctx, what, fetcher, render, options)`
 * or an options object `(container, { what, fetcher, render, onSignIn, quiet, ... })`.
 * @param {HTMLElement} container target container element
 * @param {object|null|undefined} ctxOrOptions app context (`{ signIn }` / `{ onSignIn }`) or full load options
 * @param {string} [what] subject phrase, such as `"Server status"`
 * @param {(context: {signal?: AbortSignal}) => Promise<unknown>} [fetcher] async data loader
 * @param {(data: unknown) => unknown} [render] builds children from the loaded data
 * @param {object} [callOptions] additional load options such as `{ quiet: true }`
 * @returns {Promise<boolean>} `true` when this run rendered the fetched data
 */
export function loadInto(container, ctxOrOptions, what, fetcher, render, callOptions = {}) {
    if (typeof fetcher === 'function') {
        const ctx = ctxOrOptions ?? {};
        return executeLoad(container, {
            onSignIn: ctx.onSignIn ?? ctx.signIn,
            ...callOptions,
            what,
            fetcher,
            render
        });
    }
    return executeLoad(container, { ...(ctxOrOptions ?? {}) });
}

/**
 * Create a reusable data loader bound to shared defaults such as `document`, `dom`, and `onSignIn`.
 * @param {object} [defaults] shared options applied to every load
 * @param {Document} [defaults.document] injected document
 * @param {object} [defaults.dom] pre-created `createDomBuilders` instance
 * @param {(error: unknown) => void} [defaults.onSignIn] callback invoked when a 401 Sign in button is clicked
 * @param {(error: unknown) => void} [defaults.signIn] alias for `onSignIn`
 * @param {(error: unknown) => boolean} [defaults.isUnauthorized] predicate classifying expired-session errors
 * @param {(what: string) => string} [defaults.loadingText] custom loading status text formatter
 * @param {(what: string, error: unknown, unauthorized: boolean) => string} [defaults.errorText] custom error text formatter
 * @param {string} [defaults.retryLabel] Retry button label, `'Retry'` by default
 * @param {string} [defaults.signInLabel] Sign in button label, `'Sign in'` by default
 * @param {string|Node|null} [defaults.retryIcon] Retry button icon, `'refresh'` by default
 * @param {string|Node|null} [defaults.errorIcon] error banner icon, `'alert'` by default
 * @returns {{load: Function, loadInto: Function, cancel: (container?: HTMLElement) => void, destroy: () => void}}
 *   data loader controller
 */
export function createDataLoader(defaults = {}) {
    const tracked = new Set();

    /**
     * Run a load into `container` with merged defaults and track the container for cleanup.
     * @param {HTMLElement} container target container
     * @param {object} config load options
     * @returns {Promise<boolean>} `true` when rendered
     */
    function load(container, config = {}) {
        if (container) {
            tracked.add(container);
        }
        return executeLoad(container, { ...defaults, ...config });
    }

    /**
     * Run a load into `container` with positional `(container, what, fetcher, render, options)`,
     * legacy `(container, ctx, what, fetcher, render, options)`, or options-object arguments.
     * @param {HTMLElement} container target container
     * @param {string|object|null} first subject phrase, context, or options object
     * @param {unknown} [second] fetcher or subject phrase
     * @param {unknown} [third] render function or fetcher
     * @param {unknown} [fourth] call options or render function
     * @param {object} [fifth] call options for the 6-argument form
     * @returns {Promise<boolean>} `true` when rendered
     */
    function boundLoadInto(container, first, second, third, fourth, fifth) {
        if (typeof first === 'string' && typeof second === 'function') {
            return load(container, { ...(fourth ?? {}), what: first, fetcher: second, render: third });
        }
        if (typeof third === 'function' && typeof fourth === 'function') {
            const ctx = first ?? {};
            return load(container, {
                ...(fifth ?? {}),
                onSignIn: ctx.onSignIn ?? ctx.signIn ?? defaults.onSignIn ?? defaults.signIn,
                what: second,
                fetcher: third,
                render: fourth
            });
        }
        return load(container, first ?? {});
    }

    /**
     * Cancel an active load on one container, or on all tracked containers when omitted.
     * @param {HTMLElement} [container] optional target container
     */
    function cancel(container) {
        if (container) {
            cancelContainer(container);
            tracked.delete(container);
            return;
        }
        for (const item of tracked) {
            cancelContainer(item);
        }
        tracked.clear();
    }

    return {
        load,
        loadInto: boundLoadInto,
        cancel,
        destroy: () => cancel()
    };
}

/**
 * Attach a data loader controller to one container element.
 * @param {HTMLElement} container target container element
 * @param {object} [defaults] default options (`what`, `fetcher`, `render`, `onSignIn`, `document`, `dom`, etc.)
 * @returns {{load: Function, reload: (options?: object) => Promise<boolean>, cancel: () => void, destroy: () => void}}
 *   container loader controller
 */
export function attachDataLoader(container, defaults = {}) {
    let lastConfig = { ...defaults };

    /**
     * Run a load into the attached container using defaults merged with call overrides.
     * @param {string|object} [first] options override or subject phrase
     * @param {Function} [second] fetcher when `first` is a subject string
     * @param {Function} [third] render function when `first` is a subject string
     * @param {object} [fourth] call options when `first` is a subject string
     * @returns {Promise<boolean>} `true` when rendered
     */
    function load(first, second, third, fourth) {
        const override = typeof first === 'string'
            ? { ...(fourth ?? {}), what: first, fetcher: second, render: third }
            : (first ?? {});
        const merged = { ...defaults, ...override };
        const replayable = { ...merged };
        delete replayable.quiet;
        lastConfig = replayable;
        return executeLoad(container, merged);
    }

    /**
     * Re-run the most recent load configuration on the attached container.
     * @param {object} [callOptions] overrides such as `{ quiet: true }`
     * @returns {Promise<boolean>} `true` when rendered
     */
    function reload(callOptions = {}) {
        return executeLoad(container, { ...lastConfig, ...callOptions });
    }

    /** Cancel any active load on the attached container and clear `aria-busy`. */
    function cancel() {
        cancelContainer(container);
    }

    return {
        load,
        reload,
        cancel,
        destroy: cancel
    };
}
