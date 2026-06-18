import 'server-only';

import { normalizeNip, isValidNip } from '../gus/nip';
import { normalizeIbanInput, isValidPolishIban } from '../contractor/iban';
import { getVatWhitelistCheckDate } from './date';
import type { VatWhitelistCheckResult } from './types';

const MF_API_BASE = 'https://wl-api.mf.gov.pl/api';

interface MfEntityCheckResponse {
  result?: {
    accountAssigned?: string;
    requestId?: string;
    requestDateTime?: string;
  };
}

interface MfEntitySearchResponse {
  result?: {
    subject?: {
      accountNumbers?: string[];
    };
    requestId?: string;
    requestDateTime?: string;
  };
}

function accountNumbersInclude(accounts: string[] | undefined, bankAccount: string): boolean {
  if (!accounts?.length) {
    return false;
  }

  return accounts.some(account => normalizeIbanInput(account) === bankAccount);
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

/**
 * Verify whether a bank account is assigned to a NIP on the MF VAT whitelist.
 * Uses /check first, then falls back to /search for exempt taxpayers and virtual accounts.
 */
export async function checkBankAccountOnVatWhitelist(
  nipInput: string,
  bankAccountInput: string,
  checkDate = getVatWhitelistCheckDate(),
): Promise<VatWhitelistCheckResult> {
  const nip = normalizeNip(nipInput);
  const bankAccount = normalizeIbanInput(bankAccountInput);

  if (!isValidNip(nip)) {
    throw new Error('INVALID_NIP');
  }

  if (!isValidPolishIban(bankAccount)) {
    throw new Error('INVALID_BANK_ACCOUNT');
  }

  const checkUrl = `${MF_API_BASE}/check/nip/${nip}/bank-account/${bankAccount}?date=${checkDate}`;
  const checkBody = await fetchMfJson<MfEntityCheckResponse>(checkUrl);
  const checkResult = checkBody.result;

  if (checkResult?.accountAssigned === 'TAK') {
    return {
      assigned: true,
      requestId: checkResult.requestId ?? null,
      requestDateTime: checkResult.requestDateTime ?? null,
      checkedForDate: checkDate,
      method: 'check',
    };
  }

  const searchUrl = `${MF_API_BASE}/search/nip/${nip}?date=${checkDate}`;
  const searchBody = await fetchMfJson<MfEntitySearchResponse>(searchUrl);
  const searchResult = searchBody.result;
  const assigned = accountNumbersInclude(searchResult?.subject?.accountNumbers, bankAccount);

  return {
    assigned,
    requestId: searchResult?.requestId ?? checkResult?.requestId ?? null,
    requestDateTime: searchResult?.requestDateTime ?? checkResult?.requestDateTime ?? null,
    checkedForDate: checkDate,
    method: 'search',
  };
}
