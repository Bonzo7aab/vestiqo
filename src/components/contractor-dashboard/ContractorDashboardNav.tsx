"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '../ui/utils';

const tabs = [
  { id: 'offers', label: 'Moje Oferty', href: '/panel-wykonawcy/aplikacje' },
  { id: 'orders', label: 'Zamówienia', href: '/panel-wykonawcy/zamowienia' },
  { id: 'favorites', label: 'Zapisane', href: '/panel-wykonawcy/ulubione' },
  { id: 'ratings', label: 'Ocena', href: '/panel-wykonawcy/oceny' },
  { id: 'services', label: 'Usługi', href: '/panel-wykonawcy/cennik' },
];

interface ContractorDashboardNavProps {
  showOrders?: boolean;
  showServices?: boolean;
}

export function ContractorDashboardNav({
  showOrders = false,
  showServices = false,
}: ContractorDashboardNavProps) {
  const pathname = usePathname();
  const visibleTabs = tabs.filter((tab) => {
    if (tab.id === 'orders' && !showOrders) return false;
    if (tab.id === 'services' && !showServices) return false;
    return true;
  });

  return (
    <nav className="border-b bg-card">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex space-x-1 overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {visibleTabs.map((tab) => {
            const isActive =
              pathname === tab.href ||
              (tab.id === 'favorites' &&
                pathname.startsWith('/panel-wykonawcy/ulubione')) ||
              (tab.id === 'offers' &&
                (pathname === '/panel-wykonawcy' ||
                  pathname === '/panel-wykonawcy/' ||
                  pathname === '/panel-wykonawcy/panel')) ||
              (tab.id === 'orders' &&
                pathname.startsWith('/panel-wykonawcy/zamowienia')) ||
              (tab.id === 'services' &&
                pathname.startsWith('/panel-wykonawcy/cennik'));
            return (
              <Link
                key={tab.id}
                href={tab.href}
                className={cn(
                  "px-3 sm:px-4 py-3 text-xs sm:text-sm font-medium transition-colors border-b-2 whitespace-nowrap flex-shrink-0",
                  isActive
                    ? "border-primary text-primary"
                    : "border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300"
                )}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

