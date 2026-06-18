import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../types/database';
import type { ContractorVatStatus } from '../contractor/constants';
import { normalizeIbanInput, isValidPolishIban } from '../contractor/iban';
import { fetchMfDataByNip } from '../mf-vat-whitelist/search-by-nip';

export interface SyncUserFinanceResult {
  bankAccountIban: string | null;
  vatStatus: ContractorVatStatus | null;
  vatWhitelistAccountAssigned: boolean | null;
  vatWhitelistCheckedForDate: string | null;
  persisted: boolean;
  error?: string;
}

interface SyncUserFinanceFromNipInput {
  userId: string;
  normalizedNip: string;
  bankAccountIban?: string | null;
  vatStatus?: ContractorVatStatus | null;
  /** When true, always load bank/VAT from the MF API for this NIP (registration backfill). */
  refetchFromMf?: boolean;
}

const DEFAULT_CHANNELS = { email: true, app: true, phoneCall: false, sms: false };
const DEFAULT_RADAR = { enabled: true, minAmountNet: 1000, areas: ['Warszawa'] };

function parseVatStatus(value: unknown): ContractorVatStatus | null {
  if (value === 'active_vat' || value === 'vat_exempt') {
    return value;
  }
  return null;
}

/**
 * Persists MF/GUS bank account and VAT status on contractor_account_settings.
 */
export async function syncUserFinanceFromNip(
  client: SupabaseClient<Database>,
  input: SyncUserFinanceFromNipInput,
): Promise<SyncUserFinanceResult> {
  let bankAccountIban = input.bankAccountIban ?? null;
  let vatStatus = input.vatStatus ?? null;

  if (input.refetchFromMf) {
    const mfData = await fetchMfDataByNip(input.normalizedNip);
    bankAccountIban = mfData.bankAccountIban ?? bankAccountIban;
    vatStatus = mfData.vatStatus ?? vatStatus;
  } else if (!bankAccountIban || !vatStatus) {
    const mfData = await fetchMfDataByNip(input.normalizedNip);
    if (!bankAccountIban && mfData.bankAccountIban) {
      bankAccountIban = mfData.bankAccountIban;
    }
    if (!vatStatus && mfData.vatStatus) {
      vatStatus = mfData.vatStatus;
    }
  }

  const normalizedBankAccount = bankAccountIban ? normalizeIbanInput(bankAccountIban) : null;
  const validBankAccount =
    normalizedBankAccount !== null && isValidPolishIban(normalizedBankAccount);

  const emptyResult: SyncUserFinanceResult = {
    bankAccountIban: validBankAccount ? normalizedBankAccount : null,
    vatStatus,
    vatWhitelistAccountAssigned: null,
    vatWhitelistCheckedForDate: null,
    persisted: false,
  };

  if (!validBankAccount && !vatStatus) {
    return emptyResult;
  }

  const settingsRow: Record<string, unknown> = {
    user_id: input.userId,
    notification_channels: DEFAULT_CHANNELS,
    radar_settings: DEFAULT_RADAR,
  };

  if (validBankAccount && normalizedBankAccount) {
    settingsRow.bank_account_iban = normalizedBankAccount;
  }

  if (vatStatus) {
    settingsRow.vat_status = vatStatus;
  }

  let vatWhitelistAccountAssigned: boolean | null = null;
  let vatWhitelistCheckedForDate: string | null = null;

  if (validBankAccount && normalizedBankAccount) {
    try {
      const { checkBankAccountOnVatWhitelist } = await import('../mf-vat-whitelist/check-bank-account');
      const vatResult = await checkBankAccountOnVatWhitelist(
        input.normalizedNip,
        normalizedBankAccount,
      );
      const verifiedAt = new Date().toISOString();
      vatWhitelistAccountAssigned = vatResult.assigned;
      vatWhitelistCheckedForDate = vatResult.checkedForDate;
      Object.assign(settingsRow, {
        vat_whitelist_verified_at: verifiedAt,
        vat_whitelist_account_assigned: vatResult.assigned,
        vat_whitelist_request_id: vatResult.requestId,
        vat_whitelist_checked_for_date: vatResult.checkedForDate,
        updated_at: verifiedAt,
      });
    } catch (vatError) {
      console.error('VAT whitelist check during finance sync failed:', vatError);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = client as any;

  const { data: existing } = await sb
    .from('contractor_account_settings')
    .select('user_id')
    .eq('user_id', input.userId)
    .maybeSingle();

  const writePayload = existing
    ? settingsRow
    : {
        ...settingsRow,
        notification_channels: DEFAULT_CHANNELS,
        radar_settings: DEFAULT_RADAR,
      };

  const mutation = existing
    ? sb.from('contractor_account_settings').update(writePayload).eq('user_id', input.userId)
    : sb.from('contractor_account_settings').insert(writePayload);

  const { error } = await mutation;

  if (error) {
    console.error('contractor_account_settings write during finance sync failed:', error);
    return {
      ...emptyResult,
      error: error.message,
    };
  }

  const { data: saved, error: readError } = await sb
    .from('contractor_account_settings')
    .select(
      'bank_account_iban, vat_status, vat_whitelist_account_assigned, vat_whitelist_checked_for_date',
    )
    .eq('user_id', input.userId)
    .maybeSingle();

  if (readError) {
    return {
      bankAccountIban: validBankAccount ? normalizedBankAccount : null,
      vatStatus,
      vatWhitelistAccountAssigned,
      vatWhitelistCheckedForDate,
      persisted: true,
    };
  }

  const savedBank =
    typeof saved?.bank_account_iban === 'string'
      ? normalizeIbanInput(saved.bank_account_iban) || null
      : validBankAccount
        ? normalizedBankAccount
        : null;

  return {
    bankAccountIban: savedBank,
    vatStatus: parseVatStatus(saved?.vat_status) ?? vatStatus,
    vatWhitelistAccountAssigned:
      typeof saved?.vat_whitelist_account_assigned === 'boolean'
        ? saved.vat_whitelist_account_assigned
        : vatWhitelistAccountAssigned,
    vatWhitelistCheckedForDate:
      typeof saved?.vat_whitelist_checked_for_date === 'string'
        ? saved.vat_whitelist_checked_for_date
        : vatWhitelistCheckedForDate,
    persisted: true,
  };
}
