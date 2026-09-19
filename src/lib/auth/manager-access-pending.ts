export const MANAGER_VERIFICATION_PATH = '/weryfikacja-konta';

export interface ManagerAccessPendingInput {
  userType?: string | null;
  platformRole?: string | null;
  isVerified?: boolean | null;
  emailVerifiedAt?: string | null;
  /** False when the schema/query did not return verification columns (fail-open). */
  verificationFieldsAvailable?: boolean;
}

export function isManagerVerificationPath(pathname: string): boolean {
  return pathname === MANAGER_VERIFICATION_PATH || pathname.startsWith(`${MANAGER_VERIFICATION_PATH}/`);
}

/**
 * Managers need both app-level email confirmation and admin approval
 * before using the dashboard. Missing schema fields fail open so production
 * stays usable until the email_verified_at migration is applied.
 */
export function isManagerAccessPending(input: ManagerAccessPendingInput): boolean {
  if (input.platformRole === 'platform_admin') {
    return false;
  }
  if (input.userType !== 'manager') {
    return false;
  }

  if (input.isVerified !== true) {
    return true;
  }

  if (input.verificationFieldsAvailable === false) {
    return false;
  }

  return !input.emailVerifiedAt;
}
