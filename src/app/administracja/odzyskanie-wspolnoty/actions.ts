'use server';

import { revalidatePath } from 'next/cache';
import { instrumentServerAction } from '../../../lib/sentry/instrument-server-action';
import { requirePlatformAdmin } from '../../../lib/admin/require-platform-admin';
import { createAdminClientOrNull } from '../../../lib/supabase/admin';
import { createPresignedGetUrl } from '../../../lib/storage/r2/operations';
import { STORAGE_BUCKETS } from '../../../lib/storage/buckets';
import { approveCommunityAccountClaim } from '../../../lib/community-claims/approve-claim';
import { rejectCommunityAccountClaim } from '../../../lib/community-claims/reject-claim';

async function approveCommunityClaimActionImpl(
  claimId: string,
): Promise<{ ok: boolean; error?: string }> {
  const { userId: actorId } = await requirePlatformAdmin('/administracja/odzyskanie-wspolnoty');
  const admin = createAdminClientOrNull();
  if (!admin) {
    return { ok: false, error: 'Brak klucza serwisowego Supabase.' };
  }

  const result = await approveCommunityAccountClaim({ admin, actorId, claimId });
  revalidatePath('/administracja/odzyskanie-wspolnoty');
  revalidatePath(`/administracja/odzyskanie-wspolnoty/${claimId}`);
  revalidatePath('/konto', 'layout');
  return result;
}

async function rejectCommunityClaimActionImpl(
  claimId: string,
  reason: string,
): Promise<{ ok: boolean; error?: string }> {
  const { userId: actorId } = await requirePlatformAdmin('/administracja/odzyskanie-wspolnoty');
  const admin = createAdminClientOrNull();
  if (!admin) {
    return { ok: false, error: 'Brak klucza serwisowego Supabase.' };
  }

  const result = await rejectCommunityAccountClaim({ admin, actorId, claimId, reason });
  revalidatePath('/administracja/odzyskanie-wspolnoty');
  revalidatePath(`/administracja/odzyskanie-wspolnoty/${claimId}`);
  return result;
}

async function getCommunityClaimResolutionUrlActionImpl(
  claimId: string,
): Promise<{ url: string | null; error?: string }> {
  const { supabase } = await requirePlatformAdmin('/administracja/odzyskanie-wspolnoty');
  const { data, error } = await supabase
    .from('community_account_claims')
    .select('resolution_path')
    .eq('id', claimId)
    .maybeSingle();

  if (error || !data?.resolution_path) {
    return { url: null, error: error?.message ?? 'Brak pliku uchwały.' };
  }

  try {
    const url = await createPresignedGetUrl(
      STORAGE_BUCKETS.VERIFICATION_DOCUMENTS,
      data.resolution_path,
      3600,
    );
    return { url };
  } catch (signErr) {
    return {
      url: null,
      error: signErr instanceof Error ? signErr.message : 'Nie udało się wygenerować podglądu.',
    };
  }
}

export const approveCommunityClaimAction = instrumentServerAction(
  'approveCommunityClaimAction',
  approveCommunityClaimActionImpl,
);

export const rejectCommunityClaimAction = instrumentServerAction(
  'rejectCommunityClaimAction',
  rejectCommunityClaimActionImpl,
);

export const getCommunityClaimResolutionUrlAction = instrumentServerAction(
  'getCommunityClaimResolutionUrlAction',
  getCommunityClaimResolutionUrlActionImpl,
);
