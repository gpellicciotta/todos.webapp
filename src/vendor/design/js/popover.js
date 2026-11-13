/**
 * Popover behavior: a non-modal panel anchored to the trigger button that opens it.
 *
 * The panel is a native `popover`, so it opens in the top layer and the platform's light dismiss closes it.
 * The trigger becomes its invoker, which keeps trigger clicks out of the light dismiss and works without JavaScript.
 * The panel closes on Escape, on a click outside it and its trigger, and when focus leaves both.
 * Closing returns focus to the trigger unless another control took it.
 * The menu module builds on this one.
 */

import { anchorPanel } from './anchor.js';
import { tabbableIn } from './focus.js';

/**
 * Attach popover behavior to a trigger button and its panel.
 * @param {HTMLElement} trigger button that opens and closes the panel
 * @param {HTMLElement} panel panel to show; it becomes an `auto` popover unless its `popover` attribute is set
 * @param {object} [options] behavior options
 * @param {boolean} [options.anchor] position the panel at the trigger, true by default
 * @param {'start'|'end'} [options.align] the inline edge of the panel that lines up with the trigger's, `start` by default
 * @param {'first'|HTMLElement|(() => HTMLElement|undefined)|null} [options.initialFocus]
 *   what to focus on open: the first tabbable control by default, an element, a function, or nothing
 * @param {() => void} [options.onOpen] called after the panel opens
 * @param {(reason: string) => void} [options.onClose] called after the panel closes, with
 *   `escape`, `outside`, `blur`, `toggle`, `select`, `tab`, `close`, or `destroy`;
 *   `outside` covers every close by the platform, such as a light dismiss
 * @returns {{open: (focus?: *) => void, close: (reason?: string) => void, isOpen: () => boolean, destroy: () => void}}
 *   the controller; `open` takes an optional focus target overriding `initialFocus`
 */
export function attachPopover(trigger, panel, options = {}) {
    const { anchor = true, align = 'start', initialFocus = 'first', onOpen, onClose } = options;
    const doc = trigger.ownerDocument;
    const view = doc.defaultView;
    let open = false;
    const addsInvoker = !trigger.hasAttribute('popovertarget');

    /**
     * Re-anchor the open panel after the page scrolls or resizes.
     */
    function reposition() {
        if (open && anchor) {
            anchorPanel(panel, trigger, undefined, align);
        }
    }

    /**
     * Follow a close by the platform, such as a light dismiss; the `toggle` event fires once per task with the latest state.
     * @param {ToggleEvent} event toggle event
     */
    function onToggle(event) {
        if (open && event.newState === 'closed') {
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
     * Toggle the panel on trigger clicks, in place of the invoker's own toggle.
     * @param {MouseEvent} event click event
     */
    function onTriggerClick(event) {
        event.preventDefault();
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
        panel.showPopover();
        trigger.setAttribute('aria-expanded', 'true');
        reposition();
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
        // The platform has already hidden a removed panel, and hidePopover would throw on it.
        if (panel.isConnected) {
            panel.hidePopover();
        }
        trigger.setAttribute('aria-expanded', 'false');
        doc.removeEventListener('scroll', reposition, true);
        view.removeEventListener('resize', reposition);
        if (lost && reason !== 'blur' && reason !== 'destroy') {
            trigger.focus();
        }
        onClose?.(reason);
    }

    /**
     * Close the panel and remove every listener and attribute this module added.
     * The panel keeps its `popover` attribute, so it stays hidden.
     */
    function destroy() {
        close('destroy');
        trigger.removeEventListener('click', onTriggerClick);
        trigger.removeEventListener('keydown', onKeydown);
        panel.removeEventListener('keydown', onKeydown);
        panel.removeEventListener('focusout', onFocusout);
        panel.removeEventListener('toggle', onToggle);
        trigger.removeAttribute('aria-expanded');
        trigger.removeAttribute('aria-controls');
        if (addsInvoker) {
            trigger.popoverTargetElement = null;
        }
        if (anchor) {
            for (const property of ['position', 'margin', 'top', 'right', 'bottom', 'left']) {
                panel.style.removeProperty(property);
            }
        }
    }

    trigger.setAttribute('aria-expanded', 'false');
    if (panel.id) {
        trigger.setAttribute('aria-controls', panel.id);
    }
    if (!panel.hasAttribute('popover')) {
        panel.popover = 'auto';
    }
    panel.hidden = false;
    if (addsInvoker) {
        trigger.popoverTargetElement = panel;
    }
    trigger.addEventListener('click', onTriggerClick);
    trigger.addEventListener('keydown', onKeydown);
    panel.addEventListener('keydown', onKeydown);
    panel.addEventListener('focusout', onFocusout);
    panel.addEventListener('toggle', onToggle);

    return { open: show, close, isOpen: () => open, destroy };
}
