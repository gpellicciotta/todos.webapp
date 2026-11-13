// Copied from support.webapp tests/unit/popover-shim.js at 964b203, reindented to this repository style.
// happy-dom lacks the popover API, so the unit tests install the part the modules use.
// Like browsers, it fires one coalesced `toggle` event in a later task; the browser specs cover the real API.

const showing = new WeakSet();
const pending = new WeakMap();

/**
 * Show or hide a popover, queueing one `toggle` event for every change in the same task.
 * @param {HTMLElement} element popover element
 * @param {boolean} open the new state
 */
function change(element, open) {
  if (!element.hasAttribute('popover')) {
    throw new DOMException('Not supported on elements that do not have a valid value for the popover attribute', 'NotSupportedError');
  }
  if (showing.has(element) === open) {
    return;
  }
  const oldState = pending.get(element)?.oldState ?? (open ? 'closed' : 'open');
  clearTimeout(pending.get(element)?.timer);
  if (open) {
    showing.add(element);
  }
  else {
    showing.delete(element);
  }
  const newState = open ? 'open' : 'closed';
  const timer = setTimeout(() => {
    pending.delete(element);
    element.dispatchEvent(Object.assign(new Event('toggle'), { oldState, newState }));
  });
  pending.set(element, { oldState, timer });
}

/**
 * Install `showPopover` and `hidePopover` on every element.
 */
export function installPopoverShim() {
  HTMLElement.prototype.showPopover = function showPopover() {
    change(this, true);
  };
  HTMLElement.prototype.hidePopover = function hidePopover() {
    change(this, false);
  };
}

/**
 * Tell whether a popover is showing, as `:popover-open` would.
 * @param {HTMLElement} element popover element
 * @returns {boolean} true while the popover is open
 */
export function isShowing(element) {
  return showing.has(element);
}

/**
 * Close a popover as the platform's light dismiss does, without the module asking.
 * @param {HTMLElement} element popover element
 */
export function lightDismiss(element) {
  change(element, false);
}

/**
 * Wait until the queued `toggle` events have fired.
 * @returns {Promise<void>} resolves in a later task
 */
export function nextTask() {
  return new Promise((resolve) => setTimeout(resolve));
}
