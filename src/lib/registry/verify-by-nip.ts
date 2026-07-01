import 'server-only';

import type { ContractorVatStatus } from '../contractor/constants';
import { lookupCeidgByNip } from '../ceidg/lookup-by-nip';
import { fetchMfDataByNip } from '../mf-vat-whitelist/search-by-nip';
import { isKrsInsolvent } from '../krs/parse-status';
import { lookupKrsByNip } from '../krs/lookup-by-nip';
import { normalizeNip, isValidNip } from '../gus/nip';
import type {
  FinanceRegistryStatus,
  KrsLifecycleStatus,
  RegistryBusinessStatus,
  RegistrySource,
  RegistryVerificationResult,
} from './types';

function deriveFinanceRegistryStatus(input: {
  vatStatus: ContractorVatStatus | null;
  registrySource: RegistrySource | null;
  krsLifecycleStatus: KrsLifecycleStatus | null;
}): FinanceRegistryStatus {
  if (!input.vatStatus) {
    return 'unknown';
  }

  if (input.registrySource === 'krs' && input.krsLifecycleStatus && isKrsInsolvent(input.krsLifecycleStatus)) {
    return 'insolvent';
  }

  if (input.vatStatus === 'active_vat' || input.vatStatus === 'vat_exempt') {
    return 'solvent';
  }

  return 'insolvent';
}

/**
 * Run parallel registry lookups (CEIDG/KRS + MF) for a Polish NIP.
 */
export async function verifyCompanyByNip(nipInput: string): Promise<RegistryVerificationResult | null> {
  const nip = normalizeNip(nipInput);
  if (!isValidNip(nip)) {
    return null;
  }

  const checkedAt = new Date().toISOString();

  const [ceidgOutcome, krsOutcome, mfData] = await Promise.all([
    lookupCeidgByNip(nip),
    lookupKrsByNip(nip),
    fetchMfDataByNip(nip),
  ]);

  let registrySource: RegistrySource | null = null;
  let registryStatus: RegistryBusinessStatus = 'unknown';
  let legalForm: string | null = null;
  let krs: string | null = null;
  let krsLifecycleStatus: KrsLifecycleStatus | null = null;

  if (ceidgOutcome.found && ceidgOutcome.data) {
    registrySource = 'ceidg';
    registryStatus = ceidgOutcome.businessStatus;
    legalForm = ceidgOutcome.data.legalForm;
  } else if (krsOutcome.found && krsOutcome.data) {
    registrySource = 'krs';
    registryStatus = krsOutcome.businessStatus;
    legalForm = krsOutcome.data.legalForm;
    krs = krsOutcome.data.krsNumber;
    krsLifecycleStatus = krsOutcome.data.lifecycleStatus;
  }

  const financeRegistryStatus = deriveFinanceRegistryStatus({
    vatStatus: mfData.vatStatus,
    registrySource,
    krsLifecycleStatus,
  });

  return {
    nip,
    registrySource,
    registryStatus,
    legalForm,
    krs,
    krsLifecycleStatus,
    financeRegistryStatus,
    checkedAt,
  };
}
