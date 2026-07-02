'use client'

import React, { useState, useEffect, useMemo } from 'react';
import posthog from 'posthog-js';
import {
  User,
  MessagesSquare,
  Star,
  ChevronDown,
  UserPlus,
} from 'lucide-react';
import { VerificationAttentionIcon } from './VerificationAttentionIcon';
import { HeaderJobSearch } from './HeaderJobSearch';
import { Button } from './ui/button';
import { UnifiedNotifications } from './UnifiedNotifications';
import { useUserProfile } from '../contexts/AuthContext';
import { createClient } from '../lib/supabase/client';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from './ui/drawer';
import { AuthPromptPopover, AUTH_PROMPT_FAVORITES, AUTH_PROMPT_MESSAGES } from './AuthPromptPopover';
import { Avatar, AvatarFallback } from './ui/avatar';
import type { AuthUser } from '../types/auth';
import { useNavigationWithLoading } from '../hooks/useNavigationWithLoading';
import { usePathname } from 'next/navigation';
import { useLayoutContext } from './ConditionalFooter';
import {
  mergeAuthUsersForDisplay,
  needsVerificationAttention,
  verificationAttentionAriaLabel,
  verificationMenuLabel,
} from '../lib/verification/needs-verification-attention';
import { getAccountRoleDisplayLabel } from '../lib/profile/account-role-labels';
import { CONTRACTOR_VERIFICATION_DOCUMENTS_PATH } from '../lib/verification/documents-route';
import { BrandLogo } from './BrandLogo';
import { BRAND } from '../lib/brand';
import { cn } from './ui/utils';
import { AccountMenuPanel } from './account/AccountMenuPanel';
import { buildAccountMenuSections } from '../lib/account-menu-sections';

function GuestAuthDropdown({
  onLogin,
  onRegister,
  triggerClassName,
}: {
  onLogin: () => void;
  onRegister: () => void;
  triggerClassName?: string;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="default" size="sm" className={triggerClassName ?? 'text-sm'}>
          Zaloguj się
          <ChevronDown className="h-4 w-4 ml-1 opacity-80" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72 p-0 overflow-hidden">
        <div className="border-b bg-muted/40 px-4 py-3.5">
          <p className="text-sm font-semibold text-foreground">Dołącz do {BRAND.name}</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Zaloguj się lub załóż konto, aby składać oferty i zarządzać konkursami.
          </p>
        </div>
        <div className="p-2">
          <button
            type="button"
            onClick={onLogin}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-accent"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <User className="h-4 w-4" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-medium text-foreground">Zaloguj się</span>
              <span className="block text-xs text-muted-foreground">Masz już konto</span>
            </span>
          </button>
          <button
            type="button"
            onClick={onRegister}
            className="mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-accent"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <UserPlus className="h-4 w-4" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-medium text-foreground">Załóż konto</span>
              <span className="block text-xs text-muted-foreground">Dla zarządcy lub wykonawcy</span>
            </span>
          </button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

interface HeaderProps {
  initialUser?: AuthUser | null;
  /** Set server-side from Flagship `orders` flag. Defaults to hidden. */
  showOrders?: boolean;
}

export function Header({
  initialUser,
  showOrders = false,
}: HeaderProps) {
  const router = useNavigationWithLoading();
  const pathname = usePathname();
  const { setIsMapExpanded } = useLayoutContext();
  const { user: contextUser, session, isAuthenticated: contextIsAuthenticated, logout, isLoading } = useUserProfile();
  const [isMounted, setIsMounted] = useState(false);
  const [liveVerificationSubmittedAt, setLiveVerificationSubmittedAt] = useState<
    string | null | undefined
  >(undefined);

  // Ensure consistent hydration
  useEffect(() => {
    // Use setTimeout to avoid synchronous setState in effect
    setTimeout(() => {
      setIsMounted(true);
    }, 0);
  }, []);
  
  // Authentication state: use context when mounted; before mount, trust server initialUser
  const userIsAuthenticated = isMounted
    ? contextIsAuthenticated
    : !!(initialUser || contextIsAuthenticated)

  // Merge client + server profile so verification_submitted_at from SSR is kept in the menu label.
  const currentUser = useMemo(() => {
    const sessionFallback = session?.user
      ? ({
          id: session.user.id,
          email: session.user.email || '',
          firstName:
            session.user.user_metadata?.first_name ||
            session.user.email?.split('@')[0] ||
            'User',
          lastName: session.user.user_metadata?.last_name || '',
          userType: session.user.user_metadata?.user_type || 'contractor',
          isVerified: false,
          verificationSubmittedAt: null,
          profileCompleted: false,
          onboardingCompleted: false,
        } as AuthUser)
      : null;

    return mergeAuthUsersForDisplay(contextUser, initialUser ?? null, sessionFallback);
  }, [contextUser, initialUser, session]);

  const shouldFetchVerificationSubmittedAt =
    isMounted &&
    Boolean(currentUser?.id) &&
    currentUser?.userType === 'contractor' &&
    currentUser.isVerified !== true &&
    currentUser.registryVerified !== true;

  useEffect(() => {
    if (!shouldFetchVerificationSubmittedAt || !currentUser?.id) {
      return;
    }

    let cancelled = false;
    const supabase = createClient();

    void supabase
      .from('user_profiles')
      .select('verification_submitted_at')
      .eq('id', currentUser.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled || error) {
          return;
        }
        setLiveVerificationSubmittedAt(data?.verification_submitted_at ?? null);
      });

    return () => {
      cancelled = true;
    };
  }, [
    shouldFetchVerificationSubmittedAt,
    currentUser?.id,
    pathname,
  ]);

  const userForVerificationUi = useMemo(() => {
    if (!currentUser) {
      return null;
    }
    if (!shouldFetchVerificationSubmittedAt || liveVerificationSubmittedAt === undefined) {
      return currentUser;
    }
    return {
      ...currentUser,
      verificationSubmittedAt:
        liveVerificationSubmittedAt ?? currentUser.verificationSubmittedAt ?? null,
    };
  }, [currentUser, liveVerificationSubmittedAt, shouldFetchVerificationSubmittedAt]);

  const showVerificationAttention = needsVerificationAttention(currentUser);
  const verificationAttentionLabel = verificationAttentionAriaLabel(userForVerificationUi);
  const isAdmin = currentUser?.platformRole === 'platform_admin'
  const showFavoritesNav =
    !currentUser ||
    (currentUser.userType !== 'manager' && currentUser.platformRole !== 'platform_admin')

  // Enhanced logout that redirects to login
  // We don't call router.refresh() to avoid race condition where server might still see session cookie
  // The context state update will handle the UI update, then we redirect
  const handleLogout = async () => {
    posthog.reset()
    await logout()
    window.location.href = '/logowanie?refresh_browser_auth=1'
  }

  const userRoleLabel = isAdmin
    ? 'ADMIN'
    : currentUser
      ? getAccountRoleDisplayLabel({
          userType: currentUser.userType,
          accountRole: currentUser.accountRole,
          organizationType: currentUser.organizationType,
        })
      : 'Wykonawca'

  const handleZgloszeniaClick = () => {
    router.push('/panel-zarzadcy/konkursy')
  }

  const handleZamowieniaClick = () => {
    router.push(
      currentUser?.userType === 'manager'
        ? '/panel-zarzadcy/zamowienia'
        : '/panel-wykonawcy/zamowienia',
    )
  }

  // Navigation handlers
  const handleCreateContestClick = () => {
    router.push('/dodaj-konkurs')
  }

  const handleAdminPanelClick = () => {
    router.push('/administracja')
  }

  const handleLoginClick = () => {
    router.push('/logowanie')
  }

  const handleRegisterClick = () => {
    router.push('/rejestracja')
  }

  const handleVerificationClick = () => {
    if (currentUser?.userType !== 'contractor') {
      router.push('/konto');
      return;
    }
    router.push(CONTRACTOR_VERIFICATION_DOCUMENTS_PATH);
  };

  const handleAccountClick = () => {
    router.push('/konto')
  }

  const handleOffersClick = () => {
    router.push('/panel-wykonawcy/aplikacje')
  }

  const handleJobSelect = (jobId: string) => {
    router.push(`/konkurs/${jobId}`)
  }


  const handleBookmarkedJobsClick = () => {
    router.push('/zapisane-zgloszenia')
  }

  const handleMessagingClick = () => {
    router.push('/wiadomosci')
  }

  const handleWelcomeClick = () => {
    router.push('/powitanie')
  }

  const handleTutorialClick = () => {
    router.push('/samouczek')
  }

  const handleProfileCompletionClick = () => {
    router.push('/uzupelnianie-profilu')
  }

  const accountMenuHandlers = {
    onAdminPanel: handleAdminPanelClick,
    onAccount: handleAccountClick,
    onVerification: handleVerificationClick,
    onZamowienia: handleZamowieniaClick,
    onOffers: handleOffersClick,
    onZgloszenia: handleZgloszeniaClick,
    onBookmarkedJobs: handleBookmarkedJobsClick,
    onMessaging: handleMessagingClick,
    onWelcome: handleWelcomeClick,
    onTutorial: handleTutorialClick,
    onProfileCompletion: handleProfileCompletionClick,
  };

  const accountMenuSections = buildAccountMenuSections({
    isAdmin,
    userType: currentUser?.userType,
    showOrders,
    showVerificationAttention,
    verificationLabel: verificationMenuLabel(userForVerificationUi),
    showProfileCompletion: !currentUser?.profileCompleted,
    handlers: accountMenuHandlers,
  });

  const accountMenuPanelProps = {
    firstName: currentUser?.firstName ?? '',
    lastName: currentUser?.lastName ?? '',
    email: currentUser?.email,
    roleLabel: userRoleLabel,
    showEmail: currentUser?.userType !== 'manager',
    showVerificationAttention,
    sections: accountMenuSections,
    onLogout: handleLogout,
  };

  const renderAvatarTrigger = (className?: string, showLabel = false) => (
    <Button
      variant="outline"
      className={cn(
        'group relative h-auto gap-2 rounded-lg border border-brand-navy/10 bg-card px-1.5 py-1',
        'shadow-[0_1px_2px_hsl(var(--brand-navy)/0.06),0_3px_10px_hsl(var(--brand-navy)/0.06)]',
        'ring-1 ring-inset ring-white/75',
        'transition-all duration-150',
        'hover:border-primary/25 hover:bg-primary/5 hover:shadow-[0_1px_3px_hsl(var(--primary)/0.1),0_4px_14px_hsl(var(--brand-navy)/0.06)]',
        'focus-visible:ring-2 focus-visible:ring-primary/30',
        showLabel && 'pr-2.5',
        className,
      )}
    >
      <Avatar className="h-8 w-8 rounded-lg ring-1 ring-primary/15">
        <AvatarFallback className="rounded-lg bg-primary text-sm font-semibold text-primary-foreground">
          {currentUser?.firstName?.[0]}
          {currentUser?.lastName?.[0]}
        </AvatarFallback>
      </Avatar>
      {showLabel && currentUser ? (
        <>
          <span className="hidden max-w-[7rem] truncate text-sm font-medium text-foreground md:inline">
            {currentUser.firstName}
          </span>
          <ChevronDown className="hidden h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-150 group-hover:text-primary md:inline group-data-[state=open]:rotate-180" />
        </>
      ) : null}
      {showVerificationAttention && (
        <span className="absolute -top-1 -right-1" aria-label={verificationAttentionLabel}>
          <VerificationAttentionIcon className="h-4 w-4 fill-amber-50" />
        </span>
      )}
    </Button>
  )

  const handleHomeClick = () => {
    setIsMapExpanded(false);
    if (pathname !== '/') {
      router.push('/');
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full bg-card">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* 1. Logo Section - Left */}
          <div className="flex-shrink-0">
            <BrandLogo
              variant="full"
              onClick={handleHomeClick}
            />
          </div>

          {/* 2. Center - Search (hidden on mobile) */}
          <div className="hidden md:flex items-center flex-1 justify-center">
            <HeaderJobSearch className="max-w-md lg:max-w-xl" />
          </div>

            {/* Add Job button - visible for unauthenticated (redirects to login) and authenticated managers.
                Admin gets a single ADMIN button instead. */}
            <div className="hidden md:block mr-4">
              {userIsAuthenticated && isAdmin ? (
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleAdminPanelClick}
                  className="shrink-0"
                >
                  ADMIN
                </Button>
              ) : (
                (!userIsAuthenticated || currentUser?.userType !== 'contractor') && (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleCreateContestClick}
                    className="shrink-0"
                  >
                    Utwórz konkurs
                  </Button>
                )
              )}
            </div>

          {/* 3. Right Side Actions - Messages (always visible), notifications, user */}
          <div className="flex items-center space-x-2 sm:space-x-3 flex-shrink-0">
            {userIsAuthenticated ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-muted-foreground hover:text-foreground"
                onClick={handleMessagingClick}
                aria-label="Wiadomości"
              >
                <MessagesSquare className="h-5 w-5" />
              </Button>
            ) : (
              <AuthPromptPopover
                title={AUTH_PROMPT_MESSAGES.title}
                description={AUTH_PROMPT_MESSAGES.description}
              >
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 text-muted-foreground hover:text-foreground"
                  aria-label="Wiadomości"
                >
                  <MessagesSquare className="h-5 w-5" />
                </Button>
              </AuthPromptPopover>
            )}
            {showFavoritesNav &&
              (userIsAuthenticated ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 text-muted-foreground hover:text-foreground"
                  onClick={handleBookmarkedJobsClick}
                  aria-label="Zapisane zgłoszenia"
                >
                  <Star className="h-5 w-5" />
                </Button>
              ) : (
                <AuthPromptPopover
                  title={AUTH_PROMPT_FAVORITES.title}
                  description={AUTH_PROMPT_FAVORITES.description}
                >
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 text-muted-foreground hover:text-foreground"
                    aria-label="Zapisane zgłoszenia"
                  >
                    <Star className="h-5 w-5" />
                  </Button>
                </AuthPromptPopover>
              ))}
            {userIsAuthenticated && (
              <UnifiedNotifications 
                onJobSelect={handleJobSelect}
                onSearchSelect={(query) => {
                  console.log('Search query:', query);
                }}
                onApplicationSelect={(applicationId) => {
                  console.log('Navigate to application:', applicationId);
                }}
                onTenderSelect={handleJobSelect}
              />
            )}
            
            {/* User Actions */}
            {((isMounted && isLoading && !currentUser) || (!isMounted && !initialUser)) ? (
              <div className="flex items-center space-x-2">
                <div className="h-8 w-8 rounded-lg bg-gray-200 animate-pulse"></div>
                <span className="text-sm text-gray-500">Ładowanie...</span>
              </div>
            ) : userIsAuthenticated ? (
              <>
                {currentUser?.userType === 'manager' && !isAdmin ? (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleCreateContestClick}
                    className="md:hidden h-9 shrink-0 px-2.5 text-xs font-semibold"
                  >
                    + Konkurs
                  </Button>
                ) : null}

                {/* Mobile: Drawer */}
                <div className="md:hidden">
                  <Drawer>
                    <DrawerTrigger asChild>{renderAvatarTrigger()}</DrawerTrigger>
                    <DrawerContent className="mt-6 max-h-[92vh]">
                      <DrawerHeader className="sr-only">
                        <DrawerTitle>Menu konta</DrawerTitle>
                      </DrawerHeader>
                      <div className="overflow-y-auto pb-6">
                        <AccountMenuPanel {...accountMenuPanelProps} />
                      </div>
                    </DrawerContent>
                  </Drawer>
                </div>

                {/* Desktop: DropdownMenu */}
                <div className="hidden md:block">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>{renderAvatarTrigger(undefined, true)}</DropdownMenuTrigger>
                    <DropdownMenuContent
                      className="w-72 overflow-hidden rounded-lg border border-brand-navy/10 bg-card p-0 shadow-[0_4px_20px_hsl(var(--brand-navy)/0.08)] ring-1 ring-inset ring-white/50"
                      align="end"
                      forceMount
                    >
                      <AccountMenuPanel {...accountMenuPanelProps} />
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </>
            ) : (
              <>
                <div className="md:hidden flex items-center space-x-2">
                  <Button variant="default" size="sm" onClick={handleCreateContestClick} className="shrink-0">
                    Utwórz konkurs
                  </Button>
                  <GuestAuthDropdown
                    onLogin={handleLoginClick}
                    onRegister={handleRegisterClick}
                  />
                </div>

                <div className="hidden md:block">
                  <GuestAuthDropdown
                    onLogin={handleLoginClick}
                    onRegister={handleRegisterClick}
                  />
                </div>
              </>
            )}
            
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;