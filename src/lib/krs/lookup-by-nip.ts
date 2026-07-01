import 'server-only';

import { lookupByNip } from '../gus/lookup-by-nip';
import { isGusLegalEntity, resolveKrsNumberFromRegon } from '../gus/resolve-krs-from-regon';
import { fetchKrsByNumber } from './fetch-odpis';
import type { KrsFetchOutcome } from './fetch-odpis';

/**
 * Resolve KRS data for a company NIP via GUS REGON → KRS number → KRS API.
 */
export async function lookupKrsByNip(nipInput: string): Promise<KrsFetchOutcome> {
  const gusData = await lookupByNip(nipInput);
  if (!gusData?.regon) {
    return { found: false, data: null, businessStatus: 'unknown' };
  }

  const apiKey = process.env.GUS_API_KEY;
  if (!apiKey) {
    return { found: false, data: null, businessStatus: 'unknown' };
  }

  const { krsNumber } = await resolveKrsNumberFromRegon(gusData.regon, apiKey);
  if (!krsNumber) {
    return { found: false, data: null, businessStatus: 'unknown' };
  }

  return fetchKrsByNumber(krsNumber);
}

export { isGusLegalEntity };
