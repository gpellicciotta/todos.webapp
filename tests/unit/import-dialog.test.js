// @vitest-environment happy-dom
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { openImportDialog } from '../../src/js/views/import-dialog.js';

const BACKUP = readFileSync('tests/fixtures/backup-v1.json', 'utf8');
const COUNTS = { added: 1, updated: 0, binned: 0, removed: 0, skipped: 0 };

/**
 * Pick a file in the dialog's file field.
 * @param {HTMLInputElement} input the file field
 * @param {() => Promise<string>} text reads the file
 */
function pick(input, text) {
  Object.defineProperty(input, 'files', { configurable: true, value: [{ name: 'todos-backup.json', text }] });
  input.dispatchEvent(new Event('change'));
}

/** @returns {Promise<void>} resolves once pending promises and queued tasks have run */
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

/**
 * Open the dialog on an empty store stand-in that holds each import until the test settles it.
 * @returns {object} the dialog, its controls, the store, its pending imports, and the dialog's promise
 */
function open(opener = document.body.appendChild(document.createElement('button'))) {
  const imports = [];
  const store = {
    snapshot: async () => ({ lists: [], tasks: [], memberships: [], notes: [] }),
    applyChanges: vi.fn(() => imports[imports.push(Promise.withResolvers()) - 1].promise),
  };
  const closed = openImportDialog(document, { store, opener });
  const dialog = document.querySelector('dialog');
  const [cancel, importButton] = dialog.querySelectorAll('.dialog__actions button');
  return {
    dialog, store, imports, closed, cancel, importButton, input: dialog.querySelector('input[type="file"]'),
    radios: [...dialog.querySelectorAll('input[type="radio"]')], closeButton: dialog.querySelector('.icon-button'),
    error: dialog.querySelector('[role="alert"]'),
  };
}

/**
 * Open the dialog, pick the fixture backup, and start the import.
 * @returns {Promise<object>} the parts of `open`
 */
async function startImport() {
  const parts = open();
  pick(parts.input, async () => BACKUP);
  await settle();
  parts.importButton.click();
  await settle();
  expect(parts.store.applyChanges).toHaveBeenCalledTimes(1);
  return parts;
}

afterEach(() => {
  document.body.replaceChildren();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

/**
 * Pretend the viewport is compact or wide for the 64rem media query.
 * @param {boolean} compact true below 64rem
 */
function viewport(compact) {
  const listeners = new Set();
  const media = {
    matches: compact,
    media: '(width < 64rem)',
    addEventListener: (type, listener) => listeners.add(listener),
    removeEventListener: (type, listener) => listeners.delete(listener),
  };
  vi.stubGlobal('matchMedia', (query) => (query.includes('64rem') ? media : { ...media, matches: false }));
  window.matchMedia = globalThis.matchMedia;
  return {
    listeners,
    /** Cross the 64rem line, as a resize or a rotation does. */
    cross(nowCompact) {
      media.matches = nowCompact;
      for (const listener of [...listeners]) {
        listener({ matches: nowCompact, media: media.media });
      }
    },
  };
}

describe('openImportDialog on a wide layout', () => {
  it('opens a modal dialog on the body', () => {
    viewport(false);
    document.body.innerHTML = '<div class="app"></div>';
    const modal = vi.spyOn(HTMLDialogElement.prototype, 'showModal');
    open();
    const dialog = document.querySelector('dialog');
    expect(dialog.parentElement).toBe(document.body);
    expect(dialog.classList.contains('dialog--in-view')).toBe(false);
    expect(modal).toHaveBeenCalledTimes(1);
  });
});

describe('openImportDialog on a compact layout', () => {
  /**
   * Open the dialog on a compact viewport, inside an app root.
   * @returns {object} the parts of `open`
   */
  function openCompact() {
    viewport(true);
    document.body.innerHTML = '<div class="app"><nav id="bar"><a id="nav" href="#/lists">Lists</a></nav></div>';
    return open();
  }

  it('opens non-modally in the app root, in the view, like the editors', () => {
    viewport(true);
    document.body.innerHTML = '<div class="app"></div>';
    const modal = vi.spyOn(HTMLDialogElement.prototype, 'showModal');
    const plain = vi.spyOn(HTMLDialogElement.prototype, 'show');
    open();
    const dialog = document.querySelector('dialog');
    expect(dialog.parentElement).toBe(document.querySelector('.app'));
    expect(dialog.classList.contains('dialog--in-view')).toBe(true);
    expect(dialog.open).toBe(true);
    expect(plain).toHaveBeenCalledTimes(1);
    expect(modal).not.toHaveBeenCalled();
  });

  it('makes the covered main column inert while open, and restores it before focus returns to the opener', async () => {
    viewport(true);
    document.body.innerHTML = '<div class="app"><main class="app__main"><button id="inside" type="button">Import backup</button></main></div>';
    const opener = document.getElementById('inside');
    const main = document.querySelector('.app__main');
    opener.focus();
    const { closed, cancel } = open(opener);
    expect(main.inert).toBe(true);
    cancel.click();
    await closed;
    expect(main.inert).toBe(false);
    expect(document.activeElement).toBe(opener);
  });

  it('cancels when the viewport grows to the wide layout, and stops listening', async () => {
    const media = viewport(true);
    document.body.innerHTML = '<div class="app"><main class="app__main"></main></div>';
    const { closed } = open();
    expect(media.listeners.size).toBe(1);
    media.cross(false);
    await expect(closed).resolves.toBeNull();
    expect(media.listeners.size).toBe(0);
    expect(document.querySelector('dialog')).toBeNull();
  });

  it('stays open through a resize while the import runs', async () => {
    const media = viewport(true);
    document.body.innerHTML = '<div class="app"><main class="app__main"></main></div>';
    const { dialog, imports, closed } = await startImport();
    media.cross(false);
    await settle();
    expect(dialog.open).toBe(true);
    imports[0].resolve(COUNTS);
    await expect(closed).resolves.toEqual(COUNTS);
  });

  it('does not trap Tab, so the bars stay reachable', () => {
    const { dialog, importButton } = openCompact();
    importButton.disabled = false;
    importButton.focus();
    expect(document.activeElement).toBe(importButton);
    const event = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
    importButton.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
    expect(dialog.open).toBe(true);
  });

  it('cancels when the route changes, and the dialog goes away', async () => {
    const { closed } = openCompact();
    window.dispatchEvent(new Event('hashchange'));
    await expect(closed).resolves.toBeNull();
    expect(document.querySelector('dialog')).toBeNull();
  });

  it('stays open through a route change while the import runs', async () => {
    viewport(true);
    document.body.innerHTML = '<div class="app"></div>';
    const { dialog, imports, closed } = await startImport();
    window.dispatchEvent(new Event('hashchange'));
    await settle();
    expect(dialog.open).toBe(true);
    imports[0].resolve(COUNTS);
    await expect(closed).resolves.toEqual(COUNTS);
  });

  it('stops listening to route changes once closed', async () => {
    const { closed, cancel } = openCompact();
    const remove = vi.spyOn(window, 'removeEventListener');
    cancel.click();
    await closed;
    expect(remove).toHaveBeenCalledWith('hashchange', expect.any(Function));
  });

  it('cancels on Escape and on the close button', async () => {
    const first = openCompact();
    first.dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    await expect(first.closed).resolves.toBeNull();
    const second = openCompact();
    second.closeButton.click();
    await expect(second.closed).resolves.toBeNull();
  });
});

describe('openImportDialog', () => {
  it('locks every control while importing, so neither a second import nor a cancel can happen', async () => {
    const { dialog, radios, input, closeButton, cancel, importButton, store, imports, closed } = await startImport();
    expect([...radios, input, closeButton, cancel, importButton].every((control) => control.disabled)).toBe(true);
    radios[1].checked = true;
    radios[1].dispatchEvent(new Event('change'));
    pick(input, async () => BACKUP);
    dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    dialog.dispatchEvent(new Event('cancel', { cancelable: true }));
    await settle();
    expect(importButton.disabled).toBe(true);
    expect(dialog.open).toBe(true);
    importButton.click();
    expect(store.applyChanges).toHaveBeenCalledTimes(1);
    imports[0].resolve(COUNTS);
    await expect(closed).resolves.toEqual(COUNTS);
  });

  it('unlocks the controls after a failed import and puts focus on Import', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { radios, input, closeButton, importButton, error, imports } = await startImport();
    imports[0].reject(new Error('disk full'));
    await settle();
    expect(error.hidden).toBe(false);
    expect([...radios, input, closeButton, importButton].some((control) => control.disabled)).toBe(false);
    expect(document.activeElement).toBe(importButton);
  });

  it('ignores a late read failure of an earlier file once a newer file is shown', async () => {
    const { input, error, importButton } = open();
    const slow = Promise.withResolvers();
    pick(input, () => slow.promise);
    pick(input, async () => BACKUP);
    await settle();
    slow.reject(new Error('read failed'));
    await settle();
    expect(error.hidden).toBe(true);
    expect(importButton.disabled).toBe(false);
  });
});

describe('openImportDialog while connected', () => {
  /**
   * Open the dialog on a connected session with a sync stand-in, and pick the fixture backup.
   * @returns {Promise<object>} the parts of `open`, the sync stand-in, and the toaster
   */
  async function openConnected() {
    const imports = [];
    const store = {
      snapshot: async () => ({ lists: [], tasks: [], memberships: [], notes: [] }),
      applyChanges: vi.fn(() => imports[imports.push(Promise.withResolvers()) - 1].promise),
      queue: { getState: async () => 12 },
    };
    const listeners = new Set();
    const sync = {
      pending: 3,
      status: 'syncing',
      progress: null,
      pendingCount: async () => sync.pending,
      state: () => ({ status: sync.status, pending: sync.pending, progress: sync.progress }),
      subscribe: (listener) => {
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
      /**
       * Change the sync state and tell the listeners.
       * @param {string} status the new status
       * @param {number} pending the changes left
       */
      emit(status, pending) {
        Object.assign(sync, { status, pending });
        listeners.forEach((listener) => listener(sync.state()));
      },
      listeners,
    };
    const toaster = { show: vi.fn() };
    const opener = document.body.appendChild(document.createElement('button'));
    const closed = openImportDialog(document, { store, toaster, opener, session: { state: () => 'connected' }, sync });
    const dialog = document.querySelector('dialog');
    const input = dialog.querySelector('input[type="file"]');
    pick(input, async () => BACKUP);
    await settle();
    const [cancel, importButton] = dialog.querySelectorAll('.dialog__actions button');
    return {
      dialog, store, imports, sync, toaster, closed, cancel, importButton,
      radios: [...dialog.querySelectorAll('input[type="radio"]')],
      status: () => dialog.querySelector('.import-dialog__sync').textContent,
    };
  }

  it('disables Overwrite with a reason, keeps Merge chosen, and previews the merge', async () => {
    const { radios, dialog } = await openConnected();
    const [merge, overwrite] = radios;
    expect(merge.checked).toBe(true);
    expect(overwrite.disabled).toBe(true);
    expect(dialog.querySelector(`#${overwrite.getAttribute('aria-describedby')}`).textContent).toMatch(/not available while connected/);
    expect(dialog.querySelector('.import-dialog__counts').textContent).toBe('10 added · 0 updated · 0 to recycle bin');
  });

  it('queues the import through the store, then shows Syncing and Synced until Done closes it', async () => {
    const { store, imports, sync, toaster, closed, dialog, importButton, cancel, status } = await openConnected();
    importButton.click();
    await settle();
    expect(store.applyChanges).toHaveBeenCalledTimes(1);
    expect(store.applyChanges.mock.calls[0][1]).toEqual({ queue: true });
    imports[0].resolve(COUNTS);
    await settle();
    expect(document.querySelector('dialog')).toBe(dialog);
    expect(status()).toBe('Syncing 3 changes…');
    expect(cancel.hidden).toBe(true);
    expect(importButton.textContent).toBe('Done');
    sync.emit('syncing', 1);
    await settle();
    expect(status()).toBe('Syncing 1 change…');
    sync.emit('synced', 0);
    await settle();
    expect(status()).toBe('Synced.');
    importButton.click();
    await expect(closed).resolves.toEqual(COUNTS);
    expect(toaster.show).toHaveBeenCalledWith('Imported todos-backup.json: 1 added · 0 updated · 0 to recycle bin.');
    expect(sync.listeners.size).toBe(0);
  });

  it('does not say Synced while changes are still queued', async () => {
    const { imports, sync, importButton, status } = await openConnected();
    importButton.click();
    await settle();
    imports[0].resolve(COUNTS);
    await settle();
    sync.status = 'synced';
    sync.emit('synced', 2);
    await settle();
    expect(status()).toBe('Syncing 2 changes…');
  });

  it('says when the changes wait for a connection or a sign-in, and still closes', async () => {
    const { imports, sync, importButton, status, closed } = await openConnected();
    importButton.click();
    await settle();
    imports[0].resolve(COUNTS);
    await settle();
    sync.emit('offline', 3);
    await settle();
    expect(status()).toBe('Offline. 3 changes will sync when you are back online.');
    sync.emit('sign-in-needed', 3);
    await settle();
    expect(status()).toBe('Sign in again to sync 3 changes.');
    sync.emit('error', 3);
    await settle();
    expect(status()).toBe('Syncing failed. It will try again.');
    importButton.click();
    await expect(closed).resolves.toEqual(COUNTS);
  });

  it('leaves no sync status in local mode, where the dialog closes after the import', async () => {
    const { dialog, importButton, imports, input } = await startImport();
    expect(input).toBeTruthy();
    imports[0].resolve(COUNTS);
    await settle();
    expect(dialog.isConnected).toBe(false);
    expect(importButton.textContent).toBe('Import');
  });
});
