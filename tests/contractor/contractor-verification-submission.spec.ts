import { test, expect } from '@playwright/test';
import { clearAuthState, loginViaUI, seedCookieConsentAccepted } from '../helpers/auth-helpers';
import { buildVerificationMockFiles } from '../fixtures/verification-mock-documents';
import {
  assertContractorOcSavedWithoutAdminQueue,
  resetContractorVerificationForE2E,
} from '../helpers/verification-db-helpers';
import {
  fillVerificationForm,
  openContractorDocumentsTab,
  submitVerificationDocuments,
} from '../helpers/verification-form-helpers';
import { SEEDED_CONTRACTOR } from '../config/constants';

/**
 * Requires pre-seeded contractor (wykonawca3@openpro.pl) with company profile
 * and R2/storage configured for verification document upload.
 *
 * Admin queue is no longer used for contractor OC (OPD-186).
 */
test.describe('Contractor verification submission (wykonawca3)', () => {
  test.beforeEach(async ({ page }) => {
    await seedCookieConsentAccepted(page);
    await clearAuthState(page);
    await resetContractorVerificationForE2E(
      SEEDED_CONTRACTOR.email,
      SEEDED_CONTRACTOR.password,
    );
  });

  test.afterEach(async () => {
    await resetContractorVerificationForE2E(
      SEEDED_CONTRACTOR.email,
      SEEDED_CONTRACTOR.password,
    );
  });

  test('should login as wykonawca3 and open documents tab', async ({ page, browserName }) => {
    test.skip(browserName === 'firefox', 'Flaky in Firefox headless environment');

    await loginViaUI(page, SEEDED_CONTRACTOR.email, SEEDED_CONTRACTOR.password);
    await openContractorDocumentsTab(page);

    expect(page.url()).not.toContain('/logowanie');
    await expect(page.getByText(/Polisa OC|Weryfikacja konta/i).first()).toBeVisible({
      timeout: 15000,
    });
  });

  test('should save OC on documents tab without admin verification queue', async ({
    page,
    browserName,
  }) => {
    test.skip(browserName === 'firefox', 'Flaky in Firefox headless environment');
    test.setTimeout(120000);

    const files = buildVerificationMockFiles();

    await loginViaUI(page, SEEDED_CONTRACTOR.email, SEEDED_CONTRACTOR.password);

    await fillVerificationForm(page, files);
    await submitVerificationDocuments(page);

    await assertContractorOcSavedWithoutAdminQueue(
      SEEDED_CONTRACTOR.email,
      SEEDED_CONTRACTOR.password,
    );
  });
});
