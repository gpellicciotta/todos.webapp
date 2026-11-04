import { expect, test } from '@playwright/test';

const GALLERY = '/demo/visual-style-gallery.html';
// Sections of the app chrome and the task editor pattern; the task row components have their own spec.
const SECTIONS = '#navigation, #sync-indicator, #editor-panel, #note-thread, #empty-state, #task-editor';
const COMPONENT_SECTIONS = '#navigation, #sync-indicator, #editor-panel, #note-thread, #empty-state';
const MIN_TARGET = 44;

const VIEWPORTS = [
  { width: 390, height: 844 },
  { width: 1440, height: 900 },
];

const THEMES = [
  { name: 'light', label: 'Light' },
  { name: 'dark', label: 'Dark' },
];

const CHROME_SECTIONS = ['Navigation', 'Sync indicator', 'Editor panel', 'Note thread', 'Empty state', 'Task editor'];

const SYNC_STATES = ['local', 'synced', 'syncing', 'offline', 'sign-in', 'error'];

/**
 * Collect console errors, page errors, failed requests, and HTTP errors of a page.
 * @param {import('@playwright/test').Page} page page to watch
 * @returns {string[]} live problem list
 */
function watch(page) {
  const problems = [];
  page.on('console', (message) => {
    if (message.type() === 'error') {
      problems.push(`console: ${message.text()}`);
    }
  });
  page.on('pageerror', (error) => problems.push(`page: ${error.message}`));
  page.on('requestfailed', (request) => problems.push(`request: ${request.url()}`));
  page.on('response', (response) => {
    if (response.status() >= 400) {
      problems.push(`HTTP ${response.status()}: ${response.url()}`);
    }
  });
  return problems;
}

/**
 * Open the gallery at a viewport size in a pinned theme.
 * @param {import('@playwright/test').Page} page page to drive
 * @param {{width: number, height: number}} viewport viewport size
 * @param {{name: string, label: string}} theme theme to pick in the switch
 */
async function openGallery(page, viewport, theme) {
  await page.setViewportSize(viewport);
  const response = await page.goto(GALLERY);
  expect(response.status()).toBe(200);
  await page.getByRole('radio', { name: theme.label, exact: true }).check();
  await expect(page.locator('html')).toHaveAttribute('data-theme', theme.name);
}

for (const viewport of VIEWPORTS) {
  for (const theme of THEMES) {
    test(`chrome sections render at ${viewport.width} px in the ${theme.name} theme`, async ({ page }) => {
      const problems = watch(page);
      await openGallery(page, viewport, theme);

      for (const name of CHROME_SECTIONS) {
        const section = page.locator(SECTIONS).filter({
          has: page.getByRole('heading', { level: 2, name, exact: true }),
        });
        await expect(section, name).toHaveCount(1);
        await expect(section, name).toBeVisible();
      }

      const overflowing = await page.locator(SECTIONS).evaluateAll((sections) => sections
        .filter((section) => section.scrollWidth > section.clientWidth)
        .map((section) => section.id));
      expect(overflowing).toEqual([]);

      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      expect(scrollWidth).toBeLessThanOrEqual(viewport.width);
      expect(problems).toEqual([]);
    });
  }

}

test('every sync state has its own icon and label, plus the unseen entries dot', async ({ page }) => {
  await openGallery(page, VIEWPORTS[1], THEMES[0]);
  const syncIcons = new Set();
  for (const state of SYNC_STATES) {
    const indicator = page.locator(`#sync-indicator .sync-indicator[data-state="${state}"]`).first();
    await expect(indicator, state).toBeVisible();
    await expect(indicator.locator('.sync-indicator__label'), state).not.toBeEmpty();
    syncIcons.add(await indicator.locator('use').first().getAttribute('href'));
  }
  expect(syncIcons.size).toBe(SYNC_STATES.length);
  await expect(page.locator('#sync-indicator .sync-indicator__dot').first()).toBeVisible();
});

test('the syncing icon spins only without reduced motion', async ({ page }) => {
  await openGallery(page, VIEWPORTS[1], THEMES[0]);
  const icon = page.locator('#sync-indicator .sync-indicator[data-state="syncing"] .icon').first();
  expect(await icon.evaluate((element) => getComputedStyle(element).animationName)).not.toBe('none');

  await page.emulateMedia({ reducedMotion: 'reduce' });
  expect(await icon.evaluate((element) => getComputedStyle(element).animationName)).toBe('none');
});

test('navigation marks the current route with aria-current in the sidebar and the bottom bar', async ({ page }) => {
  await openGallery(page, VIEWPORTS[1], THEMES[0]);
  for (const nav of ['.sidebar', '.bottom-nav']) {
    const current = page.locator(`#navigation ${nav} [aria-current="page"]`);
    await expect(current, nav).toHaveCount(1);
    const [currentGround, otherGround] = await Promise.all([
      current.evaluate((element) => getComputedStyle(element).backgroundColor + getComputedStyle(element).boxShadow),
      page.locator(`#navigation ${nav} a:not([aria-current]):not(.is-hover, .is-focus, .is-active)`).first()
        .evaluate((element) => getComputedStyle(element).backgroundColor + getComputedStyle(element).boxShadow),
    ]);
    expect(currentGround, nav).not.toBe(otherGround);
  }
  for (const destination of ['Tasks', 'Lists', 'Bin', 'Settings']) {
    await expect(page.locator('#navigation .bottom-nav').getByRole('link', { name: destination, exact: true })).toHaveCount(1);
  }
});

for (const viewport of VIEWPORTS) {
  test(`interactive chrome specimens are at least 44 by 44 px at ${viewport.width} px`, async ({ page }) => {
    await openGallery(page, viewport, THEMES[0]);

    const { checked, small } = await page.locator(SECTIONS).evaluateAll((sections, min) => {
      const found = [];
      let count = 0;
      for (const section of sections) {
        for (const element of section.querySelectorAll('button, a[href], input, select, textarea')) {
          const isChoice = element.matches('input[type="checkbox"], input[type="radio"]');
          const target = isChoice ? element.closest('label') ?? element : element;
          if (!target.checkVisibility()) {
            continue;
          }
          const box = target.getBoundingClientRect();
          count++;
          if (box.width < min || box.height < min) {
            const name = element.getAttribute('aria-label') ?? target.textContent.trim();
            found.push(`${section.id}: ${element.tagName.toLowerCase()} "${name}" ${box.width}x${box.height}`);
          }
        }
      }
      return { checked: count, small: found };
    }, MIN_TARGET);
    expect(checked).toBeGreaterThanOrEqual(30);
    expect(small).toEqual([]);
  });

  test(`every keyboard stop in the chrome sections shows a focus ring at ${viewport.width} px`, async ({ page }) => {
    await openGallery(page, viewport, THEMES[0]);
    await page.locator('#toast .button').last().focus();

    const stops = [];
    for (let presses = 0; presses < 600; presses++) {
      await page.keyboard.press('Tab');
      const stop = await page.evaluate((selector) => {
        const element = document.activeElement;
        if (!element || element === document.body) {
          return { done: true };
        }
        const section = element.closest(selector);
        if (!section) {
          return { outside: true };
        }
        const hosts = [element, element.closest('label'), element.closest('.task-row')].filter(Boolean);
        const ringed = hosts.some((host) => {
          const style = getComputedStyle(host);
          return style.outlineStyle !== 'none' && parseFloat(style.outlineWidth) >= 2;
        });
        const name = element.getAttribute('aria-label') ?? (element.closest('label') ?? element).textContent.trim();
        return { id: `${section.id}: ${element.tagName.toLowerCase()} "${name}"`, ringed };
      }, SECTIONS);
      if (stop.done) {
        break;
      }
      if (!stop.outside) {
        stops.push(stop);
      }
    }

    expect(stops.length).toBeGreaterThanOrEqual(30);
    expect(stops.filter((stop) => !stop.ringed).map((stop) => stop.id)).toEqual([]);
  });
}

test('every chrome component section shows a forced focus-visible specimen with a focus ring', async ({ page }) => {
  await openGallery(page, VIEWPORTS[1], THEMES[0]);

  const sections = await page.locator(COMPONENT_SECTIONS).evaluateAll((elements) => elements.map((section) => {
    const specimens = [...section.querySelectorAll('.is-focus')];
    const unringed = specimens.filter((specimen) => {
      const style = getComputedStyle(specimen);
      return style.outlineStyle === 'none' || parseFloat(style.outlineWidth) < 2;
    });
    return { id: section.id, count: specimens.length, unringed: unringed.length };
  }));

  expect(sections.length).toBe(5);
  expect(sections.filter((section) => section.count === 0).map((section) => section.id)).toEqual([]);
  expect(sections.filter((section) => section.unringed > 0).map((section) => section.id)).toEqual([]);
});
