// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mountConnect } from '../../src/js/views/connect.js';

/**
 * Create a session stand-in whose sign-in finishes with the given promise.
 * @param {Promise<void>} finishing the result of the code exchange
 * @param {string} state the session state once it finished
 * @returns {object} the session
 */
function fakeSession(finishing, state) {
  return {
    finish: () => finishing,
    state: () => state,
    account: () => (state === 'connected' ? { email: 'jane@example.com', server: 'https://todos.example.com' } : null),
    serverUrl: () => 'https://todos.example.com',
    start: vi.fn(() => 'https://auth.example.com/sign-in'),
  };
}

describe('mountConnect', () => {
  let screen;

  afterEach(() => {
    screen?.destroy();
    document.body.replaceChildren();
  });

  /**
   * Mount the connect screen on a session stand-in.
   * @param {object} session the session
   * @returns {HTMLElement} the live card
   */
  function mount(session) {
    const view = document.body.appendChild(document.createElement('div'));
    screen = mountConnect(view, { session, navigate: vi.fn(), assign: vi.fn() });
    return view.querySelector('[aria-live]');
  }

  it('moves focus to Done once the sign-in finished', async () => {
    const card = mount(fakeSession(Promise.resolve(), 'connected'));
    expect(card.textContent).toContain('Signing in');
    await vi.waitFor(() => expect(card.textContent).toContain('Signed in as jane@example.com'));
    expect(document.activeElement.textContent).toBe('Done');
  });

  it('announces a failed sign-in once, through the live card only, and moves focus to Sign in', async () => {
    const card = mount(fakeSession(Promise.reject(Object.assign(new Error('offline'), { name: 'AuthError', reason: 'network' })), 'local'));
    await vi.waitFor(() => expect(card.textContent).toContain('Sign-in did not finish.'));
    expect(card.querySelector('[role="alert"]')).toBeNull();
    expect(document.activeElement.textContent).toBe('Sign in');
  });

  it('announces an account without an invitation once, and moves focus to Back to Settings', async () => {
    const card = mount(fakeSession(Promise.reject(Object.assign(new Error('no grant'), { name: 'AuthError', reason: 'not-invited' })), 'local'));
    await vi.waitFor(() => expect(card.textContent).toContain('by invitation only'));
    expect(card.querySelector('[role="alert"]')).toBeNull();
    expect(document.activeElement.textContent).toBe('Back to Settings');
  });
});
