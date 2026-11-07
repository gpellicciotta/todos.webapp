// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { attachSyncIndicator, SYNC_STRINGS } from '../../src/js/views/sync-indicator.js';
import { createSeenMarker } from '../../src/js/views/sync-log.js';

const NOW = Date.UTC(2026, 10, 7, 9, 0, 0);

/**
 * Create an in-memory storage stand-in.
 * @returns {Storage} the storage
 */
function memoryStorage() {
  const data = new Map();
  return {
    getItem: (key) => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => data.set(key, String(value)),
    removeItem: (key) => data.delete(key),
  };
}

/**
 * Create a fake engine that reports a state and lets a test change it.
 * @param {object} [state] the initial state
 * @returns {object} the engine, with `set` to change the state
 */
function fakeEngine(state = {}) {
  const listeners = new Set();
  let current = { status: 'synced', pending: 0, minimum: null, progress: null, lastSync: null, error: null, ...state };
  return {
    syncNow: vi.fn(async () => 'synced'),
    state: () => current,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    set(next) {
      current = { ...current, ...next };
      for (const listener of listeners) {
        listener(current);
      }
    },
  };
}

/**
 * Create a fake session.
 * @param {string} [state] the session state
 * @returns {object} the session, with `set` to change the state
 */
function fakeSession(state = 'connected') {
  const listeners = new Set();
  const session = {
    current: state,
    state: () => session.current,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    set(next) {
      session.current = next;
      for (const listener of listeners) {
        listener(next);
      }
    },
  };
  return session;
}

/**
 * Mount the indicator.
 * @param {object} [options] overrides: `engine`, `session`, `log`, `seen`
 * @returns {object} the parts
 */
function mount(options = {}) {
  const slot = document.body.appendChild(document.createElement('div'));
  const banners = document.body.appendChild(document.createElement('div'));
  const engine = options.engine ?? fakeEngine();
  const session = options.session ?? fakeSession();
  const storage = memoryStorage();
  const seen = options.seen ?? createSeenMarker({ getStorage: () => storage, now: () => new Date(NOW) });
  const log = options.log ?? [];
  const announce = vi.fn();
  const checkForUpdate = vi.fn();
  const indicator = attachSyncIndicator(slot, {
    engine, session, seen, banners, announce, checkForUpdate, readLog: async () => log, now: () => new Date(NOW),
  });
  return { slot, banners, engine, session, seen, log, announce, checkForUpdate, indicator };
}

/**
 * Click an element.
 * @param {Element} target the element
 */
function click(target) {
  target.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
}

/** Let promises settle. */
const settle = () => new Promise((resolve) => setTimeout(resolve));

beforeEach(() => {
  document.body.replaceChildren();
});

afterEach(() => {
  document.body.replaceChildren();
});

describe('the sync indicator states', () => {
  const cases = [
    ['local-only', { session: 'local' }, 'local', 'Local only', 'sync-local'],
    ['synced', {}, 'synced', 'Synced', 'sync-synced'],
    ['syncing', { status: 'syncing' }, 'syncing', 'Syncing', 'sync-syncing'],
    ['offline', { status: 'offline', pending: 3 }, 'offline', 'Offline · 3 pending', 'sync-offline'],
    ['sign-in-needed', { session: 'sign-in-needed', status: 'sign-in-needed' }, 'sign-in', 'Sign in needed', 'sync-sign-in'],
    ['error', { status: 'error' }, 'error', 'Sync error', 'sync-error'],
    ['update-required', { status: 'update-required', minimum: '0.3.0' }, 'update-required', 'Update required', 'alert'],
  ];

  it.each(cases)('maps %s to its icon, label, and data-state', (_name, setup, dataState, label, iconId) => {
    const { slot } = mount({ engine: fakeEngine(setup), session: fakeSession(setup.session ?? 'connected') });
    const button = slot.querySelector('.sync-indicator');
    expect(button.dataset.state).toBe(dataState);
    expect(button.querySelector('.sync-indicator__label').textContent).toBe(label);
    expect(button.querySelector('use').getAttribute('href')).toBe(`img/icons.svg#${iconId}`);
    expect(button.getAttribute('aria-haspopup')).toBe('true');
    expect(button.textContent).toContain('Sync state: ');
  });

  it('follows the engine and the session as they change', () => {
    const { slot, engine, session } = mount();
    engine.set({ status: 'syncing' });
    expect(slot.querySelector('.sync-indicator').dataset.state).toBe('syncing');
    engine.set({ status: 'offline', pending: 1 });
    expect(slot.querySelector('.sync-indicator__label').textContent).toBe('Offline · 1 pending');
    session.set('local');
    expect(slot.querySelector('.sync-indicator').dataset.state).toBe('local');
  });

  it('announces a changed state except Syncing', () => {
    const { engine, announce } = mount();
    engine.set({ status: 'syncing' });
    expect(announce).not.toHaveBeenCalled();
    engine.set({ status: 'offline', pending: 2 });
    expect(announce).toHaveBeenCalledWith('Offline · 2 pending');
    engine.set({ status: 'offline', pending: 3 });
    expect(announce).toHaveBeenCalledTimes(1);
  });
});

describe('the sync popover', () => {
  /**
   * Open the popover of a mounted indicator.
   * @param {object} parts the parts of `mount`
   * @returns {HTMLElement} the panel
   */
  function open(parts) {
    click(parts.slot.querySelector('.sync-indicator'));
    return parts.slot.querySelector('.sync-panel');
  }

  it('shows Synced with the last sync time, Sync now, and the Sync log link', () => {
    const parts = mount({ engine: fakeEngine({ lastSync: '2026-11-07T08:30:00.000Z' }) });
    const panel = open(parts);
    expect(panel.querySelector('.sync-panel__state').textContent).toBe('Synced');
    expect(panel.querySelector('.sync-panel__time').textContent).toMatch(/^Last synced /u);
    expect(panel.querySelector('[data-action="sync-now"]').textContent).toBe('Sync now');
    expect(panel.querySelector('a[href="#/settings/sync-log"]').textContent).toBe('Sync log');
  });

  it('asks the engine for an immediate run on Sync now', () => {
    const parts = mount();
    click(open(parts).querySelector('[data-action="sync-now"]'));
    expect(parts.engine.syncNow).toHaveBeenCalledTimes(1);
  });

  it('names the error and offers Retry, which runs the engine again', () => {
    const parts = mount({ engine: fakeEngine({ status: 'error', error: 'Server unavailable' }) });
    const panel = open(parts);
    expect(panel.textContent).toContain('Server unavailable');
    expect(panel.querySelector('[data-action="sync-now"]')).toBeNull();
    click(panel.querySelector('[data-action="retry"]'));
    expect(parts.engine.syncNow).toHaveBeenCalledTimes(1);
  });

  it('names the minimum version and offers Check for update when an update is required', () => {
    const parts = mount({ engine: fakeEngine({ status: 'update-required', minimum: '0.3.0' }) });
    const panel = open(parts);
    expect(panel.textContent).toContain('0.3.0');
    expect(panel.querySelector('[data-action="sync-now"]')).toBeNull();
    click(panel.querySelector('[data-action="check-update"]'));
    expect(parts.checkForUpdate).toHaveBeenCalledTimes(1);
  });

  it('says what an update is required for when no minimum is known', () => {
    const parts = mount({ engine: fakeEngine({ status: 'update-required', minimum: null }) });
    expect(open(parts).textContent).toContain(SYNC_STRINGS.updateText(null));
  });

  it('links Local only to the connect flow and holds no Sync now or Sync log link', () => {
    const parts = mount({ session: fakeSession('local') });
    const panel = open(parts);
    expect(panel.querySelector('a[href="#/connect"]')).not.toBeNull();
    expect(panel.querySelector('[data-action]')).toBeNull();
    expect(panel.querySelector('a[href="#/settings/sync-log"]')).toBeNull();
  });

  it('offers Sign in while the session needs it', () => {
    const parts = mount({ session: fakeSession('sign-in-needed'), engine: fakeEngine({ status: 'sign-in-needed' }) });
    const panel = open(parts);
    expect(panel.querySelector('a[href="#/connect"]').textContent).toBe('Sign in');
    expect(panel.querySelector('[data-action="sync-now"]')).toBeNull();
  });

  it('shows the pending count while offline', () => {
    const parts = mount({ engine: fakeEngine({ status: 'offline', pending: 3 }) });
    expect(open(parts).querySelector('.sync-panel__time').textContent).toBe('3 changes wait to sync.');
  });
});

describe('the unseen entries dot', () => {
  const entry = (time) => ({ id: time, kind: 'overwritten', time });

  it('shows the dot for a log entry newer than the last visit, with hidden text', async () => {
    const { slot } = mount({ log: [entry('2026-11-07T08:00:00.000Z')] });
    await settle();
    expect(slot.querySelector('.sync-indicator__dot')).not.toBeNull();
    expect(slot.querySelector('.sync-indicator').textContent).toContain(', new sync log entries');
  });

  it('shows no dot for an empty log', async () => {
    const { slot } = mount();
    await settle();
    expect(slot.querySelector('.sync-indicator__dot')).toBeNull();
  });

  it('clears the dot when the log is marked seen', async () => {
    const { slot, seen } = mount({ log: [entry('2026-11-07T08:00:00.000Z')] });
    await settle();
    seen.mark();
    await settle();
    expect(slot.querySelector('.sync-indicator__dot')).toBeNull();
  });

  it('shows the dot again for an entry added after the visit', async () => {
    const log = [entry('2026-11-07T08:00:00.000Z')];
    const { slot, seen, engine } = mount({ log });
    await settle();
    seen.mark();
    log.push(entry('2026-11-07T10:00:00.000Z'));
    engine.set({ status: 'synced' });
    await settle();
    expect(slot.querySelector('.sync-indicator__dot')).not.toBeNull();
  });
});

describe('the session banner', () => {
  it('shows a banner with Sign in while the session needs it, and removes it after', () => {
    const { banners, session, announce } = mount({ session: fakeSession('sign-in-needed') });
    expect(banners.querySelector('.banner').textContent).toContain('Your session expired.');
    expect(banners.querySelector('a[href="#/connect"]').textContent).toBe('Sign in');
    expect(announce).toHaveBeenCalledWith(SYNC_STRINGS.sessionExpired);
    session.set('connected');
    expect(banners.querySelector('.banner')).toBeNull();
  });

  it('shows none in local mode or while connected', () => {
    expect(mount({ session: fakeSession('local') }).banners.querySelector('.banner')).toBeNull();
    expect(mount().banners.querySelector('.banner')).toBeNull();
  });
});

describe('destroy', () => {
  it('removes the button, the panel, and the banner, and stops following the engine', () => {
    const { slot, banners, engine, indicator } = mount({ session: fakeSession('sign-in-needed') });
    indicator.destroy();
    expect(slot.querySelector('.sync-indicator')).toBeNull();
    expect(slot.querySelector('.sync-panel')).toBeNull();
    expect(banners.querySelector('.banner')).toBeNull();
    expect(() => engine.set({ status: 'error' })).not.toThrow();
  });
});
