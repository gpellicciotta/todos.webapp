/**
 * Install prompt tracking for installable web apps.
 *
 * - Keeps the browser's `beforeinstallprompt` event after calling `preventDefault()`.
 * - Detects an installed app through `(display-mode: standalone)`, legacy `navigator.standalone`, and `appinstalled`.
 * - Owns no button: reports `{ installable, installed }` through `onChange`, so the app shows or hides its action.
 * - Discards the single-use event before awaiting the user's choice in `prompt()`.
 */

const STANDALONE_QUERY = '(display-mode: standalone)';

/**
 * Attach install prompt tracking to a window.
 * @param {object} [options] environment and callback options
 * @param {Window|EventTarget|null} [options.window] window receiving `beforeinstallprompt` and `appinstalled`; global window by default
 * @param {(query: string) => {matches: boolean, addEventListener?: Function, removeEventListener?: Function}} [options.matchMedia]
 *   display-mode matcher; `window.matchMedia` by default
 * @param {(state: {installable: boolean, installed: boolean}) => void} [options.onChange] called whenever `installable` or `installed` changes
 * @returns {{getState: () => {installable: boolean, installed: boolean}, isInstallable: () => boolean, isInstalled: () => boolean, prompt: () => Promise<{outcome: string}>, destroy: () => void}} controller
 */
export function attachInstallPrompt({ window: win = globalThis.window, matchMedia, onChange } = {}) {
    if (!win) {
        return {
            getState: () => ({ installable: false, installed: false }),
            isInstallable: () => false,
            isInstalled: () => false,
            prompt: async () => ({ outcome: 'unavailable' }),
            destroy() {}
        };
    }

    const mediaFn = matchMedia ?? (typeof win.matchMedia === 'function' ? win.matchMedia.bind(win) : null);
    const query = typeof mediaFn === 'function' ? mediaFn(STANDALONE_QUERY) : null;
    const standalone = () => Boolean(query?.matches || win.navigator?.standalone === true);

    let deferred = null;
    let installedByEvent = false;
    let destroyed = false;

    const getState = () => {
        const installed = installedByEvent || standalone();
        return { installable: !installed && deferred !== null, installed };
    };

    let last = getState();

    /**
     * Notify `onChange` only when `installable` or `installed` actually changed.
     */
    function emit() {
        if (destroyed) {
            return;
        }
        const next = getState();
        if (next.installable === last.installable && next.installed === last.installed) {
            return;
        }
        last = next;
        onChange?.({ ...next });
    }

    /**
     * Stash `beforeinstallprompt` unless the app already runs in standalone mode.
     * @param {Event} event browser install prompt event
     */
    function onBeforeInstallPrompt(event) {
        if (destroyed || standalone()) {
            return;
        }
        event.preventDefault?.();
        deferred = event;
        installedByEvent = false;
        emit();
    }

    /**
     * Mark the app installed and drop any kept prompt event.
     */
    function onAppInstalled() {
        if (destroyed) {
            return;
        }
        deferred = null;
        installedByEvent = true;
        emit();
    }

    /**
     * Track transitions into or out of standalone display mode.
     */
    function onMediaChange() {
        if (destroyed) {
            return;
        }
        if (standalone()) {
            deferred = null;
        }
        emit();
    }

    /**
     * Show the browser install prompt during a user gesture and resolve to the user's choice.
     * @returns {Promise<{outcome: string}>} user choice, or `{ outcome: 'unavailable' }` when no prompt is held
     */
    async function prompt() {
        if (destroyed || !deferred) {
            return { outcome: 'unavailable' };
        }
        // Discard the single-use event before awaiting so a second click cannot reuse it.
        const event = deferred;
        deferred = null;
        emit();
        const result = await event.prompt();
        if (result && typeof result.outcome === 'string') {
            return result;
        }
        return event.userChoice ? await event.userChoice : result;
    }

    /**
     * Remove all listeners and drop any kept prompt event.
     */
    function destroy() {
        if (destroyed) {
            return;
        }
        destroyed = true;
        deferred = null;
        win.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
        win.removeEventListener('appinstalled', onAppInstalled);
        query?.removeEventListener?.('change', onMediaChange);
    }

    win.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    win.addEventListener('appinstalled', onAppInstalled);
    query?.addEventListener?.('change', onMediaChange);

    return {
        getState,
        isInstallable: () => getState().installable,
        isInstalled: () => getState().installed,
        prompt,
        destroy
    };
}
