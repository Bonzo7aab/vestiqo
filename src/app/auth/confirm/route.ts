import { type EmailOtpType } from '@supabase/supabase-js';
import { type NextRequest, NextResponse } from 'next/server';
import {
  establishSessionFromAuthCallback,
  resolvePostAuthCallbackRedirect,
} from '../../../lib/auth/handle-auth-callback';
import { translateAuthErrorMessage } from '../../../lib/auth/errorMessages';
import { createAuthRouteSupabaseClient } from '../../../lib/supabase/auth-route';

/** Email confirmation, password recovery, and other OTP links (`token_hash` + `type`). */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const token_hash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;
  const code = searchParams.get('code');
  const next = searchParams.get('next');

  if (code && !token_hash) {
    const callbackUrl = new URL('/auth/callback', origin);
    callbackUrl.search = searchParams.toString();
    return NextResponse.redirect(callbackUrl);
  }

  if (!token_hash || !type) {
    return NextResponse.redirect(
      new URL(
        `/logowanie?error=${encodeURIComponent('Nieprawidłowy lub niekompletny link potwierdzający.')}`,
        origin,
      ),
    );
  }

  const response = NextResponse.redirect(new URL('/', origin));
  const supabase = createAuthRouteSupabaseClient(request, response);

  const result = await establishSessionFromAuthCallback(supabase, {
    code,
    token_hash,
    type,
    next,
  });

  if (result.ok === false) {
    const message =
      result.error === 'missing_params'
        ? 'Nieprawidłowy lub niekompletny link potwierdzający.'
        : translateAuthErrorMessage(result.error);
    return NextResponse.redirect(
      new URL(`/logowanie?error=${encodeURIComponent(message)}`, origin),
    );
  }

  const redirectPath = await resolvePostAuthCallbackRedirect(supabase, next);
  response.headers.set('Location', new URL(redirectPath, origin).toString());

  return response;
}
