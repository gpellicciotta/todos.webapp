/**
 * Anchoring utility: fixed positioning of a panel at the element that opens it, mirrored for right-to-left text.
 */

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
    // Clearing the right and bottom insets undoes the `inset: 0` of popovers, which right-to-left pages would honor.
    panel.style.position = 'fixed';
    panel.style.margin = '0';
    panel.style.right = 'auto';
    panel.style.bottom = 'auto';
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
