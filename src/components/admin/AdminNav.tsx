'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '../ui/utils';

const tabs = [
  { id: 'dashboard', label: 'Dashboard', href: '/administracja', exact: true },
  { id: 'weryfikacja', label: 'Weryfikacja', href: '/administracja/weryfikacja' },
  { id: 'oferty', label: 'Oferty wykonawców', href: '/administracja/oferty' },
  { id: 'ogloszenia', label: 'Zgłoszenia zarządców', href: '/administracja/ogloszenia' },
  { id: 'ustawienia', label: 'Ustawienia', href: '/administracja/ustawienia' },
];

export function AdminNav() {
  const pathname = usePathname() ?? '';

  return (
    <nav className="border-b bg-card">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex space-x-1 overflow-x-auto">
          {tabs.map((tab) => {
            const isActive = tab.exact
              ? pathname === tab.href
              : pathname === tab.href || pathname.startsWith(`${tab.href}/`);

            return (
              <Link
                key={tab.id}
                href={tab.href}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors',
                  isActive
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-600 hover:border-gray-300 hover:text-gray-900',
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
