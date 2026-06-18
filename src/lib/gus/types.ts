import type { ContractorVatStatus } from '../contractor/constants';

export interface CompanyLookupResult {
  nip: string;
  regon: string;
  name: string;
  address: string | null;
  city: string | null;
  postalCode: string | null;
  district: string | null;
  bankAccountIban: string | null;
  vatStatus: ContractorVatStatus | null;
}
