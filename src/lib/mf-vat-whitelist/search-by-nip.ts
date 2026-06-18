import 'server-only';

import type { ContractorVatStatus } from '../contractor/constants';
import { normalizeIbanInput, isValidPolishIban } from '../contractor/iban';
import { normalizeNip, isValidNip } from '../gus/nip';
import { getVatWhitelistCheckDate } from './date';
import { mapMfStatusVatToContractorVatStatus } from './map-status-vat';

const MF_API_BASE = 'https://wl-api.mf.gov.pl/api';

export interface MfNipSearchResult {
  bankAccountIban: string | null;
  vatStatus: ContractorVatStatus | null;
}

interface MfEntitySearchResponse {
  result?: {
    subject?: {
      accountNumbers?: string[];
      statusVat?: string;
    };
  };
}

async function fetchMfJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: { Accept: 'application/json' },
    next: { revalidate: 0 },
  });

  if (!response.ok) {
    throw new Error(`MF_API_HTTP_${response.status}`);
  }

  return (await response.json()) as T;
}

function extractPrimaryBankAccount(accounts: string[] | undefined): string | null {
  if (!accounts?.length) {
    return null;
  }

  for (const raw of accounts) {
    const normalized = normalizeIbanInput(raw);
    if (isValidPolishIban(normalized)) {
      return normalized;
    }
  }

  return null;
}

/**
 * Fetches bank account and VAT status for a NIP from the MF VAT whitelist.
 * Best-effort: returns null fields when not found or MF is unavailable.
 */
export async function fetchMfDataByNip(
  nipInput: string,
  checkDate = getVatWhitelistCheckDate(),
): Promise<MfNipSearchResult> {
  const nip = normalizeNip(nipInput);
  if (!isValidNip(nip)) {
    return { bankAccountIban: null, vatStatus: null };
  }

  try {
    const searchUrl = `${MF_API_BASE}/search/nip/${nip}?date=${checkDate}`;
    const searchBody = await fetchMfJson<MfEntitySearchResponse>(searchUrl);
    const subject = searchBody.result?.subject;

    return {
      bankAccountIban: extractPrimaryBankAccount(subject?.accountNumbers),
      vatStatus: mapMfStatusVatToContractorVatStatus(subject?.statusVat),
    };
  } catch (error) {
    console.error('MF VAT whitelist search by NIP failed:', error);
    return { bankAccountIban: null, vatStatus: null };
  }
}

/**
 * Returns the first bank account number listed for a NIP on the MF VAT whitelist.
 */
export async function fetchPrimaryBankAccountByNip(
  nipInput: string,
  checkDate = getVatWhitelistCheckDate(),
): Promise<string | null> {
  const result = await fetchMfDataByNip(nipInput, checkDate);
  return result.bankAccountIban;
}
