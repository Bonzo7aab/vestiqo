export type VerificationState = 'approved' | 'pending' | 'rejected' | 'unsubmitted';

/** Shown in admin panel when auth email is not confirmed yet. */
export type AdminUserStatus = VerificationState | 'email_unconfirmed';

export interface VerificationStatus {
  state: VerificationState;
  submittedAt: string | null;
  decidedAt: string | null;
  reason: string | null;
}
