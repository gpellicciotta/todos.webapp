/**
 * App shell navigation toggle (ADR-0004): the hamburger at the start of the top bar.
 *
 * On wide screens, each press cycles the sidebar through open, an icon rail, and hidden.
 * Two-state toggles, from `states: ['open', 'hidden']` or `data-app-nav-states="open hidden"`, skip the rail.
 * Below 64rem, each press opens or closes the sidebar as a drawer under the top bar.
 * State lives in native states and ARIA, which shell.css reads:
 * - the toggle's `aria-expanded` is true while the sidebar is open on wide screens, or while the drawer is open;
 * - the rail is `aria-expanded="false"` on a shown sidebar, and hidden is the sidebar's `hidden` attribute;
 * - the drawer is the sidebar's `auto` popover, so `:popover-open` shows it with a backdrop.
 * The markup's `popovertarget` keeps the drawer working without the script and keeps toggle presses out of light dismiss.
 * The module cancels that native toggle and drives the popover itself, so it can set focus and labels.
 * The toggle's glyph shows what a press does: it swaps the fragment of the toggle's sprite `<use>` reference.
 * In the rail, hovering or focusing a navigation entry shows its clipped label as a tooltip.
 */

import { attachLabelTooltips } from './tooltip.js';

const STATES = ['open', 'rail', 'hidden'];
const TWO_STATES = ['open', 'hidden'];
const WIDE_QUERY = '(width >= 64rem)';
const DEFAULT_LABELS = {
    collapse: 'Collapse navigation',
    hide: 'Hide navigation',
    show: 'Show navigation',
    open: 'Open navigation',
    close: 'Close navigation'
};
const DEFAULT_ICONS = {
    collapse: 'nav-collapse',
    hide: 'nav-hide',
    show: 'nav-menu',
    close: 'nav-close'
};

/**
 * Attach the navigation toggle to the sidebar it controls.
 * @param {HTMLButtonElement} toggle the `app__nav-toggle` button
 * @param {HTMLElement} sidebar the `app__sidebar` navigation, an `auto` popover
 * @param {object} [options] behavior options
 * @param {{matches: boolean, addEventListener: Function, removeEventListener: Function}} [options.media]
 *   the wide layout query, `matchMedia('(width >= 64rem)')` by default
 * @param {'open'|'rail'|'hidden'} [options.state] the first wide state; the markup's state by default
 * @param {string[]} [options.states] the wide states a press cycles through: `['open', 'rail', 'hidden']` by default,
 *   or `['open', 'hidden']`; the toggle's space-separated `data-app-nav-states` attribute sets it in markup
 * @param {{collapse?: string, hide?: string, show?: string, close?: string}} [options.icons]
 *   the sprite glyph names, without the `icon-` prefix, for a press that collapses to the rail, hides, shows, or closes
 * @param {{collapse?: string, hide?: string, show?: string, open?: string, close?: string}} [options.labels]
 *   the toggle's accessible names: wide open, rail, and hidden, then narrow closed and open
 * @param {boolean} [options.tooltips] show the entries' clipped labels as tooltips in the rail, true by default
 * @param {(state: string) => void} [options.onChange] called after a press or `setState` changes the wide state
 * @returns {{state: () => string, setState: (state: string) => void, isDrawerOpen: () => boolean, destroy: () => void}}
 *   the controller
 */
export function attachAppNav(toggle, sidebar, options = {}) {
    const doc = toggle.ownerDocument;
    const media = options.media ?? doc.defaultView.matchMedia(WIDE_QUERY);
    const labels = { ...DEFAULT_LABELS, ...options.labels };
    const icons = { ...DEFAULT_ICONS, ...options.icons };
    const states = resolveStates(options.states ?? toggle.dataset.appNavStates?.trim().split(/\s+/) ?? STATES);
    const { onChange } = options;
    if (!sidebar.hasAttribute('popover')) {
        sidebar.setAttribute('popover', 'auto');
    }
    let state = options.state ?? markupState();
    let drawerOpen = false;
    let returnFocus = true;
    const railTooltips = options.tooltips === false
        ? null
        : attachLabelTooltips(sidebar, { selector: 'a[href], button', placement: 'inline-end', when: () => media.matches && state === 'rail' });

    /**
     * Read the wide state the markup declares.
     * @returns {string} open, rail, or hidden
     */
    function markupState() {
        if (sidebar.hidden) {
            return 'hidden';
        }
        if (toggle.getAttribute('aria-expanded') === 'false') {
            return states.includes('rail') ? 'rail' : 'hidden';
        }
        return 'open';
    }

    /**
     * Point the toggle's sprite reference at a glyph, keeping the sprite path.
     * @param {string} name glyph name without the `icon-` prefix
     */
    function renderGlyph(name) {
        const use = toggle.querySelector('use');
        const href = use?.getAttribute('href');
        if (href?.includes('#')) {
            use.setAttribute('href', `${href.slice(0, href.indexOf('#'))}#icon-${name}`);
        }
    }

    /**
     * Write the current state to the toggle and the sidebar.
     */
    function render() {
        if (media.matches) {
            const step = { open: states.includes('rail') ? 'collapse' : 'close', rail: 'hide', hidden: 'show' }[state];
            sidebar.hidden = state === 'hidden';
            toggle.setAttribute('aria-expanded', String(state === 'open'));
            toggle.setAttribute('aria-label', { collapse: labels.collapse, close: labels.hide, hide: labels.hide, show: labels.show }[step]);
            renderGlyph(icons[step]);
        }
        else {
            sidebar.hidden = false;
            toggle.setAttribute('aria-expanded', String(drawerOpen));
            toggle.setAttribute('aria-label', drawerOpen ? labels.close : labels.open);
            renderGlyph(drawerOpen ? icons.close : icons.show);
        }
    }

    /**
     * Open the drawer and move focus to the current navigation entry, or to the first one.
     */
    function openDrawer() {
        sidebar.hidden = false;
        sidebar.showPopover();
        drawerOpen = true;
        render();
        (sidebar.querySelector('[aria-current="page"]') ?? sidebar.querySelector('a[href], button:not(:disabled)'))?.focus();
    }

    /**
     * Close the drawer.
     * @param {boolean} refocus return focus to the toggle
     */
    function closeDrawer(refocus) {
        if (!drawerOpen) {
            return;
        }
        drawerOpen = false;
        returnFocus = false;
        sidebar.hidePopover();
        render();
        if (refocus) {
            toggle.focus();
        }
    }

    /**
     * Cycle the wide states, or open and close the drawer.
     * @param {MouseEvent} event click event
     */
    function onToggleClick(event) {
        event.preventDefault();
        if (media.matches) {
            setState(states[(states.indexOf(state) + 1) % states.length]);
        }
        else if (drawerOpen) {
            closeDrawer(true);
        }
        else {
            returnFocus = true;
            openDrawer();
        }
    }

    /**
     * Follow a close by the platform, such as a light dismiss, returning focus when it was left inside the drawer.
     * @param {ToggleEvent} event toggle event
     */
    function onPopoverToggle(event) {
        if (event.newState !== 'closed' || !drawerOpen) {
            return;
        }
        drawerOpen = false;
        render();
        const active = doc.activeElement;
        if (returnFocus && (!active || active === doc.body || sidebar.contains(active))) {
            toggle.focus();
        }
    }

    /**
     * Close the drawer on Escape, keeping the key from reaching enclosing handlers.
     * @param {KeyboardEvent} event keydown event
     */
    function onKeydown(event) {
        if (event.key === 'Escape' && drawerOpen) {
            event.preventDefault();
            event.stopPropagation();
            closeDrawer(true);
        }
    }

    /**
     * Close the drawer after a navigation link is followed, leaving focus to the link's target.
     * @param {MouseEvent} event click event
     */
    function onSidebarClick(event) {
        if (drawerOpen && event.target.closest?.('a[href]')) {
            closeDrawer(false);
        }
    }

    /**
     * Close the drawer when the layout widens, and restore the wide state.
     */
    function onMediaChange() {
        if (media.matches && drawerOpen) {
            closeDrawer(false);
        }
        render();
    }

    /**
     * Set the wide state.
     * @param {string} next open, rail, or hidden
     */
    function setState(next) {
        if (!states.includes(next)) {
            throw new RangeError(`The navigation state must be ${describe(states)}, not ${next}.`);
        }
        state = next;
        render();
        onChange?.(state);
    }

    toggle.addEventListener('click', onToggleClick);
    sidebar.addEventListener('toggle', onPopoverToggle);
    sidebar.addEventListener('keydown', onKeydown);
    sidebar.addEventListener('click', onSidebarClick);
    media.addEventListener('change', onMediaChange);
    render();

    return {
        state: () => state,
        setState,
        isDrawerOpen: () => drawerOpen,
        destroy() {
            toggle.removeEventListener('click', onToggleClick);
            sidebar.removeEventListener('toggle', onPopoverToggle);
            sidebar.removeEventListener('keydown', onKeydown);
            sidebar.removeEventListener('click', onSidebarClick);
            media.removeEventListener('change', onMediaChange);
            railTooltips?.destroy();
        }
    };
}

/**
 * Check a list of wide states against the two supported cycles.
 * @param {string[]} list requested states
 * @returns {string[]} the matching cycle
 */
function resolveStates(list) {
    for (const cycle of [STATES, TWO_STATES]) {
        if (list.length === cycle.length && cycle.every((name, index) => list[index] === name)) {
            return cycle;
        }
    }
    throw new RangeError(`The navigation states must be ${describe(STATES)} in order, or ${describe(TWO_STATES)}, not ${list.join(', ')}.`);
}

/**
 * Join state names for a message.
 * @param {string[]} list state names
 * @returns {string} the names, such as `open, rail, or hidden`
 */
function describe(list) {
    return list.length === 2 ? list.join(' or ') : `${list.slice(0, -1).join(', ')}, or ${list.at(-1)}`;
}
