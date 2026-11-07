/**
 * Permissions: what each role on a list or task may do (`SHR-4`, `SHR-5`).
 *
 * The table follows the service's business logic spec, Roles and Permissions. The service decides in the end;
 * the screens use these rules to offer only the actions that a request would not refuse.
 * Roles are ordered `viewer` < `task-editor` < `editor` < `owner`. A list without a role is a local list, which
 * its user owns.
 */

export const ROLES = Object.freeze(['viewer', 'task-editor', 'editor', 'owner']);

/** The lowest role that may do each action. */
const REQUIRED = Object.freeze({
  'read-task': 'viewer',
  'update-task': 'task-editor',
  'create-task': 'task-editor',
  'add-to-list': 'task-editor',
  'remove-from-list': 'task-editor',
  'reorder-task': 'task-editor',
  'read-notes': 'viewer',
  'add-note': 'task-editor',
  'edit-list': 'editor',
  'share-list': 'owner',
  'delete-list': 'owner',
});

export const ACTIONS = Object.freeze(Object.keys(REQUIRED));

/** Role names and the one-line explanation of each role that the Sharing section shows. */
export const ROLE_LABELS = Object.freeze({
  viewer: 'Viewer', 'task-editor': 'Task editor', editor: 'Editor', owner: 'Owner',
});
export const ROLE_HINTS = Object.freeze({
  viewer: 'Can view the list and its tasks',
  'task-editor': 'Can add, edit, and reorder tasks',
  editor: 'Can also rename and describe the list',
});

/**
 * Tell whether a role may do an action.
 * @param {string|null|undefined} role the role on the list or task
 * @param {string} action an action of `ACTIONS`
 * @returns {boolean} true when allowed; false without a role or for an unknown action
 */
export function can(role, action) {
  const lowest = REQUIRED[action];
  const rank = ROLES.indexOf(role);
  return lowest !== undefined && rank >= 0 && rank >= ROLES.indexOf(lowest);
}

/**
 * Read the role of the user on a list.
 * @param {{role?: string}|null|undefined} list the list
 * @returns {string|null} the role; `owner` for a local list, which has none; null without a list
 */
export function listRole(list) {
  return list ? list.role ?? 'owner' : null;
}

/**
 * Tell whether the user owns a task: tasks created here and tasks of the user.
 * @param {object} task the task
 * @param {number|string|null} userId the connected user, null in local mode
 * @returns {boolean} true for the task owner
 */
function ownsTask(task, userId) {
  const owner = task['owner-id'];
  return userId === null || userId === undefined || owner === null || owner === undefined || String(owner) === String(userId);
}

/**
 * Work out the effective role of the user on a task: owner of the task, or the highest role on a list holding it.
 * @param {object} task the task
 * @param {object[]} lists the non-deleted lists that hold the task
 * @param {number|string|null} userId the connected user, null in local mode
 * @returns {string|null} the role, or null when the user has none and could not see the task
 */
export function taskRole(task, lists, userId) {
  if (ownsTask(task, userId)) {
    return 'owner';
  }
  const ranks = lists.map((list) => ROLES.indexOf(listRole(list)));
  const best = Math.max(-1, ...ranks);
  return best < 0 ? null : ROLES[best];
}

/**
 * Tell whether the user may send a task to the recycle bin: the task owner, or the owner of a list holding it.
 * Other collaborators remove the task from the list instead.
 * @param {object} task the task
 * @param {object[]} lists the non-deleted lists that hold the task
 * @param {number|string|null} userId the connected user, null in local mode
 * @returns {boolean} true when the user may delete the task
 */
export function canTrashTask(task, lists, userId) {
  return ownsTask(task, userId) || lists.some((list) => listRole(list) === 'owner');
}

/**
 * List the More menu actions of a list that a role is offered, in menu order. Roles below `editor` cannot edit
 * the list, but still see its details and its Sharing section (`SHR-3`).
 * @param {string|null} role the role on the list
 * @returns {string[]} the actions: `edit`, `details`, `view-options`, `share`, `delete`
 */
export function listActionsFor(role) {
  return [
    can(role, 'edit-list') ? 'edit' : 'details',
    'view-options',
    ...(can(role, 'share-list') ? ['share'] : []),
    ...(can(role, 'delete-list') ? ['delete'] : []),
  ];
}

/**
 * Tell whether a list counts as shared (`TV-7`): it has people with access, or another user shares it with the user.
 * @param {{role?: string, sharing?: object[]}|null|undefined} list the list
 * @returns {boolean} true for a shared list
 */
export function isSharedList(list) {
  return Boolean(list) && ((Boolean(list.role) && list.role !== 'owner') || (list.sharing?.length ?? 0) > 0);
}
