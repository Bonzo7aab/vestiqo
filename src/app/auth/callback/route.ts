import { NextResponse, type NextRequest } from 'next/server';
import type { EmailOtpType } from '@supabase/supabase-js';
import {
  establishSessionFromAuthCallback,
  resolvePostAuthCallbackRedirect,
} from '../../../lib/auth/handle-auth-callback';
import { translateAuthErrorMessage } from '../../../lib/auth/errorMessages';
import { createAuthRouteSupabaseClient } from '../../../lib/supabase/auth-route';

/**
 * PKCE OAuth / same-browser flows (`?code=`). Email links should use `/auth/confirm`.
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const token_hash = url.searchParams.get('token_hash');
  const type = url.searchParams.get('type') as EmailOtpType | null;
  const next = url.searchParams.get('next');

  if (token_hash && type) {
    const confirmUrl = new URL('/auth/confirm', url.origin);
    confirmUrl.search = url.search;
    return NextResponse.redirect(confirmUrl);
  }

  if (!code) {
    return NextResponse.redirect(
      new URL(
        `/logowanie?error=${encodeURIComponent('Nieprawidłowy lub niekompletny link logowania.')}`,
        url.origin,
      ),
    );
  }

  const response = NextResponse.redirect(new URL('/', url.origin));
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
        ? 'Nieprawidłowy lub niekompletny link logowania.'
        : translateAuthErrorMessage(result.error);
    return NextResponse.redirect(
      new URL(`/logowanie?error=${encodeURIComponent(message)}`, url.origin),
    );
  }

  const redirectPath = await resolvePostAuthCallbackRedirect(supabase, next);
  response.headers.set('Location', new URL(redirectPath, url.origin).toString());

  return response;
}
