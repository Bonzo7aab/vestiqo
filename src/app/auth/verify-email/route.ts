import { NextRequest, NextResponse } from 'next/server';
import { verifyEmailVerificationToken } from '../../../lib/auth/email-verification-token';
import { MANAGER_VERIFICATION_PATH } from '../../../lib/auth/manager-access-pending';
import { createAdminClientOrNull } from '../../../lib/supabase/admin';
import { createClient } from '../../../lib/supabase/server';

function redirectWithMessage(origin: string, message: string, error = false): NextResponse {
  const url = new URL(MANAGER_VERIFICATION_PATH, origin);
  url.searchParams.set(error ? 'error' : 'message', message);
  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const token = searchParams.get('token')?.trim() ?? '';

  if (!token) {
    return redirectWithMessage(origin, 'Nieprawidłowy lub niekompletny link potwierdzający.', true);
  }

  const payload = verifyEmailVerificationToken(token);
  if (!payload) {
    return redirectWithMessage(
      origin,
      'Link potwierdzający jest nieważny lub wygasł. Wyślij wiadomość ponownie.',
      true,
    );
  }

  const now = new Date().toISOString();
  const admin = createAdminClientOrNull();

  if (admin) {
    const { error } = await admin
      .from('user_profiles')
      .update({ email_verified_at: now })
      .eq('id', payload.userId)
      .is('email_verified_at', null);

    if (error) {
      console.error('[verify-email] admin update failed', error.message);
      return redirectWithMessage(origin, 'Nie udało się potwierdzić adresu email. Spróbuj ponownie.', true);
    }

    return redirectWithMessage(origin, 'Adres email został potwierdzony. Konto oczekuje na weryfikację administratora.');
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.id !== payload.userId) {
    return NextResponse.redirect(
      new URL(
        `/logowanie?redirectTo=${encodeURIComponent(MANAGER_VERIFICATION_PATH)}&message=${encodeURIComponent('Zaloguj się, aby dokończyć potwierdzenie adresu email.')}`,
        origin,
      ),
    );
  }

  const { error } = await supabase
    .from('user_profiles')
    .update({ email_verified_at: now })
    .eq('id', payload.userId)
    .is('email_verified_at', null);

  if (error) {
    console.error('[verify-email] user update failed', error.message);
    return redirectWithMessage(origin, 'Nie udało się potwierdzić adresu email. Spróbuj ponownie.', true);
  }

  return redirectWithMessage(origin, 'Adres email został potwierdzony. Konto oczekuje na weryfikację administratora.');
}
