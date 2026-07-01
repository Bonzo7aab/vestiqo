'use client';

import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import { useNavigationWithLoading } from '../hooks/useNavigationWithLoading';
import { 
  Home, 
  Search, 
  Bookmark,
  Star,
  MessagesSquare, 
  User,
  Briefcase,
  Users,
  Menu,
  SlidersHorizontal,
  Map
} from 'lucide-react';
import { Button } from './ui/button';
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

  // Prevent hydration mismatch by waiting for client mount
  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  const isHomepage = pathname === '/';
  const isCompactMode = isHomepage || isMapExpanded;

  const isActive = (path: string) => pathname === path || pathname?.startsWith(path + '/');

  const getPathForLabel = (title: string): string => {
    const titleToPath: Record<string, string> = {
      'Strona główna': '/',
      'Wykonawcy': '/wykonawcy',
      'Zarządcy': '/zarzadcy',
      'Zapisane': '/zapisane-zgloszenia',
      'Wiadomości': '/wiadomosci',
      'Profil': '/konto',
    };
    return titleToPath[title] || '';
  };

  // Full menu items for drawer
  const allMenuItems: FloatingDockItem[] = [
    {
      title: 'Strona główna',
      icon: <Home className="size-6" />,
      href: '/',
      onClick: () => {
        router.push('/');
        setMenuDrawerOpen(false);
      },
    },
    {
      title: 'Szukaj',
      icon: <Search className="size-6" />,
      onClick: () => {
        setSearchDrawerOpen(true);
        setMenuDrawerOpen(false);
      },
    },
    {
      title: 'Wykonawcy',
      icon: <Briefcase className="size-6" />,
      href: '/wykonawcy',
      onClick: () => {
        router.push('/wykonawcy');
        setMenuDrawerOpen(false);
      },
    },
    {
      title: 'Zarządcy',
      icon: <Users className="size-6" />,
      href: '/zarzadcy',
      onClick: () => {
        router.push('/zarzadcy');
        setMenuDrawerOpen(false);
      },
    },
    {
      title: 'Zapisane',
      icon: <Star className="size-6" />,
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
            icon: <MessagesSquare className="size-6" />,
            href: '/wiadomosci',
            onClick: () => {
              router.push('/wiadomosci');
              setMenuDrawerOpen(false);
            },
          } as FloatingDockItem,
          {
            title: 'Profil',
            icon: <User className="size-6" />,
            href: '/konto',
            onClick: () => {
              router.push('/konto');
              setMenuDrawerOpen(false);
            },
          } as FloatingDockItem,
        ]
      : [
          {
            title: 'Zaloguj',
            icon: <User className="size-6" />,
            href: '/logowanie',
            onClick: () => {
              router.push('/logowanie');
              setMenuDrawerOpen(false);
            },
          } as FloatingDockItem,
        ]),
  ];

  // Filtered menu items for bottom dock (only 4 main items)
  const mainMenuItems: FloatingDockItem[] = [
    {
      title: 'Strona główna',
      icon: <Home className="size-6" />,
      href: '/',
      isActive: isActive('/'),
      onClick: () => {
        setMenuDrawerOpen(false);
        setTimeout(() => {
          router.push('/');
        }, 150);
      },
    },
    {
      title: 'Wykonawcy',
      icon: <Briefcase className="size-6" />,
      href: '/wykonawcy',
      isActive: isActive('/wykonawcy'),
      onClick: () => {
        setMenuDrawerOpen(false);
        setTimeout(() => {
          router.push('/wykonawcy');
        }, 150);
      },
    },
    {
      title: 'Wiadomości',
      icon: <MessagesSquare className="size-6" />,
      href: isAuthenticated ? '/wiadomosci' : '/wybor-typu-konta',
      isActive: isAuthenticated ? isActive('/wiadomosci') : isActive('/wybor-typu-konta'),
      onClick: () => {
        setMenuDrawerOpen(false);
        setTimeout(() => {
          router.push(isAuthenticated ? '/wiadomosci' : '/wybor-typu-konta');
        }, 150);
      },
    },
    {
      title: 'Szukaj',
      icon: <Search className="size-6" />,
      isActive: false, // Search doesn't have a specific path
      onClick: () => {
        setMenuDrawerOpen(false);
        setTimeout(() => setSearchDrawerOpen(true), 150);
      },
    },
  ];

  const compactDockItems: FloatingDockItem[] = [
    {
      title: isMapExpanded ? 'Wróć do listy' : 'Pokaż mapę',
      icon: <Map className="size-6" />,
      onClick: () => setIsMapExpanded(!isMapExpanded),
    },
    {
      title: 'Filtry',
      icon: <SlidersHorizontal className="size-6" />,
      onClick: () => setFiltersDrawerOpen(true),
    },
    {
      title: 'Menu',
      icon: <Menu className="size-6" />,
      onClick: () => setMenuDrawerOpen(true),
    },
  ];

  // Don't render until mounted to prevent hydration mismatch
  if (!isMounted) {
    return null;
  }

  // Compact mode: Filters button + Separator + Hamburger menu
  if (isCompactMode) {
    return (
      <>
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

        {/* Filters Drawer - always rendered */}
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

        {/* Menu Drawer - always rendered */}
        <Drawer open={menuDrawerOpen} onOpenChange={setMenuDrawerOpen}>
          <DrawerContent className="max-h-[85vh]">
            <DrawerHeader className="border-b">
              <DrawerTitle>Menu</DrawerTitle>
            </DrawerHeader>
            <div className="overflow-y-auto flex-1 p-4">
              <div className="space-y-1">
                {allMenuItems.map((item, index) => {
                  const itemPath = getPathForLabel(item.title || '');
                  const active = itemPath ? isActive(itemPath) : false;
                  return (
                    <Button
                      key={index}
                      variant={active ? 'secondary' : 'ghost'}
                      className={`w-full justify-start ${active ? 'bg-primary/10 text-primary' : ''}`}
                      onClick={item.onClick}
                    >
                      <div className="h-4 w-4 mr-3">{item.icon}</div>
                      <span>{item.title}</span>
                    </Button>
                  );
                })}
              </div>
            </div>
          </DrawerContent>
        </Drawer>

        {/* Dock container - hidden when filters drawer is open, visible on mobile and tablet */}
        {!filtersDrawerOpen && !searchDrawerOpen && (
          <div className="lg:hidden" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
            <FloatingDock
              items={compactDockItems}
              mobileClassName="lg:hidden"
            />
          </div>
        )}
      </>
    );
  }

  // Normal mode: Show filtered 4 main menu items - visible on mobile and tablet
  return (
    <div className="lg:hidden" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
      <FloatingDock
        items={mainMenuItems}
        mobileClassName="lg:hidden"
      />
    </div>
  );
}
