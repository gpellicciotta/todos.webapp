/**
 * View router for `RoutedView` screens (ADR-0003, ADR-0004).
 *
 * - Registers routed views in matching order and an optional fallback view, picking a view by `routeRegex`.
 * - Enforces `onlyWhenSignedIn` and `neverWhenSignedIn` guards via an app `isSignedIn` callback, plus optional custom guards.
 * - Activates views with History API `pushState` / `replaceState`, restores routes on `popstate`, and opens outside routes with a full page load.
 * - Keeps the shell title (`[data-view-router-title]`), document title, and route marks (`aria-current="page"`) in sync.
 * - Works alongside `action-registry.js` for `[data-action]` navigation links and uses `data-view-router-*` hooks only.
 */

export const CONTENT_VIEW_ADDED_EVENT = 'content-view-added';
export const CONTENT_VIEW_CHANGED_EVENT = 'content-view-changed';
export const CONTENT_VIEW_TITLE_CHANGED_EVENT = 'content-view-title-changed';

const DEFAULT_LINK_SELECTOR = 'a[data-view-router-link], [data-view-router-nav] a[href]';
const DEFAULT_MARK_SELECTOR = '[data-view-router-nav] a[href], a[data-view-router-link], a[data-view-router-mark]';
const DEFAULT_SIGN_IN_ROUTE = '/sign-in';
const DEFAULT_SIGNED_IN_ROUTE = '/';
const DEFAULT_RETURN_URL_PARAM = 'return-url';
const MAX_GUARD_DEPTH = 4;

/**
 * Tell whether a string starts with an explicit URL scheme (e.g. `https:` or `javascript:`).
 * @param {string} value candidate URL or route
 * @returns {boolean} `true` when an explicit scheme prefix is present
 */
function hasExplicitScheme(value) {
    return /^[a-z][a-z0-9+.-]*:/i.test(value);
}

/**
 * Compare two absolute URL strings for exact same-origin equality using the `Origin` API when present,
 * falling back to `URL` parsing and rejecting opaque `"null"` origins.
 * @param {string} candidateUrl candidate absolute URL
 * @param {string} baseUrl trusted reference absolute URL
 * @returns {boolean} `true` when both URLs share the same non-opaque origin
 */
function isSameOriginUrl(candidateUrl, baseUrl) {
    try {
        if ('Origin' in globalThis && typeof globalThis.Origin?.from === 'function') {
            return globalThis.Origin.from(candidateUrl).isSameOrigin(globalThis.Origin.from(baseUrl));
        }
        const candidate = new URL(candidateUrl);
        const base = new URL(baseUrl);
        return candidate.origin !== 'null' && candidate.origin === base.origin;
    }
    catch {
        return false;
    }
}

/**
 * Resolve browser window, location, and history from options or document defaults.
 * @param {Document|null} doc active document
 * @param {object} options caller options
 * @returns {{win: Window|EventTarget|null, loc: Location|object|null, hist: History|object|null}} browser interfaces
 */
function resolveBrowser(doc, options) {
    const win = options.window ?? doc?.defaultView ?? globalThis.window ?? null;
    return {
        win,
        loc: options.location ?? win?.location ?? globalThis.location ?? null,
        hist: options.history ?? win?.history ?? globalThis.history ?? null
    };
}

/**
 * Read the current location's path, search, and hash as one route string.
 * @param {Location|object|null} loc location object
 * @returns {string|null} combined route string, or `null` when unavailable
 */
function currentLocationRoute(loc) {
    if (!loc || typeof loc.pathname !== 'string') {
        return null;
    }
    return `${loc.pathname}${loc.search ?? ''}${loc.hash ?? ''}`;
}

/**
 * Return the trusted base URL string for origin comparisons and relative resolution.
 * @param {Location|object|null} loc location object
 * @returns {string|null} base URL string, or `null` when unavailable
 */
function baseHrefOf(loc) {
    if (typeof loc?.href === 'string' && loc.href.length > 0) {
        return loc.href;
    }
    if (typeof loc?.origin === 'string' && loc.origin.length > 0 && loc.origin !== 'null') {
        return `${loc.origin}/`;
    }
    return null;
}

/**
 * Strip any `#hash` fragment from a route string.
 * @param {string|null|undefined} route route string
 * @returns {string} route without fragment
 */
function stripHash(route) {
    return String(route ?? '').split('#')[0];
}

/**
 * Strip any `?query` and `#hash` from a route string, leaving only the pathname.
 * @param {string|null|undefined} route route string
 * @returns {string} pathname portion
 */
function routePathOf(route) {
    return String(route ?? '').split(/[?#]/)[0];
}

/**
 * Validate and classify a route or URL as an internal app route or an outside URL.
 * Rejects non-http(s) explicit schemes such as `javascript:` or `data:`.
 * @param {unknown} input candidate route or URL
 * @param {Location|object|null} loc active location for origin checks and relative resolution
 * @returns {{kind: 'internal', route: string}|{kind: 'outside', url: string}|null} classified target, or `null` if invalid
 */
function normalizeRoute(input, loc) {
    if (typeof input !== 'string') {
        return null;
    }
    const trimmed = input.trim();
    if (trimmed.length === 0) {
        return null;
    }
    const baseHref = baseHrefOf(loc);
    if (hasExplicitScheme(trimmed)) {
        if (!/^https?:/i.test(trimmed)) {
            return null;
        }
        if (baseHref && isSameOriginUrl(trimmed, baseHref)) {
            const parsed = new URL(trimmed);
            return { kind: 'internal', route: `${parsed.pathname}${parsed.search}${parsed.hash}` };
        }
        return { kind: 'outside', url: trimmed };
    }
    if (trimmed.startsWith('//')) {
        if (!baseHref) {
            return null;
        }
        try {
            const resolved = new URL(trimmed, baseHref);
            if (!/^https?:$/i.test(resolved.protocol)) {
                return null;
            }
            if (isSameOriginUrl(resolved.href, baseHref)) {
                return { kind: 'internal', route: `${resolved.pathname}${resolved.search}${resolved.hash}` };
            }
            return { kind: 'outside', url: resolved.href };
        }
        catch {
            return null;
        }
    }
    if (trimmed.startsWith('/')) {
        return { kind: 'internal', route: trimmed };
    }
    if (baseHref) {
        try {
            const parsed = new URL(trimmed, baseHref);
            if (!/^https?:$/i.test(parsed.protocol)) {
                return null;
            }
            return { kind: 'internal', route: `${parsed.pathname}${parsed.search}${parsed.hash}` };
        }
        catch {
            return null;
        }
    }
    return { kind: 'internal', route: trimmed };
}

/**
 * Append a return-URL query parameter to a sign-in redirect route, preserving any fragment.
 * @param {string} baseRoute sign-in route
 * @param {string} returnRoute route the user originally requested
 * @param {string|null|false} paramName query parameter name, or falsy to omit
 * @returns {string} redirect route
 */
function appendReturnUrl(baseRoute, returnRoute, paramName) {
    if (!paramName) {
        return baseRoute;
    }
    const hashIndex = baseRoute.indexOf('#');
    const beforeHash = hashIndex === -1 ? baseRoute : baseRoute.slice(0, hashIndex);
    const hash = hashIndex === -1 ? '' : baseRoute.slice(hashIndex);
    const separator = beforeHash.includes('?') ? '&' : '?';
    return `${beforeHash}${separator}${encodeURIComponent(paramName)}=${encodeURIComponent(returnRoute)}${hash}`;
}

/**
 * Normalize history state into a plain object safe for `history.pushState` / `replaceState`.
 * @param {unknown} state candidate state payload
 * @returns {object} state object
 */
function normalizeHistoryState(state) {
    if (state && typeof state === 'object') {
        return state;
    }
    return {};
}

/**
 * Create a view router for `RoutedView` instances with guards, history, shell title/route marks, and outside routes.
 * @param {object} [options] router options
 * @param {HTMLElement|Document|null} [options.root] optional DOM root to attach immediately
 * @param {HTMLElement|null} [options.outlet] container where active views attach; falls back to `[data-view-router-outlet]` in `root`
 * @param {HTMLElement|null} [options.titleElement] shell title element; falls back to `[data-view-router-title]` in `root`
 * @param {Array<object>} [options.views] initial routed views loaded without emitting `content-view-added`
 * @param {object|null} [options.fallbackView] initial fallback view loaded without emitting `content-view-added`
 * @param {() => boolean} [options.isSignedIn] app callback returning whether a user is signed in (`false` by default)
 * @param {string|((route: string, view: object) => string)} [options.signInRoute] redirect route for `onlyWhenSignedIn` views (`'/sign-in'` by default)
 * @param {string|null|false} [options.returnUrlParam] query parameter appended to `signInRoute` (`'return-url'` by default)
 * @param {string|((route: string, view: object) => string)} [options.signedInRoute] redirect route for `neverWhenSignedIn` views (`'/'` by default)
 * @param {string|null} [options.signedInViewId] optional view ID substituted directly for `neverWhenSignedIn` views
 * @param {(view: object, context: {route: string, state: object, reason: string, isSignedIn: boolean}) => unknown} [options.guard] optional custom guard hook
 * @param {string[]} [options.outsidePrefixes] route prefixes opened outside the app via full page load (e.g. `['/admin/']`)
 * @param {(route: string) => string|{url: string, replace?: boolean}|null|undefined} [options.resolveOutsideRoute] optional redirect resolver for outside routes
 * @param {(url: string, options: {replace: boolean}) => void} [options.onOpenOutside] custom outside-navigation handler replacing `location.assign`/`replace`
 * @param {object|null} [options.actions] optional T0289 action registry so registered `[data-action]` links defer to it
 * @param {{setRoute?: (path: string|null) => void}|null} [options.accountMenu] optional account menu controller updated with the active path
 * @param {string|null} [options.appTitle] optional app name combined into `document.title`
 * @param {(title: string, appTitle: string|null, view: object|null) => string} [options.formatDocumentTitle] custom document title formatter
 * @param {boolean} [options.updateDocumentTitle] whether `setTitle` writes `document.title` (`true` by default)
 * @param {string} [options.linkSelector] selector for intercepted links inside `root`
 * @param {(detail: {route: string, path: string, view: object, oldView: object|null, reason: string}) => void} [options.onRouteChange] callback invoked after activating a view
 * @param {(title: string, view: object|null) => void} [options.onTitleChange] callback invoked when the shell title changes
 * @param {Document} [options.document] document used for DOM queries, `CustomEvent`, and `document.title`
 * @param {Window|EventTarget} [options.window] window target for `popstate`
 * @param {Location|object} [options.location] location object for current address and outside loads
 * @param {History|object} [options.history] history object for `pushState` and `replaceState`
 * @param {EventTarget} [options.events] event target for router events
 * @returns {object} view router controller
 */
export function createViewRouter(options = {}) {
    const doc = options.document ?? options.root?.ownerDocument ?? options.outlet?.ownerDocument ?? globalThis.document ?? null;
    const { win, loc, hist } = resolveBrowser(doc, options);
    const EventCtor = doc?.defaultView?.CustomEvent ?? globalThis.CustomEvent;
    const eventTarget = options.events ?? new EventTarget();

    const isSignedIn = typeof options.isSignedIn === 'function' ? options.isSignedIn : () => false;
    const signInRoute = options.signInRoute ?? DEFAULT_SIGN_IN_ROUTE;
    const returnUrlParam = options.returnUrlParam === undefined ? DEFAULT_RETURN_URL_PARAM : options.returnUrlParam;
    const signedInRoute = options.signedInRoute ?? DEFAULT_SIGNED_IN_ROUTE;
    const signedInViewId = typeof options.signedInViewId === 'string' && options.signedInViewId.length > 0 ? options.signedInViewId : null;
    const customGuard = typeof options.guard === 'function' ? options.guard : null;
    const outsidePrefixes = Array.isArray(options.outsidePrefixes) ? options.outsidePrefixes.filter((prefix) => typeof prefix === 'string' && prefix.length > 0) : [];
    const resolveOutsideRoute = typeof options.resolveOutsideRoute === 'function' ? options.resolveOutsideRoute : null;
    const onOpenOutside = typeof options.onOpenOutside === 'function' ? options.onOpenOutside : null;
    const actions = options.actions ?? null;
    const accountMenu = options.accountMenu ?? null;
    const appTitle = typeof options.appTitle === 'string' && options.appTitle.length > 0 ? options.appTitle : null;
    const updateDocumentTitle = options.updateDocumentTitle !== false;
    const formatDocumentTitle = typeof options.formatDocumentTitle === 'function'
        ? options.formatDocumentTitle
        : (title, appName) => (appName && title !== appName ? `${title} · ${appName}` : title);
    const linkSelector = typeof options.linkSelector === 'string' && options.linkSelector.length > 0 ? options.linkSelector : DEFAULT_LINK_SELECTOR;
    const onRouteChange = typeof options.onRouteChange === 'function' ? options.onRouteChange : null;
    const onTitleChange = typeof options.onTitleChange === 'function' ? options.onTitleChange : null;

    const views = [];
    const trackedListeners = [];
    let fallbackView = null;
    let activeView = null;
    let currentRoute = null;
    let attachedRoot = null;
    let outlet = options.outlet ?? null;
    let titleEl = options.titleElement ?? null;
    let clickHandler = null;
    let popstateHandler = null;
    let destroyed = false;

    /**
     * Dispatch a `CustomEvent` on the router's event target.
     * @param {string} type event name
     * @param {object} detail event payload
     */
    function emit(type, detail) {
        if (destroyed) {
            return;
        }
        eventTarget.dispatchEvent(new EventCtor(type, { detail }));
    }

    /**
     * Initialize `activation-count` on a registered view if missing.
     * @param {object} view routed view instance
     */
    function ensureActivationCount(view) {
        if (!Object.hasOwn(view, 'activation-count')) {
            view['activation-count'] = 0;
        }
    }

    /**
     * Register a routed view in matching order.
     * @param {object} view `RoutedView` instance
     * @param {boolean} [emitEvent] whether to emit `CONTENT_VIEW_ADDED_EVENT` (`true` by default)
     * @returns {object|undefined} the registered view
     */
    function addView(view, emitEvent = true) {
        if (destroyed) {
            return undefined;
        }
        if (!view || typeof view !== 'object') {
            throw new TypeError('Expecting routed view object');
        }
        ensureActivationCount(view);
        views.push(view);
        if (emitEvent) {
            emit(CONTENT_VIEW_ADDED_EVENT, { view, fallback: false });
        }
        return view;
    }

    /**
     * Register the fallback view selected when no routed view matches a route.
     * @param {object|null} view fallback `RoutedView` instance, or `null` to clear
     * @param {boolean} [emitEvent] whether to emit `CONTENT_VIEW_ADDED_EVENT` (`true` by default)
     * @returns {object|null|undefined} the fallback view
     */
    function setFallbackView(view, emitEvent = true) {
        if (destroyed) {
            return undefined;
        }
        fallbackView = view ?? null;
        if (fallbackView) {
            ensureActivationCount(fallbackView);
            if (emitEvent) {
                emit(CONTENT_VIEW_ADDED_EVENT, { view: fallbackView, fallback: true });
            }
        }
        return fallbackView;
    }

    /**
     * Return registered routed views in matching order.
     * @returns {object[]} shallow copy of registered views
     */
    function getViews() {
        return [...views];
    }

    /**
     * Find the first registered view whose `routeRegex` matches `route`.
     * @param {string} route route string to match
     * @param {object|null} [fallback] value returned when no view matches (`null` by default)
     * @returns {object|null} matching view or `fallback`
     */
    function findViewForRoute(route, fallback = null) {
        if (typeof route !== 'string') {
            return fallback;
        }
        for (const candidate of views) {
            const regex = candidate.routeRegex;
            if (regex instanceof RegExp) {
                regex.lastIndex = 0;
                if (regex.test(route)) {
                    return candidate;
                }
            }
        }
        return fallback;
    }

    /**
     * Find a registered view by its `id`.
     * @param {string} id view identifier
     * @param {object|null} [fallback] value returned when no view has `id` (`null` by default)
     * @returns {object|null} matching view or `fallback`
     */
    function findViewById(id, fallback = null) {
        for (const candidate of views) {
            if (candidate.id === id) {
                return candidate;
            }
        }
        return fallback;
    }

    /**
     * Open a URL outside the SPA with a full page load.
     * @param {string} url destination URL
     * @param {{replace?: boolean}} [openOptions] set `replace: true` to replace the current history entry
     * @returns {boolean} `true` when navigation was handed off
     */
    function openOutside(url, { replace = false } = {}) {
        if (destroyed || typeof url !== 'string' || url.trim().length === 0) {
            return false;
        }
        const trimmed = url.trim();
        if (hasExplicitScheme(trimmed) && !/^https?:/i.test(trimmed)) {
            return false;
        }
        if (onOpenOutside) {
            onOpenOutside(trimmed, { replace: Boolean(replace) });
            return true;
        }
        if (replace && typeof loc?.replace === 'function') {
            loc.replace(trimmed);
            return true;
        }
        if (typeof loc?.assign === 'function') {
            loc.assign(trimmed);
            return true;
        }
        return false;
    }

    /**
     * Update the shell title element, `document.title`, and emit `CONTENT_VIEW_TITLE_CHANGED_EVENT`.
     * @param {string} title visible title text
     */
    function setTitle(title) {
        if (destroyed || typeof title !== 'string' || title.length === 0) {
            return;
        }
        if (titleEl) {
            titleEl.textContent = title;
        }
        if (updateDocumentTitle && doc) {
            doc.title = formatDocumentTitle(title, appTitle, activeView);
        }
        onTitleChange?.(title, activeView);
        emit(CONTENT_VIEW_TITLE_CHANGED_EVENT, { view: activeView, title });
    }

    /**
     * Sync `aria-current="page"` across route-marked links inside the attached root and notify `accountMenu`.
     * @param {string|null} [route] active route, defaulting to `currentRoute`
     */
    function markRoute(route = currentRoute) {
        const active = typeof route === 'string' ? route : '';
        const routeNoHash = stripHash(active);
        const routePath = routePathOf(active);

        if (attachedRoot?.querySelectorAll) {
            const links = [...new Set(attachedRoot.querySelectorAll(DEFAULT_MARK_SELECTOR))];
            const resolvedLinks = links.map((link) => {
                const rawHref = link.getAttribute('href');
                if (!rawHref || rawHref.startsWith('#')) {
                    return { link, hrefNoHash: null };
                }
                const normalized = normalizeRoute(rawHref, loc);
                if (!normalized || normalized.kind !== 'internal') {
                    return { link, hrefNoHash: null };
                }
                return { link, hrefNoHash: stripHash(normalized.route) };
            });

            const hasExactQueryMatch = routeNoHash.includes('?')
                && resolvedLinks.some(({ hrefNoHash }) => hrefNoHash && hrefNoHash.includes('?') && hrefNoHash === routeNoHash);

            for (const { link, hrefNoHash } of resolvedLinks) {
                let current = false;
                if (active && hrefNoHash) {
                    if (hrefNoHash.includes('?')) {
                        current = hrefNoHash === routeNoHash;
                    }
                    else if (link.hasAttribute('data-view-router-exact') || hasExactQueryMatch) {
                        current = hrefNoHash === routeNoHash;
                    }
                    else {
                        current = hrefNoHash === routePath;
                    }
                }
                if (current) {
                    link.setAttribute('aria-current', 'page');
                }
                else {
                    link.removeAttribute('aria-current');
                }
            }
        }

        accountMenu?.setRoute?.(routePath || null);
    }

    /**
     * Activate a concrete view instance, updating DOM, history, route marks, title, and events.
     * Does nothing and returns `false` when `chosenView` is already the active view.
     * @param {object|null} chosenView view instance to activate
     * @param {string} route active route string
     * @param {object} [state] state forwarded to `view.attach` and History API
     * @param {string} [reason] activation reason (`'popstate'` suppresses History writes)
     * @param {{replace?: boolean}} [activateOptions] activation options
     * @returns {boolean} `true` when the view changed
     */
    function activateSpecificView(chosenView, route, state = {}, reason = 'unknown', activateOptions = {}) {
        if (destroyed || !chosenView || chosenView === activeView) {
            return false;
        }
        const safeState = state ?? {};
        const safeReason = reason || 'unknown';
        const oldView = activeView;

        if (activeView) {
            activeView.detach?.();
            activeView = null;
        }
        if (outlet) {
            outlet.replaceChildren();
            chosenView.attach(outlet, route, safeState);
        }
        else {
            chosenView.attach?.(null, route, safeState);
        }

        activeView = chosenView;
        currentRoute = route;
        ensureActivationCount(chosenView);
        chosenView['activation-count'] += 1;

        if (attachedRoot?.dataset) {
            attachedRoot.dataset.viewRouterActive = chosenView.id ?? '';
        }

        if (safeReason !== 'popstate' && hist) {
            const current = currentLocationRoute(loc);
            const historyState = normalizeHistoryState(safeState);
            if (activateOptions.replace || route === current) {
                hist.replaceState?.(historyState, chosenView.title ?? '', route);
            }
            else {
                hist.pushState?.(historyState, chosenView.title ?? '', route);
            }
        }

        markRoute(route);
        if (chosenView.title) {
            setTitle(chosenView.title);
        }
        onRouteChange?.({ route, path: routePathOf(route), view: chosenView, oldView, reason: safeReason });
        emit(CONTENT_VIEW_CHANGED_EVENT, {
            oldView,
            newView: chosenView,
            route,
            state: safeState,
            reason: safeReason
        });
        return true;
    }

    /**
     * Apply built-in sign-in guards and any custom guard to a chosen view, then activate or redirect.
     * @param {object} chosenView matched view
     * @param {string} route normalized internal route
     * @param {object} state route state
     * @param {string} reason activation reason
     * @param {{replace?: boolean}} activateOptions activation options
     * @param {number} depth redirect recursion depth
     * @returns {boolean} `true` when a view or outside load succeeded
     */
    function applyGuardsAndActivate(chosenView, route, state, reason, activateOptions, depth) {
        if (depth > MAX_GUARD_DEPTH) {
            return false;
        }
        const signedIn = Boolean(isSignedIn());
        const redirectReplace = Boolean(activateOptions.replace || reason === 'popstate');

        if (chosenView.onlyWhenSignedIn && !signedIn) {
            const target = typeof signInRoute === 'function'
                ? signInRoute(route, chosenView)
                : appendReturnUrl(signInRoute, route, returnUrlParam);
            if (!target) {
                return false;
            }
            return activateRouteInternal(target, state, 'Authentication required', { ...activateOptions, replace: redirectReplace }, depth + 1);
        }

        let targetView = chosenView;
        if (targetView.neverWhenSignedIn && signedIn) {
            if (signedInViewId) {
                const substitute = findViewById(signedInViewId);
                if (!substitute || substitute.neverWhenSignedIn) {
                    return false;
                }
                targetView = substitute;
            }
            else {
                const target = typeof signedInRoute === 'function' ? signedInRoute(route, targetView) : signedInRoute;
                if (!target) {
                    return false;
                }
                return activateRouteInternal(target, state, 'Already signed in', { ...activateOptions, replace: redirectReplace }, depth + 1);
            }
        }

        if (customGuard) {
            const verdict = customGuard(targetView, { route, state, reason, isSignedIn: signedIn });
            if (verdict === false || verdict === null) {
                return false;
            }
            if (typeof verdict === 'string') {
                return activateRouteInternal(verdict, state, reason, { ...activateOptions, replace: redirectReplace }, depth + 1);
            }
            if (verdict && typeof verdict === 'object') {
                if (typeof verdict.attach === 'function') {
                    targetView = verdict;
                }
                else if (typeof verdict.route === 'string') {
                    return activateRouteInternal(
                        verdict.route,
                        verdict.state ?? state,
                        verdict.reason ?? reason,
                        { ...activateOptions, replace: verdict.replace ?? redirectReplace },
                        depth + 1
                    );
                }
            }
        }

        return activateSpecificView(targetView, route, state, reason, activateOptions);
    }

    /**
     * Internal route activation with redirect depth tracking.
     * @param {string} route route or URL to activate
     * @param {object} [state] route state
     * @param {string} [reason] activation reason
     * @param {{replace?: boolean}} [activateOptions] activation options
     * @param {number} [depth] current guard redirect depth
     * @returns {boolean} `true` when routed or handed off outside the app
     */
    function activateRouteInternal(route, state = {}, reason = 'unknown', activateOptions = {}, depth = 0) {
        if (destroyed || depth > MAX_GUARD_DEPTH) {
            return false;
        }
        const normalized = normalizeRoute(route, loc);
        if (!normalized) {
            return false;
        }
        if (normalized.kind === 'outside') {
            return openOutside(normalized.url, { replace: Boolean(activateOptions.replace) });
        }
        const appRoute = normalized.route;

        if (resolveOutsideRoute) {
            const outside = resolveOutsideRoute(appRoute);
            if (typeof outside === 'string' && outside.length > 0) {
                return openOutside(outside, { replace: true });
            }
            if (outside && typeof outside === 'object' && typeof outside.url === 'string' && outside.url.length > 0) {
                return openOutside(outside.url, { replace: Boolean(outside.replace) });
            }
        }

        if (outsidePrefixes.some((prefix) => appRoute.startsWith(prefix))) {
            return openOutside(appRoute, { replace: Boolean(activateOptions.replace) });
        }

        const chosenView = findViewForRoute(appRoute, fallbackView);
        if (!chosenView) {
            return false;
        }
        return applyGuardsAndActivate(chosenView, appRoute, state ?? {}, reason || 'unknown', activateOptions, depth);
    }

    /**
     * Pick and activate a view for `route`, applying outside-route checks and sign-in guards.
     * @param {string} route route or URL
     * @param {object} [state] state forwarded to the view and history
     * @param {string} [reason] activation reason (`'popstate'` suppresses History writes)
     * @param {{replace?: boolean}} [activateOptions] optional `{ replace }` override
     * @returns {boolean} `true` when a view activated or an outside route opened
     */
    function activateView(route, state = {}, reason = 'unknown', activateOptions = {}) {
        return activateRouteInternal(route, state, reason, activateOptions, 0);
    }

    /**
     * Find a view by ID (falling back to the fallback view), apply guards, and activate it.
     * @param {string} viewId registered view ID
     * @param {object} [state] state forwarded to the view and history
     * @param {string} [reason] activation reason
     * @param {{route?: string, replace?: boolean}} [activateOptions] optional route and replace overrides
     * @returns {boolean} `true` when a view activated or redirected
     */
    function activateViewById(viewId, state = {}, reason = 'unknown', activateOptions = {}) {
        if (destroyed) {
            return false;
        }
        const chosenView = findViewById(viewId, fallbackView);
        if (!chosenView) {
            return false;
        }
        const route = typeof activateOptions.route === 'string' && activateOptions.route.length > 0
            ? activateOptions.route
            : `/${viewId}`;
        return applyGuardsAndActivate(chosenView, route, state ?? {}, reason || 'unknown', activateOptions, 0);
    }

    /**
     * Activate the initial route from `location` (or an explicit route), replacing the current history entry.
     * @param {string} [initialRoute] explicit initial route; defaults to current `location` path + search + hash
     * @returns {boolean} `true` when activation succeeded
     */
    function start(initialRoute) {
        const route = initialRoute ?? currentLocationRoute(loc) ?? '/';
        return activateView(route, hist?.state ?? {}, 'initial', { replace: true });
    }

    /**
     * Subscribe to router events (`CONTENT_VIEW_ADDED_EVENT`, `CONTENT_VIEW_CHANGED_EVENT`, `CONTENT_VIEW_TITLE_CHANGED_EVENT`).
     * @param {string} type event type
     * @param {EventListenerOrEventListenerObject} listener event callback
     * @param {boolean|AddEventListenerOptions} [listenerOptions] listener options
     */
    function addEventListener(type, listener, listenerOptions) {
        if (destroyed || !type || !listener) {
            return;
        }
        eventTarget.addEventListener(type, listener, listenerOptions);
        trackedListeners.push({ type, listener, options: listenerOptions });
    }

    /**
     * Unsubscribe from router events.
     * @param {string} type event type
     * @param {EventListenerOrEventListenerObject} listener event callback
     * @param {boolean|EventListenerOptions} [listenerOptions] listener options
     */
    function removeEventListener(type, listener, listenerOptions) {
        eventTarget.removeEventListener(type, listener, listenerOptions);
        const index = trackedListeners.findIndex((entry) => entry.type === type && entry.listener === listener);
        if (index !== -1) {
            trackedListeners.splice(index, 1);
        }
    }

    /**
     * Attach link click delegation, `popstate` handling, and shell hooks (`data-view-router-*`) to `root`.
     * @param {HTMLElement|Document} root shell or container element
     * @param {{outlet?: HTMLElement|null, titleElement?: HTMLElement|null}} [attachOptions] optional element overrides
     * @returns {() => void} cleanup function that detaches listeners
     */
    function attach(root, attachOptions = {}) {
        if (destroyed || !root) {
            return () => {};
        }
        if (attachedRoot === root) {
            return () => detach();
        }
        if (attachedRoot) {
            detach();
        }

        attachedRoot = root;
        if (root.setAttribute && !root.hasAttribute?.('data-view-router')) {
            root.setAttribute('data-view-router', '');
        }
        if (attachOptions.outlet !== undefined) {
            outlet = attachOptions.outlet;
        }
        else if (!outlet) {
            outlet = root.querySelector?.('[data-view-router-outlet]')
                ?? (root.hasAttribute?.('data-view-router-outlet') ? root : null);
        }
        if (attachOptions.titleElement !== undefined) {
            titleEl = attachOptions.titleElement;
        }
        else if (!titleEl) {
            titleEl = root.querySelector?.('[data-view-router-title]') ?? null;
        }

        clickHandler = (event) => {
            if (destroyed || event.defaultPrevented) {
                return;
            }
            const modified = Boolean(event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || (typeof event.button === 'number' && event.button !== 0));
            if (modified) {
                return;
            }
            const rawTarget = event.target;
            const elementTarget = rawTarget && rawTarget.nodeType === 1 ? rawTarget : rawTarget?.parentElement;
            const link = elementTarget?.closest?.(linkSelector);
            if (!link || !root.contains(link)) {
                return;
            }
            if (link.hasAttribute('download')) {
                return;
            }
            const targetAttr = link.getAttribute('target');
            if (targetAttr && targetAttr !== '_self') {
                return;
            }
            if (link.getAttribute('aria-disabled') === 'true') {
                event.preventDefault();
                return;
            }
            const actionId = link.getAttribute('data-action');
            if (actionId && actions?.getAction?.(actionId)) {
                return;
            }
            const href = link.getAttribute('href');
            if (!href || href.startsWith('#')) {
                return;
            }
            const normalized = normalizeRoute(href, loc);
            if (!normalized) {
                event.preventDefault();
                return;
            }
            if (normalized.kind === 'outside') {
                return;
            }
            event.preventDefault();
            activateView(normalized.route, {}, 'link');
        };

        root.addEventListener('click', clickHandler);

        if (win?.addEventListener) {
            popstateHandler = (event) => {
                if (destroyed) {
                    return;
                }
                const nextRoute = currentLocationRoute(loc);
                if (nextRoute !== null) {
                    activateView(nextRoute, event?.state ?? {}, 'popstate');
                }
            };
            win.addEventListener('popstate', popstateHandler);
        }

        if (currentRoute !== null) {
            markRoute(currentRoute);
        }
        return () => detach();
    }

    /**
     * Remove delegated click and `popstate` listeners without destroying registered views.
     */
    function detach() {
        if (attachedRoot && clickHandler) {
            attachedRoot.removeEventListener('click', clickHandler);
        }
        if (win && popstateHandler) {
            win.removeEventListener('popstate', popstateHandler);
        }
        attachedRoot = null;
        clickHandler = null;
        popstateHandler = null;
    }

    /**
     * Detach active view, remove all DOM and router listeners, and clear registered views.
     */
    function destroy() {
        if (destroyed) {
            return;
        }
        destroyed = true;
        detach();
        if (activeView) {
            activeView.detach?.();
            activeView = null;
        }
        for (const { type, listener, options: listenerOptions } of trackedListeners) {
            eventTarget.removeEventListener(type, listener, listenerOptions);
        }
        trackedListeners.length = 0;
        views.length = 0;
        fallbackView = null;
        currentRoute = null;
    }

    if (Array.isArray(options.views)) {
        for (const view of options.views) {
            if (view) {
                addView(view, false);
            }
        }
    }
    if (options.fallbackView) {
        setFallbackView(options.fallbackView, false);
    }
    if (options.root) {
        attach(options.root);
    }

    return {
        addView,
        setFallbackView,
        getViews,
        getFallbackView: () => fallbackView,
        getActiveView: () => activeView,
        getCurrentRoute: () => currentRoute,
        findViewForRoute,
        findViewById,
        activateView,
        activateViewById,
        activateSpecificView,
        openOutside,
        setTitle,
        markRoute,
        start,
        addEventListener,
        removeEventListener,
        attach,
        detach,
        destroy
    };
}

/**
 * Create a view router and immediately attach it to `root`.
 * @param {HTMLElement|Document} root shell or container element
 * @param {object} [options] options forwarded to `createViewRouter`
 * @returns {ReturnType<typeof createViewRouter>} view router controller
 */
export function attachViewRouter(root, options = {}) {
    return createViewRouter({ ...options, root });
}
