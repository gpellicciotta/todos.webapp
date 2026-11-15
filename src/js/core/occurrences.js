/**
 * Lifecycle rules, occurrences, and events of tasks, folded as the todos.server business logic spec says (`LOC-2`).
 *
 * A task embeds its `lifecycle-rules` and its `current-occurrence`, like the service's `Task` schema.
 * Statuses follow from events: the fold applies them in `creation-time` order, then by `id`,
 * and ignores an event whose precondition fails at its place, so offline reordering never fails.
 * A one-off occurrence closes when it becomes `completed` or `cancelled`, and reopens when it leaves them.
 * Periods and roll-over of recurring tasks are out of scope here; recurring occurrences only stay open.
 * See docs/specs/local-store.md, Lifecycle.
 */

/** Occurrence statuses, in lifecycle order; `ready` replaces the former `todo`. */
export const STATUSES = Object.freeze(['ready', 'in-progress', 'completed', 'cancelled']);

/** Statuses of an open occurrence that can still become overdue. */
export const OPEN_STATUSES = Object.freeze(['ready', 'in-progress']);

/** Event types that clients post; the service and the system write the others. */
export const USER_EVENT_TYPES = Object.freeze(['complete', 'uncomplete', 'start', 'unstart', 'cancel', 'reopen']);

/** The rules of a new task: a one-off task with target 1, no deadline, and overdue handling `keep`. */
export const DEFAULT_RULES = Object.freeze({
  'target-count': 1,
  'due-time': null,
  'overdue-handling': 'keep',
  'recurrence-unit': null,
  'recurrence-interval': null,
  'recurrence-end-date': null,
  'recurrence-end-count': null,
  timezone: null,
});

/** Rule field names, in schema order. */
export const RULE_FIELDS = Object.freeze(Object.keys(DEFAULT_RULES));

/**
 * Return the status an occurrence takes from its count: `ready` at 0, `completed` at or above target, else `in-progress`.
 * @param {number} count the completion count
 * @param {number} target the target count
 * @returns {string} the status
 */
export function statusFromCount(count, target) {
  if (count <= 0) {
    return 'ready';
  }
  return count >= target ? 'completed' : 'in-progress';
}

/**
 * Tell whether rules describe a recurring task.
 * @param {object} [rules] the lifecycle rules
 * @returns {boolean} true when a recurrence unit is set
 */
function isRecurring(rules) {
  return Boolean(rules?.['recurrence-unit']);
}

/**
 * Complete rules and keep the one-off and recurring shapes apart, as the service does:
 * a recurring task keeps `due-time` and `overdue-handling` empty.
 * @param {object} rules rule fields over the defaults
 * @returns {object} the full rules
 */
export function normalizeRules(rules) {
  const full = { ...DEFAULT_RULES, ...rules };
  if (isRecurring(full)) {
    full['due-time'] = null;
    full['overdue-handling'] = null;
  }
  return full;
}

/**
 * Return occurrence 1 of a task with the given rules, open from `startTime`.
 * @param {object} rules the full rules
 * @param {string} startTime the ISO start time, the task's creation time
 * @returns {object} the occurrence, without `task-id`
 */
export function firstOccurrence(rules, startTime) {
  return {
    occurrence: 1,
    'start-time': startTime,
    'due-time': isRecurring(rules) ? null : rules['due-time'] ?? null,
    'target-count': rules['target-count'] ?? 1,
    'completion-count': 0,
    status: 'ready',
    'close-time': null,
  };
}

/**
 * Close a one-off occurrence that became `completed` or `cancelled`, and reopen one that left them.
 * @param {object} occurrence the occurrence, changed in place
 * @param {object} [rules] the lifecycle rules
 * @param {string} time the time of the change
 * @returns {object} the occurrence
 */
function settleClosing(occurrence, rules, time) {
  if (!isRecurring(rules)) {
    const closed = occurrence.status === 'completed' || occurrence.status === 'cancelled';
    occurrence['close-time'] = closed ? occurrence['close-time'] ?? time : null;
  }
  return occurrence;
}

/**
 * Apply one event to an occurrence.
 * Events without effect on the occurrence, such as `create` and rule edits, leave it unchanged.
 * @param {object} occurrence the occurrence before the event
 * @param {{type: string, 'creation-time': string}} event the event
 * @param {object} [rules] the lifecycle rules; a recurring task keeps its occurrence open
 * @returns {object|null} the new occurrence, or null when the event's precondition fails
 */
export function applyEvent(occurrence, event, rules = DEFAULT_RULES) {
  const next = { ...occurrence };
  const time = event['creation-time'];
  const { status } = occurrence;
  const count = occurrence['completion-count'];
  switch (event.type) {
    case 'complete':
    case 'uncomplete': {
      const changed = count + (event.type === 'complete' ? 1 : -1);
      if (status === 'cancelled' || changed < 0) {
        return null;
      }
      next['completion-count'] = changed;
      next.status = statusFromCount(changed, occurrence['target-count']);
      break;
    }
    case 'start':
      if (status !== 'ready') {
        return null;
      }
      next.status = 'in-progress';
      break;
    case 'unstart':
      if (status !== 'in-progress' || count !== 0) {
        return null;
      }
      next.status = 'ready';
      break;
    case 'cancel':
      if (status === 'cancelled') {
        return null;
      }
      next.status = 'cancelled';
      next['close-time'] = time;
      return next;
    case 'expire':
      if (!OPEN_STATUSES.includes(status)) {
        return null;
      }
      next.status = 'cancelled';
      next['close-time'] = time;
      return next;
    case 'reopen':
      if (status !== 'cancelled') {
        return null;
      }
      next.status = statusFromCount(count, occurrence['target-count']);
      next['close-time'] = null;
      break;
    default:
      return next;
  }
  return settleClosing(next, rules, time);
}

/**
 * Compare events by creation time, then by identifier.
 * @param {object} a an event
 * @param {object} b another event
 * @returns {number} negative, zero, or positive
 */
export function byEventOrder(a, b) {
  const x = Date.parse(a['creation-time']);
  const y = Date.parse(b['creation-time']);
  if (x !== y) {
    return x - y;
  }
  if (a.id === b.id) {
    return 0;
  }
  return a.id < b.id ? -1 : 1;
}

/**
 * Fold events onto an occurrence in creation-time order, then by identifier.
 * An event whose precondition fails at its place is ignored.
 * @param {object} occurrence the occurrence before the events
 * @param {object[]} events the events
 * @param {object} [rules] the lifecycle rules
 * @returns {object} the occurrence after the events
 */
export function foldEvents(occurrence, events, rules = DEFAULT_RULES) {
  return [...events].sort(byEventOrder).reduce((current, event) => applyEvent(current, event, rules) ?? current, occurrence);
}

/**
 * Pick the next event that moves an occurrence towards a status, as the todos.server status mapping does.
 * @param {object} occurrence the occurrence
 * @param {string} status the wanted status
 * @returns {string|null} the event type, or null when the occurrence has the status
 */
function nextEventTowards(occurrence, status) {
  const current = occurrence.status;
  if (current === status) {
    return null;
  }
  if (status === 'cancelled') {
    return 'cancel';
  }
  if (current === 'cancelled') {
    return 'reopen';
  }
  if (status === 'completed') {
    return 'complete';
  }
  if (status === 'in-progress') {
    return current === 'ready' ? 'start' : 'uncomplete';
  }
  return occurrence['completion-count'] > 0 ? 'uncomplete' : 'unstart';
}

/**
 * Return the events that move an occurrence to a status: `completed` posts `complete`, `cancelled` posts `cancel`,
 * `in-progress` posts `start`, and going back posts `uncomplete`, `unstart`, or `reopen`.
 * A target above 1 takes one `complete` per missing completion.
 * @param {object} occurrence the occurrence
 * @param {string} status the wanted status, one of `STATUSES`
 * @param {object} [rules] the lifecycle rules
 * @returns {string[]} the event types, in order
 */
export function eventsTowardsStatus(occurrence, status, rules = DEFAULT_RULES) {
  const types = [];
  let current = occurrence;
  const limit = 2 * Math.max(occurrence['target-count'], occurrence['completion-count']) + 4;
  for (let type = nextEventTowards(current, status); type && types.length < limit; type = nextEventTowards(current, status)) {
    const next = applyEvent(current, { type, 'creation-time': current['start-time'] }, rules);
    if (!next) {
      break;
    }
    types.push(type);
    current = next;
  }
  return types;
}

/**
 * Apply a rule edit to a task: target and deadline edits move the open occurrence, as the service does.
 * Making a task recurring clears its deadline and overdue handling; stopping recurrence sets handling `keep`.
 * @param {object} task a task with `lifecycle-rules` and `current-occurrence`
 * @param {object} edit rule fields; `null` clears a field
 * @param {string} time the edit time
 * @returns {{'lifecycle-rules': object, 'current-occurrence': object}} the new rules and occurrence
 */
export function applyRuleEdit(task, edit, time) {
  const before = { ...DEFAULT_RULES, ...task['lifecycle-rules'] };
  let rules = { ...before, ...edit };
  if (!isRecurring(rules) && isRecurring(before)) {
    Object.assign(rules, { 'recurrence-interval': null, 'recurrence-end-date': null, 'recurrence-end-count': null, timezone: null, 'overdue-handling': 'keep' });
  }
  rules = normalizeRules(rules);
  const occurrence = { ...task['current-occurrence'] };
  if (occurrence['close-time'] === null || !isRecurring(rules)) {
    occurrence['target-count'] = rules['target-count'];
    if (!isRecurring(rules)) {
      occurrence['due-time'] = rules['due-time'];
    }
    if (occurrence.status !== 'cancelled' && occurrence['completion-count'] > 0) {
      occurrence.status = statusFromCount(occurrence['completion-count'], occurrence['target-count']);
    }
    settleClosing(occurrence, rules, time);
  }
  return { 'lifecycle-rules': rules, 'current-occurrence': occurrence };
}

/**
 * Read the status of a task: the status of its current occurrence.
 * @param {object} task the task
 * @returns {string} the status
 */
export function statusOf(task) {
  return task['current-occurrence'].status;
}

/**
 * Read the due time of a task: the due time of its current occurrence.
 * @param {object} task the task
 * @returns {string|null} the ISO due time, or null
 */
export function dueTimeOf(task) {
  return task['current-occurrence']['due-time'] ?? null;
}

/**
 * Read the overdue handling of a task from its rules.
 * @param {object} task the task
 * @returns {string|null} `keep`, `cancel`, or null for a recurring task
 */
export function overdueHandlingOf(task) {
  return task['lifecycle-rules']['overdue-handling'];
}

/**
 * Tell whether overdue handling must expire a task now: a one-off task past its deadline,
 * with handling `cancel`, whose occurrence is still open below target (`OVD-4`).
 * @param {object} task the task
 * @param {Date|number} now the current time
 * @returns {boolean} true when an `expire` event applies
 */
export function shouldExpire(task, now) {
  const due = dueTimeOf(task);
  return overdueHandlingOf(task) === 'cancel' && Boolean(due) && OPEN_STATUSES.includes(statusOf(task))
    && Date.parse(due) < new Date(now).getTime();
}

/**
 * Return the later of two ISO times, or whichever is set.
 * @param {string|null|undefined} a a time
 * @param {string|null|undefined} b another time
 * @returns {string|null} the later time
 */
function laterTime(a, b) {
  if (!a || !b) {
    return a || b || null;
  }
  return Date.parse(b) > Date.parse(a) ? b : a;
}

/**
 * Build an event record, in the service's `TaskEvent` schema.
 * @param {object} fields `id`, `task-id`, `type`, `creation-time`, and optionally `owner-id` and `occurrence`
 * @returns {object} the event
 */
export function makeEvent({ id, 'task-id': taskId, type, 'creation-time': time, 'owner-id': ownerId = null, occurrence = 1 }) {
  return { id, 'task-id': taskId, occurrence, 'creation-time': time, 'owner-id': ownerId, type, details: null };
}

/**
 * Convert a task of the former shape, with `status`, `due-time`, `overdue-handling`, and `last-activity-time`,
 * as the server migration does: occurrence 1, the rules, a `create` event, and at most one status event.
 * @param {object} legacy the former task
 * @param {(time: string) => string} newId returns a new event identifier for an event time
 * @returns {{task: object, events: object[]}} the task in the new shape and its events
 */
export function fromLegacyTask(legacy, newId) {
  const {
    status, 'due-time': dueTime = null, 'overdue-handling': handling = 'keep', 'last-activity-time': activity, ...rest
  } = legacy;
  const current = !status || status === 'todo' ? 'ready' : status;
  const rules = { ...DEFAULT_RULES, 'due-time': dueTime ?? null, 'overdue-handling': handling ?? 'keep' };
  const statusTime = legacy['last-update-time'] ?? legacy['creation-time'];
  const closed = current === 'completed' || current === 'cancelled';
  const task = {
    id: rest.id,
    description: rest.description,
    'owner-id': rest['owner-id'] ?? null,
    'lifecycle-rules': rules,
    'current-occurrence': {
      ...firstOccurrence(rules, legacy['creation-time']),
      'completion-count': current === 'completed' ? 1 : 0,
      status: current,
      'close-time': closed ? statusTime : null,
    },
    'creation-time': legacy['creation-time'],
    'last-update-time': laterTime(legacy['last-update-time'], activity) ?? legacy['creation-time'],
    'deletion-time': rest['deletion-time'] ?? null,
    ...(rest.revision === undefined ? {} : { revision: rest.revision }),
  };
  const events = [makeEvent({ id: newId(legacy['creation-time']), 'task-id': task.id, type: 'create', 'creation-time': legacy['creation-time'], 'owner-id': task['owner-id'] })];
  const statusEvent = { 'in-progress': 'start', completed: 'complete', cancelled: 'cancel' }[current];
  if (statusEvent) {
    events.push(makeEvent({ id: newId(statusTime), 'task-id': task.id, type: statusEvent, 'creation-time': statusTime }));
  }
  return { task, events };
}

/**
 * Convert a task back to the former shape of backup format 1: the status of its current occurrence,
 * with `ready` as `todo`, the one-off deadline rules, and its last update time as both times.
 * Format 1 has no recurrence, so a recurring task exports without due time and with handling `keep`.

 * @param {object} task the task
 * @returns {object} the former task fields
 */
export function toLegacyTask(task) {
  const status = statusOf(task);
  return {
    id: task.id,
    description: task.description,
    status: status === 'ready' ? 'todo' : status,
    'due-time': task['lifecycle-rules']['due-time'] ?? null,
    'overdue-handling': task['lifecycle-rules']['overdue-handling'] ?? 'keep',
    'owner-id': task['owner-id'] ?? null,
    'creation-time': task['creation-time'],
    'last-update-time': task['last-update-time'],
    'last-activity-time': task['last-update-time'],
    'deletion-time': task['deletion-time'] ?? null,
  };
}
