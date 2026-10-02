import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../types/database';
import { ACCOUNT_ROLES, resolveRegistrationCompanyType } from '../profile/account-role-labels';
import { generateSecurePassword } from '../auth/generate-password';
import { getPublicAppOrigin } from '../auth/app-origin';
import { createNotificationWithPush } from '../database/notifications-server';
import { sendCommunityClaimApprovedEmail } from '../email/community-claim-emails';
import { findManagedHousingEntityByNip } from './eligibility';

export interface ApproveCommunityClaimResult {
  ok: boolean;
  error?: string;
  createdUserId?: string;
  createdCompanyId?: string;
}

async function findManagerUserIds(
  admin: SupabaseClient<Database>,
  managerCompanyId: string,
): Promise<string[]> {
  const { data, error } = await admin
    .from('user_companies')
    .select('user_id')
    .eq('company_id', managerCompanyId)
    .eq('is_active', true);

  if (error) {
    console.error('approveCommunityClaim manager users failed:', error.message);
    return [];
  }

  return [...new Set((data ?? []).map((row) => row.user_id).filter(Boolean))];
}

export async function approveCommunityAccountClaim(options: {
  admin: SupabaseClient<Database>;
  actorId: string;
  claimId: string;
}): Promise<ApproveCommunityClaimResult> {
  const { admin, actorId, claimId } = options;

  const { data: claim, error: claimError } = await admin
    .from('community_account_claims')
    .select('*')
    .eq('id', claimId)
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

  const entity = await findManagedHousingEntityByNip(admin, claim.nip);
  if (!entity || entity.id !== claim.managed_entity_id) {
    return { ok: false, error: 'Nie znaleziono wspólnoty powiązanej z wnioskiem.' };
  }
  if (entity.management_blocked_at) {
    return { ok: false, error: 'Ta wspólnota ma już zablokowane zarządzanie.' };
  }

  const { data: entityRow, error: entityError } = await admin
    .from('managed_housing_entities')
    .select('*')
    .eq('id', entity.id)
    .single();

  if (entityError || !entityRow) {
    return { ok: false, error: entityError?.message ?? 'Nie udało się wczytać wspólnoty.' };
  }

  const password = generateSecurePassword();
  const { data: createdAuth, error: createUserError } = await admin.auth.admin.createUser({
    email: claim.email,
    password,
    email_confirm: true,
    user_metadata: {
      first_name: claim.first_name,
      last_name: claim.last_name,
      user_type: 'manager',
      phone: claim.phone,
    },
  });

  if (createUserError || !createdAuth.user) {
    return {
      ok: false,
      error: createUserError?.message ?? 'Nie udało się utworzyć konta użytkownika.',
    };
  }

  const userId = createdAuth.user.id;
  const now = new Date().toISOString();
  const accountRole = ACCOUNT_ROLES.CONDO_BOARD;
  const companyType = resolveRegistrationCompanyType(accountRole);

  const { error: profileError } = await admin.from('user_profiles').insert({
    id: userId,
    user_type: 'manager',
    first_name: claim.first_name,
    last_name: claim.last_name,
    phone: claim.phone,
    nip: claim.nip,
    account_role: accountRole,
    organization_type: 'wspólnota',
    is_verified: true,
    email_verified_at: now,
    verification_submitted_at: null,
    profile_completed: false,
    onboarding_completed: false,
  });

  if (profileError) {
    await admin.auth.admin.deleteUser(userId);
    return { ok: false, error: profileError.message };
  }

  const { data: companyRow, error: companyError } = await admin
    .from('companies')
    .insert({
      name: entityRow.name,
      type: companyType,
      nip: claim.nip,
      regon: entityRow.regon,
      address: entityRow.address,
      city: entityRow.city,
      postal_code: entityRow.postal_code,
      country: 'PL',
      email: claim.email,
      phone: claim.phone,
      is_verified: true,
      verification_level: 'verified',
    })
    .select('id')
    .single();

  if (companyError || !companyRow?.id) {
    await admin.auth.admin.deleteUser(userId);
    return { ok: false, error: companyError?.message ?? 'Nie udało się utworzyć firmy wspólnoty.' };
  }

  const { error: linkError } = await admin.from('user_companies').insert({
    user_id: userId,
    company_id: companyRow.id,
    role: 'owner',
    is_primary: true,
    is_active: true,
  });

  if (linkError) {
    await admin.auth.admin.deleteUser(userId);
    return { ok: false, error: linkError.message };
  }

  const { error: blockError } = await admin
    .from('managed_housing_entities')
    .update({
      management_blocked_at: now,
      claimed_company_id: companyRow.id,
      updated_at: now,
    })
    .eq('id', entity.id);

  if (blockError) {
    await admin.auth.admin.deleteUser(userId);
    return { ok: false, error: blockError.message };
  }

  const { error: claimUpdateError } = await admin
    .from('community_account_claims')
    .update({
      status: 'approved',
      decided_at: now,
      decided_by: actorId,
      created_user_id: userId,
    })
    .eq('id', claimId)
    .eq('status', 'pending');

  if (claimUpdateError) {
    return { ok: false, error: claimUpdateError.message };
  }

  const loginUrl = `${getPublicAppOrigin()}/logowanie`;
  const emailed = await sendCommunityClaimApprovedEmail({
    toEmail: claim.email,
    password,
    loginUrl,
    communityName: entityRow.name,
  });
  if (!emailed.sent) {
    console.warn('approveCommunityClaim email skipped:', emailed.skippedReason);
  }

  const managerUserIds = await findManagerUserIds(admin, entity.manager_company_id);
  await Promise.all(
    managerUserIds.map((managerUserId) =>
      createNotificationWithPush({
        supabase: admin,
        userId: managerUserId,
        type: 'system_announcement',
        title: 'Wspólnota odzyskała własne konto',
        message: `${entityRow.name} (NIP ${claim.nip}) ma teraz własne konto. Nie możesz publikować nowych konkursów dla tej wspólnoty. Istniejące konkursy pozostają na Twoim koncie.`,
        actionUrl: '/konto',
        sendPush: true,
      }),
    ),
  );

  return { ok: true, createdUserId: userId, createdCompanyId: companyRow.id };
}
