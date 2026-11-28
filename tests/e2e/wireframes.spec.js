import { readdirSync, readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';

// The wireframe page as a viewer opens it, from the checkout as a file: every screen and state, on a phone and a desktop,
// in light and dark, draws with the app's stylesheet and classes, without errors, network requests, or sideways scrolling.

const root = new URL('../../', import.meta.url);
const PAGE = new URL('docs/design/ui-wireframes.html', root);
const SCREENS = [...readFileSync(PAGE, 'utf8').matchAll(/<li id="([a-z0-9-]+)">/g)].map((match) => match[1]);

/**
 * Collect the files of a directory tree.
 * @param {URL} directory the directory, ending in a slash
 * @param {RegExp} pattern the names to keep
 * @returns {URL[]} the files
 */
function files(directory, pattern) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (entry.isDirectory()) {
      return files(new URL(`${entry.name}/`, directory), pattern);
    }
    return pattern.test(entry.name) ? [new URL(entry.name, directory)] : [];
  });
}

const SCRIPTS = [...files(new URL('src/js/', root), /\.js$/), ...files(new URL('src/vendor/design/js/', root), /\.js$/)]
  .map((file) => readFileSync(file, 'utf8')).join('\n');
/** The class names the app knows: those its stylesheets select, and those its scripts write. */
const KNOWN = new Set([
  ...files(new URL('src/', root), /\.css$/).flatMap((file) => [...readFileSync(file, 'utf8').matchAll(/\.([a-zA-Z][\w-]*)/g)].map((m) => m[1])),
  ...[...SCRIPTS.matchAll(/[a-zA-Z][\w-]*/g)].map((m) => m[0]),
]);
/** The starts of the modifier classes that scripts complete at run time, such as `task-history__table--${kind}`. */
const BUILT = [...SCRIPTS.matchAll(/([a-zA-Z][\w-]*--)\$\{/g)].map((m) => m[1]);
const isKnown = (name) => KNOWN.has(name) || BUILT.some((start) => name.startsWith(start));

/**
 * Open the page and record everything that goes wrong while it draws.
 * @param {import('@playwright/test').Page} page the page
 * @returns {Promise<string[]>} the problems, which grow while the test runs
 */
async function open(page) {
  const problems = [];
  page.on('pageerror', (error) => problems.push(`page error: ${error.message}`));
  page.on('console', (message) => ['error', 'warning'].includes(message.type()) && problems.push(`console: ${message.text()}`));
  page.on('requestfailed', (request) => problems.push(`failed: ${request.url()}`));
  page.on('request', (request) => !/^(file|data|about|blob):/.test(request.url()) && problems.push(`network: ${request.url()}`));
  await page.goto(PAGE.href);
  return problems;
}

/**
 * Show a screen state in one theme, and wait until both previews have drawn it.
 * @param {import('@playwright/test').Page} page the page
 * @param {string} screen the screen identifier
 * @param {string} state the state identifier
 * @param {'light'|'dark'} theme the theme
 */
async function show(page, screen, state, theme) {
  await page.locator(`[data-wf-theme="${theme}"]`).click();
  await page.evaluate((hash) => {
    location.hash = hash;
  }, `#${screen}/${state}`);
  await expect(page.locator('html')).toHaveAttribute('data-wf-ready', `${screen}/${state}/${theme}`);
}

/**
 * Read what one preview shows.
 * @param {import('@playwright/test').Frame} frame the preview frame
 */
const inspect = (frame) => frame.evaluate(() => {
  const root = document.documentElement;
  return {
    width: window.innerWidth,
    theme: root.dataset.theme,
    overflow: root.scrollWidth - root.clientWidth,
    sheets: [...document.querySelectorAll('link[rel="stylesheet"], style')].map((node) => node.getAttribute('href') ?? '<style>'),
    styled: getComputedStyle(document.querySelector('.app')).display,
    background: getComputedStyle(document.body).backgroundColor,
    classes: [...new Set([...document.querySelectorAll('[class]')].flatMap((node) => [...node.classList]))],
    brokenIcons: [...document.querySelectorAll('use')]
      .filter((use) => !document.getElementById(use.getAttribute('href').slice(1))
        || (use.closest('svg').getBoundingClientRect().width > 0 && use.getBBox().width === 0))
      .map((use) => use.getAttribute('href')),
    unopened: [...document.querySelectorAll('[data-wf-open]')].filter((node) => !node.matches(':popover-open, [open]')).length,
    text: document.querySelector('.app').innerText.trim().length,
  };
});

for (const screen of SCREENS) {
  test(`${screen} draws every state on a phone and a desktop, in light and dark`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    const problems = await open(page);
    const states = await page.evaluate((id) => window.wireframes.screens.find((entry) => entry.id === id).states.map((s) => s.id), screen);
    expect(states.length).toBeGreaterThan(0);
    const backgrounds = new Set();
    for (const state of states) {
      for (const theme of ['light', 'dark']) {
        await show(page, screen, state, theme);
        const frames = await Promise.all((await page.locator('iframe').elementHandles()).map((handle) => handle.contentFrame()));
        const seen = await Promise.all(frames.map(inspect));
        expect(seen.map((preview) => preview.width), 'phone and desktop').toEqual([390, 1280]);
        for (const preview of seen) {
          const tag = `${screen}/${state} ${theme} ${preview.width}`;
          expect(preview.sheets, tag).toEqual(['../../src/css/style.css']);
          expect(preview.styled, `${tag} the app shell`).toBe('grid');
          expect(preview.theme, tag).toBe(theme);
          expect(preview.overflow, `${tag} sideways scrolling`).toBeLessThanOrEqual(0);
          expect(preview.brokenIcons, tag).toEqual([]);
          expect(preview.unopened, `${tag} closed menus`).toBe(0);
          expect(preview.text, tag).toBeGreaterThan(10);
          expect(preview.classes.filter((name) => !isKnown(name)), `${tag} classes the app does not know`).toEqual([]);
          backgrounds.add(`${theme} ${preview.background}`);
        }
      }
    }
    expect(backgrounds.size, 'light and dark differ').toBe(2);
    expect(problems).toEqual([]);
  });
}

test('the page itself fits a phone and a desktop, and its size switch shows one preview', async ({ page }) => {
  const problems = await open(page);
  for (const width of [360, 1440]) {
    await page.setViewportSize({ width, height: 800 });
    await page.evaluate(() => {
      location.hash = '#all-tasks';
    });
    await expect(page.locator('html')).toHaveAttribute('data-wf-ready', /^all-tasks\//);
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
  }
  await page.locator('[data-wf-size="phone"]').click();
  await expect(page.locator('iframe:visible')).toHaveCount(1);
  await page.locator('[data-wf-size="both"]').click();
  await expect(page.locator('iframe:visible')).toHaveCount(2);
  expect(problems).toEqual([]);
});

test('a link to a screen shows the top of the page on a desktop, and the screen itself on a phone', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 600 });
  await open(page);
  await page.goto(`${PAGE.href}#nav-rail`);
  await expect(page.locator('html')).toHaveAttribute('data-wf-ready', /^nav-rail\//);
  await expect(page.locator('.wf-bar')).toBeInViewport({ ratio: 1 });
  await page.locator('.wf-nav a[href="#help"]').click();
  await expect(page.locator('html')).toHaveAttribute('data-wf-ready', /^help\//);
  await expect(page.locator('.wf-bar')).toBeInViewport({ ratio: 1 });
  await page.setViewportSize({ width: 390, height: 700 });
  await page.locator('.wf-nav a[href="#settings"]').click();
  await expect(page.locator('html')).toHaveAttribute('data-wf-ready', /^settings\//);
  await expect(page.locator('#wf-title')).toBeInViewport({ ratio: 1 });
  await expect(page.locator('iframe[title="Phone preview"]')).toBeInViewport({ ratio: 0.5 });
});

test('links and tabs inside a preview move between the screens, like the app', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const problems = await open(page);
  await expect(page.locator('html')).toHaveAttribute('data-wf-ready', /^first-launch\//);
  await page.goto(`${PAGE.href}#all-tasks`);
  await expect(page.locator('html')).toHaveAttribute('data-wf-ready', /^all-tasks\//);
  const desktop = page.frameLocator('iframe[title="Desktop preview"]');
  await desktop.locator('.app__sidebar a[href="#/lists"]').click();
  await expect(page).toHaveURL(/#lists$/);
  await expect(page.locator('#wf-title')).toHaveText('Lists');
  await expect(page.locator('html')).toHaveAttribute('data-wf-ready', /^lists\//);
  await page.goto(`${PAGE.href}#task-editor`);
  await expect(page.locator('html')).toHaveAttribute('data-wf-ready', /^task-editor\//);
  await desktop.getByRole('tab', { name: 'History' }).click();
  await expect(page).toHaveURL(/#task-editor-history$/);
  await expect(page.locator('html')).toHaveAttribute('data-wf-ready', /^task-editor-history\//);
  await desktop.getByRole('button', { name: 'Close the task editor' }).click();
  await expect(page).toHaveURL(/#all-tasks$/);
  expect(problems).toEqual([]);
});
