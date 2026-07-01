'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, ClipboardCheck, FileWarning, Building2, Settings } from 'lucide-react';
import { cn } from '../ui/utils';

const links = [
  { href: '/administracja', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/administracja/weryfikacja', label: 'Weryfikacja', icon: ClipboardCheck },
  { href: '/administracja/oferty', label: 'Oferty wykonawców', icon: FileWarning },
  { href: '/administracja/ogloszenia', label: 'Zgłoszenia zarządców', icon: Building2 },
  { href: '/administracja/ustawienia', label: 'Ustawienia', icon: Settings },
];

export function AdminNav() {
  const pathname = usePathname() ?? '';

  return (
    <nav className="border-b bg-card">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-1 px-4 py-2">
        {links.map(({ href, label, icon: Icon, exact }) => {
          const isActive = exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'inline-flex h-7 items-center gap-1.5 rounded-md border px-2.5 text-xs font-medium transition-colors',
                isActive
                  ? 'border-primary/60 bg-primary/5 text-foreground shadow-sm'
                  : 'border-transparent bg-transparent text-muted-foreground hover:bg-muted/60 hover:text-foreground',
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
