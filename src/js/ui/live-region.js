/**
 * Live region announcer: visually hidden polite and assertive regions for screen reader messages.
 *
 * Toasts, sync state changes, and moved rows announce through the polite region.
 * Blocking errors use the assertive one.
 */

const HIDDEN_STYLE = [
  'position: absolute',
  'width: 1px',
  'height: 1px',
  'margin: -1px',
  'padding: 0',
  'border: 0',
  'overflow: hidden',
  'clip-path: inset(50%)',
  'white-space: nowrap',
].join('; ');

/**
 * Create a visually hidden live region element.
 * @param {Document} doc document that owns the element
 * @param {'polite'|'assertive'} politeness the region's `aria-live` value
 * @returns {HTMLElement} the element, not yet attached
 */
function createRegion(doc, politeness) {
  const region = doc.createElement('div');
  region.setAttribute('aria-live', politeness);
  region.setAttribute('aria-atomic', 'true');
  region.dataset.liveRegion = politeness;
  region.style.cssText = HIDDEN_STYLE;
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
export function createLiveRegion(options = {}) {
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
