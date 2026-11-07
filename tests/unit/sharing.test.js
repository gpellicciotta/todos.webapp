// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SyncStop } from '../../src/js/sync/api.js';
import { mountSharing } from '../../src/js/views/sharing.js';

const LIST = 'list-1';

/**
 * Create a fake API client that keeps the sharing rules of one list and records every call.
 * @param {object[]} [rules] the starting sharing rules
 * @returns {{send: Function, calls: {method: string, path: string, body: any}[], rules: object[], failNext: (reply: object) => void}} the client
 */
function fakeApi(rules = []) {
  const state = { rules: [...rules], next: 100, failure: null };
  const calls = [];
  const reply = (status, body) => ({ status, ok: status >= 200 && status < 300, headers: { get: () => null }, body });
  return {
    calls,
    get rules() {
      return state.rules;
    },
    failNext(failure) {
      state.failure = failure;
    },
    async send(method, path, { body } = {}) {
      calls.push({ method, path, body });
      if (state.failure) {
        const failure = state.failure;
        state.failure = null;
        if (failure instanceof Error) {
          throw failure;
        }
        return reply(failure.status, failure.body);
      }
      if (method === 'GET' && path === `/api/lists/${LIST}/sharing`) {
        return reply(200, state.rules);
      }
      if (method === 'POST' && path === '/api/sharing-requests') {
        return reply(200, { id: 5 });
      }
      if (method === 'POST' && path === `/api/lists/${LIST}/sharing`) {
        const rule = { id: state.next += 1, 'shared-list-id': LIST, 'shared-with-email': body['target-user-email'], 'shared-role': body['target-user-role'] };
        state.rules.push(rule);
        return reply(200, rule);
      }
      if (method === 'DELETE' && path.startsWith(`/api/lists/${LIST}/sharing/`)) {
        const id = Number(path.split('/').pop());
        state.rules = state.rules.filter((rule) => rule.id !== id);
        return reply(200, { result: 'ok' });
      }
      return reply(404, null);
    },
  };
}

const RULES = [
  { id: 1, 'shared-list-id': LIST, 'shared-with-email': 'partner@example.com', 'shared-role': 'task-editor' },
  { id: 2, 'shared-list-id': LIST, 'shared-with-email': 'kid@example.com', 'shared-role': 'viewer' },
];

/**
 * Build the owner's list.
 * @param {object} [fields] overriding fields
 * @returns {object} the list
 */
function ownedList(fields = {}) {
  return {
    id: LIST, name: 'Home', role: 'owner', owner: { id: 3, email: 'jane@example.com', name: 'Jane Doe' }, sharing: RULES, ...fields,
  };
}

describe('mountSharing', () => {
  let parent;
  let api;
  let session;
  let sync;
  let syncListeners;
  let sharing;

  /**
   * Mount the section for a list and wait for its first fill.
   * @param {object} list the list
   * @returns {Promise<void>}
   */
  async function mount(list) {
    sharing = mountSharing(parent, { list, api, session, sync });
    await sharing.idle();
  }

  const $ = (selector) => parent.querySelector(selector);
  const $$ = (selector) => [...parent.querySelectorAll(selector)];

  /**
   * Tell what a control in the section reads, to find out what is disabled.
   * @returns {HTMLElement[]} every button, select, and input
   */
  const controls = () => $$('button, select, input');

  /**
   * Take the section offline or online.
   * @param {boolean} offline whether the connection is lost
   */
  function setOffline(offline) {
    sync.status = offline ? 'offline' : 'synced';
    syncListeners.forEach((listener) => listener());
  }

  beforeEach(() => {
    document.body.innerHTML = '';
    parent = document.createElement('div');
    document.body.append(parent);
    api = fakeApi(RULES);
    session = { state: () => 'connected' };
    syncListeners = new Set();
    sync = {
      status: 'synced',
      state() {
        return { status: this.status };
      },
      subscribe: (listener) => {
        syncListeners.add(listener);
        return () => syncListeners.delete(listener);
      },
      kick: vi.fn(),
    };
  });

  it('shows the owner to the owner with a role select and Remove per person, then the invite row', async () => {
    await mount(ownedList());
    expect($('[data-sharing="owner"]').textContent).toContain('Jane Doe');
    const people = $$('[data-sharing="person"]');
    expect(people.map((row) => row.textContent)).toEqual([expect.stringContaining('partner@example.com'), expect.stringContaining('kid@example.com')]);
    expect(people[0].querySelector('select').value).toBe('task-editor');
    expect(people[1].querySelector('select').value).toBe('viewer');
    expect(people[0].querySelector('button').textContent).toBe('Remove');
    expect($('input[name="email"]')).not.toBeNull();
    expect($('select[name="invite-role"]').value).toBe('task-editor');
    expect($('button[data-sharing="invite"]').textContent).toBe('Invite');
  });

  it('explains each role in one line', async () => {
    await mount(ownedList());
    const options = $$('select[name="invite-role"] option').map((option) => option.textContent);
    expect(options).toEqual([
      expect.stringContaining('Viewer'), expect.stringContaining('Task editor'), expect.stringContaining('Editor'),
    ]);
    expect(options[1]).toContain('Can add, edit, and reorder tasks');
  });

  it('refreshes the people from the service', async () => {
    api = fakeApi([RULES[0]]);
    await mount(ownedList());
    expect(api.calls[0]).toMatchObject({ method: 'GET', path: `/api/lists/${LIST}/sharing` });
    expect($$('[data-sharing="person"]')).toHaveLength(1);
  });

  it('invites an email with a role', async () => {
    await mount(ownedList());
    const email = $('input[name="email"]');
    email.value = ' new@example.com ';
    $('select[name="invite-role"]').value = 'viewer';
    $('button[data-sharing="invite"]').click();
    await sharing.idle();
    expect(api.calls.find((call) => call.method === 'POST')).toEqual({
      method: 'POST',
      path: '/api/sharing-requests',
      body: { 'list-id': LIST, 'target-user-email': 'new@example.com', 'target-user-role': 'viewer' },
    });
    expect(email.value).toBe('');
    expect($('[data-sharing="status"]').textContent).toContain('new@example.com');
  });

  it('refuses an invalid email without a request', async () => {
    await mount(ownedList());
    const email = $('input[name="email"]');
    email.value = 'not-an-email';
    $('button[data-sharing="invite"]').click();
    await sharing.idle();
    expect(api.calls.filter((call) => call.method !== 'GET')).toEqual([]);
    expect(email.getAttribute('aria-invalid')).toBe('true');
    expect($('.field__error').textContent).toBe('Enter a valid email address.');
  });

  it('changes a role by replacing the rule', async () => {
    await mount(ownedList());
    const select = $$('[data-sharing="person"]')[1].querySelector('select');
    select.value = 'editor';
    select.dispatchEvent(new Event('change', { bubbles: true }));
    await sharing.idle();
    const writes = api.calls.filter((call) => call.method !== 'GET');
    expect(writes).toEqual([
      { method: 'DELETE', path: `/api/lists/${LIST}/sharing/2`, body: undefined },
      { method: 'POST', path: `/api/lists/${LIST}/sharing`, body: { 'target-user-email': 'kid@example.com', 'target-user-role': 'editor' } },
    ]);
    expect($$('[data-sharing="person"]').map((row) => row.querySelector('select').value)).toEqual(['task-editor', 'editor']);
    expect(sync.kick).toHaveBeenCalled();
  });

  it('puts the old role back when the new one is refused', async () => {
    await mount(ownedList());
    const select = $$('[data-sharing="person"]')[1].querySelector('select');
    select.value = 'editor';
    api.send = ((send) => async (method, path, options) => {
      if (method === 'POST' && options?.body?.['target-user-role'] === 'editor') {
        return { status: 400, ok: false, headers: { get: () => null }, body: { message: 'Not allowed' } };
      }
      return send(method, path, options);
    })(api.send.bind(api));
    select.dispatchEvent(new Event('change', { bubbles: true }));
    await sharing.idle();
    expect($$('[data-sharing="person"]').map((row) => row.querySelector('select').value)).toEqual(['task-editor', 'viewer']);
    expect($('[data-sharing="status"]').textContent).toContain('Not allowed');
  });

  it('removes a person', async () => {
    await mount(ownedList());
    $$('[data-sharing="person"]')[0].querySelector('button').click();
    await sharing.idle();
    expect(api.calls.filter((call) => call.method === 'DELETE')).toEqual([
      { method: 'DELETE', path: `/api/lists/${LIST}/sharing/1`, body: undefined },
    ]);
    expect($$('[data-sharing="person"]')).toHaveLength(1);
  });

  it('shows another user the owner and their own role, read-only', async () => {
    await mount(ownedList({ role: 'viewer', owner: { id: 9, email: 'sam@example.com', name: 'Sam Roe' }, sharing: [] }));
    expect($('[data-sharing="owner"]').textContent).toContain('Sam Roe');
    expect($('[data-sharing="own-role"]').textContent).toContain('Viewer');
    expect(controls().filter((control) => control.matches('select, input, button:not([data-sharing="connect"])'))).toEqual([]);
    expect(api.calls).toEqual([]);
  });

  it('disables every control and shows a banner while offline', async () => {
    await mount(ownedList());
    expect($('[data-sharing="offline"]').hidden).toBe(true);
    setOffline(true);
    expect($('[data-sharing="offline"]').hidden).toBe(false);
    expect($('[data-sharing="offline"]').textContent).toBe('Sharing needs a connection.');
    expect(controls().length).toBeGreaterThan(4);
    expect(controls().every((control) => control.disabled)).toBe(true);
    setOffline(false);
    expect($('[data-sharing="offline"]').hidden).toBe(true);
    expect(controls().some((control) => control.disabled)).toBe(false);
  });

  it('starts disabled when the browser is offline', async () => {
    const online = vi.spyOn(globalThis.navigator, 'onLine', 'get').mockReturnValue(false);
    await mount(ownedList());
    expect(controls().every((control) => control.disabled)).toBe(true);
    expect(api.calls).toEqual([]);
    online.mockRestore();
  });

  it('says when the connection fails during a change', async () => {
    await mount(ownedList());
    api.failNext(new SyncStop('retry', { offline: true }));
    $$('[data-sharing="person"]')[0].querySelector('button').click();
    await sharing.idle();
    expect($('[data-sharing="status"]').textContent).toBe('Sharing needs a connection.');
    expect($$('[data-sharing="person"]')).toHaveLength(2);
  });

  it('only links to the connect flow in local mode', async () => {
    session = { state: () => 'local' };
    await mount({ id: LIST, name: 'Home' });
    expect(parent.textContent).toBe('Connect to share this list');
    expect($('a').getAttribute('href')).toBe('#/connect');
    expect(api.calls).toEqual([]);
  });

  it('follows a list that changes role', async () => {
    await mount(ownedList());
    sharing.update(ownedList({ role: 'editor', owner: { id: 9, name: 'Sam Roe' } }));
    await sharing.idle();
    expect($('input[name="email"]')).toBeNull();
    expect($('[data-sharing="own-role"]').textContent).toContain('Editor');
  });
});
