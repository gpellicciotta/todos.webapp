import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { iconBlock, replaceIconBlock } from '../../scripts/sync-wireframe-icons.mjs';

// The wireframe page, docs/design/ui-wireframes.html: static rules that keep it faithful, offline, and linked.

const root = new URL('../../', import.meta.url);
const text = (path) => readFileSync(new URL(path, root), 'utf8').replaceAll('\r\n', '\n');
const PAGE = 'docs/design/ui-wireframes.html';
const SCREENS = [
  'first-launch', 'all-tasks', 'user-menu', 'list', 'view-options', 'lists', 'lists-many', 'lists-find', 'task-editor',
  'task-editor-notes', 'task-editor-configuration', 'task-editor-history', 'quick-log', 'list-editor', 'recycle-bin', 'settings',
  'help', 'sync-log', 'connect', 'import', 'nav-rail',
];
const SPEC_DOCS = ['docs/specs/ui-design.md', 'docs/devops.md', 'docs/index.md', 'docs/requirements.md'];

describe('the UI wireframe page', () => {
  const page = () => text(PAGE);

  it('lists every screen once, with an anchor that specifications can link to', () => {
    const ids = [...page().matchAll(/<li id="([a-z0-9-]+)"><a href="#\1">/g)].map((match) => match[1]);
    expect(ids).toEqual(SCREENS);
  });

  it('previews with the real stylesheet of the app, and loads nothing from the network', () => {
    expect(page()).toContain('../../src/css/style.css');
    expect(existsSync(new URL('src/css/style.css', root))).toBe(true);
    expect(page()).not.toMatch(/<(?:link|script|img|iframe)\b[^>]*\b(?:src|href)=["'](?:https?:)?\/\//i);
    expect(page()).not.toMatch(/url\(\s*["']?(?:https?:)?\/\/|@import/i);
  });

  it('works when opened as a file, with classic scripts and inline icons', () => {
    expect(page()).not.toMatch(/type=["']module["']/);
    expect(page()).not.toMatch(/icons\.svg#/);
  });

  it('holds the icons of the app and of its look, as the sprites draw them', () => {
    const expected = iconBlock(text('src/img/icons.svg'), text('src/vendor/design/looks/neutral/icons.svg'));
    expect(page(), 'run `node scripts/sync-wireframe-icons.mjs`').toContain(expected);
    expect(replaceIconBlock(page(), expected)).toBe(page());
  });

  it('marks its data as examples, with only example addresses', () => {
    expect(page()).toContain('Example data');
    const addresses = [...page().matchAll(/[\w.+-]+@[\w-]+\.[\w.]+/g)].map((match) => match[0]);
    expect(addresses.filter((address) => !/@example\.(com|org)$/.test(address))).toEqual([]);
  });

  it('is the target of every wireframe link in the docs, each to a screen that exists', () => {
    const anchors = SPEC_DOCS.flatMap((doc) => [...text(doc).matchAll(/ui-wireframes\.html(?:#([a-z0-9-]+))?\)/g)].map((match) => match[1]));
    expect(anchors.filter(Boolean).filter((anchor) => !SCREENS.includes(anchor))).toEqual([]);
    expect(SCREENS.filter((screen) => !text('docs/specs/ui-design.md').includes(`ui-wireframes.html#${screen})`))).toEqual([]);
    expect(text('docs/index.md')).toContain('(design/ui-wireframes.html)');
  });

  it('replaces the drawn images, which no longer exist or get linked', () => {
    expect(existsSync(new URL('scripts/draw-wireframes.py', root))).toBe(false);
    const images = fileURLToPath(new URL('docs/img/ui/', root));
    expect(existsSync(images) ? readdirSync(images) : []).toEqual([]);
    for (const doc of SPEC_DOCS) {
      expect(text(doc), doc).not.toMatch(/img\/ui\/|draw-wireframes/);
    }
  });
});
