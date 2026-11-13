/**
 * Collapsible behavior: a toggle button with `aria-expanded` that shows and hides the panel it controls.
 *
 * The toggle is a native button, so Enter and Space click it; the panel follows `aria-expanded`.
 * A panel marked `hidden="until-found"` stays findable in the page and expands when find in page reveals it.
 */

/**
 * Attach collapsible behavior to a `.collapsible` and its toggle.
 * @param {HTMLElement} root element whose first child button carries `aria-controls`
 * @param {object} [options] behavior options
 * @param {(expanded: boolean) => void} [options.onToggle] called after the state changes, such as to keep one row open
 * @returns {{expand: () => void, collapse: () => void, toggle: () => void, isExpanded: () => boolean, destroy: () => void}}
 *   the controller
 */
export function attachCollapsible(root, options = {}) {
    const { onToggle } = options;
    const toggle = root.querySelector(':scope > button[aria-controls]');
    const panel = toggle && root.ownerDocument.getElementById(toggle.getAttribute('aria-controls'));
    if (!panel) {
        throw new Error('A collapsible needs a toggle button whose aria-controls names its panel.');
    }
    const untilFound = panel.getAttribute('hidden') === 'until-found';
    let expanded = toggle.getAttribute('aria-expanded') === 'true';

    /**
     * Show the state on the toggle and the panel.
     */
    function render() {
        toggle.setAttribute('aria-expanded', String(expanded));
        if (expanded) {
            panel.removeAttribute('hidden');
        }
        else {
            panel.setAttribute('hidden', untilFound ? 'until-found' : '');
        }
    }

    /**
     * Change the state, calling `onToggle` only when it differs.
     * @param {boolean} next the new state
     */
    function set(next) {
        if (next === expanded) {
            return;
        }
        expanded = next;
        render();
        onToggle?.(expanded);
    }

    const onClick = () => set(!expanded);
    const onBeforematch = () => set(true);

    /**
     * Remove the listeners, leaving the toggle and the panel in their current state.
     */
    function destroy() {
        toggle.removeEventListener('click', onClick);
        panel.removeEventListener('beforematch', onBeforematch);
    }

    render();
    toggle.addEventListener('click', onClick);
    panel.addEventListener('beforematch', onBeforematch);

    return {
        expand: () => set(true),
        collapse: () => set(false),
        toggle: () => set(!expanded),
        isExpanded: () => expanded,
        destroy
    };
}
