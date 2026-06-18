import { createClient } from '../lib/supabase/server';
import { buildEvaluationContext } from '../lib/flagship/context';
import { isFeatureEnabled } from '../lib/flagship/evaluate';
import { FLAGSHIP_FLAG_KEYS } from '../lib/flagship/keys';
import { Header } from './Header';
import type { AuthUser } from '../types/auth';

export async function HeaderWithSession() {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  let initialUser: AuthUser | null = null;

  if (authUser) {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select(
        'first_name, last_name, user_type, phone, is_verified, verification_submitted_at, profile_completed, onboarding_completed, avatar_url, platform_role'
      )
      .eq('id', authUser.id)
      .maybeSingle();

    if (profile) {
      initialUser = {
        id: authUser.id,
        email: authUser.email ?? '',
        firstName: profile.first_name,
        lastName: profile.last_name,
        userType: profile.user_type,
        phone: profile.phone ?? undefined,
        isVerified: profile.is_verified,
        verificationSubmittedAt: profile.verification_submitted_at ?? null,
        profileCompleted: profile.profile_completed,
        onboardingCompleted: profile.onboarding_completed,
        avatar: profile.avatar_url ?? undefined,
        platformRole: profile.platform_role ?? 'user',
      };
    } else {
      initialUser = {
        id: authUser.id,
        email: authUser.email ?? '',
        firstName: authUser.user_metadata?.first_name ?? authUser.email?.split('@')[0] ?? 'User',
        lastName: authUser.user_metadata?.last_name ?? '',
        userType: (authUser.user_metadata?.user_type as AuthUser['userType']) ?? 'contractor',
        isVerified: false,
        profileCompleted: false,
        onboardingCompleted: false,
      };
    }
  }

  const evaluationContext = buildEvaluationContext(
    initialUser
      ? {
          id: initialUser.id,
          email: initialUser.email,
          userType: initialUser.userType,
          platformRole: initialUser.platformRole,
        }
      : null,
  );

  const showOrders = await isFeatureEnabled(
    FLAGSHIP_FLAG_KEYS.ORDERS,
    evaluationContext,
  );

  return (
    <Header
      initialUser={initialUser}
      showOrders={showOrders}
    />
  );
}
