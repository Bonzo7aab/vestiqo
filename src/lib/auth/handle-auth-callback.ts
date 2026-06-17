import type { EmailOtpType, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../types/database';
import { sanitizeRedirectPath } from './redirectPath';

export interface AuthCallbackSearchParams {
  code: string | null;
  token_hash: string | null;
  type: EmailOtpType | null;
  next: string | null;
}

export async function establishSessionFromAuthCallback(
  supabase: SupabaseClient<Database>,
  params: AuthCallbackSearchParams,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (params.token_hash && params.type) {
    const { error } = await supabase.auth.verifyOtp({
      type: params.type,
      token_hash: params.token_hash,
    });
    if (error) {
      return { ok: false, error: error.message };
    }
    return { ok: true };
  }

  if (params.code) {
    const { error } = await supabase.auth.exchangeCodeForSession(params.code);
    if (error) {
      return { ok: false, error: error.message };
    }
    return { ok: true };
  }

  return { ok: false, error: 'missing_params' };
}

export async function resolvePostAuthCallbackRedirect(
  supabase: SupabaseClient<Database>,
  next: string | null,
): Promise<string> {
  const requested = sanitizeRedirectPath(next, '');
  if (requested) {
    return requested;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return `/logowanie?message=${encodeURIComponent('Adres email został potwierdzony. Zaloguj się, aby kontynuować.')}`;
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('user_type, platform_role')
    .eq('id', user.id)
    .single();

  const isAdmin = profile?.platform_role === 'platform_admin';
  const isContractor = profile?.user_type === 'contractor';

  const homePath = isAdmin
    ? '/administracja'
    : isContractor
      ? '/panel-wykonawcy'
      : '/panel-zarzadcy';

  const message = encodeURIComponent('Adres email został potwierdzony.');
  return `${homePath}?message=${message}`;
}
