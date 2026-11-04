// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createLiveRegion } from '../../src/js/ui/live-region.js';

describe('createLiveRegion', () => {
  let liveRegion;

  beforeEach(() => {
    vi.useFakeTimers();
    document.body.innerHTML = '';
    liveRegion = createLiveRegion();
  });

  afterEach(() => {
    liveRegion.destroy();
    vi.useRealTimers();
  });

  it('adds a polite and an assertive region that stay visually hidden', () => {
    const polite = document.querySelector('[aria-live="polite"]');
    const assertive = document.querySelector('[aria-live="assertive"]');
    expect(polite.getAttribute('aria-atomic')).toBe('true');
    expect(assertive.getAttribute('aria-atomic')).toBe('true');
    expect(polite.style.position).toBe('absolute');
    expect(polite.textContent).toBe('');
  });

  it('announces politely by default after a short delay', () => {
    liveRegion.announce('List created.');
    const polite = document.querySelector('[aria-live="polite"]');
    expect(polite.textContent).toBe('');
    vi.runAllTimers();
    expect(polite.textContent).toBe('List created.');
    expect(document.querySelector('[aria-live="assertive"]').textContent).toBe('');
  });

  it('announces assertively when asked', () => {
    liveRegion.announce('Sync failed.', { politeness: 'assertive' });
    vi.runAllTimers();
    expect(document.querySelector('[aria-live="assertive"]').textContent).toBe('Sync failed.');
  });

  it('clears and sets the text again for a repeated message', () => {
    const polite = document.querySelector('[aria-live="polite"]');
    liveRegion.announce('Task moved.');
    vi.runAllTimers();
    liveRegion.announce('Task moved.');
    expect(polite.textContent).toBe('');
    vi.runAllTimers();
    expect(polite.textContent).toBe('Task moved.');
  });

  it('removes its regions on destroy and ignores later announcements', () => {
    liveRegion.announce('Late.');
    liveRegion.destroy();
    vi.runAllTimers();
    expect(document.querySelector('[aria-live]')).toBeNull();
    liveRegion.announce('Later.');
    vi.runAllTimers();
    expect(document.body.textContent).toBe('');
  });
});
