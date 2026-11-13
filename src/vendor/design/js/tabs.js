/** Enhance authored horizontal tabs with automatic activation and reversible state. */
export function attachTabs(root) {
    const owned = selector => [...root.querySelectorAll(selector)].filter(element => element.closest('[data-tabs-root]') === root);
    const lists = owned('[data-tabs-list][role="tablist"]');
    const tabs = owned('[data-tabs-tab][role="tab"]');
    const panels = tabs.map(tab => root.ownerDocument.getElementById(tab.getAttribute('aria-controls')));
    if (lists.length !== 1 || !tabs.length || tabs.some(tab => !lists[0].contains(tab))
        || panels.some((panel, index) => !panel || panel.closest('[data-tabs-root]') !== root
            || !panel.matches('[data-tabs-panel][role="tabpanel"]') || panel.getAttribute('aria-labelledby') !== tabs[index].id)
        || new Set(panels).size !== panels.length || !tabs.some(tab => !tab.disabled)) {
        throw new Error('Tabs need one tablist, enabled tabs, and uniquely linked owned panels.');
    }
    const saved = tabs.flatMap((tab, index) => [
        [tab, 'aria-selected', tab.getAttribute('aria-selected')],
        [tab, 'tabindex', tab.getAttribute('tabindex')],
        [panels[index], 'hidden', panels[index].getAttribute('hidden')]
    ]);
    let destroyed = false;
    const enabled = () => tabs.filter(tab => !tab.disabled);
    const select = tab => {
        if (!tabs.includes(tab) || tab.disabled) {
            return;
        }
        tabs.forEach((item, index) => {
            const selected = item === tab;
            item.setAttribute('aria-selected', String(selected));
            item.tabIndex = selected ? 0 : -1;
            panels[index].hidden = !selected;
        });
    };
    const targetTab = event => event.target.closest?.('[data-tabs-tab]');
    const activate = event => select(targetTab(event));
    const onKeydown = event => {
        const tab = targetTab(event);
        if (!tabs.includes(tab) || tab.disabled || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) {
            return;
        }
        const available = enabled();
        const index = available.indexOf(tab);
        let next;
        switch (event.key) {
            case 'ArrowLeft': next = available[(index - 1 + available.length) % available.length]; break;
            case 'ArrowRight': next = available[(index + 1) % available.length]; break;
            case 'Home': next = available[0]; break;
            case 'End': next = available.at(-1); break;
            default: return;
        }
        event.preventDefault();
        select(next);
        next.focus();
    };
    select(enabled().find(tab => tab.getAttribute('aria-selected') === 'true') ?? enabled()[0]);
    root.addEventListener('click', activate);
    root.addEventListener('focusin', activate);
    root.addEventListener('keydown', onKeydown);
    return {
        destroy() {
            if (destroyed) {
                return;
            }
            destroyed = true;
            root.removeEventListener('click', activate);
            root.removeEventListener('focusin', activate);
            root.removeEventListener('keydown', onKeydown);
            for (const [element, name, value] of saved) {
                if (value === null) {
                    element.removeAttribute(name);
                }
                else {
                    element.setAttribute(name, value);
                }
            }
        }
    };
}
