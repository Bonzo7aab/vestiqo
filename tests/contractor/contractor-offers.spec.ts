import { test, expect } from '@playwright/test';
import { createTestUser, loginViaUI, clearAuthState } from '../helpers/auth-helpers';
import {
  createUniqueTestUsers,
  createTestJob,
  createTestTender,
  createTestContestTender,
  cleanupTestData,
} from '../helpers/offer-helpers';

const DEFAULT_JOB_COVER =
  'Mam wieloletnie doświadczenie w realizacji podobnych projektów. Oferuję wysoką jakość wykonania i terminowość.';

async function fillRegularJobOfferDialog(
  page: import('@playwright/test').Page,
  price: string,
  workingDays: string,
  coverLetter: string = DEFAULT_JOB_COVER
): Promise<void> {
  const dialog = page.getByRole('dialog');
  await dialog.locator('#netPrice').fill(price);
  const start = new Date();
  start.setDate(start.getDate() + 10);
  await dialog.locator('#startDate').fill(start.toISOString().slice(0, 10));
  await dialog.locator('#workingDays').fill(workingDays);
  await dialog.locator('#guaranteeMonths').fill('12');
  await dialog.locator('textarea').first().fill(coverLetter);
}

function submitRegularJobOfferButton(page: import('@playwright/test').Page) {
  return page.getByRole('dialog').getByRole('button', { name: 'Wyślij wiążącą ofertę', exact: true });
}

function submitTenderOfferButton(page: import('@playwright/test').Page) {
  return page.getByRole('dialog').getByRole('button', { name: 'Wyślij wiążącą ofertę w przetargu', exact: true });
}

test.describe('Contractor Making Offers', () => {
  // Track test data for cleanup
  const testData: { jobIds: string[]; tenderIds: string[]; companyIds: string[]; userEmails: string[] } = {
    jobIds: [],
    tenderIds: [],
    companyIds: [],
    userEmails: [],
  };

  test.beforeEach(async ({ page }) => {
    await clearAuthState(page);
    // Reset test data tracking
    testData.jobIds = [];
    testData.tenderIds = [];
    testData.companyIds = [];
    testData.userEmails = [];
  });

  test.afterEach(async () => {
    // Cleanup after each test to ensure no leftover data
    await cleanupTestData(testData.jobIds, testData.tenderIds, testData.companyIds, testData.userEmails);
  });

  test.describe('Regular Job Offer Submission', () => {
    test('should successfully submit offer on regular job with all required fields', async ({ page }) => {
      try {
        // Create unique users for this test to avoid race conditions
        const { contractor, manager } = await createUniqueTestUsers();
        testData.userEmails.push(contractor.email, manager.email);
        testData.companyIds.push(contractor.company.id, manager.company.id);

        const testJob = await createTestJob(manager.user.id, manager.company.id, {
          title: `Test Job for Offer ${Date.now()}-${Math.random().toString(36).substring(7)}`,
          description: 'This is a test job for submitting offers',
        });
        testData.jobIds.push(testJob.id);

        // Login as contractor
        await loginViaUI(page, contractor.email, contractor.password);

        // Navigate to job page with error handling for interrupted navigation
        try {
          await page.goto(`/konkurs/${testJob.id}`, { waitUntil: 'domcontentloaded', timeout: 10000 });
          await page.waitForLoadState('networkidle');
        } catch (error: unknown) {
          // Retry navigation if interrupted (NS_BINDING_ABORTED or redirected)
          if (error instanceof Error && (error.message?.includes('NS_BINDING_ABORTED') || 
              error.message?.includes('interrupted') ||
              error.message?.includes('interrupted by another navigation'))) {
            // Wait for any redirect to complete
            await page.waitForURL((url) => !url.pathname.includes('/konkurs/') || url.pathname.includes(`/konkurs/${testJob.id}`), { timeout: 2000 }).catch(() => {});
            await page.waitForTimeout(1000); // Additional wait for cleanup/redirect to complete
            // Check if we're already on the correct page
            if (page.url().includes(`/konkurs/${testJob.id}`)) {
              await page.waitForLoadState('networkidle');
            } else {
              // Retry navigation
              await page.goto(`/konkurs/${testJob.id}`, { waitUntil: 'domcontentloaded', timeout: 10000 });
              await page.waitForLoadState('networkidle');
            }
          } else {
            throw error;
          }
        }

        // Click "Złóż ofertę" button
        const applyButton = page.getByRole('button', { name: /złóż ofertę/i });
        await expect(applyButton).toBeVisible();
        await applyButton.click();

        // Wait for form modal to appear
        const dialog = page.getByRole('dialog');
        await expect(dialog).toBeVisible();
        await expect(dialog.getByText(/złóż ofertę/i)).toBeVisible();

        await fillRegularJobOfferDialog(
          page,
          '15000',
          '20',
          'Mam wieloletnie doświadczenie w realizacji podobnych projektów. Oferuję wysoką jakość wykonania i terminowość.'
        );

        const priceValue = await page.getByRole('dialog').locator('#netPrice').inputValue();
        const textareaValue = await page.getByRole('dialog').locator('textarea').first().inputValue();

        expect(Number(priceValue)).toBeGreaterThan(0);
        expect(textareaValue.length).toBeGreaterThanOrEqual(50);

        const submitButton = submitRegularJobOfferButton(page);
        await expect(submitButton).toBeEnabled();
        await expect(submitButton).not.toBeDisabled();

        await submitButton.click();

        await page.waitForTimeout(500);

        await expect(
          page.locator('[data-sonner-toast]').filter({ hasText: /wiążąca oferta została złożona/i }).first()
        ).toBeVisible({ timeout: 20000 });

        // Verify form closes after success
        await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 5000 });
      } finally {
        // Clean up jobs/tenders/companies but not pool users
        await cleanupTestData(testData.jobIds, testData.tenderIds, testData.companyIds, []);
      }
    });

    test('should successfully submit offer with optional additional notes', async ({ page }) => {
      try {
        // Create unique users for this test to avoid race conditions
        const { contractor, manager } = await createUniqueTestUsers();
        testData.userEmails.push(contractor.email, manager.email);
        testData.companyIds.push(contractor.company.id, manager.company.id);

        const testJob = await createTestJob(manager.user.id, manager.company.id, {
          title: `Test Job ${Date.now()}-${Math.random().toString(36).substring(7)}`,
        });
        testData.jobIds.push(testJob.id);

        // Login as contractor
        await loginViaUI(page, contractor.email, contractor.password);

        // Navigate to job page with error handling for interrupted navigation
        try {
          await page.goto(`/konkurs/${testJob.id}`, { waitUntil: 'domcontentloaded', timeout: 10000 });
          await page.waitForLoadState('networkidle');
        } catch (error: unknown) {
          // Retry navigation if interrupted (NS_BINDING_ABORTED or redirected)
          if (error instanceof Error && (error.message?.includes('NS_BINDING_ABORTED') || 
              error.message?.includes('interrupted') ||
              error.message?.includes('interrupted by another navigation'))) {
            // Wait for any redirect to complete
            await page.waitForURL((url) => !url.pathname.includes('/konkurs/') || url.pathname.includes(`/konkurs/${testJob.id}`), { timeout: 2000 }).catch(() => {});
            await page.waitForTimeout(1000); // Additional wait for cleanup/redirect to complete
            // Check if we're already on the correct page
            if (page.url().includes(`/konkurs/${testJob.id}`)) {
              await page.waitForLoadState('networkidle');
            } else {
              // Retry navigation
              await page.goto(`/konkurs/${testJob.id}`, { waitUntil: 'domcontentloaded', timeout: 10000 });
              await page.waitForLoadState('networkidle');
            }
          } else {
            throw error;
          }
        }

        // Click "Złóż ofertę" button
        await page.getByRole('button', { name: /złóż ofertę/i }).click();

        // Wait for form modal
        await expect(page.getByRole('dialog')).toBeVisible();

        // Fill required fields
        await fillRegularJobOfferDialog(
          page,
          '20000',
          '10',
          'Jestem doświadczonym wykonawcą z wieloletnim stażem. Gwarantuję profesjonalne podejście i terminową realizację projektu zgodnie z wymaganiami.'
        );

        const additionalNotesTextarea = page.getByRole('dialog').locator('#additionalNotes');
        await additionalNotesTextarea.fill('Mogę rozpocząć pracę natychmiast po akceptacji oferty.');

        const submitButton = submitRegularJobOfferButton(page);
        await expect(submitButton).toBeEnabled();
        await submitButton.click();

        await page.waitForTimeout(500);

        await expect(
          page.locator('[data-sonner-toast]').filter({ hasText: /wiążąca oferta została złożona/i }).first()
        ).toBeVisible({ timeout: 20000 });

        // Verify form closes after success
        await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 5000 });
      } finally {
        // Cleanup is handled by afterEach hook, but also cleanup here as backup
        await cleanupTestData(testData.jobIds, testData.tenderIds, testData.companyIds, testData.userEmails);
      }
    });
  });

  test.describe('Tender Bid Submission', () => {
    test('should successfully submit bid on tender with all required fields', async ({ page }) => {
      try {
        // Create unique users for this test to avoid race conditions
        const { contractor, manager } = await createUniqueTestUsers();
        testData.userEmails.push(contractor.email, manager.email);
        testData.companyIds.push(contractor.company.id, manager.company.id);

        const testTender = await createTestTender(manager.user.id, manager.company.id, {
          title: `Test Tender for Bid ${Date.now()}-${Math.random().toString(36).substring(7)}`,
        });
        testData.tenderIds.push(testTender.id);

        // Login as contractor
        await loginViaUI(page, contractor.email, contractor.password);

        // Navigate to tender page (tenders use same route structure as jobs) with error handling
        try {
          await page.goto(`/konkurs/${testTender.id}`, { waitUntil: 'domcontentloaded', timeout: 10000 });
          await page.waitForLoadState('networkidle');
        } catch (error: unknown) {
          // Retry navigation if interrupted (NS_BINDING_ABORTED or redirected)
          if (error instanceof Error && (error.message?.includes('NS_BINDING_ABORTED') || 
              error.message?.includes('interrupted') ||
              error.message?.includes('interrupted by another navigation'))) {
            await page.waitForTimeout(1000); // Wait for redirect/cleanup to complete
            // Check if we're already on the correct page
            if (page.url().includes(`/konkurs/${testTender.id}`)) {
              await page.waitForLoadState('networkidle');
            } else {
              await page.goto(`/konkurs/${testTender.id}`, { waitUntil: 'domcontentloaded', timeout: 10000 });
              await page.waitForLoadState('networkidle');
            }
          } else {
            throw error;
          }
        }

        // Click "Złóż ofertę" button
        await page.getByRole('button', { name: /złóż ofertę/i }).click();

        // Wait for form modal
        await expect(page.getByRole('dialog')).toBeVisible();
        await expect(page.getByText(/złóż ofertę w przetargu/i)).toBeVisible();

        // Fill form with valid data
        await page.locator('input[id="proposedPrice"]').fill('95000');
        const timeSelect = page.getByRole('dialog').locator('button[role="combobox"]').first();
        await timeSelect.click();
        await page.waitForSelector('[role="option"]', { state: 'visible', timeout: 5000 });
        await page.getByRole('option', { name: '2-3 miesiące' }).click();
        
        const coverLetterTextarea = page.getByPlaceholder(/opisz swoją ofertę/i).or(
          page.getByRole('dialog').locator('textarea').first()
        );
        await coverLetterTextarea.fill(
          'Nasza firma posiada wieloletnie doświadczenie w realizacji podobnych projektów. Oferujemy kompleksowe rozwiązanie z pełnym wsparciem technicznym i gwarancją jakości.'
        );

        // Submit form
        await submitTenderOfferButton(page).click();

        // Wait for success message (sonner toast)
        await expect(
          page.locator('[data-sonner-toast]').filter({ hasText: /oferta w przetargu została złożona pomyślnie/i }).first()
        ).toBeVisible({ timeout: 20000 });

        // Verify form closes after success
        await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 5000 });
      } finally {
        // Cleanup is handled by afterEach hook, but also cleanup here as backup
        await cleanupTestData(testData.jobIds, testData.tenderIds, testData.companyIds, testData.userEmails);
      }
    });

    test('should successfully submit bid with optional additional notes', async ({ page }) => {
      try {
        // Create unique users for this test to avoid race conditions
        const { contractor, manager } = await createUniqueTestUsers();
        testData.userEmails.push(contractor.email, manager.email);
        testData.companyIds.push(contractor.company.id, manager.company.id);

        const testTender = await createTestTender(manager.user.id, manager.company.id, {
          title: `Test Tender ${Date.now()}-${Math.random().toString(36).substring(7)}`,
        });
        testData.tenderIds.push(testTender.id);

        // Login as contractor
        await loginViaUI(page, contractor.email, contractor.password);

        // Navigate to tender page with error handling
        try {
          await page.goto(`/konkurs/${testTender.id}`, { waitUntil: 'domcontentloaded', timeout: 10000 });
          await page.waitForLoadState('networkidle');
        } catch (error: unknown) {
          // Retry navigation if interrupted (NS_BINDING_ABORTED or redirected)
          if (error instanceof Error && (error.message?.includes('NS_BINDING_ABORTED') || 
              error.message?.includes('interrupted') ||
              error.message?.includes('interrupted by another navigation'))) {
            await page.waitForTimeout(1000); // Wait for redirect/cleanup to complete
            // Check if we're already on the correct page
            if (page.url().includes(`/konkurs/${testTender.id}`)) {
              await page.waitForLoadState('networkidle');
            } else {
              await page.goto(`/konkurs/${testTender.id}`, { waitUntil: 'domcontentloaded', timeout: 10000 });
              await page.waitForLoadState('networkidle');
            }
          } else {
            throw error;
          }
        }

        // Click "Złóż ofertę" button
        await page.getByRole('button', { name: /złóż ofertę/i }).click();

        // Wait for form modal
        await expect(page.getByRole('dialog')).toBeVisible();

        // Fill required fields
        await page.locator('input[id="proposedPrice"]').fill('88000');
        const timeSelect = page.getByRole('dialog').locator('button[role="combobox"]').first();
        await timeSelect.click();
        await page.waitForSelector('[role="option"]', { state: 'visible', timeout: 5000 });
        await page.getByRole('option', { name: '1 miesiąc' }).click();
        
        const coverLetterTextarea = page.getByPlaceholder(/opisz swoją ofertę/i).or(
          page.getByRole('dialog').locator('textarea').first()
        );
        await coverLetterTextarea.fill(
          'Specjalizujemy się w realizacji projektów budowlanych i remontowych. Posiadamy odpowiednie certyfikaty i doświadczenie w branży.'
        );

        // Fill optional additional notes
        const additionalNotesTextarea = page.getByPlaceholder(/dodatkowe informacje/i).or(
          page.getByRole('dialog').locator('textarea').nth(1)
        );
        await additionalNotesTextarea.fill('Jesteśmy gotowi do rozpoczęcia prac w ciągu tygodnia od podpisania umowy.');

        // Submit form
        await submitTenderOfferButton(page).click();

        // Wait for loading state to appear (button shows "Wysyłanie...")
        await page.waitForTimeout(500);

        // Wait for success message (toast) - sonner toasts use [data-sonner-toast]
        await expect(
          page.locator('[data-sonner-toast]').filter({ hasText: /oferta w przetargu została złożona pomyślnie/i }).first()
        ).toBeVisible({ timeout: 20000 });

        // Verify form closes after success
        await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 5000 });
      } finally {
        // Cleanup is handled by afterEach hook, but also cleanup here as backup
        await cleanupTestData(testData.jobIds, testData.tenderIds, testData.companyIds, testData.userEmails);
      }
    });
  });

  test.describe('Validation Tests', () => {
    test('should prevent submission when contractor has no company', async ({ page }) => {
      try {
        // This test needs a contractor WITHOUT company, so create a new one
        // Create unique manager for the job
        const { manager } = await createUniqueTestUsers();
        testData.userEmails.push(manager.email);
        testData.companyIds.push(manager.company.id);

        const contractorEmail = `test-no-company-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`;
        const contractorPassword = 'TestPassword123!';
        await createTestUser(contractorEmail, contractorPassword, 'contractor');
        testData.userEmails.push(contractorEmail);

        const testJob = await createTestJob(manager.user.id, manager.company.id, {
          title: `Test Job ${Date.now()}-${Math.random().toString(36).substring(7)}`,
        });
        testData.jobIds.push(testJob.id);

        // Login as contractor
        await loginViaUI(page, contractorEmail, contractorPassword);

        // Navigate to job page with error handling for interrupted navigation
        try {
          await page.goto(`/konkurs/${testJob.id}`, { waitUntil: 'domcontentloaded', timeout: 10000 });
          await page.waitForLoadState('networkidle');
        } catch (error: unknown) {
          // Retry navigation if interrupted (NS_BINDING_ABORTED or redirected)
          if (error instanceof Error && (error.message?.includes('NS_BINDING_ABORTED') || 
              error.message?.includes('interrupted') ||
              error.message?.includes('interrupted by another navigation'))) {
            // Wait for any redirect to complete
            await page.waitForURL((url) => !url.pathname.includes('/konkurs/') || url.pathname.includes(`/konkurs/${testJob.id}`), { timeout: 2000 }).catch(() => {});
            await page.waitForTimeout(1000); // Additional wait for cleanup/redirect to complete
            // Check if we're already on the correct page
            if (page.url().includes(`/konkurs/${testJob.id}`)) {
              await page.waitForLoadState('networkidle');
            } else {
              // Retry navigation
              await page.goto(`/konkurs/${testJob.id}`, { waitUntil: 'domcontentloaded', timeout: 10000 });
              await page.waitForLoadState('networkidle');
            }
          } else {
            throw error;
          }
        }

        // Click "Złóż ofertę" button
        await page.getByRole('button', { name: /złóż ofertę/i }).click();

        // Should show error dialog or message about needing company
        // The error could be a toast or a dialog
        const hasError = await Promise.race([
          page.getByText(/musisz najpierw dodać informacje o swojej firmie/i).waitFor({ timeout: 5000 }).then(() => true),
          page.getByText(/company|firm/i).waitFor({ timeout: 5000 }).then(() => true),
          page.getByRole('dialog').filter({ hasText: /firm/i }).waitFor({ timeout: 5000 }).then(() => true),
        ]).catch(() => false);

        expect(hasError).toBe(true);
      } finally {
        // Cleanup is handled by afterEach hook, but also cleanup here as backup
        await cleanupTestData(testData.jobIds, testData.tenderIds, testData.companyIds, testData.userEmails);
      }
    });

    test('should prevent submission with missing required fields', async ({ page }) => {
      try {
        // Create unique users for this test to avoid race conditions
        const { contractor, manager } = await createUniqueTestUsers();
        testData.userEmails.push(contractor.email, manager.email);
        testData.companyIds.push(contractor.company.id, manager.company.id);

        const testJob = await createTestJob(manager.user.id, manager.company.id, {
          title: `Test Job ${Date.now()}-${Math.random().toString(36).substring(7)}`,
        });
        testData.jobIds.push(testJob.id);

        // Login as contractor
        await loginViaUI(page, contractor.email, contractor.password);

        // Navigate to job page with error handling for interrupted navigation
        try {
          await page.goto(`/konkurs/${testJob.id}`, { waitUntil: 'domcontentloaded', timeout: 10000 });
          await page.waitForLoadState('networkidle');
        } catch (error: unknown) {
          // Retry navigation if interrupted (NS_BINDING_ABORTED or redirected)
          if (error instanceof Error && (error.message?.includes('NS_BINDING_ABORTED') || 
              error.message?.includes('interrupted') ||
              error.message?.includes('interrupted by another navigation'))) {
            // Wait for any redirect to complete
            await page.waitForURL((url) => !url.pathname.includes('/konkurs/') || url.pathname.includes(`/konkurs/${testJob.id}`), { timeout: 2000 }).catch(() => {});
            await page.waitForTimeout(1000); // Additional wait for cleanup/redirect to complete
            // Check if we're already on the correct page
            if (page.url().includes(`/konkurs/${testJob.id}`)) {
              await page.waitForLoadState('networkidle');
            } else {
              // Retry navigation
              await page.goto(`/konkurs/${testJob.id}`, { waitUntil: 'domcontentloaded', timeout: 10000 });
              await page.waitForLoadState('networkidle');
            }
          } else {
            throw error;
          }
        }

        // Click "Złóż ofertę" button
        await page.getByRole('button', { name: /złóż ofertę/i }).click();

        // Wait for form modal
        await expect(page.getByRole('dialog')).toBeVisible();

        const submitButton = submitRegularJobOfferButton(page);
        await submitButton.click();

        await expect(
          page.getByText(/wypełnij wszystkie wymagane pola/i).or(page.getByText(/podaj cenę netto/i)).first()
        ).toBeVisible({ timeout: 5000 });
      } finally {
        // Cleanup is handled by afterEach hook, but also cleanup here as backup
        await cleanupTestData(testData.jobIds, testData.tenderIds, testData.companyIds, testData.userEmails);
      }
    });

    test('should prevent submission with invalid price (0 or negative)', async ({ page }) => {
      try {
        // Create unique users for this test to avoid race conditions
        const { contractor, manager } = await createUniqueTestUsers();
        testData.userEmails.push(contractor.email, manager.email);
        testData.companyIds.push(contractor.company.id, manager.company.id);

        const testJob = await createTestJob(manager.user.id, manager.company.id, {
          title: `Test Job ${Date.now()}-${Math.random().toString(36).substring(7)}`,
        });
        testData.jobIds.push(testJob.id);

        // Login as contractor
        await loginViaUI(page, contractor.email, contractor.password);

        // Navigate to job page with error handling for interrupted navigation
        try {
          await page.goto(`/konkurs/${testJob.id}`, { waitUntil: 'domcontentloaded', timeout: 10000 });
          await page.waitForLoadState('networkidle');
        } catch (error: unknown) {
          // Retry navigation if interrupted (NS_BINDING_ABORTED or redirected)
          if (error instanceof Error && (error.message?.includes('NS_BINDING_ABORTED') || 
              error.message?.includes('interrupted') ||
              error.message?.includes('interrupted by another navigation'))) {
            // Wait for any redirect to complete
            await page.waitForURL((url) => !url.pathname.includes('/konkurs/') || url.pathname.includes(`/konkurs/${testJob.id}`), { timeout: 2000 }).catch(() => {});
            await page.waitForTimeout(1000); // Additional wait for cleanup/redirect to complete
            // Check if we're already on the correct page
            if (page.url().includes(`/konkurs/${testJob.id}`)) {
              await page.waitForLoadState('networkidle');
            } else {
              // Retry navigation
              await page.goto(`/konkurs/${testJob.id}`, { waitUntil: 'domcontentloaded', timeout: 10000 });
              await page.waitForLoadState('networkidle');
            }
          } else {
            throw error;
          }
        }

        // Click "Złóż ofertę" button
        await page.getByRole('button', { name: /złóż ofertę/i }).click();

        // Wait for form modal
        await expect(page.getByRole('dialog')).toBeVisible();

        const dialog = page.getByRole('dialog');
        await dialog.locator('#netPrice').fill('0');
        const start = new Date();
        start.setDate(start.getDate() + 10);
        await dialog.locator('#startDate').fill(start.toISOString().slice(0, 10));
        await dialog.locator('#workingDays').fill('5');
        await dialog.locator('#guaranteeMonths').fill('12');
        await dialog.locator('textarea').first().fill(
          'Mam wieloletnie doświadczenie w realizacji podobnych projektów. Oferuję wysoką jakość wykonania i terminowość.'
        );

        await submitRegularJobOfferButton(page).click();

        await expect(
          page.getByText(/podaj prawidłową kwotę netto/i).or(page.getByText(/wypełnij wszystkie wymagane pola/i)).first()
        ).toBeVisible({ timeout: 5000 });
      } finally {
        // Cleanup is handled by afterEach hook, but also cleanup here as backup
        await cleanupTestData(testData.jobIds, testData.tenderIds, testData.companyIds, testData.userEmails);
      }
    });

    // Serialize critical tests that verify state changes or have dependencies
    test.describe.serial('Critical State Validation', () => {
      test('should prevent duplicate bids on same tender', async ({ page }) => {
        try {
          // Create unique users for this test to avoid race conditions
          const { contractor, manager } = await createUniqueTestUsers();
          testData.userEmails.push(contractor.email, manager.email);
          testData.companyIds.push(contractor.company.id, manager.company.id);

          const testTender = await createTestTender(manager.user.id, manager.company.id, {
            title: `Test Tender ${Date.now()}-${Math.random().toString(36).substring(7)}`,
          });
          testData.tenderIds.push(testTender.id);

        // Login as contractor
        await loginViaUI(page, contractor.email, contractor.password);

        // Navigate to tender page with error handling
        try {
          await page.goto(`/konkurs/${testTender.id}`, { waitUntil: 'domcontentloaded', timeout: 10000 });
          await page.waitForLoadState('networkidle');
        } catch (error: unknown) {
          // Retry navigation if interrupted (NS_BINDING_ABORTED or redirected)
          if (error instanceof Error && (error.message?.includes('NS_BINDING_ABORTED') || 
              error.message?.includes('interrupted') ||
              error.message?.includes('interrupted by another navigation'))) {
            await page.waitForTimeout(1000); // Wait for redirect/cleanup to complete
            // Check if we're already on the correct page
            if (page.url().includes(`/konkurs/${testTender.id}`)) {
              await page.waitForLoadState('networkidle');
            } else {
              await page.goto(`/konkurs/${testTender.id}`, { waitUntil: 'domcontentloaded', timeout: 10000 });
              await page.waitForLoadState('networkidle');
            }
          } else {
            throw error;
          }
        }

        // Submit first bid
        await page.getByRole('button', { name: /złóż ofertę/i }).click();
        await expect(page.getByRole('dialog')).toBeVisible();

        await page.locator('input[id="proposedPrice"]').fill('90000');
        const timeSelect = page.getByRole('dialog').locator('button[role="combobox"]').first();
        await timeSelect.click();
        await page.waitForSelector('[role="option"]', { state: 'visible', timeout: 5000 });
        await page.getByRole('option', { name: '1 miesiąc' }).click();
        
        const coverLetterTextarea = page.getByPlaceholder(/opisz swoją ofertę/i).or(
          page.getByRole('dialog').locator('textarea').first()
        );
        await coverLetterTextarea.fill(
          'Nasza firma posiada wieloletnie doświadczenie w realizacji podobnych projektów. Oferujemy kompleksowe rozwiązanie z pełnym wsparciem technicznym.'
        );

        await submitTenderOfferButton(page).click();
        
        // Wait for success message (toast) - sonner toasts use [data-sonner-toast]
        await expect(
          page.locator('[data-sonner-toast]').filter({ hasText: /oferta w przetargu została złożona pomyślnie/i }).first()
        ).toBeVisible({ timeout: 20000 });
        await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 5000 });

        // Reload page to see updated state
        await page.reload();
        await page.waitForLoadState('networkidle');

        // Try to submit second bid on same tender
        // After reload, button text changes to "Oferta już złożona" or button is disabled
        // Look for either "Złóż ofertę" or "Oferta już złożona" button
        const applyButton = page.getByRole('button', { name: /złóż ofertę|oferta już złożona/i }).first();
        await expect(applyButton).toBeVisible();
        
        // Check if button is disabled or if clicking shows error
        const isDisabled = await applyButton.isDisabled().catch(() => false);
        
        if (!isDisabled) {
          await applyButton.click();
          
          // Should show error about duplicate bid (either toast or dialog)
          const hasDuplicateError = await Promise.race([
            page.locator('[data-sonner-toast]').filter({ hasText: /już złożyłeś ofertę|nie możesz złożyć więcej/i }).waitFor({ timeout: 5000 }).then(() => true),
            page.getByText(/już złożyłeś ofertę/i).waitFor({ timeout: 5000 }).then(() => true),
            page.getByText(/nie możesz złożyć więcej niż jednej oferty/i).waitFor({ timeout: 5000 }).then(() => true),
          ]).catch(() => false);
          
          expect(hasDuplicateError).toBe(true);
        } else {
          // Button is disabled, which is also acceptable behavior
          expect(isDisabled).toBe(true);
        }
      } finally {
        // Cleanup is handled by afterEach hook, but also cleanup here as backup
        await cleanupTestData(testData.jobIds, testData.tenderIds, testData.companyIds, testData.userEmails);
      }
    });
    });

    test('should allow multiple applications on different jobs', async ({ page }) => {
      try {
        // Create unique users for this test to avoid race conditions
        const { contractor, manager } = await createUniqueTestUsers();
        testData.userEmails.push(contractor.email, manager.email);
        testData.companyIds.push(contractor.company.id, manager.company.id);

        const uniqueId1 = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
        const uniqueId2 = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
        const testJob1 = await createTestJob(manager.user.id, manager.company.id, {
          title: `Test Job 1 ${uniqueId1}`,
        });
        testData.jobIds.push(testJob1.id);

        const testJob2 = await createTestJob(manager.user.id, manager.company.id, {
          title: `Test Job 2 ${uniqueId2}`,
        });
        testData.jobIds.push(testJob2.id);

        // Login as contractor
        await loginViaUI(page, contractor.email, contractor.password);

        // Submit offer on first job with error handling
        try {
          await page.goto(`/konkurs/${testJob1.id}`, { waitUntil: 'domcontentloaded', timeout: 10000 });
          await page.waitForLoadState('networkidle');
        } catch (error: unknown) {
          // Retry navigation if interrupted
          if (error instanceof Error && (error.message?.includes('NS_BINDING_ABORTED') || 
              error.message?.includes('interrupted') ||
              error.message?.includes('interrupted by another navigation'))) {
            await page.waitForTimeout(1000);
            if (page.url().includes(`/konkurs/${testJob1.id}`)) {
              await page.waitForLoadState('networkidle');
            } else {
              await page.goto(`/konkurs/${testJob1.id}`, { waitUntil: 'domcontentloaded', timeout: 10000 });
              await page.waitForLoadState('networkidle');
            }
          } else {
            throw error;
          }
        }
        await page.getByRole('button', { name: /złóż ofertę/i }).click();
        await expect(page.getByRole('dialog')).toBeVisible();

        await fillRegularJobOfferDialog(
          page,
          '15000',
          '20',
          'Mam wieloletnie doświadczenie w realizacji podobnych projektów. Oferuję wysoką jakość wykonania i terminowość.'
        );

        await submitRegularJobOfferButton(page).click();

        await page.waitForTimeout(500);

        await expect(
          page.locator('[data-sonner-toast]').filter({ hasText: /wiążąca oferta została złożona/i }).first()
        ).toBeVisible({ timeout: 20000 });

        // Submit offer on second job with error handling
        try {
          await page.goto(`/konkurs/${testJob2.id}`, { waitUntil: 'domcontentloaded', timeout: 10000 });
          await page.waitForLoadState('networkidle');
        } catch (error: unknown) {
          // Retry navigation if interrupted
          if (error instanceof Error && (error.message?.includes('NS_BINDING_ABORTED') || 
              error.message?.includes('interrupted') ||
              error.message?.includes('interrupted by another navigation'))) {
            await page.waitForTimeout(1000);
            if (page.url().includes(`/konkurs/${testJob2.id}`)) {
              await page.waitForLoadState('networkidle');
            } else {
              await page.goto(`/konkurs/${testJob2.id}`, { waitUntil: 'domcontentloaded', timeout: 10000 });
              await page.waitForLoadState('networkidle');
            }
          } else {
            throw error;
          }
        }
        await page.getByRole('button', { name: /złóż ofertę/i }).click();
        await expect(page.getByRole('dialog')).toBeVisible();

        await fillRegularJobOfferDialog(
          page,
          '20000',
          '15',
          'Jestem doświadczonym wykonawcą z wieloletnim stażem. Gwarantuję profesjonalne podejście i terminową realizację projektu.'
        );

        await submitRegularJobOfferButton(page).click();

        await page.waitForTimeout(500);

        await expect(
          page.locator('[data-sonner-toast]').filter({ hasText: /wiążąca oferta została złożona/i }).first()
        ).toBeVisible({ timeout: 20000 });
      } finally {
        // Cleanup is handled by afterEach hook, but also cleanup here as backup
        await cleanupTestData(testData.jobIds, testData.tenderIds, testData.companyIds, testData.userEmails);
      }
    });
  });

  test.describe('UI Interaction Tests', () => {
    test('should display form fields correctly', async ({ page }) => {
      try {
        // Create unique users for this test to avoid race conditions
        const { contractor, manager } = await createUniqueTestUsers();
        testData.userEmails.push(contractor.email, manager.email);
        testData.companyIds.push(contractor.company.id, manager.company.id);

        const testJob = await createTestJob(manager.user.id, manager.company.id, {
          title: `Test Job ${Date.now()}-${Math.random().toString(36).substring(7)}`,
        });
        testData.jobIds.push(testJob.id);

        // Login as contractor
        await loginViaUI(page, contractor.email, contractor.password);

        // Navigate to job page with error handling for interrupted navigation
        try {
          await page.goto(`/konkurs/${testJob.id}`, { waitUntil: 'domcontentloaded', timeout: 10000 });
          await page.waitForLoadState('networkidle');
        } catch (error: unknown) {
          // Retry navigation if interrupted (NS_BINDING_ABORTED or redirected)
          if (error instanceof Error && (error.message?.includes('NS_BINDING_ABORTED') || 
              error.message?.includes('interrupted') ||
              error.message?.includes('interrupted by another navigation'))) {
            // Wait for any redirect to complete
            await page.waitForURL((url) => !url.pathname.includes('/konkurs/') || url.pathname.includes(`/konkurs/${testJob.id}`), { timeout: 2000 }).catch(() => {});
            await page.waitForTimeout(1000); // Additional wait for cleanup/redirect to complete
            // Check if we're already on the correct page
            if (page.url().includes(`/konkurs/${testJob.id}`)) {
              await page.waitForLoadState('networkidle');
            } else {
              // Retry navigation
              await page.goto(`/konkurs/${testJob.id}`, { waitUntil: 'domcontentloaded', timeout: 10000 });
              await page.waitForLoadState('networkidle');
            }
          } else {
            throw error;
          }
        }

        // Click "Złóż ofertę" button
        await page.getByRole('button', { name: /złóż ofertę/i }).click();

        // Wait for form modal
        await expect(page.getByRole('dialog')).toBeVisible();

        // Verify form fields are visible
        await expect(page.getByLabel(/cena netto/i)).toBeVisible();
        const dialog = page.getByRole('dialog');
        await expect(dialog.getByText(/termin rozpoczęcia/i).first()).toBeVisible();
        await expect(dialog.getByText(/dni robocze/i).first()).toBeVisible();
        await expect(dialog.getByText(/opis i podejście do zgłoszenia/i)).toBeVisible();
        await expect(dialog.getByText(/dokumentacja dodatkowa/i)).toBeVisible();

        await expect(page.getByRole('button', { name: /anuluj/i })).toBeVisible();
        await expect(submitRegularJobOfferButton(page)).toBeVisible();
      } finally {
        // Cleanup is handled by afterEach hook, but also cleanup here as backup
        await cleanupTestData(testData.jobIds, testData.tenderIds, testData.companyIds, testData.userEmails);
      }
    });

    test('should show loading state during submission', async ({ page }) => {
      try {
        // Create unique users for this test to avoid race conditions
        const { contractor, manager } = await createUniqueTestUsers();
        testData.userEmails.push(contractor.email, manager.email);
        testData.companyIds.push(contractor.company.id, manager.company.id);

        const testJob = await createTestJob(manager.user.id, manager.company.id, {
          title: `Test Job ${Date.now()}-${Math.random().toString(36).substring(7)}`,
        });
        testData.jobIds.push(testJob.id);

        // Login as contractor
        await loginViaUI(page, contractor.email, contractor.password);

        // Navigate to job page with error handling for interrupted navigation
        try {
          await page.goto(`/konkurs/${testJob.id}`, { waitUntil: 'domcontentloaded', timeout: 10000 });
          await page.waitForLoadState('networkidle');
        } catch (error: unknown) {
          // Retry navigation if interrupted (NS_BINDING_ABORTED or redirected)
          if (error instanceof Error && (error.message?.includes('NS_BINDING_ABORTED') || 
              error.message?.includes('interrupted') ||
              error.message?.includes('interrupted by another navigation'))) {
            // Wait for any redirect to complete
            await page.waitForURL((url) => !url.pathname.includes('/konkurs/') || url.pathname.includes(`/konkurs/${testJob.id}`), { timeout: 2000 }).catch(() => {});
            await page.waitForTimeout(1000); // Additional wait for cleanup/redirect to complete
            // Check if we're already on the correct page
            if (page.url().includes(`/konkurs/${testJob.id}`)) {
              await page.waitForLoadState('networkidle');
            } else {
              // Retry navigation
              await page.goto(`/konkurs/${testJob.id}`, { waitUntil: 'domcontentloaded', timeout: 10000 });
              await page.waitForLoadState('networkidle');
            }
          } else {
            throw error;
          }
        }

        // Click "Złóż ofertę" button
        await page.getByRole('button', { name: /złóż ofertę/i }).click();

        // Wait for form modal
        await expect(page.getByRole('dialog')).toBeVisible();

        // Fill form
        await fillRegularJobOfferDialog(page, '15000', '20');

        const submitButton = submitRegularJobOfferButton(page);
        await submitButton.click();

        const loadingButton = page.getByRole('button', { name: /wyślij wiążącą ofertę|wysyłanie/i });
        const hasLoadingState = await Promise.race([
          loadingButton.getByText(/wysyłanie/i).waitFor({ timeout: 2000 }).then(() => true),
          // Poll for disabled state
          (async () => {
            for (let i = 0; i < 20; i++) {
              const isDisabled = await loadingButton.isDisabled().catch(() => false);
              if (isDisabled) return true;
              await page.waitForTimeout(100);
            }
            return false;
          })(),
        ]).catch(() => false);

        // Loading state should appear (either disabled button or loading text)
        expect(hasLoadingState).toBe(true);
      } finally {
        // Cleanup is handled by afterEach hook, but also cleanup here as backup
        await cleanupTestData(testData.jobIds, testData.tenderIds, testData.companyIds, testData.userEmails);
      }
    });

    test('should allow canceling form submission', async ({ page }) => {
      try {
        // Create unique users for this test to avoid race conditions
        const { contractor, manager } = await createUniqueTestUsers();
        testData.userEmails.push(contractor.email, manager.email);
        testData.companyIds.push(contractor.company.id, manager.company.id);

        const testJob = await createTestJob(manager.user.id, manager.company.id, {
          title: `Test Job ${Date.now()}-${Math.random().toString(36).substring(7)}`,
        });
        testData.jobIds.push(testJob.id);

        // Login as contractor
        await loginViaUI(page, contractor.email, contractor.password);

        // Navigate to job page with error handling for interrupted navigation
        try {
          await page.goto(`/konkurs/${testJob.id}`, { waitUntil: 'domcontentloaded', timeout: 10000 });
          await page.waitForLoadState('networkidle');
        } catch (error: unknown) {
          // Retry navigation if interrupted (NS_BINDING_ABORTED or redirected)
          if (error instanceof Error && (error.message?.includes('NS_BINDING_ABORTED') || 
              error.message?.includes('interrupted') ||
              error.message?.includes('interrupted by another navigation'))) {
            // Wait for any redirect to complete
            await page.waitForURL((url) => !url.pathname.includes('/konkurs/') || url.pathname.includes(`/konkurs/${testJob.id}`), { timeout: 2000 }).catch(() => {});
            await page.waitForTimeout(1000); // Additional wait for cleanup/redirect to complete
            // Check if we're already on the correct page
            if (page.url().includes(`/konkurs/${testJob.id}`)) {
              await page.waitForLoadState('networkidle');
            } else {
              // Retry navigation
              await page.goto(`/konkurs/${testJob.id}`, { waitUntil: 'domcontentloaded', timeout: 10000 });
              await page.waitForLoadState('networkidle');
            }
          } else {
            throw error;
          }
        }

        // Click "Złóż ofertę" button
        await page.getByRole('button', { name: /złóż ofertę/i }).click();

        // Wait for form modal
        await expect(page.getByRole('dialog')).toBeVisible();

        // Fill some fields
        await page.getByRole('dialog').locator('#netPrice').fill('15000');

        // Click cancel button
        await page.getByRole('button', { name: /anuluj/i }).click();

        // Form should close
        await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 5000 });
      } finally {
        // Cleanup is handled by afterEach hook, but also cleanup here as backup
        await cleanupTestData(testData.jobIds, testData.tenderIds, testData.companyIds, testData.userEmails);
      }
    });
  });

  test.describe('Contest offer wizard (OPD-66)', () => {
    async function gotoJobPage(
      page: import('@playwright/test').Page,
      jobId: string,
    ): Promise<void> {
      await page.goto(`/konkurs/${jobId}`, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await page.waitForLoadState('networkidle');
    }

    async function advanceContestWizardToFinancial(
      page: import('@playwright/test').Page,
    ): Promise<void> {
      const dialog = page.getByRole('dialog');
      await expect(dialog.getByText(/składasz ofertę w konkursie/i)).toBeVisible();
      await dialog.getByRole('button', { name: 'Dalej' }).click();
      const completion = new Date();
      completion.setMonth(completion.getMonth() + 2);
      await dialog.locator('#proposedCompletionDate').fill(completion.toISOString().slice(0, 10));
      await dialog.getByRole('button', { name: 'Dalej' }).click();
      await dialog.getByRole('button', { name: 'Dalej' }).click();
    }

    test('should open contest wizard and submit offer', async ({ page }) => {
      try {
        const { contractor, manager } = await createUniqueTestUsers();
        testData.userEmails.push(contractor.email, manager.email);
        testData.companyIds.push(contractor.company.id, manager.company.id);

        const contest = await createTestContestTender(manager.user.id, manager.company.id);
        testData.tenderIds.push(contest.id);

        await loginViaUI(page, contractor.email, contractor.password);
        await gotoJobPage(page, contest.id);

        await page.getByRole('button', { name: /złóż ofertę/i }).click();
        await advanceContestWizardToFinancial(page);

        const dialog = page.getByRole('dialog');
        await dialog.locator('#netPrice').fill('12000');
        const combos = dialog.getByRole('combobox');
        await combos.nth(1).click();
        await page.getByRole('option').first().click();
        await combos.nth(2).click();
        await page.getByRole('option').first().click();

        await dialog.getByRole('button', { name: /^wyślij ofertę$/i }).click();

        await expect(
          page.locator('[data-sonner-toast]').filter({ hasText: /oferta wysłana/i }).first(),
        ).toBeVisible({ timeout: 20000 });
      } finally {
        await cleanupTestData(testData.jobIds, testData.tenderIds, testData.companyIds, testData.userEmails);
      }
    });

    test('should save draft and resume via Kontynuuj szkic', async ({ page }) => {
      try {
        const { contractor, manager } = await createUniqueTestUsers();
        testData.userEmails.push(contractor.email, manager.email);
        testData.companyIds.push(contractor.company.id, manager.company.id);

        const contest = await createTestContestTender(manager.user.id, manager.company.id, {
          title: `Draft Contest ${Date.now()}`,
        });
        testData.tenderIds.push(contest.id);

        await loginViaUI(page, contractor.email, contractor.password);
        await gotoJobPage(page, contest.id);

        await page.getByRole('button', { name: /złóż ofertę/i }).click();
        const dialog = page.getByRole('dialog');
        await expect(dialog.getByText(/składasz ofertę w konkursie/i)).toBeVisible();
        await dialog.getByRole('button', { name: 'Dalej' }).click();
        const completion = new Date();
        completion.setMonth(completion.getMonth() + 1);
        await dialog.locator('#proposedCompletionDate').fill(completion.toISOString().slice(0, 10));
        await dialog.getByRole('button', { name: /zapisz jako szkic/i }).click();
        await expect(
          page.locator('[data-sonner-toast]').filter({ hasText: /szkic oferty został zapisany/i }).first(),
        ).toBeVisible({ timeout: 15000 });
        await dialog.getByRole('button', { name: /close/i }).click().catch(() => undefined);
        await page.keyboard.press('Escape');

        await page.reload({ waitUntil: 'networkidle' });
        await page.getByRole('button', { name: /kontynuuj szkic oferty/i }).click();
        await expect(dialog.getByText(/składasz ofertę w konkursie/i)).toBeVisible();
        await expect(dialog.locator('#proposedCompletionDate')).toHaveValue(completion.toISOString().slice(0, 10));
      } finally {
        await cleanupTestData(testData.jobIds, testData.tenderIds, testData.companyIds, testData.userEmails);
      }
    });

    test('legacy tender still uses JobApplicationModal', async ({ page }) => {
      try {
        const { contractor, manager } = await createUniqueTestUsers();
        testData.userEmails.push(contractor.email, manager.email);
        testData.companyIds.push(contractor.company.id, manager.company.id);

        const legacyTender = await createTestTender(manager.user.id, manager.company.id, {
          title: `Legacy Tender ${Date.now()}`,
        });
        testData.tenderIds.push(legacyTender.id);

        await loginViaUI(page, contractor.email, contractor.password);
        await gotoJobPage(page, legacyTender.id);

        await page.getByRole('button', { name: /złóż ofertę/i }).click();
        await expect(page.getByText(/złóż ofertę w przetargu/i)).toBeVisible();
        await expect(page.getByText(/składasz ofertę w konkursie/i)).not.toBeVisible();
      } finally {
        await cleanupTestData(testData.jobIds, testData.tenderIds, testData.companyIds, testData.userEmails);
      }
    });
  });
});

