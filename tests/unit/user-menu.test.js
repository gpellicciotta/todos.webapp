// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createSession } from '../../src/js/sync/session.js';
import { attachUserMenu, initialsOf } from '../../src/js/ui/user-menu.js';

const NOW = Date.UTC(2026, 10, 6, 9, 0, 0);
const ACCOUNT = { token: 'session-1', expiry: '2099-01-01T00:00:00Z', name: 'Ada Lovelace', email: 'ada@example.com', server: 'https://todos.example.com' };

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
 * Mount a user menu over a session that holds a record, or none for local mode.
 * @param {object|null} record the stored session record
 * @returns {{slot: HTMLElement, session: object, menu: object}} the parts
 */
function mount(record = null) {
  const storage = memoryStorage();
  if (record) {
    storage.setItem('todos.session', JSON.stringify(record));
  }
  const session = createSession({ getStorage: () => storage, now: () => NOW, fetch: async () => ({ ok: true, status: 204 }) });
  const slot = document.body.appendChild(document.createElement('div'));
  const menu = attachUserMenu(slot, { session });
  return { slot, session, menu };
}

/**
 * Click an element.
 * @param {Element} target the element
 */
function click(target) {
  target.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
}

beforeEach(() => {
  document.body.replaceChildren();
});

afterEach(() => {
  document.body.replaceChildren();
});

describe('initialsOf', () => {
  it('takes the first letters of the first and last word', () => {
    expect(initialsOf('Ada Lovelace')).toBe('AL');
    expect(initialsOf('ada king lovelace')).toBe('AL');
  });

  it('takes one letter from a single word or an email address', () => {
    expect(initialsOf('Ada')).toBe('A');
    expect(initialsOf('ada@example.com')).toBe('A');
  });

  it('keeps a letter outside the basic plane whole', () => {
    expect(initialsOf('𝒜da')).toBe('𝒜');
  });
});

describe('attachUserMenu in local mode', () => {
  it('shows a person icon named Local User, with Local User as the hover text', () => {
    const { slot } = mount();
    const button = slot.querySelector('.user-button');
    expect(button.tagName).toBe('BUTTON');
    expect(button.title).toBe('Local User');
    expect(button.getAttribute('aria-label')).toBe('Local User');
    expect(button.querySelector('svg use').getAttribute('href')).toContain('#user');
    expect(button.textContent.trim()).toBe('');
    expect(button.getAttribute('aria-expanded')).toBe('false');
  });

  it('keeps the panel closed and holds no Sign in button', () => {
    const { slot } = mount();
    expect(slot.querySelector('.user-panel').hidden).toBe(true);
    expect(slot.querySelector('.user-menu__sign-in')).toBeNull();
  });

  it('opens a panel with the name, Local only, Recycle bin, and Settings', () => {
    const { slot } = mount();
    click(slot.querySelector('.user-button'));
    const panel = slot.querySelector('.user-panel');
    expect(panel.hidden).toBe(false);
    expect(slot.querySelector('.user-button').getAttribute('aria-expanded')).toBe('true');
    expect(panel.querySelector('.user-panel__name').textContent).toBe('Local User');
    expect(panel.querySelector('.user-panel__status').textContent).toBe('Local only');
    const links = [...panel.querySelectorAll('a')];
    expect(links.map((link) => [link.textContent.trim(), link.getAttribute('href'), link.dataset.nav])).toEqual([
      ['Recycle bin', '#/bin', 'bin'],
      ['Settings', '#/settings', 'settings'],
    ]);
  });

  it('shows Recycle bin and Settings as buttons with their icons', () => {
    const { slot } = mount();
    const links = [...slot.querySelectorAll('.user-panel a')];
    for (const link of links) {
      expect(link.classList.contains('button')).toBe(true);
      expect(link.classList.contains('button--secondary')).toBe(true);
      expect(link.classList.contains('menu__item')).toBe(false);
      expect(link.querySelector('svg.icon use')).not.toBeNull();
    }
    expect(links.map((link) => link.querySelector('use').getAttribute('href'))).toEqual(['img/icons.svg#bin', 'img/icons.svg#settings']);
  });

  it('closes on Escape, on an outside click, and when a link is chosen', () => {
    const { slot } = mount();
    const button = slot.querySelector('.user-button');
    const panel = slot.querySelector('.user-panel');
    click(button);
    button.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    expect(panel.hidden).toBe(true);
    click(button);
    click(document.body);
    expect(panel.hidden).toBe(true);
    click(button);
    panel.querySelector('a').addEventListener('click', (event) => event.preventDefault());
    click(panel.querySelector('a'));
    expect(panel.hidden).toBe(true);
  });
});

describe('attachUserMenu face', () => {
  it('keeps the same icon element across opens, so it does not reload', () => {
    const { slot } = mount();
    const button = slot.querySelector('.user-button');
    const icon = button.querySelector('svg');
    click(button);
    click(button);
    expect(button.querySelector('svg')).toBe(icon);
  });
});

describe('attachUserMenu when connected', () => {
  it('shows the initials, and the account name as the hover text', () => {
    const { slot } = mount(ACCOUNT);
    const button = slot.querySelector('.user-button');
    expect(button.textContent.trim()).toBe('AL');
    expect(button.title).toBe('Ada Lovelace');
    expect(button.getAttribute('aria-label')).toBe('Ada Lovelace');
    expect(slot.querySelector('.user-menu__sign-in')).toBeNull();
  });

  it('names the account and says Connected in the panel', () => {
    const { slot } = mount(ACCOUNT);
    expect(slot.querySelector('.user-panel__name').textContent).toBe('Ada Lovelace');
    expect(slot.querySelector('.user-panel__status').textContent).toBe('Connected');
    expect(slot.querySelectorAll('.user-panel a')).toHaveLength(2);
  });

  it('falls back to the email address when the account has no name', () => {
    const { slot } = mount({ ...ACCOUNT, name: null });
    expect(slot.querySelector('.user-button').textContent.trim()).toBe('A');
    expect(slot.querySelector('.user-button').title).toBe('ada@example.com');
    expect(slot.querySelector('.user-panel__name').textContent).toBe('ada@example.com');
  });
});

describe('attachUserMenu when the session expired', () => {
  const EXPIRED = { ...ACCOUNT, expiry: '2000-01-01T00:00:00Z' };

  it('shows a Sign in button to the connect screen beside the user button', () => {
    const { slot } = mount(EXPIRED);
    const signIn = slot.querySelector('.user-menu__sign-in');
    expect(signIn.textContent.trim()).toBe('Sign in');
    expect(signIn.getAttribute('href')).toBe('#/connect');
    expect(signIn.compareDocumentPosition(slot.querySelector('.user-button')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('keeps the account name, says Sign in needed, and keeps Recycle bin and Settings', () => {
    const { slot } = mount(EXPIRED);
    expect(slot.querySelector('.user-button').title).toBe('Ada Lovelace');
    expect(slot.querySelector('.user-panel__status').textContent).toBe('Sign in needed');
    expect([...slot.querySelectorAll('.user-panel a')].map((link) => link.getAttribute('href'))).toEqual(['#/bin', '#/settings']);
  });
});

describe('attachUserMenu session changes', () => {
  it('re-renders the button and the panel when the session expires', () => {
    const { slot, session } = mount(ACCOUNT);
    session.expire();
    expect(slot.querySelector('.user-menu__sign-in')).not.toBeNull();
    expect(slot.querySelector('.user-panel__status').textContent).toBe('Sign in needed');
  });

  it('re-renders when the device disconnects, and keeps the same panel links', async () => {
    const { slot, session } = mount(ACCOUNT);
    const links = [...slot.querySelectorAll('.user-panel a')];
    await session.disconnect();
    expect(slot.querySelector('.user-button').title).toBe('Local User');
    expect(slot.querySelector('.user-panel__status').textContent).toBe('Local only');
    const after = [...slot.querySelectorAll('.user-panel a')];
    expect(after).toHaveLength(links.length);
    after.forEach((link, index) => expect(link).toBe(links[index]));
  });

  it('stops following the session after destroy', () => {
    const { slot, session, menu } = mount(ACCOUNT);
    const unsubscribe = vi.fn();
    const subscribe = session.subscribe;
    const next = attachUserMenu(slot, { session: { ...session, subscribe: (listener) => {
      const stop = subscribe(listener);
      return () => {
        unsubscribe();
        stop();
      };
    } } });
    menu.destroy();
    next.destroy();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
    expect(slot.querySelector('.user-button')).toBeNull();
  });

  it('shows a name made only of spaces as the email address', () => {
    const { slot } = mount({ ...ACCOUNT, name: '   ' });
    expect(slot.querySelector('.user-button').textContent.trim()).toBe('A');
    expect(slot.querySelector('.user-button').title).toBe('ada@example.com');
  });
});
