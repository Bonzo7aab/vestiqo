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

/** Short role label for header / account chrome (OPD-128/129). */
export const ACCOUNT_ROLE_DISPLAY_LABELS: Record<AccountRole, string> = {
  [ACCOUNT_ROLES.CONDO_BOARD]: 'Zarząd Wspólnoty',
  [ACCOUNT_ROLES.PROPERTY_MANAGER]: 'Administracja Wspólnoty',
  [ACCOUNT_ROLES.COOPERATIVE_BOARD]: 'Zarząd Spółdzielni',
  [ACCOUNT_ROLES.COOPERATIVE_ADMIN]: 'Administracja Spółdzielni',
  [ACCOUNT_ROLES.CONTRACTOR]: 'Wykonawca',
};

export function getAccountRoleDisplayLabel(input: ResolveAccountRoleInput): string {
  return ACCOUNT_ROLE_DISPLAY_LABELS[resolveAccountRole(input)];
}

/** WM/SM list on /konto applies only to delegated property managers. */
export function shouldShowManagedHousingEntitiesOnAccount(
  accountRole: AccountRole | string | null | undefined,
): boolean {
  return accountRole === ACCOUNT_ROLES.PROPERTY_MANAGER;
}

/** Top-level registration entity type (OPD-128). */
export const REGISTRATION_ENTITY_TYPES = {
  WSPOLNOTA: 'wspolnota',
  SPOLDZIELNIA: 'spoldzielnia',
  WYKONAWCA: 'wykonawca',
} as const;

export type RegistrationEntityType =
  (typeof REGISTRATION_ENTITY_TYPES)[keyof typeof REGISTRATION_ENTITY_TYPES];

export const WSPOLNOTA_SUB_ROLES = {
  CONDO_BOARD: 'condo_board',
  PROPERTY_MANAGER: 'property_manager',
} as const;

export type WspolnotaSubRole = (typeof WSPOLNOTA_SUB_ROLES)[keyof typeof WSPOLNOTA_SUB_ROLES];

export const SPOLDZIELNIA_SUB_ROLES = {
  COOPERATIVE_BOARD: 'cooperative_board',
  COOPERATIVE_ADMIN: 'cooperative_admin',
} as const;

export type SpoldzielniaSubRole =
  (typeof SPOLDZIELNIA_SUB_ROLES)[keyof typeof SPOLDZIELNIA_SUB_ROLES];

export const REGISTRATION_ENTITY_LABELS: Record<RegistrationEntityType, string> = {
  [REGISTRATION_ENTITY_TYPES.WSPOLNOTA]: 'Wspólnota',
  [REGISTRATION_ENTITY_TYPES.SPOLDZIELNIA]: 'Spółdzielnia',
  [REGISTRATION_ENTITY_TYPES.WYKONAWCA]: 'Wykonawca',
};

export const WSPOLNOTA_SUB_ROLE_OPTIONS: Array<{ value: WspolnotaSubRole; label: string }> = [
  { value: WSPOLNOTA_SUB_ROLES.CONDO_BOARD, label: 'Zarząd Wspólnoty' },
  { value: WSPOLNOTA_SUB_ROLES.PROPERTY_MANAGER, label: 'Administracja Wspólnoty' },
];

/** Extra NIP field when registering as Administracja Wspólnoty. */
export const REGISTRATION_MANAGEMENT_NIP_LABEL = 'NIP Administracji Wspólnoty';

export const SPOLDZIELNIA_SUB_ROLE_OPTIONS: Array<{ value: SpoldzielniaSubRole; label: string }> = [
  { value: SPOLDZIELNIA_SUB_ROLES.COOPERATIVE_BOARD, label: 'Zarząd Spółdzielni' },
  { value: SPOLDZIELNIA_SUB_ROLES.COOPERATIVE_ADMIN, label: 'Administracja Spółdzielni' },
];

export const REGISTRATION_NIP_LABELS: Record<RegistrationEntityType, string> = {
  [REGISTRATION_ENTITY_TYPES.WSPOLNOTA]: 'NIP Wspólnoty Mieszkaniowej',
  [REGISTRATION_ENTITY_TYPES.SPOLDZIELNIA]: 'NIP Spółdzielni Mieszkaniowej',
  [REGISTRATION_ENTITY_TYPES.WYKONAWCA]: 'NIP Wykonawcy',
};

export const REGISTRATION_ROLE_HEADINGS: Partial<Record<RegistrationEntityType, string>> = {
  [REGISTRATION_ENTITY_TYPES.WSPOLNOTA]: 'Twoja rola we Wspólnocie',
  [REGISTRATION_ENTITY_TYPES.SPOLDZIELNIA]: 'Twoja rola w Spółdzielni',
};

export function registrationEntityToUserType(
  entityType: RegistrationEntityType,
): 'manager' | 'contractor' {
  return entityType === REGISTRATION_ENTITY_TYPES.WYKONAWCA ? 'contractor' : 'manager';
}

export function resolveRegistrationAccountRole(
  entityType: RegistrationEntityType,
  subRole?: WspolnotaSubRole | SpoldzielniaSubRole | null,
): AccountRole {
  if (entityType === REGISTRATION_ENTITY_TYPES.WYKONAWCA) {
    return ACCOUNT_ROLES.CONTRACTOR;
  }

  if (entityType === REGISTRATION_ENTITY_TYPES.WSPOLNOTA) {
    return subRole === WSPOLNOTA_SUB_ROLES.PROPERTY_MANAGER
      ? ACCOUNT_ROLES.PROPERTY_MANAGER
      : ACCOUNT_ROLES.CONDO_BOARD;
  }

  return subRole === SPOLDZIELNIA_SUB_ROLES.COOPERATIVE_ADMIN
    ? ACCOUNT_ROLES.COOPERATIVE_ADMIN
    : ACCOUNT_ROLES.COOPERATIVE_BOARD;
}

export function resolveRegistrationOrganizationType(
  entityType: RegistrationEntityType,
): 'wspólnota' | 'spółdzielnia' | null {
  if (entityType === REGISTRATION_ENTITY_TYPES.WSPOLNOTA) {
    return 'wspólnota';
  }
  if (entityType === REGISTRATION_ENTITY_TYPES.SPOLDZIELNIA) {
    return 'spółdzielnia';
  }
  return null;
}

export function resolveRegistrationCompanyType(
  accountRole: AccountRole,
): 'wspólnota' | 'spółdzielnia' | 'property_management' | 'contractor' {
  switch (accountRole) {
    case ACCOUNT_ROLES.PROPERTY_MANAGER:
      return 'property_management';
    case ACCOUNT_ROLES.COOPERATIVE_BOARD:
    case ACCOUNT_ROLES.COOPERATIVE_ADMIN:
      return 'spółdzielnia';
    case ACCOUNT_ROLES.CONTRACTOR:
      return 'contractor';
    case ACCOUNT_ROLES.CONDO_BOARD:
    default:
      return 'wspólnota';
  }
}

export function isRegistrationEntityType(
  value: string | null | undefined,
): value is RegistrationEntityType {
  return (
    value === REGISTRATION_ENTITY_TYPES.WSPOLNOTA ||
    value === REGISTRATION_ENTITY_TYPES.SPOLDZIELNIA ||
    value === REGISTRATION_ENTITY_TYPES.WYKONAWCA
  );
}
