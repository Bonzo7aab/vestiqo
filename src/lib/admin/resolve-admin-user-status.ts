import type { AdminUserStatus, VerificationState } from '../verification/types';

interface ResolveAdminUserStatusInput {
  emailConfirmed: boolean;
  verificationState: VerificationState;
}

export function resolveAdminUserStatus({
  emailConfirmed,
  verificationState,
}: ResolveAdminUserStatusInput): AdminUserStatus {
  if (!emailConfirmed) {
    return 'email_unconfirmed';
  }

  return verificationState;
}

/** Verification badge state for admin queue rows (managers are not auto-approved in the queue). */
export function resolveQueueVerificationState(
  isVerified: boolean | null | undefined,
  verificationSubmittedAt: string | null | undefined,
): VerificationState {
  if (isVerified) {
    return 'approved';
  }

  if (verificationSubmittedAt) {
    return 'pending';
  }

  return 'unsubmitted';
}
