/**
 * Reordering of the list view rows: drag by the handle, Alt+Up and Alt+Down, and Move up and Move down (`LV-3`).
 *
 * Every move turns into one before or after neighbor for the store's `moveInList`.
 * Neighbors come from the shown rows, so a move skips the tasks the status filter hides.
 * A drag marks the dragged row with `data-dragging` and the drop spot with `data-drop`, as app-components.css draws.
 * A pointer within 48 px of the scroller's top or bottom edge scrolls it each frame; row midpoints count from the
 * list's top, so the drop spot follows the scrolled rows.
 * Escape, a lost pointer capture, or a render that replaces the dragged row cancels a drag.
 */

const EDGE_PX = 48;
const SCROLL_PX = 12;

/**
 * Compute the placement of a task dropped at a slot of the shown order.
 * @param {string[]} ids the shown task identifiers, in order, including the moved task
 * @param {string} taskId the moved task
 * @param {number} slot the gap it lands in: 0 before the first row, `ids.length` after the last
 * @returns {{placement: {before: string}|{after: string}, index: number}|null} the neighbor and the new
 *   index of the task, or null when the task stays where it is
 */
export function placementAt(ids, taskId, slot) {
  const from = ids.indexOf(taskId);
  const others = ids.filter((id) => id !== taskId);
  if (from < 0 || others.length === 0) {
    return null;
  }
  const index = Math.max(0, Math.min(slot > from ? slot - 1 : slot, others.length));
  if (index === from) {
    return null;
  }
  return { placement: index < others.length ? { before: others[index] } : { after: others.at(-1) }, index };
}

/**
 * Compute the placement of a task moved one row up, before the row above, or down, after the row below.
 * @param {string[]} ids the shown task identifiers, in order
 * @param {string} taskId the moved task
 * @param {-1|1} step -1 for up, 1 for down
 * @returns {{placement: object, index: number}|null} the move, or null past either end
 */
export function placementBy(ids, taskId, step) {
  const from = ids.indexOf(taskId);
  const to = from + step;
  if (from < 0 || to < 0 || to >= ids.length) {
    return null;
  }
  return { placement: step < 0 ? { before: ids[to] } : { after: ids[to] }, index: to };
}

/**
 * Find the slot under the pointer: the number of row midpoints above it.
 * @param {number[]} midpoints the vertical row midpoints, top to bottom
 * @param {number} y the pointer position
 * @returns {number} the slot
 */
export function slotAt(midpoints, y) {
  return midpoints.filter((middle) => middle < y).length;
}

/**
 * Attach reordering to a task list.
 * @param {HTMLElement} list the element holding the `.task-row` rows
 * @param {object} options reorder options
 * @param {() => boolean} options.enabled tells whether moves are on, in manual order only
 * @param {(taskId: string, move: {placement: object, index: number}) => void} options.onMove stores a move
 * @param {() => HTMLElement|null} [options.scroller] the element a drag scrolls, the main column by default
 * @returns {{step: (taskId: string, step: -1|1) => void, destroy: () => void}} the controller
 */
export function attachReorder(list, { enabled, onMove, scroller = () => list.closest('.app__main') }) {
  let drag = null;

  /**
   * List the shown rows.
   * @returns {HTMLElement[]} the rows, top to bottom
   */
  const rowsOf = () => [...list.querySelectorAll('.task-row')];

  /**
   * List the shown task identifiers.
   * @returns {string[]} the identifiers, in order
   */
  const idsOf = () => rowsOf().map((row) => row.dataset.taskId);

  /**
   * Move a task one row, when moves are on and a row is left in that direction.
   * @param {string} taskId the task
   * @param {-1|1} delta the direction
   */
  function step(taskId, delta) {
    const move = enabled() ? placementBy(idsOf(), taskId, delta) : null;
    if (move) {
      onMove(taskId, move);
    }
  }

  /**
   * Show the drop spot of the current slot, or none when the row would stay.
   * @returns {{placement: object, index: number}|null} the move of the current slot
   */
  function mark() {
    const move = placementAt(drag.ids, drag.row.dataset.taskId, drag.slot);
    drag.rows.forEach((row) => row.removeAttribute('data-drop'));
    if (move) {
      const below = drag.slot < drag.rows.length;
      drag.rows[below ? drag.slot : drag.rows.length - 1].dataset.drop = below ? 'before' : 'after';
    }
    return move;
  }

  /**
   * End a drag, storing the move unless it was cancelled.
   * @param {boolean} commit whether to store the move
   */
  function finish(commit) {
    if (!drag) {
      return;
    }
    const current = drag;
    const move = current.row.isConnected ? mark() : null;
    drag = null;
    if (current.frame !== null) {
      cancelAnimationFrame(current.frame);
    }
    current.rows.forEach((row) => row.removeAttribute('data-drop'));
    current.row.removeAttribute('data-dragging');
    current.row.style.removeProperty('translate');
    if (commit && move) {
      onMove(current.row.dataset.taskId, move);
    }
  }

  /**
   * Start a drag from a row handle.
   * @param {PointerEvent} event the pointer down event
   */
  function onPointerDown(event) {
    const handle = event.target.closest?.('.task-row__handle');
    if (!handle || event.button !== 0 || !enabled()) {
      return;
    }
    event.preventDefault();
    const rows = rowsOf();
    const row = handle.closest('.task-row');
    const top = list.getBoundingClientRect().top;
    drag = {
      row, rows, ids: rows.map((candidate) => candidate.dataset.taskId), slot: rows.indexOf(row),
      startY: event.clientY - top, y: event.clientY, frame: null,
      midpoints: rows.map((candidate) => {
        const box = candidate.getBoundingClientRect();
        return box.top - top + box.height / 2;
      }),
    };
    handle.setPointerCapture?.(event.pointerId);
    row.dataset.dragging = 'true';
  }

  /** Move the dragged row to the pointer and mark the drop spot, in positions from the list's top. */
  function follow() {
    const y = drag.y - list.getBoundingClientRect().top;
    drag.row.style.translate = `0 ${y - drag.startY}px`;
    drag.slot = slotAt(drag.midpoints, y);
    mark();
  }

  /** Scroll by one step while the pointer is near an edge of the scroller, then again on the next frame. */
  function autoscroll() {
    drag.frame = null;
    if (!drag.row.isConnected) {
      finish(false);
      return;
    }
    const view = scroller();
    const box = view?.getBoundingClientRect();
    const speed = !box ? 0 : drag.y < box.top + EDGE_PX ? -SCROLL_PX : drag.y > box.bottom - EDGE_PX ? SCROLL_PX : 0;
    if (speed !== 0) {
      view.scrollTop += speed;
      follow();
      drag.frame = requestAnimationFrame(autoscroll);
    }
  }

  /**
   * Follow the pointer with the dragged row, mark the drop spot, and scroll near an edge.
   * @param {PointerEvent} event the pointer move event
   */
  function onPointerMove(event) {
    if (!drag) {
      return;
    }
    if (!drag.row.isConnected) {
      finish(false);
      return;
    }
    drag.y = event.clientY;
    follow();
    drag.frame ??= requestAnimationFrame(autoscroll);
  }

  /**
   * Cancel a drag with Escape.
   * @param {KeyboardEvent} event the key event
   */
  function onEscape(event) {
    if (event.key === 'Escape' && drag) {
      event.preventDefault();
      finish(false);
    }
  }

  /**
   * Move the focused row with Alt+Up and Alt+Down.
   * @param {KeyboardEvent} event the key event
   */
  function onKeydown(event) {
    const row = event.target.closest?.('.task-row');
    if (!row || !event.altKey || event.ctrlKey || event.metaKey || !['ArrowUp', 'ArrowDown'].includes(event.key)) {
      return;
    }
    event.preventDefault();
    step(row.dataset.taskId, event.key === 'ArrowUp' ? -1 : 1);
  }

  const onPointerUp = () => finish(true);
  const onPointerCancel = () => finish(false);
  const doc = list.ownerDocument;
  list.addEventListener('pointerdown', onPointerDown);
  list.addEventListener('pointermove', onPointerMove);
  list.addEventListener('pointerup', onPointerUp);
  list.addEventListener('pointercancel', onPointerCancel);
  list.addEventListener('keydown', onKeydown);
  doc.addEventListener('keydown', onEscape);
  // A render that drops the handle drops its pointer capture too, so the pointer up may never reach the list.
  doc.addEventListener('lostpointercapture', onPointerCancel);

  return {
    step,

    /** Cancel a drag and stop listening. */
    destroy() {
      finish(false);
      list.removeEventListener('pointerdown', onPointerDown);
      list.removeEventListener('pointermove', onPointerMove);
      list.removeEventListener('pointerup', onPointerUp);
      list.removeEventListener('pointercancel', onPointerCancel);
      list.removeEventListener('keydown', onKeydown);
      doc.removeEventListener('keydown', onEscape);
      doc.removeEventListener('lostpointercapture', onPointerCancel);
    },
  };
}
