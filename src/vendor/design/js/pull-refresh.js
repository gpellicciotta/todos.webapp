/**
 * Pull-to-refresh for the app shell (ADR-0004), active only while the app runs installed.
 *
 * Mobile browser tabs reload a page pulled down at its top, but installed web apps get no such gesture on iOS,
 * and other browsers differ. While the app runs installed, this module supplies the gesture itself:
 * - `<html data-pull-refresh>` lets shell.css set `overscroll-behavior-y: contain`, so no native reload drops app state;
 * - a one-finger pull that starts at the top of the page and of every scrolled ancestor, outside open popovers
 *   and dialogs, moves the indicator by half the dragged distance, up to 96 px;
 * - a release at 64 px or more calls `onRefresh`, and the indicator spins until its promise settles, for at least 400 ms;
 * - an upward move, a second finger, or a cancelled touch drops the pull without refreshing.
 * Touch events are used rather than pointer events, since browsers cancel a touch pointer once they take over the pan.
 * State lives in the indicator's `hidden` and `data-state` attributes; travel and progress are private properties.
 */

import { createIcon } from './icon.js';
import { announce } from './live-region.js';

const PULL_RATIO = 0.5;
const MAX_TRAVEL = 96;
const THRESHOLD = 64;
const MIN_SPIN_MILLIS = 400;
const STANDALONE_QUERY = '(display-mode: standalone)';
const DEFAULT_LABELS = { refreshing: 'Refreshing' };

/**
 * Attach pull-to-refresh to the app root.
 * @param {HTMLElement} root the element that receives the touches, normally the `app` body
 * @param {object} options behavior options
 * @param {() => Promise<unknown>|unknown} options.onRefresh runs the refresh; the indicator spins until it settles
 * @param {HTMLElement} [options.container] the element that holds the indicator, normally `app__overlays`; `root` by default
 * @param {{matches: boolean, addEventListener?: Function, removeEventListener?: Function}} [options.media]
 *   whether the app runs installed; `matchMedia('(display-mode: standalone)')` by default
 * @param {{refreshing?: string}} [options.labels] the announcement when a refresh starts
 * @param {string} [options.icon] the indicator's sprite glyph, the core `refresh` by default; set the sprite url first
 * @returns {{destroy: () => void}} the controller
 */
export function attachPullRefresh(root, { onRefresh, container = root, media, labels = {}, icon = 'refresh' } = {}) {
    const doc = root.ownerDocument;
    const win = doc.defaultView;
    const query = media ?? win.matchMedia(STANDALONE_QUERY);
    const text = { ...DEFAULT_LABELS, ...labels };
    const indicator = doc.createElement('div');
    indicator.className = 'app__pull-indicator';
    indicator.hidden = true;
    indicator.setAttribute('aria-hidden', 'true');
    indicator.append(createIcon(doc, icon));
    container.append(indicator);

    let start = null;
    let travel = 0;
    let refreshing = false;

    /**
     * Show the indicator's travel, progress, and state; it hides while idle.
     */
    function render() {
        indicator.hidden = travel === 0 && !refreshing;
        indicator.style.setProperty('--_app-pull-travel', `${travel}px`);
        indicator.style.setProperty('--_app-pull-progress', String(Math.min(travel / THRESHOLD, 1)));
        indicator.dataset.state = refreshing ? 'refreshing' : (travel >= THRESHOLD ? 'armed' : 'pulling');
    }

    /**
     * Follow the display mode: the gesture and the overscroll suppression apply only while installed.
     */
    function applyMode() {
        doc.documentElement.toggleAttribute('data-pull-refresh', query.matches);
    }

    /**
     * Tell whether the page and every scrolled ancestor of an element sit at their top.
     * @param {Element} element touched element
     * @returns {boolean} true at the top
     */
    function atTop(element) {
        if (win.scrollY > 0) {
            return false;
        }
        for (let node = element; node && node !== doc.documentElement; node = node.parentElement) {
            if (node.scrollTop > 0) {
                return false;
            }
        }
        return true;
    }

    /**
     * Tell whether an element sits inside an open dialog or popover, which keep their own touches.
     * @param {Element} element touched element
     * @returns {boolean} true inside an overlay
     */
    function inOverlay(element) {
        if (element.closest('dialog[open]')) {
            return true;
        }
        return Boolean(element.closest('[popover]')?.matches(':popover-open'));
    }

    /**
     * Start a pull on a one-finger touch at the top, outside overlays.
     * @param {TouchEvent} event touchstart event
     */
    function onTouchStart(event) {
        if (start !== null) {
            cancel(); // A second finger ends the pull.
        }
        // WebKit can report a text node as the target of a touch on text.
        const target = event.target?.closest ? event.target : event.target?.parentElement;
        if (!query.matches || refreshing || event.touches.length !== 1 || !target?.closest) {
            return;
        }
        if (!atTop(target) || inOverlay(target)) {
            return;
        }
        start = { y: event.touches[0].clientY, target };
        travel = 0;
    }

    /**
     * Move the indicator while the finger stays below its start; an upward move hands the pan back to the browser.
     * @param {TouchEvent} event touchmove event
     */
    function onTouchMove(event) {
        if (start === null) {
            return;
        }
        const dragged = event.touches[0].clientY - start.y;
        if (dragged < 0 || !atTop(start.target)) {
            cancel();
            return;
        }
        if (dragged === 0) {
            travel = 0; // Back at the start height, the pull stays alive.
            render();
            return;
        }
        if (event.cancelable) {
            event.preventDefault(); // Keeps the page from bouncing under the indicator.
        }
        travel = Math.min(dragged * PULL_RATIO, MAX_TRAVEL);
        render();
    }

    /**
     * Drop the current pull without refreshing, such as when a second finger lands or the system takes the touch.
     */
    function cancel() {
        start = null;
        travel = 0;
        render();
    }

    /**
     * Drop a pull whose touch the system took over.
     */
    function onTouchCancel() {
        if (start !== null) {
            cancel();
        }
    }

    /**
     * End a pull: refresh when it reached the threshold, otherwise let the indicator go.
     */
    async function onTouchEnd() {
        if (start === null) {
            return;
        }
        start = null;
        const armed = travel >= THRESHOLD;
        travel = 0;
        if (!armed) {
            render();
            return;
        }
        refreshing = true;
        render();
        announce(doc, text.refreshing);
        const started = Date.now();
        try {
            await onRefresh?.();
        }
        finally {
            const rest = MIN_SPIN_MILLIS - (Date.now() - started);
            if (rest > 0) {
                await new Promise((resolve) => win.setTimeout(resolve, rest));
            }
            refreshing = false;
            render();
        }
    }

    root.addEventListener('touchstart', onTouchStart, { passive: true });
    root.addEventListener('touchmove', onTouchMove, { passive: false });
    root.addEventListener('touchend', onTouchEnd);
    root.addEventListener('touchcancel', onTouchCancel);
    query.addEventListener?.('change', applyMode);
    applyMode();

    return {
        destroy() {
            root.removeEventListener('touchstart', onTouchStart);
            root.removeEventListener('touchmove', onTouchMove);
            root.removeEventListener('touchend', onTouchEnd);
            root.removeEventListener('touchcancel', onTouchCancel);
            query.removeEventListener?.('change', applyMode);
            doc.documentElement.removeAttribute('data-pull-refresh');
            indicator.remove();
        }
    };
}
