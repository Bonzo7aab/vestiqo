import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../types/database';
import type { ContractorVatStatus } from '../contractor/constants';
import { syncUserFinanceFromNip, type SyncUserFinanceResult } from './sync-user-finance-from-nip';

interface PersistRegistrationFinanceSettingsInput {
  userId: string;
  normalizedNip: string;
  bankAccountIban: string | null;
  vatStatus: ContractorVatStatus | null;
}

/**
 * Stores MF/GUS finance fields on the user's account settings row at registration time.
 */
export async function persistRegistrationFinanceSettings(
  admin: SupabaseClient<Database>,
  input: PersistRegistrationFinanceSettingsInput,
): Promise<SyncUserFinanceResult> {
  return syncUserFinanceFromNip(admin, {
    userId: input.userId,
    normalizedNip: input.normalizedNip,
    bankAccountIban: input.bankAccountIban,
    vatStatus: input.vatStatus,
    refetchFromMf: true,
  });
}
