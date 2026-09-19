import type { SupabaseClient } from '@supabase/supabase-js';
import { redirect } from 'next/navigation';
import type { Database } from '../../types/database';
import { isManagerAccessPending, MANAGER_VERIFICATION_PATH } from './manager-access-pending';

export async function redirectIfManagerAccessPending(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<void> {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('user_type, platform_role, is_verified')
    .eq('id', userId)
    .maybeSingle();

  if (error || !data) {
    return;
  }

  let emailVerifiedAt: string | null | undefined;
  let verificationFieldsAvailable = true;
  const emailLookup = await supabase
    .from('user_profiles')
    .select('email_verified_at')
    .eq('id', userId)
    .maybeSingle();

  if (emailLookup.error) {
    verificationFieldsAvailable = false;
  } else {
    emailVerifiedAt = emailLookup.data?.email_verified_at ?? null;
  }

  if (
    isManagerAccessPending({
      userType: data.user_type,
      platformRole: data.platform_role,
      isVerified: data.is_verified,
      emailVerifiedAt,
      verificationFieldsAvailable,
    })
  ) {
    redirect(MANAGER_VERIFICATION_PATH);
  }
}
