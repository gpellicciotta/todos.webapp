import { expect, test } from '@playwright/test';

const GALLERY = '/demo/visual-style-gallery.html';
const SECTIONS = '[data-gallery-group="controls"]';
const MIN_TARGET = 44;

const VIEWPORTS = [
  { width: 390, height: 844 },
  { width: 1440, height: 900 },
];

const THEMES = [
  { name: 'light', label: 'Light' },
  { name: 'dark', label: 'Dark' },
];

const CONTROL_SECTIONS = [
  'Button',
  'Icon button',
  'Field',
  'Checkbox and radio',
  'Chip',
  'Filter chip',
  'Segmented control',
  'Menu',
  'Popover',
  'Dialog',
  'Banner',
  'Toast',
];

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
    test(`control sections render at ${viewport.width} px in the ${theme.name} theme`, async ({ page }) => {
      const problems = watch(page);
      await openGallery(page, viewport, theme);

      for (const name of CONTROL_SECTIONS) {
        const section = page.locator(SECTIONS).filter({
          has: page.getByRole('heading', { level: 2, name, exact: true }),
        });
        await expect(section).toHaveCount(1);
        await expect(section).toBeVisible();
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

  test(`interactive control specimens are at least 44 by 44 px at ${viewport.width} px`, async ({ page }) => {
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
            const tag = `${element.tagName.toLowerCase()}${element.id ? `#${element.id}` : ''}`;
            found.push(`${section.id}: ${tag} "${name}" ${box.width}x${box.height}`);
          }
        }
      }
      return { checked: count, small: found };
    }, MIN_TARGET);
    expect(checked).toBeGreaterThanOrEqual(40);
    expect(small).toEqual([]);
  });

  test(`every keyboard stop in the control sections shows a focus ring at ${viewport.width} px`, async ({ page }) => {
    await openGallery(page, viewport, THEMES[0]);
    await page.locator('.gallery-nav a').last().focus();

    const stops = [];
    for (let presses = 0; presses < 400; presses++) {
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
        const hosts = [element, element.closest('label')].filter(Boolean);
        const ringed = hosts.some((host) => {
          const style = getComputedStyle(host);
          return style.outlineStyle !== 'none' && parseFloat(style.outlineWidth) >= 2;
        });
        const name = element.getAttribute('aria-label') ?? (element.closest('label') ?? element).textContent.trim();
        const tag = `${element.tagName.toLowerCase()}${element.id ? `#${element.id}` : ''}`;
        return { id: `${section.id}: ${tag} "${name}"`, ringed };
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

test('every control section shows a forced focus-visible specimen with a focus ring', async ({ page }) => {
  await openGallery(page, VIEWPORTS[1], THEMES[0]);

  const sections = await page.locator(SECTIONS).evaluateAll((elements) => elements.map((section) => {
    const specimens = [...section.querySelectorAll('.is-focus')];
    const unringed = specimens.filter((specimen) => {
      const style = getComputedStyle(specimen);
      return style.outlineStyle === 'none' || parseFloat(style.outlineWidth) < 2;
    });
    return { id: section.id, count: specimens.length, unringed: unringed.length };
  }));

  expect(sections.filter((section) => section.count === 0).map((section) => section.id)).toEqual([]);
  expect(sections.filter((section) => section.unringed > 0).map((section) => section.id)).toEqual([]);
});

test('checkbox, radio, segmented, and menu specimens include a focus-visible state', async ({ page }) => {
  await openGallery(page, VIEWPORTS[1], THEMES[0]);
  for (const selector of [
    '#checkbox-radio input[type="checkbox"].is-focus',
    '#checkbox-radio input[type="radio"].is-focus',
    '#segmented-control .segmented__option.is-focus',
    '#menu .menu__item.is-focus',
  ]) {
    await expect(page.locator(selector), selector).toHaveCount(1);
  }
});

test('pressed toggles keep distinct hover and active feedback', async ({ page }) => {
  await openGallery(page, VIEWPORTS[1], THEMES[0]);
  for (const control of ['icon-button', 'filter-chip']) {
    const backgrounds = [];
    for (const state of [':not(.is-hover, .is-active)', '.is-hover', '.is-active']) {
      const specimen = page.locator(`#${control} .${control}[aria-pressed="true"]${state}`);
      await expect(specimen, `${control} pressed ${state}`).toHaveCount(1);
      backgrounds.push(await specimen.evaluate((element) => getComputedStyle(element).backgroundColor));
    }
    expect(new Set(backgrounds).size, `${control}: ${backgrounds.join(' / ')}`).toBe(3);
  }
});
