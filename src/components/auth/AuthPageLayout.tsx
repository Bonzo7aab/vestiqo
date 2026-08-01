'use client';

import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { Shield, Sparkles } from 'lucide-react';
import type { CSSProperties, ReactNode } from 'react';
import { cn } from '../ui/utils';
import { BrandLogo } from '../BrandLogo';
import { BRAND } from '../../lib/brand';

export const authFieldClassName =
  'h-11 border-border/80 bg-card shadow-sm focus-visible:ring-primary/30';

/** Same grid treatment as the home hero, so auth pages feel like a continuation of the landing page. */
const SIDE_GRID_PATTERN_STYLE: CSSProperties = {
  backgroundImage:
    'linear-gradient(to right, hsl(var(--border)) 1px, transparent 1px), linear-gradient(to bottom, hsl(var(--border)) 1px, transparent 1px)',
  backgroundSize: '48px 48px',
  maskImage:
    'radial-gradient(ellipse 90% 70% at 50% 35%, black 25%, transparent 78%)',
  WebkitMaskImage:
    'radial-gradient(ellipse 90% 70% at 50% 35%, black 25%, transparent 78%)',
};

export interface AuthSideFeature {
  icon: LucideIcon;
  title: string;
  description?: string;
}

interface AuthPageLayoutProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  testId?: string;
  headingTestId?: string;
  contentMaxWidth?: 'md' | 'lg';
  /** Footer trust line on the side panel. Omit contractor verification note for managers. */
  trustNote?: string;
  /** Hide mobile header logo above the form title. */
  showMobileLogo?: boolean;
  side: {
    heading: string;
    body: string;
    features: AuthSideFeature[];
  };
}

function AuthSidePanel({
  side,
  trustNote = 'Dane chronione zgodnie z RODO. Weryfikacja dokumentów dla wykonawców.',
}: {
  side: AuthPageLayoutProps['side'];
  trustNote?: string;
}) {
  return (
    <aside className="relative hidden lg:flex lg:flex-col lg:self-stretch">
      <div className="relative flex flex-1 flex-col justify-center gap-7 px-10 py-10 xl:gap-8 xl:px-14 xl:py-12">
        <div className="space-y-3">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            Platforma konkursów ofert
          </span>

          <h2 className="text-2xl font-bold leading-snug tracking-tight text-foreground xl:text-[1.75rem]">
            {side.heading}
          </h2>
          <p className="max-w-md text-sm leading-relaxed text-muted-foreground">{side.body}</p>
        </div>

        <ul className="space-y-4">
          {side.features.map((feature) => {
            const Icon = feature.icon;
            return (
              <li key={feature.title} className="flex items-start gap-3.5">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="h-4 w-4" strokeWidth={2} />
                </span>
                <div className="min-w-0 pt-0.5">
                  <p className="text-sm font-semibold leading-snug text-foreground">{feature.title}</p>
                  {feature.description ? (
                    <p className="mt-1 text-sm leading-snug text-muted-foreground">
                      {feature.description}
                    </p>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>

        <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-card/70 px-4 py-3 backdrop-blur-sm">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10">
            <Shield className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          </span>
          <p className="text-xs leading-snug text-muted-foreground">{trustNote}</p>
        </div>
      </div>
    </aside>
  );
}

export function AuthPageLayout({
  title,
  subtitle,
  children,
  footer,
  testId,
  headingTestId,
  contentMaxWidth = 'md',
  trustNote,
  showMobileLogo = true,
  side,
}: AuthPageLayoutProps) {
  // Fill space between site header and footer (root main is ~100vh - 12rem), not the full viewport.
  const authMinHeightClass = 'min-h-[calc(100vh-12rem)]';

  return (
    <div className={cn('relative overflow-x-hidden', authMinHeightClass)} data-testid={testId}>
      {/* Full-page background */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-b from-accent/60 via-background to-background" />
        <div className="absolute inset-0 opacity-50" style={SIDE_GRID_PATTERN_STYLE} />
        <div className="absolute -left-32 -top-40 h-[28rem] w-[28rem] rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-32 -right-24 h-96 w-96 rounded-full bg-primary/5 blur-3xl" />
      </div>

      <div className={cn('relative lg:grid lg:grid-cols-2', authMinHeightClass)}>
        <AuthSidePanel side={side} trustNote={trustNote} />

        <div className="flex flex-col justify-center px-4 py-10 sm:px-8 lg:px-10 lg:py-12 xl:px-14">
          <div
            className={cn(
              'mx-auto w-full',
              contentMaxWidth === 'lg' ? 'max-w-xl' : 'max-w-md',
            )}
          >
            {showMobileLogo ? (
              <div className="mb-6 lg:hidden">
                <Link href="/" className="inline-flex items-center gap-2">
                  <BrandLogo variant="mark" className="h-8 w-8" />
                  <span className="text-xl font-bold tracking-tight text-primary">{BRAND.name}</span>
                </Link>
              </div>
            ) : null}

            <header className="mb-6">
              <h1
                className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl"
                data-testid={headingTestId}
              >
                {title}
              </h1>
              {subtitle ? (
                <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>
              ) : null}
            </header>

            {children}

            {footer ? (
              <div className="mt-6 text-center text-sm text-muted-foreground">{footer}</div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

interface AuthFormSectionProps {
  title: string;
  children: ReactNode;
  className?: string;
}

export function AuthFormSection({ title, children, className }: AuthFormSectionProps) {
  return (
    <section className={cn('space-y-3', className)}>
      <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h2>
      {children}
    </section>
  );
}

export function AuthFormPanel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-border/60 bg-card p-6 shadow-sm sm:p-8',
        className,
      )}
    >
      {children}
    </div>
  );
}
