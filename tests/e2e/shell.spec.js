import { expect, test } from '@playwright/test';

const COMPACT = { width: 390, height: 844 };
const WIDE = { width: 1440, height: 900 };

/**
 * Collect console errors, page errors, failed requests, and HTTP errors of a page.
 * @param {import('@playwright/test').Page} page the page to watch
 * @returns {string[]} the problems, filled as they happen
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
 * Wait until the shell has rendered its first route.
 * @param {import('@playwright/test').Page} page the page
 */
async function ready(page) {
  await expect(page.locator('html[data-shell="ready"]')).toHaveCount(1);
}

/**
 * Create a list through a second store connection that broadcasts the change to the app.
 * @param {import('@playwright/test').Page} page a page of the app
 * @param {string} name the list name
 * @returns {Promise<string>} the list identifier
 */
function createList(page, name) {
  return page.evaluate(async (listName) => {
    const { openStore } = await import('/js/store/db.js');
    const store = await openStore({ broadcast: true });
    const list = await store.createList({ name: listName });
    await store.createTask({ description: 'Buy paint' }, { lists: [list.id] });
    store.close();
    return list.id;
  }, name);
}

for (const [viewport, compact] of [[COMPACT, true], [{ width: 1023, height: 800 }, true], [{ width: 1024, height: 800 }, false], [WIDE, false]]) {
  test(`the ${compact ? 'compact' : 'wide'} layout shows at ${viewport.width} px`, async ({ page }) => {
    const problems = watch(page);
    await page.setViewportSize(viewport);
    await page.goto('/');
    await ready(page);
    await expect(page.locator('.app__bottom-nav')).toBeVisible({ visible: compact });
    await expect(page.locator('.app__top-bar .sync-indicator')).toBeVisible({ visible: compact });
    await expect(page.locator('.app__top-bar .app__more')).toBeVisible({ visible: compact });
    await expect(page.locator('.app__sidebar')).toBeVisible({ visible: !compact });
    await expect(page.locator('.app__sidebar .sync-indicator')).toHaveText(/Local only/);
    await expect(page.locator('[data-editor-slot]')).toBeHidden();
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(scrollWidth).toBeLessThanOrEqual(viewport.width);
    expect(problems).toEqual([]);
  });
}

test('navigation marks the current route, and back and forward move between routes', async ({ page }) => {
  const problems = watch(page);
  await page.setViewportSize(COMPACT);
  await page.goto('/');
  await ready(page);
  const bottom = page.locator('.app__bottom-nav');
  await expect(bottom.getByRole('link', { name: 'Tasks' })).toHaveAttribute('aria-current', 'page');
  await bottom.getByRole('link', { name: 'Bin' }).click();
  await expect(page).toHaveURL(/#\/bin$/);
  await expect(page.locator('#main')).toBeFocused();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Recycle bin');
  await expect(bottom.getByRole('link', { name: 'Bin' })).toHaveAttribute('aria-current', 'page');
  await expect(bottom.locator('[aria-current]')).toHaveCount(1);
  await page.goBack();
  await expect(bottom.getByRole('link', { name: 'Tasks' })).toHaveAttribute('aria-current', 'page');
  await page.setViewportSize(WIDE);
  await page.goForward();
  const sidebar = page.locator('.app__sidebar');
  await expect(sidebar.getByRole('link', { name: 'Recycle bin' })).toHaveAttribute('aria-current', 'page');
  await expect(sidebar.locator('[aria-current]')).toHaveCount(1);
  expect(problems).toEqual([]);
});

test('every route renders its title and its view, and the sidebar follows the lists', async ({ page }) => {
  const problems = watch(page);
  await page.setViewportSize(WIDE);
  await page.goto('/');
  await ready(page);
  const sidebar = page.locator('.app__sidebar');
  await expect(sidebar.getByRole('link', { name: /All tasks/ })).toHaveText('All tasks0 open tasks');
  const id = await createList(page, 'Home');
  await expect(sidebar.getByRole('link', { name: /^Home/ })).toHaveText('Home1 open tasks');
  await expect(sidebar.getByRole('link', { name: /All tasks/ })).toHaveText('All tasks1 open tasks');
  const routes = [
    ['#/tasks', 'All tasks', 'tasks'],
    ['#/tasks/0192f1a2-0000-7000-8000-000000000002', 'All tasks', 'tasks'],
    ['#/lists', 'Lists', 'lists'],
    [`#/lists/${id}`, 'Home', 'list'],
    [`#/lists/${id}/tasks/0192f1a2-0000-7000-8000-000000000002`, 'Home', 'list'],
    [`#/lists/${id}/edit`, 'Home', 'list'],
    ['#/lists/new', 'New list', 'lists'],
    ['#/bin', 'Recycle bin', 'bin'],
    ['#/settings', 'Settings', 'settings'],
    ['#/settings/sync-log', 'Sync log', 'sync-log'],
    ['#/connect', 'Connect', 'connect'],
  ];
  for (const [hash, title, view] of routes) {
    await page.evaluate((target) => {
      location.hash = target;
    }, hash);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(title);
    // All tasks fills its view; the other screens' tasks fill theirs later.
    if (view === 'tasks') {
      await expect(page.locator('main [data-view="tasks"] .task-row')).toHaveCount(1);
    }
    else {
      await expect(page.locator(`main [data-view="${view}"]`)).toBeEmpty();
    }
    await expect(page).toHaveTitle(`${title} · ToDo's`);
    if (view === 'list') {
      await expect(sidebar.getByRole('link', { name: /^Home/ })).toHaveAttribute('aria-current', 'page');
    }
  }
  expect(problems).toEqual([]);
});

test('an unknown route or list opens All tasks with a toast naming it', async ({ page }) => {
  const problems = watch(page);
  await page.goto('/#/nope');
  await ready(page);
  await expect(page).toHaveURL(/#\/tasks$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('All tasks');
  await expect(page.locator('.toast')).toContainText('#/nope');
  await page.evaluate(() => {
    location.hash = '#/lists/0192f1a2-0000-7000-8000-00000000ffff';
  });
  await expect(page).toHaveURL(/#\/tasks$/);
  await expect(page.locator('.toast').last()).toContainText('list');
  expect(problems).toEqual([]);
});

test('the n and / shortcuts focus the add bar and search once a view has them', async ({ page }) => {
  const problems = watch(page);
  await page.goto('/#/bin');
  await ready(page);
  await page.keyboard.press('n');
  expect(await page.evaluate(() => document.activeElement === document.body)).toBe(true);
  await page.evaluate(() => {
    const view = document.querySelector('[data-view="bin"]');
    view.insertAdjacentHTML('beforeend', '<input data-shortcut="add" aria-label="Add a task"><input data-shortcut="search" aria-label="Search">');
  });
  await page.keyboard.press('n');
  await expect(page.getByLabel('Add a task')).toBeFocused();
  await page.keyboard.press('/');
  await expect(page.getByLabel('Add a task')).toBeFocused();
  await expect(page.getByLabel('Add a task')).toHaveValue('/');
  await page.getByLabel('Add a task').blur();
  await page.keyboard.press('/');
  await expect(page.getByLabel('Search')).toBeFocused();
  expect(problems).toEqual([]);
});

test('Escape closes an open editor route', async ({ page }) => {
  await page.goto('/#/tasks/0192f1a2-0000-7000-8000-000000000002');
  await ready(page);
  await page.keyboard.press('Escape');
  await expect(page).toHaveURL(/#\/tasks$/);
});

test('the theme follows the system by default and a stored preference pins it', async ({ page }) => {
  await page.goto('/');
  await ready(page);
  expect(await page.evaluate(() => document.documentElement.dataset.theme ?? null)).toBeNull();
  const colors = page.locator('meta[name="theme-color"]');
  await expect(colors.nth(0)).toHaveAttribute('content', '#ffffff');
  await expect(colors.nth(1)).toHaveAttribute('content', '#1a1a1f');
  await page.evaluate(() => localStorage.setItem('todos.theme', 'dark'));
  await page.reload();
  await ready(page);
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  // The browser bar color follows the stored theme too, under either system scheme.
  await expect(colors.nth(0)).toHaveAttribute('content', '#1a1a1f');
  await expect(colors.nth(1)).toHaveAttribute('content', '#1a1a1f');
});

test('a newer app version in another tab shows a lasting banner with Reload', async ({ page }) => {
  const problems = watch(page);
  await page.goto('/');
  await ready(page);
  await page.evaluate(() => new Promise((resolve, reject) => {
    const request = indexedDB.open('todos', 99);
    request.onsuccess = () => {
      request.result.close();
      resolve();
    };
    request.onerror = () => reject(request.error);
  }));
  const banner = page.locator('.app__banners .banner');
  await expect(banner).toContainText('updated in another tab');
  await expect(banner.getByRole('button', { name: 'Reload' })).toBeVisible();
  await expect(page.locator('.toast')).toHaveCount(0);
  await page.evaluate(() => {
    location.hash = '#/bin';
  });
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Recycle bin');
  await expect(banner).toBeVisible();
  expect(problems).toEqual([]);
});

test('a start-up failure shows an error banner instead of a broken page', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.addInitScript(() => {
    Object.defineProperty(History.prototype, 'scrollRestoration', {
      get: () => 'auto',
      set: () => {
        throw new Error('Start-up test failure');
      },
    });
  });
  await page.goto('/');
  await expect(page.getByRole('alert')).toContainText("ToDo's could not start. Reload to try again.");
  expect(errors).toEqual([]);
});
