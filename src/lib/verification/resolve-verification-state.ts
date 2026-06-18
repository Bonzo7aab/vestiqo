import type { VerificationStatus } from './types';

interface VerificationDecisionSnapshot {
  decision: string;
  reason: string | null;
  created_at: string;
}

interface ResolveVerificationStatusInput {
  userType?: string | null;
  isVerified: boolean | null;
  submittedAt: string | null;
  latestDecision?: VerificationDecisionSnapshot | null;
}

/**
 * Single source of truth for contractor/manager verification state.
 * Pending review requires an explicit submission timestamp.
 */
export function resolveVerificationStatus(
  input: ResolveVerificationStatusInput,
): VerificationStatus {
  const submittedAt = input.submittedAt ?? null;

  if (input.userType === 'manager') {
    return {
      state: 'approved',
      submittedAt,
      decidedAt: null,
      reason: null,
    };
  }

  if (input.isVerified === true) {
    return {
      state: 'approved',
      submittedAt,
      decidedAt: null,
      reason: null,
    };
  }

  const latest = input.latestDecision;

  if (latest?.decision === 'rejected' && !submittedAt) {
    return {
      state: 'rejected',
      submittedAt: null,
      decidedAt: latest.created_at,
      reason: latest.reason ?? null,
    };
  }

  if (!submittedAt) {
    return {
      state: 'unsubmitted',
      submittedAt: null,
      decidedAt: null,
      reason: null,
    };
  }

  return {
    state: 'pending',
    submittedAt,
    decidedAt: null,
    reason: null,
  };
}
