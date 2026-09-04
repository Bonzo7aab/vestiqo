import { expect, type Page } from '@playwright/test';
import type { VerificationMockFiles } from '../fixtures/verification-mock-documents';
import { ROUTES } from '../config/constants';

const DOC_LABELS = {
  insurance: 'Polisa OC',
} as const;

export async function openContractorDocumentsTab(page: Page): Promise<void> {
  await page.goto(ROUTES.contractorVerificationDocuments, { waitUntil: 'domcontentloaded' });

  const documentsTab = page.getByRole('button', { name: /^Dokumenty/i });
  await expect(documentsTab).toBeVisible({ timeout: 20000 });
  await documentsTab.click();

  await expect(
    page.getByText(/Polisa OC|Dokumenty do weryfikacji|Weryfikacja konta|Oczekujemy na decyzję moderatora/i).first(),
  ).toBeVisible({ timeout: 20000 });
}

async function expandVerificationSection(page: Page, heading: string | RegExp): Promise<void> {
  const trigger = page.locator('button').filter({ hasText: heading }).first();
  await expect(trigger).toBeVisible({ timeout: 20000 });

  const isOpen = await trigger.evaluate(
    (element) => element.getAttribute('data-state') === 'open',
  );

  if (!isOpen) {
    await trigger.click();
    await expect(trigger).toHaveAttribute('data-state', 'open', { timeout: 5000 });
  }
}

async function uploadVerificationDocument(
  page: Page,
  sectionHeading: string | RegExp,
  fileLabel: string,
  filePath: string,
): Promise<void> {
  await expandVerificationSection(page, sectionHeading);

  const section = page.locator('section').filter({ hasText: `Plik — ${fileLabel}` }).first();
  const fileInput = section.locator('input[type="file"]');

  await expect(fileInput).toBeAttached({ timeout: 10000 });
  await fileInput.setInputFiles(filePath);
}

async function fillOcPolicyDetails(page: Page): Promise<void> {
  await expandVerificationSection(page, /Polisa OC/i);

  await page.locator('#oc-valid-until-verification').fill('2030-12-31');
  await page.locator('#oc-guarantee-amount').fill('200000');

  const saveOcButton = page.getByRole('button', { name: /Zapisz dane OC/i });
  await saveOcButton.scrollIntoViewIfNeeded();
  await saveOcButton.click();
  await expect(page.getByText('Dane polisy OC zapisane')).toBeVisible({ timeout: 15000 });
}

export async function fillVerificationForm(
  page: Page,
  files: VerificationMockFiles,
): Promise<void> {
  await openContractorDocumentsTab(page);

  await fillOcPolicyDetails(page);

  await uploadVerificationDocument(
    page,
    /Polisa OC/i,
    DOC_LABELS.insurance,
    files.insurance,
  );
  await expect(page.getByText('Skan polisy OC zapisany w profilu')).toBeVisible({
    timeout: 20000,
  });
}

export async function submitVerificationDocuments(page: Page): Promise<void> {
  await expect(page.getByText('Skan polisy OC zapisany w profilu')).toBeVisible({
    timeout: 15000,
  });
}
