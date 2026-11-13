/**
 * Live region announcer: visually hidden polite and assertive regions for screen reader messages.
 *
 * Toasts, sync state changes, and moved rows announce through the polite `role="status"` region.
 * Blocking errors use the assertive `role="alert"` one.
 * The regions use the `.visually-hidden` class of reset.css.
 */

/**
 * Create a visually hidden live region element.
 * @param {Document} doc document that owns the element
 * @param {'polite'|'assertive'} politeness the region's `aria-live` value
 * @returns {HTMLElement} the element, not yet attached
 */
function createRegion(doc, politeness) {
    const region = doc.createElement('div');
    region.setAttribute('role', politeness === 'assertive' ? 'alert' : 'status');
    region.setAttribute('aria-live', politeness);
    region.setAttribute('aria-atomic', 'true');
    region.dataset.liveRegion = politeness;
    region.className = 'visually-hidden';
    return region;
}

/**
 * Add a polite and an assertive live region to the page.
 * @param {object} [options] announcer options
 * @param {Document} [options.document] document to use, the global one by default
 * @param {Element} [options.parent] element to append the regions to, the body by default
 * @param {number} [options.delay] milliseconds between clearing and setting a message, 100 by default
 * @param {typeof setTimeout} [options.setTimeout] timer function, for tests
 * @param {typeof clearTimeout} [options.clearTimeout] timer cancel function, for tests
 * @returns {{announce: (message: string, options?: {politeness?: 'polite'|'assertive'}) => void, destroy: () => void}}
 *   the announcer; `announce` clears the region first, so a repeated message is read again
 */
function createController(options = {}) {
    const doc = options.document ?? globalThis.document;
    const parent = options.parent ?? doc.body;
    const delay = options.delay ?? 100;
    const set = options.setTimeout ?? globalThis.setTimeout;
    const clear = options.clearTimeout ?? globalThis.clearTimeout;
    const regions = { polite: createRegion(doc, 'polite'), assertive: createRegion(doc, 'assertive') };
    const timers = new Map();
    let destroyed = false;
    parent.append(regions.polite, regions.assertive);

    /**
     * Announce a message.
     * @param {string} message text to read
     * @param {{politeness?: 'polite'|'assertive'}} [settings] `polite` by default
     */
    function announce(message, settings = {}) {
        if (destroyed) {
            return;
        }
        const politeness = settings.politeness === 'assertive' ? 'assertive' : 'polite';
        const region = regions[politeness];
        clear(timers.get(politeness));
        region.textContent = '';
        timers.set(politeness, set(() => {
            timers.delete(politeness);
            region.textContent = message;
        }, delay));
    }

    /**
     * Cancel pending messages and remove both regions.
     */
    function destroy() {
        destroyed = true;
        for (const timer of timers.values()) {
            clear(timer);
        }
        timers.clear();
        regions.polite.remove();
        regions.assertive.remove();
    }

    return { announce, destroy };
}

const documents = new WeakMap();

/**
 * Resolve the document's shared regions. The first caller supplies placement and timer options.
 * @param {object} options region options
 * @returns {object} shared entry
 */
function sharedEntry(options) {
    const doc = options.document ?? globalThis.document;
    let entry = documents.get(doc);
    if (!entry) {
        entry = { controller: createController(options), owners: 0 };
        documents.set(doc, entry);
    }
    return entry;
}

/**
 * Acquire the document's shared announcer; destroy releases only this caller's ownership.
 * The final owner removes the regions. Later default announcements recreate them when needed.
 * @param {object} [options] region options; the first caller's options apply
 * @returns {{announce: Function, destroy: Function}} announcer handle
 */
export function createLiveRegion(options = {}) {
    const doc = options.document ?? globalThis.document;
    const entry = sharedEntry(options);
    entry.owners += 1;
    let destroyed = false;
    return {
        announce(message, settings) {
            if (!destroyed) {
                entry.controller.announce(message, settings);
            }
        },
        destroy() {
            if (destroyed) {
                return;
            }
            destroyed = true;
            entry.owners -= 1;
            if (entry.owners === 0) {
                entry.controller.destroy();
                documents.delete(doc);
            }
        }
    };
}

/**
 * Announce through the document's shared polite region, creating it lazily when needed.
 * @param {Document} doc owning document
 * @param {string} message text to announce
 */
export function announce(doc, message) {
    sharedEntry({ document: doc }).controller.announce(message);
}
