import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { iconFile } from '../../scripts/help-icons.mjs';
import { HELP_FILES } from '../../scripts/site-files.mjs';
import { parseRoute } from '../../src/js/ui/router.js';

// The help docs of docs/tutorial point at app screens, icons, and screenshots; these tests keep every pointer true.

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const TUTORIAL = join(ROOT, 'docs', 'tutorial');
const DOCS = ['welcome.md', 'getting-started.md', 'faq.md'];
const read = (name) => readFileSync(join(TUTORIAL, name), 'utf8');
const text = DOCS.map(read).join('\n');
const images = [...text.matchAll(/!\[([^\]]*)\]\(([^)]+)\)/g)].map((match) => ({ alt: match[1], target: match[2] }));
const icons = [...new Set(images.filter((image) => image.target.endsWith('.svg')).map((image) => image.target))];
const shots = [...new Set(images.filter((image) => image.target.endsWith('.png')).map((image) => image.target))];
const routes = [...text.matchAll(/(?<!!)\[[^\]]+\]\(https:\/\/todos\.pellicciotta\.com\/(#\/[^)]*)\)/g)].map((match) => match[1]);

describe('the pointers of the help docs', () => {
  it('link every doc to screens of the app, each a known route under its public address, which also works outside it', () => {
    expect(text).not.toMatch(/\]\(#/);
    for (const name of DOCS) {
      expect(read(name), name).toMatch(/\]\(https:\/\/todos\.pellicciotta\.com\/#\/[a-z]/);
    }
    expect(routes.filter((route) => !parseRoute(route))).toEqual([]);
    for (const wanted of ['#/tasks', '#/lists', '#/bin', '#/settings', '#/connect', '#/settings?section=data', '#/settings?section=reminders']) {
      expect(routes, wanted).toContain(wanted);
    }
  });

  it('hold the icons they show, each drawn from the app sprite', () => {
    expect(icons.length).toBeGreaterThanOrEqual(8);
    const sprite = readFileSync(join(ROOT, 'src', 'img', 'icons.svg'), 'utf8');
    for (const target of icons) {
      const name = target.match(/^img\/icons\/([a-z0-9-]+)\.svg$/)?.[1];
      expect(name, target).toBeDefined();
      expect(readFileSync(join(TUTORIAL, target), 'utf8').replaceAll('\r\n', '\n'), `${target}: run node scripts/capture-help-images.mjs`)
        .toBe(iconFile(sprite, name));
    }
    expect(readdirSync(join(TUTORIAL, 'img', 'icons')).map((file) => `img/icons/${file}`).sort()).toEqual([...icons].sort());
  });

  it('show screenshots that exist in light and dark, are served, and carry a description', () => {
    expect(shots.length).toBeGreaterThanOrEqual(8);
    const served = [];
    for (const target of shots) {
      expect(images.find((image) => image.target === target).alt.length, target).toBeGreaterThan(20);
      for (const file of [target, target.replace(/\.png$/, '-dark.png')]) {
        expect(existsSync(join(TUTORIAL, file)), file).toBe(true);
        expect(HELP_FILES[`help/${file}`]).toBe(`docs/tutorial/${file}`);
        served.push(file);
      }
    }
    expect(Object.keys(HELP_FILES).filter((path) => path.endsWith('.png')).map((path) => path.slice('help/'.length)).sort()).toEqual(served.sort());
    expect(readdirSync(join(TUTORIAL, 'img')).filter((file) => file.endsWith('.png')).map((file) => `img/${file}`).sort()).toEqual(served.sort());
  });

  it('put each screenshot on a line of its own', () => {
    for (const name of DOCS) {
      const lines = read(name).split(/\r?\n/);
      lines.forEach((line, index) => {
        if (/!\[[^\]]*\]\([^)]+\.png\)/.test(line)) {
          expect([lines[index - 1].trim(), lines[index + 1]?.trim() ?? ''], `${name}:${index + 1}`).toEqual(['', '']);
          expect(line).toMatch(/^!\[[^\]]*\]\([^)]+\)$/);
        }
      });
    }
  });
});
