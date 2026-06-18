'use server';

import { createClient } from '../supabase/server';
import { fetchUserPrimaryCompany } from '../database/companies';
import { normalizeIbanInput, isValidPolishIban } from '../contractor/iban';
import { normalizeNip, isValidNip } from '../gus/nip';
import { checkBankAccountOnVatWhitelist } from './check-bank-account';
import type { VerifyContractorBankAccountResult } from './types';
import { syncUserFinanceFromNip, type SyncUserFinanceResult } from '../auth/sync-user-finance-from-nip';
import type { ContractorVatStatus } from '../contractor/constants';

function parseStoredVatStatus(value: unknown): ContractorVatStatus | null {
  if (value === 'active_vat' || value === 'vat_exempt') {
    return value;
  }
  return null;
}

export interface UserFinanceSettings {
  bankAccountIban: string | null;
  vatStatus: ContractorVatStatus | null;
  vatWhitelistAccountAssigned: boolean | null;
  vatWhitelistCheckedForDate: string | null;
}

export async function getUserFinanceSettingsAction(): Promise<
  { data: UserFinanceSettings } | { error: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: 'Musisz być zalogowany' };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('contractor_account_settings')
    .select('bank_account_iban, vat_status')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) {
    return { error: error.message };
  }

  const bankRaw = typeof data?.bank_account_iban === 'string' ? data.bank_account_iban : null;
  const bankAccountIban = bankRaw ? normalizeIbanInput(bankRaw) || null : null;

  let vatWhitelistAccountAssigned: boolean | null = null;
  let vatWhitelistCheckedForDate: string | null = null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: whitelistData, error: whitelistError } = await (supabase as any)
    .from('contractor_account_settings')
    .select('vat_whitelist_account_assigned, vat_whitelist_checked_for_date')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!whitelistError && whitelistData) {
    vatWhitelistAccountAssigned =
      typeof whitelistData.vat_whitelist_account_assigned === 'boolean'
        ? whitelistData.vat_whitelist_account_assigned
        : null;
    vatWhitelistCheckedForDate =
      typeof whitelistData.vat_whitelist_checked_for_date === 'string'
        ? whitelistData.vat_whitelist_checked_for_date
        : null;
  }

  return {
    data: {
      bankAccountIban,
      vatStatus: parseStoredVatStatus(data?.vat_status),
      vatWhitelistAccountAssigned,
      vatWhitelistCheckedForDate,
    },
  };
}

async function persistVatWhitelistVerification(
  userId: string,
  bankAccount: string,
  result: Awaited<ReturnType<typeof checkBankAccountOnVatWhitelist>>,
): Promise<void> {
  const supabase = await createClient();
  const verifiedAt = new Date().toISOString();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = supabase as any;
  const patch = {
    bank_account_iban: bankAccount,
    vat_whitelist_verified_at: verifiedAt,
    vat_whitelist_account_assigned: result.assigned,
    vat_whitelist_request_id: result.requestId,
    vat_whitelist_checked_for_date: result.checkedForDate,
    updated_at: verifiedAt,
  };

  const { data: existing } = await client
    .from('contractor_account_settings')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle();

  if (existing) {
    const { error } = await client.from('contractor_account_settings').update(patch).eq('user_id', userId);
    if (error) {
      console.error('persistVatWhitelistVerification update failed:', error);
    }
    return;
  }

  const { error } = await client.from('contractor_account_settings').insert({
    user_id: userId,
    notification_channels: { email: true, app: true, phoneCall: false, sms: false },
    radar_settings: { enabled: true, minAmountNet: 1000, areas: ['Warszawa'] },
    ...patch,
  });

  if (error) {
    console.error('persistVatWhitelistVerification insert failed:', error);
  }
}

export async function verifyContractorBankAccountAction(
  bankAccountInput: string,
): Promise<VerifyContractorBankAccountResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Musisz być zalogowany' };
  }

  const bankAccount = normalizeIbanInput(bankAccountInput);
  if (!bankAccount) {
    return { error: 'Podaj numer konta bankowego' };
  }

  if (!isValidPolishIban(bankAccount)) {
    return { error: 'Numer konta bankowego musi składać się z 26 cyfr' };
  }

  const { data: company, error: companyError } = await fetchUserPrimaryCompany(supabase, user.id);
  if (companyError) {
    console.error('verifyContractorBankAccountAction company lookup failed:', companyError);
    return { error: 'Nie udało się pobrać danych firmy' };
  }

  const nip = company?.nip ? normalizeNip(company.nip) : '';
  if (!nip) {
    return { error: 'Uzupełnij NIP firmy w profilu, aby zweryfikować konto na białej liście VAT' };
  }

  try {
    const result = await checkBankAccountOnVatWhitelist(nip, bankAccount);
    await persistVatWhitelistVerification(user.id, bankAccount, result);
    return { data: result };
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'INVALID_NIP') {
        return { error: 'Nieprawidłowy NIP firmy — popraw dane w profilu' };
      }
      if (error.message === 'INVALID_BANK_ACCOUNT') {
        return { error: 'Nieprawidłowy numer konta bankowego' };
      }
      if (error.message.startsWith('MF_API_HTTP_')) {
        return { error: 'Usługa weryfikacji MF jest tymczasowo niedostępna. Spróbuj ponownie później.' };
      }
    }

    console.error('verifyContractorBankAccountAction failed:', error);
    return { error: 'Nie udało się zweryfikować konta na białej liście VAT' };
  }
}

export type EnsureUserFinanceFromCompanyNipResult =
  | { data: SyncUserFinanceResult }
  | { skipped: true }
  | { error: string };

/**
 * Backfills bank account and VAT status from MF (GUS registration enrichment)
 * when the profile is missing finance fields but the company has a valid NIP.
 */
export async function ensureUserFinanceFromCompanyNipAction(): Promise<EnsureUserFinanceFromCompanyNipResult> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: 'Musisz być zalogowany' };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existing, error: settingsError } = await (supabase as any)
    .from('contractor_account_settings')
    .select('bank_account_iban, vat_status')
    .eq('user_id', user.id)
    .maybeSingle();

  if (settingsError) {
    console.error('ensureUserFinanceFromCompanyNipAction settings read failed:', settingsError);
  }

  const existingBank =
    typeof existing?.bank_account_iban === 'string' ? existing.bank_account_iban : null;
  const existingVat =
    existing?.vat_status === 'active_vat' || existing?.vat_status === 'vat_exempt'
      ? existing.vat_status
      : null;

  if (existingBank && existingVat) {
    return { skipped: true };
  }

  const { data: company, error: companyError } = await fetchUserPrimaryCompany(supabase, user.id);
  if (companyError) {
    console.error('ensureUserFinanceFromCompanyNipAction company lookup failed:', companyError);
    return { error: 'Nie udało się pobrać danych firmy' };
  }

  const nip = company?.nip ? normalizeNip(company.nip) : '';
  if (!isValidNip(nip)) {
    return { skipped: true };
  }

  const data = await syncUserFinanceFromNip(supabase, {
    userId: user.id,
    normalizedNip: nip,
    bankAccountIban: existingBank,
    vatStatus: existingVat,
    refetchFromMf: true,
  });

  return { data };
}
