import { expect, test } from '@playwright/test';

const COMPACT = { width: 390, height: 844 };
const WIDE = { width: 1440, height: 900 };

test('list creation stays in the main Lists view', async ({ page }) => {
  const problems = watch(page);
  await page.setViewportSize(WIDE);
  await page.goto('/#/lists');
  await ready(page);
  await expect(page.locator('.app__sidebar').getByRole('link', { name: 'New list' })).toHaveCount(0);
  await expect(page.locator('.app__sidebar .nav-item__label')).toHaveText(['All tasks', 'Lists']);
  const link = page.locator('.app__overlays').getByRole('link', { name: 'New list', exact: true });
  await expect(link).toBeVisible();
  await link.focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#\/lists\/new$/);
  await expect(page.getByRole('textbox', { name: 'Name', exact: true })).toBeFocused();
  expect(problems).toEqual([]);
});

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
    await expect(page.locator('.app__top-bar .sync-indicator')).toBeVisible();
    await expect(page.locator('.app__top-bar .account-menu__button')).toBeVisible();
    await expect(page.locator('.app__more')).toHaveCount(0);
    await expect(page.locator('.app__sidebar')).toBeVisible({ visible: !compact });
    await expect(page.locator('.app__sidebar, .app__bottom-nav').getByRole('link', { name: /Recycle bin|Bin|Settings/ })).toHaveCount(0);
    // The user button ends the top bar, at the right edge of the main column.
    const bar = await page.locator('.app__top-bar').boundingBox();
    const button = await page.locator('.app__top-bar .account-menu__button').boundingBox();
    expect(bar.x + bar.width - (button.x + button.width)).toBeLessThanOrEqual(16);
    expect(button.y).toBeLessThan(bar.y + bar.height);
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
  await expect(bottom.getByRole('link')).toHaveCount(2);
  await page.getByRole('button', { name: 'Local User' }).click();
  const panel = page.locator('.account-menu__panel');
  await panel.getByRole('menuitem', { name: 'Recycle bin' }).click();
  await expect(page).toHaveURL(/#\/bin$/);
  await expect(panel).toBeHidden();
  await expect(page.locator('#main')).toBeFocused();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Recycle bin');
  await expect(bottom.locator('[aria-current]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Local User' }).click();
  await expect(panel.getByRole('menuitem', { name: 'Recycle bin' })).toHaveAttribute('aria-current', 'page');
  await expect(panel.locator('[aria-current]')).toHaveCount(1);
  await page.keyboard.press('Escape');
  await page.goBack();
  await expect(bottom.getByRole('link', { name: 'Tasks' })).toHaveAttribute('aria-current', 'page');
  await page.setViewportSize(WIDE);
  await page.goForward();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Recycle bin');
  await expect(page.locator('.app__sidebar [aria-current]')).toHaveCount(0);
  expect(problems).toEqual([]);
});

for (const [name, viewport] of [['compact', COMPACT], ['wide', WIDE]]) {
  test(`the ${name} user button names Local User and opens Recycle bin and Settings`, async ({ page }) => {
    const problems = watch(page);
    await page.setViewportSize(viewport);
    await page.goto('/');
    await ready(page);
    const button = page.locator('.app__top-bar .account-menu__button');
    await expect(button).toHaveAttribute('title', 'Local User');
    await expect(page.locator('[data-session-banner] .banner')).toHaveCount(0);
    const panel = page.locator('.account-menu__panel');
    await expect(panel).toBeHidden();
    await button.click();
    await expect(panel).toBeVisible();
    await expect(panel).toContainText('Local User');
    await expect(panel).toContainText('Local only');
    // The panel hangs under the button, its end edge lined up with the button's.
    const box = await panel.boundingBox();
    const trigger = await button.boundingBox();
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
    expect(Math.abs(box.x + box.width - (trigger.x + trigger.width))).toBeLessThanOrEqual(1);
    expect(Math.abs(box.y - (trigger.y + trigger.height))).toBeLessThanOrEqual(8);
    await panel.getByRole('menuitem', { name: 'Settings' }).click();
    await expect(page).toHaveURL(/#\/settings$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Settings');
    await expect(panel).toBeHidden();
    // The account menu is a menu: Enter opens it at the first item, and the arrow keys move between items.
    await button.focus();
    await page.keyboard.press('Enter');
    await expect(panel.getByRole('menuitem', { name: 'Local only' })).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await expect(panel.getByRole('menuitem', { name: 'Recycle bin' })).toBeFocused();
    await expect(panel.getByRole('menuitem', { name: 'Settings' })).toHaveAttribute('aria-current', 'page');
    await page.keyboard.press('Escape');
    await expect(panel).toBeHidden();
    await expect(button).toBeFocused();
    expect(problems).toEqual([]);
  });
}

test('the bottom bar spreads its two destinations over the full width', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await page.goto('/');
  await ready(page);
  const boxes = await page.locator('.app__bottom-nav .bottom-nav__item').evaluateAll((items) => items.map((item) => {
    const box = item.getBoundingClientRect();
    return { left: box.left, right: box.right };
  }));
  expect(boxes).toHaveLength(2);
  expect(boxes[0].left).toBeLessThanOrEqual(1);
  expect(boxes[1].right).toBeGreaterThanOrEqual(319);
  expect(Math.abs((boxes[0].right - boxes[0].left) - (boxes[1].right - boxes[1].left))).toBeLessThanOrEqual(1);
});

for (const [name, viewport] of [['narrow', { width: 320, height: 700 }], ['desktop', { width: 1280, height: 800 }]]) {
  test(`the ${name} panel stays aligned with the button for a long name`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.addInitScript(() => localStorage.setItem('todos.session', JSON.stringify({
      token: 'session-1', expiry: '2099-01-01T00:00:00Z', name: 'Jane Doe Verylongnamehere Smithsonian-Montgomery',
      email: 'jane.doe.with.a.very.long.address@example.com', server: 'http://127.0.0.1:1',
    })));
    await page.goto('/');
    await ready(page);
    const button = page.locator('.app__top-bar .account-menu__button');
    await button.click();
    const box = await page.locator('.account-menu__panel').boundingBox();
    const trigger = await button.boundingBox();
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(viewport.width - 3);
    expect(box.width).toBeLessThanOrEqual(400);
    expect(Math.abs(box.x + box.width - (trigger.x + trigger.width))).toBeLessThanOrEqual(1);
  });
}

test('a connected account shows its initials and name, and Connected in the panel', async ({ page }) => {
  const problems = watch(page);
  await page.route('http://127.0.0.1:1/api/notifications', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
  await page.route('http://127.0.0.1:1/api/users/me', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: '{"id":7}' }));
  await page.route('http://127.0.0.1:1/api/changes?**', (route) => route.fulfill({
    status: 200, contentType: 'application/json', body: JSON.stringify({ cursor: 'c1', 'has-more': false, lists: [], tasks: [], memberships: [], notes: [], tombstones: [], protocol: 1 }),
  }));
  await page.addInitScript(() => localStorage.setItem('todos.session', JSON.stringify({
    token: 'session-1', expiry: '2099-01-01T00:00:00Z', name: 'Jane Doe', email: 'jane@example.com', server: 'http://127.0.0.1:1',
  })));
  await page.goto('/');
  await ready(page);
  const button = page.getByRole('button', { name: 'Jane Doe' });
  await expect(button).toHaveText('JD');
  await expect(button).toHaveAttribute('title', 'Jane Doe');
  await expect(page.locator('[data-session-banner] .banner')).toHaveCount(0);
  await button.click();
  await expect(page.locator('.account-menu__panel')).toContainText('Jane Doe');
  await expect(page.locator('.account-menu__panel')).toContainText('Connected');
  await expect(page.locator('.account-menu__panel').getByRole('menuitem')).toHaveText(['Connected', 'Recycle bin', 'Settings']);
  expect(problems).toEqual([]);
});

test('an expired session shows a banner with Sign in that opens the connect screen', async ({ page }) => {
  const problems = watch(page);
  await page.addInitScript(() => localStorage.setItem('todos.session', JSON.stringify({
    token: 'session-1', expiry: '2000-01-01T00:00:00Z', name: 'Jane Doe', email: 'jane@example.com', server: 'http://127.0.0.1:1',
  })));
  await page.goto('/');
  await ready(page);
  await page.locator('[data-session-banner]').getByRole('link', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/#\/connect$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Connect');
  await page.getByRole('button', { name: 'Jane Doe' }).click();
  await expect(page.locator('.account-menu__panel')).toContainText('Sign in needed');
  await expect(page.locator('.account-menu__panel').getByRole('menuitem')).toHaveText(['Sign in needed', 'Recycle bin', 'Settings']);
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
    // Every route fills its view.
    if (view === 'lists') {
      await expect(page.locator('main [data-view="lists"] .list-row')).toHaveCount(1);
    }
    else if (view === 'tasks' || view === 'list') {
      await expect(page.locator(`main [data-view="${view}"] .task-row`)).toHaveCount(1);
    }
    else {
      await expect(page.locator(`main [data-view="${view}"] > .${view}`)).toHaveCount(1);
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
  await page.evaluate(() => localStorage.setItem('todos.theme', JSON.stringify('dark')));
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
  await expect(page.locator('.banner[role="alert"]')).toContainText("ToDo's could not start. Reload to try again.");
  expect(errors).toEqual([]);
});

for (const [viewport, compact] of [[COMPACT, true], [WIDE, false]]) {
  test(`the ${compact ? 'compact' : 'wide'} layout places the add bar, editor, and floating button in shell areas`, async ({ page }) => {
    const problems = watch(page);
    await page.setViewportSize(viewport);
    await page.goto('/');
    await ready(page);
    const listId = await createList(page, 'Home');
    await page.goto(`/#/lists/${listId}`);
    const actionBar = page.locator('.app > .app__action-bar');
    await expect(actionBar.locator('.add-block').getByRole('textbox', { name: 'Search or add a task' })).toBeVisible();
    // The action bar ends the main column, under the rows and above the bottom bar when compact.
    const bar = await actionBar.boundingBox();
    const main = await page.locator('.app__main').boundingBox();
    expect(Math.abs(main.y + main.height - bar.y)).toBeLessThanOrEqual(1);
    if (compact) {
      const nav = await page.locator('.app__bottom-nav').boundingBox();
      expect(Math.abs(bar.y + bar.height - nav.y)).toBeLessThanOrEqual(1);
    }
    else {
      expect(Math.abs(bar.y + bar.height - viewport.height)).toBeLessThanOrEqual(1);
    }
    await page.getByRole('link', { name: 'Buy paint' }).click();
    const panel = page.locator('.app > aside.app__side-panel');
    await expect(panel.locator('.editor-panel')).toBeVisible();
    const box = await panel.boundingBox();
    if (compact) {
      expect(box).toEqual({ x: 0, y: 0, width: viewport.width, height: viewport.height });
    }
    else {
      expect(box.x + box.width).toBeCloseTo(viewport.width, 0);
      expect(box.width).toBeCloseTo(400, 0);
    }
    await page.goto('/#/lists');
    await expect(page.locator('.app > .app__action-bar')).toHaveCount(0);
    await expect(page.locator('.app > .app__overlays > .fab')).toBeVisible();
    await expect(page.locator('.app > .app__overlays > .toast-region')).toHaveCount(1);
    await page.goto('/#/tasks');
    await expect(page.locator('.app > .app__overlays > .fab')).toHaveCount(0);
    expect(problems).toEqual([]);
  });
}
