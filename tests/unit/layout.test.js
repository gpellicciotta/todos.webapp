// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderShell } from '../../src/js/ui/layout.js';

afterEach(() => {
  vi.useRealTimers();
  document.body.replaceChildren();
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
