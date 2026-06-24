import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { expect, type Page } from '@playwright/test';
import type { Database } from '../../src/types/database';
import type { ContestMockData } from '../fixtures/contest-mock-data';
import { ROUTES } from '../config/constants';
import { resolveSupabaseEnvForApp } from './supabase-env';

export const SAMPLE_CONTEST_DOC_PATH = path.join(
  __dirname,
  '../fixtures/sample-contest-doc.pdf',
);

export function formatDatetimeLocal(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function formatDateInput(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

async function selectFirstRadixOption(page: Page, triggerId: string): Promise<boolean> {
  const trigger = page.locator(`#${triggerId}`);
  const isVisible = await trigger.isVisible().catch(() => false);
  if (!isVisible) {
    return false;
  }

  await trigger.click();
  const firstOption = page.locator('[role="option"]').first();
  await expect(firstOption).toBeVisible({ timeout: 10000 });
  await firstOption.click();
  return true;
}

export async function fillContestForm(page: Page, mockData: ContestMockData): Promise<void> {
  await expect(page.locator('#contest-title')).toBeVisible({ timeout: 20000 });

  await page.locator('#contest-title').fill(mockData.title);
  await page.locator('#contest-desc').fill(mockData.description);

  const categoryTrigger = page.locator('#contest-category');
  await expect(categoryTrigger).toBeEnabled({ timeout: 20000 });

  await selectFirstRadixOption(page, 'contest-managed-entity');

  await categoryTrigger.click();
  const firstCategory = page.locator('[role="option"]').first();
  await expect(firstCategory).toBeVisible({ timeout: 10000 });
  await firstCategory.click();

  const subcategoryTrigger = page.locator('#contest-subcategory');
  await expect(subcategoryTrigger).toBeEnabled({ timeout: 10000 });
  await subcategoryTrigger.click();
  const firstSubcategory = page.locator('[role="option"]').first();
  await expect(firstSubcategory).toBeVisible({ timeout: 10000 });
  await firstSubcategory.click();

  await page
    .locator('#contest-documents input[type="file"]')
    .setInputFiles(SAMPLE_CONTEST_DOC_PATH);

  await expect(
    page.getByRole('listitem').filter({ hasText: 'sample-contest-doc.pdf' }),
  ).toBeVisible({ timeout: 10000 });

  await page.locator('#submission-deadline').fill(formatDatetimeLocal(mockData.submissionDeadline));
  await page.locator('#evaluation-deadline').fill(formatDateInput(mockData.evaluationDeadline));
}

export async function publishContest(page: Page): Promise<void> {
  const publishButton = page.getByRole('button', { name: /opublikuj konkurs/i });
  await publishButton.scrollIntoViewIfNeeded();
  await publishButton.click();
  await page.waitForURL((url) => url.pathname.includes(ROUTES.managerKonkursy), {
    timeout: 90000,
  });
}

export async function expectContestInList(page: Page, title: string): Promise<void> {
  await expect(page.getByRole('link', { name: title, exact: true })).toBeVisible({
    timeout: 15000,
  });
}

export async function extractContestIdFromKonkursyList(
  page: Page,
  title: string,
): Promise<string | null> {
  const href = await page.getByRole('link', { name: title, exact: true }).getAttribute('href');
  return href?.match(/\/jobs\/([^/?#]+)/)?.[1] ?? null;
}

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

export async function findContestTenderIdByTitle(title: string): Promise<string | null> {
  const adminClient = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (adminClient as any)
    .from('contests')
    .select('id')
    .eq('title', title)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.warn(`Failed to find contest tender for cleanup: ${error.message}`);
    return null;
  }

  return data?.id ?? null;
}

export async function deleteContestTender(tenderId: string): Promise<void> {
  const adminClient = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (adminClient as any).from('contests').delete().eq('id', tenderId);

  if (error) {
    console.warn(`Failed to delete contest tender ${tenderId}: ${error.message}`);
    return;
  }
}
