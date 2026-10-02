'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '../ui/utils';

const tabs = [
  { id: 'dashboard', label: 'Dashboard', href: '/administracja', exact: true },
  { id: 'weryfikacja', label: 'Weryfikacja', href: '/administracja/weryfikacja' },
  { id: 'odzyskanie', label: 'Odzyskanie wspólnoty', href: '/administracja/odzyskanie-wspolnoty' },
  { id: 'oferty', label: 'Oferty wykonawców', href: '/administracja/oferty' },
  { id: 'zgloszenia', label: 'Zgłoszenia zarządców', href: '/administracja/zgloszenia' },
  { id: 'ustawienia', label: 'Ustawienia', href: '/administracja/ustawienia' },
  { id: 'flagi', label: 'Flagi', href: '/administracja/flagi' },
];

interface AdminNavProps {
  /** Users awaiting admin verification decision (submitted, not verified). */
  pendingVerificationCount?: number;
}

export function AdminNav({ pendingVerificationCount = 0 }: AdminNavProps) {
  const pathname = usePathname() ?? '';

  return (
    <nav className="border-b bg-card">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex space-x-1 overflow-x-auto">
          {tabs.map((tab) => {
            const isActive = tab.exact
              ? pathname === tab.href
              : pathname === tab.href || pathname.startsWith(`${tab.href}/`);
            const showPendingBadge =
              tab.id === 'weryfikacja' && pendingVerificationCount > 0;

            return (
              <Link
                key={tab.id}
                href={tab.href}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'inline-flex items-center gap-1.5 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors',
                  isActive
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-600 hover:border-gray-300 hover:text-gray-900',
                )}
              >
                {tab.label}
                {showPendingBadge ? (
                  <span
                    className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1.5 text-[11px] font-semibold tabular-nums text-white"
                    title={`${pendingVerificationCount} oczekuje na weryfikację`}
                    aria-label={`${pendingVerificationCount} oczekuje na weryfikację`}
                  >
                    {pendingVerificationCount > 99 ? '99+' : pendingVerificationCount}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
