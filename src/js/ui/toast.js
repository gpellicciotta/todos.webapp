/**
 * Toast behavior: short confirmations in a toast region, with an optional Undo action.
 *
 * Each toast announces its message through the polite live region and expires after 8 seconds.
 * Expiry pauses while the pointer is over the toast or focus is inside it.
 * Escape inside a toast dismisses it; at most three toasts stack, and the oldest goes first.
 */

import { createLiveRegion } from './live-region.js';

/**
 * Create a toaster that shows toasts in a region.
 * @param {object} [options] toaster options
 * @param {Document} [options.document] document to use, the global one by default
 * @param {HTMLElement} [options.region] `.toast-region` element; one is created at the end of the body otherwise
 * @param {{announce: (message: string) => void, destroy?: () => void}} [options.liveRegion]
 *   announcer; one is created otherwise
 * @param {number} [options.duration] milliseconds before a toast expires, 8000 by default
 * @param {number} [options.max] most toasts shown at once, 3 by default
 * @param {typeof setTimeout} [options.setTimeout] timer function, for tests
 * @param {typeof clearTimeout} [options.clearTimeout] timer cancel function, for tests
 * @param {() => number} [options.now] clock in milliseconds, for tests
 * @returns {{show: (message: string, options?: object) => () => void, destroy: () => void}} the toaster
 */
export function createToaster(options = {}) {
  const doc = options.document ?? globalThis.document;
  const duration = options.duration ?? 8000;
  const max = options.max ?? 3;
  const set = options.setTimeout ?? globalThis.setTimeout;
  const clear = options.clearTimeout ?? globalThis.clearTimeout;
  const now = options.now ?? (() => Date.now());
  const ownRegion = !options.region;
  const ownLiveRegion = !options.liveRegion;
  const region = options.region ?? doc.createElement('div');
  const liveRegion = options.liveRegion ?? createLiveRegion({ document: doc, setTimeout: set, clearTimeout: clear });
  const toasts = [];
  let lastFocus = null;

  if (ownRegion) {
    region.className = 'toast-region';
    region.setAttribute('role', 'region');
    region.setAttribute('aria-label', 'Notifications');
    doc.body.append(region);
  }

  /**
   * Remember the last control focused outside the region, to return focus there later.
   * @param {FocusEvent} event focusin event
   */
  function onDocumentFocusin(event) {
    if (!region.contains(event.target)) {
      lastFocus = event.target;
    }
  }

  /**
   * Stop a toast's expiry timer and keep its remaining time.
   * @param {object} toast toast record
   */
  function pause(toast) {
    if (toast.timer !== null) {
      clear(toast.timer);
      toast.timer = null;
      toast.remaining -= now() - toast.startedAt;
    }
  }

  /**
   * Restart a toast's expiry timer unless the pointer or focus holds it.
   * @param {object} toast toast record
   */
  function resume(toast) {
    if (toast.done || toast.hovered || toast.focused || toast.timer !== null) {
      return;
    }
    toast.startedAt = now();
    toast.timer = set(() => {
      toast.timer = null;
      dismiss(toast, 'timeout');
    }, Math.max(0, toast.remaining));
  }

  /**
   * Remove a toast once, returning focus if it was inside, and call its `onDismiss`.
   * @param {object} toast toast record
   * @param {string} reason `action`, `timeout`, `escape`, `overflow`, `dismiss`, or `destroy`
   */
  function dismiss(toast, reason) {
    if (toast.done) {
      return;
    }
    toast.done = true;
    pause(toast);
    const hadFocus = toast.element.contains(doc.activeElement);
    toast.element.remove();
    toasts.splice(toasts.indexOf(toast), 1);
    const back = toast.returnFocus ?? lastFocus;
    if (hadFocus && back?.isConnected) {
      back.focus();
    }
    toast.onDismiss?.(reason);
  }

  /**
   * Build a toast element with its message and optional action button.
   * @param {object} toast toast record
   * @param {string} message toast text
   * @param {string} actionLabel action button text
   * @returns {HTMLElement} the toast element
   */
  function render(toast, message, actionLabel) {
    const element = doc.createElement('div');
    element.className = 'toast';
    const text = doc.createElement('p');
    text.className = 'toast__text';
    text.textContent = message;
    element.append(text);
    if (toast.onAction) {
      const button = doc.createElement('button');
      button.className = 'button button--quiet';
      button.type = 'button';
      button.textContent = actionLabel;
      button.addEventListener('click', () => {
        dismiss(toast, 'action');
        toast.onAction();
      });
      element.append(button);
    }
    element.addEventListener('mouseenter', () => {
      toast.hovered = true;
      pause(toast);
    });
    element.addEventListener('mouseleave', () => {
      toast.hovered = false;
      resume(toast);
    });
    element.addEventListener('focusin', (event) => {
      if (!toast.focused && event.relatedTarget && !region.contains(event.relatedTarget)) {
        toast.returnFocus = event.relatedTarget;
      }
      toast.focused = true;
      pause(toast);
    });
    element.addEventListener('focusout', (event) => {
      if (!element.contains(event.relatedTarget)) {
        toast.focused = false;
        resume(toast);
      }
    });
    element.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        dismiss(toast, 'escape');
      }
    });
    return element;
  }

  /**
   * Show a toast.
   * @param {string} message short confirmation, such as "Task moved to the recycle bin."
   * @param {object} [settings] toast settings
   * @param {() => void} [settings.onAction] adds an action button that calls this and dismisses the toast
   * @param {string} [settings.actionLabel] action button text, `Undo` by default
   * @param {(reason: string) => void} [settings.onDismiss] called once when the toast goes, with its reason
   * @returns {() => void} a function that dismisses the toast
   */
  function show(message, settings = {}) {
    const toast = {
      onAction: settings.onAction,
      onDismiss: settings.onDismiss,
      remaining: duration,
      startedAt: 0,
      timer: null,
      hovered: false,
      focused: false,
      done: false,
      returnFocus: null,
    };
    toast.element = render(toast, message, settings.actionLabel ?? 'Undo');
    region.append(toast.element);
    toasts.push(toast);
    while (toasts.length > max) {
      dismiss(toasts[0], 'overflow');
    }
    liveRegion.announce(message);
    resume(toast);
    return () => dismiss(toast, 'dismiss');
  }

  /**
   * Dismiss every toast and remove the listeners and elements this toaster added.
   */
  function destroy() {
    for (const toast of [...toasts]) {
      dismiss(toast, 'destroy');
    }
    doc.removeEventListener('focusin', onDocumentFocusin);
    if (ownRegion) {
      region.remove();
    }
    if (ownLiveRegion) {
      liveRegion.destroy();
    }
  }

  doc.addEventListener('focusin', onDocumentFocusin);
  return { show, destroy };
}
