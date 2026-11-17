import { expect, test } from '@playwright/test';
import { installFocusIndicator } from './focus-indicator.js';

const GALLERY = '/demo/visual-style-gallery.html';
const SPRITE = '/img/icons.svg';
const LOOK_SPRITE = '/vendor/design/looks/neutral/icons.svg';
// Sections of the task row components and the task list pattern; the app chrome has its own spec.
const SECTIONS = '#status-button, #task-row, #task-list';
const MIN_TARGET = 44;
const ROW_HEIGHT = 48;

const VIEWPORTS = [
  { width: 390, height: 844 },
  { width: 1440, height: 900 },
];

const THEMES = [
  { name: 'light', label: 'Light' },
  { name: 'dark', label: 'Dark' },
];

const APP_SECTIONS = ['Status button', 'Task row', 'Task list'];

const STATUSES = ['ready', 'in-progress', 'completed', 'cancelled'];

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
  await installFocusIndicator(page);
}

/**
 * Resolve a color token to its computed color on a probe element.
 * @param {import('@playwright/test').Page} page page to inspect
 * @param {string} token custom property name, such as `--color-text-muted`
 * @returns {Promise<string>} the computed `rgb()` color
 */
function tokenColor(page, token) {
  return page.evaluate((name) => {
    const probe = document.createElement('span');
    probe.style.color = `var(${name})`;
    document.body.append(probe);
    const color = getComputedStyle(probe).color;
    probe.remove();
    return color;
  }, token);
}

for (const viewport of VIEWPORTS) {
  for (const theme of THEMES) {
    test(`task row, status, and task list sections render at ${viewport.width} px in the ${theme.name} theme`, async ({ page }) => {
      const problems = watch(page);
      await openGallery(page, viewport, theme);

      for (const name of APP_SECTIONS) {
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

  test(`task rows are at least 48 px, with a description of at most 2 lines over the meta line, at ${viewport.width} px`, async ({ page }) => {
    await openGallery(page, viewport, THEMES[0]);

    const rows = await page.locator('#task-row .task-row, #task-list .task-row').evaluateAll((elements) => elements
      .filter((row) => row.checkVisibility())
      .map((row) => {
        const description = row.querySelector('.task-row__description');
        const meta = row.querySelector('.task-row__meta');
        const style = getComputedStyle(description);
        return {
          text: description.textContent.trim(),
          height: row.getBoundingClientRect().height,
          lines: Math.round(description.getBoundingClientRect().height / parseFloat(style.lineHeight)),
          clamped: description.scrollHeight > description.clientHeight + 1,
          clamp: style.webkitLineClamp,
          below: meta ? meta.getBoundingClientRect().top >= description.getBoundingClientRect().bottom - 1 : true,
          start: meta ? Math.abs(meta.getBoundingClientRect().left - description.getBoundingClientRect().left) <= 1 : true,
        };
      }));

    expect(rows.length).toBeGreaterThanOrEqual(10);
    for (const row of rows) {
      expect(row.height, row.text).toBeGreaterThanOrEqual(ROW_HEIGHT);
      expect(row.lines, row.text).toBeLessThanOrEqual(2);
      expect(row.clamp, row.text).toBe('2');
      expect(row.below, row.text).toBe(true);
      expect(row.start, row.text).toBe(true);
    }
    const long = rows.filter((row) => row.text.length > 80);
    expect(long.length).toBeGreaterThanOrEqual(1);
    expect(long.every((row) => row.lines === 2 && row.clamped), JSON.stringify(long)).toBe(true);
  });
}

for (const theme of THEMES) {
  test(`completed and cancelled rows are muted and struck through, in the ${theme.name} theme`, async ({ page }) => {
    await openGallery(page, VIEWPORTS[0], theme);
    const text = await tokenColor(page, '--color-text');
    const muted = await tokenColor(page, '--color-text-muted');
    expect(text).not.toBe(muted);

    for (const status of STATUSES) {
      const rows = page.locator(`#task-row .task-row[data-status="${status}"]`);
      expect(await rows.count(), status).toBeGreaterThanOrEqual(1);
      const styles = await rows.locator('.task-row__description').evaluateAll((elements) => elements.map((element) => {
        const style = getComputedStyle(element);
        return { color: style.color, decoration: style.textDecorationLine };
      }));
      for (const style of styles) {
        const done = status === 'completed' || status === 'cancelled';
        expect(style.color, status).toBe(done ? muted : text);
        if (done) {
          expect(style.decoration, status).toContain('line-through');
        }
        else {
          expect(style.decoration, status).toBe('none');
        }
      }
    }
  });
}

test('every status has its own icon from the sprite', async ({ page, request }) => {
  await openGallery(page, VIEWPORTS[1], THEMES[0]);

  const symbolsOf = async (url) => {
    const sprite = await request.get(url);
    expect(sprite.status()).toBe(200);
    return new Set([...(await sprite.text()).matchAll(/<symbol[^>]*\bid="([^"]+)"/g)].map((match) => match[1]));
  };
  // The vendored account menu draws its icons from the look sprite, which the app names at start.
  const sprites = [['img/icons.svg', await symbolsOf(SPRITE)], ['vendor/design/looks/neutral/icons.svg', await symbolsOf(LOOK_SPRITE)]];

  const references = await page.locator('use').evaluateAll((uses) => uses.map((use) => use.getAttribute('href')));
  const missing = references.filter((href) => {
    const [path, id] = href.split('#');
    const symbols = sprites.find(([name]) => path.endsWith(name))?.[1];
    return !symbols?.has(id);
  });
  expect(references.length).toBeGreaterThanOrEqual(30);
  expect(missing).toEqual([]);

  for (const status of STATUSES) {
    await expect(page.locator(`#status-button .status-button use[href$="#status-${status}"]`), status).not.toHaveCount(0);
    await expect(page.locator(`#task-row .task-row[data-status="${status}"] use[href$="#status-${status}"]`), status).not.toHaveCount(0);
  }
});

for (const viewport of VIEWPORTS) {
  test(`interactive task row, status, and task list specimens are at least 44 by 44 px at ${viewport.width} px`, async ({ page }) => {
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
    expect(checked).toBeGreaterThanOrEqual(40);
    expect(small).toEqual([]);
  });

  test(`every keyboard stop in the task row, status, and task list sections shows a focus ring at ${viewport.width} px`, async ({ page }) => {
    test.setTimeout(90_000);
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
        const ringed = hosts.some((host) => window.focusIndicator(host));
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

    expect(stops.length).toBeGreaterThanOrEqual(40);
    expect(stops.filter((stop) => !stop.ringed).map((stop) => stop.id)).toEqual([]);
  });
}

test('the status button and task row sections show forced focus-visible specimens with a focus ring', async ({ page }) => {
  await openGallery(page, VIEWPORTS[1], THEMES[0]);

  const sections = await page.locator('#status-button, #task-row').evaluateAll((elements) => elements.map((section) => {
    const specimens = [...section.querySelectorAll('.is-focus')];
    const unringed = specimens.filter((specimen) => !window.focusIndicator(specimen));
    return { id: section.id, count: specimens.length, unringed: unringed.length };
  }));

  expect(sections.length).toBe(2);
  expect(sections.filter((section) => section.count === 0).map((section) => section.id)).toEqual([]);
  expect(sections.filter((section) => section.unringed > 0).map((section) => section.id)).toEqual([]);
});

test('task row specimens cover every documented state', async ({ page }) => {
  await openGallery(page, VIEWPORTS[1], THEMES[0]);
  for (const selector of [
    '.task-row:not(.is-hover, .is-focus, [data-dragging], [data-drop], [data-readonly])',
    '.task-row.is-hover',
    '.task-row.is-focus',
    '.task-row:has(.task-row__open[aria-current="page"])',
    '.task-row[data-dragging="true"]',
    '.task-row[data-drop="before"]',
    '.task-row[data-drop="after"]',
    '.task-row[data-readonly="true"]',
    '.task-row .task-row__due--overdue',
    '.task-row .task-row__due:not(.task-row__due--overdue)',
    '.task-row .task-row__repeat',
    '.task-row .task-row__lists',
    '.task-row .status-button > .task-row__count',
    '.task-row .task-row__handle',
  ]) {
    await expect(page.locator(`#task-row ${selector}`).first(), selector).toBeVisible();
  }
  await expect(page.locator('#task-row, #task-list').locator('.task-row__notes, .task-row__shared, .chip--overdue, .task-row .chip')).toHaveCount(0);
  await expect(page.locator('.task-row__more, .task-row [aria-haspopup]')).toHaveCount(0);
});

/**
 * Read the contrast of an element's text on a ground, flattening each color through a canvas pixel.
 * @param {import('@playwright/test').Locator} locator the text element
 * @param {'self'|'row'} ground whose background is the ground: the element's own, or its row's
 * @returns {Promise<{ratio: number, size: number, color: string}>} the contrast ratio, the font size, and the text color
 */
function contrastOf(locator, ground) {
  return locator.evaluate((element, which) => {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    const pixel = (color, under = 'rgb(255, 255, 255)') => {
      context.fillStyle = under;
      context.fillRect(0, 0, 1, 1);
      context.fillStyle = color;
      context.fillRect(0, 0, 1, 1);
      const [r, g, b] = context.getImageData(0, 0, 1, 1).data;
      return `rgb(${r}, ${g}, ${b})`;
    };
    const luminance = (rgb) => {
      const [r, g, b] = rgb.match(/\d+/g).map((value) => {
        const channel = Number(value) / 255;
        return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const style = getComputedStyle(element);
    const host = which === 'self' ? element : element.closest('.task-row');
    const back = pixel(getComputedStyle(host).backgroundColor, pixel(getComputedStyle(document.body).backgroundColor));
    const fore = pixel(style.color, back);
    const [light, dark] = [luminance(fore), luminance(back)].sort((a, b) => b - a);
    return { ratio: (light + 0.05) / (dark + 0.05), size: parseFloat(style.fontSize), color: fore };
  }, ground);
}

for (const theme of THEMES) {
  test(`overdue due text is orange at 4.5:1, in-time due text stays muted, in the ${theme.name} theme (OVD-2)`, async ({ page }) => {
    await openGallery(page, VIEWPORTS[1], theme);
    await page.addStyleTag({ content: '*, *::before, *::after { transition: none !important; }' });
    const danger = await tokenColor(page, '--color-danger');
    const muted = await tokenColor(page, '--color-text-muted');
    const overdue = page.locator('#task-row .task-row:not(.is-hover, .is-focus, .is-active) .task-row__due--overdue').first();
    await expect(overdue).toHaveText(/\S/);
    expect(await overdue.evaluate((element) => getComputedStyle(element).color)).toBe(danger);
    expect(await overdue.locator('.icon').evaluate((element) => getComputedStyle(element).color)).toBe(danger);
    expect(await overdue.evaluate((element) => getComputedStyle(element).fontWeight)).toBe('400');
    expect((await contrastOf(overdue, 'row')).ratio).toBeGreaterThanOrEqual(4.5);
    const inTime = page.locator('#task-row .task-row__due:not(.task-row__due--overdue)').first();
    expect(await inTime.evaluate((element) => getComputedStyle(element).color)).toBe(muted);
  });

  test(`count badges take the status tint with dark text at 4.5:1 and at least 10 px, in the ${theme.name} theme`, async ({ page }) => {
    await openGallery(page, VIEWPORTS[1], theme);
    const badges = page.locator('#task-row, #task-list').locator('.status-button > .task-row__count');
    const count = await badges.count();
    expect(count).toBeGreaterThanOrEqual(3);
    const grounds = new Map();
    for (let index = 0; index < count; index++) {
      const badge = badges.nth(index);
      const status = await badge.evaluate((element) => element.closest('.status-button').dataset.status);
      const { ratio, size, color } = await contrastOf(badge, 'self');
      expect(ratio, status).toBeGreaterThanOrEqual(4.5);
      expect(size, status).toBeGreaterThanOrEqual(10);
      expect(await badge.getAttribute('aria-hidden'), status).toBe('true');
      const [r, g, b] = color.match(/\d+/g).map(Number);
      expect(r + g + b, `${status} text is dark`).toBeLessThan(200);
      grounds.set(status, await badge.evaluate((element) => getComputedStyle(element).backgroundColor));
    }
    expect(grounds.size, 'specimens cover several statuses').toBeGreaterThanOrEqual(3);
    expect(new Set(grounds.values()).size, 'each status has its own tint').toBe(grounds.size);
  });
}

test('a read-only row keeps its disabled status button flat on hover, and a selected row shows press feedback', async ({ page }) => {
  await openGallery(page, VIEWPORTS[1], THEMES[0]);
  const readonly = page.locator('#task-row .task-row[data-readonly="true"]');
  await readonly.locator('.status-button').hover();
  expect(await readonly.locator('.status-button').evaluate((button) => getComputedStyle(button).backgroundColor)).toBe('rgba(0, 0, 0, 0)');

  const selected = page.locator('#task-row .task-row:has(.task-row__open[aria-current="page"])').first();
  const edge = await selected.evaluate((row) => {
    const after = getComputedStyle(row, '::after');
    return { shadow: getComputedStyle(row).boxShadow, content: after.content, start: after.insetInlineStart };
  });
  expect(edge).toEqual({ shadow: 'none', content: '""', start: '0px' });
  const ground = () => selected.evaluate((row) => getComputedStyle(row).backgroundColor);
  const resting = await ground();
  await selected.locator('.task-row__open').hover();
  const hovered = await ground();
  await page.mouse.down();
  const pressed = await ground();
  await page.mouse.up();
  expect(hovered).not.toBe(resting);
  expect(pressed).not.toBe(hovered);
});

test('the task list pattern shows only open rows under the Status: open of its info line', async ({ page }) => {
  await openGallery(page, VIEWPORTS[1], THEMES[0]);
  await expect(page.locator('#task-list .info-line__text')).toContainText('Status: open');
  const statuses = await page.locator('#task-list .task-row').evaluateAll((rows) => rows.map((row) => row.dataset.status));
  expect(statuses.filter((status) => !['ready', 'in-progress'].includes(status))).toEqual([]);
});

for (const theme of THEMES) {
  test(`status icons take the status colors, and To do keeps the muted text color, in the ${theme.name} theme`, async ({ page }) => {
    await openGallery(page, VIEWPORTS[1], theme);
    await page.addStyleTag({ content: '*, *::before, *::after { transition: none !important; }' });
    const expected = {
      ready: await tokenColor(page, '--color-text-muted'),
      'in-progress': await tokenColor(page, '--color-status-in-progress'),
      completed: await tokenColor(page, '--color-status-completed'),
      cancelled: await tokenColor(page, '--color-status-cancelled'),
    };
    expect(new Set(Object.values(expected)).size).toBe(4);

    const colors = await page.evaluate(() => {
      const read = (selector) => [...document.querySelectorAll(selector)].map((element) => ({
        status: element.dataset.status,
        color: getComputedStyle(element.querySelector('.icon:not(.menu__check)')).color,
      }));
      return {
        buttons: read('#status-button .status-button[data-status]:not(:disabled):not(.is-hover):not(.is-active):not(.is-focus)'),
        rows: read('#task-list .status-button[data-status]'),
      };
    });
    // The row status menu is gone; the task editor's state buttons hold the other status actions.
    await expect(page.locator('.status-menu')).toHaveCount(0);
    for (const group of Object.values(colors)) {
      expect(group.length).toBeGreaterThanOrEqual(4);
      for (const { status, color } of group) {
        expect(color, status).toBe(expected[status]);
      }
    }
  });

  test(`status icon colors survive hover in the ${theme.name} theme`, async ({ page }) => {
    await openGallery(page, VIEWPORTS[1], theme);
    const color = await tokenColor(page, '--color-status-in-progress');
    const hovered = await page.locator('#status-button .status-button.is-hover').evaluate((element) => getComputedStyle(element).color);
    expect(hovered).toBe(color);
  });
}
