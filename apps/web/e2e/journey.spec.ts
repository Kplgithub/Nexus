import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';

const email = process.env.E2E_ADMIN_EMAIL;
const password = process.env.E2E_ADMIN_PASSWORD;
const png = Buffer.from(
  readFileSync(new URL('./fixtures/room.png.b64', import.meta.url), 'utf8').trim(),
  'base64',
);

test.describe('full rental journey', () => {
  test.skip(!email || !password, 'Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD');
  test.describe.configure({ mode: 'serial' });

  for (const kind of ['residential', 'commercial'] as const) {
    test(`${kind}: admin publishes, visitor finds and enquires, admin updates lead`, async ({
      page,
    }) => {
      const stamp = Date.now();
      const title = `E2E ${kind} listing ${stamp}`;

      // 1. Admin logs in
      await page.goto('/admin/login');
      await page.getByLabel('Email', { exact: true }).fill(email!);
      await page.getByLabel('Password', { exact: true }).fill(password!);
      await page.getByRole('button', { name: 'Sign in' }).click();
      await expect(page).toHaveURL(/\/admin$/);

      // 2. Creates a property
      await page.goto('/admin/properties/new');
      await page.getByLabel('Title', { exact: true }).fill(title);
      await page.getByLabel('Category', { exact: true }).selectOption(kind);
      await page
        .getByLabel('Property type', { exact: true })
        .selectOption(kind === 'residential' ? 'apartment' : 'office');
      await page.getByLabel('City', { exact: true }).selectOption('jaipur');
      await page.getByLabel('Locality', { exact: true }).selectOption('vaishali-nagar');
      await page.getByLabel('Monthly rent (₹)', { exact: true }).fill('21000');
      await page.getByLabel('Area', { exact: true }).fill('900');
      if (kind === 'residential') {
        await page.getByLabel(/^Bedrooms/).fill('2');
        await page.getByLabel(/^Bathrooms/).fill('2');
      }
      await page
        .getByLabel('Description', { exact: true })
        .fill(
          'Automated end-to-end test listing. Bright, well-ventilated and close to the main road.',
        );

      // 3. Uploads an image and publishes
      await page
        .getByLabel('Add photos', { exact: true })
        .setInputFiles({ name: 'room.png', mimeType: 'image/png', buffer: png });
      await page.getByRole('button', { name: /Upload 1 photo/ }).click();
      await expect(page.getByText(/1 photo\(s\) uploaded/)).toBeVisible();
      await page.getByRole('button', { name: 'Save & publish' }).click();
      await expect(page.getByText('Saved and published')).toBeVisible();
      await expect(page).toHaveURL(/\/admin\/properties\/[a-f0-9]{24}/);

      // 4–5. Visitor searches (public cache may lag up to REVALIDATE_SECONDS)
      await expect(async () => {
        await page.goto(`/${kind}?city=jaipur&locality=vaishali-nagar&maxRent=25000`);
        await expect(page.getByRole('link', { name: title })).toBeVisible({ timeout: 2000 });
      }).toPass({ timeout: 90_000 });

      // 6. Opens details
      await page.getByRole('link', { name: title }).click();
      await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible();

      // 7. Submits an enquiry
      await page.waitForTimeout(3000); // let the anti-bot timer pass like a real visitor
      await page.getByLabel('Name', { exact: true }).fill('E2E Visitor');
      await page.getByLabel('Mobile number', { exact: true }).fill('9829055555');
      await page.getByLabel('Message', { exact: true }).fill(`Interested — ${stamp}`);
      await page.getByRole('checkbox', { name: /agree to be contacted/ }).check();
      await page.getByRole('button', { name: 'Send enquiry' }).click();
      await expect(page.getByText('Enquiry received')).toBeVisible();
      const ref = await page.getByText(/NX-E-\d{4}-\d{5}/).textContent();

      // 8–9. Admin sees and updates it
      await page.goto('/admin/enquiries');
      await page.getByPlaceholder(/Name, phone/).fill(ref!.trim());
      await page.getByRole('button', { name: 'Search' }).click();
      await page.getByRole('button', { name: ref!.trim() }).click();
      await page.getByLabel('Status', { exact: true }).last().selectOption('contacted');
      await expect(page.getByText('Marked contacted')).toBeVisible();
    });
  }
});
