import type { AuthUser } from '../../types/auth';

/** Contractor who has not been approved by admin yet (header / account UI). */
export function needsVerificationAttention(user: AuthUser | null | undefined): boolean {
  return user?.userType === 'contractor' && user.isVerified !== true;
}

export function isVerificationPendingReview(user: AuthUser | null | undefined): boolean {
  return needsVerificationAttention(user) && Boolean(user?.verificationSubmittedAt);
}

export function verificationMenuLabel(user: AuthUser | null | undefined): string {
  if (isVerificationPendingReview(user)) {
    return 'Weryfikacja w toku';
  }
  return 'Dokończ weryfikację';
}

export function verificationAttentionAriaLabel(user: AuthUser | null | undefined): string {
  return verificationMenuLabel(user);
}

/**
 * Merge client and server auth snapshots so verification fields from SSR
 * are not dropped when contextUser loads without a fresh profile fetch.
 */
export function mergeAuthUsersForDisplay(
  contextUser: AuthUser | null,
  initialUser: AuthUser | null,
  sessionFallback: AuthUser | null,
): AuthUser | null {
  const base = contextUser ?? initialUser ?? sessionFallback;
  if (!base) {
    return null;
  }

  const sources = [contextUser, initialUser, sessionFallback].filter(
    (user): user is AuthUser => user !== null && user.id === base.id,
  );

  if (sources.length <= 1) {
    return base;
  }

  const verificationSubmittedAt =
    sources.find(user => user.verificationSubmittedAt)?.verificationSubmittedAt ?? null;
  const isVerified = sources.some(user => user.isVerified === true);

  return {
    ...base,
    isVerified,
    verificationSubmittedAt,
  };
}
