import type { VerificationStatus } from './types';
import { isRegistryVerified } from '../registry/resolve-registry-verification-status';
import type { CompanyRegistrySnapshot } from '../registry/types';

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
  registrySnapshot?: CompanyRegistrySnapshot | null;
}

/**
 * Single source of truth for contractor/manager verification state.
 * Contractors: OPD-118 registry-only approval (CEIDG/KRS + MF).
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

  if (input.userType === 'contractor') {
    const registryApproved =
      input.registrySnapshot !== undefined && input.registrySnapshot !== null
        ? isRegistryVerified(input.registrySnapshot)
        : false;

    if (registryApproved) {
      return {
        state: 'approved',
        submittedAt,
        decidedAt: null,
        reason: null,
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
