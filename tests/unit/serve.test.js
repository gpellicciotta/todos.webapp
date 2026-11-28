import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { HELP_FILES } from '../../scripts/site-files.mjs';
import { contentType, resolveHelp, resolveRequest, startServer } from '../../scripts/serve.mjs';

let root;

beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), 'serve-test-'));
  await writeFile(join(root, 'index.html'), '<!doctype html><title>Root</title>');
  await mkdir(join(root, 'css'));
  await writeFile(join(root, 'css', 'style.css'), 'body {}');
  await mkdir(join(root, 'demo'));
  await writeFile(join(root, 'demo', 'index.html'), '<!doctype html><title>Demo</title>');
});

afterAll(async () => {
  await rm(root, { recursive: true, force: true });
});

describe('contentType', () => {
  it.each([
    ['index.html', 'text/html; charset=utf-8'],
    ['app.js', 'text/javascript; charset=utf-8'],
    ['serve.mjs', 'text/javascript; charset=utf-8'],
    ['style.css', 'text/css; charset=utf-8'],
    ['manifest.webmanifest', 'application/manifest+json'],
    ['data.json', 'application/json; charset=utf-8'],
    ['icon.svg', 'image/svg+xml'],
    ['photo.png', 'image/png'],
    ['inter.woff2', 'font/woff2'],
    ['notes.txt', 'text/plain; charset=utf-8'],
    ['archive.bin', 'application/octet-stream'],
  ])('maps %s to %s', (name, type) => {
    expect(contentType(name)).toBe(type);
  });
});

describe('resolveRequest', () => {
  it('maps a file URL to the file under the root', async () => {
    const result = await resolveRequest(root, '/css/style.css');
    expect(result).toEqual({ status: 200, file: join(root, 'css', 'style.css') });
  });

  it('serves index.html for the root and for directories', async () => {
    expect(await resolveRequest(root, '/')).toEqual({ status: 200, file: join(root, 'index.html') });
    expect(await resolveRequest(root, '/demo/')).toEqual({ status: 200, file: join(root, 'demo', 'index.html') });
  });

  it('ignores the query string and the fragment', async () => {
    const result = await resolveRequest(root, '/css/style.css?v=2#top');
    expect(result.file).toBe(join(root, 'css', 'style.css'));
  });

  it('returns 404 for a missing file', async () => {
    expect(await resolveRequest(root, '/missing.js')).toEqual({ status: 404 });
  });

  it.each(['/../package.json', '/css/../../package.json', '/%2e%2e/package.json', '/..%2fpackage.json'])(
    'rejects the traversal attempt %s',
    async (url) => {
      expect(await resolveRequest(root, url)).toEqual({ status: 403 });
    },
  );

  it('rejects a malformed URL encoding', async () => {
    expect(await resolveRequest(root, '/%E0%A4%A')).toEqual({ status: 400 });
  });
});

describe('startServer', () => {
  let server;
  let base;

  beforeAll(async () => {
    server = await startServer({ root, port: 0, host: '127.0.0.1' });
    base = `http://127.0.0.1:${server.address().port}`;
  });

  afterAll(async () => {
    await new Promise((resolve) => server.close(resolve));
  });

  it('serves a file with its content type and no caching', async () => {
    const response = await fetch(`${base}/css/style.css`);
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('text/css; charset=utf-8');
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(await response.text()).toBe('body {}');
  });

  it('answers 404 for a missing file', async () => {
    const response = await fetch(`${base}/nothing-here.html`);
    expect(response.status).toBe(404);
  });

  it('answers 405 for methods other than GET and HEAD', async () => {
    const response = await fetch(`${base}/index.html`, { method: 'POST' });
    expect(response.status).toBe(405);
  });
});

describe('help paths', () => {
  let server;
  let base;
  const REPO = fileURLToPath(new URL('../../', import.meta.url));

  beforeAll(async () => {
    server = await startServer({ port: 0, host: '127.0.0.1' });
    base = `http://127.0.0.1:${server.address().port}`;
  });

  afterAll(async () => {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  });

  it('maps each help path to its repository source', async () => {
    for (const [path, source] of Object.entries(HELP_FILES)) {
      expect(await resolveHelp(`/${path}`)).toEqual({ status: 200, file: join(REPO, source) });
    }
    expect(await resolveHelp('/help/faq.md?v=1')).toEqual({ status: 200, file: join(REPO, 'docs/tutorial/faq.md') });
  });

  it('does not map other paths', async () => {
    expect(await resolveHelp('/help/secret.md')).toBeNull();
    expect(await resolveHelp('/help/../package.json')).toBeNull();
    expect(await resolveHelp('/index.html')).toBeNull();
  });

  it('serves a help file as markdown with no caching', async () => {
    const response = await fetch(`${base}/help/faq.md`);
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('text/markdown; charset=utf-8');
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(await response.text()).toContain('#');
  });

  it('serves the changelog under help/', async () => {
    const response = await fetch(`${base}/help/CHANGELOG.md`);
    expect(response.status).toBe(200);
    expect(await response.text()).toContain('# Changelog');
  });

  it('answers HEAD without a body', async () => {
    const response = await fetch(`${base}/help/welcome.md`, { method: 'HEAD' });
    expect(response.status).toBe(200);
    expect(await response.text()).toBe('');
  });

  it('answers 404 for other help paths', async () => {
    expect((await fetch(`${base}/help/other.md`)).status).toBe(404);
    expect((await fetch(`${base}/help/`)).status).toBe(404);
  });

  it('does not map help paths for a custom root', async () => {
    const custom = await startServer({ root, port: 0, host: '127.0.0.1' });
    try {
      const response = await fetch(`http://127.0.0.1:${custom.address().port}/help/faq.md`);
      expect(response.status).toBe(404);
    }
    finally {
      custom.closeAllConnections();
      await new Promise((resolve) => custom.close(resolve));
    }
  });

  it('maps .md to text/markdown', () => {
    expect(contentType('faq.md')).toBe('text/markdown; charset=utf-8');
  });
});

describe('the pid file and the stop file', () => {
  it('writes the pid, exits cleanly when the stop file appears, and removes both files', async () => {
    const { spawn } = await import('node:child_process');
    const { existsSync } = await import('node:fs');
    const { readFile } = await import('node:fs/promises');
    const script = fileURLToPath(new URL('../../scripts/serve.mjs', import.meta.url));
    const pidFile = join(root, 'server.pid');
    const stopFile = join(root, 'server.stop');
    const child = spawn(process.execPath, [script, '--root', root, '--port', '0', '--pid-file', pidFile, '--stop-file', stopFile], {
      stdio: 'ignore',
    });
    const exited = new Promise((resolve) => child.once('exit', resolve));
    // The file exists, empty, before the pid lands in it; wait for the content, not just the file.
    const readPid = async () => (existsSync(pidFile) ? (await readFile(pidFile, 'utf8')).trim() : '');
    for (let tries = 0; tries < 100 && (await readPid()) === ''; tries += 1) {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    expect(Number(await readPid())).toBe(child.pid);
    await writeFile(stopFile, 'stop');
    expect(await exited).toBe(0);
    expect(existsSync(pidFile)).toBe(false);
    expect(existsSync(stopFile)).toBe(false);
  });
});
