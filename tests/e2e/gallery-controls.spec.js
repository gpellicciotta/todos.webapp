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

    // The page records each stop as focus lands, so a Tab press costs one round trip instead of two (under 30 s).
    await page.evaluate((selector) => {
      window.focusStops = { stops: [], done: false };
      document.addEventListener('focusout', (event) => {
        window.focusStops.done ||= event.relatedTarget === null;
      });
      document.addEventListener('focusin', (event) => {
        const element = event.target;
        const section = element.closest(selector);
        if (window.focusStops.done || !section) {
          return;
        }
        const hosts = [element, element.closest('label')].filter(Boolean);
        const ringed = hosts.some((host) => {
          const style = getComputedStyle(host);
          return style.outlineStyle !== 'none' && parseFloat(style.outlineWidth) >= 2;
        });
        const name = element.getAttribute('aria-label') ?? (element.closest('label') ?? element).textContent.trim();
        const tag = `${element.tagName.toLowerCase()}${element.id ? `#${element.id}` : ''}`;
        window.focusStops.stops.push({ id: `${section.id}: ${tag} "${name}"`, ringed });
      });
    }, SECTIONS);
    for (let presses = 0; presses < 400; presses++) {
      await page.keyboard.press('Tab');
      if (presses % 20 === 19 && await page.evaluate(() => window.focusStops.done)) {
        break;
      }
    }
    const { stops, done } = await page.evaluate(() => window.focusStops);
    expect(done, 'Tab reached the end of the page').toBe(true);

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
  // A filter chip opens a popover, so data-active marks it instead of aria-pressed.
  for (const [control, pressed] of [['icon-button', '[aria-pressed="true"]'], ['filter-chip', '[data-active="true"]']]) {
    const backgrounds = [];
    for (const state of [':not(.is-hover, .is-active)', '.is-hover', '.is-active']) {
      const specimen = page.locator(`#${control} .${control}${pressed}${state}`);
      await expect(specimen, `${control} pressed ${state}`).toHaveCount(1);
      backgrounds.push(await specimen.evaluate((element) => getComputedStyle(element).backgroundColor));
    }
    expect(new Set(backgrounds).size, `${control}: ${backgrounds.join(' / ')}`).toBe(3);
  }
});

test('visible segmented legends use the package .segmented__legend class and its medium weight', async ({ page }) => {
  await openGallery(page, VIEWPORTS[1], THEMES[0]);
  const legends = page.locator('#segmented-control .segmented > legend, #task-editor .segmented > legend');
  expect(await legends.count()).toBeGreaterThanOrEqual(3);
  const styles = await legends.evaluateAll((elements) => elements.map((element) => ({
    text: element.textContent,
    marked: element.classList.contains('segmented__legend'),
    weight: getComputedStyle(element).fontWeight,
    padding: getComputedStyle(element).paddingLeft,
  })));
  for (const style of styles) {
    expect(style, style.text).toEqual({ text: style.text, marked: true, weight: '500', padding: '0px' });
  }
});

test('removable chips use .chip__remove: chip corners, a raised hover ground in light mode, and a quiet disabled state', async ({ page }) => {
  await openGallery(page, VIEWPORTS[1], THEMES[0]);
  const buttons = page.locator('#chip .chip--removable > button, #task-editor .chip--removable > button');
  expect(await buttons.count()).toBeGreaterThanOrEqual(4);
  expect(await buttons.evaluateAll((elements) => elements.filter((element) => !element.classList.contains('chip__remove')).length)).toBe(0);
  const chipRadius = await page.locator('#chip .chip--removable').first().evaluate((element) => getComputedStyle(element).borderTopLeftRadius);
  const enabled = page.locator('#chip .chip--removable > .chip__remove:not(:disabled):not(.is-focus)').first();
  expect(await enabled.evaluate((element) => getComputedStyle(element).borderTopLeftRadius)).toBe(chipRadius);
  const ground = (locator) => locator.evaluate((element) => getComputedStyle(element).backgroundColor);
  const chipGround = await page.locator('#chip .chip--removable').first().evaluate((element) => getComputedStyle(element).backgroundColor);
  await enabled.hover();
  await expect.poll(() => ground(enabled)).not.toBe(chipGround);
  await expect.poll(() => ground(enabled)).not.toBe('rgba(0, 0, 0, 0)');
  const disabled = page.locator('#chip .chip--removable > .chip__remove:disabled');
  await expect(disabled).toHaveCount(1);
  await disabled.hover({ force: true });
  expect(await ground(disabled)).toBe('rgba(0, 0, 0, 0)');
  expect(await disabled.evaluate((element) => getComputedStyle(element).cursor)).toBe('not-allowed');
});

test('the field hint and counter are direct children on one row, the counter at the end', async ({ page }) => {
  await openGallery(page, VIEWPORTS[1], THEMES[0]);
  const field = page.locator('#field .field').filter({ has: page.locator('.field__counter') }).first();
  await expect(field.locator('.field__meta')).toHaveCount(0);
  await expect(field.locator(':scope > .field__hint')).toHaveCount(1);
  await expect(field.locator(':scope > .field__counter')).toHaveCount(1);
  const hint = await field.locator(':scope > .field__hint').boundingBox();
  const counter = await field.locator(':scope > .field__counter').boundingBox();
  const box = await field.boundingBox();
  // One grid row: the counter sits within the hint's line box, centered when the hint wraps.
  expect(counter.y).toBeGreaterThanOrEqual(hint.y - 1);
  expect(counter.y + counter.height).toBeLessThanOrEqual(hint.y + hint.height + 1);
  expect(hint.x).toBeLessThan(counter.x);
  expect(Math.abs(box.x + box.width - (counter.x + counter.width))).toBeLessThanOrEqual(1);
});
