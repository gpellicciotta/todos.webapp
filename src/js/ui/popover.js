/**
 * Popover behavior: a non-modal panel anchored to the trigger button that opens it.
 *
 * The panel closes on Escape, on a click outside it and its trigger, and when focus leaves both.
 * Closing returns focus to the trigger unless another control took it.
 * The menu module builds on this one.
 */

const TABBABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]',
].join(', ');

/**
 * List the controls inside a container that Tab reaches, in tree order.
 * @param {Element} container element to search
 * @returns {HTMLElement[]} the controls, skipping hidden, inert, and `tabindex="-1"` ones
 */
export function tabbableIn(container) {
  return [...container.querySelectorAll(TABBABLE)].filter((element) => {
    return element.getAttribute('tabindex') !== '-1' && !element.closest('[hidden], [inert]');
  });
}

/**
 * Place a panel below its trigger with fixed positioning, flipping above when it lacks room below.
 * The panel's inline start aligns with the trigger's, or its inline end with `align: 'end'`, kept inside the viewport.
 * @param {HTMLElement} panel panel to place
 * @param {HTMLElement} trigger element to anchor to
 * @param {number} [gap] distance in pixels between the trigger and the panel
 * @param {'start'|'end'} [align] which inline edge of the panel lines up with the same edge of the trigger
 */
export function anchorPanel(panel, trigger, gap = 4, align = 'start') {
  const view = trigger.ownerDocument.defaultView;
  // Take the panel out of the flow and pin it to the corner first, so it never shifts the trigger being measured
  // and its shrink-to-fit width does not depend on where it happened to sit before.
  panel.style.position = 'fixed';
  panel.style.margin = '0';
  panel.style.left = '0px';
  panel.style.top = '0px';
  const box = trigger.getBoundingClientRect();
  const size = panel.getBoundingClientRect();
  const below = box.bottom + gap;
  const above = box.top - gap - size.height;
  const top = below + size.height > view.innerHeight && above >= 0 ? above : below;
  const rtl = view.getComputedStyle(trigger).direction === 'rtl';
  const start = (align === 'end') === rtl ? box.left : box.right - size.width;
  const left = Math.max(gap, Math.min(start, view.innerWidth - size.width - gap));
  panel.style.top = `${top}px`;
  panel.style.left = `${left}px`;
}

/**
 * Attach popover behavior to a trigger button and its panel.
 * @param {HTMLElement} trigger button that opens and closes the panel
 * @param {HTMLElement} panel panel to show; it starts hidden
 * @param {object} [options] behavior options
 * @param {boolean} [options.anchor] position the panel at the trigger, true by default
 * @param {'start'|'end'} [options.align] the inline edge of the panel that lines up with the trigger's, `start` by default
 * @param {'first'|HTMLElement|(() => HTMLElement|undefined)|null} [options.initialFocus]
 *   what to focus on open: the first tabbable control by default, an element, a function, or nothing
 * @param {() => void} [options.onOpen] called after the panel opens
 * @param {(reason: string) => void} [options.onClose] called after the panel closes, with
 *   `escape`, `outside`, `blur`, `toggle`, `select`, `tab`, `close`, or `destroy`
 * @returns {{open: (focus?: *) => void, close: (reason?: string) => void, isOpen: () => boolean, destroy: () => void}}
 *   the controller; `open` takes an optional focus target overriding `initialFocus`
 */
export function attachPopover(trigger, panel, options = {}) {
  const { anchor = true, align = 'start', initialFocus = 'first', onOpen, onClose } = options;
  const doc = trigger.ownerDocument;
  const view = doc.defaultView;
  let open = false;

  /**
   * Re-anchor the open panel after the page scrolls or resizes.
   */
  function reposition() {
    if (open && anchor) {
      anchorPanel(panel, trigger, undefined, align);
    }
  }

  /**
   * Close on a click outside the panel and its trigger.
   * @param {MouseEvent} event click event
   */
  function onDocumentClick(event) {
    if (!panel.contains(event.target) && !trigger.contains(event.target)) {
      close('outside');
    }
  }

  /**
   * Close on Escape, keeping the key from reaching an enclosing dialog.
   * @param {KeyboardEvent} event keydown event
   */
  function onKeydown(event) {
    if (open && event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      close('escape');
    }
  }

  /**
   * Close when focus moves to a control outside the panel and its trigger.
   * @param {FocusEvent} event focusout event
   */
  function onFocusout(event) {
    const next = event.relatedTarget;
    if (open && next && !panel.contains(next) && !trigger.contains(next)) {
      close('blur');
    }
  }

  /**
   * Toggle the panel on trigger clicks.
   */
  function onTriggerClick() {
    if (open) {
      close('toggle');
    }
    else {
      show();
    }
  }

  /**
   * Show the panel and move focus into it.
   * @param {'first'|HTMLElement|(() => HTMLElement|undefined)|null} [focus] focus target
   */
  function show(focus = initialFocus) {
    if (open) {
      return;
    }
    open = true;
    panel.hidden = false;
    trigger.setAttribute('aria-expanded', 'true');
    reposition();
    doc.addEventListener('click', onDocumentClick, true);
    doc.addEventListener('scroll', reposition, true);
    view.addEventListener('resize', reposition);
    const target = focus === 'first' ? tabbableIn(panel)[0] : typeof focus === 'function' ? focus() : focus;
    target?.focus();
    onOpen?.();
  }

  /**
   * Hide the panel, returning focus to the trigger when focus was inside it or nowhere.
   * @param {string} [reason] why the panel closes, passed to `onClose`
   */
  function close(reason = 'close') {
    if (!open) {
      return;
    }
    const active = doc.activeElement;
    const lost = !active || active === doc.body || panel.contains(active);
    open = false;
    panel.hidden = true;
    trigger.setAttribute('aria-expanded', 'false');
    doc.removeEventListener('click', onDocumentClick, true);
    doc.removeEventListener('scroll', reposition, true);
    view.removeEventListener('resize', reposition);
    if (lost && reason !== 'blur' && reason !== 'destroy') {
      trigger.focus();
    }
    onClose?.(reason);
  }

  /**
   * Close the panel and remove every listener and attribute this module added.
   */
  function destroy() {
    close('destroy');
    trigger.removeEventListener('click', onTriggerClick);
    trigger.removeEventListener('keydown', onKeydown);
    panel.removeEventListener('keydown', onKeydown);
    panel.removeEventListener('focusout', onFocusout);
    trigger.removeAttribute('aria-expanded');
    trigger.removeAttribute('aria-controls');
    if (anchor) {
      for (const property of ['position', 'margin', 'top', 'left']) {
        panel.style.removeProperty(property);
      }
    }
  }

  trigger.setAttribute('aria-expanded', 'false');
  if (panel.id) {
    trigger.setAttribute('aria-controls', panel.id);
  }
  panel.hidden = true;
  trigger.addEventListener('click', onTriggerClick);
  trigger.addEventListener('keydown', onKeydown);
  panel.addEventListener('keydown', onKeydown);
  panel.addEventListener('focusout', onFocusout);

  return { open: show, close, isOpen: () => open, destroy };
}
