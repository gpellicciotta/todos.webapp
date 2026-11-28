/**
 * Task history: the occurrences and events of one task, newest first, inside the task editor.
 *
 * The history loads once the editor asks for it, as its History tab first shows, and again on each Refresh history.
 * It shows the occurrences and the events as two tables, the newest 20 of each, and Load more adds 20 (`TSK-17`).
 * While connected it reads the server routes `GET /api/tasks/{{task-id}}/occurrences` and `/events` page by page,
 * since the change feed carries neither; in local mode, or when the server cannot answer, it reads the local stores.
 * An occurrence shows its number, period, status, and progress; a closed recurring occurrence still `ready` was missed,
 * and one still `in-progress` was partly done. Below it come the notes linked to it, newest first, from the local store,
 * which the change feed fills, and which follow note changes without a refresh (`NOT-6`). An event shows its time, what happened, and its occurrence.
 * See docs/specs/ui-design.md, Task Editor.
 */

import { entryWords, formatMeasure, progressOf } from '../core/progress.js';
import { countWords, make as el, STATUS_LABELS } from './task-list.js';

/** History strings, for the strings module of TEC-13 to absorb. */
const STRINGS = Object.freeze({
  show: 'Show history', refresh: 'Refresh history', loading: 'Loading the history…', occurrences: 'Occurrences', events: 'Events',
  none: 'Nothing yet.', local: 'Showing the history kept on this device.', failed: 'The history could not be loaded.',
  number: '#', period: 'Period', status: 'Status', progress: 'Progress', when: 'When', event: 'Event',
  moreOccurrences: 'Load more occurrences', moreEvents: 'Load more events',
  missed: 'Missed', partly: 'Partly done', from: 'from ', notesOf: 'Notes of occurrence ',
  you: 'You', collaborator: 'Collaborator', logged: 'logged', undid: 'undid', anEntry: 'an entry', max: 'max ',
});

/** How many occurrences and events the history shows at first, and how many each Load more adds. */
const PAGE_SIZE = 20;

/** What each event type says in the history. */
export const EVENT_LABELS = Object.freeze({
  create: 'Created', complete: 'Ticked', uncomplete: 'Unticked', start: 'Started', unstart: 'Undid start',
  log: 'Logged', 'undo-log': 'Undid', cancel: 'Cancelled', reopen: 'Reopened', 'edit-task': 'Edited', 'edit-lifecycle-rules': 'Changed the rules',
  expire: 'Expired', 'roll-over': 'Period ended', 'end-recurrence': 'Recurrence ended',
});

/**
 * Describe the progress of an occurrence against its goal: `2 of 3 done` for checks, else `1,910 / max 1,600 kcal`.
 * @param {object} occurrence the occurrence
 * @param {string} [locale] the locale of numbers
 * @returns {string} the words
 */
function progressWords(occurrence, locale = undefined) {
  const p = progressOf(occurrence);
  if (p.measure === 'checks') {
    return countWords(occurrence);
  }
  return `${formatMeasure(p.measure, p.value, null, locale)} / ${p.direction === 'at-most' ? STRINGS.max : ''}${formatMeasure(p.measure, p.target, p.unit, locale)}`;
}
/**
 * Compare records by a time field, newest first.
 * @param {string} field the time field
 * @returns {(a: object, b: object) => number} the comparator
 */
const newestFirst = (field) => (a, b) => Date.parse(b[field]) - Date.parse(a[field]) || (a.id && b.id ? (a.id < b.id ? 1 : -1) : 0);

/**
 * Name the period of an occurrence, such as `3 Nov – 9 Nov`, one date for a period of one day, or `from 3 Nov` without a due time.
 * @param {object} occurrence the occurrence
 * @param {Intl.DateTimeFormat} day the day format
 * @returns {string} the words
 */
function periodWords(occurrence, day) {
  const start = day.format(new Date(occurrence['start-time']));
  if (!occurrence['due-time']) {
    return `${STRINGS.from}${start}`;
  }
  const end = day.format(new Date(Date.parse(occurrence['due-time']) - 1));
  return start === end ? start : `${start} – ${end}`;
}

/**
 * Name an occurrence by its number and period, as the note link choice shows it, such as `#12 · 3 Nov – 9 Nov`.
 * @param {object} occurrence the occurrence
 * @param {Intl.DateTimeFormat} day the day format
 * @returns {string} the label
 */
export function occurrenceLabel(occurrence, day) {
  const start = new Date(occurrence['start-time']);
  const period = occurrence['due-time']
    ? `${day.format(start)} – ${day.format(new Date(Date.parse(occurrence['due-time']) - 1))}` : `${STRINGS.from}${day.format(start)}`;
  return `#${occurrence.occurrence} · ${period}`;
}

/**
 * Return the day format of occurrence labels.
 * @param {string} [locale] the locale, the user's by default
 * @returns {Intl.DateTimeFormat} the format
 */
export function dayFormat(locale) {
  return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' });
}

/**
 * Read the occurrences of a task from the server route, as the history and the note link choice do while connected.
 * @param {{send: Function}} api the API client
 * @param {string} taskId the task identifier
 * @returns {Promise<object[]|null>} the occurrences, or null when the server cannot answer
 */
export async function readServerOccurrences(api, taskId) {
  try {
    const response = await api.send('GET', `/api/tasks/${taskId}/occurrences`);
    return response.ok && Array.isArray(response.body) ? response.body : null;
  }
  catch {
    // No connection or no token.
    return null;
  }
}

/**
 * Read the records of a history route, newest first, one page at a time as the history asks for more.
 * @param {{send: Function}} api the API client
 * @param {string} path the route
 * @returns {{items: object[], more: boolean, until: (done: (items: object[]) => boolean) => Promise<void>}} the records read,
 *   whether the route holds more, and `until`, which reads pages while the records do not satisfy `done`;
 *   it rejects when the service cannot answer, and the next call asks for the same page again
 */
function pagedRecords(api, path) {
  let query = `page=first&page-size=${PAGE_SIZE}`;
  const records = {
    items: [],
    more: true,
    async until(done) {
      while (records.more && !done(records.items)) {
        const response = await api.send('GET', `${path}?${query}`);
        if (!response.ok || !Array.isArray(response.body?.elements)) {
          throw new Error(`The service answered ${response.status} for ${path}`);
        }
        records.items.push(...response.body.elements);
        const bookmark = response.body['end-bookmark'];
        records.more = Boolean(bookmark) && response.body.elements.length > 0;
        query = `page=next&page-size=${PAGE_SIZE}&page-bookmark=${encodeURIComponent(bookmark)}`;
      }
    },
  };
  return records;
}

/**
 * Wrap the records of a local store, which are all there at once, newest first.
 * @param {object[]} items the records
 * @returns {{items: object[], more: boolean, until: () => Promise<void>}} the records
 */
function storedRecords(items) {
  return { items, more: false, until: async () => {} };
}

/**
 * Create the history of a task.
 * @param {object} options the history options
 * @param {Document} options.document the document
 * @param {object} options.store the store facade, with `eventsOfTask`, `occurrencesOfTask`, and `notesOfTask`
 * @param {string} options.taskId the task identifier
 * @param {{send: Function}} [options.api] the API client, used while connected
 * @param {{state: () => string}} [options.session] the session; without one, the app is in local mode
 * @param {string} [options.locale] the locale of times, the user's by default
 * @param {() => (string|number|null)} [options.userId] reads the user's identifier, which tells own entries from a collaborator's
 * @returns {{element: HTMLElement, load: () => Promise<void>, showNotes: (notes: object[]) => void}} the history;
 *   `showNotes` redraws the notes of a shown history without reading the occurrences and events again
 */
export function createTaskHistory({ document: doc, store, taskId, api = null, session = null, locale, userId = () => null }) {
  const day = dayFormat(locale);
  const moment = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  const element = el(doc, 'div', 'task-history');
  const button = el(doc, 'button', 'button button--secondary', STRINGS.show);
  button.type = 'button';
  button.dataset.action = 'history';
  const status = el(doc, 'p', 'task-history__status');
  status.setAttribute('role', 'status');
  const body = el(doc, 'div', 'task-history__body');
  element.append(button, status, body);
  /** The records shown, from `pagedRecords` or `storedRecords`, once loaded. */
  let source = null;
  let shownNotes = [];
  /** How many of each the history shows; Load more raises it, and Refresh history keeps it. */
  const count = { occurrences: PAGE_SIZE, events: PAGE_SIZE };

  /**
   * Render the notes of an occurrence as a row under it.
   * @param {object} occurrence the occurrence
   * @param {object[]} notes its notes, newest first
   * @returns {HTMLTableRowElement} the row
   */
  function renderNotes(occurrence, notes) {
    const list = el(doc, 'ul', 'task-history__notes');
    list.setAttribute('aria-label', `${STRINGS.notesOf}${occurrence.occurrence}`);
    list.append(...notes.map((note) => {
      const entry = el(doc, 'li', 'task-history__note');
      const time = el(doc, 'time', 'task-history__note-time', moment.format(new Date(note['creation-time'])));
      time.dateTime = note['creation-time'];
      entry.append(time, ` · ${note.text}`);
      return entry;
    }));
    const row = el(doc, 'tr', 'task-history__notes-row');
    const holder = row.appendChild(el(doc, 'td'));
    holder.setAttribute('colspan', '4');
    holder.append(list);
    return row;
  }

  /**
   * Render an occurrence as a row group: its number, period, status, and progress, with its notes below.
   * @param {object} occurrence the occurrence
   * @param {object[]} notes its notes, newest first
   * @returns {HTMLTableSectionElement} the row group
   */
  function renderOccurrence(occurrence, notes) {
    const closed = occurrence['close-time'] !== null;
    const recurring = Boolean(occurrence['due-time']) && closed && (occurrence.status === 'ready' || occurrence.status === 'in-progress');
    const label = recurring ? (occurrence.status === 'ready' ? STRINGS.missed : STRINGS.partly) : STATUS_LABELS[occurrence.status];
    const group = el(doc, 'tbody');
    group.dataset.occurrence = String(occurrence.occurrence);
    const row = group.appendChild(el(doc, 'tr'));
    const number = row.appendChild(el(doc, 'th', 'task-history__number', String(occurrence.occurrence)));
    number.setAttribute('scope', 'row');
    row.append(...[periodWords(occurrence, day), label, progressWords(occurrence, locale)].map((text) => el(doc, 'td', '', text)));
    if (notes.length > 0) {
      group.append(renderNotes(occurrence, notes));
    }
    return group;
  }

  /**
   * Say what happened in an event.
   * A log entry names its author, label, and value, such as `You logged Croissant · 320 kcal`; an undo names the entry it undid.
   * @param {object} event the event
   * @returns {string} the words
   */
  function eventWords(event) {
    if (event.type !== 'log' && event.type !== 'undo-log') {
      return EVENT_LABELS[event.type] ?? event.type;
    }
    const mine = event['owner-id'] === undefined || event['owner-id'] === null || event['owner-id'] === userId();
    const author = mine ? STRINGS.you : STRINGS.collaborator;
    const entry = event.type === 'log' ? event : source.events.items.find((other) => other.id === event['target-event-id']);
    if (!entry) {
      return `${author} ${STRINGS.undid} ${STRINGS.anEntry}`;
    }
    const goal = progressOf(source.occurrences.items.find((occurrence) => occurrence.occurrence === entry.occurrence) ?? {});
    const what = [entry.label, entryWords(entry, goal, locale)].filter(Boolean).join(' · ');
    return `${author} ${event.type === 'log' ? STRINGS.logged : STRINGS.undid} ${what}`;
  }

  /**
   * Render an event as a row; a log entry that an undo names stays listed, struck through.
   * @param {object} event the event
   * @param {Set<string>} undone the identifiers of the undone entries
   * @returns {HTMLTableRowElement} the row
   */
  function renderEvent(event, undone) {
    const row = el(doc, 'tr', 'task-history__event');
    row.dataset.event = event.id;
    row.classList.toggle('is-undone', event.type === 'log' && undone.has(event.id));
    const time = el(doc, 'time', '', moment.format(new Date(event['creation-time'])));
    time.dateTime = event['creation-time'];
    const when = el(doc, 'td', 'task-history__when');
    when.append(time);
    row.append(when, el(doc, 'td', '', eventWords(event)), el(doc, 'td', 'task-history__number', event.occurrence ? String(event.occurrence) : ''));
    return row;
  }

  /**
   * Render one table of the history.
   * @param {string} kind `occurrences` or `events`
   * @param {string[]} columns the column headings
   * @param {HTMLElement[]} groups the row groups, none for an empty table
   * @returns {HTMLTableElement} the table
   */
  function table(kind, columns, groups) {
    const result = el(doc, 'table', `task-history__table task-history__table--${kind}`);
    result.dataset.history = kind;
    result.append(el(doc, 'caption', 'task-history__title', STRINGS[kind]));
    const head = el(doc, 'tr');
    head.append(...columns.map((name, index) => {
      const cell = el(doc, 'th', index === 0 || name === STRINGS.number ? 'task-history__number' : '', name);
      cell.setAttribute('scope', 'col');
      return cell;
    }));
    result.appendChild(el(doc, 'thead')).append(head);
    if (groups.length === 0) {
      const empty = el(doc, 'td', '', STRINGS.none);
      empty.setAttribute('colspan', String(columns.length));
      result.appendChild(el(doc, 'tbody')).appendChild(el(doc, 'tr')).append(empty);
    }
    result.append(...groups);
    return result;
  }

  /**
   * Create the Load more button of a table, when it holds more than it shows.
   * @param {'occurrences'|'events'} kind the table
   * @returns {HTMLButtonElement[]} the button, or nothing
   */
  function moreButton(kind) {
    if (source[kind].items.length <= count[kind] && !source[kind].more) {
      return [];
    }
    const more = el(doc, 'button', 'button button--secondary task-history__more', kind === 'events' ? STRINGS.moreEvents : STRINGS.moreOccurrences);
    more.type = 'button';
    more.dataset.action = `more-${kind}`;
    more.addEventListener('click', () => loadMore(kind));
    return [more];
  }

  /** Draw the shown records with the notes of their occurrences. */
  function draw() {
    const occurrences = source.occurrences.items.slice(0, count.occurrences);
    const events = source.events.items.slice(0, count.events);
    // An undo is newer than its entry, so every undo of a shown entry is among the records read.
    const undone = new Set(source.events.items.filter((event) => event.type === 'undo-log').map((event) => event['target-event-id']));
    const eventRows = el(doc, 'tbody');
    eventRows.append(...events.map((event) => renderEvent(event, undone)));
    body.replaceChildren(
      table('occurrences', [STRINGS.number, STRINGS.period, STRINGS.status, STRINGS.progress],
        occurrences.map((occurrence) => renderOccurrence(occurrence, shownNotes.filter((note) => note.occurrence === occurrence.occurrence)))),
      ...moreButton('occurrences'),
      table('events', [STRINGS.when, STRINGS.event, STRINGS.number], events.length > 0 ? [eventRows] : []),
      ...moreButton('events'),
    );
  }

  /**
   * Read as many records as the history shows, and those that their words need.
   * @param {{events: object, occurrences: object}} from the records
   * @returns {Promise<void>} resolves once read
   */
  async function read(from) {
    await from.events.until((items) => items.length >= count.events);
    await from.occurrences.until((items) => items.length >= count.occurrences);
    const events = from.events.items.slice(0, count.events);
    // An undo names its entry, which may sit on a later page.
    const targets = events.filter((event) => event.type === 'undo-log').map((event) => event['target-event-id']);
    await from.events.until((items) => targets.every((id) => items.some((event) => event.id === id)));
    // An entry reads its value in the goal of its occurrence.
    const needed = new Set(events.filter((event) => event.type === 'log' || event.type === 'undo-log').map((event) => event.occurrence));
    await from.occurrences.until((items) => [...needed].every((number) => items.some((occurrence) => occurrence.occurrence === number)));
  }

  /** Disable or enable Refresh history and the Load more buttons, so one read runs at a time. */
  function setBusy(busy) {
    for (const control of element.querySelectorAll('button')) {
      control.disabled = busy;
    }
  }

  /**
   * Read the records of the server routes, or of the local stores in local mode and when the server cannot answer.
   * @returns {Promise<{from: object, local: boolean, connected: boolean}>} the records, and where they came from
   */
  async function readSource() {
    const connected = Boolean(api) && session?.state?.() === 'connected';
    if (connected) {
      const from = { events: pagedRecords(api, `/api/tasks/${taskId}/events`), occurrences: pagedRecords(api, `/api/tasks/${taskId}/occurrences`) };
      try {
        await read(from);
        return { from, local: false, connected };
      }
      catch {
        // No connection, no token, or no answer: the local stores answer instead.
      }
    }
    const from = {
      events: storedRecords([...await store.eventsOfTask(taskId)].sort(newestFirst('creation-time'))),
      occurrences: storedRecords([...await store.occurrencesOfTask(taskId)].sort((a, b) => b.occurrence - a.occurrence)),
    };
    await read(from);
    return { from, local: true, connected };
  }

  /**
   * Load the history and show it.
   * @returns {Promise<void>} resolves once shown
   */
  async function load() {
    status.textContent = STRINGS.loading;
    setBusy(true);
    try {
      const { from, local, connected } = await readSource();
      shownNotes = await store.notesOfTask(taskId);
      source = from;
      draw();
      status.textContent = connected && local ? STRINGS.local : '';
      button.textContent = STRINGS.refresh;
    }
    catch (error) {
      console.error('Task history failed to load:', error);
      status.textContent = STRINGS.failed;
    }
    finally {
      setBusy(false);
    }
  }

  /**
   * Show 20 more of a table.
   * @param {'occurrences'|'events'} kind the table
   * @returns {Promise<void>} resolves once shown
   */
  async function loadMore(kind) {
    count[kind] += PAGE_SIZE;
    status.textContent = STRINGS.loading;
    setBusy(true);
    try {
      await read(source);
      draw();
      status.textContent = '';
      // The redraw replaced the button, so the focus moves to its successor, or to Refresh history after the last page.
      (body.querySelector(`[data-action="more-${kind}"]`) ?? button).focus({ preventScroll: true });
    }
    catch (error) {
      console.error('Loading more history failed:', error);
      count[kind] -= PAGE_SIZE;
      status.textContent = STRINGS.failed;
    }
    finally {
      setBusy(false);
    }
  }

  button.addEventListener('click', () => load());
  return {
    element,
    load,
    showNotes(notes) {
      if (source) {
        shownNotes = notes;
        draw();
      }
    },
  };
}
