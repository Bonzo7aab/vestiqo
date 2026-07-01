'use client';

import { Info } from 'lucide-react';
import { cn } from '../ui/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';

export type RegistryStatusPillVariant = 'success' | 'warning' | 'destructive' | 'muted';

const VARIANT_CLASSES: Record<RegistryStatusPillVariant, string> = {
  success:
    'border-emerald-500/40 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300',
  warning: 'border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-200',
  destructive:
    'border-destructive/40 bg-destructive/10 text-destructive dark:text-red-300',
  muted: 'border-border bg-muted text-muted-foreground',
};

interface RegistryStatusPillProps {
  label: string;
  variant: RegistryStatusPillVariant;
  tooltip: string;
  checkedAt?: string | null;
  className?: string;
}

function formatCheckedDate(iso: string | null | undefined): string | null {
  if (!iso) {
    return null;
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toLocaleDateString('pl-PL');
}

export function RegistryStatusPill({
  label,
  variant,
  tooltip,
  checkedAt,
  className,
}: RegistryStatusPillProps) {
  const checkedLabel = formatCheckedDate(checkedAt);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className={cn(
            'inline-flex cursor-help items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            VARIANT_CLASSES[variant],
            className,
          )}
          aria-label={`${label}: ${tooltip}`}
        >
          <Info className="h-3 w-3 shrink-0 opacity-80" aria-hidden />
          {label}
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" sideOffset={4} className="flex flex-col items-start gap-1">
        <p>{tooltip}</p>
        {checkedLabel ? (
          <p className="text-background/70">Aktualizacja na dzień: {checkedLabel}</p>
        ) : null}
      </TooltipContent>
    </Tooltip>
  );
}
