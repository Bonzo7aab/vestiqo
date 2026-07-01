export type RegistrySource = 'ceidg' | 'krs';

export type RegistryBusinessStatus = 'active' | 'suspended' | 'closed' | 'unknown';

export type KrsLifecycleStatus =
  | 'active'
  | 'bankruptcy'
  | 'restructuring'
  | 'liquidating'
  | 'dissolved'
  | 'unknown';

export type FinanceRegistryStatus = 'solvent' | 'insolvent' | 'unknown';

export interface RegistryVerificationResult {
  nip: string;
  registrySource: RegistrySource | null;
  registryStatus: RegistryBusinessStatus;
  legalForm: string | null;
  krs: string | null;
  krsLifecycleStatus: KrsLifecycleStatus | null;
  financeRegistryStatus: FinanceRegistryStatus;
  checkedAt: string;
}

export interface CompanyRegistrySnapshot {
  registrySource: RegistrySource | null;
  registryStatus: RegistryBusinessStatus | null;
  legalForm: string | null;
  krs: string | null;
  registryCheckedAt: string | null;
  financeRegistryStatus: FinanceRegistryStatus | null;
  financeRegistryCheckedAt: string | null;
  vatStatus: string | null;
  vatWhitelistAccountAssigned: boolean | null;
}
