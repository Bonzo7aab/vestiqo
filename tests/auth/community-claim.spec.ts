import { test, expect } from '@playwright/test';
import { clearAuthState, waitForAuthInitialized } from '../helpers/auth-helpers';
import { ROUTES } from '../config/constants';

test.describe('Community account claim', () => {
  test.beforeEach(async ({ page }) => {
    await clearAuthState(page);
  });

  test('forgot password still shows email reset and a claim branch', async ({ page }) => {
    await page.goto(ROUTES.forgotPassword, { waitUntil: 'domcontentloaded' });
    await waitForAuthInitialized(page);

    await expect(page.getByRole('heading', { name: /zapomniał|hasło/i })).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.getByTestId('community-claim-link')).toBeVisible();
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

  test('navigates from forgot password to claim form', async ({ page }) => {
    await page.goto(ROUTES.forgotPassword, { waitUntil: 'domcontentloaded' });
    await waitForAuthInitialized(page);

    await page.getByTestId('community-claim-link').click();
    await expect(page).toHaveURL(/odzyskanie-wspolnoty/);
    await expect(page.getByTestId('community-claim-page')).toBeVisible();
  });
});
