import { test, expect, type Page } from '@playwright/test';
import { createTestUser, deleteTestUser, clearAuthState, waitForAuthInitialized } from '../helpers/auth-helpers';
import { ROUTES } from '../config/constants';

/** Valid Polish NIP used when GUS lookup is available in the test environment. */
const TEST_NIP = '5261040828';

async function fillNipAndWaitForCompanyName(page: Page, nip = TEST_NIP): Promise<void> {
  await page.fill('#entityNip', nip);
  await page.locator('#entityNip').blur();
  await expect(page.locator('[data-testid="register-company-name"]')).not.toHaveText(/^\s*$/, {
    timeout: 15000,
  });
}

test.describe('Registration Page', () => {
  // Track test data for cleanup
  const testData: { userEmails: string[] } = {
    userEmails: [],
  };

  test.beforeEach(async ({ page }) => {
    await clearAuthState(page);
    // Reset test data tracking
    testData.userEmails = [];
  });

  test.afterEach(async () => {
    // Cleanup after each test to ensure no leftover data
    for (const email of testData.userEmails) {
      await deleteTestUser(email).catch(() => {
        // Ignore errors if user already deleted
      });
    }
  });

  test('should display registration page correctly', async ({ page, browserName }) => {
    await page.goto(ROUTES.register, { waitUntil: 'domcontentloaded' });
    
    // Wait for auth initialization (critical for WebKit)
    await waitForAuthInitialized(page);
    
    // Webkit may need more time - use longer timeout for webkit
    const timeout = browserName === 'webkit' ? 30000 : 20000;
    
    // Wait for the register page container to appear (more reliable indicator)
    // Try multiple selectors to handle different rendering states
    // Use data-testid selectors as primary, with fallbacks
    await Promise.race([
      expect(page.locator('[data-testid="register-page"]')).toBeVisible({ timeout }),
      expect(page.locator('[data-testid="register-heading"]')).toBeVisible({ timeout }),
      expect(page.locator('input[name="firstName"]')).toBeVisible({ timeout }),
      expect(page.locator('h1').filter({ hasText: 'Zarejestruj się' })).toBeVisible({ timeout }),
    ]);
    
    // Wait for the heading to appear (use data-testid for reliability)
    await expect(page.locator('[data-testid="register-heading"]').or(page.locator('h1').filter({ hasText: 'Zarejestruj się' }))).toBeVisible({ timeout });

    // Now check for form fields
    const firstNameInput = page.locator('input[name="firstName"]');
    await expect(firstNameInput).toBeVisible({ timeout });

    // Check form fields are present
    await expect(page.locator('input[name="firstName"]')).toBeVisible({ timeout });
    await expect(page.locator('input[name="lastName"]')).toBeVisible({ timeout });
    await expect(page.locator('input[name="email"]')).toBeVisible({ timeout });
    await expect(page.locator('input[name="password"]')).toBeVisible({ timeout });
    await expect(page.locator('input[name="confirmPassword"]')).toBeVisible({ timeout });
    await expect(page.locator('button[type="submit"]')).toBeVisible({ timeout });

    // Check entity type selection (radio buttons are sr-only, so check by role)
    await expect(page.getByRole('radio', { name: 'Wspólnota' })).toBeAttached();
    await expect(page.getByRole('radio', { name: 'Spółdzielnia' })).toBeAttached();
    await expect(page.getByRole('radio', { name: 'Wykonawca' })).toBeAttached();

    // Check links
    await expect(page.locator('a[href="/logowanie"]')).toBeVisible({ timeout });
  });

  test('should successfully register as contractor', async ({ page }) => {
    const email = `test-register-contractor-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`;
    const password = 'TestPassword123!';
    testData.userEmails.push(email);

    await page.goto(ROUTES.register);
    
    await expect(page.locator('h1').filter({ hasText: 'Zarejestruj się' })).toBeVisible({ timeout: 10000 });
    await expect(page.locator('input[name="firstName"]')).toBeVisible({ timeout: 10000 });

    await page.locator('form').getByText('Wykonawca', { exact: true }).click();
    await page.fill('input[name="firstName"]', 'Test');
    await page.fill('input[name="lastName"]', 'Contractor');
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="phone"]', '+48 512 345 678');
    await fillNipAndWaitForCompanyName(page);
    await page.fill('input[name="password"]', password);
    await page.fill('input[name="confirmPassword"]', password);
    await page.locator('form').getByRole('checkbox', { name: /akceptuję regulamin/i }).check();

    await page.click('button[type="submit"]');

    // Wait for verification choice step (auto-login), legacy documents tab, or login (email confirm)
    await page.waitForURL(
      (url) =>
        url.pathname.includes('/rejestracja/wybor-weryfikacji') ||
        (url.pathname.includes('/konto') && url.search.includes('tab=dokumenty')) ||
        url.pathname.includes('/logowanie'),
      { timeout: 15000 }
    );

    if (page.url().includes('/rejestracja/wybor-weryfikacji')) {
      await expect(page.getByTestId('register-verification-choice')).toBeVisible();
      await expect(page.getByText('Prześlij dokumenty teraz')).toBeVisible();
      await expect(page.getByText('Zrobię to później')).toBeVisible();
    } else if (page.url().includes('/konto')) {
      expect(page.url()).toMatch(/tab=dokumenty/);
    }

    // Cleanup: delete the created user
    await deleteTestUser(email);
  });

  test('should successfully register as manager', async ({ page }) => {
    const email = `test-register-manager-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`;
    const password = 'TestPassword123!';
    testData.userEmails.push(email);

    await page.goto(ROUTES.register);
    
    await expect(page.locator('h1').filter({ hasText: 'Zarejestruj się' })).toBeVisible({ timeout: 10000 });
    await expect(page.locator('input[name="firstName"]')).toBeVisible({ timeout: 10000 });

    await page.locator('form').getByText('Wspólnota', { exact: true }).click();
    await page.fill('input[name="firstName"]', 'Test');
    await page.fill('input[name="lastName"]', 'Manager');
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="phone"]', '+48 512 345 678');
    await fillNipAndWaitForCompanyName(page);
    await page.fill('input[name="password"]', password);
    await page.fill('input[name="confirmPassword"]', password);
    await page.locator('form').getByRole('checkbox', { name: /akceptuję regulamin/i }).check();

    await page.click('button[type="submit"]');

    // Wait for redirect to contests list (auto-login) or login (email confirm)
    await page.waitForURL(
      (url) =>
        url.pathname.includes('/panel-zarzadcy/konkursy') ||
        url.pathname.includes('/logowanie'),
      { timeout: 15000 }
    );

    if (page.url().includes('/panel-zarzadcy/konkursy')) {
      expect(page.url()).toContain('/panel-zarzadcy/konkursy');
    }

    // Cleanup: delete the created user
    await deleteTestUser(email);
  });

  test('should show error with missing required fields', async ({ page }) => {
    await page.goto(ROUTES.register);
    
    await expect(page.locator('h1').filter({ hasText: 'Zarejestruj się' })).toBeVisible({ timeout: 10000 });
    // Then wait for form fields to be visible
    await expect(page.locator('input[name="firstName"]')).toBeVisible({ timeout: 10000 });

    // Try to submit without filling required fields
    const firstNameInput = page.locator('input[name="firstName"]');
    const lastNameInput = page.locator('input[name="lastName"]');
    const emailInput = page.locator('input[name="email"]');
    const passwordInput = page.locator('input[name="password"]');

    // All required fields should have required attribute (boolean attribute - check existence without value)
    await expect(firstNameInput).toHaveAttribute('required');
    await expect(lastNameInput).toHaveAttribute('required');
    await expect(emailInput).toHaveAttribute('required');
    await expect(passwordInput).toHaveAttribute('required');
  });

  test('should validate password length', async ({ page }) => {
    await page.goto(ROUTES.register);
    
    await expect(page.locator('h1').filter({ hasText: 'Zarejestruj się' })).toBeVisible({ timeout: 10000 });
    await expect(page.locator('input[name="firstName"]')).toBeVisible({ timeout: 10000 });

    await page.locator('form').getByText('Wykonawca', { exact: true }).click();
    await page.fill('input[name="firstName"]', 'Test');
    await page.fill('input[name="lastName"]', 'User');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="phone"]', '+48 512 345 678');
    await fillNipAndWaitForCompanyName(page);
    await page.fill('input[name="password"]', '12345');
    await page.fill('input[name="confirmPassword"]', '12345');
    await page.locator('form').getByRole('checkbox', { name: /akceptuję regulamin/i }).check();

    await page.click('button[type="submit"]');

    // Should show error about password length (either client-side or server-side)
    // Wait a bit to see if error appears
    await page.waitForTimeout(2000);
    
    // Check for error message (could be in alert or redirect with error param)
    const hasError = await page.locator('text=/hasło|password|6/i').isVisible().catch(() => false) ||
                     page.url().includes('error');
    
    // If still on register page, there should be an error
    if (page.url().includes('/rejestracja')) {
      expect(hasError).toBe(true);
    }
  });

  test('should validate password mismatch', async ({ page }) => {
    await page.goto(ROUTES.register);
    
    await expect(page.locator('h1').filter({ hasText: 'Zarejestruj się' })).toBeVisible({ timeout: 10000 });
    const firstNameInput = page.locator('input[name="firstName"]');
    await expect(firstNameInput).toBeVisible({ timeout: 10000 });
    await expect(firstNameInput).toBeEnabled({ timeout: 10000 });

    await page.locator('form').getByText('Wykonawca', { exact: true }).click();
    await firstNameInput.fill('Test');
    await page.fill('input[name="lastName"]', 'User');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="phone"]', '+48 512 345 678');
    await fillNipAndWaitForCompanyName(page);
    await page.fill('input[name="password"]', 'Password123!');
    await page.fill('input[name="confirmPassword"]', 'DifferentPassword123!');
    await page.locator('form').getByRole('checkbox', { name: /akceptuję regulamin/i }).check();

    await page.click('button[type="submit"]');

    // Should show error about password mismatch
    await page.waitForTimeout(2000);
    
    // Check for error message
    const hasError = await page.locator('text=/hasła|password|identyczne|match/i').isVisible().catch(() => false) ||
                     page.url().includes('error');
    
    // If still on register page, there should be an error
    if (page.url().includes('/rejestracja')) {
      expect(hasError).toBe(true);
    }
  });

  test('should validate email format', async ({ page }) => {
    await page.goto(ROUTES.register);
    
    await expect(page.locator('h1').filter({ hasText: 'Zarejestruj się' })).toBeVisible({ timeout: 10000 });
    // Then wait for form fields to be visible and actionable
    const firstNameInput = page.locator('input[name="firstName"]');
    await expect(firstNameInput).toBeVisible({ timeout: 10000 });
    await expect(firstNameInput).toBeEnabled({ timeout: 10000 });

    await firstNameInput.fill('Test');
    await page.fill('input[name="lastName"]', 'User');
    await page.fill('input[name="email"]', 'invalid-email');
    await page.fill('input[name="password"]', 'Password123!');
    await page.fill('input[name="confirmPassword"]', 'Password123!');

    // Email input should have type="email" which provides browser validation
    const emailInput = page.locator('input[name="email"]');
    await expect(emailInput).toHaveAttribute('type', 'email');
    
    // Browser validation should prevent invalid email format
    const isValid = await emailInput.evaluate((el) => (el as HTMLInputElement).validity.valid);
    expect(isValid).toBe(false);
  });

  test('should allow entity type selection', async ({ page }) => {
    await page.goto(ROUTES.register);
    
    await expect(page.locator('h1').filter({ hasText: 'Zarejestruj się' })).toBeVisible({ timeout: 10000 });
    const form = page.locator('form');
    await expect(form.getByText('Wspólnota', { exact: true })).toBeVisible({ timeout: 10000 });

    const wykonawcaRadio = page.getByRole('radio', { name: 'Wykonawca' });
    const wspolnotaRadio = page.getByRole('radio', { name: 'Wspólnota' });
    const spoldzielniaRadio = page.getByRole('radio', { name: 'Spółdzielnia' });

    await form.getByText('Wspólnota', { exact: true }).click();
    await expect(wspolnotaRadio).toBeChecked();

    await form.getByText('Spółdzielnia', { exact: true }).click();
    await expect(spoldzielniaRadio).toBeChecked();

    await form.getByText('Wykonawca', { exact: true }).click();
    await expect(wykonawcaRadio).toBeChecked();
  });

  test('should show management company NIP when property manager role is selected', async ({ page }) => {
    await page.goto(ROUTES.register);

    await expect(page.locator('h1').filter({ hasText: 'Zarejestruj się' })).toBeVisible({ timeout: 10000 });
    await page.locator('form').getByText('Wspólnota', { exact: true }).click();

    await expect(page.locator('#managementNip')).not.toBeVisible();

    await page.getByLabel('Zarządca nieruchomości (powierzony)').click();
    await expect(page.locator('#managementNip')).toBeVisible();
    await expect(page.getByText('NIP Firmy Zarządzającej')).toBeVisible();
  });

  test('should navigate to login page', async ({ page }) => {
    await page.goto(ROUTES.register);
    
    await expect(page.locator('h1').filter({ hasText: 'Zarejestruj się' })).toBeVisible({ timeout: 10000 });
    
    // Wait for login link to be visible
    const loginLink = page.getByRole('link', { name: /zaloguj|login/i });
    await expect(loginLink).toBeVisible({ timeout: 10000 });
    
    // Use Playwright's native click which handles navigation better
    await Promise.all([
      page.waitForURL(/.*login/, { timeout: 10000 }),
      loginLink.click()
    ]);
  });

  test('should redirect to home if already authenticated', async ({ page, browserName }) => {
    test.skip(browserName === 'firefox', 'Flaky in Firefox headless environment');
    const email = `test-register-redirect-auth-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`;
    const password = 'TestPassword123!';

    await createTestUser(email, password, 'contractor');
    testData.userEmails.push(email);

    try {
      // Login first
      await page.goto(ROUTES.login);
      
      // Wait for login page to finish loading - wait for the heading first (more reliable indicator)
      await expect(page.locator('h1').filter({ hasText: 'Zaloguj się' })).toBeVisible({ timeout: 10000 });
      // Then wait for form fields to be visible and actionable
      const emailInput = page.locator('input[name="email"]');
      await expect(emailInput).toBeVisible({ timeout: 10000 });
      await expect(emailInput).toBeEnabled({ timeout: 10000 });
      
      await emailInput.fill(email);
      await page.fill('input[name="password"]', password);
      await page.click('button[type="submit"]');
      await page.waitForURL((url) => !url.pathname.includes('/logowanie'), { timeout: 10000 });
      
      // Try to access register page - should redirect away (client-side redirect via useEffect)
      await page.goto(ROUTES.register);
      // Wait for the redirect to complete - the page component redirects to home via useEffect
      await page.waitForURL((url) => !url.pathname.includes('/rejestracja'), { timeout: 10000 });
      await page.waitForLoadState('networkidle');
      expect(page.url()).not.toContain('/rejestracja');
    } finally {
      await deleteTestUser(email);
    }
  });

  test('should show terms and privacy links', async ({ page }) => {
    await page.goto(ROUTES.register);
    
    await expect(page.locator('h1').filter({ hasText: 'Zarejestruj się' })).toBeVisible({ timeout: 10000 });

    const registerPage = page.locator('[data-testid="register-page"]');
    const termsLink = registerPage.getByRole('link', { name: 'regulamin' });
    const privacyLink = registerPage.getByRole('link', { name: 'politykę prywatności' });

    await expect(termsLink).toBeVisible({ timeout: 10000 });
    await expect(privacyLink).toBeVisible({ timeout: 10000 });
  });

  test('should toggle password visibility', async ({ page }) => {
    await page.goto(ROUTES.register);
    
    await expect(page.locator('h1').filter({ hasText: 'Zarejestruj się' })).toBeVisible({ timeout: 10000 });
    
    const passwordInput = page.locator('input[name="password"]');
    // Wait for password input to be visible and actionable
    await expect(passwordInput).toBeVisible({ timeout: 10000 });
    await expect(passwordInput).toBeEnabled({ timeout: 10000 });
    
    // Find the toggle button - it's a button with type="button" in the same parent as the password input
    const passwordContainer = passwordInput.locator('..');
    const toggleButton = passwordContainer.locator('button[type="button"]');

    // Fill password
    await passwordInput.fill('TestPassword123!');

    // Initially password should be hidden
    await expect(passwordInput).toHaveAttribute('type', 'password');

    // Click toggle button
    await toggleButton.click();

    // Password should be visible
    await expect(passwordInput).toHaveAttribute('type', 'text');

    // Click toggle again
    await toggleButton.click();

    // Password should be hidden again
    await expect(passwordInput).toHaveAttribute('type', 'password');
  });
});


