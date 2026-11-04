// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createAddBar } from '../../src/js/views/add-bar.js';

describe('createAddBar', () => {
  let onAdd;
  let bar;
  let input;

  beforeEach(() => {
    document.body.innerHTML = '';
    onAdd = vi.fn(async () => {});
    bar = createAddBar({ document, onAdd });
    document.body.append(bar.element);
    input = bar.element.querySelector('input');
  });

  it('is a labeled field of at most 500 characters with an Add button and the n shortcut hook', () => {
    expect(input.maxLength).toBe(500);
    expect(input.dataset.shortcut).toBe('add');
    expect(bar.element.querySelector('label').textContent).toBe('Add a task');
    expect(bar.element.querySelector('button[type="submit"]').textContent.trim()).toBe('Add');
  });

  it('adds the trimmed description on submit, clears the field, and keeps focus (TSK-1)', async () => {
    input.focus();
    input.value = '  Buy paint  ';
    bar.element.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await vi.waitFor(() => expect(input.value).toBe(''));
    expect(onAdd).toHaveBeenCalledWith('Buy paint');
    expect(document.activeElement).toBe(input);
  });

  it('ignores an empty description and keeps the text when adding fails', async () => {
    input.value = '   ';
    bar.element.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    expect(onAdd).not.toHaveBeenCalled();
    onAdd.mockRejectedValueOnce(new Error('quota'));
    input.value = 'Call the plumber';
    bar.element.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await vi.waitFor(() => expect(onAdd).toHaveBeenCalledTimes(1));
    await Promise.resolve();
    expect(input.value).toBe('Call the plumber');
  });

  it('shows a counter from 450 characters', () => {
    const counter = bar.element.querySelector('.field__counter');
    input.value = 'x'.repeat(449);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    expect(counter.hidden).toBe(true);
    input.value = 'x'.repeat(450);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    expect(counter.hidden).toBe(false);
    expect(counter.textContent).toBe('450 / 500');
  });
});
