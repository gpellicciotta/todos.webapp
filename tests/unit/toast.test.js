// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createToaster } from '../../src/js/ui/toast.js';

/**
 * List the texts of the toasts in a region.
 * @param {Element} region toast region
 * @returns {string[]} toast texts, oldest first
 */
function texts(region) {
  return [...region.querySelectorAll('.toast__text')].map((element) => element.textContent);
}

describe('createToaster', () => {
  let region;
  let liveRegion;
  let toaster;

  beforeEach(() => {
    vi.useFakeTimers();
    document.body.innerHTML = '<button id="before" type="button">Delete</button><div id="region" class="toast-region"></div>';
    region = document.getElementById('region');
    liveRegion = { announce: vi.fn(), destroy: vi.fn() };
    toaster = createToaster({ region, liveRegion });
  });

  afterEach(() => {
    toaster.destroy();
    vi.useRealTimers();
  });

  it('shows a toast in the region and announces it politely', () => {
    toaster.show('List created.');
    expect(texts(region)).toEqual(['List created.']);
    expect(region.querySelector('.toast button')).toBeNull();
    expect(liveRegion.announce).toHaveBeenCalledWith('List created.');
  });

  it('calls the Undo callback once and removes the toast', () => {
    const onAction = vi.fn();
    const onDismiss = vi.fn();
    toaster.show('Task moved to the recycle bin.', { onAction, onDismiss });
    const undo = region.querySelector('.toast .button');
    expect(undo.textContent).toBe('Undo');
    expect(undo.getAttribute('type')).toBe('button');
    undo.click();
    expect(onAction).toHaveBeenCalledTimes(1);
    expect(onDismiss).toHaveBeenCalledWith('action');
    expect(texts(region)).toEqual([]);
    vi.advanceTimersByTime(10_000);
    expect(onAction).toHaveBeenCalledTimes(1);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('uses a custom action label', () => {
    toaster.show('Task restored.', { actionLabel: 'Open', onAction: vi.fn() });
    expect(region.querySelector('.toast .button').textContent).toBe('Open');
  });

  it('expires after 8 seconds without calling the Undo callback', () => {
    const onAction = vi.fn();
    const onDismiss = vi.fn();
    toaster.show('Task moved to the recycle bin.', { onAction, onDismiss });
    vi.advanceTimersByTime(7_999);
    expect(texts(region)).toHaveLength(1);
    vi.advanceTimersByTime(1);
    expect(texts(region)).toEqual([]);
    expect(onAction).not.toHaveBeenCalled();
    expect(onDismiss).toHaveBeenCalledWith('timeout');
  });

  it('pauses expiry while hovered and resumes with the remaining time', () => {
    toaster.show('Task moved to the recycle bin.', { onAction: vi.fn() });
    const toast = region.querySelector('.toast');
    vi.advanceTimersByTime(3_000);
    toast.dispatchEvent(new MouseEvent('mouseenter'));
    vi.advanceTimersByTime(20_000);
    expect(texts(region)).toHaveLength(1);
    toast.dispatchEvent(new MouseEvent('mouseleave'));
    vi.advanceTimersByTime(4_999);
    expect(texts(region)).toHaveLength(1);
    vi.advanceTimersByTime(1);
    expect(texts(region)).toEqual([]);
  });

  it('pauses expiry while focus is inside and returns focus when the toast goes', () => {
    const before = document.getElementById('before');
    before.focus();
    toaster.show('Task moved to the recycle bin.', { onAction: vi.fn() });
    const undo = region.querySelector('.toast .button');
    undo.focus();
    expect(document.activeElement).toBe(undo);
    vi.advanceTimersByTime(20_000);
    expect(texts(region)).toHaveLength(1);
    undo.click();
    expect(document.activeElement).toBe(before);
  });

  it('dismisses on Escape inside the toast', () => {
    const onDismiss = vi.fn();
    toaster.show('Task moved to the recycle bin.', { onAction: vi.fn(), onDismiss });
    const undo = region.querySelector('.toast .button');
    undo.focus();
    undo.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    expect(texts(region)).toEqual([]);
    expect(onDismiss).toHaveBeenCalledWith('escape');
  });

  it('keeps at most three toasts and drops the oldest', () => {
    const onDismiss = vi.fn();
    toaster.show('One', { onDismiss });
    toaster.show('Two');
    toaster.show('Three');
    toaster.show('Four');
    expect(texts(region)).toEqual(['Two', 'Three', 'Four']);
    expect(onDismiss).toHaveBeenCalledWith('overflow');
  });

  it('returns a function that dismisses the toast', () => {
    const onDismiss = vi.fn();
    const dismiss = toaster.show('List created.', { onDismiss });
    dismiss();
    expect(texts(region)).toEqual([]);
    expect(onDismiss).toHaveBeenCalledWith('dismiss');
    dismiss();
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('removes every toast and stops its timers on destroy', () => {
    const onDismiss = vi.fn();
    toaster.show('List created.', { onDismiss });
    toaster.destroy();
    expect(texts(region)).toEqual([]);
    vi.advanceTimersByTime(10_000);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});

describe('createToaster without a region', () => {
  it('creates a labeled region and its own live region, and removes both on destroy', () => {
    document.body.innerHTML = '';
    const toaster = createToaster();
    const region = document.querySelector('.toast-region');
    expect(region.getAttribute('role')).toBe('region');
    expect(region.getAttribute('aria-label')).toBe('Notifications');
    expect(document.querySelector('[aria-live="polite"]')).not.toBeNull();
    toaster.destroy();
    expect(document.querySelector('.toast-region')).toBeNull();
    expect(document.querySelector('[aria-live]')).toBeNull();
  });
});
