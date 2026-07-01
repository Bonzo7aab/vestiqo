'use client'

import * as Sentry from '@sentry/nextjs'
import posthog from 'posthog-js'
import { createContext, useContext, useEffect, useState, useCallback, useMemo, useRef } from 'react'
import type { Session, SupabaseClient, User } from '@supabase/supabase-js'
import { createClient } from '../lib/supabase/client'
import { isInvalidRefreshTokenError } from '../lib/auth/sessionErrors'
import { isUserRegistryVerified } from '../lib/registry/build-snapshot-from-rows'
import type { AuthUser } from '../types/auth'

type AuthContextType = {
  session: Session | null
  supabase: SupabaseClient
  user: AuthUser | null
  logout: () => Promise<void>
  refreshSession: () => Promise<void>
  isAuthenticated: boolean
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export default function AuthProvider({
  children,
  impersonationSubjectId = null,
}: {
  children: React.ReactNode
  impersonationSubjectId?: string | null
}) {
  const supabase = useMemo(() => createClient(), [])
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const initialSessionHandled = useRef(false)

  const fetchUserProfile = useCallback(async (authUser: User): Promise<AuthUser | null> => {
    const profileUserId = impersonationSubjectId ?? authUser.id
    try {
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', profileUserId)
        .maybeSingle()

      if (profileError || !profile) {
        console.warn('No profile found for user:', profileUserId, profileError)
        // Match HeaderWithSession fallback so protected routes do not loop on session-without-profile.
        return {
          id: profileUserId,
          email: authUser.email ?? '',
          firstName:
            (authUser.user_metadata?.first_name as string | undefined) ??
            authUser.email?.split('@')[0] ??
            'User',
          lastName: (authUser.user_metadata?.last_name as string | undefined) ?? '',
          userType:
            (authUser.user_metadata?.user_type as AuthUser['userType'] | undefined) ??
            'contractor',
          isVerified: false,
          verificationSubmittedAt: null,
          profileCompleted: false,
          onboardingCompleted: false,
          platformRole: impersonationSubjectId ? 'user' : 'user',
        }
      }

      let registryVerified: boolean | undefined;
      if (profile.user_type === 'contractor') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const sb = supabase as any;
        const { data: relation } = await sb
          .from('user_companies')
          .select('company_id')
          .eq('user_id', profileUserId)
          .eq('is_primary', true)
          .eq('is_active', true)
          .maybeSingle();

        if (relation?.company_id) {
          const { data: company } = await supabase
            .from('companies')
            .select('registry_source, registry_status, legal_form, krs, registry_checked_at')
            .eq('id', relation.company_id)
            .maybeSingle();

          const { data: settings } = await sb
            .from('contractor_account_settings')
            .select(
              'vat_status, vat_whitelist_account_assigned, finance_registry_status, finance_registry_checked_at',
            )
            .eq('user_id', profileUserId)
            .maybeSingle();

          registryVerified = isUserRegistryVerified(company, settings);
        } else {
          registryVerified = false;
        }
      }

      return {
        id: profileUserId,
        email: authUser.email!,
        firstName: profile.first_name,
        lastName: profile.last_name,
        userType: profile.user_type,
        phone: profile.phone || undefined,
        company: undefined,
        isVerified: profile.is_verified,
        registryVerified,
        verificationSubmittedAt: profile.verification_submitted_at ?? null,
        profileCompleted: profile.profile_completed,
        onboardingCompleted: profile.onboarding_completed,
        avatar: profile.avatar_url || undefined,
        platformRole: impersonationSubjectId ? 'user' : (profile.platform_role ?? 'user'),
        accountRole: profile.account_role ?? null,
        organizationType: profile.organization_type ?? null,
      }
    } catch (err) {
      console.error('Error fetching profile:', err)
      return null
    }
  }, [supabase, impersonationSubjectId])

  const loadProfileForSession = useCallback(
    async (nextSession: Session | null) => {
      if (!nextSession?.user) {
        setUser(null)
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      const userProfile = await fetchUserProfile(nextSession.user)
      setUser(userProfile)
      setIsLoading(false)
    },
    [fetchUserProfile]
  )

  const clearStaleSession = useCallback(async () => {
    try {
      await supabase.auth.signOut({ scope: 'local' })
    } catch {
      // Stale cookies may already be invalid; clearing local state is enough.
    }
    Sentry.setUser(null)
    setSession(null)
    setUser(null)
    setIsLoading(false)
  }, [supabase])

  const refreshSession = useCallback(async () => {
    try {
      const { error } = await supabase.auth.getUser()
      if (error) {
        if (isInvalidRefreshTokenError(error)) {
          await clearStaleSession()
        } else {
          setSession(null)
          setUser(null)
          setIsLoading(false)
        }
        return
      }

      const { data: sessionData } = await supabase.auth.getSession()
      setSession(sessionData.session)
      await loadProfileForSession(sessionData.session)
    } catch (error) {
      if (isInvalidRefreshTokenError(error)) {
        await clearStaleSession()
        return
      }
      console.error('Error refreshing session:', error)
      setIsLoading(false)
    }
  }, [supabase, loadProfileForSession, clearStaleSession])

  const logout = useCallback(async () => {
    try {
      await supabase.auth.signOut({ scope: 'local' })
      Sentry.setUser(null)
      setSession(null)
      setUser(null)
      setIsLoading(false)
    } catch (error) {
      console.error('Error during logout:', error)
    }
  }, [supabase])

  const isAuthenticated = !!session

  useEffect(() => {
    if (user?.id) {
      Sentry.setUser({ id: user.id })
      posthog.identify(user.id, {
        email: user.email,
        name: `${user.firstName} ${user.lastName}`,
        user_type: user.userType,
      })
    } else if (!session) {
      Sentry.setUser(null)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, session])

  useEffect(() => {
    let mounted = true

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!mounted) return

      if (event === 'SIGNED_OUT') {
        setSession(null)
        setUser(null)
        setIsLoading(false)
        return
      }

      if (
        event === 'INITIAL_SESSION' ||
        event === 'SIGNED_IN' ||
        event === 'TOKEN_REFRESHED' ||
        event === 'USER_UPDATED'
      ) {
        setSession(nextSession)

        if (event === 'INITIAL_SESSION') {
          initialSessionHandled.current = true
        }

        // Defer Supabase calls out of the auth callback (Supabase recommendation).
        setTimeout(() => {
          if (!mounted) return
          void loadProfileForSession(nextSession)
        }, 0)
      }
    })

    // Fallback if INITIAL_SESSION never fires (should be rare).
    const fallbackTimer = window.setTimeout(() => {
      if (!mounted || initialSessionHandled.current) return
      void refreshSession()
    }, 2500)

    return () => {
      mounted = false
      window.clearTimeout(fallbackTimer)
      subscription.unsubscribe()
    }
  }, [supabase, loadProfileForSession, refreshSession, impersonationSubjectId])

  useEffect(() => {
    if (!session?.user) {
      return
    }
    void loadProfileForSession(session)
  }, [impersonationSubjectId, session, loadProfileForSession])

  const contextValue = useMemo(
    () => ({
      session,
      supabase,
      user,
      logout,
      refreshSession,
      isAuthenticated,
      isLoading,
    }),
    [session, supabase, user, logout, refreshSession, isAuthenticated, isLoading]
  )

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
}

export const useUserProfile = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useUserProfile must be used within a SupabaseProvider')
  }
  return context
}
