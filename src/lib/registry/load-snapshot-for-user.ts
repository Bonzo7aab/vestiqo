import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../types/database';
import { fetchUserPrimaryCompany } from '../database/companies';
import { buildCompanyRegistrySnapshot, isUserRegistryVerified } from './build-snapshot-from-rows';
import type { CompanyRegistrySnapshot } from './types';

export async function loadCompanyRegistrySnapshotForUser(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<CompanyRegistrySnapshot | null> {
  const { data: company } = await fetchUserPrimaryCompany(supabase, userId);
  if (!company) {
    return null;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;
  const { data: settings } = await sb
    .from('contractor_account_settings')
    .select(
      'vat_status, vat_whitelist_account_assigned, finance_registry_status, finance_registry_checked_at',
    )
    .eq('user_id', userId)
    .maybeSingle();

  return buildCompanyRegistrySnapshot(company, settings);
}

export async function getRegistryVerifiedForUser(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<boolean> {
  const { data: company } = await fetchUserPrimaryCompany(supabase, userId);
  if (!company) {
    return false;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;
  const { data: settings } = await sb
    .from('contractor_account_settings')
    .select(
      'vat_status, vat_whitelist_account_assigned, finance_registry_status, finance_registry_checked_at',
    )
    .eq('user_id', userId)
    .maybeSingle();

  return isUserRegistryVerified(company, settings);
}
