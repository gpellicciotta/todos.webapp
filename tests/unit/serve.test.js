import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { contentType, resolveRequest, startServer } from '../../scripts/serve.mjs';

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
