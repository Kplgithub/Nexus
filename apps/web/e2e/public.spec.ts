import { expect, test } from '@playwright/test';

test.describe('public site', () => {
  test('home page renders brand, search and metadata', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('img', { name: /NEXUS Estate/ }).first()).toBeVisible();
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByRole('search', { name: 'Search properties' })).toBeVisible();
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      /^https?:\/\/[^/]+\/?$/,
    );
    const ld = await page.locator('script[type="application/ld+json"]').allTextContents();
    expect(ld.join('')).toContain('RealEstateAgent');
    expect(ld.join('')).not.toContain('aggregateRating');
    await expect(page.locator('a[href^="https://wa.me/919521750202"]').first()).toBeAttached();
  });

  test('search filters are reflected in the URL and survive reload', async ({ page }) => {
    await page.goto('/rent?category=residential&minPrice=10000&maxPrice=25000');
    await expect(page).toHaveURL(/minPrice=10000/);
    await expect(page.getByRole('heading', { level: 1, name: /Property for rent/ })).toBeVisible();
    await page.reload();
    await expect(page).toHaveURL(/maxPrice=25000/);
    // Filtered combinations are not indexed.
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  });

  test('invalid filters do not break the page', async ({ page }) => {
    const res = await page.goto('/properties?category=castle&minPrice=abc&page=-1');
    expect(res?.status()).toBe(200);
  });

  test('unknown pages return 404', async ({ page }) => {
    const res = await page.goto('/properties/this-does-not-exist-123');
    expect(res?.status()).toBe(404);
    await expect(page.getByRole('heading', { name: /couldn’t find/ })).toBeVisible();
  });

  test('robots and sitemap', async ({ request }) => {
    const robots = await (await request.get('/robots.txt')).text();
    expect(robots).toContain('Disallow: /admin');
    expect(robots).toContain('Sitemap:');
    const sitemap = await request.get('/sitemap.xml');
    expect(sitemap.status()).toBe(200);
    const xml = await sitemap.text();
    expect(xml).toContain('/buy');
    expect(xml).toContain('/rent');
  });

  test('admin redirects to login and is noindex', async ({ page }) => {
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/admin\/login/);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  });

  test('old rental URLs redirect to the new pages', async ({ page }) => {
    await page.goto('/list-your-property');
    await expect(page).toHaveURL(/\/post-property$/);
    await page.goto('/rentals');
    await expect(page).toHaveURL(/\/locations$/);
  });

  test('dashboard requires sign-in', async ({ page }) => {
    await page.goto('/dashboard/listings');
    await expect(page).toHaveURL(/\/login\?next=%2Fdashboard%2Flistings/);
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
  });

  test('contact form validates before sending', async ({ page }) => {
    await page.goto('/contact');
    await page.getByRole('button', { name: 'Send message' }).click();
    await expect(page.getByText('Please enter your name')).toBeVisible();
    await expect(page.getByText('Please agree to be contacted')).toBeVisible();
  });
});
