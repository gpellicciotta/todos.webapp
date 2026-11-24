/**
 * Release notes renderer for parsed changelog releases (ADR-0003).
 *
 * Accepts plain release objects from any changelog parser or JSON endpoint, with no external parser dependency.
 * All text is inserted as DOM text nodes; only inline backtick spans
 * become `<code>`, and Markdown links outside code spans show as their label.
 *
 * Collapsibles reuse `collapsible.js`; chips, badges, and buttons reuse the catalog markup and variants.
 * Hooks use `data-release-notes-*` attributes and native/ARIA state, never style classes.
 */

import { attachCollapsible } from './collapsible.js';
import { createIcon } from './icon.js';

const AREA_PATTERN = /^([A-Za-z0-9_-]+):\s*(.+)$/;
const BREAKING_PATTERN = /\*{0,2}\[breaking\]\*{0,2}/gi;
const DATE_PATTERN = /\b\d{4}-\d{2}-\d{2}\b/;
const LINK_PATTERN = /\[([^\]]+)\]\([^)\s]*\)/g;

const KNOWN_STATUSES = new Set(['released', 'frozen', 'in-development', 'broken']);

const DEFAULT_CATEGORY_LABELS = {
    feature: 'Feature',
    ux: 'UX',
    fix: 'Fix',
    client: 'Client',
    internal: 'Internal'
};

const DEFAULT_STATUS_LABELS = {
    released: 'Released',
    frozen: 'Frozen',
    'in-development': 'In development',
    broken: 'Broken'
};

const DEFAULT_ICONS = {
    chevron: 'chevron-down',
    released: 'check',
    frozen: 'more',
    'in-development': 'refresh',
    broken: 'alert'
};

const DEFAULT_LABELS = {
    filterGroup: 'Changes to show',
    filterUser: 'User Highlights',
    filterAll: 'All Changes',
    latest: 'Latest',
    breaking: 'Breaking',
    empty: 'No release notes available.',
    emptyEntries: 'No entries.',
    noDate: 'No release date',
    otherArea: 'Other',
    showOlder: (count) => `Show ${count} older ${count === 1 ? 'release' : 'releases'}`
};

let instances = 0;

/**
 * Capitalize the first character of a label.
 * @param {string} text raw label
 * @returns {string} capitalized label
 */
function capitalize(text) {
    return text ? text.charAt(0).toUpperCase() + text.slice(1) : '';
}

/**
 * Strip Markdown links `[label](target)` down to their plain label text.
 * @param {string} text plain segment outside code spans
 * @returns {string} segment with links flattened to their label
 */
function stripLinks(text) {
    return text.replace(LINK_PATTERN, '$1');
}

/**
 * Parse inline Markdown into plain text and inline code tokens.
 * Backtick spans become `{ type: 'code', value }`; Markdown links outside code spans show as their label.
 * Unclosed or empty backticks stay plain text.
 * @param {string} text raw entry text
 * @returns {Array<{type: 'text'|'code', value: string}>} ordered tokens
 */
export function parseInlineMarkdown(text) {
    if (typeof text !== 'string' || !text) {
        return [];
    }
    const tokens = [];
    const pushText = (value) => {
        if (!value) {
            return;
        }
        const previous = tokens.at(-1);
        if (previous && previous.type === 'text') {
            previous.value += value;
        }
        else {
            tokens.push({ type: 'text', value });
        }
    };

    let rest = text;
    while (rest.length > 0) {
        const open = rest.indexOf('`');
        if (open < 0) {
            pushText(stripLinks(rest));
            break;
        }
        const close = rest.indexOf('`', open + 1);
        if (close < 0) {
            pushText(stripLinks(rest));
            break;
        }
        if (close === open + 1) {
            pushText(stripLinks(rest.slice(0, open)) + '``');
            rest = rest.slice(close + 1);
            continue;
        }
        pushText(stripLinks(rest.slice(0, open)));
        tokens.push({ type: 'code', value: rest.slice(open + 1, close) });
        rest = rest.slice(close + 1);
    }
    return tokens;
}

/**
 * Normalize a parsed changelog release (or server release record) for display.
 * @param {object} release plain release object
 * @param {object} [options] normalization options
 * @param {string} [options.otherArea='Other'] fallback area name when an entry carries no area prefix
 * @returns {{version: string, status: 'released'|'frozen'|'in-development'|'broken', date: string|null,
 *   tag: string, isLatest: boolean, entries: object[], groups: Array<[string, object[]]>}}
 *   normalized release descriptor
 */
export function describeRelease(release, { otherArea = 'Other' } = {}) {
    const rawVersion = String(release?.version ?? '');
    const version = release?.isPreRelease && !/-pre$/i.test(rawVersion) ? `${rawVersion}-pre` : rawVersion;
    const tag = String(release?.tag ?? '');
    const tags = tag.split(/\s*•\s*/).filter(Boolean);
    const releasedTag = tags.find((part) => /^released:/i.test(part));

    let status = 'released';
    if (KNOWN_STATUSES.has(release?.status)) {
        status = release.status;
    }
    else if (release?.isPreRelease) {
        status = 'in-development';
    }
    else if (tags.some((part) => /^broken$/i.test(part))) {
        status = 'broken';
    }
    else if (!releasedTag && tags.some((part) => DATE_PATTERN.test(part))) {
        status = 'frozen';
    }
    else if (tags.some((part) => /^in[- ]development$/i.test(part))) {
        status = 'in-development';
    }

    let date = null;
    if (release?.date !== undefined) {
        date = release.date || null;
    }
    else {
        const dated = releasedTag ?? tags.find((part) => DATE_PATTERN.test(part));
        date = dated?.match(DATE_PATTERN)?.[0] ?? null;
    }

    const groups = new Map();
    const entries = [];
    for (const raw of release?.entries ?? []) {
        let area;
        let text;
        if (typeof raw?.rawText === 'string' && raw.rawText.trim()) {
            const match = raw.rawText.replace(BREAKING_PATTERN, '').trim().match(AREA_PATTERN);
            area = raw.area ?? (match ? match[1] : otherArea);
            text = typeof raw.text === 'string' ? raw.text : (match ? match[2].trim() : raw.rawText.trim());
        }
        else {
            area = raw?.area ?? raw?.category ?? otherArea;
            text = String(raw?.text ?? '');
        }
        const entry = {
            area,
            text,
            category: String(raw?.category ?? 'feature').toLowerCase(),
            isUserFacing: raw?.isUserFacing !== false,
            isBreaking: Boolean(raw?.isBreaking ?? raw?.breaking)
        };
        entries.push(entry);
        const list = groups.get(area) ?? [];
        list.push(entry);
        groups.set(area, list);
    }

    return {
        version,
        status,
        date,
        tag,
        isLatest: Boolean(release?.isLatest),
        entries,
        groups: [...groups]
    };
}

/**
 * Append inline Markdown tokens to a container element using safe DOM text and `<code>` nodes.
 * @param {Document} doc owner document
 * @param {HTMLElement} target element receiving the nodes
 * @param {string} text entry text
 */
function appendInlineMarkdown(doc, target, text) {
    for (const token of parseInlineMarkdown(text)) {
        if (token.type === 'code') {
            const code = doc.createElement('code');
            code.textContent = token.value;
            target.append(code);
        }
        else {
            target.append(doc.createTextNode(token.value));
        }
    }
}

/**
 * Format a release version for heading display (`v` prefix for numeric versions).
 * @param {string} version normalized version string
 * @returns {string} display version
 */
function displayVersion(version) {
    return /^\d/.test(version) ? `v${version}` : version;
}

/**
 * Group normalized entries by area in order of first appearance.
 * @param {object[]} entries normalized entries
 * @returns {Array<[string, object[]]>} ordered area groups
 */
function groupEntries(entries) {
    const groups = new Map();
    for (const entry of entries) {
        const list = groups.get(entry.area) ?? [];
        list.push(entry);
        groups.set(entry.area, list);
    }
    return [...groups];
}

/**
 * Enhance a `.release-notes` element to render parsed changelog releases.
 * @param {HTMLElement} root `.release-notes` container element
 * @param {object} [options] renderer options
 * @param {object[]} [options.releases=[]] plain release objects, newest first
 * @param {'user'|'all'} [options.filter] initial filter mode (`'user'` when `showFilter` is true, else `'all'`)
 * @param {boolean} [options.showFilter=true] show the User Highlights / All Changes filter chips
 * @param {boolean} [options.groupByArea=false] group entries by area heading instead of flat category rows
 * @param {boolean} [options.showCategoryBadges] show category badges on each entry (defaults to `!groupByArea`)
 * @param {boolean} [options.showStatus=false] show release status chips and dates
 * @param {boolean} [options.showLatest=true] show the Latest badge on releases marked `isLatest`
 * @param {boolean} [options.collapsible=true] render each release as a collapsible using `collapsible.js`
 * @param {boolean} [options.openFirst=true] expand the first visible release when `collapsible` is true
 * @param {number} [options.pageSize=Infinity] number of releases shown per page
 * @param {string} [options.idPrefix] unique prefix for generated `id` and `aria-controls` attributes
 * @param {Record<string, string>} [options.categoryLabels] custom labels per category key
 * @param {Record<string, string>} [options.statusLabels] custom labels per status key
 * @param {Partial<typeof DEFAULT_LABELS>} [options.labels] localized UI strings
 * @param {Partial<typeof DEFAULT_ICONS>} [options.icons] glyph names from the active look sprite (`null` omits an icon)
 * @param {(mode: 'user'|'all') => void} [options.onFilterChange] called when the filter mode changes
 * @returns {{element: HTMLElement, setReleases: (next: object[]) => void, setFilter: (mode: 'user'|'all') => void,
 *   getFilter: () => 'user'|'all', showMore: () => void, expandAll: () => void, collapseAll: () => void, destroy: () => void}}
 *   the controller
 */
export function attachReleaseNotes(root, options = {}) {
    const doc = root.ownerDocument;
    const {
        releases: initialReleases = [],
        showFilter = true,
        groupByArea = false,
        showCategoryBadges = !groupByArea,
        showStatus = false,
        showLatest = true,
        collapsible = true,
        openFirst = true,
        pageSize = Infinity,
        idPrefix = `release-notes-${++instances}`,
        categoryLabels = {},
        statusLabels = {},
        labels: customLabels = {},
        icons: customIcons = {},
        onFilterChange
    } = options;

    const labels = { ...DEFAULT_LABELS, ...customLabels };
    const categories = { ...DEFAULT_CATEGORY_LABELS, ...categoryLabels };
    const statuses = { ...DEFAULT_STATUS_LABELS, ...statusLabels };
    const icons = { ...DEFAULT_ICONS, ...customIcons };
    const step = Number.isFinite(pageSize) && pageSize > 0 ? Math.floor(pageSize) : Infinity;

    let releases = [...initialReleases];
    let filterMode = options.filter === 'all' || options.filter === 'user'
        ? options.filter
        : (showFilter ? 'user' : 'all');
    let shown = step;
    let collapsibleControllers = [];
    let pendingAttach = false;
    let destroyed = false;

    const filterListeners = [];
    let moreButton = null;
    let onMoreClick = null;

    let filterBar = root.querySelector(':scope > [data-release-notes-filters]');
    let listEl = root.querySelector(':scope > [data-release-notes-list]');
    let actionsEl = root.querySelector(':scope > [data-release-notes-actions]');

    if (showFilter && !filterBar) {
        filterBar = doc.createElement('div');
        filterBar.className = 'release-notes__filters';
        filterBar.setAttribute('role', 'group');
        filterBar.setAttribute('aria-label', labels.filterGroup);
        filterBar.setAttribute('data-release-notes-filters', '');

        for (const [mode, label] of [['user', labels.filterUser], ['all', labels.filterAll]]) {
            const chip = doc.createElement('button');
            chip.className = 'chip chip--filter';
            chip.type = 'button';
            chip.setAttribute('data-release-notes-filter', mode);
            chip.setAttribute('aria-pressed', String(mode === filterMode));
            chip.textContent = label;
            filterBar.append(chip);
        }
        root.prepend(filterBar);
    }

    if (!listEl) {
        listEl = doc.createElement('div');
        listEl.className = 'release-notes__list';
        listEl.setAttribute('data-release-notes-list', '');
        root.append(listEl);
    }

    /** Destroy attached collapsible controllers before re-rendering or tearing down. */
    function destroyCollapsibles() {
        for (const controller of collapsibleControllers) {
            controller.destroy();
        }
        collapsibleControllers = [];
        pendingAttach = false;
    }

    /** Detach the current Show older button listener. */
    function clearMoreButton() {
        if (moreButton && onMoreClick) {
            moreButton.removeEventListener('click', onMoreClick);
        }
        moreButton = null;
        onMoreClick = null;
    }

    /** Attach `collapsible.js` to every rendered collapsible once the root is connected to the document. */
    function ensureCollapsiblesAttached() {
        if (!collapsible || !pendingAttach || !root.isConnected) {
            return;
        }
        const items = [...listEl.querySelectorAll(':scope > [data-release-notes-release]')];
        collapsibleControllers = items.map((item) => attachCollapsible(item));
        pendingAttach = false;
    }

    const onCaptureActivate = () => {
        ensureCollapsiblesAttached();
    };
    root.addEventListener('click', onCaptureActivate, true);
    root.addEventListener('beforematch', onCaptureActivate, true);

    /** Synchronize `aria-pressed` on filter chips with `filterMode`. */
    function syncFilterChips() {
        if (!filterBar) {
            return;
        }
        for (const chip of filterBar.querySelectorAll('[data-release-notes-filter]')) {
            chip.setAttribute('aria-pressed', String(chip.getAttribute('data-release-notes-filter') === filterMode));
        }
    }

    /**
     * Build a release status chip using catalog status chip variants and core sprite icons.
     * @param {'released'|'frozen'|'in-development'|'broken'} status release status
     * @returns {HTMLSpanElement} the status chip
     */
    function buildStatusChip(status) {
        const chip = doc.createElement('span');
        chip.className = status === 'broken' ? 'chip chip--status chip--danger' : 'chip chip--status';
        chip.setAttribute('data-release-notes-status', status);
        const iconName = icons[status];
        if (iconName) {
            chip.append(createIcon(doc, iconName));
        }
        chip.append(doc.createTextNode(statuses[status] ?? capitalize(status)));
        return chip;
    }

    /**
     * Build a single entry list item with optional category and Breaking badges plus safe inline Markdown.
     * @param {object} entry normalized entry
     * @returns {HTMLLIElement} the list item
     */
    function buildEntryItem(entry) {
        const li = doc.createElement('li');
        li.className = 'release-notes__entry';

        const needCategory = showCategoryBadges;
        const needBreaking = entry.isBreaking;
        if (needCategory || needBreaking) {
            const badges = doc.createElement('span');
            badges.className = 'release-notes__badges';
            if (needCategory) {
                const badge = doc.createElement('span');
                badge.className = 'badge';
                badge.setAttribute('data-release-notes-category', entry.category);
                badge.textContent = categories[entry.category] ?? capitalize(entry.category);
                badges.append(badge);
            }
            if (needBreaking) {
                const badge = doc.createElement('span');
                badge.className = 'badge badge--danger';
                badge.setAttribute('data-release-notes-breaking', '');
                badge.textContent = labels.breaking;
                badges.append(badge);
            }
            li.append(badges);
        }

        const textEl = doc.createElement('span');
        textEl.className = 'release-notes__text';
        appendInlineMarkdown(doc, textEl, entry.text);
        li.append(textEl);
        return li;
    }

    /**
     * Build the entry body of a release (flat list or grouped by area).
     * @param {object[]} entries filtered entries for this release
     * @returns {HTMLElement[]} child elements for the release panel
     */
    function buildReleaseBody(entries) {
        if (entries.length === 0) {
            const empty = doc.createElement('p');
            empty.className = 'release-notes__empty';
            empty.setAttribute('data-release-notes-empty', '');
            empty.textContent = labels.emptyEntries;
            return [empty];
        }
        if (groupByArea) {
            return groupEntries(entries).map(([area, items]) => {
                const group = doc.createElement('div');
                group.className = 'release-notes__group';
                group.setAttribute('data-release-notes-area', area);

                const heading = doc.createElement('h3');
                heading.className = 'release-notes__area';
                heading.textContent = area;
                group.append(heading);

                const ul = doc.createElement('ul');
                ul.className = 'release-notes__entries';
                ul.setAttribute('role', 'list');
                for (const entry of items) {
                    ul.append(buildEntryItem(entry));
                }
                group.append(ul);
                return group;
            });
        }
        const ul = doc.createElement('ul');
        ul.className = 'release-notes__entries';
        ul.setAttribute('role', 'list');
        for (const entry of entries) {
            ul.append(buildEntryItem(entry));
        }
        return [ul];
    }

    /**
     * Populate header metadata (version, optional status chip, date or tag, optional Latest badge).
     * @param {HTMLElement} header target toggle button or header row
     * @param {ReturnType<typeof describeRelease>} desc normalized release
     * @param {string|null} headingId heading id for non-collapsible sections
     */
    function appendHeaderParts(header, desc, headingId) {
        const versionEl = doc.createElement(headingId ? 'h2' : 'span');
        versionEl.className = 'release-notes__version';
        if (headingId) {
            versionEl.id = headingId;
        }
        versionEl.textContent = displayVersion(desc.version);
        header.append(versionEl);

        if (showStatus) {
            header.append(buildStatusChip(desc.status));
            const dateEl = doc.createElement('span');
            dateEl.className = 'release-notes__tag';
            dateEl.textContent = desc.date ?? labels.noDate;
            header.append(dateEl);
        }
        else if (desc.tag) {
            const tagEl = doc.createElement('span');
            tagEl.className = 'release-notes__tag';
            tagEl.textContent = desc.tag;
            header.append(tagEl);
        }

        if (showLatest && desc.isLatest) {
            const latest = doc.createElement('span');
            latest.className = 'badge badge--success';
            latest.setAttribute('data-release-notes-latest', '');
            latest.textContent = labels.latest;
            header.append(latest);
        }
    }

    /**
     * Build one release element (collapsible or open section).
     * @param {ReturnType<typeof describeRelease>} desc normalized release
     * @param {object[]} entries filtered entries for this release
     * @param {number} index zero-based index among visible releases
     * @returns {HTMLElement} the release block
     */
    function buildReleaseElement(desc, entries, index) {
        const number = index + 1;
        const bodyNodes = buildReleaseBody(entries);

        if (collapsible) {
            const open = openFirst && index === 0;
            const panelId = `${idPrefix}-panel-${number}`;
            const wrapper = doc.createElement('div');
            wrapper.className = 'collapsible release-notes__release';
            wrapper.setAttribute('data-release-notes-release', '');

            const toggle = doc.createElement('button');
            toggle.className = 'collapsible__toggle release-notes__toggle';
            toggle.type = 'button';
            toggle.setAttribute('aria-expanded', String(open));
            toggle.setAttribute('aria-controls', panelId);
            appendHeaderParts(toggle, desc, null);
            if (icons.chevron) {
                toggle.append(createIcon(doc, icons.chevron, { className: 'collapsible__icon' }));
            }

            const panel = doc.createElement('div');
            panel.className = 'collapsible__panel release-notes__panel';
            panel.id = panelId;
            panel.setAttribute('data-release-notes-panel', '');
            if (!open) {
                panel.setAttribute('hidden', 'until-found');
            }
            panel.append(...bodyNodes);

            wrapper.append(toggle, panel);
            return wrapper;
        }

        const headingId = `${idPrefix}-heading-${number}`;
        const section = doc.createElement('section');
        section.className = 'release-notes__release release-notes__release--open';
        section.setAttribute('data-release-notes-release', '');
        section.setAttribute('aria-labelledby', headingId);

        const head = doc.createElement('div');
        head.className = 'release-notes__head';
        appendHeaderParts(head, desc, headingId);

        const panel = doc.createElement('div');
        panel.className = 'release-notes__panel';
        panel.append(...bodyNodes);

        section.append(head, panel);
        return section;
    }

    /** Render the releases list and paging button for the current state. */
    function render() {
        destroyCollapsibles();
        clearMoreButton();
        syncFilterChips();

        const showAll = filterMode === 'all';
        const visible = [];
        for (const release of releases) {
            const desc = describeRelease(release, { otherArea: labels.otherArea });
            const entries = showAll ? desc.entries : desc.entries.filter((entry) => entry.isUserFacing);
            if (!showAll && entries.length === 0) {
                continue;
            }
            visible.push({ desc, entries });
        }

        listEl.replaceChildren();
        if (visible.length === 0) {
            const empty = doc.createElement('p');
            empty.className = 'release-notes__empty';
            empty.setAttribute('data-release-notes-empty', '');
            empty.textContent = labels.empty;
            listEl.append(empty);
            actionsEl?.remove();
            actionsEl = null;
            return;
        }

        const slice = visible.slice(0, shown);
        for (let i = 0; i < slice.length; i++) {
            listEl.append(buildReleaseElement(slice[i].desc, slice[i].entries, i));
        }

        if (collapsible) {
            pendingAttach = true;
            ensureCollapsiblesAttached();
        }

        const remaining = visible.length - slice.length;
        if (remaining > 0) {
            if (!actionsEl) {
                actionsEl = doc.createElement('div');
                actionsEl.className = 'release-notes__actions';
                actionsEl.setAttribute('data-release-notes-actions', '');
                root.append(actionsEl);
            }
            const nextCount = Math.min(step, remaining);
            moreButton = doc.createElement('button');
            moreButton.className = 'button button--quiet';
            moreButton.type = 'button';
            moreButton.setAttribute('data-release-notes-more', '');
            moreButton.textContent = labels.showOlder(nextCount, remaining);
            onMoreClick = () => {
                const previousCount = slice.length;
                showMore();
                if (moreButton) {
                    moreButton.focus();
                }
                else {
                    const revealed = listEl.querySelectorAll(':scope > [data-release-notes-release]')[previousCount];
                    revealed?.querySelector('button[aria-controls]')?.focus();
                }
            };
            moreButton.addEventListener('click', onMoreClick);
            actionsEl.replaceChildren(moreButton);
        }
        else if (actionsEl) {
            actionsEl.remove();
            actionsEl = null;
        }
    }

    /**
     * Switch between `'user'` highlights and `'all'` changes.
     * @param {'user'|'all'} mode filter mode
     */
    function setFilter(mode) {
        if (destroyed || (mode !== 'user' && mode !== 'all') || mode === filterMode) {
            return;
        }
        filterMode = mode;
        shown = step;
        render();
        onFilterChange?.(filterMode);
    }

    /**
     * Replace the displayed releases and reset paging.
     * @param {object[]} next new releases array
     */
    function setReleases(next) {
        if (destroyed) {
            return;
        }
        releases = [...(next ?? [])];
        shown = step;
        render();
    }

    /** Reveal the next page of older releases. */
    function showMore() {
        if (destroyed || !Number.isFinite(step)) {
            return;
        }
        shown += step;
        render();
    }

    /** Expand every rendered release collapsible. */
    function expandAll() {
        if (destroyed || !collapsible) {
            return;
        }
        ensureCollapsiblesAttached();
        if (collapsibleControllers.length > 0) {
            for (const controller of collapsibleControllers) {
                controller.expand();
            }
            return;
        }
        for (const item of listEl.querySelectorAll(':scope > [data-release-notes-release]')) {
            const toggle = item.querySelector(':scope > button[aria-controls]');
            const panel = item.querySelector(':scope > [data-release-notes-panel]');
            toggle?.setAttribute('aria-expanded', 'true');
            panel?.removeAttribute('hidden');
        }
    }

    /** Collapse every rendered release collapsible. */
    function collapseAll() {
        if (destroyed || !collapsible) {
            return;
        }
        ensureCollapsiblesAttached();
        if (collapsibleControllers.length > 0) {
            for (const controller of collapsibleControllers) {
                controller.collapse();
            }
            return;
        }
        for (const item of listEl.querySelectorAll(':scope > [data-release-notes-release]')) {
            const toggle = item.querySelector(':scope > button[aria-controls]');
            const panel = item.querySelector(':scope > [data-release-notes-panel]');
            toggle?.setAttribute('aria-expanded', 'false');
            panel?.setAttribute('hidden', 'until-found');
        }
    }

    /** Remove all listeners and destroy nested collapsible controllers. */
    function destroy() {
        if (destroyed) {
            return;
        }
        destroyed = true;
        destroyCollapsibles();
        clearMoreButton();
        root.removeEventListener('click', onCaptureActivate, true);
        root.removeEventListener('beforematch', onCaptureActivate, true);
        for (const [chip, handler] of filterListeners) {
            chip.removeEventListener('click', handler);
        }
        filterListeners.length = 0;
    }

    if (filterBar) {
        for (const chip of filterBar.querySelectorAll('[data-release-notes-filter]')) {
            const handler = () => setFilter(chip.getAttribute('data-release-notes-filter'));
            chip.addEventListener('click', handler);
            filterListeners.push([chip, handler]);
        }
    }

    render();

    return {
        element: root,
        setReleases,
        setFilter,
        getFilter: () => filterMode,
        showMore,
        expandAll,
        collapseAll,
        destroy
    };
}

/**
 * Create a `.release-notes` element and attach the release notes renderer to it.
 * @param {Document} doc document that creates the elements
 * @param {object} [options] renderer options accepted by `attachReleaseNotes`
 * @returns {ReturnType<typeof attachReleaseNotes>} the controller, with `element`
 */
export function createReleaseNotes(doc, options = {}) {
    const root = doc.createElement('div');
    root.className = 'release-notes';
    root.setAttribute('data-release-notes', '');
    return attachReleaseNotes(root, options);
}
