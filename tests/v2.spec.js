const { test, expect } = require('@playwright/test');

// Times are island summer time (CEST, UTC+2), valid until 25 October 2026 03:00.
const at = iso => new Date(`${iso}+02:00`);

async function open(page, time = '2026-10-21T13:00:00') {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.clock.setFixedTime(at(time));
  await page.goto('/v2/');
  return errors;
}

const visibleItems = page => page.locator('.menu li:not(.sizes):visible');

test('loads without errors and shows the key content', async ({ page }) => {
  const errors = await open(page);
  await expect(page).toHaveTitle(/Strandbistro 33/);
  await expect(page.locator('h1')).toContainText('Moin');
  await expect(page.locator('#karte')).toBeVisible();
  await expect(page.locator('a[href="tel:+491755695389"]').first()).toBeAttached();
  expect(errors.filter(e => !/fonts\.(googleapis|gstatic)/.test(e))).toEqual([]);
});

test.describe('opening status', () => {
  const cases = [
    ['Wednesday lunchtime', '2026-10-21T13:00:00', 'Jetzt geöffnet · bis 20:00', 'open', '3'],
    ['Wednesday morning', '2026-10-21T09:30:00', 'Heute ab 12:00 geöffnet', 'closed', '3'],
    ['Wednesday evening, Thursday is Ruhetag', '2026-10-21T21:00:00', 'Geschlossen · Freitag ab 12:00', 'closed', '3'],
    ['Thursday', '2026-10-22T14:00:00', 'Ruhetag · morgen ab 12:00', 'closed', '4'],
    ['Sunday 19:59', '2026-10-18T19:59:00', 'Jetzt geöffnet · bis 20:00', 'open', '0'],
    ['Sunday 20:00', '2026-10-18T20:00:00', 'Geschlossen · morgen ab 12:00', 'closed', '0'],
  ];
  for (const [name, time, text, state, day] of cases) {
    test(name, async ({ page }) => {
      await open(page, time);
      const status = page.locator('[data-status]');
      await expect(status).toHaveText(text);
      await expect(status).toHaveClass(new RegExp(`\\b${state}\\b`));
      await expect(page.locator('[data-week] tr.today')).toHaveAttribute('data-day', day);
    });
  }
});

test.describe('menu', () => {
  test('tabs switch between food and drinks', async ({ page }) => {
    await open(page);
    await expect(page.locator('#panel-essen')).toBeVisible();
    await expect(page.locator('#panel-trinken')).toBeHidden();
    await page.getByRole('tab', { name: 'Trinken' }).click();
    await expect(page.locator('#panel-trinken')).toBeVisible();
    await expect(page.locator('#panel-essen')).toBeHidden();
    await expect(page.getByRole('tab', { name: 'Trinken' })).toHaveAttribute('aria-selected', 'true');
    await expect(visibleItems(page)).toHaveCount(35);
  });

  test('tabs work with arrow keys', async ({ page }) => {
    await open(page);
    await page.getByRole('tab', { name: 'Essen' }).focus();
    await page.keyboard.press('ArrowRight');
    await expect(page.getByRole('tab', { name: 'Trinken' })).toBeFocused();
    await expect(page.locator('#panel-trinken')).toBeVisible();
  });

  test('search finds dishes across both tabs and highlights them', async ({ page }) => {
    await open(page);
    const search = page.locator('[data-menu-search]');
    await search.fill('matjes');
    await expect(visibleItems(page)).toHaveCount(3);
    await expect(page.locator('.menu mark')).toHaveCount(3);

    // Section titles are searchable too
    await search.fill('Kaffee');
    await expect(visibleItems(page)).toHaveCount(9);
    await search.fill('Bier vom Fass');
    await expect(visibleItems(page)).toHaveCount(3);

    await search.fill('raucherlachs');
    await expect(visibleItems(page)).toHaveCount(2);

    await search.fill('Grauburgunder');
    await expect(visibleItems(page)).toHaveCount(1);
    await expect(page.locator('#panel-trinken')).toBeVisible();
  });

  test('search shows a message when nothing matches and resets cleanly', async ({ page }) => {
    await open(page);
    const search = page.locator('[data-menu-search]');
    await search.fill('xyzxyz');
    await expect(page.locator('[data-no-results]')).toBeVisible();
    await expect(visibleItems(page)).toHaveCount(0);
    await search.fill('');
    await expect(page.locator('[data-no-results]')).toBeHidden();
    await expect(page.locator('#panel-trinken')).toBeHidden();
    await expect(page.locator('.menu mark')).toHaveCount(0);
  });
});

test('every image loads', async ({ page }) => {
  await open(page);
  const images = page.locator('main img');
  for (const image of await page.locator('main img:visible').all()) {
    await image.scrollIntoViewIfNeeded();
  }
  await page.locator('.strip').evaluate(strip => strip.scrollTo(strip.scrollWidth, 0));
  await page.waitForLoadState('networkidle');
  const broken = await images.evaluateAll(list => list.filter(img => !img.closest('[hidden]') && !(img.complete && img.naturalWidth > 0)).map(img => img.getAttribute('src')));
  // The drinks panel starts hidden, so its photo is checked after opening it.
  await page.getByRole('tab', { name: 'Trinken' }).click();
  await page.locator('#panel-trinken img').scrollIntoViewIfNeeded();
  await expect.poll(() => page.locator('#panel-trinken img').evaluate(img => img.naturalWidth)).toBeGreaterThan(0);
  expect(broken).toEqual([]);
});

test('all in-page links point to existing sections', async ({ page }) => {
  await open(page);
  const targets = await page.locator('a[href^="#"]').evaluateAll(links => links.map(a => a.getAttribute('href')));
  for (const target of new Set(targets)) {
    if (target === '#') continue;
    await expect(page.locator(target), `${target} exists`).toHaveCount(1);
  }
});

test('page does not scroll sideways', async ({ page }) => {
  await open(page);
  const { scroll, client } = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
  expect(scroll).toBeLessThanOrEqual(client);
});

test.describe('mobile navigation', () => {
  test.skip(({ isMobile }) => !isMobile, 'Only on phones');

  test('opens, navigates and closes', async ({ page }) => {
    await open(page);
    const toggle = page.locator('.nav-toggle');
    await expect(page.locator('#nav')).toBeHidden();
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await page.locator('#nav').getByRole('link', { name: 'Speisekarte' }).click();
    await expect(page.locator('#nav')).toBeHidden();
    await expect(page).toHaveURL(/#karte$/);
    await toggle.click();
    await page.keyboard.press('Escape');
    await expect(page.locator('#nav')).toBeHidden();
    await expect(toggle).toBeFocused();
  });
});

test('the original site still loads', async ({ page }) => {
  const response = await page.goto('/');
  expect(response.status()).toBe(200);
  await expect(page.locator('h1')).toContainText('Ein Platz');
});
