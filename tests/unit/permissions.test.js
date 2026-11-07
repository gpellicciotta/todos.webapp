import { describe, expect, it } from 'vitest';
import {
  ACTIONS, can, canTrashTask, isSharedList, listActionsFor, listRole, ROLES, taskRole,
} from '../../src/js/core/permissions.js';

// The service's business logic spec, Roles and Permissions: the lowest role that may do each action.
const TABLE = {
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
};

describe('can', () => {
  it('matches the service table for every role and action', () => {
    expect(Object.keys(TABLE).sort()).toEqual([...ACTIONS].sort());
    for (const [action, lowest] of Object.entries(TABLE)) {
      for (const role of ROLES) {
        expect(can(role, action), `${role} ${action}`).toBe(ROLES.indexOf(role) >= ROLES.indexOf(lowest));
      }
    }
  });

  it('allows nothing without a role or for an unknown action', () => {
    expect(can(null, 'read-task')).toBe(false);
    expect(can(undefined, 'read-task')).toBe(false);
    expect(can('owner', 'launch-rocket')).toBe(false);
    expect(can('admin', 'read-task')).toBe(false);
  });
});

describe('listRole', () => {
  it('reads the role of a list and treats a list without one as owned', () => {
    expect(listRole({ role: 'viewer' })).toBe('viewer');
    expect(listRole({})).toBe('owner');
    expect(listRole(null)).toBe(null);
  });
});

describe('taskRole', () => {
  const lists = [{ id: 'a', role: 'viewer' }, { id: 'b', role: 'editor' }, { id: 'c', role: 'task-editor' }];

  it('gives the task owner the owner role', () => {
    expect(taskRole({ 'owner-id': 7 }, [lists[0]], 7)).toBe('owner');
  });

  it('gives others the highest role on any list holding the task', () => {
    expect(taskRole({ 'owner-id': 9 }, lists, 7)).toBe('editor');
    expect(taskRole({ 'owner-id': 9 }, [lists[0]], 7)).toBe('viewer');
  });

  it('gives local tasks, which have no owner, the owner role', () => {
    expect(taskRole({ 'owner-id': null }, [], null)).toBe('owner');
  });

  it('gives a foreign task in no shared list no role', () => {
    expect(taskRole({ 'owner-id': 9 }, [], 7)).toBe(null);
  });
});

describe('canTrashTask', () => {
  it('allows the task owner and the owner of any list holding the task', () => {
    expect(canTrashTask({ 'owner-id': 7 }, [{ role: 'viewer' }], 7)).toBe(true);
    expect(canTrashTask({ 'owner-id': 9 }, [{ role: 'editor' }, { role: 'owner' }], 7)).toBe(true);
  });

  it('refuses collaborators below the list owner', () => {
    expect(canTrashTask({ 'owner-id': 9 }, [{ role: 'editor' }, { role: 'task-editor' }], 7)).toBe(false);
  });
});

describe('listActionsFor', () => {
  it('offers the owner every list action', () => {
    expect(listActionsFor('owner')).toEqual(['edit', 'view-options', 'share', 'delete']);
  });

  it('offers an editor Edit list and the view options only', () => {
    expect(listActionsFor('editor')).toEqual(['edit', 'view-options']);
  });

  it('offers task editors and viewers the list details and the view options', () => {
    expect(listActionsFor('task-editor')).toEqual(['details', 'view-options']);
    expect(listActionsFor('viewer')).toEqual(['details', 'view-options']);
  });
});

describe('isSharedList', () => {
  it('counts a list the user shares with people and a list shared with the user', () => {
    expect(isSharedList({ role: 'owner', sharing: [{ id: 1 }] })).toBe(true);
    expect(isSharedList({ role: 'viewer', sharing: [] })).toBe(true);
    expect(isSharedList({ role: 'editor' })).toBe(true);
  });

  it('leaves out an owned list without people and a local list', () => {
    expect(isSharedList({ role: 'owner', sharing: [] })).toBe(false);
    expect(isSharedList({})).toBe(false);
    expect(isSharedList(null)).toBe(false);
  });
});
