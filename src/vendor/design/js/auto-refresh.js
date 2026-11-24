/**
 * Auto-refresh timing for the Refresh pattern of ADR-0003: screens have no manual Refresh button.
 *
 * - Every `interval` while the tab is visible, `onPoll` runs; a hidden tab never polls.
 * - When the tab becomes visible again, `onReturn({ away, long })` runs, with the hidden time in milliseconds,
 *   and `long` once that time reaches `longAbsence`, so the app may also reload the current screen.
 * What to refresh, change detection, and which screens opt in stay with the app:
 * a refresh never reloads a screen with a form, and updates the UI only when the data changed.
 */

/**
 * Start polling while the tab is visible, and report returns to the tab.
 * @param {object} [options] timing options
 * @param {Document} [options.document] document whose visibility counts, the global one by default
 * @param {() => void} [options.onPoll] runs every `interval` while the tab is visible
 * @param {(visit: {away: number, long: boolean}) => void} [options.onReturn] runs when the tab becomes visible again
 * @param {number} [options.interval] milliseconds between polls, 60000 by default
 * @param {number} [options.longAbsence] hidden milliseconds from which a return is long, 60000 by default
 * @param {() => number} [options.now] clock in milliseconds, `Date.now` by default, for tests
 * @returns {{destroy: () => void}} the controller
 */
export function attachAutoRefresh({ document: doc = globalThis.document, onPoll, onReturn, interval = 60_000, longAbsence = 60_000, now = Date.now } = {}) {
    let hiddenSince = doc.visibilityState === 'hidden' ? now() : null;

    /**
     * Note when the tab hides, and report the absence when it shows again.
     */
    function onVisibilityChange() {
        if (doc.visibilityState === 'hidden') {
            hiddenSince ??= now();
            return;
        }
        const away = hiddenSince === null ? 0 : now() - hiddenSince;
        hiddenSince = null;
        onReturn?.({ away, long: away >= longAbsence });
    }

    const timer = setInterval(() => {
        if (doc.visibilityState !== 'hidden') {
            onPoll?.();
        }
    }, interval);
    doc.addEventListener('visibilitychange', onVisibilityChange);

    return {
        destroy() {
            clearInterval(timer);
            doc.removeEventListener('visibilitychange', onVisibilityChange);
        }
    };
}
