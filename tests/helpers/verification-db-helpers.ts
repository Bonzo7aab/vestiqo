import { createClient } from '@supabase/supabase-js';
import { expect } from '@playwright/test';
import type { Database } from '../../src/types/database';
import { resolveSupabaseEnvForApp } from './supabase-env';

export interface SeededUserProfile {
  userId: string;
  firstName: string;
  lastName: string;
  companyName: string | null;
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

async function getUserIdByEmail(email: string, password: string): Promise<string> {
  const { url, publishableKey } = resolveSupabaseEnvForApp();

  if (!url || !publishableKey) {
    throw new Error('Missing Supabase URL or publishable key for user lookup');
  }

  const authClient = createClient<Database>(url, publishableKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const { data, error } = await authClient.auth.signInWithPassword({ email, password });

  if (error || !data.user?.id) {
    throw new Error(`Failed to sign in as ${email}: ${error?.message ?? 'no user returned'}`);
  }

  return data.user.id;
}

export async function getSeededUserProfile(
  email: string,
  password: string,
): Promise<SeededUserProfile> {
  const adminClient = createAdminClient();
  const userId = await getUserIdByEmail(email, password);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile, error } = await (adminClient as any)
    .from('user_profiles')
    .select(
      `
      id,
      first_name,
      last_name,
      user_companies (
        is_primary,
        companies ( name )
      )
    `,
    )
    .eq('id', userId)
    .single();

  if (error || !profile) {
    throw new Error(`Failed to load profile for ${email}: ${error?.message ?? 'not found'}`);
  }

  const companies = profile.user_companies as
    | Array<{ is_primary: boolean | null; companies: { name: string | null } | null }>
    | null
    | undefined;

  const primaryCompany = companies?.find((relation) => relation.is_primary) ?? companies?.[0];

  return {
    userId: profile.id,
    firstName: profile.first_name ?? '',
    lastName: profile.last_name ?? '',
    companyName: primaryCompany?.companies?.name ?? null,
  };
}

export async function resetContractorVerificationForE2E(
  email: string,
  password: string,
): Promise<void> {
  const adminClient = createAdminClient();
  const userId = await getUserIdByEmail(email, password);

  const { error: profileError } = await adminClient
    .from('user_profiles')
    .update({
      verification_document_paths: {},
      verification_submitted_at: null,
      is_verified: false,
    })
    .eq('id', userId);

  if (profileError) {
    throw new Error(`Failed to reset verification profile: ${profileError.message}`);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: settingsError } = await (adminClient as any)
    .from('contractor_account_settings')
    .update({ oc_policy_scan_path: null })
    .eq('user_id', userId);

  if (settingsError) {
    throw new Error(`Failed to reset contractor OC settings: ${settingsError.message}`);
  }
}

export async function assertContractorInAdminPendingQueue(
  email: string,
  password: string,
  displayName: string,
): Promise<void> {
  const adminClient = createAdminClient();
  const profile = await getSeededUserProfile(email, password);

  const { data: row, error } = await adminClient
    .from('user_profiles')
    .select('verification_submitted_at, is_verified, verification_document_paths')
    .eq('id', profile.userId)
    .single();

  if (error || !row) {
    throw new Error(`Failed to read verification state: ${error?.message ?? 'not found'}`);
  }

  expect(row.verification_submitted_at).toBeTruthy();
  expect(row.is_verified).toBe(false);

  const paths = (row.verification_document_paths as Record<string, string> | null) ?? {};
  expect(paths.insurance).toBeTruthy();

  const { data: queueProfile, error: queueError } = await adminClient
    .from('user_profiles')
    .select('id, first_name, last_name, user_type, is_verified, verification_submitted_at')
    .eq('id', profile.userId)
    .eq('user_type', 'contractor')
    .eq('is_verified', false)
    .single();

  expect(queueError, 'Expected contractor in admin pending queue').toBeNull();
  expect(queueProfile).toBeTruthy();
  expect(`${queueProfile?.first_name} ${queueProfile?.last_name}`).toBe(displayName);
}
