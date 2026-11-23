import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { ADMIN_PATH } from '@nexus/shared';

const email = process.env.E2E_ADMIN_EMAIL;
const password = process.env.E2E_ADMIN_PASSWORD;
const png = Buffer.from(
  readFileSync(new URL('./fixtures/room.png.b64', import.meta.url), 'utf8').trim(),
  'base64',
);

async function adminLogin(page: Page) {
  await page.goto(`${ADMIN_PATH}/login`);
  await page.getByLabel('Email', { exact: true }).fill(email!);
  await page.getByLabel('Password', { exact: true }).fill(password!);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(new RegExp(`${ADMIN_PATH}$`));
}

async function uploadPhoto(page: Page) {
  await page
    .getByLabel('Add photos', { exact: true })
    .setInputFiles({ name: 'room.png', mimeType: 'image/png', buffer: png });
  await page.getByRole('button', { name: /Upload 1 photo/ }).click();
  await expect(page.getByText(/1 photo\(s\) uploaded/)).toBeVisible();
}

async function typeOtp(page: Page) {
  // The API shows the code in development, except while its launch-test OTP
  // (a fixed 123456 for every number) is on: then nothing is shown.
  const dev = page.locator('p:has-text("Development mode") strong').first();
  const code = (await dev.isVisible().catch(() => false))
    ? (await dev.textContent())!.trim()
    : '123456';
  await page.getByLabel('Digit 1').click();
  await page.keyboard.type(code);
}

test.describe('journeys', () => {
  test.skip(!email || !password, 'Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD');
  test.describe.configure({ mode: 'serial' });
  // Each journey waits for public caches to refresh, so allow more than the default.
  test.setTimeout(180_000);

  const cases = [
    {
      deal: 'rent',
      kind: 'residential',
      price: '21000',
      url: '/rent/jaipur/vaishali-nagar?maxPrice=25000',
    },
    {
      deal: 'sale',
      kind: 'commercial',
      price: '8500000',
      url: '/commercial?listingType=sale&city=jaipur&locality=vaishali-nagar',
    },
  ] as const;

  for (const c of cases) {
    test(`staff ${c.kind} ${c.deal}: publish, visitor finds and enquires, lead updated`, async ({
      page,
    }) => {
      const stamp = Date.now();
      const title = `E2E ${c.kind} ${c.deal} listing ${stamp}`;
      await adminLogin(page);

      await page.goto(`${ADMIN_PATH}/properties/new`);
      if (c.deal === 'rent') await page.getByText('Rent out', { exact: true }).click();
      if (c.kind === 'commercial')
        await page.getByText('Commercial', { exact: true }).first().click();
      await page.getByLabel('City', { exact: true }).selectOption('jaipur');
      await page.getByLabel('Locality', { exact: true }).selectOption('vaishali-nagar');
      await page
        .getByLabel(c.deal === 'rent' ? 'Monthly rent (₹)' : 'Asking price (₹)', { exact: true })
        .fill(c.price);
      await page.getByLabel('Area', { exact: true }).fill('900');
      if (c.kind === 'residential') {
        await page.getByLabel(/^Bedrooms/).fill('2');
        await page.getByLabel(/^Bathrooms/).fill('2');
      }
      await uploadPhoto(page);
      await page.getByLabel('Listing title', { exact: true }).fill(title);
      await page
        .getByLabel('Description', { exact: true })
        .fill(
          'Automated end-to-end test listing. Bright, well-ventilated and close to the main road.',
        );
      await page.getByRole('button', { name: 'Save & publish' }).click();
      await expect(page.getByText('Saved and published')).toBeVisible();
      await expect(page).toHaveURL(new RegExp(`${ADMIN_PATH}/properties/[a-f0-9]{24}`));

      await expect(async () => {
        await page.goto(c.url);
        await expect(page.getByRole('link', { name: title })).toBeVisible({ timeout: 2000 });
      }).toPass({ timeout: 90_000 });

      await page.getByRole('link', { name: title }).click();
      await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible();

      await page.waitForTimeout(3000); // anti-bot timer, like a real visitor
      await page.getByLabel('Name', { exact: true }).fill('E2E Visitor');
      await page.getByLabel('Mobile number', { exact: true }).fill('9829055555');
      await page.getByLabel('Message', { exact: true }).fill(`Interested — ${stamp}`);
      await page.getByRole('checkbox', { name: /agree to be contacted/ }).check();
      await page.getByRole('button', { name: 'Send enquiry' }).click();
      await expect(page.getByText('Enquiry received')).toBeVisible();
      const ref = await page.getByText(/NX-E-\d{4}-\d{5}/).textContent();

      await page.goto(`${ADMIN_PATH}/enquiries`);
      await page.getByPlaceholder(/Name, phone/).fill(ref!.trim());
      await page.getByRole('button', { name: 'Search' }).click();
      await page.getByRole('button', { name: ref!.trim() }).click();
      // Act inside the lead drawer once it has loaded (the list also has a Status filter).
      const drawer = page.getByRole('dialog', { name: 'Enquiry details' });
      await expect(drawer.getByRole('heading', { name: ref!.trim() })).toBeVisible();
      await drawer.getByLabel('Status', { exact: true }).selectOption('contacted');
      await expect(page.getByText('Marked contacted')).toBeVisible();
    });
  }

  test('owner signs up, posts a rental, staff approves, it goes live', async ({ page }) => {
    const stamp = Date.now();
    const title = `E2E owner rental ${stamp}`;
    const phone = `98${String(stamp).slice(-8)}`;

    // Sign up as an owner, straight into the posting form.
    await page.goto(
      `/signup?role=individual&next=${encodeURIComponent('/dashboard/listings/new')}`,
    );
    await page.getByLabel('Full name', { exact: true }).fill('E2E Owner');
    await page.getByLabel('Email', { exact: true }).fill(`owner${stamp}@example.com`);
    await page.getByLabel('Mobile number', { exact: true }).fill(phone);
    await page.getByLabel('Create password', { exact: true }).fill(`Owner${stamp}pass`);
    await page.getByRole('checkbox', { name: /I agree/ }).check();
    await page.getByRole('button', { name: 'Create account' }).click();
    await expect(page.getByRole('heading', { name: 'Verify your mobile' })).toBeVisible();
    await typeOtp(page);
    await page.getByRole('button', { name: 'Verify and continue' }).click();
    await expect(page).toHaveURL(/\/dashboard\/listings\/new/);

    // Posting wizard
    await page.getByText('Rent out', { exact: true }).click();
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByLabel('Locality', { exact: true }).selectOption('malviya-nagar');
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByLabel('Monthly rent (₹)', { exact: true }).fill('18000');
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByLabel('Area', { exact: true }).fill('1100');
    await page.getByLabel(/^Bedrooms/).fill('2');
    await page.getByLabel(/^Bathrooms/).fill('2');
    await page.getByRole('button', { name: 'Continue' }).click();
    await uploadPhoto(page);
    await page.getByLabel('Listing title', { exact: true }).fill(title);
    await page
      .getByLabel('Description', { exact: true })
      .fill(
        'Two-bedroom flat on the second floor with good light, covered parking and a park nearby.',
      );
    await page.getByRole('button', { name: 'Continue' }).click();
    await expect(page.getByRole('heading', { name: 'Review and submit' })).toBeVisible();
    await page.getByRole('button', { name: 'Submit for review' }).click();
    // Owners have no free listings: the listing is saved and the plan page opens.
    await expect(page).toHaveURL(/\/dashboard\/plans\?saved=/);
    await expect(page.getByText('Your listing is saved')).toBeVisible();
    const me = (await (await page.request.get('/api/v1/me')).json()).data.user;

    // Not public until approved
    const before = await page.request.get(`/api/v1/properties?q=${stamp}`);
    expect((await before.json()).data).toHaveLength(0);

    // Staff records the owner's plan payment, which sends the listing for review
    await adminLogin(page);
    const plans = (await (await page.request.get('/api/v1/admin/plans')).json()).data;
    const csrf = (await page.context().cookies()).find((c) => c.name === 'nexus_csrf')!.value;
    const paid = await page.request.post('/api/v1/admin/payments/manual', {
      headers: { 'X-CSRF-Token': csrf },
      data: { userId: me.id, planId: plans[0].id, amount: plans[0].price, reference: 'e2e' },
    });
    expect(paid.ok()).toBeTruthy();

    // Staff approves from the review queue
    await page.goto(`${ADMIN_PATH}/review`);
    const item = page.locator('li', { hasText: title });
    await item.getByRole('button', { name: 'Approve & publish' }).click();
    await expect(page.getByText('Approved and published')).toBeVisible();

    // Live on the locality page, marked as posted by an owner
    await expect(async () => {
      await page.goto('/rent/jaipur/malviya-nagar');
      await expect(page.getByRole('link', { name: title })).toBeVisible({ timeout: 2000 });
    }).toPass({ timeout: 90_000 });
    await page.getByRole('link', { name: title }).click();
    await expect(
      page
        .getByRole('complementary', { name: 'Contact about this property' })
        .getByText('Posted by owner'),
    ).toBeVisible();
  });
});
