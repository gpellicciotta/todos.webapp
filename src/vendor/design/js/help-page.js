/**
 * Help page pattern: search with clear button, topic filter chips, section cards filtered by both,
 * FAQ collapsibles hidden until found with Expand All, no-results state, `?q=` and `?topic=` links,
 * feedback `mailto:` links carrying app version and signed-in user, and optional release notes.
 *
 * Hooks use `data-help-page-*` attributes and native/ARIA state, never style classes.
 * Reuses `collapsible.js`, `release-notes.js`, and `icon.js`.
 */

import { attachCollapsible } from './collapsible.js';
import { createIcon } from './icon.js';
import { attachReleaseNotes } from './release-notes.js';

const DEFAULT_ALL_TOPIC = 'all';

const DEFAULT_LABELS = {
    search: 'Search help',
    searchPlaceholder: 'Search guides, FAQ, or release notes',
    clearSearch: 'Clear search',
    topicGroup: 'Help topics',
    noResultsTitle: 'No matching topics',
    noResultsPrefix: 'No help topics, questions, or release notes match "',
    noResultsSuffix: '".',
    resetSearch: 'Reset Search',
    expandAll: 'Expand All',
    collapseAll: 'Collapse All',
    feedbackPrompt: '[Describe your feedback or issue here]',
    notSignedIn: '(not signed in)'
};

const DEFAULT_ICONS = {
    clear: 'close',
    chevron: 'chevron-down',
    empty: 'help'
};

let instances = 0;

/**
 * Normalize an app version string by trimming and stripping a leading `v`.
 * @param {string|number|null|undefined} rawVersion raw version value
 * @returns {string} normalized version or `'unknown'`
 */
function normalizeVersion(rawVersion) {
    if (rawVersion === null || rawVersion === undefined) {
        return 'unknown';
    }
    const cleaned = String(rawVersion).trim().replace(/^v/i, '');
    return cleaned || 'unknown';
}

/**
 * Format signed-in user identity for feedback emails.
 * @param {string|{name?: string, email?: string}|null|undefined} user signed-in user
 * @param {string} notSignedInLabel fallback when signed out
 * @returns {string} formatted user line
 */
function formatUserContext(user, notSignedInLabel) {
    if (typeof user === 'string') {
        const trimmed = user.trim();
        return trimmed || notSignedInLabel;
    }
    if (user && typeof user === 'object') {
        const name = typeof user.name === 'string' ? user.name.trim() : '';
        const email = typeof user.email === 'string' ? user.email.trim() : '';
        if (name && email) {
            return `${name} <${email}>`;
        }
        if (email) {
            return email;
        }
        if (name) {
            return name;
        }
    }
    return notSignedInLabel;
}

/**
 * Build a `mailto:` URL carrying the app name, version, and signed-in user context.
 * @param {object} [options] feedback context
 * @param {string} [options.address] destination email address
 * @param {string} [options.appName] application name for the subject and body
 * @param {string|number|null} [options.version] application version; leading `v` is stripped
 * @param {string|{name?: string, email?: string}|null} [options.user] signed-in user context
 * @param {string} [options.prompt] placeholder message at the top of the email body
 * @param {string} [options.notSignedInLabel] label used when no user is signed in
 * @returns {string} the `mailto:` URL, or `''` when no valid address is given
 */
export function buildFeedbackMailto(options = {}) {
    const address = typeof options.address === 'string' ? options.address.trim() : '';
    if (!address || /[\r\n\s]/.test(address)) {
        return '';
    }
    const appName = typeof options.appName === 'string' ? options.appName.trim() : '';
    const version = normalizeVersion(options.version);
    const prompt = typeof options.prompt === 'string' && options.prompt
        ? options.prompt
        : DEFAULT_LABELS.feedbackPrompt;
    const notSignedInLabel = typeof options.notSignedInLabel === 'string' && options.notSignedInLabel
        ? options.notSignedInLabel
        : DEFAULT_LABELS.notSignedIn;
    const userContext = formatUserContext(options.user, notSignedInLabel);

    const subject = appName ? `${appName} Feedback (v${version})` : `Feedback (v${version})`;
    const appLine = appName ? `App: ${appName}\n` : '';
    const body = `${prompt}\n\n---\n${appLine}Version: ${version}\nUser: ${userContext}\n`;

    return `mailto:${address}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

/**
 * Parse `?q=` and `?topic=` parameters from a route, query string, URLSearchParams, or plain object.
 * @param {string|URLSearchParams|{q?: string, topic?: string}|null|undefined} input query source
 * @returns {{topic: string, q: string}} normalized query parameters
 */
export function parseHelpQuery(input) {
    if (!input) {
        return { topic: '', q: '' };
    }
    if (input instanceof URLSearchParams) {
        return {
            topic: (input.get('topic') || '').trim(),
            q: input.get('q') || ''
        };
    }
    if (typeof input === 'string') {
        const queryIndex = input.indexOf('?');
        const raw = queryIndex >= 0 ? input.slice(queryIndex + 1) : (input.includes('=') ? input : '');
        if (!raw) {
            return { topic: '', q: '' };
        }
        const hashIndex = raw.indexOf('#');
        const cleaned = hashIndex >= 0 ? raw.slice(0, hashIndex) : raw;
        const params = new URLSearchParams(cleaned);
        return {
            topic: (params.get('topic') || '').trim(),
            q: params.get('q') || ''
        };
    }
    if (typeof input === 'object') {
        return {
            topic: typeof input.topic === 'string' ? input.topic.trim() : '',
            q: typeof input.q === 'string' ? input.q : ''
        };
    }
    return { topic: '', q: '' };
}

/**
 * Format active help filter state as a `?topic=...&q=...` query string.
 * Omits `topic` when empty or equal to `allTopic`, and omits `q` when blank.
 * @param {{topic?: string, q?: string}} [params] active filter state
 * @param {string} [allTopic] topic key representing all topics
 * @returns {string} query string beginning with `?`, or `''` when neither parameter is active
 */
export function formatHelpQuery(params = {}, allTopic = DEFAULT_ALL_TOPIC) {
    const searchParams = new URLSearchParams();
    const topic = typeof params.topic === 'string' ? params.topic.trim() : '';
    const q = typeof params.q === 'string' ? params.q.trim() : '';
    if (topic && topic !== allTopic) {
        searchParams.set('topic', topic);
    }
    if (q) {
        searchParams.set('q', q);
    }
    const serialized = searchParams.toString();
    return serialized ? `?${serialized}` : '';
}

/**
 * Append plain text or DOM nodes to a parent element without innerHTML parsing.
 * @param {Document} doc owner document
 * @param {HTMLElement} parent target container
 * @param {string|Node|Array<string|Node>|null|undefined} content content to append
 */
function appendContent(doc, parent, content) {
    if (content === null || content === undefined) {
        return;
    }
    const items = Array.isArray(content) ? content : [content];
    for (const item of items) {
        if (typeof item === 'string') {
            const p = doc.createElement('p');
            p.className = 'card__text';
            p.textContent = item;
            parent.append(p);
        }
        else if (item && typeof item === 'object' && 'nodeType' in item) {
            parent.append(item);
        }
    }
}

/**
 * Attach help page behavior to existing `.help-page` markup using `data-help-page-*` hooks.
 * @param {HTMLElement} root help page root element
 * @param {object} [options] behavior options
 * @param {Document} [options.document] injected document
 * @param {Window} [options.window] injected window for location and history access
 * @param {string} [options.allTopic] topic key showing every section (default `'all'`)
 * @param {string|URLSearchParams|{q?: string, topic?: string}} [options.route] initial route or query
 * @param {string|URLSearchParams|{q?: string, topic?: string}} [options.query] alias for `route`
 * @param {boolean} [options.readLocation] read `?q=` and `?topic=` from `window.location` when no explicit query is passed (default `true`)
 * @param {boolean} [options.syncUrl] keep `?q=` and `?topic=` synced via `history.replaceState` (default `false`)
 * @param {object} [options.feedback] initial feedback mailto configuration
 * @param {Array<object>} [options.releases] parsed releases to mount in `[data-help-page-release-notes]`
 * @param {object} [options.releaseNotes] options passed through to `attachReleaseNotes`
 * @param {{expandAll?: string, collapseAll?: string}} [options.labels] button labels for FAQ expand/collapse all
 * @param {(state: {topic: string, query: string, visibleSections: number, visibleFaqItems: number}) => void} [options.onChange]
 *   called after filters or search update the visible sections
 * @returns {object} controller
 */
export function attachHelpPage(root, options = {}) {
    if (!root) {
        throw new TypeError('attachHelpPage requires a root element.');
    }
    const doc = options.document || root.ownerDocument;
    const win = options.window || doc.defaultView || null;
    const allTopic = typeof options.allTopic === 'string' && options.allTopic ? options.allTopic : DEFAULT_ALL_TOPIC;
    const syncUrl = options.syncUrl === true;
    const labels = {
        expandAll: options.labels?.expandAll || DEFAULT_LABELS.expandAll,
        collapseAll: options.labels?.collapseAll || DEFAULT_LABELS.collapseAll
    };

    let activeTopic = allTopic;
    let rawQuery = '';
    let searchQuery = '';
    let feedbackConfig = options.feedback ? { ...options.feedback } : null;
    let releaseNotesController = null;
    let releaseNotesOptions = options.releaseNotes ? { ...options.releaseNotes } : {};
    let destroyed = false;

    const faqControllers = new Map();
    const autoExpanded = new Set();
    const cleanups = [];

    const searchInput = root.querySelector('[data-help-page-search]');
    const searchClear = root.querySelector('[data-help-page-search-clear]');
    const noResultsEl = root.querySelector('[data-help-page-no-results]');
    const noResultsTermEl = root.querySelector('[data-help-page-no-results-term]');
    const resetButton = root.querySelector('[data-help-page-reset]');
    const faqToggleAll = root.querySelector('[data-help-page-faq-toggle]');
    const releaseNotesSlot = root.querySelector('[data-help-page-release-notes]');

    const getTopicChips = () => [...root.querySelectorAll('[data-help-page-topic]')];
    const getSections = () => [...root.querySelectorAll('[data-help-page-section]')];
    const getFaqItems = () => [...root.querySelectorAll('[data-help-page-faq-item]')];

    /**
     * Collect all known topic keys declared on chips or sections.
     * @returns {Set<string>} known topic keys
     */
    function knownTopics() {
        const topics = new Set([allTopic]);
        for (const chip of getTopicChips()) {
            const key = (chip.dataset.helpPageTopic || '').trim();
            if (key) {
                topics.add(key);
            }
        }
        for (const section of getSections()) {
            for (const token of (section.dataset.helpPageTopics || '').split(/\s+/)) {
                if (token) {
                    topics.add(token);
                }
            }
        }
        return topics;
    }

    /**
     * Check whether an FAQ item is currently expanded.
     * @param {HTMLElement} item FAQ collapsible wrapper
     * @returns {boolean} true when expanded
     */
    function isFaqItemExpanded(item) {
        const controller = faqControllers.get(item);
        if (controller) {
            return controller.isExpanded();
        }
        const toggle = item.querySelector(':scope > button[aria-controls]');
        return toggle?.getAttribute('aria-expanded') === 'true';
    }

    /**
     * Expand or collapse one FAQ item, delegating to `collapsible.js` once connected.
     * @param {HTMLElement} item FAQ collapsible wrapper
     * @param {boolean} expanded target state
     */
    function setFaqItemExpanded(item, expanded) {
        const controller = faqControllers.get(item);
        if (controller) {
            if (expanded) {
                controller.expand();
            }
            else {
                controller.collapse();
            }
            return;
        }
        const toggle = item.querySelector(':scope > button[aria-controls]');
        const panelId = toggle?.getAttribute('aria-controls');
        const panel = panelId ? item.querySelector(`[id="${panelId}"]`) : null;
        if (toggle && panel) {
            toggle.setAttribute('aria-expanded', String(expanded));
            if (expanded) {
                panel.removeAttribute('hidden');
            }
            else {
                panel.setAttribute('hidden', 'until-found');
            }
        }
    }

    /**
     * Attach `attachCollapsible` to any FAQ items not yet wired once connected, and prune removed items.
     */
    function syncFaqControllers() {
        const items = getFaqItems();
        const current = new Set(items);
        for (const [item, controller] of faqControllers.entries()) {
            if (!current.has(item)) {
                controller.destroy();
                faqControllers.delete(item);
                autoExpanded.delete(item);
            }
        }
        if (!root.isConnected) {
            return;
        }
        for (const item of items) {
            if (!faqControllers.has(item)) {
                const controller = attachCollapsible(item, {
                    onToggle: (expanded) => {
                        if (!expanded) {
                            autoExpanded.delete(item);
                        }
                        syncFaqToggleButton();
                    }
                });
                faqControllers.set(item, controller);
            }
        }
    }

    /**
     * Keep the Expand All / Collapse All button label and `aria-expanded` aligned with FAQ items.
     */
    function syncFaqToggleButton() {
        if (!faqToggleAll) {
            return;
        }
        const items = getFaqItems();
        const visible = items.filter((item) => !item.hidden);
        const pool = visible.length > 0 ? visible : items;
        const allExpanded = pool.length > 0 && pool.every((item) => isFaqItemExpanded(item));
        faqToggleAll.setAttribute('aria-expanded', String(allExpanded));
        faqToggleAll.textContent = allExpanded ? labels.collapseAll : labels.expandAll;
    }

    /**
     * Synchronize the browser URL's `?topic=` and `?q=` parameters when `syncUrl` is enabled.
     */
    function writeUrlIfEnabled() {
        if (!syncUrl || !win || !win.history || typeof win.history.replaceState !== 'function' || !win.location) {
            return;
        }
        const url = new URL(win.location.href);
        if (activeTopic && activeTopic !== allTopic) {
            url.searchParams.set('topic', activeTopic);
        }
        else {
            url.searchParams.delete('topic');
        }
        if (rawQuery.trim()) {
            url.searchParams.set('q', rawQuery.trim());
        }
        else {
            url.searchParams.delete('q');
        }
        const nextUrl = `${url.pathname}${url.search}${url.hash}`;
        win.history.replaceState(win.history.state, '', nextUrl);
    }

    /**
     * Update chip `aria-pressed`, section visibility, FAQ filtering/auto-expansion, and empty state.
     * @param {boolean} [notify] whether to invoke `options.onChange` and sync URL
     */
    function applyFilters(notify = true) {
        if (destroyed) {
            return;
        }
        syncFaqControllers();

        for (const chip of getTopicChips()) {
            const key = (chip.dataset.helpPageTopic || '').trim();
            chip.setAttribute('aria-pressed', String(key === activeTopic));
        }

        if (searchClear) {
            searchClear.hidden = searchQuery.length === 0;
        }

        const isSearchActive = searchQuery.length > 0;
        const matchedFaqItems = new Set();
        let visibleFaqItems = 0;

        for (const item of getFaqItems()) {
            const faqText = `${item.textContent || ''} ${item.dataset.helpPageTags || ''}`.toLowerCase();
            const matches = !isSearchActive || faqText.includes(searchQuery);
            item.hidden = !matches;
            if (isSearchActive && matches) {
                matchedFaqItems.add(item);
                if (!isFaqItemExpanded(item)) {
                    autoExpanded.add(item);
                    setFaqItemExpanded(item, true);
                }
            }
            else if (!isSearchActive && autoExpanded.has(item)) {
                autoExpanded.delete(item);
                setFaqItemExpanded(item, false);
            }
            if (matches) {
                visibleFaqItems += 1;
            }
        }

        let visibleSections = 0;
        for (const section of getSections()) {
            const topics = (section.dataset.helpPageTopics || '').split(/\s+/).filter(Boolean);
            const matchesTopic = activeTopic === allTopic || topics.includes(activeTopic);
            let matchesSearch = true;
            if (isSearchActive) {
                const sectionText = `${section.textContent || ''} ${section.dataset.helpPageTags || ''}`.toLowerCase();
                const hasMatchedFaq = [...section.querySelectorAll('[data-help-page-faq-item]')].some((item) => matchedFaqItems.has(item));
                matchesSearch = sectionText.includes(searchQuery) || hasMatchedFaq;
            }
            section.hidden = !(matchesTopic && matchesSearch);
            if (!section.hidden) {
                visibleSections += 1;
            }
        }

        if (noResultsEl) {
            noResultsEl.hidden = !(visibleSections === 0 && isSearchActive);
            if (isSearchActive && noResultsTermEl) {
                noResultsTermEl.textContent = rawQuery.trim();
            }
        }

        syncFaqToggleButton();

        if (notify) {
            writeUrlIfEnabled();
            options.onChange?.({
                topic: activeTopic,
                query: rawQuery.trim(),
                visibleSections,
                visibleFaqItems
            });
        }
    }

    /**
     * Filter sections to a topic key (falling back to `allTopic` for unknown keys).
     * @param {string} topic topic key
     */
    function setTopic(topic) {
        const candidate = typeof topic === 'string' ? topic.trim() : '';
        const known = knownTopics();
        activeTopic = candidate && known.has(candidate) ? candidate : allTopic;
        applyFilters(true);
    }

    /**
     * Filter sections and FAQ items by a search query string.
     * @param {string} value search text
     */
    function setQuery(value) {
        rawQuery = typeof value === 'string' ? value : '';
        searchQuery = rawQuery.trim().toLowerCase();
        if (searchInput && searchInput.value !== rawQuery) {
            searchInput.value = rawQuery;
        }
        applyFilters(true);
    }

    /**
     * Reset both search text and active topic filter.
     * @param {{focusSearch?: boolean}} [resetOptions] reset options
     */
    function reset(resetOptions = {}) {
        rawQuery = '';
        searchQuery = '';
        activeTopic = allTopic;
        if (searchInput) {
            searchInput.value = '';
        }
        applyFilters(true);
        if (resetOptions.focusSearch && searchInput) {
            searchInput.focus();
        }
    }

    /**
     * Expand every FAQ item.
     */
    function expandAllFaq() {
        syncFaqControllers();
        for (const item of getFaqItems()) {
            autoExpanded.delete(item);
            setFaqItemExpanded(item, true);
        }
        syncFaqToggleButton();
    }

    /**
     * Collapse every FAQ item.
     */
    function collapseAllFaq() {
        syncFaqControllers();
        for (const item of getFaqItems()) {
            autoExpanded.delete(item);
            setFaqItemExpanded(item, false);
        }
        syncFaqToggleButton();
    }

    /**
     * Toggle all FAQ items between expanded and collapsed.
     */
    function toggleAllFaq() {
        syncFaqControllers();
        const items = getFaqItems();
        const visible = items.filter((item) => !item.hidden);
        const pool = visible.length > 0 ? visible : items;
        const allExpanded = pool.length > 0 && pool.every((item) => isFaqItemExpanded(item));
        if (allExpanded) {
            collapseAllFaq();
        }
        else {
            expandAllFaq();
        }
    }

    /**
     * Apply `?topic=` and `?q=` parameters from a route, query string, URLSearchParams, or object.
     * @param {string|URLSearchParams|{q?: string, topic?: string}} input query source
     */
    function applyQuery(input) {
        const parsed = parseHelpQuery(input);
        const known = knownTopics();
        activeTopic = parsed.topic && known.has(parsed.topic) ? parsed.topic : allTopic;
        rawQuery = parsed.q;
        searchQuery = rawQuery.trim().toLowerCase();
        if (searchInput) {
            searchInput.value = rawQuery;
        }
        applyFilters(true);
    }

    /**
     * Update feedback links (`[data-help-page-feedback-link]`) and addresses (`[data-help-page-feedback-address]`).
     * Merges `patch` into the current feedback configuration.
     * @param {object} [patch] updated feedback fields (`address`, `appName`, `version`, `user`, etc.)
     * @returns {string} the generated `mailto:` URL
     */
    function setFeedback(patch = {}) {
        feedbackConfig = { ...(feedbackConfig || {}), ...patch };
        const mailtoUrl = buildFeedbackMailto(feedbackConfig);
        const address = typeof feedbackConfig.address === 'string' ? feedbackConfig.address.trim() : '';
        for (const link of root.querySelectorAll('[data-help-page-feedback-link]')) {
            if (mailtoUrl) {
                link.setAttribute('href', mailtoUrl);
            }
        }
        if (address) {
            for (const addressEl of root.querySelectorAll('[data-help-page-feedback-address]')) {
                addressEl.setAttribute('href', `mailto:${address}`);
                addressEl.textContent = address;
            }
        }
        return mailtoUrl;
    }

    /**
     * Mount or update parsed releases via `attachReleaseNotes` inside `[data-help-page-release-notes]`.
     * @param {Array<object>} releases parsed releases from `changelog-parser.mjs` or a changelog endpoint
     * @param {object} [extraOptions] additional options for `attachReleaseNotes`
     */
    function setReleases(releases, extraOptions) {
        if (!releaseNotesSlot) {
            return;
        }
        if (extraOptions) {
            releaseNotesOptions = { ...releaseNotesOptions, ...extraOptions };
        }
        if (!releaseNotesController) {
            releaseNotesController = attachReleaseNotes(releaseNotesSlot, {
                ...releaseNotesOptions,
                document: doc,
                releases
            });
        }
        else {
            releaseNotesController.setReleases(releases);
        }
        applyFilters(false);
    }

    /**
     * Re-discover dynamic sections/FAQs and re-apply the current filters.
     */
    function refresh() {
        applyFilters(false);
    }

    // Ensure detached roots attach collapsible.js before the first user click or beforematch once connected.
    const onCaptureActivate = () => {
        syncFaqControllers();
    };
    root.addEventListener('click', onCaptureActivate, true);
    root.addEventListener('beforematch', onCaptureActivate, true);
    cleanups.push(() => {
        root.removeEventListener('click', onCaptureActivate, true);
        root.removeEventListener('beforematch', onCaptureActivate, true);
    });

    // Wire event listeners with delegation on topic chips so dynamically refreshed chips still work.
    const onRootClick = (event) => {
        const target = event.target?.closest?.('[data-help-page-topic]');
        if (target && root.contains(target)) {
            setTopic(target.dataset.helpPageTopic);
        }
    };
    root.addEventListener('click', onRootClick);
    cleanups.push(() => root.removeEventListener('click', onRootClick));

    if (searchInput) {
        const onInput = (event) => setQuery(event.target.value);
        searchInput.addEventListener('input', onInput);
        cleanups.push(() => searchInput.removeEventListener('input', onInput));
    }

    if (searchClear) {
        const onClear = () => {
            setQuery('');
            searchInput?.focus();
        };
        searchClear.addEventListener('click', onClear);
        cleanups.push(() => searchClear.removeEventListener('click', onClear));
    }

    if (resetButton) {
        const onReset = () => reset({ focusSearch: true });
        resetButton.addEventListener('click', onReset);
        cleanups.push(() => resetButton.removeEventListener('click', onReset));
    }

    if (faqToggleAll) {
        const onToggleAll = () => toggleAllFaq();
        faqToggleAll.addEventListener('click', onToggleAll);
        cleanups.push(() => faqToggleAll.removeEventListener('click', onToggleAll));
    }

    if (releaseNotesSlot) {
        const onReleaseNotesClick = () => {
            if (searchQuery) {
                applyFilters(false);
            }
        };
        releaseNotesSlot.addEventListener('click', onReleaseNotesClick);
        cleanups.push(() => releaseNotesSlot.removeEventListener('click', onReleaseNotesClick));
    }

    // Initialize nested collapsibles, feedback links, release notes, and initial query parameters.
    syncFaqControllers();
    if (feedbackConfig) {
        setFeedback(feedbackConfig);
    }
    if (Array.isArray(options.releases)) {
        setReleases(options.releases);
    }

    const explicitQuery = options.route !== undefined ? options.route : options.query;
    if (explicitQuery !== undefined) {
        const parsed = parseHelpQuery(explicitQuery);
        const known = knownTopics();
        if (parsed.topic && known.has(parsed.topic)) {
            activeTopic = parsed.topic;
        }
        if (parsed.q) {
            rawQuery = parsed.q;
            searchQuery = rawQuery.trim().toLowerCase();
            if (searchInput) {
                searchInput.value = rawQuery;
            }
        }
    }
    else if (options.readLocation !== false && win?.location) {
        const locQuery = win.location.search || (win.location.hash && win.location.hash.includes('?') ? win.location.hash : '');
        if (locQuery) {
            const parsed = parseHelpQuery(locQuery);
            const known = knownTopics();
            if (parsed.topic && known.has(parsed.topic)) {
                activeTopic = parsed.topic;
            }
            if (parsed.q) {
                rawQuery = parsed.q;
                searchQuery = rawQuery.trim().toLowerCase();
                if (searchInput) {
                    searchInput.value = rawQuery;
                }
            }
        }
    }

    applyFilters(false);

    /**
     * Remove all listeners and destroy nested collapsible and release-notes controllers.
     */
    function destroy() {
        if (destroyed) {
            return;
        }
        destroyed = true;
        for (const cleanup of cleanups.splice(0)) {
            cleanup();
        }
        for (const controller of faqControllers.values()) {
            controller.destroy();
        }
        faqControllers.clear();
        autoExpanded.clear();
        releaseNotesController?.destroy();
        releaseNotesController = null;
    }

    return {
        element: root,
        setTopic,
        getTopic: () => activeTopic,
        setQuery,
        getQuery: () => rawQuery.trim(),
        reset,
        applyQuery,
        getQueryString: () => formatHelpQuery({ topic: activeTopic, q: rawQuery }, allTopic),
        expandAllFaq,
        collapseAllFaq,
        toggleAllFaq,
        setFeedback,
        setReleases,
        refresh,
        destroy
    };
}

/**
 * Build a `.help-page` DOM skeleton from configuration and attach help page behavior to it.
 * All text options are inserted via `textContent`; DOM nodes may be passed in section `content` or FAQ `answer`.
 * @param {Document} doc document that creates the elements
 * @param {object} [options] skeleton and behavior options
 * @param {string} [options.idPrefix] unique prefix for generated element IDs
 * @param {{title: string, text?: string, headingLevel?: number}} [options.header] optional `.view-header`
 * @param {Array<{key: string, label: string}>} [options.topics] topic filter chips
 * @param {Array<object>} [options.sections] section card definitions
 * @param {{clear?: string, chevron?: string, empty?: string}} [options.icons] icon names without `icon-` prefix
 * @param {object} [options.labels] customizable UI labels
 * @returns {object} controller returned by `attachHelpPage`, with `.element`
 */
export function createHelpPage(doc, options = {}) {
    instances += 1;
    const idPrefix = options.idPrefix || `help-page-${instances}`;
    const allTopic = typeof options.allTopic === 'string' && options.allTopic ? options.allTopic : DEFAULT_ALL_TOPIC;
    const labels = { ...DEFAULT_LABELS, ...(options.labels || {}) };
    const icons = { ...DEFAULT_ICONS, ...(options.icons || {}) };

    const root = doc.createElement('div');
    root.className = 'help-page';
    root.setAttribute('data-help-page', '');

    if (options.header && options.header.title) {
        const header = doc.createElement('header');
        header.className = 'view-header';
        const level = Math.min(6, Math.max(1, Number(options.header.headingLevel) || 1));
        const heading = doc.createElement(`h${level}`);
        heading.className = 'view-header__title';
        heading.textContent = options.header.title;
        header.append(heading);
        if (options.header.text) {
            const text = doc.createElement('p');
            text.className = 'view-header__text';
            text.textContent = options.header.text;
            header.append(text);
        }
        root.append(header);
    }

    // Search + topic chips toolbar.
    const toolbar = doc.createElement('div');
    toolbar.className = 'help-page__toolbar';

    const searchField = doc.createElement('div');
    searchField.className = 'field help-page__search';
    const searchId = `${idPrefix}-search`;
    const searchLabel = doc.createElement('label');
    searchLabel.className = 'field__label';
    searchLabel.setAttribute('for', searchId);
    searchLabel.textContent = labels.search;

    const searchRow = doc.createElement('div');
    searchRow.className = 'help-page__search-row';
    const searchInput = doc.createElement('input');
    searchInput.className = 'field__control help-page__search-control';
    searchInput.id = searchId;
    searchInput.type = 'search';
    searchInput.setAttribute('autocomplete', 'off');
    searchInput.placeholder = labels.searchPlaceholder;
    searchInput.setAttribute('data-help-page-search', '');

    const clearButton = doc.createElement('button');
    clearButton.className = 'icon-button help-page__search-clear';
    clearButton.type = 'button';
    clearButton.setAttribute('aria-label', labels.clearSearch);
    clearButton.title = labels.clearSearch;
    clearButton.setAttribute('data-help-page-search-clear', '');
    clearButton.hidden = true;
    clearButton.append(createIcon(doc, icons.clear));

    searchRow.append(searchInput, clearButton);
    searchField.append(searchLabel, searchRow);
    toolbar.append(searchField);

    const topics = Array.isArray(options.topics) ? options.topics : [];
    if (topics.length > 0) {
        const filters = doc.createElement('div');
        filters.className = 'help-page__filters';
        filters.setAttribute('role', 'group');
        filters.setAttribute('aria-label', labels.topicGroup);
        filters.setAttribute('data-help-page-filters', '');
        for (const topic of topics) {
            const chip = doc.createElement('button');
            chip.className = 'chip chip--filter';
            chip.type = 'button';
            chip.setAttribute('aria-pressed', String(topic.key === allTopic));
            chip.setAttribute('data-help-page-topic', topic.key);
            chip.textContent = topic.label;
            filters.append(chip);
        }
        toolbar.append(filters);
    }
    root.append(toolbar);

    // No-results empty state.
    const emptyState = doc.createElement('div');
    emptyState.className = 'empty-state help-page__no-results';
    emptyState.setAttribute('data-help-page-no-results', '');
    emptyState.hidden = true;
    emptyState.append(createIcon(doc, icons.empty, { size: 'lg' }));

    const emptyTitle = doc.createElement('h2');
    emptyTitle.className = 'empty-state__title';
    emptyTitle.textContent = labels.noResultsTitle;
    const emptyText = doc.createElement('p');
    emptyText.className = 'empty-state__text';
    emptyText.setAttribute('role', 'status');
    emptyText.setAttribute('aria-live', 'polite');
    const emptyTerm = doc.createElement('span');
    emptyTerm.setAttribute('data-help-page-no-results-term', '');
    emptyText.append(doc.createTextNode(labels.noResultsPrefix), emptyTerm, doc.createTextNode(labels.noResultsSuffix));

    const emptyActions = doc.createElement('div');
    emptyActions.className = 'empty-state__actions';
    const resetBtn = doc.createElement('button');
    resetBtn.className = 'button button--secondary';
    resetBtn.type = 'button';
    resetBtn.setAttribute('data-help-page-reset', '');
    resetBtn.textContent = labels.resetSearch;
    emptyActions.append(resetBtn);
    emptyState.append(emptyTitle, emptyText, emptyActions);
    root.append(emptyState);

    // Section cards.
    const sections = Array.isArray(options.sections) ? options.sections : [];
    const feedbackMailto = options.feedback ? buildFeedbackMailto(options.feedback) : '';
    let faqCounter = 0;

    for (let index = 0; index < sections.length; index++) {
        const spec = sections[index];
        const key = spec.id || `section-${index + 1}`;
        const section = doc.createElement('section');
        section.className = 'card help-page__section';
        section.setAttribute('data-help-page-section', '');
        const topicList = Array.isArray(spec.topics) ? spec.topics.join(' ') : (spec.topics || '');
        section.setAttribute('data-help-page-topics', topicList);
        if (spec.tags) {
            section.setAttribute('data-help-page-tags', Array.isArray(spec.tags) ? spec.tags.join(' ') : spec.tags);
        }

        const titleId = `${idPrefix}-${key}-title`;
        section.setAttribute('aria-labelledby', titleId);
        const title = doc.createElement('h2');
        title.className = 'card__title';
        title.id = titleId;
        title.textContent = spec.title || '';
        section.append(title);

        appendContent(doc, section, spec.content);

        if (spec.feedback) {
            const actions = doc.createElement('div');
            actions.className = 'help-page__actions';
            const link = doc.createElement('a');
            link.className = 'button button--secondary';
            link.setAttribute('data-help-page-feedback-link', '');
            if (feedbackMailto) {
                link.setAttribute('href', feedbackMailto);
            }
            link.textContent = spec.feedback.label || 'Send Feedback';
            actions.append(link);
            section.append(actions);
        }

        if (spec.faq && Array.isArray(spec.faq.items)) {
            const faqActions = doc.createElement('div');
            faqActions.className = 'help-page__actions';
            const toggleAll = doc.createElement('button');
            toggleAll.className = 'button button--quiet help-page__faq-toggle';
            toggleAll.type = 'button';
            toggleAll.setAttribute('data-help-page-faq-toggle', '');
            toggleAll.setAttribute('aria-expanded', 'false');
            toggleAll.textContent = spec.faq.expandAllLabel || labels.expandAll;
            faqActions.append(toggleAll);
            section.append(faqActions);

            const faqList = doc.createElement('div');
            faqList.className = 'help-page__faq-list';
            faqList.setAttribute('data-help-page-faq-list', '');

            for (const item of spec.faq.items) {
                faqCounter += 1;
                const panelId = `${idPrefix}-faq-${item.id || faqCounter}`;
                const wrapper = doc.createElement('div');
                wrapper.className = 'collapsible help-page__faq';
                wrapper.setAttribute('data-help-page-faq-item', '');
                if (item.tags) {
                    wrapper.setAttribute('data-help-page-tags', Array.isArray(item.tags) ? item.tags.join(' ') : item.tags);
                }

                const toggle = doc.createElement('button');
                toggle.className = 'collapsible__toggle help-page__faq-question';
                toggle.type = 'button';
                toggle.setAttribute('aria-expanded', 'false');
                toggle.setAttribute('aria-controls', panelId);

                const questionSpan = doc.createElement('span');
                questionSpan.className = 'help-page__faq-question-text';
                questionSpan.textContent = item.question || '';
                toggle.append(questionSpan, createIcon(doc, icons.chevron, { className: 'collapsible__icon' }));

                const panel = doc.createElement('div');
                panel.className = 'collapsible__panel';
                panel.id = panelId;
                panel.setAttribute('hidden', 'until-found');
                appendContent(doc, panel, item.answer);

                wrapper.append(toggle, panel);
                faqList.append(wrapper);
            }
            section.append(faqList);
        }

        if (Array.isArray(spec.links) && spec.links.length > 0) {
            const ul = doc.createElement('ul');
            ul.className = 'help-page__links';
            ul.setAttribute('role', 'list');
            for (const entry of spec.links) {
                const li = doc.createElement('li');
                const card = doc.createElement('a');
                card.className = 'card help-page__link';
                card.setAttribute('href', entry.href || '#');
                if (entry.action) {
                    card.setAttribute('data-action', entry.action);
                }
                const body = doc.createElement('span');
                body.className = 'card__body';
                const linkTitle = doc.createElement('span');
                linkTitle.className = 'card__title';
                linkTitle.textContent = entry.title || '';
                body.append(linkTitle);
                if (entry.text) {
                    const linkText = doc.createElement('span');
                    linkText.className = 'card__text';
                    linkText.textContent = entry.text;
                    body.append(linkText);
                }
                card.append(body);
                li.append(card);
                ul.append(li);
            }
            section.append(ul);
        }

        if (spec.releaseNotes) {
            const slot = doc.createElement('div');
            slot.className = 'release-notes';
            slot.setAttribute('data-help-page-release-notes', '');
            section.append(slot);
        }

        root.append(section);
    }

    return attachHelpPage(root, { ...options, document: doc });
}
