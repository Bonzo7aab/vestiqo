import Link from 'next/link';
import type { ReactNode } from 'react';
import { Button } from '../ui/button';
import { cn } from '../ui/utils';

interface MarketingCtaProps {
  label: string;
  href: string;
  variant?: 'default' | 'outline';
  className?: string;
}

export function MarketingCta({
  label,
  href,
  variant = 'default',
  className,
}: MarketingCtaProps) {
  return (
    <Button asChild variant={variant} size="lg" className={className}>
      <Link href={href}>{label}</Link>
    </Button>
  );
}

interface MarketingPageLayoutProps {
  title: string;
  description: string;
  children: ReactNode;
  cta?: MarketingCtaProps;
  className?: string;
}

export function MarketingPageLayout({
  title,
  description,
  children,
  cta,
  className,
}: MarketingPageLayoutProps) {
  return (
    <div className={cn('min-h-screen bg-muted/40 py-12 md:py-16', className)}>
      <div className="container mx-auto max-w-4xl space-y-10 px-4">
        <header className="space-y-3">
          <h1 className="text-3xl font-bold text-[hsl(var(--brand-navy))] md:text-4xl">
            {title}
          </h1>
          <p className="text-lg text-muted-foreground">{description}</p>
        </header>
        <div className="space-y-10">{children}</div>
        {cta ? (
          <div className="rounded-lg border border-border bg-card p-6 text-center shadow-sm">
            <MarketingCta {...cta} className="w-full sm:w-auto" />
          </div>
        ) : null}
      </div>
    </div>
  );
}

interface HelpTimelineStep {
  title: string;
  description: string;
}

interface HelpTimelineProps {
  steps: HelpTimelineStep[];
}

export function HelpTimeline({ steps }: HelpTimelineProps) {
  return (
    <ol className="relative space-y-8 border-l-2 border-border pl-8">
      {steps.map((step, index) => (
        <li key={step.title} className="relative">
          <span
            className="absolute -left-[2.35rem] flex h-8 w-8 items-center justify-center rounded-full bg-[hsl(var(--brand-navy))] text-sm font-bold text-white"
            aria-hidden
          >
            {index + 1}
          </span>
          <h3 className="text-lg font-semibold text-[hsl(var(--brand-navy))]">
            {step.title}
          </h3>
          <p className="mt-2 text-muted-foreground leading-relaxed">{step.description}</p>
        </li>
      ))}
    </ol>
  );
}

interface AudienceTile {
  id: string;
  label: string;
}

interface AudienceTilesProps {
  tiles: AudienceTile[];
}

export function AudienceTiles({ tiles }: AudienceTilesProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {tiles.map((tile) => (
        <a
          key={tile.id}
          href={`#${tile.id}`}
          className="rounded-lg border border-border bg-card p-5 text-center font-semibold text-[hsl(var(--brand-navy))] shadow-sm transition-colors hover:bg-muted/60"
        >
          {tile.label}
        </a>
      ))}
    </div>
  );
}
