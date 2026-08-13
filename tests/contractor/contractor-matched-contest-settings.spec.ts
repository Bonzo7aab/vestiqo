import { test, expect } from '@playwright/test';
import {
  clearAuthState,
  createTestUser,
  deleteTestUser,
  loginViaUI,
} from '../helpers/auth-helpers';

test.describe('Contractor notification settings (OPD-148)', () => {
  test('shows Dopasowane konkursy toggle', async ({ page }) => {
    const email = `test-playwright-opd148-${Date.now()}@example.com`;
    const password = 'TestPassword123!';

    await createTestUser(email, password, 'contractor', {
      firstName: 'Test',
      lastName: 'Services',
    });

    try {
      await clearAuthState(page);
      await loginViaUI(page, email, password);
      await page.goto('/konto?tab=powiadomienia');
      await expect(page.getByText('Dopasowane konkursy')).toBeVisible({ timeout: 15000 });
      await expect(
        page.getByText(/konkurs w kategorii zgodnej z Twoimi usługami/i),
      ).toBeVisible();
    } finally {
      await deleteTestUser(email);
    }
  });
});
