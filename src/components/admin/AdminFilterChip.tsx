'use client';

import type { LucideIcon } from 'lucide-react';
import { cn } from '../ui/utils';

interface AdminFilterChipProps {
  label: string;
  count?: number;
  icon?: LucideIcon;
  active: boolean;
  onClick: () => void;
  className?: string;
}

export function AdminFilterChip({
  label,
  count,
  icon: Icon,
  active,
  onClick,
  className,
}: AdminFilterChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex h-7 shrink-0 items-center gap-1.5 rounded-md border px-2 text-xs font-medium transition-colors',
        'hover:bg-muted/60',
        active
          ? 'border-primary/60 bg-primary/5 text-foreground shadow-sm'
          : 'border-transparent bg-muted/40 text-muted-foreground',
        className,
      )}
    >
      {Icon ? (
        <Icon className={cn('h-3 w-3', active ? 'text-primary' : 'opacity-70')} />
      ) : null}
      {label}
      {count !== undefined ? (
        <span
          className={cn(
            'min-w-[1.125rem] rounded px-1 py-px text-[10px] font-semibold tabular-nums leading-none',
            active ? 'bg-primary/15 text-primary' : 'bg-background/80 text-muted-foreground',
          )}
        >
          {count}
        </span>
      ) : null}
    </button>
  );
}
