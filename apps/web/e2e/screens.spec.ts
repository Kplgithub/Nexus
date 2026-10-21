/**
 * Captures screenshots of every screen and key workflow states for review.
 * Runs only when SCREENSHOTS=1 (see .github/workflows/screenshots.yml).
 * Requires seeded base + demo data and an admin (E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD).
 */
import { mkdirSync } from 'node:fs';
import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';

const png = Buffer.from(
  readFileSync(new URL('./fixtures/room.png.b64', import.meta.url), 'utf8').trim(),
  'base64',
);

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

  await page.goto('/buy');
  await shot(page, p, 'buy');
  await page.goto('/rent');
  await shot(page, p, 'rent');
  await page.goto('/commercial');
  await shot(page, p, 'commercial');

  await page.goto('/rent/jaipur?category=residential&minPrice=10000&maxPrice=30000');
  await shot(page, p, 'rent-filtered');

  if (p === 'mobile') {
    await page.getByRole('button', { name: /Filters/ }).click();
    await shot(page, p, 'search-filters-open', false);
    await page.keyboard.press('Escape');
  }

  await page.goto('/buy?maxPrice=1000');
  await shot(page, p, 'search-no-results');

  await page.goto('/buy');
  await page.getByRole('link', { name: '3 BHK apartment in a new gated project' }).first().click();
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await shot(page, p, 'property-detail-sale');

  await page.goto('/rent');
  await page.getByRole('link', { name: '2 BHK semi-furnished apartment' }).first().click();
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await shot(page, p, 'property-detail-rent');

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

  await page.goto('/locations');
  await shot(page, p, 'locations');
  await page.goto('/buy/jaipur/vaishali-nagar');
  await shot(page, p, 'locality-buy');

  await page.goto('/post-property');
  await shot(page, p, 'post-property');
  await page.goto('/login');
  await shot(page, p, 'login', false);
  await page.goto('/signup');
  await shot(page, p, 'signup-account-type', false);

  await page.goto('/contact');
  await shot(page, p, 'contact');
  await page.goto('/faq');
  await shot(page, p, 'faq');
  await page.goto('/about');
  await shot(page, p, 'about');
  await page.goto('/properties/this-does-not-exist');
  await shot(page, p, 'not-found');

  if (p === 'mobile') {
    await page.goto('/');
    await page.getByRole('button', { name: 'Open menu' }).click();
    await shot(page, p, 'mobile-menu', false);
  }
});

test('agent signs up and posts a property', async ({ page }, info) => {
  const p = info.project.name;
  test.setTimeout(240_000);
  const stamp = Date.now();

  await page.goto('/signup');
  await page.getByText('Agent', { exact: true }).first().click();
  await shot(page, p, 'signup-agent-selected', false);
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByLabel('Agency name', { exact: true }).fill('Pink City Realty');
  await page.getByLabel('Contact person', { exact: true }).fill('Arjun Mehta');
  await page.getByLabel('Email', { exact: true }).fill(`agent${stamp}@example.com`);
  await page.getByLabel('Mobile number', { exact: true }).fill(`97${String(stamp).slice(-8)}`);
  await page.getByLabel('Create password', { exact: true }).fill(`Agent${stamp}pass`);
  await page.getByRole('checkbox', { name: /I agree/ }).check();
  await shot(page, p, 'signup-details', false);
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByRole('heading', { name: 'Verify your mobile' })).toBeVisible();
  const code = (await page
    .locator('p:has-text("Development mode") strong')
    .first()
    .textContent())!.trim();
  await page.getByLabel('Digit 1').click();
  await page.keyboard.type(code);
  await shot(page, p, 'signup-verify', false);
  await page.getByRole('button', { name: 'Verify and continue' }).click();
  await expect(page).toHaveURL(/\/dashboard/);
  await shot(page, p, 'dashboard-overview');

  await page.goto('/dashboard/listings/new');
  await shot(page, p, 'post-step-1');
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByLabel('Locality', { exact: true }).selectOption('jagatpura');
  await shot(page, p, 'post-step-2');
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByLabel('Asking price (₹)', { exact: true }).fill('6250000');
  await page.getByLabel('Possession', { exact: true }).selectOption('ready');
  await page.getByLabel('Transaction', { exact: true }).selectOption('resale');
  await shot(page, p, 'post-step-3');
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByLabel('Area', { exact: true }).fill('1450');
  await page.getByLabel(/^Bedrooms/).fill('3');
  await page.getByLabel(/^Bathrooms/).fill('3');
  await page
    .getByRole('button', { name: 'Lift' })
    .click()
    .catch(() => undefined);
  await shot(page, p, 'post-step-4');
  await page.getByRole('button', { name: 'Continue' }).click();
  await page
    .getByLabel('Add photos', { exact: true })
    .setInputFiles({ name: 'room.png', mimeType: 'image/png', buffer: png });
  await page.getByRole('button', { name: /Upload 1 photo/ }).click();
  await expect(page.getByText(/1 photo\(s\) uploaded/)).toBeVisible();
  await page
    .getByLabel('Listing title', { exact: true })
    .fill('3 BHK resale flat near Jagatpura flyover');
  await page
    .getByLabel('Description', { exact: true })
    .fill(
      'Well-kept three-bedroom flat on the fourth floor with two covered parkings, near schools and the flyover.',
    );
  await shot(page, p, 'post-step-5');
  await page.getByRole('button', { name: 'Continue' }).click();
  await shot(page, p, 'post-review');
  await page.getByRole('button', { name: 'Submit for review' }).click();
  await expect(page).toHaveURL(/status=pending/);
  await shot(page, p, 'dashboard-listings-pending');

  await page.goto('/dashboard/profile');
  await shot(page, p, 'dashboard-profile');
  await page.goto('/dashboard/leads');
  await shot(page, p, 'dashboard-leads');
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

  await page.goto('/admin/review');
  await shot(page, p, 'admin-review-queue');
  const reject = page.getByRole('button', { name: 'Reject', exact: true }).first();
  if (await reject.count()) {
    await reject.click();
    await page
      .getByLabel(/What should the poster fix/)
      .first()
      .fill('Please add photos of the kitchen and bathrooms.');
    await shot(page, p, 'admin-review-reject-note', false);
  }

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

  await page.goto('/admin/users');
  await expect(page.getByRole('table')).toBeVisible();
  await shot(page, p, 'admin-users');
  await page.getByRole('table').getByRole('link').first().click();
  await shot(page, p, 'admin-user-detail');
  await page.goto('/admin/locations');
  await shot(page, p, 'admin-locations');
  await page.goto('/admin/faqs');
  await shot(page, p, 'admin-faqs');
  await page.goto('/admin/settings');
  await shot(page, p, 'admin-settings');
});
