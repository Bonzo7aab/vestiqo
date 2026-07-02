import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '../ui/utils';

interface AdminDashboardMetricCardProps {
  icon: LucideIcon;
  title: string;
  value: number;
  breakdown: string;
  href: string;
  ctaLabel: string;
  footnote?: string;
}

export function AdminDashboardMetricCard({
  icon: Icon,
  title,
  value,
  breakdown,
  href,
  ctaLabel,
  footnote,
}: AdminDashboardMetricCardProps) {
  const hasAlert = value > 0;

  return (
    <div
      className={cn(
        'flex h-full flex-col rounded-xl border bg-card p-5 shadow-sm transition-colors',
        hasAlert ? 'border-amber-200/80 bg-amber-50/40' : 'border-border/60',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
            hasAlert ? 'bg-amber-100 text-amber-800' : 'bg-primary/10 text-primary',
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div className="text-right">
          <div className={cn('text-3xl font-semibold tabular-nums', hasAlert && 'text-amber-900')}>
            {value}
          </div>
        </div>
      </div>
      <h3 className="mt-4 text-base font-semibold text-brand-navy">{title}</h3>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{breakdown}</p>
      {footnote ? (
        <p className="mt-2 text-xs text-muted-foreground/80">{footnote}</p>
      ) : null}
      <div className="mt-4 pt-2">
        <Button variant="outline" size="sm" className="w-full sm:w-auto" asChild>
          <Link href={href}>{ctaLabel}</Link>
        </Button>
      </div>
    </div>
  );
}
