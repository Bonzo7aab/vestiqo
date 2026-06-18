import 'server-only';

import Bir, { BirError } from 'bir1';
import { modern } from 'bir1/normalize';
import { mapGusGminaToWarsawDistrict } from '../config/warsawDistricts';
import { isValidNip, normalizeNip } from './nip';
import type { CompanyLookupResult } from './types';

export type { CompanyLookupResult } from './types';

interface GusSearchResult {
  nip?: string;
  regon?: string;
  nazwa?: string;
  miejscowosc?: string;
  kodPocztowy?: string;
  ulica?: string;
  nrNieruchomosci?: string;
  nrLokalu?: string;
  gmina?: string;
}

function buildAddress(result: GusSearchResult): string | null {
  const streetParts: string[] = [];
  if (result.ulica) {
    streetParts.push(result.ulica);
  }
  if (result.nrNieruchomosci) {
    streetParts.push(result.nrNieruchomosci);
  }
  if (result.nrLokalu) {
    streetParts.push(`/${result.nrLokalu}`);
  }

  const street = streetParts.join(' ').replace(/\s+\//, '/').trim();
  return street || null;
}

function mapSearchResult(result: GusSearchResult, nip: string): CompanyLookupResult | null {
  const name = result.nazwa?.trim();
  const regon = result.regon?.trim();

  if (!name || !regon) {
    return null;
  }

  return {
    nip: result.nip?.trim() || nip,
    regon,
    name,
    address: buildAddress(result),
    city: result.miejscowosc?.trim() || null,
    postalCode: result.kodPocztowy?.trim() || null,
    district: mapGusGminaToWarsawDistrict(result.gmina),
    bankAccountIban: null,
    vatStatus: null,
  };
}

function isNotFoundError(error: BirError): boolean {
  const response = error.response as { ErrorCode?: string } | undefined;
  return response?.ErrorCode === '4';
}

/**
 * Look up company data from GUS BIR by NIP.
 * Returns null when the entity is not found.
 */
export async function lookupByNip(nipInput: string): Promise<CompanyLookupResult | null> {
  const nip = normalizeNip(nipInput);
  if (!isValidNip(nip)) {
    throw new Error('INVALID_NIP');
  }

  const apiKey = process.env.GUS_API_KEY;
  if (!apiKey) {
    throw new Error('GUS_NOT_CONFIGURED');
  }

  const bir = new Bir({ key: apiKey, normalizeFn: modern });

  try {
    const raw = (await bir.search({ nip })) as GusSearchResult | GusSearchResult[] | null | undefined;

    if (!raw) {
      return null;
    }

    const result = Array.isArray(raw) ? raw[0] : raw;
    if (!result) {
      return null;
    }

    return mapSearchResult(result, nip);
  } catch (error) {
    if (error instanceof BirError && isNotFoundError(error)) {
      return null;
    }
    console.error('GUS lookup failed:', error);
    throw new Error('GUS_UNAVAILABLE');
  } finally {
    try {
      await bir.logout();
    } catch {
      // Session cleanup is best-effort.
    }
  }
}
