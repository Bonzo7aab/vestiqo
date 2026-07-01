import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../types/database';
import { syncUserFinanceFromNip } from '../auth/sync-user-finance-from-nip';
import { verifyCompanyByNip } from './verify-by-nip';

export interface SyncRegistryFromNipInput {
  userId: string;
  companyId: string;
  normalizedNip: string;
}

export interface SyncRegistryFromNipResult {
  ok: boolean;
  error?: string;
}

/**
 * Fetches CEIDG/KRS + MF data and persists registry columns on company and finance settings.
 */
export async function syncRegistryFromNip(
  client: SupabaseClient<Database>,
  input: SyncRegistryFromNipInput,
): Promise<SyncRegistryFromNipResult> {
  const verification = await verifyCompanyByNip(input.normalizedNip);
  if (!verification) {
    return { ok: false, error: 'Nieprawidłowy numer NIP' };
  }

  const companyUpdate: Database['public']['Tables']['companies']['Update'] = {
    legal_form: verification.legalForm,
    registry_source: verification.registrySource,
    registry_status: verification.registryStatus,
    registry_checked_at: verification.checkedAt,
    updated_at: verification.checkedAt,
  };

  if (verification.krs) {
    companyUpdate.krs = verification.krs;
  }

  const { error: companyError } = await client
    .from('companies')
    .update(companyUpdate)
    .eq('id', input.companyId);

  if (companyError) {
    console.error('syncRegistryFromNip company update failed:', companyError);
    return { ok: false, error: 'Nie udało się zapisać danych rejestrowych firmy' };
  }

  await syncUserFinanceFromNip(client, {
    userId: input.userId,
    normalizedNip: input.normalizedNip,
    refetchFromMf: true,
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = client as any;
  const { error: financeRegistryError } = await sb
    .from('contractor_account_settings')
    .update({
      finance_registry_status: verification.financeRegistryStatus,
      finance_registry_checked_at: verification.checkedAt,
      updated_at: verification.checkedAt,
    })
    .eq('user_id', input.userId);

  if (financeRegistryError) {
    console.error('syncRegistryFromNip finance registry update failed:', financeRegistryError);
  }

  return { ok: true };
}

const REGISTRY_REFRESH_MS = 24 * 60 * 60 * 1000;

export function shouldRefreshRegistry(checkedAt: string | null | undefined): boolean {
  if (!checkedAt) {
    return true;
  }
  const checkedMs = Date.parse(checkedAt);
  if (Number.isNaN(checkedMs)) {
    return true;
  }
  return Date.now() - checkedMs > REGISTRY_REFRESH_MS;
}
