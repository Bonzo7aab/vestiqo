import { redirect } from 'next/navigation';
import { createClient } from '../../lib/supabase/server';
import { getUserVerificationStatus } from '../../lib/database/verification-queries';
import {
  isManagerAccessPending,
  MANAGER_VERIFICATION_PATH,
} from '../../lib/auth/manager-access-pending';
import { AccountVerificationPending } from '../../components/auth/AccountVerificationPending';

interface PageProps {
  searchParams: Promise<{ message?: string; error?: string }>;
}

export default async function ManagerAccountVerificationPage({ searchParams }: PageProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/logowanie?redirectTo=${encodeURIComponent(MANAGER_VERIFICATION_PATH)}`);
  }

  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('user_type, platform_role, is_verified, email_verified_at')
    .eq('id', user.id)
    .maybeSingle();

  if (profileError || !profile) {
    redirect('/logowanie');
  }

  const pending = isManagerAccessPending({
    userType: profile.user_type,
    platformRole: profile.platform_role,
    isVerified: profile.is_verified,
    emailVerifiedAt: profile.email_verified_at,
  });

  if (!pending) {
    const home =
      profile.platform_role === 'platform_admin'
        ? '/administracja'
        : profile.user_type === 'contractor'
          ? '/panel-wykonawcy'
          : '/panel-zarzadcy';
    redirect(home);
  }

  const verification = await getUserVerificationStatus(user.id, supabase);
  const params = await searchParams;

  return (
    <AccountVerificationPending
      email={user.email ?? ''}
      emailVerified={Boolean(profile.email_verified_at)}
      verification={verification}
      message={params.message ?? null}
      error={params.error ?? null}
    />
  );
}
