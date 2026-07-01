'use client';

import type { LucideIcon } from 'lucide-react';
import { ChevronRight, LogOut } from 'lucide-react';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { VerificationAttentionIcon } from '../VerificationAttentionIcon';
import { cn } from '../ui/utils';

export interface AccountMenuItem {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  variant?: 'default' | 'attention' | 'destructive';
}

export interface AccountMenuSection {
  label?: string;
  items: AccountMenuItem[];
}

interface AccountMenuPanelProps {
  firstName: string;
  lastName: string;
  email?: string | null;
  roleLabel: string;
  showEmail?: boolean;
  showVerificationAttention?: boolean;
  sections: AccountMenuSection[];
  onLogout: () => void;
}

function MenuItemButton({ item }: { item: AccountMenuItem }) {
  const Icon = item.icon;
  const isDestructive = item.variant === 'destructive';
  const isAttention = item.variant === 'attention';

  return (
    <button
      type="button"
      onClick={item.onClick}
      className={cn(
        'group relative flex w-full items-center gap-3 overflow-hidden rounded-lg border px-3 py-2.5 text-left transition-all duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35',
        isDestructive
          ? 'border-transparent text-destructive hover:border-destructive/25 hover:bg-destructive/8 hover:shadow-sm'
          : isAttention
            ? 'border-transparent text-amber-900 hover:border-amber-300/80 hover:bg-amber-50 hover:shadow-sm'
            : 'border-transparent text-foreground hover:border-primary/30 hover:bg-primary/6 hover:shadow-sm',
      )}
    >
      <span
        aria-hidden
        className={cn(
          'absolute inset-y-1.5 left-0 w-1 rounded-r-md opacity-0 transition-opacity duration-150 group-hover:opacity-100',
          isDestructive ? 'bg-destructive' : isAttention ? 'bg-amber-500' : 'bg-primary',
        )}
      />
      <span
        className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-all duration-150',
          'group-hover:scale-[1.03]',
          isDestructive
            ? 'bg-destructive/10 text-destructive group-hover:bg-destructive/15'
            : isAttention
              ? 'bg-amber-100 text-amber-700 group-hover:bg-amber-200/80'
              : 'bg-primary/10 text-primary group-hover:bg-primary/15',
        )}
      >
        {isAttention ? (
          <VerificationAttentionIcon className="h-4 w-4" />
        ) : (
          <Icon className="h-4 w-4" strokeWidth={2.25} />
        )}
      </span>
      <span className="min-w-0 flex-1 text-sm font-medium">{item.label}</span>
      <ChevronRight
        className={cn(
          'h-4 w-4 shrink-0 transition-all duration-150',
          isDestructive
            ? 'text-destructive/0 group-hover:text-destructive/70'
            : isAttention
              ? 'text-amber-700/0 group-hover:text-amber-700/70'
              : 'text-primary/0 group-hover:text-primary/70',
          'group-hover:translate-x-0.5',
        )}
        strokeWidth={2.25}
      />
    </button>
  );
}

export function AccountMenuPanel({
  firstName,
  lastName,
  email,
  roleLabel,
  showEmail = true,
  showVerificationAttention = false,
  sections,
  onLogout,
}: AccountMenuPanelProps) {
  return (
    <div className="flex flex-col overflow-hidden">
      <div className="border-b border-border/70 bg-gradient-to-br from-primary/10 via-card to-muted/25 px-4 py-4">
        <div className="flex items-start gap-3">
          <Avatar className="h-11 w-11 rounded-lg ring-1 ring-primary/20 shadow-sm">
            <AvatarFallback className="rounded-lg bg-primary text-sm font-semibold text-primary-foreground">
              {firstName?.[0]}
              {lastName?.[0]}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 text-sm font-semibold leading-tight text-foreground">
              <span className="truncate">
                {firstName} {lastName}
              </span>
              {showVerificationAttention ? (
                <VerificationAttentionIcon className="h-4 w-4 shrink-0" />
              ) : null}
            </p>
            {showEmail && email ? (
              <p className="mt-0.5 truncate text-xs text-muted-foreground">{email}</p>
            ) : null}
            <span className="mt-2 inline-flex rounded-md border border-primary/25 bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-primary">
              {roleLabel}
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-2 bg-card p-2">
        {sections.map((section, sectionIndex) => (
          <div key={section.label ?? `section-${sectionIndex}`} className="space-y-1">
            {section.label ? (
              <p className="px-2 pb-0.5 pt-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {section.label}
              </p>
            ) : null}
            <div className="space-y-1">
              {section.items.map((item) => (
                <MenuItemButton key={item.label} item={item} />
              ))}
            </div>
          </div>
        ))}

        <div className="px-1 pt-1">
          <div className="mb-1 h-px bg-border/70" />
          <MenuItemButton
            item={{
              label: 'Wyloguj się',
              icon: LogOut,
              onClick: onLogout,
              variant: 'destructive',
            }}
          />
        </div>
      </div>
    </div>
  );
}
