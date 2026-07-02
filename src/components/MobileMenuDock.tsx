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
} from './navigation/MobileNavMenuPanel';

interface NavMenuItemConfig {
  title: string;
  icon: LucideIcon;
  href?: string;
  onClick: () => void;
}

export function MobileMenuDock() {
  const router = useNavigationWithLoading();
  const pathname = usePathname();
  const { isAuthenticated } = useUserProfile();
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
  const isCompactMode = isHomepage || isMapExpanded;

  const isActive = (path: string) => pathname === path || pathname?.startsWith(path + '/');

  const getPathForLabel = (title: string): string => {
    const titleToPath: Record<string, string> = {
      'Strona główna': '/',
      'Zapisane': '/zapisane-zgloszenia',
      'Wiadomości': '/wiadomosci',
      'Profil': '/konto',
      'Zaloguj': '/logowanie',
    };
    return titleToPath[title] || '';
  };

  const allMenuItems: NavMenuItemConfig[] = [
    {
      title: 'Strona główna',
      icon: Home,
      href: '/',
      onClick: () => {
        router.push('/');
        setMenuDrawerOpen(false);
      },
    },
    {
      title: 'Zapisane',
      icon: Star,
      href: '/zapisane-zgloszenia',
      onClick: () => {
        router.push('/zapisane-zgloszenia');
        setMenuDrawerOpen(false);
      },
    },
    ...(isAuthenticated
      ? [
          {
            title: 'Wiadomości',
            icon: MessagesSquare,
            href: '/wiadomosci',
            onClick: () => {
              router.push('/wiadomosci');
              setMenuDrawerOpen(false);
            },
          },
          {
            title: 'Profil',
            icon: User,
            href: '/konto',
            onClick: () => {
              router.push('/konto');
              setMenuDrawerOpen(false);
            },
          },
        ]
      : [
          {
            title: 'Zaloguj',
            icon: User,
            href: '/logowanie',
            onClick: () => {
              router.push('/logowanie');
              setMenuDrawerOpen(false);
            },
          },
        ]),
  ];

  const navMenuPanelItems: MobileNavMenuItem[] = allMenuItems.map((item) => ({
    label: item.title,
    icon: item.icon,
    href: item.href,
    onClick: item.onClick,
  }));

  const openSearch = (): void => {
    setMenuDrawerOpen(false);
    setSearchDrawerOpen(true);
  };

  const mainMenuItems: FloatingDockItem[] = [
    {
      title: 'Strona główna',
      icon: <Home className="size-5" strokeWidth={2.25} />,
      href: '/',
      onClick: () => {
        setMenuDrawerOpen(false);
        setTimeout(() => router.push('/'), 150);
      },
    },
    {
      title: 'Wiadomości',
      icon: <MessagesSquare className="size-5" strokeWidth={2.25} />,
      href: isAuthenticated ? '/wiadomosci' : '/wybor-typu-konta',
      onClick: () => {
        setMenuDrawerOpen(false);
        setTimeout(() => {
          router.push(isAuthenticated ? '/wiadomosci' : '/wybor-typu-konta');
        }, 150);
      },
    },
    {
      title: 'Szukaj',
      icon: <Search className="size-5" strokeWidth={2.25} />,
      onClick: () => {
        setTimeout(() => openSearch(), 150);
      },
    },
    {
      title: 'Menu',
      icon: <Menu className="size-5" strokeWidth={2.25} />,
      onClick: () => setMenuDrawerOpen(true),
    },
  ];

  const compactDockItems: FloatingDockItem[] = [
    {
      title: isMapExpanded ? 'Lista' : 'Mapa',
      icon: <Map className="size-5" strokeWidth={2.25} />,
      onClick: () => setIsMapExpanded(!isMapExpanded),
    },
    {
      title: 'Filtry',
      icon: <SlidersHorizontal className="size-5" strokeWidth={2.25} />,
      onClick: () => setFiltersDrawerOpen(true),
    },
    {
      title: 'Szukaj',
      icon: <Search className="size-5" strokeWidth={2.25} />,
      onClick: openSearch,
    },
    {
      title: 'Menu',
      icon: <Menu className="size-5" strokeWidth={2.25} />,
      onClick: () => setMenuDrawerOpen(true),
    },
  ];

  const searchDrawer = (
    <Drawer open={searchDrawerOpen} onOpenChange={setSearchDrawerOpen}>
      <DrawerContent className="max-h-[50vh]">
        <DrawerHeader>
          <DrawerTitle>Szukaj ogłoszeń</DrawerTitle>
        </DrawerHeader>
        <div className="p-4 pb-8">
          <HeaderJobSearch className="w-full max-w-none" />
        </div>
      </DrawerContent>
    </Drawer>
  );

  const menuDrawer = (
    <Drawer open={menuDrawerOpen} onOpenChange={setMenuDrawerOpen}>
      <DrawerContent className="mt-6 max-h-[92vh]">
        <DrawerHeader className="sr-only">
          <DrawerTitle>Menu nawigacji</DrawerTitle>
        </DrawerHeader>
        <div className="max-h-[calc(92vh-2rem)] overflow-y-auto">
          <MobileNavMenuPanel
            items={navMenuPanelItems}
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
          <DrawerContent className="flex max-h-[85vh] flex-col overflow-hidden">
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
