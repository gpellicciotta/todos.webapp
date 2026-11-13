/** Enhance native checkbox rows. Call refresh after changing rows or their availability. */
export function attachSelection(root, { formatCount = count => `${count} selected` } = {}) {
    const all = root.querySelector('[data-selection-all]');
    const count = root.querySelector('[data-selection-count]');
    const bar = root.querySelector('[data-selection-bar]');
    const doc = root.ownerDocument;
    const original = { count: count.textContent, hidden: bar.hidden, checked: all.checked, mixed: all.indeterminate, disabled: all.disabled };
    let anchor = null;
    let destroyed = false;
    const items = () => [...root.querySelectorAll('[data-selection-item]')]
        .filter(item => item.closest('[data-selection-root]') === root && !item.matches(':disabled') && !item.closest('[hidden]'));
    const selected = () => items().filter(item => item.checked);

    function refresh() {
        if (destroyed) {
            return;
        }
        const available = items();
        const size = selected().length;
        const message = formatCount(size);
        if (count.textContent !== message) {
            count.textContent = message;
        }
        all.checked = size > 0 && size === available.length;
        all.indeterminate = size > 0 && size < available.length;
        all.disabled = available.length === 0;
        if ((size === 0 && bar.contains(doc.activeElement)) || (all.disabled && doc.activeElement === all)) {
            (all.disabled ? root : all).focus();
        }
        bar.hidden = size === 0;
        if (!available.includes(anchor)) {
            anchor = null;
        }
    }

    function range(item, shifted) {
        const available = items();
        if (shifted && available.includes(anchor)) {
            const from = available.indexOf(anchor);
            const to = available.indexOf(item);
            for (const row of available.slice(Math.min(from, to), Math.max(from, to) + 1)) {
                row.checked = item.checked;
            }
        }
        else {
            anchor = item;
        }
        refresh();
    }

    function clear() {
        if (destroyed) {
            return;
        }
        for (const item of items()) {
            item.checked = false;
        }
        anchor = null;
        refresh();
    }

    function click(event) {
        const target = event.target;
        if (target.closest('[data-selection-root]') !== root) {
            return;
        }
        if (items().includes(target)) {
            range(target, event.shiftKey);
        }
        else if (target === all) {
            for (const item of items()) {
                item.checked = all.checked;
            }
            anchor = null;
            refresh();
        }
        else if (target.closest('[data-selection-clear]')) {
            clear();
        }
        else {
            const action = target.closest('[data-selection-action]');
            if (action && !action.matches(':disabled') && selected().length) {
                root.dispatchEvent(new doc.defaultView.CustomEvent('selection:action', {
                    bubbles: true,
                    detail: { action: action.dataset.selectionAction, values: selected().map(item => item.value) }
                }));
            }
        }
    }

    function keydown(event) {
        if (event.key === ' ' && event.shiftKey && items().includes(event.target)) {
            event.preventDefault();
            if (!event.repeat) {
                event.target.checked = !event.target.checked;
                range(event.target, true);
            }
        }
    }

    root.addEventListener('click', click);
    root.addEventListener('keydown', keydown);
    root.addEventListener('change', refresh);
    refresh();
    return {
        get selectedValues() {
            return selected().map(item => item.value);
        },
        clear,
        refresh,
        destroy() {
            if (destroyed) {
                return;
            }
            destroyed = true;
            root.removeEventListener('click', click);
            root.removeEventListener('keydown', keydown);
            root.removeEventListener('change', refresh);
            count.textContent = original.count;
            bar.hidden = original.hidden;
            all.checked = original.checked;
            all.indeterminate = original.mixed;
            all.disabled = original.disabled;
        }
    };
}
