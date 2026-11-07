// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mountSettings } from '../../src/js/views/settings.js';

/** @returns {Promise<void>} resolves once pending promises and queued tasks have run */
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

/**
 * Mount Settings with a connected session stand-in and a sync hook.
 * @param {{pendingCount: Function, syncNow?: Function}} sync the sync hook
 * @returns {{view: HTMLElement, session: object, toaster: {show: Function}}} the parts
 */
function mountConnected(sync) {
  const view = document.body.appendChild(document.createElement('div'));
  const session = {
    state: () => 'connected',
    account: () => ({ name: 'Jane Doe', email: 'jane@example.com', server: 'https://todos.example.com' }),
    subscribe: () => () => {},
    disconnect: vi.fn(async () => {}),
  };
  const toaster = { show: vi.fn() };
  mountSettings(view, { session, sync, toaster, getStorage: () => null });
  return { view, session, toaster };
}

afterEach(() => {
  document.body.replaceChildren();
});

describe('Disconnect in Settings', () => {
  it('says so when the pending changes cannot be counted, and stays connected', async () => {
    const { view, session, toaster } = mountConnected({ pendingCount: () => Promise.reject(new Error('queue closed')) });
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    [...view.querySelectorAll('button')].find((button) => button.textContent === 'Disconnect').click();
    await settle();
    expect(toaster.show).toHaveBeenCalledWith('The pending changes could not be counted, so you are still connected. Try again.');
    expect(document.querySelector('dialog')).toBeNull();
    expect(session.disconnect).not.toHaveBeenCalled();
    expect(error).toHaveBeenCalled();
    error.mockRestore();
  });
});

describe('Connection in Settings while connected', () => {
  it('shows the sync state and a Sync log link', () => {
    const { view } = mountConnected({ pendingCount: async () => 0, state: () => ({ status: 'offline', pending: 2 }), subscribe: () => () => {} });
    expect(view.querySelector('.settings__sync-state').textContent).toBe('Sync state: Offline');
    expect(view.querySelector('a[href="#/settings/sync-log"]').textContent).toBe('Sync log');
  });
});

describe('Connect in Settings', () => {
  it('opens the connect flow through the navigate option, not by setting the location hash', () => {
    const view = document.body.appendChild(document.createElement('div'));
    const session = { state: () => 'local', account: () => null, subscribe: () => () => {} };
    const navigate = vi.fn();
    const before = location.hash;
    mountSettings(view, { session, navigate, toaster: { show: vi.fn() }, getStorage: () => null });
    [...view.querySelectorAll('button')].find((button) => button.textContent === 'Connect').click();
    expect(navigate).toHaveBeenCalledWith('#/connect');
    expect(location.hash).toBe(before);
  });
});
