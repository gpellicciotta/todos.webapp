// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest';
import { attachReorder, placementAt, placementBy, slotAt } from '../../src/js/views/reorder.js';

const IDS = ['a', 'b', 'c', 'd'];

describe('placementAt', () => {
  it('places a dropped task before the task now at its slot', () => {
    expect(placementAt(IDS, 'd', 0)).toEqual({ placement: { before: 'a' }, index: 0 });
    expect(placementAt(IDS, 'a', 2)).toEqual({ placement: { before: 'c' }, index: 1 });
    expect(placementAt(IDS, 'c', 1)).toEqual({ placement: { before: 'b' }, index: 1 });
  });

  it('places a task dropped at the end after the last other task', () => {
    expect(placementAt(IDS, 'a', 4)).toEqual({ placement: { after: 'd' }, index: 3 });
    expect(placementAt(IDS, 'b', 9)).toEqual({ placement: { after: 'd' }, index: 3 });
  });

  it('returns null for a drop on the task\'s own place, an unknown task, or a single task', () => {
    expect(placementAt(IDS, 'b', 1)).toBeNull();
    expect(placementAt(IDS, 'b', 2)).toBeNull();
    expect(placementAt(IDS, 'x', 0)).toBeNull();
    expect(placementAt(['a'], 'a', 0)).toBeNull();
  });
});

describe('placementBy', () => {
  it('moves up before the previous task and down after the next task', () => {
    expect(placementBy(IDS, 'c', -1)).toEqual({ placement: { before: 'b' }, index: 1 });
    expect(placementBy(IDS, 'b', 1)).toEqual({ placement: { after: 'c' }, index: 2 });
    expect(placementBy(IDS, 'c', 1)).toEqual({ placement: { after: 'd' }, index: 3 });
  });

  it('returns null past either end', () => {
    expect(placementBy(IDS, 'a', -1)).toBeNull();
    expect(placementBy(IDS, 'd', 1)).toBeNull();
  });
});

describe('slotAt', () => {
  it('counts the row midpoints above the pointer', () => {
    expect(slotAt([24, 72, 120], 0)).toBe(0);
    expect(slotAt([24, 72, 120], 50)).toBe(1);
    expect(slotAt([24, 72, 120], 500)).toBe(3);
  });
});

describe('attachReorder', () => {
  /**
   * Render rows with a focusable link each, the way the task list does.
   * @returns {HTMLUListElement} the list
   */
  function rows() {
    document.body.innerHTML = `<ul>${IDS.map((id) => `<li class="task-row" data-task-id="${id}">`
      + `<span class="task-row__handle"></span><a href="#${id}" data-role="open">${id}</a></li>`).join('')}</ul>`;
    return document.querySelector('ul');
  }

  it('moves the focused row with Alt+ArrowDown and Alt+ArrowUp while moving is on', () => {
    const list = rows();
    const onMove = vi.fn();
    let enabled = true;
    const reorder = attachReorder(list, { enabled: () => enabled, onMove });
    const link = list.querySelector('[data-task-id="b"] a');
    const down = new KeyboardEvent('keydown', { key: 'ArrowDown', altKey: true, bubbles: true, cancelable: true });
    link.dispatchEvent(down);
    expect(down.defaultPrevented).toBe(true);
    expect(onMove).toHaveBeenLastCalledWith('b', { placement: { after: 'c' }, index: 2 });
    link.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', altKey: true, bubbles: true }));
    expect(onMove).toHaveBeenLastCalledWith('b', { placement: { before: 'a' }, index: 0 });
    link.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    enabled = false;
    link.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', altKey: true, bubbles: true }));
    expect(onMove).toHaveBeenCalledTimes(2);
    reorder.destroy();
  });

  it('reorders other rows through the row, handle, and identifier options', () => {
    const list = document.createElement('ul');
    list.innerHTML = ['a', 'b', 'c'].map((id) => `<li class="item" data-list-id="${id}"><span class="grip"></span><a href="#"></a></li>`).join('');
    document.body.append(list);
    const onMove = vi.fn();
    const reorder = attachReorder(list, { enabled: () => true, onMove, row: '.item', handle: '.grip', idKey: 'listId' });
    list.querySelector('[data-list-id="b"] a').dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', altKey: true, bubbles: true }));
    expect(onMove).toHaveBeenLastCalledWith('b', { placement: { after: 'c' }, index: 2 });
    const item = list.querySelector('[data-list-id="c"]');
    item.querySelector('.grip').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, button: 0, pointerId: 1, clientY: 5 }));
    expect(item.dataset.dragging).toBe('true');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(item.hasAttribute('data-dragging')).toBe(false);
    reorder.destroy();
    list.remove();
  });

  it('moves a task by step for the Move up and Move down menu entries', () => {
    const list = rows();
    const onMove = vi.fn();
    const reorder = attachReorder(list, { enabled: () => true, onMove });
    reorder.step('d', -1);
    expect(onMove).toHaveBeenCalledWith('d', { placement: { before: 'c' }, index: 2 });
    reorder.step('a', -1);
    expect(onMove).toHaveBeenCalledTimes(1);
    reorder.destroy();
  });

  /**
   * Fire a pointer event at an element.
   * @param {Element} target the element
   * @param {string} type the event type
   * @param {number} clientY the pointer position
   */
  function pointer(target, type, clientY) {
    target.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, button: 0, pointerId: 1, clientY }));
  }

  it('ends a drag cleanly when a render drops the handle, and with it the pointer capture', () => {
    const list = rows();
    const onMove = vi.fn();
    const reorder = attachReorder(list, { enabled: () => true, onMove });
    const row = list.querySelector('[data-task-id="b"]');
    pointer(row.querySelector('.task-row__handle'), 'pointerdown', 10);
    expect(row.dataset.dragging).toBe('true');
    document.dispatchEvent(new PointerEvent('lostpointercapture', { bubbles: true, pointerId: 1 }));
    expect(row.hasAttribute('data-dragging')).toBe(false);
    pointer(list, 'pointerup', 200);
    expect(onMove).not.toHaveBeenCalled();
    reorder.destroy();
  });

  it('scrolls while the pointer rests near an edge, and places the row by the scrolled positions', () => {
    const list = rows();
    const scroller = document.createElement('div');
    scroller.className = 'app__main';
    list.replaceWith(scroller);
    scroller.append(list);
    let scrolled = 0;
    Object.defineProperty(scroller, 'scrollTop', { get: () => scrolled, set: (value) => {
      scrolled = value;
    } });
    scroller.getBoundingClientRect = () => ({ top: 0, bottom: 200, height: 200 });
    list.getBoundingClientRect = () => ({ top: -scrolled, bottom: 200 - scrolled, height: 200 });
    [...list.children].forEach((row, index) => {
      row.getBoundingClientRect = () => ({ top: index * 50 - scrolled, bottom: index * 50 + 50 - scrolled, height: 50 });
    });
    const frames = [];
    const frame = vi.spyOn(globalThis, 'requestAnimationFrame').mockImplementation((callback) => frames.push(callback));
    try {
      const onMove = vi.fn();
      const reorder = attachReorder(list, { enabled: () => true, onMove });
      pointer(list.querySelector('.task-row__handle'), 'pointerdown', 25);
      pointer(list, 'pointermove', 160);
      expect(frames).toHaveLength(1);
      frames.shift()();
      frames.shift()();
      expect(scrolled).toBeGreaterThanOrEqual(24);
      pointer(list, 'pointerup', 160);
      expect(onMove).toHaveBeenCalledWith('a', { placement: { after: 'd' }, index: 3 });
      expect(frames.length).toBeLessThanOrEqual(1);
      reorder.destroy();
    }
    finally {
      frame.mockRestore();
    }
  });
});
