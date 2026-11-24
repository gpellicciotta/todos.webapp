/** Noninteractive descriptions, shown on focus or mouse hover without moving focus. */
import { anchorPanel } from './anchor.js';

/** Enhance an authored trigger and text-only tooltip. Returns reversible lifecycle methods. */
export function attachTooltip(trigger, element) {
    const doc = trigger.ownerDocument;
    const view = doc.defaultView;
    const nativePopover = typeof element.showPopover === 'function' && typeof element.hidePopover === 'function';
    const attributes = new Map();
    for (const [node, names] of [[trigger, ['aria-describedby', 'title']], [element, ['id', 'role', 'hidden', 'popover', 'style']]]) {
        attributes.set(node, names.map(name => [name, node.getAttribute(name)]));
    }
    if (!element.id) {
        let index = 1;
        while (doc.getElementById(`tooltip-${index}`)) {
            index++;
        }
        element.id = `tooltip-${index}`;
    }
    const descriptions = new Set((trigger.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean));
    descriptions.add(element.id);
    trigger.setAttribute('aria-describedby', [...descriptions].join(' '));
    trigger.removeAttribute('title');
    element.setAttribute('role', 'tooltip');
    if (nativePopover) {
        element.setAttribute('popover', 'manual');
    }
    else {
        element.removeAttribute('popover');
    }
    element.hidden = true;
    let opened = false;
    let hovered = false;
    let focused = false;
    let timer;
    let destroyed = false;
    const listeners = [];
    const listen = (node, type, handler) => {
        node.addEventListener(type, handler);
        listeners.push(() => node.removeEventListener(type, handler));
    };
    const reposition = () => {
        if (opened) {
            anchorPanel(element, trigger, 0);
        }
    };
    const close = () => {
        view.clearTimeout(timer);
        if (!opened) {
            return;
        }
        if (nativePopover && element.matches(':popover-open')) {
            element.hidePopover();
        }
        element.hidden = true;
        opened = false;
    };
    const open = () => {
        view.clearTimeout(timer);
        if (destroyed || opened || trigger.matches(':disabled, [aria-disabled="true"]')) {
            return;
        }
        element.hidden = false;
        if (nativePopover) {
            element.showPopover();
        }
        opened = true;
        reposition();
    };
    const leave = () => {
        view.clearTimeout(timer);
        timer = view.setTimeout(() => {
            if (!hovered && !focused) {
                close();
            }
        }, 100);
    };
    for (const node of [trigger, element]) {
        listen(node, 'pointerenter', event => {
            if (event.pointerType !== 'mouse') {
                return;
            }
            hovered = true;
            open();
        });
        listen(node, 'pointerleave', () => {
            hovered = false; leave();
        });
    }
    listen(trigger, 'focus', () => {
        focused = true; open();
    });
    listen(trigger, 'blur', () => {
        focused = false; leave();
    });
    listen(doc, 'keydown', event => {
        if (opened && event.key === 'Escape') {
            event.preventDefault();
            event.stopPropagation();
            close();
        }
    });
    listen(view, 'resize', reposition);
    // Capture scroll events from nested scrolling containers as well as the page.
    doc.addEventListener('scroll', reposition, true);
    if (doc.activeElement === trigger) {
        focused = true; open();
    }
    return {
        element, open, close, isOpen: () => opened,
        destroy() {
            if (destroyed) {
                return;
            }
            close();
            destroyed = true;
            listeners.forEach(remove => remove());
            doc.removeEventListener('scroll', reposition, true);
            for (const [node, entries] of attributes) {
                for (const [name, value] of entries) {
                    if (value === null) {
                        node.removeAttribute(name);
                    }
                    else {
                        node.setAttribute(name, value);
                    }
                }
            }
        }
    };
}

/** Build plain tooltip text in the supplied document, then enhance its trigger. */
export function createTooltip(doc, { trigger, text }) {
    const element = doc.createElement('span');
    element.className = 'tooltip';
    element.textContent = text;
    doc.body.append(element);
    const controller = attachTooltip(trigger, element);
    return { ...controller, destroy() {
        controller.destroy(); element.remove();
    } };
}

// Pointer and focus events a label tooltip already took, so an enclosing root's tooltip leaves them alone.
const claimedEvents = new WeakSet();

/**
 * Read the name a label tooltip shows: the accessible name of an icon-only control, in simplified form.
 * @param {Element} control control to name
 * @returns {string} its `aria-label`, `aria-labelledby` text, `title`, or text content, with spaces collapsed
 */
function labelOf(control) {
    const label = control.getAttribute('aria-label')?.trim();
    if (label) {
        return label;
    }
    const doc = control.ownerDocument;
    const labelledBy = (control.getAttribute('aria-labelledby') ?? '').split(/\s+/).filter(Boolean)
        .map((id) => doc.getElementById(id)?.textContent ?? '').join(' ');
    const text = (node) => (node.nodeType === 3 ? node.data : [...node.childNodes].map(text).join(' '));
    return (labelledBy || control.getAttribute('title') || text(control)).replace(/\s+/g, ' ').trim();
}

/**
 * Place a label tooltip below its control, flipping above, or beside it on the inline end, inside the viewport.
 * @param {HTMLElement} element tooltip to place
 * @param {Element} control control it names
 * @param {'block-end'|'inline-end'} placement side of the control
 */
function placeLabel(element, control, placement) {
    const view = control.ownerDocument.defaultView;
    Object.assign(element.style, { position: 'fixed', margin: '0', right: 'auto', bottom: 'auto', left: '0px', top: '0px' });
    const gap = 4;
    const box = control.getBoundingClientRect();
    const size = element.getBoundingClientRect();
    let left = box.left + (box.width - size.width) / 2;
    let top = box.bottom + gap;
    if (placement === 'inline-end') {
        const rtl = view.getComputedStyle(control).direction === 'rtl';
        left = rtl ? box.left - gap - size.width : box.right + gap;
        top = box.top + (box.height - size.height) / 2;
    }
    else if (top + size.height > view.innerHeight && box.top - gap - size.height >= 0) {
        top = box.top - gap - size.height;
    }
    element.style.left = `${Math.max(gap, Math.min(left, view.innerWidth - size.width - gap))}px`;
    element.style.top = `${Math.max(gap, Math.min(top, view.innerHeight - size.height - gap))}px`;
}

/**
 * Show the name of each icon-only control as a tooltip on mouse hover and keyboard focus.
 * One shared tooltip follows the control under the pointer or the focus through event delegation, so later controls need no setup.
 * The name is already the control's accessible name, so the tooltip stays `aria-hidden` and describes nothing.
 * Nested roots may overlap: the innermost root that names a control shows its tooltip.
 * @param {Document|HTMLElement} root the document or element whose controls get tooltips
 * @param {object} [options] behavior options
 * @param {string} [options.selector] the controls to name, `.icon-button` by default
 * @param {(control: Element) => boolean} [options.when] whether a control shows its tooltip now, such as only in a rail
 * @param {'block-end'|'inline-end'} [options.placement] below the control, flipping above, or beside it on the inline end
 * @returns {{element: HTMLElement, isOpen: () => boolean, close: () => void, destroy: () => void}} the controller
 */
export function attachLabelTooltips(root, options = {}) {
    const { selector = '.icon-button', when = () => true, placement = 'block-end' } = options;
    const doc = root.ownerDocument ?? root;
    const view = doc.defaultView;
    const element = doc.createElement('span');
    element.className = 'tooltip tooltip--label';
    element.setAttribute('role', 'tooltip');
    element.setAttribute('aria-hidden', 'true');
    element.hidden = true;
    const nativePopover = typeof element.showPopover === 'function' && typeof element.hidePopover === 'function';
    if (nativePopover) {
        element.setAttribute('popover', 'manual');
    }
    doc.body.append(element);
    let current = null;
    let savedTitle = null;
    let hovered = false;
    let focused = false;
    let destroyed = false;
    const listeners = [];
    const listen = (node, type, handler, capture = false) => {
        node.addEventListener(type, handler, capture);
        listeners.push(() => node.removeEventListener(type, handler, capture));
    };
    const controlOf = (target) => {
        const control = target?.closest?.(selector);
        return control && root.contains(control) && when(control) ? control : null;
    };
    const place = () => {
        if (current) {
            placeLabel(element, current, placement);
        }
    };
    const close = () => {
        if (!current) {
            return;
        }
        observer.disconnect();
        if (savedTitle !== null) {
            current.setAttribute('title', savedTitle);
        }
        if (nativePopover && element.matches(':popover-open')) {
            element.hidePopover();
        }
        element.hidden = true;
        current = null;
        savedTitle = null;
        hovered = false;
        focused = false;
    };
    // Follow a press or script that renames, hides, or removes the control.
    const refresh = () => {
        if (!current) {
            return;
        }
        if (!current.isConnected || current.getClientRects().length === 0 || !when(current)) {
            close();
            return;
        }
        element.textContent = labelOf(current);
        place();
    };
    const observer = new view.MutationObserver(refresh);
    const open = (control) => {
        if (control === current) {
            return true;
        }
        close();
        const name = labelOf(control);
        if (!name) {
            return false;
        }
        current = control;
        savedTitle = control.getAttribute('title');
        control.removeAttribute('title');
        element.textContent = name;
        element.hidden = false;
        if (nativePopover) {
            element.showPopover();
        }
        place();
        observer.observe(control, { attributes: true, attributeFilter: ['aria-label', 'aria-labelledby'] });
        return true;
    };
    const focusVisible = (control) => {
        try {
            return control.matches(':focus-visible');
        }
        catch {
            return true;
        }
    };

    listen(root, 'pointerover', (event) => {
        const control = event.pointerType === 'mouse' && !claimedEvents.has(event) ? controlOf(event.target) : null;
        if (control && open(control)) {
            claimedEvents.add(event);
            hovered = true;
        }
    });
    listen(root, 'pointerout', (event) => {
        if (!current || current.contains(event.relatedTarget)) {
            return;
        }
        hovered = false;
        if (!focused) {
            close();
        }
    });
    listen(root, 'focusin', (event) => {
        const control = claimedEvents.has(event) ? null : controlOf(event.target);
        if (control && focusVisible(control) && open(control)) {
            claimedEvents.add(event);
            focused = true;
        }
    });
    listen(root, 'focusout', (event) => {
        if (event.target !== current) {
            return;
        }
        focused = false;
        if (!hovered) {
            close();
        }
    });
    listen(root, 'click', () => view.setTimeout(refresh));
    listen(doc, 'keydown', (event) => {
        if (current && event.key === 'Escape') {
            event.preventDefault();
            event.stopPropagation();
            close();
        }
    });
    listen(view, 'resize', place);
    // Capture scroll events from nested scrolling containers as well as the page.
    listen(doc, 'scroll', place, true);

    return {
        element,
        isOpen: () => current !== null,
        close,
        destroy() {
            if (destroyed) {
                return;
            }
            destroyed = true;
            close();
            listeners.forEach((remove) => remove());
            element.remove();
        }
    };
}
