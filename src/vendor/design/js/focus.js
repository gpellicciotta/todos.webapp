/** Return enabled, visible controls in keyboard order within a container. */
export function tabbableIn(container) {
    const selector = 'a[href], button, input:not([type="hidden"]), select, textarea, [tabindex]';
    const view = container.ownerDocument.defaultView;
    return [...container.querySelectorAll(selector)].filter(element => {
        const disabledFieldset = [...container.querySelectorAll('fieldset[disabled]')].some(fieldset => {
            const legend = [...fieldset.children].find(child => child.tagName === 'LEGEND');
            return fieldset.contains(element) && !legend?.contains(element);
        });
        if (element.tabIndex < 0 || element.matches(':disabled') || disabledFieldset || element.closest('[hidden], [inert]')) {
            return false;
        }
        for (let node = element; node && node !== container; node = node.parentElement) {
            const style = view.getComputedStyle(node);
            if (style.display === 'none' || style.visibility === 'hidden') {
                return false;
            }
        }
        return true;
    }).sort((a, b) => (a.tabIndex || Infinity) - (b.tabIndex || Infinity));
}
