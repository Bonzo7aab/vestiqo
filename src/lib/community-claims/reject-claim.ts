import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../types/database';
import { sendCommunityClaimRejectedEmail } from '../email/community-claim-emails';

export async function rejectCommunityAccountClaim(options: {
  admin: SupabaseClient<Database>;
  actorId: string;
  claimId: string;
  reason: string;
}): Promise<{ ok: boolean; error?: string }> {
  const reason = options.reason.trim();
  if (!reason) {
    return { ok: false, error: 'Podaj powód odrzucenia.' };
  }

  const { data: claim, error: claimError } = await options.admin
    .from('community_account_claims')
    .select('*')
    .eq('id', options.claimId)
    .maybeSingle();

  if (claimError) {
    return { ok: false, error: claimError.message };
  }
  if (!claim) {
    return { ok: false, error: 'Nie znaleziono wniosku.' };
  }
  if (claim.status !== 'pending') {
    return { ok: false, error: 'Ten wniosek został już rozpatrzony.' };
  }

  const now = new Date().toISOString();
  const { error: updateError } = await options.admin
    .from('community_account_claims')
    .update({
      status: 'rejected',
      decided_at: now,
      decided_by: options.actorId,
      reject_reason: reason,
    })
    .eq('id', options.claimId)
    .eq('status', 'pending');

  if (updateError) {
    return { ok: false, error: updateError.message };
  }

  const { data: entity } = await options.admin
    .from('managed_housing_entities')
    .select('name')
    .eq('id', claim.managed_entity_id)
    .maybeSingle();

  const emailed = await sendCommunityClaimRejectedEmail({
    toEmail: claim.email,
    reason,
    communityName: entity?.name ?? claim.nip,
  });
  if (!emailed.sent) {
    console.warn('rejectCommunityClaim email skipped:', emailed.skippedReason);
  }

  return { ok: true };
}
