/**
 * Captures screenshots of every screen and key workflow states for review.
 * Runs only when SCREENSHOTS=1 (see .github/workflows/screenshots.yml).
 * Requires seeded base + demo data and an admin (E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD).
 */
import { mkdirSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';

const OUT = 'screens';
mkdirSync(OUT, { recursive: true });

test.skip(process.env.SCREENSHOTS !== '1', 'Set SCREENSHOTS=1 to capture screens');
test.describe.configure({ mode: 'serial' });

let n = 0;
async function shot(page: Page, project: string, name: string, fullPage = true) {
  n += 1;
  await page.waitForLoadState('networkidle').catch(() => undefined);
  await page.waitForTimeout(400);
  await page.screenshot({
    path: `${OUT}/${project}-${String(n).padStart(2, '0')}-${name}.png`,
    fullPage,
  });
}

test('public screens and visitor workflow', async ({ page }, info) => {
  const p = info.project.name;
  test.setTimeout(240_000);

  await page.goto('/');
  await shot(page, p, 'home');

  await page.goto('/residential');
  await shot(page, p, 'residential');

  await page.goto('/commercial');
  await shot(page, p, 'commercial');

  await page.goto('/properties?category=residential&city=jaipur&minRent=10000&maxRent=30000');
  await shot(page, p, 'search-results-filtered');

  if (p === 'mobile') {
    await page.getByRole('button', { name: /Filters/ }).click();
    await shot(page, p, 'search-filters-open', false);
  }

  await page.goto('/properties?category=commercial&maxRent=1000');
  await shot(page, p, 'search-no-results');

  await page.goto('/properties?category=residential');
  await page.getByRole('link', { name: '2 BHK semi-furnished apartment' }).first().click();
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await shot(page, p, 'property-detail');

  // Enquiry workflow: validation → success
  await page.getByRole('button', { name: 'Send enquiry' }).click();
  await page.locator('aside').first().scrollIntoViewIfNeeded();
  await shot(page, p, 'enquiry-validation', false);
  await page.waitForTimeout(2500);
  await page.getByLabel('Name', { exact: true }).fill('Rohit Sharma');
  await page.getByLabel('Mobile number', { exact: true }).fill('9829012345');
  await page
    .getByLabel('Message', { exact: true })
    .fill('Is this available from next month? I would like to visit on Sunday.');
  await page.getByRole('checkbox', { name: /agree to be contacted/ }).check();
  await page.getByRole('button', { name: 'Send enquiry' }).click();
  await expect(page.getByText('Enquiry received')).toBeVisible();
  await page.getByText('Enquiry received').scrollIntoViewIfNeeded();
  await shot(page, p, 'enquiry-success', false);

  await page.goto('/rentals');
  await shot(page, p, 'locations');
  await page.goto('/rentals/jaipur');
  await shot(page, p, 'city-jaipur');
  await page.goto('/rentals/jaipur/vaishali-nagar');
  await shot(page, p, 'locality-vaishali-nagar');

  await page.goto('/list-your-property');
  await shot(page, p, 'list-your-property');
  if (p === 'desktop') {
    await page.waitForTimeout(2500);
    await page.getByLabel('Full name', { exact: true }).fill('Meena Agarwal');
    await page.getByLabel('Mobile number', { exact: true }).fill('9829098765');
    await page.getByLabel('Locality', { exact: true }).fill('Raja Park');
    await page.getByLabel('Expected monthly rent (₹)', { exact: true }).fill('22000');
    await page.getByRole('checkbox', { name: /agree to be contacted/ }).check();
    await page.getByRole('button', { name: 'Submit property details' }).click();
    await expect(page.getByText(/we have your details/)).toBeVisible();
    await shot(page, p, 'list-your-property-success', false);
  }

  await page.goto('/contact');
  await shot(page, p, 'contact');
  await page.goto('/faq');
  await shot(page, p, 'faq');
  await page.goto('/about');
  await shot(page, p, 'about');
  await page.goto('/privacy-policy');
  await shot(page, p, 'privacy-policy');
  await page.goto('/properties/this-does-not-exist');
  await shot(page, p, 'not-found');

  if (p === 'mobile') {
    await page.goto('/');
    await page.getByRole('button', { name: 'Open menu' }).click();
    await shot(page, p, 'mobile-menu', false);
  }
});

test('admin screens and workflow', async ({ page }, info) => {
  const p = info.project.name;
  test.setTimeout(240_000);

  await page.goto('/admin/login');
  await shot(page, p, 'admin-login', false);
  await page.getByLabel('Email', { exact: true }).fill(process.env.E2E_ADMIN_EMAIL!);
  await page.getByLabel('Password', { exact: true }).fill(process.env.E2E_ADMIN_PASSWORD!);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByText('Total properties')).toBeVisible();
  await shot(page, p, 'admin-dashboard');

  await page.goto('/admin/properties');
  await expect(page.getByRole('table')).toBeVisible();
  await shot(page, p, 'admin-properties');

  await page.getByRole('link', { name: '2 BHK semi-furnished apartment' }).first().click();
  await expect(page.getByRole('heading', { name: 'Edit property' })).toBeVisible();
  await shot(page, p, 'admin-property-editor');

  await page.goto('/admin/properties/new');
  await page.getByRole('button', { name: 'Save & publish' }).click();
  await shot(page, p, 'admin-new-property-validation', false);

  await page.goto('/admin/enquiries');
  await expect(page.getByRole('table')).toBeVisible();
  await shot(page, p, 'admin-enquiries');
  const lead = page.getByRole('button', { name: /^NX-E-/ }).first();
  if (await lead.count()) {
    await lead.click();
    await expect(page.getByRole('dialog', { name: 'Enquiry details' })).toBeVisible();
    await page
      .getByLabel('Add private note')
      .fill('Called the customer, visit fixed for Sunday 11 am.');
    await page.getByRole('button', { name: 'Add note' }).click();
    await page.getByLabel('Status', { exact: true }).last().selectOption('contacted');
    await page.waitForTimeout(800);
    await shot(page, p, 'admin-enquiry-detail', false);
    await page.getByRole('button', { name: 'Close' }).click();
  }

  await page.goto('/admin/submissions');
  await shot(page, p, 'admin-owner-submissions');
  await page.goto('/admin/locations');
  await shot(page, p, 'admin-locations');
  await page.goto('/admin/faqs');
  await shot(page, p, 'admin-faqs');
  await page.goto('/admin/settings');
  await shot(page, p, 'admin-settings');
});
