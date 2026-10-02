import { test, expect } from '@playwright/test';
import { clearAuthState, waitForAuthInitialized } from '../helpers/auth-helpers';
import { ROUTES } from '../config/constants';

test.describe('Community account claim', () => {
  test.beforeEach(async ({ page }) => {
    await clearAuthState(page);
  });

  test('forgot password starts with a NIP and recover button', async ({ page }) => {
    await page.goto(ROUTES.forgotPassword, { waitUntil: 'domcontentloaded' });
    await waitForAuthInitialized(page);

    await expect(page.getByRole('heading', { name: 'Odzyskaj konto' })).toBeVisible();
    await expect(page.getByTestId('recovery-nip')).toBeVisible();
    await expect(page.getByTestId('recover-account')).toBeVisible();
    await expect(page.locator('input[type="email"]')).toHaveCount(0);
  });

  test('claim page shows NIP, contact fields and PDF upload', async ({ page }) => {
    await page.goto(ROUTES.communityClaim, { waitUntil: 'domcontentloaded' });
    await waitForAuthInitialized(page);

    await expect(page.getByTestId('community-claim-page')).toBeVisible();
    await expect(page.locator('#nip')).toBeVisible();
    await expect(page.locator('#firstName')).toBeVisible();
    await expect(page.locator('#lastName')).toBeVisible();
    await expect(page.locator('#email')).toBeVisible();
    await expect(page.locator('#phone')).toBeVisible();
    await expect(page.locator('#resolution')).toBeVisible();
    await expect(page.getByTestId('community-claim-submit')).toBeVisible();
  });

  test('unknown NIP stays on recovery and explains the account is missing', async ({ page }) => {
    await page.goto(ROUTES.forgotPassword, { waitUntil: 'domcontentloaded' });
    await waitForAuthInitialized(page);

    await page.getByTestId('recovery-nip').fill('0000000000');
    await page.getByTestId('recover-account').click();
    await expect(page.getByTestId('forgot-password-error')).toBeVisible({ timeout: 15000 });
    await expect(page).toHaveURL(/zapomniane-haslo/);
  });
});
