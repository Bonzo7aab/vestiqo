import { Page, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../../src/types/database';
import { TEST_USER_PREFIX } from '../config/constants';
import { resolveSupabaseEnvForApp } from './supabase-env';

/**
 * Creates a Supabase admin client for test data management
 */
function createAdminClient() {
  const { url: supabaseUrl, serviceRoleKey } = resolveSupabaseEnvForApp();

  if (!supabaseUrl) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable');
  }

  if (!serviceRoleKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable');
  }

  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Creates a test user via Supabase admin API
 */
export async function createTestUser(
  email: string,
  password: string,
  userType: 'manager' | 'contractor',
  options?: {
    firstName?: string;
    lastName?: string;
    phone?: string;
  }
) {
  const adminClient = createAdminClient();

  // Create auth user
  const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // Auto-confirm email for testing
    user_metadata: {
      first_name: options?.firstName || 'Test',
      last_name: options?.lastName || 'User',
      user_type: userType,
      phone: options?.phone || null,
    },
  });

  if (authError || !authData.user) {
    throw new Error(`Failed to create test user: ${authError?.message || 'Unknown error'}`);
  }

  // Create user profile
  const { error: profileError } = await adminClient
    .from('user_profiles')
    .insert({
      id: authData.user.id,
      user_type: userType,
      first_name: options?.firstName || 'Test',
      last_name: options?.lastName || 'User',
      phone: options?.phone || null,
      is_verified: false,
      profile_completed: false,
      onboarding_completed: false,
      contractor_services_completed: userType === 'contractor',
    });

  if (profileError) {
    // Try to clean up auth user if profile creation fails
    await adminClient.auth.admin.deleteUser(authData.user.id);
    throw new Error(`Failed to create user profile: ${profileError.message}`);
  }

  return authData.user;
}

/**
 * Deletes a test user by email
 */
export async function deleteTestUser(email: string) {
  const adminClient = createAdminClient();

  // Find user by email
  const { data: users, error: findError } = await adminClient.auth.admin.listUsers();

  if (findError || !users?.users) {
    console.error('Error listing users:', findError);
    return;
  }

  const user = users.users.find((u: { email?: string }) => u.email === email);

  if (user) {
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(user.id);
    if (deleteError) {
      console.error(`Error deleting user ${email}:`, deleteError);
    }
  }
}

/**
 * Deletes all test users (users with test email prefix)
 */
export async function cleanupTestUsers() {
  const adminClient = createAdminClient();

  try {
    const { data: users, error: findError } = await adminClient.auth.admin.listUsers();

    if (findError || !users?.users) {
      console.warn('Skipping test user cleanup — auth admin listUsers unavailable:', findError?.message);
      return;
    }

    const testUsers = users.users.filter((u: { email?: string }) => u.email?.startsWith(TEST_USER_PREFIX));

    for (const user of testUsers) {
      if (user.id) {
        const { error: deleteError } = await adminClient.auth.admin.deleteUser(user.id);
        if (deleteError) {
          console.error(`Error deleting test user ${user.email}:`, deleteError);
        }
      }
    }

    console.log(`Cleaned up ${testUsers.length} test users`);
  } catch (error) {
    console.error('Error during test user cleanup:', error);
  }
}

/**
 * Logs in a user via the UI
 */
export async function loginViaUI(page: Page, email: string, password: string) {
  // Detect browser for browser-specific timeouts
  const browserName = page.context().browser()?.browserType().name() || 'chromium';
  const isWebKit = browserName === 'webkit';
  
  await page.goto('/logowanie', { waitUntil: 'domcontentloaded' });
  
  // Wait for auth initialization (critical for WebKit)
  await waitForAuthInitialized(page);
  
  // Wait for login page to finish loading - use multiple wait strategies
  // Try data-testid first (more reliable), then fallback to heading text
  const timeout = isWebKit ? 30000 : 20000;
  await Promise.race([
    expect(page.locator('[data-testid="login-page"]')).toBeVisible({ timeout }),
    expect(page.locator('[data-testid="login-heading"]')).toBeVisible({ timeout }),
    expect(page.locator('h1').filter({ hasText: 'Zaloguj się' })).toBeVisible({ timeout }),
    expect(page.locator('input[name="email"]')).toBeVisible({ timeout }),
  ]);
  
  // Wait for form fields to be visible and actionable
  const emailInput = page.locator('input[name="email"]');
  await expect(emailInput).toBeVisible({ timeout });
  await expect(emailInput).toBeEnabled({ timeout });
  
  await emailInput.fill(email);
  const passwordInput = page.locator('input[name="password"]');
  await expect(passwordInput).toBeVisible({ timeout });
  await expect(passwordInput).toBeEnabled({ timeout });
  await passwordInput.fill(password);
  await page.click('button[type="submit"]');
  
  // Wait for navigation after login with longer timeout for WebKit
  await page.waitForURL((url) => url.pathname !== '/logowanie', { timeout: isWebKit ? 20000 : 10000 });
}

/**
 * Logs out a user via the UI
 */
export async function logoutViaUI(page: Page) {
  // This depends on where the logout button is in your UI
  // You may need to adjust the selector based on your actual implementation
  const logoutButton = page.locator('text=Wyloguj').or(page.locator('text=Logout')).or(page.locator('[data-testid="logout"]'));
  
  if (await logoutButton.isVisible({ timeout: 2000 }).catch(() => false)) {
    await logoutButton.click();
    await page.waitForURL((url) => url.pathname === '/logowanie' || url.pathname === '/', { timeout: 10000 });
  }
}

/**
 * Waits for authentication state to change
 */
export async function waitForAuthState(page: Page, isAuthenticated: boolean) {
  // Wait for navigation or URL change that indicates auth state
  if (isAuthenticated) {
    // Wait for redirect away from login/rejestracja pages
    await page.waitForURL((url) => !url.pathname.includes('/logowanie') && !url.pathname.includes('/rejestracja'), {
      timeout: 10000,
    });
  } else {
    // Wait for redirect to login page
    await page.waitForURL((url) => url.pathname.includes('/logowanie'), { timeout: 10000 });
  }
}

/**
 * Gets authentication state from cookies
 * Checks for Supabase auth token cookies (sb-*-auth-token)
 */
export async function getAuthState(page: Page): Promise<boolean> {
  const cookies = await page.context().cookies();
  // Check for Supabase auth token cookie specifically (sb-*-auth-token)
  // This is the main session cookie that indicates authentication
  // Also check for access token cookie which is another indicator
  const authCookie = cookies.find((cookie) => {
    const name = cookie.name.toLowerCase();
    return (
      (name.includes('auth-token') || name.includes('access-token')) &&
      cookie.value &&
      cookie.value.length > 0 &&
      cookie.value !== 'null' &&
      cookie.value !== 'undefined'
    );
  });
  return !!authCookie;
}

/**
 * Dismisses the cookie consent banner if visible (blocks fixed footer actions).
 */
export async function dismissCookieConsentIfVisible(page: Page): Promise<void> {
  const acceptButton = page.getByRole('button', { name: /akceptuję wszystkie/i });
  if (await acceptButton.isVisible().catch(() => false)) {
    await acceptButton.click();
  }
}

/**
 * Prevents cookie consent banner from appearing during E2E flows.
 */
export async function seedCookieConsentAccepted(page: Page): Promise<void> {
  await page.addInitScript(() => {
    localStorage.setItem('cookie-consent', 'accepted');
  });
}

/**
 * Clears all authentication cookies and storage
 */
export async function clearAuthState(page: Page) {
  await page.context().clearCookies();
  
  // Try to clear storage, but handle cases where it's not accessible
  // (e.g., when page hasn't been navigated to a valid URL yet)
  // Cookies are the primary auth mechanism, so storage clearing is best-effort
  try {
    await page.evaluate(() => {
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.clear();
        }
      } catch {
        // Ignore - localStorage not accessible
      }
      try {
        if (typeof sessionStorage !== 'undefined') {
          sessionStorage.clear();
        }
      } catch {
        // Ignore - sessionStorage not accessible
      }
    });
  } catch (e: unknown) {
    // SecurityError or other errors when page context doesn't support storage access
    // This is expected when clearAuthState is called before page.goto()
    // Cookies are already cleared, which is sufficient
    const err = e as Error;
    if (err.name !== 'SecurityError' && !err.message?.includes('localStorage') && !err.message?.includes('sessionStorage')) {
      // Re-throw unexpected errors
      throw e;
    }
  }
}

/**
 * Waits for auth context to finish initializing
 * Useful for WebKit which may have delays
 */
export async function waitForAuthInitialized(page: Page) {
  // Wait for loading state to disappear or network to be idle
  await page.waitForLoadState('networkidle');
  
  // Wait for auth loading indicator to be gone (if it exists)
  try {
    await page.waitForSelector('[data-testid="auth-loading"]', { 
      state: 'hidden', 
      timeout: 5000 
    });
  } catch {
    // If loading indicator doesn't exist, that's fine - auth may already be initialized
  }
}


