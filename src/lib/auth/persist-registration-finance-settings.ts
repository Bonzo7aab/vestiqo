import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../types/database';
import type { ContractorVatStatus } from '../contractor/constants';

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
): Promise<void> {
  const { normalizeIbanInput, isValidPolishIban } = await import('../contractor/iban');
  const normalizedBankAccount = input.bankAccountIban
    ? normalizeIbanInput(input.bankAccountIban)
    : null;
  const validBankAccount =
    normalizedBankAccount !== null && isValidPolishIban(normalizedBankAccount);

  if (!validBankAccount && !input.vatStatus) {
    return;
  }

  const settingsRow: Record<string, unknown> = {
    user_id: input.userId,
    notification_channels: { email: true, app: true, phoneCall: false, sms: false },
    radar_settings: { enabled: true, minAmountNet: 1000, areas: ['Warszawa'] },
  };

  if (validBankAccount && normalizedBankAccount) {
    settingsRow.bank_account_iban = normalizedBankAccount;
  }

  if (input.vatStatus) {
    settingsRow.vat_status = input.vatStatus;
  }

  if (validBankAccount && normalizedBankAccount) {
    try {
      const { checkBankAccountOnVatWhitelist } = await import('../mf-vat-whitelist/check-bank-account');
      const vatResult = await checkBankAccountOnVatWhitelist(
        input.normalizedNip,
        normalizedBankAccount,
      );
      const verifiedAt = new Date().toISOString();
      Object.assign(settingsRow, {
        vat_whitelist_verified_at: verifiedAt,
        vat_whitelist_account_assigned: vatResult.assigned,
        vat_whitelist_request_id: vatResult.requestId,
        vat_whitelist_checked_for_date: vatResult.checkedForDate,
        updated_at: verifiedAt,
      });
    } catch (vatError) {
      console.error('VAT whitelist check during registration failed:', vatError);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin as any)
    .from('contractor_account_settings')
    .upsert(settingsRow, { onConflict: 'user_id' });

  if (error) {
    console.error('contractor_account_settings upsert at registration failed:', error);
  }
}
