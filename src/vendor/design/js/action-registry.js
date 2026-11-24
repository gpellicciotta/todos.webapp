/**
 * Action registry for app and routed-view actions (ADR-0003, ADR-0004).
 *
 * - Stores action descriptors (`id`, `title`, `description`, `href` or `run`, `disabled`, `disabled-reason`) with run counts.
 * - Supports optional active-view scoping (`getScope`), state toggles with disabled reasons, and `CustomEvent` notifications.
 * - Routes `href` actions through an app-provided `onNavigate` callback so routing stays outside the registry.
 * - Delegates clicks on `[data-action]` elements inside attached roots, blocking disabled actions and `aria-disabled` controls.
 */

export const ACTION_ADDED_EVENT = 'action-added';
export const ACTION_REMOVED_EVENT = 'action-removed';
export const ACTION_STATE_CHANGED_EVENT = 'action-state-changed';
export const ACTION_RUN_EVENT = 'action-run';

/**
 * Normalize an optional disabled reason string; empty values clear the reason.
 * @param {unknown} reason candidate reason
 * @returns {string|undefined} normalized non-empty string, or `undefined`
 */
function normalizeReason(reason) {
    if (reason === undefined || reason === null || reason === '') {
        return undefined;
    }
    return String(reason);
}

/**
 * Create an action registry that manages action state, events, and optional `[data-action]` click delegation.
 * @param {object} [options] registry options
 * @param {Array<object>|Record<string, object>} [options.actions] initial actions, loaded without emitting `action-added`
 * @param {() => string|null|undefined} [options.getScope] returns the active view scope id checked before global ids
 * @param {(href: string, action: object, data: unknown) => void} [options.onNavigate] callback invoked when running an `href` action
 * @param {HTMLElement|Document|null} [options.root] optional DOM root to attach `[data-action]` click delegation immediately
 * @param {Document} [options.document] document used to resolve `CustomEvent`, `root.ownerDocument` or global by default
 * @param {EventTarget} [options.events] event target for dispatching registry events, a fresh `EventTarget` by default
 * @returns {{addAction: Function, removeAction: Function, getAction: Function, getActions: Function, isActionEnabled: Function, enableAction: Function, disableAction: Function, toggleAction: Function, runAction: Function, addEventListener: Function, removeEventListener: Function, attach: Function, detach: Function, destroy: Function}}
 *   the action registry controller
 */
export function createActionRegistry(options = {}) {
    const doc = options.document ?? options.root?.ownerDocument ?? globalThis.document;
    const EventCtor = doc?.defaultView?.CustomEvent ?? globalThis.CustomEvent;
    const eventTarget = options.events ?? new EventTarget();
    const getScope = typeof options.getScope === 'function' ? options.getScope : null;
    const onNavigate = typeof options.onNavigate === 'function' ? options.onNavigate : null;

    const actions = new Map();
    const attachedRoots = new Map();
    const trackedListeners = [];
    let destroyed = false;

    /**
     * Dispatch a `CustomEvent` on the registry's event target.
     * @param {string} type event name
     * @param {object} detail event payload
     */
    function emit(type, detail) {
        if (destroyed) {
            return;
        }
        eventTarget.dispatchEvent(new EventCtor(type, { detail }));
    }

    /**
     * Register a new action descriptor.
     * @param {object} action descriptor carrying at least a non-empty string `id`
     * @param {boolean} [emitEvent] whether to emit `ACTION_ADDED_EVENT`, `true` by default
     * @returns {object|undefined} the stored action record
     */
    function addAction(action, emitEvent = true) {
        if (destroyed) {
            return undefined;
        }
        if (!action || (typeof action !== 'object' && typeof action !== 'function')) {
            throw new TypeError('Expecting action object');
        }
        if (typeof action.id !== 'string' || action.id.trim().length === 0) {
            throw new TypeError("Action object must have a non-empty string 'id' property");
        }
        if (actions.has(action.id)) {
            throw new Error(`Action with ID '${action.id}' already exists`);
        }

        const record = {
            ...action,
            id: action.id,
            disabled: Boolean(action.disabled),
            'run-count': 0
        };
        const initialReason = normalizeReason(action['disabled-reason'] ?? action.disabledReason);
        if (initialReason !== undefined) {
            record['disabled-reason'] = initialReason;
        }
        else {
            delete record['disabled-reason'];
        }
        delete record.disabledReason;

        actions.set(record.id, record);
        if (emitEvent) {
            emit(ACTION_ADDED_EVENT, { action: record });
        }
        return record;
    }

    /**
     * Remove a registered action by its exact ID.
     * @param {string} actionId ID of the action to remove
     * @returns {boolean} `true` when the action existed and was removed
     */
    function removeAction(actionId) {
        if (destroyed || typeof actionId !== 'string') {
            return false;
        }
        const existing = actions.get(actionId);
        if (!existing) {
            return false;
        }
        actions.delete(actionId);
        emit(ACTION_REMOVED_EVENT, { action: existing });
        return true;
    }

    /**
     * Look up a registered action, checking the active scope (`${scope}.${actionId}`) before global IDs.
     * @param {string} actionId action ID or short view-scoped ID
     * @returns {object|undefined} matching action record, or `undefined`
     */
    function getAction(actionId) {
        if (destroyed || typeof actionId !== 'string' || actionId.length === 0) {
            return undefined;
        }
        const scope = getScope?.();
        if (typeof scope === 'string' && scope.length > 0 && !actionId.startsWith(`${scope}.`)) {
            const scoped = actions.get(`${scope}.${actionId}`);
            if (scoped) {
                return scoped;
            }
        }
        return actions.get(actionId);
    }

    /**
     * Return all currently registered actions in insertion order.
     * @returns {object[]} registered action records
     */
    function getActions() {
        return [...actions.values()];
    }

    /**
     * Tell whether an action is registered and currently enabled.
     * @param {string} actionId action ID
     * @returns {boolean} `true` when registered and not disabled
     */
    function isActionEnabled(actionId) {
        const action = getAction(actionId);
        return Boolean(action && !action.disabled);
    }

    /**
     * Enable a disabled action, clearing its `disabled-reason` and emitting `ACTION_STATE_CHANGED_EVENT`.
     * @param {string} actionId action ID
     * @returns {boolean} `true` when the action changed state
     */
    function enableAction(actionId) {
        const action = getAction(actionId);
        if (!action || !action.disabled) {
            return false;
        }
        action.disabled = false;
        delete action['disabled-reason'];
        emit(ACTION_STATE_CHANGED_EVENT, { action });
        return true;
    }

    /**
     * Disable an action with an optional reason, emitting `ACTION_STATE_CHANGED_EVENT` when state or reason changes.
     * @param {string} actionId action ID
     * @param {string} [reason] explanation for why the action is disabled
     * @returns {boolean} `true` when the disabled state or reason changed
     */
    function disableAction(actionId, reason) {
        const action = getAction(actionId);
        if (!action) {
            return false;
        }
        const nextReason = normalizeReason(reason);
        const wasDisabled = Boolean(action.disabled);
        const prevReason = action['disabled-reason'];
        if (wasDisabled && prevReason === nextReason) {
            return false;
        }
        action.disabled = true;
        if (nextReason !== undefined) {
            action['disabled-reason'] = nextReason;
        }
        else {
            delete action['disabled-reason'];
        }
        emit(ACTION_STATE_CHANGED_EVENT, { action });
        return true;
    }

    /**
     * Toggle an action between enabled and disabled states.
     * @param {string} actionId action ID
     * @param {string} [disableReason] optional reason applied when toggling to disabled
     * @returns {boolean} the resulting enabled state (`false` when missing or disabled, `true` when enabled)
     */
    function toggleAction(actionId, disableReason) {
        const action = getAction(actionId);
        if (!action) {
            return false;
        }
        if (!action.disabled) {
            disableAction(actionId, disableReason);
            return false;
        }
        enableAction(actionId);
        return true;
    }

    /**
     * Run a registered action if enabled: invoke `action.run`, route `href` through `onNavigate`, increment `run-count`, and dispatch events.
     * @param {string} actionId action ID
     * @param {unknown} [data] optional payload forwarded to the handler, navigator, and events
     * @returns {boolean} `true` when the action ran
     */
    function runAction(actionId, data) {
        if (destroyed) {
            return false;
        }
        const action = getAction(actionId);
        if (!action || action.disabled) {
            return false;
        }
        action['run-count'] += 1;
        if (typeof action.run === 'function') {
            action.run(data, action);
        }
        if (typeof action.href === 'string' && action.href.length > 0) {
            onNavigate?.(action.href, action, data);
        }
        emit(action.id, { action, data });
        emit(ACTION_RUN_EVENT, { action, data });
        return true;
    }

    /**
     * Subscribe to registry events (`ACTION_ADDED_EVENT`, `ACTION_REMOVED_EVENT`, `ACTION_STATE_CHANGED_EVENT`, `ACTION_RUN_EVENT`, or an action ID).
     * @param {string} type event type
     * @param {EventListenerOrEventListenerObject} listener event callback
     * @param {boolean|AddEventListenerOptions} [listenerOptions] listener options
     */
    function addEventListener(type, listener, listenerOptions) {
        if (destroyed || !type || !listener) {
            return;
        }
        eventTarget.addEventListener(type, listener, listenerOptions);
        trackedListeners.push({ type, listener, options: listenerOptions });
    }

    /**
     * Unsubscribe from registry events.
     * @param {string} type event type
     * @param {EventListenerOrEventListenerObject} listener event callback
     * @param {boolean|EventListenerOptions} [listenerOptions] listener options
     */
    function removeEventListener(type, listener, listenerOptions) {
        eventTarget.removeEventListener(type, listener, listenerOptions);
        const index = trackedListeners.findIndex((entry) => entry.type === type && entry.listener === listener);
        if (index !== -1) {
            trackedListeners.splice(index, 1);
        }
    }

    /**
     * Delegate clicks on `[data-action]` elements inside `root` to `runAction`, blocking disabled actions and `aria-disabled` controls.
     * @param {HTMLElement|Document} root container receiving delegated clicks
     * @returns {() => void} cleanup function that detaches this root
     */
    function attach(root) {
        if (destroyed || !root) {
            return () => {};
        }
        if (attachedRoots.has(root)) {
            return () => detach(root);
        }

        /**
         * Handle clicks on `[data-action]` elements within `root`.
         * @param {MouseEvent} event click event
         */
        function onClick(event) {
            if (destroyed || event.defaultPrevented) {
                return;
            }
            const rawTarget = event.target;
            const elementTarget = rawTarget && rawTarget.nodeType === 1 ? rawTarget : rawTarget?.parentElement;
            const trigger = elementTarget?.closest?.('[data-action]');
            if (!trigger || !root.contains(trigger)) {
                return;
            }
            const actionId = trigger.getAttribute('data-action');
            if (!actionId) {
                return;
            }
            const action = getAction(actionId);
            if (!action) {
                return;
            }
            const elementDisabled = Boolean(trigger.disabled) || trigger.getAttribute('aria-disabled') === 'true';
            if (action.disabled || elementDisabled) {
                event.preventDefault();
                return;
            }
            const isNativeLink = trigger.tagName === 'A' && trigger.hasAttribute('href');
            const modifiedClick = Boolean(event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || (typeof event.button === 'number' && event.button !== 0));
            if (isNativeLink && modifiedClick) {
                return;
            }
            const hasHref = typeof action.href === 'string' && action.href.length > 0;
            if (!(hasHref && !onNavigate && isNativeLink)) {
                event.preventDefault();
            }
            runAction(actionId, { ...trigger.dataset });
        }

        root.addEventListener('click', onClick);
        attachedRoots.set(root, onClick);
        return () => detach(root);
    }

    /**
     * Stop delegating clicks on `root`, or on every attached root when omitted.
     * @param {HTMLElement|Document} [root] specific root to detach
     */
    function detach(root) {
        if (root) {
            const handler = attachedRoots.get(root);
            if (handler) {
                root.removeEventListener('click', handler);
                attachedRoots.delete(root);
            }
            return;
        }
        for (const [targetRoot, handler] of attachedRoots.entries()) {
            targetRoot.removeEventListener('click', handler);
        }
        attachedRoots.clear();
    }

    /**
     * Detach all click delegation listeners, remove registry event listeners, and clear stored actions.
     */
    function destroy() {
        if (destroyed) {
            return;
        }
        destroyed = true;
        detach();
        for (const { type, listener, options: listenerOptions } of trackedListeners) {
            eventTarget.removeEventListener(type, listener, listenerOptions);
        }
        trackedListeners.length = 0;
        actions.clear();
    }

    // Register initial actions silently during startup.
    if (Array.isArray(options.actions)) {
        for (const action of options.actions) {
            if (action) {
                addAction(action, false);
            }
        }
    }
    else if (options.actions && typeof options.actions === 'object') {
        for (const [id, descriptor] of Object.entries(options.actions)) {
            if (descriptor && typeof descriptor === 'object') {
                addAction({ ...descriptor, id: descriptor.id ?? id }, false);
            }
        }
    }

    if (options.root) {
        attach(options.root);
    }

    return {
        addAction,
        removeAction,
        getAction,
        getActions,
        isActionEnabled,
        enableAction,
        disableAction,
        toggleAction,
        runAction,
        addEventListener,
        removeEventListener,
        attach,
        detach,
        destroy
    };
}

/**
 * Create an action registry and immediately attach `[data-action]` click delegation to `root`.
 * @param {HTMLElement|Document} root container receiving delegated `[data-action]` clicks
 * @param {object} [options] options forwarded to `createActionRegistry`
 * @returns {ReturnType<typeof createActionRegistry>} the action registry controller
 */
export function attachActionRegistry(root, options = {}) {
    return createActionRegistry({ ...options, root });
}
