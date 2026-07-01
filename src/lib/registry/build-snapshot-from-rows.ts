import type { CompanyRegistrySnapshot } from './types';
import { isRegistryVerified } from './resolve-registry-verification-status';

interface CompanyRegistryRow {
  registry_source?: string | null;
  registry_status?: string | null;
  legal_form?: string | null;
  krs?: string | null;
  registry_checked_at?: string | null;
}

interface FinanceRegistryRow {
  vat_status?: string | null;
  vat_whitelist_account_assigned?: boolean | null;
  finance_registry_status?: string | null;
  finance_registry_checked_at?: string | null;
}

export function buildCompanyRegistrySnapshot(
  company: CompanyRegistryRow | null | undefined,
  settings: FinanceRegistryRow | null | undefined,
): CompanyRegistrySnapshot {
  return {
    registrySource: (company?.registry_source as CompanyRegistrySnapshot['registrySource']) ?? null,
    registryStatus:
      (company?.registry_status as CompanyRegistrySnapshot['registryStatus']) ?? null,
    legalForm: company?.legal_form ?? null,
    krs: company?.krs ?? null,
    registryCheckedAt: company?.registry_checked_at ?? null,
    financeRegistryStatus:
      (settings?.finance_registry_status as CompanyRegistrySnapshot['financeRegistryStatus']) ??
      null,
    financeRegistryCheckedAt: settings?.finance_registry_checked_at ?? null,
    vatStatus: settings?.vat_status ?? null,
    vatWhitelistAccountAssigned: settings?.vat_whitelist_account_assigned ?? null,
  };
}

export function isUserRegistryVerified(
  company: CompanyRegistryRow | null | undefined,
  settings: FinanceRegistryRow | null | undefined,
): boolean {
  return isRegistryVerified(buildCompanyRegistrySnapshot(company, settings));
}
