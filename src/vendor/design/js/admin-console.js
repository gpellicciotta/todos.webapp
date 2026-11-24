/**
 * Admin console frame (ADR-0003, ADR-0004).
 *
 * - Provides a screen registry (`mount`, `update`, `dispose`), hash router (`parseRoute`), route marks (`aria-current`),
 *   and screen/document titles.
 * - Builds or attaches to the app shell with its nav toggle (`app-nav.js`), account menu (`account-menu.js`),
 *   side panel, and skip link that focuses `#main` without mutating the route hash.
 * - Renders centered `.app__gate` pages for session checks, check failures, and forbidden access, plus a signed-out
 *   shell that tracks navigation marks without mounting protected screens.
 * - Keeps session lookup and account checks in app-supplied callbacks and uses `data-admin-console-*` hooks only.
 */

import { attachAccountMenu } from './account-menu.js';
import { attachAppNav } from './app-nav.js';
import { createDomBuilders } from './dom-builders.js';
import { createIcon } from './icon.js';
import { attachLabelTooltips } from './tooltip.js';

const DEFAULT_TITLE = 'Admin Console';

const DEFAULT_LABELS = {
    skipToContent: 'Skip to content',
    navigation: 'Navigation',
    checkingSession: 'Checking your session…',
    sessionCheckFailed: (error) => `The session could not be checked: ${messageOf(error)}.`,
    accountCheckFailed: (error) => `The account could not be checked: ${messageOf(error)}.`,
    forbiddenTitle: 'Administrator access required',
    forbiddenMessage: (appTitle) => `Administrator access is required to use ${appTitle}.`,
    retry: 'Retry',
    signIn: 'Sign In',
    signOut: 'Sign Out',
    signedOut: 'You are signed out.',
    signedOutPrompt: (appTitle) => `Sign in to use ${appTitle}.`,
    sessionExpired: 'Your session ended. Sign in again.',
    manageAccount: 'Manage Account',
    notifications: 'Notifications'
};

let instanceCounter = 0;

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
 * Resolve a string or message-formatter callback.
 * @param {string|Function} entry static text or formatter function
 * @param {...unknown} args arguments forwarded to a formatter function
 * @returns {string} formatted message
 */
function resolveText(entry, ...args) {
    return typeof entry === 'function' ? entry(...args) : String(entry ?? '');
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
 * Resolve an icon specification into a sprite `<svg>` element or existing node.
 * @param {Document} doc target document
 * @param {string|Node|null|undefined} spec glyph name, node, or `null`
 * @returns {Node|null} icon node or `null`
 */
function resolveIcon(doc, spec) {
    if (!spec) {
        return null;
    }
    return isNode(spec) ? spec : createIcon(doc, spec);
}

/**
 * Parse a location hash into a registered screen name and optional item identifier.
 * Strips any `#`, optional leading `/`, and `?query` parameters; unknown or empty routes fall back to `defaultScreen`.
 * @param {string} hash URL hash string (e.g. `'#/users/42?q=alex'`)
 * @param {Array<{name: string}>} [screens] registered screen descriptors
 * @param {string} [defaultScreen] fallback screen name, defaulting to `screens[0]?.name ?? ''`
 * @returns {{name: string, id: string|null}} parsed route
 */
export function parseRoute(hash, screens = [], defaultScreen = undefined) {
    const list = Array.isArray(screens) ? screens : [];
    const fallback = defaultScreen ?? list[0]?.name ?? '';
    const pathPart = String(hash ?? '').replace(/^#\/?/, '').split('?')[0];
    const [rawName = '', rawId = null] = pathPart.split('/');
    if (rawName && list.some((screen) => screen.name === rawName)) {
        return { name: rawName, id: rawId || null };
    }
    return { name: fallback, id: null };
}

/**
 * Pick the visible display name for an account, preferring trimmed `name` and falling back to `email`.
 * @param {{name?: string, email?: string}|null|undefined} account signed-in account
 * @returns {string} display name or empty string
 */
export function displayName(account) {
    const name = typeof account?.name === 'string' ? account.name.trim() : '';
    if (name) {
        return name;
    }
    const email = typeof account?.email === 'string' ? account.email.trim() : '';
    return email;
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
 * Tell whether an error represents an HTTP 403 Forbidden response.
 * @param {unknown} error caught error
 * @returns {boolean} `true` when `error.status === 403`
 */
function defaultIsForbidden(error) {
    return Boolean(error && typeof error === 'object' && error.status === 403);
}

/**
 * Resolve browser location, history, and event target from options or globals.
 * @param {Document} doc active document
 * @param {object} options caller options
 * @returns {{view: Window|object|null, location: Location|object|null, history: History|object|null}} navigation objects
 */
function resolveBrowser(doc, options) {
    const view = options.window ?? doc?.defaultView ?? globalThis.window ?? null;
    return {
        view,
        location: options.location ?? view?.location ?? globalThis.location ?? null,
        history: options.history ?? view?.history ?? globalThis.history ?? null
    };
}

/**
 * Build a trailing `.badge` node for a sidebar navigation item when configured.
 * @param {object} dom bound DOM builders
 * @param {string|Node|{text: string, srText?: string, variant?: string}|null|undefined} badgeSpec badge configuration
 * @returns {Node|null} badge node or `null`
 */
function buildNavBadge(dom, badgeSpec) {
    if (!badgeSpec) {
        return null;
    }
    if (isNode(badgeSpec)) {
        return badgeSpec;
    }
    if (typeof badgeSpec === 'string') {
        return dom.h('span', { class: 'badge badge--count' }, badgeSpec);
    }
    const variant = badgeSpec.variant ?? 'count';
    const classes = ['badge', variant ? `badge--${variant}` : ''].filter(Boolean).join(' ');
    return dom.h('span', { class: classes },
        badgeSpec.text ?? '',
        badgeSpec.srText ? dom.h('span', { class: 'visually-hidden' }, badgeSpec.srText) : null);
}

/**
 * Core implementation shared by `createAdminConsole` (builds shell and gates inside a host)
 * and `attachAdminConsole` (enhances pre-existing `.app` shell markup).
 * @param {HTMLElement} root host element or pre-existing `.app` shell element
 * @param {object} options configuration options
 * @param {boolean} attached `true` when enhancing pre-existing `.app` markup
 * @returns {object} admin console controller
 */
function initAdminConsole(root, options, attached) {
    const doc = options.document ?? root.ownerDocument ?? globalThis.document;
    const { view, location: loc, history: hist } = resolveBrowser(doc, options);
    const ownsDom = !options.dom;
    const dom = options.dom ?? createDomBuilders(doc);
    const appTitle = options.title ?? DEFAULT_TITLE;
    const navLabel = options.navLabel ?? 'Main';
    const labels = { ...DEFAULT_LABELS, ...options.labels };
    const formatDocumentTitle = typeof options.formatDocumentTitle === 'function'
        ? options.formatDocumentTitle
        : (screen, title) => `${screen.title} · ${title}`;
    const isUnauthorized = typeof options.isUnauthorizedError === 'function'
        ? options.isUnauthorizedError
        : defaultIsUnauthorized;
    const isForbidden = typeof options.isForbiddenError === 'function'
        ? options.isForbiddenError
        : defaultIsForbidden;
    const idSeed = (instanceCounter += 1);

    const screens = Array.isArray(options.screens) ? [...options.screens] : [];
    const defaultScreen = () => options.defaultScreen ?? screens[0]?.name ?? '';

    let mode = 'idle';
    let gateState = null;
    let currentAccount = options.account ?? null;
    let currentSession = options.session ?? null;
    let currentRoute = null;
    let currentName = null;
    let currentScreenController = null;
    let currentScreenAbort = null;
    let routeAbort = null;
    let shellAbort = null;
    let startAbort = null;
    let startToken = 0;
    let destroyed = false;
    let initialRouteHandled = false;

    // Preserved DOM state for attached shells when swapping temporarily to gate or signed-out modes.
    let savedShellNodes = null;
    let savedTopActionsNodes = null;
    let activeGateEl = null;
    let shellParts = null;

    if (!root.hasAttribute('data-admin-console')) {
        root.setAttribute('data-admin-console', '');
    }

    /**
     * Find a registered screen descriptor by route name.
     * @param {string} name screen key
     * @returns {object|null} matching screen or `null`
     */
    function findScreen(name) {
        return screens.find((screen) => screen.name === name) ?? null;
    }

    /**
     * Parse a hash against the controller's screen registry and default screen.
     * @param {string} [hash] URL hash string, defaulting to `location.hash`
     * @returns {{name: string, id: string|null}} parsed route
     */
    function parse(hash = loc?.hash ?? '') {
        return parseRoute(hash, screens, defaultScreen());
    }

    /** Dispose the currently mounted screen controller and abort its per-screen signal. */
    function disposeCurrentScreen() {
        if (currentScreenAbort) {
            currentScreenAbort.abort();
            currentScreenAbort = null;
        }
        const active = currentScreenController;
        currentScreenController = null;
        currentName = null;
        active?.dispose?.();
    }

    /** Stop the active hashchange router listener without tearing down the shell frame. */
    function stopRouter() {
        if (routeAbort) {
            routeAbort.abort();
            routeAbort = null;
        }
    }

    /** Tear down active screen, router, and any built shell controllers. */
    function teardownActive() {
        stopRouter();
        disposeCurrentScreen();
        if (!attached && shellAbort) {
            shellAbort.abort();
            shellAbort = null;
            shellParts = null;
        }
    }

    /**
     * Close the sidebar popover drawer if open before detaching an attached shell for gate mode.
     * @param {HTMLElement|null} sidebar sidebar element
     */
    function closeDrawerIfOpen(sidebar) {
        if (!sidebar || typeof sidebar.hidePopover !== 'function') {
            return;
        }
        try {
            if (sidebar.matches?.(':popover-open')) {
                sidebar.hidePopover();
            }
        }
        catch {
            // Environments without `:popover-open` selector support ignore drawer close safely.
        }
    }

    /**
     * Update the screen heading, document title, active view attribute, and sidebar `aria-current` marks.
     * @param {string} name target screen name
     * @param {boolean} [isInitial] whether this is the first route dispatch of the frame
     */
    function applyRouteMarks(name, isInitial = false) {
        const screen = findScreen(name);
        if (!screen || !shellParts) {
            return;
        }
        if (shellParts.title) {
            shellParts.title.textContent = screen.title;
        }
        if (doc) {
            doc.title = formatDocumentTitle(screen, appTitle, { initial: isInitial, hash: loc?.hash ?? '' });
        }
        if (shellParts.view) {
            shellParts.view.dataset.adminConsoleScreen = name;
        }
        for (const link of shellParts.links()) {
            if (link.dataset.adminConsoleNav === name) {
                link.setAttribute('aria-current', 'page');
            }
            else {
                link.removeAttribute('aria-current');
            }
        }
    }

    /**
     * Build a sidebar navigation anchor for one screen or back link.
     * @param {string} href destination URL or hash
     * @param {string|Node|null|undefined} iconSpec optional glyph name or node
     * @param {string} label visible link text
     * @param {Record<string, unknown>|null} [extraProps] additional attributes
     * @param {unknown} [badgeSpec] optional trailing badge
     * @returns {HTMLAnchorElement} built nav link
     */
    function buildNavItem(href, iconSpec, label, extraProps = null, badgeSpec = null) {
        return dom.h('a', { class: 'app__nav-item', href, ...extraProps },
            resolveIcon(doc, iconSpec),
            dom.h('span', null, label),
            buildNavBadge(dom, badgeSpec));
    }

    /**
     * Build the default signed-in account menu using `attachAccountMenu`.
     * @param {object|null} account signed-in account
     * @param {AbortSignal} signal shell teardown signal
     * @returns {HTMLElement} account menu root
     */
    function buildAccountMenu(account, signal) {
        const menuConfig = options.accountMenu ?? {};
        const menuId = `admin-console-account-menu-${idSeed}`;
        const nameId = `admin-console-account-name-${idSeed}`;
        const items = [];

        if (menuConfig.manageHref) {
            const linkProps = {
                class: 'menu__item',
                role: 'menuitem',
                href: menuConfig.manageHref
            };
            if (menuConfig.manageTarget) {
                linkProps.target = menuConfig.manageTarget;
                if (menuConfig.manageTarget === '_blank') {
                    linkProps.rel = 'noopener';
                }
            }
            items.push(dom.h('a', linkProps,
                resolveIcon(doc, menuConfig.manageIcon ?? 'user'),
                menuConfig.manageLabel ?? labels.manageAccount));
        }

        if (Array.isArray(menuConfig.items)) {
            items.push(...menuConfig.items);
        }

        const signOutItem = dom.h('button', {
            class: 'menu__item',
            type: 'button',
            role: 'menuitem',
            'data-admin-console-action': 'sign-out'
        }, menuConfig.signOutLabel ?? labels.signOut);
        items.push(signOutItem);

        const menuRoot = dom.h('div', { class: 'account-menu', 'data-account-menu': '' },
            dom.h('button', {
                class: 'account-menu__button',
                type: 'button',
                popovertarget: menuId
            }),
            dom.h('div', {
                class: 'menu account-menu__panel',
                id: menuId,
                role: 'menu',
                popover: 'auto'
            },
            dom.h('p', {
                class: 'account-menu__name',
                id: nameId,
                'data-account-menu-name': '',
                'aria-hidden': 'true'
            }),
            items));

        const menuController = attachAccountMenu(menuRoot, {
            account: account ? { name: displayName(account) } : null,
            onSelect: (item, event) => {
                if (item === signOutItem) {
                    handleSignOut();
                    return;
                }
                menuConfig.onSelect?.(item, event);
            }
        });
        signal.addEventListener('abort', () => menuController.destroy(), { once: true });
        return menuRoot;
    }

    /**
     * Build the primary Sign In button for the signed-out shell top bar.
     * @param {AbortSignal} signal shell teardown signal
     * @returns {Node|Node[]} signed-out top bar action(s)
     */
    function buildSignedOutSlot(signal) {
        if (typeof options.renderSignedOutSlot === 'function') {
            return options.renderSignedOutSlot({ signIn: handleSignIn, signal, dom });
        }
        return dom.button(labels.signIn, handleSignIn, {
            kind: 'primary',
            'data-admin-console-action': 'sign-in'
        });
    }

    /**
     * Trigger the app's sign-in callback.
     */
    function handleSignIn() {
        options.onSignIn?.({
            route: parse(),
            location: loc,
            console: controller
        });
    }

    /**
     * Run the app's sign-out callback, clear in-memory session/account state, and show the signed-out shell.
     * @returns {Promise<void>} resolves after sign-out finishes
     */
    async function handleSignOut() {
        const prevAccount = currentAccount;
        const prevSession = currentSession;
        try {
            await options.onSignOut?.({
                account: prevAccount,
                me: prevAccount,
                session: prevSession,
                console: controller
            });
        }
        catch {
            // Even when sign-out fails on the network, clear local state and leave the console signed out.
        }
        if (destroyed) {
            return;
        }
        currentAccount = null;
        currentSession = null;
        showSignedOut(labels.signedOut);
    }

    /**
     * Attach the skip link click handler so `#main` receives focus without mutating the route hash.
     * @param {HTMLElement|null} skipLink skip link element
     * @param {HTMLElement|null} mainEl main landmark element
     * @param {AbortSignal} signal teardown signal
     */
    function bindSkipLink(skipLink, mainEl, signal) {
        if (!skipLink || !mainEl) {
            return;
        }
        skipLink.addEventListener('click', (event) => {
            event.preventDefault();
            mainEl.focus();
        }, { signal });
    }

    /**
     * Build the complete `.app.app--scroll-main` shell inside `root` for `createAdminConsole`.
     * @param {(signal: AbortSignal) => unknown} accountSlot renders the top-bar actions slot
     * @returns {object} shell part references
     */
    function buildShell(accountSlot) {
        teardownActive();
        const shellController = new AbortController();
        shellAbort = shellController;
        const { signal } = shellController;
        const navId = `admin-console-nav-${idSeed}`;

        const titleEl = dom.h('h1', { class: 'view-header__title', 'data-admin-console-title': '' });
        const headerEl = dom.h('div', { class: 'view-header' }, titleEl);
        const viewEl = dom.h('div', { 'data-admin-console-view': '' });
        const panelEl = dom.h('aside', {
            class: 'app__side-panel',
            hidden: true,
            'data-admin-console-panel': ''
        });
        const bannersEl = dom.h('div', { class: 'app__banners', 'data-admin-console-banners': '' });
        const overlaysEl = dom.h('div', { class: 'app__overlays', 'data-admin-console-overlays': '' },
            dom.h('div', { class: 'toast-region', role: 'region', 'aria-label': labels.notifications }));
        const mainEl = dom.h('main', {
            class: 'app__main',
            id: 'main',
            tabindex: '-1',
            'data-admin-console-main': ''
        }, headerEl, viewEl);

        const skipEl = dom.h('a', {
            class: 'skip-link',
            href: '#main',
            'data-admin-console-skip': ''
        }, labels.skipToContent);
        bindSkipLink(skipEl, mainEl, signal);

        const toggleEl = dom.h('button', {
            class: 'app__nav-toggle icon-button',
            type: 'button',
            popovertarget: navId,
            'aria-controls': navId,
            'aria-expanded': 'true',
            'aria-label': labels.navigation,
            'data-app-nav-toggle': ''
        }, resolveIcon(doc, 'nav-menu'));

        const navListEl = dom.h('ul', { class: 'app__nav-list', 'data-admin-console-nav-list': '' },
            screens.map((screen) => dom.h('li', null, buildNavItem(`#/${screen.name}`, screen.icon, screen.title, {
                'data-admin-console-nav': screen.name
            }, screen.badge))));

        const endListEl = options.backLink
            ? dom.h('ul', { class: 'app__nav-list app__nav-list--end' },
                dom.h('li', null, buildNavItem(options.backLink.href, options.backLink.icon ?? 'back', options.backLink.label, {
                    'data-admin-console-action': 'back'
                })))
            : null;

        const sidebarEl = dom.h('nav', {
            class: 'app__sidebar',
            id: navId,
            'aria-label': navLabel,
            popover: 'auto',
            'data-admin-console-sidebar': ''
        }, navListEl, endListEl);

        const brandHref = options.brandHref ?? `#/${defaultScreen()}`;
        const topActionsEl = dom.h('div', {
            class: 'app__top-actions',
            'data-admin-console-top-actions': ''
        }, accountSlot(signal));

        const appEl = dom.h('div', { class: 'app app--scroll-main', 'data-admin-console-shell': '' },
            skipEl,
            dom.h('header', { class: 'app__top-bar' },
                toggleEl,
                dom.h('a', { class: 'app__brand', href: brandHref, 'data-admin-console-brand': '' }, appTitle),
                topActionsEl),
            sidebarEl,
            bannersEl,
            mainEl,
            panelEl,
            overlaysEl);

        dom.setChildren(root, appEl);

        const navController = attachAppNav(toggleEl, sidebarEl, { media: options.media, states: options.navStates });
        signal.addEventListener('abort', () => navController.destroy(), { once: true });
        const labelTooltips = attachLabelTooltips(appEl);
        signal.addEventListener('abort', () => labelTooltips.destroy(), { once: true });

        shellParts = {
            app: appEl,
            skip: skipEl,
            toggle: toggleEl,
            sidebar: sidebarEl,
            navList: navListEl,
            topActions: topActionsEl,
            banners: bannersEl,
            main: mainEl,
            title: titleEl,
            view: viewEl,
            panel: panelEl,
            overlays: overlaysEl,
            signal,
            links: () => [...sidebarEl.querySelectorAll('[data-admin-console-nav]')]
        };
        return shellParts;
    }

    /**
     * Resolve references inside a pre-existing `.app` shell for `attachAdminConsole` using `data-*` hooks only.
     * @returns {object} attached shell part references
     */
    function ensureAttachedShell() {
        if (activeGateEl) {
            activeGateEl.remove();
            activeGateEl = null;
        }
        if (savedShellNodes) {
            const overlaysEl = root.querySelector(':scope > [data-admin-console-overlays]');
            if (overlaysEl) {
                root.insertBefore(savedShellNodes, overlaysEl);
            }
            else {
                root.append(savedShellNodes);
            }
            savedShellNodes = null;
        }
        if (shellParts) {
            return shellParts;
        }

        const shellController = new AbortController();
        shellAbort = shellController;
        const { signal } = shellController;

        const skipEl = root.querySelector('[data-admin-console-skip]');
        const toggleEl = root.querySelector('[data-app-nav-toggle]');
        const sidebarEl = root.querySelector('[data-admin-console-sidebar]');
        const navListEl = sidebarEl?.querySelector('[data-admin-console-nav-list]') ?? sidebarEl?.querySelector('ul') ?? null;
        const topActionsEl = root.querySelector('[data-admin-console-top-actions]');
        const bannersEl = root.querySelector('[data-admin-console-banners]');
        const mainEl = root.querySelector('[data-admin-console-main]');
        const titleEl = root.querySelector('[data-admin-console-title]');
        const viewEl = root.querySelector('[data-admin-console-view]');
        const panelEl = root.querySelector('[data-admin-console-panel]');
        const overlaysEl = root.querySelector('[data-admin-console-overlays]');

        bindSkipLink(skipEl, mainEl, signal);
        if (toggleEl && sidebarEl && options.attachNav !== false) {
            const navController = attachAppNav(toggleEl, sidebarEl, { media: options.media, states: options.navStates });
            signal.addEventListener('abort', () => navController.destroy(), { once: true });
        }
        const labelTooltips = attachLabelTooltips(root);
        signal.addEventListener('abort', () => labelTooltips.destroy(), { once: true });

        shellParts = {
            app: root,
            skip: skipEl,
            toggle: toggleEl,
            sidebar: sidebarEl,
            navList: navListEl,
            topActions: topActionsEl,
            banners: bannersEl,
            main: mainEl,
            title: titleEl,
            view: viewEl,
            panel: panelEl,
            overlays: overlaysEl,
            signal,
            links: () => [...(sidebarEl ?? root).querySelectorAll('[data-admin-console-nav]')]
        };
        return shellParts;
    }

    /** Restore saved top-bar actions when returning from signed-out mode on an attached shell. */
    function restoreAttachedTopActions() {
        if (savedTopActionsNodes && shellParts?.topActions) {
            shellParts.topActions.replaceChildren(savedTopActionsNodes);
            savedTopActionsNodes = null;
        }
    }

    /**
     * Show a centered `.app__gate` page for session checks, failures, or forbidden access.
     * Tears down any active screen and router listeners first.
     * @param {unknown} content message nodes or text
     * @param {Array<Node|null|false|undefined>} [actions] action buttons or links
     * @param {{label?: string, title?: string, state?: string}} [gateOptions] gate metadata
     * @returns {HTMLElement} rendered `<main class="app__gate">` element
     */
    function showGate(content, actions = [], gateOptions = {}) {
        const label = gateOptions.label ?? appTitle;
        const heading = gateOptions.title ?? appTitle;
        const state = gateOptions.state ?? 'custom';
        const actionList = (Array.isArray(actions) ? actions : [actions]).flat(Infinity).filter(Boolean);

        teardownActive();
        mode = 'gate';
        gateState = state;
        currentRoute = null;
        root.dataset.adminConsoleMode = 'gate';

        const gateEl = dom.h('main', {
            class: 'app__gate',
            id: 'main',
            tabindex: '-1',
            'aria-label': label,
            'data-admin-console-gate': state
        },
        dom.h('h1', null, heading),
        content,
        actionList.length > 0
            ? dom.h('div', { class: 'app__gate-actions', 'data-admin-console-gate-actions': '' }, actionList)
            : null);

        if (attached) {
            if (activeGateEl) {
                activeGateEl.remove();
            }
            if (!savedShellNodes) {
                closeDrawerIfOpen(shellParts?.sidebar ?? root.querySelector('[data-admin-console-sidebar]'));
                savedShellNodes = doc.createDocumentFragment();
                const overlaysEl = root.querySelector(':scope > [data-admin-console-overlays]');
                for (const child of [...root.childNodes]) {
                    if (child !== overlaysEl) {
                        savedShellNodes.append(child);
                    }
                }
            }
            const overlaysEl = root.querySelector(':scope > [data-admin-console-overlays]');
            if (overlaysEl) {
                root.insertBefore(gateEl, overlaysEl);
            }
            else {
                root.append(gateEl);
            }
            activeGateEl = gateEl;
        }
        else {
            dom.setChildren(root, gateEl);
        }

        if (doc) {
            doc.title = label && label !== appTitle ? `${label} · ${appTitle}` : appTitle;
        }
        return gateEl;
    }

    /**
     * Show the centered session-checking gate page.
     * @param {string} [message] status text
     * @returns {HTMLElement} gate element
     */
    function showChecking(message = labels.checkingSession) {
        return showGate([dom.statusLine(message)], [], { label: appTitle, state: 'checking' });
    }

    /**
     * Show a centered failure gate with a Retry button.
     * @param {string} message error message
     * @param {{onRetry?: () => void, retryLabel?: string, actions?: Array<Node>}} [failOptions] failure options
     * @returns {HTMLElement} gate element
     */
    function showCheckFailed(message, failOptions = {}) {
        const retryHandler = failOptions.onRetry ?? (() => start());
        const actions = failOptions.actions ?? [
            dom.button(failOptions.retryLabel ?? labels.retry, retryHandler, {
                icon: 'refresh',
                'data-admin-console-action': 'retry'
            })
        ];
        return showGate([dom.errorBanner(message)], actions, { label: appTitle, state: 'error' });
    }

    /**
     * Show the centered forbidden-access gate page for accounts without administrator privileges.
     * @param {{message?: string, content?: unknown, label?: string, actions?: Array<Node>, onBack?: () => void, showSignOut?: boolean}} [forbiddenOptions]
     *   forbidden gate options
     * @returns {HTMLElement} gate element
     */
    function showForbidden(forbiddenOptions = {}) {
        const label = forbiddenOptions.label ?? labels.forbiddenTitle;
        const content = forbiddenOptions.content !== undefined
            ? forbiddenOptions.content
            : [dom.h('p', { role: 'status' }, forbiddenOptions.message ?? resolveText(labels.forbiddenMessage, appTitle, currentAccount))];

        let actions = forbiddenOptions.actions;
        if (!actions) {
            actions = [];
            if (typeof forbiddenOptions.onBack === 'function') {
                actions.push(dom.button(forbiddenOptions.backLabel ?? options.backLink?.label ?? 'Back', forbiddenOptions.onBack, {
                    kind: 'primary',
                    'data-admin-console-action': 'back'
                }));
            }
            else if (options.backLink) {
                actions.push(dom.h('a', {
                    class: 'button',
                    href: options.backLink.href,
                    'data-admin-console-action': 'back'
                }, options.backLink.label));
            }
            if (forbiddenOptions.showSignOut !== false) {
                actions.push(dom.button(labels.signOut, handleSignOut, {
                    kind: 'secondary',
                    'data-admin-console-action': 'sign-out'
                }));
            }
        }

        return showGate(content, actions, { label, state: 'forbidden' });
    }

    /**
     * Show the signed-out shell: keeps navigation marks and titles tracking hash changes without mounting screens.
     * @param {string} [message] status or error text shown in the content area
     * @param {{failure?: boolean}} [signedOutOptions] set `failure: true` for a danger error banner
     */
    function showSignedOut(message = resolveText(labels.signedOutPrompt, appTitle), signedOutOptions = {}) {
        const failure = Boolean(signedOutOptions.failure);
        stopRouter();
        disposeCurrentScreen();

        const parts = attached
            ? ensureAttachedShell()
            : buildShell((signal) => buildSignedOutSlot(signal));

        mode = 'signed-out';
        gateState = null;
        root.dataset.adminConsoleMode = 'signed-out';

        if (parts.panel) {
            parts.panel.hidden = true;
            dom.setChildren(parts.panel);
        }

        const routeController = new AbortController();
        routeAbort = routeController;

        if (attached && parts.topActions) {
            if (!savedTopActionsNodes) {
                savedTopActionsNodes = doc.createDocumentFragment();
                for (const child of [...parts.topActions.childNodes]) {
                    savedTopActionsNodes.append(child);
                }
            }
            dom.setChildren(parts.topActions, buildSignedOutSlot(routeController.signal));
        }

        const renderSignedOutRoute = () => {
            const next = parse();
            currentRoute = next;
            applyRouteMarks(next.name, false);
            if (parts.view) {
                dom.setChildren(parts.view, failure ? dom.errorBanner(message) : dom.statusLine(message));
            }
        };

        view?.addEventListener?.('hashchange', renderSignedOutRoute, { signal: routeController.signal });
        renderSignedOutRoute();
    }

    /**
     * Populate and open the shell side panel.
     * @param {unknown} content nodes or text for the panel
     * @param {{label?: string, labelledBy?: string, focus?: HTMLElement|boolean}} [panelOptions] accessibility and focus options
     */
    function openPanel(content, panelOptions = {}) {
        const panelEl = shellParts?.panel;
        if (!panelEl) {
            return;
        }
        if (panelOptions.labelledBy) {
            panelEl.setAttribute('aria-labelledby', panelOptions.labelledBy);
            panelEl.removeAttribute('aria-label');
        }
        else if (panelOptions.label) {
            panelEl.setAttribute('aria-label', panelOptions.label);
            panelEl.removeAttribute('aria-labelledby');
        }
        if (content !== undefined) {
            dom.setChildren(panelEl, content);
        }
        panelEl.hidden = false;
        if (panelOptions.focus instanceof Object && typeof panelOptions.focus.focus === 'function') {
            panelOptions.focus.focus();
        }
    }

    /** Hide and clear the shell side panel. */
    function closePanel() {
        const panelEl = shellParts?.panel;
        if (!panelEl) {
            return;
        }
        panelEl.hidden = true;
        dom.setChildren(panelEl);
    }

    /**
     * Show the signed-in shell and run the hash router.
     * @param {object|null} [account] signed-in account object
     * @param {object|null} [session] session object
     */
    function showShell(account = currentAccount, session = currentSession) {
        currentAccount = account;
        currentSession = session;
        stopRouter();
        disposeCurrentScreen();

        const parts = attached
            ? ensureAttachedShell()
            : buildShell((signal) => (typeof options.renderAccountSlot === 'function'
                ? options.renderAccountSlot({ account, session, signOut: handleSignOut, signal, dom })
                : buildAccountMenu(account, signal)));

        if (attached) {
            restoreAttachedTopActions();
        }

        mode = 'shell';
        gateState = null;
        root.dataset.adminConsoleMode = 'shell';

        const routeController = new AbortController();
        routeAbort = routeController;

        const baseCtx = {
            account,
            me: account,
            session,
            view: parts.view,
            panel: parts.panel,
            editor: parts.panel,
            main: parts.main,
            banners: parts.banners,
            overlays: parts.overlays,
            signal: parts.signal,
            dom,
            openPanel,
            closePanel,
            navigate: (hash) => navigate(hash),
            signIn: handleSignIn,
            signOut: handleSignOut,
            showForbidden: (forbiddenOptions) => showForbidden(forbiddenOptions),
            showGate: (content, actions, gateOptions) => showGate(content, actions, gateOptions),
            showSignedOut: (message, signedOutOptions) => showSignedOut(message, signedOutOptions)
        };
        const ctx = typeof options.createContext === 'function'
            ? (options.createContext(baseCtx) ?? baseCtx)
            : baseCtx;

        const dispatchRoute = (event = null) => {
            const next = parse();
            const isInitial = !initialRouteHandled;
            initialRouteHandled = true;
            currentRoute = next;

            if (next.name === currentName && typeof currentScreenController?.update === 'function') {
                // Opening or closing a detail panel keeps the screen's filter query in the URL hash.
                const oldFragment = String(event?.oldURL ?? '').split('#')[1] ?? '';
                const [oldPath = '', oldQuery = ''] = oldFragment.split('?');
                if (oldQuery && loc && hist && typeof hist.replaceState === 'function' && !String(loc.hash ?? '').includes('?')) {
                    const oldRoute = parse(`#${oldPath}`);
                    if (oldRoute.name === next.name && oldRoute.id !== next.id) {
                        hist.replaceState(hist.state ?? null, '', `${loc.pathname ?? ''}${loc.search ?? ''}${loc.hash}?${oldQuery}`);
                    }
                }
                currentScreenController.update(next, ctx);
                options.onRouteChange?.(next, findScreen(next.name));
                return;
            }

            disposeCurrentScreen();
            closePanel();
            const screen = findScreen(next.name);
            if (!screen) {
                return;
            }
            currentName = next.name;
            applyRouteMarks(next.name, isInitial);
            if (parts.view) {
                dom.setChildren(parts.view);
            }
            currentScreenAbort = new AbortController();
            const screenCtx = { ...ctx, screenSignal: currentScreenAbort.signal };
            currentScreenController = screen.mount?.(parts.view, screenCtx, next) ?? null;
            if (parts.main) {
                parts.main.scrollTop = 0;
            }
            options.onRouteChange?.(next, screen);
        };

        view?.addEventListener?.('hashchange', dispatchRoute, { signal: routeController.signal });
        dispatchRoute();
    }

    /**
     * Navigate to a hash route (such as `'#/users'` or `'#/users/42'`).
     * @param {string} hash destination hash
     */
    function navigate(hash) {
        if (loc) {
            loc.hash = hash;
        }
    }

    /**
     * Register or replace a screen descriptor in the registry.
     * @param {{name: string, title: string, icon?: string|Node, badge?: unknown, mount: Function}} screen screen descriptor
     */
    function registerScreen(screen) {
        const index = screens.findIndex((item) => item.name === screen.name);
        if (index >= 0) {
            screens[index] = screen;
        }
        else {
            screens.push(screen);
            if (!attached && shellParts?.navList) {
                shellParts.navList.append(dom.h('li', null, buildNavItem(`#/${screen.name}`, screen.icon, screen.title, {
                    'data-admin-console-nav': screen.name
                }, screen.badge)));
            }
        }
    }

    /**
     * Start the console: run optional `beforeStart`, `checkSession`, `checkAccount`, and authorization checks,
     * transitioning to the matching gate page, signed-out shell, or signed-in shell.
     * @returns {Promise<boolean>} `true` when the signed-in shell opens
     */
    async function start() {
        if (destroyed) {
            return false;
        }
        startAbort?.abort();
        const runAbort = new AbortController();
        startAbort = runAbort;
        const token = (startToken += 1);
        const isStale = () => destroyed || token !== startToken;

        if (typeof options.beforeStart === 'function') {
            const proceed = await options.beforeStart({ signal: runAbort.signal, console: controller });
            if (isStale() || proceed === false) {
                return false;
            }
        }

        const hasSessionCheck = typeof options.checkSession === 'function';
        const hasAccountCheck = typeof options.checkAccount === 'function';

        if (!hasSessionCheck && !hasAccountCheck) {
            showShell(currentAccount, currentSession);
            return true;
        }

        showChecking();

        let session = currentSession;
        if (hasSessionCheck) {
            try {
                session = await options.checkSession({ signal: runAbort.signal });
            }
            catch (error) {
                if (!isStale()) {
                    showCheckFailed(resolveText(labels.sessionCheckFailed, error));
                }
                return false;
            }
            if (isStale()) {
                return false;
            }
            currentSession = session;
            if (!session) {
                if (typeof options.onUnauthenticated === 'function') {
                    options.onUnauthenticated({ expired: false, error: null });
                }
                else {
                    showSignedOut();
                }
                return false;
            }
        }

        let account = currentAccount;
        if (hasAccountCheck) {
            let forbiddenHandled = false;
            const handleForbidden = (forbiddenOptions) => {
                forbiddenHandled = true;
                if (!isStale()) {
                    showForbidden(forbiddenOptions);
                }
            };
            try {
                account = await options.checkAccount(session, {
                    signal: runAbort.signal,
                    showForbidden: handleForbidden
                });
            }
            catch (error) {
                if (isStale()) {
                    return false;
                }
                if (isUnauthorized(error)) {
                    currentSession = null;
                    if (typeof options.onUnauthenticated === 'function') {
                        options.onUnauthenticated({ expired: true, error });
                    }
                    else {
                        showSignedOut(labels.sessionExpired);
                    }
                }
                else if (isForbidden(error)) {
                    showForbidden();
                }
                else if (!forbiddenHandled) {
                    showCheckFailed(resolveText(labels.accountCheckFailed, error));
                }
                return false;
            }
            if (isStale() || forbiddenHandled) {
                return false;
            }
            currentAccount = account;
        }

        const authorized = typeof options.isAuthorized === 'function'
            ? Boolean(options.isAuthorized(account, session))
            : (typeof options.requiredRealm === 'string' && options.requiredRealm
                ? Array.isArray(account?.realms) && account.realms.includes(options.requiredRealm)
                : (account && Object.hasOwn(account, 'realms')
                    ? Array.isArray(account.realms) && account.realms.includes('admin')
                    : true));

        if (!authorized) {
            showForbidden();
            return false;
        }

        showShell(account, session);
        return true;
    }

    /** Dispose the active screen, remove all listeners, restore attached DOM if needed, and clean up builders. */
    function destroy() {
        if (destroyed) {
            return;
        }
        destroyed = true;
        startToken += 1;
        startAbort?.abort();
        startAbort = null;
        stopRouter();
        disposeCurrentScreen();
        if (attached) {
            if (activeGateEl) {
                activeGateEl.remove();
                activeGateEl = null;
            }
            if (savedShellNodes) {
                const overlaysEl = root.querySelector(':scope > [data-admin-console-overlays]');
                if (overlaysEl) {
                    root.insertBefore(savedShellNodes, overlaysEl);
                }
                else {
                    root.append(savedShellNodes);
                }
                savedShellNodes = null;
            }
            restoreAttachedTopActions();
            delete root.dataset.adminConsoleMode;
        }
        if (shellAbort) {
            shellAbort.abort();
            shellAbort = null;
        }
        shellParts = null;
        if (ownsDom) {
            dom.destroy();
        }
    }

    const controller = {
        element: root,
        start,
        showShell,
        showSignedOut,
        showGate,
        showChecking,
        showCheckFailed,
        showForbidden,
        registerScreen,
        getScreens: () => [...screens],
        parseRoute: parse,
        navigate,
        getRoute: () => (currentRoute ? { ...currentRoute } : null),
        getMode: () => mode,
        getState: () => ({
            mode,
            gateState,
            route: currentRoute ? { ...currentRoute } : null,
            screen: currentName,
            account: currentAccount,
            session: currentSession
        }),
        destroy
    };

    if (attached && options.autoRoute !== false) {
        showShell(currentAccount, currentSession);
    }

    return controller;
}

/**
 * Create an admin console frame inside a host element or a new container in an injected `Document`.
 * Call `start()` to run session/account checks, or call `showShell()`, `showSignedOut()`, or `showGate()` directly.
 * @param {Document|HTMLElement|object} [docOrRoot] injected `Document`, host `HTMLElement`, or options object
 * @param {object} [options] frame configuration (screens, title, callbacks, labels, injected `window`)
 * @returns {object} admin console controller
 */
export function createAdminConsole(docOrRoot = globalThis.document, options = {}) {
    let root;
    let resolvedOptions = options;
    if (isNode(docOrRoot) && docOrRoot.nodeType === 1) {
        root = docOrRoot;
    }
    else if (isNode(docOrRoot) && docOrRoot.nodeType === 9) {
        root = docOrRoot.createElement('div');
        resolvedOptions = { document: docOrRoot, ...options };
    }
    else {
        resolvedOptions = (docOrRoot && typeof docOrRoot === 'object' ? docOrRoot : options) ?? {};
        const doc = resolvedOptions.document ?? globalThis.document;
        root = resolvedOptions.root ?? doc.createElement('div');
    }
    return initAdminConsole(root, resolvedOptions, false);
}

/**
 * Attach an admin console frame to pre-existing `.app` shell markup using `data-admin-console-*` hooks.
 * Routes the current hash immediately unless `options.autoRoute === false`.
 * @param {HTMLElement} root pre-existing `.app` shell element
 * @param {object} [options] frame configuration (screens, title, callbacks, labels, injected `window`)
 * @returns {object} admin console controller
 */
export function attachAdminConsole(root, options = {}) {
    return initAdminConsole(root, options ?? {}, true);
}
