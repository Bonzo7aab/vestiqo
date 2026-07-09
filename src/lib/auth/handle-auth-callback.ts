import type { EmailOtpType, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../types/database';
import { EMAIL_CONFIRMED_LOGIN_MESSAGE } from './errorMessages';
import { sanitizeRedirectPath } from './redirectPath';

export { EMAIL_CONFIRMED_LOGIN_MESSAGE };

export interface AuthCallbackSearchParams {
  code: string | null;
  token_hash: string | null;
  type: EmailOtpType | null;
  next: string | null;
}

/** PKCE session exchange fails on another device; Supabase may already have confirmed the email. */
export function isCrossDevicePkceSessionError(error: string): boolean {
  const lower = error.toLowerCase();
  return (
    lower.includes('pkce code verifier not found') ||
    lower.includes('code verifier should be non-empty') ||
    lower.includes('flow_state_not_found')
  );
}

export function loginPathAfterCrossDeviceEmailConfirmation(): string {
  return `/logowanie?message=${encodeURIComponent(EMAIL_CONFIRMED_LOGIN_MESSAGE)}`;
}

export function resolveAuthCallbackFailureRedirect(error: string): string | null {
  if (isCrossDevicePkceSessionError(error)) {
    return loginPathAfterCrossDeviceEmailConfirmation();
  }
  return null;
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
  type: EmailOtpType | null = null,
): Promise<string> {
  if (type === 'recovery') {
    return sanitizeRedirectPath(next, '/auth/aktualizacja-hasla') || '/auth/aktualizacja-hasla';
  }

  if (type === 'signup' || type === 'email') {
    const message = encodeURIComponent('Adres email został potwierdzony.');
    return `/?message=${message}`;
  }

  const requested = sanitizeRedirectPath(next, '');
  if (requested) {
    return requested;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return `/logowanie?message=${encodeURIComponent(EMAIL_CONFIRMED_LOGIN_MESSAGE)}`;
  }

  const message = encodeURIComponent('Adres email został potwierdzony.');
  return `/?message=${message}`;
}
