import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../types/database';
import { resolveVerificationStatus } from '../verification/resolve-verification-state';
import type { VerificationStatus } from '../verification/types';

const EMPTY_STATUS: VerificationStatus = {
  state: 'unsubmitted',
  submittedAt: null,
  decidedAt: null,
  reason: null,
};

interface ProfileVerificationRow {
  is_verified: boolean | null;
  verification_submitted_at: string | null;
}

interface DecisionRow {
  decision: string;
  reason: string | null;
  created_at: string;
}

/**
 * Resolve verification state from profile + latest decision (client-safe — pass Supabase).
 */
export async function getUserVerificationStatus(
  userId: string,
  supabase: SupabaseClient<Database>
): Promise<VerificationStatus> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;

  const { data: profile, error: profileErr } = await sb
    .from('user_profiles')
    .select('user_type, is_verified, verification_submitted_at')
    .eq('id', userId)
    .maybeSingle();

  if (profileErr || !profile) {
    return EMPTY_STATUS;
  }

  const typedProfile = profile as ProfileVerificationRow & { user_type?: string | null };

  const { data: decisionRow } = await sb
    .from('verification_decisions')
    .select('decision, reason, created_at')
    .eq('subject_user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return resolveVerificationStatus({
    userType: typedProfile.user_type,
    isVerified: typedProfile.is_verified,
    submittedAt: typedProfile.verification_submitted_at ?? null,
    latestDecision: (decisionRow as DecisionRow | null) ?? null,
  });
}
