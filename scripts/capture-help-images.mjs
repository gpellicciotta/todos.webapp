/**
 * Take the screenshots of the help docs, and write their icon files, into docs/tutorial/img.
 *
 * The screenshots show the app on a phone-sized window, in light and dark, with placeholder tasks and a fixed clock,
 * so a rerun after a change of the app gives comparable images. It needs the Chromium of Playwright.
 */

import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { chromium } from '@playwright/test';
import { iconFile } from './help-icons.mjs';
import { startServer } from './serve.mjs';
import { HELP_SHOTS } from './site-files.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const TUTORIAL = join(ROOT, 'docs', 'tutorial');
const IMAGES = join(TUTORIAL, 'img');
const NOW = new Date('2026-11-17T10:00:00+01:00');
const WIDTH = 390;

const USAGE = `Usage: node scripts/capture-help-images.mjs [--help]

Take the screenshots of the help docs in light and dark, and write the icon files they show, into docs/tutorial/img.

Options:
  -h, --help   show this help message and exit

Exit codes: 0 success, 1 failure, 2 invalid arguments.`;

/** Write a file per icon that a help doc shows, and remove those that no doc shows. */
async function writeIcons() {
  const docs = (await readdir(TUTORIAL)).filter((name) => name.endsWith('.md'));
  const text = (await Promise.all(docs.map((name) => readFile(join(TUTORIAL, name), 'utf8')))).join('\n');
  const names = new Set([...text.matchAll(/\]\(img\/icons\/([a-z0-9-]+)\.svg\)/g)].map((match) => match[1]));
  const sprite = await readFile(join(ROOT, 'src', 'img', 'icons.svg'), 'utf8');
  await rm(join(IMAGES, 'icons'), { recursive: true, force: true });
  await mkdir(join(IMAGES, 'icons'), { recursive: true });
  await Promise.all([...names].map((name) => writeFile(join(IMAGES, 'icons', `${name}.svg`), iconFile(sprite, name))));
  return names.size;
}

/**
 * Fill the local store with placeholder tasks in every status.
 * @param {import('@playwright/test').Page} page a page of the app
 * @returns {Promise<Record<string, string>>} the identifiers of the tasks that screenshots open
 */
function seed(page) {
  return page.evaluate(async () => {
    const { openStore } = await import('./js/store/db.js');
    const hours = (count) => new Date(Date.now() + count * 3_600_000).toISOString();
    const store = await openStore({ broadcast: true });
    const home = await store.createList({ name: 'Home', description: 'Chores and repairs' });
    const work = await store.createList({ name: 'Work' });
    const add = async (input, list) => store.createTask(input, list ? { lists: [list.id] } : {});
    const trip = await add({ description: 'Plan the spring trip', 'lifecycle-rules': { 'start-time': hours(5) } });
    const dropped = await add({ description: 'Buy a lawn mower' }, home);
    await store.postEvent(dropped.id, 'cancel');
    const report = await add({ description: 'Send the grant report', 'due-time': hours(-3), 'lifecycle-rules': { 'overdue-handling': 'fail' } }, work);
    const plants = await add({ description: 'Water the plants', 'lifecycle-rules': { 'recurrence-unit': 'day', 'recurrence-interval': 1, timezone: 'Europe/Brussels' } }, home);
    await store.logEntry(plants.id, { checked: true });
    const french = await add({ description: 'Study French', 'lifecycle-rules': { 'goal-direction': 'at-least', 'goal-measure': 'time', 'goal-target': 1800 } });
    await store.logEntry(french.id, { 'time-spent-seconds': 600 });
    const slides = await add({ description: 'Prepare slides for the review', 'due-time': hours(30), 'lifecycle-rules': { 'goal-target': 3 } }, work);
    await store.logEntry(slides.id, { checked: true, label: 'Outline' });
    await add({ description: 'Call the plumber', 'due-time': hours(-18) }, home);
    const paint = await add({ description: 'Buy paint', 'due-time': hours(32) }, home);
    await store.expireTask(report.id);
    const old = await add({ description: 'Sort old receipts' });
    await store.deleteTask(old.id);
    store.close();
    return { slides: slides.id, french: french.id, paint: paint.id, report: report.id, trip: trip.id };
  });
}

/**
 * Take every screenshot in one theme.
 * @param {import('@playwright/test').Browser} browser the browser
 * @param {string} base the address of the app
 * @param {'light'|'dark'} theme the theme
 * @returns {Promise<string[]>} the problems of the pages: errors, and screenshots not taken
 */
async function capture(browser, base, theme) {
  const context = await browser.newContext({
    viewport: { width: WIDTH, height: 760 }, deviceScaleFactor: 2, colorScheme: theme, locale: 'en-GB', timezoneId: 'Europe/Brussels',
    reducedMotion: 'reduce',
  });
  const page = await context.newPage();
  const problems = [];
  const taken = new Set();
  page.on('pageerror', (error) => problems.push(`${theme} page: ${error.message}`));
  page.on('console', (message) => message.type() === 'error' && problems.push(`${theme} console: ${message.text()}`));
  page.on('response', (response) => response.status() >= 400 && problems.push(`${theme} HTTP ${response.status()}: ${response.url()}`));
  await page.clock.setFixedTime(NOW);

  /** Open a route in a freshly loaded app, so no toast or panel of an earlier screenshot stays. */
  const open = async (hash, height = 760) => {
    await page.setViewportSize({ width: WIDTH, height });
    await page.goto(`${base}${hash}`);
    await page.reload();
    await page.locator('html[data-shell="ready"]').waitFor();
    await page.waitForTimeout(700);
  };
  /** Take a screenshot of the window between two heights, the whole window by default. */
  const shoot = async (name, { top = 0, bottom = page.viewportSize().height } = {}) => {
    taken.add(name);
    const file = theme === 'light' ? name : `${name}-dark`;
    await page.screenshot({ path: join(IMAGES, `${file}.png`), clip: { x: 0, y: top, width: WIDTH, height: Math.round(bottom - top) } });
  };
  const box = (selector) => page.locator(selector).first().boundingBox();

  await open('#/tasks');
  const ids = await seed(page);
  await open('#/tasks', 780);
  await shoot('all-tasks');

  const add = page.getByLabel('Search or add a task');
  await add.fill('Buy brushes tomorrow 18:00 #home');
  await page.waitForTimeout(500);
  const bar = await box('.app__action-bar');
  await shoot('add-task', { top: Math.max(0, bar.y - 12), bottom: bar.y + bar.height });
  await add.fill('');

  await open('#/tasks');
  await page.locator('.task-row', { hasText: 'Study French' }).locator('.status-button').click();
  await page.locator('.quick-log').waitFor();
  await page.waitForTimeout(500);
  const log = await box('.quick-log');
  await shoot('quick-log', { top: Math.max(0, log.y - 150), bottom: Math.min(760, log.y + log.height + 24) });

  await open('#/tasks');
  await page.locator('.task-row', { hasText: 'Buy paint' }).locator('.status-button').click();
  await page.locator('.toast').first().waitFor();
  await page.waitForTimeout(500);
  const toastBar = await box('.app__action-bar');
  const toast = await box('.toast');
  await shoot('toast-undo', { top: Math.max(0, toast.y - 150), bottom: toastBar.y + toastBar.height });

  await open(`#/tasks/${ids.slides}`, 780);
  await shoot('task-editor');

  await open('#/tasks/view-options', 760);
  await shoot('view-options');

  await open('#/lists', 460);
  await shoot('lists');

  for (const [name, hash, key] of [['settings-data', '#/settings', 'data'], ['settings-connection', '#/settings', 'connection']]) {
    await open(hash, 1600);
    const section = await box(`section[aria-labelledby="settings-${key}"]`);
    await shoot(name, { top: section.y - 8, bottom: section.y + section.height + 8 });
  }

  await open('#/bin', 440);
  await shoot('recycle-bin');
  await context.close();
  problems.push(...HELP_SHOTS.filter((name) => !taken.has(name)).map((name) => `${theme}: no screenshot ${name}`));
  return problems;
}

/**
 * Run the script from the command line.
 * @param {string[]} argv the arguments after the script name
 * @returns {Promise<number>} the exit code
 */
async function main(argv) {
  let parsed;
  try {
    parsed = parseArgs({ args: argv, options: { help: { type: 'boolean', short: 'h' } } });
  }
  catch (error) {
    console.error(`${error.message}\n\n${USAGE}`);
    return 2;
  }
  if (parsed.values.help) {
    console.log(USAGE);
    return 0;
  }
  const icons = await writeIcons();
  const server = await startServer({ port: 0 });
  const browser = await chromium.launch();
  try {
    const base = `http://127.0.0.1:${server.address().port}/`;
    const problems = [...await capture(browser, base, 'light'), ...await capture(browser, base, 'dark')];
    if (problems.length > 0) {
      console.error(problems.join('\n'));
      return 1;
    }
    console.log(`Wrote ${HELP_SHOTS.length * 2} screenshots and ${icons} icons into ${IMAGES}`);
    return 0;
  }
  finally {
    await browser.close();
    server.close();
  }
}

main(process.argv.slice(2)).then((code) => process.exit(code), (error) => {
  console.error(error);
  process.exit(1);
});
