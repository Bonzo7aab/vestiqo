import 'server-only';

import { formatKrsNumber } from './format-krs-number';
import { mapKrsLifecycleToBusinessStatus, parseKrsLifecycleStatus } from './parse-status';
import type { KrsLookupResult } from './types';
import type { RegistryBusinessStatus } from '../registry/types';

const KRS_API_BASE = 'https://api-krs.ms.gov.pl/api/krs';

interface KrsOdpisResponse {
  odpis?: {
    dane?: {
      dzial1?: {
        danePodmiotu?: {
          formaPrawna?: string;
          nazwa?: string;
          identyfikatory?: {
            nip?: string;
            regon?: string;
          };
        };
      };
      dzial6?: {
        postepowanieUpadlosciowe?: unknown[];
        postepowanieRestrukturyzacyjneNaprawczePrzymusowaRestrukturyzacjaUporzadkowanaLikwidacja?: {
          rodzajPostepowania?: string;
        }[];
        wykreslenia?: unknown[];
      };
    };
    naglowekA?: {
      numerKRS?: string;
    };
  };
}

export interface KrsFetchOutcome {
  found: boolean;
  data: KrsLookupResult | null;
  businessStatus: RegistryBusinessStatus;
}

async function fetchKrsOdpis(krsNumber: string): Promise<KrsOdpisResponse | null> {
  const formatted = formatKrsNumber(krsNumber);
  if (!formatted) {
    return null;
  }

  const url = `${KRS_API_BASE}/OdpisAktualny/${formatted}?rejestr=P&format=json`;
  const response = await fetch(url, {
    headers: { Accept: 'application/json' },
    next: { revalidate: 0 },
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`KRS_API_HTTP_${response.status}`);
  }

  return (await response.json()) as KrsOdpisResponse;
}

/**
 * Fetch current KRS extract by KRS number (public MS API, no auth).
 */
export async function fetchKrsByNumber(krsNumber: string): Promise<KrsFetchOutcome> {
  try {
    const body = await fetchKrsOdpis(krsNumber);
    if (!body?.odpis?.dane) {
      return { found: false, data: null, businessStatus: 'unknown' };
    }

    const dzial1 = body.odpis.dane.dzial1?.danePodmiotu;
    const name = dzial1?.nazwa?.trim() ?? null;
    const lifecycleStatus = parseKrsLifecycleStatus(body.odpis.dane.dzial6, name);
    const businessStatus = mapKrsLifecycleToBusinessStatus(lifecycleStatus);
    const numerKrs = body.odpis.naglowekA?.numerKRS ?? krsNumber;

    return {
      found: true,
      data: {
        krsNumber: formatKrsNumber(numerKrs),
        legalForm: dzial1?.formaPrawna?.trim() ?? null,
        name,
        nip: dzial1?.identyfikatory?.nip?.trim() ?? null,
        regon: dzial1?.identyfikatory?.regon?.trim() ?? null,
        lifecycleStatus,
      },
      businessStatus,
    };
  } catch (error) {
    console.error('KRS fetch failed:', error);
    return { found: false, data: null, businessStatus: 'unknown' };
  }
}
