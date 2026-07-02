'use client';

import type { LucideIcon } from 'lucide-react';
import { ChevronRight } from 'lucide-react';
import { cn } from '../ui/utils';

export interface PanelMenuItemButtonProps {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  isActive?: boolean;
  variant?: 'default' | 'destructive';
}

export function PanelMenuItemButton({
  label,
  icon: Icon,
  onClick,
  isActive = false,
  variant = 'default',
}: PanelMenuItemButtonProps) {
  const isDestructive = variant === 'destructive';

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group relative flex w-full items-center gap-3 overflow-hidden rounded-lg border px-3 py-2.5 text-left transition-all duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35',
        isDestructive
          ? 'border-transparent text-destructive hover:border-destructive/25 hover:bg-destructive/8 hover:shadow-sm'
          : isActive
            ? 'border-primary/25 bg-primary/6 text-primary shadow-sm'
            : 'border-transparent text-foreground hover:border-primary/30 hover:bg-primary/6 hover:shadow-sm',
      )}
    >
      <span
        aria-hidden
        className={cn(
          'absolute inset-y-1.5 left-0 w-1 rounded-r-md transition-opacity duration-150',
          isDestructive ? 'bg-destructive' : 'bg-primary',
          isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
        )}
      />
      <span
        className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-all duration-150',
          'group-hover:scale-[1.03]',
          isDestructive
            ? 'bg-destructive/10 text-destructive group-hover:bg-destructive/15'
            : isActive
              ? 'bg-primary/15 text-primary'
              : 'bg-primary/10 text-primary group-hover:bg-primary/15',
        )}
      >
        <Icon className="h-4 w-4" strokeWidth={2.25} />
      </span>
      <span className="min-w-0 flex-1 text-sm font-medium">{label}</span>
      <ChevronRight
        className={cn(
          'h-4 w-4 shrink-0 transition-all duration-150 group-hover:translate-x-0.5',
          isDestructive
            ? 'text-destructive/0 group-hover:text-destructive/70'
            : isActive
              ? 'text-primary/70'
              : 'text-primary/0 group-hover:text-primary/70',
        )}
        strokeWidth={2.25}
      />
    </button>
  );
}
