import { test, expect } from '@playwright/test';
import { clearAuthState, waitForAuthInitialized } from '../helpers/auth-helpers';
import { ROUTES } from '../config/constants';

test.describe('Password Reset', () => {
  test.beforeEach(async ({ page }) => {
    await clearAuthState(page);
  });

  // Password reset tests don't create users, so no cleanup needed

  test('should display forgot password page correctly', async ({ page, browserName }) => {
    await page.goto(ROUTES.forgotPassword, { waitUntil: 'domcontentloaded' });
    
    // Wait for auth initialization (critical for WebKit)
    await waitForAuthInitialized(page);
    
    // Wait for page to fully load
    await page.waitForLoadState('networkidle');
    
    // Browser-specific timeout
    const timeout = browserName === 'webkit' ? 30000 : 20000;

    // Check page title/heading (use CardTitle which is h2 inside the card)
    await expect(page.getByRole('heading', { name: 'Odzyskaj konto' })).toBeVisible({ timeout });

    // Check form is present
    await expect(page.getByTestId('recovery-nip')).toBeVisible({ timeout });
    await expect(page.getByRole('button', { name: 'Odzyskaj konto' })).toBeVisible({ timeout });

    // Check for back button or login link
    const hasBackButton = await page.locator('text=/powrót|back/i').isVisible({ timeout }).catch(() => false);
    const hasLoginLink = await page.locator('text=/zaloguj|login/i').isVisible({ timeout }).catch(() => false);
    
    expect(hasBackButton || hasLoginLink).toBe(true);
  });

  test('should show not-found for an unknown NIP', async ({ page }) => {
    await page.goto(ROUTES.forgotPassword);
    await page.waitForLoadState('networkidle');

    await page.getByTestId('recovery-nip').fill('1234567883');
    await page.getByRole('button', { name: 'Odzyskaj konto' }).click();

    await expect(page.getByTestId('forgot-password-error')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Nie znaleziono konta dla tego NIP.')).toBeVisible();
  });

  test('should require a NIP', async ({ page }) => {
    await page.goto(ROUTES.forgotPassword);

    const nipInput = page.getByTestId('recovery-nip');
    await expect(nipInput).toHaveAttribute('required', '');

    const isRequired = await nipInput.evaluate((el) => (el as HTMLInputElement).validity.valid === false);
    expect(isRequired).toBe(true);
  });

  test('should navigate back to home/logowanie', async ({ page }) => {
    await page.goto(ROUTES.forgotPassword);

    // Look for back button
    const backButton = page.locator('text=/powrót|back/i').first();
    if (await backButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await backButton.click();
      // Should navigate away from forgot password page
      await page.waitForTimeout(1000);
      expect(page.url()).not.toContain('zapomniane-haslo');
    }
  });

  test('should navigate to login page via login link', async ({ page, browserName }) => {
    await page.goto(ROUTES.forgotPassword, { waitUntil: 'domcontentloaded' });
    
    // Wait for auth initialization (critical for WebKit)
    await waitForAuthInitialized(page);
    
    // Wait for page to fully load
    await page.waitForLoadState('networkidle');
    
    // Browser-specific timeout
    const timeout = browserName === 'webkit' ? 30000 : browserName === 'firefox' ? 20000 : 15000;
    
    const loginLink = page.getByRole('link', { name: /zaloguj/i });
    await expect(loginLink).toBeVisible({ timeout });

    await Promise.all([
      page.waitForURL((url) => url.pathname.includes('/logowanie'), { timeout }),
      loginLink.click(),
    ]);

    await page.waitForLoadState('networkidle');
    
    // Verify we navigated away from forgot-password
    const currentUrl = page.url();
    expect(currentUrl).not.toContain('zapomniane-haslo');
    expect(currentUrl).toContain('/logowanie');
  });

  test('should keep the form and explain a missing account', async ({ page }) => {
    await page.goto(ROUTES.forgotPassword);
    await page.waitForLoadState('networkidle');

    await page.getByTestId('recovery-nip').fill('1234567883');
    await page.click('button[type="submit"]');

    await expect(page.getByTestId('forgot-password-error')).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId('recovery-nip')).toBeVisible();
  });

  test('should explain when the NIP has no account', async ({ page }) => {
    await page.goto(ROUTES.forgotPassword);
    await page.waitForLoadState('networkidle');

    await page.getByTestId('recovery-nip').fill('1234567883');
    await page.click('button[type="submit"]');

    await expect(page.getByTestId('forgot-password-error')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Nie znaleziono konta dla tego NIP.')).toBeVisible();
  });
});


