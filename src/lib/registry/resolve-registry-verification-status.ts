import type { ContractorVatStatus } from '../contractor/constants';
import type { CompanyRegistrySnapshot } from './types';

export interface RegistryVerificationState {
  isRegistryVerified: boolean;
  businessPill: 'success' | 'warning' | 'destructive' | 'muted';
  financePill: 'success' | 'warning' | 'destructive' | 'muted';
}

function isKnownVatStatus(vatStatus: string | null | undefined): vatStatus is ContractorVatStatus {
  return vatStatus === 'active_vat' || vatStatus === 'vat_exempt';
}

/**
 * Determines whether registry checks pass for the public "Zweryfikowany" badge.
 */
export function isRegistryVerified(snapshot: CompanyRegistrySnapshot): boolean {
  if (snapshot.registryStatus !== 'active') {
    return false;
  }

  if (!isKnownVatStatus(snapshot.vatStatus)) {
    return false;
  }

  if (snapshot.financeRegistryStatus === 'insolvent') {
    return false;
  }

  if (snapshot.registrySource === null) {
    return false;
  }

  return true;
}

export function resolveBusinessStatusPill(
  snapshot: CompanyRegistrySnapshot,
): RegistryVerificationState['businessPill'] {
  switch (snapshot.registryStatus) {
    case 'active':
      return 'success';
    case 'suspended':
      return 'warning';
    case 'closed':
      return 'destructive';
    default:
      return 'muted';
  }
}

export function resolveFinanceStatusPill(
  snapshot: CompanyRegistrySnapshot,
): RegistryVerificationState['financePill'] {
  if (snapshot.financeRegistryStatus === 'solvent') {
    if (snapshot.vatWhitelistAccountAssigned === false) {
      return 'destructive';
    }
    return 'success';
  }

  if (snapshot.financeRegistryStatus === 'insolvent') {
    return 'destructive';
  }

  return 'muted';
}

export function resolveRegistryVerificationState(
  snapshot: CompanyRegistrySnapshot,
): RegistryVerificationState {
  return {
    isRegistryVerified: isRegistryVerified(snapshot),
    businessPill: resolveBusinessStatusPill(snapshot),
    financePill: resolveFinanceStatusPill(snapshot),
  };
}

export const BUSINESS_STATUS_TOOLTIPS: Record<RegistryVerificationState['businessPill'], string> = {
  success: 'Podmiot aktywny.',
  warning: 'Podmiot zawieszony.',
  destructive: 'Podmiot wykreślony lub zamknięty.',
  muted: 'Brak danych z rejestru państwowego.',
};

export const FINANCE_STATUS_TOOLTIPS: Record<RegistryVerificationState['financePill'], string> = {
  success: 'Czynny podatnik VAT. Wypłacalny.',
  warning: 'Status finansowy wymaga weryfikacji.',
  destructive: 'Niezarejestrowany lub wykreślony z VAT. Postępowanie upadłościowe lub egzekucja.',
  muted: 'Brak danych finansowych z rejestru państwowego.',
};
