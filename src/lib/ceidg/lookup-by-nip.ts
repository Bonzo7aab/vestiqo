import 'server-only';

import { normalizeNip, isValidNip } from '../gus/nip';
import { mapCeidgStatusToBusinessStatus } from './parse-status';
import type { CeidgLookupResult, CeidgRawStatus } from './types';
import type { RegistryBusinessStatus } from '../registry/types';

const CEIDG_API_BASE = 'https://dane.biznes.gov.pl/api/ceidg/v3';

interface CeidgFirma {
  nazwa?: string;
  status?: string;
  podstawowyRodzajDzialalnosci?: string;
  wlasciciel?: {
    imie?: string;
    nazwisko?: string;
  };
}

interface CeidgFirmyResponse {
  firmy?: CeidgFirma[];
}

export interface CeidgLookupOutcome {
  found: boolean;
  data: CeidgLookupResult | null;
  businessStatus: RegistryBusinessStatus;
}

async function fetchCeidgJson(url: string, apiKey: string): Promise<CeidgFirmyResponse> {
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    next: { revalidate: 0 },
  });

  if (response.status === 404) {
    return { firmy: [] };
  }

  if (!response.ok) {
    throw new Error(`CEIDG_API_HTTP_${response.status}`);
  }

  return (await response.json()) as CeidgFirmyResponse;
}

function pickPrimaryFirma(firmy: CeidgFirma[]): CeidgFirma | null {
  if (!firmy.length) {
    return null;
  }

  const active = firmy.find(f => f.status === 'AKTYWNY');
  return active ?? firmy[0] ?? null;
}

/**
 * Look up sole proprietorship (JDG) data from CEIDG v3 by NIP.
 * Returns not found when the entity is not in CEIDG.
 */
export async function lookupCeidgByNip(nipInput: string): Promise<CeidgLookupOutcome> {
  const nip = normalizeNip(nipInput);
  if (!isValidNip(nip)) {
    return { found: false, data: null, businessStatus: 'unknown' };
  }

  const apiKey = process.env.CEIDG_API_KEY;
  if (!apiKey) {
    return { found: false, data: null, businessStatus: 'unknown' };
  }

  try {
    const url = `${CEIDG_API_BASE}/firmy?nip=${nip}&limit=25`;
    const body = await fetchCeidgJson(url, apiKey);
    const firma = pickPrimaryFirma(body.firmy ?? []);

    if (!firma?.status) {
      return { found: false, data: null, businessStatus: 'unknown' };
    }

    const status = firma.status as CeidgRawStatus;
    const businessStatus = mapCeidgStatusToBusinessStatus(status);

    return {
      found: true,
      data: {
        legalForm: 'Jednoosobowa działalność gospodarcza',
        status,
        name: firma.nazwa?.trim() ?? null,
      },
      businessStatus,
    };
  } catch (error) {
    console.error('CEIDG lookup failed:', error);
    return { found: false, data: null, businessStatus: 'unknown' };
  }
}
