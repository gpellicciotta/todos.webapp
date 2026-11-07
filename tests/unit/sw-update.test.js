import { describe, expect, it, vi } from 'vitest';
import { watchWorkerUpdates } from '../../src/js/ui/sw-update.js';

const MESSAGES = { ready: 'A new version is ready', action: 'Update' };

/**
 * Build a fake service worker.
 * @param {string} state the worker state
 * @returns {EventTarget & {state: string, postMessage: import('vitest').Mock}} the worker
 */
function fakeWorker(state) {
  const worker = new EventTarget();
  worker.state = state;
  worker.postMessage = vi.fn();
  return worker;
}

/**
 * Build the page's service worker container, its registration, and the watcher's collaborators.
 * @param {{controller?: object|null, waiting?: object|null, installing?: object|null}} [start] the state at registration
 * @returns {object} the fakes and the watcher's result
 */
async function setup({ controller = fakeWorker('activated'), waiting = null, installing = null } = {}) {
  const registration = Object.assign(new EventTarget(), { waiting, installing });
  const serviceWorker = Object.assign(new EventTarget(), { controller, register: vi.fn(() => Promise.resolve(registration)) });
  const toaster = { show: vi.fn(() => () => {}) };
  const reload = vi.fn();
  const onUpdatedElsewhere = vi.fn();
  await watchWorkerUpdates({ serviceWorker, script: 'service-worker.js', toaster, messages: MESSAGES, reload, onUpdatedElsewhere });
  return { registration, serviceWorker, toaster, reload, onUpdatedElsewhere };
}

/**
 * Take the toast the watcher showed, which must exist.
 * @param {{toaster: {show: import('vitest').Mock}}} world the fakes
 * @returns {{message: string, settings: object}} the toast
 */
function toast(world) {
  const [message, settings] = world.toaster.show.mock.calls[0];
  return { message, settings };
}

describe('watchWorkerUpdates', () => {
  it('registers the worker script', async () => {
    const { serviceWorker } = await setup();
    expect(serviceWorker.register).toHaveBeenCalledWith('service-worker.js');
  });

  it('shows a lasting Update toast for a worker already waiting', async () => {
    const world = await setup({ waiting: fakeWorker('installed') });
    expect(world.toaster.show).toHaveBeenCalledTimes(1);
    expect(toast(world).message).toBe('A new version is ready');
    expect(toast(world).settings).toMatchObject({ actionLabel: 'Update', persistent: true, undo: false });
  });

  it('shows no toast when nothing waits', async () => {
    const world = await setup();
    expect(world.toaster.show).not.toHaveBeenCalled();
  });

  it('shows the toast once a newly found worker finishes installing', async () => {
    const world = await setup();
    const worker = fakeWorker('installing');
    world.registration.installing = worker;
    world.registration.dispatchEvent(new Event('updatefound'));
    expect(world.toaster.show).not.toHaveBeenCalled();
    worker.state = 'installed';
    worker.dispatchEvent(new Event('statechange'));
    expect(world.toaster.show).toHaveBeenCalledTimes(1);
  });

  it('shows no toast for the first install, which has no controller yet', async () => {
    const world = await setup({ controller: null });
    const worker = fakeWorker('installing');
    world.registration.installing = worker;
    world.registration.dispatchEvent(new Event('updatefound'));
    worker.state = 'installed';
    worker.dispatchEvent(new Event('statechange'));
    expect(world.toaster.show).not.toHaveBeenCalled();
  });

  it('shows the toast once, however many workers or events report the update', async () => {
    const waiting = fakeWorker('installed');
    const world = await setup({ waiting });
    world.registration.installing = waiting;
    world.registration.dispatchEvent(new Event('updatefound'));
    waiting.dispatchEvent(new Event('statechange'));
    expect(world.toaster.show).toHaveBeenCalledTimes(1);
  });

  it('posts skip-waiting on Update and reloads only after the controller changes', async () => {
    const waiting = fakeWorker('installed');
    const world = await setup({ waiting });
    toast(world).settings.onAction();
    expect(waiting.postMessage).toHaveBeenCalledWith({ type: 'skip-waiting' });
    expect(world.reload).not.toHaveBeenCalled();
    world.serviceWorker.dispatchEvent(new Event('controllerchange'));
    world.serviceWorker.dispatchEvent(new Event('controllerchange'));
    expect(world.reload).toHaveBeenCalledTimes(1);
    expect(world.onUpdatedElsewhere).not.toHaveBeenCalled();
  });

  it('does not reload or ask for skip-waiting until Update is clicked', async () => {
    const waiting = fakeWorker('installed');
    const world = await setup({ waiting });
    expect(waiting.postMessage).not.toHaveBeenCalled();
    expect(world.reload).not.toHaveBeenCalled();
  });

  it('tells a tab that did not click Update when another tab updated the worker', async () => {
    const world = await setup();
    world.serviceWorker.dispatchEvent(new Event('controllerchange'));
    expect(world.onUpdatedElsewhere).toHaveBeenCalledTimes(1);
    expect(world.reload).not.toHaveBeenCalled();
  });

  it('ignores the controller change of the first install claiming the page', async () => {
    const world = await setup({ controller: null });
    world.serviceWorker.dispatchEvent(new Event('controllerchange'));
    expect(world.onUpdatedElsewhere).not.toHaveBeenCalled();
    expect(world.reload).not.toHaveBeenCalled();
  });

  it('logs a failed registration and shows nothing', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const serviceWorker = Object.assign(new EventTarget(), { controller: null, register: () => Promise.reject(new Error('nope')) });
    const toaster = { show: vi.fn() };
    await watchWorkerUpdates({ serviceWorker, script: 'service-worker.js', toaster, messages: MESSAGES, reload: vi.fn(), onUpdatedElsewhere: vi.fn() });
    expect(error).toHaveBeenCalled();
    expect(toaster.show).not.toHaveBeenCalled();
    error.mockRestore();
  });
});

describe('watchWorkerUpdates with a worker still installing at registration', () => {
  it('shows the toast when that worker finishes installing', async () => {
    const installing = fakeWorker('installing');
    const world = await setup({ installing });
    expect(world.toaster.show).not.toHaveBeenCalled();
    installing.state = 'installed';
    installing.dispatchEvent(new Event('statechange'));
    expect(world.toaster.show).toHaveBeenCalledTimes(1);
  });
});
