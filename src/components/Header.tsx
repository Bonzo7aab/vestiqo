'use client'

import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  User,
  MessagesSquare,
  GraduationCap,
  Play,
  Bookmark,
  Star,
  LogOut,
  ClipboardList,
  ChevronDown,
  Package,
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
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
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
import { CONTRACTOR_VERIFICATION_DOCUMENTS_PATH } from '../lib/verification/documents-route';
import { BrandLogo } from './BrandLogo';

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
    !currentUser.isVerified;

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
    await logout()
    // Redirect to login - the new page load will have correct server state
    router.push('/logowanie')
  }

  const userRoleLabel = isAdmin
    ? 'ADMIN'
    : currentUser?.userType === 'manager'
      ? 'Zarządca'
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

  const renderAvatarTrigger = (className?: string) => (
    <Button
      variant="ghost"
      className={`relative h-8 w-8 rounded-full bg-gray-200 hover:bg-gray-300 ${className ?? ''}`}
    >
      <Avatar className="h-8 w-8">
        <AvatarFallback className="bg-primary text-primary-foreground">
          {currentUser?.firstName?.[0]}
          {currentUser?.lastName?.[0]}
        </AvatarFallback>
      </Avatar>
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
    <header className="sticky top-0 z-50 w-full bg-white border-b border-slate-200" style={{ backgroundColor: '#ffffff', borderBottom: '1px solid #e2e8f0' }}>
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
                onTenderSelect={(tenderId) => {
                  console.log('Navigate to tender:', tenderId);
                }}
              />
            )}
            
            {/* User Actions */}
            {((isMounted && isLoading && !currentUser) || (!isMounted && !initialUser)) ? (
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse"></div>
                <span className="text-sm text-gray-500">Ładowanie...</span>
              </div>
            ) : userIsAuthenticated ? (
              <>
                {/* Mobile: Drawer */}
                <div className="md:hidden">
                  <Drawer>
                    <DrawerTrigger asChild>{renderAvatarTrigger()}</DrawerTrigger>
                  <DrawerContent>
                    <DrawerHeader className="border-b">
                      <DrawerTitle>
                        <div className="flex flex-col space-y-1">
                          <p className="text-sm font-medium leading-none flex items-center gap-1.5">
                            <span>
                              {currentUser?.firstName} {currentUser?.lastName}
                            </span>
                            {showVerificationAttention && (
                              <VerificationAttentionIcon className="h-4 w-4 shrink-0" />
                            )}
                          </p>
                          {currentUser?.userType !== 'manager' && (
                            <p className="text-xs leading-none text-muted-foreground">
                              {currentUser?.email}
                            </p>
                          )}
                          <p className="text-xs leading-none text-muted-foreground">
                            {userRoleLabel}
                          </p>
                        </div>
                      </DrawerTitle>
                    </DrawerHeader>
                    <div className="overflow-y-auto flex-1 p-4">
                      <div className="space-y-1">
                        {isAdmin ? (
                          <>
                            <Button
                              variant="ghost"
                              className="w-full justify-start"
                              onClick={handleAdminPanelClick}
                            >
                              <User className="mr-2 h-4 w-4" />
                              <span>Panel administracyjny</span>
                            </Button>
                            <Button
                              variant="ghost"
                              className="w-full justify-start text-destructive"
                              onClick={handleLogout}
                            >
                              <LogOut className="mr-2 h-4 w-4" />
                              <span>Wyloguj się</span>
                            </Button>
                          </>
                        ) : currentUser?.userType === 'contractor' ? (
                          <>
                            <Button
                              variant="ghost"
                              className="w-full justify-start"
                              onClick={handleAccountClick}
                            >
                              <User className="mr-2 h-4 w-4" />
                              <span>Konto</span>
                            </Button>
                            {showVerificationAttention && (
                              <Button
                                variant="ghost"
                                className="w-full justify-start text-amber-700"
                                onClick={handleVerificationClick}
                              >
                                <VerificationAttentionIcon className="mr-2 h-4 w-4" />
                                <span>{verificationMenuLabel(userForVerificationUi)}</span>
                              </Button>
                            )}
                            {showOrders ? (
                              <Button
                                variant="ghost"
                                className="w-full justify-start"
                                onClick={handleZamowieniaClick}
                              >
                                <Package className="mr-2 h-4 w-4" />
                                <span>Zamówienia</span>
                              </Button>
                            ) : null}
                            <Button
                              variant="ghost"
                              className="w-full justify-start"
                              onClick={handleOffersClick}
                            >
                              <Bookmark className="mr-2 h-4 w-4" />
                              <span>Oferty</span>
                            </Button>
                            <Button
                              variant="ghost"
                              className="w-full justify-start text-destructive"
                              onClick={handleLogout}
                            >
                              <LogOut className="mr-2 h-4 w-4" />
                              <span>Wyloguj się</span>
                            </Button>
                          </>
                        ) : currentUser?.userType === 'manager' ? (
                          <>
                            <Button
                              variant="ghost"
                              className="w-full justify-start"
                              onClick={handleAccountClick}
                            >
                              <User className="mr-2 h-4 w-4" />
                              <span>Konto</span>
                            </Button>
                            {showOrders ? (
                              <Button
                                variant="ghost"
                                className="w-full justify-start"
                                onClick={handleZamowieniaClick}
                              >
                                <Package className="mr-2 h-4 w-4" />
                                <span>Zamówienia</span>
                              </Button>
                            ) : null}
                            <Button
                              variant="ghost"
                              className="w-full justify-start"
                              onClick={handleZgloszeniaClick}
                            >
                              <ClipboardList className="mr-2 h-4 w-4" />
                              <span>Konkursy</span>
                            </Button>
                            <Button
                              variant="ghost"
                              className="w-full justify-start text-destructive"
                              onClick={handleLogout}
                            >
                              <LogOut className="mr-2 h-4 w-4" />
                              <span>Wyloguj się</span>
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              variant="ghost"
                              className="w-full justify-start"
                              onClick={handleBookmarkedJobsClick}
                            >
                              <Star className="mr-2 h-4 w-4" />
                              <span>Zapisane zgłoszenia</span>
                            </Button>
                            <Button
                              variant="ghost"
                              className="w-full justify-start"
                              onClick={handleMessagingClick}
                            >
                              <MessagesSquare className="mr-2 h-4 w-4" />
                              <span>Wiadomości</span>
                            </Button>

                            <div className="h-px bg-border my-2" />

                            {/* Help and Learning Section */}
                            <div className="px-2 py-1.5">
                              <p className="text-xs text-muted-foreground font-medium">POMOC I NAUKA</p>
                            </div>
                            <Button
                              variant="ghost"
                              className="w-full justify-start"
                              onClick={handleWelcomeClick}
                            >
                              <Play className="mr-2 h-4 w-4" />
                              <span>Strona powitalna</span>
                            </Button>
                            <Button
                              variant="ghost"
                              className="w-full justify-start"
                              onClick={handleTutorialClick}
                            >
                              <GraduationCap className="mr-2 h-4 w-4" />
                              <span>Tutorial</span>
                            </Button>
                            <Button
                              variant="ghost"
                              className="w-full justify-start"
                              onClick={handleProfileCompletionClick}
                            >
                              <User className="mr-2 h-4 w-4" />
                              <span>Uzupełnij profil</span>
                            </Button>

                            <div className="h-px bg-border my-2" />

                            <Button
                              variant="ghost"
                              className="w-full justify-start text-destructive"
                              onClick={handleLogout}
                            >
                              <LogOut className="mr-2 h-4 w-4" />
                              <span>Wyloguj się</span>
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </DrawerContent>
                  </Drawer>
                </div>

                {/* Desktop: DropdownMenu */}
                <div className="hidden md:block">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>{renderAvatarTrigger()}</DropdownMenuTrigger>
                    <DropdownMenuContent 
                      className="w-56 border border-gray-200 shadow-lg" 
                      align="end" 
                      forceMount
                      style={{ backgroundColor: '#f8fafc' }}
                    >
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none flex items-center gap-1.5">
                          <span>
                            {currentUser?.firstName} {currentUser?.lastName}
                          </span>
                          {showVerificationAttention && (
                            <VerificationAttentionIcon className="h-4 w-4 shrink-0" />
                          )}
                        </p>
                        {currentUser?.userType !== 'manager' && (
                          <p className="text-xs leading-none text-muted-foreground">
                            {currentUser?.email}
                          </p>
                        )}
                        <p className="text-xs leading-none text-muted-foreground">
                          {userRoleLabel}
                        </p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {isAdmin ? (
                      <>
                        <DropdownMenuItem onClick={handleAdminPanelClick}>
                          <User className="mr-2 h-4 w-4" />
                          <span>Panel administracyjny</span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={handleLogout}>
                          <LogOut className="mr-2 h-4 w-4" />
                          <span>Wyloguj się</span>
                        </DropdownMenuItem>
                      </>
                    ) : currentUser?.userType === 'contractor' ? (
                      <>
                        <DropdownMenuItem onClick={handleAccountClick}>
                          <User className="mr-2 h-4 w-4" />
                          <span>Konto</span>
                        </DropdownMenuItem>
                        {showVerificationAttention && (
                          <DropdownMenuItem onClick={handleVerificationClick}>
                            <VerificationAttentionIcon className="mr-2 h-4 w-4" />
                            <span>{verificationMenuLabel(userForVerificationUi)}</span>
                          </DropdownMenuItem>
                        )}
                        {showOrders ? (
                          <DropdownMenuItem onClick={handleZamowieniaClick}>
                            <Package className="mr-2 h-4 w-4" />
                            <span>Zamówienia</span>
                          </DropdownMenuItem>
                        ) : null}
                        <DropdownMenuItem onClick={handleOffersClick}>
                          <Bookmark className="mr-2 h-4 w-4" />
                          <span>Oferty</span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={handleLogout}>
                          <LogOut className="mr-2 h-4 w-4" />
                          <span>Wyloguj się</span>
                        </DropdownMenuItem>
                      </>
                    ) : currentUser?.userType === 'manager' ? (
                      <>
                        <DropdownMenuItem onClick={handleAccountClick}>
                          <User className="mr-2 h-4 w-4" />
                          <span>Konto</span>
                        </DropdownMenuItem>
                        {showOrders ? (
                          <DropdownMenuItem onClick={handleZamowieniaClick}>
                            <Package className="mr-2 h-4 w-4" />
                            <span>Zamówienia</span>
                          </DropdownMenuItem>
                        ) : null}
                        <DropdownMenuItem onClick={handleZgloszeniaClick}>
                          <ClipboardList className="mr-2 h-4 w-4" />
                          <span>Konkursy</span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={handleLogout}>
                          <LogOut className="mr-2 h-4 w-4" />
                          <span>Wyloguj się</span>
                        </DropdownMenuItem>
                      </>
                    ) : (
                      <>
                        <DropdownMenuItem onClick={handleAccountClick}>
                          <User className="mr-2 h-4 w-4" />
                          <span>Profil</span>
                        </DropdownMenuItem>

                        <DropdownMenuItem onClick={handleBookmarkedJobsClick}>
                          <Star className="mr-2 h-4 w-4" />
                          <span>Zapisane zgłoszenia</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={handleMessagingClick}>
                          <MessagesSquare className="mr-2 h-4 w-4" />
                          <span>Wiadomości</span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />

                        {/* Help and Learning Section */}
                        <DropdownMenuLabel className="text-xs text-muted-foreground">
                          POMOC I NAUKA
                        </DropdownMenuLabel>
                        <DropdownMenuItem onClick={handleWelcomeClick}>
                          <Play className="mr-2 h-4 w-4" />
                          <span>Strona powitalna</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={handleTutorialClick}>
                          <GraduationCap className="mr-2 h-4 w-4" />
                          <span>Tutorial</span>
                        </DropdownMenuItem>
                        {!currentUser?.profileCompleted && (
                          <DropdownMenuItem onClick={handleProfileCompletionClick}>
                            <User className="mr-2 h-4 w-4" />
                            <span>Uzupełnij profil</span>
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />

                        <DropdownMenuItem onClick={handleLogout}>
                          <LogOut className="mr-2 h-4 w-4" />
                          <span>Wyloguj się</span>
                        </DropdownMenuItem>
                      </>
                    )}
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
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="default" size="sm" className="text-sm">
                        Zaloguj się
                        <ChevronDown className="h-4 w-4 ml-1" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem onClick={handleLoginClick}>
                        <User className="mr-2 h-4 w-4" />
                        <span>Zaloguj się</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={handleRegisterClick}>
                        <span className="text-sm text-muted-foreground">Załóż konto</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="hidden md:block">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="default" size="sm" className="text-sm">
                        Zaloguj się
                        <ChevronDown className="h-4 w-4 ml-1" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem onClick={handleLoginClick}>
                        <User className="mr-2 h-4 w-4" />
                        <span>Zaloguj się</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={handleRegisterClick}>
                        <span className="text-sm text-muted-foreground">Załóż konto</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
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