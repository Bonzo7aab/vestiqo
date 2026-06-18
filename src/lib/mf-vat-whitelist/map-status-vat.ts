import type { ContractorVatStatus } from '../contractor/constants';

/**
 * Maps MF whitelist `statusVat` ("Czynny" | "Zwolniony") to contractor settings value.
 */
export function mapMfStatusVatToContractorVatStatus(
  statusVat: string | null | undefined,
): ContractorVatStatus | null {
  if (!statusVat) {
    return null;
  }

  const normalized = statusVat.trim().toLowerCase();

  if (normalized === 'czynny') {
    return 'active_vat';
  }

  if (normalized === 'zwolniony') {
    return 'vat_exempt';
  }

  return null;
}
