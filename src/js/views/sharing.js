/**
 * Sharing section of the list editor: invite people, change their role, and remove them (`SHR-1` to `SHR-3`).
 *
 * The owner sees every person with access, each with a role select and Remove, and an invite row. Other users see
 * the owner and their own role, read-only. Offline, every control is disabled and a banner says sharing needs a
 * connection (`SHR-6`). In local mode the section only links to the connect flow.
 * Calls: the service's REST API, List Sharing & Collaboration. An invitation is a sharing request, which also
 * reaches an address without an account; the person gets access once they accept it. The service has no call
 * that changes a role, so a change replaces the rule: Remove, then add it back with the new role.
 */

import { can, listRole, ROLE_HINTS, ROLE_LABELS, ROLES } from '../core/permissions.js';
import { judge, SyncStop } from '../sync/api.js';
import { createField } from './editor-panel.js';
import { make as el, spriteIcon } from './task-list.js';

/** Section strings, for the strings module of TEC-13 to absorb. */
const STRINGS = Object.freeze({
  connect: 'Connect to share this list',
  needsConnection: 'Sharing needs a connection.',
  signIn: 'Sign in again to change sharing.',
  upgrade: 'Update the app to change sharing.',
  unreachable: 'The service could not be reached. Try again.',
  refused: 'The service refused that change.',
  owner: 'Owner: ', you: ' (you)', ownRole: 'Your role: ',
  email: 'Email address', role: 'Role', invite: 'Invite', remove: 'Remove', roleOf: 'Role of ', removeLabel: 'Remove ',
  invalidEmail: 'Enter a valid email address.',
  invited: (email) => `Invitation sent to ${email}. Access starts when they accept.`,
  removed: (email) => `${email} no longer has access.`,
  changed: (email, role) => `${email} is now ${ROLE_LABELS[role].toLowerCase()}.`,
});

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u;
const SHAREABLE = ROLES.filter((role) => role !== 'owner');
const DEFAULT_ROLE = 'task-editor';
let instances = 0;

/**
 * Read a rule of the service as the section shows it.
 * @param {object} rule a `SharingRule`
 * @returns {{id: number, email: string, role: string}} the person
 */
const toPerson = (rule) => ({ id: rule.id, email: rule['shared-with-email'] ?? '', role: rule['shared-role'] });

/**
 * Tell why a reply or a failure stopped a change, as one sentence.
 * @param {unknown} error the failure
 * @returns {string} the sentence
 */
function explain(error) {
  if (error instanceof SyncStop) {
    if (error.kind === 'auth') {
      return STRINGS.signIn;
    }
    if (error.kind === 'upgrade') {
      return STRINGS.upgrade;
    }
    return error.offline ? STRINGS.needsConnection : STRINGS.unreachable;
  }
  return error?.message || STRINGS.refused;
}

/**
 * Send one request and return its JSON body.
 * @param {object} api the API client
 * @param {string} method the HTTP method
 * @param {string} path the path
 * @param {object} [body] the JSON body
 * @returns {Promise<any>} the body
 * @throws {SyncStop} when the service cannot be reached or asks for a sign-in or an upgrade
 * @throws {Error} with the service's message when it refuses the change
 */
async function call(api, method, path, body) {
  const reply = await api.send(method, path, body === undefined ? {} : { body });
  if (judge(reply) !== 'done') {
    throw new Error(reply.body?.message ?? reply.body?.error ?? reply.body?.detail ?? STRINGS.refused);
  }
  return reply.body;
}

/**
 * Create a select of the roles an owner may grant, each with its one-line explanation.
 * @param {Document} doc the document
 * @param {string} name the control name
 * @param {string} role the selected role
 * @param {{short?: boolean}} [options] `short` leaves the explanation out, for the narrow rows of the people
 * @returns {HTMLSelectElement} the select
 */
function roleSelect(doc, name, role, { short = false } = {}) {
  const select = el(doc, 'select', 'field__control');
  select.name = name;
  for (const value of SHAREABLE) {
    const option = doc.createElement('option');
    option.value = value;
    option.textContent = short ? ROLE_LABELS[value] : `${ROLE_LABELS[value]}: ${ROLE_HINTS[value]}`;
    select.append(option);
  }
  select.value = role;
  return select;
}

/**
 * Mount the Sharing section content into its section element.
 * @param {HTMLElement} parent the section element, which already has its title
 * @param {object} options the section options
 * @param {object} options.list the list, with `role`, `owner`, and `sharing`
 * @param {{send: Function}} options.api the API client
 * @param {{state: () => string, account?: Function, subscribe?: Function}} options.session the session
 * @param {{state: () => {status: string}, subscribe: Function, kick?: Function}} [options.sync] the sync engine, which
 *   tells when the connection is lost
 * @returns {{update: (list: object) => void, idle: () => Promise<void>, destroy: () => void}} the section
 */
export function mountSharing(parent, { list: initial, api, session, sync }) {
  const doc = parent.ownerDocument;
  const win = doc.defaultView;
  const id = `sharing-${(instances += 1)}`;
  let list = initial;
  let revision = initial.revision;
  let people = (initial.sharing ?? []).map(toPerson);
  let mode = null;
  let message = '';
  let busy = false;
  let chain = Promise.resolve();
  let destroyed = false;
  const root = el(doc, 'div', 'sharing');
  parent.append(root);
  let parts = null;

  /** @returns {boolean} true while the device is connected to the service */
  const online = () => win?.navigator?.onLine !== false && sync?.state?.().status !== 'offline';

  /** Show the status line. */
  function setMessage(text) {
    message = text;
    if (parts) {
      parts.status.textContent = text;
      parts.status.hidden = !text;
    }
  }

  /** Disable every control while offline or while a change runs, and show the offline banner. */
  function lock() {
    if (!parts) {
      return;
    }
    const offline = !online();
    parts.offline.hidden = !offline;
    for (const control of root.querySelectorAll('button, select, input')) {
      control.disabled = offline || busy;
    }
  }

  /**
   * Run one change after the earlier ones, with the controls locked; a failure goes to the status line.
   * @param {() => Promise<void>} task the change
   * @returns {Promise<void>} resolves once it ran
   */
  function run(task) {
    chain = chain.then(async () => {
      if (destroyed) {
        return;
      }
      busy = true;
      lock();
      try {
        await task();
      }
      catch (error) {
        setMessage(explain(error));
      }
      finally {
        busy = false;
        draw();
      }
    });
    return chain;
  }

  /** Read the people from the service; the owner is the only one who may. */
  async function reload() {
    if (session.state() === 'local' || !can(listRole(list), 'share-list') || !online()) {
      return;
    }
    try {
      people = (await call(api, 'GET', `/api/lists/${list.id}/sharing`)).map(toPerson);
    }
    catch {
      // The people of the last sync stay on screen.
    }
  }

  /**
   * Change the role of a person: the service has no change call, so the rule goes and comes back with the new role.
   * A refused new role puts the old one back.
   * @param {{id: number, email: string, role: string}} person the person
   * @param {string} role the new role
   */
  function change(person, role) {
    return run(async () => {
      const grant = (granted) => call(api, 'POST', `/api/lists/${list.id}/sharing`, { 'target-user-email': person.email, 'target-user-role': granted });
      await call(api, 'DELETE', `/api/lists/${list.id}/sharing/${person.id}`);
      try {
        await grant(role);
        setMessage(STRINGS.changed(person.email, role));
      }
      catch (error) {
        await grant(person.role).catch(() => {});
        setMessage(explain(error));
      }
      await reload();
      sync?.kick?.();
    });
  }

  /**
   * Remove a person.
   * @param {{id: number, email: string}} person the person
   */
  function remove(person) {
    return run(async () => {
      await call(api, 'DELETE', `/api/lists/${list.id}/sharing/${person.id}`);
      setMessage(STRINGS.removed(person.email));
      await reload();
      sync?.kick?.();
    });
  }

  /** Invite the typed email with the chosen role. */
  function invite() {
    const { email, role } = parts;
    const address = email.control.value.trim();
    if (!EMAIL.test(address)) {
      email.setError(STRINGS.invalidEmail);
      return chain;
    }
    email.setError(null);
    return run(async () => {
      await call(api, 'POST', '/api/sharing-requests', { 'list-id': list.id, 'target-user-email': address, 'target-user-role': role.value });
      email.control.value = '';
      setMessage(STRINGS.invited(address));
    });
  }

  /**
   * Create one person's row for the owner.
   * @param {{id: number, email: string, role: string}} person the person
   * @returns {HTMLLIElement} the row
   */
  function personRow(person) {
    const row = el(doc, 'li', 'sharing__person');
    row.dataset.sharing = 'person';
    const select = roleSelect(doc, 'role', person.role, { short: true });
    select.title = ROLE_HINTS[person.role] ?? '';
    select.setAttribute('aria-label', `${STRINGS.roleOf}${person.email}`);
    select.addEventListener('change', () => change(person, select.value));
    const button = el(doc, 'button', 'button button--secondary', STRINGS.remove);
    button.type = 'button';
    button.setAttribute('aria-label', `${STRINGS.removeLabel}${person.email}`);
    button.addEventListener('click', () => remove(person));
    row.append(el(doc, 'span', 'sharing__email', person.email), select, button);
    return row;
  }

  /**
   * Build the controls of a connected list; `draw` fills them. Only the owner gets the people and the invite row.
   * @param {boolean} owns whether the user owns the list
   */
  function build(owns) {
    const owner = el(doc, 'p', 'sharing__owner');
    owner.dataset.sharing = 'owner';
    const ownRole = el(doc, 'p', 'sharing__role');
    ownRole.dataset.sharing = 'own-role';
    const offline = el(doc, 'div', 'banner');
    offline.dataset.sharing = 'offline';
    offline.setAttribute('role', 'status');
    offline.hidden = true;
    offline.append(spriteIcon(doc, 'alert', 'icon banner__icon'), el(doc, 'p', 'banner__text', STRINGS.needsConnection));
    const status = el(doc, 'p', 'sharing__status');
    status.dataset.sharing = 'status';
    status.setAttribute('role', 'status');
    status.hidden = true;
    parts = { offline, owner, ownRole, status };
    if (!owns) {
      root.replaceChildren(offline, owner, ownRole, status);
      return;
    }
    const rows = el(doc, 'ul', 'sharing__people');
    const form = el(doc, 'div', 'sharing__invite');
    const email = createField(doc, { label: STRINGS.email, name: 'email', type: 'email' });
    email.control.autocomplete = 'off';
    const roleField = el(doc, 'div', 'field');
    const roleLabel = el(doc, 'label', 'field__label', STRINGS.role);
    const role = roleSelect(doc, 'invite-role', DEFAULT_ROLE);
    role.id = `${id}-role`;
    roleLabel.htmlFor = role.id;
    roleField.append(roleLabel, role);
    const button = el(doc, 'button', 'button', STRINGS.invite);
    button.type = 'button';
    button.dataset.sharing = 'invite';
    button.addEventListener('click', invite);
    email.control.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && !event.isComposing) {
        event.preventDefault();
        invite();
      }
    });
    form.append(email.element, roleField, button);
    root.replaceChildren(offline, owner, rows, form, status);
    Object.assign(parts, { rows, form, email, role });
  }

  /** Show the section for the current list, session, and connection. */
  function draw() {
    if (destroyed) {
      return;
    }
    const connected = session.state() !== 'local';
    if (!connected) {
      if (mode !== 'local') {
        const link = el(doc, 'a', 'sharing__connect', STRINGS.connect);
        link.href = '#/connect';
        root.replaceChildren(link);
        parts = null;
        mode = 'local';
      }
      return;
    }
    const role = listRole(list);
    const owns = can(role, 'share-list');
    if (mode !== (owns ? 'owner' : 'member')) {
      build(owns);
      mode = owns ? 'owner' : 'member';
    }
    const name = list.owner?.name || list.owner?.email || session.account?.()?.name || session.account?.()?.email || '';
    parts.owner.textContent = `${STRINGS.owner}${name}${owns ? STRINGS.you : ''}`;
    parts.owner.hidden = !name;
    if (owns) {
      // Rows change only with the people: a row that a sync state change replaced would drop a click in flight.
      const shownPeople = JSON.stringify(people);
      if (parts.shownPeople !== shownPeople) {
        parts.shownPeople = shownPeople;
        parts.rows.replaceChildren(...people.map(personRow));
      }
    }
    else {
      parts.ownRole.textContent = `${STRINGS.ownRole}${ROLE_LABELS[role] ?? role}${ROLE_HINTS[role] ? `. ${ROLE_HINTS[role]}.` : ''}`;
    }
    parts.status.textContent = message;
    parts.status.hidden = !message;
    lock();
  }

  const stops = [];
  let wasOnline = online();

  /** Show the section for the connection as it is now; reading the people again once it came back. */
  const follow = () => {
    draw();
    const now = online();
    if (now && !wasOnline) {
      run(reload);
    }
    wasOnline = now;
  };
  for (const source of [sync, session]) {
    if (source?.subscribe) {
      stops.push(source.subscribe(follow));
    }
  }
  win?.addEventListener('online', follow);
  win?.addEventListener('offline', follow);
  draw();
  run(reload);

  return {
    /**
     * Follow a change of the list, such as another role or other people after a sync.
     * @param {object} next the list
     */
    update(next) {
      const changed = next.revision !== revision;
      revision = next.revision;
      list = next;
      if (changed && can(listRole(next), 'share-list') && !busy) {
        people = (next.sharing ?? []).map(toPerson);
      }
      draw();
    },
    idle: () => chain,
    destroy() {
      destroyed = true;
      stops.forEach((stop) => stop());
      win?.removeEventListener('online', follow);
      win?.removeEventListener('offline', follow);
      root.remove();
    },
  };
}
