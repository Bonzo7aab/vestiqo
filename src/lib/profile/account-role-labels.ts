import type { UserType } from '../../types/auth';

/** Registration / profile account roles (OPD-128, OPD-129). */
export const ACCOUNT_ROLES = {
  CONDO_BOARD: 'condo_board',
  PROPERTY_MANAGER: 'property_manager',
  COOPERATIVE_BOARD: 'cooperative_board',
  COOPERATIVE_ADMIN: 'cooperative_admin',
  CONTRACTOR: 'contractor',
} as const;

export type AccountRole = (typeof ACCOUNT_ROLES)[keyof typeof ACCOUNT_ROLES];

export interface ProfileSectionLabels {
  contact: string;
  business: string;
}

const PROFILE_SECTION_LABELS: Record<AccountRole, ProfileSectionLabels> = {
  [ACCOUNT_ROLES.CONDO_BOARD]: {
    contact: 'Dane osoby kontaktowej',
    business: 'Dane wspólnoty',
  },
  [ACCOUNT_ROLES.PROPERTY_MANAGER]: {
    contact: 'Dane osoby kontaktowej',
    business: 'Dane firmy zarządzającej',
  },
  [ACCOUNT_ROLES.COOPERATIVE_BOARD]: {
    contact: 'Dane osoby kontaktowej',
    business: 'Dane spółdzielni',
  },
  [ACCOUNT_ROLES.COOPERATIVE_ADMIN]: {
    contact: 'Dane osoby kontaktowej',
    business: 'Dane spółdzielni',
  },
  [ACCOUNT_ROLES.CONTRACTOR]: {
    contact: 'Dane osoby kontaktowej',
    business: 'Dane wykonawcy',
  },
};

const ACCOUNT_ROLE_VALUES = new Set<string>(Object.values(ACCOUNT_ROLES));

export function isAccountRole(value: string | null | undefined): value is AccountRole {
  return typeof value === 'string' && ACCOUNT_ROLE_VALUES.has(value);
}

export interface ResolveAccountRoleInput {
  userType: UserType;
  accountRole?: string | null;
  companyType?: string | null;
  organizationType?: string | null;
}

/**
 * Resolves the effective account role for profile section labels.
 * Uses persisted `account_role` when present; otherwise infers from legacy data.
 */
export function resolveAccountRole(input: ResolveAccountRoleInput): AccountRole {
  if (isAccountRole(input.accountRole)) {
    return input.accountRole;
  }

  if (input.userType === 'contractor') {
    return ACCOUNT_ROLES.CONTRACTOR;
  }

  const orgType = (input.organizationType ?? input.companyType ?? '').toLowerCase();

  if (orgType === 'spółdzielnia' || orgType === 'cooperative') {
    return ACCOUNT_ROLES.COOPERATIVE_BOARD;
  }

  if (
    orgType === 'property_management' ||
    orgType === 'condo_management' ||
    orgType === 'zarządca'
  ) {
    return ACCOUNT_ROLES.PROPERTY_MANAGER;
  }

  if (orgType === 'wspólnota') {
    return ACCOUNT_ROLES.CONDO_BOARD;
  }

  return ACCOUNT_ROLES.CONDO_BOARD;
}

export function getProfileSectionLabels(input: ResolveAccountRoleInput): ProfileSectionLabels {
  return PROFILE_SECTION_LABELS[resolveAccountRole(input)];
}
