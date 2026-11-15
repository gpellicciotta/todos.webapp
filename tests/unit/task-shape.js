import { DEFAULT_RULES } from '../../src/js/core/occurrences.js';

/**
 * Build a task in the store shape from shortcut fields, for tests of readers that only look at a few fields.
 * `status`, `due-time`, `overdue-handling`, `target-count`, and `completion-count` set the rules and the current occurrence;
 * every other field is copied. A `completed` task without a count gets count 1.
 * @param {object} [fields] the shortcut and task fields
 * @returns {object} the task with `lifecycle-rules` and `current-occurrence`
 */
export function shapeTask({
  status = 'ready', 'due-time': dueTime = null, 'overdue-handling': handling = 'keep', 'target-count': target = 1,
  'completion-count': count = status === 'completed' ? target : 0, ...fields
} = {}) {
  const closed = status === 'completed' || status === 'cancelled';
  return {
    'owner-id': null,
    'creation-time': '2026-11-01T09:00:00.000Z',
    'last-update-time': fields['creation-time'] ?? '2026-11-01T09:00:00.000Z',
    'deletion-time': null,
    ...fields,
    'lifecycle-rules': { ...DEFAULT_RULES, 'target-count': target, 'due-time': dueTime, 'overdue-handling': handling },
    'current-occurrence': {
      occurrence: 1,
      'start-time': fields['creation-time'] ?? '2026-11-01T09:00:00.000Z',
      'due-time': dueTime,
      'target-count': target,
      'completion-count': count,
      status,
      'close-time': closed ? fields['last-update-time'] ?? '2026-11-01T09:00:00.000Z' : null,
    },
  };
}
