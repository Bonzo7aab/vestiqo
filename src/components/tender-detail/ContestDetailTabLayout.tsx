'use client';

import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '../ui/utils';

export function ContestDetailTabPanel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}): React.ReactElement {
  return <div className={cn('space-y-4', className)}>{children}</div>;
}

export function ContestDetailSection({
  icon: Icon,
  title,
  description,
  children,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}): React.ReactElement {
  return (
    <section
      className={cn(
        'overflow-hidden rounded-xl border border-border/70 bg-card shadow-[0_1px_3px_hsl(var(--brand-navy)/0.04)]',
        className,
      )}
    >
      <div className="border-b border-border/60 bg-muted/20 px-4 py-3 sm:px-5">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="h-4 w-4" aria-hidden />
          </div>
          <div className="min-w-0 pt-0.5">
            <h3 className="text-sm font-semibold text-foreground">{title}</h3>
            {description ? (
              <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{description}</p>
            ) : null}
          </div>
        </div>
      </div>
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  );
}

export function ContestDetailField({
  label,
  value,
  className,
}: {
  label: string;
  value: ReactNode;
  className?: string;
}): React.ReactElement | null {
  if (value == null || value === '') return null;

  return (
    <div className={cn('space-y-1', className)}>
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="text-sm font-medium leading-snug text-foreground">{value}</dd>
    </div>
  );
}

export function ContestDetailFieldGrid({
  children,
  columns = 2,
}: {
  children: ReactNode;
  columns?: 1 | 2 | 3;
}): React.ReactElement {
  return (
    <dl
      className={cn(
        'grid gap-x-6 gap-y-4',
        columns === 1 && 'grid-cols-1',
        columns === 2 && 'grid-cols-1 sm:grid-cols-2',
        columns === 3 && 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
      )}
    >
      {children}
    </dl>
  );
}

export function ContestDetailProse({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}): React.ReactElement {
  return (
    <div
      className={cn(
        'whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function ContestDetailCallout({
  icon: Icon,
  title,
  children,
  variant = 'info',
}: {
  icon: LucideIcon;
  title: string;
  children: ReactNode;
  variant?: 'info' | 'warning';
}): React.ReactElement {
  return (
    <div
      className={cn(
        'flex gap-3 rounded-lg border p-4',
        variant === 'warning'
          ? 'border-amber-200/80 bg-amber-50/70 dark:border-amber-900/40 dark:bg-amber-950/20'
          : 'border-border/70 bg-muted/25',
      )}
    >
      <Icon
        className={cn(
          'mt-0.5 h-4 w-4 shrink-0',
          variant === 'warning' ? 'text-amber-700 dark:text-amber-400' : 'text-muted-foreground',
        )}
        aria-hidden
      />
      <div className="min-w-0 space-y-1">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <div className="text-sm leading-relaxed text-muted-foreground">{children}</div>
      </div>
    </div>
  );
}

export function ContestDetailEmptyState({
  children,
}: {
  children: ReactNode;
}): React.ReactElement {
  return (
    <div className="rounded-lg border border-dashed border-border/70 bg-muted/10 px-4 py-8 text-center text-sm text-muted-foreground">
      {children}
    </div>
  );
}
export function ContestDetailChecklist({
  items,
}: {
  items: string[];
}): React.ReactElement {
  return (
    <ol className="space-y-2.5">
      {items.map((item, index) => (
        <li
          key={`${index}-${item.slice(0, 24)}`}
          className="flex items-start gap-3 rounded-lg border border-border/60 bg-muted/10 px-3 py-2.5"
        >
          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary">
            {index + 1}
          </span>
          <span className="text-sm leading-relaxed text-foreground">{item}</span>
        </li>
      ))}
    </ol>
  );
}

export function ContestDetailCriteriaList({
  items,
  totalWeight,
}: {
  items: Array<{ id: string; name: string; weight: number }>;
  totalWeight: number;
}): React.ReactElement {
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.id} className="space-y-1.5">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="font-medium text-foreground">{item.name}</span>
            <span className="shrink-0 tabular-nums text-xs font-semibold text-muted-foreground">
              {item.weight}%
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary/80 transition-all"
              style={{ width: `${Math.min(item.weight, 100)}%` }}
            />
          </div>
        </div>
      ))}
      <p className="border-t border-border/60 pt-3 text-xs text-muted-foreground">
        Suma wag kryteriów:{' '}
        <span className="font-semibold text-foreground">{totalWeight}%</span>
      </p>
    </div>
  );
}

export function ContestDetailDocumentList({
  children,
}: {
  children: ReactNode;
}): React.ReactElement {
  return <ul className="space-y-2">{children}</ul>;
}

export function ContestDetailDocumentItem({
  children,
}: {
  children: ReactNode;
}): React.ReactElement {
  return (
    <li className="flex items-center gap-3 rounded-lg border border-border/60 bg-card px-3 py-2.5 transition-colors hover:border-primary/30 hover:bg-primary/[0.03]">
      {children}
    </li>
  );
}
