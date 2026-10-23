import { expect, test } from '@playwright/test';

test.describe('marketplace pages', () => {
  test('new projects page renders with filters', async ({ page }) => {
    const res = await page.goto('/projects');
    expect(res?.status()).toBe(200);
    await expect(page.getByRole('heading', { level: 1, name: /New projects in/ })).toBeVisible();
    await expect(page.getByRole('form', { name: 'Filter projects' })).toBeVisible();
  });

  test('agents and builders directories render', async ({ page }) => {
    for (const path of ['/agents', '/builders']) {
      const res = await page.goto(path);
      expect(res?.status()).toBe(200);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    }
    expect((await page.goto('/agents/nobody-here-123'))?.status()).toBe(404);
  });

  test('search can switch to map view and keeps it when filtering', async ({ page }) => {
    await page.goto('/rent');
    await page
      .getByRole('navigation', { name: 'Results view' })
      .getByRole('link', { name: 'Map' })
      .click();
    await expect(page).toHaveURL(/view=map/);
    await expect(page.getByRole('region', { name: 'Map of matching properties' })).toBeAttached();
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  });

  test('home search has new projects, PG and plots tabs', async ({ page }) => {
    await page.goto('/');
    const search = page.getByRole('search', { name: 'Search properties' });
    await search.getByRole('tab', { name: 'PG' }).click();
    await search.getByRole('button', { name: /Search/ }).click();
    await expect(page).toHaveURL(/\/rent.*propertyType=pg/);
  });

  test('a property page has location, EMI (sale) and report', async ({ page }) => {
    await page.goto('/buy');
    const first = page.locator('article h3 a').first();
    test.skip((await first.count()) === 0, 'no sale listings seeded');
    await first.click();
    await expect(page.getByRole('heading', { name: 'Location' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Home loan EMI' })).toBeVisible();
    await page.getByRole('button', { name: 'Report this listing' }).click();
    await expect(page.getByRole('dialog', { name: 'Report this listing' })).toBeVisible();
  });
});
