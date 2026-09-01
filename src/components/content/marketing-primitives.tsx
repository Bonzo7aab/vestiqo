import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '../ui/utils';

export function MarketingHeroIntro({
  icon: Icon,
  children,
  chips,
}: {
  icon: LucideIcon;
  children: ReactNode;
  chips?: Array<{ icon: LucideIcon; label: string }>;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-primary/15 bg-gradient-to-br from-primary/8 via-card to-card p-6 shadow-sm sm:p-8">
      <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-primary/10 blur-2xl" />
      <div className="relative flex items-start gap-4">
        <div className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm sm:flex">
          <Icon className="h-6 w-6" strokeWidth={2.25} />
        </div>
        <div className="space-y-3">
          <div className="text-base leading-relaxed text-foreground sm:text-lg">{children}</div>
          {chips && chips.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {chips.map((chip) => {
                const ChipIcon = chip.icon;
                return (
                  <span
                    key={chip.label}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-card/80 px-3 py-1 text-xs font-medium text-muted-foreground"
                  >
                    <ChipIcon className="h-3.5 w-3.5 text-primary" strokeWidth={2.25} />
                    {chip.label}
                  </span>
                );
              })}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function FeatureCard({
  icon: Icon,
  title,
  children,
  accent = 'primary',
}: {
  icon: LucideIcon;
  title: string;
  children: ReactNode;
  accent?: 'primary' | 'navy';
}) {
  return (
    <article
      className={cn(
        'h-full rounded-2xl border border-border/70 bg-card p-5 shadow-sm transition-shadow hover:shadow-md sm:p-6',
        accent === 'navy' && 'border-brand-navy/15',
      )}
    >
      <div
        className={cn(
          'mb-4 flex h-11 w-11 items-center justify-center rounded-xl',
          accent === 'primary'
            ? 'bg-primary/10 text-primary'
            : 'bg-brand-navy/10 text-brand-navy',
        )}
      >
        <Icon className="h-5 w-5" strokeWidth={2.25} />
      </div>
      <h3 className="text-base font-semibold text-brand-navy sm:text-lg">{title}</h3>
      <div className="mt-2 space-y-2 text-sm leading-relaxed text-muted-foreground sm:text-[0.9375rem]">
        {children}
      </div>
    </article>
  );
}

export function AudienceCard({
  icon: Icon,
  title,
  children,
}: {
  icon: LucideIcon;
  title: string;
  children: ReactNode;
}) {
  return (
    <article className="relative overflow-hidden rounded-2xl border border-border/70 bg-gradient-to-br from-card to-muted/30 p-6 shadow-sm sm:p-8">
      <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-primary/5" />
      <div className="relative">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
          <Icon className="h-6 w-6" strokeWidth={2.25} />
        </div>
        <h3 className="text-lg font-semibold text-brand-navy sm:text-xl">{title}</h3>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">{children}</p>
      </div>
    </article>
  );
}

export function HighlightCallout({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm font-medium text-brand-navy sm:text-base">
      {children}
    </p>
  );
}

export function BenefitList({ items }: { items: string[] }) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {items.map((item) => (
        <li
          key={item.slice(0, 48)}
          className="rounded-xl border border-border/70 bg-card px-4 py-3 text-sm leading-relaxed text-muted-foreground shadow-sm"
        >
          {item}
        </li>
      ))}
    </ul>
  );
}
