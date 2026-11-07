/**
 * Service worker registration with controlled updates (`TEC-19`).
 *
 * A new worker waits after it installs. The page shows a lasting Update toast; Update asks the worker to
 * skip waiting, and the page reloads once when the new worker takes control.
 * A tab that did not click Update learns of the new worker through `onUpdatedElsewhere`, which offers a reload.
 * The first install has no controller yet, so it shows no toast and its claim of the page changes nothing.
 */

/**
 * Register the worker and offer each update the user can choose.
 * @param {object} options the dependencies
 * @param {ServiceWorkerContainer} [options.serviceWorker] the page's container, the browser's by default
 * @param {string} options.script the worker script URL
 * @param {{show: (message: string, settings?: object) => () => void}} options.toaster the toaster
 * @param {{ready: string, action: string}} options.messages the toast text and its action label
 * @param {() => void} options.onUpdatedElsewhere called when another tab activated a new worker
 * @param {() => void} [options.reload] reloads the page
 * @returns {Promise<void>} resolves once registration finished and its first update check ran; a failure is logged
 */
export async function watchWorkerUpdates({
  serviceWorker = globalThis.navigator?.serviceWorker, script, toaster, messages, onUpdatedElsewhere,
  reload = () => globalThis.location.reload(),
}) {
  if (!serviceWorker) {
    return;
  }
  let offered = false;
  let updating = false;
  let reloaded = false;
  let controlled = Boolean(serviceWorker.controller);
  let registration = null;

  /**
   * Show the Update toast once per start, for a worker that waits behind a running one.
   * @param {ServiceWorker} worker the waiting worker
   */
  function offer(worker) {
    if (offered || !controlled) {
      return;
    }
    offered = true;
    toaster.show(messages.ready, {
      actionLabel: messages.action,
      persistent: true,
      undo: false,
      onAction: () => {
        updating = true;
        // A newer worker may have replaced the one the toast was for; the waiting one is the one to activate.
        (registration?.waiting ?? worker).postMessage({ type: 'skip-waiting' });
      },
    });
  }

  /**
   * Offer a worker once it reaches the waiting state.
   * @param {ServiceWorker} worker a worker that is installing or installed
   */
  function track(worker) {
    if (worker.state === 'installed') {
      offer(worker);
      return;
    }
    worker.addEventListener('statechange', () => {
      if (worker.state === 'installed') {
        offer(worker);
      }
    });
  }

  serviceWorker.addEventListener('controllerchange', () => {
    if (!controlled) {
      controlled = true;
      return;
    }
    if (!updating) {
      onUpdatedElsewhere();
    }
    else if (!reloaded) {
      reloaded = true;
      reload();
    }
  });

  try {
    registration = await serviceWorker.register(script);
  }
  catch (error) {
    console.error('Service worker failed:', error);
    return;
  }
  registration.addEventListener('updatefound', () => track(registration.installing));
  for (const worker of [registration.waiting, registration.installing]) {
    if (worker) {
      track(worker);
    }
  }
}
