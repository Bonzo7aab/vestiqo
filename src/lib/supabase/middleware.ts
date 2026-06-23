import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { isInvalidRefreshTokenError } from '../auth/sessionErrors'
import type { Database } from '../../types/database'
import { supabaseCookieOptions } from './cookie-options'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookieOptions: supabaseCookieOptions,
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)
            supabaseResponse.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError && isInvalidRefreshTokenError(authError)) {
    await supabase.auth.signOut({ scope: 'local' })
  }

  // Protected routes that require authentication
  const protectedPaths = [
    '/panel-wykonawcy',
    '/panel-zarzadcy',
    '/konto',
    '/dodaj-konkurs',
    '/dodaj-przetarg',
    '/tworzenie-przetargu',
    '/administracja',
  ]

  const isProtectedPath = protectedPaths.some(path =>
    request.nextUrl.pathname.startsWith(path)
  )

  // Redirect to login if accessing protected route without authentication
  if (isProtectedPath && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/logowanie'
    url.searchParams.set('redirectTo', request.nextUrl.pathname)
    return NextResponse.redirect(url)
  }

  const pathname = request.nextUrl.pathname
  // `/konto` is shared (managers + contractors); only manager dashboard is manager-only.
  const isAccountPath = pathname === '/konto' || pathname.startsWith('/konto/')
  const isManagerDashboardPath =
    pathname === '/panel-zarzadcy' || pathname.startsWith('/panel-zarzadcy/')
  const isContractorOnlyPath =
    pathname === '/panel-wykonawcy' || pathname.startsWith('/panel-wykonawcy/')
  const isAdminPath = pathname === '/administracja' || pathname.startsWith('/administracja/')
  const isAuthEntryPath = pathname === '/logowanie' || pathname === '/rejestracja'

  // Fetch role only when we may need to act on it
  if (
    user &&
    (isAuthEntryPath ||
      isAccountPath ||
      isManagerDashboardPath ||
      isContractorOnlyPath ||
      isAdminPath)
  ) {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('user_type, platform_role')
      .eq('id', user.id)
      .maybeSingle()

    // Ghost session: auth cookie present but profile gone (e.g. after account deletion).
    if (!profile) {
      await supabase.auth.signOut({ scope: 'local' })

      if (isProtectedPath) {
        const url = request.nextUrl.clone()
        url.pathname = '/logowanie'
        url.search = ''
        return NextResponse.redirect(url)
      }

      supabaseResponse.headers.set('x-pathname', pathname)
      return supabaseResponse
    }

    const isAdmin = profile.platform_role === 'platform_admin'
    const isContractor = profile.user_type === 'contractor'
    const isManager = profile.user_type === 'manager'

    const homePathFor = (() => {
      if (isAdmin) return '/administracja'
      if (isContractor) return '/panel-wykonawcy'
      return '/panel-zarzadcy'
    })()

    // Already authenticated → bounce away from /logowanie & /rejestracja to role-correct landing
    if (isAuthEntryPath) {
      const url = request.nextUrl.clone()
      url.pathname = homePathFor
      url.search = ''
      return NextResponse.redirect(url)
    }

    // /panel-zarzadcy is manager-only (contractors/administracjas are sent to their home)
    if (isManagerDashboardPath && !isAdmin && !isManager) {
      const url = request.nextUrl.clone()
      url.pathname = homePathFor
      return NextResponse.redirect(url)
    }
    if ((isManagerDashboardPath || isAccountPath) && isAdmin) {
      const url = request.nextUrl.clone()
      url.pathname = '/administracja'
      return NextResponse.redirect(url)
    }

    // /panel-wykonawcy is contractor-only (admin lands on /administracja instead)
    if (isContractorOnlyPath && !isContractor && !isAdmin) {
      const url = request.nextUrl.clone()
      url.pathname = homePathFor
      return NextResponse.redirect(url)
    }
    if (isContractorOnlyPath && isAdmin) {
      const url = request.nextUrl.clone()
      url.pathname = '/administracja'
      return NextResponse.redirect(url)
    }

    // /administracja is admin-only
    if (isAdminPath && !isAdmin) {
      const url = request.nextUrl.clone()
      url.pathname = homePathFor
      return NextResponse.redirect(url)
    }
  }

  // Redirect to onboarding if profile is not completed (only for protected paths)
  // if (user && isProtectedPath) {
  //   const { data: profile } = await supabase
  //     .from('user_profiles')
  //     .select('profile_completed, onboarding_completed')
  //     .eq('id', user.id)
  //     .single()

  //   if (!profile?.profile_completed || !profile?.onboarding_completed) {
  //     const url = request.nextUrl.clone()
  //     url.pathname = '/wdrozenie'
  //     return NextResponse.redirect(url)
  //   }
  // }

  // IMPORTANT: You *must* return the supabaseResponse object as it is. If you're
  // creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the myNewResponse object instead of the supabaseResponse object

  supabaseResponse.headers.set('x-pathname', pathname)

  return supabaseResponse
}
