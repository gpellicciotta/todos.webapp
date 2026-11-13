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
