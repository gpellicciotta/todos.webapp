/**
 * Screen action bar renderer (ADR-0003, ADR-0004): draws the screen actions of a routed view in `.app__action-bar`.
 *
 * - Renders links (`a.button.button--secondary`) for actions with `href` and native buttons (`button.button--secondary`) otherwise.
 * - Marks disabled buttons with native `disabled` and disabled links with `aria-disabled="true"`, blocking activation on disabled links.
 * - Shows a disabled action's `disabled-reason` (or `description`) as `title` and `aria-description` hints.
 * - Removes `.app__action-bar` from the DOM when empty so the shell grid drops its track, and redraws on action state changes.
 * - Uses DOM APIs only (`createElement`, `textContent`, `setAttribute`), escaping all action text and attributes, and uses `data-*` hooks only.
 */

export const ACTION_STATE_CHANGED_EVENT = 'action-state-changed';

/**
 * Find the first direct child of `parent` carrying `attribute`.
 * @param {HTMLElement} parent container element
 * @param {string} attribute hook attribute name
 * @returns {HTMLElement|null} matching child element, or `null`
 */
function directChildWithAttribute(parent, attribute) {
    for (const child of parent.children) {
        if (child.hasAttribute(attribute)) {
            return child;
        }
    }
    return null;
}

/**
 * Attach a screen action bar renderer to a shell root element.
 * @param {HTMLElement} root shell root element (normally `document.body`) that owns `.app__action-bar`
 * @param {object} [options] renderer options
 * @param {object} [options.app] app object offering `getAction(id)` and event listener methods
 * @param {(id: string) => object|null|undefined} [options.getAction] action resolver, overriding `app.getAction`
 * @param {{addEventListener?: Function, removeEventListener?: Function}} [options.events] state-change event target, `app` by default
 * @param {string} [options.eventType] event name that triggers a redraw, `'action-state-changed'` by default
 * @param {HTMLElement|null} [options.before] direct child of `root` to insert `.app__action-bar` before; falls back to `[data-screen-action-bar-before]`
 * @param {Document} [options.document] document that creates elements, `root.ownerDocument` by default
 * @param {(action: object, event: MouseEvent) => void} [options.onAction] optional click handler for enabled items
 * @returns {{setScreenActions: (actions?: Array<string|object|null|undefined>) => void, render: () => void, getElement: () => HTMLElement|null, getActions: () => object[], destroy: () => void}}
 *   the screen action bar controller
 */
export function attachScreenActionBar(root, options = {}) {
    const doc = options.document ?? root?.ownerDocument ?? globalThis.document;
    const app = options.app ?? null;
    const resolveAction = options.getAction ?? (typeof app?.getAction === 'function' ? (id) => app.getAction(id) : null);
    const eventSource = options.events ?? app;
    const eventType = options.eventType ?? ACTION_STATE_CHANGED_EVENT;
    const before = options.before ?? null;
    const onAction = options.onAction ?? null;

    let storedEntries = [];
    let barEl = root ? directChildWithAttribute(root, 'data-screen-action-bar') : null;
    let renderedActions = new Map();
    let destroyed = false;

    /**
     * Resolve stored IDs and direct descriptors into the ordered list of active action objects.
     * @returns {object[]} resolved action objects
     */
    function resolveEntries() {
        const actions = [];
        for (const entry of storedEntries) {
            if (!entry) {
                continue;
            }
            const action = typeof entry === 'string' ? resolveAction?.(entry) : (typeof entry === 'object' ? entry : null);
            if (action && typeof action === 'object') {
                actions.push(action);
            }
        }
        return actions;
    }

    /**
     * Block activation of disabled links and forward enabled item clicks to `onAction`.
     * @param {MouseEvent} event click event inside the bar
     */
    function onBarClick(event) {
        const item = event.target?.closest?.('[data-screen-action-bar-item]');
        if (!item || !barEl?.contains(item)) {
            return;
        }
        if (item.getAttribute('aria-disabled') === 'true' || item.disabled) {
            event.preventDefault();
            event.stopPropagation();
            return;
        }
        const action = renderedActions.get(item);
        if (action && typeof onAction === 'function') {
            onAction(action, event);
        }
    }

    /**
     * Remove the action bar element from the DOM and release its click listener.
     */
    function removeBar() {
        if (!barEl) {
            return;
        }
        barEl.removeEventListener('click', onBarClick);
        barEl.remove();
        barEl = null;
        renderedActions.clear();
    }

    /**
     * Build one button or link element for an action descriptor.
     * @param {object} action action descriptor
     * @returns {HTMLAnchorElement|HTMLButtonElement} rendered control
     */
    function buildControl(action) {
        const disabled = Boolean(action.disabled);
        const disabledReason = disabled ? (action['disabled-reason'] ?? action.disabledReason ?? '') : '';
        const hint = String(disabledReason || action.description || '');
        const isLink = typeof action.href === 'string' && action.href.length > 0;
        const control = doc.createElement(isLink ? 'a' : 'button');
        control.className = 'button button--secondary';
        control.setAttribute('data-screen-action-bar-item', '');
        if (isLink) {
            control.setAttribute('href', action.href);
            if (disabled) {
                control.setAttribute('aria-disabled', 'true');
            }
        }
        else {
            control.type = 'button';
            if (disabled) {
                control.disabled = true;
            }
        }
        if (action.id !== undefined && action.id !== null && String(action.id) !== '') {
            control.setAttribute('data-action', String(action.id));
        }
        if (hint) {
            control.setAttribute('title', hint);
            control.setAttribute('aria-description', hint);
        }
        control.textContent = String(action.title ?? action.label ?? '');
        return control;
    }

    /**
     * Redraw the screen action bar from the current actions, removing it when empty.
     */
    function render() {
        if (destroyed || !root) {
            return;
        }
        const actions = resolveEntries();
        if (actions.length === 0) {
            removeBar();
            return;
        }
        if (!barEl) {
            barEl = doc.createElement('div');
            barEl.className = 'app__action-bar';
            barEl.setAttribute('data-screen-action-bar', '');
            barEl.addEventListener('click', onBarClick);
        }
        if (barEl.parentNode !== root) {
            const anchor = before && before.parentNode === root
                ? before
                : directChildWithAttribute(root, 'data-screen-action-bar-before');
            root.insertBefore(barEl, anchor);
        }
        const active = doc.activeElement;
        const focusedActionId = active && barEl.contains(active) ? active.getAttribute('data-action') : null;

        renderedActions = new Map();
        const nodes = actions.map((action) => {
            const control = buildControl(action);
            renderedActions.set(control, action);
            return control;
        });
        barEl.replaceChildren(...nodes);

        if (focusedActionId !== null) {
            const match = nodes.find((node) => node.getAttribute('data-action') === focusedActionId && !node.disabled);
            match?.focus();
        }
    }

    /**
     * Set the ordered screen actions (IDs or action objects) and redraw the bar.
     * @param {Array<string|object|null|undefined>} [actions] screen action IDs or descriptors
     */
    function setScreenActions(actions = []) {
        if (destroyed) {
            return;
        }
        storedEntries = Array.isArray(actions) ? actions.filter(Boolean) : [];
        render();
    }

    /**
     * Stop listening for state changes and remove the bar from the DOM.
     */
    function destroy() {
        if (destroyed) {
            return;
        }
        destroyed = true;
        eventSource?.removeEventListener?.(eventType, render);
        removeBar();
        storedEntries = [];
    }

    if (barEl) {
        barEl.addEventListener('click', onBarClick);
    }
    eventSource?.addEventListener?.(eventType, render);

    return {
        setScreenActions,
        render,
        getElement: () => barEl,
        getActions: () => resolveEntries(),
        destroy
    };
}
