import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../types/database';
import { invalidateUserVerification } from './invalidate-verification';

export interface ResetVerificationAfterRemovalResult {
  hadApprovedVerification: boolean;
  clearedPendingSubmission: boolean;
}

export interface ResetVerificationAfterRemovalOptions {
  /** When false, only clear the per-document review; leave account verification intact (OPD-186 contractor OC). */
  resetAccountVerification?: boolean;
}

/**
 * After the user deletes a verification-related document, clear admin review
 * for that key and require a fresh submission / verification cycle when needed.
 */
export async function resetVerificationAfterDocumentRemoval(
  supabase: SupabaseClient<Database>,
  userId: string,
  documentReviewKey?: string,
  options?: ResetVerificationAfterRemovalOptions,
): Promise<ResetVerificationAfterRemovalResult> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;
  const resetAccountVerification = options?.resetAccountVerification !== false;

  const { data: profile } = await sb
    .from('user_profiles')
    .select('is_verified, verification_submitted_at, verification_document_reviews')
    .eq('id', userId)
    .maybeSingle();

  const hadApproved = Boolean(profile?.is_verified);
  const hadPendingSubmission = Boolean(profile?.verification_submitted_at);

  if (documentReviewKey && profile?.verification_document_reviews) {
    const reviews = {
      ...(profile.verification_document_reviews as Record<string, unknown>),
    };
    delete reviews[documentReviewKey];
    await sb
      .from('user_profiles')
      .update({ verification_document_reviews: reviews })
      .eq('id', userId);
  }

  if (!resetAccountVerification) {
    return { hadApprovedVerification: false, clearedPendingSubmission: false };
  }

  if (hadApproved) {
    await invalidateUserVerification(supabase, userId);
    return { hadApprovedVerification: true, clearedPendingSubmission: true };
  }

  if (hadPendingSubmission) {
    await sb
      .from('user_profiles')
      .update({
        verification_submitted_at: null,
        is_verified: false,
      })
      .eq('id', userId);

    return { hadApprovedVerification: false, clearedPendingSubmission: true };
  }

  return { hadApprovedVerification: false, clearedPendingSubmission: false };
}
