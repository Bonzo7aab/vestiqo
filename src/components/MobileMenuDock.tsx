'use client';

import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import { useNavigationWithLoading } from '../hooks/useNavigationWithLoading';
import {
  Home,
  Search,
  Star,
  MessagesSquare,
  User,
  Menu,
  SlidersHorizontal,
  Map,
  FileText,
  type LucideIcon,
} from 'lucide-react';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from './ui/drawer';
import { FloatingDock, type FloatingDockItem } from './ui/floating-dock';
import { useUserProfile } from '../contexts/AuthContext';
import { useLayoutContext } from './ConditionalFooter';
import { useFilterContext } from '../contexts/FilterContext';
import { useJobsContext } from '../contexts/JobsContext';
import JobFilters from './JobFilters';
import { HeaderJobSearch } from './HeaderJobSearch';
import {
  MobileNavMenuPanel,
  type MobileNavMenuItem,
  type MobileNavMenuSection,
} from './navigation/MobileNavMenuPanel';
import { getAccountRoleDisplayLabel } from '../lib/profile/account-role-labels';

interface NavMenuItemConfig {
  title: string;
  icon: LucideIcon;
  href?: string;
  description?: string;
  emphasis?: boolean;
  onClick: () => void;
}

const ICON_SIZE = 'h-[18px] w-[18px]';

export function MobileMenuDock() {
  const router = useNavigationWithLoading();
  const pathname = usePathname();
  const { isAuthenticated, user } = useUserProfile();
  const { isMapExpanded, setIsMapExpanded } = useLayoutContext();
  const { filters, setFilters, primaryLocation, onLocationChangeRequest } = useFilterContext();
  const { loadedJobs } = useJobsContext();

  const [filtersDrawerOpen, setFiltersDrawerOpen] = useState(false);
  const [searchDrawerOpen, setSearchDrawerOpen] = useState(false);
  const [menuDrawerOpen, setMenuDrawerOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  const isHomepage = pathname === '/';
  const isCompactMode = isHomepage;
  const canCreateContest =
    !user || (user.userType !== 'contractor' && user.platformRole !== 'platform_admin');
  const isAdmin = user?.platformRole === 'platform_admin';

  const isActive = (path: string) => pathname === path || pathname?.startsWith(path + '/');

  const getPathForLabel = (title: string): string => {
    const titleToPath: Record<string, string> = {
      'Strona główna': '/',
      'Zapisane': '/zapisane-zgloszenia',
      'Wiadomości': '/wiadomosci',
      'Utwórz konkurs': '/dodaj-konkurs',
      'Profil': '/konto',
      'Zaloguj się': '/logowanie',
      'Zaloguj': '/logowanie',
    };
    return titleToPath[title] || '';
  };

  const closeDrawers = (): void => {
    setMenuDrawerOpen(false);
    setSearchDrawerOpen(false);
    setFiltersDrawerOpen(false);
  };

  const navigateToCreateContest = (): void => {
    closeDrawers();
    setTimeout(() => router.push('/dodaj-konkurs'), 150);
  };

  const openSearch = (): void => {
    setMenuDrawerOpen(false);
    setFiltersDrawerOpen(false);
    setSearchDrawerOpen(true);
  };

  const menuUser = user
    ? {
        firstName: user.firstName,
        lastName: user.lastName,
        roleLabel: isAdmin
          ? 'ADMIN'
          : getAccountRoleDisplayLabel({
              userType: user.userType,
              accountRole: user.accountRole,
              organizationType: user.organizationType,
            }),
      }
    : null;

  const browseItems: NavMenuItemConfig[] = [
    {
      title: 'Strona główna',
      icon: Home,
      href: '/',
      description: 'Przeglądaj otwarte konkursy',
      onClick: () => {
        closeDrawers();
        router.push('/');
      },
    },
    ...(isAuthenticated
      ? [
          {
            title: 'Zapisane',
            icon: Star,
            href: '/zapisane-zgloszenia',
            description: 'Twoje ulubione ogłoszenia',
            onClick: () => {
              closeDrawers();
              router.push('/zapisane-zgloszenia');
            },
          } satisfies NavMenuItemConfig,
        ]
      : []),
  ];

  const accountItems: NavMenuItemConfig[] = isAuthenticated
    ? [
        {
          title: 'Wiadomości',
          icon: MessagesSquare,
          href: '/wiadomosci',
          description: 'Rozmowy z wykonawcami i zarządcami',
          onClick: () => {
            closeDrawers();
            router.push('/wiadomosci');
          },
        },
        {
          title: 'Profil',
          icon: User,
          href: '/konto',
          description: 'Ustawienia konta i firmy',
          onClick: () => {
            closeDrawers();
            router.push('/konto');
          },
        },
      ]
    : [];

  const menuSections: MobileNavMenuSection[] = [
    ...(canCreateContest
      ? [
          {
            title: 'Szybkie działania',
            items: [
              {
                label: 'Utwórz konkurs',
                icon: FileText,
                href: '/dodaj-konkurs',
                description: 'Opublikuj nowe ogłoszenie bezpłatnie',
                emphasis: isAuthenticated,
                onClick: navigateToCreateContest,
              },
            ],
          } satisfies MobileNavMenuSection,
        ]
      : []),
    {
      title: 'Przeglądaj',
      items: browseItems.map(toMenuItem),
    },
    ...(accountItems.length > 0
      ? [
          {
            title: 'Konto',
            items: accountItems.map(toMenuItem),
          } satisfies MobileNavMenuSection,
        ]
      : []),
  ];

  const messagesDockItem: FloatingDockItem = {
    title: 'Wiadomości',
    icon: <MessagesSquare className={ICON_SIZE} strokeWidth={2} />,
    href: isAuthenticated ? '/wiadomosci' : '/logowanie',
    isActive: isActive('/wiadomosci'),
    onClick: () => {
      closeDrawers();
      setTimeout(() => {
        router.push(isAuthenticated ? '/wiadomosci' : '/logowanie');
      }, 150);
    },
  };

  const createContestDockItem: FloatingDockItem = {
    title: 'Konkurs',
    icon: <FileText className={ICON_SIZE} strokeWidth={2} />,
    href: '/dodaj-konkurs',
    isActive: isAuthenticated && pathname.startsWith('/dodaj-konkurs'),
    onClick: navigateToCreateContest,
  };

  const mainMenuItems: FloatingDockItem[] = [
    {
      title: 'Start',
      icon: <Home className={ICON_SIZE} strokeWidth={2} />,
      href: '/',
      isActive: pathname === '/',
      onClick: () => {
        closeDrawers();
        setTimeout(() => router.push('/'), 150);
      },
    },
    canCreateContest ? createContestDockItem : messagesDockItem,
    {
      title: 'Szukaj',
      icon: <Search className={ICON_SIZE} strokeWidth={2} />,
      isActive: searchDrawerOpen,
      onClick: () => {
        setTimeout(() => openSearch(), 150);
      },
    },
    {
      title: 'Menu',
      icon: <Menu className={ICON_SIZE} strokeWidth={2} />,
      isActive: menuDrawerOpen,
      onClick: () => setMenuDrawerOpen(true),
    },
  ];

  const compactDockItems: FloatingDockItem[] = [
    {
      title: isMapExpanded ? 'Lista' : 'Mapa',
      icon: <Map className={ICON_SIZE} strokeWidth={2} />,
      isActive: isMapExpanded,
      onClick: () => setIsMapExpanded(!isMapExpanded),
    },
    {
      title: 'Filtry',
      icon: <SlidersHorizontal className={ICON_SIZE} strokeWidth={2} />,
      isActive: filtersDrawerOpen,
      onClick: () => setFiltersDrawerOpen(true),
    },
    {
      title: 'Szukaj',
      icon: <Search className={ICON_SIZE} strokeWidth={2} />,
      isActive: searchDrawerOpen,
      onClick: openSearch,
    },
    {
      title: 'Menu',
      icon: <Menu className={ICON_SIZE} strokeWidth={2} />,
      isActive: menuDrawerOpen,
      onClick: () => setMenuDrawerOpen(true),
    },
  ];

  const searchDrawer = (
    <Drawer open={searchDrawerOpen} onOpenChange={setSearchDrawerOpen}>
      <DrawerContent className="max-h-[55vh] rounded-t-2xl">
        <DrawerHeader className="border-b border-border/60 pb-4 text-left">
          <DrawerTitle className="text-base font-semibold text-brand-navy">Szukaj ogłoszeń</DrawerTitle>
          <p className="text-sm text-muted-foreground">Wpisz frazę, lokalizację lub kategorię usługi</p>
        </DrawerHeader>
        <div className="px-4 pb-8 pt-2">
          <HeaderJobSearch className="w-full max-w-none" />
        </div>
      </DrawerContent>
    </Drawer>
  );

  const menuDrawer = (
    <Drawer open={menuDrawerOpen} onOpenChange={setMenuDrawerOpen}>
      <DrawerContent className="mt-4 max-h-[92vh] overflow-hidden rounded-t-2xl p-0">
        <DrawerHeader className="sr-only">
          <DrawerTitle>Menu nawigacji</DrawerTitle>
        </DrawerHeader>
        <div className="max-h-[calc(92vh-1.5rem)] overflow-y-auto">
          <MobileNavMenuPanel
            user={menuUser}
            sections={menuSections}
            onSearchClick={openSearch}
            onLoginClick={
              !isAuthenticated
                ? () => {
                    closeDrawers();
                    router.push('/logowanie');
                  }
                : undefined
            }
            onRegisterClick={
              !isAuthenticated
                ? () => {
                    closeDrawers();
                    router.push('/rejestracja');
                  }
                : undefined
            }
            isItemActive={(item) => {
              const path = getPathForLabel(item.label);
              return path ? isActive(path) : false;
            }}
          />
        </div>
      </DrawerContent>
    </Drawer>
  );

  if (!isMounted) {
    return null;
  }

  if (isCompactMode) {
    return (
      <>
        {searchDrawer}

        <Drawer open={filtersDrawerOpen} onOpenChange={setFiltersDrawerOpen}>
          <DrawerContent className="flex max-h-[85vh] flex-col overflow-hidden rounded-t-2xl">
            <DrawerHeader className="sr-only">
              <DrawerTitle>Filtry</DrawerTitle>
            </DrawerHeader>
            <div className="min-h-0 flex-1 overflow-hidden">
              <JobFilters
                onFilterChange={setFilters}
                initialFilters={filters}
                primaryLocation={primaryLocation}
                onLocationChange={onLocationChangeRequest}
                jobs={loadedJobs}
              />
            </div>
          </DrawerContent>
        </Drawer>

        {menuDrawer}

        {!filtersDrawerOpen && !searchDrawerOpen && !menuDrawerOpen && (
          <div className="lg:hidden">
            <FloatingDock items={compactDockItems} mobileClassName="lg:hidden" />
          </div>
        )}
      </>
    );
  }

  return (
    <>
      {searchDrawer}
      {menuDrawer}

      {!searchDrawerOpen && !menuDrawerOpen && (
        <div className="lg:hidden">
          <FloatingDock items={mainMenuItems} mobileClassName="lg:hidden" />
        </div>
      )}
    </>
  );
}

function toMenuItem(config: NavMenuItemConfig): MobileNavMenuItem {
  return {
    label: config.title,
    icon: config.icon,
    href: config.href,
    description: config.description,
    emphasis: config.emphasis,
    onClick: config.onClick,
  };
}
