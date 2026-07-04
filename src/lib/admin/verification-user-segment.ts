import {
  ACCOUNT_ROLES,
  type AccountRole,
} from '../profile/account-role-labels';

export type VerificationUserSegment = 'contractor' | 'manager' | 'cooperative';

export interface VerificationUserSegmentInput {
  userType: string;
  accountRole?: string | null;
  organizationType?: string | null;
  companyType?: string | null;
}

function normalizeOrg(value: string | null | undefined): string {
  return (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export function isCooperativeVerificationUser(input: VerificationUserSegmentInput): boolean {
  if (input.userType !== 'manager') return false;

  const accountRole = input.accountRole as AccountRole | null | undefined;
  if (
    accountRole === ACCOUNT_ROLES.COOPERATIVE_BOARD ||
    accountRole === ACCOUNT_ROLES.COOPERATIVE_ADMIN
  ) {
    return true;
  }

  const org = normalizeOrg(input.organizationType);
  if (org === 'spoldzielnia' || org === 'cooperative') {
    return true;
  }

  const companyType = normalizeOrg(input.companyType);
  return companyType === 'spoldzielnia' || companyType === 'cooperative';
}

export function resolveVerificationUserSegment(
  input: VerificationUserSegmentInput,
): VerificationUserSegment {
  if (input.userType === 'contractor') return 'contractor';
  if (isCooperativeVerificationUser(input)) return 'cooperative';
  return 'manager';
}

export function filterVerificationRowsBySegment<T extends VerificationUserSegmentInput>(
  rows: T[],
  segment: VerificationUserSegment,
): T[] {
  return rows.filter((row) => resolveVerificationUserSegment(row) === segment);
}
