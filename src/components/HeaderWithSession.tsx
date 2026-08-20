import { createClient } from '../lib/supabase/server';
import { getEffectiveUserContext } from '../lib/auth/effective-user';
import { isCalendarFeatureEnabled } from '../lib/flagship/calendar-feature';
import { buildEvaluationContext } from '../lib/flagship/context';
import { isFeatureEnabled } from '../lib/flagship/evaluate';
import { FLAGSHIP_FLAG_KEYS } from '../lib/flagship/keys';
import { getRegistryVerifiedForUser } from '../lib/registry/load-snapshot-for-user';
import { Suspense } from 'react';
import { Header } from './Header';
import { HeaderNearestEventsLoader } from './HeaderNearestEventsLoader';
import { HeaderNearestEventsStripFallback } from './HeaderNearestEventsStrip';
import type { AuthUser } from '../types/auth';

export async function HeaderWithSession() {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  const effectiveContext = await getEffectiveUserContext();
  const profileUserId = effectiveContext?.effectiveUserId ?? authUser?.id ?? null;

  let initialUser: AuthUser | null = null;

  if (authUser && profileUserId) {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select(
        'first_name, last_name, user_type, phone, is_verified, verification_submitted_at, profile_completed, onboarding_completed, avatar_url, platform_role, account_role, organization_type'
      )
      .eq('id', profileUserId)
      .maybeSingle();

    if (profile) {
      const registryVerified =
        profile.user_type === 'contractor'
          ? await getRegistryVerifiedForUser(supabase, profileUserId)
          : undefined;

      initialUser = {
        id: profileUserId,
        email: authUser.email ?? '',
        firstName: profile.first_name,
        lastName: profile.last_name,
        userType: profile.user_type,
        phone: profile.phone ?? undefined,
        isVerified: profile.is_verified,
        registryVerified,
        verificationSubmittedAt: profile.verification_submitted_at ?? null,
        profileCompleted: profile.profile_completed,
        onboardingCompleted: profile.onboarding_completed,
        avatar: profile.avatar_url ?? undefined,
        platformRole: effectiveContext?.isImpersonating ? 'user' : (profile.platform_role ?? 'user'),
        accountRole: profile.account_role ?? null,
        organizationType: profile.organization_type ?? null,
      };
    } else {
      initialUser = null;
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

  const [showOrders, showCalendar] = await Promise.all([
    isFeatureEnabled(FLAGSHIP_FLAG_KEYS.ORDERS, evaluationContext),
    isCalendarFeatureEnabled(evaluationContext),
  ]);

  const showNearestEvents = Boolean(
    showCalendar && initialUser && initialUser.userType !== 'contractor' && profileUserId,
  );

  return (
    <Header
      initialUser={initialUser}
      showOrders={showOrders}
      nearestEventsSlot={
        showNearestEvents && profileUserId ? (
          <Suspense fallback={<HeaderNearestEventsStripFallback />}>
            <HeaderNearestEventsLoader userId={profileUserId} />
          </Suspense>
        ) : null
      }
    />
  );
}
