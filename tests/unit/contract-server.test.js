import { describe, expect, it } from 'vitest';
import { APP_NAME, APP_SECRET, environmentText, serverDir, startAuthStandIn, startCommand, stopCommand } from '../contract/server.js';

const OPTIONS = { dir: '/work/todos', port: 18080, envFile: '/tmp/contract.env', python: 'python3' };

describe('the contract test server helper', () => {
  it('skips without TODOS_SERVER_DIR, and resolves the directory when it is set', () => {
    expect(serverDir({})).toBeNull();
    expect(serverDir({ TODOS_SERVER_DIR: '  ' })).toBeNull();
    expect(serverDir({ TODOS_SERVER_DIR: '/work/todos' })).toMatch(/todos$/);
  });

  it('starts the server on an in-memory database in the background', () => {
    const { command, args, cwd } = startCommand(OPTIONS);
    expect(command).toBe('python3');
    expect(args.slice(1)).toEqual(['server', 'start', '--memory-db', '--background', '--port', '18080', '--env-file', '/tmp/contract.env']);
    expect(args[0].replaceAll('\\', '/')).toBe('/work/todos/scripts/devops.py');
    expect(cwd).toBe('/work/todos');
  });

  it('stops the server on the same port', () => {
    const { args } = stopCommand(OPTIONS);
    expect(args.slice(1)).toEqual(['server', 'stop', '--port', '18080', '--env-file', '/tmp/contract.env']);
  });

  it('points the server at the Auth stand-in and sets a minimum client version', () => {
    const text = environmentText({ port: 18080, authUrl: 'http://127.0.0.1:9999' });
    expect(text).toContain('PORT=18080');
    expect(text).toContain('TODOS_AUTH_BASE_URL=http://127.0.0.1:9999');
    expect(text).toContain('TODOS_SYNC_MIN_CLIENT_VERSIONS=todos.webapp=0.1.0');
    expect(text).toContain('TODOS_THROTTLE_REQUESTS_PER_SECOND=100000');
    expect(text).not.toMatch(/PASSWORD/);
  });

  it('grants only the codes of known accounts to a server that knows the app secret', async () => {
    const auth = await startAuthStandIn([{ code: 'good', id: 7, name: 'Tess', email: 'tess@example.com', admin: true }]);
    const validate = (code, secret) => fetch(`${auth.url}/api/auth-token/validate?app-name=${APP_NAME}`, {
      headers: { Authorization: `Bearer ${code}`, 'X-App-Secret': secret },
    });
    try {
      expect((await validate('good', APP_SECRET)).status).toBe(200);
      expect((await validate('unknown', APP_SECRET)).status).toBe(401);
      expect((await validate('good', 'wrong')).status).toBe(401);
      const me = await fetch(`${auth.url}/api/users/me`, { headers: { Authorization: 'Bearer good' } });
      expect((await me.json()).realms).toEqual(['admin']);
    }
    finally {
      await auth.close();
    }
  });
});
