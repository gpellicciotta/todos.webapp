// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { announceSettings } from '../../src/js/core/preferences.js';
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

describe('Reminders in Settings', () => {
  /**
   * Mount Settings in local mode over in-memory storage and a Notification stand-in.
   * @param {object|null} notification the stand-in: `{permission, requestPermission}`, or null for no support
   * @returns {{view: HTMLElement, data: Map, toaster: {show: Function}}} the parts
   */
  function mountReminders(notification) {
    const view = document.body.appendChild(document.createElement('div'));
    const data = new Map();
    const storage = { getItem: (key) => data.get(key) ?? null, setItem: (key, value) => data.set(key, value), removeItem: (key) => data.delete(key) };
    const session = { state: () => 'local', account: () => null, serverUrl: () => 'https://todos.example.com', subscribe: () => () => {} };
    const toaster = { show: vi.fn() };
    mountSettings(view, { session, toaster, getStorage: () => storage, notification, now: () => 1_000 });
    return { view, data, toaster };
  }

  const switchOf = (view) => view.querySelector('[data-reminders="switch"]');
  const leadOf = (view) => view.querySelector('[data-reminders="lead"]');

  it('is off by default, with the lead time off the table until reminders are on', () => {
    const { view } = mountReminders({ permission: 'default', requestPermission: vi.fn() });
    expect(switchOf(view).checked).toBe(false);
    expect(leadOf(view).disabled).toBe(true);
    expect([...leadOf(view).options].map((option) => option.value)).toEqual(['0', '5', '15', '30', '60']);
  });

  it('requests permission from the click, then turns on and remembers when it opted in', async () => {
    const requestPermission = vi.fn(async () => 'granted');
    const { view, data } = mountReminders({ permission: 'default', requestPermission });
    switchOf(view).click();
    await settle();
    expect(requestPermission).toHaveBeenCalledTimes(1);
    expect(switchOf(view).checked).toBe(true);
    expect(leadOf(view).disabled).toBe(false);
    expect(data.get('todos.reminders')).toBe('true');
    expect(data.get('todos.reminders-since')).toBe('1000');
  });

  it('stays off and says why when permission is denied', async () => {
    const { view, data } = mountReminders({ permission: 'default', requestPermission: vi.fn(async () => 'denied') });
    switchOf(view).click();
    await settle();
    expect(switchOf(view).checked).toBe(false);
    expect(data.has('todos.reminders')).toBe(false);
    expect(view.querySelector('[data-reminders="problem"]').textContent).toContain('blocked');
  });

  it('stays off and says why when notifications are unsupported', () => {
    const { view } = mountReminders(null);
    expect(switchOf(view).disabled).toBe(true);
    expect(view.querySelector('[data-reminders="problem"]').textContent).toContain('does not support');
  });

  it('remembers the lead time', async () => {
    const { view, data } = mountReminders({ permission: 'granted', requestPermission: vi.fn(async () => 'granted') });
    switchOf(view).click();
    await settle();
    leadOf(view).value = '15';
    leadOf(view).dispatchEvent(new Event('change'));
    expect(data.get('todos.reminder-lead')).toBe('15');
  });

  it('turns off without asking again', async () => {
    const requestPermission = vi.fn(async () => 'granted');
    const { view, data } = mountReminders({ permission: 'default', requestPermission });
    switchOf(view).click();
    await settle();
    switchOf(view).click();
    await settle();
    expect(requestPermission).toHaveBeenCalledTimes(1);
    expect(data.get('todos.reminders')).toBe('false');
  });
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

describe('Delete account in Settings', () => {
  /**
   * Mount Settings with a session, a user id, and an API stand-in.
   * @param {{state?: string, reply?: object|Error}} [options] the session state and the service reply
   * @returns {{view: HTMLElement, session: object, toaster: {show: Function}, api: object}} the parts
   */
  function mountDeleting({ state = 'connected', reply = { ok: true, status: 200 } } = {}) {
    const view = document.body.appendChild(document.createElement('div'));
    const session = {
      state: () => state,
      account: () => ({ name: 'Jane Doe', email: 'jane@example.com', server: 'https://todos.example.com' }),
      subscribe: () => () => {},
      serverUrl: () => 'https://todos.example.com',
      disconnect: vi.fn(async () => {}),
    };
    const api = { markAccountDeleted: vi.fn(async () => {
      if (reply instanceof Error) {
        throw reply;
      }
      return reply;
    }) };
    const store = { queue: { getState: async () => 7 }, snapshot: async () => ({ lists: [], tasks: [] }) };
    const toaster = { show: vi.fn() };
    mountSettings(view, { session, sync: { pendingCount: async () => 0 }, toaster, store, api, getStorage: () => null });
    return { view, session, toaster, api };
  }

  const find = (root, text) => [...root.querySelectorAll('button')].find((button) => button.textContent === text);

  it('is absent in local mode', () => {
    const { view } = mountDeleting({ state: 'local' });
    expect(find(view, 'Delete account')).toBeUndefined();
  });

  it('needs the account email typed before it enables', async () => {
    const { view } = mountDeleting();
    find(view, 'Delete account').click();
    await settle();
    const dialog = document.querySelector('dialog');
    expect(dialog.textContent).toContain('jane@example.com');
    const confirm = find(dialog, 'Delete account');
    const input = dialog.querySelector('input');
    expect(confirm.disabled).toBe(true);
    input.value = 'jane@example.co';
    input.dispatchEvent(new Event('input'));
    expect(confirm.disabled).toBe(true);
    input.value = 'jane@example.com';
    input.dispatchEvent(new Event('input'));
    expect(confirm.disabled).toBe(false);
  });

  it('marks the account and disconnects after a 2xx reply', async () => {
    const { view, session, api, toaster } = mountDeleting();
    find(view, 'Delete account').click();
    await settle();
    const dialog = document.querySelector('dialog');
    const input = dialog.querySelector('input');
    input.value = 'jane@example.com';
    input.dispatchEvent(new Event('input'));
    find(dialog, 'Delete account').click();
    await settle();
    expect(api.markAccountDeleted).toHaveBeenCalledWith(7);
    expect(session.disconnect).toHaveBeenCalled();
    expect(toaster.show).toHaveBeenCalledWith(expect.stringContaining('marked for deletion'));
  });

  it('keeps the session and shows a toast when the service refuses', async () => {
    const { view, session, toaster } = mountDeleting({ reply: { ok: false, status: 403 } });
    find(view, 'Delete account').click();
    await settle();
    const dialog = document.querySelector('dialog');
    const input = dialog.querySelector('input');
    input.value = 'jane@example.com';
    input.dispatchEvent(new Event('input'));
    find(dialog, 'Delete account').click();
    await settle();
    expect(session.disconnect).not.toHaveBeenCalled();
    expect(toaster.show).toHaveBeenCalledWith(expect.stringContaining('could not be marked'));
    expect(document.querySelector('dialog')).not.toBeNull();
  });
});

describe('Connection in Settings while connected', () => {
  it('shows the sync state and a Sync log link', () => {
    const { view } = mountConnected({ pendingCount: async () => 0, state: () => ({ status: 'offline', pending: 2 }), subscribe: () => () => {} });
    expect(view.querySelector('.settings__sync-state').textContent).toBe('Sync state: Offline');
    expect(view.querySelector('a[href="#/settings/sync-log"]').textContent).toBe('Sync log');
  });
});

describe('The erase question while connecting', () => {
  const ERASED = '2026-11-03T12:00:00.000Z';

  /**
   * Mount Settings connected, with the sync engine waiting on the erase question or in another state.
   * @param {{status?: string}} [options] the sync status
   * @returns {object} the parts, with the queue and the sync stand-ins
   */
  function mountQuestion({ status = 'question' } = {}) {
    const view = document.body.appendChild(document.createElement('div'));
    const session = {
      state: () => 'connected',
      account: () => ({ name: 'Jane Doe', email: 'jane@example.com', server: 'https://todos.example.com' }),
      subscribe: () => () => {},
      serverUrl: () => 'https://todos.example.com',
    };
    const listeners = new Set();
    const sync = {
      current: { status, erase: status === 'question' ? { time: ERASED, account: null } : undefined },
      state: () => sync.current,
      subscribe: (listener) => listeners.add(listener) && (() => listeners.delete(listener)),
      pendingCount: async () => 0,
      syncNow: vi.fn(async () => {
        sync.current = { status: 'synced' };
        listeners.forEach((listener) => listener(sync.current));
        return 'synced';
      }),
    };
    const queue = { getState: vi.fn(async () => ({ time: ERASED, account: null })), setState: vi.fn(async () => {}) };
    const toaster = { show: vi.fn() };
    mountSettings(view, { session, sync, toaster, store: { queue }, getStorage: () => null });
    return { view, sync, queue, toaster };
  }

  const find = (root, text) => [...root.querySelectorAll('button')].find((button) => button.textContent === text);

  it('asks in place, with the date and the email, before anything uploads', () => {
    const { view } = mountQuestion();
    const card = view.querySelector('section[aria-labelledby="settings-connection"]');
    expect(card.querySelector('[aria-live]').textContent).toContain(
      'You deleted all data on this device on 3 Nov 2026. Also erase the lists and tasks of jane@example.com created before then?',
    );
    expect(find(card, 'Erase').className).toContain('button--danger');
    expect(find(card, 'Keep')).toBeDefined();
    expect(card.querySelector('.settings__sync-state').textContent).toBe('Sync state: Waiting for your answer');
  });

  it('shows no question in other sync states', () => {
    const { view } = mountQuestion({ status: 'synced' });
    expect(view.textContent).not.toContain('You deleted all data');
    expect(find(view, 'Erase')).toBeUndefined();
  });

  it('Keep drops the pending erase, syncs, and the question goes', async () => {
    const { view, queue, sync } = mountQuestion();
    find(view, 'Keep').click();
    await settle();
    expect(queue.setState).toHaveBeenCalledWith('pending-erase', null);
    expect(sync.syncNow).toHaveBeenCalledTimes(1);
    expect(view.textContent).not.toContain('You deleted all data');
  });

  it('Erase names the connected account in the pending erase, then syncs', async () => {
    const { view, queue, sync } = mountQuestion();
    find(view, 'Erase').click();
    await settle();
    expect(queue.setState).toHaveBeenCalledWith('pending-erase', { time: ERASED, account: { email: 'jane@example.com', server: 'https://todos.example.com' } });
    expect(sync.syncNow).toHaveBeenCalledTimes(1);
  });

  it('keeps the question with a toast when the answer cannot be saved', async () => {
    const { view, queue, sync, toaster } = mountQuestion();
    queue.setState.mockRejectedValueOnce(new Error('disk full'));
    find(view, 'Keep').click();
    await settle();
    expect(toaster.show).toHaveBeenCalledWith(expect.stringContaining('could not be saved'));
    expect(sync.syncNow).not.toHaveBeenCalled();
    expect(find(view, 'Keep').disabled).toBe(false);
  });
});

describe('Connection section phases', () => {
  const JANE = { name: 'Jane Doe', email: 'jane@example.com', server: 'https://todos.example.com' };
  let screen;

  afterEach(() => {
    screen?.destroy();
    screen = null;
  });

  /**
   * Mount Settings on a mutable session stand-in.
   * @param {{state?: string, finishing?: Promise<void>|null}} [options] the starting state and the sign-in result
   * @returns {{view: HTMLElement, session: object, assign: Function, navigate: Function, section: HTMLElement}} the parts
   */
  function mount({ state = 'local', finishing = null } = {}) {
    const view = document.body.appendChild(document.createElement('div'));
    const listeners = new Set();
    const session = {
      current: state,
      state: () => session.current,
      account: () => (session.current === 'local' ? null : JANE),
      serverUrl: () => 'https://todos.example.com',
      subscribe: (listener) => {
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
      change: (next) => {
        session.current = next;
        listeners.forEach((listener) => listener(next));
      },
      finish: () => finishing,
      start: vi.fn(() => 'https://auth.example.com/sign-in'),
    };
    const assign = vi.fn();
    const navigate = vi.fn();
    screen = mountSettings(view, { session, assign, navigate, toaster: { show: vi.fn() }, getStorage: () => null });
    return { view, session, assign, navigate, section: view.querySelector('section[aria-labelledby="settings-connection"]') };
  }

  /**
   * Find a control of the section by its text.
   * @param {HTMLElement} section the section
   * @param {string} text the label
   * @returns {HTMLElement|undefined} the control
   */
  const control = (section, text) => [...section.querySelectorAll('button, a')].find((candidate) => candidate.textContent === text);

  it('shows the intro and Sign in in local mode, and Sign in starts Auth without opening another screen', () => {
    const { section, session, assign, navigate } = mount();
    expect(section.textContent).toContain('Connecting syncs your data across devices and lets you share lists.');
    expect(section.textContent).toContain('It needs an account, so you are no longer anonymous. Access is by invitation.');
    expect(section.textContent).toContain('Server: https://todos.example.com');
    expect(control(section, 'Connect')).toBeUndefined();
    expect(section.querySelector('input[type="url"]')).not.toBeNull();
    control(section, 'Sign in').click();
    expect(session.start).toHaveBeenCalledWith(expect.objectContaining({ returnUrl: expect.stringMatching(/#\/connect$/) }));
    expect(assign).toHaveBeenCalledWith('https://auth.example.com/sign-in');
    expect(navigate).not.toHaveBeenCalled();
  });

  it('shows Signing in, then the connected state, and moves focus to its first action', async () => {
    let finish;
    const finishing = new Promise((resolve) => {
      finish = resolve;
    });
    const { section, session } = mount({ finishing });
    expect(section.textContent).toContain('Signing in');
    expect(section.querySelector('button')).toBeNull();
    session.current = 'connected';
    finish();
    await vi.waitFor(() => expect(section.textContent).toContain('Signed in as Jane Doe (jane@example.com)'));
    expect(section.textContent).not.toContain('Signing in');
    expect(document.activeElement.textContent).toBe('Sync log');
    expect(control(section, 'Done')).toBeUndefined();
  });

  it('keeps Signing in while the session notifies a connected state, then focuses Sync log once the sign-in resolves', async () => {
    let finish;
    const finishing = new Promise((resolve) => {
      finish = resolve;
    });
    const { section, session } = mount({ finishing });
    session.change('connected');
    expect(section.textContent).toContain('Signing in');
    expect(section.textContent).not.toContain('Signed in as');
    finish();
    await vi.waitFor(() => expect(section.textContent).toContain('Signed in as Jane Doe (jane@example.com)'));
    expect(document.activeElement.textContent).toBe('Sync log');
  });

  describe('returning to an expired session', () => {
    it('shows Signing in while pending, and the connected state with focus once it succeeds', async () => {
      let finish;
      const finishing = new Promise((resolve) => {
        finish = resolve;
      });
      const { section, session } = mount({ state: 'sign-in-needed', finishing });
      expect(section.textContent).toContain('Signing in');
      expect(section.textContent).not.toContain('Your session expired.');
      session.change('connected');
      expect(section.textContent).toContain('Signing in');
      finish();
      await vi.waitFor(() => expect(section.textContent).toContain('Signed in as Jane Doe (jane@example.com)'));
      expect(section.textContent).not.toContain('Your session expired.');
      expect(document.activeElement.textContent).toBe('Sync log');
    });

    it.each([['network', 'Sign-in did not finish.'], ['not-invited', 'Access to ToDo\'s is by invitation only.']])(
      'shows the %s failure instead of the expired state, and focuses Sign in again', async (reason, text) => {
        const failure = Object.assign(new Error('failed'), { name: 'AuthError', reason });
        const { section, session } = mount({ state: 'sign-in-needed', finishing: Promise.reject(failure) });
        await vi.waitFor(() => expect(section.textContent).toContain(text));
        expect(section.textContent).not.toContain('Your session expired.');
        expect(document.activeElement.textContent).toBe('Sign in again');
        session.change('sign-in-needed');
        expect(section.textContent).toContain(text);
        expect(section.textContent).not.toContain('Your session expired.');
      });
  });

  it.each(['local', 'connected', 'sign-in-needed'])('never shows the later version sync text, in the %s state', (state) => {
    const { section } = mount({ state });
    expect(section.textContent).not.toContain('later version');
  });

  it('announces a failed sign-in once, through the live region only, and moves focus to Sign in', async () => {
    const failure = Object.assign(new Error('offline'), { name: 'AuthError', reason: 'network' });
    const { section } = mount({ finishing: Promise.reject(failure) });
    await vi.waitFor(() => expect(section.textContent).toContain('Sign-in did not finish.'));
    expect(section.textContent).toContain('The server could not be reached.');
    expect(section.querySelector('[role="alert"]')).toBeNull();
    expect(section.querySelector('[aria-live="polite"]').textContent).toContain('Sign-in did not finish.');
    expect(document.activeElement.textContent).toBe('Sign in');
    expect(control(section, 'Back to Settings')).toBeUndefined();
  });

  it('says access is by invitation only, keeps the hint, and moves focus to Sign in', async () => {
    const failure = Object.assign(new Error('no grant'), { name: 'AuthError', reason: 'not-invited' });
    const { section } = mount({ finishing: Promise.reject(failure) });
    await vi.waitFor(() => expect(section.textContent).toContain('Access to ToDo\'s is by invitation only.'));
    expect(section.textContent).toContain('Ask someone who uses ToDo\'s to invite you.');
    expect(document.activeElement.textContent).toBe('Sign in');
    expect(control(section, 'Back to Settings')).toBeUndefined();
  });

  it('shows the expired text with a Sign in again button that signs in directly', () => {
    const { section, assign, navigate } = mount({ state: 'sign-in-needed' });
    expect(section.textContent).toContain('Your session expired.');
    const again = control(section, 'Sign in again');
    expect(again.tagName).toBe('BUTTON');
    again.click();
    expect(assign).toHaveBeenCalledWith('https://auth.example.com/sign-in');
    expect(navigate).not.toHaveBeenCalled();
  });

  it('on the #/connect route, scrolls the section into view, focuses its heading, and replaces the address with #/settings', async () => {
    const { section, navigate } = mount();
    section.scrollIntoView = vi.fn();
    screen.update({ name: 'connect', view: 'settings', params: {} });
    expect(navigate).toHaveBeenCalledWith('#/settings', { replace: true });
    await vi.waitFor(() => expect(document.activeElement).toBe(section.querySelector('#settings-connection')));
    expect(section.scrollIntoView).toHaveBeenCalled();
  });

  it('leaves the focus alone on the plain settings route', () => {
    const { navigate } = mount();
    const before = document.activeElement;
    screen.update({ name: 'settings', view: 'settings', params: {} });
    expect(document.activeElement).toBe(before);
    expect(navigate).not.toHaveBeenCalled();
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
      serverUrl: () => 'https://todos.example.com',
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

  it('is enabled while connected, with no Disconnect first hint', () => {
    for (const state of ['connected', 'sign-in-needed']) {
      document.body.replaceChildren();
      const { view } = mountWithStore(state);
      const button = find(view, 'Delete all data');
      expect(button.disabled).toBe(false);
      expect(button.hasAttribute('aria-describedby')).toBe(false);
      expect(view.textContent).not.toContain('Disconnect first');
    }
  });

  it('says what leaves the account when connected, and counts only what the user owns', async () => {
    const { view, store } = mountWithStore('connected');
    store.snapshot.mockResolvedValue({
      lists: [{ role: 'owner' }, { role: 'viewer' }, { role: 'editor' }],
      tasks: [{ 'owner-id': 7 }, { 'owner-id': 9 }, { 'owner-id': 7 }],
      memberships: [],
      notes: [],
    });
    store.queue = { getState: vi.fn(async () => 7) };
    find(view, 'Delete all data').click();
    await settle();
    const text = document.querySelector('dialog').textContent;
    expect(text).toContain('1 list, 2 tasks');
    expect(text).toContain('This also erases them from your account on every device.');
    expect(text).toContain('People you share lists with lose those lists. You leave lists others share with you.');
    expect(text).toContain('2 lists shared with you');
    typed(document.querySelector('dialog input'), 'DELETE');
    find(document.querySelector('dialog'), 'Delete everything').click();
    await settle();
    expect(store.deleteAllData).toHaveBeenCalledTimes(1);
  });

  it('keeps the local text and counts in local mode', async () => {
    const { view } = mountWithStore();
    find(view, 'Delete all data').click();
    await settle();
    const text = document.querySelector('dialog').textContent;
    expect(text).toContain('2 lists, 3 tasks');
    expect(text).not.toContain('your account');
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
      serverUrl: () => 'https://todos.example.com',
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

describe('Export backup in Settings', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('downloads one application/json file under the backup name, revokes its URL, and names it in a toast', async () => {
    vi.useFakeTimers({ now: new Date(2026, 10, 24, 12) });
    const view = document.body.appendChild(document.createElement('div'));
    const session = { state: () => 'local', account: () => null, serverUrl: () => 'https://todos.example.com', subscribe: () => () => {} };
    const store = { snapshot: vi.fn(async () => ({ lists: [], tasks: [], memberships: [], notes: [] })) };
    const toaster = { show: vi.fn() };
    const blobs = [];
    const url = {
      createObjectURL: vi.fn((blob) => {
        blobs.push(blob);
        return 'blob:backup-1';
      }),
      revokeObjectURL: vi.fn(),
    };
    const clicked = [];
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function () {
      clicked.push({ href: this.getAttribute('href'), download: this.getAttribute('download') });
    });
    mountSettings(view, { session, store, toaster, getStorage: () => null, url });
    [...view.querySelectorAll('button')].find((button) => button.textContent === 'Export backup').click();
    await vi.advanceTimersByTimeAsync(1000);
    expect(url.createObjectURL).toHaveBeenCalledTimes(1);
    expect(blobs[0].type).toBe('application/json');
    expect(JSON.parse(await blobs[0].text())).toMatchObject({ lists: [], tasks: [] });
    expect(await blobs[0].text()).toContain('\n  "lists": []');
    expect(clicked).toEqual([{ href: 'blob:backup-1', download: 'todos-backup-2026-11-24.json' }]);
    expect(url.revokeObjectURL).toHaveBeenCalledTimes(1);
    expect(url.revokeObjectURL).toHaveBeenCalledWith('blob:backup-1');
    expect(document.querySelector('a[download]')).toBeNull();
    expect(toaster.show).toHaveBeenCalledWith('Saved todos-backup-2026-11-24.json with 0 lists and 0 tasks.');
  });
});

describe('Adding tasks in Settings', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  /**
   * Mount Settings over an in-memory storage.
   * @param {Map<string, string>} stored the stored entries
   * @param {{show: Function}} [toaster] the toaster
   * @returns {HTMLInputElement} the Make Enter add switch
   */
  function mountSwitch(stored, toaster = { show: vi.fn() }) {
    const storage = {
      getItem: (key) => stored.get(key) ?? null,
      setItem: (key, value) => stored.set(key, String(value)),
      removeItem: (key) => stored.delete(key),
    };
    const view = document.body.appendChild(document.createElement('div'));
    const session = { state: () => 'local', account: () => null, serverUrl: () => 'https://todos.example.com', subscribe: () => () => {} };
    mountSettings(view, { session, toaster, getStorage: () => storage });
    const section = view.querySelector('section[aria-labelledby="settings-adding"]');
    expect(section.querySelector('h2').textContent).toBe('Adding tasks');
    return section.querySelector('input[type="checkbox"][role="switch"]');
  }

  it('shows Make Enter add as a labeled switch, on by default, with a hint naming the other keys', () => {
    const control = mountSwitch(new Map());
    expect(control.checked).toBe(true);
    expect(control.closest('label.switch').textContent.trim()).toBe('Make Enter add');
    expect(control.className).toBe('switch__control');
    const hint = document.getElementById(control.getAttribute('aria-describedby'));
    expect(hint.textContent).toBe('Shift+Enter and Alt+Enter always add. When this is off, Enter only searches.');
  });

  it('stores the choice under todos.enter-adds at once, and shows a stored off', () => {
    const stored = new Map();
    const control = mountSwitch(stored);
    control.click();
    expect(stored.get('todos.enter-adds')).toBe('false');
    document.body.innerHTML = '';
    expect(mountSwitch(stored).checked).toBe(false);
  });

  it('sits right after Appearance', () => {
    mountSwitch(new Map());
    const keys = [...document.querySelectorAll('.settings > section')].map((section) => section.getAttribute('aria-labelledby'));
    expect(keys.slice(0, 2)).toEqual(['settings-appearance', 'settings-adding']);
  });

  it('reports a choice that could not be saved', () => {
    const toaster = { show: vi.fn() };
    const view = document.body.appendChild(document.createElement('div'));
    const session = { state: () => 'local', account: () => null, serverUrl: () => 'https://todos.example.com', subscribe: () => () => {} };
    const blocked = { getItem: () => null, setItem: () => {
      throw new Error('blocked');
    } };
    mountSettings(view, { session, toaster, getStorage: () => blocked });
    const control = view.querySelector('input[role="switch"]');
    control.click();
    expect(control.checked).toBe(true);
    expect(toaster.show).toHaveBeenCalledWith('Make Enter add could not be saved on this device, so it stays as it was.');
  });

  it('follows a downloaded Make Enter add while the screen is open (SYN-13)', () => {
    const stored = new Map();
    const control = mountSwitch(stored);
    stored.set('todos.enter-adds', 'false');
    announceSettings(['todos.enter-adds']);
    expect(control.checked).toBe(false);
    stored.set('todos.enter-adds', 'true');
    announceSettings(['todos.view.tasks']);
    expect(control.checked).toBe(false);
  });

  it('stops following downloaded choices once the screen is destroyed', () => {
    const stored = new Map();
    const storage = { getItem: (key) => stored.get(key) ?? null, setItem: (key, value) => stored.set(key, String(value)), removeItem: (key) => stored.delete(key) };
    const view = document.body.appendChild(document.createElement('div'));
    const session = { state: () => 'local', account: () => null, serverUrl: () => 'https://todos.example.com', subscribe: () => () => {} };
    const screen = mountSettings(view, { session, toaster: { show: vi.fn() }, getStorage: () => storage });
    const control = view.querySelector('input[role="switch"]');
    screen.destroy();
    stored.set('todos.enter-adds', 'false');
    announceSettings(['todos.enter-adds']);
    expect(control.checked).toBe(true);
  });
});

describe('sections that moved to Help', () => {
  /** @returns {HTMLElement} a freshly mounted Settings screen */
  function mountScreen() {
    const view = document.body.appendChild(document.createElement('div'));
    const session = { state: () => 'local', account: () => null, serverUrl: () => 'https://todos.example.com', subscribe: () => () => {} };
    mountSettings(view, { session, toaster: { show: vi.fn() }, getStorage: () => null });
    return view;
  }

  it('keeps Appearance, Adding tasks, Reminders, Data, and Connection, with no Keyboard shortcuts or About section', () => {
    const titles = [...mountScreen().querySelectorAll('section > h2')].map((heading) => heading.textContent);
    expect(titles).toEqual(['Appearance', 'Adding tasks', 'Reminders', 'Data', 'Connection']);
  });

  it('shows no shortcut list, version line, add field syntax, or source link', () => {
    const view = mountScreen();
    expect(view.querySelector('.settings__shortcuts')).toBeNull();
    expect(view.querySelector('kbd')).toBeNull();
    expect(view.querySelector('.settings__syntax')).toBeNull();
    expect(view.querySelector('.settings__link')).toBeNull();
    expect(view.textContent).not.toContain('Version ');
    expect(view.textContent).not.toContain('Requirements and source code');
  });
});
