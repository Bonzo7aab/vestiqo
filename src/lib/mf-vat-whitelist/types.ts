export interface VatWhitelistCheckResult {
  assigned: boolean;
  requestId: string | null;
  requestDateTime: string | null;
  checkedForDate: string;
  method: 'check' | 'search';
}

export type VerifyContractorBankAccountResult =
  | { data: VatWhitelistCheckResult }
  | { error: string };
