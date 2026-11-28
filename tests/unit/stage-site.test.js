import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { HELP_FILES } from '../../scripts/site-files.mjs';
import { stageSite } from '../../scripts/stage-site.mjs';

const REPO = fileURLToPath(new URL('../../', import.meta.url));
const SCRIPT = join(REPO, 'scripts', 'stage-site.mjs');

let work;
let repo;

beforeEach(async () => {
  work = await mkdtemp(join(tmpdir(), 'stage-site-'));
  repo = join(work, 'repo');
  await mkdir(join(repo, 'src', 'css'), { recursive: true });
  await mkdir(join(repo, 'docs', 'tutorial'), { recursive: true });
  await writeFile(join(repo, 'src', 'index.html'), '<!doctype html>');
  await writeFile(join(repo, 'src', 'css', 'style.css'), 'body {}');
  await writeFile(join(repo, 'CHANGELOG.md'), '# Changelog');
  for (const source of Object.values(HELP_FILES)) {
    if (source !== 'CHANGELOG.md') {
      await writeFile(join(repo, source), `# ${source}`);
    }
  }
});

afterEach(async () => {
  await rm(work, { recursive: true, force: true });
});

describe('HELP_FILES', () => {
  it('maps the three tutorial docs and the changelog to help paths', () => {
    expect(HELP_FILES).toEqual({
      'help/welcome.md': 'docs/tutorial/welcome.md',
      'help/getting-started.md': 'docs/tutorial/getting-started.md',
      'help/faq.md': 'docs/tutorial/faq.md',
      'help/CHANGELOG.md': 'CHANGELOG.md',
    });
  });

  it('names sources that exist in the repository', () => {
    for (const source of Object.values(HELP_FILES)) {
      expect(existsSync(join(REPO, source)), source).toBe(true);
    }
  });
});

describe('stageSite', () => {
  it('copies src/ and each help file to its served path', async () => {
    const out = join(work, 'out');
    await stageSite({ repoRoot: repo, outDir: out });
    expect(await readFile(join(out, 'index.html'), 'utf8')).toBe('<!doctype html>');
    expect(await readFile(join(out, 'css', 'style.css'), 'utf8')).toBe('body {}');
    expect(await readFile(join(out, 'help', 'CHANGELOG.md'), 'utf8')).toBe('# Changelog');
    expect(await readFile(join(out, 'help', 'faq.md'), 'utf8')).toBe('# docs/tutorial/faq.md');
  });

  it('accepts an existing empty output folder', async () => {
    const out = join(work, 'empty');
    await mkdir(out);
    await stageSite({ repoRoot: repo, outDir: out });
    expect(existsSync(join(out, 'help', 'welcome.md'))).toBe(true);
  });

  it('fails naming the file when a source is missing', async () => {
    await rm(join(repo, 'docs', 'tutorial', 'faq.md'));
    await expect(stageSite({ repoRoot: repo, outDir: join(work, 'out') })).rejects.toThrow('docs/tutorial/faq.md');
  });

  it('refuses an output folder that is not empty', async () => {
    const out = join(work, 'busy');
    await mkdir(out);
    await writeFile(join(out, 'keep.txt'), 'x');
    await expect(stageSite({ repoRoot: repo, outDir: out })).rejects.toThrow('not empty');
    expect(await readFile(join(out, 'keep.txt'), 'utf8')).toBe('x');
  });
});

describe('stage-site command line', () => {
  const run = (...args) => spawnSync(process.execPath, [SCRIPT, ...args], { encoding: 'utf8' });

  it('prints usage and exits 0 for --help', () => {
    const result = run('--help');
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Usage: node scripts/stage-site.mjs');
  });

  it('exits 2 without an output folder', () => {
    const result = run();
    expect(result.status).toBe(2);
    expect(result.stderr).toContain('Usage');
  });

  it('exits 2 for an unknown option', () => {
    expect(run('--nope', 'x').status).toBe(2);
  });

  it('stages the real repository and exits 0', async () => {
    const out = join(work, 'real');
    const result = run(out);
    expect(result.status).toBe(0);
    expect(existsSync(join(out, 'index.html'))).toBe(true);
    expect(existsSync(join(out, 'help', 'CHANGELOG.md'))).toBe(true);
  });

  it('exits 1 for a non-empty output folder', async () => {
    const out = join(work, 'busy2');
    await mkdir(out);
    await writeFile(join(out, 'keep.txt'), 'x');
    expect(run(out).status).toBe(1);
  });
});
