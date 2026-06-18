'use client';

import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import {
  Map,
  Shield,
  Sparkles,
  Star,
  Users,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '../ui/utils';
import { BrandLogo } from '../BrandLogo';
import { BRAND } from '../../lib/brand';

export const authFieldClassName =
  'h-11 border-border/80 bg-background shadow-sm focus-visible:ring-primary/30';

export interface AuthSideFeature {
  icon: LucideIcon;
  title: string;
  description?: string;
}

export interface AuthSideHighlight {
  icon: LucideIcon;
  label: string;
}

interface AuthPageLayoutProps {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
  testId?: string;
  headingTestId?: string;
  contentMaxWidth?: 'md' | 'lg';
  /** Footer trust line on the side panel. Omit contractor verification note for managers. */
  trustNote?: string;
  side: {
    heading: string;
    body: string;
    features: AuthSideFeature[];
    highlights?: AuthSideHighlight[];
  };
}

function AuthSidePanel({
  side,
  trustNote = 'Dane chronione zgodnie z RODO. Weryfikacja dokumentów dla wykonawców.',
}: {
  side: AuthPageLayoutProps['side'];
  trustNote?: string;
}) {
  const highlights: AuthSideHighlight[] = side.highlights ?? [
    { icon: Map, label: 'Mapa zleceń' },
    { icon: Users, label: 'Dwie strony rynku' },
    { icon: Star, label: 'Opinie firm' },
  ];

  return (
    <aside className="relative hidden overflow-hidden bg-gradient-to-br from-primary via-blue-800 to-slate-950 text-white lg:flex lg:flex-col">
      {/* Background layers */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.4) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />
      <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-sky-300/25 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-indigo-400/20 blur-3xl" />
      <div className="pointer-events-none absolute right-8 top-1/3 h-40 w-40 rounded-3xl border border-white/10 bg-white/5 backdrop-blur-sm rotate-12" />
      <div className="pointer-events-none absolute left-6 bottom-1/4 h-24 w-24 rounded-2xl border border-white/10 bg-white/5 -rotate-6" />

      <div className="relative flex flex-1 flex-col justify-between px-10 py-12 xl:px-14">
        {/* Header */}
        <div>
          <Link
            href="/"
            className="inline-flex items-center rounded-2xl border border-white/15 bg-white px-4 py-2.5 shadow-lg shadow-black/10 backdrop-blur-md transition-colors hover:bg-white/95"
          >
            <BrandLogo variant="full" className="h-7 w-auto" />
          </Link>

          <div className="mt-10 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium text-white/90 backdrop-blur-sm">
            <Sparkles className="h-3.5 w-3.5 text-amber-200" />
            Platforma B2B dla nieruchomości
          </div>

          <h2 className="mt-5 text-2xl font-bold leading-tight tracking-tight text-white xl:text-[1.65rem]">
            {side.heading}
          </h2>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-white/75">{side.body}</p>
        </div>

        {/* Feature cards */}
        <ul className="my-8 space-y-3">
          {side.features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <li
                key={feature.title}
                className="group flex gap-4 rounded-2xl border border-white/10 bg-white/[0.08] p-4 shadow-lg shadow-black/5 backdrop-blur-sm transition-colors hover:border-white/20 hover:bg-white/[0.12]"
              >
                <span
                  className={cn(
                    'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl shadow-inner',
                    index === 0 && 'bg-sky-400/30 text-sky-100',
                    index === 1 && 'bg-emerald-400/25 text-emerald-100',
                    index === 2 && 'bg-violet-400/25 text-violet-100',
                  )}
                >
                  <Icon className="h-5 w-5" strokeWidth={2} />
                </span>
                <div className="min-w-0 pt-0.5">
                  <p className="font-semibold text-white/95">{feature.title}</p>
                  {feature.description ? (
                    <p className="mt-0.5 text-xs leading-relaxed text-white/60">
                      {feature.description}
                    </p>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>

        {/* Highlights + trust */}
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {highlights.map(({ icon: Icon, label }) => (
              <span
                key={label}
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/10 px-2.5 py-1.5 text-xs font-medium text-white/85 backdrop-blur-sm"
              >
                <Icon className="h-3.5 w-3.5 text-white/70" />
                {label}
              </span>
            ))}
          </div>

          <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-sm">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/25">
              <Shield className="h-4 w-4 text-emerald-200" />
            </span>
            <p className="text-xs leading-snug text-white/70">{trustNote}</p>
          </div>
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
  side,
}: AuthPageLayoutProps) {
  return (
    <div className="min-h-screen bg-background" data-testid={testId}>
      <div className="lg:grid lg:min-h-screen lg:grid-cols-2">
        <AuthSidePanel side={side} trustNote={trustNote} />

        <main className="flex min-h-screen flex-col justify-center px-4 py-10 sm:px-8 lg:min-h-0 lg:px-10 xl:px-14">
          <div
            className={cn(
              'mx-auto w-full',
              contentMaxWidth === 'lg' ? 'max-w-xl' : 'max-w-md',
            )}
          >
            <div className="mb-6 lg:hidden">
              <Link href="/" className="inline-flex items-center gap-2">
                <BrandLogo variant="mark" className="h-8 w-8" />
                <span className="text-xl font-bold tracking-tight text-primary">{BRAND.name}</span>
              </Link>
            </div>

            <header className="mb-6">
              <h1
                className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl"
                data-testid={headingTestId}
              >
                {title}
              </h1>
              <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>
            </header>

            {children}

            {footer ? (
              <div className="mt-6 text-center text-sm text-muted-foreground">{footer}</div>
            ) : null}
          </div>
        </main>
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
