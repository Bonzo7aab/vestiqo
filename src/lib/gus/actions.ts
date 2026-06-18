'use server';

import { fetchMfDataByNip } from '../mf-vat-whitelist/search-by-nip';
import { lookupByNip } from './lookup-by-nip';
import { isValidNip, normalizeNip } from './nip';
import type { CompanyLookupResult } from './types';

export type LookupCompanyByNipResult =
  | { data: CompanyLookupResult }
  | { error: string };

async function enrichWithMfData(data: CompanyLookupResult): Promise<CompanyLookupResult> {
  const mfData = await fetchMfDataByNip(data.nip);
  return {
    ...data,
    bankAccountIban: mfData.bankAccountIban,
    vatStatus: mfData.vatStatus,
  };
}

export async function lookupCompanyByNipAction(nip: string): Promise<LookupCompanyByNipResult> {
  const normalized = normalizeNip(nip);

  if (!isValidNip(normalized)) {
    return { error: 'Nieprawidłowy numer NIP' };
  }

  try {
    const data = await lookupByNip(normalized);

    if (!data) {
      return { error: 'Nie znaleziono firmy o podanym NIP' };
    }

    const enriched = await enrichWithMfData(data);
    return { data: enriched };
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'GUS_NOT_CONFIGURED') {
        return { error: 'Usługa wyszukiwania firm jest tymczasowo niedostępna' };
      }
      if (error.message === 'GUS_UNAVAILABLE') {
        return { error: 'Nie udało się pobrać danych z GUS. Spróbuj ponownie później.' };
      }
    }

    return { error: 'Nie udało się pobrać danych z GUS. Spróbuj ponownie później.' };
  }
}
