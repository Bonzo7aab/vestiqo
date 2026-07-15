'use client';

import type { LucideIcon } from 'lucide-react';
import { ChevronRight, Search, UserPlus } from 'lucide-react';
import { BrandLogo } from '../BrandLogo';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Button } from '../ui/button';
import { cn } from '../ui/utils';

export interface MobileNavMenuItem {
  label: string;
  icon: LucideIcon;
  href?: string;
  onClick: () => void;
  description?: string;
  emphasis?: boolean;
}

export interface MobileNavMenuSection {
  title?: string;
  items: MobileNavMenuItem[];
}

export interface MobileNavMenuUser {
  firstName: string;
  lastName: string;
  roleLabel: string;
}

interface MobileNavMenuPanelProps {
  user?: MobileNavMenuUser | null;
  sections: MobileNavMenuSection[];
  isItemActive?: (item: MobileNavMenuItem) => boolean;
  onSearchClick?: () => void;
  onLoginClick?: () => void;
  onRegisterClick?: () => void;
}

function MenuRow({
  item,
  isActive,
}: {
  item: MobileNavMenuItem;
  isActive: boolean;
}) {
  const Icon = item.icon;

  return (
    <button
      type="button"
      onClick={item.onClick}
      className={cn(
        'group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-all duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35',
        item.emphasis
          ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20 hover:bg-primary/95'
          : isActive
            ? 'bg-primary/8 text-primary ring-1 ring-primary/15'
            : 'text-foreground hover:bg-muted/60',
      )}
    >
      <span
        className={cn(
          'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors',
          item.emphasis
            ? 'bg-primary-foreground/15 text-primary-foreground'
            : isActive
              ? 'bg-primary/12 text-primary'
              : 'bg-muted text-muted-foreground group-hover:bg-primary/8 group-hover:text-primary',
        )}
      >
        <Icon className="h-[18px] w-[18px]" strokeWidth={2} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium leading-tight">{item.label}</span>
        {item.description ? (
          <span
            className={cn(
              'mt-0.5 block text-xs leading-snug',
              item.emphasis ? 'text-primary-foreground/80' : 'text-muted-foreground',
            )}
          >
            {item.description}
          </span>
        ) : null}
      </span>
      {!item.emphasis ? (
        <ChevronRight
          className={cn(
            'h-4 w-4 shrink-0 transition-transform duration-150 group-hover:translate-x-0.5',
            isActive ? 'text-primary/70' : 'text-muted-foreground/50',
          )}
          strokeWidth={2}
        />
      ) : null}
    </button>
  );
}

export function MobileNavMenuPanel({
  user,
  sections,
  isItemActive,
  onSearchClick,
  onLoginClick,
  onRegisterClick,
}: MobileNavMenuPanelProps) {
  const initials = user
    ? `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase()
    : '';

  return (
    <div className="flex flex-col overflow-hidden bg-card">
      <div className="border-b border-border/60 bg-gradient-to-br from-primary/[0.07] via-card to-muted/20 px-5 pb-5 pt-2">
        {user ? (
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12 rounded-xl ring-2 ring-primary/15">
              <AvatarFallback className="rounded-xl bg-primary text-sm font-semibold text-primary-foreground">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-base font-semibold text-brand-navy">
                {user.firstName} {user.lastName}
              </p>
              <p className="mt-0.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {user.roleLabel}
              </p>
            </div>
            <BrandLogo variant="mark" className="h-7 w-7 shrink-0 text-primary/40" />
          </div>
        ) : (
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/15">
              <BrandLogo variant="mark" className="h-7 w-7 text-primary" />
            </div>
            <div className="min-w-0 flex-1 pt-0.5">
              <p className="text-base font-semibold text-brand-navy">Vestiqo</p>
              <p className="mt-0.5 text-sm leading-snug text-muted-foreground">
                Platforma konkursów ofert dla zarządców i wykonawców
              </p>
            </div>
          </div>
        )}

        {onSearchClick ? (
          <button
            type="button"
            onClick={onSearchClick}
            className="mt-4 flex w-full items-center gap-3 rounded-xl border border-border/70 bg-background/80 px-3.5 py-2.5 text-left text-sm text-muted-foreground shadow-sm transition-colors hover:border-primary/25 hover:bg-background"
          >
            <Search className="h-4 w-4 shrink-0 text-primary/70" strokeWidth={2} />
            Szukaj ogłoszeń…
          </button>
        ) : null}
      </div>

      <div className="space-y-5 px-3 py-4 pb-6">
        {sections.map((section) => (
          <div key={section.title ?? section.items[0]?.label ?? 'section'}>
            {section.title ? (
              <p className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {section.title}
              </p>
            ) : null}
            <div className="space-y-1">
              {section.items.map((item) => (
                <MenuRow
                  key={item.label}
                  item={item}
                  isActive={isItemActive?.(item) ?? false}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {!user && onLoginClick && onRegisterClick ? (
        <div className="border-t border-border/60 bg-muted/20 px-4 py-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          <Button
            size="lg"
            className="h-12 w-full rounded-xl text-base font-semibold shadow-md shadow-primary/20"
            onClick={onRegisterClick}
          >
            <UserPlus className="mr-2 h-5 w-5" strokeWidth={2} />
            Załóż konto
          </Button>
          <button
            type="button"
            onClick={onLoginClick}
            className="mt-3 w-full py-2 text-center text-sm text-muted-foreground transition-colors hover:text-primary"
          >
            Masz już konto?{' '}
            <span className="font-medium text-primary underline-offset-2 hover:underline">
              Zaloguj się
            </span>
          </button>
        </div>
      ) : null}
    </div>
  );
}
