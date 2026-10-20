import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end tests run against a running stack (web on :3000, API on :4000,
 * MongoDB seeded with `pnpm seed:base` and an admin from `pnpm seed:admin`).
 * Set E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD for the admin journey.
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }], ['json', { outputFile: 'e2e-results.json' }]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3000',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
});
