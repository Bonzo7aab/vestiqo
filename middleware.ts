import { updateSession } from './src/lib/supabase/middleware'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * First path segment for routes defined under `src/app`.
 * Anything else (e.g. /foo-bar) is redirected to `/` after session refresh.
 * Invalid dynamic IDs (e.g. /konkurs/…) are handled by `src/app/not-found.tsx`.
 */
const ALLOWED_FIRST_SEGMENTS = new Set<string>([
  'administracja',
  'api',
  'auth',
  'aktualnosci',
  'dodaj-konkurs',
  'dodaj-przetarg',
  'dodaj-zlecenie',
  'faq',
  'kategorie-uslug',
  'konsultacja-eksperta',
  'kontakt',
  'o-nas',
  'pomoc-dla-wykonawcow',
  'pomoc-dla-zarzadcow',
  'konto',
  'logowanie',
  'panel-wykonawcy',
  'panel-zarzadcy',
  'polityka-prywatnosci',
  'powitanie',
  'pytania-konkursu',
  'regulamin',
  'rejestracja',
  'samouczek',
  'tworzenie-przetargu',
  'uzupelnianie-profilu',
  'wdrozenie',
  'weryfikacja',
  'wiadomosci',
  'wybor-typu-konkursu',
  'wybor-typu-konta',
  'wykonawcy',
  'zapisane-zgloszenia',
  'zapomniane-haslo',
  'zarzadcy',
  'konkurs',
])

function isKnownAppRoute(pathname: string): boolean {
  if (pathname === '/') return true
  const segment = pathname.split('/').filter(Boolean)[0]
  if (!segment) return true
  if (segment.startsWith('.')) return true
  return ALLOWED_FIRST_SEGMENTS.has(segment)
}

function copyCookies(from: NextResponse, to: NextResponse): void {
  from.cookies.getAll().forEach((cookie) => {
    to.cookies.set(cookie.name, cookie.value, {
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    })
  })
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const code = request.nextUrl.searchParams.get('code')
  const tokenHash = request.nextUrl.searchParams.get('token_hash')
  const type = request.nextUrl.searchParams.get('type')

  if (
    tokenHash &&
    type &&
    pathname !== '/auth/confirm'
  ) {
    const confirmUrl = request.nextUrl.clone()
    confirmUrl.pathname = '/auth/confirm'
    return NextResponse.redirect(confirmUrl)
  }

  if (
    code &&
    pathname !== '/auth/callback' &&
    pathname !== '/auth/confirm'
  ) {
    const callbackUrl = request.nextUrl.clone()
    callbackUrl.pathname = '/auth/callback'
    return NextResponse.redirect(callbackUrl)
  }

  const sessionResponse = await updateSession(request)
  if (sessionResponse.headers.has('location')) {
    return sessionResponse
  }
  if (!isKnownAppRoute(request.nextUrl.pathname)) {
    const redirectHome = NextResponse.redirect(new URL('/', request.url))
    copyCookies(sessionResponse, redirectHome)
    return redirectHome
  }
  return sessionResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!monitoring|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
