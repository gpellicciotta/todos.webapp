import { readdirSync, readFileSync } from 'node:fs';
import { join, posix, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const ROOT = fileURLToPath(new URL('../../src/', import.meta.url));

/**
 * List every script under a folder, as web paths relative to src/.
 * @param {string} folder absolute folder
 * @returns {string[]} the relative paths, with forward slashes
 */
function scripts(folder) {
  return readdirSync(folder, { withFileTypes: true }).flatMap((entry) => {
    const path = join(folder, entry.name);
    if (entry.isDirectory()) {
      return scripts(path);
    }
    return entry.name.endsWith('.js') ? [relative(ROOT, path).split(sep).join('/')] : [];
  });
}

/**
 * Follow the module imports of the app scripts into the vendored design system.
 * @param {string[]} entries app scripts, as web paths relative to src/
 * @returns {string[]} the vendored modules they load, directly or through each other
 */
function vendoredModules(entries) {
  const seen = new Set();
  const visit = (path) => {
    if (seen.has(path)) {
      return;
    }
    seen.add(path);
    const source = readFileSync(join(ROOT, path), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    for (const match of source.matchAll(/^\s*(?:import|export)\b[^'"]*from\s+'([^']+)'/gm)) {
      visit(posix.normalize(posix.join(posix.dirname(path), match[1])));
    }
  };
  entries.forEach(visit);
  return [...seen].filter((path) => path.startsWith('vendor/'));
}

describe('start page module preload (TEC-16)', () => {
  const html = readFileSync(join(ROOT, 'index.html'), 'utf8');
  const preloaded = [...html.matchAll(/<link rel="modulepreload" href="([^"]+)">/g)].map((match) => match[1]);

  it('preloads every module of the app and the vendored modules it loads, so the browser fetches the import tree in one round', () => {
    const own = scripts(join(ROOT, 'js'));
    const modules = [...own, ...vendoredModules(own)].sort();
    expect(modules.filter((path) => !preloaded.includes(path))).toEqual([]);
    expect(preloaded.filter((path) => !modules.includes(path))).toEqual([]);
    expect(new Set(preloaded).size).toBe(preloaded.length);
  });

  it('keeps the entry module and its preloads in the document head', () => {
    const head = html.slice(html.indexOf('<head>'), html.indexOf('</head>'));
    expect(head).toContain('<script type="module" src="js/app.js"></script>');
    expect(preloaded.every((path) => head.includes(`href="${path}"`))).toBe(true);
  });
});
