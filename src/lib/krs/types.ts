export interface KrsLookupResult {
  krsNumber: string;
  legalForm: string | null;
  name: string | null;
  nip: string | null;
  regon: string | null;
  lifecycleStatus: import('../registry/types').KrsLifecycleStatus;
}
