/**
 * Register an app-owned worker and offer controlled updates through an injected toaster.
 * The worker must handle `{type: 'skip-waiting'}` and claim clients after activation.
 * First installs and updates activated elsewhere never force a reload.
 * Registration errors reject the promise so the app can report them in its own language.
 */
export async function watchWorkerUpdates({
    serviceWorker = globalThis.navigator?.serviceWorker,
    script,
    toaster,
    messages = { ready: 'An update is ready.', action: 'Update' },
    reload = () => globalThis.location.reload(),
    onUpdatedElsewhere = () => {},
} = {}) {
    if (!serviceWorker) {
        return { destroy() {} };
    }
    const removers = [];
    const seen = new Set();
    let controlled = Boolean(serviceWorker.controller);
    let updating = false;
    let reloaded = false;
    let offered = false;
    let destroyed = false;
    let offerVersion = 0;
    let dismiss;
    let registration;
    function listen(target, type, handler) {
        target.addEventListener(type, handler);
        removers.push(() => target.removeEventListener(type, handler));
    }
    function destroy() {
        destroyed = true;
        for (const remove of removers) {
            remove();
        }
        dismiss?.();
    }
    function reloadOnce() {
        if (!destroyed && !reloaded) {
            reloaded = true;
            reload();
        }
    }
    function offer(worker) {
        if (offered || !controlled || destroyed) {
            return;
        }
        offered = true;
        const version = ++offerVersion;
        dismiss = toaster.show(messages.ready, {
            actionLabel: messages.action,
            persistent: true,
            undo: false,
            onAction() {
                if (destroyed || updating || reloaded || version !== offerVersion) {
                    return;
                }
                updating = true;
                const waiting = registration.waiting ?? (worker.state === 'installed' ? worker : null);
                if (waiting) {
                    waiting.postMessage({ type: 'skip-waiting' });
                }
                else {
                    reloadOnce();
                }
            }
        });
    }
    function track(worker) {
        if (!worker || seen.has(worker)) {
            return;
        }
        seen.add(worker);
        if (worker.state === 'installed') {
            offer(worker);
        }
        else {
            listen(worker, 'statechange', () => {
                if (worker.state === 'installed') {
                    offer(worker);
                }
            });
        }
    }
    listen(serviceWorker, 'controllerchange', () => {
        if (!controlled) {
            controlled = true;
        }
        else if (updating && !reloaded) {
            reloadOnce();
        }
        else if (!updating && !reloaded) {
            const version = ++offerVersion;
            dismiss?.();
            dismiss = toaster.show(messages.ready, {
                actionLabel: messages.reload ?? 'Reload',
                persistent: true,
                undo: false,
                onAction() {
                    if (version === offerVersion) {
                        reloadOnce();
                    }
                }
            });
            onUpdatedElsewhere();
        }
    });
    try {
        registration = await serviceWorker.register(script);
        listen(registration, 'updatefound', () => track(registration.installing));
        track(registration.waiting);
        track(registration.installing);
    }
    catch (error) {
        destroy();
        throw error;
    }
    return { destroy };
}
