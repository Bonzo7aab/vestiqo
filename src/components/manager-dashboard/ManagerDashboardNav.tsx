"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '../ui/utils';

const tabs = [
  { id: 'konkursy', label: 'Konkursy', href: '/panel-zarzadcy/konkursy' },
  { id: 'zamowienia', label: 'Zamówienia', href: '/panel-zarzadcy/zamowienia' },
  { id: 'ocena', label: 'Ocena', href: '/panel-zarzadcy/ocena' },
];

interface ManagerDashboardNavProps {
  showOrders?: boolean;
}

export function ManagerDashboardNav({ showOrders = false }: ManagerDashboardNavProps) {
  const pathname = usePathname();
  const visibleTabs = showOrders ? tabs : tabs.filter((tab) => tab.id !== 'zamowienia');

  return (
    <nav className="border-b bg-card">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex space-x-1">
          {visibleTabs.map((tab) => {
            const isActive =
              pathname === tab.href ||
              (tab.id === 'konkursy' &&
                (pathname === '/panel-zarzadcy' ||
                  pathname === '/panel-zarzadcy/' ||
                  pathname.startsWith('/panel-zarzadcy/konkursy') ||
                  pathname.startsWith('/panel-zarzadcy/zgloszenia'))) ||
              (tab.id === 'zamowienia' &&
                pathname.startsWith('/panel-zarzadcy/zamowienia')) ||
              (tab.id === 'ocena' &&
                (pathname === '/panel-zarzadcy/ocena' ||
                  pathname.startsWith('/panel-zarzadcy/ocena/')));
            return (
              <Link
                key={tab.id}
                href={tab.href}
                className={cn(
                  "px-4 py-3 text-sm font-medium transition-colors border-b-2",
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
