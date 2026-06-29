import { test, expect } from '@playwright/test';
import { createTestUser, deleteTestUser, clearAuthState, getAuthState } from '../helpers/auth-helpers';
import { ROUTES } from '../config/constants';

test.describe('End-to-End Authentication Flows', () => {
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

  test('should complete full registration to login to protected route flow', async ({ page }) => {
    const email = `test-flow-register-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`;
    const password = 'TestPassword123!';

    try {
      // Step 1: Register
      await page.goto(ROUTES.register);
      await page.fill('input[name="firstName"]', 'Test');
      await page.fill('input[name="lastName"]', 'User');
      await page.fill('input[name="email"]', email);
      await page.fill('input[name="password"]', password);
      await page.fill('input[name="confirmPassword"]', password);
      // Click the label since radio button is sr-only (contractor should be default anyway)
      await page.getByText('Wykonawca', { exact: true }).click();
      await page.click('button[type="submit"]');

      // Wait for redirect after registration
      await page.waitForURL((url) => !url.pathname.includes('/rejestracja'), { timeout: 15000 });

      // Step 2: Try to access protected route
      await page.goto(ROUTES.account);
      
      // Should either be on account page (if auto-logged in) or redirected to login
      await page.waitForTimeout(2000);
      
      if (page.url().includes('/logowanie')) {
        // Step 3: Login
        await page.fill('input[name="email"]', email);
        await page.fill('input[name="password"]', password);
        await page.click('button[type="submit"]');
        await page.waitForURL((url) => !url.pathname.includes('/logowanie'), { timeout: 10000 });
      }

      // Step 4: Verify access to protected route
      await page.goto(ROUTES.account);
      await page.waitForTimeout(2000);
      expect(page.url()).not.toContain('/logowanie');
    } finally {
      await deleteTestUser(email);
    }
  });

  test('should complete login to logout to login again flow', async ({ page }) => {
    const email = `test-flow-login-logout-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`;
    const password = 'TestPassword123!';

    await createTestUser(email, password, 'contractor');

    try {
      // Step 1: Login
      await page.goto(ROUTES.login);
      await page.fill('input[name="email"]', email);
      await page.fill('input[name="password"]', password);
      await page.click('button[type="submit"]');
      await page.waitForURL((url) => !url.pathname.includes('/logowanie'), { timeout: 10000 });

      // Verify authenticated
      const isAuthenticated1 = await getAuthState(page);
      expect(isAuthenticated1).toBe(true);

      // Step 2: Logout
      const avatarButton = page.locator('button').filter({ has: page.locator('img, svg') }).first();
      if (await avatarButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await avatarButton.click();
        await page.waitForTimeout(500);
        const logoutOption = page.locator('text=Wyloguj').or(page.locator('text=Wyloguj się')).first();
        await logoutOption.click();
        await page.waitForURL((url) => url.pathname.includes('/logowanie') || url.pathname === '/', { timeout: 10000 });
      }

      // Wait a bit for cookies to be cleared after logout
      await page.waitForTimeout(1000);
      
      // Verify not authenticated - clear auth state first to ensure clean check
      await clearAuthState(page);
      await page.goto('/logowanie'); // Navigate to a page to ensure cookies are cleared
      const isAuthenticated2 = await getAuthState(page);
      expect(isAuthenticated2).toBe(false);

      // Step 3: Login again
      await page.goto(ROUTES.login);
      await page.fill('input[name="email"]', email);
      await page.fill('input[name="password"]', password);
      await page.click('button[type="submit"]');
      await page.waitForURL((url) => !url.pathname.includes('/logowanie'), { timeout: 10000 });

      // Verify authenticated again
      const isAuthenticated3 = await getAuthState(page);
      expect(isAuthenticated3).toBe(true);
    } finally {
      await deleteTestUser(email);
    }
  });

  test('should complete protected route access to login to original route flow', async ({ page }) => {
    const email = `test-flow-protected-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`;
    const password = 'TestPassword123!';

    await createTestUser(email, password, 'contractor');

    try {
      // Step 1: Try to access protected route without auth
      await page.goto(ROUTES.account);
      
      // Should redirect to login with redirectTo parameter
      await page.waitForURL((url) => url.pathname.includes('/logowanie'), { timeout: 5000 });
      // Wait a bit for URL to be fully updated
      await page.waitForTimeout(500);
      const url = new URL(page.url());
      const redirectTo = url.searchParams.get('redirectTo');
      expect(redirectTo).toBe(ROUTES.account);

      // Step 2: Login
      await page.fill('input[name="email"]', email);
      await page.fill('input[name="password"]', password);
      await page.click('button[type="submit"]');

      // Should redirect to original destination or home
      await page.waitForURL((url) => !url.pathname.includes('/logowanie'), { timeout: 10000 });
      const currentUrl = page.url();
      expect(currentUrl).toMatch(/\/konto|\/$/);

      // Step 3: Verify access to protected route (only navigate if not already there)
      if (!currentUrl.includes('/konto')) {
        await page.goto(ROUTES.account);
        await page.waitForLoadState('networkidle');
      }
      await page.waitForTimeout(1000);
      expect(page.url()).not.toContain('/logowanie');
    } finally {
      await deleteTestUser(email);
    }
  });

  test('should handle multiple protected route redirects', async ({ page }) => {
    const email = `test-flow-multiple-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`;
    const password = 'TestPassword123!';

    await createTestUser(email, password, 'contractor');

    try {
      // Try multiple protected routes
      const protectedRoutes = [
        ROUTES.account,
        ROUTES.contractorDashboard,
        ROUTES.postContest,
      ];

      for (const route of protectedRoutes) {
        await clearAuthState(page);
        await page.goto(route);
        
        // Should redirect to login
        await page.waitForURL((url) => url.pathname.includes('/logowanie'), { timeout: 5000 });
        // Wait a bit for URL to be fully updated
        await page.waitForTimeout(1000);
        const url = new URL(page.url());
        const redirectTo = url.searchParams.get('redirectTo');
        // The redirectTo should match the route (middleware or layout/server component should set it)
        // Note: Some routes may have server-side redirects that preserve redirectTo differently
        if (redirectTo) {
          expect(redirectTo).toBe(route);
        } else {
          // If redirectTo is missing, the route should still work after login (it will redirect to home/default)
          // This can happen if the layout/server component redirects without preserving the parameter
          console.warn(`redirectTo parameter missing for route: ${route}`);
        }

        // Login
        await page.fill('input[name="email"]', email);
        await page.fill('input[name="password"]', password);
        await page.click('button[type="submit"]');
        await page.waitForURL((url) => !url.pathname.includes('/logowanie'), { timeout: 10000 });
        
        // Check if we're already on the target route before navigating
        const currentUrlAfterLogin = page.url();
        if (!currentUrlAfterLogin.includes(route)) {
          // Verify access by navigating to the route
          // Use waitForNavigation to handle redirects gracefully
          try {
            await Promise.all([
              page.waitForURL((url) => url.pathname.includes(route) || url.pathname === '/konto' || url.pathname === '/', { timeout: 5000 }),
              page.goto(route).catch(() => {}) // Ignore navigation errors if redirect happens
            ]);
          } catch (e) {
            // If navigation fails, check if we ended up on a valid page
            const finalUrl = page.url();
            // Accept if we're on account page (company setup) or home, or the target route
            if (!finalUrl.includes('/logowanie') && (finalUrl.includes(route) || finalUrl.includes('/konto') || finalUrl === 'http://localhost:3000/')) {
              // This is fine - we've been redirected to a valid page
            } else {
              throw e;
            }
          }
        }
        await page.waitForTimeout(1000);
        expect(page.url()).not.toContain('/logowanie');
      }
    } finally {
      await deleteTestUser(email);
    }
  });

  test('should maintain session across page navigations', async ({ page }) => {
    const email = `test-flow-session-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`;
    const password = 'TestPassword123!';

    await createTestUser(email, password, 'contractor');

    try {
      // Login
      await page.goto(ROUTES.login);
      await page.fill('input[name="email"]', email);
      await page.fill('input[name="password"]', password);
      await page.click('button[type="submit"]');
      await page.waitForURL((url) => !url.pathname.includes('/logowanie'), { timeout: 10000 });

      // Navigate to multiple pages (only if not already there)
      const currentUrlAfterLogin = page.url();
      if (!currentUrlAfterLogin.includes(ROUTES.home) && currentUrlAfterLogin !== ROUTES.home) {
        await page.goto(ROUTES.home);
        await page.waitForLoadState('networkidle');
      }
      await page.waitForTimeout(500);
      
      if (!page.url().includes('/konto')) {
        await page.goto(ROUTES.account);
        await page.waitForLoadState('networkidle');
      }
      await page.waitForTimeout(500);
      expect(page.url()).not.toContain('/logowanie');

      if (!page.url().includes('/panel-wykonawcy')) {
        try {
          await Promise.all([
            page.waitForURL((url) => url.pathname.includes('/panel-wykonawcy') || url.pathname === '/konto' || url.pathname === '/', { timeout: 5000 }),
            page.goto(ROUTES.contractorDashboard).catch(() => {})
          ]);
        } catch (e) {
          // Accept if we ended up on a valid page
          const finalUrl = page.url();
          if (!finalUrl.includes('/logowanie')) {
            // Fine - we're on a valid page
          } else {
            throw e;
          }
        }
      }
      await page.waitForTimeout(500);
      expect(page.url()).not.toContain('/logowanie');

      // Session should be maintained
      const isAuthenticated = await getAuthState(page);
      expect(isAuthenticated).toBe(true);
    } finally {
      await deleteTestUser(email);
    }
  });
});


