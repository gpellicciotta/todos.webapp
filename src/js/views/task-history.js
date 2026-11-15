/**
 * Task history: the occurrences and events of one task, newest first, inside the task editor.
 *
 * The history loads once the user asks for it, with Show history, and again on each later ask.
 * While connected it reads the server routes `GET /api/tasks/{{task-id}}/occurrences` and `/events`,
 * since the change feed carries neither; in local mode, or when the server cannot answer, it reads the local stores.
 * An occurrence shows its number, period, status, and counts; a closed recurring occurrence still `ready` was missed,
 * and one still `in-progress` was partly done. An event shows its time, what happened, and its occurrence.
 * See docs/specs/ui-design.md, Task Editor.
 */

import { countWords, make as el, STATUS_LABELS } from './task-list.js';

/** History strings, for the strings module of TEC-13 to absorb. */
const STRINGS = Object.freeze({
  show: 'Show history', refresh: 'Refresh history', loading: 'Loading the history…', occurrences: 'Occurrences', events: 'Events',
  none: 'Nothing yet.', local: 'Showing the history kept on this device.', failed: 'The history could not be loaded.',
  missed: 'Missed', partly: 'Partly done', from: 'from ',
});

/** What each event type says in the history. */
export const EVENT_LABELS = Object.freeze({
  create: 'Created', complete: 'Ticked', uncomplete: 'Unticked', start: 'Started', unstart: 'Undid start',
  cancel: 'Cancelled', reopen: 'Reopened', 'edit-task': 'Edited', 'edit-lifecycle-rules': 'Changed the rules',
  expire: 'Expired', 'roll-over': 'Period ended', 'end-recurrence': 'Recurrence ended',
});

/**
 * Compare records by a time field, newest first.
 * @param {string} field the time field
 * @returns {(a: object, b: object) => number} the comparator
 */
const newestFirst = (field) => (a, b) => Date.parse(b[field]) - Date.parse(a[field]) || (a.id && b.id ? (a.id < b.id ? 1 : -1) : 0);

/**
 * Read the history from the server routes.
 * @param {{send: Function}} api the API client
 * @param {string} taskId the task identifier
 * @returns {Promise<{events: object[], occurrences: object[]}|null>} the history, or null when the server cannot answer
 */
async function readServer(api, taskId) {
  try {
    const [events, occurrences] = [await api.send('GET', `/api/tasks/${taskId}/events`), await api.send('GET', `/api/tasks/${taskId}/occurrences`)];
    if (!events.ok || !occurrences.ok || !Array.isArray(events.body) || !Array.isArray(occurrences.body)) {
      return null;
    }
    return { events: events.body, occurrences: occurrences.body };
  }
  catch {
    // No connection or no token: the local stores answer instead.
    return null;
  }
}

/**
 * Create the history of a task.
 * @param {object} options the history options
 * @param {Document} options.document the document
 * @param {object} options.store the store facade, with `eventsOfTask` and `occurrencesOfTask`
 * @param {string} options.taskId the task identifier
 * @param {{send: Function}} [options.api] the API client, used while connected
 * @param {{state: () => string}} [options.session] the session; without one, the app is in local mode
 * @param {string} [options.locale] the locale of times, the user's by default
 * @returns {{element: HTMLElement, load: () => Promise<void>}} the history
 */
export function createTaskHistory({ document: doc, store, taskId, api = null, session = null, locale }) {
  const day = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' });
  const moment = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  const element = el(doc, 'div', 'task-history');
  const button = el(doc, 'button', 'button button--secondary', STRINGS.show);
  button.type = 'button';
  button.dataset.action = 'history';
  const status = el(doc, 'p', 'task-history__status');
  status.setAttribute('role', 'status');
  const body = el(doc, 'div', 'task-history__body');
  element.append(button, status, body);

  /**
   * Describe an occurrence: its number, period, status, and counts.
   * @param {object} occurrence the occurrence
   * @returns {string} the text
   */
  function describeOccurrence(occurrence) {
    const start = new Date(occurrence['start-time']);
    const period = occurrence['due-time']
      ? `${day.format(start)} – ${day.format(new Date(Date.parse(occurrence['due-time']) - 1))}` : `${STRINGS.from}${day.format(start)}`;
    const closed = occurrence['close-time'] !== null;
    const recurring = Boolean(occurrence['due-time']) && closed && (occurrence.status === 'ready' || occurrence.status === 'in-progress');
    const label = recurring ? (occurrence.status === 'ready' ? STRINGS.missed : STRINGS.partly) : STATUS_LABELS[occurrence.status];
    return `#${occurrence.occurrence} · ${period} · ${label} · ${countWords(occurrence)}`;
  }

  /**
   * Describe an event: its time, what happened, and its occurrence.
   * @param {object} event the event
   * @returns {string} the text
   */
  function describeEvent(event) {
    const what = EVENT_LABELS[event.type] ?? event.type;
    return `${moment.format(new Date(event['creation-time']))} · ${what}${event.occurrence ? ` · #${event.occurrence}` : ''}`;
  }

  /**
   * Render one titled list of the history.
   * @param {string} kind `occurrences` or `events`
   * @param {string} title the heading
   * @param {string[]} texts the entries
   * @returns {HTMLElement[]} the heading and the list
   */
  function section(kind, title, texts) {
    const list = el(doc, 'ul', 'task-history__list');
    list.dataset.history = kind;
    list.append(...(texts.length > 0 ? texts : [STRINGS.none]).map((text) => el(doc, 'li', 'task-history__item', text)));
    return [el(doc, 'h4', 'task-history__title', title), list];
  }

  /**
   * Load the history and show it.
   * @returns {Promise<void>} resolves once shown
   */
  async function load() {
    status.textContent = STRINGS.loading;
    button.disabled = true;
    try {
      const connected = Boolean(api) && session?.state?.() === 'connected';
      let history = connected ? await readServer(api, taskId) : null;
      const local = !history;
      if (local) {
        history = { events: await store.eventsOfTask(taskId), occurrences: await store.occurrencesOfTask(taskId) };
      }
      body.replaceChildren(
        ...section('occurrences', STRINGS.occurrences, [...history.occurrences].sort((a, b) => b.occurrence - a.occurrence).map(describeOccurrence)),
        ...section('events', STRINGS.events, [...history.events].sort(newestFirst('creation-time')).map(describeEvent)),
      );
      status.textContent = connected && local ? STRINGS.local : '';
      button.textContent = STRINGS.refresh;
    }
    catch (error) {
      console.error('Task history failed to load:', error);
      status.textContent = STRINGS.failed;
    }
    finally {
      button.disabled = false;
    }
  }

  button.addEventListener('click', () => load());
  return { element, load };
}
