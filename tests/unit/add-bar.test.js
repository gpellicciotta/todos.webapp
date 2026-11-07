// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createAddBar } from '../../src/js/views/add-bar.js';

describe('createAddBar', () => {
  let onAdd;
  let onSearch;
  let bar;
  let input;

  beforeEach(() => {
    document.body.innerHTML = '';
    onAdd = vi.fn(async () => {});
    onSearch = vi.fn();
    bar = createAddBar({ document, onAdd, onSearch });
    document.body.append(bar.element);
    input = bar.element.querySelector('input');
  });

  it('is a labeled field of at most 500 characters with an Add button and the n shortcut hook', () => {
    expect(input.maxLength).toBe(500);
    expect(input.dataset.shortcut).toBe('add search');
    expect(bar.element.querySelector('label').textContent).toBe('Search or add a task');
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

  it('leaves focus alone when onAdd resolves false, because focus moved elsewhere', async () => {
    const other = document.body.appendChild(document.createElement('button'));
    onAdd.mockImplementationOnce(async () => {
      other.focus();
      return false;
    });
    input.value = 'Buy paint';
    bar.element.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await vi.waitFor(() => expect(input.value).toBe(''));
    await Promise.resolve();
    expect(document.activeElement).toBe(other);
    other.remove();
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

  /**
   * Type text into the field as the user does.
   * @param {string} text the new value
   */
  function type(text) {
    input.value = text;
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }

  /**
   * Press a key in the field.
   * @param {string} key the key
   * @returns {KeyboardEvent} the event, to read `defaultPrevented`
   */
  function press(key) {
    const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
    input.dispatchEvent(event);
    return event;
  }

  describe('search (VO-3)', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('is a field that the n and / shortcuts both find, with a search-or-add placeholder', () => {
      expect(input.dataset.shortcut.split(' ').sort()).toEqual(['add', 'search']);
      expect(input.placeholder).toBe('Search or add a task');
    });

    it('reports the text once typing pauses for 150 ms, one query per word (TEC-16)', () => {
      for (const text of ['p', 'pa', 'pai', 'paint']) {
        type(text);
        vi.advanceTimersByTime(100);
      }
      expect(onSearch).not.toHaveBeenCalled();
      vi.advanceTimersByTime(50);
      expect(onSearch).toHaveBeenCalledTimes(1);
      expect(onSearch).toHaveBeenLastCalledWith('paint');
    });

    it('applies the search on Enter and never adds', () => {
      type('paint');
      const event = press('Enter');
      expect(event.defaultPrevented).toBe(true);
      expect(onSearch).toHaveBeenCalledWith('paint');
      vi.advanceTimersByTime(500);
      expect(onSearch).toHaveBeenCalledTimes(1);
      expect(onAdd).not.toHaveBeenCalled();
    });

    it('clears the field and the search on Escape in a field with text', () => {
      type('paint');
      const event = press('Escape');
      expect(event.defaultPrevented).toBe(true);
      expect(input.value).toBe('');
      expect(onSearch).toHaveBeenLastCalledWith('');
      expect(press('Escape').defaultPrevented).toBe(false);
    });

    it('shows text set from outside without reporting it, and reports text still waiting on destroy', () => {
      bar.setText('Reset text');
      expect(input.value).toBe('Reset text');
      expect(onSearch).not.toHaveBeenCalled();
      type('abc');
      bar.destroy();
      expect(onSearch).toHaveBeenCalledWith('abc');
    });
  });

  describe('Add only creation (TSK-1)', () => {
    it('removes the filter at once when Add clears the field', async () => {
      vi.useFakeTimers();
      try {
        type('Buy paint');
        bar.element.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        await vi.waitFor(() => expect(input.value).toBe(''));
        expect(onSearch).toHaveBeenCalledTimes(1);
        expect(onSearch).toHaveBeenLastCalledWith('');
        vi.advanceTimersByTime(500);
        expect(onSearch).toHaveBeenCalledTimes(1);
      }
      finally {
        vi.useRealTimers();
      }
    });

    it('keeps the filter and the text when adding fails', async () => {
      onAdd.mockRejectedValueOnce(new Error('quota'));
      type('Call the plumber');
      bar.element.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      await vi.waitFor(() => expect(onAdd).toHaveBeenCalledTimes(1));
      await Promise.resolve();
      expect(input.value).toBe('Call the plumber');
      expect(onSearch).not.toHaveBeenCalledWith('');
    });
  });

  describe('Add anyway', () => {
    const label = () => bar.element.querySelector('button[type="submit"]').textContent.trim();

    it('reads Add anyway on an exact match that ignores case and surrounding spaces', () => {
      bar.setKnown(new Set(['buy paint']));
      type('paint');
      expect(label()).toBe('Add');
      type('  BUY Paint ');
      expect(label()).toBe('Add anyway');
      type('');
      expect(label()).toBe('Add');
    });

    it('checks the typed text again when the known tasks change', () => {
      type('buy paint');
      expect(label()).toBe('Add');
      bar.setKnown(new Set(['buy paint']));
      expect(label()).toBe('Add anyway');
    });

    it('still adds on an exact match', async () => {
      bar.setKnown(new Set(['buy paint']));
      type('Buy paint');
      bar.element.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      await vi.waitFor(() => expect(onAdd).toHaveBeenCalledWith('Buy paint'));
    });
  });

  describe('viewer mode (VO-14)', () => {
    it('shows a Search tasks field without an Add button, and ignores a submit', () => {
      bar.setViewer(true);
      expect(input.placeholder).toBe('Search tasks');
      expect(bar.element.querySelector('label').textContent).toBe('Search tasks');
      expect(bar.element.querySelector('button[type="submit"]').hidden).toBe(true);
      type('Buy paint');
      bar.element.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      expect(onAdd).not.toHaveBeenCalled();
      bar.setViewer(false);
      expect(bar.element.querySelector('button[type="submit"]').hidden).toBe(false);
      expect(input.placeholder).toBe('Search or add a task');
    });

    it('starts in viewer mode when created for a viewer', () => {
      document.body.innerHTML = '';
      const viewer = createAddBar({ document, onAdd, onSearch, viewer: true });
      expect(viewer.input.placeholder).toBe('Search tasks');
    });
  });
});
