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

describe('Delete all data in Settings', () => {
  /**
   * Mount Settings on a store stand-in.
   * @param {string} state the session state
   * @returns {{view: HTMLElement, store: object, toaster: {show: Function}}} the parts
   */
  function mountWithStore(state = 'local') {
    const view = document.body.appendChild(document.createElement('div'));
    const session = {
      state: () => state,
      account: () => ({ name: 'Jane', email: 'jane@example.com', server: 'https://todos.example.com' }),
      subscribe: () => () => {},
    };
    const store = {
      snapshot: vi.fn(async () => ({ lists: [{}, {}], tasks: [{}, {}, {}], memberships: [], notes: [] })),
      deleteAllData: vi.fn(async () => ({ lists: 2, tasks: 3 })),
    };
    const toaster = { show: vi.fn() };
    mountSettings(view, { session, store, toaster, getStorage: () => null });
    return { view, store, toaster };
  }

  const find = (root, label) => [...root.querySelectorAll('button')].find((button) => button.textContent === label);
  const typed = (input, text) => {
    input.value = text;
    input.dispatchEvent(new Event('input', { bubbles: true }));
  };

  it('puts a danger button last in the Data section', () => {
    const { view } = mountWithStore();
    const buttons = [...view.querySelector('[aria-labelledby="settings-data"]').querySelectorAll('button')];
    expect(buttons.at(-1).textContent).toBe('Delete all data');
    expect(buttons.at(-1).classList.contains('button--danger')).toBe(true);
    expect(buttons.at(-1).disabled).toBe(false);
  });

  it('is disabled with a hint while connected', () => {
    const { view } = mountWithStore('connected');
    const button = find(view, 'Delete all data');
    expect(button.disabled).toBe(true);
    const hint = document.getElementById(button.getAttribute('aria-describedby'));
    expect(hint.textContent).toBe('Disconnect first. Deleting here never removes data from your account.');
  });

  it('keeps Delete everything disabled until DELETE is typed exactly', async () => {
    const { view, store } = mountWithStore();
    find(view, 'Delete all data').click();
    await settle();
    const dialog = document.querySelector('dialog');
    expect(dialog.textContent).toContain('2 lists, 3 tasks');
    const confirm = find(dialog, 'Delete everything');
    expect(confirm.disabled).toBe(true);
    const input = dialog.querySelector('input');
    for (const text of ['delete', 'DELETE ', 'DELET', '']) {
      typed(input, text);
      expect(confirm.disabled).toBe(true);
    }
    typed(input, 'DELETE');
    expect(confirm.disabled).toBe(false);
    confirm.click();
    await settle();
    expect(store.deleteAllData).toHaveBeenCalledTimes(1);
  });

  it('toasts on success and closes the dialog', async () => {
    const { view, toaster } = mountWithStore();
    find(view, 'Delete all data').click();
    await settle();
    typed(document.querySelector('dialog input'), 'DELETE');
    find(document.querySelector('dialog'), 'Delete everything').click();
    await settle();
    expect(toaster.show).toHaveBeenCalledWith('All data deleted.');
    expect(document.querySelector('dialog')).toBeNull();
  });

  it('calls nothing on Cancel or Escape', async () => {
    const { view, store } = mountWithStore();
    find(view, 'Delete all data').click();
    await settle();
    typed(document.querySelector('dialog input'), 'DELETE');
    find(document.querySelector('dialog'), 'Cancel').click();
    await settle();
    expect(document.querySelector('dialog')).toBeNull();
    find(view, 'Delete all data').click();
    await settle();
    document.querySelector('dialog').dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await settle();
    expect(document.querySelector('dialog')).toBeNull();
    expect(store.deleteAllData).not.toHaveBeenCalled();
  });

  it('shows an error and keeps the dialog open when erasing fails', async () => {
    const { view, store, toaster } = mountWithStore();
    store.deleteAllData.mockRejectedValueOnce(new Error('disk full'));
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    find(view, 'Delete all data').click();
    await settle();
    typed(document.querySelector('dialog input'), 'DELETE');
    find(document.querySelector('dialog'), 'Delete everything').click();
    await settle();
    error.mockRestore();
    expect(toaster.show).toHaveBeenCalledWith('The data could not be deleted, and nothing changed. Try again.');
    expect(document.querySelector('dialog')).not.toBeNull();
  });

  it('closes the open dialog when the session connects, and erases nothing', async () => {
    const view = document.body.appendChild(document.createElement('div'));
    let state = 'local';
    const listeners = new Set();
    const session = {
      state: () => state,
      account: () => ({ name: 'Jane', email: 'jane@example.com', server: 'https://todos.example.com' }),
      subscribe: (listener) => {
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
    };
    const store = { snapshot: async () => ({ lists: [], tasks: [] }), deleteAllData: vi.fn(async () => ({ lists: 0, tasks: 0 })) };
    mountSettings(view, { session, store, toaster: { show: vi.fn() }, getStorage: () => null });
    find(view, 'Delete all data').click();
    await settle();
    typed(document.querySelector('dialog input'), 'DELETE');
    state = 'connected';
    listeners.forEach((listener) => listener());
    await settle();
    expect(document.querySelector('dialog')).toBeNull();
    expect(store.deleteAllData).not.toHaveBeenCalled();
  });

  it('toasts and opens no dialog when the counts cannot be read, and opens one dialog for two clicks', async () => {
    const { view, store, toaster } = mountWithStore();
    store.snapshot.mockRejectedValueOnce(new Error('closed'));
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    find(view, 'Delete all data').click();
    await settle();
    error.mockRestore();
    expect(toaster.show).toHaveBeenCalledWith('The data could not be counted, so nothing was deleted. Try again.');
    expect(document.querySelector('dialog')).toBeNull();
    find(view, 'Delete all data').click();
    find(view, 'Delete all data').click();
    await settle();
    expect(document.querySelectorAll('dialog')).toHaveLength(1);
  });

  it('erases once even when typing or clicking continues while it runs', async () => {
    const { view, store } = mountWithStore();
    let release;
    store.deleteAllData.mockImplementationOnce(() => new Promise((resolve) => {
      release = resolve;
    }));
    find(view, 'Delete all data').click();
    await settle();
    const dialog = document.querySelector('dialog');
    typed(dialog.querySelector('input'), 'DELETE');
    const confirm = find(dialog, 'Delete everything');
    confirm.click();
    expect(dialog.querySelector('input').disabled).toBe(true);
    expect(find(dialog, 'Cancel').disabled).toBe(true);
    typed(dialog.querySelector('input'), 'DELETE');
    expect(confirm.disabled).toBe(true);
    confirm.click();
    release({ lists: 2, tasks: 3 });
    await settle();
    expect(store.deleteAllData).toHaveBeenCalledTimes(1);
  });

  it('gives the focus back to Delete everything after a failed erase', async () => {
    const { view, store } = mountWithStore();
    store.deleteAllData.mockRejectedValueOnce(new Error('disk full'));
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    find(view, 'Delete all data').click();
    await settle();
    const dialog = document.querySelector('dialog');
    typed(dialog.querySelector('input'), 'DELETE');
    find(dialog, 'Delete everything').click();
    await settle();
    error.mockRestore();
    expect(document.activeElement).toBe(find(dialog, 'Delete everything'));
  });
});

describe('Keyboard shortcuts in About', () => {
  const EXPECTED = [
    [['n', '/'], 'Focus the search and add field.'],
    [['Shift+Enter', 'Alt+Enter'], 'Add the task or list, in the search and add field.'],
    [['Escape'], 'Clear the search and add field, or close the editor or a dialog.'],
    [['Alt+Up', 'Alt+Down'], "Move the focused list, or the focused task in a list's manual order."],
    [['Ctrl+Z', 'Cmd+Z'], 'Undo the newest change shown in a toast.'],
  ];

  /** @returns {HTMLElement} the About section of a freshly mounted Settings screen */
  function mountAbout() {
    const view = document.body.appendChild(document.createElement('div'));
    const session = { state: () => 'local', account: () => null, subscribe: () => () => {} };
    mountSettings(view, { session, toaster: { show: vi.fn() }, getStorage: () => null });
    return view.querySelector('section[aria-labelledby="settings-about"]');
  }

  it('lists the five shortcuts under a Keyboard shortcuts heading, in order, with each key in a kbd', () => {
    const about = mountAbout();
    const heading = about.querySelector('h3');
    expect(heading.textContent).toBe('Keyboard shortcuts');
    const list = about.querySelector('dl.settings__shortcuts');
    const rows = [...list.querySelectorAll(':scope > div')].map((row) => [
      [...row.querySelectorAll('dt kbd')].map((key) => key.textContent),
      row.querySelector('dd').textContent,
    ]);
    expect(rows).toEqual(EXPECTED);
  });

  it('joins alternative keys with "or", so a screen reader reads each term as text', () => {
    const terms = [...mountAbout().querySelectorAll('.settings__shortcuts dt')].map((term) => term.textContent);
    expect(terms).toEqual(['n or /', 'Shift+Enter or Alt+Enter', 'Escape', 'Alt+Up or Alt+Down', 'Ctrl+Z or Cmd+Z']);
  });

  it('sits after the version line and before the source link', () => {
    const about = mountAbout();
    const order = [...about.children].map((child) => child.className);
    const version = order.indexOf('settings__hint');
    const heading = order.indexOf('settings__subtitle');
    const list = order.indexOf('settings__shortcuts');
    const link = order.indexOf('settings__link');
    expect(version).toBeGreaterThan(-1);
    expect([version < heading, heading < list, list < link]).toEqual([true, true, true]);
  });
});
