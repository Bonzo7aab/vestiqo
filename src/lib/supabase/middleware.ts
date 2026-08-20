import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { isInvalidRefreshTokenError } from '../auth/sessionErrors'
import { isManagerContestPath } from '../auth/manager-contest-routes'
import {
  IMPERSONATION_COOKIE_NAME,
  readImpersonationFromCookieGetter,
} from '../admin/impersonation'
import type { Database } from '../../types/database'
import { supabaseCookieOptions } from './cookie-options'
import {
  contractorServicesGateSearch,
  isContractorServicesGateExemptPath,
} from '../contractor-services-gate'

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
    '/zapisane-zgloszenia',
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
  const isManagerContestRoute = isManagerContestPath(pathname)
  const isAuthEntryPath = pathname === '/logowanie' || pathname === '/rejestracja'

  // Ghost session: auth cookie present but profile gone (e.g. after account deletion).
  if (user) {
    let servicesGateEnabled = true
    const firstProfile = await supabase
      .from('user_profiles')
      .select('user_type, platform_role, contractor_services_completed')
      .eq('id', user.id)
      .maybeSingle()

    let profile = firstProfile.data
    if (firstProfile.error) {
      servicesGateEnabled = false
      const fallback = await supabase
        .from('user_profiles')
        .select('user_type, platform_role')
        .eq('id', user.id)
        .maybeSingle()
      profile = fallback.data
        ? { ...fallback.data, contractor_services_completed: true }
        : null
    }

    if (!profile) {
      await supabase.auth.signOut({ scope: 'local' })

      if (isProtectedPath || isAuthEntryPath) {
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

    const impersonationCookieValue = request.cookies.get(IMPERSONATION_COOKIE_NAME)?.value
    const impersonation =
      impersonationCookieValue
        ? readImpersonationFromCookieGetter(
            () => impersonationCookieValue,
            user.id,
          )
        : null

    if (impersonationCookieValue && !impersonation) {
      supabaseResponse.cookies.delete(IMPERSONATION_COOKIE_NAME)
    }

    const isImpersonating = impersonation !== null
    const routeAsAdmin = isAdmin && !isImpersonating
    const effectiveIsContractor = isImpersonating
      ? impersonation.subjectUserType === 'contractor'
      : isContractor
    const effectiveIsManager = isImpersonating
      ? impersonation.subjectUserType === 'manager'
      : isManager

    if (
      servicesGateEnabled &&
      effectiveIsContractor &&
      !routeAsAdmin &&
      !isImpersonating &&
      profile.contractor_services_completed !== true
    ) {
      const tab = request.nextUrl.searchParams.get('tab')
      if (!isContractorServicesGateExemptPath(pathname, tab)) {
        const url = request.nextUrl.clone()
        url.pathname = '/konto'
        url.search = contractorServicesGateSearch()
        return NextResponse.redirect(url)
      }
    }

    const homePathFor = (() => {
      if (routeAsAdmin) return '/administracja'
      if (effectiveIsContractor) {
        return isImpersonating ? '/panel-wykonawcy/aplikacje' : '/panel-wykonawcy'
      }
      return '/panel-zarzadcy'
    })()

    if (
      isAuthEntryPath ||
      isAccountPath ||
      isManagerDashboardPath ||
      isContractorOnlyPath ||
      isAdminPath ||
      isManagerContestRoute
    ) {
      // Already authenticated → bounce away from /logowanie & /rejestracja to role-correct landing
      if (isAuthEntryPath) {
        const url = request.nextUrl.clone()
        url.pathname = homePathFor
        url.search = ''
        return NextResponse.redirect(url)
      }

      // /panel-zarzadcy is manager-only (contractors/admins are sent to their home)
      if (isManagerDashboardPath && !routeAsAdmin && !effectiveIsManager) {
        const url = request.nextUrl.clone()
        url.pathname = homePathFor
        return NextResponse.redirect(url)
      }
      if ((isManagerDashboardPath || isAccountPath) && routeAsAdmin) {
        const url = request.nextUrl.clone()
        url.pathname = '/administracja'
        return NextResponse.redirect(url)
      }

      // /panel-wykonawcy is contractor-only (admin lands on /administracja instead)
      if (isContractorOnlyPath && !effectiveIsContractor && !routeAsAdmin) {
        const url = request.nextUrl.clone()
        url.pathname = homePathFor
        return NextResponse.redirect(url)
      }
      if (isContractorOnlyPath && routeAsAdmin) {
        const url = request.nextUrl.clone()
        url.pathname = '/administracja'
        return NextResponse.redirect(url)
      }

      // /administracja is admin-only (real admin session, not impersonation view)
      if (isAdminPath && !isAdmin) {
        const url = request.nextUrl.clone()
        url.pathname = homePathFor
        return NextResponse.redirect(url)
      }

      // Contest creation is manager-only (contractors cannot create contests)
      if (isManagerContestRoute && effectiveIsContractor && !routeAsAdmin) {
        const url = request.nextUrl.clone()
        url.pathname = homePathFor
        return NextResponse.redirect(url)
      }
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
