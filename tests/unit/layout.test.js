// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderShell } from '../../src/js/ui/layout.js';

afterEach(() => {
  vi.useRealTimers();
  document.body.replaceChildren();
});

/**
 * Render the shell into a fresh root.
 * @returns {{root: HTMLElement, shell: object}} the root and the shell controller
 */
function render() {
  const root = document.body.appendChild(document.createElement('div'));
  return { root, shell: renderShell(root, { navigate: vi.fn() }) };
}

describe('renderShell navigation', () => {
  it('ends the top bar with the user button and shows no sync indicator', () => {
    const { root } = render();
    const bar = root.querySelector('.app__top-bar');
    expect(bar.lastElementChild.contains(bar.querySelector('.user-button'))).toBe(true);
    expect(root.querySelector('.sync-indicator')).toBeNull();
  });

  it('keeps Recycle bin and Settings out of the sidebar and the bottom bar', () => {
    const { root } = render();
    const sidebar = [...root.querySelectorAll('.app__sidebar a')].map((link) => link.getAttribute('href'));
    const bottom = [...root.querySelectorAll('.app__bottom-nav a')].map((link) => link.getAttribute('href'));
    expect(sidebar).toEqual(['#/tasks', '#/lists', '#/lists/new']);
    expect(bottom).toEqual(['#/tasks', '#/lists']);
    expect([...root.querySelectorAll('.user-panel a')].map((link) => link.getAttribute('href'))).toEqual(['#/bin', '#/settings']);
  });

  it('marks the panel link of the current route, also for the screens under Settings', () => {
    const { root, shell } = render();
    shell.update({ view: 'bin', viewKey: 'bin', params: {} }, 'Recycle bin');
    expect(root.querySelector('.user-panel [data-nav="bin"]').getAttribute('aria-current')).toBe('page');
    expect(root.querySelector('.user-panel [data-nav="settings"]').hasAttribute('aria-current')).toBe(false);
    shell.update({ view: 'connect', viewKey: 'connect', params: {} }, 'Connect');
    expect(root.querySelector('.user-panel [data-nav="settings"]').getAttribute('aria-current')).toBe('page');
    expect(root.querySelector('.user-panel [data-nav="bin"]').hasAttribute('aria-current')).toBe(false);
  });
});

describe('renderShell', () => {
  it('announces a lasting notice through the polite live region, not a status role made with its text', () => {
    vi.useFakeTimers();
    const root = document.body.appendChild(document.createElement('div'));
    const shell = renderShell(root, { navigate: vi.fn() });
    const reload = vi.fn();
    shell.showNotice('ToDo\'s was updated in another tab. Reload to continue.', { actionLabel: 'Reload', onAction: reload });
    const banner = root.querySelector('.app__banners .banner');
    expect(banner.textContent).toContain('updated in another tab');
    expect(banner.hasAttribute('role')).toBe(false);
    vi.runAllTimers();
    const region = document.querySelector('[aria-live="polite"]');
    expect(region.textContent).toBe('ToDo\'s was updated in another tab. Reload to continue.');
    banner.querySelector('button').click();
    expect(reload).toHaveBeenCalledTimes(1);
  });
});
